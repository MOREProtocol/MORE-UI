import { ReactNode } from 'react';

import { ChainIds } from '../utils/const';

// Enable for premissioned market
// import { PermissionView } from 'src/components/transactions/FlowCommons/PermissionView';
export type MarketDataType = {
  v3?: boolean;
  marketTitle: string;
  market: CustomMarket;
  // the network the market operates on
  chainId: number;
  enabledFeatures?: {
    liquiditySwap?: boolean;
    staking?: boolean;
    governance?: boolean;
    faucet?: boolean;
    collateralRepay?: boolean;
    incentives?: boolean;
    permissions?: boolean;
    debtSwitch?: boolean;
    withdrawAndSwitch?: boolean;
    switch?: boolean;
  };
  permitDisabled?: boolean; // intended to be used for testnets
  isFork?: boolean;
  permissionComponent?: ReactNode;
  disableCharts?: boolean;
  subgraphUrl?: string;
  addresses: {
    LENDING_POOL_ADDRESS_PROVIDER: string;
    LENDING_POOL: string;
    WETH_GATEWAY?: string;
    SWAP_COLLATERAL_ADAPTER?: string;
    REPAY_WITH_COLLATERAL_ADAPTER?: string;
    DEBT_SWITCH_ADAPTER?: string;
    WITHDRAW_SWITCH_ADAPTER?: string;
    FAUCET?: string;
    PERMISSION_MANAGER?: string;
    WALLET_BALANCE_PROVIDER: string;
    L2_ENCODER?: string;
    UI_POOL_DATA_PROVIDER: string;
    UI_INCENTIVE_DATA_PROVIDER?: string;
    COLLECTOR?: string;
    V3_MIGRATOR?: string;
    GHO_TOKEN_ADDRESS?: string;
    GHO_UI_DATA_PROVIDER?: string;
  };
  /**
   * https://www.hal.xyz/ has integrated aave for healtfactor warning notification
   * the integration doesn't follow aave market naming & only supports a subset of markets.
   * When a halIntegration is specified a link to hal will be displayed on the ui.
   */
  halIntegration?: {
    URL: string;
    marketName: string;
  };
};
export enum CustomMarket {
  // v3 test networks, all v3.0.1
  proto_testnet_v3 = 'proto_testnet_v3',
  // v3 test networks, all v3.0.1
  proto_testnet_degen = 'proto_testnet_degen',
  // v3 mainnets
  proto_flow_v3 = 'proto_flow_v3',
}

