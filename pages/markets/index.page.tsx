import { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
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
    <Box
      sx={{
        mt: { xs: 1, md: 2 },
        px: { xs: 2, sm: 4, md: 6 },
        pb: { xs: 4, md: 8 },
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 3, md: 4 },
      }}
    >
      {/* Alert strip */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.25,
          borderRadius: '10px',
          background: 'linear-gradient(90deg, rgba(245,132,32,.14), rgba(245,132,32,.04))',
          border: '1px solid rgba(245,132,32,.25)',
          fontSize: 13,
        }}
      >
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: '#FFA94A',
            boxShadow: '0 0 0 4px rgba(245,132,32,.18)',
            flex: 'none',
          }}
        />
        <Typography sx={{ fontSize: 13, color: 'text.primary', flex: 1 }}>
          The <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>USDF</Box> market will soon be frozen. Migrate to{' '}
          <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>PYUSD0</Box> for long-term support.
        </Typography>
      </Box>

      <MyPositions />
      <MarketsTable />
    </Box>
  );
}

Markets.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};