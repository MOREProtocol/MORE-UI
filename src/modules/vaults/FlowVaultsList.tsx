import React, { useMemo } from 'react';
import { Box, Skeleton, Typography, useTheme } from '@mui/material';

import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { UsdChip } from 'src/components/primitives/UsdChip';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import type { VaultGridRow } from './VaultDataGridColumns';

interface FlowVaultsListProps {
  data: VaultGridRow[];
  loading?: boolean;
  onRowClick?: (row: VaultGridRow) => void;
  defaultSortColumn?: keyof VaultGridRow;
  defaultSortOrder?: 'asc' | 'desc';
}

type SortOrder = 'asc' | 'desc';

const sortVaultRows = (
  data: VaultGridRow[],
  orderBy?: keyof VaultGridRow,
  order: SortOrder = 'desc'
): VaultGridRow[] => {
  if (!data.length || !orderBy) return data;

  return [...data].sort((a, b) => {
    const aValue = a[orderBy];
    const bValue = b[orderBy];

    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return order === 'asc' ? -1 : 1;
    if (bValue == null) return order === 'asc' ? 1 : -1;

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return order === 'asc' ? aValue - bValue : bValue - aValue;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const aStr = aValue.toLowerCase();
      const bStr = bValue.toLowerCase();

      if (aStr < bStr) return order === 'asc' ? -1 : 1;
      if (aStr > bStr) return order === 'asc' ? 1 : -1;
      return 0;
    }

    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    if (aStr < bStr) return order === 'asc' ? -1 : 1;
    if (aStr > bStr) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

export const FlowVaultsList: React.FC<FlowVaultsListProps> = ({
  data,
  loading,
  onRowClick,
  defaultSortColumn,
  defaultSortOrder = 'desc',
}) => {
  const theme = useTheme();

  const sortedData = useMemo(
    () => sortVaultRows(data, defaultSortColumn, defaultSortOrder),
    [data, defaultSortColumn, defaultSortOrder]
  );

  const renderSkeletonCards = () => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
        gap: 3,
      }}
    >
      {[1, 2, 3].map((index) => (
        <Box
          key={`flow-vaults-skel-${index}`}
          sx={{
            p: 3,
            borderRadius: 3,
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 200,
          }}
        >
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Skeleton variant="circular" width={42} height={42} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Skeleton variant="text" width="60%" height={22} />
              <Skeleton variant="text" width="40%" height={18} />
            </Box>
          </Box>

          {/* APY centered vertically, left-aligned horizontally */}
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Skeleton variant="text" width={64} height={32} />
              <Skeleton variant="text" width={32} height={18} />
            </Box>
          </Box>

          {/* Button */}
          <Box sx={{ mt: 'auto' }}>
            <Skeleton variant="rectangular" width="60%" height={36} sx={{ borderRadius: 999, mx: 'auto' }} />
          </Box>
        </Box>
      ))}
    </Box>
  );

  if (loading) {
    return renderSkeletonCards();
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
        gap: { xs: 3, sm: 3, md: 4, lg: 5 },
      }}
    >
      {sortedData.map((row) => {
        const handleClick = () => {
          if (onRowClick) onRowClick(row);
        };

        const apyValue = typeof row.apy7Days === 'number' ? row.apy7Days : row.apy;

        return (
          <Box
            key={row.id}
            onClick={handleClick}
            sx={{
              p: 3,
              borderRadius: 3,
              bgcolor: 'background.paper',
              cursor: onRowClick ? 'pointer' : 'default',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              minHeight: 200,
              position: 'relative',
              transition: 'background-color 0.15s ease',
              '&:hover': onRowClick
                ? {
                  backgroundColor: theme.palette.action.hover,
                }
                : {},
            }}
          >
            {/* Header: token icon + name */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <TokenIcon
                symbol={row.depositTokenSymbol}
                sx={{
                  fontSize: 42,
                  flexShrink: 0,
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="main16"
                  className="flow-vault-asset-name"
                  sx={{
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'text.primary',
                  }}
                >
                  {row.depositToken}
                </Typography>
              </Box>
            </Box>

            {/* Main APY + My Deposits + TVM - vertically centered, left-aligned */}
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%' }}>
                {/* APY */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, pb: 2 }}>
                  {typeof apyValue === 'number' ? (
                    <FormattedNumber
                      value={apyValue}
                      percent
                      coloredPercent
                      variant="main25"
                      sx={{ fontWeight: 800 }}
                    />
                  ) : (
                    <Typography variant="main25" sx={{ fontWeight: 800 }}>
                      –
                    </Typography>
                  )}
                  <Typography variant="secondary14" color="text.muted">
                    7 Days APY
                  </Typography>
                </Box>

                {/* My Deposits */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography variant="secondary12" color="text.secondary">
                    My Deposits
                  </Typography>
                  {row.myDeposit && row.myDepositUsd ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <FormattedNumber
                        value={row.myDeposit}
                        symbol={row.depositTokenSymbol}
                        compact
                        variant="main12"
                        symbolsVariant="secondary12"
                        symbolsColor="text.secondary"
                        sx={{ fontWeight: 600 }}
                      />
                      <UsdChip value={row.myDepositUsd} textVariant="secondary12" />
                    </Box>
                  ) : (
                    <Typography variant="main12">–</Typography>
                  )}
                </Box>

                {/* TVM */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography variant="secondary12" color="text.secondary">
                    TVM
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <FormattedNumber
                      value={row.tvm}
                      symbol={row.depositTokenSymbol}
                      compact
                      variant="main12"
                      symbolsVariant="secondary12"
                      symbolsColor="text.secondary"
                      sx={{ fontWeight: 600 }}
                    />
                    <UsdChip value={row.tvmUsd} textVariant="secondary12" />
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Deposit button */}
            <Box sx={{ mt: 'auto' }}>
              <Box
                component="button"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  if (onRowClick) onRowClick(row);
                }}
                sx={{
                  width: '100%',
                  border: 'none',
                  borderRadius: 999,
                  py: 1.25,
                  px: 2,
                  cursor: 'pointer',
                  background: theme.palette.background.surface,
                  color: 'text.primary',
                  typography: 'buttonM',
                  textAlign: 'center',
                  mt: 3,
                  '&:hover': {
                    background: theme.palette.background.surface2,
                    opacity: 0.9,
                  },
                }}
              >
                {`Deposit ${row.depositTokenSymbol}`}
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};


