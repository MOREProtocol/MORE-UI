import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  Skeleton,
  SvgIcon,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  useInboundRoutes,
  useVaultTopology,
  useVaultStatus,
  useVaultMetadata,
  useUserPositionMultiChain,
} from '@oydual31/more-vaults-sdk/react';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { Address } from 'src/components/Address';
import { CompactMode } from 'src/components/CompactableTypography';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { isOmniSpokeVault } from 'src/hooks/vault/factoryRegistry';
import { useDepositWhitelist } from 'src/hooks/vault/useDepositWhitelist';
import { useVault, VaultTab } from 'src/hooks/vault/useVault';
import {
  useAssetData,
  useUserPortfolioMetrics,
  useUserVaultBalances,
  useUserVaultsData,
  useVaultData,
  useVaultsSharePriceAsset,
} from 'src/hooks/vault/useVaultData';
import { ChainIds } from 'src/utils/const';
import { networkConfigs } from 'src/utils/marketsAndNetworksConfig';
import { asSdkClient, canDeposit } from '@oydual31/more-vaults-sdk/viem';
import { formatUnits } from 'viem';
import { useAccount, useChainId, usePublicClient, useSwitchChain } from 'wagmi';

import { LineChart } from '../charts/LineChart';
import { VaultActivity } from './VaultActivity';
import { VaultAllocations } from './VaultAllocations';
import { VaultBridgeSharesToHubModal } from './VaultBridgeSharesToHubModal';
import { VaultDepositModal } from './VaultDepositModal';
import { VaultManagement } from './VaultManagement/VaultManagement';
import { VaultNotes } from './VaultNotes';
import { VaultKpiGrid } from './VaultKpiGrid';
import { VaultRedeemModal } from './VaultRedeemModal';
import { VaultWhitelistModal } from './VaultWhitelistModal';

