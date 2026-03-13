import { Box, Typography } from '@mui/material';
import { useVaultDistribution } from '@oydual31/more-vaults-sdk/react';
import React from 'react';
import { MarketLogo } from 'src/components/MarketSwitcher';
import { BaseDataGrid, ColumnDefinition } from 'src/components/primitives/DataGrid';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { useVault } from 'src/hooks/vault/useVault';
import { useVaultAllocation } from 'src/hooks/vault/useVaultAllocation';
import { useVaultData } from 'src/hooks/vault/useVaultData';
import { networkConfigs } from 'src/utils/marketsAndNetworksConfig';
import { formatUnits } from 'viem';

// Define the asset type for type safety
interface VaultAsset {
  assetName: string;
  assetSymbol: string;
  balance: number;
  price: number;
  value: number;
  category: string;
  chainLogo?: string;
}

export const VaultAllocations: React.FC = () => {
  const { selectedVaultId, isOmniHub } = useVault();
  const vaultData = useVaultData(selectedVaultId);
  const selectedVault = vaultData?.data;

  // Fetch vault allocation data (LP tokens, staking assets, available tokens)
  const vaultAllocationData = useVaultAllocation(selectedVaultId, {
    enabled: !!selectedVaultId,
  });

  // Fetch cross-chain distribution for omni vaults
  // Use both isOmniHub (context) and vaultData omni field as triggers,
  // since isOmniHub may not resolve immediately on page load.
  const isOmni = isOmniHub || !!selectedVault?.omni?.isHub;
  const { distribution } = useVaultDistribution(
    isOmni ? (selectedVaultId as `0x${string}`) : undefined
  );

  const allocation = vaultAllocationData?.data?.allocation;
  const staking = vaultAllocationData?.data?.staked;
  const available = vaultAllocationData?.data?.available;
  const isLoading = vaultAllocationData?.isLoading;
  const error = vaultAllocationData?.isError;

  // Build spoke assets from distribution data
  const spokeAssets: VaultAsset[] = React.useMemo(() => {
    if (!distribution || !distribution.spokeBalances.length) return [];
    const decimals = selectedVault?.overview?.asset?.decimals || 18;
    const symbol = selectedVault?.overview?.asset?.symbol || '';
    const price =
      available?.find((a) => a.assetSymbol.toLowerCase() === symbol.toLowerCase())?.price ||
      allocation?.find((a) => a.assetSymbol.toLowerCase() === symbol.toLowerCase())?.price ||
      0;

    return distribution.spokeBalances
      .filter((spoke) => spoke.isReachable && spoke.totalAssets > BigInt(0))
      .map((spoke) => {
        const cfg = networkConfigs[spoke.chainId];
        const bal = parseFloat(formatUnits(spoke.totalAssets, decimals));
        return {
          assetName: `${symbol} on ${cfg?.name || `Chain ${spoke.chainId}`}`,
          assetSymbol: symbol,
          balance: bal,
          price,
          value: bal * price,
          category: 'Spoke Chain',
          chainLogo: cfg?.networkLogoPath,
        };
      });
  }, [distribution, selectedVault, available, allocation]);

  // Combine all assets for display
  const allAssets: VaultAsset[] = [
    ...(allocation || []).map((asset) => ({ ...asset, category: 'LP Tokens' })),
    ...(staking || []).map((asset) => ({
      ...asset,
      balance: asset.stakedAmount,
      category: 'Staking',
    })),
    ...(available || []).map((asset) => ({ ...asset, category: 'Available' })),
    ...spokeAssets,
  ]
    .filter((asset) => (asset.balance || 0) > 0) // Hide allocations with zero balance
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
          <Box sx={{ position: 'relative' }}>
            <TokenIcon symbol={asset.assetSymbol} fontSize="large" />
            {asset.chainLogo && (
              <Box sx={{ position: 'absolute', bottom: -2, right: -4 }}>
                <MarketLogo size={14} logo={asset.chainLogo} />
              </Box>
            )}
          </Box>
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
        return <FormattedNumber compact value={allocationPercentage} percent variant="main14" />;
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
