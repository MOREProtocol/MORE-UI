import { Box, Button, CircularProgress, Typography } from '@mui/material';
import BigNumber from 'bignumber.js';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { useMemo, useState, useEffect } from 'react';
import { BasicModal } from 'src/components/primitives/BasicModal';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { AssetInput } from 'src/components/transactions/AssetInput';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useVault } from 'src/hooks/vault/useVault';
import { useUserVaultsData, useVaultData } from 'src/hooks/vault/useVaultData';
import { networkConfigs } from 'src/ui-config/networksConfig';
import { roundToTokenDecimals } from 'src/utils/utils';
import { ChainIds } from 'src/utils/const';
import { useRootStore } from 'src/store/root';

interface VaultWithdrawModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const VaultWithdrawModal: React.FC<VaultWithdrawModalProps> = ({ isOpen, setIsOpen }) => {
  const {
    signer,
    selectedVaultId,
    withdrawFromVault,
    requestWithdraw,
    getWithdrawalRequest,
    getWithdrawalTimelock,
    convertToAssets,
    accountAddress,
    chainId
  } = useVault();
  const userVaultData = useUserVaultsData(accountAddress, [selectedVaultId]);
  const refreshUserVaultData = userVaultData?.[0]?.refetch;
  const [currentNetworkConfig] = useRootStore((state) => [
    state.currentNetworkConfig,
  ]);
  const maxAmountToWithdraw = userVaultData?.[0]?.data?.maxWithdraw
    ? formatUnits(
      userVaultData?.[0]?.data?.maxWithdraw?.toString(),
      userVaultData?.[0]?.data?.assetDecimals
    )
    : new BigNumber(0);

