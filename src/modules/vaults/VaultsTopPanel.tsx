import { Trans } from '@lingui/react/macro';
import { useMediaQuery, useTheme } from '@mui/material';
import { marketContainerProps } from 'pages/markets.page';
import * as React from 'react';

import { FormattedNumber } from '../../components/primitives/FormattedNumber';
import { TopInfoPanel } from '../../components/TopInfoPanel/TopInfoPanel';
import { TopInfoPanelItem } from '../../components/TopInfoPanel/TopInfoPanelItem';
import { useAppDataContext } from '../../hooks/app-data-provider/useAppDataProvider';

export const VaultsTopPanel = () => {
  const { loading } = useAppDataContext();

  const theme = useTheme();
  const downToSM = useMediaQuery(theme.breakpoints.down('sm'));

  // TODO: get aggregated stats from vaults
  // const aggregatedStats = reserves.reduce(
  //   (acc, reserve) => {
  //     return {
  //       totalLiquidity: acc.totalLiquidity.plus(reserve.totalLiquidityUSD),
  //       totalDebt: acc.totalDebt.plus(reserve.totalDebtUSD),
  //     };
  //   },
  //   {
  //     totalLiquidity: valueToBigNumber(0),
  //     totalDebt: valueToBigNumber(0),
  //   }
  // );

  const valueTypographyVariant = downToSM ? 'main16' : 'main21';
  const symbolsVariant = downToSM ? 'secondary16' : 'secondary21';

  return (
    <TopInfoPanel
      containerProps={marketContainerProps}
      pageTitle={<Trans>Vaults</Trans>}
      // withMarketSwitcher
    >
      <TopInfoPanelItem hideIcon title={<Trans>TVL</Trans>} loading={loading}>
        <FormattedNumber
          value={'123000'} // TODO: get from vaults
          symbol="USD"
          variant={valueTypographyVariant}
          visibleDecimals={2}
          compact
          symbolsColor="#A5A8B6"
          symbolsVariant={symbolsVariant}
        />
      </TopInfoPanelItem>
    </TopInfoPanel>
  );
};
