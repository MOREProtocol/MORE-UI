import { Container } from '@mui/material';
import { ReactNode, useEffect } from 'react';
import { MainLayout } from 'src/layouts/MainLayout';
import { VaultAssetsListContainer } from 'src/modules/vaults/VaultAssetsListContainer';
import { useRootStore } from 'src/store/root';

interface VaultContainerProps {
  children: ReactNode;
}

export const vaultContainerProps = {
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

export const VaultContainer = ({ children }: VaultContainerProps) => {
  return <Container {...vaultContainerProps}>{children}</Container>;
};

export default function Vaults() {
  const trackEvent = useRootStore((store) => store.trackEvent);

  useEffect(() => {
    trackEvent('Page Viewed', {
      'Page Name': 'Vaults',
    });
  }, [trackEvent]);
  return (
    <VaultAssetsListContainer />
  );
}

Vaults.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
