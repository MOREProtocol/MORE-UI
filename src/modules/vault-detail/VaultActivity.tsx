import {
  Avatar,
  Box,
  CircularProgress,
  Paper,
  SvgIcon,
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
import React, { useMemo, useState } from 'react';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { Address } from 'src/components/Address';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { useVault } from 'src/hooks/vault/useVault';
import { useVaultData } from 'src/hooks/vault/useVaultData';
import { networkConfigs } from 'src/utils/marketsAndNetworksConfig';

// Define the column headers
const listHeaders = [
  { title: 'Timestamp', key: 'timestamp' },
  { title: 'Market', key: 'market' },
  { title: 'Asset', key: 'assetName' },
  { title: 'Amount', key: 'amount' },
  { title: 'Type', key: 'type' },
  { title: 'Transaction Hash', key: 'transactionHash' },
];

export const VaultActivity: React.FC = () => {
  const theme = useTheme();
  const { selectedVaultId, chainId, accountAddress } = useVault();
  const vaultData = useVaultData(selectedVaultId);

  const [userActivityOnly, setUserActivityOnly] = useState(false);

  const vault = vaultData?.data;
  const activity = userActivityOnly ? vault?.activity.filter((activity) => activity?.user?.toLowerCase() === accountAddress?.toLowerCase()) : vault?.activity;
  const isLoading = vaultData?.isLoading;
  const error = vaultData?.error;

  const baseUrl = useMemo(() => chainId && networkConfigs[chainId] && networkConfigs[chainId].explorerLink, [chainId]);

  return (
    <Box sx={{ width: '100%', pt: 5 }}>
      <TableContainer
        component={Paper}
        sx={{ boxShadow: 'none', backgroundColor: 'transparent', cursor: 'default' }}
      >
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
              <TableCell
                key="user"
                align="center"
                sx={{
                  color: theme.palette.text.secondary,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  padding: '16px',
                  fontSize: '14px',
                }}
              >
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  cursor: 'pointer',
                }} onClick={() => setUserActivityOnly(!userActivityOnly)}>
                  <Tooltip title={userActivityOnly ? 'Show all activities' : 'Show only my activities'} arrow placement="top">
                    <Box sx={{ position: 'relative', display: 'inline-block', '&:hover': { opacity: 0.8 } }}>
                      <SvgIcon sx={{
                        fontSize: '18px',
                        color: userActivityOnly ? 'primary.main' : 'text.muted',
                      }}>
                        <FilterAltIcon />
                      </SvgIcon>
                      <Avatar sx={{
                        position: 'absolute',
                        bottom: 5,
                        right: -4.5,
                        bgcolor: userActivityOnly ? 'primary.main' : 'text.muted',
                        color: userActivityOnly ? 'text.dark' : 'text.light',
                        width: 12,
                        height: 12,
                        fontSize: '8px',
                      }}
                      />
                    </Box>
                  </Tooltip>
                  <Typography variant="main14" color="text">
                    User
                  </Typography>
                </Box>
              </TableCell>
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
                  <Typography variant="main14" color="error">
                    Error loading activities: {error.message}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : !activity || activity.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={listHeaders.length}
                  align="center"
                  sx={{ border: 'none', py: 8 }}
                >
                  <Typography variant="main14">No activities found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              activity.map((activity, index) => {
                return (
                  <TableRow
                    key={`${activity.assetName}-${index}`}
                    sx={{
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                      },
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      cursor: 'default',
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
                        border: 'none',
                      }}
                    >
                      {activity.amount ? (
                        <FormattedNumber
                          compact
                          value={activity.amount}
                          symbol={activity.assetSymbol}
                          variant="main14"
                        />
                      ) : (
                        <Typography variant="main14" color="text.muted">
                          —
                        </Typography>
                      )}
                      {!activity.price || !activity.amount ? (
                        <></>
                      ) : (
                        <FormattedNumber
                          compact
                          value={Number(activity.price) * Number(activity.amount)}
                          symbol="USD"
                          variant="secondary12"
                          color="text.muted"
                        />
                      )}
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
                          link={`${baseUrl}/tx`}
                        />
                      </Box>
                    </TableCell>

                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                        <Address
                          variant="secondary14"
                          address={activity.user}
                          link={`${baseUrl}/address`}
                          isUser={activity.user === accountAddress}
                        />
                      </Box>
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
