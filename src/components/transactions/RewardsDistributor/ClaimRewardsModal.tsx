import { Box, Typography, CircularProgress, Theme, Button, Link, Alert, FormControl, Select, MenuItem } from '@mui/material';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { RewardItemEnriched } from 'src/hooks/vault/useVaultData';
import { UserAuthenticated } from 'src/components/UserAuthenticated';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { ClaimRewardsModalContent as LegacyClaimRewardsModalContent } from '../ClaimRewards/ClaimRewardsModalContent';
// Close button removed; BasicModal provides close control
import LaunchIcon from '@mui/icons-material/Launch';
import { ethers, Signer } from 'ethers';
import { useWalletClient, useChainId, useSwitchChain } from 'wagmi';
import { useEffect, useState } from 'react';
import { getNetworkConfig, getProvider } from 'src/utils/marketsAndNetworksConfig';
import { ChainIds } from 'src/utils/const';

// Smart contract ABI and helpers (kept together and factorized)
const REWARD_CONTRACT_ABI = [
  'function root() external view returns (bytes32)',
  'function claim(address account, address reward, uint256 claimable, bytes32[] calldata proof) external returns (uint256)'
];

const getRewardContract = (
  address: string,
  providerOrSigner: ethers.providers.Provider | Signer
) => new ethers.Contract(address, REWARD_CONTRACT_ABI, providerOrSigner);

const fetchOnChainRoot = async (
  rewardContractAddress: string,
  provider: ethers.providers.Provider
): Promise<string> => {
  const contract = getRewardContract(rewardContractAddress, provider);
  const onChainRoot: string = await contract.root();
  return (onChainRoot || '').toLowerCase();
};

// Safe error message extractor
const getErrorMessage = (e: unknown, fallback: string): string => {
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object') {
    const err = e as { message?: string; reason?: string; error?: { message?: string } };
    return err?.error?.message || err?.message || err?.reason || fallback;
  }
  return fallback;
};

type NewRewardItem = RewardItemEnriched & {
  reward_token_address: string;
  reward_amount_wei: string;
  merkle_proof: string[];
  merkle_root?: string;
};

interface ClaimRewardsModalProps {
  open: boolean;
  userAddress: string;
  rewards: NewRewardItem[];
  onClaimSuccess?: (claimedRewardAddresses: string[]) => void;
  legacyAvailable?: boolean;
}

