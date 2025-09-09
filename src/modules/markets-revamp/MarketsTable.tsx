import { Box, Button, ButtonGroup, Typography, useMediaQuery, useTheme } from '@mui/material';
import { valueToBigNumber } from '@aave/math-utils';
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

export function MarketsTable() {
  const { reserves, user, loading } = useAppDataContext();
  const { rewardsByAddress } = useRewardsMaps();
  const [activeTab, setActiveTab] = useState<TabKey>('supply');
  const { openSupply, openBorrow } = useModalContext();
  const { currentMarket, trackEvent } = useRootStore();
  const account = useRootStore((s) => s.account);
  const { setWalletModalOpen } = useWalletModalContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const supplyRows: MarketRow[] = useMemo(() => {
    return (reserves || []).map((r) => {
      const key = r.underlyingAsset.toLowerCase();
      const rewards = rewardsByAddress.get(key);
      const baseApy = typeof r.supplyAPY === 'number' ? r.supplyAPY : parseFloat(String(r.supplyAPY || 0));
      const effectiveApy = baseApy + sumIncentivesApr(r.aIncentivesData) + sumRewardsApr(rewards?.supply, 'supply');
      return {
        id: r.underlyingAsset,
        assetSymbol: r.symbol,
        assetName: r.name,
        apy: baseApy,
        totalLiquidity: Number(r.totalLiquidityUSD || 0),
        availableLiquidity: Number(r.availableLiquidityUSD || 0),
        effectiveApy,
        reserve: r,
        rewardsSupply: rewards?.supply,
        rewardsBorrow: rewards?.borrow,
      } as MarketRow;
    });
  }, [reserves, rewardsByAddress]);

  const borrowRows: MarketRow[] = useMemo(() => {
    return (reserves || []).map((r) => {
      const key = r.underlyingAsset.toLowerCase();
      const rewards = rewardsByAddress.get(key);
      const baseApy = typeof r.variableBorrowAPY === 'number' ? r.variableBorrowAPY : parseFloat(String(r.variableBorrowAPY || 0));
      const effectiveApy = baseApy + sumIncentivesApr(r.vIncentivesData) + sumRewardsApr(rewards?.borrow, 'borrow');
      return {
        id: r.underlyingAsset,
        assetSymbol: r.symbol,
        assetName: r.name,
        apy: baseApy,
        variableApy: baseApy,
        totalLiquidity: Number(r.totalLiquidityUSD || 0),
        availableLiquidity: Number(r.availableLiquidityUSD || 0),
        effectiveApy,
        reserve: r,
        rewardsSupply: rewards?.supply,
        rewardsBorrow: rewards?.borrow,
      } as MarketRow;
    });
  }, [reserves, rewardsByAddress]);

  const columns: ColumnDefinition<MarketRow>[] = useMemo(() => [
    {
      key: 'assetName',
      label: 'Asset',
      sortable: true,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {row.reserve && <TokenIcon symbol={row.reserve.iconSymbol} fontSize="large" />}
          <Box>
            <Typography variant="subheader1">{row.assetName}</Typography>
            <Typography variant="caption" color="text.secondary">{row.assetSymbol}</Typography>
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
          align="flex-start"
        />
      ),
    },
    {
      key: 'totalLiquidity',
      label: 'Total Liquidity',
      sortable: true,
      render: (row) => (
        row.reserve ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start' }}>
            <FormattedNumber compact value={row.reserve.totalLiquidity} variant="secondary14" />
            <UsdChip value={row.reserve.totalLiquidityUSD} textVariant="secondary12" />
          </Box>
        ) : null
      ),
    },
    {
      key: 'availableLiquidity',
      label: 'Available',
      sortable: true,
      render: (row) => (
        row.reserve ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start' }}>
            <FormattedNumber
              compact
              value={Number(row.reserve.formattedAvailableLiquidity ?? row.reserve.availableLiquidity ?? 0)}
              variant="secondary14"
            />
            <UsdChip
              value={row.reserve.availableLiquidityUSD?.toString() || '0'}
              textVariant="secondary12"
            />
          </Box>
        ) : null
      ),
    },
  ], [activeTab]);

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
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'background.surface',
        gap: isMobile ? 3 : 0,
        p: 3,
        borderRadius: 2,
        mb: { xs: 4, md: 6 }
      }}>
        <Typography
          variant={isMobile ? "main16" : "main21"}
          sx={{
            textAlign: isMobile ? 'center' : 'left',
            color: 'primary.main'
          }}
        >
          Markets
        </Typography>
        <Box
          display="flex"
          alignItems="center"
          gap={4}
          flexDirection={isMobile ? "column" : "row"}
          width={isMobile ? "100%" : "unset"}
        >
          <Box sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            justifyContent: isMobile ? 'space-between' : 'flex-start',
            gap: { xs: 2, md: 5 }
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
          <Box display="flex" flexDirection="row" alignItems="center" width={isMobile ? "100%" : "unset"}>
            <ButtonGroup fullWidth={isMobile}>
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
      </Box>

      <BaseDataGrid<MarketRow>
        data={nonFrozenRows}
        columns={columns}
        loading={loading}
        minWidth={900}
        defaultSortColumn={activeTab === 'supply' ? 'effectiveApy' : 'availableLiquidity'}
        defaultSortOrder={'desc'}
        actionColumn={{
          render: (row) => (
            <Button
              size="medium"
              variant="gradient"
              disabled={!row.reserve || !account}
              onClick={(e) => {
                e.stopPropagation();
                if (!row.reserve) return;
                if (!account) {
                  setWalletModalOpen(true);
                  return;
                }
                if (activeTab === 'supply') {
                  openSupply(row.reserve.underlyingAsset, currentMarket, row.assetName, 'market-list');
                } else {
                  openBorrow(row.reserve.underlyingAsset, currentMarket, row.assetName, 'market-list');
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
          window.location.href = `/markets/${row.reserve.underlyingAsset}`;
        }}
      />

      {(userHasFrozenOrPaused && frozenRows.length > 0) && (
        <Box sx={{ mt: 4 }}>
          <Box sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'background.surface',
            gap: isMobile ? 3 : 0,
            p: 3,
            borderRadius: 2,
            mb: { xs: 4, md: 6 }
          }}>
            <Typography
              variant={isMobile ? "main16" : "main21"}
              sx={{
                textAlign: isMobile ? 'center' : 'left',
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
                  disabled={!row.reserve || !account}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!row.reserve) return;
                    if (!account) {
                      setWalletModalOpen(true);
                      return;
                    }
                    if (activeTab === 'supply') {
                      openSupply(row.reserve.underlyingAsset, currentMarket, row.assetName, 'market-list');
                    } else {
                      openBorrow(row.reserve.underlyingAsset, currentMarket, row.assetName, 'market-list');
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


