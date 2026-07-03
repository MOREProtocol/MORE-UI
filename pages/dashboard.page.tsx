import * as React from 'react';
import { useEffect } from 'react';
import { MainLayout } from 'src/layouts/MainLayout';
import { DashboardContainer } from 'src/modules/dashboard/DashboardContainer';
import { useRootStore } from 'src/store/root';

export default function Dashboard() {
  const trackEvent = useRootStore((store) => store.trackEvent);

  useEffect(() => {
    trackEvent('Page Viewed', {
      'Page Name': 'Dashboard',
    });
  }, [trackEvent]);

  return <DashboardContainer />;
}

Dashboard.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
