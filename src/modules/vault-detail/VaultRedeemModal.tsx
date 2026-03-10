import { Alert, Box, Button, CircularProgress, Link, Typography } from '@mui/material';
import BigNumber from 'bignumber.js';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { useMemo, useState, useEffect } from 'react';
import { BasicModal } from 'src/components/primitives/BasicModal';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { AssetInput } from 'src/components/transactions/AssetInput';
import { useVault } from 'src/hooks/vault/useVault';
import { useUserVaultsData, useVaultData, useAssetData } from 'src/hooks/vault/useVaultData';
import { networkConfigs } from 'src/ui-config/networksConfig';
import { roundToTokenDecimals } from 'src/utils/utils';
import { ChainIds } from 'src/utils/const';
import { useRootStore } from 'src/store/root';
import { useOmniRequestStore } from 'src/store/omniRequestStore';
import { formatTimeRemaining } from 'src/helpers/timeHelper';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { useChainId, usePublicClient, useSwitchChain } from 'wagmi';
import { formatEther, formatUnits as viemFormatUnits } from 'viem';
import {
  asSdkClient,
  getVaultStatus,
  getWithdrawalRequest as sdkGetWithdrawalRequest,
  quoteLzFee,
  InsufficientLiquidityError,
} from '@oydual31/more-vaults-sdk/viem';

