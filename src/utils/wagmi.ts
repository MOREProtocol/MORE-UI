import { Chain, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { multicalls } from './const';
import {
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet
} from "@rainbow-me/rainbowkit/wallets";

const flowMainnet = {
  id: 747,
  name: 'EVM on Flow',
  iconUrl:
    'https://cdn.prod.website-files.com/5f734f4dbd95382f4fdfa0ea/616b1520779838b5f9174363_favicon.png',
  nativeCurrency: { name: 'Flow', symbol: 'FLOW', decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        'https://mainnet.evm.nodes.onflow.org',
      ],
    },
  },
  contracts: {
    multicall3: {
      address: multicalls.mainnet as `0x${string}`,
    },
  },
  blockExplorers: {
    default: {
      name: 'Flow ',
      url: 'https://evm.flowscan.io',
      apiUrl: 'https://evm.flowscan.io/api',
    },
  },
  testnet: true,
} as const satisfies Chain;

const flowTestnet = {
  id: 545,
  name: 'FlowTestnet',
  iconUrl:
    'https://cdn.prod.website-files.com/5f734f4dbd95382f4fdfa0ea/616b1520779838b5f9174363_favicon.png',
  nativeCurrency: { name: 'Flow', symbol: 'FLOW', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://testnet.evm.nodes.onflow.org/'],
    },
  },
  contracts: {
    multicall3: {
      address: multicalls.testnet as `0x${string}`,
    },
  },
  blockExplorers: {
    default: {
      name: 'Flow ',
      url: 'https://evm-testnet.flowscan.io',
      apiUrl: 'https://evm-testnet.flowscan.io/api',
    },
  },
  testnet: true,
} as const satisfies Chain;

// Create wagmiConfig
/* export const config = createConfig({
  connectors: connectorsForWallets(
    [
      {
        groupName: 'Suggested',
        wallets: [
          metaMaskWallet,
          coinbaseWallet,
          walletConnectWallet
        ],
      },
    ],
    {
      appName: 'MORE Markets',
      projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
    }
  ),
  chains: [flowMainnet, flowTestnet],
  transports: {
    [flowMainnet.id]: http('https://mainnet.evm.nodes.onflow.org'),
    [flowTestnet.id]: http('https://testnet.evm.nodes.onflow.org'),
  },
  ssr: true,
  pollingInterval: 30_000,
}); */

export const config = getDefaultConfig({
  appName: 'MORE Markets',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  chains: [flowMainnet, flowTestnet],
  wallets: [
    {
      groupName: "Suggested",
      wallets: [
        metaMaskWallet,
        coinbaseWallet,
        walletConnectWallet
      ],
    },
  ],
  ssr: true
});
