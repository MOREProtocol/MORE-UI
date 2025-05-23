import { API_ETH_MOCK_ADDRESS, InterestRate } from '@aave/contract-helpers';
import { valueToBigNumber } from '@aave/math-utils';
import { Typography, useMediaQuery, useTheme } from '@mui/material';
import { useState } from 'react';
import { ListColumn } from 'src/components/lists/ListColumn';
import { ListHeaderTitle } from 'src/components/lists/ListHeaderTitle';
import { ListHeaderWrapper } from 'src/components/lists/ListHeaderWrapper';
import { useProtocolDataContext } from 'src/hooks/useProtocolDataContext';
import { fetchIconSymbolAndName } from 'src/ui-config/reservePatches';
import { GHO_SYMBOL } from 'src/utils/ghoUtilities';
import { GENERAL } from 'src/utils/mixPanelEvents';

import { APYTypeTooltip } from '../../../../components/infoTooltips/APYTypeTooltip';
import { BorrowPowerTooltip } from '../../../../components/infoTooltips/BorrowPowerTooltip';
import { TotalBorrowAPYTooltip } from '../../../../components/infoTooltips/TotalBorrowAPYTooltip';
import { ListWrapper } from '../../../../components/lists/ListWrapper';
import {
  ComputedUserReserveData,
  useAppDataContext,
} from '../../../../hooks/app-data-provider/useAppDataProvider';
import {
  DASHBOARD_LIST_COLUMN_WIDTHS,
  DashboardReserve,
  handleSortDashboardReserves,
} from '../../../../utils/dashboardSortUtils';
import { DashboardContentNoData } from '../../DashboardContentNoData';
import { DashboardEModeButton } from '../../DashboardEModeButton';
import { ListButtonsColumn } from '../ListButtonsColumn';
import { ListLoader } from '../ListLoader';
import { ListTopInfoItem } from '../ListTopInfoItem';
import { BorrowedPositionsListItemWrapper } from './BorrowedPositionsListItemWrapper';

const head = [
  {
    title: 'Asset',
    sortKey: 'symbol',
  },
  {
    title: 'Debt',
    sortKey: 'variableBorrows',
  },
  {
    title: 'APY',
    sortKey: 'borrowAPY',
  },
  {
    title: (
      <APYTypeTooltip
        event={{
          eventName: GENERAL.TOOL_TIP,
          eventParams: { tooltip: 'APY Type Borrow' },
        }}
        text={'APY type'}
        key="APY type"
        variant="subheader2"
      />
    ),
    sortKey: 'typeAPY',
  },
];

