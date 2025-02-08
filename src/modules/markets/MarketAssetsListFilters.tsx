import { Box } from '@mui/material';
import { FilterSlider } from 'src/components/lists/FilterSlider';
import { ComputedReserveData } from 'src/hooks/app-data-provider/useAppDataProvider';

export interface FilterState {
  apy: number;
  totalSupplied: number;
  utilizationRate: number;
  maxLtv: number;
}

export const DEFAULT_FILTERS: FilterState = {
  apy: 0,
  totalSupplied: 0,
  utilizationRate: 0,
  maxLtv: 0,
};

interface FilterComponentProps {
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
}

export const FilterComponent = ({ filters, onFiltersChange }: FilterComponentProps) => {
  const handleFilterChange =
    (filterKey: keyof FilterState) => (_event: Event, newValue: number | number[]) => {
      onFiltersChange({ [filterKey]: newValue as number });
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
        value={filters.apy}
        min={0}
        max={100}
        ariaLabel="APY filter"
        onChange={handleFilterChange('apy')}
        valueLabelFormat={(value) => `${value}%`}
      />
      <FilterSlider
        label="Minimum Total Supplied (k$)"
        value={filters.totalSupplied}
        min={0}
        max={1000000}
        step={1000}
        ariaLabel="Total supplied filter"
        onChange={handleFilterChange('totalSupplied')}
        valueLabelFormat={(value) => `${(value / 1000).toFixed(0)}k`}
      />
      <FilterSlider
        label="Minimum Utilization Rate %"
        value={filters.utilizationRate}
        min={0}
        max={100}
        ariaLabel="Utilization rate filter"
        onChange={handleFilterChange('utilizationRate')}
        valueLabelFormat={(value) => `${value}%`}
      />
      <FilterSlider
        label="Minimum LLTV"
        value={filters.maxLtv}
        min={0}
        max={100}
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
    if (supplyApy < filters.apy) return false;

    // Check Total Supplied
    const totalSuppliedUsd = Number(reserve.totalLiquidityUSD);
    if (totalSuppliedUsd < filters.totalSupplied) return false;

    // Check Utilization Rate
    const utilizationRate = Number(reserve.borrowUsageRatio) * 100;
    if (utilizationRate < filters.utilizationRate) return false;

    // Check Max LTV
    const maxLtv = Number(reserve.formattedBaseLTVasCollateral) * 100;
    if (maxLtv < filters.maxLtv) return false;

    return true;
  });

  return filteredReserves;
};
