import React from 'react';
import { ChainId } from '@aave/contract-helpers';
import { normalize, UserIncentiveData } from '@aave/math-utils';
import { UserAuthenticated } from 'src/components/UserAuthenticated';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { ModalType, useModalContext } from 'src/hooks/useModal';
import { useUserPoolReservesRewardsHumanized } from 'src/hooks/pool/useUserPoolReservesRewards';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { BasicModal } from '../../primitives/BasicModal';
import { ClaimRewardsModal as NewClaimRewardsModal } from '../RewardsDistributor/ClaimRewardsModal';
import { useRootStore } from 'src/store/root';
import type { RewardItemEnriched } from 'src/hooks/vault/useVaultData';
import { ClaimRewardsModalContent as LegacyClaimRewardsModalContent } from './ClaimRewardsModalContent';
import { TxModalTitle } from '../FlowCommons/TxModalTitle';
import { formatUnits } from 'viem';

export const ClaimRewardsModal = () => {
  const { type, close } = useModalContext();
  const { reserves, user } = useAppDataContext();
  const { currentAccount } = useWeb3Context();
  const currentMarketData = useRootStore((s) => s.currentMarketData);
  const currentNetworkConfig = useRootStore((s) => s.currentNetworkConfig);
  const rewardsQuery = useUserPoolReservesRewardsHumanized(currentMarketData);
  const distributed = rewardsQuery?.data?.distributed || [];
  // Type that includes both the fields expected by the new modal UI and RewardItemEnriched
  type RewardItemForNewModal = RewardItemEnriched & {
    reward_token_address: string;
    reward_amount_wei: string;
    merkle_proof: string[];
  };
  // Map distributed to typed rewards for the new modal
  const mappedRewards: RewardItemForNewModal[] = distributed.map((r) => {
    const reserve = reserves.find((res) => res.underlyingAsset.toLowerCase() === r.reward_token_address.toLowerCase());
    const decimals = Number(reserve?.decimals || 18);
    const price = Number(reserve?.priceInUSD || 0);
    // Use net claimable amount for display (not the total merkle amount)
    const netWei = r.net_claimable_amount || '0';
    const rewardAmountToClaim = Number(formatUnits(BigInt(netWei), decimals));
    return {
      // RewardItemEnriched
      price,
      rewardAmountToClaim,
      rewardAmountToClaimInUSD: rewardAmountToClaim * price,
      symbol: reserve?.symbol || '',
      name: reserve?.name || '',
      decimals,
      rewardContractAddress: r.reward_contract_address,
      proof: r.merkle_proof,
      // Extra fields used by the new modal implementation
      reward_token_address: r.reward_token_address,
      reward_amount_wei: r.reward_amount_wei,
      merkle_proof: r.merkle_proof,
    } as RewardItemForNewModal;
  });
  const hasNew = mappedRewards.some((r) => r.rewardAmountToClaim > 0);
  // Determine if legacy (v2) rewards are available
  const legacyClaimableRewardsUsd = user
    ? Object.keys(user.calculatedUserIncentives).reduce((acc, rewardTokenAddress) => {
      const incentive: UserIncentiveData = user.calculatedUserIncentives[rewardTokenAddress];
      const rewardBalance = normalize(incentive.claimableRewards, incentive.rewardTokenDecimals);

      let tokenPrice = 0;
      if (!currentMarketData.v3 && Number(rewardBalance) > 0) {
        if (currentMarketData.chainId === ChainId.mainnet) {
          const moreToken = reserves.find((reserve) => reserve.symbol === 'MORE');
          tokenPrice = moreToken ? Number(moreToken.priceInUSD) : 0;
        } else {
          reserves.forEach((reserve) => {
            if (reserve.symbol === currentNetworkConfig.wrappedBaseAssetSymbol) {
              tokenPrice = Number(reserve.priceInUSD);
            }
          });
        }
      } else {
        tokenPrice = Number(incentive.rewardPriceFeed);
      }

      const rewardBalanceUsd = Number(rewardBalance) * tokenPrice;
      return rewardBalanceUsd > 0 ? acc + Number(rewardBalanceUsd) : acc;
    }, 0)
    : 0;
  const legacyAvailable = legacyClaimableRewardsUsd > 0;
  const [showNew, setShowNew] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    if (type === ModalType.ClaimRewards) {
      if (showNew === null) setShowNew(hasNew);
    } else {
      setShowNew(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, hasNew]);
  const handleClaimSuccess = async () => {
    try {
      await rewardsQuery.refetch();
    } catch { }
  };
  return (
    <BasicModal open={type === ModalType.ClaimRewards} setOpen={close}>
      {(showNew ?? hasNew) ? (
        <NewClaimRewardsModal
          open={type === ModalType.ClaimRewards}
          userAddress={currentAccount || ''}
          rewards={mappedRewards}
          legacyAvailable={legacyAvailable}
          onClaimSuccess={handleClaimSuccess}
        />
      ) : (
        // Only legacy available
        // Render legacy content directly without dropdown
        // NOTE: ClaimRewardsModalContent derives claimable from user.calculatedUserIncentives
        <>
          <TxModalTitle title="Claim rewards" />
          <UserAuthenticated>
            {(user) => <LegacyClaimRewardsModalContent user={user} reserves={reserves} />}
          </UserAuthenticated>
        </>
      )}
    </BasicModal>
  );
};
