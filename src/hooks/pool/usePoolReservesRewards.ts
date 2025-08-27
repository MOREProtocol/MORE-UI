import { useQueries } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import { MarketDataType } from 'src/ui-config/marketsConfig';
import { POLLING_INTERVAL, queryKeysFactory } from 'src/ui-config/queries';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';

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
  emission_wei_per_second: string;
  // enriched client-side
  reward_token_symbol?: string;
  incentive_apr_supply?: number;
  incentive_apr_borrow?: number;
}

export const usePoolsReservesRewardsHumanized = <T = PoolReservesRewardsHumanized[]>(
  marketsData: MarketDataType[],
  opts?: HookOpts<PoolReservesRewardsHumanized[], T>
) => {
  const { reserves } = useAppDataContext();
  return useQueries({
    queries: marketsData.map((marketData) => ({
      queryKey: queryKeysFactory.poolReservesRewardsDataHumanized(marketData),
      queryFn: () => {
        return fetch(`${process.env.NEXT_PUBLIC_REWARD_URL}/api/markets/apy`)
          .then(res => res.json())
          .then((raw: any[]) => {
            const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
            return (raw || []).map((r) => {
              const rewardReserve = reserves.find(
                (x) => x.underlyingAsset.toLowerCase() === String(r.reward_token_address).toLowerCase()
              );
              const trackedReserve = reserves.find(
                (x) => x.underlyingAsset.toLowerCase() === String(r.tracked_token_address).toLowerCase()
              );
              const rewardPriceUSD = rewardReserve ? Number(rewardReserve.priceInUSD || 0) : 0;
              const trackedPriceUSD = trackedReserve ? Number(trackedReserve.priceInUSD || 0) : 0;
              const priceRatioRewardOverTracked = trackedPriceUSD > 0 ? rewardPriceUSD / trackedPriceUSD : 0;

              // Prefer token-denominated denominators; fall back to USD if missing
              const totalLiquidityTokens = new BigNumber(trackedReserve ? trackedReserve.totalLiquidity || '0' : '0');
              const totalDebtTokens = new BigNumber(trackedReserve ? trackedReserve.totalDebt || '0' : '0');
              const totalLiquidityUSD = new BigNumber(trackedReserve ? trackedReserve.totalLiquidityUSD || '0' : '0');
              const totalDebtUSD = new BigNumber(trackedReserve ? trackedReserve.totalDebtUSD || '0' : '0');

              const emissionWeiPerSec = new BigNumber(r.emission_wei_per_second || '0');
              const rewardDecimals = rewardReserve ? Number(rewardReserve.decimals || 18) : 18;
              const emissionTokensPerYear = emissionWeiPerSec
                .dividedBy(new BigNumber(10).pow(rewardDecimals))
                .multipliedBy(SECONDS_PER_YEAR);

              // If reward and tracked tokens are identical, price ratio is 1 and USD cancels out
              const aprSupplyTokenBasis = totalLiquidityTokens.gt(0) && priceRatioRewardOverTracked > 0
                ? emissionTokensPerYear.dividedBy(totalLiquidityTokens).multipliedBy(priceRatioRewardOverTracked)
                : new BigNumber(0);
              const aprBorrowTokenBasis = totalDebtTokens.gt(0) && priceRatioRewardOverTracked > 0
                ? emissionTokensPerYear.dividedBy(totalDebtTokens).multipliedBy(priceRatioRewardOverTracked)
                : new BigNumber(0);

              // Fallback to USD basis if token-basis cannot be computed
              const emissionUSDPerYear = emissionTokensPerYear.multipliedBy(rewardPriceUSD);
              const aprSupplyUSDBasis = totalLiquidityUSD.gt(0)
                ? emissionUSDPerYear.dividedBy(totalLiquidityUSD)
                : new BigNumber(0);
              const aprBorrowUSDBasis = totalDebtUSD.gt(0)
                ? emissionUSDPerYear.dividedBy(totalDebtUSD)
                : new BigNumber(0);

              const incentive_apr_supply = (aprSupplyTokenBasis.gt(0) ? aprSupplyTokenBasis : aprSupplyUSDBasis).toNumber();
              const incentive_apr_borrow = (aprBorrowTokenBasis.gt(0) ? aprBorrowTokenBasis : aprBorrowUSDBasis).toNumber();

              return {
                ...r,
                reward_token_symbol: rewardReserve?.symbol,
                incentive_apr_supply,
                incentive_apr_borrow,
              } as PoolReservesRewardsHumanized;
            });
          })
      },
      enabled: reserves?.length > 0,
      refetchInterval: POLLING_INTERVAL,
      meta: {},
      ...opts,
    })),
  });
};

export const usePoolReservesRewardsHumanized = (marketData: MarketDataType) => {
  return usePoolsReservesRewardsHumanized([marketData])[0];
};