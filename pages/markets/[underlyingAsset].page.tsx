import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackOutlined';
import {
  Box,
  LinearProgress,
  SvgIcon,
  Switch,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { UsdChip } from 'src/components/primitives/UsdChip';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import {
  ComputedReserveData,
  ComputedUserReserveData,
  useAppDataContext,
} from 'src/hooks/app-data-provider/useAppDataProvider';
import { AssetCapsProvider, useAssetCaps } from 'src/hooks/useAssetCaps';
import { useModalContext } from 'src/hooks/useModal';
import { useProtocolDataContext } from 'src/hooks/useProtocolDataContext';
import { MainLayout } from 'src/layouts/MainLayout';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { BorrowInfo } from 'src/modules/reserve-overview/BorrowInfo';
import { CollateralUsage } from 'src/modules/reserve-overview/CollateralUsage';
import { CollateralUsageHeader } from 'src/modules/reserve-overview/CollateralUsageHeader';
import { ApyGraphContainer } from 'src/modules/reserve-overview/graphs/ApyGraphContainer';
import { InterestRateModelGraphContainer } from 'src/modules/reserve-overview/graphs/InterestRateModelGraphContainer';
import { ReserveActionsPanel } from 'src/modules/reserve-overview/ReserveActionsPanel';
import { ReserveHeroCard } from 'src/modules/reserve-overview/ReserveHeroCard';
import { SupplyInfo } from 'src/modules/reserve-overview/SupplyInfo';
import { TokenIconAddDropdown } from 'src/modules/reserve-overview/TokenIconAddDropdown';
import { useRootStore } from 'src/store/root';
import { FONT_BODY, FONT_DISPLAY, FONT_MONO } from 'src/utils/theme';

// Shared card shell for the Overview panels — transcribed from the mockup's
// `.vault-panel` (surface + hairline border + 20px radius).
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

// Single reserve-status metric, rendered as a soft-surface tile (mockup
// `market-tab-overview` stat grid). Numerals stay mono via FormattedNumber.
const StatTile = ({
  label,
  value,
  usd,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  usd?: string | number;
  sub?: React.ReactNode;
}) => (
  <Box
    sx={{
      backgroundColor: 'background.surface',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: '14px',
      p: '16px 18px',
      minWidth: 0,
    }}
  >
    <Typography
      sx={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'text.secondary',
      }}
    >
      {label}
    </Typography>
    <Box
      sx={{
        mt: 1.25,
        display: 'flex',
        alignItems: 'baseline',
        gap: 1,
        flexWrap: 'wrap',
        fontFamily: FONT_MONO,
        fontSize: 22,
        fontWeight: 600,
        lineHeight: 1.1,
        color: 'text.primary',
      }}
    >
      {value}
    </Box>
    {usd !== undefined && (
      <Box sx={{ mt: 1 }}>
        <UsdChip value={usd} />
      </Box>
    )}
    {sub && (
      <Typography sx={{ mt: 0.75, fontFamily: FONT_MONO, fontSize: 12, color: 'text.secondary' }}>
        {sub}
      </Typography>
    )}
  </Box>
);

// Supply/borrow cap utilization bar shown below the stat tiles when a cap exists.
const CapBar = ({
  label,
  pct,
  used,
  total,
}: {
  label: string;
  pct: number;
  used: React.ReactNode;
  total: React.ReactNode;
}) => (
  <Box>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 2,
        mb: 1,
      }}
    >
      <Typography variant="secondary14" color="text.secondary">
        {label}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 0.75,
          fontFamily: FONT_MONO,
          fontSize: 13,
          color: 'text.primary',
        }}
      >
        {used}
        <Box component="span" sx={{ color: 'text.secondary' }}>
          of
        </Box>
        {total}
      </Box>
    </Box>
    <LinearProgress
      variant="determinate"
      value={Math.min(100, Math.max(0, pct))}
      sx={{
        height: 6,
        borderRadius: '9999px',
        backgroundColor: 'divider',
        '& .MuiLinearProgress-bar': { backgroundColor: 'primary.main', borderRadius: 'inherit' },
      }}
    />
  </Box>
);

