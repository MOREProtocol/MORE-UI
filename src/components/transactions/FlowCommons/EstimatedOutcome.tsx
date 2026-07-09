import { Box, Typography } from '@mui/material';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { FONT_MONO } from 'src/utils/theme';

export type EstimateFormat = 'usd' | 'hf' | 'percent';

export interface EstimateRow {
  label: string;
  before: number;
  after: number;
  format: EstimateFormat;
  // When true (default), the "after" value is emphasised in the brand/success color.
  emphasizeAfter?: boolean;
}

const safe = (n: number) => (Number.isFinite(n) ? n : 0);

// Health factor: the protocol uses -1 as the "no debt" sentinel (HF is
// effectively infinite). We render that as "-" (not applicable) rather than a
// number. A genuine 0 would still show as "0.00".
const formatHf = (n: number) => (n < 0 ? '-' : n.toFixed(2));

const ValueNode = ({
  value,
  format,
  faint,
}: {
  value: number;
  format: EstimateFormat;
  faint?: boolean;
}) => {
  const color = faint ? 'text.disabled' : 'text.primary';
  if (format === 'hf') {
    return (
      <Box component="span" sx={{ fontFamily: FONT_MONO, fontWeight: 600, color }}>
        {formatHf(safe(value))}
      </Box>
    );
  }
  return (
    <FormattedNumber
      value={safe(value)}
      symbol={format === 'usd' ? 'USD' : undefined}
      percent={format === 'percent'}
      visibleDecimals={2}
      variant="secondary14"
      sx={{ fontFamily: FONT_MONO, fontWeight: 600, color }}
      symbolsColor={color}
    />
  );
};

/**
 * Brand-tinted "Estimated outcome" box mirroring the mockup `earnings-preview`.
 * Each row shows `before → after` with the old value faint and the new value
 * emphasised. All values are guarded against NaN so an empty amount renders a
 * clean `$0.00 → $0.00` instead of `$0NaN`.
 */
export const EstimatedOutcome = ({
  rows,
  title = 'Estimated outcome',
}: {
  rows: EstimateRow[];
  title?: string;
}) => (
  <Box
    sx={{
      p: '14px 16px',
      borderRadius: '14px',
      border: '1px solid rgba(245, 144, 66, 0.35)',
      background: 'linear-gradient(135deg, rgba(245, 144, 66, 0.12), rgba(245, 144, 66, 0.04))',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}
  >
    <Typography
      sx={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'primary.main',
      }}
    >
      {title}
    </Typography>
    {rows.map((row) => (
      <Box
        key={row.label}
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}
      >
        <Typography variant="description" color="text.secondary">
          {row.label}
        </Typography>
        <Box
          sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
        >
          <ValueNode value={row.before} format={row.format} faint />
          <Box component="span" sx={{ color: 'text.disabled', fontFamily: FONT_MONO }}>
            {'→'}
          </Box>
          <ValueNode value={row.after} format={row.format} />
        </Box>
      </Box>
    ))}
  </Box>
);
