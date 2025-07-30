import { Box, Button, CircularProgress, Typography } from '@mui/material';
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
import { formatTimeRemaining } from 'src/helpers/timeHelper';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';

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
    chainId,
    enhanceTransactionWithGas
  } = useVault();
  const userVaultData = useUserVaultsData(accountAddress, [selectedVaultId]);
  const refreshUserVaultData = userVaultData?.[0]?.refetch;
  const [currentNetworkConfig] = useRootStore((state) => [
    state.currentNetworkConfig,
  ]);

  const vaultData = useVaultData(selectedVaultId);
  const selectedVault = vaultData?.data;

  // Use the new asset data hook instead of reserves lookup
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

  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setTxHash(null);
      setTxAction(null);
      setIsLoading(false);
      setWithdrawalRequest(null);
      setTxError(null);
      setConvertedAssets('0');
    }
  }, [isOpen]);

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

  // Load withdrawal request data when modal opens
  useEffect(() => {
    const loadWithdrawalData = async () => {
      if (isOpen && accountAddress && selectedVaultId) {
        try {
          const [request, timelockDuration] = await Promise.all([
            getWithdrawalRequest(accountAddress),
            getWithdrawalTimelock(),
          ]);

          // Only set withdrawal request if shares > 0
          if (request.shares !== '0') {
            setWithdrawalRequest(request);
          } else {
            setWithdrawalRequest(null);
          }
          setTimelock(timelockDuration);
        } catch (error) {
          console.error('Error loading withdrawal data:', error);
          // Reset withdrawal request if there's an error (likely no request exists)
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

  // Auto-hide transaction hash when timelock expires
  useEffect(() => {
    if (withdrawalRequest && txHash) {
      const timeLockEndsAt = parseInt(withdrawalRequest.timeLockEndsAt);
      if (currentTime >= timeLockEndsAt) {
        setTxHash(null);
      }
    }
  }, [withdrawalRequest, txHash, currentTime]);

  // Pre-fill amount when withdrawal request is loaded
  useEffect(() => {
    if (withdrawalRequest && selectedVault?.overview?.decimals) {
      const formattedAmount = formatUnits(withdrawalRequest.shares, selectedVault.overview.decimals);
      setAmount(formattedAmount);
    }
  }, [withdrawalRequest, selectedVault?.overview?.decimals]);

  useEffect(() => {
    if (withdrawalRequest && selectedVault?.overview?.decimals) {
      const timeLockEndsAt = parseInt(withdrawalRequest.timeLockEndsAt);
      const canWithdraw = currentTime >= timeLockEndsAt;
      const requestedAmount = formatUnits(withdrawalRequest.shares, selectedVault.overview.decimals);

      // Check if amount is effectively zero (handles '0', '0.0', '0.00', etc.)
      const isAmountZero = !amount || parseFloat(amount) === 0;
      const enteredAmount = parseFloat(amount || '0');
      const requestedAmountNum = parseFloat(requestedAmount);
      const hasAmountGreaterThanRequested = !isAmountZero && enteredAmount > requestedAmountNum;

      if (canWithdraw && (isAmountZero || enteredAmount <= requestedAmountNum)) {
        setTxAction('redeem');
      } else if (hasAmountGreaterThanRequested) {
        // Allow new request if user entered a larger amount than requested
        setTxAction('request');
        // Clear previous transaction hash when user wants to make a new request
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
  }, [amount, withdrawalRequest, currentTime, selectedVault?.overview?.decimals]);

  // Calculate converted assets in USD
  const convertedAssetsFormatted = assetData.data ?
    formatUnits(convertedAssets, assetData.data.decimals) : '0';
  const convertedAssetsInUsd = new BigNumber(convertedAssetsFormatted).multipliedBy(assetData.data?.price || 0);

  const handleChange = (value: string) => {
    // Clear any previous errors when user changes amount
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
    // Only open transaction link when specifically in waiting state or when showing transaction link
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
    setTxError(null); // Clear any previous errors
    try {
      if (txAction === 'request') {
        const { tx } = await requestRedeem(parseUnits(amount, selectedVault.overview.decimals).toString());
        const enhancedTx = await enhanceTransactionWithGas(tx);
        const response = await signer.sendTransaction(enhancedTx);
        const receipt = await response.wait();

        if (receipt && receipt.status === 1) {
          // Reload withdrawal request data immediately after successful request
          try {
            const [request, timelockDuration] = await Promise.all([
              getWithdrawalRequest(accountAddress),
              getWithdrawalTimelock(),
            ]);

            if (request.shares !== '0') {
              setWithdrawalRequest(request);

              // Check if timelock is zero or if we can withdraw immediately
              const timeLockEndsAt = parseInt(request.timeLockEndsAt);
              const currentTimestamp = Date.now() / 1000;

              if (parseInt(timelockDuration) === 0 || currentTimestamp >= timeLockEndsAt) {
                // No timelock or timelock finished - don't show transaction link, go straight to redeem
                setTxHash(null);
                setTxAction('redeem');
              } else {
                // Show transaction link and set waiting state
                setTxHash(receipt.transactionHash);
                setTxAction('waiting');
              }
            } else {
              setWithdrawalRequest(null);
              setTxHash(receipt.transactionHash);
              setTxAction(null);
            }

            // Refresh user vault data after successful request
            if (refreshUserVaultData) {
              refreshUserVaultData();
            }
          } catch (error) {
            console.error('Error reloading withdrawal request:', error);
            // Fallback to showing transaction link
            setTxHash(receipt.transactionHash);
            setTxAction(null);
            // Still refresh user vault data even if request reload fails
            if (refreshUserVaultData) {
              refreshUserVaultData();
            }
          }
        } else {
          console.error('Request redeem transaction failed or was rejected.');
          setTxError('Request redeem transaction failed or was rejected.');
        }
      } else if (txAction === 'redeem') {
        // For redeem, use the shares amount from withdrawal request or input amount
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
          setWithdrawalRequest(null); // Clear the withdrawal request after successful redemption

          // Refresh user vault data after successful redemption
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

      // If timelock is finished or zero, prioritize action over showing transaction
      if (canWithdraw && (!amount || amount === '0' || enteredAmount <= requestedAmountNum)) {
        return 'Complete withdrawal';
      } else if (hasAmountGreaterThanRequested) {
        return 'Request new withdrawal';
      } else if (canWithdraw) {
        return 'Complete withdrawal';
      } else {
        // Only show transaction link if we're in waiting state and there's a txHash
        if (txHash && txAction === 'waiting') {
          return `See transaction on ${currentNetworkConfig?.explorerName}`;
        }
        const timeRemaining = timeLockEndsAt - currentTime;
        return `Timelock: ${formatTimeRemaining(timeRemaining)} remaining`;
      }
    }

    // Show transaction link only if no withdrawal request exists
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
  }, [amount, selectedVault?.overview?.decimals, txHash, isLoading, txAction, withdrawalRequest, currentTime, currentNetworkConfig?.explorerName]);

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

        {/* Blue banner with link to old withdraw modal */}
        {/* <Alert
          severity="info"
          sx={{
            alignItems: 'center',
            '& .MuiAlert-message': {
              width: '100%'
            }
          }}
        >
          <Typography variant="main14">
            Looking for asset-based{' '}
            <Link
              component="button"
              variant="main14"
              onClick={() => {
                setIsOpen(false);
                onOpenWithdrawModal?.();
              }}
              sx={{
                textDecoration: 'underline',
                pb: 0.5,
                cursor: 'pointer',
                '&:hover': {
                  color: 'primary.dark',
                },
              }}
            >
              withdrawal
            </Link>
            ?
          </Typography>
        </Alert> */}

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

        {withdrawalRequest && (
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

        <Box sx={{ mb: 2, p: 2, bgcolor: 'background.surface', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="secondary14" sx={{ color: 'text.secondary' }}>
            <strong>Withdrawal process:</strong>
            {withdrawalRequest ? (
              <span> The value of your shares in the base asset may have changed since you requested your withdrawal. This difference is due to vault rebalancing that occurs during the timelock period.</span>
            ) : (
              <span> To protect other depositors, withdrawals are timelocked. The vault may reallocate assets during this period and may impact the value of your redemption.</span>
            )}
          </Typography>

          {/* Show timelock duration when user is about to make a request */}
          {txAction === 'request' && timelock && parseInt(timelock) > 0 && (
            <Typography variant="secondary14" sx={{ color: 'warning.main', mt: 1, fontWeight: 'bold' }}>
              ⏱️ Timelock duration: {formatTimeRemaining(parseInt(timelock))}
            </Typography>
          )}
        </Box>

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
            variant={(txHash && !withdrawalRequest) || (txHash && txAction === 'waiting') ? 'contained' : 'gradient'}
            disabled={
              (txAction === 'waiting' && !(txHash && txAction === 'waiting')) ||
              isLoading ||
              (!withdrawalRequest && (!amount || amount === '0'))
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