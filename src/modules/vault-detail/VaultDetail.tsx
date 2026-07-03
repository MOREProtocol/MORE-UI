import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Skeleton,
  SvgIcon,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  useInboundRoutes,
  useUserPositionMultiChain,
  useVaultMetadata,
  useVaultStatus,
  useVaultTopology,
} from '@oydual31/more-vaults-sdk/react';
import { asSdkClient, canDeposit } from '@oydual31/more-vaults-sdk/viem';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { Address } from 'src/components/Address';
import { CompactMode } from 'src/components/CompactableTypography';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { formatTimeRemaining } from 'src/helpers/timeHelper';
import { isOmniSpokeVault } from 'src/hooks/vault/factoryRegistry';
import { useDepositWhitelist } from 'src/hooks/vault/useDepositWhitelist';
import { useVault } from 'src/hooks/vault/useVault';
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
import { FONT_DISPLAY } from 'src/utils/theme';
import { formatUnits } from 'viem';
import { useAccount, useChainId, usePublicClient, useSwitchChain } from 'wagmi';

import { LineChart } from '../charts/LineChart';
import { VaultActionsPanel } from './VaultActionsPanel';
import { VaultActivity } from './VaultActivity';
import { VaultAllocations } from './VaultAllocations';
import { VaultBridgeSharesToHubModal } from './VaultBridgeSharesToHubModal';
import { VaultDepositModal } from './VaultDepositModal';
import { VaultHeroCard } from './VaultHeroCard';
import { VaultKpiGrid } from './VaultKpiGrid';
import { VaultManagement } from './VaultManagement/VaultManagement';
import { VaultNotes } from './VaultNotes';
import { VaultRedeemModal } from './VaultRedeemModal';
import { VaultWhitelistModal } from './VaultWhitelistModal';

// Shared card shell for the panels — transcribed from the mockup's `.vault-panel`
// (surface + hairline border + 20px radius), matching the market detail page.
const panelSx = {
  backgroundColor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '20px',
  p: { xs: '22px 20px', md: '28px 32px' },
} as const;

const PanelTitle = ({ children }: { children: React.ReactNode }) => (
  <Typography
    sx={{
      fontFamily: FONT_DISPLAY,
      fontSize: 18,
      fontWeight: 600,
      letterSpacing: '-0.01em',
      color: 'text.primary',
      display: 'flex',
      alignItems: 'center',
      gap: 1,
    }}
  >
    {children}
  </Typography>
);

const ParamLabel = ({ children }: { children: React.ReactNode }) => (
  <Typography
    sx={{
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'text.secondary',
    }}
  >
    {children}
  </Typography>
);

type VaultDetailTab = 'overview' | 'performance' | 'activity' | 'manage';

