import { Alert } from '@mui/material';
import { useEffect } from 'react';
import { MainLayout } from 'src/layouts/MainLayout';
import { VaultAssetsListContainer } from 'src/modules/vaults/VaultAssetsListContainer';
import { useRootStore } from 'src/store/root';

export default function Vaults() {
  const trackEvent = useRootStore((store) => store.trackEvent);

  useEffect(() => {
    trackEvent('Page Viewed', {
      'Page Name': 'Vaults',
    });
  }, [trackEvent]);
  return (
    <>
      <Alert severity="warning" sx={{ borderRadius: '18px', m: 2 }}>
        MORE is currently investigating an issue affecting metric calculations. APY and share price calculations may be incorrect.
      </Alert>
      <VaultAssetsListContainer />
    </>
  );
}

Vaults.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
