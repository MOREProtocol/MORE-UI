import { API_ETH_MOCK_ADDRESS } from '@aave/contract-helpers';
import { ChainIds } from '../utils/const';

type ExtensionValue = string | number | boolean | null | undefined;

export interface TokenInfo {
  readonly chainId: number;
  readonly address: string;
  readonly name: string;
  readonly decimals: number;
  readonly symbol: string;
  readonly logoURI?: string;
  readonly tags?: string[];
  readonly extensions?: {
    readonly [key: string]:
      | {
          [key: string]:
            | {
                [key: string]: ExtensionValue;
              }
            | ExtensionValue;
        }
      | ExtensionValue;
  };
}

export interface Version {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

export interface Tags {
  readonly [tagId: string]: {
    readonly name: string;
    readonly description: string;
  };
}

export interface TokenList {
  readonly name: string;
  readonly timestamp: string;
  readonly version: Version;
  readonly tokens: TokenInfo[];
  readonly tokenMap?: {
    readonly [key: string]: TokenInfo;
  };
  readonly keywords?: string[];
  readonly tags?: Tags;
  readonly logoURI?: string;
}

const NETWORK_ASSETS: TokenInfo[] = [
  {
    name: 'FLOW',
    symbol: 'FLOW',
    decimals: 18,
    address: API_ETH_MOCK_ADDRESS,
    chainId: ChainIds.flowEVMTestnet,
    logoURI: 'https://cryptologos.cc/logos/flow-flow-logo.svg',
    extensions: {
      isNative: true,
    },
  },
  {
    name: 'FLOW',
    symbol: 'FLOW',
    decimals: 18,
    address: API_ETH_MOCK_ADDRESS,
    chainId: ChainIds.flowEVMMainnet,
    logoURI: 'https://cryptologos.cc/logos/flow-flow-logo.svg',
    extensions: {
      isNative: true,
    },
  },
];

export const TOKEN_LIST: TokenList = {
  name: 'More Labs Default',
  timestamp: '2024-12-19T15:47:25.037Z',
  version: {
    major: 11,
    minor: 12,
    patch: 0,
  },
  tags: {},
  logoURI: 'ipfs://QmNa8mQkrNKp1WEEeGjFezDmDeodkWRevGFN8JCV7b4Xir',
  keywords: ['aave', 'default'],
  tokens: [
    ...NETWORK_ASSETS,
    {
      chainId: ChainIds.flowEVMTestnet,
      address: '0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e',
      name: 'Wrapped FLOW',
      symbol: 'WFLOW',
      decimals: 18,
      logoURI: 'https://cryptologos.cc/logos/flow-flow-logo.svg',
    },
    {
      chainId: ChainIds.flowEVMTestnet,
      address: '0x8E3DC6E937B560ce6a1Aaa78AfC775228969D16c',
      name: 'ankr.FLOW',
      symbol: 'ankr.FLOW',
      decimals: 18,
      logoURI:
        'https://cdn.prod.website-files.com/60f008ba9757da0940af288e/66d7ac533430f79fc1f19a73_ankr-p-500.jpg',
    },
    {
      chainId: ChainIds.flowEVMTestnet,
      address: '0xbC462009560a9270bdB9A2bFA2efa1AD533793eb',
      name: 'USDC.e',
      symbol: 'USDC.e',
      decimals: 6,
      logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
    },
    {
      chainId: ChainIds.flowEVMTestnet,
      address: '0x30F44C64725727F2001E6C1eF6e6CE9c7aB91dC3',
      name: 'Coinbase Wrapped BTC',
      symbol: 'cbBTC',
      decimals: 8,
      logoURI: 'https://assets.coingecko.com/coins/images/40143/large/cbbtc.webp',
    },
    // mainnet tokens
    {
      chainId: ChainIds.flowEVMMainnet,
      address: '0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e',
      name: 'Wrapped FLOW',
      symbol: 'WFLOW',
      decimals: 18,
      logoURI: 'https://cryptologos.cc/logos/flow-flow-logo.svg',
    },
    {
      chainId: ChainIds.flowEVMMainnet,
      address: '0x1b97100eA1D7126C4d60027e231EA4CB25314bdb',
      name: 'ankr.FLOW',
      symbol: 'ankr.FLOW',
      decimals: 18,
      logoURI:
        'https://cdn.prod.website-files.com/60f008ba9757da0940af288e/66d7ac533430f79fc1f19a73_ankr-p-500.jpg',
    },
    {
      chainId: ChainIds.flowEVMMainnet,
      address: '0x7f27352D5F83Db87a5A3E00f4B07Cc2138D8ee52',
      name: 'USDC.e',
      symbol: 'USDC.e',
      decimals: 6,
      logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
    },
    {
      chainId: ChainIds.flowEVMMainnet,
      address: '0xA0197b2044D28b08Be34d98b23c9312158Ea9A18',
      name: 'Coinbase Wrapped BTC',
      symbol: 'cbBTC',
      decimals: 8,
      logoURI: 'https://assets.coingecko.com/coins/images/40143/large/cbbtc.webp',
    },
  ],
};

export const COMMON_SWAPS = [
  'ETH',
  'DAI',
  'USDC',
  'USDT',
  'WBTC',
  'WETH',
  'DAI.e',
  'USDC.e',
  'USDT.e',
  'GHO',
];
