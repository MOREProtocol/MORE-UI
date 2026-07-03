import type { NextPageContext } from 'next';
import { ErrorPageState } from 'src/components/ErrorPageState';
import { MainLayout } from 'src/layouts/MainLayout';

type ErrorPageProps = {
  statusCode: number;
};

function ErrorPage({ statusCode }: ErrorPageProps) {
  return (
    <ErrorPageState
      code={statusCode}
      title={statusCode === 404 ? 'Page not found' : 'Something went wrong'}
      description={
        statusCode === 404
          ? "Sorry, we couldn't find the page you were looking for."
          : 'Sorry, an unexpected error happened. Please try again, or come back later.'
      }
    />
  );
}

ErrorPage.getInitialProps = (ctx: NextPageContext) => {
  const { res, err } = ctx;
  // Inspect the status code and show the given template based off of it
  // Default to 404 page
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

ErrorPage.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};

export default ErrorPage;
