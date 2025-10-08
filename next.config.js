// eslint-disable-next-line
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// Define ALL valid page extensions, including those for API routes
const pageExtensions = ['page.tsx', 'ts', 'tsx', 'js', 'jsx'];
if (process.env.NEXT_PUBLIC_ENABLE_GOVERNANCE === 'true') {
  if (!pageExtensions.includes('governance.tsx')) pageExtensions.push('governance.tsx');
}
if (process.env.NEXT_PUBLIC_ENABLE_STAKING === 'true') {
  if (!pageExtensions.includes('staking.tsx')) pageExtensions.push('staking.tsx');
}

/** @type {import('next').NextConfig} */
module.exports = withBundleAnalyzer({
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            svgoConfig: {
              plugins: ['prefixIds'],
            },
          },
        },
      ],
    });

    // Modify experiments, preserving existing ones if any
    config.experiments = {
      ...config.experiments, // Preserve other experimental flags
      topLevelAwait: true,
      layers: true, // Add layers experiment
    };

    return config;
  },
  reactStrictMode: true,
  // assetPrefix: "./",
  trailingSlash: true,
  pageExtensions,
  async redirects() {
    return [
      // Legacy vaults routes
      {
        source: '/portfolios',
        destination: '/vaults',
        permanent: true,
      },
      {
        source: '/portfolio-detail',
        has: [
          {
            type: 'query',
            key: 'vaultId',
            value: '(?<vaultId>.*)'
          },
        ],
        destination: '/vaults/:vaultId',
        permanent: true,
      },
      {
        source: '/portfolio-detail',
        destination: '/vaults',
        permanent: true,
      },
      // Legacy market query-based routes
      {
        source: '/vault-detail',
        has: [
          {
            type: 'query',
            key: 'vaultId',
            value: '(?<vaultId>.*)'
          },
        ],
        destination: '/vaults/:vaultId',
        permanent: true,
      },
      {
        source: '/reserve-overview',
        has: [
          {
            type: 'query',
            key: 'underlyingAsset',
            value: '(?<underlyingAsset>.*)'
          },
          {
            type: 'query',
            key: 'marketName',
            value: 'proto_flow_v3',
          },
        ],
        destination: '/markets/:underlyingAsset',
        permanent: true,
      },
    ];
  },
  // For local safe testing
  // async headers() {
  //   return [
  //     {
  //       source: '/manifest.json',
  //       headers: [
  //         {
  //           key: 'Access-Control-Allow-Origin',
  //           value: '*',
  //         },
  //         {
  //           key: 'Access-Control-Allow-Methods',
  //           value: 'GET',
  //         },
  //         {
  //           key: 'Access-Control-Allow-Headers',
  //           value: 'X-Requested-With, content-type, Authorization',
  //         },
  //       ],
  //     },
  //   ];
  // },
});