interface VaultRedeemModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const VaultRedeemModal: React.FC<VaultRedeemModalProps> = ({
  isOpen,
  setIsOpen,
}) => {
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
    omniRedeem,
  } = useVault();
  const chainId = vaultChainId;
  const wagmiChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient({ chainId });
  const userVaultData = useUserVaultsData(accountAddress, [selectedVaultId]);
  const refreshUserVaultData = userVaultData?.[0]?.refetch;
  const [currentNetworkConfig] = useRootStore((state) => [
    state.currentNetworkConfig,
  ]);

  const vaultData = useVaultData(selectedVaultId);
  const selectedVault = vaultData?.data;

  const assetData = useAssetData(selectedVault?.overview?.asset?.address || '');

  const [amount, setAmount] = useState('');
  const [maxAmountToRedeem, setMaxAmountToRedeem] = useState<BigNumber>(new BigNumber(0));
  const [convertedAssets, setConvertedAssets] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txAction, setTxAction] = useState<string | null>(null);
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
  const addOmniRequest = useOmniRequestStore((s) => s.addOmniRequest);
  const omniStatus = useOmniRequestStore((s) => omniGuid ? s.omniRequests[omniGuid]?.status ?? 'pending' : 'pending');

  // Hub vault withdrawal queue and redeem flow type
  const [omniHasQueue, setOmniHasQueue] = useState<boolean>(false);
  const [vaultRedeemFlow, setVaultRedeemFlow] = useState<'redeemShares' | 'redeemAsync' | 'none' | null>(null);

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
      setOmniHasQueue(false);
      setVaultRedeemFlow(null);
    }
  }, [isOpen]);

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
    return () => { cancelled = true; };
  }, [isOmniHub, isOpen, selectedVaultId, publicClient]);

  // Load withdrawal queue status and any pending request for omni hub vaults
  useEffect(() => {
    if (!isOmniHub || !isOpen || !selectedVaultId || !publicClient) return;
    let cancelled = false;
    const run = async () => {
      try {
        const status = await getVaultStatus(asSdkClient(publicClient), selectedVaultId as `0x${string}`);
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
    return () => { cancelled = true; };
  }, [isOmniHub, isOpen, selectedVaultId, publicClient, accountAddress]);


  // Load max redeem amount when modal opens
  useEffect(() => {
    const loadMaxRedeem = async () => {
      if (isOpen && accountAddress && selectedVaultId) {
        try {
          const maxShares = await maxRedeem(accountAddress);
          const maxSharesFormatted = formatUnits(maxShares, selectedVault?.overview?.decimals || 18);
          setMaxAmountToRedeem(new BigNumber(maxSharesFormatted));
        } catch (error) {
          console.error('Error loading max redeem:', error);
          setMaxAmountToRedeem(new BigNumber(0));
        }
      }
    };

    loadMaxRedeem();
  }, [isOpen, accountAddress, selectedVaultId, maxRedeem, selectedVault?.overview?.decimals]);

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
  }, [isOmniHub, amount, selectedVault?.overview?.decimals, omniHasQueue, withdrawalRequest, currentTime, txHash]);

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
  }, [isOpen, accountAddress, selectedVaultId, getWithdrawalRequest, getWithdrawalTimelock, convertToAssets]);

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
      const formattedAmount = formatUnits(withdrawalRequest.shares, selectedVault.overview.decimals);
      setAmount(formattedAmount);
    }
  }, [withdrawalRequest, selectedVault?.overview?.decimals]);

  // txAction state machine for mono-chain vaults
  useEffect(() => {
    if (isOmniHub) return;
    if (withdrawalRequest && selectedVault?.overview?.decimals) {
      const timeLockEndsAt = parseInt(withdrawalRequest.timeLockEndsAt);
      const canWithdraw = currentTime >= timeLockEndsAt;
      const requestedAmount = formatUnits(withdrawalRequest.shares, selectedVault.overview.decimals);

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

  const convertedAssetsFormatted = assetData.data ?
    formatUnits(convertedAssets, assetData.data.decimals) : '0';
  const convertedAssetsInUsd = new BigNumber(convertedAssetsFormatted).multipliedBy(assetData.data?.price || 0);

  const handleChange = (value: string) => {
    if (txError) {
      setTxError(null);
    }

    if (value === '-1') {
      setAmount(maxAmountToRedeem.toString());
    } else {
      const decimalTruncatedValue = roundToTokenDecimals(value, selectedVault?.overview?.decimals || 18);
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
              } catch { }
            }
            if (refreshUserVaultData) refreshUserVaultData();
          } else {
            setTxError('Request redeem transaction failed or was rejected.');
          }
          return;
        }

        // Sync or async path — determined by vault mode
        const sharesInWei = (omniHasQueue && withdrawalRequest)
          ? withdrawalRequest.shares
          : parseUnits(amount, selectedVault.overview.decimals).toString();

        if (vaultRedeemFlow === 'redeemShares') {
          // cross-chain-oracle (or local hub): standard sync redeem — no LZ fee
          const { tx } = await redeemFromVault(sharesInWei);
          const enhancedTx = await enhanceTransactionWithGas(tx);
          const response = await signer.sendTransaction(enhancedTx);
          const receipt = await response.wait();
          if (receipt?.status === 1) {
            setTxHash(receipt.transactionHash);
            setTxAction(null);
            setWithdrawalRequest(null);
            if (refreshUserVaultData) refreshUserVaultData();
          } else {
            setTxError('Redeem transaction failed or was rejected.');
          }
        } else {
          // cross-chain-async: bridge redeem via LayerZero
          const { txHash: hash, guid: capturedGuid } = await omniRedeem(sharesInWei);
          setTxHash(hash);
          setTxAction(null);
          setWithdrawalRequest(null);
          if (capturedGuid) {
            setOmniGuid(capturedGuid);
            addOmniRequest({
              guid: capturedGuid,
              vaultId: selectedVaultId!,
              chainId: vaultChainId,
              type: 'redeem',
              status: 'pending',
              txHash: hash,
              vaultName: selectedVault?.overview?.name,
            });
          }
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
      const explorerLink = currentNetworkConfig?.explorerLinkBuilder?.({ tx: txHash })
        || `${networkConfigs[chainId].explorerLink}/tx/${txHash}`;
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
        const { tx } = await requestRedeem(parseUnits(amount, selectedVault.overview.decimals).toString());
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
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during the transaction.';
      setTxError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonContent = useMemo(() => {
    // Omni path
    if (isOmniHub) {
      if (txHash && txAction === null) return `See transaction on ${networkConfigs[chainId]?.explorerName || 'explorer'}`;
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
      const requestedAmount = selectedVault?.overview?.decimals ?
        formatUnits(withdrawalRequest.shares, selectedVault.overview.decimals) : '0';
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
  }, [amount, selectedVault?.overview?.decimals, txHash, isLoading, txAction, withdrawalRequest, currentTime, currentNetworkConfig?.explorerName, isOmniHub, omniHasQueue]);

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
              Requested shares: {selectedVault?.overview?.decimals ?
                formatUnits(withdrawalRequest.shares, selectedVault.overview.decimals) : '0'} {selectedVault?.overview?.symbol}
            </Typography>
            <Typography variant="secondary14">
              {currentTime >= parseInt(withdrawalRequest.timeLockEndsAt)
                ? 'Timelock completed - you can now redeem'
                : `Timelock ends in ${formatTimeRemaining(parseInt(withdrawalRequest.timeLockEndsAt) - currentTime)} (${new Date(parseInt(withdrawalRequest.timeLockEndsAt) * 1000).toLocaleString()})`
              }
            </Typography>
          </Box>
        )}

        {/* Omni hub: pending withdrawal request info with timelock countdown */}
        {isOmniHub && omniHasQueue && withdrawalRequest && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="subheader1" sx={{ mb: 1 }}>
              Current Withdrawal Request
            </Typography>
            <Typography variant="secondary14" sx={{ mb: 1 }}>
              Requested shares: {selectedVault?.overview?.decimals ?
                formatUnits(withdrawalRequest.shares, selectedVault.overview.decimals) : '0'} {selectedVault?.overview?.symbol}
            </Typography>
            <Typography variant="secondary14">
              {currentTime >= parseInt(withdrawalRequest.timeLockEndsAt)
                ? 'Timelock completed — ready to complete'
                : `Timelock ends in ${formatTimeRemaining(parseInt(withdrawalRequest.timeLockEndsAt) - currentTime)} (${new Date(parseInt(withdrawalRequest.timeLockEndsAt) * 1000).toLocaleString()})`
              }
            </Typography>
          </Box>
        )}

        <AssetInput
          value={amount}
          onChange={handleChange}
          usdValue={convertedAssetsInUsd.toString(10)}
          symbol={selectedVault?.overview?.symbol}
          assets={[
            {
              balance: maxAmountToRedeem?.toString(),
              symbol: selectedVault?.overview?.symbol,
              iconSymbol: selectedVault?.overview?.curatorLogo?.split('/').pop()?.replace(/\.[^/.]+$/, ''),
            },
          ]}
          isMaxSelected={amount === maxAmountToRedeem?.toString()}
          maxValue={maxAmountToRedeem?.toString()}
          balanceText={withdrawalRequest ? 'Request new redemption amount' : 'Available to redeem'}
        />

        {/* Show asset conversion */}
        {amount && parseFloat(amount) > 0 && assetData.data && (
          <Box sx={{ p: 2, bgcolor: 'background.surface', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="secondary14" sx={{ color: 'text.secondary', mb: 1 }}>
              <strong>You will receive approximately:</strong>
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TokenIcon symbol={selectedVault?.overview?.asset?.symbol || ''} sx={{ fontSize: '16px' }} />
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

        {isOmniHub && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {wagmiChainId !== vaultChainId && (
              <Alert
                severity="warning"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => switchChain({ chainId: vaultChainId })}
                  >
                    Switch network
                  </Button>
                }
              >
                You must be on the vault&apos;s hub network to withdraw.
              </Alert>
            )}
            {/* Only show bridge fee for async redeems and not in queue-request step */}
            {txAction !== 'request' && vaultRedeemFlow !== 'redeemShares' && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="secondary14" color="text.secondary">Bridge fee</Typography>
                {isFeeLoading ? (
                  <CircularProgress size={14} />
                ) : estimatedFee ? (
                  <Typography variant="secondary14">~{parseFloat(estimatedFee).toFixed(6)} {networkConfigs[chainId]?.baseAssetSymbol || 'ETH'}</Typography>
                ) : (
                  <Typography variant="secondary14" color="text.secondary">—</Typography>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* Omni hub with queue: explain two-step withdrawal process */}
        {isOmniHub && omniHasQueue && !withdrawalRequest && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'background.surface', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="secondary14" sx={{ color: 'text.secondary' }}>
              <strong>Withdrawal process:</strong>
              <span> This vault requires a two-step withdrawal. First request your withdrawal and wait for the timelock, then complete it.</span>
            </Typography>
            {txAction === 'request' && timelock && parseInt(timelock) > 0 && (
              <Typography variant="secondary14" sx={{ color: 'warning.main', mt: 1, fontWeight: 'bold' }}>
                ⏱️ Timelock duration: {formatTimeRemaining(parseInt(timelock))}
              </Typography>
            )}
          </Box>
        )}

        {!isOmniHub && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'background.surface', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="secondary14" sx={{ color: 'text.secondary' }}>
              <strong>Withdrawal process:</strong>
              {withdrawalRequest ? (
                <span> The value of your shares in the base asset may have changed since you requested your withdrawal. This difference is due to vault rebalancing that occurs during the timelock period.</span>
              ) : (
                <span> To protect other depositors, withdrawals are timelocked. The vault may reallocate assets during this period and may impact the value of your redemption.</span>
              )}
            </Typography>

            {txAction === 'request' && timelock && parseInt(timelock) > 0 && (
              <Typography variant="secondary14" sx={{ color: 'warning.main', mt: 1, fontWeight: 'bold' }}>
                ⏱️ Timelock duration: {formatTimeRemaining(parseInt(timelock))}
              </Typography>
            )}
          </Box>
        )}

        {/* Cross-chain request status tracker — shown after bridge tx confirms (async only) */}
        {isOmniHub && vaultRedeemFlow === 'redeemAsync' && txHash && txAction === null && (
          <Box sx={{ p: 2, bgcolor: 'background.surface', borderRadius: 1, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="secondary14">
              {omniStatus === 'pending' && '⏳ Waiting for cross-chain accounting (~2 min)…'}
              {omniStatus === 'ready-to-execute' && '⏳ Accounting resolved, finalising…'}
              {omniStatus === 'completed' && `✅ Redeem complete — assets returned to your wallet`}
              {omniStatus === 'refunded' && '↩️ Redeem refunded — shares returned to your wallet'}
            </Typography>
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
        )}

        {txError && (
          <Box
            sx={{
              mb: 2,
              p: 2,
              bgcolor: 'error.main',
              color: 'error.contrastText',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'error.main'
            }}
          >
            <Typography variant="secondary14" sx={{ fontWeight: 'bold', mb: 1 }}>
              Transaction Error
            </Typography>
            <Typography variant="caption">
              {txError}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant={(txHash && (!withdrawalRequest || isOmniHub)) || (txHash && txAction === 'waiting') ? 'contained' : 'gradient'}
            disabled={
              isLoading ||
              (isOmniHub && wagmiChainId !== vaultChainId) ||
              (isOmniHub && txAction === 'waiting') ||
              (isOmniHub && !txAction && (!amount || amount === '0') && !withdrawalRequest) ||
              (!isOmniHub && (txAction === 'waiting' && !(txHash && txAction === 'waiting'))) ||
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
        </Box>
      </Box>
    </BasicModal>
  );
};
