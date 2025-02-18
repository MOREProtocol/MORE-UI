import { Box } from '@mui/material';
import { FilterSlider } from 'src/components/lists/FilterSlider';
import { ComputedReserveData } from 'src/hooks/app-data-provider/useAppDataProvider';

export interface FilterValue {
  min: number;
  max: number;
  step?: number;
  value: number;
}

export interface FilterState {
  apy: FilterValue;
  totalSupplied: FilterValue;
  utilizationRate: FilterValue;
  maxLtv: FilterValue;
}

export const DEFAULT_FILTERS: FilterState = {
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
          ...filters[filterKey],
          value: newValue as number,
        },
      });
    };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        mb: 2,
        px: { xs: 4, xsm: 6 },
      }}
    >
      <FilterSlider
        label="Minimum APY %"
        value={filters.apy.value}
        min={filters.apy.min}
        max={filters.apy.max}
        ariaLabel="APY filter"
        onChange={handleFilterChange('apy')}
        valueLabelFormat={(value) => `${value}%`}
      />
      <FilterSlider
        label="Minimum Total Supplied"
        value={filters.totalSupplied.value}
        min={filters.totalSupplied.min}
        max={filters.totalSupplied.max}
        step={filters.totalSupplied.step}
        ariaLabel="Total supplied filter"
        onChange={handleFilterChange('totalSupplied')}
        valueLabelFormat={(value) => {
          if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
          }
          return `${(value / 1000).toFixed(0)}k`;
        }}
      />
      <FilterSlider
        label="Minimum Utilization Rate %"
        value={filters.utilizationRate.value}
        min={filters.utilizationRate.min}
        max={filters.utilizationRate.max}
        ariaLabel="Utilization rate filter"
        onChange={handleFilterChange('utilizationRate')}
        valueLabelFormat={(value) => `${value}%`}
      />
      <FilterSlider
        label="Minimum LLTV"
        value={filters.maxLtv.value}
        min={filters.maxLtv.min}
        max={filters.maxLtv.max}
        ariaLabel="Max LTV filter"
        onChange={handleFilterChange('maxLtv')}
        valueLabelFormat={(value) => `${value}%`}
      />
    </Box>
  );
};

export const applyFilters = (reserves: ComputedReserveData[], filters: FilterState) => {
  let filteredReserves = [...reserves];

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

export const calculateFilterRanges = (reserves: ComputedReserveData[]) => {
  const ranges = {
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
  };

  reserves.forEach((reserve) => {
    // Total Supplied (convert to thousands)
    const totalSuppliedK = Math.round(Number(reserve.totalLiquidityUSD));
    ranges.totalSupplied.max = Math.max(ranges.totalSupplied.max, totalSuppliedK);
    // Utilization Rate
    const utilRate = Math.round(Number(reserve.borrowUsageRatio) * 100);
    ranges.utilizationRate.max = Math.max(ranges.utilizationRate.max, utilRate);
    // Max LTV
    const ltv = Math.round(Number(reserve.formattedBaseLTVasCollateral));
    ranges.maxLtv.max = Math.max(ranges.maxLtv.max, ltv);
    // APY
    const supplyApy = Math.round(Number(reserve.supplyAPY) * 100);
    ranges.apy.max = Math.max(ranges.apy.max, supplyApy);
  });

  return ranges;
};
