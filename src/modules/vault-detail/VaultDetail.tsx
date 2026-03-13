import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackOutlined';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
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
  getRouteTokenDecimals,
  useInboundRoutes,
  useVaultTopology,
  useVaultStatus,
  useVaultMetadata,
} from '@oydual31/more-vaults-sdk/react';
import type { InboundRouteWithBalance } from '@oydual31/more-vaults-sdk/viem';
import BigNumber from 'bignumber.js';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { Address } from 'src/components/Address';
import { CompactMode } from 'src/components/CompactableTypography';
import { RewardsButton } from 'src/components/incentives/IncentivesButton';
import { MarketLogo } from 'src/components/MarketSwitcher';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { UsdChip } from 'src/components/primitives/UsdChip';
import { formatTimeRemaining } from 'src/helpers/timeHelper';
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
import { formatUnits } from 'viem';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';

import { LineChart } from '../charts/LineChart';
import { VaultActivity } from './VaultActivity';
import { VaultAllocations } from './VaultAllocations';
import { VaultBridgeSharesToHubModal } from './VaultBridgeSharesToHubModal';
import { VaultDepositModal } from './VaultDepositModal';
import { VaultManagement } from './VaultManagement/VaultManagement';
import { VaultNotes } from './VaultNotes';
import { VaultRedeemModal } from './VaultRedeemModal';
import { VaultWhitelistModal } from './VaultWhitelistModal';

