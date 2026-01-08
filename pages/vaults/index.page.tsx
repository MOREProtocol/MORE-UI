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
    <VaultAssetsListContainer />
  );
}

Vaults.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
