import { Box, Container, Alert } from '@mui/material';
import { ReactNode, useEffect } from 'react';
import { MainLayout } from 'src/layouts/MainLayout';
import { MarketAssetsListContainer } from 'src/modules/markets/MarketAssetsListContainer';
import { MarketsTopPanel } from 'src/modules/markets/MarketsTopPanel';
import { Link } from 'src/components/primitives/Link';
import { useRootStore } from 'src/store/root';

interface MarketContainerProps {
  children: ReactNode;
}

export const marketContainerProps = {
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
      lg: '1240px',
      xl: 'unset',
      xxl: '1440px',
    },
  },
};

export const MarketContainer = ({ children }: MarketContainerProps) => {
  return <Container {...marketContainerProps}>{children}</Container>;
};

export default function LegacyMarkets() {
  const trackEvent = useRootStore((store) => store.trackEvent);

  useEffect(() => {
    trackEvent('Page Viewed', {
      'Page Name': 'Legacy Markets',
    });
  }, [trackEvent]);
  return (
    <>
      <Alert severity="warning">
        MORE incentives have moved to a new system. Claims will now be available on a weekly basis, but you&apos;ll still see them accrue in real-time.
        <Link href="https://docs.more.markets/resources/incentives" sx={{ pl: 0.5 }} target="_blank">
          Read more
        </Link>
        .
      </Alert>

      <MarketsTopPanel />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flex: 1,
          mt: { xs: '-32px', lg: '-46px', xl: '-44px', xxl: '-48px' },
        }}
      >
        <MarketContainer>
          <MarketAssetsListContainer />
        </MarketContainer>
      </Box>
    </>
  );
}

LegacyMarkets.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};


