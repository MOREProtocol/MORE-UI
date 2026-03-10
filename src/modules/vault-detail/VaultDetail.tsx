import { Avatar, Box, Button, Chip, Skeleton, SvgIcon, Tab, Tabs, Typography, useMediaQuery, useTheme, Tooltip, IconButton, Alert } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackOutlined';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import { useVault, VaultTab } from 'src/hooks/vault/useVault';
import { useEffect, useMemo, useState } from 'react';
import { useUserVaultsData, useVaultData, useAssetData, useUserVaultBalances, useUserPortfolioMetrics, useVaultsSharePriceAsset } from 'src/hooks/vault/useVaultData';
import { CompactMode } from 'src/components/CompactableTypography';
import { Address } from 'src/components/Address';
import { networkConfigs } from 'src/utils/marketsAndNetworksConfig';
import { useDepositWhitelist } from 'src/hooks/vault/useDepositWhitelist';
import { VaultWhitelistModal } from './VaultWhitelistModal';
import { VaultDepositModal } from './VaultDepositModal';
import { VaultRedeemModal } from './VaultRedeemModal';
import { VaultBridgeSharesToHubModal } from './VaultBridgeSharesToHubModal';
import { LineChart } from '../charts/LineChart';
import { MarketLogo } from 'src/components/MarketSwitcher';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { UsdChip } from 'src/components/primitives/UsdChip';
import { formatUnits } from 'viem';
import { formatTimeRemaining } from 'src/helpers/timeHelper';
import { useRouter } from 'next/router';
import BigNumber from 'bignumber.js';
import { VaultActivity } from './VaultActivity';
import { VaultAllocations } from './VaultAllocations';
import { VaultManagement } from './VaultManagement/VaultManagement';
import { VaultNotes } from './VaultNotes';
import { RewardsButton } from 'src/components/incentives/IncentivesButton';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { ChainIds } from 'src/utils/const';
import { isOmniSpokeVault } from 'src/hooks/vault/factoryRegistry';
import {
  getRouteTokenDecimals,
  useInboundRoutes,
  useVaultDistribution,
  useVaultTopology,
} from '@oydual31/more-vaults-sdk/react';
import type { InboundRouteWithBalance } from '@oydual31/more-vaults-sdk/viem';

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
  const { distribution, isLoading: isDistributionLoading } = useVaultDistribution(
    selectedVaultId as `0x${string}` | undefined
  );

  const userVaultData = useUserVaultsData(accountAddress, [selectedVaultId], { enabled: !!selectedVaultId && !!accountAddress });
  const vaultData = useVaultData(selectedVaultId);
  const vaultAssetAddress = vaultData?.data?.overview?.asset?.address;
  const { routes: inboundRoutes, isLoading: isRoutesLoading } = useInboundRoutes(
    isOmniHub ? topology?.hubChainId : undefined,
    isOmniHub ? selectedVaultId as `0x${string}` : undefined,
    isOmniHub ? vaultAssetAddress as `0x${string}` : undefined,
    isOmniHub ? accountAddress as `0x${string}` : undefined
  );
  const userVaultBalances = useUserVaultBalances(accountAddress, { enabled: !!accountAddress });
  const theme = useTheme();
  const downToMd = useMediaQuery(theme.breakpoints.down('md'));
  const downToMdLg = useMediaQuery(theme.breakpoints.down('mdlg'));
  const xPadding = downToMd ? 5 : 7;

  const baseUrl = useMemo(() => chainId && networkConfigs[chainId] && networkConfigs[chainId].explorerLink, [chainId]);

  const selectedVault = vaultData?.data;
  const hasNotes = !!selectedVault?.overview?.descriptionMarkdown;
  const [selectedTab, setSelectedTab] = useState<VaultTab>(hasNotes ? 'notes' : 'allocations');
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [isWhitelistModalOpen, setIsWhitelistModalOpen] = useState(false);
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<InboundRouteWithBalance | null>(null);
  const [selectedChartDataKey, setSelectedChartDataKey] = useState<'sharePrice' | 'totalAssets'>('sharePrice');

  // Get whitelist data from smart contract
  const { isWhitelisted, whitelistAmount, isWhitelistEnabled } = useDepositWhitelist();

  // Check if user is on the correct network for this specific vault
  const vaultNetwork = selectedVault?.chainId;
  const isOnCorrectNetwork = wagmiChainId === vaultNetwork;
  const shouldShowNetworkBanner = address && vaultNetwork && !isOnCorrectNetwork;
  // Keep loading state active when on wrong network
  const isLoading = vaultData?.isLoading || shouldShowNetworkBanner;
  const isUserVaultDataLoading = userVaultData?.[0]?.isLoading || shouldShowNetworkBanner;
  const isUserVaultBalancesLoading = userVaultBalances?.isLoading;

  // Get asset data using oracle + fallback to reserve
  const assetData = useAssetData(selectedVault?.overview?.asset?.address || '', {
    enabled: !!selectedVault?.overview?.asset?.address
  });
  const aum = selectedVault
    ? BigInt(selectedVault?.financials?.liquidity?.totalAssets)
    : BigInt(0);
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
  const portfolioMetricsQuery = useUserPortfolioMetrics(accountAddress || '', '3m', { enabled: !!accountAddress });
  const perVaultMetrics = portfolioMetricsQuery.data?.perVaultMetrics || [];
  const perVault = perVaultMetrics.find(m => m.vaultId.toLowerCase() === (selectedVaultId || '').toLowerCase());

  // Compute P&L in asset denomination properly: realized (asset) + unrealized (shares*(sharePriceAsset - WACB))
  const thisVaultBalance = userVaultBalances?.data?.find(
    (b) => b.vault.id.toLowerCase() === (selectedVaultId || '').toLowerCase()
  );
  const shareInfo = useVaultsSharePriceAsset(selectedVaultId ? [selectedVaultId] : [], { enabled: !!selectedVaultId });
  const sharePriceAsset = shareInfo.data && shareInfo.data[0] ? shareInfo.data[0].sharePriceAsset : 0;

  const shares = thisVaultBalance ? parseFloat(thisVaultBalance.sharesBalance || '0') : 0;
  const wacb = thisVaultBalance ? parseFloat(thisVaultBalance.weightedAverageCostBasis || '0') : 0;
  const realizedAssetPnL = thisVaultBalance ? parseFloat(thisVaultBalance.realizedPnL || '0') : 0;
  const unrealizedAssetPnL = shares * (sharePriceAsset - wacb);
  const totalPnLInAsset = realizedAssetPnL + unrealizedAssetPnL;

  // Asset-based invested and percent
  const totalInvestedAsset = thisVaultBalance ? (parseFloat(thisVaultBalance.totalDeposited || '0') - parseFloat(thisVaultBalance.totalWithdrawn || '0')) : 0;
  const pnlPercentageAsset = totalInvestedAsset > 0 ? (totalPnLInAsset / totalInvestedAsset) : 0;

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
    if (!isWhitelistEnabled) {
      setIsDepositModalOpen(true);
    } else if (isWhitelisted) {
      setIsDepositModalOpen(true);
    } else {
      setIsWhitelistModalOpen(true);
    }
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
      {needsNetworkSwitch && topology && address && (
        <Alert
          severity="warning"
          sx={{ mb: 1 }}
          action={
            <Button
              size="small"
              variant="contained"
              color="warning"
              onClick={() => switchChain?.({ chainId: topology.hubChainId })}
            >
              Switch to {networkConfigs[topology.hubChainId]?.name || `Chain ${topology.hubChainId}`}
            </Button>
          }
        >
          You are on a spoke chain. Deposits and redeems must be done on the hub:{' '}
          <strong>{networkConfigs[topology.hubChainId]?.name || `Chain ${topology.hubChainId}`}</strong>
        </Alert>
      )}
      {!needsNetworkSwitch && shouldShowNetworkBanner && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="main14">
            Wrong Network:{' '}
            <Typography
              component="span"
              variant="main14"
              onClick={() => switchChain?.({ chainId: vaultNetwork || ChainIds.flowEVMMainnet })}
              sx={{ textDecoration: 'underline', cursor: 'pointer', '&:hover': { color: 'primary.dark' } }}
            >
              Please switch to {networkConfigs[vaultNetwork || ChainIds.flowEVMMainnet]?.name || 'the correct network'}
            </Typography>
            {' '}to view vault details
          </Typography>
        </Alert>
      )}

      {/* TOP DETAILS */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        backgroundColor: 'background.surface',
        p: 3,
        borderRadius: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SvgIcon sx={{ fontSize: '20px', cursor: 'pointer', color: 'primary.main', '&:hover': { color: 'primary.light' } }} onClick={() => router.push('/vaults')}>
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
                    {`${selectedVault?.overview?.asset?.symbol || selectedVault?.overview?.name || ''} Vault`}
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
                <Chip label="Omni-Chain Hub" size="small" color="primary" variant="outlined" sx={{ ml: 0.5 }} />
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
        <Box sx={{ display: downToMd ? 'none' : 'flex', alignItems: 'left', flexDirection: 'row', gap: 5 }}>
          {isLoading ? (
            <Skeleton width={150} height={20} />
          ) : selectedVault?.overview?.roles?.owner && (
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
          )}
          {isLoading ? (
            <Skeleton width={150} height={20} />
          ) : selectedVault?.overview?.roles?.curator && (
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
          )}
          {isLoading ? (
            <Skeleton width={150} height={20} />
          ) : selectedVault?.overview?.roles?.guardian && (
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
          )}
        </Box>
        <Box sx={{
          display: 'flex',
          alignItems: 'left',
          flexDirection: downToMdLg ? 'column' : 'row',
          gap: 2,
        }}>
          {!isLoading && (isOmniHub || !(vaultData?.data?.financials?.liquidity?.maxDeposit === '0')) && (
            <Tooltip title={isOmniSpoke ? "Deposits and redeems are done on the hub chain (Base)" : ""} disableHoverListener={!isOmniSpoke}>
              <span>
                <Button variant="gradient" color="primary" onClick={handleDepositClick} disabled={isLoading || !accountAddress || isOmniSpoke}>
                  Deposit
                </Button>
              </span>
            </Tooltip>
          )}
          {!isLoading && !isUserVaultDataLoading && accountAddress && isOmniSpoke && (
            <Button
              variant="gradient"
              size="medium"
              onClick={() => setIsBridgeModalOpen(true)}
            >
              Bridge shares to hub
            </Button>
          )}
          {!isLoading && !isUserVaultDataLoading && accountAddress && !isOmniSpoke && ((isOmniHub && shares > 0) || (maxWithdraw && maxWithdraw.gt(0))) && (
            <Button
              variant="gradient"
              size="medium"
              onClick={() => setIsRedeemModalOpen(true)}
              disabled={isLoading || isUserVaultDataLoading}
            >
              Withdraw
            </Button>
          )}
        </Box>
      </Box>

      {/* MIDDLE DETAILS */}
      <Box sx={{
        display: 'flex',
        alignItems: 'left',
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 2, md: 5 },
        mt: 4,
      }}>
        {/* LEFT SIDE KPIS */}
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 2 }}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', xsm: '1fr 1fr' },
            height: '100%',
            gap: 3,
            p: { xs: 4, md: 6 },
            backgroundColor: 'background.paper',
            borderRadius: 2,
          }}>
            {/* Row 1 - My deposits */}
            <Box>
              <Typography variant="secondary14" color="text.secondary">
                My Deposits
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {!accountAddress ? (
                    <Typography variant="main16">–</Typography>
                  ) : isLoading || isUserVaultDataLoading ? (
                    <Skeleton width={80} height={24} />
                  ) : (
                    <FormattedNumber
                      value={formatUnits(
                        maxWithdraw?.toBigInt() || BigInt(0),
                        vaultData?.data?.overview?.asset?.decimals || 18
                      ) || ''}
                      symbol={vaultData?.data?.overview?.asset?.symbol || ''}
                      variant="main16"
                      compact
                    />
                  )}
                </Box>
                {accountAddress && !isLoading && !isUserVaultDataLoading && (
                  <UsdChip
                    value={new BigNumber(formatUnits(
                      maxWithdraw?.toBigInt() || BigInt(0),
                      vaultData?.data?.overview?.asset?.decimals || 18
                    ) || '0').multipliedBy(
                      assetData.data?.price || 0
                    ).toString() || '0'}
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
                        const direction = rawPnLAsset > 0 ? 'gain' : rawPnLAsset < 0 ? 'loss' : 'break-even';
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
                ) : isLoading || isUserVaultBalancesLoading || isUserVaultDataLoading || assetData.isLoading ? (
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
                      value={new BigNumber(totalPnLInAsset).multipliedBy(assetData.data?.price || 0).toString() || '0'}
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
                    {(selectedVault?.overview?.depositableAssets && selectedVault.overview.depositableAssets.length > 0
                      ? selectedVault.overview.depositableAssets
                      : [
                        {
                          address: selectedVault?.overview?.asset?.address || '',
                          symbol: selectedVault?.overview?.asset?.symbol || '',
                        },
                      ]
                    ).map((token) => (
                      <Box key={(token.address || token.symbol || Math.random().toString())} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TokenIcon symbol={token.symbol || ''} fontSize="medium" />
                        <Typography variant="main16" fontWeight={600}>{token.symbol || ''}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>

            {/* Deposit Routes (cross-chain OFT) */}
            {isOmniHub && (
              <Box sx={{ gridColumn: { xsm: '1 / -1' } }}>
                <Typography variant="secondary14" color="text.secondary" sx={{ mb: 1 }}>
                  Deposit Routes
                </Typography>
                {isRoutesLoading ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {[0, 1, 2].map((i) => <Skeleton key={i} width="100%" height={28} />)}
                  </Box>
                ) : inboundRoutes && inboundRoutes.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {inboundRoutes.map((route, idx) => {
                      const chainCfg = networkConfigs[route.spokeChainId];
                      const decimals = getRouteTokenDecimals(route.symbol);
                      const hasBalance = route.userBalance > BigInt(0);
                      const formattedBalance = parseFloat(formatUnits(route.userBalance, decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 });
                      const lzFeeEth = route.depositType === 'oft-compose'
                        ? parseFloat(formatUnits(route.lzFeeEstimate, 18)).toFixed(5)
                        : null;
                      return (
                        <Box
                          key={idx}
                          onClick={() => {
                            if (!hasBalance || !accountAddress) return;
                            setSelectedRoute(route);
                            setIsDepositModalOpen(true);
                          }}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1,
                            opacity: hasBalance ? 1 : 0.4,
                            py: 0.5,
                            px: 1,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: selectedRoute === route ? 'primary.main' : 'divider',
                            cursor: hasBalance && accountAddress ? 'pointer' : 'default',
                            '&:hover': hasBalance && accountAddress ? { borderColor: 'primary.light', bgcolor: 'action.hover' } : {},
                          }}
                        >
                          {/* Left: token + chain */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TokenIcon symbol={route.symbol} fontSize="small" />
                            <Box>
                              <Typography variant="secondary12" fontWeight={600}>{route.symbol}</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {chainCfg && <MarketLogo size={14} logo={chainCfg.networkLogoPath} />}
                                <Typography variant="secondary12" color="text.secondary">
                                  {chainCfg?.name || `Chain ${route.spokeChainId}`}
                                </Typography>
                                {route.depositType === 'direct' && (
                                  <Chip label="Direct" size="small" color="success" sx={{ fontSize: '0.6rem', height: 16, ml: 0.5 }} />
                                )}
                              </Box>
                            </Box>
                          </Box>

                          {/* Right: balance + fee */}
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="secondary12" fontWeight={hasBalance ? 600 : 400}>
                              {hasBalance ? `${formattedBalance} ${route.symbol}` : 'No balance'}
                            </Typography>
                            {lzFeeEth && (
                              <Typography variant="secondary12" color="text.secondary">
                                ~{lzFeeEth} {route.nativeSymbol} fee
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                ) : !isRoutesLoading && accountAddress ? (
                  <Typography variant="secondary12" color="text.secondary">No routes available</Typography>
                ) : null}
              </Box>
            )}

            {/* Row 2 - Networks */}
            <Box>
              <Typography variant="secondary14" color="text.secondary">
                Hub Network
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isLoading ? <Skeleton width={80} height={24} /> : (() => {
                  const hubChainId = topology?.hubChainId ?? chainId;
                  const hubCfg = networkConfigs[hubChainId];
                  return (
                    <>
                      <MarketLogo size={24} logo={hubCfg?.networkLogoPath} />
                      <Typography variant="main16">{hubCfg?.name || `Chain ${hubChainId}`}</Typography>
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
                })()}
              </Box>
            </Box>

            {/* Spoke Chains */}
            {topology && topology.spokeChainIds.length > 0 && (
              <Box>
                <Typography variant="secondary14" color="text.secondary">
                  Spoke Chains
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {topology.spokeChainIds.map((spokeChainId) => {
                    const spokeCfg = networkConfigs[spokeChainId];
                    const isCurrentChain = wagmiChainId === spokeChainId;
                    const spokeBalance = distribution?.spokeBalances.find(s => s.chainId === spokeChainId);
                    const isUnreachable = spokeBalance ? !spokeBalance.isReachable : false;
                    return (
                      <Box key={spokeChainId} sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: isUnreachable ? 0.5 : 1 }}>
                        <MarketLogo size={20} logo={spokeCfg?.networkLogoPath} />
                        <Typography variant="main14" sx={{ color: isUnreachable ? 'text.disabled' : undefined }}>
                          {spokeCfg?.name || `Chain ${spokeChainId}`}
                        </Typography>
                        {isUnreachable && (
                          <Chip label="Unreachable" size="small" sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'action.disabledBackground', color: 'text.disabled' }} />
                        )}
                        {isCurrentChain && (
                          <Chip label="You are here" size="small" color="warning" sx={{ fontSize: '0.65rem', height: 18 }} />
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Asset Distribution (cross-chain) */}
            {isOmniHub && (
              <Box sx={{ gridColumn: { xsm: '1 / -1' } }}>
                <Typography variant="secondary14" color="text.secondary" sx={{ mb: 1 }}>
                  Asset Distribution
                </Typography>
                {isDistributionLoading ? (
                  <Skeleton width="100%" height={60} />
                ) : distribution ? (() => {
                  const decimals = selectedVault?.overview?.asset?.decimals || 18;
                  const assetSymbol = selectedVault?.overview?.asset?.symbol || '';
                  const totalActual = distribution.totalActual;
                  const ZERO = BigInt(0);
                  const SCALE = BigInt(10000);
                  const hubLiquidPct = totalActual > ZERO
                    ? Number((distribution.hubLiquidBalance * SCALE) / totalActual) / 100
                    : 0;
                  const hubStrategyPct = totalActual > ZERO
                    ? Number((distribution.hubStrategyBalance * SCALE) / totalActual) / 100
                    : 0;

                  return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {/* Stacked bar */}
                      <Box sx={{ display: 'flex', width: '100%', height: 8, borderRadius: 1, overflow: 'hidden' }}>
                        <Box sx={{ width: `${hubLiquidPct}%`, bgcolor: 'primary.main' }} />
                        <Box sx={{ width: `${hubStrategyPct}%`, bgcolor: 'primary.dark' }} />
                        {distribution.spokeBalances.map((spoke) => {
                          const spokePct = totalActual > ZERO
                            ? Number((spoke.totalAssets * SCALE) / totalActual) / 100
                            : 0;
                          return (
                            <Box
                              key={spoke.chainId}
                              sx={{
                                width: `${spokePct}%`,
                                bgcolor: spoke.isReachable ? 'warning.main' : 'action.disabled',
                              }}
                            />
                          );
                        })}
                      </Box>

                      {/* Hub breakdown */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main' }} />
                          <Typography variant="secondary12">Hub Liquid</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FormattedNumber
                            value={formatUnits(distribution.hubLiquidBalance, decimals)}
                            symbol={assetSymbol}
                            variant="secondary12"
                            compact
                          />
                          <Typography variant="secondary12" color="text.secondary">
                            ({hubLiquidPct.toFixed(1)}%)
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.dark' }} />
                          <Typography variant="secondary12">Hub Strategies</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FormattedNumber
                            value={formatUnits(distribution.hubStrategyBalance, decimals)}
                            symbol={assetSymbol}
                            variant="secondary12"
                            compact
                          />
                          <Typography variant="secondary12" color="text.secondary">
                            ({hubStrategyPct.toFixed(1)}%)
                          </Typography>
                        </Box>
                      </Box>

                      {/* Spoke breakdown */}
                      {distribution.spokeBalances.map((spoke) => {
                        const spokeCfg = networkConfigs[spoke.chainId];
                        const spokePct = totalActual > ZERO
                          ? Number((spoke.totalAssets * SCALE) / totalActual) / 100
                          : 0;
                        return (
                          <Box key={spoke.chainId} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: spoke.isReachable ? 1 : 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: spoke.isReachable ? 'warning.main' : 'action.disabled' }} />
                              <Typography variant="secondary12" sx={{ color: spoke.isReachable ? undefined : 'text.disabled' }}>
                                {spokeCfg?.name || `Chain ${spoke.chainId}`}
                                {!spoke.isReachable && ' (Unreachable)'}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {spoke.isReachable ? (
                                <>
                                  <FormattedNumber
                                    value={formatUnits(spoke.totalAssets, decimals)}
                                    symbol={assetSymbol}
                                    variant="secondary12"
                                    compact
                                  />
                                  <Typography variant="secondary12" color="text.secondary">
                                    ({spokePct.toFixed(1)}%)
                                  </Typography>
                                </>
                              ) : (
                                <Typography variant="secondary12" color="text.disabled">N/A</Typography>
                              )}
                            </Box>
                          </Box>
                        );
                      })}

                      {/* Total */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid', borderColor: 'divider', pt: 1 }}>
                        <Typography variant="secondary12" fontWeight={600}>Total</Typography>
                        <FormattedNumber
                          value={formatUnits(distribution.totalActual, decimals)}
                          symbol={assetSymbol}
                          variant="secondary12"
                          compact
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                    </Box>
                  );
                })() : null}
              </Box>
            )}

            {/* Oracle Accounting Warning */}
            {isOmniHub && distribution && !distribution.oracleAccountingEnabled && (
              <Box sx={{ gridColumn: { xsm: '1 / -1' } }}>
                <Alert severity="warning" sx={{ py: 0.5 }}>
                  Oracle accounting is disabled — spoke yield is not reflected in share price
                </Alert>
              </Box>
            )}

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
                          value={formatUnits(
                            BigInt(vaultData?.data?.financials?.liquidity?.depositCapacity || '0'),
                            vaultData?.data?.overview?.asset?.decimals || 18
                          ) || ''}
                          symbol={vaultData?.data?.overview?.asset?.symbol || ''}
                          variant="secondary12"
                          compact
                          symbolsColor="#F1F1F3"
                        />
                        <UsdChip
                          value={new BigNumber(formatUnits(
                            BigInt(vaultData?.data?.financials?.liquidity?.depositCapacity || '0'),
                            vaultData?.data?.overview?.asset?.decimals || 18
                          ) || '0').multipliedBy(
                            assetData.data?.price || 0
                          ).toString() || '0'}
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
              <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {isLoading ? <Skeleton width={80} height={24} /> : <FormattedNumber
                    value={formatUnits(
                      // Omni hub vaults return 0 for maxDeposit (bridge routing); use depositCapacity - totalAssets instead
                      isOmniHub
                        ? BigInt(vaultData?.data?.financials?.liquidity?.depositCapacity || '0') - BigInt(vaultData?.data?.financials?.liquidity?.totalAssets || '0')
                        : BigInt(vaultData?.data?.financials?.liquidity?.maxDeposit || '0'),
                      vaultData?.data?.overview?.asset?.decimals || 18
                    ) || ''}
                    symbol={vaultData?.data?.overview?.asset?.symbol || ''}
                    variant="main16"
                    compact
                  />}
                </Box>
                {!isLoading && (
                  <UsdChip
                    value={new BigNumber(formatUnits(
                      isOmniHub
                        ? BigInt(vaultData?.data?.financials?.liquidity?.depositCapacity || '0') - BigInt(vaultData?.data?.financials?.liquidity?.totalAssets || '0')
                        : BigInt(vaultData?.data?.financials?.liquidity?.maxDeposit || '0'),
                      vaultData?.data?.overview?.asset?.decimals || 18
                    ) || '0').multipliedBy(
                      assetData.data?.price || 0
                    ).toString() || '0'}
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
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 3 }}>
                          <Typography variant="secondary12">1 Day APY:</Typography>
                          <FormattedNumber
                            value={vaultData?.data?.overview?.apy1Day || ''}
                            percent
                            variant="secondary12"
                            compact
                            symbolsColor="#F1F1F3"
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 3 }}>
                          <Typography variant="secondary12">30 Days APY:</Typography>
                          <FormattedNumber
                            value={vaultData?.data?.overview?.apy30Days || ''}
                            percent
                            variant="secondary12"
                            compact
                            symbolsColor="#F1F1F3"
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 3 }}>
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
              <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {isLoading ? <Skeleton width={80} height={24} /> : <FormattedNumber
                    value={vaultData?.data?.overview?.apy7Days || ''}
                    percent
                    variant="main16"
                    compact
                  />}
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
                {isLoading ? <Skeleton width={60} height={24} /> :
                  vaultData?.data?.overview?.withdrawalTimelock ?
                    formatTimeRemaining(Number(vaultData.data.overview.withdrawalTimelock)) :
                    'N/A'
                }
              </Typography>
            </Box>

            {/* Row 4 - Fee */}
            <Box>
              <Typography variant="secondary14" color="text.secondary">
                Fee
              </Typography>
              {isLoading ? <Skeleton width={60} height={24} /> : <FormattedNumber
                value={Number(vaultData?.data?.overview?.fee || '0') / 10000}
                percent
                variant="main16"
              />}
            </Box>
          </Box>
        </Box>

        {/* RIGHT SIDE CHART */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 3,
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
              <Typography variant="secondary14" color="text.secondary">Share Price</Typography>
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
                }}>
                {isLoading ? <Skeleton width={60} height={24} /> : <>
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
                }
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
              <Typography variant="secondary14" color="text.secondary">Net Asset Value</Typography>
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
                }}>
                {isLoading ? <Skeleton width={60} height={24} /> : <>
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
                }
              </Box>
            </Box>
          </Box>
          <Box sx={{
            backgroundColor: 'background.paper',
            py: { xs: 2, md: 6 },
            pl: { xs: 2, md: 6 },
            borderRadius: 2,
          }}>
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
        <Box sx={{
          display: 'flex', flexDirection: 'column',
          pb: 10
        }}>
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
        setIsOpen={(open) => { setIsDepositModalOpen(open); if (!open) setSelectedRoute(null); }}
        whitelistAmount={whitelistAmount}
        route={selectedRoute ?? undefined}
      />
      <VaultRedeemModal
        isOpen={isRedeemModalOpen}
        setIsOpen={setIsRedeemModalOpen}
      />
      <VaultWhitelistModal isOpen={isWhitelistModalOpen} setIsOpen={setIsWhitelistModalOpen} />
      <VaultBridgeSharesToHubModal isOpen={isBridgeModalOpen} setIsOpen={setIsBridgeModalOpen} />
    </Box>
  );
};