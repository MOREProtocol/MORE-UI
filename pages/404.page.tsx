import { Box, Button, Typography } from '@mui/material';
import Link from 'next/link';
import { useEffect } from 'react';
import { MainLayout } from 'src/layouts/MainLayout';
import { useRootStore } from 'src/store/root';

export default function More404Page() {
  const trackEvent = useRootStore((store) => store.trackEvent);

  useEffect(() => {
    trackEvent('Page Viewed', {
      'Page Name': '404 Error',
    });
  }, [trackEvent]);
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: { xs: 2, sm: 4, md: 6 },
        py: { xs: 8, md: 12 },
        gap: 2,
        minHeight: '60vh',
      }}
    >
      <Typography variant="display1" sx={{ mt: 2 }}>
        Page not found
      </Typography>
      <Typography sx={{ mt: 3, mb: 5, maxWidth: 480 }}>
        Sorry, we couldn&apos;t find the page you were looking for.
        <br />
        We suggest you go back to the Vaults.
      </Typography>
      <Link href="/" passHref>
        <Button variant="outlined" color="primary">
          Back to Vaults
        </Button>
      </Link>
    </Box>
  );
}

More404Page.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
