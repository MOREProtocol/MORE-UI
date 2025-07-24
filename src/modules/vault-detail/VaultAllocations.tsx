import {
  Box,
  Typography,
} from '@mui/material';
import React from 'react';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { BaseDataGrid, ColumnDefinition } from 'src/components/primitives/DataGrid';
import { useVault } from 'src/hooks/vault/useVault';
import { useVaultAllocation } from 'src/hooks/vault/useVaultAllocation';

// Define the asset type for type safety
interface VaultAsset {
  assetName: string;
  assetSymbol: string;
  balance: number;
  price: number;
  value: number;
  category: string;
}

export const VaultAllocations: React.FC = () => {
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
  const allAssets: VaultAsset[] = [
    ...(allocation || []).map(asset => ({ ...asset, category: 'LP Tokens' })),
    ...(staking || []).map(asset => ({ ...asset, balance: asset.stakedAmount, category: 'Staking' })),
    ...(available || []).map(asset => ({ ...asset, category: 'Available' })),
  ]
    .filter(asset => (asset.balance || 0) > 0) // Hide allocations with zero balance
    .sort((a, b) => (b.value || 0) - (a.value || 0)); // Sort by descending allocation value

  // Calculate total value for allocation percentages
  const totalValue = allAssets.reduce((sum, asset) => sum + (asset.value || 0), 0);

  // Define columns for BaseDataGrid
  const columns: ColumnDefinition<VaultAsset>[] = [
    {
      key: 'assetName',
      label: 'Asset',
      sortable: true,
      render: (asset) => (
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
      ),
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (asset) => (
        <Typography variant="main14" color="text">
          {asset.category}
        </Typography>
      ),
    },
    {
      key: 'balance',
      label: 'Balance',
      sortable: true,
      render: (asset) => (
        <FormattedNumber
          compact
          value={asset.balance}
          symbol={asset.assetSymbol}
          variant="main14"
        />
      ),
    },
    {
      key: 'price',
      label: 'Price',
      sortable: true,
      render: (asset) => (
        <FormattedNumber compact value={asset.price} symbol="USD" variant="main14" />
      ),
    },
    {
      key: 'value',
      label: 'Value',
      sortable: true,
      render: (asset) => (
        <FormattedNumber compact value={asset.value} symbol="USD" variant="main14" />
      ),
    },
    {
      key: 'value' as keyof VaultAsset, // Using value for allocation calculation
      label: 'Allocation',
      sortable: true,
      render: (asset) => {
        const allocationPercentage = asset.value / totalValue;
        return (
          <FormattedNumber
            compact
            value={allocationPercentage}
            percent
            variant="main14"
          />
        );
      },
    },
  ];

  // Handle error state
  if (error) {
    return (
      <Box sx={{ width: '100%', pt: 5, textAlign: 'center', py: 8 }}>
        <Typography variant="main14" color="text.secondary">
          Unable to load allocation data. This vault may not support allocation queries.
        </Typography>
      </Box>
    );
  }

  // Handle empty state (when not loading and no assets)
  if (!isLoading && (!allAssets || allAssets.length === 0)) {
    return (
      <Box sx={{ width: '100%', pt: 5, textAlign: 'center', py: 8 }}>
        <Typography variant="main14" color="text.secondary">
          No assets found in this vault
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', pt: 5 }}>
      <BaseDataGrid
        data={allAssets}
        columns={columns}
        loading={isLoading}
        defaultSortColumn="value"
        defaultSortOrder="desc"
        rowIdGetter={(asset, index) => `${asset.assetSymbol}-${index}`}
      />
    </Box>
  );
};
