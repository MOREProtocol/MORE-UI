import React, { useEffect } from 'react';
import { Container, Box } from '@mui/material';
import { MainLayout } from 'src/layouts/MainLayout';
import { BridgeContent } from 'src/components/Bridge';
import { useRootStore } from 'src/store/root';

export const bridgeContainerProps = {
  sx: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    pb: '39px',
    px: {
      xs: 2,
      xsm: 5,
      sm: 12,
      md: 5,
      lg: 0,
      xl: '96px',
      xxl: 0,
    },
    maxWidth: {
      xs: 'unset',
      lg: '600px',
      xl: 'unset',
      xxl: '600px',
    },
  },
};

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
        mt: { xs: '32px', lg: '46px', xl: '44px', xxl: '48px' },
      }}
    >
      <Container {...bridgeContainerProps}>
        <BridgeContent />
      </Container>
    </Box>
  );
}

Bridge.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
