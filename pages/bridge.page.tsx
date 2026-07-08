import { Box } from '@mui/material';
import React, { useEffect } from 'react';
import { BridgeContent } from 'src/components/Bridge';
import { MainLayout } from 'src/layouts/MainLayout';
import { useRootStore } from 'src/store/root';

export default function Bridge() {
  const trackEvent = useRootStore((store) => store.trackEvent);

  useEffect(() => {
    trackEvent('Page Viewed', {
      'Page Name': 'Bridge',
    });
  }, [trackEvent]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
        px: '16px',
        py: { xs: '24px', md: '40px' },
      }}
    >
      <BridgeContent />
    </Box>
  );
}

Bridge.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
