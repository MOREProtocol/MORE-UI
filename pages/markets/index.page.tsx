import { useEffect } from 'react';
import { Alert, Box } from '@mui/material';
import { MainLayout } from 'src/layouts/MainLayout';
import { useRootStore } from 'src/store/root';
import { Link } from 'src/components/primitives/Link';
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
        MORE incentives have moved to a new system. Claims will now be available on a weekly basis, but you&apos;ll still see them accrue in real-time.
        <Link href="https://docs.more.markets/resources/incentives" sx={{ pl: 0.5 }} target="_blank">
          Read more
        </Link>
        .
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