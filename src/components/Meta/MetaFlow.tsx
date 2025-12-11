import Head from 'next/head';
import React from 'react';

export function Meta() {
  const title = 'Flow Earn';
  const description =
    'Flow Earn makes it easy for you to earn yield on stablecoins and native crypto assets. Powered by professional curators and MORE Vaults, Flow Earn offers you a gateway to passive yield on your deposits.';

  return (
    <Head>
      <title>Flow Earn</title>
      <meta name="viewport" content="initial-scale=1, width=device-width" />
      <meta name="description" content={description} key="description" />
      <meta property="og:title" content={`Flow - ${title}`} key="title" />
      <meta property="og:description" content={description} key="ogdescription" />
      {/* Flow-specific favicon (uses Flow network icon) */}
      <link rel="icon" href="/icons/networks/flow.svg" type="image/svg+xml" />
      {/* Fallback PNG favicon */}
      <link rel="icon" href="/favicon.png" type="image/png" />
      <link rel="apple-touch-icon" href="/more_icon180.png" />
      <meta name="apple-mobile-web-app-title" content="Flow Earn" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black" />
    </Head>
  );
}
