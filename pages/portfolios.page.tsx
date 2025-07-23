import { useEffect } from 'react';
import { MainLayout } from 'src/layouts/MainLayout';
import { VaultAssetsListContainer } from 'src/modules/vaults/VaultAssetsListContainer';
import { useRootStore } from 'src/store/root';

export default function Portfolios() {
  const trackEvent = useRootStore((store) => store.trackEvent);

  useEffect(() => {
    trackEvent('Page Viewed', {
      'Page Name': 'Portfolios',
    });
  }, [trackEvent]);
  return (
    <VaultAssetsListContainer />
  );
}

Portfolios.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
