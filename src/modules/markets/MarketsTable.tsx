import { API_ETH_MOCK_ADDRESS, InterestRate } from '@aave/contract-helpers';
import { ChevronDownIcon } from '@heroicons/react/outline';
import {
  Box,
  Button,
  LinearProgress,
  Menu,
  MenuItem,
  Skeleton,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useMemo, useState } from 'react';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { SearchInput } from 'src/components/SearchInput';
import type { ComputedReserveDataWithMarket } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useWalletBalances } from 'src/hooks/app-data-provider/useWalletBalances';
import { useModalContext } from 'src/hooks/useModal';
import { useWalletModalContext } from 'src/hooks/useWalletModal';
import { useRootStore } from 'src/store/root';
import {
  assetCanBeBorrowedByUser,
  getMaxAmountAvailableToBorrow,
} from 'src/utils/getMaxAmountAvailableToBorrow';
import { getMaxAmountAvailableToSupply } from 'src/utils/getMaxAmountAvailableToSupply';
import { GENERAL } from 'src/utils/mixPanelEvents';
import { FONT_DISPLAY, FONT_MONO } from 'src/utils/theme';

// Minimal stablecoin classification — no shared helper exists in the codebase.
// Symbols compared case-insensitively against reserve symbols.
const STABLE_SYMBOLS = new Set(
  [
    'PYUSD0',
    'PYUSD',
    'STGUSDC',
    'USDF',
    'USDC',
    'USDC.E',
    'USDT',
    'USDT.E',
    'DAI',
    'DAI.E',
    'USDS',
    'FRAX',
  ].map((s) => s.toUpperCase())
);

const isStableSymbol = (symbol?: string) => !!symbol && STABLE_SYMBOLS.has(symbol.toUpperCase());

type AssetFilter = 'all' | 'stables' | 'volatile';

type SortKey = 'supplyApy' | 'borrowApy' | 'totalSupply' | 'utilization';
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'supplyApy', label: 'Supply APY' },
  { key: 'borrowApy', label: 'Borrow APY' },
  { key: 'totalSupply', label: 'Total supply' },
  { key: 'utilization', label: 'Utilization' },
];

interface UnifiedMarketRow {
  id: string;
  assetName: string;
  assetSymbol: string;
  iconSymbol: string;
  priceInUSD: number;
  supplyApy: number;
  borrowApy: number;
  borrowingEnabled: boolean;
  totalSupplyUsd: number;
  totalBorrowedUsd: number;
  availableUsd: number;
  utilization: number;
  reserve: ComputedReserveDataWithMarket;
}

const StatLabel = ({ children }: { children: React.ReactNode }) => (
  <Typography
    sx={{
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'text.secondary',
    }}
  >
    {children}
  </Typography>
);

const CellSub = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="secondary12" sx={{ color: 'text.secondary' }}>
    {children}
  </Typography>
);

