import { Box, Button, Tooltip } from '@mui/material';
import { VariableAPYTooltip } from 'src/components/infoTooltips/VariableAPYTooltip';
import { useProtocolDataContext } from 'src/hooks/useProtocolDataContext';
import { PoolReservesRewardsHumanized, usePoolReservesRewardsHumanized } from 'src/hooks/pool/usePoolReservesRewards';
import { DashboardReserve } from 'src/utils/dashboardSortUtils';

import { CapsHint } from '../../../../components/caps/CapsHint';
import { CapType } from '../../../../components/caps/helper';
import { IncentivesCard } from '../../../../components/incentives/IncentivesCard';
import { Link, ROUTES } from '../../../../components/primitives/Link';
import { Row } from '../../../../components/primitives/Row';
import { useModalContext } from '../../../../hooks/useModal';
import { ListMobileItemWrapper } from '../ListMobileItemWrapper';
import { ListValueRow } from '../ListValueRow';
import { ExtendedFormattedUser } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useMemo } from 'react';

export const BorrowAssetsListMobileItem = ({
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
  const { currentMarket, currentMarketData } = useProtocolDataContext();
  const rewardsQuery = usePoolReservesRewardsHumanized(currentMarketData);
  const allRewards: PoolReservesRewardsHumanized[] = rewardsQuery?.data ?? [];
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

  return (
    <ListMobileItemWrapper
      symbol={symbol}
      iconSymbol={iconSymbol}
      name={name}
      underlyingAsset={underlyingAsset}
      currentMarket={currentMarket}
    >
      <ListValueRow
        title={'Available to borrow'}
        value={Number(availableBorrows)}
        subValue={Number(availableBorrowsInUSD)}
        disabled={Number(availableBorrows) === 0}
        capsComponent={
          <CapsHint
            capType={CapType.borrowCap}
            capAmount={borrowCap}
            totalAmount={totalBorrows}
            withoutText
          />
        }
      />
      <Row
        caption={
          <VariableAPYTooltip
            text={'APY, variable'}
            key="APY_dash_mob_variable_ type"
            variant="description"
          />
        }
        align="flex-start"
        captionVariant="description"
        mb={2}
      >
        <IncentivesCard
          value={Number(variableBorrowRate)}
          incentives={vIncentivesData}
          rewards={borrowRewards}
          symbol={symbol}
          variant="secondary14"
        />
      </Row>
      {/* <Row
        caption={
          <StableAPYTooltip
            text={APY, stable}
            key="APY_dash_mob_stable_ type"
            variant="description"
          />
        }
        align="flex-start"
        captionVariant="description"
        mb={2}
      >
        <IncentivesCard
          value={Number(stableBorrowRate)}
          incentives={sIncentivesData}
          symbol={symbol}
          variant="secondary14"
        />
      </Row> */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 5 }}>
        <Tooltip
          title={isReserveAlreadySupplied ? 'You cannot borrow an asset you are supplying.' : ''}
          disableHoverListener={!isReserveAlreadySupplied}
        >
          <span>
            <Button
              disabled={disableBorrow}
              variant="contained"
              onClick={() => openBorrow(underlyingAsset, currentMarket, name, 'dashboard')}
              sx={{ mr: 1.5 }}
              fullWidth
            >
              Borrow
            </Button>
          </span>
        </Tooltip>
        <Button
          variant="outlined"
          component={Link}
          href={ROUTES.reserveOverview(underlyingAsset, currentMarket)}
          fullWidth
        >
          Details
        </Button>
      </Box>
    </ListMobileItemWrapper>
  );
};