export const marketsData: {
  [key in keyof typeof CustomMarket]: MarketDataType;
} = {
  [CustomMarket.proto_testnet_v3]: {
    marketTitle: 'EVM on Flow Testnet',
    market: CustomMarket.proto_testnet_v3,
    chainId: ChainIds.flowEVMTestnet,
    v3: true,
    enabledFeatures: {
      governance: false,
      staking: false,
      liquiditySwap: false,
      collateralRepay: false,
      incentives: false,
      withdrawAndSwitch: false,
      debtSwitch: false,
      switch: false,
    },
    permitDisabled: true,
    subgraphUrl: 'https://api.thegraph.com/subgraphs/name/aave/protocol-v3',
    addresses: {
      LENDING_POOL_ADDRESS_PROVIDER: '0xEe5C46a2Ed7c985e10852b364472c86B7FDE9488',
      LENDING_POOL: '0x48Dad407aB7299E0175F39F4Cd12c524DB0AB002',
      WETH_GATEWAY: '0xF50E9dbfc966C3cf26E62F3A27dB68de7eF7462d',
      // REPAY_WITH_COLLATERAL_ADAPTER: AaveV3Ethereum.REPAY_WITH_COLLATERAL_ADAPTER,
      // SWAP_COLLATERAL_ADAPTER: AaveV3Ethereum.SWAP_COLLATERAL_ADAPTER,
      WALLET_BALANCE_PROVIDER: '0x45b29e8Ac5c407dE894B2F8b9679D75865c913BC',
      UI_POOL_DATA_PROVIDER: '0x504F9be69B51e14ad0B8622eB9BCA9C94FCd5718',
      // UI_INCENTIVE_DATA_PROVIDER: AaveV3Ethereum.UI_INCENTIVE_DATA_PROVIDER,
      // COLLECTOR: AaveV3Ethereum.COLLECTOR,
      // GHO_TOKEN_ADDRESS: AaveV3Ethereum.ASSETS.GHO.UNDERLYING,
      // GHO_UI_DATA_PROVIDER: AaveV3Ethereum.UI_GHO_DATA_PROVIDER,
      // WITHDRAW_SWITCH_ADAPTER: AaveV3Ethereum.WITHDRAW_SWAP_ADAPTER,
      // DEBT_SWITCH_ADAPTER: AaveV3Ethereum.DEBT_SWAP_ADAPTER,
    },
    halIntegration: {
      URL: 'https://app.hal.xyz/recipes/aave-v3-track-health-factor',
      marketName: 'MoreMarkets',
    },
  },
  [CustomMarket.proto_testnet_degen]: {
    marketTitle: 'Degen on Flow Testnet',
    market: CustomMarket.proto_testnet_degen,
    chainId: ChainIds.flowEVMTestnet,
    v3: true,
    enabledFeatures: {
      governance: false,
      staking: false,
      liquiditySwap: false,
      collateralRepay: false,
      incentives: false,
      withdrawAndSwitch: false,
      debtSwitch: false,
      switch: false,
    },
    permitDisabled: true,
    subgraphUrl: 'https://api.thegraph.com/subgraphs/name/aave/protocol-v3',
    addresses: {
      LENDING_POOL_ADDRESS_PROVIDER: '0xb13C2f25639EaC3917aBB4BA6385429999C649A4',
      LENDING_POOL: '0x6d6996453dfbd656BB91699185Fc5534d3D31aC0',
      WETH_GATEWAY: '0x49fe43bF9Beed4e424fAF2De35cD2BC75B0690e0',
      WALLET_BALANCE_PROVIDER: '0x45b29e8Ac5c407dE894B2F8b9679D75865c913BC',
      UI_POOL_DATA_PROVIDER: '0x504F9be69B51e14ad0B8622eB9BCA9C94FCd5718',
    },
    halIntegration: {
      URL: 'https://app.hal.xyz/recipes/aave-v3-track-health-factor',
      marketName: 'MoreMarkets',
    },
  },
  [CustomMarket.proto_flow_v3]: {
    marketTitle: 'EVM on Flow',
    market: CustomMarket.proto_flow_v3,
    chainId: ChainIds.flowEVMMainnet,
    v3: true,
    enabledFeatures: {
      governance: false,
      staking: false,
      liquiditySwap: false,
      collateralRepay: false,
      incentives: false,
      withdrawAndSwitch: false,
      debtSwitch: false,
      switch: false,
    },
    permitDisabled: true,
    subgraphUrl: 'https://api.thegraph.com/subgraphs/name/aave/protocol-v3',
    addresses: {
      LENDING_POOL_ADDRESS_PROVIDER: '0x1830a96466d1d108935865c75B0a9548681Cfd9A',
      LENDING_POOL: '0xbC92aaC2DBBF42215248B5688eB3D3d2b32F2c8d',
      WETH_GATEWAY: '0xe847D70a35bbb9DA4133EdC1Cc9cCfFe0C379b4f',
      WALLET_BALANCE_PROVIDER: '0xC66DFBE13F0ED9EFE4cA2113a0c26C6a2008bBD0',
      UI_POOL_DATA_PROVIDER: '0x2148e6253b23122Ee78B3fa6DcdDbefae426EB78',
    },
    halIntegration: {
      URL: 'https://app.hal.xyz/recipes/more-track-health-factor',
      marketName: 'MoreMarkets',
    },
  },
} as const;
