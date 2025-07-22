import { useQueryClient } from '@tanstack/react-query';
import { useUserData, vaultQueryKeys } from 'src/hooks/vault/useVaultData';
import { useVault } from 'src/hooks/vault/useVault';
import { ClaimRewardsModal } from 'src/components/transactions/RewardsDistributor/ClaimRewardsModal';

interface VaultsRewardModalProps {
  open: boolean;
  handleClose: () => void;
  userAddress: string;
}

export const VaultsRewardModal = ({ open, handleClose, userAddress }: VaultsRewardModalProps) => {
  const queryClient = useQueryClient();
  const { chainId } = useVault();
  const { data: userData, isLoading, isError, refetch } = useUserData(userAddress);

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

  if (!userData || isLoading || isError) {
    return null;
  }

  return (
    <ClaimRewardsModal
      open={open}
      handleClose={handleClose}
      userAddress={userAddress}
      rewards={userData?.userRewards}
      onClaimSuccess={handleClaimSuccess}
    />
  )
};