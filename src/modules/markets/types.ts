import { ComputedReserveDataWithMarket } from 'src/hooks/app-data-provider/useAppDataProvider';
import { PoolReservesRewardsHumanized } from 'src/hooks/pool/usePoolReservesRewards';

export type TabKey = 'supply' | 'borrow';

export interface MarketRow {
  id: string;
  assetSymbol: string;
  assetName: string;
  apy: number;
  variableApy?: number;
  totalLiquidity: number;
  availableLiquidity: number;
  effectiveApy?: number;
  balance?: number;
  available?: number;
  reserve?: ComputedReserveDataWithMarket;
  rewardsSupply?: PoolReservesRewardsHumanized[];
  rewardsBorrow?: PoolReservesRewardsHumanized[];
}

export interface PositionRow {
  id: string;
  assetSymbol: string;
  assetName: string;
  balance: number; // USD
  tokenBalance: number; // asset units
  apy: number;
  effectiveApy?: number;
  reserve?: ComputedReserveDataWithMarket;
  rewardsSupply?: PoolReservesRewardsHumanized[];
  rewardsBorrow?: PoolReservesRewardsHumanized[];
  lltv?: number;
  utilization?: number;
}


