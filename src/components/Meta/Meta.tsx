import Head from 'next/head';
import React from 'react';

const BRAND = 'MORE';
const TAGLINE = 'Open Source Liquidity Protocol';
const description =
  'MORE Markets is an Open Source Protocol to create Non-Custodial Liquidity Markets to earn interest on supplying and borrowing assets with a variable or stable interest rate, plus curated yield vaults on Flow EVM.';
const imageUrl =
  'https://cdn.prod.website-files.com/6618ffb14f6deabedc97531d/66742b16f9d7dfec3b6313b7_more_logo_light.png';

// `pageTitle` is supplied per-route from _app; when absent the brand + tagline
// is shown. Produces `MORE | Vaults`, `MORE | Markets`, … or the default
// `MORE | Open Source Liquidity Protocol`.
export function Meta({ pageTitle }: { pageTitle?: string }) {
  const title = pageTitle ? `${BRAND} | ${pageTitle}` : `${BRAND} | ${TAGLINE}`;

  return (
    <Head>
      <title>{title}</title>
      <meta name="viewport" content="initial-scale=1, width=device-width" />
      <meta name="description" content={description} key="description" />
      <meta property="og:title" content={title} key="title" />
      <meta property="og:description" content={description} key="ogdescription" />
      <meta property="og:image" content={imageUrl} key="ogimage" />
      <meta name="twitter:image" content={imageUrl} key="twitterimage" />
      <meta name="twitter:image:alt" content="MORE Markets" key="twitteralt" />
      <meta name="twitter:site" content="@MoreMarkets" key="twittersite" />
      <meta property="twitter:card" content="summary_large_image" key="twittercard" />
      <meta name="twitter:title" content={title} key="twittertitle" />
      <meta name="twitter:description" content={description} key="twitterdescription" />
      <meta
        name="keywords"
        key="keywords"
        content="Decentralized Finance, DeFi, lending, borrowing, stablecoins, Flow, Flow EVM, vaults, yield, assets, erc-20, smart contracts, open finance"
      />
      <link rel="icon" href="/favicon.png" type="image/png" />
      <link rel="apple-touch-icon" href="/more_icon180.png" />
      <meta name="apple-mobile-web-app-title" content={BRAND} />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black" />
    </Head>
  );
}
