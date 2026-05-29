import { Box, Button, ButtonGroup, Typography, Tooltip, Alert, Menu, MenuItem, useTheme } from '@mui/material';
import { valueToBigNumber } from '@aave/math-utils';
import { API_ETH_MOCK_ADDRESS, InterestRate } from '@aave/contract-helpers';
import { useMemo, useState } from 'react';
import type { ComputedReserveDataWithMarket } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { MarketAssetsTable } from './MarketAssetsTable';
import { useRewardsMaps, sumIncentivesApr, sumRewardsApr } from './hooks';
import { MarketRow, TabKey } from './types';
import { useModalContext } from 'src/hooks/useModal';
import { useRootStore } from 'src/store/root';
import { useWalletModalContext } from 'src/hooks/useWalletModal';
import { GENERAL } from 'src/utils/mixPanelEvents';
import { useWalletBalances } from 'src/hooks/app-data-provider/useWalletBalances';
import { getMaxAmountAvailableToSupply } from 'src/utils/getMaxAmountAvailableToSupply';
import { getMaxAmountAvailableToBorrow, assetCanBeBorrowedByUser } from 'src/utils/getMaxAmountAvailableToBorrow';

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.25,
        py: 0.5,
        borderRadius: '8px',
        background: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,.04)' : 'rgba(40,25,15,.04)'),
        border: '1px solid',
        borderColor: 'divider',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <Typography component="span" sx={{ fontSize: 10, letterSpacing: '.10em', textTransform: 'uppercase', color: 'text.muted', fontWeight: 500 }}>
        {label}
      </Typography>
      <FormattedNumber value={value} symbol="USD" variant="secondary12" symbolsVariant="secondary12" compact visibleDecimals={2} sx={{ fontWeight: 600 }} />
    </Box>
  );
}

