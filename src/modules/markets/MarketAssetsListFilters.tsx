import { Box } from '@mui/material';
import { MarketType, MarketTypeFilter } from 'src/components/lists/FilterMarketTypeFilter';
import { FilterSelect } from 'src/components/lists/FilterSelect';
import { FilterSlider } from 'src/components/lists/FilterSlider';
import { ComputedReserveData } from 'src/hooks/app-data-provider/useAppDataProvider';

export interface FilterValue {
  min: number;
  max: number;
  step?: number;
  value: number;
}

export interface FilterState {
  marketType: MarketType;
  loanToken: { value: string; options: { value: string; label: string }[] };
  collateralToken: { value: string; options: { value: string; label: string }[] };
  apy: FilterValue;
  totalSupplied: FilterValue;
  utilizationRate: FilterValue;
  maxLtv: FilterValue;
}

export const DEFAULT_FILTERS: FilterState = {
  marketType: 'all',
  loanToken: { value: 'all', options: [] },
  collateralToken: { value: 'all', options: [] },
  apy: {
    min: 0,
    max: 100,
    value: 0,
  },
  utilizationRate: {
    min: 0,
    max: 100,
    value: 0,
  },
  maxLtv: {
    min: 0,
    max: 100,
    value: 0,
  },
  totalSupplied: {
    min: 0,
    max: 1000000,
    step: 1000,
    value: 0,
  },
};

interface FilterComponentProps {
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
}

export const FilterComponent = ({ filters, onFiltersChange }: FilterComponentProps) => {
  const handleFilterChange =
    (filterKey: keyof FilterState) => (_event: Event, newValue: number | number[]) => {
      onFiltersChange({
        [filterKey]: {
          ...(filters[filterKey] as FilterValue),
          value: newValue as number,
        },
      });
    };

  const handleMarketTypeChange = (marketType: MarketType) => {
    onFiltersChange({ marketType });
  };

  const handleLoanTokenChange = (loanToken: string) => {
    onFiltersChange({
      loanToken: {
        value: loanToken,
        options: filters.loanToken.options,
      },
    });
  };

  const handleCollateralTokenChange = (collateralToken: string) => {
    onFiltersChange({
      collateralToken: {
        value: collateralToken,
        options: filters.collateralToken.options,
      },
    });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
        mb: 2,
        px: { xs: 4, xsm: 6 },
      }}
    >
      <MarketTypeFilter value={filters.marketType} onChange={handleMarketTypeChange} />
      <FilterSelect
        label="Loan Token"
        value={filters.loanToken.value}
        options={filters.loanToken.options}
        ariaLabel="Loan token filter"
        onChange={handleLoanTokenChange}
      />
      <FilterSelect
        label="Collateral Token"
        value={filters.collateralToken.value}
        options={filters.collateralToken.options}
        ariaLabel="Collateral token filter"
        onChange={handleCollateralTokenChange}
      />
      <FilterSlider
        label="APY"
        value={filters.apy.value}
        min={filters.apy.min}
        max={filters.apy.max}
        ariaLabel="APY filter"
        onChange={handleFilterChange('apy')}
        valueLabelFormat={(value) => `${value}%`}
      />
      <FilterSlider
        label="Available liquidity"
        value={filters.totalSupplied.value}
        min={filters.totalSupplied.min}
        max={filters.totalSupplied.max}
        step={filters.totalSupplied.step}
        ariaLabel="Available liquidity filter"
        onChange={handleFilterChange('totalSupplied')}
        valueLabelFormat={(value) => {
          if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
          }
          return `${(value / 1000).toFixed(0)}k`;
        }}
      />
      <FilterSlider
        label="Utilization"
        value={filters.utilizationRate.value}
        min={filters.utilizationRate.min}
        max={filters.utilizationRate.max}
        ariaLabel="Utilization filter"
        onChange={handleFilterChange('utilizationRate')}
        valueLabelFormat={(value) => `${value}%`}
      />
      <FilterSlider
        label="LLTV"
        value={filters.maxLtv.value}
        min={filters.maxLtv.min}
        max={filters.maxLtv.max}
        ariaLabel="LLTV filter"
        onChange={handleFilterChange('maxLtv')}
        valueLabelFormat={(value) => `${value}%`}
      />
    </Box>
  );
};

