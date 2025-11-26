import { Box, Typography, Skeleton, useTheme, useMediaQuery, Button } from '@mui/material';
import { useRouter } from 'next/router';
import { BigNumber } from 'bignumber.js';
import { formatUnits } from 'ethers/lib/utils';
import { useMemo, useState } from 'react';
import * as allChains from 'viem/chains';
import { ethers } from 'ethers';

import { ROUTES } from 'src/components/primitives/Link';
import { BaseDataGrid } from 'src/components/primitives/DataGrid';
import { useVault, VaultData } from 'src/hooks/vault/useVault';
import { useDeployedVaults, useVaultsListData, useUserVaultsData, useAssetsData, useUserData } from 'src/hooks/vault/useVaultData';
import { getVaultFactoryInfo } from 'src/hooks/vault/factoryRegistry';
import type { RewardItemEnriched } from 'src/hooks/vault/useVaultData';
import { getNetworkConfig } from 'src/utils/marketsAndNetworksConfig';

import { getStandardVaultColumns, getUserVaultColumns, DepositActionCell, ManageActionCell, VaultGridRow } from './VaultDataGridColumns';
import { FlowVaultsList } from './FlowVaultsList';
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
      network: networkInfo.name,
      networkIcon: networkInfo.icon,
      apy: vault.overview?.apy,
      apy7Days: vault.overview?.apy7Days,
      incentives: vault.incentives,
      tvm: tvmValue,
      tvmUsd: tvmUsd.toNumber(),
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
  const rawVaultIds = deployedVaultsQuery?.data || [];
  const vaultIds = Array.from(new Set(rawVaultIds));
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

  // Column configurations
  const standardColumns = getStandardVaultColumns(isMobile);
  const userColumns = getUserVaultColumns(isMobile);

  const depositActionColumn = {
    render: (row: VaultGridRow) => (
      <DepositActionCell
        onDeposit={() => handleVaultClick(row)}
        disabled={!accountAddress}
      />
    ),
    skeletonRender: () => <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} />,
  };

  const manageActionColumn = {
    render: (row: VaultGridRow) => <ManageActionCell onManage={() => handleVaultClick(row)} />,
    skeletonRender: () => <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} />,
  };

  return (
    <Box
      sx={{
        mt: { xs: 1, md: 2 },
        px: { xs: 2, sm: 4, md: 2 },
        pb: { xs: 4, md: 8 }
      }}
    >
      {/* Portfolio Charts Section - Only show when user is connected, has data, and theme is not flow */}
      {accountAddress && vaultsWithDeposits.length > 0 && process.env.NEXT_PUBLIC_UI_THEME !== 'flow' && (
        <Box sx={{ mb: { xs: 4, md: 6 } }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'background.surface',
            p: 3,
            borderRadius: 2,
            mb: { xs: 4, md: 6 }
          }}>
            <Typography
              variant={isMobile ? "main16" : "main21"}
              sx={{
                textAlign: { xs: 'center', md: 'left' },
                color: 'primary.main'
              }}
            >
              My Vaults
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'top', gap: { xs: 2, md: 5 } }}>
              <Box>
                <Typography variant="secondary14" color="text.secondary">
                  Positions APY
                </Typography>
                {isLoadingVaults ? (
                  <Skeleton width={80} height={24} />
                ) : (!accountAddress || positionsApy === undefined) ? (
                  <Typography variant="main16">–</Typography>
                ) : (
                  <FormattedNumber
                    value={positionsApy}
                    percent
                    variant="main16"
                    sx={{ fontWeight: 800 }}
                  />
                )}
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'left' }}>
                <Typography variant="secondary14" color="text.secondary" sx={{ mb: 1 }}>
                  Available Rewards
                </Typography>
                {(!accountAddress || claimableRewardsUsd === 0) ? (
                  <Typography variant="main16">–</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                    <FormattedNumber
                      value={claimableRewardsUsd}
                      variant="main16"
                      visibleDecimals={2}
                      compact
                      symbol="USD"
                      symbolsColor="#A5A8B6"
                      symbolsVariant="secondary16"
                    />
                    <Button
                      variant="gradient"
                      size="small"
                      onClick={handleOpenRewardModal}
                      sx={{ minWidth: 'unset', ml: { xs: 0, xsm: 2 } }}
                    >
                      Claim
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
          {/* <PortfolioChartsSection
            accountAddress={accountAddress}
            aggregatedUserDepositsUsd={aggregatedStats?.userDeposits?.toString() || '0'}
            positionsApy={positionsApy}
            isLoadingVaults={isLoadingVaults || false}
            isLoading={isLoading}
            claimableRewardsUsd={claimableRewardsUsd}
            onOpenRewardModal={handleOpenRewardModal}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          /> */}
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
          {/* My Vaults Section (shown only if user has deposits and theme is not flow) */}
          {accountAddress && vaultsWithDeposits.length > 0 && process.env.NEXT_PUBLIC_UI_THEME !== 'flow' && (
            <Box sx={{ mb: { xs: 4, md: 6 } }}>
              <Box
                sx={{
                  overflowX: isMobile ? 'auto' : 'visible',
                  '& .MuiTableContainer-root': {
                    minWidth: isMobile ? '800px' : 'auto'
                  }
                }}
              >
                <BaseDataGrid
                  data={vaultsWithDeposits}
                  columns={userColumns}
                  loading={isLoading || isLoadingUserVaults}
                  onRowClick={handleVaultClick}
                  defaultSortColumn="myDeposit"
                  defaultSortOrder="desc"
                  actionColumn={manageActionColumn}
                  rowIdGetter={(row) => row.id}
                />
              </Box>
            </Box>
          )}

          {/* All Vaults Section (always rendered, includes user's vaults as well) */}
          <Box>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'background.surface',
              p: 3,
              borderRadius: 2,
              mb: { xs: 4, md: 6 }
            }}>
              <Typography
                variant={isMobile ? "main16" : "main21"}
                sx={{
                  textAlign: isMobile ? 'center' : 'left',
                  color: 'primary.main'
                }}
              >
                All Vaults
              </Typography>
              <Box>
                <Typography variant="secondary14" color="text.secondary" sx={{ pb: 1 }}>
                  Total Value Locked
                </Typography>
                {isLoading ? (
                  <Skeleton width={100} height={24} />
                ) : (
                  <FormattedNumber
                    value={aggregatedStats?.tvl?.toString() || '0'}
                    symbol="USD"
                    symbolsVariant="secondary16"
                    symbolsColor="text.secondary"
                    variant="main16"
                    sx={{ fontWeight: 800 }}
                  />
                )}
              </Box>
            </Box>
            <Box
              sx={{
                overflowX: isMobile ? 'auto' : 'visible',
                '& .MuiTableContainer-root': {
                  minWidth: isMobile ? '800px' : 'auto'
                }
              }}
            >
              {process.env.NEXT_PUBLIC_UI_THEME === 'flow' ? (
                <FlowVaultsList
                  data={allVaultRows}
                  loading={isLoading}
                  onRowClick={handleVaultClick}
                  defaultSortColumn="tvmUsd"
                  defaultSortOrder="desc"
                />
              ) : (
                <BaseDataGrid
                  data={allVaultRows}
                  columns={standardColumns}
                  loading={isLoading}
                  onRowClick={handleVaultClick}
                  defaultSortColumn="tvmUsd"
                  defaultSortOrder="desc"
                  actionColumn={depositActionColumn}
                  rowIdGetter={(row) => row.id}
                />
              )}
            </Box>
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
