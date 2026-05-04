import { Box, Button, Skeleton, Tooltip, Typography, useTheme } from '@mui/material';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { UsdChip } from 'src/components/primitives/UsdChip';
import { IncentivesCard } from 'src/components/incentives/IncentivesCard';

import type { PositionRow } from './types';

interface SupplyRowProps {
  row: PositionRow;
  onSupply: (row: PositionRow) => void;
  onWithdraw: (row: PositionRow) => void;
  disableSupply?: boolean;
  onClick?: (row: PositionRow) => void;
}

interface BorrowRowProps {
  row: PositionRow;
  onBorrow: (row: PositionRow) => void;
  onRepay: (row: PositionRow) => void;
  disableBorrow?: boolean;
  borrowDisabledReason?: string;
  onClick?: (row: PositionRow) => void;
}

const RowPlate = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2.5,
        py: 3,
        background: isDark ? theme.palette.background.surface : theme.palette.background.paper,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '12px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color .15s, background .15s',
        '&:hover': onClick ? { borderColor: isDark ? 'rgba(255,255,255,.18)' : 'rgba(40,25,15,.18)' } : {},
      }}
    >
      {children}
    </Box>
  );
};

export function SupplyPositionRow({ row, onSupply, onWithdraw, disableSupply, onClick }: SupplyRowProps) {
  return (
    <RowPlate onClick={onClick ? () => onClick(row) : undefined}>
      {row.reserve && <TokenIcon symbol={row.reserve.iconSymbol} sx={{ fontSize: '24px' }} />}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary' }}>
          {row.assetSymbol}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
          <FormattedNumber
            value={row.tokenBalance}
            compact
            variant="secondary12"
            sx={{ color: 'text.muted', fontVariantNumeric: 'tabular-nums' }}
          />
          <Typography sx={{ fontSize: 12, color: 'text.muted' }}>·</Typography>
          <UsdChip value={row.balance.toString()} textVariant="secondary12" />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.75 }}>
        <IncentivesCard
          value={row.apy}
          incentives={row.reserve?.aIncentivesData}
          rewards={row.rewardsSupply}
          symbol={row.assetSymbol}
          variant="secondary14"
          symbolsVariant="secondary14"
          align="flex-end"
        />
        <Box sx={{ display: 'flex', gap: 0.75 }} onClick={(e) => e.stopPropagation()}>
          <Button
            variant="soft"
            size="small"
            disabled={disableSupply}
            onClick={() => onSupply(row)}
            sx={{ px: 1.5, py: 0.5, fontSize: 11, minWidth: 'unset' }}
          >
            Supply
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => onWithdraw(row)}
            sx={{ px: 1.5, py: 0.5, fontSize: 11, minWidth: 'unset' }}
          >
            Withdraw
          </Button>
        </Box>
      </Box>
    </RowPlate>
  );
}

export function BorrowPositionRow({ row, onBorrow, onRepay, disableBorrow, borrowDisabledReason, onClick }: BorrowRowProps) {
  const utilization = Number(row.utilization ?? row.reserve?.borrowUsageRatio ?? 0);
  const utilPct = Math.min(Math.max(utilization * 100, 0), 100);
  return (
    <RowPlate onClick={onClick ? () => onClick(row) : undefined}>
      {row.reserve && <TokenIcon symbol={row.reserve.iconSymbol} sx={{ fontSize: '24px' }} />}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary' }}>
          {row.assetName}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
          <FormattedNumber
            value={row.tokenBalance}
            compact
            variant="secondary12"
            sx={{ color: 'text.muted', fontVariantNumeric: 'tabular-nums' }}
          />
          <Typography sx={{ fontSize: 12, color: 'text.muted' }}>{row.assetSymbol}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.muted' }}>·</Typography>
          <UsdChip value={row.balance.toString()} textVariant="secondary12" />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 110 }}>
        <Typography sx={{ fontSize: 11, letterSpacing: '.08em', color: 'text.muted', mb: 0.5, fontVariantNumeric: 'tabular-nums' }}>
          UTIL {utilPct.toFixed(2)}%
        </Typography>
        <Box
          sx={{
            width: 100,
            height: 6,
            borderRadius: 999,
            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,.06)' : 'rgba(40,25,15,.06)'),
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${utilPct}%`,
              background: 'linear-gradient(135deg, #F58420 0%, #FCB319 100%)',
              borderRadius: 999,
            }}
          />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.75 }} onClick={(e) => e.stopPropagation()}>
        <Tooltip title={borrowDisabledReason || ''} disableHoverListener={!borrowDisabledReason} placement="top">
          <span>
            <Button
              variant="soft"
              size="small"
              disabled={disableBorrow}
              onClick={() => onBorrow(row)}
              sx={{ px: 1.5, py: 0.5, fontSize: 11, minWidth: 'unset' }}
            >
              Borrow
            </Button>
          </span>
        </Tooltip>
        <Button
          variant="outlined"
          size="small"
          onClick={() => onRepay(row)}
          sx={{ px: 1.5, py: 0.5, fontSize: 11, minWidth: 'unset' }}
        >
          Repay
        </Button>
      </Box>
    </RowPlate>
  );
}

export function PositionRowSkeleton() {
  return (
    <RowPlate>
      <Skeleton variant="circular" width={24} height={24} />
      <Box sx={{ flex: 1 }}>
        <Skeleton width={80} height={16} />
        <Skeleton width={140} height={14} sx={{ mt: 0.5 }} />
      </Box>
      <Skeleton width={120} height={28} />
    </RowPlate>
  );
}
