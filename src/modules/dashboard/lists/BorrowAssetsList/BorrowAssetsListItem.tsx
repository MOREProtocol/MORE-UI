import { Button, Tooltip } from '@mui/material';
import { useModalContext } from 'src/hooks/useModal';
import { useProtocolDataContext } from 'src/hooks/useProtocolDataContext';
import { useRootStore } from 'src/store/root';
import { DashboardReserve } from 'src/utils/dashboardSortUtils';
import { DASHBOARD } from 'src/utils/mixPanelEvents';

import { CapsHint } from '../../../../components/caps/CapsHint';
import { CapType } from '../../../../components/caps/helper';
import { Link, ROUTES } from '../../../../components/primitives/Link';
import { ListAPRColumn } from '../ListAPRColumn';
import { usePoolReservesRewardsHumanized } from 'src/hooks/pool/usePoolReservesRewards';
import { ListButtonsColumn } from '../ListButtonsColumn';
import { ListItemWrapper } from '../ListItemWrapper';
import { ListValueColumn } from '../ListValueColumn';
import { ExtendedFormattedUser } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useMemo } from 'react';

export const BorrowAssetsListItem = ({
  symbol,
  iconSymbol,
  name,
  availableBorrows,
  availableBorrowsInUSD,
  borrowCap,
  totalBorrows,
  variableBorrowRate,
  vIncentivesData,
  underlyingAsset,
  isFreezed,
  user,
}: DashboardReserve & { user: ExtendedFormattedUser }) => {
  const { openBorrow } = useModalContext();
  const { currentMarket } = useProtocolDataContext();
  const { currentMarketData } = useRootStore((s) => ({ currentMarketData: s.currentMarketData }));
  const rewardsQuery = usePoolReservesRewardsHumanized(currentMarketData);
  const allRewards = (rewardsQuery?.data || []) as any[];
  const borrowRewards = allRewards.filter(
    (r) => r.tracked_token_address?.toLowerCase() === underlyingAsset.toLowerCase() && ['borrow', 'supply_and_borrow'].includes(r.tracked_token_type)
  );
  const isReserveAlreadySupplied = useMemo(
    () =>
      user?.userReservesData.some(
        (userReserve) =>
          userReserve.reserve.underlyingAsset === underlyingAsset &&
          userReserve.underlyingBalance !== '0'
      ) ?? false,
    [user, underlyingAsset]
  );

  const disableBorrow = isFreezed || Number(availableBorrows) <= 0 || isReserveAlreadySupplied;

  const trackEvent = useRootStore((store) => store.trackEvent);

  return (
    <ListItemWrapper
      symbol={symbol}
      iconSymbol={iconSymbol}
      name={name}
      detailsAddress={underlyingAsset}
      data-cy={`dashboardBorrowListItem_${symbol.toUpperCase()}`}
      currentMarket={currentMarket}
    >
      <ListValueColumn
        symbol={symbol}
        value={Number(availableBorrows)}
        subValue={Number(availableBorrowsInUSD)}
        disabled={Number(availableBorrows) === 0}
        withTooltip={false}
        capsComponent={
          <CapsHint
            capType={CapType.borrowCap}
            capAmount={borrowCap}
            totalAmount={totalBorrows}
            withoutText
          />
        }
      />
      <ListAPRColumn
        value={Number(variableBorrowRate)}
        incentives={vIncentivesData}
        rewards={borrowRewards}
        symbol={symbol}
      />
      {/* <ListAPRColumn
        value={Number(stableBorrowRate)}
        incentives={sIncentivesData}
        symbol={symbol}
      /> */}
      <ListButtonsColumn>
        <Tooltip
          title={isReserveAlreadySupplied ? 'You cannot borrow an asset you are supplying.' : ''}
          disableHoverListener={!isReserveAlreadySupplied}
        >
          <span>
            <Button
              disabled={disableBorrow}
              variant="contained"
              onClick={() => {
                openBorrow(underlyingAsset, currentMarket, name, 'dashboard');
              }}
            >
              Borrow
            </Button>
          </span>
        </Tooltip>
        <Button
          variant="outlined"
          component={Link}
          href={ROUTES.reserveOverview(underlyingAsset, currentMarket)}
          onClick={() => {
            trackEvent(DASHBOARD.DETAILS_NAVIGATION, {
              type: 'Button',
              market: currentMarket,
              assetName: name,
              asset: underlyingAsset,
            });
          }}
        >
          Details
        </Button>
      </ListButtonsColumn>
    </ListItemWrapper>
  );
};
