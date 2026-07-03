import { useEffect } from 'react';
import { ErrorPageState } from 'src/components/ErrorPageState';
import { MainLayout } from 'src/layouts/MainLayout';
import { useRootStore } from 'src/store/root';

export default function More404Page() {
  const trackEvent = useRootStore((store) => store.trackEvent);

  useEffect(() => {
    trackEvent('Page Viewed', {
      'Page Name': '404 Error',
    });
  }, [trackEvent]);
  return (
    <ErrorPageState
      code="404"
      title="Page not found"
      description="Sorry, we couldn't find the page you were looking for."
    />
  );
}

More404Page.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
