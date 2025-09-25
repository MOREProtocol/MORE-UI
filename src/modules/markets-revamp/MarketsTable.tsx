import { Box, Button, ButtonGroup, Typography } from '@mui/material';
import { valueToBigNumber } from '@aave/math-utils';
import { API_ETH_MOCK_ADDRESS, InterestRate } from '@aave/contract-helpers';
import { useMemo, useState } from 'react';
import { BaseDataGrid, ColumnDefinition } from 'src/components/primitives/DataGrid';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { IncentivesCard } from 'src/components/incentives/IncentivesCard';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { UsdChip } from 'src/components/primitives/UsdChip';
import { useRewardsMaps, sumIncentivesApr, sumRewardsApr } from './hooks';
import { MarketRow, TabKey } from './types';
import { useModalContext } from 'src/hooks/useModal';
import { useRootStore } from 'src/store/root';
import { useWalletModalContext } from 'src/hooks/useWalletModal';
import { GENERAL } from 'src/utils/mixPanelEvents';
import { useWalletBalances } from 'src/hooks/app-data-provider/useWalletBalances';
import { getMaxAmountAvailableToSupply } from 'src/utils/getMaxAmountAvailableToSupply';
import { getMaxAmountAvailableToBorrow, assetCanBeBorrowedByUser } from 'src/utils/getMaxAmountAvailableToBorrow';
import { fetchIconSymbolAndName } from 'src/ui-config/reservePatches';

