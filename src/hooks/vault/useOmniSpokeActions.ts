import { ethers } from 'ethers';
import { useCallback } from 'react';
import { useWalletClient } from 'wagmi';
import oftAbi from 'src/libs/abis/oft_abi.json';
import { CHAIN_ID_TO_LZ_EID } from 'src/utils/const';
import { useVaultProvider } from './useVaultData';

const ERC20_ABI = [
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function decimals() external view returns (uint8)',
  'function balanceOf(address account) external view returns (uint256)',
  'function symbol() external view returns (string)',
];

export interface SpokeDepositInfo {
  /** ERC20 token the user needs to hold (shown in UI, used for approval) */
  tokenAddress: string;
  /**
   * OFT contract to call send() on, and the spender in the token approval.
   * - OFTAdapter (case 1): spokeVaultAddress (the adapter IS the OFT)
   * - Pure OFT / asset-is-OFT (cases 2 & 3): same as tokenAddress
   */
  oftAddress: string;
}

/**
 * Builds the composeMsg for the hub-side MoreVaultsComposer.
 * Format: abi.encode(SendParam hopSendParam, uint256 minMsgValue)
 *
 * hopSendParam tells the hub composer where to bridge shares back after the deposit.
 */
function buildComposeMsg(
  spokeEid: number,
  receiver: string,
  minSharesOut: ethers.BigNumber = ethers.BigNumber.from(0),
  minMsgValue: ethers.BigNumber = ethers.BigNumber.from(0),
): string {
  const toBytes32 = ethers.utils.hexZeroPad(receiver, 32);
  const hopSendParam = {
    dstEid: spokeEid,          // send shares back to this spoke chain
    to: toBytes32,             // shares recipient on spoke chain
    amountLD: ethers.BigNumber.from(0), // overwritten by the composer
    minAmountLD: minSharesOut, // slippage protection on shares
    extraOptions: '0x',
    composeMsg: '0x',
    oftCmd: '0x',
  };
  const abiCoder = new ethers.utils.AbiCoder();
  return abiCoder.encode(
    [
      'tuple(uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd)',
      'uint256',
    ],
    [hopSendParam, minMsgValue],
  );
}

function buildSendParam(
  hubEid: number,
  spokeEid: number,
  receiver: string,
  amount: ethers.BigNumber,
  minSharesOut: ethers.BigNumber = ethers.BigNumber.from(0),
  extraOptions: string = '0x',
) {
  const toBytes32 = ethers.utils.hexZeroPad(receiver, 32);
  const composeMsg = buildComposeMsg(spokeEid, receiver, minSharesOut);
  return {
    dstEid: hubEid,
    to: toBytes32,
    amountLD: amount,
    minAmountLD: amount, // zero bridge slippage tolerance by default
    extraOptions,
    composeMsg,
    oftCmd: '0x',
  };
}

