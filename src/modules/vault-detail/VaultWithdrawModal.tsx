import { Box, Button, CircularProgress, Typography } from '@mui/material';
import BigNumber from 'bignumber.js';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { useMemo, useState } from 'react';
import { BasicModal } from 'src/components/primitives/BasicModal';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { AssetInput } from 'src/components/transactions/AssetInput';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useVault } from 'src/hooks/vault/useVault';
import { useUserVaultsData, useVaultData } from 'src/hooks/vault/useVaultData';
import { networkConfigs } from 'src/ui-config/networksConfig';
import { roundToTokenDecimals } from 'src/utils/utils';

interface VaultWithdrawModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const VaultWithdrawModal: React.FC<VaultWithdrawModalProps> = ({ isOpen, setIsOpen }) => {
  const { selectedVaultId, withdrawFromVault, checkApprovalNeeded, accountAddress, chainId } =
    useVault();
  const userVaultData = useUserVaultsData(accountAddress, [selectedVaultId]);
  const currentNetwork = networkConfigs[chainId];
  const maxAmountToWithdraw = userVaultData?.[0]?.data?.maxWithdraw
    ? formatUnits(
        userVaultData?.[0]?.data?.maxWithdraw?.toString(),
        userVaultData?.[0]?.data?.decimals
      )
    : new BigNumber(0);

  const vaultData = useVaultData(selectedVaultId);
  const selectedVault = vaultData?.data;
  const { reserves } = useAppDataContext();

  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const vaultShareCurrency = useMemo(
    () => selectedVault?.overview?.shareCurrencySymbol,
    [selectedVault]
  );
  const reserve = useMemo(() => {
    return reserves.find((reserve) => reserve.symbol === vaultShareCurrency);
  }, [reserves, vaultShareCurrency]);

  const amountInUsd = new BigNumber(amount).multipliedBy(
    reserve?.formattedPriceInMarketReferenceCurrency
  );

  const handleChange = (value: string) => {
    if (value === '-1') {
      setAmount(maxAmountToWithdraw.toString());
    } else {
      const decimalTruncatedValue = roundToTokenDecimals(value, reserve.decimals);
      setAmount(decimalTruncatedValue);
    }
  };

  const handleClick = async () => {
    if (txHash) {
      window.open(`${currentNetwork.explorerLink}/tx/${txHash}`, '_blank');
      return;
    }
    setIsLoading(true);
    const hash = await withdrawFromVault(parseUnits(amount, reserve.decimals).toString());
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

    return 'Withdraw from the vault';
  }, [amount, reserve, checkApprovalNeeded, txHash]);

  return (
    <BasicModal open={isOpen} setOpen={setIsOpen}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <Typography variant="h2">Withdraw from the vault</Typography>
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
              balance: maxAmountToWithdraw?.toString(),
              symbol: reserve?.symbol,
              iconSymbol: reserve?.iconSymbol,
            },
          ]}
          isMaxSelected={amount === maxAmountToWithdraw?.toString()}
          maxValue={maxAmountToWithdraw?.toString()}
          balanceText={'Available to withdraw'}
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
