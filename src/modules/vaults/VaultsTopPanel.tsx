import { valueToBigNumber } from '@aave/math-utils';
import { useMediaQuery, useTheme } from '@mui/material';
import { formatUnits } from 'ethers/lib/utils';
import { marketContainerProps } from 'pages/markets.page';
import { useMemo } from 'react';
import { useVault } from 'src/hooks/vault/useVault';
import {
  useDeployedVaults,
  // useUserData,
  useUserVaultsData,
  useVaultsListData,
} from 'src/hooks/vault/useVaultData';

import { FormattedNumber } from '../../components/primitives/FormattedNumber';
import { TopInfoPanel } from '../../components/TopInfoPanel/TopInfoPanel';
import { TopInfoPanelItem } from '../../components/TopInfoPanel/TopInfoPanelItem';
// import { VaultsRewardModal } from './VaultsRewardModal';

export const VaultsTopPanel = () => {
  const { accountAddress } = useVault();
  const deployedVaultsQuery = useDeployedVaults();
  const vaultIds = deployedVaultsQuery?.data || [];

  const vaultsQuery = useVaultsListData(vaultIds);
  const isLoadingVaults = vaultsQuery?.isLoading;
  const vaults = vaultsQuery?.data;

  const userVaultsQuery = useUserVaultsData(accountAddress, vaultIds);
  const userVaults = userVaultsQuery?.map(vault => vault.data);
  const isLoadingUserVaults = userVaultsQuery?.some(vault => vault.isLoading);

  // const userDataQuery = useUserData(accountAddress);
  // const userData = userDataQuery?.data;
  // const isLoadingUserData = userDataQuery?.isLoading;

  const loading = isLoadingUserVaults || isLoadingVaults;

  // const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);

  const theme = useTheme();
  const downToSM = useMediaQuery(theme.breakpoints.down('sm'));

  const aggregatedStats = useMemo(
    () =>
      !loading &&
      vaults?.reduce(
        (acc, vault, index) => {
          const vaultTVLPrice = Number(vault?.overview?.sharePriceInUSD || 0);
          const vaultTVLValue =
            Number(
              formatUnits(
                vault?.financials?.liquidity?.totalAssets || 0,
                vault?.overview?.asset?.decimals
              )
            ) * vaultTVLPrice;

          const userVault = userVaults[index];
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
    [vaults, userVaults, loading]
  );


  const valueTypographyVariant = downToSM ? 'main16' : 'main21';
  const symbolsVariant = downToSM ? 'secondary16' : 'secondary21';

  // const claimableRewardsUsd = useMemo(() => userData?.userRewards.reduce((acc, reward) => acc + reward.rewardAmountToClaimInUSD, 0), [userData]);
  // const handleOpenRewardModal = () => {
  //   if (accountAddress) {
  //     setIsRewardModalOpen(true);
  //   }
  // };
  // const handleCloseRewardModal = () => {
  //   setIsRewardModalOpen(false);
  // };

  return (
    <TopInfoPanel containerProps={marketContainerProps} pageTitle={'Vaults'}>
      <TopInfoPanelItem hideIcon title={'TVL'} loading={loading}>
        <FormattedNumber
          value={aggregatedStats?.tvl?.toString()}
          symbol="USD"
          variant={valueTypographyVariant}
          visibleDecimals={2}
          compact
          symbolsColor="#A5A8B6"
          symbolsVariant={symbolsVariant}
        />
      </TopInfoPanelItem>
      {aggregatedStats?.userDeposits?.gt(0) && (
        <TopInfoPanelItem hideIcon title={'My Deposits'} loading={loading}>
          <FormattedNumber
            value={aggregatedStats?.userDeposits?.toString()}
            symbol="USD"
            variant={valueTypographyVariant}
            visibleDecimals={2}
            compact
            symbolsColor="#A5A8B6"
            symbolsVariant={symbolsVariant}
          />
        </TopInfoPanelItem>
      )}
      {/* {claimableRewardsUsd > 0 && (
        <TopInfoPanelItem title={'Available rewards'} loading={loading} hideIcon>
          <Box
            sx={{
              display: 'flex',
              alignItems: { xs: 'flex-start', xsm: 'center' },
              flexDirection: { xs: 'column', xsm: 'row' },
            }}
          >
            <Box sx={{ display: 'inline-flex', alignItems: 'center' }} data-cy={'Claim_Box'}>
              <FormattedNumber
                value={claimableRewardsUsd}
                variant={valueTypographyVariant}
                visibleDecimals={2}
                compact
                symbol="USD"
                symbolsColor="#A5A8B6"
                symbolsVariant={symbolsVariant}
              />
            </Box>

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
        </TopInfoPanelItem>
      )}
      {accountAddress && (
        <VaultsRewardModal
          open={isRewardModalOpen}
          handleClose={handleCloseRewardModal}
          userAddress={accountAddress}
        />
      )} */}
    </TopInfoPanel>
  );
};
