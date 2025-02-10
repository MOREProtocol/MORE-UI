import Head from 'next/head';
import React from 'react';

export function Meta() {
  const title = 'Open Source Liquidity Protocol';
  const description =
    'MoreMarkets is an Open Source Protocol to create Non-Custodial Liquidity Markets to earn interest on supplying and borrowing assets with a variable or stable interest rate. The protocol is designed for easy integration into your products and services.';
  const imageUrl =
    'https://cdn.prod.website-files.com/6618ffb14f6deabedc97531d/66742b16f9d7dfec3b6313b7_more_logo_light.png';

  return (
    <Head>
      <title>MoreMarkets - Open Source Liquidity Protocol</title>
      <meta name="viewport" content="initial-scale=1, width=device-width" />
      <meta name="description" content={description} key="description" />
      <meta property="og:title" content={`MoreMarkets - ${title}`} key="title" />
      <meta property="og:description" content={description} key="ogdescription" />
      {imageUrl && <meta property="og:image" content={imageUrl} key="ogimage" />}
      {imageUrl && <meta name="twitter:image" content={imageUrl} key="twitterimage" />}
      {imageUrl && (
        <meta name="twitter:image:alt" content="move governance image" key="twitteralt" />
      )}
      <meta name="twitter:site" content="@MoreMarkets" key="twittersite" />
      <meta
        property="twitter:card"
        content={imageUrl ? 'summary_large_image' : 'summary'}
        key="twittercard"
      />
      <meta name="twitter:title" content={title} key="twittertitle" />
      <meta name="twitter:description" content={description} key="twitterdescription" />
      <meta
        name="keywords"
        key="keywords"
        content="Decentralized Finance, DeFi, lending, borrowing, stablecoins, Ethereum, assets, erc-20, smart contracts, open finance, trustless"
      />
      <link rel="apple-touch-icon" href="/more_icon180.png" />
      <meta name="apple-mobile-web-app-title" content="More" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black" />
    </Head>
  );
}
