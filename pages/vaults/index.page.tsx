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
        On Dec. 27, the Flow network experienced a security incident affecting the Cadence. Network recovery and reindexing are currently in progress. As a result, data displayed in MORE, especially Subgraph data such as APY, may be inaccurate.
      </Alert>
      <VaultAssetsListContainer />
    </>
  );
}

Vaults.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
