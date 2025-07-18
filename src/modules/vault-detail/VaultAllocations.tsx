import {
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { useVault } from 'src/hooks/vault/useVault';
import { useVaultAllocation } from 'src/hooks/vault/useVaultAllocation';

// Define the column headers
const listHeaders = [
  { title: 'Asset', key: 'assetName' },
  { title: 'Category', key: 'category' },
  { title: 'Balance', key: 'balance' },
  { title: 'Price', key: 'price' },
  // { title: 'Change 24h', key: 'priceChangeLast24Hours' },
  { title: 'Value', key: 'value' },
  { title: 'Allocation', key: 'allocation' },
];

export const VaultAllocations: React.FC = () => {
  const theme = useTheme();
  const { selectedVaultId } = useVault();

  // Fetch vault allocation data (LP tokens, staking assets, available tokens)
  const vaultAllocationData = useVaultAllocation(selectedVaultId, {
    enabled: !!selectedVaultId,
  });

  const allocation = vaultAllocationData?.data?.allocation;
  const staking = vaultAllocationData?.data?.staked;
  const available = vaultAllocationData?.data?.available;
  const isLoading = vaultAllocationData?.isLoading;
  const error = vaultAllocationData?.isError;

  // Combine all assets for display
  const allAssets = [
    ...(allocation || []).map(asset => ({ ...asset, category: 'LP Tokens' })),
    ...(staking || []).map(asset => ({ ...asset, balance: asset.stakedAmount, category: 'Staking' })),
    ...(available || []).map(asset => ({ ...asset, category: 'Available' })),
  ].sort((a, b) => (b.value || 0) - (a.value || 0)); // Sort by descending allocation value

  // Calculate total value for allocation percentages
  const totalValue = allAssets.reduce((sum, asset) => sum + (asset.value || 0), 0);

  return (
    <Box sx={{ width: '100%', pt: 5 }}>
      <TableContainer component={Paper} sx={{ boxShadow: 'none', backgroundColor: 'transparent' }}>
        <Table aria-label="vault allocations table">
          <TableHead>
            <TableRow>
              {listHeaders.map((header) => (
                <TableCell
                  key={header.key}
                  align={header.key === 'assetName' ? 'left' : 'center'}
                  sx={{
                    color: theme.palette.text.secondary,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    padding: '16px',
                    fontSize: '14px',
                  }}
                >
                  {header.title}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={listHeaders.length}
                  align="center"
                  sx={{ border: 'none', py: 8 }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress size={24} />
                  </Box>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={listHeaders.length}
                  align="center"
                  sx={{ border: 'none', py: 8 }}
                >
                  <Typography variant="main14" color="text.secondary">
                    Unable to load allocation data. This vault may not support allocation queries.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : !allAssets || allAssets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={listHeaders.length}
                  align="center"
                  sx={{ border: 'none', py: 8 }}
                >
                  <Typography variant="main14" color="text.secondary">
                    No assets found in this vault
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              allAssets.map((asset, index) => {
                // Calculate allocation percentage
                const allocationPercentage = asset.value / totalValue;

                return (
                  <TableRow
                    key={`${asset.assetName}-${index}`}
                    sx={{
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                      },
                      cursor: 'pointer',
                      borderBottom: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <TableCell
                      sx={{
                        padding: '16px',
                        borderBottom: 'none',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TokenIcon symbol={asset.assetSymbol} fontSize="large" />
                        <Box sx={{ ml: 2 }}>
                          <Typography variant="main14" color="text">
                            {asset.assetSymbol}
                          </Typography>
                          <Typography variant="secondary12" color="text.muted">
                            {asset.assetName}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={{
                        padding: '16px',
                        borderBottom: 'none',
                      }}
                    >
                      <Typography variant="main14" color="text">
                        {asset.category}
                      </Typography>
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={{
                        padding: '16px',
                        borderBottom: 'none',
                      }}
                    >
                      <FormattedNumber
                        compact
                        value={asset.balance}
                        symbol={asset.assetSymbol}
                        variant="main14"
                      />
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={{
                        padding: '16px',
                        borderBottom: 'none',
                      }}
                    >
                      <FormattedNumber compact value={asset.price} symbol="USD" variant="main14" />
                    </TableCell>

                    {/* <TableCell
                      align="center"
                      sx={{
                        padding: '16px',
                        borderBottom: 'none',
                      }}
                    >
                      <FormattedNumber
                        compact
                        value={asset.priceChangeLast24Hours}
                        coloredPercent
                        variant="main14"
                      />
                    </TableCell> */}

                    <TableCell
                      align="center"
                      sx={{
                        padding: '16px',
                        borderBottom: 'none',
                      }}
                    >
                      <FormattedNumber compact value={asset.value} symbol="USD" variant="main14" />
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={{
                        padding: '16px',
                        borderBottom: 'none',
                      }}
                    >
                      <FormattedNumber
                        compact
                        value={allocationPercentage}
                        percent
                        variant="main14"
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
