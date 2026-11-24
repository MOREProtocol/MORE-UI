import { useMemo } from 'react';
import { useAppDataContext, ComputedReserveDataWithMarket } from 'src/hooks/app-data-provider/useAppDataProvider';
import { marketsData } from 'src/ui-config/marketsConfig';
import { useRootStore } from 'src/store/root';
import { usePoolReservesRewardsHumanized, PoolReservesRewardsHumanized } from 'src/hooks/pool/usePoolReservesRewards';

export function useRewardsMaps() {
  const { currentMarket } = useRootStore();
  const rewardsMarketData = marketsData[currentMarket];
  const rewardsQuery = usePoolReservesRewardsHumanized(rewardsMarketData);
  const allRewards: PoolReservesRewardsHumanized[] = rewardsQuery?.data ?? [];
  const map = useMemo(() => {
    const byAddress = new Map<string, { supply: PoolReservesRewardsHumanized[]; borrow: PoolReservesRewardsHumanized[] }>();
    allRewards.forEach((r) => {
      const key = (r.tracked_token_address || '').toLowerCase();
      if (!key) return;
      const entry = byAddress.get(key) || { supply: [], borrow: [] };
      if (r.tracked_token_type === 'supply') entry.supply.push(r);
      else if (r.tracked_token_type === 'borrow') entry.borrow.push(r);
      else {
        entry.supply.push(r);
        entry.borrow.push(r);
      }
      byAddress.set(key, entry);
    });
    return byAddress;
  }, [allRewards]);
  return { allRewards, rewardsByAddress: map };
}

export function useReserveMap() {
  const { reserves } = useAppDataContext();
  return useMemo(() => {
    const m = new Map<string, ComputedReserveDataWithMarket>();
    (reserves || []).forEach((r) => m.set(r.underlyingAsset.toLowerCase(), r));
    return m;
  }, [reserves]);
}

/** Frozen or paused reserves no longer accept supplies or borrows. */
export function isReserveRestricted(reserve?: { isFrozen: boolean; isPaused: boolean }) {
  return !!reserve && (reserve.isFrozen || reserve.isPaused);
}

/**
 * Market-wide restriction, once data is loaded:
 * - isRestricted: every active reserve is frozen or paused (nothing can be supplied or borrowed)
 * - allPaused: every active reserve is paused (withdraw and repay are blocked too)
 * - anyPaused: at least one active reserve is paused
 */
export function useMarketRestriction() {
  const { reserves, loading } = useAppDataContext();
  return useMemo(() => {
    const activeReserves = (reserves || []).filter((r) => r.isActive);
    const isRestricted = !loading && activeReserves.length > 0 && activeReserves.every(isReserveRestricted);
    return {
      isRestricted,
      allPaused: isRestricted && activeReserves.every((r) => r.isPaused),
      anyPaused: isRestricted && activeReserves.some((r) => r.isPaused),
    };
  }, [reserves, loading]);
}

/** True once data is loaded and every active reserve of the current market is frozen or paused. */
export function useIsMarketFrozen() {
  return useMarketRestriction().isRestricted;
}

export function sumIncentivesApr(incentives?: { incentiveAPR: string }[]) {
  if (!incentives || incentives.length === 0) return 0;
  if (incentives.some((i) => i.incentiveAPR === 'Infinity')) return 0;
  return incentives.reduce((sum, i) => sum + Number(i.incentiveAPR || 0), 0);
}

export function sumRewardsApr(rewards?: PoolReservesRewardsHumanized[], side: 'supply' | 'borrow' = 'supply') {
  if (!rewards || rewards.length === 0) return 0;
  return rewards.reduce((acc, r) => {
    if (r.tracked_token_type === 'supply') return acc + (r.incentive_apr_supply || 0);
    if (r.tracked_token_type === 'borrow') return acc + (r.incentive_apr_borrow || 0);
    return acc + (side === 'borrow' ? (r.incentive_apr_borrow || 0) : (r.incentive_apr_supply || 0));
  }, 0);
}


