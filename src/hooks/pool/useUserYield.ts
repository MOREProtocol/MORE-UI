import {
  FormattedGhoReserveData,
  FormattedGhoUserData,
  FormatUserSummaryAndIncentivesResponse,
} from '@aave/math-utils';
import BigNumber from 'bignumber.js';
import memoize from 'micro-memoize';
import { MarketDataType } from 'src/ui-config/marketsConfig';
import { displayGho, weightedAverageAPY } from 'src/utils/ghoUtilities';

import {
  FormattedReservesAndIncentives,
  usePoolsFormattedReserves,
} from './usePoolFormattedReserves';
import { useUserSummariesAndIncentives } from './useUserSummaryAndIncentives';
import { combineQueries, SimplifiedUseQueryResult } from './utils';
import { PoolReservesRewardsHumanized, usePoolsReservesRewardsHumanized } from './usePoolReservesRewards';

export interface UserYield {
  earnedAPY: number;
  debtAPY: number;
  netAPY: number;
}

const formatUserYield = memoize(
  (
    formattedPoolReserves: FormattedReservesAndIncentives[],
    formattedGhoReserveData: FormattedGhoReserveData | undefined,
    formattedGhoUserData: FormattedGhoUserData | undefined,
    poolsReservesRewards: PoolReservesRewardsHumanized[],
    user: FormatUserSummaryAndIncentivesResponse,
    currentMarket: string
  ) => {
    const proportions = user.userReservesData.reduce(
      (acc, value) => {
        const reserve = formattedPoolReserves.find(
          (r) => r.underlyingAsset === value.reserve.underlyingAsset
        );

        if (reserve) {
          if (value.underlyingBalanceUSD !== '0') {
            acc.positiveProportion = acc.positiveProportion.plus(
              new BigNumber(reserve.supplyAPY).multipliedBy(value.underlyingBalanceUSD)
            );
            if (reserve.aIncentivesData) {
              reserve.aIncentivesData.forEach((incentive) => {
                acc.positiveProportion = acc.positiveProportion.plus(
                  new BigNumber(incentive.incentiveAPR).multipliedBy(value.underlyingBalanceUSD)
                );
              });
            }
          }
          if (value.variableBorrowsUSD !== '0') {
            // TODO: Export to unified helper function
            if (
              displayGho({ symbol: reserve.symbol, currentMarket: currentMarket }) &&
              formattedGhoUserData &&
              formattedGhoReserveData
            ) {
              const borrowRateAfterDiscount = weightedAverageAPY(
                formattedGhoReserveData.ghoVariableBorrowAPY,
                formattedGhoUserData.userGhoBorrowBalance,
                formattedGhoUserData.userGhoAvailableToBorrowAtDiscount,
                formattedGhoReserveData.ghoBorrowAPYWithMaxDiscount
              );
              acc.negativeProportion = acc.negativeProportion.plus(
                new BigNumber(borrowRateAfterDiscount).multipliedBy(
                  formattedGhoUserData.userGhoBorrowBalance
                )
              );
              if (reserve.vIncentivesData) {
                reserve.vIncentivesData.forEach((incentive) => {
                  acc.positiveProportion = acc.positiveProportion.plus(
                    new BigNumber(incentive.incentiveAPR).multipliedBy(
                      formattedGhoUserData.userGhoBorrowBalance
                    )
                  );
                });
              }
            } else {
              acc.negativeProportion = acc.negativeProportion.plus(
                new BigNumber(reserve.variableBorrowAPY).multipliedBy(value.variableBorrowsUSD)
              );
              if (reserve.vIncentivesData) {
                reserve.vIncentivesData.forEach((incentive) => {
                  acc.positiveProportion = acc.positiveProportion.plus(
                    new BigNumber(incentive.incentiveAPR).multipliedBy(value.variableBorrowsUSD)
                  );
                });
              }
            }
          }
          if (value.stableBorrowsUSD !== '0') {
            acc.negativeProportion = acc.negativeProportion.plus(
              new BigNumber(value.stableBorrowAPY).multipliedBy(value.stableBorrowsUSD)
            );
            if (reserve.sIncentivesData) {
              reserve.sIncentivesData.forEach((incentive) => {
                acc.positiveProportion = acc.positiveProportion.plus(
                  new BigNumber(incentive.incentiveAPR).multipliedBy(value.stableBorrowsUSD)
                );
              });
            }
          }
        } else {
          throw new Error('no possible to calculate net apy');
        }

        return acc;
      },
      {
        positiveProportion: new BigNumber(0),
        negativeProportion: new BigNumber(0),
      }
    );

    // Add rewards from poolsReservesRewards (reuse precomputed APRs)
    if (Array.isArray(poolsReservesRewards)) {
      poolsReservesRewards.forEach((reward) => {
        const userReserveData = user.userReservesData.find(
          (r) => r.reserve.underlyingAsset.toLowerCase() === reward.tracked_token_address.toLowerCase()
        );
        if (!userReserveData) return;

        if (['supply', 'supply_and_borrow'].includes(reward.tracked_token_type)) {
          const marketRewardAPY = new BigNumber(reward.incentive_apr_supply || 0);
          if (userReserveData.underlyingBalanceUSD !== '0') {
            proportions.positiveProportion = proportions.positiveProportion.plus(
              marketRewardAPY.multipliedBy(userReserveData.underlyingBalanceUSD)
            );
          }
        }
        if (['borrow', 'supply_and_borrow'].includes(reward.tracked_token_type)) {
          const marketRewardAPY = new BigNumber(reward.incentive_apr_borrow || 0);
          if (userReserveData.variableBorrowsUSD !== '0') {
            proportions.positiveProportion = proportions.positiveProportion.plus(
              marketRewardAPY.multipliedBy(userReserveData.variableBorrowsUSD)
            );
          }
          if (userReserveData.stableBorrowsUSD !== '0') {
            proportions.positiveProportion = proportions.positiveProportion.plus(
              marketRewardAPY.multipliedBy(userReserveData.stableBorrowsUSD)
            );
          }
        }
      });
    }

    const earnedAPY = proportions.positiveProportion.dividedBy(user.totalLiquidityUSD).toNumber();
    const debtAPY = proportions.negativeProportion.dividedBy(user.totalBorrowsUSD).toNumber();
    const netAPY =
      (earnedAPY || 0) *
      (Number(user.totalLiquidityUSD) /
        Number(user.netWorthUSD !== '0' ? user.netWorthUSD : '1')) -
      (debtAPY || 0) *
      (Number(user.totalBorrowsUSD) / Number(user.netWorthUSD !== '0' ? user.netWorthUSD : '1'));
    return {
      earnedAPY,
      debtAPY,
      netAPY,
    };
  }
);

export const useUserYields = (
  marketsData: MarketDataType[]
): SimplifiedUseQueryResult<UserYield>[] => {
  const poolsFormattedReservesQuery = usePoolsFormattedReserves(marketsData);
  const userSummaryQuery = useUserSummariesAndIncentives(marketsData);
  const poolsReservesRewardsQuery = usePoolsReservesRewardsHumanized(marketsData);

  return poolsFormattedReservesQuery.map((elem, index) => {
    const marketData = marketsData[index];
    const poolReservesRewardsData = Array.isArray(poolsReservesRewardsQuery[index].data)
      ? poolsReservesRewardsQuery[index].data
      : [];
    const ghoSelector = (
      formattedPoolReserves: FormattedReservesAndIncentives[],
      user: FormatUserSummaryAndIncentivesResponse
    ) => {
      return formatUserYield(formattedPoolReserves, undefined, undefined, poolReservesRewardsData, user, marketData.market);
    };
    return combineQueries([elem, userSummaryQuery[index]] as const, ghoSelector);
  });
};

export const useUserYield = (marketData: MarketDataType) => {
  return useUserYields([marketData])[0];
};