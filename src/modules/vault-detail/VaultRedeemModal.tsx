import { Alert, Box, Button, Chip, CircularProgress, LinearProgress, Link, Typography, useTheme } from '@mui/material';
import { useUserPositionMultiChain } from '@oydual31/more-vaults-sdk/react';
import {
  asSdkClient,
  getVaultStatus,
  getWithdrawalRequest as sdkGetWithdrawalRequest,
  InsufficientLiquidityError,
  LZ_TIMEOUTS,
  quoteLzFee,
  waitForAsyncRequest,
} from '@oydual31/more-vaults-sdk/viem';
import BigNumber from 'bignumber.js';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { BasicModal } from 'src/components/primitives/BasicModal';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { AssetInput } from 'src/components/transactions/AssetInput';
import { formatTimeRemaining } from 'src/helpers/timeHelper';
import { useVault } from 'src/hooks/vault/useVault';
import { useAssetData, useUserVaultsData, useVaultData } from 'src/hooks/vault/useVaultData';
import { useOmniRequestStore } from 'src/store/omniRequestStore';
import { useRootStore } from 'src/store/root';
import { networkConfigs } from 'src/ui-config/networksConfig';
import { ChainIds } from 'src/utils/const';
import { roundToTokenDecimals } from 'src/utils/utils';
import { formatEther, formatUnits as viemFormatUnits } from 'viem';
import { useChainId, usePublicClient, useSwitchChain } from 'wagmi';

interface VaultRedeemModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  /** Open the spoke redeem (bridge-to-hub) modal for a given spoke chain */
  onRedeemFromSpoke?: (spokeChainId: number, shares: bigint, rawShares: bigint) => void;
}

