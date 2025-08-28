import { useQueryClient } from '@tanstack/react-query';
import { useUserData, vaultQueryKeys } from 'src/hooks/vault/useVaultData';
import { useVault } from 'src/hooks/vault/useVault';
import { ClaimRewardsModal } from 'src/components/transactions/RewardsDistributor/ClaimRewardsModal';
import { BasicModal } from 'src/components/primitives/BasicModal';

interface VaultsRewardModalProps {
  open: boolean;
  handleClose: () => void;
  userAddress: string;
}

export const VaultsRewardModal = ({ open, handleClose, userAddress }: VaultsRewardModalProps) => {
  const queryClient = useQueryClient();
  const { chainId } = useVault();
  const { data: userData, refetch } = useUserData(userAddress);

  const handleClaimSuccess = async (claimedRewardAddresses: string[]) => {
    console.log('Rewards claimed successfully!', {
      claimedRewardAddresses,
      userAddress,
      chainId
    });

    try {
      await Promise.all([
        // Invalidate the main user data query
        queryClient.invalidateQueries({
          queryKey: vaultQueryKeys.userGlobalData(userAddress, chainId)
        }),
        // Invalidate the rewards query specifically
        queryClient.invalidateQueries({
          queryKey: vaultQueryKeys.userRewards(userAddress, chainId)
        }),
        // Also refetch the current query to ensure immediate update
        refetch()
      ]);

    } catch (error) {
      console.error('Error refreshing reward data:', error);
    }
  };

  const rewards = userData?.userRewards || [];

  return (
    <BasicModal
      open={open}
      setOpen={(value) => {
        if (!value) handleClose();
      }}
    >
      <ClaimRewardsModal
        open={open}
        userAddress={userAddress}
        rewards={rewards}
        onClaimSuccess={handleClaimSuccess}
      />
    </BasicModal>
  )
};