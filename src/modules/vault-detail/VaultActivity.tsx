import {
  Box,
  SvgIcon,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useMemo, useState } from 'react';
import FilterListIcon from '@mui/icons-material/FilterList';
import { Address } from 'src/components/Address';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { BaseDataGrid, ColumnDefinition } from 'src/components/primitives/DataGrid';
import { useVault } from 'src/hooks/vault/useVault';
import { useVaultData } from 'src/hooks/vault/useVaultData';
import { networkConfigs } from 'src/utils/marketsAndNetworksConfig';

// Define the activity type for type safety
interface VaultActivityItem {
  timestamp: Date | string;
  market: string;
  assetName: string;
  assetSymbol: string;
  assetAddress: string;
  amount?: string | number;
  price?: string | number;
  type: string;
  transactionHash: string;
  user: string;
}

export const VaultActivity: React.FC = () => {
  const { selectedVaultId, chainId, accountAddress } = useVault();
  const vaultData = useVaultData(selectedVaultId);

  const [userActivityOnly, setUserActivityOnly] = useState(false);

  const vault = vaultData?.data;
  const activity: VaultActivityItem[] = userActivityOnly
    ? vault?.activity.filter((activity) => activity?.user?.toLowerCase() === accountAddress?.toLowerCase()) || []
    : vault?.activity || [];
  const isLoading = vaultData?.isLoading;
  const error = vaultData?.error;

  const baseUrl = useMemo(() => chainId && networkConfigs[chainId] && networkConfigs[chainId].explorerLink, [chainId]);

  // Define columns for BaseDataGrid
  const columns: ColumnDefinition<VaultActivityItem>[] = [
    {
      key: 'timestamp',
      label: 'Timestamp',
      sortable: true,
      render: (activity) => (
        <Tooltip title={activity.timestamp.toLocaleString()} arrow placement="top">
          <Typography variant="secondary14" color="text">
            {typeof activity.timestamp === 'object' &&
              activity.timestamp instanceof Date
              ? activity.timestamp.toLocaleDateString()
              : activity.timestamp}
          </Typography>
        </Tooltip>
      ),
    },
    {
      key: 'market',
      label: 'Market',
      sortable: true,
      render: (activity) => (
        <Typography variant="main14" color="text">
          {activity.market}
        </Typography>
      ),
    },
    {
      key: 'assetName',
      label: 'Asset',
      sortable: true,
      render: (activity) => (
        <Box>
          <Typography variant="main14" color="text">
            {activity.assetSymbol}
          </Typography>
          <Typography variant="secondary12" color="text.muted">
            {activity.assetName}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (activity) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
        </Box>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (activity) => (
        <Typography variant="main14" color="text">
          {activity.type}
        </Typography>
      ),
    },
    {
      key: 'transactionHash',
      label: 'Transaction Hash',
      sortable: false,
      render: (activity) => (
        <Address
          variant="secondary14"
          address={activity.transactionHash}
          link={`${baseUrl}/tx`}
        />
      ),
    },
    {
      key: 'user',
      label: 'User',
      sortable: false,
      render: (activity) => (
        <Address
          variant="secondary14"
          address={activity.user}
          link={`${baseUrl}/address`}
          isUser={activity.user === accountAddress}
        />
      ),
      headerRender: () => (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'left',
          gap: 1,
        }}>
          <Typography
            variant="main14"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '0.75rem', md: '0.875rem' }
            }}
          >
            User
          </Typography>
          <Tooltip title={userActivityOnly ? 'Show all activities' : 'Show only my activities'} arrow placement="top">
            <SvgIcon
              sx={{
                fontSize: '18px',
                cursor: 'pointer',
                color: userActivityOnly ? 'primary.main' : 'text.muted',
                '&:hover': { opacity: 0.7 }
              }}
              onClick={() => setUserActivityOnly(!userActivityOnly)}
            >
              <FilterListIcon />
            </SvgIcon>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // Handle error state
  if (error) {
    return (
      <Box sx={{ width: '100%', pt: 5, textAlign: 'center', py: 8 }}>
        <Typography variant="main14" color="error">
          Error loading activities: {error.message}
        </Typography>
      </Box>
    );
  }

  // Handle empty state (when not loading and no activity)
  if (!isLoading && (!activity || activity.length === 0)) {
    return (
      <Box sx={{ width: '100%', pt: 5, textAlign: 'center', py: 8 }}>
        <Typography variant="main14">No activities found</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', pt: 5 }}>
      <BaseDataGrid
        data={activity}
        columns={columns}
        loading={isLoading}
        defaultSortColumn="timestamp"
        defaultSortOrder="desc"
        rowIdGetter={(activity, index) => `${activity.transactionHash}-${index}`}
      />
    </Box>
  );
};
