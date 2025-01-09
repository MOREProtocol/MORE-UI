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
      LENDING_POOL_ADDRESS_PROVIDER: '0x5fE2EFe476DC4b19d8160637E78e0ca93fAa7cB7',
      LENDING_POOL: '0x743543B3061Ea88c89272C65D766d33F98Db6209',
      WETH_GATEWAY: '0xA3F37226359C155A9A0115a300A56FA8ecD1C697',
      WALLET_BALANCE_PROVIDER: '0xAE836c30C58e8Cfe6273C50b44CC7eD03D977586',
      UI_POOL_DATA_PROVIDER: '0x2B6BE6BeB32CB6e8d4fde0Fd1d827e3614Ab6D7A',
    },
    halIntegration: {
      URL: 'https://app.hal.xyz/recipes/aave-v3-track-health-factor',
      marketName: 'MoreMarkets',
    },
  },
} as const;
