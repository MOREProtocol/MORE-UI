import React from 'react';
import { UserAuthenticated } from 'src/components/UserAuthenticated';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { ModalType, useModalContext } from 'src/hooks/useModal';
import { useUserPoolReservesRewardsHumanized } from 'src/hooks/pool/useUserPoolReservesRewards';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { BasicModal } from '../../primitives/BasicModal';
import { ClaimRewardsModal as NewClaimRewardsModal } from '../RewardsDistributor/ClaimRewardsModal';
import { useRootStore } from 'src/store/root';
import { ClaimRewardsModalContent as LegacyClaimRewardsModalContent } from './ClaimRewardsModalContent';
import { TxModalTitle } from '../FlowCommons/TxModalTitle';

export const ClaimRewardsModal = () => {
  const { type, close } = useModalContext();
  const { reserves } = useAppDataContext();
  const { currentAccount } = useWeb3Context();
  const currentMarketData = useRootStore((s) => s.currentMarketData);
  const rewardsQuery = useUserPoolReservesRewardsHumanized(currentMarketData);
  const distributed = rewardsQuery?.data?.distributed || [];
  // Map distributed to RewardItemEnriched-like minimal shape for new modal
  const mappedRewards = distributed.map((r) => ({
    reward_token_address: r.reward_token_address,
    rewardAmountToClaim: Number(r.net_claimable_amount || '0'),
    rewardAmountToClaimInUSD: 0,
    symbol: reserves.find((res) => res.underlyingAsset.toLowerCase() === r.reward_token_address.toLowerCase())?.symbol || '',
    name: reserves.find((res) => res.underlyingAsset.toLowerCase() === r.reward_token_address.toLowerCase())?.name || '',
    decimals: Number(reserves.find((res) => res.underlyingAsset.toLowerCase() === r.reward_token_address.toLowerCase())?.decimals || 18),
    rewardContractAddress: r.reward_contract_address,
    reward_amount_wei: r.net_claimable_amount,
    merkle_proof: r.merkle_proof,
  })) as any[];
  const hasNew = mappedRewards.some((r) => r.rewardAmountToClaim > 0);
  return (
    <BasicModal open={type === ModalType.ClaimRewards} setOpen={close}>
      {hasNew ? (
        <NewClaimRewardsModal
          open={true}
          handleClose={close}
          userAddress={currentAccount || ''}
          rewards={mappedRewards}
          legacyAvailable={true}
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
