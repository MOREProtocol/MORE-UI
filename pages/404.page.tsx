import { Button, Paper, Typography, useTheme } from '@mui/material';
import Link from 'next/link';
import { useEffect } from 'react';
import { ContentContainer } from 'src/components/ContentContainer';
import { TopInfoPanel } from 'src/components/TopInfoPanel/TopInfoPanel';
import { MainLayout } from 'src/layouts/MainLayout';
import { useRootStore } from 'src/store/root';

export default function More404Page() {
  const theme = useTheme();
  const trackEvent = useRootStore((store) => store.trackEvent);

  useEffect(() => {
    trackEvent('Page Viewed', {
      'Page Name': '404 Error',
    });
  }, [trackEvent]);
  return (
    <>
      <TopInfoPanel />
      <ContentContainer>
        <Paper
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            p: 4,
            flex: 1,
            backgroundColor: theme.palette.mode === 'dark' ? 'transparent' : '',
          }}
        >
          <Typography variant="display1" sx={{ mt: 2 }}>
            Page not found
          </Typography>
          <Typography sx={{ mt: 3, mb: 5, maxWidth: 480 }}>
            Sorry, we couldn&apos;t find the page you were looking for.
            <br />
            We suggest you go back to the Dashboard.
          </Typography>
          <Link href="/" passHref>
            <Button variant="outlined" color="primary">
              Back to Dashboard
            </Button>
          </Link>
        </Paper>
      </ContentContainer>
    </>
  );
}

More404Page.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
