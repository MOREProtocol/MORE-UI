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
  proto_flow_v3 = 'proto_flow_v3',
  // v3 degen mainnet
  proto_degen_v3 = 'proto_degen_v3',
}

export const marketsData: {
  [key in keyof typeof CustomMarket]: MarketDataType;
} = {
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
      incentives: true,
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
      UI_INCENTIVE_DATA_PROVIDER: '0x7b589494de15C30FBBA49B2b478cBEcC561f5A87'
    },
    halIntegration: {
      URL: 'https://app.hal.xyz/recipes/more-track-health-factor',
      marketName: 'MoreMarkets',
    },
  },
  [CustomMarket.proto_degen_v3]: {
    marketTitle: 'Degen Market',
    market: CustomMarket.proto_degen_v3,
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
      LENDING_POOL_ADDRESS_PROVIDER: '0xC75401A18Cd8a4A36b2F3F5945ee99223745b568',
      LENDING_POOL: '0x23946E2fa751F0aecf655a59613beF86e20881B5',
      WETH_GATEWAY: '0x10F793F76189c66Ec57B7E525CbD7D18A40fa166',
      WALLET_BALANCE_PROVIDER: '0xC66DFBE13F0ED9EFE4cA2113a0c26C6a2008bBD0',
      UI_POOL_DATA_PROVIDER: '0x2148e6253b23122Ee78B3fa6DcdDbefae426EB78',
    },
    halIntegration: {
      URL: 'https://app.hal.xyz/recipes/more-track-health-factor',
      marketName: 'MoreMarkets',
    },
  },
} as const;
