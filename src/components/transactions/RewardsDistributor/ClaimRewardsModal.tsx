import { Box, Typography, Modal, IconButton, Paper, CircularProgress, Theme, Button, Link } from '@mui/material';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { RewardItemEnriched } from 'src/hooks/vault/useVaultData';
import CloseIcon from '@mui/icons-material/Close';
import { ethers, Signer } from 'ethers';
import { formatUnits } from 'ethers/lib/utils';
import { useWalletClient } from 'wagmi';
import { useEffect, useState } from 'react';

interface ClaimRewardsModalProps {
  open: boolean;
  handleClose: () => void;
  userAddress: string;
  rewards: RewardItemEnriched[];
}

export const ClaimRewardsModal = ({ open, handleClose, userAddress, rewards }: ClaimRewardsModalProps) => {
  const { data: walletClient } = useWalletClient();
  const [signer, setSigner] = useState<Signer | null>(null)
  useEffect(() => {
    const getSigner = async () => {
      if (!walletClient) {
        setSigner(null);
        return;
      }
      const provider = new ethers.providers.Web3Provider(walletClient as ethers.providers.ExternalProvider);
      const signer = provider.getSigner();
      setSigner(signer as Signer);
    }
    getSigner();
  }, [walletClient]);

  const rewardsToDisplay = rewards?.filter(reward => reward.rewardAmountToClaim > 0);

  const handleClaim = async (reward: RewardItemEnriched) => {
    const rewardContract = new ethers.Contract(
      reward.rewardContractAddress,
      [`function claim(address account, address reward, uint256 claimable, bytes32[] calldata proof) external returns (uint256)`],
      signer
    );
    const tx = await rewardContract.claim(userAddress, reward.reward_token_address, reward.reward_amount_wei, reward.merkle_proof);
    await tx.wait();
  };

  return (
    <Modal open={open} onClose={handleClose} aria-labelledby="vaults-reward-modal-title">
      <Paper
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          borderRadius: '8px',
          outline: 'none',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h3">
            Claim MORE Incentives
          </Typography>
          <IconButton onClick={handleClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>

        {!rewards && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {!rewardsToDisplay && (
          <Typography color="error" sx={{ my: 2 }}>
            You have no rewards available to claim.
          </Typography>
        )}

        {rewardsToDisplay && rewardsToDisplay.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" mb={8}>
              {
                'This incentive program is funded by third party donors and facilitated by the MORE DAO. MORE does not guarantee the program and accepts no liability for it. '
              }
              <Link
                href="https://docs.more.markets/resources/incentives"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ textDecoration: 'underline' }}
                variant="caption"
                color="text.secondary"
              >
                Learn more
              </Link>
            </Typography>
            {rewardsToDisplay.map((reward) => (
              <Box
                key={reward.reward_token_address}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1.5,
                  borderBottom: (theme: Theme) => `1px solid ${theme.palette.divider}`,
                  '&:last-child': {
                    borderBottom: 'none',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TokenIcon symbol={reward.symbol} sx={{ mr: 1.5, fontSize: '24px' }} />
                  <Box>
                    <Typography variant="main14">
                      {reward.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FormattedNumber value={formatUnits(reward.rewardAmountToClaim.toString(), reward.decimals).toString()} symbol={reward.symbol} variant="secondary14" />
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="caption">(</Typography>
                        <FormattedNumber
                          value={reward.rewardAmountToClaimInUSD}
                          variant="caption"
                          compact
                          symbol="USD"
                          color="text.secondary"
                        />
                        <Typography variant="caption">)</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <Button
                    variant="gradient"
                    onClick={() => handleClaim(reward)}
                    sx={{ minWidth: 'unset', ml: { xs: 0, xsm: 2 } }}
                  >
                    Claim
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Modal>
  );
};
