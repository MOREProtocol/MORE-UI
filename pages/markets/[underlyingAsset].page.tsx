import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Switch,
  SvgIcon,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { API_ETH_MOCK_ADDRESS } from '@aave/contract-helpers';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from 'src/layouts/MainLayout';
import { useRootStore } from 'src/store/root';
import { useAppDataContext, ComputedReserveData, ComputedUserReserveData } from 'src/hooks/app-data-provider/useAppDataProvider';
import { TokenIconAddDropdown } from 'src/modules/reserve-overview/TokenIconAddDropdown';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { useModalContext } from 'src/hooks/useModal';
import { useProtocolDataContext } from 'src/hooks/useProtocolDataContext';
import { AssetCapsProvider, useAssetCaps } from 'src/hooks/useAssetCaps';
import { InterestRateModelGraphContainer } from 'src/modules/reserve-overview/graphs/InterestRateModelGraphContainer';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { UsdChip } from 'src/components/primitives/UsdChip';
import { RewardsButton } from 'src/components/incentives/IncentivesButton';
import { usePoolReservesRewardsHumanized, PoolReservesRewardsHumanized } from 'src/hooks/pool/usePoolReservesRewards';
import { normalizeBN } from '@aave/math-utils';

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <Typography
    sx={{
      fontSize: '10.5px',
      letterSpacing: '.12em',
      textTransform: 'uppercase',
      color: 'text.muted',
      fontWeight: 500,
    }}
  >
    {children}
  </Typography>
);

