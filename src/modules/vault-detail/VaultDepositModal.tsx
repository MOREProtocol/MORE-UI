import { Box, Button, CircularProgress, Typography } from '@mui/material';
import BigNumber from 'bignumber.js';
import { parseUnits } from 'ethers/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { BasicModal } from 'src/components/primitives/BasicModal';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { AssetInput } from 'src/components/transactions/AssetInput';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useVault } from 'src/hooks/vault/useVault';
import { useVaultData } from 'src/hooks/vault/useVaultData';
import { useRootStore } from 'src/store/root';
import { getMaxAmountAvailableToSupply } from 'src/utils/getMaxAmountAvailableToSupply';
import { roundToTokenDecimals } from 'src/utils/utils';
import SafeWalletButton from './SafeWalletButton';
import { ChainIds } from 'src/utils/const';
import { useWalletBalances } from 'src/hooks/app-data-provider/useWalletBalances';

interface VaultDepositModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const VaultDepositModal: React.FC<VaultDepositModalProps> = ({ isOpen, setIsOpen }) => {
  const { chainId, signer, selectedVaultId, depositInVault, checkApprovalNeeded } = useVault();
  const vaultData = useVaultData(selectedVaultId);
  const selectedVault = vaultData?.data;
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

  const handleChange = (value: string) => {
    if (value === '-1') {
      setAmount(maxAmountToSupply);
    } else {
      const decimalTruncatedValue = roundToTokenDecimals(value, reserve.decimals);
      setAmount(decimalTruncatedValue);
    }
  };

  useEffect(() => {
    const updateTx = async () => {
      if (amount && amount !== '0') {
        setIsLoading(true);
        const { action } = await depositInVault(parseUnits(amount, reserve.decimals).toString());
        setTxAction(action);
        setIsLoading(false);
      }
    };
    updateTx();
  }, [amount]);

  const handleClick = async () => {
    if (txHash) {
      window.open(`${currentNetworkConfig.explorerLinkBuilder({ tx: txHash })}`, '_blank');
      return;
    }
    setIsLoading(true);
    const { tx, action } = await depositInVault(parseUnits(amount, reserve.decimals).toString());
    const hash = await signer?.sendTransaction(tx);
    action === 'deposit' && setTxHash(hash?.hash);
    action === 'approve' && setTxAction('deposit');
    setIsLoading(false);
  };

  const buttonContent = useMemo(() => {
    if (txHash) {
      return 'See transaction on Flowscan';
    }
    if (!!amount && (!reserve || !txAction)) {
      return 'Loading...';
    }
    if (amount === '0' || !amount) return 'Enter an amount';

    if (amount && txAction === 'approve') {
      return 'Approve token spend';
    }
    return 'Deposit into the vault';
  }, [amount, reserve, checkApprovalNeeded, txHash, txAction]);

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
            {!isLoading && buttonContent}
          </Button>
          <SafeWalletButton
            isDisabled={!amount || amount === '0'}
            vaultAddress={selectedVault?.id}
            operation="deposit"
            amount={amount ? parseUnits(amount, reserve.decimals).toString() : '0'}
          />
        </Box>
      </Box>
    </BasicModal>
  );
};
