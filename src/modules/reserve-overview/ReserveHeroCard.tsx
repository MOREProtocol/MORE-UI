import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, LinearProgress, Typography } from '@mui/material';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { ComputedReserveData } from 'src/hooks/app-data-provider/useAppDataProvider';
import { FONT_DISPLAY, FONT_MONO } from 'src/utils/theme';

interface ReserveHeroCardProps {
  reserve: ComputedReserveData;
  chainName: string;
  explorerLink: string;
}

// Text colours are intentionally locked dark: the `.banner-wave--aurora`
// gradient is a fixed light pastel in BOTH themes, so hero text stays dark
// (theme-invariant) — transcribed from more-markets-mockups .vault-hero-card.
const HERO_TEXT = '#1a1714';
const HERO_TEXT_MUTED = 'rgba(26, 23, 20, 0.66)';
const HERO_TEXT_FAINT = 'rgba(26, 23, 20, 0.55)';
const HERO_BAR_TRACK = 'rgba(26, 23, 20, 0.1)';
const HERO_BAR_FILL = 'rgba(26, 23, 20, 0.85)';

const glassChipSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.75,
  px: '10px',
  py: '4px',
  borderRadius: '9999px',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  bgcolor: 'rgba(255, 255, 255, 0.55)',
  color: HERO_TEXT,
  border: '1px solid rgba(255, 255, 255, 0.55)',
  backdropFilter: 'blur(8px)',
  whiteSpace: 'nowrap',
} as const;

const StatTile = ({
  label,
  value,
  primary,
  bar,
  meta,
}: {
  label: string;
  value: React.ReactNode;
  primary?: boolean;
  bar?: number;
  meta?: React.ReactNode;
}) => (
  <Box
    sx={{
      bgcolor: primary ? 'rgba(255, 255, 255, 0.68)' : 'rgba(255, 255, 255, 0.4)',
      border: '1px solid',
      borderColor: primary ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.55)',
      borderRadius: '18px',
      p: '18px 20px 20px',
      backdropFilter: 'blur(16px)',
    }}
  >
    <Typography
      sx={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'rgba(26, 23, 20, 0.62)',
      }}
    >
      {label}
    </Typography>
    <Box
      sx={{
        mt: '12px',
        fontFamily: FONT_MONO,
        fontSize: primary ? 34 : 28,
        fontWeight: 600,
        lineHeight: 1,
        letterSpacing: '-0.02em',
        color: HERO_TEXT,
      }}
    >
      {value}
    </Box>
    {typeof bar === 'number' && (
      <LinearProgress
        variant="determinate"
        value={Math.min(100, Math.max(0, bar))}
        sx={{
          mt: '12px',
          height: 4,
          borderRadius: '9999px',
          bgcolor: HERO_BAR_TRACK,
          '& .MuiLinearProgress-bar': { bgcolor: HERO_BAR_FILL, borderRadius: 'inherit' },
        }}
      />
    )}
    {meta && (
      <Typography
        sx={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          color: HERO_TEXT_FAINT,
          mt: '12px',
        }}
      >
        {meta}
      </Typography>
    )}
  </Box>
);

export const ReserveHeroCard = ({ reserve, chainName, explorerLink }: ReserveHeroCardProps) => {
  const canBeCollateral = reserve.usageAsCollateralEnabled;

  return (
    <Box
      className="banner-wave--aurora"
      sx={{
        borderRadius: '24px',
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        color: HERO_TEXT,
        p: { xs: '26px 22px 22px', md: '36px 40px 32px' },
      }}
    >
      {/* Top row: identity + token */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 3,
          flexDirection: { xs: 'column', xsm: 'row' },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Chip row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: '14px' }}>
            <Box
              component="span"
              sx={{
                ...glassChipSx,
                bgcolor: 'rgba(26, 23, 20, 0.88)',
                color: '#fbfaf7',
                borderColor: 'rgba(26, 23, 20, 0.88)',
                letterSpacing: '0.12em',
                fontWeight: 700,
                backdropFilter: 'none',
              }}
            >
              Market
            </Box>
            <Box component="span" sx={glassChipSx}>
              {chainName}
            </Box>
            {canBeCollateral && (
              <Box component="span" sx={glassChipSx}>
                Can be collateral
              </Box>
            )}
          </Box>

          {/* Title + explorer link */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flexWrap: 'wrap',
              fontFamily: FONT_DISPLAY,
              fontSize: { xs: 24, md: 34 },
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              color: HERO_TEXT,
            }}
          >
            {reserve.name}
            <Box
              component="a"
              href={explorerLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View on explorer"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                borderRadius: '50%',
                bgcolor: 'rgba(255, 255, 255, 0.45)',
                color: 'rgba(26, 23, 20, 0.65)',
                transition: 'background-color 150ms ease, color 150ms ease',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.75)', color: HERO_TEXT },
              }}
            >
              <OpenInNewIcon sx={{ fontSize: 12 }} />
            </Box>
          </Box>

          {/* Meta line */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flexWrap: 'wrap',
              mt: '14px',
              fontSize: 13,
              color: HERO_TEXT_MUTED,
            }}
          >
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <FormattedNumber
                value={Number(reserve.priceInUSD || 0)}
                symbol="USD"
                visibleDecimals={2}
                variant="secondary14"
                sx={{ color: HERO_TEXT, fontWeight: 600, fontFamily: FONT_MONO }}
              />
              <Box component="span">oracle price</Box>
            </Box>
          </Box>
        </Box>

        <Box sx={{ flexShrink: 0 }}>
          <TokenIcon symbol={reserve.iconSymbol} sx={{ fontSize: '60px' }} />
        </Box>
      </Box>

      {/* Stat strip */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xsm: 'repeat(3, 1fr)' },
          gap: 1.5,
          mt: 4,
        }}
      >
        <StatTile
          primary
          label="Supply APY"
          value={
            <FormattedNumber
              value={reserve.supplyAPY || 0}
              percent
              visibleDecimals={2}
              variant="inherit"
              symbolsColor="rgba(26, 23, 20, 0.62)"
              sx={{ color: HERO_TEXT, fontFamily: FONT_MONO, fontSize: 34, fontWeight: 600 }}
            />
          }
        />
        <StatTile
          label="Borrow APY"
          value={
            <FormattedNumber
              value={reserve.variableBorrowAPY || 0}
              percent
              visibleDecimals={2}
              variant="inherit"
              symbolsColor="rgba(26, 23, 20, 0.62)"
              sx={{ color: HERO_TEXT, fontFamily: FONT_MONO, fontSize: 28, fontWeight: 600 }}
            />
          }
          meta="Variable"
        />
        <StatTile
          label="Utilization"
          value={
            <FormattedNumber
              value={reserve.borrowUsageRatio || 0}
              percent
              visibleDecimals={1}
              variant="inherit"
              symbolsColor="rgba(26, 23, 20, 0.62)"
              sx={{ color: HERO_TEXT, fontFamily: FONT_MONO, fontSize: 28, fontWeight: 600 }}
            />
          }
          bar={Number(reserve.borrowUsageRatio || 0) * 100}
        />
      </Box>
    </Box>
  );
};
