import { DuplicateIcon, RefreshIcon } from '@heroicons/react/outline';
import { Box, Button, Link, Paper, SvgIcon, Typography, useTheme } from '@mui/material';
import { useEffect } from 'react';
import { ContentContainer } from 'src/components/ContentContainer';
import { TopInfoPanel } from 'src/components/TopInfoPanel/TopInfoPanel';
import { MainLayout } from 'src/layouts/MainLayout';
import { useRootStore } from 'src/store/root';

export default function More500Page() {
  const theme = useTheme();

  const handleCopyError = () => {
    console.log('copying error to clipboard');
  };
  const trackEvent = useRootStore((store) => store.trackEvent);

  useEffect(() => {
    trackEvent('Page Viewed', {
      'Page Name': '500 Error',
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
          <Typography variant="display1" sx={{ mt: 8, mb: 3 }}>
            Something went wrong
          </Typography>
          <Typography sx={{ mt: 2, mb: 5, maxWidth: 480 }}>
            Sorry, an unexpected error happened. In the meantime you may try reloading the page, or
            come back later.
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            startIcon={
              <SvgIcon>
                <RefreshIcon />
              </SvgIcon>
            }
            onClick={() => window.location.reload()}
            sx={{ mb: 10 }}
          >
            Reload the page
          </Button>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexDirection="column"
            mt={10}
          >
            <Typography sx={{ mb: 4 }}>
              If the error continues to happen,
              <br /> you may report it to this{' '}
              <Link href="https://discord.com/invite/VzGm75kN" color="inherit" target="_blank">
                Discord channel
              </Link>
              .
            </Typography>
            <Button
              color="primary"
              startIcon={
                <SvgIcon>
                  <DuplicateIcon />
                </SvgIcon>
              }
              onClick={handleCopyError}
            >
              Copy error message
            </Button>
          </Box>
        </Paper>
      </ContentContainer>
    </>
  );
}

More500Page.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
