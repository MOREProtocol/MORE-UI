import { Box, Skeleton, Typography, useTheme } from '@mui/material';
import { useMemo, useState } from 'react';

import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { UsdChip } from 'src/components/primitives/UsdChip';
import { IncentivesCard } from 'src/components/incentives/IncentivesCard';

import type { MarketRow } from './types';

type Mode = 'supply' | 'borrow';
type SortDir = 'asc' | 'desc';

interface SortKey {
  key: 'apy' | 'totalLiquidity' | 'availableLiquidity' | 'balance' | 'utilization';
  dir: SortDir;
}

interface Props {
  rows: MarketRow[];
  mode: Mode;
  loading?: boolean;
  showBalance?: boolean;
  renderAction: (row: MarketRow) => React.ReactNode;
  onRowClick: (row: MarketRow) => void;
}

const HeaderCell = ({
  children,
  sortKey,
  current,
  onSort,
  align = 'left',
  mobileHidden = false,
}: {
  children: React.ReactNode;
  sortKey?: SortKey['key'];
  current?: SortKey;
  onSort?: (k: SortKey['key']) => void;
  align?: 'left' | 'right';
  /** Hide below the md breakpoint to keep Asset/APY/action visible on phones. */
  mobileHidden?: boolean;
}) => {
  const active = sortKey && current?.key === sortKey;
  return (
    <Box
      component="th"
      onClick={() => sortKey && onSort?.(sortKey)}
      sx={{
        display: mobileHidden ? { xs: 'none', md: 'table-cell' } : 'table-cell',
        textAlign: align,
        fontSize: 11,
        letterSpacing: '.10em',
        textTransform: 'uppercase',
        color: 'text.muted',
        fontWeight: 500,
        padding: { xs: '14px 6px', md: '14px 10px' },
        borderBottom: '1px solid',
        borderColor: 'divider',
        cursor: sortKey ? 'pointer' : 'default',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        '&:hover': sortKey ? { color: 'text.primary' } : {},
      }}
    >
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
        {children}
        {sortKey && (
          <Box
            component="span"
            sx={{
              fontSize: 10,
              color: active ? 'text.primary' : 'transparent',
              transition: 'color .15s',
            }}
          >
            {current?.dir === 'asc' ? '↑' : '↓'}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export function MarketAssetsTable({ rows, mode, loading, showBalance, renderAction, onRowClick }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const defaultKey: SortKey['key'] = mode === 'borrow' ? 'availableLiquidity' : 'apy';
  const [sort, setSort] = useState<SortKey>({ key: defaultKey, dir: 'desc' });

  const onSort = (key: SortKey['key']) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));
  };

  const sortedRows = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      let av = 0;
      let bv = 0;
      switch (sort.key) {
        case 'apy':
          av = mode === 'borrow' ? (a.variableApy ?? a.apy) : a.apy;
          bv = mode === 'borrow' ? (b.variableApy ?? b.apy) : b.apy;
          break;
        case 'totalLiquidity':
          av = mode === 'borrow' ? Number(a.reserve?.totalDebtUSD || 0) : a.totalLiquidity;
          bv = mode === 'borrow' ? Number(b.reserve?.totalDebtUSD || 0) : b.totalLiquidity;
          break;
        case 'availableLiquidity':
          av = a.availableLiquidity;
          bv = b.availableLiquidity;
          break;
        case 'balance':
          av = a.balance ?? 0;
          bv = b.balance ?? 0;
          break;
        case 'utilization':
          av = Number(a.reserve?.borrowUsageRatio ?? 0);
          bv = Number(b.reserve?.borrowUsageRatio ?? 0);
          break;
      }
      return sort.dir === 'asc' ? av - bv : bv - av;
    });
    return list;
  }, [rows, sort, mode]);

  const cellSx = {
    padding: { xs: '16px 6px', md: '16px 10px' },
    borderBottom: '1px solid',
    borderColor: 'divider',
    fontSize: 14,
    verticalAlign: 'middle' as const,
  };

  // Secondary columns are hidden on phones so Asset / APY / action always fit
  // without clipping; the full breakdown stays one tap away on the detail page.
  const mobileHiddenCell = { display: { xs: 'none', md: 'table-cell' } };

  return (
    <Box
      component="table"
      sx={{
        width: '100%',
        borderCollapse: 'collapse',
        fontVariantNumeric: 'tabular-nums',
        '& tbody tr:last-child td': { borderBottom: 'none' },
        '& tbody tr.row-link': { cursor: 'pointer', transition: 'background .15s' },
        '& tbody tr.row-link:hover td': {
          background: isDark ? 'rgba(255,255,255,.03)' : 'rgba(40,25,15,.03)',
        },
      }}
    >
      <Box component="thead">
        <Box component="tr">
          <HeaderCell>Asset</HeaderCell>
          <HeaderCell sortKey="apy" current={sort} onSort={onSort}>
            {mode === 'supply' ? 'Supply APY' : 'Borrow Rate'}
          </HeaderCell>
          <HeaderCell sortKey="totalLiquidity" current={sort} onSort={onSort} mobileHidden>
            {mode === 'supply' ? 'Total Supply' : 'Borrowed'}
          </HeaderCell>
          {mode === 'supply' && showBalance && (
            <HeaderCell sortKey="balance" current={sort} onSort={onSort} mobileHidden>
              Your balance
            </HeaderCell>
          )}
          {mode === 'borrow' && (
            <HeaderCell sortKey="utilization" current={sort} onSort={onSort} mobileHidden>
              Util
            </HeaderCell>
          )}
          <HeaderCell align="right">{''}</HeaderCell>
        </Box>
      </Box>
      <Box component="tbody">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Box component="tr" key={i}>
                <Box component="td" sx={cellSx} colSpan={6}>
                  <Skeleton width="100%" height={28} />
                </Box>
              </Box>
            ))
          : sortedRows.map((row) => {
              const util = Number(row.reserve?.borrowUsageRatio ?? 0) * 100;
              return (
                <Box
                  component="tr"
                  key={row.id}
                  className="row-link"
                  onClick={() => onRowClick(row)}
                >
                  {/* Asset */}
                  <Box component="td" sx={cellSx}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      {row.reserve && <TokenIcon symbol={row.reserve.iconSymbol} sx={{ fontSize: '24px', flexShrink: 0 }} />}
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary', whiteSpace: 'nowrap' }}>
                          {row.assetSymbol}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: 'text.muted',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: { xs: 104, md: 160 },
                          }}
                          title={row.assetName}
                        >
                          {row.assetName}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* APY / Borrow Rate */}
                  <Box component="td" sx={cellSx}>
                    <IncentivesCard
                      value={mode === 'supply' ? row.apy : row.variableApy ?? row.apy}
                      incentives={mode === 'supply' ? row.reserve?.aIncentivesData || [] : row.reserve?.vIncentivesData || []}
                      rewards={mode === 'supply' ? row.rewardsSupply || [] : row.rewardsBorrow || []}
                      symbol={row.assetSymbol}
                      variant="secondary14"
                      symbolsVariant="secondary14"
                      align="flex-start"
                    />
                  </Box>

                  {/* Total liquidity / borrowed */}
                  <Box component="td" sx={{ ...cellSx, ...mobileHiddenCell }}>
                    {row.reserve ? (
                      <Box>
                        <FormattedNumber
                          compact
                          value={mode === 'supply' ? row.reserve.totalLiquidity : row.reserve.totalDebt}
                          variant="secondary14"
                          sx={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}
                        />
                        <Box sx={{ mt: 0.25 }}>
                          <UsdChip
                            value={mode === 'supply' ? row.reserve.totalLiquidityUSD : row.reserve.totalDebtUSD}
                            textVariant="secondary12"
                          />
                        </Box>
                      </Box>
                    ) : null}
                  </Box>

                  {/* Supply: your balance */}
                  {mode === 'supply' && showBalance && (
                    <Box component="td" sx={{ ...cellSx, ...mobileHiddenCell }}>
                      <BalanceCell row={row} />
                    </Box>
                  )}

                  {/* Borrow: util arc */}
                  {mode === 'borrow' && (
                    <Box component="td" sx={{ ...cellSx, ...mobileHiddenCell }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <UtilArc pct={util} size={28} thick={3} />
                        <Typography sx={{ fontSize: 12, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
                          {util.toFixed(2)}%
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Action */}
                  <Box component="td" sx={{ ...cellSx, textAlign: 'right' }}>
                    <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'inline-block' }}>
                      {renderAction(row)}
                    </Box>
                  </Box>
                </Box>
              );
            })}
      </Box>
    </Box>
  );
}

function BalanceCell({ row }: { row: MarketRow }) {
  if (!row.reserve) return null;
  const balUsd = row.balance ?? 0;
  const price = Number(row.reserve.priceInUSD || 0);
  const tokens = price > 0 ? balUsd / price : 0;
  return (
    <Box>
      <FormattedNumber compact value={tokens} variant="secondary14" sx={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }} />
      <Box sx={{ mt: 0.25 }}>
        <UsdChip value={balUsd.toString()} textVariant="secondary12" />
      </Box>
    </Box>
  );
}

/** Donut arc showing utilization percentage */
export function UtilArc({ pct, size = 28, thick = 3 }: { pct: number; size?: number; thick?: number }) {
  const r = (size - thick) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(Math.max(pct, 0), 100) / 100) * circ;
  return (
    <Box component="svg" width={size} height={size} sx={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <defs>
        <linearGradient id="more-util-arc" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#FCB319" />
          <stop offset="100%" stopColor="#C66A18" />
        </linearGradient>
      </defs>
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,.10)"
        strokeWidth={thick}
      />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke="url(#more-util-arc)"
        strokeWidth={thick}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
      />
    </Box>
  );
}
