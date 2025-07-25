import { Box, Typography, Skeleton, useTheme, useMediaQuery } from '@mui/material';
import { useRouter } from 'next/router';
import { BigNumber } from 'bignumber.js';
import { formatUnits } from 'ethers/lib/utils';
import { useMemo } from 'react';
import * as allChains from 'viem/chains';
import { ethers } from 'ethers';

import { ROUTES } from 'src/components/primitives/Link';
import { BaseDataGrid } from 'src/components/primitives/DataGrid';
import { useVault, VaultData } from 'src/hooks/vault/useVault';
import { useDeployedVaults, useVaultsListData, useUserVaultsData, useAssetsData } from 'src/hooks/vault/useVaultData';
import { getNetworkConfig } from 'src/utils/marketsAndNetworksConfig';

import { getStandardVaultColumns, getUserVaultColumns, DepositActionCell, ManageActionCell, VaultGridRow } from './VaultDataGridColumns';
import { VaultStatsWidget } from './VaultStatsWidget';

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

  // Combined loading state
  const isLoading = isLoadingVaultIds || isLoadingVaults || assetsDataQuery.isLoading;

  // Transform all vaults to grid rows
  const allVaultRows = useMemo(() => {
    return transformVaultsToGridRows(vaults || [], userVaults, assetPriceMap, networkInfo);
  }, [vaults, userVaults, assetPriceMap, networkInfo]);

  // Filter vaults based on user deposits
  const { vaultsWithDeposits, vaultsWithoutDeposits } = useMemo(() => {
    if (!vaults || !accountAddress) {
      return {
        vaultsWithDeposits: [],
        vaultsWithoutDeposits: allVaultRows
      };
    }

    const withDeposits: VaultGridRow[] = [];
    const withoutDeposits: VaultGridRow[] = [];

    allVaultRows.forEach((row, index) => {
      const userVaultData = userVaults[index];
      const userDeposit = userVaultData?.maxWithdraw || '0';
      const hasDeposit = userVaultData && userDeposit.toString() !== '0' &&
        parseFloat(formatUnits(userDeposit.toString(), vaults[index]?.overview?.asset?.decimals || 18)) > 0;

      if (hasDeposit) {
        withDeposits.push(row);
      } else {
        withoutDeposits.push(row);
      }
    });

    return {
      vaultsWithDeposits: withDeposits,
      vaultsWithoutDeposits: withoutDeposits
    };
  }, [allVaultRows, vaults, userVaults, accountAddress]);

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

  const showTwoSections = accountAddress && vaultsWithDeposits.length > 0;

  return (
    <Box
      sx={{
        mt: { xs: 1, md: 2 },
        px: { xs: 2, sm: 4, md: 6 },
        pb: { xs: 4, md: 8 }
      }}
    >
      {/* Top section with stats widget */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: isMobile ? 'space-between' : 'flex-end',
          alignItems: isMobile ? 'stretch' : 'flex-start',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 3 : 0,
          mb: { xs: 6, md: 4 }
        }}
      >
        <VaultStatsWidget />
      </Box>

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
      ) : showTwoSections ? (
        <>
          {/* My Vaults Section */}
          <Box sx={{ mb: { xs: 4, md: 6 } }}>
            <Typography
              variant={isMobile ? "main16" : "main21"}
              sx={{
                mb: { xs: 2, md: 3 },
                fontWeight: 600,
                textAlign: isMobile ? 'center' : 'left'
              }}
            >
              My Vaults
            </Typography>
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

          {/* All Vaults Section */}
          {vaultsWithoutDeposits.length > 0 && (
            <Box>
              <Typography
                variant={isMobile ? "main16" : "main21"}
                sx={{
                  mb: { xs: 2, md: 3 },
                  fontWeight: 600,
                  textAlign: isMobile ? 'center' : 'left'
                }}
              >
                All Vaults
              </Typography>
              <Box
                sx={{
                  overflowX: isMobile ? 'auto' : 'visible',
                  '& .MuiTableContainer-root': {
                    minWidth: isMobile ? '800px' : 'auto'
                  }
                }}
              >
                <BaseDataGrid
                  data={vaultsWithoutDeposits}
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
          )}
        </>
      ) : (
        /* Single Section - All Vaults */
        <Box>
          <Typography
            variant={isMobile ? "main16" : "main21"}
            sx={{
              mb: { xs: 2, md: 3 },
              fontWeight: 600,
              textAlign: isMobile ? 'center' : 'left'
            }}
          >
            All Vaults
          </Typography>
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
      )}
    </Box>
  );
};
