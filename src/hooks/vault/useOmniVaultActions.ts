import { ethers } from 'ethers';
import { useCallback } from 'react';
import { useWalletClient } from 'wagmi';
import bridgeFacetAbi from 'src/libs/abis/bridge_facet_abi.json';
import configurationFacetAbi from 'src/libs/abis/configuration_facet_abi.json';
import { OMNI_EXTRA_OPTIONS } from 'src/utils/const';
import { useVaultProvider } from './useVaultData';

const ERC20_ABI = [
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
];

const VAULT_ABI = [
  'function asset() external view returns (address)',
  'function convertToShares(uint256 assets) external view returns (uint256)',
  'function convertToAssets(uint256 shares) external view returns (uint256)',
];

export const quoteOmniFee = async (
  vaultAddress: string,
  provider: ethers.providers.Provider
): Promise<ethers.BigNumber> => {
  const bridge = new ethers.Contract(vaultAddress, bridgeFacetAbi, provider);
  return bridge.quoteAccountingFee(OMNI_EXTRA_OPTIONS);
};

export const useOmniVaultActions = (
  vaultAddress: string | null,
  hubChainId: number
) => {
  const { data: walletClient } = useWalletClient();
  const provider = useVaultProvider(hubChainId);

  const signer = walletClient
    ? new ethers.providers.Web3Provider(
      walletClient as unknown as ethers.providers.ExternalProvider
    ).getSigner()
    : null;

  const accountAddress = walletClient?.account?.address ?? null;

  const omniDeposit = useCallback(
    async (
      amountInWei: string
    ): Promise<{
      tx: ethers.providers.TransactionRequest;
      action: 'approve' | 'omni-deposit';
      nativeFee?: ethers.BigNumber;
      guid?: string;
    }> => {
      if (!vaultAddress) throw new Error('No vault address');
      if (!signer) throw new Error('No signer available');
      if (!accountAddress) throw new Error('No account connected');
      if (!provider) throw new Error('No provider');

      const configFacet = new ethers.Contract(vaultAddress, configurationFacetAbi, provider);
      const escrowAddress: string = await configFacet.getEscrow();

      const vaultContract = new ethers.Contract(vaultAddress, VAULT_ABI, provider);
      const assetAddress: string = await vaultContract.asset();

      const tokenContract = new ethers.Contract(assetAddress, ERC20_ABI, signer);
      const allowance: ethers.BigNumber = await tokenContract.allowance(accountAddress, escrowAddress);

      if (allowance.lt(amountInWei)) {
        const approveTx = await tokenContract.populateTransaction.approve(escrowAddress, amountInWei);
        return { tx: approveTx, action: 'approve' };
      }

      const abiCoder = new ethers.utils.AbiCoder();
      const calldata = abiCoder.encode(['uint256', 'address'], [amountInWei, accountAddress]);
      const amountLimit = ethers.BigNumber.from(0);

      const bridgeFacet = new ethers.Contract(vaultAddress, bridgeFacetAbi, provider);

      // Quote fee right before building the tx to minimise staleness.
      // Use 10× buffer — LZ refunds unused native fee to the sender.
      const freshFee: ethers.BigNumber = await bridgeFacet.quoteAccountingFee(OMNI_EXTRA_OPTIONS);
      const feeWithBuffer = freshFee.mul(101).div(100);

      const iface = new ethers.utils.Interface(bridgeFacetAbi);
      const txData = iface.encodeFunctionData('initVaultActionRequest', [0, calldata, amountLimit, OMNI_EXTRA_OPTIONS]);

      const tx: ethers.providers.TransactionRequest = {
        to: vaultAddress,
        data: txData,
        value: feeWithBuffer,
      };

      // Capture GUID via callStatic before broadcasting (best-effort)
      let guid: string | undefined;
      try {
        const bridgeFacetSigner = new ethers.Contract(vaultAddress, bridgeFacetAbi, signer);
        guid = await bridgeFacetSigner.callStatic.initVaultActionRequest(
          0, calldata, amountLimit, OMNI_EXTRA_OPTIONS, { value: feeWithBuffer }
        );
      } catch {
        // GUID unavailable — proceed without it
      }

      return { tx, action: 'omni-deposit', nativeFee: feeWithBuffer, guid };
    },
    [vaultAddress, signer, accountAddress, provider]
  );

  const omniRedeem = useCallback(
    async (
      sharesInWei: string
    ): Promise<{
      tx: ethers.providers.TransactionRequest;
      action: 'approve' | 'omni-redeem';
      nativeFee?: ethers.BigNumber;
      guid?: string;
    }> => {
      if (!vaultAddress) throw new Error('No vault address');
      if (!signer) throw new Error('No signer available');
      if (!accountAddress) throw new Error('No account connected');
      if (!provider) throw new Error('No provider');

      const configFacet = new ethers.Contract(vaultAddress, configurationFacetAbi, provider);
      const escrowAddress: string = await configFacet.getEscrow();

      // Shares token is the vault contract itself (ERC20)
      const sharesTokenContract = new ethers.Contract(vaultAddress, ERC20_ABI, signer);
      const allowance: ethers.BigNumber = await sharesTokenContract.allowance(accountAddress, escrowAddress);

      if (allowance.lt(sharesInWei)) {
        const approveTx = await sharesTokenContract.populateTransaction.approve(escrowAddress, sharesInWei);
        return { tx: approveTx, action: 'approve' };
      }

      const abiCoder = new ethers.utils.AbiCoder();
      const amountLimit = ethers.BigNumber.from(0);
      const calldata = abiCoder.encode(
        ['uint256', 'address', 'address'],
        [sharesInWei, accountAddress, accountAddress]
      );

      const bridgeFacet = new ethers.Contract(vaultAddress, bridgeFacetAbi, provider);

      // Quote fee right before building the tx to minimise staleness.
      // Use 10× buffer — LZ refunds unused native fee to the sender.
      const freshFee: ethers.BigNumber = await bridgeFacet.quoteAccountingFee(OMNI_EXTRA_OPTIONS);
      const feeWithBuffer = freshFee.mul(101).div(100);

      const iface = new ethers.utils.Interface(bridgeFacetAbi);
      const txData = iface.encodeFunctionData('initVaultActionRequest', [3, calldata, amountLimit, OMNI_EXTRA_OPTIONS]);

      const tx: ethers.providers.TransactionRequest = {
        to: vaultAddress,
        data: txData,
        value: feeWithBuffer,
      };

      // Capture GUID via callStatic before broadcasting (best-effort)
      let guid: string | undefined;
      try {
        const bridgeFacetSigner = new ethers.Contract(vaultAddress, bridgeFacetAbi, signer);
        guid = await bridgeFacetSigner.callStatic.initVaultActionRequest(
          3, calldata, amountLimit, OMNI_EXTRA_OPTIONS, { value: feeWithBuffer }
        );
      } catch {
        // GUID unavailable — proceed without it
      }

      return { tx, action: 'omni-redeem', nativeFee: feeWithBuffer, guid };
    },
    [vaultAddress, signer, accountAddress, provider]
  );

  // Lightweight allowance check — no gas estimation, safe to call on every amount change
  const checkOmniDepositAction = useCallback(
    async (amountInWei: string): Promise<'approve' | 'omni-deposit'> => {
      if (!vaultAddress || !accountAddress || !provider) return 'omni-deposit';

      const configFacet = new ethers.Contract(vaultAddress, configurationFacetAbi, provider);
      const escrowAddress: string = await configFacet.getEscrow();

      const vaultContract = new ethers.Contract(vaultAddress, VAULT_ABI, provider);
      const assetAddress: string = await vaultContract.asset();

      const tokenContract = new ethers.Contract(assetAddress, ERC20_ABI, provider);
      const allowance: ethers.BigNumber = await tokenContract.allowance(accountAddress, escrowAddress);

      return allowance.lt(amountInWei) ? 'approve' : 'omni-deposit';
    },
    [vaultAddress, accountAddress, provider]
  );

  const checkOmniRedeemAction = useCallback(
    async (sharesInWei: string): Promise<'approve' | 'omni-redeem'> => {
      if (!vaultAddress || !accountAddress || !provider) return 'omni-redeem';

      const configFacet = new ethers.Contract(vaultAddress, configurationFacetAbi, provider);
      const escrowAddress: string = await configFacet.getEscrow();

      // Shares token is the vault contract itself
      const tokenContract = new ethers.Contract(vaultAddress, ERC20_ABI, provider);
      const allowance: ethers.BigNumber = await tokenContract.allowance(accountAddress, escrowAddress);

      return allowance.lt(sharesInWei) ? 'approve' : 'omni-redeem';
    },
    [vaultAddress, accountAddress, provider]
  );

  return { omniDeposit, omniRedeem, checkOmniDepositAction, checkOmniRedeemAction };
};
