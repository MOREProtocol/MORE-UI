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
import SafeWalletButton from './SafeWalletButton';
import { ChainIds } from 'src/utils/const';
import { useRootStore } from 'src/store/root';

interface VaultWithdrawModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const VaultWithdrawModal: React.FC<VaultWithdrawModalProps> = ({ isOpen, setIsOpen }) => {
  const { signer, selectedVaultId, withdrawFromVault, accountAddress, chainId } =
    useVault();
  const userVaultData = useUserVaultsData(accountAddress, [selectedVaultId]);
  const [currentNetworkConfig] = useRootStore((state) => [
    state.currentNetworkConfig,
  ]);
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
  const [txAction, setTxAction] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setTxHash(null);
      setTxAction(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (amount && amount !== '0') {
      setTxAction('withdraw');
    } else {
      setTxAction(null);
    }
  }, [amount]);

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
      const explorerLink = currentNetworkConfig?.explorerLinkBuilder?.({ tx: txHash })
        || `${networkConfigs[chainId].explorerLink}/tx/${txHash}`;
      window.open(explorerLink, '_blank');
      return;
    }

    if (!txAction || !reserve || !signer) {
      return;
    }

    setIsLoading(true);
    try {
      if (txAction === 'withdraw') {
        const { tx } = await withdrawFromVault(parseUnits(amount, reserve.decimals).toString());
        const response = await signer.sendTransaction(tx);
        const receipt = await response.wait();

        if (receipt && receipt.status === 1) {
          setTxHash(receipt.transactionHash);
          setTxAction(null);
        } else {
          console.error('Withdrawal transaction failed or was rejected.');
        }
      }
    } catch (error) {
      console.error('Error during withdrawal process:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonContent = useMemo(() => {
    if (txHash) {
      return 'See transaction on Flowscan';
    }
    if (isLoading && txAction === 'withdraw') {
      return 'Withdrawing...';
    }
    if (!reserve) {
      return 'Loading...';
    }
    if (amount === '0' || !amount) return 'Enter an amount';

    if (txAction === 'withdraw') {
      return 'Withdraw from the vault';
    }

    return 'Enter an amount';
  }, [amount, reserve, txHash, isLoading, txAction]);

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
          <SafeWalletButton
            isDisabled={!amount || amount === '0'}
            vaultAddress={selectedVault?.id}
            operation="withdraw"
            amount={amount ? parseUnits(amount, reserve.decimals).toString() : '0'}
          />
        </Box>
      </Box>
    </BasicModal>
  );
};
