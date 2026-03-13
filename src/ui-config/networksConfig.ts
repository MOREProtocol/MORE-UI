import { ChainIds } from '../utils/const';

export type ExplorerLinkBuilderProps = {
  tx?: string;
  address?: string;
};

export type ExplorerLinkBuilderConfig = {
  baseUrl: string;
  addressPrefix?: string;
  txPrefix?: string;
};

export type NetworkConfig = {
  name: string;
  displayName?: string;
  privateJsonRPCUrl?: string; // private rpc will be used for rpc queries inside the client. normally has private api key and better rate
  privateJsonRPCWSUrl?: string;
  publicJsonRPCUrl: readonly string[]; // public rpc used if not private found, and used to add specific network to wallets if user don't have them. Normally with slow rates
  publicJsonRPCWSUrl?: string;
  // protocolDataUrl: string;
  // https://github.com/aave/aave-api
  ratesHistoryApiUrl?: string;
  // cachingServerUrl?: string;
  // cachingWSServerUrl?: string;
  baseUniswapAdapter?: string;
  /**
   * When this is set withdrawals will automatically be unwrapped
   */
  wrappedBaseAssetSymbol: string;
  baseAssetSymbol: string;
  // needed for configuring the chain on metemask when it doesn't exist yet
  baseAssetDecimals: number;
  // usdMarket?: boolean;
  // function returning a link to etherscan et al
  explorerLink: string;
  explorerLinkBuilder: (props: ExplorerLinkBuilderProps) => string;
  explorerName: string;
  // set this to show faucets and similar
  isTestnet?: boolean;
  // get's automatically populated on fork networks
  isFork?: boolean;
  networkLogoPath: string;
  // contains the forked off chainId
  underlyingChainId?: number;
  bridge?: {
    icon: string;
    name: string;
    url: string;
  };
};

export type BaseNetworkConfig = Omit<NetworkConfig, 'explorerLinkBuilder'>;

export const networkConfigs: Record<string, BaseNetworkConfig> = {
  [ChainIds.flowEVMTestnet]: {
    name: 'EVM on Flow Testnet',
    publicJsonRPCUrl: ['https://testnet.evm.nodes.onflow.org'],
    baseUniswapAdapter: '0x0',
    baseAssetSymbol: 'FLOW',
    wrappedBaseAssetSymbol: 'WFLOW',
    baseAssetDecimals: 18,
    explorerLink: 'https://evm-testnet.flowscan.io',
    explorerName: 'Flowscan',
    // usdMarket: true,
    isTestnet: true,
    networkLogoPath: '/icons/networks/flow.svg',
  },
  [ChainIds.flowEVMMainnet]: {
    name: 'EVM on Flow',
    publicJsonRPCUrl: ['https://mainnet.evm.nodes.onflow.org'],
    get privateJsonRPCUrl() {
      return typeof window !== 'undefined'
        ? `${window.location.origin}/api/rpc-proxy/?network=flow-mainnet`
        : 'https://app.more.markets/api/rpc-proxy/?network=flow-mainnet';
    },
    baseUniswapAdapter: '0x0',
    baseAssetSymbol: 'FLOW',
    wrappedBaseAssetSymbol: 'WFLOW',
    baseAssetDecimals: 18,
    explorerLink: 'https://evm.flowscan.io',
    explorerName: 'Flowscan',
    networkLogoPath: '/icons/networks/flow.svg',
  },
  [ChainIds.ethereum]: {
    name: 'Ethereum',
    displayName: 'Ethereum',
    get privateJsonRPCUrl() {
      return typeof window !== 'undefined'
        ? `${window.location.origin}/api/rpc-proxy/?network=eth-mainnet`
        : 'https://app.more.markets/api/rpc-proxy/?network=eth-mainnet';
    },
    publicJsonRPCUrl: [
      'https://eth.llamarpc.com',
      'https://0xrpc.io/eth',
      'https://eth-mainnet.public.blastapi.io',
      'https://mainnet.gateway.tenderly.co',
      'https://eth.drpc.org',
      'https://ethereum.publicnode.com',
    ],
    baseUniswapAdapter: '0x0',
    baseAssetSymbol: 'ETH',
    wrappedBaseAssetSymbol: 'WETH',
    baseAssetDecimals: 18,
    explorerLink: 'https://etherscan.io',
    explorerName: 'Etherscan',
    networkLogoPath: 'https://assets.relay.link/icons/1/light.png',
  },
  [ChainIds.base]: {
    name: 'Base',
    displayName: 'Base',
    get privateJsonRPCUrl() {
      return typeof window !== 'undefined'
        ? `${window.location.origin}/api/rpc-proxy/?network=base-mainnet`
        : 'https://app.more.markets/api/rpc-proxy/?network=base-mainnet';
    },
    publicJsonRPCUrl: [
      'https://base-rpc.publicnode.com',
      'https://base.llamarpc.com',
      'https://base.drpc.org',
      'https://mainnet.base.org',
      'https://1rpc.io/base',
      'https://gateway.tenderly.co/public/base',
      'https://base.rpc.subquery.network/public',
    ],
    baseUniswapAdapter: '0x0',
    baseAssetSymbol: 'ETH',
    wrappedBaseAssetSymbol: 'WETH',
    baseAssetDecimals: 18,
    explorerLink: 'https://basescan.org',
    explorerName: 'Basescan',
    networkLogoPath: 'https://assets.relay.link/icons/8453/light.png',
  },
  [ChainIds.arbitrum]: {
    name: 'Arbitrum One',
    displayName: 'Arbitrum',
    get privateJsonRPCUrl() {
      return typeof window !== 'undefined'
        ? `${window.location.origin}/api/rpc-proxy/?network=arb-mainnet`
        : 'https://app.more.markets/api/rpc-proxy/?network=arb-mainnet';
    },
    publicJsonRPCUrl: [
      'https://arbitrum.public.blockpi.network/v1/rpc/public',
      'https://public-arb-mainnet.fastnode.io',
      'https://arbitrum-one-rpc.publicnode.com',
      'https://arbitrum.publicnode.com',
    ],
    baseUniswapAdapter: '0x0',
    baseAssetSymbol: 'ETH',
    wrappedBaseAssetSymbol: 'WETH',
    baseAssetDecimals: 18,
    explorerLink: 'https://arbiscan.io',
    explorerName: 'Arbiscan',
    networkLogoPath: 'https://assets.relay.link/icons/42161/light.png',
  },

} as const;
