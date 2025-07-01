import { getDefaultConfig } from 'connectkit';
import { createConfig } from 'wagmi';
import { flowMainnet, flowTestnet } from 'viem/chains';

const connectKitConfig = getDefaultConfig({
  appName: 'MORE Markets',
  appUrl: 'https://app.more.markets',
  appIcon: '/loveMore.svg',

  // WalletConnect Project ID (required)
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!,

  // Family accounts disabled for traditional wallet flow
  enableFamily: true,

  // Supported chains
  chains: [flowMainnet, flowTestnet],

  ssr: true
});
export const config = createConfig(connectKitConfig);

