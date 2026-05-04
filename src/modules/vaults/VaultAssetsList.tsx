import { Box, Typography, Skeleton, useTheme, useMediaQuery, Button, alpha, Chip } from '@mui/material';
import { useRouter } from 'next/router';
import { BigNumber } from 'bignumber.js';
import { formatUnits } from 'ethers/lib/utils';
import { useMemo, useState } from 'react';
import * as allChains from 'viem/chains';
import { ethers } from 'ethers';

import { ROUTES } from 'src/components/primitives/Link';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { useVault, VaultData } from 'src/hooks/vault/useVault';
import { useDeployedVaults, useVaultsListData, useUserVaultsData, useAssetsData, useUserData, useOmniDeployedVaults } from 'src/hooks/vault/useVaultData';
import { getVaultFactoryInfo } from 'src/hooks/vault/factoryRegistry';
import type { RewardItemEnriched } from 'src/hooks/vault/useVaultData';
import { getNetworkConfig } from 'src/utils/marketsAndNetworksConfig';

import { VaultGridRow } from './VaultDataGridColumns';
import { FlowVaultsList } from './FlowVaultsList';
import { VaultCard } from './VaultCard';
import { valueToBigNumber } from '@aave/math-utils';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
// import { PortfolioChartsSection } from './PortfolioChartsSection';
import { VaultsRewardModal } from './VaultsRewardModal';

// Helper function to get network information from chainId
const getNetworkInfo = (chainId: number) => {
  try {
    const networkConfig = getNetworkConfig(chainId);
    return {
      name: networkConfig.displayName || networkConfig.name || 'Unknown Network',
      icon: networkConfig.networkLogoPath || '/icons/networks/flow.svg'
    };
  } catch (error) {
    console.warn(`Unknown chainId: ${chainId}, falling back to Flow`);
    return {
      name: 'Unknown Network',
      icon: '/icons/networks/flow.svg'
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
  userVaultsData: Array<{ maxWithdraw: ethers.BigNumber; decimals: number; assetDecimals: number } | undefined> | undefined,
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
    const userDepositFormatted = userVaultData ? formatUnits(userDeposit.toString(), assetDecimals) : undefined;
    const userDepositUsd = userDepositFormatted ? new BigNumber(userDepositFormatted).multipliedBy(assetPrice) : undefined;

    // TVM: totalSupply (shares) * sharePrice (asset/share) * asset USD
    const totalSupplyShares = vault?.financials?.liquidity?.totalSupply?.toString() || '0';
    const shares = new BigNumber(formatUnits(totalSupplyShares, vaultDecimals));
    const sharePriceAsset = new BigNumber(vault?.overview?.sharePrice || 0);
    const tvmAsset = shares.multipliedBy(sharePriceAsset);
    const tvmUsd = tvmAsset.multipliedBy(assetPrice);
    const tvmValue = tvmAsset.toString();

    // Use vault-specific network info if the vault has a chainId
    const vaultChainId = vault.chainId;
    const rowNetworkInfo = vaultChainId ? (() => {
      try { return getNetworkInfo(vaultChainId); } catch { return networkInfo; }
    })() : networkInfo;

    return {
      id: vault.id,
      vaultName: vault.overview?.name || 'Unnamed Vault',
      curatorLogo: vault.overview?.curatorLogo,
      curatorName: vault.overview?.curatorName,
      myDeposit: userDepositFormatted,
      myDepositUsd: userDepositUsd?.toString(),
      depositToken: (vault.overview?.depositableAssets && vault.overview.depositableAssets.length > 0
        ? (vault.overview.depositableAssets.map((a) => a.symbol).filter(Boolean).join(', ') || vault.overview?.asset?.symbol || 'UNKNOWN')
        : (vault.overview?.asset?.symbol || 'UNKNOWN')
      ),
      depositTokenSymbols: (vault.overview?.depositableAssets && vault.overview.depositableAssets.length > 0
        ? vault.overview.depositableAssets.map((a) => a.symbol || '').filter(Boolean)
        : [vault.overview?.asset?.symbol || 'UNKNOWN']
      ),
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
      chainId: vaultChainId,
      sharePriceHistory: vault.overview?.historicalSnapshots?.sharePrice,
    };
  });
};

