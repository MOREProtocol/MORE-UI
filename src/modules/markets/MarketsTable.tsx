import { Box, Button, ButtonGroup, Typography, Tooltip, Alert } from '@mui/material';
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

  // Compute wallet balance in USD for a given row id and reserve
  const getWalletBalanceUsdFor = (rowId: string, reserve?: any): number => {
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

  const renderSupplyAction = (row: MarketRow) => (
    <Button
      size="medium"
      variant="gradient"
      disabled={!row.reserve || !account || !!eligibilityByAsset.get(row.id)?.disableSupply}
      sx={{ width: { xs: '100%', md: 'auto' } }}
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
  );

  const renderBorrowAction = (row: MarketRow) => {
    const eModeDisabled = !!eligibilityByAsset.get(row.id)?.eModeBorrowDisabled;
    const isDisabled = !row.reserve || !account || !!eligibilityByAsset.get(row.id)?.disableBorrow;
    const title = eModeDisabled
      ? 'In E-Mode some assets are not borrowable. Exit MOST Mode to get access to all assets'
      : '';
    return (
      <Tooltip title={title} disableHoverListener={!eModeDisabled} placement="top">
        <span>
          <Button
            size="medium"
            variant="gradient"
            disabled={isDisabled}
            sx={{ width: { xs: '100%', md: 'auto' } }}
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
          balance: getWalletBalanceUsdFor(API_ETH_MOCK_ADDRESS.toLowerCase(), r),
        } as MarketRow);
      }
    });
    return rows;
  };

  const eligibilityByAsset = useMemo(() => {
    const map = new Map<string, { disableSupply: boolean; disableBorrow: boolean; maxBorrow?: string; eModeBorrowDisabled?: boolean }>();
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

      map.set(r.underlyingAsset, { disableSupply, disableBorrow, maxBorrow: maxAmountToBorrow, eModeBorrowDisabled });

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
        const baseEmodeBorrowDisabled = eModeBorrowDisabled;
        map.set(baseKey, { disableSupply: baseDisableSupply, disableBorrow: baseDisableBorrow, maxBorrow: baseMaxBorrow, eModeBorrowDisabled: baseEmodeBorrowDisabled });
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
            <Box sx={{ my: 1 }}>
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
        sortable: true,
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

    // Add Available column (independent of user collateral or wallet connection)
    borrowColumns.push({
      key: 'availableLiquidity',
      label: 'Available',
      sortable: true,
      render: (row: MarketRow) => {
        if (!row.reserve) return null;
        const availableLiquidity = Number(row.reserve.formattedAvailableLiquidity ?? row.reserve.availableLiquidity ?? 0);
        const usd = (availableLiquidity * Number(row.reserve.priceInUSD || 0)).toString();
        return (
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1.5 }}>
            <FormattedNumber compact value={availableLiquidity} variant="secondary14" />
            <UsdChip value={usd} textVariant="secondary12" />
          </Box>
        );
      },
    });

    return [...baseColumns, ...(activeTab === 'supply' ? supplyColumns : borrowColumns)];
  }, [activeTab, walletBalances, account]);

  // Large-screen specific columns (fixed per table)
  const supplyColumnsLg: ColumnDefinition<MarketRow>[] = useMemo(() => {
    const assetColumn: ColumnDefinition<MarketRow> = {
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
          <Box sx={{ my: 1 }}>
            <Typography variant="subheader1" sx={{ textAlign: { xs: 'right', md: 'left' } }}>{row.assetName}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: { xs: 'right', md: 'left' } }}>{row.assetSymbol}</Typography>
          </Box>
        </Box>
      ),
    };
    const apyColumn: ColumnDefinition<MarketRow> = {
      key: 'effectiveApy',
      label: 'Supply APY',
      sortable: true,
      render: (row) => (
        <IncentivesCard
          value={row.apy}
          incentives={row.reserve?.aIncentivesData || []}
          rewards={row.rewardsSupply || []}
          symbol={row.assetSymbol}
          variant="secondary14"
          symbolsVariant="secondary14"
          align="center"
        />
      ),
    };
    const totalsColumn: ColumnDefinition<MarketRow> = {
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
    };
    const cols: ColumnDefinition<MarketRow>[] = [assetColumn, apyColumn, totalsColumn];
    if (account) {
      cols.push({
        key: 'balance',
        label: 'Balance',
        sortable: true,
        render: (row: MarketRow) => renderBalanceCell(row),
      });
    }
    return cols;
  }, [account, walletBalances]);

  const borrowColumnsLg: ColumnDefinition<MarketRow>[] = [
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
          <Box sx={{ my: 1 }}>
            <Typography variant="subheader1" sx={{ textAlign: { xs: 'right', md: 'left' } }}>{row.assetName}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: { xs: 'right', md: 'left' } }}>{row.assetSymbol}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: 'effectiveApy',
      label: 'Borrow Rate',
      sortable: true,
      render: (row) => (
        <IncentivesCard
          value={row.variableApy ?? row.apy}
          incentives={row.reserve?.vIncentivesData || []}
          rewards={row.rewardsBorrow || []}
          symbol={row.assetSymbol}
          variant="secondary14"
          symbolsVariant="secondary14"
          align="center"
        />
      ),
    },
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
    {
      key: 'availableLiquidity',
      label: 'Available',
      sortable: true,
      render: (row: MarketRow) => {
        if (!row.reserve) return null;
        const availableLiquidity = Number(row.reserve.formattedAvailableLiquidity ?? row.reserve.availableLiquidity ?? 0);
        const usd = (availableLiquidity * Number(row.reserve.priceInUSD || 0)).toString();
        return (
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1.5 }}>
            <FormattedNumber compact value={availableLiquidity} variant="secondary14" />
            <UsdChip value={usd} textVariant="secondary12" />
          </Box>
        );
      },
    },
  ];

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
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: { xs: 'background.surface', lg: 'background.surface3' },
        gap: 3,
        p: 3,
        borderRadius: 2,
        mb: { xs: 4, md: 6 }
      }}>
        <Box
          display="flex"
          flexDirection={{ xs: "column", md: "row" }}
          alignItems="center"
          justifyContent="space-between"
          gap={5}
        >
          <Box display="flex" width={{ xs: '100%', md: 'unset' }} flexDirection={{ xs: "column", md: "row" }} alignItems="center" gap={{ xs: 2, md: 5 }}>
            <Typography
              sx={{
                typography: { xs: 'main16', md: 'main21' },
                textAlign: { xs: 'center', md: 'left' },
                color: 'primary.main'
              }}
            >
              Markets
            </Typography>
            <Box sx={{ display: { xs: 'flex', lg: 'none' }, width: { xs: '100%', md: 'unset' } }}>
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
              <Box display='flex' flexDirection='column' alignItems='flex-start' sx={{ display: { xs: 'flex', lg: 'none' } }}>
                <Typography variant="secondary14" color="text.secondary">
                  Total Market Size
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
                  Total Available
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
              <Box display="flex" flexDirection='column' alignItems='flex-start' sx={{ display: { xs: 'flex', lg: 'none' } }}>
                <Typography variant="secondary14" color="text.secondary">
                  Total Borrowed
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

        {/* Large: dual-pane supply/borrow tables within Markets container */}
        <Box sx={{ display: { xs: 'none', lg: 'block' }, mt: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 5 }}>
            {/* Supply column */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'background.surface',
                p: 3,
                borderRadius: 2,
                mb: { xs: 4, md: 6 }
              }}>
                <Typography sx={{ typography: { xs: 'main16', md: 'main21' }, textAlign: { xs: 'center', md: 'left' }, color: 'primary.main' }}>
                  Supply
                </Typography>
                <Box display="flex" flexDirection='column' alignItems='flex-start' sx={{ display: { xs: 'none', lg: 'flex' } }}>
                  <Typography variant="secondary14" color="text.secondary">
                    Total Market Size
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
              </Box>
              <BaseDataGrid<MarketRow>
                data={supplyNonFrozenRows}
                columns={supplyColumnsLg}
                loading={loading}
                minWidth={500}
                defaultSortColumn={'effectiveApy'}
                defaultSortOrder={'desc'}
                actionColumn={{
                  render: (row) => renderSupplyAction(row),
                }}
                rowIdGetter={(row) => row.id}
                onRowClick={(row) => {
                  if (!row.reserve) return;
                  window.location.href = `/markets/${row.reserve.underlyingAsset}`;
                }}
              />
            </Box>

            {/* Borrow column */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'background.surface',
                p: 3,
                borderRadius: 2,
                mb: { xs: 4, md: 6 }
              }}>
                <Typography sx={{ typography: { xs: 'main16', md: 'main21' }, textAlign: { xs: 'center', md: 'left' }, color: 'primary.main' }}>
                  Borrow
                </Typography>
                <Box display="flex" flexDirection='column' alignItems='flex-start' sx={{ display: { xs: 'none', lg: 'flex' } }}>
                  <Typography variant="secondary14" color="text.secondary">
                    Total Borrowed
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
              <BaseDataGrid<MarketRow>
                data={borrowNonFrozenRows}
                columns={borrowColumnsLg}
                loading={loading}
                minWidth={500}
                defaultSortColumn={'availableLiquidity'}
                defaultSortOrder={'desc'}
                headerMessage={user?.isInEmode ? (
                  <Alert severity="info" sx={{ borderRadius: 0 }}>
                    In MOST Mode some assets are not borrowable. Exit MOST Mode to get access to all assets
                  </Alert>
                ) : undefined}
                actionColumn={{
                  render: (row) => renderBorrowAction(row),
                }}
                rowIdGetter={(row) => row.id}
                onRowClick={(row) => {
                  if (!row.reserve) return;
                  window.location.href = `/markets/${row.reserve.underlyingAsset}`;
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Small/Medium: single table with toggle */}
      <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
        <BaseDataGrid<MarketRow>
          data={nonFrozenRows}
          columns={columns}
          loading={loading}
          minWidth={900}
          defaultSortColumn={activeTab === 'borrow' ? 'availableLiquidity' : 'effectiveApy'}
          defaultSortOrder={'desc'}
          headerMessage={user?.isInEmode && activeTab === 'borrow' ? (
            <Alert severity="info" sx={{ borderRadius: 0 }}>
              In MOST Mode some assets are not borrowable. Exit MOST Mode to get access to all assets
            </Alert>
          ) : undefined}
          actionColumn={{
            render: (row) => (activeTab === 'supply' ? renderSupplyAction(row) : renderBorrowAction(row)),
          }}
          rowIdGetter={(row) => row.id}
          onRowClick={(row) => {
            if (!row.reserve) return;
            // Always navigate to the wrapped reserve page for details
            window.location.href = `/markets/${row.reserve.underlyingAsset}`;
          }}
        />
      </Box>

      {/* Large content is now inside the Markets container above */}

      <Box sx={{ display: { xs: (userHasFrozenOrPaused && frozenRows.length > 0) ? 'block' : 'none', lg: 'none' } }}>
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
              defaultSortColumn={activeTab === 'borrow' ? 'availableLiquidity' : 'effectiveApy'}
              defaultSortOrder={'desc'}
              actionColumn={{
                render: (row) => (activeTab === 'supply' ? renderSupplyAction(row) : renderBorrowAction(row)),
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
    </Box>
  );
}


