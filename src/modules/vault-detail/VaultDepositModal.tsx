import { Box, Button, CircularProgress, Typography } from '@mui/material';
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
import { ChainIds } from 'src/utils/const';
import { useWalletBalances } from 'src/hooks/app-data-provider/useWalletBalances';

interface VaultDepositModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const VaultDepositModal: React.FC<VaultDepositModalProps> = ({ isOpen, setIsOpen }) => {
  const { chainId, signer, selectedVaultId, depositInVault, accountAddress } = useVault();
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
  const reserve = useMemo(() =>
    reserves.find((reserve) => reserve.underlyingAsset.toLowerCase() === selectedVault?.overview?.assetAddress?.toLowerCase()),
    [reserves, selectedVault]);

  const amountInUsd = new BigNumber(amount).multipliedBy(
    reserve?.formattedPriceInMarketReferenceCurrency
  );
  const walletBalance = walletBalances[reserve?.underlyingAsset?.toLowerCase()]?.amount || '0';
  const maxAmountToSupply =
    !!reserve &&
    getMaxAmountAvailableToSupply(
      walletBalance,
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

  // Effect to reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setTxHash(null);
      setTxAction(null);
      setIsLoading(false);
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
        }
      }
    } catch (error) {
      console.error('Error during transaction process:', error);
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
          <Typography variant="h2">Deposit into the vault</Typography>
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
              balance: walletBalance,
              symbol: reserve?.symbol,
              iconSymbol: reserve?.iconSymbol,
            },
          ]}
          isMaxSelected={amount === maxAmountToSupply}
          maxValue={maxAmountToSupply}
          balanceText={'Wallet balance'}
        />
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
    </BasicModal>
  );
};