export const VaultDetail = () => {
  const router = useRouter();
  const { selectedVaultId, accountAddress, chainId, isOmniHub } = useVault();
  const isOmniSpoke = isOmniSpokeVault(chainId, selectedVaultId ?? '');
  const { address } = useAccount();
  const wagmiChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { topology, needsNetworkSwitch } = useVaultTopology(
    selectedVaultId as `0x${string}` | undefined
  );
  const sdkChainId = topology?.hubChainId ?? chainId;
  const { data: vaultStatus, isLoading: statusLoading } = useVaultStatus(
    selectedVaultId as `0x${string}` | undefined,
    sdkChainId
  );
  const { data: vaultMetadata } = useVaultMetadata(
    selectedVaultId as `0x${string}` | undefined,
    sdkChainId
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

  const vaultAssetAddress = selectedVault?.overview?.asset?.address;
  const routeVaultAsset = (vaultAssetAddress || vaultMetadata?.underlying) as `0x${string}` | undefined;

  const { routes: inboundRoutes } = useInboundRoutes(
    isOmniHub ? topology?.hubChainId : undefined,
    isOmniHub ? (selectedVaultId as `0x${string}`) : undefined,
    isOmniHub ? routeVaultAsset : undefined,
    isOmniHub ? (accountAddress as `0x${string}`) : undefined
  );
  const userVaultBalances = useUserVaultBalances(accountAddress, { enabled: !!accountAddress });
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
  const [isRoutePickerOpen, setIsRoutePickerOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<InboundRouteWithBalance | null>(null);
  const [pickerStep, setPickerStep] = useState<'chain' | 'asset'>('chain');
  const [pickerChainId, setPickerChainId] = useState<number | null>(null);
  const [selectedChartDataKey, setSelectedChartDataKey] = useState<'sharePrice' | 'totalAssets'>(
    'sharePrice'
  );

  // Get whitelist data from smart contract
  const { isWhitelisted, whitelistAmount, isWhitelistEnabled } = useDepositWhitelist();

  // Group inbound routes by chain for the 2-step route picker
  const routesByChain = useMemo(() => {
    if (!inboundRoutes || inboundRoutes.length === 0) return [];
    const chainMap = new Map<
      number,
      {
        chainId: number;
        chainName: string;
        chainLogo: string | undefined;
        isDirect: boolean;
        totalBalance: number;
        nativeSymbol: string;
        routes: InboundRouteWithBalance[];
      }
    >();
    for (const route of inboundRoutes) {
      const cfg = networkConfigs[route.spokeChainId];
      if (!chainMap.has(route.spokeChainId)) {
        chainMap.set(route.spokeChainId, {
          chainId: route.spokeChainId,
          chainName: cfg?.name || `Chain ${route.spokeChainId}`,
          chainLogo: cfg?.networkLogoPath,
          isDirect: route.depositType === 'direct' || route.depositType === 'direct-async',
          totalBalance: 0,
          nativeSymbol: route.nativeSymbol,
          routes: [],
        });
      }
      const entry = chainMap.get(route.spokeChainId)!;
      entry.routes.push(route);
      const decimals = getRouteTokenDecimals(route.symbol);
      entry.totalBalance += parseFloat(formatUnits(route.userBalance, decimals));
    }
    // Hub chain first, then spokes sorted by balance desc
    return Array.from(chainMap.values()).sort((a, b) => {
      if (a.isDirect && !b.isDirect) return -1;
      if (!a.isDirect && b.isDirect) return 1;
      return b.totalBalance - a.totalBalance;
    });
  }, [inboundRoutes]);

  const vaultNetwork = selectedVault?.chainId || sdkChainId;
  const isOnCorrectNetwork = wagmiChainId === vaultNetwork;
  const shouldShowNetworkBanner = address && vaultNetwork && !isOnCorrectNetwork && !isOmniHub && !isOmniSpoke;
  const sdkReady = !!sdkVault;
  const topologyReady = !!topology;
  const isLoading = !topologyReady || (!sdkReady && statusLoading) || shouldShowNetworkBanner;
  const isUserVaultDataLoading = userVaultData?.[0]?.isLoading || shouldShowNetworkBanner;
  const isUserVaultBalancesLoading = userVaultBalances?.isLoading;

  // Get asset data using oracle + fallback to reserve
  const assetData = useAssetData(selectedVault?.overview?.asset?.address || '', {
    enabled: !!selectedVault?.overview?.asset?.address,
  });
  const aum = selectedVault ? BigInt(selectedVault?.financials?.liquidity?.totalAssets) : BigInt(0);
  const aumFormatted = selectedVault
    ? formatUnits(aum, selectedVault?.overview?.asset?.decimals || 18)
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
  const maxWithdraw = userVaultData?.[0]?.data?.maxWithdraw;

  // const secondsSinceInception = Number(new Date().getTime() / 1000) - Number(selectedVault?.overview?.creationTimestamp);

  const canManageVault = vaultData?.data?.overview?.roles?.curator === accountAddress;

  // Calculate user's P&L for this specific vault using live recomputed metrics
  const portfolioMetricsQuery = useUserPortfolioMetrics(accountAddress || '', '3m', {
    enabled: !!accountAddress,
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

  const shares = thisVaultBalance ? parseFloat(thisVaultBalance.sharesBalance || '0') : 0;
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
    setSelectedRoute(null);
    setPickerStep('chain');
    setPickerChainId(null);
    if (isWhitelistEnabled && !isWhitelisted) {
      setIsWhitelistModalOpen(true);
      return;
    }
    if (isOmniHub && inboundRoutes && inboundRoutes.length > 0) {
      setIsRoutePickerOpen(true);
    } else {
      setIsDepositModalOpen(true);
    }
  };

  const handleChainSelect = (chainId: number) => {
    const chainGroup = routesByChain.find((c) => c.chainId === chainId);
    if (!chainGroup) return;

    // Single asset on this chain → skip asset selection, go straight to deposit
    if (chainGroup.routes.length === 1) {
      setIsRoutePickerOpen(false);
      setSelectedRoute(chainGroup.routes[0]);
      setIsDepositModalOpen(true);
      return;
    }

    // Multiple assets → show asset picker
    setPickerChainId(chainId);
    setPickerStep('asset');
  };

  const handleAssetSelect = (route: InboundRouteWithBalance) => {
    setIsRoutePickerOpen(false);
    setSelectedRoute(route);
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
      {/* Network Status Check */}
      {!needsNetworkSwitch && shouldShowNetworkBanner && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="main14">
            Wrong Network:{' '}
            <Typography
              component="span"
              variant="main14"
              onClick={() => switchChain?.({ chainId: vaultNetwork || ChainIds.flowEVMMainnet })}
              sx={{
                textDecoration: 'underline',
                cursor: 'pointer',
                '&:hover': { color: 'primary.dark' },
              }}
            >
              Please switch to{' '}
              {networkConfigs[vaultNetwork || ChainIds.flowEVMMainnet]?.name ||
                'the correct network'}
            </Typography>{' '}
            to view vault details
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
                    {`${
                      selectedVault?.overview?.asset?.symbol || selectedVault?.overview?.name || ''
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
                  label="Omni-Chain Hub"
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ ml: 0.5 }}
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
              <Button
                variant="gradient"
                color="primary"
                onClick={handleDepositClick}
                disabled={isLoading || !accountAddress}
              >
                Deposit
              </Button>
            )}
          {!isLoading &&
            !isUserVaultDataLoading &&
            accountAddress &&
            ((isOmniHub && shares > 0) ||
              isOmniSpoke ||
              (maxWithdraw && maxWithdraw.gt(0))) && (
              <Button
                variant="gradient"
                size="medium"
                onClick={() => isOmniSpoke ? setIsBridgeModalOpen(true) : setIsRedeemModalOpen(true)}
                disabled={isLoading || isUserVaultDataLoading}
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
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 2 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', xsm: '1fr 1fr' },
              height: '100%',
              gap: 3,
              p: { xs: 4, md: 6 },
              backgroundColor: 'background.paper',
              borderRadius: 2,
            }}
          >
            {/* Row 1 - My deposits */}
            <Box>
              <Typography variant="secondary14" color="text.secondary">
                My Deposits
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 1,
                  alignItems: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {!accountAddress ? (
                    <Typography variant="main16">–</Typography>
                  ) : isLoading || isUserVaultDataLoading ? (
                    <Skeleton width={80} height={24} />
                  ) : (
                    <FormattedNumber
                      value={
                        formatUnits(
                          maxWithdraw?.toBigInt() || BigInt(0),
                          vaultData?.data?.overview?.asset?.decimals || 18
                        ) || ''
                      }
                      symbol={vaultData?.data?.overview?.asset?.symbol || ''}
                      variant="main16"
                      compact
                    />
                  )}
                </Box>
                {accountAddress && !isLoading && !isUserVaultDataLoading && (
                  <UsdChip
                    value={
                      new BigNumber(
                        formatUnits(
                          maxWithdraw?.toBigInt() || BigInt(0),
                          vaultData?.data?.overview?.asset?.decimals || 18
                        ) || '0'
                      )
                        .multipliedBy(assetData.data?.price || 0)
                        .toString() || '0'
                    }
                  />
                )}
              </Box>
            </Box>

            {/* Row 1 - My Gains / Losses */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="secondary14" color="text.secondary">
                  My Gains / Losses
                </Typography>
                <Tooltip
                  title={
                    <Box>
                      <Typography variant="main12" sx={{ fontWeight: 600 }}>
                        Unrealized PnL
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FormattedNumber
                          value={pnlPercentageAsset}
                          percent
                          variant="secondary12"
                          compact
                          symbolsColor="#F1F1F3"
                        />
                      </Box>
                    </Box>
                  }
                  arrow
                  placement="top"
                >
                  <InfoIcon sx={{ fontSize: '14px', color: 'text.secondary' }} />
                </Tooltip>
                {accountAddress && perVault && (
                  <Tooltip title="Share on X" arrow placement="top">
                    <IconButton
                      size="small"
                      aria-label="share PnL on X"
                      sx={{ padding: '1px' }}
                      onClick={() => {
                        const rawPnLAsset = totalPnLInAsset || 0;
                        const priceUsd = assetData.data?.price || 0;
                        const rawPnLUsd = rawPnLAsset * priceUsd;
                        const absAsset = Math.abs(rawPnLAsset);
                        const absUsd = Math.abs(rawPnLUsd);
                        const assetDecimals = absAsset >= 1 ? 2 : 6;
                        const formattedAsset = new Intl.NumberFormat('en-US', {
                          maximumFractionDigits: assetDecimals,
                          minimumFractionDigits: 0,
                        }).format(absAsset);
                        const assetSymbol = selectedVault?.overview?.asset?.symbol || '';
                        const valueStringUsd = new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          maximumFractionDigits: 2,
                        }).format(absUsd);
                        const direction =
                          rawPnLAsset > 0 ? 'gain' : rawPnLAsset < 0 ? 'loss' : 'break-even';
                        const vaultName = selectedVault?.overview?.name || 'this vault';
                        const text = `My PnL shows a ${formattedAsset} ${assetSymbol} (${valueStringUsd}) ${direction} on my LP to ${vaultName} on @MORE_DeFi.`;
                        const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
                        window.open(url, '_blank');
                      }}
                    >
                      <ShareOutlinedIcon sx={{ fontSize: '14px', color: 'text.secondary' }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {!accountAddress ? (
                  <Typography variant="main16" fontWeight={600}>
                    –
                  </Typography>
                ) : isLoading ||
                  isUserVaultBalancesLoading ||
                  isUserVaultDataLoading ||
                  assetData.isLoading ? (
                  <Skeleton width={80} height={24} />
                ) : !perVault ? (
                  <Typography variant="main16" fontWeight={600}>
                    –
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormattedNumber
                      value={totalPnLInAsset}
                      symbol={selectedVault?.overview?.asset?.symbol || ''}
                      variant="main16"
                      compact
                    />
                    <UsdChip
                      value={
                        new BigNumber(totalPnLInAsset)
                          .multipliedBy(assetData.data?.price || 0)
                          .toString() || '0'
                      }
                    />
                  </Box>
                )}
              </Box>
            </Box>

            {/* Row 2 - Deposit Tokens */}
            <Box>
              <Typography variant="secondary14" color="text.secondary">
                Deposit Tokens
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {isLoading ? (
                  <Skeleton width={80} height={24} />
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    {(selectedVault?.overview?.depositableAssets &&
                    selectedVault.overview.depositableAssets.length > 0
                      ? selectedVault.overview.depositableAssets
                      : [
                          {
                            address: selectedVault?.overview?.asset?.address || '',
                            symbol: selectedVault?.overview?.asset?.symbol || '',
                          },
                        ]
                    ).map((token) => (
                      <Box
                        key={token.address || token.symbol || Math.random().toString()}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <TokenIcon symbol={token.symbol || ''} fontSize="medium" />
                        <Typography variant="main16" fontWeight={600}>
                          {token.symbol || ''}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>

            {/* Row 2 - Networks (compact) */}
            <Box>
              <Typography variant="secondary14" color="text.secondary">
                Networks
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isLoading ? (
                  <Skeleton width={80} height={24} />
                ) : (
                  (() => {
                    const hubChainId = topology?.hubChainId ?? chainId;
                    const hubCfg = networkConfigs[hubChainId];
                    const spokeIds = topology?.spokeChainIds || [];
                    const allChainIds = [hubChainId, ...spokeIds];
                    return (
                      <>
                        {/* Overlapping chain logos */}
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {allChainIds.map((cId, idx) => (
                            <Box
                              key={cId}
                              sx={{ ml: idx > 0 ? '-6px' : 0, zIndex: allChainIds.length - idx }}
                            >
                              <MarketLogo size={22} logo={networkConfigs[cId]?.networkLogoPath} />
                            </Box>
                          ))}
                        </Box>
                        <Typography variant="main14">
                          {hubCfg?.name || `Chain ${hubChainId}`}
                          {spokeIds.length > 0 &&
                            ` + ${spokeIds.length} chain${spokeIds.length > 1 ? 's' : ''}`}
                        </Typography>
                        {needsNetworkSwitch && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => switchChain?.({ chainId: hubChainId })}
                            sx={{ ml: 1, py: 0, fontSize: '0.7rem' }}
                          >
                            Switch
                          </Button>
                        )}
                      </>
                    );
                  })()
                )}
              </Box>
            </Box>

            {/* Row 3 - Remaining Capacity */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="secondary14" color="text.secondary">
                  Remaining Capacity
                </Typography>
                <Tooltip
                  title={
                    <Box>
                      <Typography variant="main12" sx={{ fontWeight: 600 }}>
                        Deposit Cap
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FormattedNumber
                          value={
                            formatUnits(
                              BigInt(
                                vaultData?.data?.financials?.liquidity?.depositCapacity || '0'
                              ),
                              vaultData?.data?.overview?.asset?.decimals || 18
                            ) || ''
                          }
                          symbol={vaultData?.data?.overview?.asset?.symbol || ''}
                          variant="secondary12"
                          compact
                          symbolsColor="#F1F1F3"
                        />
                        <UsdChip
                          value={
                            new BigNumber(
                              formatUnits(
                                BigInt(
                                  vaultData?.data?.financials?.liquidity?.depositCapacity || '0'
                                ),
                                vaultData?.data?.overview?.asset?.decimals || 18
                              ) || '0'
                            )
                              .multipliedBy(assetData.data?.price || 0)
                              .toString() || '0'
                          }
                        />
                      </Box>
                    </Box>
                  }
                  arrow
                  placement="top"
                >
                  <InfoIcon sx={{ fontSize: '14px', color: 'text.secondary' }} />
                </Tooltip>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 1,
                  alignItems: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {isLoading ? (
                    <Skeleton width={80} height={24} />
                  ) : (
                    <FormattedNumber
                      value={
                        formatUnits(
                          // Omni hub vaults return 0 for maxDeposit (bridge routing); use depositCapacity - totalAssets instead
                          isOmniHub
                            ? BigInt(
                                vaultData?.data?.financials?.liquidity?.depositCapacity || '0'
                              ) - BigInt(vaultData?.data?.financials?.liquidity?.totalAssets || '0')
                            : BigInt(vaultData?.data?.financials?.liquidity?.maxDeposit || '0'),
                          vaultData?.data?.overview?.asset?.decimals || 18
                        ) || ''
                      }
                      symbol={vaultData?.data?.overview?.asset?.symbol || ''}
                      variant="main16"
                      compact
                    />
                  )}
                </Box>
                {!isLoading && (
                  <UsdChip
                    value={
                      new BigNumber(
                        formatUnits(
                          isOmniHub
                            ? BigInt(
                                vaultData?.data?.financials?.liquidity?.depositCapacity || '0'
                              ) - BigInt(vaultData?.data?.financials?.liquidity?.totalAssets || '0')
                            : BigInt(vaultData?.data?.financials?.liquidity?.maxDeposit || '0'),
                          vaultData?.data?.overview?.asset?.decimals || 18
                        ) || '0'
                      )
                        .multipliedBy(assetData.data?.price || 0)
                        .toString() || '0'
                    }
                  />
                )}
              </Box>
            </Box>

            {/* Row 3 - Available Liquidity */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="secondary14" color="text.secondary">
                  7 Days APY
                </Typography>
                <Tooltip
                  title={
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="main12" sx={{ fontWeight: 600 }}>
                        Details
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          <Typography variant="secondary12">1 Day APY:</Typography>
                          <FormattedNumber
                            value={vaultData?.data?.overview?.apy1Day || ''}
                            percent
                            variant="secondary12"
                            compact
                            symbolsColor="#F1F1F3"
                          />
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          <Typography variant="secondary12">30 Days APY:</Typography>
                          <FormattedNumber
                            value={vaultData?.data?.overview?.apy30Days || ''}
                            percent
                            variant="secondary12"
                            compact
                            symbolsColor="#F1F1F3"
                          />
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          <Typography variant="secondary12">APY:</Typography>
                          <FormattedNumber
                            value={vaultData?.data?.overview?.apy || ''}
                            percent
                            variant="secondary12"
                            compact
                            symbolsColor="#F1F1F3"
                          />
                        </Box>
                      </Box>
                    </Box>
                  }
                  arrow
                  placement="top"
                >
                  <InfoIcon sx={{ fontSize: '14px', color: 'text.secondary' }} />
                </Tooltip>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 1,
                  alignItems: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {isLoading ? (
                    <Skeleton width={80} height={24} />
                  ) : (
                    <FormattedNumber
                      value={vaultData?.data?.overview?.apy7Days || ''}
                      percent
                      variant="main16"
                      compact
                    />
                  )}
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
            </Box>

            {/* Row 3 - Rebalance Timelock */}
            <Box>
              <Typography variant="secondary14" color="text.secondary">
                Rebalance Timelock
              </Typography>
              <Typography variant="main16" fontWeight={600}>
                {isLoading ? (
                  <Skeleton width={60} height={24} />
                ) : vaultData?.data?.overview?.withdrawalTimelock ? (
                  formatTimeRemaining(Number(vaultData.data.overview.withdrawalTimelock))
                ) : (
                  'N/A'
                )}
              </Typography>
            </Box>

            {/* Row 4 - Fee */}
            <Box>
              <Typography variant="secondary14" color="text.secondary">
                Fee
              </Typography>
              {isLoading ? (
                <Skeleton width={60} height={24} />
              ) : (
                <FormattedNumber
                  value={Number(vaultData?.data?.overview?.fee || '0') / 10000}
                  percent
                  variant="main16"
                />
              )}
            </Box>
          </Box>
        </Box>

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
                      value={vaultData?.data?.overview?.sharePrice.toString() || '0'}
                      symbol={vaultData?.data?.overview?.asset?.symbol || ''}
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
                      symbol={vaultData?.data?.overview?.asset?.symbol || ''}
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
            <Tab label="Activity" value="activity" />
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
        setIsOpen={(open) => {
          setIsDepositModalOpen(open);
          if (!open) setSelectedRoute(null);
        }}
        whitelistAmount={whitelistAmount}
        route={selectedRoute ?? undefined}
      />
      <VaultRedeemModal isOpen={isRedeemModalOpen} setIsOpen={setIsRedeemModalOpen} />
      <VaultWhitelistModal isOpen={isWhitelistModalOpen} setIsOpen={setIsWhitelistModalOpen} />
      <VaultBridgeSharesToHubModal isOpen={isBridgeModalOpen} setIsOpen={setIsBridgeModalOpen} />

      {/* Route picker — 2-step flow: Chain → Asset */}
      <Dialog
        open={isRoutePickerOpen}
        onClose={() => {
          setIsRoutePickerOpen(false);
          setPickerStep('chain');
          setPickerChainId(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ pb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          {pickerStep === 'asset' && (
            <IconButton
              size="small"
              onClick={() => {
                setPickerStep('chain');
                setPickerChainId(null);
              }}
              sx={{ mr: 0.5 }}
            >
              <ArrowBackRoundedIcon fontSize="small" />
            </IconButton>
          )}
          <Box>
            {pickerStep === 'chain' ? 'Select network' : 'Select asset'}
            <Typography
              variant="secondary14"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.25 }}
            >
              {pickerStep === 'chain'
                ? 'Where are your funds?'
                : `Deposit from ${networkConfigs[pickerChainId!]?.name || 'selected chain'}`}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            pb: 2.5,
            pt: '12px !important',
          }}
        >
          {/* Step 1: Chain selection */}
          {pickerStep === 'chain' &&
            routesByChain.map((chain) => {
              const hasBalance = chain.totalBalance > 0;
              return (
                <Box
                  key={chain.chainId}
                  onClick={() => handleChainSelect(chain.chainId)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    py: 2,
                    px: 2.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, background 0.15s',
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <MarketLogo size={36} logo={chain.chainLogo} />
                    <Box>
                      <Typography variant="main16" fontWeight={600}>
                        {chain.chainName}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                        {chain.isDirect ? (
                          <Chip
                            label="Direct"
                            size="small"
                            color="success"
                            sx={{ fontSize: '0.65rem', height: 18 }}
                          />
                        ) : (
                          <Chip
                            label="Cross-chain"
                            size="small"
                            sx={{ fontSize: '0.65rem', height: 18, bgcolor: 'action.hover' }}
                          />
                        )}
                        <Typography variant="secondary12" color="text.secondary">
                          {chain.routes.length} {chain.routes.length === 1 ? 'asset' : 'assets'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  {hasBalance && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                        flexShrink: 0,
                      }}
                    />
                  )}
                </Box>
              );
            })}

          {/* Step 2: Asset selection within chosen chain */}
          {pickerStep === 'asset' &&
            pickerChainId != null &&
            (() => {
              const chainGroup = routesByChain.find((c) => c.chainId === pickerChainId);
              if (!chainGroup) return null;
              return chainGroup.routes.map((route, idx) => {
                const decimals = getRouteTokenDecimals(route.symbol);
                const hasBalance = route.userBalance > BigInt(0);
                const formattedBalance = parseFloat(
                  formatUnits(route.userBalance, decimals)
                ).toLocaleString(undefined, { maximumFractionDigits: 4 });
                const lzFeeEth =
                  route.depositType === 'oft-compose'
                    ? parseFloat(formatUnits(route.lzFeeEstimate, 18)).toFixed(5)
                    : null;
                return (
                  <Box
                    key={idx}
                    onClick={() => handleAssetSelect(route)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                      py: 2,
                      px: 2.5,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      opacity: hasBalance ? 1 : 0.45,
                      transition: 'border-color 0.15s, background 0.15s',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <TokenIcon symbol={route.sourceTokenSymbol} sx={{ fontSize: 36 }} />
                      <Box>
                        <Typography variant="main16" fontWeight={600}>
                          {route.sourceTokenSymbol}
                        </Typography>
                        {lzFeeEth && (
                          <Typography variant="secondary12" color="text.secondary">
                            ~{lzFeeEth} {route.nativeSymbol} bridge fee
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                      <Typography
                        variant="secondary14"
                        fontWeight={600}
                        color={hasBalance ? 'text.primary' : 'text.secondary'}
                      >
                        {hasBalance ? formattedBalance : '0'}
                      </Typography>
                      <Typography variant="secondary12" color="text.secondary">
                        {route.sourceTokenSymbol}
                      </Typography>
                    </Box>
                  </Box>
                );
              });
            })()}
        </DialogContent>
      </Dialog>
    </Box>
  );
};
