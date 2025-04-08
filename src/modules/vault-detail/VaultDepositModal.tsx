import { Box, Button, CircularProgress, Typography } from '@mui/material';
import BigNumber from 'bignumber.js';
import { parseUnits } from 'ethers/lib/utils';
import { useMemo, useState } from 'react';
import { BasicModal } from 'src/components/primitives/BasicModal';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { AssetInput } from 'src/components/transactions/AssetInput';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useVault } from 'src/hooks/vault/useVault';
import { useVaultData } from 'src/hooks/vault/useVaultData';
import { useRootStore } from 'src/store/root';
import { getMaxAmountAvailableToSupply } from 'src/utils/getMaxAmountAvailableToSupply';
import { roundToTokenDecimals } from 'src/utils/utils';

interface VaultDepositModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const VaultDepositModal: React.FC<VaultDepositModalProps> = ({ isOpen, setIsOpen }) => {
  const { selectedVaultId, depositInVault, checkApprovalNeeded } = useVault();
  const vaultData = useVaultData(selectedVaultId);
  const selectedVault = vaultData?.data;
  const { user, reserves } = useAppDataContext();
  const [minRemainingBaseTokenBalance, currentNetworkConfig] = useRootStore((state) => [
    state.poolComputed.minRemainingBaseTokenBalance,
    state.currentNetworkConfig,
  ]);

  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const vaultShareCurrency = useMemo(() => selectedVault?.overview?.shareCurrency, [selectedVault]);
  const reserve = useMemo(() => {
    return reserves.find((reserve) => reserve.symbol === vaultShareCurrency);
  }, [reserves, vaultShareCurrency]);

  const amountInUsd = new BigNumber(amount).multipliedBy(
    reserve?.formattedPriceInMarketReferenceCurrency
  );
  const walletBalance = user?.userReservesData.find(
    (userReserve) => userReserve.reserve.symbol === reserve?.symbol
  )?.underlyingBalance;
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

  const handleClick = async () => {
    if (txHash) {
      window.open(`${currentNetworkConfig.explorerLinkBuilder({ tx: txHash })}`, '_blank');
      return;
    }
    setIsLoading(true);
    const hash = await depositInVault(parseUnits(amount, reserve.decimals).toString());
    setTxHash(hash);
    setIsLoading(false);
  };

  const buttonContent = useMemo(() => {
    if (txHash) {
      return 'See transaction on Flowscan';
    }
    if (!reserve) {
      return 'Loading...';
    }
    if (amount === '0' || !amount) return 'Enter an amount';

    const amountInWei =
      amount && reserve.decimals ? parseUnits(amount, reserve.decimals).toString() : '0';
    if (amountInWei && checkApprovalNeeded(amountInWei)) {
      return 'Approve token spend & deposit';
    }
    return 'Deposit into the vault';
  }, [amount, reserve, checkApprovalNeeded, txHash]);

  return (
    <BasicModal open={isOpen} setOpen={setIsOpen}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <Typography variant="h2">Deposit into the vault</Typography>
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
        <AssetInput
          value={amount}
          onChange={handleChange}
          usdValue={amountInUsd.toString(10)}
          symbol={vaultShareCurrency || ''}
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
      </Box>
    </BasicModal>
  );
};
