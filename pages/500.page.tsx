import { DuplicateIcon, RefreshIcon } from '@heroicons/react/outline';
import { Box, Button, SvgIcon, Typography } from '@mui/material';
import { useEffect } from 'react';
import { ErrorPageState } from 'src/components/ErrorPageState';
import { Link } from 'src/components/primitives/Link';
import { MainLayout } from 'src/layouts/MainLayout';
import { useRootStore } from 'src/store/root';

export default function More500Page() {
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
    <ErrorPageState
      code="500"
      title="Something went wrong"
      description="Sorry, an unexpected error happened. In the meantime you may try reloading the page, or come back later."
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          mt: 4,
        }}
      >
        <Button
          variant="outlined"
          color="primary"
          startIcon={
            <SvgIcon>
              <RefreshIcon />
            </SvgIcon>
          }
          onClick={() => window.location.reload()}
        >
          Reload the page
        </Button>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 6 }}>
          <Typography variant="secondary14" sx={{ color: 'text.secondary', mb: 2 }}>
            If the error continues to happen, you may report it to this{' '}
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
      </Box>
    </ErrorPageState>
  );
}

More500Page.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
