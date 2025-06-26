import { Box, Container, Paper, Typography } from '@mui/material';
import Head from 'next/head';
import { MainLayout } from 'src/layouts/MainLayout';
import { Link } from 'src/components/primitives/Link';

export default function AttributionsPage() {
  return (
    <>
      <Head>
        <title>Attributions - MORE Markets</title>
        <meta name="description" content="Library attributions and licenses for MORE Markets" />
      </Head>

      <Container sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h3" component="h1" sx={{ mb: 4 }}>
          Attributions & Licenses
        </Typography>

        <Typography variant="description" sx={{ mb: 4, color: 'text.secondary' }}>
          This page lists the open source libraries and their respective licenses used in MORE.
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h2" component="h2" sx={{ mb: 2 }}>
            TradingView Lightweight Charts
          </Typography>
          <Typography variant="description" sx={{ mb: 2, color: 'text.secondary' }}>
            Used for displaying financial charts and market data visualization.
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="description" component="div">
              <strong>License:</strong> Apache License 2.0
            </Typography>
            <Typography variant="description" component="div">
              <strong>Copyright:</strong> © 2019 TradingView, Inc.
            </Typography>
            <Typography variant="description" component="div">
              <strong>Website:</strong>{' '}
              <Link
                href="https://www.tradingview.com/lightweight-charts/"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://www.tradingview.com/lightweight-charts/
              </Link>
            </Typography>
            <Typography variant="description" component="div">
              <strong>Repository:</strong>{' '}
              <Link
                href="https://github.com/tradingview/lightweight-charts"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://github.com/tradingview/lightweight-charts
              </Link>
            </Typography>
          </Box>
          <Typography variant="description" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
            Permission is hereby granted, free of charge, to any person obtaining a copy of this software
            and associated documentation files (the &quot;Software&quot;), to deal in the Software without restriction,
            including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
            and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
            subject to the following conditions: The above copyright notice and this permission notice shall be
            included in all copies or substantial portions of the Software.
          </Typography>
        </Paper>
      </Container>
    </>
  );
}

AttributionsPage.getLayout = function getLayout(page: React.ReactElement) {
  return <MainLayout>{page}</MainLayout>;
}; 