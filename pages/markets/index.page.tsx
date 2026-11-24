import { useEffect } from 'react';
import { Box } from '@mui/material';
import { MainLayout } from 'src/layouts/MainLayout';
import { useRootStore } from 'src/store/root';
import { FrozenMarketBanner } from 'src/modules/markets/FrozenMarketBanner';
import { MyPositions } from 'src/modules/markets/MyPositions';
import { MarketsTable } from 'src/modules/markets/MarketsTable';

export default function Markets() {
  const trackEvent = useRootStore((store) => store.trackEvent);
  useEffect(() => {
    trackEvent('Page Viewed', { 'Page Name': 'Markets' });
  }, [trackEvent]);

  return (
    <>
      <FrozenMarketBanner />

      <Box sx={{
        mt: { xs: 1, md: 2 },
        px: { xs: 2, sm: 4, md: 6 },
        pb: { xs: 4, md: 8 },
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }}>
        <MyPositions />
        <MarketsTable />
      </Box>
    </>
  );
}

Markets.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};