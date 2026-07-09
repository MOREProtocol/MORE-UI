import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { ParentSize } from '@visx/responsive';
import { useState, JSX } from 'react';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import type { ComputedReserveData } from 'src/hooks/app-data-provider/useAppDataProvider';
import { ReserveRateTimeRange, useReserveRatesHistory } from 'src/hooks/useReservesHistory';
import { MarketDataType } from 'src/utils/marketsAndNetworksConfig';
import { FONT_MONO } from 'src/utils/theme';

import { ESupportedTimeRanges } from '../TimeRangeSelector';
import { ApyGraph } from './ApyGraph';
import { GraphLegend } from './GraphLegend';
import { GraphTimeRangeSelector } from './GraphTimeRangeSelector';

type Field = 'liquidityRate' | 'stableBorrowRate' | 'variableBorrowRate';

type Fields = { name: Field; color: string; text: string }[];

type ApyGraphContainerKey = 'supply' | 'borrow' | 'combined';

// Combined-chart series colors mirror the mockup: orange supply, blue borrow.
const SUPPLY_COLOR = '#F59042';
const BORROW_COLOR = '#0EA5E9';
const BORROW_STABLE_COLOR = '#93C5FD';

const HeaderStat = ({
  label,
  value,
  delta,
}: {
  label: string;
  value: string | number;
  delta?: number;
}) => {
  const hasDelta = delta !== undefined && Number.isFinite(delta) && Math.abs(delta) >= 0.005;
  const up = (delta ?? 0) >= 0;
  return (
    <Box>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'text.secondary',
          mb: '4px',
        }}
      >
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <FormattedNumber
          value={value}
          percent
          visibleDecimals={2}
          variant="main21"
          sx={{ fontFamily: FONT_MONO, color: 'text.primary' }}
        />
        {hasDelta && (
          <Typography
            sx={{
              fontFamily: FONT_MONO,
              fontSize: 12,
              fontWeight: 600,
              color: up ? 'success.main' : 'error.main',
            }}
          >
            {up ? '↗' : '↘'} {up ? '+' : ''}
            {delta?.toFixed(2)}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

type ApyGraphContainerProps = {
  graphKey: ApyGraphContainerKey;
  reserve: ComputedReserveData;
  currentMarketData: MarketDataType;
};

/**
 * NOTES:
 * This may not be named accurately.
 * This container uses the same graph but with different fields, so we use a 'graphKey' to determine which to show
 * This likely may need to be turned into two different container components if the graphs become wildly different.
 * This graph gets its data via an external API call, thus having loading/error states
 */
export const ApyGraphContainer = ({
  graphKey,
  reserve,
  currentMarketData,
}: ApyGraphContainerProps): JSX.Element => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<ReserveRateTimeRange>(
    graphKey === 'combined' ? ESupportedTimeRanges.ThreeMonths : ESupportedTimeRanges.OneMonth
  );

  const CHART_HEIGHT = 155;
  const CHART_HEIGHT_LOADING_FIX = 3.5;
  let reserveAddress = '';
  if (reserve) {
    if (currentMarketData.v3) {
      reserveAddress = `${reserve.underlyingAsset}${currentMarketData.addresses.LENDING_POOL_ADDRESS_PROVIDER}${currentMarketData.chainId}`;
    } else {
      reserveAddress = `${reserve.underlyingAsset}${currentMarketData.addresses.LENDING_POOL_ADDRESS_PROVIDER}`;
    }
  }
  const { data, loading, error, refetch } = useReserveRatesHistory(
    reserveAddress,
    selectedTimeRange
  );

  // Supply fields
  const supplyFields: Fields = [{ name: 'liquidityRate', color: '#2EBAC6', text: 'Supply APR' }];

  // Borrow fields
  const borrowFields: Fields = [
    ...(reserve.stableBorrowRateEnabled
      ? ([
          {
            name: 'stableBorrowRate',
            color: '#E7C6DF',
            text: 'Borrow APR, stable',
          },
        ] as const)
      : []),
    {
      name: 'variableBorrowRate',
      color: '#B6509E',
      text: 'Borrow APR, variable',
    },
  ];

  // Combined chart (mockup): both Supply + Borrow APY on one set of axes.
  const combinedFields: Fields = [
    { name: 'liquidityRate', color: SUPPLY_COLOR, text: 'Supply APY' },
    ...(reserve.stableBorrowRateEnabled
      ? ([
          { name: 'stableBorrowRate', color: BORROW_STABLE_COLOR, text: 'Borrow APY, stable' },
        ] as const)
      : []),
    { name: 'variableBorrowRate', color: BORROW_COLOR, text: 'Borrow APY' },
  ];

  const fields =
    graphKey === 'combined' ? combinedFields : graphKey === 'supply' ? supplyFields : borrowFields;
  const isCombined = graphKey === 'combined';

  // Change over the selected range (first → last datapoint), in percentage points.
  const rangeDelta = (field: Field): number | undefined => {
    if (data.length < 2) return undefined;
    return (data[data.length - 1][field] - data[0][field]) * 100;
  };
  const supplyDelta = rangeDelta('liquidityRate');
  const borrowDelta = rangeDelta('variableBorrowRate');

  const graphLoading = (
    <Box
      sx={{
        height: CHART_HEIGHT + CHART_HEIGHT_LOADING_FIX,
        width: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CircularProgress size={20} sx={{ mb: 2, opacity: 0.5 }} />
      <Typography variant="subheader1" color="text.muted">
        Loading data...
      </Typography>
    </Box>
  );

  const graphError = (
    <Box
      sx={{
        height: CHART_HEIGHT + CHART_HEIGHT_LOADING_FIX,
        width: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Typography variant="subheader1">Something went wrong</Typography>
      <Typography variant="caption" sx={{ mb: 3 }}>
        Data couldn&apos;t be fetched, please reload graph.
      </Typography>
      <Button variant="outlined" color="primary" onClick={refetch}>
        Reload
      </Button>
    </Box>
  );

  return (
    <Box sx={{ mt: isCombined ? 3 : 10, mb: 4 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: isCombined ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
          mb: 4,
        }}
      >
        {isCombined ? (
          <Box sx={{ display: 'flex', gap: 5 }}>
            <HeaderStat label="Supply APY" value={reserve.supplyAPY} delta={supplyDelta} />
            <HeaderStat label="Borrow APY" value={reserve.variableBorrowAPY} delta={borrowDelta} />
          </Box>
        ) : (
          <GraphLegend labels={fields} />
        )}
        <GraphTimeRangeSelector
          disabled={loading || error}
          timeRange={selectedTimeRange}
          onTimeRangeChanged={setSelectedTimeRange}
        />
      </Box>
      {loading && graphLoading}
      {error && graphError}
      {!loading && !error && data.length > 0 && (
        <ParentSize>
          {({ width }) => (
            <ApyGraph
              width={width}
              height={CHART_HEIGHT}
              data={data}
              fields={fields}
              selectedTimeRange={selectedTimeRange}
              avgFieldName={
                isCombined
                  ? undefined
                  : graphKey === 'supply'
                  ? 'liquidityRate'
                  : 'variableBorrowRate'
              }
            />
          )}
        </ParentSize>
      )}
      {isCombined && !loading && !error && data.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <GraphLegend labels={fields} />
        </Box>
      )}
    </Box>
  );
};