export const applyFilters = (reserves: ComputedReserveData[], filters: FilterState) => {
  let filteredReserves = [...reserves];

  if (filters.marketType !== 'all') {
    filteredReserves = filteredReserves.filter((reserve) => {
      if (filters.marketType === 'earn') {
        return !(!reserve.isActive || reserve.isPaused || Number(reserve.totalLiquidity) <= 0);
      } else if (filters.marketType === 'borrow') {
        return !(
          !reserve.isActive ||
          !reserve.borrowingEnabled ||
          reserve.isFrozen ||
          reserve.isPaused ||
          Number(reserve.totalLiquidity) <= 0
        );
      }
      return true;
    });
  }

  // Add loan token filter
  if (filters.loanToken.value !== 'all') {
    filteredReserves = filteredReserves.filter(
      (reserve) => reserve.symbol === filters.loanToken.value
    );
  }

  // Add collateral token filter
  if (filters.collateralToken.value !== 'all') {
    filteredReserves = filteredReserves.filter(
      (reserve) => reserve.symbol === filters.collateralToken.value
    );
  }

  filteredReserves = filteredReserves.filter((reserve) => {
    // Check APY
    const supplyApy = Number(reserve.supplyAPY) * 100;
    if (supplyApy < filters.apy.value) return false;

    // Check Total Supplied
    const totalSuppliedUsd = Number(reserve.totalLiquidityUSD);
    if (totalSuppliedUsd < filters.totalSupplied.value) return false;

    // Check Utilization Rate
    const utilizationRate = Number(reserve.borrowUsageRatio) * 100;
    if (utilizationRate < filters.utilizationRate.value) return false;

    // Check Max LTV
    const maxLtv = Number(reserve.formattedBaseLTVasCollateral) * 100;
    if (maxLtv < filters.maxLtv.value) return false;

    return true;
  });

  return filteredReserves;
};

const getActiveTokens = (
  reserves: ComputedReserveData[],
  additionalCondition: (reserve: ComputedReserveData) => boolean
) => {
  return reserves
    .filter(
      (reserve) =>
        reserve.isActive &&
        !reserve.isFrozen &&
        !reserve.isPaused &&
        Number(reserve.totalLiquidity) > 0 &&
        additionalCondition(reserve)
    )
    .map((reserve) => reserve.symbol);
};

const createTokenOptions = (tokens: string[]) =>
  ['all', ...new Set(tokens)].map((token) => ({
    value: token,
    label: token === 'all' ? 'All' : token,
  }));

export const getLoanTokens = (reserves: ComputedReserveData[]) => {
  const loanTokens = getActiveTokens(reserves, (reserve) => reserve.borrowingEnabled);
  return createTokenOptions(loanTokens);
};

export const getCollateralTokens = (reserves: ComputedReserveData[]) => {
  const collateralTokens = getActiveTokens(
    reserves,
    (reserve) =>
      Number(reserve.supplyAPY) > 0 &&
      Number(reserve.formattedBaseLTVasCollateral) > 0 &&
      reserve.usageAsCollateralEnabled
  );
  return createTokenOptions(collateralTokens);
};

export const calculateFilterOptions = (reserves: ComputedReserveData[]) => {
  const options = {
    totalSupplied: {
      max: 0,
    },
    utilizationRate: {
      max: 0,
    },
    maxLtv: {
      max: 0,
    },
    apy: {
      max: 0,
    },
    loanTokens: {
      options: [],
    },
    collateralTokens: {
      options: [],
    },
  };

  options.loanTokens.options = getLoanTokens(reserves);
  options.collateralTokens.options = getCollateralTokens(reserves);

  reserves.forEach((reserve) => {
    // Total Supplied (convert to thousands)
    const totalSuppliedK = Math.round(Number(reserve.totalLiquidityUSD));
    options.totalSupplied.max = Math.max(options.totalSupplied.max, totalSuppliedK);
    // Utilization Rate
    const utilRate = Math.round(Number(reserve.borrowUsageRatio) * 100);
    options.utilizationRate.max = Math.max(options.utilizationRate.max, utilRate);
    // Max LTV
    const ltv = Math.round(Number(reserve.formattedBaseLTVasCollateral));
    options.maxLtv.max = Math.max(options.maxLtv.max, ltv);
    // APY
    const supplyApy = Math.round(Number(reserve.supplyAPY) * 100);
    options.apy.max = Math.max(options.apy.max, supplyApy);
  });

  return options;
};