export const VaultRedeemModal: React.FC<VaultRedeemModalProps> = ({ isOpen, setIsOpen, onRedeemFromSpoke }) => {
  const {
    signer,
    selectedVaultId,
    redeemFromVault,
    requestRedeem,
    getWithdrawalRequest,
    getWithdrawalTimelock,
    convertToAssets,
    maxRedeem,
    accountAddress,
    chainId: vaultChainId,
    enhanceTransactionWithGas,
    isOmniHub,
    omniHubChainId,
    omniRedeem,
  } = useVault();
  const theme = useTheme();
  // For omni vaults, use SDK-resolved hub chain; legacy as fallback for non-omni
  const chainId = isOmniHub ? omniHubChainId : vaultChainId;
  const wagmiChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient({ chainId });
  const userVaultData = useUserVaultsData(accountAddress, [selectedVaultId]);
  const refreshUserVaultData = userVaultData?.[0]?.refetch;
  const [currentNetworkConfig] = useRootStore((state) => [state.currentNetworkConfig]);

  const vaultData = useVaultData(selectedVaultId);
  const selectedVault = vaultData?.data;

  const assetData = useAssetData(selectedVault?.overview?.asset?.address || '');

  // SDK multi-chain position for omni vaults (hub + spoke shares)
  const { data: userPosition } = useUserPositionMultiChain(
    selectedVaultId as `0x${string}` | undefined,
    accountAddress as `0x${string}` | undefined
  );

  const [amount, setAmount] = useState('');
  const [maxAmountToRedeem, setMaxAmountToRedeem] = useState<BigNumber>(new BigNumber(0));
  const [convertedAssets, setConvertedAssets] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txAction, setTxAction] = useState<string | null>(null);
  // For omni vaults: track which chain the user selected to show amount input
  const [hubSelected, setHubSelected] = useState(false);
  // Spoke selection: { chainId, balance (bigint), rawBalance (bigint), decimals }
  const [selectedSpoke, setSelectedSpoke] = useState<{
    chainId: number;
    balance: bigint;
    rawBalance: bigint;
    decimals: number;
  } | null>(null);
  const [withdrawalRequest, setWithdrawalRequest] = useState<{
    shares: string;
    timeLockEndsAt: string;
  } | null>(null);

  const [timelock, setTimelock] = useState<string>('0');
  const [currentTime, setCurrentTime] = useState<number>(Date.now() / 1000);
  const [txError, setTxError] = useState<string | null>(null);

  // Omni vault state
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const [isFeeLoading, setIsFeeLoading] = useState(false);
  const [omniGuid, setOmniGuid] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const addOmniRequest = useOmniRequestStore((s) => s.addOmniRequest);

  // Omni async status — updated by waitForAsyncRequest inline
  const [omniStatus, setOmniStatus] = useState<'pending' | 'completed' | 'refunded'>('pending');
  const [omniResult, setOmniResult] = useState<bigint | null>(null);

  // Hub vault withdrawal queue and redeem flow type
  const [omniHasQueue, setOmniHasQueue] = useState<boolean>(false);
  const [vaultRedeemFlow, setVaultRedeemFlow] = useState<
    'redeemShares' | 'redeemAsync' | 'none' | null
  >(null);

  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setTxHash(null);
      setTxAction(null);
      setIsLoading(false);
      setWithdrawalRequest(null);
      setTxError(null);
      setConvertedAssets('0');
      setEstimatedFee(null);
      setOmniGuid(null);
      setOmniStatus('pending');
      setOmniResult(null);
      setOmniHasQueue(false);
      setVaultRedeemFlow(null);
      setHubSelected(false);
      setSelectedSpoke(null);
    }
  }, [isOpen]);

  // Auto-switch to hub chain when hub is selected for redeem
  useEffect(() => {
    if (!isOpen || !isOmniHub) return;
    if (hubSelected && wagmiChainId !== chainId) {
      switchChain({ chainId });
    }
  }, [isOpen, isOmniHub, hubSelected, wagmiChainId, chainId]);

  // Estimate bridge fee once when modal opens — fee is amount-independent
  useEffect(() => {
    if (!isOmniHub || !isOpen || !selectedVaultId || !publicClient) return;
    let cancelled = false;
    const run = async () => {
      setIsFeeLoading(true);
      try {
        const fee = await quoteLzFee(asSdkClient(publicClient), selectedVaultId as `0x${string}`);
        if (!cancelled) setEstimatedFee(formatEther((fee * BigInt(101)) / BigInt(100)));
      } catch {
        if (!cancelled) setEstimatedFee(null);
      } finally {
        if (!cancelled) setIsFeeLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [isOmniHub, isOpen, selectedVaultId, publicClient]);

  // Load withdrawal queue status and any pending request for omni hub vaults
  useEffect(() => {
    if (!isOmniHub || !isOpen || !selectedVaultId || !publicClient) return;
    let cancelled = false;
    const run = async () => {
      try {
        const status = await getVaultStatus(
          asSdkClient(publicClient),
          selectedVaultId as `0x${string}`
        );
        if (cancelled) return;
        setOmniHasQueue(status.withdrawalQueueEnabled);
        setVaultRedeemFlow(status.recommendedRedeemFlow as 'redeemShares' | 'redeemAsync' | 'none');

        if (status.withdrawalQueueEnabled && accountAddress) {
          const reqData = await sdkGetWithdrawalRequest(
            asSdkClient(publicClient),
            selectedVaultId as `0x${string}`,
            accountAddress as `0x${string}`
          );
          if (!cancelled) {
            if (reqData && reqData.shares > BigInt(0)) {
              setWithdrawalRequest({
                shares: reqData.shares.toString(),
                timeLockEndsAt: reqData.timelockEndsAt.toString(),
              });
            }
            setTimelock(status.withdrawalTimelockSeconds.toString());
          }
        }
      } catch {
        if (!cancelled) setOmniHasQueue(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [isOmniHub, isOpen, selectedVaultId, publicClient, accountAddress]);

  // Load max redeem amount when modal opens
  // For omni vaults: use SDK multi-chain position (hub shares only for now — spoke redeem is multi-step)
  // For non-omni: use legacy maxRedeem
  useEffect(() => {
    if (isOmniHub && userPosition) {
      const decimals = userPosition.decimals ?? selectedVault?.overview?.decimals ?? 18;
      // Only hub shares can be redeemed directly via smartRedeem
      const hubSharesFormatted = formatUnits(
        userPosition.hubShares.toString(),
        decimals
      );
      setMaxAmountToRedeem(new BigNumber(hubSharesFormatted));
      return;
    }

    const loadMaxRedeem = async () => {
      if (isOpen && accountAddress && selectedVaultId) {
        try {
          const maxShares = await maxRedeem(accountAddress);
          const maxSharesFormatted = formatUnits(
            maxShares,
            selectedVault?.overview?.decimals || 18
          );
          setMaxAmountToRedeem(new BigNumber(maxSharesFormatted));
        } catch (error) {
          console.error('Error loading max redeem:', error);
          setMaxAmountToRedeem(new BigNumber(0));
        }
      }
    };

    loadMaxRedeem();
  }, [isOpen, isOmniHub, userPosition, accountAddress, selectedVaultId, maxRedeem, selectedVault?.overview?.decimals]);

  // Determine txAction for omni vaults (with or without queue)
  useEffect(() => {
    if (!isOmniHub) return;
    if (txHash) return; // bridge tx already submitted — don't override txAction

    if (omniHasQueue) {
      // Queue enabled: request → wait for timelock → bridge redeem
      if (withdrawalRequest && withdrawalRequest.shares !== '0') {
        const timeLockEndsAt = parseInt(withdrawalRequest.timeLockEndsAt);
        if (currentTime >= timeLockEndsAt) {
          setTxAction('omni-redeem');
        } else {
          setTxAction('waiting');
        }
      } else if (amount && parseFloat(amount) > 0) {
        setTxAction('request');
      } else {
        setTxAction(null);
      }
      return;
    }

    // No queue: SDK handles approval internally, just set action based on amount
    if (!amount || parseFloat(amount) <= 0) {
      setTxAction(null);
      return;
    }
    setTxAction('omni-redeem');
  }, [
    isOmniHub,
    amount,
    selectedVault?.overview?.decimals,
    omniHasQueue,
    withdrawalRequest,
    currentTime,
    txHash,
  ]);

  // Load withdrawal request data when modal opens (mono-chain vaults only)
  useEffect(() => {
    const loadWithdrawalData = async () => {
      if (isOmniHub) return; // Handled by omni-specific effect above
      if (isOpen && accountAddress && selectedVaultId) {
        try {
          const [request, timelockDuration] = await Promise.all([
            getWithdrawalRequest(accountAddress),
            getWithdrawalTimelock(),
          ]);

          if (request.shares !== '0') {
            setWithdrawalRequest(request);
          } else {
            setWithdrawalRequest(null);
          }
          setTimelock(timelockDuration);
        } catch (error) {
          console.error('Error loading withdrawal data:', error);
          setWithdrawalRequest(null);
        }
      }
    };

    loadWithdrawalData();
  }, [
    isOpen,
    accountAddress,
    selectedVaultId,
    getWithdrawalRequest,
    getWithdrawalTimelock,
    convertToAssets,
  ]);

  // Convert shares to assets when amount changes
  useEffect(() => {
    const convertShares = async () => {
      if (amount && parseFloat(amount) > 0 && selectedVault?.overview?.decimals) {
        try {
          const sharesInWei = parseUnits(amount, selectedVault.overview.decimals);
          const assets = await convertToAssets(sharesInWei.toString());
          setConvertedAssets(assets);
        } catch (error) {
          console.error('Error converting shares to assets:', error);
          setConvertedAssets('0');
        }
      } else {
        setConvertedAssets('0');
      }
    };

    convertShares();
  }, [amount, selectedVault?.overview?.decimals, convertToAssets]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now() / 1000);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-hide transaction hash when timelock expires (mono-chain)
  useEffect(() => {
    if (!isOmniHub && withdrawalRequest && txHash) {
      const timeLockEndsAt = parseInt(withdrawalRequest.timeLockEndsAt);
      if (currentTime >= timeLockEndsAt) {
        setTxHash(null);
      }
    }
  }, [isOmniHub, withdrawalRequest, txHash, currentTime]);

  // Pre-fill amount when withdrawal request is loaded
  useEffect(() => {
    if (withdrawalRequest && selectedVault?.overview?.decimals) {
      const formattedAmount = formatUnits(
        withdrawalRequest.shares,
        selectedVault.overview.decimals
      );
      setAmount(formattedAmount);
    }
  }, [withdrawalRequest, selectedVault?.overview?.decimals]);

  // txAction state machine for mono-chain vaults
  useEffect(() => {
    if (isOmniHub) return;
    if (withdrawalRequest && selectedVault?.overview?.decimals) {
      const timeLockEndsAt = parseInt(withdrawalRequest.timeLockEndsAt);
      const canWithdraw = currentTime >= timeLockEndsAt;
      const requestedAmount = formatUnits(
        withdrawalRequest.shares,
        selectedVault.overview.decimals
      );

      const isAmountZero = !amount || parseFloat(amount) === 0;
      const enteredAmount = parseFloat(amount || '0');
      const requestedAmountNum = parseFloat(requestedAmount);
      const hasAmountGreaterThanRequested = !isAmountZero && enteredAmount > requestedAmountNum;

      if (canWithdraw && (isAmountZero || enteredAmount <= requestedAmountNum)) {
        setTxAction('redeem');
      } else if (hasAmountGreaterThanRequested) {
        setTxAction('request');
        if (txHash) {
          setTxHash(null);
        }
      } else if (canWithdraw) {
        setTxAction('redeem');
      } else {
        setTxAction('waiting');
      }
    } else if (amount && parseFloat(amount) > 0) {
      setTxAction('request');
    } else {
      setTxAction(null);
    }
  }, [amount, withdrawalRequest, currentTime, selectedVault?.overview?.decimals, isOmniHub]);

  const convertedAssetsFormatted = assetData.data
    ? formatUnits(convertedAssets, assetData.data.decimals)
    : '0';
  const convertedAssetsInUsd = new BigNumber(convertedAssetsFormatted).multipliedBy(
    assetData.data?.price || 0
  );

  const handleChange = (value: string) => {
    if (txError) {
      setTxError(null);
    }

    if (value === '-1') {
      setAmount(maxAmountToRedeem.toString());
    } else {
      const decimalTruncatedValue = roundToTokenDecimals(
        value,
        selectedVault?.overview?.decimals || 18
      );
      setAmount(decimalTruncatedValue);
    }
  };

  const handleClick = async () => {
    // Omni redeem path
    if (isOmniHub && omniRedeem) {
      // If bridge tx is done (txAction null), open the explorer
      if (txHash && txAction === null) {
        window.open(`${networkConfigs[chainId]?.explorerLink}/tx/${txHash}`, '_blank');
        return;
      }
      if (!txAction || !selectedVault?.overview?.decimals || !signer) return;

      setIsLoading(true);
      setTxError(null);

      try {
        // Two-step path: standard requestRedeem first, then bridge redeem after timelock
        if (txAction === 'request') {
          const sharesInWei = parseUnits(amount, selectedVault.overview.decimals).toString();
          const { tx } = await requestRedeem(sharesInWei);
          const enhancedTx = await enhanceTransactionWithGas(tx);
          const response = await signer.sendTransaction(enhancedTx);
          const receipt = await response.wait();

          if (receipt && receipt.status === 1) {
            // Reload withdrawal request after successful request
            if (selectedVaultId && publicClient && accountAddress) {
              try {
                const [reqData, status] = await Promise.all([
                  sdkGetWithdrawalRequest(
                    asSdkClient(publicClient),
                    selectedVaultId as `0x${string}`,
                    accountAddress as `0x${string}`
                  ),
                  getVaultStatus(asSdkClient(publicClient), selectedVaultId as `0x${string}`),
                ]);
                if (reqData && reqData.shares > BigInt(0)) {
                  setWithdrawalRequest({
                    shares: reqData.shares.toString(),
                    timeLockEndsAt: reqData.timelockEndsAt.toString(),
                  });
                  setTimelock(status.withdrawalTimelockSeconds.toString());
                }
              } catch {}
            }
            if (refreshUserVaultData) refreshUserVaultData();
          } else {
            setTxError('Request redeem transaction failed or was rejected.');
          }
          return;
        }

        // smartRedeem auto-detects sync vs async based on vault mode
        const sharesInWei =
          omniHasQueue && withdrawalRequest
            ? withdrawalRequest.shares
            : parseUnits(amount, selectedVault.overview.decimals).toString();

        const { txHash: hash, guid: capturedGuid } = await omniRedeem(sharesInWei);
        setTxHash(hash);
        setTxAction(null);
        setWithdrawalRequest(null);
        setOmniStatus('pending');
        setOmniResult(null);
        if (capturedGuid) {
          setOmniGuid(capturedGuid);
          addOmniRequest({
            guid: capturedGuid,
            vaultId: selectedVaultId!,
            chainId,
            type: 'redeem',
            status: 'pending',
            txHash: hash,
            vaultName: selectedVault?.overview?.name,
          });
          // Wait for async finalization via GUID polling (SDK 0.2.6)
          setIsLoading(false); // unlock UI while waiting
          const final = await waitForAsyncRequest(
            asSdkClient(publicClient!),
            selectedVaultId as `0x${string}`,
            capturedGuid as `0x${string}`,
            LZ_TIMEOUTS.POLL_INTERVAL,
            LZ_TIMEOUTS.LZ_READ_CALLBACK,
          );
          setOmniStatus(final.status as 'completed' | 'refunded');
          setOmniResult(final.result);
          queryClient.invalidateQueries({ queryKey: ['userPositionMultiChain'] });
          queryClient.invalidateQueries({ queryKey: ['vaultStatus'] });
          if (refreshUserVaultData) refreshUserVaultData();
        } else {
          // Sync redeem — assets received immediately
          if (refreshUserVaultData) refreshUserVaultData();
        }
      } catch (error) {
        if (error instanceof InsufficientLiquidityError) {
          const underlyingDecimals = assetData.data?.decimals ?? 6;
          const available = viemFormatUnits(error.hubLiquid, underlyingDecimals);
          const needed = viemFormatUnits(error.required, underlyingDecimals);
          const symbol = assetData.data?.symbol ?? 'tokens';
          setTxError(
            `Hub doesn't have enough liquidity. Available: ${available} ${symbol} — needed: ${needed} ${symbol}. Try a smaller amount or wait for funds to be repatriated from spoke chains.`
          );
        } else {
          console.error('Error during omni redeem:', error);
          setTxError(error instanceof Error ? error.message : 'An unexpected error occurred.');
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Standard redeem path
    if (txHash && (txAction === 'waiting' || !withdrawalRequest)) {
      const explorerLink =
        currentNetworkConfig?.explorerLinkBuilder?.({ tx: txHash }) ||
        `${networkConfigs[chainId].explorerLink}/tx/${txHash}`;
      window.open(explorerLink, '_blank');
      return;
    }

    if (!txAction || !selectedVault?.overview?.decimals || !signer) {
      return;
    }

    setIsLoading(true);
    setTxError(null);
    try {
      if (txAction === 'request') {
        const { tx } = await requestRedeem(
          parseUnits(amount, selectedVault.overview.decimals).toString()
        );
        const enhancedTx = await enhanceTransactionWithGas(tx);
        const response = await signer.sendTransaction(enhancedTx);
        const receipt = await response.wait();

        if (receipt && receipt.status === 1) {
          try {
            const [request, timelockDuration] = await Promise.all([
              getWithdrawalRequest(accountAddress),
              getWithdrawalTimelock(),
            ]);

            if (request.shares !== '0') {
              setWithdrawalRequest(request);

              const timeLockEndsAt = parseInt(request.timeLockEndsAt);
              const currentTimestamp = Date.now() / 1000;

              if (parseInt(timelockDuration) === 0 || currentTimestamp >= timeLockEndsAt) {
                setTxHash(null);
                setTxAction('redeem');
              } else {
                setTxHash(receipt.transactionHash);
                setTxAction('waiting');
              }
            } else {
              setWithdrawalRequest(null);
              setTxHash(receipt.transactionHash);
              setTxAction(null);
            }

            if (refreshUserVaultData) {
              refreshUserVaultData();
            }
          } catch (error) {
            console.error('Error reloading withdrawal request:', error);
            setTxHash(receipt.transactionHash);
            setTxAction(null);
            if (refreshUserVaultData) {
              refreshUserVaultData();
            }
          }
        } else {
          console.error('Request redeem transaction failed or was rejected.');
          setTxError('Request redeem transaction failed or was rejected.');
        }
      } else if (txAction === 'redeem') {
        const sharesToRedeem = withdrawalRequest
          ? withdrawalRequest.shares
          : parseUnits(amount, selectedVault.overview.decimals).toString();

        const { tx } = await redeemFromVault(sharesToRedeem);
        const enhancedTx = await enhanceTransactionWithGas(tx);
        const response = await signer.sendTransaction(enhancedTx);
        const receipt = await response.wait();

        if (receipt && receipt.status === 1) {
          setTxHash(receipt.transactionHash);
          setTxAction(null);
          setWithdrawalRequest(null);

          if (refreshUserVaultData) {
            refreshUserVaultData();
          }
        } else {
          console.error('Redeem transaction failed or was rejected.');
          setTxError('Redeem transaction failed or was rejected.');
        }
      }
    } catch (error) {
      console.error('Error during redeem process:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred during the transaction.';
      setTxError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonContent = useMemo(() => {
    // Omni path
    if (isOmniHub) {
      if (txHash && txAction === null)
        return `See transaction on ${networkConfigs[chainId]?.explorerName || 'explorer'}`;
      if (isLoading) {
        if (txAction === 'request') return 'Requesting withdrawal...';
        if (txAction === 'omni-redeem') return 'Withdrawing...';
        return 'Processing...';
      }
      if (!amount || parseFloat(amount) <= 0) return 'Enter an amount';
      if (txAction === 'request') return 'Request withdrawal';
      if (txAction === 'waiting') {
        const timeLockEndsAt = parseInt(withdrawalRequest?.timeLockEndsAt || '0');
        const timeRemaining = timeLockEndsAt - currentTime;
        return `Timelock: ${formatTimeRemaining(timeRemaining)} remaining`;
      }
      if (txAction === 'omni-redeem') return omniHasQueue ? 'Complete' : 'Withdraw';
      return 'Enter an amount';
    }

    if (isLoading) {
      if (txAction === 'request') {
        return 'Requesting withdrawal...';
      } else if (txAction === 'redeem') {
        return 'Withdrawing...';
      }
    }
    if (!selectedVault?.overview?.decimals) {
      return 'Loading...';
    }

    if (withdrawalRequest) {
      const timeLockEndsAt = parseInt(withdrawalRequest.timeLockEndsAt);
      const canWithdraw = currentTime >= timeLockEndsAt;
      const requestedAmount = selectedVault?.overview?.decimals
        ? formatUnits(withdrawalRequest.shares, selectedVault.overview.decimals)
        : '0';
      const enteredAmount = parseFloat(amount || '0');
      const requestedAmountNum = parseFloat(requestedAmount);
      const hasAmountGreaterThanRequested = enteredAmount > requestedAmountNum;

      if (canWithdraw && (!amount || amount === '0' || enteredAmount <= requestedAmountNum)) {
        return 'Complete withdrawal';
      } else if (hasAmountGreaterThanRequested) {
        return 'Request new withdrawal';
      } else if (canWithdraw) {
        return 'Complete withdrawal';
      } else {
        if (txHash && txAction === 'waiting') {
          return `See transaction on ${currentNetworkConfig?.explorerName}`;
        }
        const timeRemaining = timeLockEndsAt - currentTime;
        return `Timelock: ${formatTimeRemaining(timeRemaining)} remaining`;
      }
    }

    if (txHash && !withdrawalRequest) {
      return `See transaction on ${currentNetworkConfig?.explorerName}`;
    }

    if (amount === '0' || !amount) {
      return 'Enter an amount';
    }

    if (txAction === 'request') {
      return 'Request withdrawal';
    }

    return 'Enter an amount';
  }, [
    amount,
    selectedVault?.overview?.decimals,
    txHash,
    isLoading,
    txAction,
    withdrawalRequest,
    currentTime,
    currentNetworkConfig?.explorerName,
    isOmniHub,
    omniHasQueue,
  ]);

  return (
    <BasicModal open={isOpen} setOpen={setIsOpen}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Typography variant="h2">Withdraw from the vault</Typography>
          {chainId === ChainIds.flowEVMTestnet && (
            <Box sx={{ display: 'flex' }}>
              <Button
                variant="surface"
                size="small"
                color="primary"
                sx={{
                  backgroundColor: '#B6509E',
                  height: '22px',
                  '&:hover, &.Mui-focusVisible': { backgroundColor: 'rgba(182, 80, 158, 0.7)' },
                }}
              >
                TESTNET
              </Button>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <img
              src={selectedVault?.overview?.curatorLogo || '/MOREVault.svg'}
              width="45px"
              height="45px"
              alt="token-svg"
              style={{ borderRadius: '50%' }}
            />
            <Box>
              <Typography variant="main16">{selectedVault?.overview?.name}</Typography>
            </Box>
          </Box>
        </Box>

        {/* Withdrawal request info for mono-chain */}
        {!isOmniHub && withdrawalRequest && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="subheader1" sx={{ mb: 1 }}>
              Current Withdrawal Request
            </Typography>
            <Typography variant="secondary14" sx={{ mb: 1 }}>
              Requested shares:{' '}
              {selectedVault?.overview?.decimals
                ? formatUnits(withdrawalRequest.shares, selectedVault.overview.decimals)
                : '0'}{' '}
              {selectedVault?.overview?.symbol}
            </Typography>
            <Typography variant="secondary14">
              {currentTime >= parseInt(withdrawalRequest.timeLockEndsAt)
                ? 'Timelock completed - you can now redeem'
                : `Timelock ends in ${formatTimeRemaining(
                    parseInt(withdrawalRequest.timeLockEndsAt) - currentTime
                  )} (${new Date(
                    parseInt(withdrawalRequest.timeLockEndsAt) * 1000
                  ).toLocaleString()})`}
            </Typography>
          </Box>
        )}

        {/* Omni hub: pending withdrawal request info — hidden when stepper active */}
        {isOmniHub && omniHasQueue && withdrawalRequest && !(txHash && txAction === null) && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="subheader1" sx={{ mb: 1 }}>
              Current Withdrawal Request
            </Typography>
            <Typography variant="secondary14" sx={{ mb: 1 }}>
              Requested shares:{' '}
              {selectedVault?.overview?.decimals
                ? formatUnits(withdrawalRequest.shares, selectedVault.overview.decimals)
                : '0'}{' '}
              {selectedVault?.overview?.symbol}
            </Typography>
            <Typography variant="secondary14">
              {currentTime >= parseInt(withdrawalRequest.timeLockEndsAt)
                ? 'Timelock completed — ready to complete'
                : `Timelock ends in ${formatTimeRemaining(
                    parseInt(withdrawalRequest.timeLockEndsAt) - currentTime
                  )} (${new Date(
                    parseInt(withdrawalRequest.timeLockEndsAt) * 1000
                  ).toLocaleString()})`}
            </Typography>
          </Box>
        )}

        {/* Redeem source selector for omni vaults — hidden when stepper is active */}
        {isOmniHub && userPosition && !(txHash && txAction === null) && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Hub option */}
            {(() => {
              const hasBalance = maxAmountToRedeem.gt(0);
              return (
                <Box
                  onClick={() => { if (hasBalance) { setHubSelected(true); setSelectedSpoke(null); setAmount(''); } }}
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 2, py: 1.5, px: 2, borderRadius: 2,
                    border: '1.5px solid',
                    borderColor: hubSelected ? theme.palette.other.chartHighlight : '#E0E0E0',
                    cursor: hasBalance ? 'pointer' : 'default',
                    opacity: hasBalance ? 1 : 0.45,
                    bgcolor: 'transparent',
                    transition: 'border-color 0.15s',
                    '&:hover': hasBalance ? { borderColor: theme.palette.text.muted, bgcolor: theme.palette.background.surface } : {},
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {networkConfigs[chainId]?.networkLogoPath && (
                      <img src={networkConfigs[chainId].networkLogoPath} width={32} height={32} alt="" style={{ borderRadius: '50%' }} />
                    )}
                    <Box>
                      <Typography variant="main14" fontWeight={600}>
                        {networkConfigs[chainId]?.name || 'Hub'}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                        <Chip label="Hub" size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: theme.palette.other.chartHighlight, color: '#fff' }} />
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="secondary14" fontWeight={600} color={hasBalance ? 'text.primary' : 'text.secondary'}>
                      {hasBalance ? parseFloat(maxAmountToRedeem.toString()).toFixed(4) : '0'}
                    </Typography>
                    <Typography variant="secondary12" color="text.secondary">shares</Typography>
                  </Box>
                </Box>
              );
            })()}
            {/* Spoke options */}
            {userPosition.spokeShares && Object.entries(userPosition.spokeShares).map(([cid, bal]) => {
              const spokeId = Number(cid);
              const decimals = userPosition.decimals ?? 8;
              const formatted = parseFloat(formatUnits((bal as bigint).toString(), decimals)).toFixed(4);
              const chainName = networkConfigs[spokeId]?.name || `Chain ${spokeId}`;
              const hasBalance = (bal as bigint) > BigInt(0);
              return (
                <Box
                  key={cid}
                  onClick={() => {
                    if (hasBalance && onRedeemFromSpoke) {
                      const raw = (userPosition as any).rawSpokeShares?.[spokeId] ?? bal;
                      setSelectedSpoke({
                        chainId: spokeId,
                        balance: bal as bigint,
                        rawBalance: raw as bigint,
                        decimals,
                      });
                      setHubSelected(false);
                      setAmount('');
                    }
                  }}
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 2, py: 1.5, px: 2, borderRadius: 2,
                    border: '1.5px solid', borderColor: selectedSpoke?.chainId === spokeId ? theme.palette.other.chartHighlight : '#E0E0E0',
                    cursor: hasBalance && onRedeemFromSpoke ? 'pointer' : 'default',
                    opacity: hasBalance ? 1 : 0.45,
                    bgcolor: 'transparent',
                    transition: 'border-color 0.15s',
                    '&:hover': hasBalance && onRedeemFromSpoke ? { borderColor: theme.palette.text.muted, bgcolor: theme.palette.background.surface } : {},
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {networkConfigs[spokeId]?.networkLogoPath && (
                      <img src={networkConfigs[spokeId].networkLogoPath} width={32} height={32} alt="" style={{ borderRadius: '50%' }} />
                    )}
                    <Box>
                      <Typography variant="main14" fontWeight={600}>
                        {chainName}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                        <Chip label="Crosschain" size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="secondary14" fontWeight={600} color={hasBalance ? 'text.primary' : 'text.secondary'}>
                      {hasBalance ? formatted : '0'}
                    </Typography>
                    <Typography variant="secondary12" color="text.secondary">shares</Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {/* Amount input — for spoke redeem (shown after selecting a spoke, hidden when stepper active) */}
        {isOmniHub && selectedSpoke && !(txHash && txAction === null) && (() => {
          const spokeMaxFormatted = formatUnits(selectedSpoke.balance.toString(), selectedSpoke.decimals);
          const spokeMax = new BigNumber(spokeMaxFormatted);
          return (
            <>
              <AssetInput
                value={amount}
                onChange={(value: string) => {
                  if (txError) setTxError(null);
                  if (value === '-1') {
                    setAmount(spokeMax.toString());
                  } else {
                    const decimalTruncatedValue = roundToTokenDecimals(
                      value,
                      selectedSpoke.decimals
                    );
                    setAmount(decimalTruncatedValue);
                  }
                }}
                usdValue="0"
                symbol={selectedVault?.overview?.symbol}
                assets={[
                  {
                    balance: spokeMax.toString(),
                    symbol: selectedVault?.overview?.symbol,
                    iconSymbol: selectedVault?.overview?.curatorLogo
                      ?.split('/')
                      .pop()
                      ?.replace(/\.[^/.]+$/, ''),
                  },
                ]}
                isMaxSelected={amount === spokeMax.toString()}
                maxValue={spokeMax.toString()}
                balanceText="Available to redeem"
              />
              <Button
                variant="gradient"
                disabled={!amount || parseFloat(amount) <= 0 || !onRedeemFromSpoke}
                onClick={() => {
                  if (!onRedeemFromSpoke || !amount || parseFloat(amount) <= 0) return;
                  const decimals = selectedSpoke.decimals;
                  const sharesWei = parseUnits(amount, decimals);
                  // Scale raw shares proportionally: rawBalance * (entered / total)
                  const rawScaled = selectedSpoke.rawBalance * BigInt(sharesWei.toString()) / selectedSpoke.balance;
                  setIsOpen(false);
                  onRedeemFromSpoke(selectedSpoke.chainId, BigInt(sharesWei.toString()), rawScaled);
                }}
                size="large"
                sx={{ minHeight: '44px' }}
              >
                {!amount || parseFloat(amount) <= 0
                  ? 'Enter an amount'
                  : `Withdraw from ${networkConfigs[selectedSpoke.chainId]?.name || 'spoke'}`}
              </Button>
            </>
          );
        })()}

        {/* Amount input — for hub redeem (hidden when stepper active) */}
        {(!isOmniHub || hubSelected) && !(isOmniHub && txHash && txAction === null) && (
          <AssetInput
            value={amount}
            onChange={handleChange}
            usdValue={convertedAssetsInUsd.toString(10)}
            symbol={selectedVault?.overview?.symbol}
            assets={[
              {
                balance: maxAmountToRedeem?.toString(),
                symbol: selectedVault?.overview?.symbol,
                iconSymbol: selectedVault?.overview?.curatorLogo
                  ?.split('/')
                  .pop()
                  ?.replace(/\.[^/.]+$/, ''),
              },
            ]}
            isMaxSelected={amount === maxAmountToRedeem?.toString()}
            maxValue={maxAmountToRedeem?.toString()}
            balanceText={withdrawalRequest ? 'Request new redemption amount' : 'Available to redeem'}
          />
        )}

        {/* Show asset conversion — hidden when stepper active */}
        {amount && parseFloat(amount) > 0 && assetData.data && !(isOmniHub && txHash && txAction === null) && (
          <Box
            sx={{
              p: 2,
              bgcolor: 'background.surface',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="secondary14" sx={{ color: 'text.secondary', mb: 1 }}>
              <strong>You will receive approximately:</strong>
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TokenIcon
                symbol={selectedVault?.overview?.asset?.symbol || ''}
                sx={{ fontSize: '16px' }}
              />
              <FormattedNumber
                value={convertedAssetsFormatted}
                symbol={assetData.data.symbol}
                variant="main16"
                compact
              />
              <Typography variant="secondary14" sx={{ color: 'text.secondary' }}>
                (${convertedAssetsInUsd.toFixed(2)})
              </Typography>
            </Box>
          </Box>
        )}

        {isOmniHub && hubSelected && !(txHash && txAction === null) && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {wagmiChainId !== chainId && amount && parseFloat(amount) > 0 && (
              <Alert
                severity="warning"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => switchChain({ chainId })}
                  >
                    Switch to {networkConfigs[chainId]?.name || 'hub'}
                  </Button>
                }
              >
                Switch to {networkConfigs[chainId]?.name || 'hub'} to withdraw.
              </Alert>
            )}
            {/* Only show bridge fee for async redeems and not in queue-request step */}
            {txAction !== 'request' && vaultRedeemFlow !== 'redeemShares' && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="secondary14" color="text.secondary">
                  Bridge fee
                </Typography>
                {isFeeLoading ? (
                  <CircularProgress size={14} />
                ) : estimatedFee ? (
                  <Typography variant="secondary14">
                    ~{parseFloat(estimatedFee).toFixed(6)}{' '}
                    {networkConfigs[chainId]?.baseAssetSymbol || 'ETH'}
                  </Typography>
                ) : (
                  <Typography variant="secondary14" color="text.secondary">
                    —
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* Omni hub with queue: explain two-step withdrawal process — hidden when stepper active */}
        {isOmniHub && hubSelected && omniHasQueue && !withdrawalRequest && !(txHash && txAction === null) && (
          <Box
            sx={{
              mb: 2,
              p: 2,
              bgcolor: 'background.surface',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="secondary14" sx={{ color: 'text.secondary' }}>
              <strong>Withdrawal process:</strong>
              <span>
                {' '}
                This vault requires a two-step withdrawal. First request your withdrawal and wait
                for the timelock, then complete it.
              </span>
            </Typography>
            {txAction === 'request' && timelock && parseInt(timelock) > 0 && (
              <Typography
                variant="secondary14"
                sx={{ color: 'warning.main', mt: 1, fontWeight: 'bold' }}
              >
                ⏱️ Timelock duration: {formatTimeRemaining(parseInt(timelock))}
              </Typography>
            )}
          </Box>
        )}

        {!isOmniHub && (
          <Box
            sx={{
              mb: 2,
              p: 2,
              bgcolor: 'background.surface',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="secondary14" sx={{ color: 'text.secondary' }}>
              <strong>Withdrawal process:</strong>
              {withdrawalRequest ? (
                <span>
                  {' '}
                  The value of your shares in the base asset may have changed since you requested
                  your withdrawal. This difference is due to vault rebalancing that occurs during
                  the timelock period.
                </span>
              ) : (
                <span>
                  {' '}
                  To protect other depositors, withdrawals are timelocked. The vault may reallocate
                  assets during this period and may impact the value of your redemption.
                </span>
              )}
            </Typography>

            {txAction === 'request' && timelock && parseInt(timelock) > 0 && (
              <Typography
                variant="secondary14"
                sx={{ color: 'warning.main', mt: 1, fontWeight: 'bold' }}
              >
                ⏱️ Timelock duration: {formatTimeRemaining(parseInt(timelock))}
              </Typography>
            )}
          </Box>
        )}

        {/* Hub redeem stepper — shown after TX is submitted */}
        {isOmniHub && txHash && txAction === null && (() => {
          const steps = [
            {
              label: 'Withdraw',
              done: !!txHash,
              active: !!txHash && omniStatus === 'pending' && !omniGuid,
            },
            {
              label: 'Cross-chain accounting',
              done: omniStatus === 'completed' || omniStatus === 'refunded',
              active: omniStatus === 'pending' && !!omniGuid,
            },
          ];
          const statusLabel = omniStatus === 'pending'
            ? (omniGuid ? 'Waiting for cross-chain accounting (~2-5 min)...' : 'Transaction confirmed')
            : omniStatus === 'completed'
            ? (omniResult
                ? `Withdraw complete — ${parseFloat(viemFormatUnits(omniResult, assetData.data?.decimals ?? 6)).toFixed(4)} ${assetData.data?.symbol ?? 'tokens'} returned`
                : 'Withdraw complete — assets returned to your wallet')
            : 'Withdraw refunded — shares returned to your wallet';
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="secondary14" fontWeight={600}>{statusLabel}</Typography>
              {omniStatus === 'pending' && <LinearProgress sx={{ borderRadius: 1 }} />}

              {/* Step circles */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {steps.map((s, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 24, height: 24, borderRadius: '50%',
                        bgcolor: s.done ? 'success.main' : s.active ? 'primary.main' : 'grey.500',
                        color: 'primary.contrastText',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, flexShrink: 0,
                      }}
                    >
                      {s.done ? '\u2713' : i + 1}
                    </Box>
                    <Typography variant="secondary14" sx={{ fontWeight: s.active ? 600 : 400 }}>
                      {s.label}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* TX link */}
              <Box
                sx={{
                  p: 2, bgcolor: 'background.surface', borderRadius: 1,
                  border: '1px solid', borderColor: 'divider',
                  display: 'flex', flexDirection: 'column', gap: 1,
                }}
              >
                <Link
                  href={`${networkConfigs[chainId]?.explorerLink}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="secondary14"
                >
                  View on {networkConfigs[chainId]?.explorerName || 'explorer'} ↗
                </Link>
                {omniGuid && (
                  <Link
                    href={`https://layerzeroscan.com/tx/${omniGuid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="secondary14"
                  >
                    Track on LayerZero Scan ↗
                  </Link>
                )}
              </Box>
            </Box>
          );
        })()}

        {txError && (
          <Box
            sx={{
              mb: 2,
              p: 2,
              bgcolor: 'error.main',
              color: 'error.contrastText',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'error.main',
            }}
          >
            <Typography variant="secondary14" sx={{ fontWeight: 'bold', mb: 1 }}>
              Transaction Error
            </Typography>
            <Typography variant="caption">{txError}</Typography>
          </Box>
        )}

        {/* Action buttons — hidden until hub selected for omni vaults, hidden when spoke selected */}
        {(!isOmniHub || (hubSelected && !selectedSpoke)) && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Hide main action button when hub stepper is active */}
          {!(isOmniHub && txHash && txAction === null) && (
            <Button
              variant={
                (txHash && (!withdrawalRequest || isOmniHub)) || (txHash && txAction === 'waiting')
                  ? 'contained'
                  : 'gradient'
              }
              disabled={
                isLoading ||
                (isOmniHub && wagmiChainId !== chainId) ||
                (isOmniHub && txAction === 'waiting') ||
                (isOmniHub && !txAction && (!amount || amount === '0') && !withdrawalRequest) ||
                (!isOmniHub && txAction === 'waiting' && !(txHash && txAction === 'waiting')) ||
                (!isOmniHub && !withdrawalRequest && (!amount || amount === '0'))
              }
              onClick={handleClick}
              size="large"
              sx={{ minHeight: '44px' }}
              data-cy="actionButton"
            >
              {isLoading && <CircularProgress color="inherit" size="16px" sx={{ mr: 2 }} />}
              {buttonContent}
            </Button>
          )}
          {txHash && (
            <Button
              variant="outlined"
              onClick={() => setIsOpen(false)}
              size="large"
              sx={{ minHeight: '44px' }}
            >
              Close
            </Button>
          )}
        </Box>
        )}
      </Box>
    </BasicModal>
  );
};