export function MarketsTable() {
  const theme = useTheme();
  const { reserves, user, loading } = useAppDataContext();
  const { openSupply, openBorrow } = useModalContext();
  const { currentMarket, trackEvent } = useRootStore();
  const account = useRootStore((s) => s.account);
  const { setWalletModalOpen } = useWalletModalContext();
  const currentMarketData = useRootStore((s) => s.currentMarketData);
  const currentNetworkConfig = useRootStore((s) => s.currentNetworkConfig);
  const minRemainingBaseTokenBalance = useRootStore(
    (s) => s.poolComputed.minRemainingBaseTokenBalance
  );
  const { walletBalances } = useWalletBalances(currentMarketData);

  // Filter / sort state (client-side over already-fetched reserves)
  const [searchTerm, setSearchTerm] = useState('');
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('supplyApy');
  const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);

  // Anchors for per-row supply dropdown when dealing with the wrapped base asset
  const [supplyMenuAnchor, setSupplyMenuAnchor] = useState<null | HTMLElement>(null);
  const [supplyMenuRow, setSupplyMenuRow] = useState<string | null>(null);

  const eligibilityByAsset = useMemo(() => {
    const map = new Map<
      string,
      {
        disableSupply: boolean;
        disableBorrow: boolean;
        maxBorrow?: string;
        eModeBorrowDisabled?: boolean;
      }
    >();
    (reserves || []).forEach((r) => {
      const asset = r.underlyingAsset?.toLowerCase();
      const balanceAmount = walletBalances?.[asset]?.amount || '0';

      // Supply eligibility
      const maxAmountToSupply = getMaxAmountAvailableToSupply(
        balanceAmount,
        r,
        r.underlyingAsset,
        minRemainingBaseTokenBalance
      ).toString();
      const disableSupply = !account || !r || maxAmountToSupply === '0' || balanceAmount === '0';

      // Borrow eligibility
      const isReserveAlreadySupplied = (user?.userReservesData || []).some(
        (ur) => ur.reserve.underlyingAsset === r.underlyingAsset && ur.underlyingBalance !== '0'
      );
      const userHasNoCollateralSupplied = user?.totalCollateralMarketReferenceCurrency === '0';
      const assetBorrowable = user ? assetCanBeBorrowedByUser(r, user) : false;
      const eModeBorrowDisabled = !!(
        user?.isInEmode && r.eModeCategoryId !== user.userEmodeCategoryId
      );
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
          !account || !r || baseMaxAmountToSupply === '0' || baseBalanceAmount === '0';
        map.set(baseKey, {
          disableSupply: baseDisableSupply,
          disableBorrow,
          maxBorrow: maxAmountToBorrow,
          eModeBorrowDisabled,
        });
      }
    });
    return map;
  }, [reserves, walletBalances, user, account, minRemainingBaseTokenBalance]);

  const allRows: UnifiedMarketRow[] = useMemo(() => {
    return (reserves || [])
      .filter((r) => !r.isPaused && !r.isFrozen)
      .map((r) => {
        const supplyApy =
          typeof r.supplyAPY === 'number' ? r.supplyAPY : parseFloat(String(r.supplyAPY || 0));
        const borrowApy =
          typeof r.variableBorrowAPY === 'number'
            ? r.variableBorrowAPY
            : parseFloat(String(r.variableBorrowAPY || 0));
        const availableLiquidity = Number(
          r.formattedAvailableLiquidity ?? r.availableLiquidity ?? 0
        );
        const availableUsd = availableLiquidity * Number(r.priceInUSD || 0);
        return {
          id: r.underlyingAsset,
          assetName: r.name,
          assetSymbol: r.symbol,
          iconSymbol: r.iconSymbol,
          priceInUSD: Number(r.priceInUSD || 0),
          supplyApy,
          borrowApy,
          borrowingEnabled: !!r.borrowingEnabled,
          totalSupplyUsd: Number(r.totalLiquidityUSD || 0),
          totalBorrowedUsd: Number(r.totalDebtUSD || 0),
          availableUsd,
          utilization: Number(r.borrowUsageRatio ?? 0),
          reserve: r,
        };
      });
  }, [reserves]);

  const filteredSortedRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = allRows.filter((row) => {
      const matchesTerm =
        !term ||
        row.assetName.toLowerCase().includes(term) ||
        row.assetSymbol.toLowerCase().includes(term);
      const stable = isStableSymbol(row.assetSymbol);
      const matchesClass =
        assetFilter === 'all' ||
        (assetFilter === 'stables' && stable) ||
        (assetFilter === 'volatile' && !stable);
      return matchesTerm && matchesClass;
    });
    const sorted = [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'supplyApy':
          return b.supplyApy - a.supplyApy;
        case 'borrowApy':
          return b.borrowApy - a.borrowApy;
        case 'totalSupply':
          return b.totalSupplyUsd - a.totalSupplyUsd;
        case 'utilization':
          return b.utilization - a.utilization;
        default:
          return 0;
      }
    });
    return sorted;
  }, [allRows, searchTerm, assetFilter, sortKey]);

  const goToDetail = (row: UnifiedMarketRow) => {
    window.location.href = `/markets/${row.reserve.underlyingAsset}`;
  };

  const renderSupplyAction = (row: UnifiedMarketRow) => {
    const isWrapped = !!row.reserve.isWrappedBaseAsset;
    const baseKey = API_ETH_MOCK_ADDRESS.toLowerCase();
    if (isWrapped) {
      const wrappedDisabled = !account || !!eligibilityByAsset.get(row.id)?.disableSupply;
      const baseDisabled = !account || !!eligibilityByAsset.get(baseKey)?.disableSupply;
      return (
        <>
          <Button
            size="small"
            variant="contained"
            disabled={wrappedDisabled && baseDisabled}
            sx={{ width: { xs: '100%', md: 'auto' } }}
            onClick={(e) => {
              e.stopPropagation();
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
      <Button
        size="small"
        variant="contained"
        disabled={!account || !!eligibilityByAsset.get(row.id)?.disableSupply}
        sx={{ width: { xs: '100%', md: 'auto' } }}
        onClick={(e) => {
          e.stopPropagation();
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
    );
  };

  const renderBorrowAction = (row: UnifiedMarketRow) => {
    if (!row.borrowingEnabled) {
      return (
        <Button size="small" variant="outlined" disabled sx={{ width: { xs: '100%', md: 'auto' } }}>
          Borrow
        </Button>
      );
    }
    const eModeDisabled = !!eligibilityByAsset.get(row.id)?.eModeBorrowDisabled;
    const isDisabled = !account || !!eligibilityByAsset.get(row.id)?.disableBorrow;
    const title = eModeDisabled
      ? 'In E-Mode some assets are not borrowable. Exit MOST Mode to get access to all assets'
      : '';
    return (
      <Tooltip title={title} disableHoverListener={!eModeDisabled} placement="top">
        <span style={{ width: '100%' }}>
          <Button
            size="small"
            variant="outlined"
            disabled={isDisabled}
            sx={{ width: { xs: '100%', md: 'auto' } }}
            onClick={(e) => {
              e.stopPropagation();
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

  const utilizationColor = (util: number) => {
    if (util >= 0.8) return theme.palette.warning.main;
    if (util < 0.25) return theme.palette.success.main;
    return theme.palette.primary.main;
  };

  // Responsive grid: asset | supply | borrow | utilization | actions
  const GRID_COLUMNS = {
    xs: '1fr',
    md: 'minmax(200px, 1.6fr) 1fr 1fr minmax(180px, 1.8fr) auto',
  };

  const sortLabel = SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? 'Supply APY';

  const pillSx = (active: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.75,
    height: 36,
    px: 1.75,
    borderRadius: '9999px',
    border: '1px solid',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    userSelect: 'none' as const,
    whiteSpace: 'nowrap' as const,
    transition: 'color 150ms ease, border-color 150ms ease, background-color 150ms ease',
    ...(active
      ? {
          bgcolor: alpha(theme.palette.primary.main, 0.12),
          borderColor: 'primary.main',
          color: 'primary.main',
        }
      : {
          bgcolor: 'background.paper',
          borderColor: 'divider',
          color: 'text.secondary',
          '&:hover': { color: 'text.primary', borderColor: 'text.disabled' },
        }),
  });

  const renderCard = (row: UnifiedMarketRow) => {
    const util = row.utilization;
    return (
      <Box
        key={row.id}
        onClick={() => goToDetail(row)}
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '20px',
          p: { xs: 2.5, md: 3 },
          cursor: 'pointer',
          transition: 'border-color 150ms ease',
          '&:hover': { borderColor: 'primary.main' },
          display: 'grid',
          gridTemplateColumns: GRID_COLUMNS,
          alignItems: 'center',
          columnGap: 3,
          rowGap: 2.5,
        }}
      >
        {/* Asset */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <TokenIcon symbol={row.iconSymbol} fontSize="large" sx={{ fontSize: 40 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 600,
                fontSize: 16,
                lineHeight: 1.25,
                color: 'text.primary',
              }}
              noWrap
            >
              {row.assetName}
            </Typography>
            <Typography variant="secondary12" sx={{ color: 'text.secondary' }} noWrap>
              {row.assetSymbol}
            </Typography>
            <FormattedNumber
              value={row.priceInUSD}
              symbol="USD"
              visibleDecimals={2}
              variant="secondary12"
              symbolsVariant="secondary12"
              symbolsColor="text.secondary"
              sx={{ fontFamily: FONT_MONO, color: 'text.secondary', display: 'flex', mt: 0.25 }}
            />
          </Box>
        </Box>

        {/* Supply APY */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            alignItems: { xs: 'flex-start', md: 'flex-start' },
          }}
        >
          <StatLabel>Supply APY</StatLabel>
          <FormattedNumber
            value={row.supplyApy}
            percent
            visibleDecimals={2}
            symbolsVariant="secondary14"
            sx={{
              fontFamily: FONT_MONO,
              fontWeight: 600,
              fontSize: 18,
              color: 'text.primary',
            }}
          />
          <CellSub>
            <FormattedNumber
              value={row.totalSupplyUsd}
              symbol="USD"
              compact
              visibleDecimals={2}
              variant="secondary12"
              symbolsVariant="secondary12"
              symbolsColor="text.secondary"
              sx={{ color: 'text.secondary', display: 'inline-flex' }}
            />{' '}
            supplied
          </CellSub>
        </Box>

        {/* Borrow APY */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <StatLabel>Borrow APY</StatLabel>
          {row.borrowingEnabled ? (
            <>
              <FormattedNumber
                value={row.borrowApy}
                percent
                visibleDecimals={2}
                symbolsVariant="secondary14"
                sx={{ fontFamily: FONT_MONO, fontWeight: 600, fontSize: 18, color: 'text.primary' }}
              />
              <CellSub>
                <FormattedNumber
                  value={row.totalBorrowedUsd}
                  symbol="USD"
                  compact
                  visibleDecimals={2}
                  variant="secondary12"
                  symbolsVariant="secondary12"
                  symbolsColor="text.secondary"
                  sx={{ color: 'text.secondary', display: 'inline-flex' }}
                />{' '}
                borrowed
              </CellSub>
            </>
          ) : (
            <>
              <Typography
                sx={{
                  fontFamily: FONT_MONO,
                  fontWeight: 600,
                  fontSize: 18,
                  color: 'text.disabled',
                }}
              >
                --
              </Typography>
              <CellSub>Borrow disabled</CellSub>
            </>
          )}
        </Box>

        {/* Utilization */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <StatLabel>Utilization</StatLabel>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(Math.max(util * 100, 0), 100)}
              sx={{
                flex: 1,
                minWidth: 60,
                height: 6,
                '& .MuiLinearProgress-bar': { backgroundColor: utilizationColor(util) },
              }}
            />
            <FormattedNumber
              value={util}
              percent
              visibleDecimals={1}
              variant="secondary12"
              symbolsVariant="secondary12"
              sx={{
                fontFamily: FONT_MONO,
                color: 'text.primary',
                minWidth: 46,
                justifyContent: 'flex-end',
              }}
            />
          </Box>
          <CellSub>
            <FormattedNumber
              value={row.availableUsd}
              symbol="USD"
              compact
              visibleDecimals={2}
              variant="secondary12"
              symbolsVariant="secondary12"
              symbolsColor="text.secondary"
              sx={{ color: 'text.secondary', display: 'inline-flex' }}
            />{' '}
            available
          </CellSub>
        </Box>

        {/* Actions */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row', md: 'row' },
            gap: 1,
            width: { xs: '100%', md: 'auto' },
            justifyContent: { xs: 'stretch', md: 'flex-end' },
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {renderSupplyAction(row)}
          {renderBorrowAction(row)}
        </Box>
      </Box>
    );
  };

  const CardSkeleton = () => (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '20px',
        p: { xs: 2.5, md: 3 },
        display: 'grid',
        gridTemplateColumns: GRID_COLUMNS,
        alignItems: 'center',
        columnGap: 3,
        rowGap: 2.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Skeleton variant="circular" width={40} height={40} />
        <Box>
          <Skeleton variant="text" width={120} height={20} />
          <Skeleton variant="text" width={60} height={16} />
        </Box>
      </Box>
      <Skeleton variant="text" width={90} height={40} />
      <Skeleton variant="text" width={90} height={40} />
      <Skeleton variant="text" width={140} height={40} />
      <Skeleton variant="rectangular" width={140} height={36} sx={{ borderRadius: '12px' }} />
    </Box>
  );

  return (
    <Box>
      {/* Filter bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexWrap: 'wrap',
          mb: { xs: 3, md: 2.5 },
        }}
      >
        <SearchInput
          onSearchTermChange={setSearchTerm}
          placeholder="Search markets…"
          wrapperSx={{
            flex: '1 1 240px',
            maxWidth: { sm: 320 },
            height: 36,
            borderRadius: '9999px',
          }}
        />

        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          <Box sx={pillSx(assetFilter === 'all')} onClick={() => setAssetFilter('all')}>
            All assets
          </Box>
          <Box sx={pillSx(assetFilter === 'stables')} onClick={() => setAssetFilter('stables')}>
            Stables
          </Box>
          <Box sx={pillSx(assetFilter === 'volatile')} onClick={() => setAssetFilter('volatile')}>
            Volatile
          </Box>
        </Box>

        <Box sx={{ ml: { md: 'auto' }, display: 'inline-flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={pillSx(false)}
            onClick={(e) => setSortAnchor(e.currentTarget)}
            aria-haspopup="true"
            role="button"
          >
            <Box component="span" sx={{ color: 'text.disabled' }}>
              Sort
            </Box>
            {sortLabel}
            <ChevronDownIcon style={{ width: 12, height: 12 }} />
          </Box>
          <Menu
            anchorEl={sortAnchor}
            open={Boolean(sortAnchor)}
            onClose={() => setSortAnchor(null)}
          >
            {SORT_OPTIONS.map((option) => (
              <MenuItem
                key={option.key}
                selected={option.key === sortKey}
                onClick={() => {
                  setSortKey(option.key);
                  setSortAnchor(null);
                }}
              >
                {option.label}
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Box>

      {/* Market list */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {loading ? (
          [0, 1, 2, 3].map((i) => <CardSkeleton key={`market-skel-${i}`} />)
        ) : filteredSortedRows.length === 0 ? (
          <Typography
            variant="secondary14"
            sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}
          >
            No markets match your filters.
          </Typography>
        ) : (
          filteredSortedRows.map((row) => renderCard(row))
        )}
      </Box>
    </Box>
  );
}
