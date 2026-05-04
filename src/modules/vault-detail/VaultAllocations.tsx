import { Box, Typography } from '@mui/material';
import {
  useVaultPortfolioMultiChain,
  useVaultTopology,
} from '@oydual31/more-vaults-sdk/react';
import React, { useMemo } from 'react';
import { MarketLogo } from 'src/components/MarketSwitcher';
import { BaseDataGrid, ColumnDefinition } from 'src/components/primitives/DataGrid';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { getPythPrice, usePythPrices } from 'src/hooks/usePythPrices';
import { useVault } from 'src/hooks/vault/useVault';
import { useVaultAllocation } from 'src/hooks/vault/useVaultAllocation';
import { useAssetData, useVaultData } from 'src/hooks/vault/useVaultData';
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
  const { selectedVaultId, isOmniHub, omniHubChainId, chainId: vaultChainId, isChainDetected } = useVault();
  const vaultData = useVaultData(selectedVaultId);
  const selectedVault = vaultData?.data;
  const hubChainId = isOmniHub ? omniHubChainId : vaultChainId;

  // Fetch vault allocation data (LP tokens, staking assets, available tokens)
  const vaultAllocationData = useVaultAllocation(selectedVaultId, {
    enabled: !!selectedVaultId && isChainDetected,
  });

  const { topology } = useVaultTopology(selectedVaultId as `0x${string}` | undefined);
  const isOmni = isOmniHub || !!selectedVault?.omni?.isHub || topology?.role === 'hub' || topology?.role === 'spoke';

  // Get price for underlying asset
  const underlyingAddress = selectedVault?.overview?.asset?.address || '';
  const underlyingAssetData = useAssetData(underlyingAddress);
  const underlyingPrice = underlyingAssetData.data?.price || 0;

  // Single source of truth for omni allocations: per-chain portfolio (liquid + sub-vault).
  // This avoids double counting: spoke `totalAssets()` already includes its sub-vault
  // positions, so showing both spoke totals and sub-vault rows would double-count.
  const { data: portfolio, isLoading: isPortfolioLoading } = useVaultPortfolioMultiChain(
    isOmni ? (selectedVaultId as `0x${string}`) : undefined,
    hubChainId
  );

  const allocation = vaultAllocationData?.data?.allocation;
  const staking = vaultAllocationData?.data?.staked;
  const available = vaultAllocationData?.data?.available;
  const isLoading = isOmni ? isPortfolioLoading : vaultAllocationData?.isLoading;
  const error = isOmni ? false : vaultAllocationData?.isError;

  // Collect all token symbols that need pricing (for Pyth oracle)
  const allSymbols = useMemo(() => {
    const syms = new Set<string>();
    const underSym = selectedVault?.overview?.asset?.symbol;
    if (underSym) syms.add(underSym);
    if (portfolio) {
      for (const chain of portfolio.chains) {
        for (const a of chain.portfolio.liquidAssets) {
          if (a.symbol) syms.add(a.symbol);
        }
        for (const pos of chain.portfolio.subVaultPositions) {
          if (pos.underlyingSymbol) syms.add(pos.underlyingSymbol);
          if (pos.symbol) syms.add(pos.symbol);
        }
      }
    }
    if (allocation) for (const a of allocation) { if (a.assetSymbol) syms.add(a.assetSymbol); }
    if (available) for (const a of available) { if (a.assetSymbol) syms.add(a.assetSymbol); }
    return Array.from(syms);
  }, [selectedVault, portfolio, allocation, available]);

  // Fetch USD prices from Pyth Hermes API (free, no API key needed)
  const { prices: pythPrices } = usePythPrices(allSymbols);

  // Build the omni allocation rows from per-chain portfolio data.
  // For each chain, show:
  //   - liquid asset rows (idle balances) — only when balance > 0
  //   - sub-vault position rows (deployed via ERC4626/7540) — denominated in underlying
  // No spoke `totalAssets` rows: those are aggregates of the items above.
  const omniAssets: VaultAsset[] = React.useMemo(() => {
    if (!portfolio) return [];
    const assets: VaultAsset[] = [];
    for (const chain of portfolio.chains) {
      const cfg = networkConfigs[chain.chainId];
      const chainName = cfg?.name || `Chain ${chain.chainId}`;

      for (const a of chain.portfolio.liquidAssets) {
        if (a.balance <= BigInt(0)) continue;
        const bal = parseFloat(formatUnits(a.balance, a.decimals));
        const isUnderlying = a.address.toLowerCase() === underlyingAddress.toLowerCase();
        const price = isUnderlying
          ? underlyingPrice || getPythPrice(pythPrices, a.symbol)
          : getPythPrice(pythPrices, a.symbol) || underlyingPrice;
        assets.push({
          assetName: `${a.symbol} on ${chainName}`,
          assetSymbol: a.symbol,
          balance: bal,
          price,
          value: bal * price,
          category: chain.role === 'hub' ? 'Hub Available' : 'Spoke Available',
          chainLogo: cfg?.networkLogoPath,
        });
      }

      for (const pos of chain.portfolio.subVaultPositions) {
        if (pos.underlyingValue <= BigInt(0)) continue;
        const bal = parseFloat(formatUnits(pos.underlyingValue, pos.underlyingDecimals));
        const sym = pos.underlyingSymbol || pos.symbol;
        const isUnderlying = sym.toLowerCase() === (selectedVault?.overview?.asset?.symbol || '').toLowerCase();
        const price = isUnderlying
          ? underlyingPrice || getPythPrice(pythPrices, sym)
          : getPythPrice(pythPrices, sym) || underlyingPrice;
        assets.push({
          assetName: `${pos.name} on ${chainName}`,
          assetSymbol: sym,
          balance: bal,
          price,
          value: bal * price,
          category: pos.type === 'erc7540' ? 'Async Vault' : 'Sub-vault',
          chainLogo: cfg?.networkLogoPath,
        });
      }
    }
    return assets;
  }, [portfolio, selectedVault, underlyingAddress, underlyingPrice, pythPrices]);

  // Combine all assets for display
  const allAssets: VaultAsset[] = (
    isOmni
      ? omniAssets
      : [
          ...(allocation || []).map((asset) => ({ ...asset, category: 'LP Tokens' })),
          ...(staking || []).map((asset) => ({
            ...asset,
            balance: asset.stakedAmount,
            category: 'Staking',
          })),
          ...(available || []).map((asset) => ({ ...asset, category: 'Available' })),
        ]
  )
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
      <Box
        sx={{
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '14px',
          p: { xs: 2, md: 3 },
          // Stack above the fixed page grid texture so it stays opaque
          position: 'relative',
          zIndex: 1,
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 1px 0 rgba(255,255,255,.04) inset, 0 18px 40px -22px rgba(0,0,0,.55)'
              : '0 1px 0 rgba(255,255,255,.9) inset, 0 14px 32px -18px rgba(120,70,20,.10)',
        }}
      >
        <BaseDataGrid
          data={allAssets}
          columns={columns}
          loading={isLoading}
          defaultSortColumn="value"
          defaultSortOrder="desc"
          rowIdGetter={(asset, index) => `${asset.assetSymbol}-${index}`}
        />
      </Box>
    </Box>
  );
};
