export type TxState = {
  txError?: string;
  success: boolean;
  gasEstimationError?: string;
};

export type Reward = {
  assets: string[];
  incentiveControllerAddress: string;
  symbol: string;
  balance: string;
  balanceUsd: string;
  rewardTokenAddress: string;
};

export type EmodeCategory = {
  id: number;
  ltv: number;
  liquidationThreshold: number;
  liquidationBonus: number;
  priceSource: string;
  label: string;
  assets: string[];
};

export enum CollateralType {
  ENABLED,
  ISOLATED_ENABLED,
  DISABLED,
  ISOLATED_DISABLED,
  UNAVAILABLE,
  UNAVAILABLE_DUE_TO_ISOLATION,
}

export interface IProps {
  children: React.ReactNode;
}

export enum WalletType {
  INJECTED = 'injected',
  FLOW_WALLET = 'flow_wallet',
  WALLET_CONNECT = 'wallet_connect',
  READ_ONLY_MODE = 'read_only_mode',
}
