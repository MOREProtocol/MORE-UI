import { publicProvider } from 'wagmi/providers/public';
import { configureChains, createClient, Chain } from 'wagmi'; // Import Chain from wagmi
import { getDefaultWallets } from '@rainbow-me/rainbowkit';
import { multicalls } from './const';

export const flowTestnet = {
  id: 545,
  name: 'FlowTestnet',
  network: 'FlowTestnet',
  // iconUrl:
  //   'https://cdn.prod.website-files.com/5f734f4dbd95382f4fdfa0ea/616b1520779838b5f9174363_favicon.png',
  nativeCurrency: { name: 'Flow', symbol: 'FLOW', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://testnet.evm.nodes.onflow.org/'], // Wrap in http array
    },
    public: {
      http: ['https://testnet.evm.nodes.onflow.org/'], // Wrap in http array
    },
  },
  contracts: {
    multicall3: {
      address: multicalls.testnet as `0x${string}`,
    },
  },
  testnet: true,
} as Chain; // Now using wagmi's Chain type

export const flowMainnet = {
  id: 747,
  name: 'FlowEVM',
  network: 'FlowEVM',
  nativeCurrency: { name: 'Flow', symbol: 'FLOW', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://mainnet.evm.nodes.onflow.org/'], // Wrap in http array
    },
    public: {
      http: ['https://mainnet.evm.nodes.onflow.org/'], // Wrap in http array
    },
  },
  contracts: {
    multicall3: {
      address: multicalls.mainnet as `0x${string}`,
    },
  },
  testnet: false,
} as Chain; // Now using wagmi's Chain type

// Configure chains and providers
const { chains: wagmiChains, provider } = configureChains(
  [flowTestnet, flowMainnet],
  [publicProvider()]
);

// Set up RainbowKit wallet connectors
const { connectors } = getDefaultWallets({
  appName: 'My RainbowKit App',
  chains: wagmiChains,
});

// Create Wagmi client
export const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
});

export const chains = wagmiChains;