export const BorrowedPositionsList = () => {
  const { user, loading, eModes } = useAppDataContext();
  const { currentMarketData, currentNetworkConfig } = useProtocolDataContext();
  const [sortName, setSortName] = useState('');
  const [sortDesc, setSortDesc] = useState(false);
  const theme = useTheme();
  const downToXSM = useMediaQuery(theme.breakpoints.down('xsm'));
  const showEModeButton = currentMarketData.v3 && Object.keys(eModes).length > 1;
  const [tooltipOpen, setTooltipOpen] = useState<boolean>(false);

  let borrowPositions =
    user?.userReservesData.reduce((acc, userReserve) => {
      if (userReserve.variableBorrows !== '0') {
        acc.push({
          ...userReserve,
          borrowRateMode: InterestRate.Variable,
          reserve: {
            ...userReserve.reserve,
            ...(userReserve.reserve.isWrappedBaseAsset
              ? fetchIconSymbolAndName({
                symbol: currentNetworkConfig.baseAssetSymbol,
                underlyingAsset: API_ETH_MOCK_ADDRESS.toLowerCase(),
              })
              : {}),
          },
        });
      }
      if (userReserve.stableBorrows !== '0') {
        acc.push({
          ...userReserve,
          borrowRateMode: InterestRate.Stable,
          reserve: {
            ...userReserve.reserve,
            ...(userReserve.reserve.isWrappedBaseAsset
              ? fetchIconSymbolAndName({
                symbol: currentNetworkConfig.baseAssetSymbol,
                underlyingAsset: API_ETH_MOCK_ADDRESS.toLowerCase(),
              })
              : {}),
          },
        });
      }
      return acc;
    }, [] as (ComputedUserReserveData & { borrowRateMode: InterestRate })[]) || [];

  // Move GHO to top of borrowed positions list
  const ghoReserve = borrowPositions.filter((pos) => pos.reserve.symbol === GHO_SYMBOL);
  if (ghoReserve.length > 0) {
    borrowPositions = borrowPositions.filter((pos) => pos.reserve.symbol !== GHO_SYMBOL);
    borrowPositions.unshift(ghoReserve[0]);
  }

  const ltv = valueToBigNumber(user?.totalCollateralMarketReferenceCurrency || '0').eq(0)
    ? '0'
    : valueToBigNumber(user?.totalBorrowsMarketReferenceCurrency || '0')
      .div(user?.totalCollateralMarketReferenceCurrency || '0')
      .toFixed();

  // Transform to the DashboardReserve schema so the sort utils can work with it
  const preSortedReserves = borrowPositions as DashboardReserve[];
  const sortedReserves = handleSortDashboardReserves(
    sortDesc,
    sortName,
    'position',
    preSortedReserves,
    true
  );

  const RenderHeader: React.FC = () => {
    return (
      <ListHeaderWrapper>
        {head.map((col) => (
          <ListColumn
            isRow={col.sortKey === 'symbol'}
            maxWidth={col.sortKey === 'symbol' ? DASHBOARD_LIST_COLUMN_WIDTHS.ASSET : undefined}
            key={col.sortKey}
          >
            <ListHeaderTitle
              sortName={sortName}
              sortDesc={sortDesc}
              setSortName={setSortName}
              setSortDesc={setSortDesc}
              sortKey={col.sortKey}
              source="Borrowed Positions Dashboard"
            >
              {col.title}
            </ListHeaderTitle>
          </ListColumn>
        ))}
        <ListButtonsColumn isColumnHeader />
      </ListHeaderWrapper>
    );
  };

  if (loading) return <ListLoader title={'Your borrows'} head={head.map((c) => c.title)} />;

  return (
    <ListWrapper
      tooltipOpen={tooltipOpen}
      titleComponent={
        <Typography component="div" variant="h3" sx={{ mr: 4 }}>
          Your borrows
        </Typography>
      }
      localStorageName="borrowedAssetsDashboardTableCollapse"
      subTitleComponent={
        showEModeButton ? (
          <DashboardEModeButton userEmodeCategoryId={user ? user.userEmodeCategoryId : 0} />
        ) : undefined
      }
      noData={!sortedReserves.length}
      topInfo={
        <>
          {!!sortedReserves.length && (
            <>
              <ListTopInfoItem title={'Balance'} value={user?.totalBorrowsUSD || 0} />
              <ListTopInfoItem
                title={'APY'}
                value={user?.debtAPY || 0}
                percent
                tooltip={
                  <TotalBorrowAPYTooltip
                    setOpen={setTooltipOpen}
                    event={{
                      eventName: GENERAL.TOOL_TIP,
                      eventParams: { tooltip: 'Total Borrowed APY' },
                    }}
                  />
                }
              />
              <ListTopInfoItem
                title={'LTV'}
                value={ltv || 0}
                percent
                tooltip={
                  <BorrowPowerTooltip
                    setOpen={setTooltipOpen}
                    event={{
                      eventName: GENERAL.TOOL_TIP,
                      eventParams: { tooltip: 'LTV' },
                    }}
                  />
                }
              />
            </>
          )}
        </>
      }
    >
      {sortedReserves.length ? (
        <>
          {!downToXSM && <RenderHeader />}
          {sortedReserves.map((item) => (
            <BorrowedPositionsListItemWrapper
              item={item}
              key={item.underlyingAsset + item.borrowRateMode}
            />
          ))}
        </>
      ) : (
        <DashboardContentNoData text={'Nothing borrowed yet'} />
      )}
    </ListWrapper>
  );
};
