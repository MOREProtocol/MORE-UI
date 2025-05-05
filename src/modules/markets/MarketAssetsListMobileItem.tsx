import { Box, Button, Divider } from '@mui/material';
import { VariableAPYTooltip } from 'src/components/infoTooltips/VariableAPYTooltip';
import { NoData } from 'src/components/primitives/NoData';
import { ReserveSubheader } from 'src/components/ReserveSubheader';
import { useModalContext } from 'src/hooks/useModal';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { useRootStore } from 'src/store/root';
import { MARKETS } from 'src/utils/mixPanelEvents';

import { IncentivesCard } from '../../components/incentives/IncentivesCard';
import { FormattedNumber } from '../../components/primitives/FormattedNumber';
import { Link, ROUTES } from '../../components/primitives/Link';
import { Row } from '../../components/primitives/Row';
import { ComputedReserveDataWithMarket } from '../../hooks/app-data-provider/useAppDataProvider';
import { ListMobileItemWrapper } from '../dashboard/lists/ListMobileItemWrapper';

export const MarketAssetsListMobileItem = ({ ...reserve }: ComputedReserveDataWithMarket) => {
  const trackEvent = useRootStore((store) => store.trackEvent);
  const { currentMarket, setCurrentMarket } = useRootStore();
  const { openSupply, openBorrow } = useModalContext();
  const { currentAccount } = useWeb3Context();
  const disableSupply = !currentAccount || !reserve.isActive;
  const disableBorrow =
    !currentAccount ||
    !reserve.isActive ||
    !reserve.borrowingEnabled ||
    reserve.isFrozen ||
    reserve.isPaused;

  return (
    <ListMobileItemWrapper
      symbol={reserve.symbol}
      iconSymbol={reserve.iconSymbol}
      name={reserve.name}
      underlyingAsset={reserve.underlyingAsset}
      currentMarket={reserve.market.market}
      isIsolated={reserve.isIsolated}
    >
      <Row caption={'Total supplied'} captionVariant="description" mb={3}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: { xs: 'flex-end' },
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <FormattedNumber compact value={reserve.totalLiquidity} variant="secondary14" />
          <ReserveSubheader value={reserve.totalLiquidityUSD} rightAlign={true} />
        </Box>
      </Row>
      <Row caption={'Supply APY'} captionVariant="description" mb={3} align="flex-start">
        <IncentivesCard
          align="flex-end"
          value={reserve.supplyAPY}
          incentives={reserve.aIncentivesData || []}
          symbol={reserve.symbol}
          variant="secondary14"
        />
      </Row>

      <Divider sx={{ mb: 3 }} />

      <Row caption={'Total borrowed'} captionVariant="description" mb={3}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: { xs: 'flex-end' },
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          {Number(reserve.totalDebt) > 0 ? (
            <>
              <FormattedNumber compact value={reserve.totalDebt} variant="secondary14" />
              <ReserveSubheader value={reserve.totalDebtUSD} rightAlign={true} />
            </>
          ) : (
            <NoData variant={'secondary14'} color="text.secondary" />
          )}
        </Box>
      </Row>
      <Row
        caption={
          <VariableAPYTooltip
            text={'Borrow APY, variable'}
            key="APY_list_mob_variable_type"
            variant="description"
          />
        }
        captionVariant="description"
        mb={3}
        align="flex-start"
      >
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <IncentivesCard
            align="flex-end"
            value={Number(reserve.totalVariableDebtUSD) > 0 ? reserve.variableBorrowAPY : '-1'}
            incentives={reserve.vIncentivesData || []}
            symbol={reserve.symbol}
            variant="secondary14"
          />
          {!reserve.borrowingEnabled &&
            Number(reserve.totalVariableDebt) > 0 &&
            !reserve.isFrozen && <ReserveSubheader value={'Disabled'} />}
        </Box>
      </Row>
      {/* <Row
        caption={
          <StableAPYTooltip
            text={Borrow APY, stable}
            key="APY_list_mob_stable_type"
            variant="description"
          />
        }
        captionVariant="description"
        mb={4}
        align="flex-start"
      >
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <IncentivesCard
            align="flex-end"
            value={Number(reserve.totalStableDebtUSD) > 0 ? reserve.stableBorrowAPY : '-1'}
            incentives={reserve.sIncentivesData || []}
            symbol={reserve.symbol}
            variant="secondary14"
          />
          {!reserve.borrowingEnabled &&
            Number(reserve.totalStableDebt) > 0 &&
            !reserve.isFrozen && <ReserveSubheader value={'Disabled'} />}
        </Box>
      </Row> */}

      {currentAccount ? (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            disabled={disableSupply}
            variant="contained"
            fullWidth
            onClick={(event) => {
              event.stopPropagation();
              openSupply(reserve.underlyingAsset, reserve.market.market, reserve.name, 'dashboard');
            }}
          >
            Supply
          </Button>
          <Button
            disabled={disableBorrow}
            variant="contained"
            fullWidth
            onClick={(event) => {
              event.stopPropagation();
              openBorrow(reserve.underlyingAsset, reserve.market.market, reserve.name, 'dashboard');
            }}
          >
            Borrow
          </Button>
        </Box>
      ) : (
        <Button
          variant="outlined"
          component={Link}
          href={ROUTES.reserveOverview(reserve.underlyingAsset, reserve.market.market)}
          fullWidth
          onClick={() => {
            trackEvent(MARKETS.DETAILS_NAVIGATION, {
              type: 'button',
              asset: reserve.underlyingAsset,
              market: currentMarket,
              assetName: reserve.name,
            });
            setCurrentMarket(reserve.market.market);
          }}
        >
          View details
        </Button>
      )}
    </ListMobileItemWrapper>
  );
};
