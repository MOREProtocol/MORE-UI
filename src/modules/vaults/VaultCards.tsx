import { ArrowNarrowRightIcon } from '@heroicons/react/outline';
import { Avatar, Box, Button, Skeleton, Typography } from '@mui/material';
import React from 'react';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { UsdChip } from 'src/components/primitives/UsdChip';
import { FONT_DISPLAY, FONT_MONO } from 'src/utils/theme';

import type { VaultGridRow } from './VaultDataGridColumns';

export type VaultCardsView = 'grid' | 'list';

interface VaultCardsProps {
  data: VaultGridRow[];
  view: VaultCardsView;
  loading?: boolean;
  onRowClick: (row: VaultGridRow) => void;
}

const CARD_SX = {
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '24px',
  transition: 'border-color 150ms ease, background-color 150ms ease',
  cursor: 'pointer',
  '&:hover': {
    borderColor: 'primary.main',
  },
} as const;

const StatLabel = ({ children }: { children: React.ReactNode }) => (
  <Typography
    sx={{
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'text.secondary',
    }}
  >
    {children}
  </Typography>
);

const VaultName = ({ name, size = 20 }: { name: string; size?: number }) => (
  <Typography
    sx={{
      fontFamily: FONT_DISPLAY,
      fontWeight: 600,
      fontSize: size,
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
      color: 'text.primary',
    }}
  >
    {name}
  </Typography>
);

const ChainPill = ({ network, icon }: { network: string; icon: string }) => (
  <Box
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.75,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: 'text.secondary',
      whiteSpace: 'nowrap',
    }}
  >
    <Avatar src={icon} sx={{ width: 14, height: 14, bgcolor: 'transparent' }} />
    {network}
  </Box>
);

const CuratorTag = ({ logo, name }: { logo?: string; name: string }) => (
  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
    <Avatar src={logo} sx={{ width: 18, height: 18, fontSize: 9 }}>
      {name}
    </Avatar>
    <Typography variant="secondary14" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
      {name}
    </Typography>
  </Box>
);

const TokenStack = ({ symbols, size }: { symbols: string[]; size: number }) => (
  <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
    {symbols.slice(0, 3).map((sym, idx) => (
      <TokenIcon
        key={`${sym}-${idx}`}
        symbol={sym}
        sx={{ fontSize: size, ml: idx === 0 ? 0 : '-8px', flexShrink: 0 }}
      />
    ))}
  </Box>
);

const ApyValue = ({ apy }: { apy: number | undefined }) =>
  typeof apy === 'number' ? (
    <FormattedNumber
      value={apy}
      percent
      coloredPercent
      visibleDecimals={2}
      symbolsVariant="main21"
      sx={{
        fontFamily: FONT_MONO,
        fontWeight: 600,
        fontSize: { xs: 32, md: 40 },
        lineHeight: 1,
        letterSpacing: '-0.03em',
      }}
    />
  ) : (
    <Typography
      sx={{ fontFamily: FONT_MONO, fontWeight: 600, fontSize: { xs: 32, md: 40 }, lineHeight: 1 }}
    >
      –
    </Typography>
  );

const TvmValue = ({ tvm, tvmUsd, symbol }: { tvm: string; tvmUsd: number; symbol: string }) => (
  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
    <FormattedNumber
      value={tvm}
      symbol={symbol}
      compact
      variant="main14"
      symbolsVariant="secondary14"
      symbolsColor="text.secondary"
      sx={{ fontWeight: 600 }}
    />
    <UsdChip value={tvmUsd} />
  </Box>
);

const DepositButton = ({
  label,
  onClick,
}: {
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) => (
  <Button
    variant="contained"
    onClick={onClick}
    endIcon={<ArrowNarrowRightIcon style={{ width: 16, height: 16 }} />}
    sx={{ width: '100%' }}
  >
    {label}
  </Button>
);

// ------------------------------ Grid card ------------------------------
const GridCard = ({
  row,
  onRowClick,
}: {
  row: VaultGridRow;
  onRowClick: (r: VaultGridRow) => void;
}) => {
  const apyValue = typeof row.apy30Days === 'number' ? row.apy30Days : row.apy;
  const tokens =
    row.depositTokenSymbols && row.depositTokenSymbols.length > 0
      ? row.depositTokenSymbols
      : [row.depositTokenSymbol];

  return (
    <Box
      onClick={() => onRowClick(row)}
      sx={{
        ...CARD_SX,
        borderRadius: '32px',
        p: { xs: 3, md: '28px 30px' },
        display: 'flex',
        flexDirection: 'column',
        gap: 2.75,
      }}
    >
      {/* Head */}
      <Box
        sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <VaultName name={row.vaultName} />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
              mt: 1,
              color: 'text.secondary',
            }}
          >
            <CuratorTag logo={row.curatorLogo} name={row.curatorName} />
            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled' }} />
            <Typography variant="secondary14" sx={{ color: 'text.secondary' }}>
              {tokens.join(' · ')}
            </Typography>
            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled' }} />
            <ChainPill network={row.network} icon={row.networkIcon} />
          </Box>
        </Box>
        <TokenStack symbols={tokens} size={28} />
      </Box>

      {/* APY */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <StatLabel>30-Day APY</StatLabel>
        <ApyValue apy={apyValue} />
      </Box>

      {/* TVM */}
      <Box sx={{ pt: 2.25, borderTop: '1px solid', borderColor: 'divider' }}>
        <StatLabel>TVM</StatLabel>
        <Box sx={{ mt: 1 }}>
          <TvmValue tvm={row.tvm} tvmUsd={row.tvmUsd} symbol={row.depositTokenSymbol} />
        </Box>
      </Box>

      {/* Action */}
      <DepositButton
        label="Deposit vault"
        onClick={(e) => {
          e.stopPropagation();
          onRowClick(row);
        }}
      />
    </Box>
  );
};

