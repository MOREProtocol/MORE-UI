import React, { useMemo } from 'react';
import { Box, Skeleton, Typography, useMediaQuery, useTheme } from '@mui/material';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const sortedData = useMemo(
    () => sortVaultRows(data, defaultSortColumn, defaultSortOrder),
    [data, defaultSortColumn, defaultSortOrder]
  );

  if (loading) {
    // Skeleton cards
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {[1, 2, 3].map((index) => (
          <Box
            key={`flow-vaults-skel-${index}`}
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              gap: { xs: 2, md: 4 },
              p: { xs: 2, md: 3 },
              borderRadius: 2,
              backgroundColor: 'background.paper',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, md: 2.5 } }}>
              <Skeleton variant="circular" width={40} height={40} />
              <Box>
                <Skeleton variant="text" width={120} height={24} />
                <Skeleton variant="text" width={100} height={18} />
              </Box>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr)) 32px' },
                columnGap: { xs: 1.5, md: 4 },
                rowGap: { xs: 1, sm: 0 },
                width: { xs: '100%', sm: 'auto' },
                flex: '1 1 auto',
                ml: { xs: 0, sm: 2, md: 4 },
                alignItems: 'center',
              }}
            >
              <Box sx={{ textAlign: 'right' }}>
                <Skeleton variant="text" width={80} height={20} />
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Skeleton variant="text" width={70} height={20} />
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Skeleton variant="text" width={90} height={20} />
              </Box>
              <Box sx={{ width: 32, minWidth: 32, display: 'flex', justifyContent: 'center' }}>
                <Skeleton variant="text" width={12} height={20} />
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {sortedData.map((row) => {
        const handleClick = () => {
          if (onRowClick) onRowClick(row);
        };

        return (
          <Box
            key={row.id}
            onClick={handleClick}
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              gap: { xs: 2, md: 4 },
              p: { xs: 2, md: 3 },
              borderRadius: 2,
              backgroundColor: 'background.paper',
              cursor: onRowClick ? 'pointer' : 'default',
              '&:hover': onRowClick
                ? {
                  backgroundColor: theme.palette.action.hover,
                }
                : {},
            }}
          >
            {/* Left side: token icon + names */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: { xs: 1.5, md: 2.5 },
                minWidth: 0,
                width: '100%',
                flex: { xs: '1 1 auto', sm: '0 0 20%' },
              }}
            >
              <TokenIcon
                symbol={row.depositTokenSymbol}
                sx={{
                  fontSize: { xs: '32px', md: '40px' },
                  flexShrink: 0,
                }}
              />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant={isMobile ? 'main16' : 'main19'}
                  sx={{
                    fontWeight: 800,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'text.primary',
                  }}
                >
                  {row.depositToken}
                </Typography>
                {/* HIDDEN FOR NOW */}
                {/* <Typography
                  variant="secondary14"
                  sx={{
                    color: 'text.secondary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.vaultName}
                </Typography> */}
              </Box>
              {/* Arrow on mobile, next to asset/vault name */}
              <Box
                sx={{
                  display: { xs: 'flex', sm: 'none' },
                  alignItems: 'center',
                  justifyContent: 'center',
                  ml: 'auto',
                }}
              >
                <KeyboardArrowRightIcon
                  sx={{
                    fontSize: 20,
                    color: 'text.secondary',
                  }}
                />
              </Box>
            </Box>

            {/* Right side: metrics + action */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr)) 50px' },
                columnGap: { xs: 1.5, md: 4 },
                rowGap: { xs: 1, sm: 0 },
                width: { xs: '100%', sm: '80%' },
                flex: { xs: '1 1 auto', sm: '0 0 80%' },
                ml: { xs: 0, sm: 2, md: 4 },
                alignItems: 'center',
              }}
            >
              {/* My Deposits */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'row', sm: 'column' },
                  alignItems: { xs: 'center', sm: 'flex-end' },
                  justifyContent: { xs: 'space-between', sm: 'flex-start' },
                  textAlign: 'right',
                  gap: { xs: 1, sm: 0 },
                }}
              >
                <Typography
                  variant="secondary12"
                  color="text.secondary"
                  sx={{
                    mb: { xs: 0, sm: 0.5 },
                    mr: { xs: 1, sm: 0 },
                    textAlign: 'left',
                  }}
                >
                  My Deposits
                </Typography>
                {row.myDeposit && row.myDepositUsd ? (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'row', md: 'row' },
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 1,
                    }}
                  >
                    <FormattedNumber
                      value={row.myDeposit}
                      symbol={row.depositTokenSymbol}
                      compact
                      variant={isMobile ? 'main14' : 'main19'}
                      symbolsVariant={isMobile ? 'secondary14' : 'secondary19'}
                      symbolsColor="text.secondary"
                      sx={{ fontWeight: 800 }}
                    />
                    <UsdChip value={row.myDepositUsd} />
                  </Box>
                ) : (
                  <Typography variant={isMobile ? 'main14' : 'main19'}>–</Typography>
                )}
              </Box>

              {/* 7d APY */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'row', sm: 'column' },
                  alignItems: { xs: 'center', sm: 'flex-end' },
                  justifyContent: { xs: 'space-between', sm: 'flex-start' },
                  textAlign: 'right',
                  gap: { xs: 1, sm: 0 },
                }}
              >
                <Typography
                  variant="secondary12"
                  color="text.secondary"
                  sx={{
                    mb: { xs: 0, sm: 0.5 },
                    mr: { xs: 1, sm: 0 },
                    textAlign: 'left',
                  }}
                >
                  7D APY
                </Typography>
                {typeof row.apy7Days === 'number' ? (
                  <FormattedNumber
                    value={row.apy7Days}
                    percent
                    coloredPercent
                    variant={isMobile ? 'main14' : 'main19'}
                    sx={{ fontWeight: 800 }}
                  />
                ) : (
                  <Typography variant={isMobile ? 'main14' : 'main19'}>–</Typography>
                )}
              </Box>

              {/* TVM */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'row', sm: 'column' },
                  alignItems: { xs: 'center', sm: 'flex-end' },
                  justifyContent: { xs: 'space-between', sm: 'flex-start' },
                  textAlign: 'right',
                  gap: { xs: 1, sm: 0 },
                }}
              >
                <Typography
                  variant="secondary12"
                  color="text.secondary"
                  sx={{
                    mb: { xs: 0, sm: 0.5 },
                    mr: { xs: 1, sm: 0 },
                    textAlign: 'left',
                  }}
                >
                  TVM
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'row', md: 'row' },
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 1,
                  }}
                >
                  <FormattedNumber
                    value={row.tvm}
                    symbol={row.depositTokenSymbol}
                    compact
                    variant={isMobile ? 'main14' : 'main19'}
                    symbolsVariant={isMobile ? 'secondary14' : 'secondary19'}
                    symbolsColor="text.secondary"
                    sx={{ fontWeight: 800 }}
                  />
                  <UsdChip value={row.tvmUsd} />
                </Box>
              </Box>

              {/* Row arrow on desktop/tablet only */}
              <Box
                sx={{
                  width: 32,
                  minWidth: 32,
                  display: { xs: 'none', sm: 'flex' },
                  alignItems: 'center',
                  justifyContent: 'center',
                  alignSelf: { xs: 'center', sm: 'center' },
                }}
              >
                <KeyboardArrowRightIcon
                  sx={{
                    fontSize: 22,
                    color: 'text.secondary',
                  }}
                />
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};