function PlateRaised({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box
      sx={{
        background: isDark
          ? `linear-gradient(180deg, ${theme.palette.background.surface2}, ${theme.palette.background.surface})`
          : `linear-gradient(180deg, ${theme.palette.background.surface2}, ${theme.palette.background.paper})`,
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,.10)' : 'rgba(40,25,15,.12)',
        borderRadius: '14px',
        boxShadow: isDark
          ? '0 1px 0 rgba(255,255,255,.04) inset, 0 30px 60px -30px rgba(0,0,0,.7)'
          : '0 1px 0 rgba(255,255,255,.9) inset, 0 18px 40px -20px rgba(120,70,20,.14)',
        px: { xs: 3, md: 6 },
        py: { xs: 3, md: 5 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {children}
    </Box>
  );
}

function PlateHeader({ eyebrow, title, rightEyebrow, rightValue }: { eyebrow: string; title: string; rightEyebrow: string; rightValue: string }) {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
      <Box>
        <Typography sx={{ fontSize: '10.5px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'text.muted', fontWeight: 500 }}>
          {eyebrow}
        </Typography>
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
          {title}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <Typography sx={{ fontSize: '10.5px', letterSpacing: '.12em', textTransform: 'uppercase', color: 'text.muted', fontWeight: 500 }}>
          {rightEyebrow}
        </Typography>
        <FormattedNumber
          value={rightValue}
          symbol="USD"
          variant="main16"
          visibleDecimals={2}
          compact
          symbolsVariant="secondary14"
          sx={{ fontWeight: 600, mt: 0.5 }}
        />
      </Box>
    </Box>
  );
}

export function MarketsTable() {
  const theme = useTheme();
  const { reserves, user, loading } = useAppDataContext();
  const { rewardsByAddress } = useRewardsMaps();
  const [activeTab, setActiveTab] = useState<TabKey>('supply');
  const { openSupply, openBorrow } = useModalContext();
  const { currentMarket, trackEvent } = useRootStore();
  const account = useRootStore((s) => s.account);
  const { setWalletModalOpen } = useWalletModalContext();
  const currentMarketData = useRootStore((s) => s.currentMarketData);
  const currentNetworkConfig = useRootStore((s) => s.currentNetworkConfig);
  const minRemainingBaseTokenBalance = useRootStore((s) => s.poolComputed.minRemainingBaseTokenBalance);
  const { walletBalances } = useWalletBalances(currentMarketData);

  // Anchors for per-row action dropdowns when dealing with wrapped base assets
  const [supplyMenuAnchor, setSupplyMenuAnchor] = useState<null | HTMLElement>(null);
  const [supplyMenuRow, setSupplyMenuRow] = useState<string | null>(null);

  // Compute wallet balance in USD for a given row id and reserve
  const getWalletBalanceUsdFor = (rowId: string, reserve?: ComputedReserveDataWithMarket): number => {
    if (!reserve) return 0;
    const assetKey = (rowId || '').toLowerCase();
    const baseKey = API_ETH_MOCK_ADDRESS.toLowerCase();

    let balanceAmount = '0';
    if (reserve.isWrappedBaseAsset) {
      if (assetKey === baseKey) {
        balanceAmount = walletBalances?.[baseKey]?.amount || '0';
      } else {
        const wrappedKey = (reserve.underlyingAsset || '').toLowerCase();
        balanceAmount = walletBalances?.[wrappedKey]?.amount || '0';
      }
    } else {
      balanceAmount = walletBalances?.[assetKey]?.amount || '0';
    }

    return Number(balanceAmount) * Number(reserve.priceInUSD || 0);
  };

  const renderSupplyAction = (row: MarketRow) => {
    const isWrapped = !!row.reserve?.isWrappedBaseAsset;
    const baseKey = API_ETH_MOCK_ADDRESS.toLowerCase();
    const blockedByBorrow = !!eligibilityByAsset.get(row.id)?.supplyBlockedByBorrow;
    const supplyTitle = blockedByBorrow
      ? 'You have an active borrow position for this asset. Repay it before supplying.'
      : '';
    if (isWrapped) {
      const wrappedDisabled = !row.reserve || !account || !!eligibilityByAsset.get(row.id)?.disableSupply;
      const baseDisabled = !row.reserve || !account || !!eligibilityByAsset.get(baseKey)?.disableSupply;
      return (
        <>
          <Tooltip title={supplyTitle} disableHoverListener={!supplyTitle} placement="top">
            <span>
              <Button
                size="small"
                variant="soft"
                disabled={wrappedDisabled && baseDisabled}
                sx={{ px: 1.75, py: 0.75, fontSize: 12, minWidth: 'unset' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!row.reserve) return;
                  if (!account) {
                    setWalletModalOpen(true);
                    return;
                  }
                  setSupplyMenuRow(row.id);
                  setSupplyMenuAnchor(e.currentTarget);
                }}
              >
                Supply
              </Button>
            </span>
          </Tooltip>
          <Menu
            anchorEl={supplyMenuAnchor}
            open={Boolean(supplyMenuAnchor) && supplyMenuRow === row.id}
            onClose={() => {
              setSupplyMenuAnchor(null);
              setSupplyMenuRow(null);
            }}
            PaperProps={{ sx: { minWidth: 'unset', width: 'auto' } }}
            anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
            transformOrigin={{ horizontal: 'left', vertical: 'top' }}
          >
            <MenuItem
              disabled={baseDisabled}
              onClick={(e) => {
                e.stopPropagation();
                if (!row.reserve) return;
                openSupply(baseKey, currentMarket, row.assetName, 'market-list');
                trackEvent(GENERAL.OPEN_MODAL, { modal: 'Supply', assetName: row.assetName });
                setSupplyMenuAnchor(null);
                setSupplyMenuRow(null);
              }}
            >
              {`Supply ${currentNetworkConfig.baseAssetSymbol}`}
            </MenuItem>
            <MenuItem
              disabled={wrappedDisabled}
              onClick={(e) => {
                e.stopPropagation();
                if (!row.reserve) return;
                openSupply(row.id, currentMarket, row.assetName, 'market-list');
                trackEvent(GENERAL.OPEN_MODAL, { modal: 'Supply', assetName: row.assetName });
                setSupplyMenuAnchor(null);
                setSupplyMenuRow(null);
              }}
            >
              {`Supply ${row.assetSymbol}`}
            </MenuItem>
          </Menu>
        </>
      );
    }
    return (
      <Tooltip title={supplyTitle} disableHoverListener={!supplyTitle} placement="top">
        <span>
          <Button
            size="small"
            variant="soft"
            disabled={!row.reserve || !account || !!eligibilityByAsset.get(row.id)?.disableSupply}
            sx={{ px: 1.75, py: 0.75, fontSize: 12, minWidth: 'unset' }}
            onClick={(e) => {
              e.stopPropagation();
              if (!row.reserve) return;
              if (!account) {
                setWalletModalOpen(true);
                return;
              }
              openSupply(row.id, currentMarket, row.assetName, 'market-list');
              trackEvent(GENERAL.OPEN_MODAL, { modal: 'Supply', assetName: row.assetName });
            }}
          >
            Supply
          </Button>
        </span>
      </Tooltip>
    );
  };

  const renderBorrowAction = (row: MarketRow) => {
    const eligibility = eligibilityByAsset.get(row.id);
    const eModeDisabled = !!eligibility?.eModeBorrowDisabled;
    const blockedBySupply = !!eligibility?.borrowBlockedBySupply;
    const isDisabled = !row.reserve || !account || !!eligibility?.disableBorrow;
    const title = blockedBySupply
      ? 'You have an active supply position for this asset. Withdraw it before borrowing.'
      : eModeDisabled
        ? 'In E-Mode some assets are not borrowable. Exit MOST Mode to get access to all assets'
        : '';
    return (
      <Tooltip title={title} disableHoverListener={!title} placement="top">
        <span>
          <Button
            size="small"
            variant="soft"
            disabled={isDisabled}
            sx={{ px: 1.75, py: 0.75, fontSize: 12, minWidth: 'unset' }}
            onClick={(e) => {
              e.stopPropagation();
              if (!row.reserve) return;
              if (!account) {
                setWalletModalOpen(true);
                return;
              }
              openBorrow(row.id, currentMarket, row.assetName, 'market-list');
              trackEvent(GENERAL.OPEN_MODAL, { modal: 'Borrow', assetName: row.assetName });
            }}
          >
            Borrow
          </Button>
        </span>
      </Tooltip>
    );
  };

  const buildRowsForMode = (mode: 'supply' | 'borrow'): MarketRow[] => {
    const rows: MarketRow[] = [];
    (reserves || []).forEach((r) => {
      const key = r.underlyingAsset.toLowerCase();
      const rewards = rewardsByAddress.get(key);
      const baseApy =
        mode === 'supply'
          ? (typeof r.supplyAPY === 'number' ? r.supplyAPY : parseFloat(String(r.supplyAPY || 0)))
          : (typeof r.variableBorrowAPY === 'number' ? r.variableBorrowAPY : parseFloat(String(r.variableBorrowAPY || 0)));
      const effectiveApy =
        baseApy +
        (mode === 'supply' ? sumIncentivesApr(r.aIncentivesData) : sumIncentivesApr(r.vIncentivesData)) +
        sumRewardsApr(mode === 'supply' ? rewards?.supply : rewards?.borrow, mode);

      rows.push({
        id: r.underlyingAsset,
        assetSymbol: r.symbol,
        assetName: r.name,
        apy: baseApy,
        variableApy: mode === 'borrow' ? baseApy : undefined,
        totalLiquidity: Number(r.totalLiquidityUSD || 0),
        availableLiquidity: Number(r.availableLiquidityUSD || 0),
        effectiveApy,
        reserve: r,
        rewardsSupply: rewards?.supply,
        rewardsBorrow: rewards?.borrow,
        balance: getWalletBalanceUsdFor(r.underlyingAsset, r),
      } as MarketRow);
    });
    return rows;
  };

  const eligibilityByAsset = useMemo(() => {
    const map = new Map<string, {
      disableSupply: boolean;
      disableBorrow: boolean;
      maxBorrow?: string;
      eModeBorrowDisabled?: boolean;
      supplyBlockedByBorrow?: boolean;
      borrowBlockedBySupply?: boolean;
    }>();
    (reserves || []).forEach((r) => {
      const asset = r.underlyingAsset?.toLowerCase();
      const balanceAmount = walletBalances?.[asset]?.amount || '0';

      // Position checks: prevent looping (supplying what's borrowed, borrowing what's supplied)
      const isReserveAlreadySupplied = (user?.userReservesData || []).some(
        (ur) => ur.reserve.underlyingAsset === r.underlyingAsset && ur.underlyingBalance !== '0'
      );
      const isReserveAlreadyBorrowed = (user?.userReservesData || []).some(
        (ur) => ur.reserve.underlyingAsset === r.underlyingAsset &&
          (ur.variableBorrows !== '0' || ur.stableBorrows !== '0')
      );

      // Supply eligibility
      const maxAmountToSupply = getMaxAmountAvailableToSupply(
        balanceAmount,
        r,
        r.underlyingAsset,
        minRemainingBaseTokenBalance
      ).toString();
      const disableSupply =
        !account ||
        !r ||
        maxAmountToSupply === '0' ||
        balanceAmount === '0' ||
        isReserveAlreadyBorrowed;

      // Borrow eligibility
      const userHasNoCollateralSupplied = user?.totalCollateralMarketReferenceCurrency === '0';
      const assetBorrowable = user ? assetCanBeBorrowedByUser(r, user) : false;
      const eModeBorrowDisabled = !!(user?.isInEmode && r.eModeCategoryId !== user.userEmodeCategoryId);
      const maxAmountToBorrow = user
        ? getMaxAmountAvailableToBorrow(r, user, InterestRate.Variable).toString()
        : '0';
      const disableBorrow =
        !account ||
        !r ||
        !assetBorrowable ||
        userHasNoCollateralSupplied ||
        isReserveAlreadySupplied ||
        maxAmountToBorrow === '0';

      map.set(r.underlyingAsset, {
        disableSupply,
        disableBorrow,
        maxBorrow: maxAmountToBorrow,
        eModeBorrowDisabled,
        supplyBlockedByBorrow: isReserveAlreadyBorrowed,
        borrowBlockedBySupply: isReserveAlreadySupplied,
      });

      // Add synthetic base-asset eligibility for FLOW alongside WFLOW
      if (r.isWrappedBaseAsset) {
        const baseKey = API_ETH_MOCK_ADDRESS.toLowerCase();
        const baseBalanceAmount = walletBalances?.[baseKey]?.amount || '0';
        const baseMaxAmountToSupply = getMaxAmountAvailableToSupply(
          baseBalanceAmount,
          r,
          API_ETH_MOCK_ADDRESS.toLowerCase(),
          minRemainingBaseTokenBalance
        ).toString();
        const baseDisableSupply =
          !account ||
          !r ||
          baseMaxAmountToSupply === '0' ||
          baseBalanceAmount === '0' ||
          isReserveAlreadyBorrowed;
        // Borrow eligibility mirrors the wrapped reserve
        const baseDisableBorrow = disableBorrow;
        const baseMaxBorrow = maxAmountToBorrow;
        const baseEmodeBorrowDisabled = eModeBorrowDisabled;
        map.set(baseKey, {
          disableSupply: baseDisableSupply,
          disableBorrow: baseDisableBorrow,
          maxBorrow: baseMaxBorrow,
          eModeBorrowDisabled: baseEmodeBorrowDisabled,
          supplyBlockedByBorrow: isReserveAlreadyBorrowed,
          borrowBlockedBySupply: isReserveAlreadySupplied,
        });
      }
    });
    return map;
  }, [reserves, walletBalances, user, account, minRemainingBaseTokenBalance]);

  const supplyRows: MarketRow[] = useMemo(() => buildRowsForMode('supply'), [reserves, rewardsByAddress, currentNetworkConfig.baseAssetSymbol, account]);

  const borrowRows: MarketRow[] = useMemo(() => buildRowsForMode('borrow'), [reserves, rewardsByAddress, currentNetworkConfig.baseAssetSymbol, account]);

  // Row sets per mode for large screens
  const supplyNonFrozenRows = useMemo(() => (supplyRows || []).filter((r) => !r.reserve || (!r.reserve.isPaused && !r.reserve.isFrozen)), [supplyRows]);
  const borrowNonFrozenRows = useMemo(() => (borrowRows || []).filter((r) => !r.reserve || (!r.reserve.isPaused && !r.reserve.isFrozen)), [borrowRows]);

  const activeRows = activeTab === 'supply' ? supplyRows : borrowRows;
  const nonFrozenRows = useMemo(() => (activeRows || []).filter((r) => !r.reserve || (!r.reserve.isPaused && !r.reserve.isFrozen)), [activeRows]);
  const frozenRows = useMemo(() => (activeRows || []).filter((r) => r.reserve && (r.reserve.isPaused || r.reserve.isFrozen)), [activeRows]);

  const userHasFrozenOrPaused = useMemo(() => {
    const positions = (user?.userReservesData || []).filter(
      (ur) => ur.underlyingBalance !== '0' || ur.variableBorrows !== '0' || ur.stableBorrows !== '0'
    );
    const set = new Set(positions.map((ur) => ur.reserve.underlyingAsset.toLowerCase()));
    return frozenRows.some((r) => set.has(r.id.toLowerCase()));
  }, [user, frozenRows]);

  const aggregatedStats = useMemo(() => {
    const totals = (reserves || []).reduce(
      (acc, reserve) => ({
        totalLiquidity: acc.totalLiquidity.plus(reserve.totalLiquidityUSD || 0),
        totalDebt: acc.totalDebt.plus(reserve.totalDebtUSD || 0),
      }),
      { totalLiquidity: valueToBigNumber(0), totalDebt: valueToBigNumber(0) }
    );
    const totalAvailable = totals.totalLiquidity.minus(totals.totalDebt);
    return { totalLiquidity: totals.totalLiquidity, totalAvailable, totalDebt: totals.totalDebt };
  }, [reserves]);



  return (
    <Box>
      {/* Section header: "Markets" + count chip + total stat chips */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          gap: { xs: 2, md: 3 },
          flexWrap: 'wrap',
          mb: { xs: 3, md: 4 },
        }}
      >
        <Typography
          sx={{
            fontFamily: theme.typography.h1.fontFamily,
            fontSize: { xs: 24, md: 30 },
            fontWeight: 500,
            letterSpacing: '-.022em',
            lineHeight: 1.1,
            color: 'text.primary',
            margin: 0,
          }}
        >
          Markets
        </Typography>
        <Box
          sx={{
            fontSize: 11,
            color: 'text.muted',
            px: 1,
            py: '2px',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '8px',
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {(supplyNonFrozenRows || []).length}
        </Box>

        {/* Mobile: supply/borrow toggle */}
        <Box sx={{ display: { xs: 'flex', xl: 'none' }, width: { xs: '100%', md: 'unset' }, mt: { xs: 1, md: 0 } }}>
          <ButtonGroup fullWidth>
            <Button onClick={() => setActiveTab('supply')} aria-pressed={activeTab === 'supply'} variant={activeTab === 'supply' ? 'contained' : 'outlined'}>
              Supply
            </Button>
            <Button onClick={() => setActiveTab('borrow')} aria-pressed={activeTab === 'borrow'} variant={activeTab === 'borrow' ? 'contained' : 'outlined'}>
              Borrow
            </Button>
          </ButtonGroup>
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* Right-side stat chips */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <StatChip label="TOTAL MARKET" value={aggregatedStats.totalLiquidity.toString()} />
          <StatChip label="AVAIL" value={aggregatedStats.totalAvailable.toString()} />
          <StatChip label="BORROWED" value={aggregatedStats.totalDebt.toString()} />
        </Box>
      </Box>

      {/* Large: dual-pane supply/borrow plate cards */}
      <Box sx={{ display: { xs: 'none', xl: 'block' }, mb: { xs: 4, md: 6 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 4 }}>
          <PlateRaised>
            <PlateHeader
              eyebrow="SUPPLY"
              title="Earn on idle assets"
              rightEyebrow="TOTAL MARKET SIZE"
              rightValue={aggregatedStats.totalLiquidity.toString()}
            />
            <MarketAssetsTable
              rows={supplyNonFrozenRows}
              mode="supply"
              loading={loading}
              showBalance={!!account}
              renderAction={renderSupplyAction}
              onRowClick={(row) => {
                if (!row.reserve) return;
                window.location.href = `/markets/${row.reserve.underlyingAsset}`;
              }}
            />
          </PlateRaised>

          <PlateRaised>
            <PlateHeader
              eyebrow="BORROW"
              title="Take a position"
              rightEyebrow="TOTAL BORROWED"
              rightValue={aggregatedStats.totalDebt.toString()}
            />
            {user?.isInEmode && (
              <Alert severity="info" sx={{ mb: 2, borderRadius: '10px' }}>
                In MOST Mode some assets are not borrowable. Exit MOST Mode to get access to all assets
              </Alert>
            )}
            <MarketAssetsTable
              rows={borrowNonFrozenRows}
              mode="borrow"
              loading={loading}
              renderAction={renderBorrowAction}
              onRowClick={(row) => {
                if (!row.reserve) return;
                window.location.href = `/markets/${row.reserve.underlyingAsset}`;
              }}
            />
          </PlateRaised>
        </Box>
      </Box>

      {/* Small/Medium: single table with toggle */}
      <Box sx={{ display: { xs: 'block', xl: 'none' } }}>
        <PlateRaised>
          <PlateHeader
            eyebrow={activeTab === 'supply' ? 'SUPPLY' : 'BORROW'}
            title={activeTab === 'supply' ? 'Earn on idle assets' : 'Take a position'}
            rightEyebrow={activeTab === 'supply' ? 'TOTAL MARKET SIZE' : 'TOTAL BORROWED'}
            rightValue={(activeTab === 'supply' ? aggregatedStats.totalLiquidity : aggregatedStats.totalDebt).toString()}
          />
          {user?.isInEmode && activeTab === 'borrow' && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: '10px' }}>
              In MOST Mode some assets are not borrowable. Exit MOST Mode to get access to all assets
            </Alert>
          )}
          <Box sx={{ overflowX: 'auto' }}>
            {/* Phones: fit the viewport (secondary columns are hidden in the table,
                so Asset/APY/action fit without scroll). md+: keep the 700px scroll. */}
            <Box sx={{ minWidth: { xs: 'auto', md: 700 } }}>
              <MarketAssetsTable
                rows={nonFrozenRows}
                mode={activeTab}
                loading={loading}
                showBalance={!!account}
                renderAction={(row) => (activeTab === 'supply' ? renderSupplyAction(row) : renderBorrowAction(row))}
                onRowClick={(row) => {
                  if (!row.reserve) return;
                  window.location.href = `/markets/${row.reserve.underlyingAsset}`;
                }}
              />
            </Box>
          </Box>
        </PlateRaised>
      </Box>

      {(userHasFrozenOrPaused && frozenRows.length > 0) && (
        <Box sx={{ display: { xs: 'block', xl: 'none' }, mt: 4 }}>
          <PlateRaised>
            <PlateHeader
              eyebrow="PAUSED"
              title="Paused assets"
              rightEyebrow=""
              rightValue=""
            />
            <Box sx={{ overflowX: 'auto' }}>
              <Box sx={{ minWidth: 700 }}>
                <MarketAssetsTable
                  rows={frozenRows}
                  mode={activeTab}
                  loading={loading}
                  showBalance={!!account}
                  renderAction={(row) => (activeTab === 'supply' ? renderSupplyAction(row) : renderBorrowAction(row))}
                  onRowClick={(row) => {
                    if (!row.reserve) return;
                    window.location.href = `/markets/${row.reserve.underlyingAsset}`;
                  }}
                />
              </Box>
            </Box>
          </PlateRaised>
        </Box>
      )}
    </Box>
  );
}


