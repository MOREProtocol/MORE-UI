import { Box } from '@mui/material';
import * as React from 'react';
import { useEffect } from 'react';
import { PageMasthead } from 'src/components/PageMasthead';
import { MainLayout } from 'src/layouts/MainLayout';
import { HistoryWrapper } from 'src/modules/history/HistoryWrapper';
import { useRootStore } from 'src/store/root';

export default function History() {
  const trackEvent = useRootStore((store) => store.trackEvent);

  useEffect(() => {
    trackEvent('Page Viewed', {
      'Page Name': 'History',
    });
  }, [trackEvent]);

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
      <PageMasthead
        title="Transaction history"
        subtitle="A record of your supplies, withdrawals, borrows, and repayments on this market."
      />
      <HistoryWrapper />
    </Box>
  );
}

History.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
