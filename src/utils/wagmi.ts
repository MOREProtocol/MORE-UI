import { Chain } from '@rainbow-me/rainbowkit';
import { injected } from 'wagmi/connectors';
import { http, createConfig } from 'wagmi';
import { multicalls } from './const';

const flowMainnet = {
  id: 747,
  name: 'EVM on Flow',
  iconUrl:
    'https://cdn.prod.website-files.com/5f734f4dbd95382f4fdfa0ea/616b1520779838b5f9174363_favicon.png',
  nativeCurrency: { name: 'Flow', symbol: 'FLOW', decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        // "https://flow-mainnet.g.alchemy.com/v2/giF5d0sHzxK4OoanZ-rwx6Z-jpLMuB1S",
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
export const config = createConfig({
  chains: [flowMainnet, flowTestnet],
  connectors: [injected()],
  transports: {
    [flowMainnet.id]: http('https://mainnet.evm.nodes.onflow.org'),
    [flowTestnet.id]: http('https://testnet.evm.nodes.onflow.org'),
  },
  ssr: true,
  pollingInterval: 30_000,
});
