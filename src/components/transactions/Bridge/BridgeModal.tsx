import { ModalType, useModalContext } from "src/hooks/useModal";
import { BasicModal } from "src/components/primitives/BasicModal";
import { InputBase, Typography, Button, CircularProgress } from "@mui/material";
import { useMemo, useState, useEffect, useCallback } from "react";
import { TxModalTitle } from "../FlowCommons/TxModalTitle";
import { useWalletClient, useChainId, useSwitchChain } from "wagmi";
import { ethers } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { ProtocolAction, gasLimitRecommendations } from "@aave/contract-helpers";

// Define types for the deBridge API response
interface DebridgeTokenDetails {
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  amount: string;
  // Other fields can be added if needed later
}

interface DebridgeEstimation {
  srcChainTokenIn: DebridgeTokenDetails;
  srcChainTokenOut?: DebridgeTokenDetails; // Added as optional, based on new JSON
  dstChainTokenOut: DebridgeTokenDetails;
  costsDetails: DebridgeCostDetail[];
  recommendedSlippage: number;
}

interface DebridgeCostDetail {
  chain: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  type: string;
  payload?: {
    feeAmount?: string;
    feeBps?: string | number; // Can be string or number based on example
    feeApproximateUsdValue?: string;
    estimatedVolatilityBps?: string | number;
    amountOutBeforeCorrection?: string;
  };
}

interface DebridgeTx {
  data: string;
  to: string;
  value: string;
}

interface DebridgeOrder {
  approximateFulfillmentDelay: number;
  salt: number;
  metadata: string;
}

interface DebridgeResponse {
  estimation: DebridgeEstimation;
  tx?: DebridgeTx; // Added as optional
  order?: DebridgeOrder; // Added as optional
  orderId?: string; // Added as optional
  fixFee?: string; // Added as optional
  userPoints?: number;
  integratorPoints?: number;
}

// ERC20 Interface ABI for token approval
const ERC20_ABI = [
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
];

