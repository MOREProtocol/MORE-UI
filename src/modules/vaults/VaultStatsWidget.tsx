import { valueToBigNumber } from '@aave/math-utils';
import { Box, Button, Skeleton, Typography, useMediaQuery, useTheme } from '@mui/material';
import { formatUnits } from 'ethers/lib/utils';
import { useMemo, useState } from 'react';
import { useVault } from 'src/hooks/vault/useVault';
import {
  useDeployedVaults,
  useUserData,
  useUserVaultsData,
  useVaultsListData,
  useAssetsData,
} from 'src/hooks/vault/useVaultData';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { VaultsRewardModal } from './VaultsRewardModal';

export const VaultStatsWidget = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { accountAddress } = useVault();
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);

  const deployedVaultsQuery = useDeployedVaults();
  const vaultIds = deployedVaultsQuery?.data || [];

  const vaultsQuery = useVaultsListData(vaultIds);
  const isLoadingVaults = vaultsQuery?.isLoading;
  const vaults = vaultsQuery?.data;

  const userVaultsQuery = useUserVaultsData(accountAddress, vaultIds);
  const userVaults = userVaultsQuery?.map(vault => vault.data) || [];
  const isLoadingUserVaults = userVaultsQuery?.some(vault => vault.isLoading);

  const userDataQuery = useUserData(accountAddress);
  const userData = userDataQuery?.data;
  const isLoadingUserData = userDataQuery?.isLoading;

  // Get unique asset addresses from vaults
  const uniqueAssetAddresses = useMemo(() => {
    if (!vaults) return [];
    const addresses = vaults
      .map(vault => vault?.overview?.asset?.address)
      .filter(Boolean) as string[];
    return [...new Set(addresses)];
  }, [vaults]);

  // Get asset data for all unique assets
  const assetsDataQuery = useAssetsData(uniqueAssetAddresses);

  // Create a map of asset address to price data
  const assetPriceMap = useMemo(() => {
    const map = new Map();
    if (assetsDataQuery.data) {
      assetsDataQuery.data.forEach((assetData) => {
        if (assetData) {
          map.set(assetData.address.toLowerCase(), assetData.price || 0);
        }
      });
    }
    return map;
  }, [assetsDataQuery.data]);

  const loading = isLoadingVaults || isLoadingUserVaults || isLoadingUserData || assetsDataQuery.isLoading;

  // Calculate TVL and user deposits
  const aggregatedStats = useMemo(
    () =>
      !loading &&
      vaults?.length > 0 &&
      vaults.reduce(
        (acc, vault, index) => {
          const assetAddress = vault?.overview?.asset?.address?.toLowerCase();
          const vaultTVLPrice = assetPriceMap.get(assetAddress) || 0;
          const vaultTVLValue =
            Number(
              formatUnits(
                vault?.financials?.liquidity?.totalAssets || 0,
                vault?.overview?.asset?.decimals
              )
            ) * vaultTVLPrice;

          const userVault = userVaults && userVaults[index];
          const userVaultDepositsValue =
            Number(
              formatUnits(userVault?.maxWithdraw || 0, vault?.overview?.asset?.decimals)
            ) * vaultTVLPrice;
          return {
            tvl: acc.tvl.plus(vaultTVLValue),
            userDeposits: acc.userDeposits.plus(userVaultDepositsValue),
          };
        },
        {
          tvl: valueToBigNumber(0),
          userDeposits: valueToBigNumber(0),
        }
      ),
    [vaults, userVaults, loading, assetPriceMap]
  );

  const claimableRewardsUsd = useMemo(() => userData?.userRewards?.reduce((acc, reward) => acc + reward.rewardAmountToClaimInUSD, 0) || 0, [userData]);
  const handleOpenRewardModal = () => {
    if (accountAddress) {
      setIsRewardModalOpen(true);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: isMobile ? 3 : 8,
        p: 3,
        minWidth: 250,
        backgroundColor: 'background.surface',
        borderRadius: 2,
      }}
    >
      {/* TVL */}
      <Box>
        <Typography variant="secondary14" color="text.secondary" sx={{ mb: 1 }}>
          Total Value Locked
        </Typography>
        {loading ? (
          <Skeleton width={100} height={24} />
        ) : (
          <FormattedNumber
            value={aggregatedStats?.tvl?.toString() || '0'}
            symbol="USD"
            symbolsVariant="secondary16"
            symbolsColor="text.secondary"
            variant="main16"
          />
        )}
      </Box>

      {/* User Deposits */}
      {accountAddress && (
        <Box>
          <Typography variant="secondary14" color="text.secondary" sx={{ mb: 1 }}>
            My Deposits
          </Typography>
          {loading ? (
            <Skeleton width={100} height={24} />
          ) : (
            <FormattedNumber
              value={aggregatedStats?.userDeposits?.toString() || '0'}
              symbol="USD"
              symbolsVariant="secondary14"
              symbolsColor="text.secondary"
              variant="main16"
            />
          )}
        </Box>
      )}

      {/* User Rewards Button */}
      {accountAddress && userData && userData.userRewards && userData.userRewards.length > 0 && claimableRewardsUsd > 0 && (
        <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: { xs: 'flex-start', xsm: 'center' },
              flexDirection: { xs: 'column', xsm: 'row' },
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'left' }}>
              <Typography variant="secondary14" color="text.secondary" sx={{ mb: 1 }}>Available Rewards</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                <FormattedNumber
                  value={claimableRewardsUsd}
                  variant="main16"
                  visibleDecimals={2}
                  compact
                  symbol="USD"
                  symbolsColor="#A5A8B6"
                  symbolsVariant="secondary16"
                />
                <Button
                  variant="gradient"
                  size="small"
                  onClick={handleOpenRewardModal}
                  sx={{ minWidth: 'unset', ml: { xs: 0, xsm: 2 } }}
                  disabled={!accountAddress || claimableRewardsUsd === 0}
                >
                  Claim
                </Button>
              </Box>
            </Box>


          </Box>
        </Box>
      )}

      <VaultsRewardModal
        open={isRewardModalOpen}
        handleClose={() => setIsRewardModalOpen(false)}
        userAddress={accountAddress || ''}
      />
    </Box>
  );
}; 