import { Box, Button, CircularProgress, Typography, Checkbox, FormControlLabel, Collapse } from '@mui/material';
import BigNumber from 'bignumber.js';
import { parseUnits } from 'ethers/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { BasicModal } from 'src/components/primitives/BasicModal';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { AssetInput } from 'src/components/transactions/AssetInput';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useVault } from 'src/hooks/vault/useVault';
import { useVaultData, useUserVaultsData } from 'src/hooks/vault/useVaultData';
import { useRootStore } from 'src/store/root';
import { getMaxAmountAvailableToSupply } from 'src/utils/getMaxAmountAvailableToSupply';
import { roundToTokenDecimals } from 'src/utils/utils';
import { useWalletBalances } from 'src/hooks/app-data-provider/useWalletBalances';

interface VaultDepositModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  whitelistAmount?: string;
}

export const VaultDepositModal: React.FC<VaultDepositModalProps> = ({ isOpen, setIsOpen, whitelistAmount }) => {
  const { signer, selectedVaultId, depositInVault, accountAddress } = useVault();
  const vaultData = useVaultData(selectedVaultId);
  const selectedVault = vaultData?.data;
  const userVaultData = useUserVaultsData(accountAddress, [selectedVaultId]);
  const refreshUserVaultData = userVaultData?.[0]?.refetch;
  const { reserves } = useAppDataContext();
  const [minRemainingBaseTokenBalance, currentNetworkConfig, currentMarketData] = useRootStore((state) => [
    state.poolComputed.minRemainingBaseTokenBalance,
    state.currentNetworkConfig,
    state.currentMarketData,
  ]);
  const { walletBalances } = useWalletBalances(currentMarketData);

  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txAction, setTxAction] = useState<string | null>(null);
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const reserve = useMemo(() =>
    reserves.find((reserve) => reserve.underlyingAsset.toLowerCase() === selectedVault?.overview?.asset?.address?.toLowerCase()),
    [reserves, selectedVault]);

  const amountInUsd = new BigNumber(amount).multipliedBy(
    reserve?.formattedPriceInMarketReferenceCurrency
  );
  const walletBalance = walletBalances[reserve?.underlyingAsset?.toLowerCase()]?.amount || '0';

  // Calculate max amount considering both wallet balance and whitelist limits
  const maxAmountToSupply = useMemo(() => {
    if (!reserve?.decimals) return '0';

    // Start with wallet balance
    let effectiveMaxAmount = walletBalance;

    // Apply whitelist limit if provided
    if (whitelistAmount && whitelistAmount !== '0') {
      // Convert whitelist amount from wei to readable format
      const whitelistAmountFormatted = roundToTokenDecimals(
        new BigNumber(whitelistAmount)
          .dividedBy(new BigNumber(10).pow(reserve.decimals))
          .toString(),
        reserve.decimals
      );

      // Take the minimum between wallet balance and whitelist amount
      effectiveMaxAmount = new BigNumber(walletBalance).isLessThan(whitelistAmountFormatted)
        ? walletBalance
        : whitelistAmountFormatted;
    }

    // Apply protocol limits (supply cap, etc.) to the effective max amount
    const finalMaxAmount = getMaxAmountAvailableToSupply(
      effectiveMaxAmount,
      {
        supplyCap: reserve.supplyCap,
        totalLiquidity: reserve.totalLiquidity,
        isFrozen: reserve.isFrozen,
        decimals: reserve.decimals,
        debtCeiling: reserve.debtCeiling,
        isolationModeTotalDebt: reserve.isolationModeTotalDebt,
      },
      reserve.underlyingAsset,
      minRemainingBaseTokenBalance
    );

    return finalMaxAmount || '0';
  }, [walletBalance, whitelistAmount, reserve, minRemainingBaseTokenBalance]);

  // Determine which balance and text to show in AssetInput
  const assetInputConfig = useMemo(() => {
    if (!reserve?.decimals || !whitelistAmount || whitelistAmount === '0') {
      return {
        balance: walletBalance,
        balanceText: 'Wallet balance'
      };
    }

    const whitelistAmountFormatted = new BigNumber(whitelistAmount)
      .dividedBy(new BigNumber(10).pow(reserve.decimals))
      .toString();

    const isWalletLimiting = new BigNumber(walletBalance).isLessThan(whitelistAmountFormatted);

    return {
      balance: isWalletLimiting ? walletBalance : whitelistAmountFormatted,
      balanceText: isWalletLimiting ? 'Wallet balance' : 'Max whitelist allowance'
    };
  }, [walletBalance, whitelistAmount, reserve?.decimals]);

  // Effect to reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setTxHash(null);
      setTxAction(null);
      setIsLoading(false);
      setRiskAccepted(false);
      setTxError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const updateButtonActionState = async () => {
      if (txHash) {
        setTxAction(null);
        return;
      }
      if (amount && amount !== '0' && reserve?.decimals != null && typeof depositInVault === 'function') {
        try {
          const { action } = await depositInVault(parseUnits(amount, reserve.decimals).toString());
          setTxAction(action);
        } catch (error) {
          console.error("Error updating button action state:", error);
          setTxAction(null);
        }
      } else {
        setTxAction(null);
      }
    };
    updateButtonActionState();
  }, [amount, reserve?.decimals, txHash, depositInVault]);

  const handleChange = (value: string) => {
    // Clear any previous errors when user changes amount
    if (txError) {
      setTxError(null);
    }

    if (value === '-1') {
      setAmount(maxAmountToSupply);
    } else {
      const decimalTruncatedValue = roundToTokenDecimals(value, reserve.decimals);
      setAmount(decimalTruncatedValue);
    }
  };

  const handleClick = async () => {
    if (txHash) {
      window.open(`${currentNetworkConfig.explorerLinkBuilder({ tx: txHash })}`, '_blank');
      return;
    }

    if (!amount || amount === '0' || !reserve || reserve.decimals == null || !signer || typeof depositInVault !== 'function' || !txAction) {
      console.warn('Deposit/Approval prerequisites not met or action not determined:', {
        amount,
        reserveExists: !!reserve,
        signerExists: !!signer,
        depositInVaultFn: typeof depositInVault,
        currentTxAction: txAction,
      });
      return;
    }

    setIsLoading(true);
    setTxError(null); // Clear any previous errors

    try {
      const parsedAmount = parseUnits(amount, reserve.decimals).toString();
      const { tx: transactionDataForCurrentAction, action: determinedAction } = await depositInVault(parsedAmount);

      if (txAction !== determinedAction) {
        console.warn(`Action mismatch: button shows '${txAction}', but current required action is '${determinedAction}'. Updating button.`);
        setTxAction(determinedAction);
        setIsLoading(false);
        return;
      }

      if (txAction === 'approve') {
        const approveResponse = await signer.sendTransaction(transactionDataForCurrentAction);
        const approveReceipt = await approveResponse.wait();

        if (approveReceipt && approveReceipt.status === 1) {
          const { action: nextAction } = await depositInVault(parsedAmount);
          setTxAction(nextAction);
        } else {
          console.error('Approval transaction failed or was rejected.');
          setTxError('Approval transaction failed or was rejected.');
        }
      } else if (txAction === 'deposit') {
        const depositResponse = await signer.sendTransaction(transactionDataForCurrentAction);
        const depositReceipt = await depositResponse.wait();

        if (depositReceipt && depositReceipt.status === 1) {
          setTxHash(depositReceipt.transactionHash);

          // Refresh user vault data after successful deposit
          if (refreshUserVaultData) {
            refreshUserVaultData();
          }
        } else {
          console.error('Deposit transaction failed.');
          setTxError('Deposit transaction failed or was rejected.');
        }
      }
    } catch (error) {
      console.error('Error during transaction process:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during the transaction.';
      setTxError(errorMessage);

      if (amount && amount !== '0' && reserve?.decimals != null && typeof depositInVault === 'function') {
        try {
          const { action: currentActionState } = await depositInVault(parseUnits(amount, reserve.decimals).toString());
          setTxAction(currentActionState);
        } catch (recoveryError) {
          console.error("Error trying to recover button state:", recoveryError);
          setTxAction(null);
        }
      } else {
        setTxAction(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const buttonContent = useMemo(() => {
    if (txHash) {
      return 'See transaction on Flowscan';
    }

    if (isLoading) {
      if (txAction === 'approve') return 'Approving...';
      if (txAction === 'deposit') return 'Depositing...';
      return 'Processing...';
    }

    if (!amount || amount === '0') return 'Enter an amount';

    if (!reserve || txAction === null) {
      return 'Checking availability...';
    }

    if (txAction === 'approve') {
      return 'Approve token spend';
    }
    if (txAction === 'deposit') {
      return 'Deposit into the vault';
    }

    return 'Deposit into the vault';
  }, [amount, reserve, txHash, txAction, isLoading]);

  return (
    <BasicModal open={isOpen} setOpen={setIsOpen}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Typography variant="h2">Deposit into the portfolio</Typography>
        </Box>
        {/* Risk Disclosure Section */}
        <Collapse in={!riskAccepted}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ mb: 2, p: 2, bgcolor: 'background.surface', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="secondary14" sx={{ color: 'text.secondary' }}>
                I understand that depositing into this portfolio involves a risk of loss. The protocol provides only the underlying infrastructure. The portfolio&apos;s owner and curator are solely responsible for managing its strategy and allocations, and assume full responsibility for its performance.
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={riskAccepted}
                  onChange={(e) => setRiskAccepted(e.target.checked)}
                  sx={{ color: 'text.secondary' }}
                />
              }
              label={
                <Typography variant="secondary14" sx={{ color: 'text.secondary' }}>
                  I understand and accept the risks.
                </Typography>
              }
            />
          </Box>
        </Collapse>

        {/* Deposit Interface Section */}
        <Collapse in={riskAccepted}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
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
                    <TokenIcon symbol={reserve?.symbol || ''} sx={{ fontSize: '16px' }} />
                    <Typography variant="secondary12">{reserve?.symbol}</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
            <AssetInput
              value={amount}
              onChange={handleChange}
              usdValue={amountInUsd.toString(10)}
              symbol={reserve?.symbol || ''}
              assets={[
                {
                  balance: assetInputConfig.balance,
                  symbol: reserve?.symbol,
                  iconSymbol: reserve?.iconSymbol,
                },
              ]}
              isMaxSelected={amount === maxAmountToSupply}
              maxValue={maxAmountToSupply}
              balanceText={assetInputConfig.balanceText}
            />
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
                variant={txHash ? 'contained' : 'gradient'}
                disabled={!amount || amount === '0'}
                onClick={handleClick}
                size="large"
                sx={{ minHeight: '44px' }}
                data-cy="actionButton"
              >
                {isLoading && <CircularProgress color="inherit" size="16px" sx={{ mr: 2 }} />}
                {buttonContent}
              </Button>
              {/* <SafeWalletButton
                isDisabled={!amount || amount === '0'}
                vaultAddress={selectedVault?.id}
                operation="deposit"
                amount={amount ? parseUnits(amount, reserve.decimals).toString() : '0'}
              /> */}
            </Box>
          </Box>
        </Collapse>
      </Box>
    </BasicModal>
  );
};
