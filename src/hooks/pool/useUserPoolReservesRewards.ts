import { useQueries } from '@tanstack/react-query';
import { useRootStore } from 'src/store/root';
import { MarketDataType } from 'src/ui-config/marketsConfig';
import { POLLING_INTERVAL, queryKeysFactory } from 'src/ui-config/queries';
import { getProvider } from 'src/utils/marketsAndNetworksConfig';

import { HookOpts } from '../commonTypes';
import { ethers } from 'ethers';

export type UserPoolReservesRewardsHumanized = {
  merkle_root: string;
  reward_amount_wei: string;
  reward_token_address: string;
  merkle_proof: string[];
  reward_contract_address: string;
  claimed_amount: string;
  net_claimable_amount: string;
}

export const useUserPoolsReservesRewardsHumanized = <T = UserPoolReservesRewardsHumanized[]>(
  marketsData: MarketDataType[],
  opts?: HookOpts<UserPoolReservesRewardsHumanized[], T>
) => {
  const user = useRootStore((store) => store.account);
  return useQueries({
    queries: marketsData.map((marketData) => ({
      queryKey: queryKeysFactory.userPoolReservesRewardsDataHumanized(user, marketData),
      queryFn: async () => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_REWARD_URL}/api/markets/user?userAddress=${user}`);
        const data: UserPoolReservesRewardsHumanized[] = await response.json();

        if (!data || data.length === 0) {
          return data;
        }

        // Get provider for this chain
        const provider = getProvider(marketData.chainId);

        // Enrich each reward with claimed amount
        const enrichedData = await Promise.all(
          data.map(async (reward) => {
            try {
              // Create contract instance for the reward contract
              const rewardContract = new ethers.Contract(
                reward.reward_contract_address,
                [`function claimed(address account, address reward) external view returns (uint256)`],
                provider
              );

              // Call the claimed function to get the claimed amount
              const claimedAmount = await rewardContract.claimed(user, reward.reward_token_address);

              // Calculate net claimable amount, ensuring it's never negative
              const totalRewardAmount = ethers.BigNumber.from(reward.reward_amount_wei);
              const netClaimableAmount = totalRewardAmount.gte(claimedAmount)
                ? totalRewardAmount.sub(claimedAmount)
                : ethers.BigNumber.from(0);

              return {
                ...reward,
                claimed_amount: claimedAmount.toString(),
                net_claimable_amount: netClaimableAmount.toString(),
              };
            } catch (error) {
              console.error(`Error fetching claimed amount for reward ${reward.reward_token_address}:`, error);
              return {
                ...reward,
                claimed_amount: '0', // Default to 0 if there's an error
                net_claimable_amount: '0',
              };
            }
          })
        );

        return enrichedData;
      },
      enabled: !!user,
      refetchInterval: POLLING_INTERVAL,
      ...opts,
    })),
  });
};

export const useUserPoolReservesRewardsHumanized = (marketData: MarketDataType) => {
  return useUserPoolsReservesRewardsHumanized([marketData])[0];
};
