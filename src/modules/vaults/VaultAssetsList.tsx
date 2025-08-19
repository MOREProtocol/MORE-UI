import { Box, Typography, Skeleton, useTheme, useMediaQuery, SvgIcon, Tooltip, Button } from '@mui/material';
import { useRouter } from 'next/router';
import { BigNumber } from 'bignumber.js';
import { formatUnits } from 'ethers/lib/utils';
import { useMemo, useState } from 'react';
import * as allChains from 'viem/chains';
import { ethers } from 'ethers';
import InfoIcon from '@mui/icons-material/InfoOutlined';

import { ROUTES } from 'src/components/primitives/Link';
import { BaseDataGrid } from 'src/components/primitives/DataGrid';
import { useVault, VaultData } from 'src/hooks/vault/useVault';
import { useDeployedVaults, useVaultsListData, useUserVaultsData, useAssetsData, useUserPortfolioMetrics, useUserData } from 'src/hooks/vault/useVaultData';
import type { RewardItemEnriched } from 'src/hooks/vault/useVaultData';
import { getNetworkConfig } from 'src/utils/marketsAndNetworksConfig';

import { getStandardVaultColumns, getUserVaultColumns, DepositActionCell, ManageActionCell, VaultGridRow } from './VaultDataGridColumns';
import { PnLChart } from '../charts/PnLChart';
import { LineChart } from '../charts/LineChart';
import { TimePeriod } from '../charts/timePeriods';
import { valueToBigNumber } from '@aave/math-utils';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
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

    // Get vault TVM
    const totalAssetsString = vault?.financials?.liquidity?.totalSupply?.toString() || '0';
    const tvmValue = formatUnits(totalAssetsString, vaultDecimals);
    const tvmUsd = new BigNumber(tvmValue).multipliedBy(assetPrice);

    return {
      id: vault.id,
      vaultName: vault.overview?.name || 'Unnamed Vault',
      curatorLogo: vault.overview?.curatorLogo,
      curatorName: vault.overview?.curatorName,
      myDeposit: userDepositFormatted,
      myDepositUsd: userDepositUsd?.toString(),
      depositToken: vault.overview?.asset?.symbol || 'UNKNOWN',
      depositTokenSymbol: vault.overview?.asset?.symbol || 'UNKNOWN',
      depositTokenAddress: vault.overview?.asset?.address || '',
      network: networkInfo.name,
      networkIcon: networkInfo.icon,
      apy: vault.overview?.apy,
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

  const [selectedChartDataKey, setSelectedChartDataKey] = useState<'portfolioValue' | 'pnl'>('portfolioValue');
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('3m');

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

  // Get asset data for all unique assets
  const assetsDataQuery = useAssetsData(uniqueAssetAddresses);

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

  // Get portfolio metrics for charts
  const portfolioMetricsQuery = useUserPortfolioMetrics(accountAddress || '', selectedPeriod, {
    enabled: !!accountAddress
  });
  const portfolioMetrics = portfolioMetricsQuery?.data;
  const isLoadingPortfolioMetrics = portfolioMetricsQuery?.isLoading;
  const isInitialLoadingPortfolioMetrics = isLoadingPortfolioMetrics && !portfolioMetrics;

  // Combined loading state
  const isLoading = isLoadingVaultIds || isLoadingVaults || assetsDataQuery.isLoading;

  // Positions APY computed in useUserPortfolioMetrics
  const positionsApy = portfolioMetrics?.positionsApy;

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
    render: (row: VaultGridRow) => <DepositActionCell onDeposit={() => handleVaultClick(row)} />,
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
        px: { xs: 2, sm: 4, md: 6 },
        pb: { xs: 4, md: 8 }
      }}
    >
      {/* <Box
        sx={{
          display: 'flex',
          justifyContent: isMobile ? 'space-between' : 'flex-start',
          alignItems: isMobile ? 'stretch' : 'flex-start',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 3 : 0,
          mb: { xs: 6, md: 4 }
        }}
      >
        <VaultStatsWidget />
      </Box> */}
      {/* Portfolio Charts Section - Only show when user is connected and has data */}
      {accountAddress && vaultsWithDeposits.length > 0 && (
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
                textAlign: isMobile ? 'center' : 'left',
                color: 'primary.main'
              }}
            >
              My Vaults
            </Typography>
          </Box>
          <Box sx={{
            display: 'flex',
            alignItems: 'left',
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 2, md: 5 },
            mt: 4,
          }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 3 }}>
              <Box
                sx={{
                  display: 'grid',
                  gap: { xs: 3, md: 4 },
                  mb: { xs: 4, md: 0 },
                  height: '100%',
                }}
              >
                {/* KPI Grid - align with VaultDetail left metrics */}
                <Box
                  sx={{
                    backgroundColor: 'background.paper',
                    borderRadius: 2,
                    p: { xs: 4, md: 6 },
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', xsm: '1fr 1fr' },
                    gap: 3,
                  }}
                >

                  {/* Realized P&L */}
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="secondary14" color="text.secondary">
                        Realized P&L
                      </Typography>
                      <Tooltip
                        title={
                          <Box>
                            <Typography variant="main12" sx={{ fontWeight: 600 }}>
                              Last update
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="secondary12" sx={{ color: '#F1F1F3' }}>
                                {portfolioMetrics?.lastUpdatedTimestamp
                                  ? new Date(portfolioMetrics.lastUpdatedTimestamp * 1000).toLocaleString()
                                  : '-'}
                              </Typography>
                            </Box>
                          </Box>
                        }
                        arrow
                        placement="top"
                      >
                        <InfoIcon sx={{ fontSize: '14px', color: 'text.secondary' }} />
                      </Tooltip>
                    </Box>
                    {isInitialLoadingPortfolioMetrics ? (
                      <Skeleton width={80} height={24} />
                    ) : portfolioMetrics ? (
                      <FormattedNumber
                        value={portfolioMetrics?.totalRealizedPnLUSD || '0'}
                        symbol="USD"
                        variant="main16"
                        sx={{ fontWeight: 800 }}
                      />
                    ) : (
                      <Typography variant="main16">–</Typography>
                    )}
                  </Box>

                  {/* Unrealized P&L */}
                  <Box>
                    <Typography variant="secondary14" color="text.secondary">
                      Unrealized P&L
                    </Typography>
                    {isInitialLoadingPortfolioMetrics ? (
                      <Skeleton width={80} height={24} />
                    ) : portfolioMetrics ? (
                      <FormattedNumber
                        value={portfolioMetrics?.totalUnrealizedPnLUSD || '0'}
                        symbol="USD"
                        variant="main16"
                        sx={{ fontWeight: 800 }}
                      />
                    ) : (
                      <Typography variant="main16">–</Typography>
                    )}
                  </Box>

                  <Box>
                    <Typography variant="secondary14" color="text.secondary">
                      Positions APY
                    </Typography>
                    {isInitialLoadingPortfolioMetrics || isLoadingVaults ? (
                      <Skeleton width={80} height={24} />
                    ) : (!accountAddress || positionsApy === undefined || !portfolioMetrics) ? (
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
            </Box>

            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              flex: 5,
              backgroundColor: 'background.paper',
              borderRadius: 2,
              position: 'relative'
            }}>
              <Box sx={{
                position: 'absolute',
                top: { xs: 8, md: 12 },
                left: { xs: 8, md: 12 },
                zIndex: 10,
                display: 'flex',
                alignItems: 'left',
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: { xs: 2, sm: 3 },
                px: { xs: 2, md: 3 },
                py: { xs: 1, md: 2 },
              }}>
                <Box sx={{ display: 'flex', alignItems: 'left', flexDirection: 'column', gap: 0 }}>
                  <Typography variant="secondary14" color="text.secondary">My Deposits</Typography>
                  <Box
                    onClick={() => setSelectedChartDataKey('portfolioValue')}
                    sx={{
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      flexDirection: 'row',
                      gap: 1,
                      border: isLoading ? 'none' : selectedChartDataKey === 'portfolioValue' ? '1.5px solid #FF9900' : '1.5px solid #E0E0E0',
                      borderRadius: '6px',
                      padding: '2px 6px',
                      width: 'fit-content',
                      backgroundColor: 'rgba(255, 255, 255, 0.5)',
                      backdropFilter: 'blur(2px)',
                      '&:hover': {
                        backgroundColor: theme.palette.background.surface,
                        border: `1.5px solid ${theme.palette.text.muted}`,
                      },
                    }}>
                    {isLoading ? <Skeleton width={60} height={24} /> : <>
                      <FormattedNumber
                        value={aggregatedStats?.userDeposits?.toString() || '0'}
                        symbol="USD"
                        variant="main16"
                        sx={{ fontWeight: 800 }}
                      />
                      <SvgIcon sx={{
                        fontSize: '20px',
                        color: selectedChartDataKey === 'portfolioValue' ? "#FF9900" : theme.palette.text.muted,
                      }}
                      >
                        <ShowChartIcon />
                      </SvgIcon>
                    </>
                    }
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'left', flexDirection: 'column', gap: 0 }}>
                  <Typography variant="secondary14" color="text.secondary">My P&L</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'left', flexDirection: 'row', gap: 1 }}>
                    <Box
                      onClick={() => setSelectedChartDataKey('pnl')}
                      sx={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        flexDirection: 'row',
                        gap: 1,
                        border: isLoading ? 'none' : selectedChartDataKey === 'pnl' ? '1.5px solid #FF9900' : '1.5px solid #E0E0E0',
                        borderRadius: '6px',
                        padding: '2px 6px',
                        width: 'fit-content',
                        backgroundColor: 'rgba(255, 255, 255, 0.5)',
                        backdropFilter: 'blur(2px)',
                        '&:hover': {
                          backgroundColor: theme.palette.background.surface,
                          border: `1.5px solid ${theme.palette.text.muted}`,
                        },
                      }}>
                      {isInitialLoadingPortfolioMetrics ? <Skeleton width={60} height={24} /> : <>
                        <FormattedNumber
                          value={portfolioMetrics.totalUnrealizedPnLUSD || '0'}
                          symbol="USD"
                          variant="main16"
                          sx={{ fontWeight: 800 }}
                        />
                        <SvgIcon sx={{
                          fontSize: '20px',
                          color: selectedChartDataKey === 'pnl' ? "#FF9900" : theme.palette.text.muted,
                        }}
                        >
                          <ShowChartIcon />
                        </SvgIcon>
                      </>
                      }
                    </Box>
                  </Box>
                </Box>
              </Box>
              <Box sx={{
                backgroundColor: 'background.paper',
                py: { xs: 2, md: 6 },
                pl: { xs: 2, md: 6 },
                borderRadius: 2,
              }}>
                {isInitialLoadingPortfolioMetrics ? (
                  <Skeleton variant="rectangular" width="100%" height={250} />
                ) : selectedChartDataKey === "portfolioValue" ? (
                  portfolioMetrics?.dailyAmountEvolution && portfolioMetrics?.dailyAmountEvolution?.length > 0 ? (
                    <LineChart
                      data={portfolioMetrics?.dailyAmountEvolution}
                      height={isMobile ? 200 : 250}
                      isInteractive={true}
                      isSmall={isMobile}
                      yAxisFormat="USD"
                      showTimePeriodSelector={true}
                      selectedPeriod={selectedPeriod}
                      onPeriodChange={setSelectedPeriod}
                    />
                  ) : (
                    <Typography sx={{ textAlign: 'center', pt: 20 }}>
                      No historical data available for Portfolio Value.
                    </Typography>
                  )) : (
                  portfolioMetrics?.dailyPnLEvolution && portfolioMetrics?.dailyPnLEvolution?.length > 0 ? (
                    <PnLChart
                      data={portfolioMetrics?.dailyPnLEvolution}
                      percentData={portfolioMetrics?.dailyPnLPercentEvolution}
                      height={isMobile ? 200 : 250}
                      isInteractive={true}
                      isSmall={isMobile}
                      topOffset={50}
                      showTimePeriodSelector={true}
                      selectedPeriod={selectedPeriod}
                      onPeriodChange={setSelectedPeriod}
                    />
                  ) : (
                    <Typography sx={{ textAlign: 'center', pt: 20 }}>
                      No historical data available for P&L.
                    </Typography>
                  ))
                }
              </Box>
            </Box>
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
          {/* My Vaults Section (shown only if user has deposits) */}
          {accountAddress && vaultsWithDeposits.length > 0 && (
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
                <Typography variant="secondary14" color="text.primary" sx={{ pb: 1 }}>
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
