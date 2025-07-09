import { useQueries } from '@tanstack/react-query';
import { MarketDataType } from 'src/ui-config/marketsConfig';
import { POLLING_INTERVAL, queryKeysFactory } from 'src/ui-config/queries';

import { HookOpts } from '../commonTypes';

export type PoolReservesRewardsHumanized = {
  id: number;
  name: string;
  start_timestamp: number;
  end_timestamp: number;
  reward_token_address: string;
  total_reward_amount_wei: string;
  tracked_token_address: string;
  tracked_token_type: 'supply' | 'borrow' | 'supply_and_borrow';
  created_at: number;
  reward_token_symbol: string;
  apy_bps: number;
}

export const usePoolsReservesRewardsHumanized = <T = PoolReservesRewardsHumanized[]>(
  marketsData: MarketDataType[],
  opts?: HookOpts<PoolReservesRewardsHumanized[], T>
) => {
  return useQueries({
    queries: marketsData.map((marketData) => ({
      queryKey: queryKeysFactory.poolReservesRewardsDataHumanized(marketData),
      queryFn: () => {
        return fetch(`${process.env.NEXT_PUBLIC_REWARD_URL}/api/markets/apy`)
          .then(res => res.json())
      },
      refetchInterval: POLLING_INTERVAL,
      meta: {},
      ...opts,
    })),
  });
};

export const usePoolReservesRewardsHumanized = (marketData: MarketDataType) => {
  return usePoolsReservesRewardsHumanized([marketData])[0];
};