import { Box, Typography } from '@mui/material';
import {
  useVaultAssetBreakdown,
  useVaultDistribution,
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
  const { distribution } = useVaultDistribution(
    isOmni ? (selectedVaultId as `0x${string}`) : undefined
  );

  // Per-asset breakdown for omni vaults (SDK hook with React Query caching)
  const { data: assetBreakdown } = useVaultAssetBreakdown(
    isOmni ? (selectedVaultId as `0x${string}`) : undefined,
    hubChainId
  );

  // Get price for underlying asset
  const underlyingAddress = selectedVault?.overview?.asset?.address || '';
  const underlyingAssetData = useAssetData(underlyingAddress);
  const underlyingPrice = underlyingAssetData.data?.price || 0;

  // SDK multi-chain portfolio for sub-vault positions (Moonwell, ERC4626/7540)
  const { data: portfolio } = useVaultPortfolioMultiChain(
    isOmni ? (selectedVaultId as `0x${string}`) : undefined,
    hubChainId
  );

  const allocation = vaultAllocationData?.data?.allocation;
  const staking = vaultAllocationData?.data?.staked;
  const available = vaultAllocationData?.data?.available;
  const isLoading = vaultAllocationData?.isLoading;
  const error = vaultAllocationData?.isError;

  // Collect all token symbols that need pricing (for Pyth oracle)
  const allSymbols = useMemo(() => {
    const syms = new Set<string>();
    const underSym = selectedVault?.overview?.asset?.symbol;
    if (underSym) syms.add(underSym);
    if (assetBreakdown?.assets) {
      for (const a of assetBreakdown.assets) {
        if (a.symbol) syms.add(a.symbol);
      }
    }
    if (portfolio?.allSubVaultPositions) {
      for (const pos of portfolio.allSubVaultPositions) {
        if (pos.underlyingSymbol) syms.add(pos.underlyingSymbol);
        if (pos.symbol) syms.add(pos.symbol);
      }
    }
    if (allocation) for (const a of allocation) { if (a.assetSymbol) syms.add(a.assetSymbol); }
    if (available) for (const a of available) { if (a.assetSymbol) syms.add(a.assetSymbol); }
    return Array.from(syms);
  }, [selectedVault, assetBreakdown, portfolio, allocation, available]);

  // Fetch USD prices from Pyth Hermes API (free, no API key needed)
  const { prices: pythPrices } = usePythPrices(allSymbols);

  // Build sub-vault position assets from portfolio (Moonwell, ERC4626/7540 positions)
  const subVaultAssets: VaultAsset[] = React.useMemo(() => {
    if (!portfolio || !portfolio.allSubVaultPositions?.length) return [];
    return portfolio.allSubVaultPositions
      .filter((pos) => pos.underlyingValue > BigInt(0))
      .map((pos) => {
        const cfg = networkConfigs[pos.chainId];
        const bal = parseFloat(formatUnits(pos.underlyingValue, pos.underlyingDecimals));
        const sym = pos.underlyingSymbol || pos.symbol;
        const price = underlyingPrice || getPythPrice(pythPrices, sym);
        return {
          assetName: `${pos.name} on ${cfg?.name || `Chain ${pos.chainId}`}`,
          assetSymbol: sym,
          balance: bal,
          price,
          value: bal * price,
          category: pos.type === 'erc7540' ? 'Async Vault' : 'Sub-vault',
          chainLogo: cfg?.networkLogoPath,
        };
      });
  }, [portfolio, underlyingPrice, pythPrices]);

  // Build cross-chain assets from distribution data (hub + spokes)
  // Uses per-asset breakdown when available (SDK 0.3.0+) for detailed hub holdings
  const distributionAssets: VaultAsset[] = React.useMemo(() => {
    if (!distribution) return [];
    const decimals = selectedVault?.overview?.asset?.decimals || 18;
    const symbol = selectedVault?.overview?.asset?.symbol || '';
    const fallbackPrice =
      available?.find((a) => a.assetSymbol.toLowerCase() === symbol.toLowerCase())?.price ||
      allocation?.find((a) => a.assetSymbol.toLowerCase() === symbol.toLowerCase())?.price ||
      underlyingPrice || 0;

    const assets: VaultAsset[] = [];
    const hubCfg = networkConfigs[distribution.hubChainId];

    // Per-asset hub holdings from breakdown (shows each token individually)
    if (assetBreakdown && assetBreakdown.assets.length > 0) {
      for (const asset of assetBreakdown.assets) {
        if (asset.balance <= BigInt(0)) continue;
        const bal = parseFloat(formatUnits(asset.balance, asset.decimals));
        // Use known price for underlying; Pyth oracle price for other tokens
        const isUnderlying = asset.address.toLowerCase() === underlyingAddress.toLowerCase();
        const assetPrice = isUnderlying
          ? fallbackPrice
          : getPythPrice(pythPrices, asset.symbol) || fallbackPrice;
        assets.push({
          assetName: `${asset.symbol} on ${hubCfg?.name || 'Hub'}`,
          assetSymbol: asset.symbol,
          balance: bal,
          price: assetPrice,
          value: bal * assetPrice,
          category: 'Hub Holdings',
          chainLogo: hubCfg?.networkLogoPath,
        });
      }
    } else {
      // Fallback: single-token hub display
      if (distribution.hubLiquidBalance > BigInt(0)) {
        const bal = parseFloat(formatUnits(distribution.hubLiquidBalance, decimals));
        assets.push({
          assetName: `${symbol} available on ${hubCfg?.name || 'Hub'}`,
          assetSymbol: symbol,
          balance: bal,
          price: fallbackPrice,
          value: bal * fallbackPrice,
          category: 'Hub Available',
          chainLogo: hubCfg?.networkLogoPath,
        });
      }
      if (distribution.hubStrategyBalance > BigInt(0)) {
        const bal = parseFloat(formatUnits(distribution.hubStrategyBalance, decimals));
        assets.push({
          assetName: `${symbol} in strategies on ${hubCfg?.name || 'Hub'}`,
          assetSymbol: symbol,
          balance: bal,
          price: fallbackPrice,
          value: bal * fallbackPrice,
          category: 'Hub Strategy',
          chainLogo: hubCfg?.networkLogoPath,
        });
      }
    }

    // Spoke balances
    for (const spoke of distribution.spokeBalances) {
      if (!spoke.isReachable || spoke.totalAssets <= BigInt(0)) continue;
      const cfg = networkConfigs[spoke.chainId];
      const bal = parseFloat(formatUnits(spoke.totalAssets, decimals));
      assets.push({
        assetName: `${symbol} on ${cfg?.name || `Chain ${spoke.chainId}`}`,
        assetSymbol: symbol,
        balance: bal,
        price: fallbackPrice,
        value: bal * fallbackPrice,
        category: 'Spoke Chain',
        chainLogo: cfg?.networkLogoPath,
      });
    }

    return assets;
  }, [distribution, selectedVault, available, allocation, assetBreakdown, underlyingAddress, underlyingPrice, pythPrices]);

  // Combine all assets for display
  const allAssets: VaultAsset[] = [
    ...(allocation || []).map((asset) => ({ ...asset, category: 'LP Tokens' })),
    ...(staking || []).map((asset) => ({
      ...asset,
      balance: asset.stakedAmount,
      category: 'Staking',
    })),
    ...(available || []).map((asset) => ({ ...asset, category: 'Available' })),
    ...distributionAssets,
    ...subVaultAssets,
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
