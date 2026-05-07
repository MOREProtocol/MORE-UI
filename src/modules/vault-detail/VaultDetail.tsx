import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Divider,
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
import { VaultFlowRibbon } from './VaultFlowRibbon';
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

  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, pt: 4, pb: 7, px: xPadding }}>
      {/* Network hint */}
      {address && !isOnCorrectNetwork && !isOmniVault && !isLoading && (
        <Alert severity="info">
          <Typography variant="main14">
            This vault is on{' '}
            {networkConfigs[vaultNetwork || ChainIds.flowEVMMainnet]?.name || 'another network'}.{' '}
            <Typography
              component="span"
              variant="main14"
              onClick={() => switchChain?.({ chainId: vaultNetwork || ChainIds.flowEVMMainnet })}
              sx={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 600, '&:hover': { color: 'primary.dark' } }}
            >
              Switch to deposit or withdraw
            </Typography>
          </Typography>
        </Alert>
      )}

      {/* HEADER */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        {/* Back button */}
        <Box
          onClick={() => router.push('/vaults')}
          sx={{
            display: 'inline-grid',
            placeItems: 'center',
            width: 34,
            height: 34,
            borderRadius: '8px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: isDark ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.9)',
            color: 'text.secondary',
            cursor: 'pointer',
            flex: 'none',
            mt: '5px',
            '&:hover': { color: 'text.primary', borderColor: isDark ? 'rgba(255,255,255,.12)' : 'rgba(40,25,15,.16)' },
          }}
        >
          <SvgIcon sx={{ fontSize: '16px' }}>
            <ArrowBackRoundedIcon />
          </SvgIcon>
        </Box>

        {/* Token icon + name stack */}
        {isLoading ? (
          <Skeleton width={220} height={44} />
        ) : (
          <>
            {isFlowTheme ? (
              <TokenIcon symbol={selectedVault?.overview?.asset?.symbol || ''} fontSize="large" sx={{ alignSelf: 'flex-start', mt: '3px' }} />
            ) : selectedVault?.overview?.curatorLogo ? (
              <Avatar src={selectedVault.overview.curatorLogo} sx={{ width: 40, height: 40, borderRadius: '10px', alignSelf: 'flex-start', mt: '2px' }} />
            ) : null}

            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* Name row */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography
                  sx={{
                    fontFamily: theme.typography.h1.fontFamily,
                    fontSize: { xs: 20, md: 26 },
                    fontWeight: 500,
                    letterSpacing: '-.02em',
                    lineHeight: 1.1,
                    color: 'text.primary',
                  }}
                >
                  {isFlowTheme
                    ? `${selectedVault?.overview?.asset?.symbol || selectedVault?.overview?.name || ''} Vault`
                    : selectedVault?.overview?.name}
                </Typography>
                {isOmniHub && (
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1,
                      py: 0.25,
                      borderRadius: '6px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: isDark ? '#FFA94A' : '#C66A18',
                      background: isDark ? 'rgba(245,132,32,.14)' : 'rgba(245,132,32,.10)',
                      border: '1px solid',
                      borderColor: isDark ? 'rgba(245,132,32,.28)' : 'rgba(245,132,32,.22)',
                    }}
                  >
                    omnichain
                  </Box>
                )}
                <IconButton
                  size="small"
                  onClick={() => baseUrl && selectedVaultId && window.open(`${baseUrl}/address/${selectedVaultId}`, '_blank')}
                  aria-label="open in explorer"
                  sx={{ padding: '2px', color: 'text.muted' }}
                >
                  <OpenInNewIcon sx={{ fontSize: '0.8rem' }} />
                </IconButton>
              </Box>

              {/* Subtitle: curated by [name]  |  curator · strategist · guardian addresses */}
              {!downToMd && (
                selectedVault?.overview?.curatorName ||
                selectedVault?.overview?.roles?.owner ||
                selectedVault?.overview?.roles?.curator ||
                selectedVault?.overview?.roles?.guardian
              ) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 10, mt: 1, flexWrap: 'wrap' }}>
                  {/* Group 1: curated by [name] */}
                  {selectedVault?.overview?.curatorName && selectedVault.overview.curatorName !== 'Unknown' && (
                    <Typography sx={{ fontSize: 12, color: 'text.muted', whiteSpace: 'nowrap' }}>
                      curated by{' '}
                      <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        {selectedVault.overview.curatorName}
                      </Box>
                    </Typography>
                  )}

                  {/* Vertical separator */}
                  {selectedVault?.overview?.curatorName && selectedVault.overview.curatorName !== 'Unknown' &&
                    (selectedVault?.overview?.roles?.owner || selectedVault?.overview?.roles?.curator || selectedVault?.overview?.roles?.guardian) && (
                      <Box sx={{ width: '1px', height: 14, bgcolor: isDark ? 'rgba(255,255,255,.12)' : 'rgba(40,25,15,.16)', flexShrink: 0 }} />
                    )
                  }

                  {/* Group 2: address chips */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    {selectedVault?.overview?.roles?.owner && (
                      <Typography component="span" sx={{ fontSize: 12, color: 'text.muted' }}>
                        curator{' '}
                        <Address
                          address={selectedVault.overview.roles.owner}
                          link={`${baseUrl}/address/${selectedVault.overview.roles.owner}`}
                          loading={false}
                          isUser
                          variant="secondary12"
                          compactMode={CompactMode.SM}
                          sx={{ color: 'text.secondary', display: 'inline' }}
                        />
                      </Typography>
                    )}
                    {selectedVault?.overview?.roles?.curator && (
                      <>
                        {selectedVault?.overview?.roles?.owner && (
                          <Typography component="span" sx={{ fontSize: 12, color: 'text.muted', mx: 0.25 }}>·</Typography>
                        )}
                        <Typography component="span" sx={{ fontSize: 12, color: 'text.muted' }}>
                          strategist{' '}
                          <Address
                            address={selectedVault.overview.roles.curator}
                            link={`${baseUrl}/address/${selectedVault.overview.roles.curator}`}
                            loading={false}
                            isUser
                            variant="secondary12"
                            compactMode={CompactMode.SM}
                            sx={{ color: 'text.secondary', display: 'inline' }}
                          />
                        </Typography>
                      </>
                    )}
                    {selectedVault?.overview?.roles?.guardian && (
                      <>
                        {(selectedVault?.overview?.roles?.owner || selectedVault?.overview?.roles?.curator) && (
                          <Typography component="span" sx={{ fontSize: 12, color: 'text.muted', mx: 0.25 }}>·</Typography>
                        )}
                        <Typography component="span" sx={{ fontSize: 12, color: 'text.muted' }}>
                          guardian{' '}
                          <Address
                            address={selectedVault.overview.roles.guardian}
                            link={`${baseUrl}/address/${selectedVault.overview.roles.guardian}`}
                            loading={false}
                            isUser
                            variant="secondary12"
                            compactMode={CompactMode.SM}
                            sx={{ color: 'text.secondary', display: 'inline' }}
                          />
                        </Typography>
                      </>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          </>
        )}

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Action buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0, mt: '2px' }}>
          {!isLoading &&
            accountAddress &&
            (shares > 0 || (maxWithdraw && maxWithdraw.gt(0))) && (
              <Button
                variant="soft"
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
        </Box>
      </Box>

      {/* STATS + CHART GRID */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1.5fr' },
          gap: { xs: 3, md: 4 },
          alignItems: 'stretch',
        }}
      >
        {/* LEFT: KPI grid */}
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

        {/* RIGHT: Chart panel */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            // Solid base + soft orange wash at the top so KPIs read clean over the page grid
            background: isDark
              ? `linear-gradient(180deg, rgba(245,132,32,.06), rgba(245,132,32,0) 140px),
                 ${theme.palette.background.surface}`
              : `linear-gradient(180deg, rgba(245,132,32,.06), rgba(245,132,32,0) 140px),
                 ${theme.palette.background.paper}`,
            borderRadius: '14px',
            border: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,.08)' : 'rgba(40,25,15,.10)',
            boxShadow: isDark
              ? '0 1px 0 rgba(255,255,255,.04) inset, 0 20px 50px -25px rgba(0,0,0,.6)'
              : '0 1px 0 rgba(255,255,255,.9) inset, 0 14px 36px -18px rgba(120,70,20,.12)',
            overflow: 'hidden',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Chart header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              px: { xs: 3, md: 4 },
              pt: { xs: 3, md: 3.5 },
              pb: 2,
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            {/* Metric selectors */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 3, md: 4 } }}>
              {/* Share Price */}
              <Box
                onClick={() => setSelectedChartDataKey('sharePrice')}
                sx={{ cursor: 'pointer' }}
              >
                <Typography
                  sx={{
                    fontSize: '10.5px',
                    letterSpacing: '.12em',
                    textTransform: 'uppercase',
                    color: selectedChartDataKey === 'sharePrice' ? 'secondary.main' : 'text.muted',
                    fontWeight: 500,
                    mb: 0.5,
                    transition: 'color .15s',
                  }}
                >
                  Share Price
                </Typography>
                {isLoading ? (
                  <Skeleton width={80} height={28} />
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                    <Typography
                      sx={{
                        fontFamily: theme.typography.h1.fontFamily,
                        fontSize: 24,
                        fontWeight: 500,
                        letterSpacing: '-.018em',
                        lineHeight: 1,
                        color: selectedChartDataKey === 'sharePrice' ? 'text.primary' : 'text.secondary',
                        transition: 'color .15s',
                      }}
                    >
                      <FormattedNumber
                        value={selectedVault?.overview?.sharePrice?.toString() || '0'}
                        compact
                        variant="main21"
                        sx={{
                          fontFamily: theme.typography.h1.fontFamily,
                          fontSize: 24,
                          fontWeight: 500,
                          letterSpacing: '-.018em',
                          color: 'inherit',
                        }}
                      />
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.muted', fontWeight: 500 }}>
                      {selectedVault?.overview?.asset?.symbol || ''}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Divider orientation="vertical" flexItem sx={{ alignSelf: 'center', height: 32 }} />

              {/* Net Asset Value */}
              <Box
                onClick={() => setSelectedChartDataKey('totalAssets')}
                sx={{ cursor: 'pointer' }}
              >
                <Typography
                  sx={{
                    fontSize: '10.5px',
                    letterSpacing: '.12em',
                    textTransform: 'uppercase',
                    color: selectedChartDataKey === 'totalAssets' ? 'secondary.main' : 'text.muted',
                    fontWeight: 500,
                    mb: 0.5,
                    transition: 'color .15s',
                  }}
                >
                  Net Asset Value
                </Typography>
                {isLoading ? (
                  <Skeleton width={100} height={28} />
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                    <Typography
                      sx={{
                        fontFamily: theme.typography.h1.fontFamily,
                        fontSize: 24,
                        fontWeight: 500,
                        letterSpacing: '-.018em',
                        lineHeight: 1,
                        color: selectedChartDataKey === 'totalAssets' ? 'text.primary' : 'text.secondary',
                        transition: 'color .15s',
                      }}
                    >
                      <FormattedNumber
                        value={aumFormatted || '0'}
                        compact
                        variant="main21"
                        sx={{
                          fontFamily: theme.typography.h1.fontFamily,
                          fontSize: 24,
                          fontWeight: 500,
                          letterSpacing: '-.018em',
                          color: 'inherit',
                        }}
                      />
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.muted', fontWeight: 500 }}>
                      {selectedVault?.overview?.asset?.symbol || ''}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>

          {/* Chart */}
          <Box sx={{ flex: 1, px: { xs: 0, md: 1 }, pb: 1 }}>
            {isLoading ? (
              <Box sx={{ width: '100%', height: 280 }} />
            ) : currentChartData && currentChartData.length > 0 ? (
              <LineChart
                height={280}
                data={currentChartData}
                yAxisFormat={vaultData?.data?.overview?.asset?.symbol}
                showTimePeriodSelector={true}
                areaGradient
              />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280 }}>
                <Typography variant="secondary14" color="text.muted">
                  No historical data available for {currentChartLabel}.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* FLOW RIBBON — omni vaults only */}
      <VaultFlowRibbon
        vaultName={selectedVault?.overview?.name}
        vaultAssetSymbol={selectedVault?.overview?.asset?.symbol || vaultMetadata?.underlyingSymbol}
      />

      {/* BOTTOM TABS */}
      {isFlowTheme ? null : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            pb: 4,
            px: { xs: 2, md: 3 },
            bgcolor: isDark ? 'background.surface' : 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '14px',
            position: 'relative',
            zIndex: 1,
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
                fontWeight: 600,
                fontSize: '14px',
                textTransform: 'none',
                color: 'text.muted',
                '&.Mui-selected': { color: 'text.primary' },
              },
              borderBottom: '1px solid',
              borderColor: 'divider',
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
