import { valueToBigNumber } from '@aave/math-utils';
import { ChevronDownIcon, ViewGridIcon, ViewListIcon } from '@heroicons/react/outline';
import { Box, Button, Menu, MenuItem, Skeleton, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { formatUnits } from 'ethers/lib/utils';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { MastheadStat, PageMasthead } from 'src/components/PageMasthead';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { ROUTES } from 'src/components/primitives/Link';
import { SearchInput } from 'src/components/SearchInput';
import { getVaultFactoryInfo } from 'src/hooks/vault/factoryRegistry';
import { useVault, VaultData } from 'src/hooks/vault/useVault';
import type { RewardItemEnriched } from 'src/hooks/vault/useVaultData';
import {
  useAssetsData,
  useDeployedVaults,
  useOmniDeployedVaults,
  useUserData,
  useUserVaultsData,
  useVaultsListData,
} from 'src/hooks/vault/useVaultData';
import { getNetworkConfig } from 'src/utils/marketsAndNetworksConfig';
import { FONT_DISPLAY } from 'src/utils/theme';
import * as allChains from 'viem/chains';

import { VaultCards, VaultCardsView } from './VaultCards';
import { VaultGridRow } from './VaultDataGridColumns';
import { VaultsRewardModal } from './VaultsRewardModal';

const VIEW_STORAGE_KEY = 'more.vaultsView';

type SortKey = 'apy7Days' | 'tvmUsd';
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'apy7Days', label: 'APY' },
  { key: 'tvmUsd', label: 'TVM' },
];

// Helper function to get network information from chainId
const getNetworkInfo = (chainId: number) => {
  try {
    const networkConfig = getNetworkConfig(chainId);
    return {
      name: networkConfig.displayName || networkConfig.name || 'Unknown Network',
      icon: networkConfig.networkLogoPath || '/icons/networks/flow.svg',
    };
  } catch (error) {
    console.warn(`Unknown chainId: ${chainId}, falling back to Flow`);
    return {
      name: 'Unknown Network',
      icon: '/icons/networks/flow.svg',
    };
  }
};

const getChainName = (chainId: number | undefined): string => {
  if (chainId === undefined) {
    return 'Unknown Network';
  }
  for (const chain of Object.values(allChains)) {
    if (typeof chain === 'object' && chain !== null && 'id' in chain && chain.id === chainId) {
      return chain.name;
    }
  }
  return 'Unknown Network';
};

