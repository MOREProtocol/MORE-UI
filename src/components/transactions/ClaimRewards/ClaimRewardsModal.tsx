import React from 'react';
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

export const ClaimRewardsModal = () => {
  const { type, close } = useModalContext();
  const { reserves } = useAppDataContext();
  const { currentAccount } = useWeb3Context();
  const currentMarketData = useRootStore((s) => s.currentMarketData);
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
    const rewardAmountToClaim = Number(r.net_claimable_amount || '0');
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
      reward_amount_wei: r.net_claimable_amount,
      merkle_proof: r.merkle_proof,
    } as RewardItemForNewModal;
  });
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
