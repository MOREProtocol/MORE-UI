import { valueToBigNumber } from '@aave/math-utils';
import { ExclamationIcon } from '@heroicons/react/outline';
import { Box, Skeleton, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useEffect, useMemo } from 'react';
import { MastheadStat, PageMasthead } from 'src/components/PageMasthead';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { MainLayout } from 'src/layouts/MainLayout';
import { MarketsTable } from 'src/modules/markets/MarketsTable';
import { MyPositions } from 'src/modules/markets/MyPositions';
import { useRootStore } from 'src/store/root';

export default function Markets() {
  const trackEvent = useRootStore((store) => store.trackEvent);
  const { reserves, loading } = useAppDataContext();

  useEffect(() => {
    trackEvent('Page Viewed', { 'Page Name': 'Markets' });
  }, [trackEvent]);

  // Markets shown in the list (mirrors the non-frozen filter used in MarketsTable)
  const listedReserves = useMemo(
    () => (reserves || []).filter((r) => !r.isPaused && !r.isFrozen),
    [reserves]
  );

  const aggregatedStats = useMemo(() => {
    const totals = (reserves || []).reduce(
      (acc, reserve) => ({
        totalLiquidity: acc.totalLiquidity.plus(reserve.totalLiquidityUSD || 0),
        totalDebt: acc.totalDebt.plus(reserve.totalDebtUSD || 0),
      }),
      { totalLiquidity: valueToBigNumber(0), totalDebt: valueToBigNumber(0) }
    );
    const totalAvailable = totals.totalLiquidity.minus(totals.totalDebt);
    const utilization = totals.totalLiquidity.gt(0)
      ? totals.totalDebt.div(totals.totalLiquidity).toNumber()
      : 0;
    const liquidShare = totals.totalLiquidity.gt(0)
      ? totalAvailable.div(totals.totalLiquidity).toNumber()
      : 0;
    return {
      totalLiquidity: totals.totalLiquidity,
      totalDebt: totals.totalDebt,
      totalAvailable,
      utilization,
      liquidShare,
    };
  }, [reserves]);

  const marketCount = listedReserves.length;
  const subtitle = `Direct lending and borrowing across ${marketCount || 0} market${
    marketCount === 1 ? '' : 's'
  } on Flow EVM.`;

  const mastheadStats: MastheadStat[] = [
    {
      label: 'Total market size',
      value: loading ? (
        <Skeleton width={120} height={34} />
      ) : (
        <FormattedNumber
          value={aggregatedStats.totalLiquidity.toString()}
          symbol="USD"
          compact
          variant="main25"
          symbolsVariant="secondary16"
          symbolsColor="text.secondary"
          sx={{ letterSpacing: '-0.02em' }}
        />
      ),
    },
    {
      label: 'Total borrowed',
      value: loading ? (
        <Skeleton width={120} height={34} />
      ) : (
        <FormattedNumber
          value={aggregatedStats.totalDebt.toString()}
          symbol="USD"
          compact
          variant="main25"
          symbolsVariant="secondary16"
          symbolsColor="text.secondary"
          sx={{ letterSpacing: '-0.02em' }}
        />
      ),
      sub: loading ? undefined : (
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          <FormattedNumber
            value={aggregatedStats.utilization}
            percent
            visibleDecimals={1}
            variant="secondary12"
            symbolsVariant="secondary12"
            symbolsColor="text.secondary"
            sx={{ color: 'text.secondary' }}
          />
          <Box component="span" sx={{ color: 'text.secondary' }}>
            utilization
          </Box>
        </Box>
      ),
    },
    {
      label: 'Available to borrow',
      value: loading ? (
        <Skeleton width={120} height={34} />
      ) : (
        <FormattedNumber
          value={aggregatedStats.totalAvailable.toString()}
          symbol="USD"
          compact
          variant="main25"
          symbolsVariant="secondary16"
          symbolsColor="text.secondary"
          sx={{ letterSpacing: '-0.02em' }}
        />
      ),
      sub: loading ? undefined : (
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          <FormattedNumber
            value={aggregatedStats.liquidShare}
            percent
            visibleDecimals={1}
            variant="secondary12"
            symbolsVariant="secondary12"
            symbolsColor="text.secondary"
            sx={{ color: 'text.secondary' }}
          />
          <Box component="span" sx={{ color: 'text.secondary' }}>
            of supply liquid
          </Box>
        </Box>
      ),
    },
  ];

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 1600,
        mx: 'auto',
        px: { xs: '16px', sm: '32px' },
        pt: { xs: 3, md: 3 },
        pb: { xs: 6, md: 12 },
      }}
    >
      <PageMasthead title="Markets" subtitle={subtitle} stats={mastheadStats} />

      {/* USDF migration notice */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          p: '14px 16px',
          mb: '20px',
          borderRadius: '14px',
          bgcolor: (theme) => alpha(theme.palette.warning.main, 0.12),
          border: '1px solid',
          borderColor: (theme) => alpha(theme.palette.warning.main, 0.24),
        }}
      >
        <Box
          component={ExclamationIcon}
          sx={{ width: 20, height: 20, flexShrink: 0, mt: '1px', color: 'warning.main' }}
        />
        <Typography variant="secondary14" sx={{ color: 'warning.main', fontWeight: 500 }}>
          The USDF market will soon be frozen. Migrate to PYUSD0 for long-term support.
        </Typography>
      </Box>

      <MyPositions />
      <MarketsTable />
    </Box>
  );
}

Markets.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