export const ClaimRewardsModal = ({ open, userAddress, rewards, onClaimSuccess, legacyAvailable = false }: ClaimRewardsModalProps) => {
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [signer, setSigner] = useState<Signer | null>(null);
  const [loadingClaims, setLoadingClaims] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<'new' | 'legacy'>(legacyAvailable ? 'legacy' : 'new');
  const [claimErrors, setClaimErrors] = useState<Record<string, string>>({});
  const [claimedRewards, setClaimedRewards] = useState<Set<string>>(new Set());
  const [transactionHashes, setTransactionHashes] = useState<Record<string, string>>({});
  // Local copy to avoid UI disappearing when parent rewards prop updates to empty
  const [localRewards, setLocalRewards] = useState<NewRewardItem[]>(rewards || []);
  const [freezeRewards, setFreezeRewards] = useState<boolean>(false);
  // On-chain merkle roots by reward contract
  const [contractRoots, setContractRoots] = useState<Record<string, string>>({});
  const [loadingRoots, setLoadingRoots] = useState<boolean>(false);

  // Check if user is on a supported Flow network
  const isOnSupportedNetwork = chainId === ChainIds.flowEVMMainnet || chainId === ChainIds.flowEVMTestnet;
  const shouldShowNetworkWarning = userAddress && !isOnSupportedNetwork;

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

  // Reset transient state when modal open state changes to avoid stale UI
  useEffect(() => {
    if (!open) {
      setLoadingClaims({});
      setClaimErrors({});
      setClaimedRewards(new Set());
      setTransactionHashes({});
      setMode(legacyAvailable ? 'legacy' : 'new');
      setFreezeRewards(false);
      setLocalRewards(rewards || []);
    }
  }, [open, legacyAvailable]);

  // If legacy becomes unavailable, ensure mode switches to 'new'
  useEffect(() => {
    if (!legacyAvailable && mode !== 'new') {
      setMode('new');
    }
  }, [legacyAvailable, mode]);

  // Keep a local snapshot of rewards while the modal is open; after a claim, freeze to prevent disappearance
  useEffect(() => {
    if (open && !freezeRewards) {
      setLocalRewards(rewards || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rewards, open]);

  // Keep items visible if claimed this session so user can open the explorer link
  const rewardsToDisplay = (localRewards || [])?.filter(
    (reward) => reward.rewardAmountToClaim > 0 || claimedRewards.has(reward.reward_token_address)
  );
  const { reserves } = useAppDataContext();

  // Fetch on-chain roots for involved reward contracts and keep polling while modal is open
  useEffect(() => {

    const run = async () => {
      try {
        if (!open || !rewardsToDisplay || rewardsToDisplay.length === 0) return;
        const uniqueContracts = Array.from(
          new Set(
            rewardsToDisplay
              .map((r) => (r.rewardContractAddress || '').toLowerCase())
              .filter(Boolean)
          )
        );
        if (uniqueContracts.length === 0) return;

        setLoadingRoots(true);
        // Always read from Flow networks; if wallet is on another network, fallback to Flow Mainnet
        const targetChainId = (chainId === ChainIds.flowEVMMainnet || chainId === ChainIds.flowEVMTestnet)
          ? chainId
          : ChainIds.flowEVMMainnet;
        const provider = (signer?.provider as ethers.providers.Provider) || (getProvider(targetChainId) as unknown as ethers.providers.Provider);


        const entries = await Promise.all(
          uniqueContracts.map(async (addr) => {
            try {
              const root = await fetchOnChainRoot(addr, provider);
              return [addr, root] as const;
            } catch {
              return [addr, '0x'] as const;
            }
          })
        );


        setContractRoots((prev) => {
          const next = { ...prev };
          entries.forEach(([addr, root]) => {
            next[addr] = root;
          });
          return next;
        });
      } finally {
        setLoadingRoots(false);
      }
    };

    run();
    // Poll every 20s while modal is open
    const interval = setInterval(run, 20000);
    return () => {
      clearInterval(interval);
    };
  }, [open, chainId, signer, JSON.stringify(rewardsToDisplay?.map(r => r.rewardContractAddress || '').sort())]);

  const isRewardPendingRoot = (reward: NewRewardItem): boolean => {
    const apiRoot = (reward.merkle_root || '').toLowerCase();
    const contractAddr = (reward.rewardContractAddress || '').toLowerCase();
    const onChainRoot = (contractRoots[contractAddr] || '').toLowerCase();
    const pending = !!apiRoot && !!onChainRoot && apiRoot !== onChainRoot;
    if (!apiRoot || !onChainRoot) {

      return false;
    }

    return pending;
  };

  const anyPendingRoot = (rewardsToDisplay || []).some((r) => isRewardPendingRoot(r));


  const getExplorerUrl = (txHash: string) => {
    const networkConfig = getNetworkConfig(chainId);
    return networkConfig.explorerLinkBuilder({ tx: txHash });
  };

  const handleViewTransaction = (txHash: string) => {
    window.open(getExplorerUrl(txHash), '_blank', 'noopener,noreferrer');
  };

  const handleSwitchToFlowNetwork = async () => {
    try {
      // Default to Flow EVM Mainnet, but could be made configurable
      await switchChain?.({ chainId: ChainIds.flowEVMMainnet });
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  const handleClaim = async (reward: NewRewardItem) => {
    const rewardKey = reward.reward_token_address;

    // Set loading state
    setLoadingClaims(prev => ({ ...prev, [rewardKey]: true }));

    // Clear any previous errors
    setClaimErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[rewardKey];
      return newErrors;
    });

    try {
      // Guard: require connected wallet and signer
      if (!signer || !userAddress) {
        throw new Error('Please connect your wallet to claim rewards.');
      }
      // Guard: prevent sending if contract root not updated yet
      if (isRewardPendingRoot(reward)) {
        throw new Error('Pending multisig update: reward distribution not yet active on-chain. Please try again later.');
      }

      const rewardContract = getRewardContract(reward.rewardContractAddress, signer as Signer);

      // Preflight simulation to catch any revert reason before sending
      try {
        if (rewardContract.callStatic) {
          await rewardContract.callStatic.claim(
            userAddress,
            reward.reward_token_address,
            reward.reward_amount_wei,
            reward.merkle_proof
          );
        }
      } catch (simErr: unknown) {
        const reason = getErrorMessage(simErr, 'Claim simulation failed');
        throw new Error(reason || 'Claim simulation failed');
      }

      const tx = await rewardContract.claim(userAddress, reward.reward_token_address, reward.reward_amount_wei, reward.merkle_proof);
      await tx.wait();

      // Store transaction hash
      setTransactionHashes(prev => ({ ...prev, [rewardKey]: tx.hash }));

      // Mark as claimed
      setClaimedRewards(prev => new Set(prev).add(rewardKey));

      // Freeze incoming rewards updates so UI doesn't disappear mid-session
      setFreezeRewards(true);

      // Call success callback for data refresh
      if (onClaimSuccess) {
        onClaimSuccess([reward.reward_token_address]);
      }
    } catch (error: unknown) {
      console.error('Error claiming reward:', error);
      setClaimErrors(prev => ({
        ...prev,
        [rewardKey]: getErrorMessage(error, 'Failed to claim reward. Please try again.')
      }));
    } finally {
      setLoadingClaims(prev => ({ ...prev, [rewardKey]: false }));
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h3">
          Claim MORE Incentives
        </Typography>
      </Box>

      {legacyAvailable && rewardsToDisplay && rewardsToDisplay.length > 0 && (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <Select value={mode} onChange={(e) => setMode(e.target.value as 'new' | 'legacy')}>
            <MenuItem value="legacy">Legacy incentives</MenuItem>
            <MenuItem value="new">New incentives</MenuItem>
          </Select>
        </FormControl>
      )}

      {/* Network Status Check */}
      {shouldShowNetworkWarning && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="main14">
            Wrong Network{' '}
            <Typography
              component="span"
              variant="main14"
              onClick={handleSwitchToFlowNetwork}
              sx={{
                textDecoration: 'underline',
                cursor: 'pointer',
                '&:hover': {
                  color: 'primary.dark',
                },
              }}
            >
              Please switch to Flow EVM
            </Typography>
            {' '}to claim rewards
          </Typography>
        </Alert>
      )}

      {/* Distribution status check */}
      {open && rewardsToDisplay && rewardsToDisplay.length > 0 && anyPendingRoot && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="main14">
            Rewards will soon be available and are currently pending approval from the Incentives Distributor.
          </Typography>
        </Alert>
      )}

      {!userAddress && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="main14">
            Please connect your wallet to claim rewards
          </Typography>
        </Alert>
      )}

      {mode === 'new' && (!rewards || rewardsToDisplay?.length === 0) && !legacyAvailable && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {mode === 'new' && (!rewardsToDisplay || rewardsToDisplay.length === 0) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <Typography color="error" sx={{ my: 2 }}>
            You have no rewards available to claim.
          </Typography>
        </Box>
      )}

      {mode === 'new' && rewardsToDisplay && rewardsToDisplay.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" mb={8}>
            {
              'This incentive program is funded by third party donors. Claims are processed on a weekly basis. MORE does not guarantee the program and accepts no liability for it. '
            }
            <Link
              href="https://docs.more.markets/resources/incentives"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ textDecoration: 'underline' }}
              variant="caption"
              color="text.secondary"
            >
              Read more
            </Link>
          </Typography>
          {rewardsToDisplay.map((reward) => (
            <Box key={reward.reward_token_address}>
              <Box
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
                      <FormattedNumber value={reward.rewardAmountToClaim} symbol={reward.symbol} variant="secondary14" />
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
                    {isRewardPendingRoot(reward) && (
                      <Typography variant="caption" color="warning.main">
                        Pending on-chain update
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  {claimedRewards.has(reward.reward_token_address) ? (
                    <Button
                      variant="outlined"
                      onClick={() => handleViewTransaction(transactionHashes[reward.reward_token_address])}
                      sx={{
                        minWidth: 'unset',
                        ml: { xs: 0, xsm: 2 },
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5
                      }}
                    >
                      View Tx
                      <LaunchIcon sx={{ fontSize: '14px' }} />
                    </Button>
                  ) : (
                    <Button
                      variant="gradient"
                      onClick={() => handleClaim(reward)}
                      disabled={
                        loadingClaims[reward.reward_token_address] ||
                        shouldShowNetworkWarning ||
                        isRewardPendingRoot(reward) ||
                        loadingRoots ||
                        !signer ||
                        !userAddress
                      }
                      sx={{
                        minWidth: 72,
                        height: 36,
                        ml: { xs: 0, xsm: 2 },
                        position: 'relative'
                      }}
                    >
                      {loadingClaims[reward.reward_token_address] ? (
                        <CircularProgress size={16} sx={{ color: 'inherit' }} />
                      ) : isRewardPendingRoot(reward) ? (
                        'Waiting'
                      ) : (
                        'Claim'
                      )}
                    </Button>
                  )}
                </Box>
              </Box>
              {claimErrors[reward.reward_token_address] && (
                <Alert
                  severity="error"
                  sx={{ mt: 1, mb: 1 }}
                  onClose={() => setClaimErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[reward.reward_token_address];
                    return newErrors;
                  })}
                >
                  {claimErrors[reward.reward_token_address]}
                </Alert>
              )}
            </Box>
          ))}
        </Box>
      )}

      {legacyAvailable && mode === 'legacy' && (
        <UserAuthenticated>
          {(user) => <LegacyClaimRewardsModalContent user={user} reserves={reserves} />}
        </UserAuthenticated>
      )}
    </>
  );
};