  const vaultData = useVaultData(selectedVaultId);
  const selectedVault = vaultData?.data;
  const { reserves } = useAppDataContext();

  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txAction, setTxAction] = useState<string | null>(null);
  const [withdrawalRequest, setWithdrawalRequest] = useState<{
    shares: string;
    timeLockEndsAt: string;
  } | null>(null);
  const [withdrawalAssets, setWithdrawalAssets] = useState<string>('0');
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
      setWithdrawalAssets('0');
      setTxError(null);
    }
  }, [isOpen]);

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
            // Convert shares to assets
            const assets = await convertToAssets(request.shares);
            setWithdrawalAssets(assets);
          } else {
            setWithdrawalRequest(null);
            setWithdrawalAssets('0');
          }
          setTimelock(timelockDuration);
        } catch (error) {
          console.error('Error loading withdrawal data:', error);
          // Reset withdrawal request if there's an error (likely no request exists)
          setWithdrawalRequest(null);
          setWithdrawalAssets('0');
        }
      }
    };

    loadWithdrawalData();
  }, [isOpen, accountAddress, selectedVaultId, getWithdrawalRequest, getWithdrawalTimelock, convertToAssets]);

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

  const vaultShareCurrency = useMemo(
    () => selectedVault?.overview?.shareCurrencySymbol,
    [selectedVault]
  );
  const reserve = useMemo(() => {
    return reserves.find((reserve) => reserve.symbol === vaultShareCurrency);
  }, [reserves, vaultShareCurrency]);

  useEffect(() => {
    if (withdrawalRequest && reserve) {
      const timeLockEndsAt = parseInt(withdrawalRequest.timeLockEndsAt);
      const canWithdraw = currentTime >= timeLockEndsAt;
      const requestedAmount = formatUnits(withdrawalAssets, reserve.decimals);

      // Check if amount is effectively zero (handles '0', '0.0', '0.00', etc.)
      const isAmountZero = !amount || parseFloat(amount) === 0;
      const hasNewAmount = !isAmountZero && amount !== requestedAmount;

      if (canWithdraw && (isAmountZero || amount === requestedAmount)) {
        setTxAction('withdraw');
      } else if (hasNewAmount) {
        // Allow new request if user entered a different amount (and it's not zero)
        setTxAction('request');
        // Clear previous transaction hash when user wants to make a new request
        if (txHash) {
          setTxHash(null);
        }
      } else if (canWithdraw) {
        setTxAction('withdraw');
      } else {
        setTxAction('waiting');
      }
    } else if (amount && parseFloat(amount) > 0) {
      setTxAction('request');
    } else {
      setTxAction(null);
    }
  }, [amount, withdrawalRequest, withdrawalAssets, currentTime, reserve]);

  const amountInUsd = new BigNumber(amount).multipliedBy(
    reserve?.formattedPriceInMarketReferenceCurrency
  );

  const formatTimeRemaining = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const handleChange = (value: string) => {
    // Clear any previous errors when user changes amount
    if (txError) {
      setTxError(null);
    }

    if (value === '-1') {
      setAmount(maxAmountToWithdraw.toString());
    } else {
      const decimalTruncatedValue = roundToTokenDecimals(value, reserve.decimals);
      setAmount(decimalTruncatedValue);
    }
  };

  const handleClick = async () => {
    // Only open transaction link if that's the intended action (not when user wants to make a new request)
    if (txHash && (txAction === null || txAction === 'waiting')) {
      const explorerLink = currentNetworkConfig?.explorerLinkBuilder?.({ tx: txHash })
        || `${networkConfigs[chainId].explorerLink}/tx/${txHash}`;
      window.open(explorerLink, '_blank');
      return;
    }

    if (!txAction || !reserve || !signer) {
      return;
    }

    setIsLoading(true);
    setTxError(null); // Clear any previous errors
    try {
      if (txAction === 'request') {
        const { tx } = await requestWithdraw(parseUnits(amount, reserve.decimals).toString());
        const response = await signer.sendTransaction(tx);
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
              // Convert shares to assets
              const assets = await convertToAssets(request.shares);
              setWithdrawalAssets(assets);

              // Check if timelock is zero or if we can withdraw immediately
              const timeLockEndsAt = parseInt(request.timeLockEndsAt);
              const currentTimestamp = Date.now() / 1000;

              if (parseInt(timelockDuration) === 0 || currentTimestamp >= timeLockEndsAt) {
                // No timelock or timelock finished - don't show transaction link, go straight to withdraw
                setTxHash(null);
                setTxAction('withdraw');
              } else {
                // Show transaction link and set waiting state
                setTxHash(receipt.transactionHash);
                setTxAction('waiting');
              }
            } else {
              setWithdrawalRequest(null);
              setWithdrawalAssets('0');
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
          console.error('Request withdrawal transaction failed or was rejected.');
          setTxError('Request withdrawal transaction failed or was rejected.');
        }
      } else if (txAction === 'withdraw') {
        // For withdraw, use the converted assets amount
        const amountToWithdraw = withdrawalRequest
          ? formatUnits(withdrawalAssets, reserve.decimals)
          : amount;

        const { tx } = await withdrawFromVault(parseUnits(amountToWithdraw, reserve.decimals).toString());
        const response = await signer.sendTransaction(tx);
        const receipt = await response.wait();

        if (receipt && receipt.status === 1) {
          setTxHash(receipt.transactionHash);
          setTxAction(null);
          setWithdrawalRequest(null); // Clear the withdrawal request after successful withdrawal
          setWithdrawalAssets('0'); // Clear the assets amount

          // Refresh user vault data after successful withdrawal
          if (refreshUserVaultData) {
            refreshUserVaultData();
          }
        } else {
          console.error('Withdrawal transaction failed or was rejected.');
          setTxError('Withdrawal transaction failed or was rejected.');
        }
      }
    } catch (error) {
      console.error('Error during withdrawal process:', error);
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
      } else if (txAction === 'withdraw') {
        return 'Withdrawing...';
      }
    }
    if (!reserve) {
      return 'Loading...';
    }

    if (withdrawalRequest) {
      const timeLockEndsAt = parseInt(withdrawalRequest.timeLockEndsAt);
      const canWithdraw = currentTime >= timeLockEndsAt;
      const requestedAmount = reserve ? formatUnits(withdrawalAssets, reserve.decimals) : '0';
      const hasNewAmount = amount && amount !== '0' && amount !== requestedAmount;

      // If timelock is finished or zero, prioritize action over showing transaction
      if (canWithdraw && (!amount || amount === '0' || amount === requestedAmount)) {
        return 'Complete withdrawal';
      } else if (hasNewAmount) {
        return 'Request new withdrawal';
      } else if (canWithdraw) {
        return 'Complete withdrawal';
      } else {
        // Only show transaction link if we're in waiting state and there's a txHash
        if (txHash && txAction === 'waiting') {
          return 'See transaction on Flowscan';
        }
        const timeRemaining = timeLockEndsAt - currentTime;
        return `Timelock: ${formatTimeRemaining(timeRemaining)} remaining`;
      }
    }

    // Show transaction link only if no withdrawal request exists
    if (txHash && !withdrawalRequest) {
      return 'See transaction on Flowscan';
    }

    if (amount === '0' || !amount) {
      return 'Enter an amount';
    }

    if (txAction === 'request') {
      return 'Request withdrawal';
    }

    return 'Enter an amount';
  }, [amount, reserve, txHash, isLoading, txAction, withdrawalRequest, withdrawalAssets, currentTime]);

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
            // borderBottom: 1,
            pb: 3,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <img
              src={`/MOREVault.svg`}
              width="45px"
              height="45px"
              alt="token-svg"
              style={{ borderRadius: '50%' }}
            />
            <Box>
              <Typography variant="main16">{selectedVault?.overview?.name}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TokenIcon symbol={vaultShareCurrency || ''} sx={{ fontSize: '16px' }} />
                <Typography variant="secondary12">{vaultShareCurrency}</Typography>
              </Box>
            </Box>
          </Box>
        </Box>
        {withdrawalRequest && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="subheader1" sx={{ mb: 1 }}>
              Current Withdrawal Request
            </Typography>
            <Typography variant="secondary14" sx={{ mb: 1 }}>
              Requested amount: {formatUnits(withdrawalAssets, reserve?.decimals || 18)} {vaultShareCurrency}
            </Typography>
            <Typography variant="secondary14">
              {currentTime >= parseInt(withdrawalRequest.timeLockEndsAt)
                ? 'Timelock completed - you can now withdraw'
                : `Timelock ends in ${formatTimeRemaining(parseInt(withdrawalRequest.timeLockEndsAt) - currentTime)} (${new Date(parseInt(withdrawalRequest.timeLockEndsAt) * 1000).toLocaleString()})`
              }
            </Typography>
          </Box>
        )}

        <AssetInput
          value={amount}
          onChange={handleChange}
          usdValue={amountInUsd.toString(10)}
          symbol={vaultShareCurrency || ''}
          assets={[
            {
              balance: maxAmountToWithdraw?.toString(),
              symbol: reserve?.symbol,
              iconSymbol: reserve?.iconSymbol,
            },
          ]}
          isMaxSelected={amount === maxAmountToWithdraw?.toString()}
          maxValue={maxAmountToWithdraw?.toString()}
          balanceText={withdrawalRequest ? 'Request new withdrawal amount' : 'Available to withdraw'}
        />

        <Box sx={{ mb: 2, p: 2, bgcolor: 'background.surface', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="secondary14" sx={{ color: 'text.secondary' }}>
            <strong>Withdrawal process:</strong> First request a withdrawal, then wait for the timelock period to complete before you can withdraw your funds.
            {withdrawalRequest && (
              <span> You can request a new withdrawal amount which will replace your current request and reset the timelock.</span>
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
