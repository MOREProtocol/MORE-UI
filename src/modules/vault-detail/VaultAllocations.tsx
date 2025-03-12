import {
  Box,
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
import { useVaultInfo } from 'src/hooks/useVaultInfo';

// Define the column headers
const listHeaders = [
  { title: 'Asset', key: 'assetName' },
  { title: 'Type', key: 'type' },
  { title: 'Market', key: 'market' },
  { title: 'Balance', key: 'balance' },
  { title: 'Price', key: 'price' },
  { title: 'Change 24h', key: 'priceChangeLast24Hours' },
  { title: 'Value', key: 'value' },
  { title: 'Allocation', key: 'allocation' },
];

export const VaultAllocations: React.FC = () => {
  const { vault } = useVaultInfo();
  const theme = useTheme();

  // TODO: Nice error handling

  // Calculate total value for allocation percentages
  const totalValue = vault.allocation.reduce((sum, asset) => sum + asset.value, 0);

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
            {vault.allocation.map((asset, index) => {
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
                      <TokenIcon symbol={asset.assetName} fontSize="large" />
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
                      {asset.market}
                    </Typography>
                  </TableCell>

                  <TableCell
                    align="center"
                    sx={{
                      padding: '16px',
                      borderBottom: 'none',
                    }}
                  >
                    <Typography variant="main14" color="text">
                      {asset.type}
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

                  <TableCell
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
                  </TableCell>

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
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