export const BridgeModal = () => {
  const [amount, setAmount] = useState('');
  const [bridgeData, setBridgeData] = useState<DebridgeResponse | null>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [isBridging, setIsBridging] = useState(false);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);

  const {
    type,
    close,
  } = useModalContext();
  const { data: walletClient } = useWalletClient();
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const provider = walletClient && new ethers.providers.Web3Provider(walletClient as ethers.providers.ExternalProvider);
  const signer = useMemo(() => {
    if (walletClient && provider) {
      return provider.getSigner();
    }
    return null;
  }, [provider, walletClient]);

  const getSupplyData = async (currentAmount: string, signerAddress: string) => {
    const poolContract = new ethers.Contract(
      "0xbC92aaC2DBBF42215248B5688eB3D3d2b32F2c8d",
      ["function supply(address, uint256, address, uint16)"],
      signer
    );
    console.log(parseUnits(currentAmount, 6).toString())
    const tx = await poolContract.populateTransaction.supply(
      "0x2aabea2058b5ac2d339b163c6ab6f2b6d53aabed",
      parseUnits(currentAmount, 6).sub(2000000).toString(),
      signerAddress,
      0
    );
    return tx.data;
  }

  const getBridgeUrl = useCallback(async (currentAmount: string): Promise<string> => {
    if (!signer) return '';
    try {
      const signerAddress = await signer.getAddress();
      if (!signerAddress) {
        console.warn("Signer address not available.");
        return '';
      }
      const supplyTxData = await getSupplyData(currentAmount, signerAddress);
      const query = new URLSearchParams({
        srcChainId: '1',
        dstChainId: '100000009',
        srcChainTokenIn: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        dstChainTokenOut: '0x2aabea2058b5ac2d339b163c6ab6f2b6d53aabed',
        // USDT has 6 decimals
        srcChainTokenInAmount: ethers.utils.parseUnits(currentAmount, 6).toString(),

        dstChainTokenOutAmount: 'auto',
        // It's safer to use the connected wallet's address for recipient if that's the intent
        dstChainTokenOutRecipient: "0x6D01A9e00733a6309CC53051B101CDa3348568E9",
        srcChainOrderAuthorityAddress: signerAddress,
        dstChainOrderAuthorityAddress: signerAddress,
        dlnHook: JSON.stringify({
          type: "evm_transaction_call",
          data: {
            "fallbackAddress": signerAddress,
            "to": "0xbC92aaC2DBBF42215248B5688eB3D3d2b32F2c8d",
            "calldata": supplyTxData.toString(),
            "gas": Number(gasLimitRecommendations[ProtocolAction.supply].recommended)
          }
        })
      })
      return `https://dln.debridge.finance/v1.0/dln/order/create-tx?${query.toString()}`;
    } catch (error) {
      console.error("Error getting signer address in getBridgeUrl:", error);
      return '';
    }
  }, [signer]);

  useEffect(() => {
    const numericAmount = parseFloat(amount);
    if (numericAmount > 0 && signer) {
      const handler = setTimeout(async () => {
        setIsFetchingQuote(true);
        // setBridgeData(null); // Clear previous data
        try {
          const url = await getBridgeUrl(amount);
          if (url) {
            const response = await fetch(url);
            if (!response.ok) {
              // It's helpful to get the error message from the API if available
              const errorData = await response.json().catch(() => null);
              console.error("Debridge API error response:", errorData);
              throw new Error(`HTTP error! status: ${response.status}, message: ${errorData?.message || response.statusText}`);
            }
            const data: DebridgeResponse = await response.json();
            console.log("Debridge API response:", data);
            setBridgeData(data);
          } else {
            setBridgeData(null);
          }
        } catch (error) {
          console.error("Failed to fetch bridge quote:", error);
          setBridgeData(null); // Clear data on error
        } finally {
          setIsFetchingQuote(false);
        }
      }, 20000);

      return () => {
        clearTimeout(handler);
      };
    } else {
      setBridgeData(null); // Clear data if amount is not positive or signer is not available
      setIsFetchingQuote(false);
      setBridgeError(null); // Clear errors
    }
  }, [amount, signer, getBridgeUrl]);

  // Constants
  const USDT_TOKEN_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7'; // Ethereum USDT
  const TARGET_CHAIN_ID_FOR_TX = 1; // Ethereum Mainnet, as per srcChainId in getBridgeUrl

  // Check if token needs approval
  const checkTokenAllowance = useCallback(async () => {
    if (!signer || !bridgeData || !bridgeData.tx) return false;
    try {
      const signerAddress = await signer.getAddress();
      const tokenContract = new ethers.Contract(USDT_TOKEN_ADDRESS, ERC20_ABI, signer);

      // The spender is the deBridge contract address
      const spender = bridgeData.tx.to;

      // Get current allowance
      const currentAllowance = await tokenContract.allowance(signerAddress, spender);

      // Check if we need to approve the token
      const amountToSend = bridgeData.estimation.srcChainTokenIn.amount;
      const needsApproval = currentAllowance.lt(amountToSend);

      setNeedsApproval(needsApproval);
      return needsApproval;
    } catch (error) {
      console.error("Error checking token allowance:", error);
      setNeedsApproval(false);
      return false;
    }
  }, [signer, bridgeData]);

  // Approve token spending
  const approveToken = async () => {
    if (!signer || !bridgeData || !bridgeData.tx) return;

    setIsApproving(true);
    setBridgeError(null);

    try {
      // Switch network if needed
      if (currentChainId !== TARGET_CHAIN_ID_FOR_TX) {
        try {
          setIsSwitchingNetwork(true);
          await switchChainAsync({ chainId: TARGET_CHAIN_ID_FOR_TX });
          await new Promise(resolve => setTimeout(resolve, 1000));
          setIsSwitchingNetwork(false);
        } catch (switchError) {
          console.error("Failed to switch network:", switchError);
          setBridgeError(`Failed to switch to the required network: ${switchError.message || "Unknown error"}`);
          setIsApproving(false);
          setIsSwitchingNetwork(false);
          return;
        }
      }

      const tokenContract = new ethers.Contract(USDT_TOKEN_ADDRESS, ERC20_ABI, signer);
      const spender = bridgeData.tx.to;

      // Approve for max uint256 to avoid frequent approvals
      // For USDT specifically, we'll use the exact amount as it has approval issues with max uint
      // const amountToApprove = bridgeData.estimation.srcChainTokenIn.amount;

      const tx = await tokenContract.approve(spender, 50000000);
      console.log("Approval transaction sent:", tx.hash);

      // Wait for transaction to be mined
      await tx.wait();
      console.log("Approval confirmed");

      // Update approval status
      setNeedsApproval(false);
    } catch (error) {
      console.error("Token approval failed:", error);
      setBridgeError(error.shortMessage || error.message || "An unknown error occurred during token approval.");
    } finally {
      setIsApproving(false);
    }
  };

  // Effect to check token allowance when bridge data is available
  useEffect(() => {
    if (bridgeData && bridgeData.tx && signer) {
      checkTokenAllowance();
    }
  }, [bridgeData, signer, checkTokenAllowance]);

  const handleBridgeExecute = async () => {
    if (!walletClient || !bridgeData || !bridgeData.tx) {
      setBridgeError("Transaction data is not available. Please try again.");
      return;
    }

    // Check if approval is needed first
    const requiresApproval = await checkTokenAllowance();
    if (requiresApproval) {
      setBridgeError("Please approve token spending before bridging.");
      return;
    }

    setIsBridging(true);
    setBridgeError(null);

    try {
      // Check if we need to switch networks before executing the transaction
      if (currentChainId !== TARGET_CHAIN_ID_FOR_TX) {
        try {
          setIsSwitchingNetwork(true);
          console.log(`Switching from chain ${currentChainId} to ${TARGET_CHAIN_ID_FOR_TX}`);
          await switchChainAsync({ chainId: TARGET_CHAIN_ID_FOR_TX });
          // Wait briefly for the chain switch to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
          setIsSwitchingNetwork(false);
        } catch (switchError) {
          console.error("Failed to switch network:", switchError);
          setBridgeError(`Failed to switch to the required network: ${switchError.message || "Unknown error"}`);
          setIsBridging(false);
          setIsSwitchingNetwork(false);
          return;
        }
      }

      console.log("Sending transaction:", bridgeData.tx);
      const txHash = await walletClient.sendTransaction({
        to: bridgeData.tx.to as `0x${string}`,
        value: BigInt(bridgeData.tx.value), // Convert string value to BigInt
        data: bridgeData.tx.data as `0x${string}`,
        kzg: undefined,
        chainId: TARGET_CHAIN_ID_FOR_TX,
        account: walletClient.account,
        chain: walletClient.chain
      });
      console.log("Transaction sent, hash:", txHash);
      // TODO: Add success feedback, e.g., link to explorer, clear state, close modal
      alert(`Bridge transaction submitted! Hash: ${txHash}`);
      setBridgeData(null); // Clear data after successful tx
      setAmount(''); // Clear amount

    } catch (error) {
      console.error("Bridge execution failed:", error);
      setBridgeError(error.shortMessage || error.message || "An unknown error occurred during bridging.");
    } finally {
      setIsBridging(false);
    }
  };

  return (
    <BasicModal open={type === ModalType.Bridge} setOpen={close}>
      <TxModalTitle title="Bridge" />
      <Typography variant="secondary14" sx={{ mb: 1 }}>
        Bridge tokens using deBridge. Enter the amount you want to send.
      </Typography>
      <Typography variant="caption" sx={{ mb: 2, display: 'block' }}>
        From: USDT (Ethereum) to USDF (Flow EVM)
      </Typography>
      <InputBase
        sx={{ flex: 1 }}
        placeholder="0.00"
        value={amount}
        autoFocus
        onChange={(e) => {
          setAmount(e.target.value);
        }}
        inputProps={{
          'aria-label': 'amount input',
          style: {
            fontSize: '21px',
            lineHeight: '28,01px',
            padding: 0,
            height: '28px',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          },
        }}
      />
      {isFetchingQuote && (
        <Typography variant="secondary12" sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
          <CircularProgress size={16} sx={{ mr: 3 }} />
          Fetching best quote...
        </Typography>
      )}
      {bridgeData && bridgeData.estimation && !isFetchingQuote && (
        <div style={{ marginTop: '16px' }}>
          <Typography variant="secondary12" gutterBottom>
            <b>Transaction Estimate:</b>
          </Typography>

          <Typography variant="secondary12">
            Sending: {
              ethers.utils.formatUnits(
                bridgeData.estimation.srcChainTokenIn.amount,
                bridgeData.estimation.srcChainTokenIn.decimals
              )
            } {bridgeData.estimation.srcChainTokenIn.symbol}
          </Typography>

          <Typography variant="secondary12">
            Will Receive (approx.): {
              ethers.utils.formatUnits(
                bridgeData.estimation.dstChainTokenOut.amount,
                bridgeData.estimation.dstChainTokenOut.decimals
              )
            } {bridgeData.estimation.dstChainTokenOut.symbol}
          </Typography>

          {bridgeData.fixFee && (
            <Typography variant="secondary12">
              Fixed Fee: {ethers.utils.formatEther(bridgeData.fixFee)} ETH {/* Assuming fixFee is in wei */}
            </Typography>
          )}

          <Typography variant="secondary12">
            Recommended Slippage: {bridgeData.estimation.recommendedSlippage * 100}%
          </Typography>

          <Typography variant="secondary12" gutterBottom sx={{ mt: 1 }}>
            <b>Fee Details:</b>
          </Typography>
          {bridgeData.estimation.costsDetails.map((cost, index) => (
            <Typography key={index} variant="secondary12" sx={{ ml: 1 }}>
              - {cost.type} (Chain: {cost.chain}):
              {cost.payload?.feeAmount &&
                ` Fee: ${ethers.utils.formatUnits(cost.payload.feeAmount, bridgeData.estimation.srcChainTokenIn.decimals)}` /* Assuming feeAmount is in srcToken decimals, adjust if not */}
              {cost.payload?.feeBps && ` (${cost.payload.feeBps} BPS)`}
              {cost.payload?.feeApproximateUsdValue && ` (~${cost.payload.feeApproximateUsdValue} USD)`}
            </Typography>
          ))}

          {/* Display other relevant info if needed, e.g., userPoints */}
          {bridgeData.userPoints && (
            <Typography variant="secondary12" sx={{ mt: 1 }} >
              User Points: {bridgeData.userPoints}
            </Typography>
          )}

          {bridgeError && (
            <Typography variant="secondary12" color="error" sx={{ mt: 2 }}>
              Error: {bridgeError}
            </Typography>
          )}

          {currentChainId !== TARGET_CHAIN_ID_FOR_TX && (
            <Typography variant="secondary12" color="warning.main" sx={{ mt: 1 }}>
              Note: You&apos;ll need to switch to Ethereum Mainnet to proceed with this transaction.
            </Typography>
          )}

          {bridgeData.tx && !isFetchingQuote && (
            <>
              {needsApproval && (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={approveToken}
                  disabled={isApproving || isSwitchingNetwork}
                  fullWidth
                  sx={{ mt: 2, mb: 1 }}
                >
                  {isApproving ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : isSwitchingNetwork ? (
                    <>Switching to Ethereum Mainnet...</>
                  ) : (
                    `Approve USDT`
                  )}
                </Button>
              )}

              <Button
                variant="contained"
                color="primary"
                onClick={handleBridgeExecute}
                disabled={isBridging || isFetchingQuote || isSwitchingNetwork || needsApproval || isApproving}
                fullWidth
                sx={{ mt: needsApproval ? 1 : 2, mb: 1 }}
              >
                {isBridging ? (
                  <CircularProgress size={24} color="inherit" />
                ) : isSwitchingNetwork ? (
                  <>Switching to Ethereum Mainnet...</>
                ) : needsApproval ? (
                  `Approve USDT First`
                ) : currentChainId !== TARGET_CHAIN_ID_FOR_TX ? (
                  `Switch to Ethereum & Bridge`
                ) : (
                  `Bridge Now`
                )}
              </Button>
            </>
          )}

        </div>
      )}

    </BasicModal>
  );
};