export function MarketsTable() {
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

  // Helpers
  const usdValue = (amount: string | number, priceInUSD?: string | number) =>
    (Number(amount || 0) * Number(priceInUSD || 0)).toString();

  const renderBalanceCell = (row: MarketRow) => {
    const assetKey = row.id.toLowerCase();
    const isWrapped = row.reserve?.isWrappedBaseAsset;
    const baseKey = API_ETH_MOCK_ADDRESS.toLowerCase();

    if (isWrapped && assetKey === baseKey) {
      const baseBal = walletBalances?.[baseKey]?.amount || '0';
      const baseUsd = usdValue(baseBal, row.reserve?.priceInUSD);
      return (
        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1.5 }}>
          <FormattedNumber compact value={Number(baseBal)} variant="secondary14" />
          <UsdChip value={baseUsd} textVariant="secondary12" />
        </Box>
      );
    }
    if (isWrapped && assetKey !== baseKey) {
      const wrappedBal = walletBalances?.[row.reserve?.underlyingAsset.toLowerCase() || assetKey]?.amount || '0';
      const wrappedUsd = usdValue(wrappedBal, row.reserve?.priceInUSD);
      return (
        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1.5 }}>
          <FormattedNumber compact value={Number(wrappedBal)} variant="secondary14" />
          <UsdChip value={wrappedUsd} textVariant="secondary12" />
        </Box>
      );
    }

    const bal = walletBalances?.[assetKey]?.amount || '0';
    const usd = usdValue(bal, row.reserve?.priceInUSD);
    return (
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1.5 }}>
        <FormattedNumber compact value={Number(bal)} variant="secondary14" />
        <UsdChip value={usd} textVariant="secondary12" />
      </Box>
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
      } as MarketRow);

      if (r.isWrappedBaseAsset && account) {
        const baseDisplay = fetchIconSymbolAndName({
          symbol: currentNetworkConfig.baseAssetSymbol,
          underlyingAsset: API_ETH_MOCK_ADDRESS.toLowerCase(),
          name: currentNetworkConfig.baseAssetSymbol,
        });
        rows.push({
          id: API_ETH_MOCK_ADDRESS.toLowerCase(),
          assetSymbol: currentNetworkConfig.baseAssetSymbol,
          assetName: baseDisplay?.name || currentNetworkConfig.baseAssetSymbol,
          apy: baseApy,
          variableApy: mode === 'borrow' ? baseApy : undefined,
          totalLiquidity: Number(r.totalLiquidityUSD || 0),
          availableLiquidity: Number(r.availableLiquidityUSD || 0),
          effectiveApy,
          reserve: r,
          rewardsSupply: rewards?.supply,
          rewardsBorrow: rewards?.borrow,
        } as MarketRow);
      }
    });
    return rows;
  };

  const eligibilityByAsset = useMemo(() => {
    const map = new Map<string, { disableSupply: boolean; disableBorrow: boolean; maxBorrow?: string }>();
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

      map.set(r.underlyingAsset, { disableSupply, disableBorrow, maxBorrow: maxAmountToBorrow });

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
        const baseDisableSupply = !account || !r || baseMaxAmountToSupply === '0' || baseBalanceAmount === '0';
        // Borrow eligibility mirrors the wrapped reserve
        const baseDisableBorrow = disableBorrow;
        const baseMaxBorrow = maxAmountToBorrow;
        map.set(baseKey, { disableSupply: baseDisableSupply, disableBorrow: baseDisableBorrow, maxBorrow: baseMaxBorrow });
      }
    });
    return map;
  }, [reserves, walletBalances, user, account, minRemainingBaseTokenBalance]);

  const supplyRows: MarketRow[] = useMemo(() => buildRowsForMode('supply'), [reserves, rewardsByAddress, currentNetworkConfig.baseAssetSymbol, account]);

  const borrowRows: MarketRow[] = useMemo(() => buildRowsForMode('borrow'), [reserves, rewardsByAddress, currentNetworkConfig.baseAssetSymbol, account]);

  const columns: ColumnDefinition<MarketRow>[] = useMemo(() => {
    const baseColumns: ColumnDefinition<MarketRow>[] = [
      {
        key: 'assetName',
        label: 'Asset',
        sortable: true,
        render: (row) => (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            justifyContent: { xs: 'flex-end', md: 'flex-start' },
            flexDirection: { xs: 'row-reverse', md: 'row' }
          }}>
            {row.reserve && <TokenIcon symbol={row.reserve.iconSymbol} fontSize="large" />}
            <Box>
              <Typography variant="subheader1" sx={{ textAlign: { xs: 'right', md: 'left' } }}>{row.assetName}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: { xs: 'right', md: 'left' } }}>{row.assetSymbol}</Typography>
            </Box>
          </Box>
        ),
      },
      {
        key: 'effectiveApy',
        label: activeTab === 'supply' ? 'Supply APY' : 'Borrow Rate',
        sortable: true,
        render: (row) => (
          <IncentivesCard
            value={activeTab === 'supply' ? row.apy : (row.variableApy ?? row.apy)}
            incentives={activeTab === 'supply' ? (row.reserve?.aIncentivesData || []) : (row.reserve?.vIncentivesData || [])}
            rewards={activeTab === 'supply' ? (row.rewardsSupply || []) : (row.rewardsBorrow || [])}
            symbol={row.assetSymbol}
            variant="secondary14"
            symbolsVariant="secondary14"
            align="center"
          />
        ),
      },
    ];

    const supplyColumns: ColumnDefinition<MarketRow>[] = [
      {
        key: 'totalLiquidity',
        label: 'Total Liquidity',
        sortable: true,
        render: (row: MarketRow) => (
          row.reserve ? (
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1.5 }}>
              <FormattedNumber compact value={row.reserve.totalLiquidity} variant="secondary14" />
              <UsdChip value={row.reserve.totalLiquidityUSD} textVariant="secondary12" />
            </Box>
          ) : null
        ),
      },
    ];

    // Add Balance column only when a wallet is connected
    if (account) {
      supplyColumns.push({
        key: 'balance',
        label: 'Balance',
        sortable: false,
        render: (row: MarketRow) => renderBalanceCell(row),
      });
    }

    const borrowColumns: ColumnDefinition<MarketRow>[] = [
      {
        key: 'totalLiquidity',
        label: 'Total Borrowed',
        sortable: true,
        render: (row: MarketRow) => (
          row.reserve ? (
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1.5 }}>
              <FormattedNumber compact value={row.reserve.totalDebt} variant="secondary14" />
              <UsdChip value={row.reserve.totalDebtUSD} textVariant="secondary12" />
            </Box>
          ) : null
        ),
      },
    ];

    // Add Available for you column only when a wallet is connected
    if (account) {
      borrowColumns.push({
        key: 'availableForYou',
        label: 'Available for you',
        sortable: false,
        render: (row: MarketRow) => {
          if (!row.reserve) return null;
          const key = row.id.toLowerCase();
          const maxBorrowRaw = Number(eligibilityByAsset.get(key)?.maxBorrow || '0');
          const availableLiquidity = Number(row.reserve.formattedAvailableLiquidity ?? row.reserve.availableLiquidity ?? 0);
          const maxBorrow = Math.min(maxBorrowRaw, availableLiquidity);
          const usd = (maxBorrow * Number(row.reserve.priceInUSD || 0)).toString();
          return (
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1.5 }}>
              <FormattedNumber compact value={maxBorrow} variant="secondary14" />
              <UsdChip value={usd} textVariant="secondary12" />
            </Box>
          );
        },
      });
    }

    return [...baseColumns, ...(activeTab === 'supply' ? supplyColumns : borrowColumns)];
  }, [activeTab, walletBalances, eligibilityByAsset, account]);

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
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'background.surface',
        gap: { xs: 3, md: 0 },
        p: 3,
        borderRadius: 2,
        mb: { xs: 4, md: 6 }
      }}>
        <Box
          display="flex"
          flexDirection={{ xs: "column", md: "row" }}
          width={{ xs: '100%', md: 'unset' }}
          alignItems="center"
          gap={5}
        >
          <Typography
            sx={{
              typography: { xs: 'main16', md: 'main21' },
              textAlign: { xs: 'center', md: 'left' },
              color: 'primary.main'
            }}
          >
            Markets
          </Typography>
          <Box display="flex" flexDirection="row" alignItems="center" width={{ xs: '100%', md: 'unset' }}>
            <ButtonGroup fullWidth>
              <Button
                onClick={() => setActiveTab('supply')}
                aria-pressed={activeTab === 'supply'}
                variant={activeTab === 'supply' ? 'contained' : 'outlined'}
              >
                Supply
              </Button>
              <Button
                onClick={() => setActiveTab('borrow')}
                aria-pressed={activeTab === 'borrow'}
                variant={activeTab === 'borrow' ? 'contained' : 'outlined'}
              >
                Borrow
              </Button>
            </ButtonGroup>
          </Box>
        </Box>
        <Box
          display="flex"
          alignItems="center"
          gap={4}
          flexDirection={{ xs: 'column', md: 'row' }}
          width={{ xs: '100%', md: 'unset' }}
        >
          <Box sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            justifyContent: { xs: 'space-between', md: 'flex-start' },
            gap: { xs: 2, md: 10 }
          }}>
            <Box display='flex' flexDirection='column' alignItems='flex-start'>
              <Typography variant="secondary14" color="text.secondary">
                Total market size
              </Typography>
              <FormattedNumber
                value={aggregatedStats.totalLiquidity.toString()}
                symbol="USD"
                variant="main16"
                visibleDecimals={2}
                compact
                symbolsVariant="secondary16"
                sx={{ fontWeight: 800 }}
              />
            </Box>
            <Box display="flex" flexDirection='column' alignItems='flex-start'>
              <Typography variant="secondary14" color="text.secondary">
                Total available
              </Typography>
              <FormattedNumber
                value={aggregatedStats.totalAvailable.toString()}
                symbol="USD"
                variant="main16"
                visibleDecimals={2}
                compact
                symbolsVariant="secondary16"
                sx={{ fontWeight: 800 }}
              />
            </Box>
            <Box display="flex" flexDirection='column' alignItems='flex-start'>
              <Typography variant="secondary14" color="text.secondary">
                Total borrows
              </Typography>
              <FormattedNumber
                value={aggregatedStats.totalDebt.toString()}
                symbol="USD"
                variant="main16"
                visibleDecimals={2}
                compact
                symbolsVariant="secondary16"
                sx={{ fontWeight: 800 }}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      <BaseDataGrid<MarketRow>
        data={nonFrozenRows}
        columns={columns}
        loading={loading}
        minWidth={900}
        defaultSortColumn={'effectiveApy'}
        defaultSortOrder={'desc'}
        actionColumn={{
          render: (row) => (
            <Button
              size="medium"
              variant="gradient"
              disabled={
                !row.reserve ||
                  !account ||
                  (row.reserve && (activeTab === 'supply'
                    ? eligibilityByAsset.get(row.id)?.disableSupply
                    : eligibilityByAsset.get(row.id)?.disableBorrow))
                  ? true
                  : false
              }
              sx={{ width: { xs: '100%', md: 'auto' } }}
              onClick={(e) => {
                e.stopPropagation();
                if (!row.reserve) return;
                if (!account) {
                  setWalletModalOpen(true);
                  return;
                }
                if (activeTab === 'supply') {
                  openSupply(row.id, currentMarket, row.assetName, 'market-list');
                } else {
                  openBorrow(row.id, currentMarket, row.assetName, 'market-list');
                }
                trackEvent(GENERAL.OPEN_MODAL, { modal: activeTab === 'supply' ? 'Supply' : 'Borrow', assetName: row.assetName });
              }}
            >
              {activeTab === 'supply' ? 'Supply' : 'Borrow'}
            </Button>
          ),
        }}
        rowIdGetter={(row) => row.id}
        onRowClick={(row) => {
          if (!row.reserve) return;
          // Always navigate to the wrapped reserve page for details
          window.location.href = `/markets/${row.reserve.underlyingAsset}`;
        }}
      />

      {(userHasFrozenOrPaused && frozenRows.length > 0) && (
        <Box sx={{ mt: 4 }}>
          <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'background.surface',
            gap: { xs: 3, md: 0 },
            p: 3,
            borderRadius: 2,
            mb: { xs: 4, md: 6 }
          }}>
            <Typography
              sx={{
                typography: { xs: 'main16', md: 'main21' },
                textAlign: { xs: 'center', md: 'left' },
                color: 'primary.main'
              }}
            >
              Paused assets
            </Typography>

          </Box>
          <BaseDataGrid<MarketRow>
            data={frozenRows}
            columns={columns}
            loading={loading}
            minWidth={900}
            defaultSortColumn={'effectiveApy'}
            defaultSortOrder={'asc'}
            actionColumn={{
              render: (row) => (
                <Button
                  size="medium"
                  variant="gradient"
                  disabled={
                    !row.reserve ||
                      !account ||
                      (row.reserve && (activeTab === 'supply'
                        ? eligibilityByAsset.get(row.id)?.disableSupply
                        : eligibilityByAsset.get(row.id)?.disableBorrow))
                      ? true
                      : false
                  }
                  sx={{ width: { xs: '100%', md: 'auto' } }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!row.reserve) return;
                    if (!account) {
                      setWalletModalOpen(true);
                      return;
                    }
                    if (activeTab === 'supply') {
                      openSupply(row.id, currentMarket, row.assetName, 'market-list');
                    } else {
                      openBorrow(row.id, currentMarket, row.assetName, 'market-list');
                    }
                  }}
                >
                  {activeTab === 'supply' ? 'Supply' : 'Borrow'}
                </Button>
              ),
            }}
            rowIdGetter={(row) => row.id}
            onRowClick={(row) => {
              if (!row.reserve) return;
              window.location.href = `/markets/${row.reserve.underlyingAsset}`;
            }}
          />
        </Box>
      )}
    </Box>
  );
}