// Helper function to transform vault data to grid rows
const transformVaultsToGridRows = (
  vaults: VaultData[],
  userVaultsData:
    | Array<{ maxWithdraw: ethers.BigNumber; decimals: number; assetDecimals: number } | undefined>
    | undefined,
  assetPriceMap: Map<string, number>,
  networkInfo: { name: string; icon: string }
): VaultGridRow[] => {
  if (!vaults) return [];

  return vaults.map((vault, index) => {
    const assetAddress = vault?.overview?.asset?.address?.toLowerCase();
    const assetPrice = assetPriceMap.get(assetAddress) || 0;
    const assetDecimals = vault?.overview?.asset?.decimals || 18;
    const vaultDecimals = vault?.overview?.decimals || 20;

    // Get user deposit amount if userVaultsData is provided
    const userVaultData = userVaultsData?.[index];
    const userDeposit = userVaultData?.maxWithdraw || '0';
    const userDepositFormatted = userVaultData
      ? formatUnits(userDeposit.toString(), assetDecimals)
      : undefined;
    const userDepositUsd = userDepositFormatted
      ? new BigNumber(userDepositFormatted).multipliedBy(assetPrice)
      : undefined;

    // TVM: totalSupply (shares) * sharePrice (asset/share) * asset USD
    const totalSupplyShares = vault?.financials?.liquidity?.totalSupply?.toString() || '0';
    const shares = new BigNumber(formatUnits(totalSupplyShares, vaultDecimals));
    const sharePriceAsset = new BigNumber(vault?.overview?.sharePrice || 0);
    const tvmAsset = shares.multipliedBy(sharePriceAsset);
    const tvmUsd = tvmAsset.multipliedBy(assetPrice);
    const tvmValue = tvmAsset.toString();

    // Use vault-specific network info if the vault has a chainId
    const vaultChainId = vault.chainId;
    const rowNetworkInfo = vaultChainId
      ? (() => {
          try {
            return getNetworkInfo(vaultChainId);
          } catch {
            return networkInfo;
          }
        })()
      : networkInfo;

    return {
      id: vault.id,
      vaultName: vault.overview?.name || 'Unnamed Vault',
      curatorLogo: vault.overview?.curatorLogo,
      curatorName: vault.overview?.curatorName ?? 'Unknown',
      myDeposit: userDepositFormatted,
      myDepositUsd: userDepositUsd?.toString(),
      depositToken:
        vault.overview?.depositableAssets && vault.overview.depositableAssets.length > 0
          ? vault.overview.depositableAssets
              .map((a) => a.symbol)
              .filter(Boolean)
              .join(', ') ||
            vault.overview?.asset?.symbol ||
            'UNKNOWN'
          : vault.overview?.asset?.symbol || 'UNKNOWN',
      depositTokenSymbols:
        vault.overview?.depositableAssets && vault.overview.depositableAssets.length > 0
          ? vault.overview.depositableAssets.map((a) => a.symbol || '').filter(Boolean)
          : [vault.overview?.asset?.symbol || 'UNKNOWN'],
      depositTokenSymbol: vault.overview?.asset?.symbol || 'UNKNOWN',
      depositTokenAddress: vault.overview?.asset?.address || '',
      network: rowNetworkInfo.name,
      networkIcon: rowNetworkInfo.icon,
      apy: vault.overview?.apy,
      apy7Days: vault.overview?.apy7Days,
      incentives: vault.incentives,
      tvm: tvmValue,
      tvmUsd: tvmUsd.toNumber(),
      isOmniHub: vault.omni?.isHub,
    };
  });
};

const sortVaultRows = (rows: VaultGridRow[], key: SortKey): VaultGridRow[] => {
  return [...rows].sort((a, b) => {
    const aValue = typeof a[key] === 'number' ? (a[key] as number) : -Infinity;
    const bValue = typeof b[key] === 'number' ? (b[key] as number) : -Infinity;
    return bValue - aValue; // desc
  });
};