export const VaultDetail = () => {
  const router = useRouter();
  const { selectedVaultId, accountAddress, chainId, isOmniHub, isChainDetected } = useVault();
  const isOmniSpoke = isOmniSpokeVault(chainId, selectedVaultId ?? '');
  const { address } = useAccount();
  const wagmiChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { topology } = useVaultTopology(
    selectedVaultId as `0x${string}` | undefined
  );
  const sdkChainId = topology?.hubChainId || chainId;
  const topologyReady = !!topology;
  const { data: vaultStatus, isLoading: statusLoading } = useVaultStatus(
    topologyReady ? (selectedVaultId as `0x${string}`) : undefined,
    sdkChainId
  );
  const { data: vaultMetadata } = useVaultMetadata(
    topologyReady ? (selectedVaultId as `0x${string}`) : undefined,
    sdkChainId
  );
  const { data: userPosition } = useUserPositionMultiChain(
    selectedVaultId as `0x${string}` | undefined,
    accountAddress as `0x${string}` | undefined
  );
  const userVaultData = useUserVaultsData(accountAddress, [selectedVaultId], {
    enabled: !!selectedVaultId && !!accountAddress,
  });
  const vaultData = useVaultData(selectedVaultId);

  // SDK provides reliable vault data regardless of wallet chain
  const sdkVault = useMemo(() => {
    if (!vaultStatus || !vaultMetadata) return null;
    const decimals = vaultMetadata.underlyingDecimals ?? 18;
    const totalAssetsNum = Number(formatUnits(vaultStatus.totalAssets ?? BigInt(0), decimals));
    const sharePriceNum = Number(formatUnits(vaultStatus.sharePrice ?? BigInt(0), decimals));
    return {
      totalAssets: (vaultStatus.totalAssets ?? BigInt(0)).toString(),
      totalSupply: (vaultStatus.totalSupply ?? BigInt(0)).toString(),
      sharePrice: sharePriceNum,
      totalAssetsFormatted: totalAssetsNum,
      name: vaultMetadata.name,
      symbol: vaultMetadata.symbol,
      assetSymbol: vaultMetadata.underlyingSymbol,
      assetDecimals: decimals,
      underlying: vaultMetadata.underlying,
      vaultDecimals: vaultMetadata.decimals,
      isHub: vaultStatus.isHub,
    };
  }, [vaultStatus, vaultMetadata]);

  // Merge: SDK data takes priority for core fields, legacy fills the rest
  const selectedVault = useMemo(() => {
    const legacy = vaultData?.data;
    if (!sdkVault && !legacy) return undefined;
    if (!sdkVault) return legacy;
    return {
      ...legacy,
      id: selectedVaultId || legacy?.id || '',
      chainId: sdkChainId,
      overview: {
        ...legacy?.overview,
        name: legacy?.overview?.name || sdkVault.name,
        symbol: legacy?.overview?.symbol || sdkVault.symbol,
        sharePrice: sdkVault.sharePrice,
        decimals: sdkVault.vaultDecimals,
        asset: {
          ...legacy?.overview?.asset,
          symbol: legacy?.overview?.asset?.symbol || sdkVault.assetSymbol,
          decimals: sdkVault.assetDecimals,
          address: legacy?.overview?.asset?.address || sdkVault.underlying,
        },
      },
      financials: {
        ...legacy?.financials,
        liquidity: {
          ...legacy?.financials?.liquidity,
          totalAssets: sdkVault.totalAssets,
          totalSupply: sdkVault.totalSupply,
        },
      },
      omni: legacy?.omni || (sdkVault.isHub ? { isHub: true, spokeVaults: [] } : undefined),
    };
  }, [sdkVault, vaultData?.data, selectedVaultId, sdkChainId]);

  // Use SDK metadata for asset decimals (reliable for omni vaults), legacy as fallback
  const assetDecimals = vaultMetadata?.underlyingDecimals ?? selectedVault?.overview?.asset?.decimals ?? 6;

  // Prioritize SDK metadata (reads from correct hub chain) over legacy (may read wrong chain)
  const routeVaultAsset = (vaultMetadata?.underlying || selectedVault?.overview?.asset?.address) as `0x${string}` | undefined;

  const isOmniFromTopology = topology?.role === 'hub' || topology?.role === 'spoke';

  // Debug: log useInboundRoutes inputs
  // console.log('[VaultDetail] useInboundRoutes inputs:', {
  //   isOmniFromTopology,
  //   hubChainId: topology?.hubChainId,
  //   vaultId: selectedVaultId,
  //   routeVaultAsset,
  //   vaultMetadataUnderlying: vaultMetadata?.underlying,
  //   legacyAssetAddress: selectedVault?.overview?.asset?.address,
  //   account: accountAddress,
  //   topologyRole: topology?.role,
  // });

  const { routes: inboundRoutes } = useInboundRoutes(
    isOmniFromTopology ? topology?.hubChainId : undefined,
    isOmniFromTopology ? (selectedVaultId as `0x${string}`) : undefined,
    isOmniFromTopology ? routeVaultAsset : undefined,
    isOmniFromTopology ? (accountAddress as `0x${string}`) : undefined
  );

  // console.log('[VaultDetail] inboundRoutes result:', { routes: inboundRoutes, routesLoading, routesError });
  const userVaultBalances = useUserVaultBalances(accountAddress, { enabled: !!accountAddress && isChainDetected });
  const theme = useTheme();
  const downToMd = useMediaQuery(theme.breakpoints.down('md'));
  const downToMdLg = useMediaQuery(theme.breakpoints.down('mdlg'));
  const xPadding = downToMd ? 5 : 7;

  const baseUrl = useMemo(
    () => chainId && networkConfigs[chainId] && networkConfigs[chainId].explorerLink,
    [chainId]
  );

  const hasNotes = !!selectedVault?.overview?.descriptionMarkdown;
  const [selectedTab, setSelectedTab] = useState<VaultTab>(hasNotes ? 'notes' : 'allocations');
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [isWhitelistModalOpen, setIsWhitelistModalOpen] = useState(false);
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState(false);
  const [bridgeSpokeChainId, setBridgeSpokeChainId] = useState<number>(1);

  const [bridgeSpokeShares, setBridgeSpokeShares] = useState<bigint>(BigInt(0));
  const [bridgeRawSpokeShares, setBridgeRawSpokeShares] = useState<bigint>(BigInt(0));
  const [selectedChartDataKey, setSelectedChartDataKey] = useState<'sharePrice' | 'totalAssets'>(
    'sharePrice'
  );

  // Mono-chain vaults: whitelist check via direct contract calls
  const { isWhitelisted, whitelistAmount, isWhitelistEnabled } = useDepositWhitelist();

  // Omni hub vaults: whitelist check via SDK's canDeposit() (fixed in SDK to use
  // getAvailableToDeposit rather than maxDeposit, which reverts on async hub vaults)
  const hubPublicClient = usePublicClient({ chainId: sdkChainId });
  const [omniDepositEligibility, setOmniDepositEligibility] = useState<{
    allowed: boolean;
    reason: string;
  } | null>(null);

  useEffect(() => {
    if (!isOmniHub || !selectedVaultId || !hubPublicClient || !accountAddress) return;
    let cancelled = false;
    const run = async () => {
      try {
        const eligibility = await canDeposit(
          asSdkClient(hubPublicClient),
          selectedVaultId as `0x${string}`,
          accountAddress as `0x${string}`
        );
        if (!cancelled) setOmniDepositEligibility(eligibility);
      } catch {
        // Don't block on SDK failure — fail open
      }
    };
    run();
    return () => { cancelled = true; };
  }, [isOmniHub, selectedVaultId, hubPublicClient, accountAddress]);

  // Only block when we have a confirmed not-whitelisted result — never blocks while loading
  const isNotWhitelisted = isOmniHub
    ? (omniDepositEligibility !== null && !omniDepositEligibility.allowed && omniDepositEligibility.reason === 'not-whitelisted')
    : (isWhitelistEnabled && !isWhitelisted);

  const vaultNetwork = selectedVault?.chainId || sdkChainId;
  const isOnCorrectNetwork = wagmiChainId === vaultNetwork;
  const isOmniVault = isOmniHub || isOmniSpoke;
  const sdkReady = !!sdkVault;
  const isLoading = !topologyReady || (!sdkReady && statusLoading);
  const isUserVaultDataLoading = userVaultData?.[0]?.isLoading;
  const isUserVaultBalancesLoading = userVaultBalances?.isLoading;

  // Get asset data using oracle + fallback to reserve
  const assetData = useAssetData(selectedVault?.overview?.asset?.address || '', {
    enabled: !!selectedVault?.overview?.asset?.address,
  });
  const aum = selectedVault ? BigInt(selectedVault?.financials?.liquidity?.totalAssets) : BigInt(0);
  const aumFormatted = selectedVault
    ? formatUnits(aum, assetDecimals)
    : '0';
  // const aumInUsd = new BigNumber(aumFormatted).multipliedBy(
  //   assetData.data?.price || 0
  // );
  // const totalSupply = selectedVault
  //   ? BigInt(selectedVault?.financials?.liquidity?.totalSupply)
  //   : BigInt(0);
  // const totalSupplyFormatted = selectedVault
  //   ? formatUnits(totalSupply, selectedVault?.overview?.decimals || 18)
  //   : '0';
  // const totalSupplyInUsd = new BigNumber(totalSupplyFormatted)
  //   .multipliedBy(selectedVault?.overview?.sharePrice || 0)
  //   .multipliedBy(assetData.data?.price || 0);
  const legacyMaxWithdraw = userVaultData?.[0]?.data?.maxWithdraw;
  const sdkEstimatedAssets = userPosition?.estimatedAssets ?? BigInt(0);
  const maxWithdraw = sdkEstimatedAssets > BigInt(0)
    ? { gt: (n: number) => sdkEstimatedAssets > BigInt(n) }
    : legacyMaxWithdraw;

  // Debug: log SDK position data
  // if (userPosition) {
  //   console.log('[VaultDetail] SDK userPosition:', {
  //     hubShares: userPosition.hubShares?.toString(),
  //     spokeShares: userPosition.spokeShares ? Object.fromEntries(
  //       Object.entries(userPosition.spokeShares).map(([k, v]) => [k, (v as bigint).toString()])
  //     ) : null,
  //     totalShares: userPosition.totalShares?.toString(),
  //     estimatedAssets: userPosition.estimatedAssets?.toString(),
  //     decimals: userPosition.decimals,
  //     assetDecimals,
  //     formatted: formatUnits(sdkEstimatedAssets, assetDecimals),
  //   });
  // }

  // const secondsSinceInception = Number(new Date().getTime() / 1000) - Number(selectedVault?.overview?.creationTimestamp);

  const canManageVault = vaultData?.data?.overview?.roles?.curator === accountAddress;

  // Calculate user's P&L for this specific vault using live recomputed metrics
  const portfolioMetricsQuery = useUserPortfolioMetrics(accountAddress || '', '3m', {
    enabled: !!accountAddress && isChainDetected,
  });
  const perVaultMetrics = portfolioMetricsQuery.data?.perVaultMetrics || [];
  const perVault = perVaultMetrics.find(
    (m) => m.vaultId.toLowerCase() === (selectedVaultId || '').toLowerCase()
  );

  // Compute P&L in asset denomination properly: realized (asset) + unrealized (shares*(sharePriceAsset - WACB))
  const thisVaultBalance = userVaultBalances?.data?.find(
    (b) => b.vault.id.toLowerCase() === (selectedVaultId || '').toLowerCase()
  );
  const shareInfo = useVaultsSharePriceAsset(selectedVaultId ? [selectedVaultId] : [], {
    enabled: !!selectedVaultId,
  });
  const sharePriceAsset =
    shareInfo.data && shareInfo.data[0] ? shareInfo.data[0].sharePriceAsset : 0;

  const sdkSharesRaw = userPosition?.totalShares ?? BigInt(0);
  const sdkDecimals = userPosition?.decimals ?? selectedVault?.overview?.decimals ?? 18;
  const sdkShares = Number(formatUnits(sdkSharesRaw, sdkDecimals));
  const shares = sdkShares > 0 ? sdkShares : (thisVaultBalance ? parseFloat(thisVaultBalance.sharesBalance || '0') : 0);
  const wacb = thisVaultBalance ? parseFloat(thisVaultBalance.weightedAverageCostBasis || '0') : 0;
  const realizedAssetPnL = thisVaultBalance ? parseFloat(thisVaultBalance.realizedPnL || '0') : 0;
  const unrealizedAssetPnL = shares * (sharePriceAsset - wacb);
  const totalPnLInAsset = realizedAssetPnL + unrealizedAssetPnL;

  // Asset-based invested and percent
  const totalInvestedAsset = thisVaultBalance
    ? parseFloat(thisVaultBalance.totalDeposited || '0') -
    parseFloat(thisVaultBalance.totalWithdrawn || '0')
    : 0;
  const pnlPercentageAsset = totalInvestedAsset > 0 ? totalPnLInAsset / totalInvestedAsset : 0;

  const chartDataOptions = {
    // apy: {
    //   label: 'APY',
    //   data: selectedVault?.overview?.historicalSnapshots?.apyWeeklyReturnTrailing || [],
    // },
    // totalSupply: {
    //   label: 'Total Supply',
    //   data: (() => {
    //     const supplySeries = selectedVault?.overview?.historicalSnapshots?.totalSupply || [];
    //     const sharePriceSeries = selectedVault?.overview?.historicalSnapshots?.sharePrice || [];
    //     if (!supplySeries.length || !sharePriceSeries.length) return supplySeries;
    //     const sharePriceByTime = new Map<string, number>(sharePriceSeries.map((p: { time: string; value: number }) => [p.time, p.value]));
    //     return supplySeries.map((p: { time: string; value: number }) => ({
    //       time: p.time,
    //       value: (p?.value || 0) * (sharePriceByTime.get(p.time) || 0), // shares -> asset units
    //     }));
    //   })(),
    // },
    sharePrice: {
      label: 'Share Price',
      data: selectedVault?.overview?.historicalSnapshots?.sharePrice || [],
    },
    totalAssets: {
      label: 'Total Assets',
      data: selectedVault?.overview?.historicalSnapshots?.totalAssets || [],
    },
  };

  const currentChartLabel = chartDataOptions[selectedChartDataKey]?.label || '';
  const currentChartData = chartDataOptions[selectedChartDataKey]?.data;

  const isFlowTheme = process.env.NEXT_PUBLIC_UI_THEME === 'flow';

  const handleDepositClick = () => {
    // Non-omni vault on wrong chain → switch first
    if (!isOmniVault && !isOnCorrectNetwork) {
      switchChain?.({ chainId: vaultNetwork || ChainIds.flowEVMMainnet });
      return;
    }
    setIsDepositModalOpen(true);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setSelectedTab(newValue as VaultTab);
  };

  useEffect(() => {
    if (hasNotes && selectedTab !== 'notes') {
      setSelectedTab('notes');
    }
  }, [hasNotes]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5, pt: 4, pb: 7, px: xPadding }}>
      {/* Network hint for non-omni vaults — informational only, doesn't block the page */}
      {address && !isOnCorrectNetwork && !isOmniVault && !isLoading && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="main14">
            This vault is on{' '}
            {networkConfigs[vaultNetwork || ChainIds.flowEVMMainnet]?.name || 'another network'}.{' '}
            <Typography
              component="span"
              variant="main14"
              onClick={() => switchChain?.({ chainId: vaultNetwork || ChainIds.flowEVMMainnet })}
              sx={{
                textDecoration: 'underline',
                cursor: 'pointer',
                fontWeight: 600,
                '&:hover': { color: 'primary.dark' },
              }}
            >
              Switch to deposit or withdraw
            </Typography>
          </Typography>
        </Alert>
      )}

      {/* TOP DETAILS */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          backgroundColor: 'background.surface',
          p: 3,
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SvgIcon
            sx={{
              fontSize: '20px',
              cursor: 'pointer',
              color: 'primary.main',
              '&:hover': { color: 'primary.light' },
            }}
            onClick={() => router.push('/vaults')}
          >
            <ArrowBackRoundedIcon />
          </SvgIcon>
          {isLoading ? (
            <Skeleton width={150} height={40} sx={{ my: 2 }} />
          ) : (
            <>
              {isFlowTheme ? (
                <>
                  <TokenIcon
                    symbol={selectedVault?.overview?.asset?.symbol || ''}
                    fontSize="large"
                  />
                  <Typography variant="main21" sx={{ color: 'primary.main' }}>
                    {`${selectedVault?.overview?.asset?.symbol || selectedVault?.overview?.name || ''
                      } Vault`}
                  </Typography>
                </>
              ) : (
                <>
                  {selectedVault?.overview?.curatorLogo && (
                    <Avatar
                      src={selectedVault.overview.curatorLogo}
                      sx={{ width: 35, height: 35 }}
                    />
                  )}
                  <Typography variant="main21" sx={{ color: 'primary.main' }}>
                    {selectedVault?.overview?.name}
                  </Typography>
                </>
              )}
              {isOmniHub && (
                <Chip
                  label="Omnichain"
                  size="small"
                  sx={{
                    ml: 0.5,
                    background: theme.palette.gradients.newGradient,
                    color: '#fff',
                    fontWeight: 600,
                    border: 'none',
                  }}
                />
              )}
              <IconButton
                size="small"
                onClick={() => {
                  if (baseUrl && selectedVaultId) {
                    window.open(`${baseUrl}/address/${selectedVaultId}`, '_blank');
                  }
                }}
                aria-label="open in explorer"
                sx={{ padding: '2px' }}
              >
                <OpenInNewIcon sx={{ fontSize: '0.875rem' }} />
              </IconButton>
            </>
          )}
        </Box>
        <Box
          sx={{
            display: downToMd ? 'none' : 'flex',
            alignItems: 'left',
            flexDirection: 'row',
            gap: 5,
          }}
        >
          {isLoading ? (
            <Skeleton width={150} height={20} />
          ) : (
            selectedVault?.overview?.roles?.owner && (
              <Box sx={{ display: 'flex', alignItems: 'left', flexDirection: 'column' }}>
                <Typography variant="secondary14" sx={{ pb: 2, color: 'primary.main' }}>
                  Owner
                </Typography>
                <Address
                  address={selectedVault?.overview?.roles.owner}
                  link={`${baseUrl}/address/${selectedVault?.overview?.roles.owner}`}
                  loading={isLoading}
                  isUser
                  variant="secondary12"
                  compactMode={CompactMode.SM}
                  sx={{ color: 'primary.main' }}
                />
              </Box>
            )
          )}
          {isLoading ? (
            <Skeleton width={150} height={20} />
          ) : (
            selectedVault?.overview?.roles?.curator && (
              <Box sx={{ display: 'flex', alignItems: 'left', flexDirection: 'column' }}>
                <Typography variant="secondary14" sx={{ pb: 2, color: 'primary.main' }}>
                  Strategist
                </Typography>
                <Address
                  address={selectedVault?.overview?.roles.curator}
                  link={`${baseUrl}/address/${selectedVault?.overview?.roles.curator}`}
                  loading={isLoading}
                  isUser
                  variant="secondary12"
                  compactMode={CompactMode.SM}
                  sx={{ color: 'primary.main' }}
                />
              </Box>
            )
          )}
          {isLoading ? (
            <Skeleton width={150} height={20} />
          ) : (
            selectedVault?.overview?.roles?.guardian && (
              <Box sx={{ display: 'flex', alignItems: 'left', flexDirection: 'column' }}>
                <Typography variant="secondary14" sx={{ pb: 2, color: 'primary.main' }}>
                  Guardian
                </Typography>
                <Address
                  address={selectedVault?.overview?.roles.guardian}
                  link={`${baseUrl}/address/${selectedVault?.overview?.roles.guardian}`}
                  loading={isLoading}
                  isUser
                  variant="secondary12"
                  compactMode={CompactMode.SM}
                  sx={{ color: 'primary.main' }}
                />
              </Box>
            )
          )}
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'left',
            flexDirection: downToMdLg ? 'column' : 'row',
            gap: 2,
          }}
        >
          {!isLoading &&
            (isOmniHub || isOmniSpoke || !(vaultData?.data?.financials?.liquidity?.maxDeposit === '0')) && (
              <Tooltip
                title={isNotWhitelisted ? 'Your address is not whitelisted for deposits in this vault' : ''}
                placement="top"
              >
                <span>
                  <Button
                    variant="gradient"
                    color="primary"
                    onClick={handleDepositClick}
                    disabled={isLoading || !accountAddress || isNotWhitelisted}
                  >
                    Deposit
                  </Button>
                </span>
              </Tooltip>
            )}
          {!isLoading &&
            accountAddress &&
            (shares > 0 || (maxWithdraw && maxWithdraw.gt(0))) && (
              <Button
                variant="gradient"
                size="medium"
                onClick={() => {
                  if (!isOmniVault && !isOnCorrectNetwork) {
                    switchChain?.({ chainId: vaultNetwork || ChainIds.flowEVMMainnet });
                    return;
                  }
                  setIsRedeemModalOpen(true);
                }}
                disabled={isLoading}
              >
                Withdraw
              </Button>
            )}
        </Box>
      </Box>

      {/* MIDDLE DETAILS */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'left',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 2, md: 5 },
          mt: 4,
        }}
      >
        {/* LEFT SIDE KPIS */}
        <VaultKpiGrid
          selectedVault={selectedVault}
          legacyVault={vaultData?.data}
          isLoading={isLoading}
          isUserVaultBalancesLoading={isUserVaultBalancesLoading}
          isUserVaultDataLoading={isUserVaultDataLoading}
          accountAddress={accountAddress}
          isOmniHub={isOmniHub}
          sdkEstimatedAssets={sdkEstimatedAssets}
          legacyMaxWithdrawBigInt={legacyMaxWithdraw?.toBigInt() || BigInt(0)}
          assetDecimals={assetDecimals}
          assetPrice={assetData.data?.price || 0}
          assetIsLoading={assetData.isLoading}
          totalPnLInAsset={totalPnLInAsset}
          pnlPercentageAsset={pnlPercentageAsset}
          perVault={perVault}
          topology={topology}
          chainId={chainId}
        />

        {/* RIGHT SIDE CHART */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flex: 3,
            backgroundColor: 'background.paper',
            borderRadius: 2,
            position: 'relative',
          }}
        >
          <Box
            sx={{
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
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'left', flexDirection: 'column', gap: 0 }}>
              <Typography variant="secondary14" color="text.secondary">
                Share Price
              </Typography>
              <Box
                onClick={() => setSelectedChartDataKey('sharePrice')}
                sx={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 1,
                  border: isLoading
                    ? 'none'
                    : selectedChartDataKey === 'sharePrice'
                      ? `1.5px solid ${theme.palette.other.chartHighlight}`
                      : '1.5px solid #E0E0E0',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  width: 'fit-content',
                  backdropFilter: 'blur(2px)',
                  '&:hover': {
                    backgroundColor: theme.palette.background.surface,
                    border: `1.5px solid ${theme.palette.text.muted}`,
                  },
                }}
              >
                {isLoading ? (
                  <Skeleton width={60} height={24} />
                ) : (
                  <>
                    <FormattedNumber
                      value={selectedVault?.overview?.sharePrice?.toString() || '0'}
                      symbol={selectedVault?.overview?.asset?.symbol || ''}
                      variant="main16"
                      sx={{ fontWeight: 800 }}
                    />
                    <SvgIcon
                      sx={{
                        fontSize: '20px',
                        color:
                          selectedChartDataKey === 'sharePrice'
                            ? theme.palette.other.chartHighlight
                            : theme.palette.text.muted,
                      }}
                    >
                      <ShowChartIcon />
                    </SvgIcon>
                  </>
                )}
              </Box>
            </Box>
            {/* <Box sx={{ display: 'flex', alignItems: 'left', flexDirection: 'column', gap: 0 }}>
              <Typography variant="secondary14" color="text.secondary">Annualized APY</Typography>
              <Box sx={{ display: 'flex', alignItems: 'left', flexDirection: 'row', gap: 1 }}>
                <Box
                  onClick={() => setSelectedChartDataKey('apy')}
                  sx={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    flexDirection: 'row',
                    gap: 1,
                    border: isLoading
                      ? 'none'
                      : selectedChartDataKey === 'apy'
                        ? `1.5px solid ${theme.palette.other.chartHighlight}`
                        : '1.5px solid #E0E0E0',
                    borderRadius: '6px',
                    padding: '2px 6px',
                    width: 'fit-content',
                    backgroundColor: 'background.paper',
                    '&:hover': {
                      backgroundColor: theme.palette.background.surface,
                      border: `1.5px solid ${theme.palette.text.muted}`,
                    },
                  }}>
                  {isLoading ? <Skeleton width={60} height={24} /> : <>
                    <FormattedNumber
                      value={vaultData?.data?.overview?.apy || '0'}
                      percent
                      variant="main16"
                      sx={{ fontWeight: 800 }}
                    />
                    <SvgIcon
                      sx={{
                        fontSize: '20px',
                        color:
                          selectedChartDataKey === 'apy'
                            ? theme.palette.other.chartHighlight
                            : theme.palette.text.muted,
                      }}
                    >
                      <ShowChartIcon />
                    </SvgIcon>
                  </>
                  }
                </Box>
                {selectedVault?.incentives && selectedVault?.incentives.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="main14" color="text.secondary" sx={{ ml: 1, mr: 1 }}>
                      +
                    </Typography>
                    <RewardsButton rewards={selectedVault?.incentives} />
                  </Box>
                )}
              </Box>
            </Box> */}
            {/* <Box sx={{ display: 'flex', alignItems: 'left', flexDirection: 'column', gap: 0 }}>
              <Typography variant="secondary14" color="text.secondary">Total Supply</Typography>
              <Box
                onClick={() => setSelectedChartDataKey('totalSupply')}
                sx={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 1,
                    border: isLoading
                      ? 'none'
                      : selectedChartDataKey === 'totalSupply'
                        ? `1.5px solid ${theme.palette.other.chartHighlight}`
                        : '1.5px solid #E0E0E0',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  width: 'fit-content',
                  backdropFilter: 'blur(2px)',
                  '&:hover': {
                    backgroundColor: theme.palette.background.surface,
                    border: `1.5px solid ${theme.palette.text.muted}`,
                  },
                }}>
                {isLoading ? <Skeleton width={60} height={24} /> : <>
                  <FormattedNumber
                    value={totalSupplyInUsd.toString() || '0'}
                    symbol={'USD'}
                    variant="main16"
                    sx={{ fontWeight: 800 }}
                  />
                  <SvgIcon
                    sx={{
                      fontSize: '20px',
                      color:
                        selectedChartDataKey === 'totalSupply'
                          ? theme.palette.other.chartHighlight
                          : theme.palette.text.muted,
                    }}
                  >
                    <ShowChartIcon />
                  </SvgIcon>
                </>
                }
              </Box>
            </Box> */}
            <Box sx={{ display: 'flex', alignItems: 'left', flexDirection: 'column', gap: 0 }}>
              <Typography variant="secondary14" color="text.secondary">
                Net Asset Value
              </Typography>
              <Box
                onClick={() => setSelectedChartDataKey('totalAssets')}
                sx={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 1,
                  border: isLoading
                    ? 'none'
                    : selectedChartDataKey === 'totalAssets'
                      ? `1.5px solid ${theme.palette.other.chartHighlight}`
                      : '1.5px solid #E0E0E0',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  width: 'fit-content',
                  backdropFilter: 'blur(2px)',
                  '&:hover': {
                    backgroundColor: theme.palette.background.surface,
                    border: `1.5px solid ${theme.palette.text.muted}`,
                  },
                }}
              >
                {isLoading ? (
                  <Skeleton width={60} height={24} />
                ) : (
                  <>
                    <FormattedNumber
                      value={aumFormatted || '0'}
                      symbol={selectedVault?.overview?.asset?.symbol || ''}
                      variant="main16"
                      sx={{ fontWeight: 800 }}
                    />
                    <SvgIcon
                      sx={{
                        fontSize: '20px',
                        color:
                          selectedChartDataKey === 'totalAssets'
                            ? theme.palette.other.chartHighlight
                            : theme.palette.text.muted,
                      }}
                    >
                      <ShowChartIcon />
                    </SvgIcon>
                  </>
                )}
              </Box>
            </Box>
          </Box>
          <Box
            sx={{
              backgroundColor: 'background.paper',
              py: { xs: 2, md: 6 },
              pl: { xs: 2, md: 6 },
              borderRadius: 2,
            }}
          >
            {isLoading ? (
              <Box sx={{ width: '100%', height: 300, backgroundColor: 'transparent' }} />
            ) : currentChartData && currentChartData.length > 0 ? (
              <LineChart
                height={300}
                data={currentChartData}
                yAxisFormat={vaultData?.data?.overview?.asset?.symbol}
                showTimePeriodSelector={true}
              />
            ) : (
              <Typography sx={{ textAlign: 'center', pt: 30 }}>
                No historical data available for {currentChartLabel}.
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* BOTTOM TABS */}
      {process?.env?.NEXT_PUBLIC_UI_THEME && process.env.NEXT_PUBLIC_UI_THEME === 'flow' ? (
        <></>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            pb: 10,
          }}
        >
          <Tabs
            value={isLoading ? false : selectedTab}
            onChange={handleTabChange}
            aria-label="vault tabs"
            textColor="inherit"
            sx={{
              '& .MuiTab-root': {
                minWidth: 'auto',
                marginRight: '24px',
                padding: '12px 0',
                fontWeight: '600',
                fontSize: '14px',
                textTransform: 'none',
              },
              borderBottom: '1px solid #E0E0E0',
              '& .MuiTabs-indicator': {
                background: theme.palette.gradients.newGradient,
              },
            }}
          >
            {hasNotes && <Tab label="Vault Info" value="notes" />}
            <Tab label="Allocations" value="allocations" />
            {!isOmniVault && <Tab label="Activity" value="activity" />}
            {canManageVault && <Tab label="Manage" value="manage" />}
          </Tabs>

          <Box sx={{ height: '100%' }}>
            <div className="vault-tab-content">
              {selectedTab === 'notes' && hasNotes && <VaultNotes />}
              {selectedTab === 'allocations' && <VaultAllocations />}
              {selectedTab === 'activity' && <VaultActivity />}
              {selectedTab === 'manage' && <VaultManagement />}
            </div>
          </Box>
        </Box>
      )}

      {/* MODALS */}
      <VaultDepositModal
        isOpen={isDepositModalOpen}
        setIsOpen={setIsDepositModalOpen}
        whitelistAmount={whitelistAmount}
        inboundRoutes={inboundRoutes ?? []}
      />
      <VaultRedeemModal
        isOpen={isRedeemModalOpen}
        setIsOpen={setIsRedeemModalOpen}
        onRedeemFromSpoke={(spokeChain, shares, rawShares) => {
          setBridgeSpokeChainId(spokeChain);
          setBridgeSpokeShares(shares);
          setBridgeRawSpokeShares(rawShares);
          setIsBridgeModalOpen(true);
        }}
      />
      <VaultWhitelistModal isOpen={isWhitelistModalOpen} setIsOpen={setIsWhitelistModalOpen} />
      <VaultBridgeSharesToHubModal
        isOpen={isBridgeModalOpen}
        setIsOpen={setIsBridgeModalOpen}
        spokeChainId={bridgeSpokeChainId}
        spokeShares={bridgeSpokeShares}
        rawSpokeShares={bridgeRawSpokeShares}
        vaultDecimals={userPosition?.decimals ?? 8}
      />

    </Box>
  );
};
