import { Avatar, Box, Button, Skeleton, SvgIcon, Tab, Tabs, Typography, useMediaQuery, useTheme, Tooltip, IconButton, Alert } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackOutlined';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import { useVault, VaultTab } from 'src/hooks/vault/useVault';
import { useMemo, useState } from 'react';
import { useUserVaultsData, useVaultData, useAssetData, useUserVaultBalances, useUserPortfolioMetrics } from 'src/hooks/vault/useVaultData';
import { CompactMode } from 'src/components/CompactableTypography';
import { Address } from 'src/components/Address';
import { networkConfigs } from 'src/utils/marketsAndNetworksConfig';
import { useDepositWhitelist } from 'src/hooks/vault/useDepositWhitelist';
import { VaultWhitelistModal } from './VaultWhitelistModal';
import { VaultDepositModal } from './VaultDepositModal';
import { VaultRedeemModal } from './VaultRedeemModal';
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

export const VaultDetail = () => {
  const router = useRouter();
  const { selectedVaultId, accountAddress, chainId } = useVault();
  const { address } = useAccount();
  const wagmiChainId = useChainId();
  const { switchChain } = useSwitchChain();

  const userVaultData = useUserVaultsData(accountAddress, [selectedVaultId], { enabled: !!selectedVaultId && !!accountAddress });
  const vaultData = useVaultData(selectedVaultId);
  const userVaultBalances = useUserVaultBalances(accountAddress, { enabled: !!accountAddress });
  const theme = useTheme();
  const downToMd = useMediaQuery(theme.breakpoints.down('md'));
  const downToMdLg = useMediaQuery(theme.breakpoints.down('mdlg'));
  const xPadding = downToMd ? 5 : 20;

  const baseUrl = useMemo(() => chainId && networkConfigs[chainId] && networkConfigs[chainId].explorerLink, [chainId]);

  const selectedVault = vaultData?.data;
  const hasNotes = !!selectedVault?.overview?.descriptionMarkdown;
  const [selectedTab, setSelectedTab] = useState<VaultTab>(hasNotes ? 'notes' : 'allocations');
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [isWhitelistModalOpen, setIsWhitelistModalOpen] = useState(false);
  const [selectedChartDataKey, setSelectedChartDataKey] = useState<'sharePrice' | 'apy' | 'totalSupply' | 'totalAssets'>('sharePrice');

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
  const aumInUsd = new BigNumber(aumFormatted).multipliedBy(
    assetData.data?.price || 0
  );
  const totalSupply = selectedVault
    ? BigInt(selectedVault?.financials?.liquidity?.totalSupply)
    : BigInt(0);
  const totalSupplyFormatted = selectedVault
    ? formatUnits(totalSupply, selectedVault?.overview?.decimals || 18)
    : '0';
  const totalSupplyInUsd = new BigNumber(totalSupplyFormatted).multipliedBy(
    assetData.data?.price || 0
  );
  const maxWithdraw = userVaultData?.[0]?.data?.maxWithdraw;

  // const secondsSinceInception = Number(new Date().getTime() / 1000) - Number(selectedVault?.overview?.creationTimestamp);

  const canManageVault = vaultData?.data?.overview?.roles?.curator === accountAddress;

  // Calculate user's P&L for this specific vault using live recomputed metrics
  const portfolioMetricsQuery = useUserPortfolioMetrics(accountAddress || '', '3m', { enabled: !!accountAddress });
  const perVaultMetrics = portfolioMetricsQuery.data?.perVaultMetrics || [];
  const perVault = perVaultMetrics.find(m => m.vaultId.toLowerCase() === (selectedVaultId || '').toLowerCase());
  const totalPnLUSD = perVault ? (perVault.realizedPnLUSD + perVault.unrealizedPnLUSD) : 0;
  const totalInvestedUSD = perVault ? (perVault.totalDepositedUSD - perVault.totalWithdrawnUSD) : 0;
  const pnlPercentage = totalInvestedUSD > 0 ? (totalPnLUSD / totalInvestedUSD) : 0;

  // Convert P&L to asset denomination using current asset price
  const assetPrice = assetData.data?.price || 0;
  const totalPnLInAsset = assetPrice > 0 ? totalPnLUSD / assetPrice : 0;
  const totalPnLInUsd = new BigNumber(totalPnLInAsset).multipliedBy(assetData.data?.price || 0);

  const chartDataOptions = {
    apy: {
      label: 'APY',
      data: selectedVault?.overview?.historicalSnapshots?.apyWeeklyReturnTrailing || [],
    },
    totalSupply: {
      label: 'Total Supply',
      data: selectedVault?.overview?.historicalSnapshots?.totalSupply || [],
    },
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
    // If whitelisting is not enabled, allow direct deposit
    if (!isWhitelistEnabled) {
      setIsDepositModalOpen(true);
    } else if (isWhitelisted) {
      // If whitelisting is enabled and user is whitelisted, allow deposit
      setIsDepositModalOpen(true);
    } else {
      // If whitelisting is enabled but user is not whitelisted, show whitelist modal
      setIsWhitelistModalOpen(true);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setSelectedTab(newValue as VaultTab);
  };

  // useEffect(() => {
  //   if (hasNotes && selectedTab !== 'notes') {
  //     setSelectedTab('notes');
  //   }
  // }, [hasNotes]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5, pt: 7, pb: 7, px: xPadding }}>

      {/* Network Status Check */}
      {shouldShowNetworkBanner && (
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
                '&:hover': {
                  color: 'primary.dark',
                },
              }}
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
              {selectedVault?.overview?.curatorLogo && (
                <Avatar
                  src={selectedVault.overview.curatorLogo}
                  sx={{ width: 35, height: 35 }}
                />
              )}
              <Typography variant="main21" sx={{ color: 'primary.main' }}>{selectedVault?.overview?.name}</Typography>
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
          {!isLoading && !(vaultData?.data?.financials?.liquidity?.maxDeposit === '0') && (
            <Button variant="gradient" color="primary" onClick={handleDepositClick} disabled={isLoading}>
              Deposit
            </Button>
          )}
          {!isLoading && !isUserVaultDataLoading && (maxWithdraw && maxWithdraw.gt(0)) && accountAddress &&
            <Button
              variant="gradient"
              size="medium"
              onClick={() => setIsRedeemModalOpen(true)}
              disabled={isLoading || isUserVaultDataLoading}
            >
              Withdraw
            </Button>
          }
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
                          value={pnlPercentage}
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
                        const rawPnL = totalPnLUSD || 0;
                        const absPnL = Math.abs(rawPnL);
                        const valueString = new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          maximumFractionDigits: 2,
                        }).format(absPnL);
                        const direction = rawPnL > 0 ? 'gain' : rawPnL < 0 ? 'loss' : 'break-even';
                        const vaultName = selectedVault?.overview?.name || 'this vault';
                        const text = `My PnL shows a ${valueString} ${direction} on my LP to ${vaultName} on @MORE_DeFi.`;
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
                {isLoading || isUserVaultBalancesLoading || isUserVaultDataLoading || assetData.isLoading ? (
                  <Skeleton width={80} height={24} />
                ) : !accountAddress || !perVault ? (
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
                      value={totalPnLInUsd.toString() || '0'}
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isLoading ? <Skeleton width={80} height={24} /> :
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* TODO: add getDepositableTokens to SC */}
                    <TokenIcon symbol={vaultData?.data?.overview?.asset?.symbol || ''} fontSize="medium" />
                    <Typography variant="main16" fontWeight={600}>{vaultData?.data?.overview?.asset?.symbol || ''}</Typography>
                  </Box>
                }
              </Box>
            </Box>

            {/* Row 2 - Networks */}
            <Box>
              <Typography variant="secondary14" color="text.secondary">
                Network
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {isLoading ? <Skeleton width={80} height={24} /> :
                  <>
                    <MarketLogo
                      size={24}
                      logo={networkConfigs[chainId]?.networkLogoPath}
                    />
                    <Typography variant="main16">{networkConfigs[chainId]?.name || 'Unknown Network'}</Typography>
                  </>
                }
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
                      BigInt(vaultData?.data?.financials?.liquidity?.maxDeposit || '0'),
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
                      BigInt(vaultData?.data?.financials?.liquidity?.maxDeposit || '0'),
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
                  APY
                </Typography>
                <Tooltip
                  title={
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="main12" sx={{ fontWeight: 600 }}>
                        APY Details
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 3 }}>
                          <Typography variant="secondary12">1 Day:</Typography>
                          <FormattedNumber
                            value={vaultData?.data?.overview?.apy1Day || ''}
                            percent
                            variant="secondary12"
                            compact
                            symbolsColor="#F1F1F3"
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 3 }}>
                          <Typography variant="secondary12">7 Days:</Typography>
                          <FormattedNumber
                            value={vaultData?.data?.overview?.apy7Days || ''}
                            percent
                            variant="secondary12"
                            compact
                            symbolsColor="#F1F1F3"
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 3 }}>
                          <Typography variant="secondary12">30 Days:</Typography>
                          <FormattedNumber
                            value={vaultData?.data?.overview?.apy30Days || ''}
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
                    value={vaultData?.data?.overview?.apy || ''}
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
                  border: isLoading ? 'none' : selectedChartDataKey === 'sharePrice' ? '1.5px solid #FF9900' : '1.5px solid #E0E0E0',
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
                    value={vaultData.data.overview.sharePrice.toString() || '0'}
                    symbol={vaultData?.data?.overview?.asset?.symbol || ''}
                    variant="main16"
                    sx={{ fontWeight: 800 }}
                  />
                  <SvgIcon sx={{
                    fontSize: '20px',
                    color: selectedChartDataKey === 'sharePrice' ? "#FF9900" : theme.palette.text.muted,
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
                    border: isLoading ? 'none' : selectedChartDataKey === 'apy' ? '1.5px solid #FF9900' : '1.5px solid #E0E0E0',
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
                    <SvgIcon sx={{
                      fontSize: '20px',
                      color: selectedChartDataKey === 'apy' ? "#FF9900" : theme.palette.text.muted,
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
            <Box sx={{ display: 'flex', alignItems: 'left', flexDirection: 'column', gap: 0 }}>
              <Typography variant="secondary14" color="text.secondary">Total Supply</Typography>
              <Box
                onClick={() => setSelectedChartDataKey('totalSupply')}
                sx={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 1,
                  border: isLoading ? 'none' : selectedChartDataKey === 'totalSupply' ? '1.5px solid #FF9900' : '1.5px solid #E0E0E0',
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
                  <SvgIcon sx={{
                    fontSize: '20px',
                    color: selectedChartDataKey === 'totalSupply' ? "#FF9900" : theme.palette.text.muted,
                  }}
                  >
                    <ShowChartIcon />
                  </SvgIcon>
                </>
                }
              </Box>
            </Box>
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
                  border: isLoading ? 'none' : selectedChartDataKey === 'totalAssets' ? '1.5px solid #FF9900' : '1.5px solid #E0E0E0',
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
                    value={aumInUsd.toString() || '0'}
                    symbol={'USD'}
                    variant="main16"
                    sx={{ fontWeight: 800 }}
                  />
                  <SvgIcon sx={{
                    fontSize: '20px',
                    color: selectedChartDataKey === 'totalAssets' ? "#FF9900" : theme.palette.text.muted,
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
                yAxisFormat={selectedChartDataKey === 'apy' ? '%' : vaultData?.data?.overview?.asset?.symbol}
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
          {hasNotes && <Tab label="Notes" value="notes" />}
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

      {/* MODALS */}
      <VaultDepositModal
        isOpen={isDepositModalOpen}
        setIsOpen={setIsDepositModalOpen}
        whitelistAmount={whitelistAmount}
      />
      <VaultRedeemModal
        isOpen={isRedeemModalOpen}
        setIsOpen={setIsRedeemModalOpen}
      />
      <VaultWhitelistModal isOpen={isWhitelistModalOpen} setIsOpen={setIsWhitelistModalOpen} />
    </Box>
  );
};