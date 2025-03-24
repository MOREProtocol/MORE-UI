import { Box, Button, Link, Typography } from '@mui/material';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { OffboardingTooltip } from 'src/components/infoTooltips/OffboardingToolTip';
import { RenFILToolTip } from 'src/components/infoTooltips/RenFILToolTip';
import { IsolatedEnabledBadge } from 'src/components/isolationMode/IsolatedBadge';
import { NoData } from 'src/components/primitives/NoData';
import { ReserveSubheader } from 'src/components/ReserveSubheader';
import { AssetsBeingOffboarded } from 'src/components/Warnings/OffboardingWarning';
import { WalletBalancesMap } from 'src/hooks/app-data-provider/useWalletBalances';
import { useModalContext } from 'src/hooks/useModal';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { useRootStore } from 'src/store/root';
import { MARKETS } from 'src/utils/mixPanelEvents';

import { IncentivesCard } from '../../components/incentives/IncentivesCard';
import { AMPLToolTip } from '../../components/infoTooltips/AMPLToolTip';
import { ListColumn } from '../../components/lists/ListColumn';
import { ListItem } from '../../components/lists/ListItem';
import { FormattedNumber } from '../../components/primitives/FormattedNumber';
import { ROUTES } from '../../components/primitives/Link';
import { TokenIcon } from '../../components/primitives/TokenIcon';
import { ComputedReserveDataWithMarket } from '../../hooks/app-data-provider/useAppDataProvider';

export const MarketAssetsListItem = ({
  reserve,
  walletBalances,
}: {
  reserve: ComputedReserveDataWithMarket;
  walletBalances: WalletBalancesMap;
}) => {
  const router = useRouter();
  const { currentMarket, setCurrentMarket } = useRootStore();
  const { openSupply, openBorrow } = useModalContext();
  const trackEvent = useRootStore((store) => store.trackEvent);
  const { currentAccount } = useWeb3Context();
  const lastColumnSize = useMemo(() => (!!currentAccount ? 180 : 95), [currentAccount]);

  // Does not seem to work
  const disableSupply =
    !currentAccount || !reserve.isActive || Number(walletBalances[reserve.underlyingAsset]) <= 0;
  const disableBorrow =
    !currentAccount ||
    !reserve.isActive ||
    !reserve.borrowingEnabled ||
    reserve.isFrozen ||
    reserve.isPaused;

  const offboardingDiscussion = AssetsBeingOffboarded[currentMarket]?.[reserve.symbol];

  return (
    <ListItem
      px={6}
      minHeight={76}
      onClick={() => {
        trackEvent(MARKETS.DETAILS_NAVIGATION, {
          type: 'Row',
          assetName: reserve.name,
          asset: reserve.underlyingAsset,
          market: currentMarket,
        });
        setCurrentMarket(reserve.market.market);
        router.push(ROUTES.reserveOverview(reserve.underlyingAsset, reserve.market.market));
      }}
      sx={{ cursor: 'pointer' }}
      button
      data-cy={`marketListItemListItem_${reserve.symbol.toUpperCase()}`}
    >
      <ListColumn isRow maxWidth={280}>
        <TokenIcon
          symbol={reserve.iconSymbol}
          market={currentMarket === 'all_markets' && reserve.market}
          fontSize="large"
        />
        <Box sx={{ pl: 3.5, overflow: 'hidden' }}>
          <Typography variant="h4" noWrap>
            {reserve.name}
          </Typography>

          <Box
            sx={{
              p: { xs: '0', xsm: '3.625px 0px' },
            }}
          >
            <Typography variant="subheader2" color="text.muted" noWrap>
              {reserve.symbol}
              {reserve.isIsolated && (
                <span style={{ marginLeft: '8px' }}>
                  <IsolatedEnabledBadge />
                </span>
              )}
            </Typography>
          </Box>
        </Box>
        {reserve.symbol === 'AMPL' && <AMPLToolTip />}
        {reserve.symbol === 'renFIL' && <RenFILToolTip />}
        {offboardingDiscussion && <OffboardingTooltip discussionLink={offboardingDiscussion} />}
      </ListColumn>

      <ListColumn>
        <FormattedNumber compact value={reserve.totalLiquidity} variant="main16" />
        <ReserveSubheader value={reserve.totalLiquidityUSD} />
      </ListColumn>

      <ListColumn>
        <IncentivesCard
          value={reserve.supplyAPY}
          incentives={reserve.aIncentivesData || []}
          symbol={reserve.symbol}
          variant="main16"
          symbolsVariant="secondary16"
        />
      </ListColumn>

      <ListColumn>
        {reserve.borrowingEnabled || Number(reserve.totalDebt) > 0 ? (
          <>
            <FormattedNumber compact value={reserve.totalDebt} variant="main16" />{' '}
            <ReserveSubheader value={reserve.totalDebtUSD} />
          </>
        ) : (
          <NoData variant={'secondary14'} color="text.secondary" />
        )}
      </ListColumn>

      <ListColumn>
        <IncentivesCard
          value={Number(reserve.totalVariableDebtUSD) > 0 ? reserve.variableBorrowAPY : '-1'}
          incentives={reserve.vIncentivesData || []}
          symbol={reserve.symbol}
          variant="main16"
          symbolsVariant="secondary16"
        />
        {!reserve.borrowingEnabled &&
          Number(reserve.totalVariableDebt) > 0 &&
          !reserve.isFrozen && <ReserveSubheader value={'Disabled'} />}
      </ListColumn>
      {/*
      <ListColumn>
        <IncentivesCard
          value={Number(reserve.totalStableDebtUSD) > 0 ? reserve.stableBorrowAPY : '-1'}
          incentives={reserve.sIncentivesData || []}
          symbol={reserve.symbol}
          variant="main16"
          symbolsVariant="secondary16"
        />
        {!reserve.borrowingEnabled && Number(reserve.totalStableDebt) > 0 && !reserve.isFrozen && (
          <ReserveSubheader value={'Disabled'} />
        )}
      </ListColumn> */}

      <ListColumn minWidth={lastColumnSize} maxWidth={lastColumnSize} align="right">
        {currentAccount && currentMarket !== 'all_markets' ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              disabled={disableSupply}
              variant="contained"
              onClick={(event) => {
                event.stopPropagation();
                openSupply(
                  reserve.underlyingAsset,
                  reserve.market.market,
                  reserve.name,
                  'market-list'
                );
              }}
            >
              Supply
            </Button>
            <Button
              disabled={disableBorrow}
              variant="contained"
              onClick={(event) => {
                event.stopPropagation();
                openBorrow(
                  reserve.underlyingAsset,
                  reserve.market.market,
                  reserve.name,
                  'market-list'
                );
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
            onClick={() => {
              trackEvent(MARKETS.DETAILS_NAVIGATION, {
                type: 'Button',
                assetName: reserve.name,
                asset: reserve.underlyingAsset,
                market: currentMarket,
              });
              setCurrentMarket(reserve.market.market);
            }}
          >
            Details
          </Button>
        )}
      </ListColumn>
    </ListItem>
  );
};