const Plate = ({
  children,
  hero = false,
  sx = {},
}: {
  children: React.ReactNode;
  hero?: boolean;
  sx?: object;
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box
      sx={{
        background: hero
          ? isDark
            ? `radial-gradient(120% 140% at 85% -20%, rgba(245,132,32,.16), transparent 55%),
               linear-gradient(180deg, ${theme.palette.background.surface2}, ${theme.palette.background.surface})`
            : `radial-gradient(120% 140% at 85% -20%, rgba(245,132,32,.12), transparent 55%),
               linear-gradient(180deg, ${theme.palette.background.surface2}, ${theme.palette.background.paper})`
          : isDark
            ? theme.palette.background.surface
            : theme.palette.background.paper,
        border: '1px solid',
        borderColor: hero
          ? isDark
            ? 'rgba(255,255,255,.10)'
            : 'rgba(40,25,15,.12)'
          : isDark
            ? 'rgba(255,255,255,.08)'
            : 'rgba(40,25,15,.10)',
        borderRadius: '14px',
        boxShadow: isDark
          ? '0 1px 0 rgba(255,255,255,.04) inset, 0 30px 60px -30px rgba(0,0,0,.7)'
          : '0 1px 0 rgba(255,255,255,.9) inset, 0 18px 40px -20px rgba(120,70,20,.14)',
        overflow: 'hidden',
        position: 'relative',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

export default function ReserveOverview() {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { reserves, user } = useAppDataContext();
  const { currentMarketData, currentNetworkConfig, currentMarket, currentChainId } = useProtocolDataContext();
  const { currentAccount, addERC20Token, switchNetwork, chainId: connectedChainId } = useWeb3Context();
  const { openSupply, openBorrow, openWithdraw, openRepay, openCollateralChange } = useModalContext();
  const trackEvent = useRootStore((store) => store.trackEvent);
  const [supplyMenuAnchor, setSupplyMenuAnchor] = useState<null | HTMLElement>(null);

  const underlyingAsset = (router.query.underlyingAsset as string) || (router.query.vaultId as string) || (router.query.asset as string);

  const reserve = reserves.find((r) => r.underlyingAsset === underlyingAsset) as ComputedReserveData | undefined;

  const userReserve = user?.userReservesData?.find(
    (r: ComputedUserReserveData) =>
      r.reserve.underlyingAsset.toLowerCase() === (reserve?.underlyingAsset.toLowerCase() || '')
  );
  const hasSupply = !!userReserve && userReserve.underlyingBalance !== '0';
  const hasBorrow = !!userReserve && (userReserve.variableBorrows !== '0' || userReserve.stableBorrows !== '0');

  const [pageEventCalled, setPageEventCalled] = useState(false);

  useEffect(() => {
    if (!pageEventCalled && reserve && reserve.iconSymbol && underlyingAsset) {
      trackEvent('Page Viewed', {
        'Page Name': 'Reserve Overview',
        Reserve: reserve.iconSymbol,
        Asset: underlyingAsset,
      });
      setPageEventCalled(true);
    }
  }, [trackEvent, reserve, underlyingAsset, pageEventCalled]);

  if (!reserve) return null;

  return (
    <AssetCapsProvider asset={reserve}>
      <Box
        sx={{
          mt: { xs: 2, md: 3 },
          px: { xs: 2, sm: 4, md: 6 },
          pb: { xs: 4, md: 8 },
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {/* Header: back button + token + actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box
            onClick={() => router.push('/markets')}
            sx={{
              display: 'inline-grid',
              placeItems: 'center',
              width: 34,
              height: 34,
              borderRadius: '10px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: isDark ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.9)',
              color: 'text.secondary',
              cursor: 'pointer',
              flex: 'none',
              '&:hover': { color: 'text.primary', borderColor: isDark ? 'rgba(255,255,255,.12)' : 'rgba(40,25,15,.16)' },
            }}
          >
            <SvgIcon sx={{ fontSize: '16px' }}>
              <ArrowBackRoundedIcon />
            </SvgIcon>
          </Box>

          <TokenIconAddDropdown
            reserve={reserve}
            switchNetwork={switchNetwork}
            addERC20Token={addERC20Token}
            currentChainId={currentChainId}
            connectedChainId={connectedChainId}
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                sx={{
                  fontFamily: theme.typography.h1.fontFamily,
                  fontSize: { xs: 26, md: 32 },
                  fontWeight: 500,
                  letterSpacing: '-.02em',
                  lineHeight: 1.1,
                  color: 'text.primary',
                }}
              >
                {reserve.symbol}
              </Typography>
              <IconButton
                size="small"
                onClick={() => {
                  const url = currentNetworkConfig.explorerLinkBuilder({ address: reserve.underlyingAsset });
                  window.open(url, '_blank');
                }}
                aria-label="open in explorer"
                sx={{ padding: '2px', color: 'text.muted' }}
              >
                <OpenInNewIcon sx={{ fontSize: '0.8rem' }} />
              </IconButton>
            </Box>
            <Typography
              sx={{
                fontSize: 12,
                color: 'text.muted',
                fontFamily: theme.typography.fontFamily,
                fontVariantNumeric: 'tabular-nums',
                mt: 0.5,
              }}
            >
              {reserve.name} · {currentNetworkConfig.name}
            </Typography>
          </Box>

          <Box sx={{ flex: 1 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {currentAccount && hasSupply && (
              <Button variant="soft" onClick={() => openWithdraw(reserve.underlyingAsset, currentMarket, reserve.name, 'reserve-page')}>
                Withdraw
              </Button>
            )}
            {currentAccount && hasBorrow && (
              <Button variant="soft" onClick={() => openRepay(reserve.underlyingAsset, 2 as never, reserve.isFrozen, currentMarket, reserve.name, 'reserve-page')}>
                Repay
              </Button>
            )}
            {currentAccount && (
              <>
                {reserve.isWrappedBaseAsset ? (
                  <>
                    <Button variant="soft" onClick={(e) => setSupplyMenuAnchor(e.currentTarget)}>
                      Supply
                    </Button>
                    <Menu
                      anchorEl={supplyMenuAnchor}
                      open={Boolean(supplyMenuAnchor)}
                      onClose={() => setSupplyMenuAnchor(null)}
                      PaperProps={{ sx: { minWidth: 'unset', width: 'auto' } }}
                      anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
                      transformOrigin={{ horizontal: 'left', vertical: 'top' }}
                    >
                      <MenuItem
                        onClick={() => {
                          openSupply(API_ETH_MOCK_ADDRESS.toLowerCase(), currentMarket, reserve.name, 'reserve-page', true);
                          setSupplyMenuAnchor(null);
                        }}
                      >
                        {`Supply ${currentNetworkConfig.baseAssetSymbol}`}
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          openSupply(reserve.underlyingAsset, currentMarket, reserve.name, 'reserve-page', true);
                          setSupplyMenuAnchor(null);
                        }}
                      >
                        {`Supply ${reserve.symbol}`}
                      </MenuItem>
                    </Menu>
                  </>
                ) : (
                  <Button variant="soft" onClick={() => openSupply(reserve.underlyingAsset, currentMarket, reserve.name, 'reserve-page', true)}>
                    Supply
                  </Button>
                )}
                {reserve.borrowingEnabled && !hasSupply && (() => {
                  const eModeBorrowDisabled = !!(user?.isInEmode && reserve.eModeCategoryId !== (user?.userEmodeCategoryId || 0));
                  const title = eModeBorrowDisabled
                    ? 'In MOST Mode some assets are not borrowable. Exit MOST Mode to get access to all assets'
                    : '';
                  return (
                    <Tooltip title={title} disableHoverListener={!eModeBorrowDisabled} placement="top">
                      <span>
                        <Button
                          variant="soft"
                          disabled={eModeBorrowDisabled}
                          onClick={() => openBorrow(reserve.underlyingAsset, currentMarket, reserve.name, 'reserve-page', true)}
                        >
                          Borrow
                        </Button>
                      </span>
                    </Tooltip>
                  );
                })()}
              </>
            )}
          </Box>
        </Box>

        {/* Grid: left stats stack, right rate model */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1.15fr' },
            gap: { xs: 3, md: 4 },
            alignItems: 'stretch',
          }}
        >
          {/* LEFT: stats stack */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 3, md: 4 } }}>
            <SupplyCard reserve={reserve} />
            <BorrowCard reserve={reserve} />
            <CollateralCard reserve={reserve} />
          </Box>

          {/* RIGHT: interest rate model */}
          <Plate hero sx={{ p: { xs: 3, md: 4 }, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Eyebrow>Interest Rate Model</Eyebrow>
                <Typography
                  sx={{
                    fontFamily: theme.typography.h1.fontFamily,
                    fontSize: 22,
                    fontWeight: 500,
                    letterSpacing: '-.018em',
                    lineHeight: 1.1,
                    color: 'text.primary',
                    mt: 0.5,
                  }}
                >
                  Kinked curve · Optimal {normalizeBN(reserve.optimalUsageRatio || '0', 27).multipliedBy(100).toFixed(0)}%
                </Typography>
              </Box>
            </Box>
            <Box sx={{ flex: 1, mt: 2 }}>
              <InterestRateModelGraphContainer reserve={reserve} />
            </Box>
            {/* Footer row: utilization / base / slope1 / slope2 */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 2,
                pt: 2,
                mt: 1,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              {[
                { label: 'Current utilization', value: reserve.borrowUsageRatio ?? '0' },
                { label: 'Base rate', value: normalizeBN(reserve.baseVariableBorrowRate || '0', 27).toString() },
                { label: 'Slope 1', value: normalizeBN(reserve.variableRateSlope1 || '0', 27).toString() },
                { label: 'Slope 2', value: normalizeBN(reserve.variableRateSlope2 || '0', 27).toString() },
              ].map((it) => (
                <Box key={it.label}>
                  <Typography variant="secondary12" color="text.muted" sx={{ display: 'block', mb: 0.5 }}>
                    {it.label}
                  </Typography>
                  <FormattedNumber
                    value={it.value}
                    percent
                    visibleDecimals={2}
                    variant="main16"
                    sx={{ fontSize: 18, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
                  />
                </Box>
              ))}
            </Box>
          </Plate>
        </Box>
      </Box>
    </AssetCapsProvider>
  );

  function SupplyCard({ reserve }: { reserve: ComputedReserveData }) {
    const { supplyCap } = useAssetCaps();
    const rewardsQuery = usePoolReservesRewardsHumanized(currentMarketData);
    const allRewards: PoolReservesRewardsHumanized[] = rewardsQuery?.data ?? [];
    const supplyRewards = useMemo(
      () =>
        allRewards.filter(
          (r) =>
            r.tracked_token_address?.toLowerCase() === reserve.underlyingAsset.toLowerCase() &&
            ['supply', 'supply_and_borrow'].includes(r.tracked_token_type)
        ),
      [allRewards, reserve.underlyingAsset]
    );
    const showCap = reserve.supplyCap !== '0' && supplyCap?.percentUsed !== undefined;
    const capPct = showCap ? Math.min(Number(supplyCap?.percentUsed || 0), 100) : 0;

    return (
      <Plate hero sx={{ p: { xs: 3, md: 4 } }}>
        <Eyebrow>Supply Info</Eyebrow>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr auto 1fr' },
            gap: { xs: 3, sm: 0 },
            mt: 2,
            alignItems: 'flex-end',
          }}
        >
          {/* Total supplied */}
          <Box>
            <Typography variant="secondary14" color="text.muted" sx={{ mb: 0.75 }}>
              Total supplied
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography
                sx={{
                  fontFamily: theme.typography.h1.fontFamily,
                  fontSize: 32,
                  fontWeight: 600,
                  letterSpacing: '-.018em',
                  lineHeight: 1.05,
                  color: 'text.primary',
                }}
              >
                <FormattedNumber
                  value={reserve.totalLiquidity}
                  compact
                  variant="main21"
                  sx={{
                    fontFamily: theme.typography.h1.fontFamily,
                    fontSize: 32,
                    fontWeight: 600,
                    letterSpacing: '-.018em',
                    lineHeight: 1.05,
                  }}
                />
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <UsdChip value={reserve.totalLiquidityUSD} textVariant="secondary12" />
              {showCap && (
                <Typography variant="secondary12" color="text.muted" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  · supply cap{' '}
                  <FormattedNumber value={reserve.supplyCap} compact variant="secondary12" />
                </Typography>
              )}
            </Box>
            {showCap && (
              <Box
                sx={{
                  mt: 1.5,
                  height: 6,
                  borderRadius: 999,
                  bgcolor: isDark ? 'rgba(255,255,255,.06)' : 'rgba(40,25,15,.06)',
                  overflow: 'hidden',
                  width: { xs: '100%', sm: 220 },
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    width: `${capPct}%`,
                    background: 'linear-gradient(135deg, #F58420 0%, #FCB319 100%)',
                    borderRadius: 999,
                  }}
                />
              </Box>
            )}
          </Box>

          {/* Vertical divider */}
          <Box
            sx={{
              display: { xs: 'none', sm: 'block' },
              width: '1px',
              alignSelf: 'stretch',
              background: isDark
                ? 'linear-gradient(180deg, transparent, rgba(255,255,255,.10), transparent)'
                : 'linear-gradient(180deg, transparent, rgba(40,25,15,.14), transparent)',
              mx: 3,
            }}
          />

          {/* Supply APY */}
          <Box>
            <Typography variant="secondary14" color="text.muted" sx={{ mb: 0.75 }}>
              Supply APY
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
              <Typography
                sx={{
                  fontFamily: theme.typography.h1.fontFamily,
                  fontSize: 40,
                  fontWeight: 600,
                  letterSpacing: '-.018em',
                  lineHeight: 1,
                  color: isDark ? '#FFA94A' : '#C66A18',
                }}
              >
                <FormattedNumber
                  value={reserve.supplyAPY || ''}
                  percent
                  visibleDecimals={2}
                  symbolsVariant="secondary21"
                  symbolsColor={isDark ? 'rgba(255,169,74,.7)' : 'rgba(198,106,24,.7)'}
                  sx={{
                    fontFamily: theme.typography.h1.fontFamily,
                    fontSize: 40,
                    fontWeight: 600,
                    letterSpacing: '-.018em',
                    lineHeight: 1,
                    color: isDark ? '#FFA94A' : '#C66A18',
                  }}
                />
              </Typography>
              {supplyRewards && supplyRewards.length > 0 && (
                <Box>
                  <RewardsButton rewards={supplyRewards} />
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Plate>
    );
  }

  function BorrowCard({ reserve }: { reserve: ComputedReserveData }) {
    const rewardsQuery = usePoolReservesRewardsHumanized(currentMarketData);
    const allRewards: PoolReservesRewardsHumanized[] = rewardsQuery?.data ?? [];
    const borrowRewards = allRewards.filter(
      (r) =>
        r.tracked_token_address?.toLowerCase() === reserve.underlyingAsset.toLowerCase() &&
        ['borrow', 'supply_and_borrow'].includes(r.tracked_token_type)
    );

    const Cell = ({ label, children }: { label: string; children: React.ReactNode }) => (
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="secondary14" color="text.muted" sx={{ mb: 0.75 }}>
          {label}
        </Typography>
        {children}
      </Box>
    );

    const Divider = () => (
      <Box
        sx={{
          display: { xs: 'none', sm: 'block' },
          width: '1px',
          height: 60,
          background: isDark
            ? 'linear-gradient(180deg, transparent, rgba(255,255,255,.10), transparent)'
            : 'linear-gradient(180deg, transparent, rgba(40,25,15,.14), transparent)',
          mx: 3,
          alignSelf: 'center',
        }}
      />
    );

    return (
      <Plate sx={{ p: { xs: 3, md: 4 } }}>
        <Eyebrow>Borrow Info</Eyebrow>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, mt: 2, gap: { xs: 2, sm: 0 } }}>
          <Cell label="Total borrowed">
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <FormattedNumber
                value={reserve.totalDebt}
                compact
                variant="main21"
                sx={{ fontSize: 22, fontFamily: theme.typography.fontFamily, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
              />
            </Box>
            <Box sx={{ mt: 0.5 }}>
              <UsdChip value={reserve.totalDebtUSD} textVariant="secondary12" />
            </Box>
          </Cell>
          <Divider />
          <Cell label="Borrow APY">
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <FormattedNumber
                value={reserve.variableBorrowAPY || ''}
                percent
                visibleDecimals={2}
                variant="main21"
                sx={{ fontSize: 22, fontFamily: theme.typography.fontFamily, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
              />
              {borrowRewards && borrowRewards.length > 0 && (
                <Box sx={{ ml: 1 }}>
                  <RewardsButton rewards={borrowRewards} />
                </Box>
              )}
            </Box>
          </Cell>
          <Divider />
          <Cell label="Available">
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <FormattedNumber
                value={reserve.formattedAvailableLiquidity ?? '0'}
                compact
                variant="main21"
                sx={{ fontSize: 22, fontFamily: theme.typography.fontFamily, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
              />
            </Box>
            <Box sx={{ mt: 0.5 }}>
              <UsdChip value={reserve.availableLiquidityUSD} textVariant="secondary12" />
            </Box>
          </Cell>
        </Box>
      </Plate>
    );
  }

  function CollateralCard({ reserve }: { reserve: ComputedReserveData }) {
    const { debtCeiling } = useAssetCaps();
    const usageAsCollateralEnabledOnUser = !!userReserve?.usageAsCollateralEnabledOnUser;
    const canBeCollateral = reserve.reserveLiquidationThreshold !== '0';

    const canEnableAsCollateral = user
      ? hasSupply &&
        !debtCeiling.isMaxed &&
        canBeCollateral &&
        ((!reserve.isIsolated && !user.isInIsolationMode) ||
          user.isolatedReserve?.underlyingAsset === reserve.underlyingAsset ||
          (reserve.isIsolated && user.totalCollateralMarketReferenceCurrency === '0'))
      : false;

    const shouldShowToggle = canBeCollateral && hasSupply;
    const disableToggle =
      !currentAccount ||
      !hasSupply ||
      reserve.isPaused ||
      (!usageAsCollateralEnabledOnUser && !canEnableAsCollateral);

    const items = [
      { label: 'Max LTV', value: reserve.formattedBaseLTVasCollateral },
      { label: 'Liquidation threshold', value: reserve.formattedReserveLiquidationThreshold },
      { label: 'Liquidation penalty', value: reserve.formattedReserveLiquidationBonus },
    ];

    return (
      <Plate sx={{ p: { xs: 3, md: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Eyebrow>Collateral Usage</Eyebrow>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {canBeCollateral ? (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  py: 0.25,
                  borderRadius: '8px',
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'success.main',
                  background: 'rgba(31,174,106,.14)',
                }}
              >
                ✓ Can be collateral
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  px: 1,
                  py: 0.25,
                  borderRadius: '8px',
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'warning.main',
                  background: 'rgba(245,132,32,.14)',
                }}
              >
                Cannot be collateral
              </Box>
            )}
            {shouldShowToggle && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="secondary14" color="text.muted" sx={{ whiteSpace: 'nowrap' }}>
                  Use as collateral
                </Typography>
                <Switch
                  size="small"
                  checked={usageAsCollateralEnabledOnUser}
                  disabled={disableToggle}
                  onClick={(e) => {
                    e.stopPropagation();
                    openCollateralChange(
                      reserve.underlyingAsset,
                      currentMarket,
                      reserve.name,
                      'reserve-page',
                      usageAsCollateralEnabledOnUser
                    );
                  }}
                />
              </Box>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', mt: 2.5, gap: { xs: 3, sm: 4 }, flexWrap: 'wrap' }}>
          {items.map((it) => (
            <Box key={it.label} sx={{ flex: 1, minWidth: 120 }}>
              <Typography variant="secondary14" color="text.muted" sx={{ mb: 0.75 }}>
                {it.label}
              </Typography>
              <Typography
                sx={{
                  fontFamily: theme.typography.h1.fontFamily,
                  fontSize: 28,
                  fontWeight: 500,
                  letterSpacing: '-.018em',
                  lineHeight: 1.1,
                  color: 'text.primary',
                }}
              >
                <FormattedNumber
                  value={it.value}
                  percent
                  visibleDecimals={2}
                  sx={{
                    fontFamily: theme.typography.h1.fontFamily,
                    fontSize: 28,
                    fontWeight: 500,
                    letterSpacing: '-.018em',
                    lineHeight: 1.1,
                  }}
                />
              </Typography>
            </Box>
          ))}
        </Box>
      </Plate>
    );
  }
}

ReserveOverview.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
