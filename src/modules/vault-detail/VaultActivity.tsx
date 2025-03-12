import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';
import { Address } from 'src/components/Address';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { useVaultInfo } from 'src/hooks/useVaultInfo';

// Define the column headers
const listHeaders = [
  { title: 'Timestamp', key: 'timestamp' },
  { title: 'Market', key: 'market' },
  { title: 'Asset', key: 'assetName' },
  { title: 'Amount', key: 'amount' },
  { title: 'Type', key: 'type' },
  { title: 'Transaction Hash', key: 'transactionHash' },
  { title: 'User', key: 'user' },
];

export const VaultActivity: React.FC = () => {
  const theme = useTheme();
  const { vault } = useVaultInfo();

  // TODO: Nice error handling

  return (
    <Box sx={{ width: '100%', pt: 5 }}>
      <TableContainer component={Paper} sx={{ boxShadow: 'none', backgroundColor: 'transparent' }}>
        <Table aria-label="vault activity table">
          <TableHead>
            <TableRow>
              {listHeaders.map((header) => (
                <TableCell
                  key={header.key}
                  align="center"
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
            {vault.activity &&
              vault.activity.map((activity, index) => {
                return (
                  <TableRow
                    key={`${activity.assetName}-${index}`}
                    sx={{
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                      },
                      cursor: 'pointer',
                      borderBottom: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <TableCell align="center">
                      <Tooltip title={activity.timestamp.toLocaleString()} arrow placement="top">
                        <Typography variant="secondary14" color="text">
                          {typeof activity.timestamp === 'object' &&
                          activity.timestamp instanceof Date
                            ? activity.timestamp.toLocaleDateString()
                            : activity.timestamp}
                        </Typography>
                      </Tooltip>
                    </TableCell>

                    <TableCell align="center">
                      <Typography variant="main14" color="text">
                        {activity.market}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Typography variant="main14" color="text">
                        {activity.assetSymbol}
                      </Typography>
                      <Typography variant="secondary12" color="text.muted">
                        {activity.assetName}
                      </Typography>
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}
                    >
                      <FormattedNumber
                        compact
                        value={activity.amount}
                        symbol={activity.assetSymbol}
                        variant="main14"
                      />
                      <FormattedNumber
                        compact
                        value={activity.price * activity.amount}
                        symbol="USD"
                        variant="secondary12"
                      />
                    </TableCell>

                    <TableCell align="center">
                      <Typography variant="main14" color="text">
                        {activity.type}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                        <Address
                          variant="secondary14"
                          address={activity.transactionHash}
                          link={`https://etherscan.io/address`}
                        />
                      </Box>
                    </TableCell>

                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                        <Address
                          variant="secondary14"
                          address={activity.user}
                          link={`https://etherscan.io/address`}
                          isUser
                        />
                      </Box>
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
