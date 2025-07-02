import { getDefaultConfig } from 'connectkit';
import { createConfig, http } from 'wagmi';
import { flowMainnet, flowTestnet } from 'viem/chains';

const connectKitConfig = getDefaultConfig({
  appName: 'MORE',
  appDescription: 'Integrate with any DeFi protocol',
  appUrl: 'https://app.more.markets',
  appIcon: 'https://avatars.githubusercontent.com/u/208097089?s=200&v=4',

  // WalletConnect Project ID (required)
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,

  // Family accounts disabled for traditional wallet flow
  enableFamily: true,

  // Supported chains
  chains: [flowMainnet, flowTestnet],

  transports: {
    [flowMainnet.id]: http(flowMainnet.rpcUrls.default.http[0]),
    [flowTestnet.id]: http(flowTestnet.rpcUrls.default.http[0]),
  },

  ssr: true
});

export const config = createConfig(connectKitConfig);