export const useOmniSpokeActions = (
  _hubVaultAddress: string | null,
  hubChainId: number,
  spokeChainId: number | null,
) => {
  const { data: walletClient } = useWalletClient();
  const spokeProvider = useVaultProvider(spokeChainId ?? 0);

  const accountAddress = walletClient?.account?.address ?? null;
  const hubEid = CHAIN_ID_TO_LZ_EID[hubChainId] ?? 0;
  const spokeEid = CHAIN_ID_TO_LZ_EID[spokeChainId ?? 0] ?? 0;

  /**
   * Resolves the OFT to use for a spoke deposit.
   *
   * The spoke address from hubToSpokes() is an ERC4626 vault whose asset() is
   * the underlying pure OFT (e.g. USDC OFT on Base). Following the SDK pattern —
   * ensureAllowance(signer, spokeOFT, spokeOFT, amount) — both the approval token
   * and the send target are the same OFT address.
   *
   * Falls back to the spoke vault itself if asset() is unavailable.
   */
  const getSpokeDepositInfo = useCallback(
    async (spokeVaultAddress: string): Promise<SpokeDepositInfo> => {
      if (!spokeProvider) throw new Error('No spoke provider');

      try {
        const contract = new ethers.Contract(spokeVaultAddress, oftAbi, spokeProvider);
        const assetAddr: string = await contract.asset();
        if (
          assetAddr &&
          assetAddr !== ethers.constants.AddressZero &&
          assetAddr.toLowerCase() !== spokeVaultAddress.toLowerCase()
        ) {
          // assetAddr is the pure OFT (e.g. USDC OFT) — approve it to spend itself
          return { tokenAddress: assetAddr, oftAddress: assetAddr };
        }
      } catch { /* asset() not available */ }

      // Fallback: spoke vault is itself the OFT
      return { tokenAddress: spokeVaultAddress, oftAddress: spokeVaultAddress };
    },
    [spokeProvider],
  );

  /**
   * Quotes the LayerZero fee for a spoke deposit via OFT.quoteSend.
   * Uses the same sendParam structure as the actual send call.
   */
  const quoteSpokeDepositFee = useCallback(
    async (
      info: SpokeDepositInfo,
      amountInWei: string,
    ): Promise<ethers.BigNumber | null> => {
      if (!spokeProvider || !accountAddress) return null;
      if (!hubEid || !spokeEid) return null;

      try {
        const oft = new ethers.Contract(info.oftAddress, oftAbi, spokeProvider);
        const sendParam = buildSendParam(
          hubEid,
          spokeEid,
          accountAddress,
          ethers.BigNumber.from(amountInWei),
        );
        const result = await oft.quoteSend(sendParam, false);
        return result.nativeFee.mul(101).div(100);
      } catch {
        return null;
      }
    },
    [spokeProvider, accountAddress, hubEid, spokeEid],
  );

  /**
   * Lightweight allowance check — safe to call on every amount change.
   * Checks tokenAddress.allowance(account, oftAddress).
   */
  const checkSpokeDepositAction = useCallback(
    async (
      amountInWei: string,
      info: SpokeDepositInfo,
    ): Promise<'approve' | 'spoke-deposit'> => {
      if (!spokeProvider || !accountAddress) return 'spoke-deposit';
      try {
        const token = new ethers.Contract(info.tokenAddress, ERC20_ABI, spokeProvider);
        const allowance: ethers.BigNumber = await token.allowance(accountAddress, info.oftAddress);
        return allowance.lt(amountInWei) ? 'approve' : 'spoke-deposit';
      } catch {
        return 'spoke-deposit';
      }
    },
    [spokeProvider, accountAddress],
  );

  /**
   * Builds an approve or OFT.send tx for the spoke chain.
   *
   * Approval: tokenAddress.approve(oftAddress, amount)
   * Send:     oftAddress.send(sendParam, fee, refundAddress)   ← D6/D7 flow
   */
  const spokeDeposit = useCallback(
    async (
      amountInWei: string,
      info: SpokeDepositInfo,
      lzFee: ethers.BigNumber | null,
    ): Promise<{
      tx: ethers.providers.TransactionRequest;
      action: 'approve' | 'spoke-deposit';
    }> => {
      if (!accountAddress) throw new Error('No account connected');
      if (!spokeProvider) throw new Error('No spoke provider');
      if (!hubEid) throw new Error('Hub EID not configured');
      if (!spokeEid) throw new Error('Spoke EID not configured');

      // Read allowance: token → OFT (which will burn/bridge the tokens)
      const tokenContractRead = new ethers.Contract(info.tokenAddress, ERC20_ABI, spokeProvider);
      const allowance: ethers.BigNumber = await tokenContractRead.allowance(accountAddress, info.oftAddress);

      if (allowance.lt(amountInWei)) {
        const erc20Iface = new ethers.utils.Interface(ERC20_ABI);
        const approveTx: ethers.providers.TransactionRequest = {
          to: info.tokenAddress,
          data: erc20Iface.encodeFunctionData('approve', [info.oftAddress, amountInWei]),
        };
        return { tx: approveTx, action: 'approve' };
      }

      // OFT.send with hopSendParam composeMsg (D6/D7 flow)
      // tx goes to oftAddress — the OFT adapter or pure OFT contract
      const nativeFee = lzFee ?? ethers.BigNumber.from(0);
      const sendParam = buildSendParam(
        hubEid,
        spokeEid,
        accountAddress,
        ethers.BigNumber.from(amountInWei),
      );

      const iface = new ethers.utils.Interface(oftAbi);
      const txData = iface.encodeFunctionData('send', [
        sendParam,
        { nativeFee, lzTokenFee: ethers.BigNumber.from(0) },
        accountAddress,
      ]);

      const tx: ethers.providers.TransactionRequest = {
        to: info.oftAddress,   // ← OFT contract, NOT the spoke vault
        data: txData,
        value: nativeFee,
      };

      return { tx, action: 'spoke-deposit' };
    },
    [spokeProvider, accountAddress, hubEid, spokeEid],
  );

  return { quoteSpokeDepositFee, spokeDeposit, checkSpokeDepositAction, getSpokeDepositInfo };
};
