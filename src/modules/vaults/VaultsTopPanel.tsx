import { valueToBigNumber } from '@aave/math-utils';
import { useMediaQuery, useTheme } from '@mui/material';
import { formatUnits } from 'ethers/lib/utils';
import { marketContainerProps } from 'pages/markets.page';
import { useMemo } from 'react';
import { useVault } from 'src/hooks/vault/useVault';
import {
  useDeployedVaults,
  useUserVaultsData,
  useVaultsListData,
} from 'src/hooks/vault/useVaultData';

import { FormattedNumber } from '../../components/primitives/FormattedNumber';
import { TopInfoPanel } from '../../components/TopInfoPanel/TopInfoPanel';
import { TopInfoPanelItem } from '../../components/TopInfoPanel/TopInfoPanelItem';
import { useAppDataContext } from '../../hooks/app-data-provider/useAppDataProvider';
import { ENABLE_TESTNET } from 'src/utils/marketsAndNetworksConfig';

export const VaultsTopPanel = () => {
  const { accountAddress } = useVault();
  const deployedVaultsQuery = useDeployedVaults();
  const vaultIds = deployedVaultsQuery?.data || [];

  const vaults = useVaultsListData(vaultIds);
  const userVaults = useUserVaultsData(accountAddress, vaultIds);

  const { reserves } = useAppDataContext();

  const loading = !vaults || vaults.some((vault) => vault.isLoading);

  const theme = useTheme();
  const downToSM = useMediaQuery(theme.breakpoints.down('sm'));

  const aggregatedStats = useMemo(
    () =>
      !loading &&
      vaults.reduce(
        (acc, vault, index) => {
          const reserve = reserves.find(
            (reserve) => reserve.symbol === vault?.data?.overview?.shareCurrencySymbol
          );
          const vaultTVLPrice = Number(reserve?.formattedPriceInMarketReferenceCurrency || 0);
          const vaultTVLValue =
            Number(
              formatUnits(
                vault?.data?.financials?.liquidity?.totalAssets || 0,
                vault?.data?.overview?.assetDecimals
              )
            ) * vaultTVLPrice;

          const userVault = userVaults[index];
          const userVaultDepositsValue =
            Number(
              formatUnits(userVault?.data?.maxWithdraw || 0, vault?.data?.overview?.assetDecimals)
            ) * vaultTVLPrice;
          return {
            tvl: acc.tvl.plus(vaultTVLValue),
            userDeposits: acc.userDeposits.plus(userVaultDepositsValue),
          };
        },
        {
          tvl: valueToBigNumber(0),
          userDeposits: valueToBigNumber(0),
        }
      ),
    [vaults, userVaults, reserves, loading]
  );

  const valueTypographyVariant = downToSM ? 'main16' : 'main21';
  const symbolsVariant = downToSM ? 'secondary16' : 'secondary21';

  return (
    <TopInfoPanel containerProps={marketContainerProps} pageTitle={'Vaults'}>
      <TopInfoPanelItem hideIcon title={'TVL'} loading={loading}>
        <FormattedNumber
          value={aggregatedStats?.tvl?.toString()}
          symbol="USD"
          variant={valueTypographyVariant}
          visibleDecimals={2}
          compact
          symbolsColor="#A5A8B6"
          symbolsVariant={symbolsVariant}
        />
      </TopInfoPanelItem>
      {aggregatedStats?.userDeposits?.gt(0) && (
        <TopInfoPanelItem hideIcon title={'My Deposits'} loading={loading}>
          <FormattedNumber
            value={aggregatedStats?.userDeposits?.toString()}
            symbol="USD"
            variant={valueTypographyVariant}
            visibleDecimals={2}
            compact
            symbolsColor="#A5A8B6"
            symbolsVariant={symbolsVariant}
          />
        </TopInfoPanelItem>
      )}
    </TopInfoPanel>
  );
};
