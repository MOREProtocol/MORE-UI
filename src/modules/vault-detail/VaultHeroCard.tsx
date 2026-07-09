import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, LinearProgress, Skeleton, Typography } from '@mui/material';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { FONT_DISPLAY, FONT_MONO } from 'src/utils/theme';

export interface VaultHeroCardProps {
  name: string;
  chainName: string;
  explorerLink?: string;
  isLoading: boolean;
  assetSymbol: string;
  isOmniHub?: boolean;
  apy?: number;
  tvl?: string;
  tvlUsd?: number;
  curatorName?: string;
  inceptionTimestamp?: string | number;
  capacityPercent?: number;
  capacityRemaining?: string;
  depositTokenSymbols?: string[];
}

// Text colours are intentionally locked dark: the `.banner-wave--dawn`
// gradient is a fixed light pastel in BOTH themes, so hero text stays dark
// (theme-invariant) — matching what ReserveHeroCard does on `.banner-wave--aurora`.
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

const formatInception = (ts?: string | number): string | null => {
  if (ts === undefined || ts === null || ts === '') return null;
  const seconds = Number(ts);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const d = new Date(seconds * 1000);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const VaultHeroCard = ({
  name,
  chainName,
  explorerLink,
  isLoading,
  assetSymbol,
  isOmniHub,
  apy,
  tvl,
  tvlUsd,
  curatorName,
  inceptionTimestamp,
  capacityPercent,
  capacityRemaining,
  depositTokenSymbols,
}: VaultHeroCardProps) => {
  const inception = formatInception(inceptionTimestamp);
  const hasApy = apy !== undefined && apy !== null;
  const hasTvl = tvl !== undefined && tvl !== null;
  const hasCapacity = capacityPercent !== undefined && capacityPercent !== null;

  // Stat tiles: include only tiles backed by data (mirrors "omit missing fields").
  const statTiles: React.ReactNode[] = [];
  if (hasApy) {
    statTiles.push(
      <StatTile
        key="apy"
        primary
        label="7-day APY"
        value={
          <FormattedNumber
            value={apy || 0}
            percent
            visibleDecimals={2}
            variant="inherit"
            symbolsColor="rgba(26, 23, 20, 0.62)"
            sx={{ color: HERO_TEXT, fontFamily: FONT_MONO, fontSize: 34, fontWeight: 600 }}
          />
        }
      />
    );
  }
  if (hasTvl) {
    statTiles.push(
      <StatTile
        key="tvl"
        primary={!hasApy}
        label="Total value locked"
        value={
          <FormattedNumber
            value={tvl || 0}
            symbol={assetSymbol}
            compact
            visibleDecimals={2}
            variant="inherit"
            symbolsColor="rgba(26, 23, 20, 0.62)"
            sx={{ color: HERO_TEXT, fontFamily: FONT_MONO, fontSize: 28, fontWeight: 600 }}
          />
        }
        meta={
          tvlUsd !== undefined ? (
            <FormattedNumber
              value={tvlUsd || 0}
              symbol="USD"
              compact
              visibleDecimals={2}
              variant="inherit"
              symbolsColor={HERO_TEXT_FAINT}
              sx={{ color: HERO_TEXT_FAINT, fontFamily: FONT_MONO, fontSize: 11 }}
            />
          ) : undefined
        }
      />
    );
  }
  if (hasCapacity) {
    statTiles.push(
      <StatTile
        key="capacity"
        label="Capacity"
        value={
          <FormattedNumber
            value={(capacityPercent || 0) / 100}
            percent
            visibleDecimals={0}
            variant="inherit"
            symbolsColor="rgba(26, 23, 20, 0.62)"
            sx={{ color: HERO_TEXT, fontFamily: FONT_MONO, fontSize: 28, fontWeight: 600 }}
          />
        }
        bar={capacityPercent}
        meta={
          capacityRemaining !== undefined ? (
            <FormattedNumber
              value={capacityRemaining}
              symbol={assetSymbol}
              compact
              visibleDecimals={2}
              variant="inherit"
              symbolsColor={HERO_TEXT_FAINT}
              sx={{ color: HERO_TEXT_FAINT, fontFamily: FONT_MONO, fontSize: 11 }}
            />
          ) : undefined
        }
      />
    );
  }

  return (
    <Box
      className="banner-wave--dawn"
      sx={{
        borderRadius: '24px',
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        color: HERO_TEXT,
        p: { xs: '26px 22px 22px', md: '36px 40px 32px' },
      }}
    >
      {/* Top row: identity + deposit-token cluster */}
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
              Vault
            </Box>
            <Box component="span" sx={glassChipSx}>
              <Box
                component="img"
                src="/icons/networks/flow.svg"
                alt=""
                sx={{ width: 12, height: 12, borderRadius: '50%' }}
              />
              {chainName}
            </Box>
            {isOmniHub && (
              <Box component="span" sx={glassChipSx}>
                Omnichain
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
            {isLoading ? <Skeleton width={220} height={40} /> : name}
            {explorerLink && (
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
            )}
          </Box>

          {/* Meta line — only fields the vault data provides */}
          {(curatorName || inception) && (
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
              {curatorName && (
                <Box component="span">
                  Curated by{' '}
                  <Box component="strong" sx={{ color: HERO_TEXT, fontWeight: 600 }}>
                    {curatorName}
                  </Box>
                </Box>
              )}
              {curatorName && inception && <Box component="span">·</Box>}
              {inception && <Box component="span">Inception {inception}</Box>}
            </Box>
          )}
        </Box>

        {depositTokenSymbols && depositTokenSymbols.length > 0 && (
          <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            {depositTokenSymbols.slice(0, 3).map((symbol, idx) => (
              <Box key={symbol} sx={{ ml: idx > 0 ? '-10px' : 0 }}>
                <TokenIcon symbol={symbol} sx={{ fontSize: '44px' }} />
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Stat strip */}
      {statTiles.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', xsm: `repeat(${statTiles.length}, 1fr)` },
            gap: 1.5,
            mt: 4,
          }}
        >
          {statTiles}
        </Box>
      )}
    </Box>
  );
};
