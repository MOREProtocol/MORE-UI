import { useUserData } from 'src/hooks/vault/useVaultData';
import { ClaimRewardsModal } from 'src/components/transactions/RewardsDistributor/ClaimRewardsModal';

interface VaultsRewardModalProps {
  open: boolean;
  handleClose: () => void;
  userAddress: string;
}

export const VaultsRewardModal = ({ open, handleClose, userAddress }: VaultsRewardModalProps) => {
  const { data: userData, isLoading, isError } = useUserData(userAddress);

  if (!userData || isLoading || isError) {
    return null;
  }

  return (
    <ClaimRewardsModal
      open={open}
      handleClose={handleClose}
      userAddress={userAddress}
      rewards={userData?.userRewards}
    />
  )
};
