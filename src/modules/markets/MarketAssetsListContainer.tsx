import { API_ETH_MOCK_ADDRESS } from '@aave/contract-helpers';
import { Box, Collapse, Switch, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { ListWrapper } from 'src/components/lists/ListWrapper';
import { NoSearchResults } from 'src/components/NoSearchResults';
import { Link } from 'src/components/primitives/Link';
import { Warning } from 'src/components/primitives/Warning';
import { TitleWithSearchBar } from 'src/components/TitleWithSearchBar';
import { MarketWarning } from 'src/components/transactions/Warnings/MarketWarning';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useWalletBalances } from 'src/hooks/app-data-provider/useWalletBalances';
import MarketAssetsList from 'src/modules/markets/MarketAssetsList';
import { useRootStore } from 'src/store/root';
import { fetchIconSymbolAndName } from 'src/ui-config/reservePatches';
import { getGhoReserve, GHO_SUPPORTED_MARKETS, GHO_SYMBOL } from 'src/utils/ghoUtilities';

import { GENERAL } from '../../utils/mixPanelEvents';
import {
  applyFilters,
  calculateFilterOptions,
  DEFAULT_FILTERS,
  FilterComponent,
  FilterState,
} from './MarketAssetsListFilters';

export const MarketAssetsListContainer = () => {
  const { reserves, loading } = useAppDataContext();
  const { currentMarket, currentMarketData, currentNetworkConfig } = useRootStore();
  const { walletBalances } = useWalletBalances(currentMarketData);
  const [searchTerm, setSearchTerm] = useState('');
  const { breakpoints } = useTheme();
  const lg = useMediaQuery(breakpoints.down('lg'));
  const sm = useMediaQuery(breakpoints.down('sm'));
  const [showFilter, setShowFilter] = useState(!lg);

  // Calculate initial ranges from reserves
  const initialFilterOptions = useMemo(() => calculateFilterOptions(reserves), [reserves]);

  // Initialize filters with calculated ranges
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  useEffect(() => {
    if (!loading && initialFilterOptions) {
      setFilters({
        ...DEFAULT_FILTERS,
        totalSupplied: {
          ...DEFAULT_FILTERS.totalSupplied,
          max: initialFilterOptions.totalSupplied.max,
        },
        utilizationRate: {
          ...DEFAULT_FILTERS.utilizationRate,
          max: initialFilterOptions.utilizationRate.max,
        },
        maxLtv: {
          ...DEFAULT_FILTERS.maxLtv,
          max: initialFilterOptions.maxLtv.max,
        },
        apy: {
          ...DEFAULT_FILTERS.apy,
          max: initialFilterOptions.apy.max,
        },
        loanToken: {
          ...DEFAULT_FILTERS.loanToken,
          options: initialFilterOptions.loanTokens.options,
        },
        collateralToken: {
          ...DEFAULT_FILTERS.collateralToken,
          options: initialFilterOptions.collateralTokens.options,
        },
      });
    }
  }, [initialFilterOptions, loading]);

  const trackEvent = useRootStore((store) => store.trackEvent);

  const handleFiltersChange = (newFilters: Partial<FilterState>) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      ...newFilters,
    }));
  };

  const ghoReserve = getGhoReserve(reserves);
  const filteredData = reserves
    // Filter out any non-active reserves
    .filter((res) => res.isActive)
    // Filter out all GHO, as we deliberately display it on supported markets
    .filter((res) => res !== ghoReserve)
    // filter out any that don't meet search term criteria
    .filter((res) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase().trim();
      return (
        res.symbol.toLowerCase().includes(term) ||
        res.name.toLowerCase().includes(term) ||
        res.underlyingAsset.toLowerCase().includes(term)
      );
    })
    .filter((res) => applyFilters([res], filters).length > 0)
    // Transform the object for list to consume it
    .map((reserve) => ({
      ...reserve,
      ...(reserve.isWrappedBaseAsset
        ? fetchIconSymbolAndName({
            symbol: currentNetworkConfig.baseAssetSymbol,
            underlyingAsset: API_ETH_MOCK_ADDRESS.toLowerCase(),
          })
        : {}),
    }));
  const marketFrozen = !reserves.some((reserve) => !reserve.isFrozen);
  const showFrozenMarketWarning =
    marketFrozen && ['Harmony', 'Fantom', 'Ethereum AMM'].includes(currentMarketData.marketTitle);
  const unfrozenReserves = filteredData.filter((r) => !r.isFrozen && !r.isPaused);
  const [showFrozenMarketsToggle, setShowFrozenMarketsToggle] = useState(false);

  const handleChange = () => {
    setShowFrozenMarketsToggle((prevState) => !prevState);
  };

  const frozenOrPausedReserves = filteredData.filter((r) => r.isFrozen || r.isPaused);

  // Determine if to show GHO market list item
  const shouldDisplayGho = (marketTitle: string, searchTerm: string): boolean => {
    if (!GHO_SUPPORTED_MARKETS.includes(marketTitle)) {
      return false;
    }

    if (!searchTerm) {
      return true;
    }

    const normalizedSearchTerm = searchTerm.toLowerCase().trim();
    return (
      normalizedSearchTerm.length <= 3 && GHO_SYMBOL.toLowerCase().includes(normalizedSearchTerm)
    );
  };
  const displayGho: boolean = shouldDisplayGho(currentMarket, searchTerm);

  return (
    <ListWrapper
      titleComponent={
        <TitleWithSearchBar
          onSearchTermChange={setSearchTerm}
          onShowFilterChange={setShowFilter}
          showFilter={showFilter}
          title={<>{currentMarketData.marketTitle} assets</>}
          searchPlaceholder={sm ? 'Search asset' : 'Search asset name, symbol, or address'}
        />
      }
      filterComponent={
        <Collapse in={showFilter}>
          <FilterComponent filters={filters} onFiltersChange={handleFiltersChange} />
        </Collapse>
      }
    >
      {showFrozenMarketWarning && (
        <Box mx={6}>
          <MarketWarning marketName={currentMarketData.marketTitle} forum />
        </Box>
      )}

      {/* Unfrozen assets list */}
      <MarketAssetsList
        reserves={unfrozenReserves}
        loading={loading}
        walletBalances={walletBalances}
      />

      {/* Frozen or paused assets list */}
      {frozenOrPausedReserves.length > 0 && (
        <Box sx={{ mt: 10, px: { xs: 4, xsm: 6 } }}>
          <Typography variant="h4" mb={4}>
            Show Frozen or paused assets
            <Switch
              checked={showFrozenMarketsToggle}
              onChange={handleChange}
              inputProps={{ 'aria-label': 'controlled' }}
            />
          </Typography>
          {showFrozenMarketsToggle && (
            <Warning severity="info">
              These assets are temporarily frozen or paused by Aave community decisions, meaning
              that further supply / borrow, or rate swap of these assets are unavailable.
              Withdrawals and debt repayments are allowed. Follow the{' '}
              <Link
                onClick={() => {
                  trackEvent(GENERAL.EXTERNAL_LINK, {
                    link: 'Frozen Market Markets Page',
                    frozenMarket: currentNetworkConfig.name,
                  });
                }}
                href="https://governance.aave.com"
                underline="always"
              >
                More governance forum
              </Link>{' '}
              for further updates.
            </Warning>
          )}
        </Box>
      )}
      {showFrozenMarketsToggle && (
        <MarketAssetsList
          reserves={frozenOrPausedReserves}
          loading={loading}
          walletBalances={walletBalances}
        />
      )}

      {/* Show no search results message if nothing hits in either list */}
      {!loading && filteredData.length === 0 && !displayGho && (
        <NoSearchResults
          searchTerm={searchTerm}
          subtitle={
            <>
              We couldn&apos;t find any assets related to your search. Try again with a different
              asset name, symbol, search parameter, or address.
            </>
          }
        />
      )}
    </ListWrapper>
  );
};
