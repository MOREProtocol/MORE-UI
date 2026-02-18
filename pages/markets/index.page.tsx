import { useEffect } from 'react';
import { Alert, Box } from '@mui/material';
import { MainLayout } from 'src/layouts/MainLayout';
import { useRootStore } from 'src/store/root';
import { MyPositions } from 'src/modules/markets/MyPositions';
import { MarketsTable } from 'src/modules/markets/MarketsTable';

export default function Markets() {
  const trackEvent = useRootStore((store) => store.trackEvent);
  useEffect(() => {
    trackEvent('Page Viewed', { 'Page Name': 'Markets' });
  }, [trackEvent]);

  return (
    <>
      <Alert severity="warning" sx={{ borderRadius: '18px', m: 2 }}>
        The USDF market will soon be frozen. Migrate to PYUSD0 for long-term support.
      </Alert>

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