export const VaultDetail = () => {
  const router = useRouter();
  const { selectedVaultId, accountAddress, chainId, isOmniHub, isChainDetected } = useVault();
  const isOmniSpoke = isOmniSpokeVault(chainId, selectedVaultId ?? '');
  const { address } = useAccount();
  const wagmiChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { topology } = useVaultTopology(selectedVaultId as `0x${string}` | undefined);
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
  const assetDecimals =
    vaultMetadata?.underlyingDecimals ?? selectedVault?.overview?.asset?.decimals ?? 6;

  // Prioritize SDK metadata (reads from correct hub chain) over legacy (may read wrong chain)
  const routeVaultAsset = (vaultMetadata?.underlying || selectedVault?.overview?.asset?.address) as
    | `0x${string}`
    | undefined;

  const isOmniFromTopology = topology?.role === 'hub' || topology?.role === 'spoke';

  const { routes: inboundRoutes } = useInboundRoutes(
    isOmniFromTopology ? topology?.hubChainId : undefined,
    isOmniFromTopology ? (selectedVaultId as `0x${string}`) : undefined,
    isOmniFromTopology ? routeVaultAsset : undefined,
    isOmniFromTopology ? (accountAddress as `0x${string}`) : undefined
  );

  const userVaultBalances = useUserVaultBalances(accountAddress, {
    enabled: !!accountAddress && isChainDetected,
  });

  const baseUrl = useMemo(
    () => chainId && networkConfigs[chainId] && networkConfigs[chainId].explorerLink,
    [chainId]
  );

  const hasNotes = !!selectedVault?.overview?.descriptionMarkdown;
  const [selectedTab, setSelectedTab] = useState<VaultDetailTab>('overview');
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
    return () => {
      cancelled = true;
    };
  }, [isOmniHub, selectedVaultId, hubPublicClient, accountAddress]);

  // Only block when we have a confirmed not-whitelisted result — never blocks while loading
  const isNotWhitelisted = isOmniHub
    ? omniDepositEligibility !== null &&
      !omniDepositEligibility.allowed &&
      omniDepositEligibility.reason === 'not-whitelisted'
    : isWhitelistEnabled && !isWhitelisted;

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
  const aumFormatted = selectedVault ? formatUnits(aum, assetDecimals) : '0';
  const legacyMaxWithdraw = userVaultData?.[0]?.data?.maxWithdraw;
  const sdkEstimatedAssets = userPosition?.estimatedAssets ?? BigInt(0);
  const maxWithdraw =
    sdkEstimatedAssets > BigInt(0)
      ? { gt: (n: number) => sdkEstimatedAssets > BigInt(n) }
      : legacyMaxWithdraw;

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
  const shares =
    sdkShares > 0
      ? sdkShares
      : thisVaultBalance
      ? parseFloat(thisVaultBalance.sharesBalance || '0')
      : 0;
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

  const handleDepositClick = () => {
    // Non-omni vault on wrong chain → switch first
    if (!isOmniVault && !isOnCorrectNetwork) {
      switchChain?.({ chainId: vaultNetwork || ChainIds.flowEVMMainnet });
      return;
    }
    setIsDepositModalOpen(true);
  };

  // Opens the shared, omni-capable redeem flow. Reused by both the mobile
  // fallback Withdraw button and the desktop panel's Withdraw tab CTA.
  const handleOpenRedeem = () => {
    if (!isOmniVault && !isOnCorrectNetwork) {
      switchChain?.({ chainId: vaultNetwork || ChainIds.flowEVMMainnet });
      return;
    }
    setIsRedeemModalOpen(true);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setSelectedTab(newValue as VaultDetailTab);
  };

  // ---- Derived presentational values for the hero card + parameters panel ----
  const legacyOverview = vaultData?.data?.overview;
  const legacyFin = vaultData?.data?.financials;
  const assetSymbol = selectedVault?.overview?.asset?.symbol || '';
  const assetPrice = assetData.data?.price || 0;
  const chainName = networkConfigs[vaultNetwork || ChainIds.flowEVMMainnet]?.name || '';
  const vaultExplorerLink =
    baseUrl && selectedVaultId ? `${baseUrl}/address/${selectedVaultId}` : undefined;
  const apy7Days = legacyOverview?.apy7Days;
  const tvlUsd = Number(aumFormatted || '0') * assetPrice;

  // Capacity — only when the vault exposes a deposit cap.
  let capacityPercent: number | undefined;
  let capacityRemaining: string | undefined;
  const depositCapacityRaw = legacyFin?.liquidity?.depositCapacity;
  if (depositCapacityRaw && depositCapacityRaw !== '0') {
    const capBI = BigInt(depositCapacityRaw);
    const taBI = BigInt(selectedVault?.financials?.liquidity?.totalAssets || '0');
    if (capBI > BigInt(0)) {
      capacityPercent = Math.min(100, Number((taBI * BigInt(10000)) / capBI) / 100);
      const remainingBI = isOmniHub
        ? capBI > taBI
          ? capBI - taBI
          : BigInt(0)
        : BigInt(legacyFin?.liquidity?.maxDeposit || '0');
      capacityRemaining = formatUnits(remainingBI, assetDecimals);
    }
  }

  const depositTokens =
    legacyOverview?.depositableAssets && legacyOverview.depositableAssets.length > 0
      ? legacyOverview.depositableAssets
      : [
          {
            address: selectedVault?.overview?.asset?.address,
            symbol: assetSymbol,
            name: undefined,
          },
        ];
  const depositTokenSymbols = depositTokens.map((t) => t?.symbol || '').filter(Boolean);

  const roles = selectedVault?.overview?.roles;
  const roleEntries: { label: string; address?: string }[] = [
    { label: 'Owner', address: roles?.owner },
    { label: 'Strategist', address: roles?.curator },
    { label: 'Guardian', address: roles?.guardian },
  ].filter((r) => !!r.address);

  const showDepositButton =
    !isLoading &&
    (isOmniHub || isOmniSpoke || !(vaultData?.data?.financials?.liquidity?.maxDeposit === '0'));
  const showWithdrawButton =
    !isLoading && !!accountAddress && (shares > 0 || (maxWithdraw && maxWithdraw.gt(0)));

  // Fallback CTA buttons (mobile / below lg) — open the existing global modals,
  // exactly as the pre-Task-15 page did.
  const mobileFallback = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {showDepositButton && (
        <Tooltip
          title={
            isNotWhitelisted ? 'Your address is not whitelisted for deposits in this vault' : ''
          }
          placement="top"
        >
          <span>
            <Button
              variant="gradient"
              color="primary"
              fullWidth
              onClick={handleDepositClick}
              disabled={isLoading || !accountAddress || isNotWhitelisted}
            >
              Deposit
            </Button>
          </span>
        </Tooltip>
      )}
      {showWithdrawButton && (
        <Button variant="gradient" fullWidth onClick={handleOpenRedeem} disabled={isLoading}>
          Withdraw
        </Button>
      )}
    </Box>
  );

  const chartCard = (
    <Box sx={panelSx}>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 2 }}>
        {[
          {
            key: 'sharePrice' as const,
            label: 'Share Price',
            value: selectedVault?.overview?.sharePrice?.toString() || '0',
            symbol: assetSymbol,
            compact: false,
          },
          {
            key: 'totalAssets' as const,
            label: 'Net Asset Value',
            value: aumFormatted || '0',
            symbol: assetSymbol,
            compact: true,
          },
        ].map((metric) => {
          const active = selectedChartDataKey === metric.key;
          return (
            <Box
              key={metric.key}
              component="button"
              onClick={() => setSelectedChartDataKey(metric.key)}
              sx={{
                background: 'none',
                border: 0,
                borderBottom: '2px solid',
                borderColor: active ? 'primary.main' : 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                p: '4px 0',
              }}
            >
              <ParamLabel>{metric.label}</ParamLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: '4px' }}>
                {isLoading ? (
                  <Skeleton width={80} height={28} />
                ) : (
                  <FormattedNumber
                    value={metric.value}
                    symbol={metric.symbol}
                    compact={metric.compact}
                    variant="main21"
                    sx={{
                      fontWeight: 700,
                      color: active ? 'text.primary' : 'text.secondary',
                    }}
                  />
                )}
                <SvgIcon
                  sx={{ fontSize: '18px', color: active ? 'primary.main' : 'text.secondary' }}
                >
                  <ShowChartIcon />
                </SvgIcon>
              </Box>
            </Box>
          );
        })}
      </Box>
      {isLoading ? (
        <Box sx={{ width: '100%', height: 300 }} />
      ) : currentChartData && currentChartData.length > 0 ? (
        <LineChart
          height={300}
          data={currentChartData}
          yAxisFormat={assetSymbol}
          showTimePeriodSelector={true}
        />
      ) : (
        <Typography sx={{ textAlign: 'center', py: 12, color: 'text.secondary' }}>
          No historical data available for {currentChartLabel}.
        </Typography>
      )}
    </Box>
  );

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 1600,
        mx: 'auto',
        px: { xs: 2, md: 4 },
        pt: { xs: 3, md: 3 },
        pb: { xs: 6, md: 12 },
      }}
    >
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

      {/* Slim top bar: back navigation + explorer link */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          mb: 2,
        }}
      >
        <SvgIcon
          sx={{
            fontSize: '20px',
            cursor: 'pointer',
            color: 'text.secondary',
            '&:hover': { color: 'text.primary' },
          }}
          onClick={() => router.push('/vaults')}
        >
          <ArrowBackRoundedIcon />
        </SvgIcon>
        {vaultExplorerLink && (
          <IconButton
            size="small"
            onClick={() => window.open(vaultExplorerLink, '_blank')}
            aria-label="open in explorer"
          >
            <OpenInNewIcon sx={{ fontSize: '0.875rem' }} />
          </IconButton>
        )}
      </Box>

      {/* Two-column layout: hero + tabs/panels (left), action panel (right). */}
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', lg: '1fr 400px' },
          gridTemplateAreas: {
            xs: `"hero" "panel" "main"`,
            lg: `"hero panel" "main panel"`,
          },
          alignItems: 'start',
        }}
      >
        <Box sx={{ gridArea: 'hero' }}>
          <VaultHeroCard
            name={selectedVault?.overview?.name || ''}
            chainName={chainName}
            explorerLink={vaultExplorerLink}
            isLoading={isLoading}
            assetSymbol={assetSymbol}
            isOmniHub={isOmniHub}
            apy={apy7Days}
            tvl={aumFormatted}
            tvlUsd={tvlUsd}
            curatorName={legacyOverview?.curatorName}
            inceptionTimestamp={legacyOverview?.creationTimestamp}
            capacityPercent={capacityPercent}
            capacityRemaining={capacityRemaining}
            depositTokenSymbols={depositTokenSymbols}
          />
        </Box>

        <Box sx={{ gridArea: 'panel' }}>
          <VaultActionsPanel
            whitelistAmount={whitelistAmount}
            inboundRoutes={inboundRoutes ?? []}
            mobileFallback={mobileFallback}
            onOpenRedeem={handleOpenRedeem}
            // Gate on the MERGED asset symbol (`selectedVault.overview.asset.symbol`,
            // surfaced here as `assetSymbol`). For omni vaults the legacy
            // `vaultData` may never populate `overview.asset.symbol`, so the old
            // legacy-only gate could spin forever; the merged value resolves from
            // SDK metadata (`vaultMetadata.underlyingSymbol`) once `isLoading`
            // clears. That symbol is all the deposit content needs at mount to
            // keep `AssetInput` from reading `asset.symbol` on nothing.
            ready={!isLoading && !!assetSymbol}
          />
        </Box>

        <Box sx={{ gridArea: 'main', minWidth: 0, mt: { xs: 1, lg: 2 } }}>
          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            aria-label="vault tabs"
            textColor="inherit"
            sx={{
              minHeight: 'unset',
              mb: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              '& .MuiTabs-indicator': { backgroundColor: 'primary.main', height: 2 },
              '& .MuiTab-root': {
                minWidth: 'auto',
                mr: 3,
                p: '12px 0',
                fontWeight: 600,
                fontSize: 14,
                textTransform: 'none',
                minHeight: 'unset',
              },
            }}
          >
            <Tab label="Overview" value="overview" />
            <Tab label="Performance" value="performance" />
            {!isOmniVault && <Tab label="Activity" value="activity" />}
            {canManageVault && <Tab label="Manage" value="manage" />}
          </Tabs>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {selectedTab === 'overview' && (
              <>
                {chartCard}

                {hasNotes && (
                  <Box sx={panelSx}>
                    <PanelTitle>Strategy</PanelTitle>
                    <Box sx={{ mt: 2 }}>
                      <VaultNotes />
                    </Box>
                  </Box>
                )}

                {roleEntries.length > 0 && (
                  <Box sx={panelSx}>
                    <PanelTitle>Roles</PanelTitle>
                    <Box
                      sx={{
                        mt: 2,
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                      }}
                    >
                      {roleEntries.map((role) => (
                        <Box key={role.label}>
                          <ParamLabel>{role.label}</ParamLabel>
                          <Box sx={{ mt: 1 }}>
                            <Address
                              address={role.address as string}
                              link={`${baseUrl}/address/${role.address}`}
                              loading={isLoading}
                              isUser
                              variant="secondary14"
                              compactMode={CompactMode.SM}
                            />
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                <Box sx={panelSx}>
                  <PanelTitle>Vault parameters</PanelTitle>
                  <Box
                    sx={{
                      mt: 2,
                      display: 'grid',
                      gap: 3,
                      gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
                    }}
                  >
                    <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
                      <ParamLabel>Deposit Tokens</ParamLabel>
                      <Box
                        sx={{
                          mt: 1,
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 2,
                        }}
                      >
                        {depositTokens.map((token) => (
                          <Box
                            key={token.address || token.symbol}
                            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                          >
                            <TokenIcon symbol={token.symbol || ''} fontSize="small" />
                            <Typography variant="main14" sx={{ fontWeight: 600 }}>
                              {token.symbol}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                    <Box>
                      <ParamLabel>Network</ParamLabel>
                      <Typography variant="main14" sx={{ mt: 1, fontWeight: 600 }}>
                        {chainName}
                      </Typography>
                    </Box>
                    <Box>
                      <ParamLabel>Performance Fee</ParamLabel>
                      <FormattedNumber
                        value={Number(legacyOverview?.fee || '0') / 10000}
                        percent
                        variant="main16"
                        sx={{ mt: 1, fontWeight: 600 }}
                      />
                    </Box>
                    {legacyOverview?.withdrawalTimelock && (
                      <Box>
                        <ParamLabel>Rebalance Timelock</ParamLabel>
                        <Typography variant="main14" sx={{ mt: 1, fontWeight: 600 }}>
                          {formatTimeRemaining(Number(legacyOverview.withdrawalTimelock))}
                        </Typography>
                      </Box>
                    )}
                    {legacyOverview?.curatorName && (
                      <Box>
                        <ParamLabel>Curator</ParamLabel>
                        <Typography variant="main14" sx={{ mt: 1, fontWeight: 600 }}>
                          {legacyOverview.curatorName}
                        </Typography>
                      </Box>
                    )}
                    {selectedVaultId && (
                      <Box>
                        <ParamLabel>Vault Address</ParamLabel>
                        <Box sx={{ mt: 1 }}>
                          <Address
                            address={selectedVaultId}
                            link={vaultExplorerLink}
                            variant="secondary14"
                            compactMode={CompactMode.SM}
                          />
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
              </>
            )}

            {selectedTab === 'performance' && (
              <>
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
                <Box sx={panelSx}>
                  <PanelTitle>Allocations</PanelTitle>
                  <VaultAllocations />
                </Box>
              </>
            )}

            {selectedTab === 'activity' && !isOmniVault && (
              <Box sx={panelSx}>
                <PanelTitle>Recent activity</PanelTitle>
                <VaultActivity />
              </Box>
            )}

            {selectedTab === 'manage' && canManageVault && (
              <Box sx={panelSx}>
                <VaultManagement />
              </Box>
            )}
          </Box>
        </Box>
      </Box>

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