export const VaultAssetsList = () => {
  const router = useRouter();
  const theme = useTheme();
  const { setSelectedVaultId, chainId, accountAddress } = useVault();

  // View state (grid / list), persisted in localStorage
  const [view, setView] = useState<VaultCardsView>('grid');
  useEffect(() => {
    try {
      const stored = localStorage.getItem(VIEW_STORAGE_KEY);
      if (stored === 'grid' || stored === 'list') setView(stored);
    } catch (e) {
      /* noop */
    }
  }, []);
  const handleViewChange = (next: VaultCardsView) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch (e) {
      /* noop */
    }
  };

  // Filter / sort state (client-side over already-fetched rows)
  const [searchTerm, setSearchTerm] = useState('');
  const [chainFilter, setChainFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('apy7Days');
  const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);

  const deployedVaultsQuery = useDeployedVaults();
  const omniVaultsQuery = useOmniDeployedVaults();
  const rawVaultIds = [...(deployedVaultsQuery?.data ?? []), ...(omniVaultsQuery?.data ?? [])];
  const vaultIds = Array.from(new Set(rawVaultIds.map((v) => v.toLowerCase())));
  // Only block on Flow vault loading — omni vaults are discovered in the background
  // and added to the list incrementally once the multi-chain scan completes.
  const isLoadingVaultIds = deployedVaultsQuery?.isLoading;

  // Only query vaults if vaultIds are available
  const vaultsQuery = useVaultsListData(vaultIds);
  const vaults = vaultsQuery?.data;

  // Get network information dynamically
  const networkInfo = useMemo(() => getNetworkInfo(chainId), [chainId]);

  // Get unique asset addresses for price fetching
  const uniqueAssetAddresses = useMemo(() => {
    if (!vaults) return [];
    const addresses = vaults
      .map((vault) => vault?.overview?.asset?.address)
      .filter(Boolean) as string[];
    return [...new Set(addresses)];
  }, [vaults]);

  // Prefer factory-specific oracles for assets when available
  const preferredOracleByAsset = useMemo(() => {
    const map = new Map<string, string>();
    if (!vaults) return map;
    vaults.forEach((v) => {
      const asset = v?.overview?.asset?.address;
      if (!asset) return;
      const info = getVaultFactoryInfo(chainId, v.id);
      if (info?.oracleAddress) {
        const key = asset.toLowerCase();
        if (!map.has(key)) map.set(key, info.oracleAddress);
      }
    });
    return map;
  }, [vaults, chainId]);

  // Get asset data for all unique assets using preferred oracles
  const assetsDataQuery = useAssetsData(uniqueAssetAddresses, preferredOracleByAsset);

  // Create a map of asset address to price data
  const assetPriceMap = useMemo(() => {
    const map = new Map();
    if (assetsDataQuery.data) {
      assetsDataQuery.data.forEach((assetData) => {
        if (assetData) {
          map.set(assetData.address.toLowerCase(), assetData.price || 0);
        }
      });
    }
    return map;
  }, [assetsDataQuery.data]);

  // Get user vault data to check for deposits
  const userVaultsQuery = useUserVaultsData(accountAddress, vaultIds, {
    enabled: !!accountAddress && vaultIds.length > 0,
  });
  const userVaults = userVaultsQuery?.map((vault) => vault.data) || [];

  // Combined loading state
  const isLoading = isLoadingVaultIds || vaultsQuery?.isLoading || assetsDataQuery.isLoading;

  // User rewards (for the claim affordance)
  const userDataQuery = useUserData(accountAddress);
  const userData = userDataQuery?.data;
  const claimableRewardsUsd = useMemo(
    () =>
      (userData?.userRewards ?? []).reduce(
        (acc: number, reward: RewardItemEnriched) => acc + (reward.rewardAmountToClaimInUSD || 0),
        0
      ),
    [userData]
  );
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const handleOpenRewardModal = () => {
    if (accountAddress) {
      setIsRewardModalOpen(true);
    }
  };

  // Transform all vaults to grid rows
  const allVaultRows = useMemo(() => {
    return transformVaultsToGridRows(vaults || [], userVaults, assetPriceMap, networkInfo);
  }, [vaults, userVaults, assetPriceMap, networkInfo]);

  // Vaults the connected user has deposits in
  const vaultsWithDeposits = useMemo(() => {
    if (!accountAddress) return [] as VaultGridRow[];
    const withDeposits: VaultGridRow[] = [];
    allVaultRows.forEach((row, index) => {
      const userVaultData = userVaults[index];
      const userDeposit = userVaultData?.maxWithdraw || '0';
      const assetDecimals = userVaultData?.assetDecimals || 18;
      const hasDeposit =
        userVaultData &&
        userDeposit.toString() !== '0' &&
        parseFloat(formatUnits(userDeposit.toString(), assetDecimals)) > 0;
      if (hasDeposit) withDeposits.push(row);
    });
    return withDeposits;
  }, [allVaultRows, userVaults, accountAddress]);

  const aggregatedStats = useMemo(
    () =>
      vaults?.length > 0 &&
      vaults.reduce(
        (acc, vault, index) => {
          const assetAddress = vault?.overview?.asset?.address?.toLowerCase();
          const vaultTVLPrice = assetPriceMap.get(assetAddress) || 0;
          const vaultTVLValue =
            Number(
              formatUnits(
                vault?.financials?.liquidity?.totalAssets || 0,
                vault?.overview?.asset?.decimals
              )
            ) * vaultTVLPrice;

          const userVault = userVaults && userVaults[index];
          const userVaultDepositsValue =
            Number(formatUnits(userVault?.maxWithdraw || 0, vault?.overview?.asset?.decimals)) *
            vaultTVLPrice;
          return {
            tvl: acc.tvl.plus(vaultTVLValue),
            userDeposits: acc.userDeposits.plus(userVaultDepositsValue),
          };
        },
        {
          tvl: valueToBigNumber(0),
          userDeposits: valueToBigNumber(0),
        }
      ),
    [vaults, userVaults, assetPriceMap]
  );

  // Available chains for the filter pills (derived from loaded rows)
  const availableChains = useMemo(() => {
    const map = new Map<string, string>();
    allVaultRows.forEach((row) => {
      if (row.network && !map.has(row.network)) map.set(row.network, row.networkIcon);
    });
    return Array.from(map.entries()).map(([name, icon]) => ({ name, icon }));
  }, [allVaultRows]);

  // Apply search + chain filter + sort
  const filteredSortedRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = allVaultRows.filter((row) => {
      const matchesTerm =
        !term ||
        row.vaultName.toLowerCase().includes(term) ||
        (row.curatorName?.toLowerCase().includes(term) ?? false) ||
        row.depositToken.toLowerCase().includes(term);
      const matchesChain = chainFilter === 'all' || row.network === chainFilter;
      return matchesTerm && matchesChain;
    });
    return sortVaultRows(filtered, sortKey);
  }, [allVaultRows, searchTerm, chainFilter, sortKey]);

  const handleVaultClick = (row: VaultGridRow) => {
    setSelectedVaultId(row.id);
    router.push(ROUTES.vaultDetail(row.id));
  };

  const sortLabel = SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? 'APY';

  const mastheadStats: MastheadStat[] = [
    {
      label: 'Total value locked',
      value: isLoading ? (
        <Skeleton width={120} height={34} />
      ) : (
        <FormattedNumber
          value={aggregatedStats?.tvl?.toString() || '0'}
          symbol="USD"
          compact
          variant="main25"
          symbolsVariant="secondary16"
          symbolsColor="text.secondary"
          sx={{ letterSpacing: '-0.02em' }}
        />
      ),
    },
  ];

  // Pill style helper
  const pillSx = (active: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.75,
    height: 36,
    px: 1.75,
    borderRadius: '9999px',
    border: '1px solid',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    userSelect: 'none' as const,
    whiteSpace: 'nowrap' as const,
    transition: 'color 150ms ease, border-color 150ms ease, background-color 150ms ease',
    ...(active
      ? {
          bgcolor: alpha(theme.palette.primary.main, 0.12),
          borderColor: 'primary.main',
          color: 'primary.main',
        }
      : {
          bgcolor: 'background.paper',
          borderColor: 'divider',
          color: 'text.secondary',
          '&:hover': { color: 'text.primary', borderColor: 'text.disabled' },
        }),
  });

  return (
    <Box>
      <PageMasthead
        title="Vaults"
        subtitle="Curated yield strategies on Flow EVM, fully on-chain."
        stats={mastheadStats}
      />

      {/* Reward claim affordance (connected users with claimable rewards) */}
      {accountAddress && claimableRewardsUsd > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            p: 2,
            mb: 3,
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.secondary',
              }}
            >
              Available rewards
            </Typography>
            <FormattedNumber
              value={claimableRewardsUsd}
              symbol="USD"
              compact
              visibleDecimals={2}
              variant="main16"
              symbolsVariant="secondary14"
              symbolsColor="text.secondary"
              sx={{ fontWeight: 700 }}
            />
          </Box>
          <Button variant="gradient" size="small" onClick={handleOpenRewardModal}>
            Claim
          </Button>
        </Box>
      )}

      {/* Filter bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexWrap: 'wrap',
          mb: { xs: 3, md: 2.5 },
        }}
      >
        <SearchInput
          onSearchTermChange={setSearchTerm}
          placeholder="Search vaults, curators…"
          wrapperSx={{
            flex: '1 1 240px',
            maxWidth: { sm: 320 },
            height: 36,
            borderRadius: '9999px',
          }}
        />

        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          <Box sx={pillSx(chainFilter === 'all')} onClick={() => setChainFilter('all')}>
            All chains
          </Box>
          {availableChains.map((chain) => (
            <Box
              key={chain.name}
              sx={pillSx(chainFilter === chain.name)}
              onClick={() => setChainFilter(chain.name)}
            >
              <Box
                component="img"
                src={chain.icon}
                alt=""
                sx={{ width: 16, height: 16, borderRadius: '50%' }}
              />
              {chain.name}
            </Box>
          ))}
        </Box>

        <Box sx={{ ml: { md: 'auto' }, display: 'inline-flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={pillSx(false)}
            onClick={(e) => setSortAnchor(e.currentTarget)}
            aria-haspopup="true"
            role="button"
          >
            <Box component="span" sx={{ color: 'text.disabled' }}>
              Sort
            </Box>
            {sortLabel}
            <ChevronDownIcon style={{ width: 12, height: 12 }} />
          </Box>
          <Menu
            anchorEl={sortAnchor}
            open={Boolean(sortAnchor)}
            onClose={() => setSortAnchor(null)}
          >
            {SORT_OPTIONS.map((option) => (
              <MenuItem
                key={option.key}
                selected={option.key === sortKey}
                onClick={() => {
                  setSortKey(option.key);
                  setSortAnchor(null);
                }}
              >
                {option.label}
              </MenuItem>
            ))}
          </Menu>

          {/* View toggle */}
          <Box
            role="tablist"
            aria-label="Vault layout"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 36,
              p: '3px',
              borderRadius: '9999px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            {(
              [
                { key: 'grid', Icon: ViewGridIcon, label: 'Grid view' },
                { key: 'list', Icon: ViewListIcon, label: 'List view' },
              ] as const
            ).map(({ key, Icon, label }) => {
              const active = view === key;
              return (
                <Box
                  key={key}
                  component="button"
                  aria-label={label}
                  aria-pressed={active}
                  onClick={() => handleViewChange(key)}
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '9999px',
                    border: 0,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 150ms ease, color 150ms ease',
                    bgcolor: active ? 'primary.main' : 'transparent',
                    color: active ? '#fff' : 'text.secondary',
                    '&:hover': { color: active ? '#fff' : 'text.primary' },
                  }}
                >
                  <Icon style={{ width: 14, height: 14 }} />
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* Content */}
      {!isLoading && (!vaults || vaults.length === 0) ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            py: { xs: 4, md: 8 },
            px: { xs: 2, md: 0 },
          }}
        >
          <Typography variant="main16" sx={{ mb: { xs: 3, md: 5 }, textAlign: 'center' }}>
            No vaults found
          </Typography>
          <Typography variant="secondary14" sx={{ textAlign: 'center', mb: 1 }}>
            It looks like you&apos;re connected to the wrong network. Please switch to the correct
            one in your wallet.
          </Typography>
          <Typography variant="secondary14" sx={{ textAlign: 'center' }}>
            Current network: {getChainName(chainId)} ({chainId})
          </Typography>
        </Box>
      ) : (
        <>
          {/* Your deposits (connected users with balances). While loading we
              render the same VaultCards skeletons as the all-vaults grid so the
              section does not pop in once user-deposit data resolves. */}
          {accountAddress && (isLoading || vaultsWithDeposits.length > 0) && (
            <Box sx={{ mb: { xs: 4, md: 5 } }}>
              <Typography
                sx={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 600,
                  fontSize: 18,
                  mb: 2,
                  color: 'text.primary',
                }}
              >
                Your deposits
              </Typography>
              {isLoading ? (
                <VaultCards data={[]} view={view} loading onRowClick={handleVaultClick} />
              ) : (
                <VaultCards data={vaultsWithDeposits} view={view} onRowClick={handleVaultClick} />
              )}
            </Box>
          )}

          {accountAddress && (isLoading || vaultsWithDeposits.length > 0) && (
            <Typography
              sx={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 600,
                fontSize: 18,
                mb: 2,
                color: 'text.primary',
              }}
            >
              All vaults
            </Typography>
          )}

          {!isLoading && filteredSortedRows.length === 0 ? (
            <Typography
              variant="secondary14"
              sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}
            >
              No vaults match your filters.
            </Typography>
          ) : (
            <VaultCards
              data={filteredSortedRows}
              view={view}
              loading={isLoading}
              onRowClick={handleVaultClick}
            />
          )}
        </>
      )}

      {/* Rewards Modal */}
      <VaultsRewardModal
        open={isRewardModalOpen}
        handleClose={() => setIsRewardModalOpen(false)}
        userAddress={accountAddress || ''}
      />
    </Box>
  );
};