export const VaultAssetsList = () => {
  const router = useRouter();
  const theme = useTheme();
  const { setSelectedVaultId, chainId, accountAddress } = useVault();

  // Mobile detection
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const deployedVaultsQuery = useDeployedVaults();
  const omniVaultsQuery = useOmniDeployedVaults();
  const rawVaultIds = [
    ...(deployedVaultsQuery?.data ?? []),
    ...(omniVaultsQuery?.data ?? []),
  ];
  const vaultIds = Array.from(new Set(rawVaultIds.map(v => v.toLowerCase())));
  // Only block on Flow vault loading — omni vaults are discovered in the background
  // and added to the list incrementally once the multi-chain scan completes.
  const isLoadingVaultIds = deployedVaultsQuery?.isLoading;

  // Only query vaults if vaultIds are available
  const vaultsQuery = useVaultsListData(vaultIds);
  const isLoadingVaults = vaultsQuery?.isLoading;
  const vaults = vaultsQuery?.data;

  // Get network information dynamically
  const networkInfo = useMemo(() => getNetworkInfo(chainId), [chainId]);

  // Get unique asset addresses for price fetching
  const uniqueAssetAddresses = useMemo(() => {
    if (!vaults) return [];
    const addresses = vaults
      .map(vault => vault?.overview?.asset?.address)
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
    enabled: !!accountAddress && vaultIds.length > 0
  });
  const userVaults = userVaultsQuery?.map(vault => vault.data) || [];
  const isLoadingUserVaults = userVaultsQuery?.some(vault => vault.isLoading);

  // Combined loading state
  const isLoading = isLoadingVaultIds || isLoadingVaults || assetsDataQuery.isLoading;

  // Positions APY computed locally as USD-weighted average of user's current exposures
  // TODO: use useUserPortfolioMetrics instead if PortfolioChartsSection is used
  const positionsApy = useMemo(() => {
    if (!accountAddress || !vaults || !userVaults?.length) return undefined;
    const rows = vaults.map((vault, index) => {
      const userVaultData = userVaults[index];
      if (!vault || !userVaultData) return null;
      const assetAddress = vault?.overview?.asset?.address?.toLowerCase();
      const assetDecimals = vault?.overview?.asset?.decimals || 18;
      const price = assetAddress ? (assetPriceMap.get(assetAddress) || 0) : 0;
      const userDeposit = userVaultData?.maxWithdraw || '0';
      const deposit = parseFloat(formatUnits(userDeposit.toString(), assetDecimals));
      const balanceUsd = deposit * price;
      const apy = vault?.overview?.apy;
      return balanceUsd > 0 && typeof apy === 'number' ? { balanceUsd, apy } : null;
    }).filter(Boolean) as { balanceUsd: number; apy: number }[];
    const total = rows.reduce((sum, r) => sum + r.balanceUsd, 0);
    if (!Number.isFinite(total) || total <= 0) return undefined;
    const weighted = rows.reduce((sum, r) => sum + (r.balanceUsd / total) * r.apy, 0);
    return Number.isFinite(weighted) ? weighted : undefined;
  }, [accountAddress, vaults, userVaults, assetPriceMap]);

  // User rewards (for Available Rewards KPI)
  const userDataQuery = useUserData(accountAddress);
  const userData = userDataQuery?.data;
  const claimableRewardsUsd = useMemo(
    () => (userData?.userRewards ?? []).reduce((acc: number, reward: RewardItemEnriched) => acc + (reward.rewardAmountToClaimInUSD || 0), 0),
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

  // Filter vaults based on user deposits
  const { vaultsWithDeposits } = useMemo(() => {
    if (!accountAddress) {
      return {
        vaultsWithDeposits: [],
      };
    }

    const withDeposits: VaultGridRow[] = [];

    allVaultRows.forEach((row, index) => {
      const userVaultData = userVaults[index];
      const userDeposit = userVaultData?.maxWithdraw || '0';
      const assetDecimals = userVaultData?.assetDecimals || 18;
      const hasDeposit = userVaultData && userDeposit.toString() !== '0' &&
        parseFloat(formatUnits(userDeposit.toString(), assetDecimals)) > 0;

      if (hasDeposit) {
        withDeposits.push(row);
      }
    });

    return {
      vaultsWithDeposits: withDeposits,
    } as { vaultsWithDeposits: VaultGridRow[] };
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
            Number(
              formatUnits(userVault?.maxWithdraw || 0, vault?.overview?.asset?.decimals)
            ) * vaultTVLPrice;
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

  const handleVaultClick = (row: VaultGridRow) => {
    setSelectedVaultId(row.id);
    router.push(ROUTES.vaultDetail(row.id));
  };

  return (
    <Box
      sx={{
        mt: { xs: 1, md: 2 },
        px: { xs: 2, sm: 4, md: 2 },
        pb: { xs: 4, md: 8 }
      }}
    >
      {/* Hero plate — shown when user has deposits and theme is not flow */}
      {accountAddress && vaultsWithDeposits.length > 0 && process.env.NEXT_PUBLIC_UI_THEME !== 'flow' && (
        <Box
          sx={(theme) => ({
            background: alpha(theme.palette.background.paper, 1),
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '12px',
            p: { xs: 3, md: '28px 32px' },
            mb: { xs: 4, md: 5 },
          })}
        >
          {/* Headline + KPIs row */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'flex-end' },
              gap: 3,
            }}
          >
            <Box>
              <Typography
                variant="secondary12"
                color="text.secondary"
                sx={{ textTransform: 'uppercase', letterSpacing: '.1em', mb: 1.25 }}
              >
                YOUR POSITIONS · VAULTS
              </Typography>
              <Typography
                sx={(theme) => ({
                  fontFamily: "'Instrument Sans', sans-serif",
                  fontSize: { xs: 26, md: 34 },
                  fontWeight: 400,
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                  color: theme.palette.text.primary,
                })}
              >
                Earning{' '}
                <Box
                  component="span"
                  sx={(theme) => ({
                    background: theme.palette.gradients.newGradient,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  })}
                >
                  {isLoadingVaults ? '…' : positionsApy !== undefined
                    ? `${(positionsApy * 100).toFixed(2)}%`
                    : '—'}
                </Box>{' '}
                APY
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: { xs: 4, md: 6 } }}>
              <Box>
                <Typography variant="secondary12" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '.07em' }}>
                  AVAILABLE REWARDS
                </Typography>
                {(!accountAddress || claimableRewardsUsd === 0) ? (
                  <Typography variant="main16" sx={{ mt: 0.5 }}>–</Typography>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <FormattedNumber
                      value={claimableRewardsUsd}
                      variant="main16"
                      visibleDecimals={2}
                      compact
                      symbol="USD"
                      symbolsColor="#A5A8B6"
                      symbolsVariant="secondary16"
                      sx={{ fontWeight: 700 }}
                    />
                    <Button
                      variant="gradient"
                      size="small"
                      onClick={handleOpenRewardModal}
                      sx={{ minWidth: 'unset' }}
                    >
                      Claim
                    </Button>
                  </Box>
                )}
              </Box>

              <Box>
                <Typography variant="secondary12" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '.07em' }}>
                  AGGREGATE DEPOSIT
                </Typography>
                {isLoadingVaults ? (
                  <Skeleton width={80} height={24} sx={{ mt: 0.5 }} />
                ) : (
                  <FormattedNumber
                    value={aggregatedStats ? aggregatedStats.userDeposits.toString() : '0'}
                    symbol="USD"
                    variant="main16"
                    visibleDecimals={2}
                    compact
                    symbolsVariant="secondary16"
                    sx={{ fontWeight: 700, mt: 0.5 }}
                  />
                )}
              </Box>
            </Box>
          </Box>

          {/* Vault position strips */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 3 }}>
            {(isLoading || isLoadingUserVaults
              ? Array.from({ length: 2 })
              : vaultsWithDeposits
            ).map((row, i) => {
              const isRowLoading = isLoading || isLoadingUserVaults || !row;
              const typedRow = row as VaultGridRow | undefined;
              const apy = typedRow?.apy7Days ?? typedRow?.apy;
              const apyPositive = apy === undefined || apy >= 0;
              const symbols = typedRow?.depositTokenSymbols?.length
                ? typedRow.depositTokenSymbols
                : typedRow?.depositTokenSymbol
                ? [typedRow.depositTokenSymbol]
                : [];

              return (
                <Box
                  key={isRowLoading ? i : typedRow!.id}
                  onClick={() => !isRowLoading && typedRow && handleVaultClick(typedRow)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    p: '14px 18px',
                    bgcolor: 'background.surface',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '10px',
                    cursor: isRowLoading ? 'default' : 'pointer',
                    transition: 'border-color 0.15s ease',
                    '&:hover': isRowLoading ? {} : { borderColor: 'rgba(245,132,32,.3)' },
                  }}
                >
                  {/* Left: token icons + vault info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    {isRowLoading ? (
                      <Skeleton variant="circular" width={32} height={32} />
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {symbols.slice(0, 3).map((sym, idx) => (
                          <TokenIcon
                            key={`${sym}-${idx}`}
                            symbol={sym}
                            sx={{ fontSize: '32px', ml: idx > 0 ? '-10px' : 0, zIndex: 3 - idx, position: 'relative' }}
                          />
                        ))}
                      </Box>
                    )}
                    <Box sx={{ minWidth: 0 }}>
                      {isRowLoading ? (
                        <>
                          <Skeleton width={140} height={16} />
                          <Skeleton width={100} height={13} sx={{ mt: 0.5 }} />
                        </>
                      ) : (
                        <>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                              {typedRow!.vaultName}
                            </Typography>
                            {typedRow!.isOmniHub && (
                              <Chip
                                label="omnichain"
                                size="small"
                                sx={(theme) => ({
                                  height: 18,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  background: theme.palette.gradients.newGradient,
                                  color: '#fff',
                                  border: 'none',
                                })}
                              />
                            )}
                          </Box>
                          <Typography variant="secondary12" color="text.secondary" sx={{ mt: 0.25 }}>
                            Deposited{' '}
                            {typedRow!.myDeposit
                              ? `${parseFloat(typedRow!.myDeposit).toPrecision(4)} ${typedRow!.depositToken}`
                              : '—'}
                            {typedRow!.myDepositUsd && ` · $${parseFloat(typedRow!.myDepositUsd).toFixed(2)}`}
                          </Typography>
                        </>
                      )}
                    </Box>
                  </Box>

                  {/* Right: APY + Manage */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                    {isRowLoading ? (
                      <Skeleton width={64} height={24} />
                    ) : (
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'text.secondary' }}>
                          7D APY
                        </Typography>
                        {apy !== undefined ? (
                          <FormattedNumber
                            value={apy}
                            percent
                            variant="main16"
                            sx={{ fontWeight: 700, color: apyPositive ? '#FFA94A' : 'error.main' }}
                          />
                        ) : (
                          <Typography variant="main16" color="text.secondary">—</Typography>
                        )}
                      </Box>
                    )}
                    {isRowLoading ? (
                      <Skeleton variant="rectangular" width={82} height={32} sx={{ borderRadius: '10px' }} />
                    ) : (
                      <Button
                        variant="soft"
                        size="small"
                        onClick={(e) => { e.stopPropagation(); typedRow && handleVaultClick(typedRow); }}
                      >
                        Manage →
                      </Button>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {(!vaults || vaults?.length === 0) && !isLoading ? (
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          py: { xs: 4, md: 8 },
          px: { xs: 2, md: 0 }
        }}>
          <Typography
            variant={isSmallMobile ? "main16" : "main14"}
            sx={{ mb: { xs: 3, md: 5 }, textAlign: 'center' }}
          >
            No vaults found
          </Typography>
          <Typography
            variant="secondary14"
            sx={{ textAlign: 'center', mb: 1 }}
          >
            It looks like you&apos;re connected to the wrong network. Please switch to the correct one in your wallet.
          </Typography>
          <Typography
            variant="secondary14"
            sx={{ textAlign: 'center' }}
          >
            Current network: {getChainName(chainId)} ({chainId})
          </Typography>
        </Box>
      ) : (
        <>
          {/* All Vaults Section */}
          <Box>
            {/* Section header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                mb: { xs: 2.5, md: 3 },
              }}
            >
              <Typography variant={isMobile ? 'main16' : 'main21'} color="text.primary">
                All Vaults
              </Typography>
              {!isLoading && allVaultRows.length > 0 && (
                <Box
                  sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.surface',
                  }}
                >
                  <Typography variant="secondary12" color="text.secondary">
                    {allVaultRows.length}
                  </Typography>
                </Box>
              )}
              <Box sx={{ flexGrow: 1 }} />
              <Box
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.surface',
                }}
              >
                <Typography variant="secondary12" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                  TVL ·{' '}
                  {isLoading ? '…' : (
                    <FormattedNumber
                      value={aggregatedStats?.tvl?.toString() || '0'}
                      symbol="USD"
                      compact
                      variant="secondary12"
                      color="text.secondary"
                      component="span"
                    />
                  )}
                </Typography>
              </Box>
            </Box>

            {/* Vault list (flow theme keeps its own component) */}
            {process.env.NEXT_PUBLIC_UI_THEME === 'flow' ? (
              <FlowVaultsList
                data={allVaultRows}
                loading={isLoading}
                onRowClick={handleVaultClick}
                defaultSortColumn="tvmUsd"
                defaultSortOrder="desc"
              />
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  columnGap: { xs: 3, md: 5 },
                  rowGap: { xs: 3, md: 5 },
                }}
              >
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <VaultCard key={i} loading />
                    ))
                  : allVaultRows.map((row) => (
                      <VaultCard
                        key={row.id}
                        row={row}
                        onClick={() => handleVaultClick(row)}
                        onDeposit={() => handleVaultClick(row)}
                        disabled={!accountAddress}
                      />
                    ))}
              </Box>
            )}
          </Box>
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
