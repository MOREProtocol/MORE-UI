import { normalizeBN } from '@aave/math-utils';
import { Box, Typography } from '@mui/material';
import { ParentSize } from '@visx/responsive';
import { JSX } from 'react';
import type { ComputedReserveData } from 'src/hooks/app-data-provider/useAppDataProvider';
import { FONT_MONO } from 'src/utils/theme';

import { GraphLegend } from './GraphLegend';
import { InterestRateModelGraph } from './InterestRateModelGraph';

const MetricCard = ({ label, value, sub }: { label: string; value: number; sub: string }) => (
  <Box
    sx={{
      p: '16px 18px',
      borderRadius: '14px',
      border: '1px solid',
      borderColor: 'divider',
      bgcolor: 'transparent',
    }}
  >
    <Typography
      sx={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'text.secondary',
        mb: '10px',
      }}
    >
      {label}
    </Typography>
    <Box sx={{ fontFamily: FONT_MONO, fontSize: 22, fontWeight: 600, lineHeight: 1 }}>
      {Number.isFinite(value) ? value.toFixed(2) : '0.00'}
      <Box component="span" sx={{ fontSize: 14, color: 'text.secondary' }}>
        %
      </Box>
    </Box>
    <Typography sx={{ fontSize: 12, color: 'text.muted', mt: '8px' }}>{sub}</Typography>
  </Box>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <Typography
    sx={{
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'text.muted',
      mb: '12px',
      mt: '20px',
    }}
  >
    {children}
  </Typography>
);

type InteresetRateModelGraphContainerProps = {
  reserve: ComputedReserveData;
};

export type Field = 'stableBorrowRate' | 'variableBorrowRate' | 'utilizationRate';

export type Fields = { name: Field; color: string; text: string }[];

// This graph takes in its data via props, thus having no loading/error states
export const InterestRateModelGraphContainer = ({
  reserve,
}: InteresetRateModelGraphContainerProps): JSX.Element => {
  const CHART_HEIGHT = 155;
  const fields: Fields = [
    { name: 'variableBorrowRate', text: 'Borrow APR', color: '#F58420' },
    ...(reserve.stableBorrowRateEnabled
      ? ([{ name: 'stableBorrowRate', text: 'Borrow APR, stable', color: '#FCB319' }] as const)
      : []),
  ];

  // Rate-strategy params (RAY-scaled strings) → percent, mirroring the graph's
  // normalizeBN(x, 25). Derived rows (max, at-optimal) follow the kinked-model math.
  const targetUtil = normalizeBN(reserve.optimalUsageRatio, 25).toNumber();
  const baseRate = normalizeBN(reserve.baseVariableBorrowRate, 25).toNumber();
  const slope1 = normalizeBN(reserve.variableRateSlope1, 25).toNumber();
  const slope2 = normalizeBN(reserve.variableRateSlope2, 25).toNumber();
  const maxRate = baseRate + slope1 + slope2;
  const borrowAtOptimal = baseRate + slope1;
  const reserveFactor = Number(reserve.reserveFactor || 0);
  const supplyAtOptimal = borrowAtOptimal * (targetUtil / 100) * (1 - reserveFactor);

  return (
    <Box sx={{ mt: 4, mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 4,
        }}
      >
        <GraphLegend labels={[...fields, { text: 'Utilization Rate', color: '#07B4D1' }]} />
      </Box>
      <ParentSize>
        {({ width }) => (
          <InterestRateModelGraph
            width={width}
            height={CHART_HEIGHT}
            fields={fields}
            reserve={{
              baseStableBorrowRate: reserve.baseStableBorrowRate,
              baseVariableBorrowRate: reserve.baseVariableBorrowRate,
              optimalUsageRatio: reserve.optimalUsageRatio,
              stableRateSlope1: reserve.stableRateSlope1,
              stableRateSlope2: reserve.stableRateSlope2,
              utilizationRate: reserve.borrowUsageRatio,
              variableRateSlope1: reserve.variableRateSlope1,
              variableRateSlope2: reserve.variableRateSlope2,
              stableBorrowRateEnabled: reserve.stableBorrowRateEnabled,
              totalLiquidityUSD: reserve.totalLiquidityUSD,
              totalDebtUSD: reserve.totalDebtUSD,
            }}
          />
        )}
      </ParentSize>

      <SectionLabel>Key rates</SectionLabel>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
          gap: '12px',
        }}
      >
        <MetricCard label="Target utilization" value={targetUtil} sub="Optimal · rate kink" />
        <MetricCard label="Supply at optimal" value={supplyAtOptimal} sub="APY at target util" />
        <MetricCard label="Borrow at optimal" value={borrowAtOptimal} sub="APY at target util" />
        <MetricCard label="Max rate" value={maxRate} sub="At 100% utilization" />
      </Box>

      <SectionLabel>Model parameters</SectionLabel>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: '12px',
        }}
      >
        <MetricCard label="Base rate" value={baseRate} sub="Floor at 0% utilization" />
        <MetricCard label="Slope 1" value={slope1} sub="Below kink" />
        <MetricCard label="Slope 2" value={slope2} sub="Above kink (penalty)" />
      </Box>
    </Box>
  );
};