// ------------------------------ List row ------------------------------
const ListRow = ({
  row,
  onRowClick,
}: {
  row: VaultGridRow;
  onRowClick: (r: VaultGridRow) => void;
}) => {
  const apyValue = typeof row.apy30Days === 'number' ? row.apy30Days : row.apy;
  const tokens =
    row.depositTokenSymbols && row.depositTokenSymbols.length > 0
      ? row.depositTokenSymbols
      : [row.depositTokenSymbol];

  return (
    <Box
      onClick={() => onRowClick(row)}
      sx={{
        ...CARD_SX,
        p: { xs: 2.5, md: 3 },
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'flex-start', md: 'center' },
        gap: { xs: 2.5, md: 3 },
      }}
    >
      {/* Asset */}
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: { md: '1 1 0' }, minWidth: 0 }}
      >
        <TokenStack symbols={tokens} size={32} />
        <Box sx={{ minWidth: 0 }}>
          <VaultName name={row.vaultName} size={16} />
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
            <CuratorTag logo={row.curatorLogo} name={row.curatorName} />
            <ChainPill network={row.network} icon={row.networkIcon} />
          </Box>
          <Typography
            variant="secondary12"
            sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}
          >
            {tokens.join(' · ')}
          </Typography>
        </Box>
      </Box>

      {/* APY */}
      <Box sx={{ minWidth: { md: 120 } }}>
        <StatLabel>30-Day APY</StatLabel>
        <Box sx={{ mt: 0.5 }}>
          {typeof apyValue === 'number' ? (
            <FormattedNumber
              value={apyValue}
              percent
              coloredPercent
              visibleDecimals={2}
              symbolsVariant="secondary14"
              sx={{ fontFamily: FONT_MONO, fontWeight: 600, fontSize: 18 }}
            />
          ) : (
            <Typography sx={{ fontFamily: FONT_MONO, fontWeight: 600, fontSize: 18 }}>–</Typography>
          )}
        </Box>
      </Box>

      {/* TVM */}
      <Box sx={{ minWidth: { md: 180 } }}>
        <StatLabel>TVM</StatLabel>
        <Box sx={{ mt: 0.5 }}>
          <TvmValue tvm={row.tvm} tvmUsd={row.tvmUsd} symbol={row.depositTokenSymbol} />
        </Box>
      </Box>

      {/* Action */}
      <Box sx={{ width: { xs: '100%', md: 'auto' }, flexShrink: 0 }}>
        <Button
          variant="contained"
          onClick={(e) => {
            e.stopPropagation();
            onRowClick(row);
          }}
          sx={{ width: { xs: '100%', md: 'auto' } }}
        >
          Deposit
        </Button>
      </Box>
    </Box>
  );
};

// ------------------------------ Skeletons ------------------------------
const GridSkeleton = () => (
  <Box
    sx={{
      ...CARD_SX,
      cursor: 'default',
      p: { xs: 3, md: '28px 30px' },
      display: 'flex',
      flexDirection: 'column',
      gap: 2.75,
      '&:hover': { borderColor: 'divider' },
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="60%" height={26} />
        <Skeleton variant="text" width="80%" height={18} sx={{ mt: 1 }} />
      </Box>
      <Skeleton variant="circular" width={28} height={28} />
    </Box>
    <Box>
      <Skeleton variant="text" width={70} height={14} />
      <Skeleton variant="text" width={160} height={44} />
    </Box>
    <Box sx={{ pt: 2.25, borderTop: '1px solid', borderColor: 'divider' }}>
      <Skeleton variant="text" width={50} height={14} />
      <Skeleton variant="text" width={140} height={22} sx={{ mt: 1 }} />
    </Box>
    <Skeleton variant="rectangular" height={44} sx={{ borderRadius: '12px' }} />
  </Box>
);

const ListSkeleton = () => (
  <Box
    sx={{
      ...CARD_SX,
      cursor: 'default',
      p: { xs: 2.5, md: 3 },
      display: 'flex',
      flexDirection: { xs: 'column', md: 'row' },
      alignItems: { xs: 'flex-start', md: 'center' },
      gap: 3,
      '&:hover': { borderColor: 'divider' },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: { md: '1 1 0' } }}>
      <Skeleton variant="circular" width={32} height={32} />
      <Box>
        <Skeleton variant="text" width={160} height={20} />
        <Skeleton variant="text" width={120} height={16} sx={{ mt: 0.5 }} />
      </Box>
    </Box>
    <Skeleton variant="text" width={90} height={24} />
    <Skeleton variant="text" width={140} height={24} />
    <Skeleton variant="rectangular" width={100} height={40} sx={{ borderRadius: '12px' }} />
  </Box>
);

export const VaultCards: React.FC<VaultCardsProps> = ({ data, view, loading, onRowClick }) => {
  if (view === 'grid') {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
          gap: 2,
        }}
      >
        {loading
          ? [0, 1].map((i) => <GridSkeleton key={`grid-skel-${i}`} />)
          : data.map((row) => <GridCard key={row.id} row={row} onRowClick={onRowClick} />)}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      {loading
        ? [0, 1].map((i) => <ListSkeleton key={`list-skel-${i}`} />)
        : data.map((row) => <ListRow key={row.id} row={row} onRowClick={onRowClick} />)}
    </Box>
  );
};