export default function ReserveOverview() {
  const router = useRouter();
  const { reserves, user } = useAppDataContext();
  const { currentMarketData, currentNetworkConfig, currentMarket, currentChainId } =
    useProtocolDataContext();
  const {
    currentAccount,
    addERC20Token,
    switchNetwork,
    chainId: connectedChainId,
  } = useWeb3Context();
  const { openCollateralChange } = useModalContext();
  const trackEvent = useRootStore((store) => store.trackEvent);

  const underlyingAsset =
    (router.query.underlyingAsset as string) ||
    (router.query.vaultId as string) ||
    (router.query.asset as string);

  const reserve = reserves.find((r) => r.underlyingAsset === underlyingAsset) as
    | ComputedReserveData
    | undefined;

  const [pageEventCalled, setPageEventCalled] = useState(false);
  const [chartMode, setChartMode] = useState<'history' | 'model'>('history');

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

  const explorerLink = currentNetworkConfig.explorerLinkBuilder({
    address: reserve.underlyingAsset,
  });

  return (
    <AssetCapsProvider asset={reserve}>
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
        {/* Slim top bar: back navigation + add-token / network-switch dropdown */}
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
            onClick={() => router.push('/markets')}
          >
            <ArrowBackRoundedIcon />
          </SvgIcon>
          <TokenIconAddDropdown
            reserve={reserve}
            switchNetwork={switchNetwork}
            addERC20Token={addERC20Token}
            currentChainId={currentChainId}
            connectedChainId={connectedChainId}
          />
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
            <ReserveHeroCard
              reserve={reserve}
              chainName={currentNetworkConfig.name}
              explorerLink={explorerLink}
            />
          </Box>

          <Box sx={{ gridArea: 'panel' }}>
            <ReserveActionsPanel underlyingAsset={reserve.underlyingAsset} />
          </Box>

          <Box sx={{ gridArea: 'main', minWidth: 0, mt: { xs: 1, lg: 2 } }}>
            {/* Underline tab bar (Activity omitted — no history data source exists). */}
            <Tabs
              value={0}
              sx={{
                minHeight: 'unset',
                mb: 2,
                '& .MuiTabs-indicator': { backgroundColor: 'primary.main', height: 2 },
                '& .MuiTab-root': {
                  fontFamily: FONT_BODY,
                  fontWeight: 600,
                  fontSize: 14,
                  textTransform: 'none',
                  minHeight: 'unset',
                  p: '4px 2px',
                  mr: 3,
                  minWidth: 'unset',
                },
              }}
            >
              <Tab label="Overview" />
            </Tabs>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Chart card: Rate history <-> Interest rate model */}
              <Box sx={panelSx}>
                <ToggleButtonGroup
                  value={chartMode}
                  exclusive
                  onChange={(_e, next) => next && setChartMode(next)}
                  sx={{ mb: 1 }}
                >
                  <ToggleButton value="history">Rate history</ToggleButton>
                  <ToggleButton value="model">Interest rate model</ToggleButton>
                </ToggleButtonGroup>

                {chartMode === 'history' ? (
                  <Box>
                    <ApyGraphContainer
                      graphKey="supply"
                      reserve={reserve}
                      currentMarketData={currentMarketData}
                    />
                    <ApyGraphContainer
                      graphKey="borrow"
                      reserve={reserve}
                      currentMarketData={currentMarketData}
                    />
                  </Box>
                ) : (
                  <InterestRateModelGraphContainer reserve={reserve} />
                )}
              </Box>

              {/* Reserve status */}
              <Box sx={panelSx}>
                <PanelTitle>Reserve status</PanelTitle>
                <ReserveStatusBody />
              </Box>

              {/* Collateral parameters */}
              <CollateralUsageCard />
            </Box>
          </Box>
        </Box>
      </Box>
    </AssetCapsProvider>
  );

  function ReserveStatusBody() {
    const { supplyCap, borrowCap, debtCeiling } = useAssetCaps();
    const r = reserve as ComputedReserveData;

    const hasSupplyCap = r.supplyCap !== '0';
    const hasBorrowCap = r.borrowCap !== '0';
    const supplyCapPct =
      hasSupplyCap && Number(r.supplyCap) > 0
        ? (Number(r.totalLiquidity) / Number(r.supplyCap)) * 100
        : 0;
    const borrowCapPct =
      hasBorrowCap && Number(r.borrowCap) > 0
        ? (Number(r.totalDebt) / Number(r.borrowCap)) * 100
        : 0;

    return (
      <Box sx={{ mt: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
            gap: 1.5,
          }}
        >
          <StatTile
            label="Total supplied"
            value={<FormattedNumber value={r.totalLiquidity} compact variant="inherit" />}
            usd={r.totalLiquidityUSD}
            sub={
              hasSupplyCap ? (
                <>
                  of <FormattedNumber value={r.supplyCap} compact variant="inherit" /> cap
                </>
              ) : undefined
            }
          />
          <StatTile
            label="Total borrowed"
            value={<FormattedNumber value={r.totalDebt} compact variant="inherit" />}
            usd={r.totalDebtUSD}
            sub={
              hasBorrowCap ? (
                <>
                  of <FormattedNumber value={r.borrowCap} compact variant="inherit" /> cap
                </>
              ) : undefined
            }
          />
          <StatTile
            label="Available liquidity"
            value={
              <FormattedNumber
                value={r.formattedAvailableLiquidity ?? '0'}
                compact
                variant="inherit"
              />
            }
            usd={r.availableLiquidityUSD}
          />
          <StatTile
            label="Reserve factor"
            value={<FormattedNumber value={r.reserveFactor} percent variant="inherit" />}
          />
          {r.unbacked && r.unbacked !== '0' && (
            <StatTile
              label="Unbacked"
              value={<FormattedNumber value={r.unbacked} compact variant="inherit" />}
              usd={r.unbackedUSD}
            />
          )}
        </Box>

        {(hasSupplyCap || hasBorrowCap) && (
          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {hasSupplyCap && (
              <CapBar
                label="Supply cap utilization"
                pct={supplyCapPct}
                used={<FormattedNumber value={r.totalLiquidity} compact variant="inherit" />}
                total={<FormattedNumber value={r.supplyCap} compact variant="inherit" />}
              />
            )}
            {hasBorrowCap && (
              <CapBar
                label="Borrow cap utilization"
                pct={borrowCapPct}
                used={<FormattedNumber value={r.totalDebt} compact variant="inherit" />}
                total={<FormattedNumber value={r.borrowCap} compact variant="inherit" />}
              />
            )}
          </Box>
        )}

        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <SupplyInfo
            reserve={r}
            currentMarketData={currentMarketData}
            showSupplyCapStatus={hasSupplyCap}
            supplyCap={supplyCap}
            debtCeiling={debtCeiling}
          />
          <BorrowInfo
            reserve={r}
            currentMarketData={currentMarketData}
            currentNetworkConfig={currentNetworkConfig}
            showBorrowCapStatus={hasBorrowCap}
            borrowCap={borrowCap}
          />
        </Box>
      </Box>
    );
  }

  function CollateralUsageCard() {
    const { debtCeiling } = useAssetCaps();

    const userReserve = user?.userReservesData?.find(
      (r: ComputedUserReserveData) =>
        r.reserve.underlyingAsset.toLowerCase() === reserve.underlyingAsset.toLowerCase()
    );

    const usageAsCollateralEnabledOnUser = !!userReserve?.usageAsCollateralEnabledOnUser;
    const hasSupply = !!userReserve && userReserve.underlyingBalance !== '0';
    const canBeCollateral = reserve.reserveLiquidationThreshold !== '0';

    // Match the eligibility rules already used on dashboard lists, but also require the user to have supplied this asset.
    const canEnableAsCollateral = user
      ? hasSupply &&
        !debtCeiling.isMaxed &&
        canBeCollateral &&
        ((!reserve.isIsolated && !user.isInIsolationMode) ||
          user.isolatedReserve?.underlyingAsset === reserve.underlyingAsset ||
          (reserve.isIsolated && user.totalCollateralMarketReferenceCurrency === '0'))
      : false;

    // "Smart" visibility:
    // - Hide when it can never be collateral (protocol setting) or the user has no supply to act on.
    // - Otherwise show it (it may be disabled depending on current constraints).
    const shouldShowToggle = canBeCollateral && hasSupply;

    // Allow disabling collateral even when it can't be enabled (e.g. debt ceiling maxed),
    // but block toggling entirely if the user has no supplies.
    const disableToggle =
      !currentAccount ||
      !hasSupply ||
      reserve.isPaused ||
      (!usageAsCollateralEnabledOnUser && !canEnableAsCollateral);

    return (
      <Box sx={panelSx}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <PanelTitle>
            Collateral parameters
            <CollateralUsageHeader reserve={reserve} />
          </PanelTitle>

          {/* Same control type as the "MOST Mode" toggle (MUI Switch). */}
          {shouldShowToggle && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="secondary14"
                color="text.secondary"
                sx={{ whiteSpace: 'nowrap' }}
              >
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

        <CollateralUsage reserve={reserve as ComputedReserveData} />
      </Box>
    );
  }
}

ReserveOverview.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
