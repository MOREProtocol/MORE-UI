import { ChainId } from '@aave/contract-helpers';
import { normalize, UserIncentiveData, valueToBigNumber } from '@aave/math-utils';
import { Box, Button, Typography, useMediaQuery, useTheme } from '@mui/material';
import Link from 'next/link';
import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { NetAPYTooltip } from 'src/components/infoTooltips/NetAPYTooltip';
import { getMarketInfoById } from 'src/components/MarketSwitcher';
import { ROUTES } from 'src/components/primitives/Link';
import { PageTitle } from 'src/components/TopInfoPanel/PageTitle';
import { useModalContext } from 'src/hooks/useModal';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { useRootStore } from 'src/store/root';
import { selectIsMigrationAvailable } from 'src/store/v3MigrationSelectors';
import { DASHBOARD, GENERAL } from 'src/utils/mixPanelEvents';

import HALLink from '../../components/HALLink';
import { HealthFactorNumber } from '../../components/HealthFactorNumber';
import { FormattedNumber } from '../../components/primitives/FormattedNumber';
import { NoData } from '../../components/primitives/NoData';
import { TopInfoPanel } from '../../components/TopInfoPanel/TopInfoPanel';
import { TopInfoPanelItem } from '../../components/TopInfoPanel/TopInfoPanelItem';
import { useAppDataContext } from '../../hooks/app-data-provider/useAppDataProvider';
import { LiquidationRiskParametresInfoModal } from './LiquidationRiskParametresModal/LiquidationRiskParametresModal';
import { CustomMarket } from 'src/ui-config/marketsConfig';
import { RewardItemEnriched } from 'src/hooks/vault/useVaultData';
import { ClaimRewardsModal } from 'src/components/transactions/RewardsDistributor/ClaimRewardsModal';

export const DashboardTopPanel = () => {
  const { currentNetworkConfig, currentMarketData, currentMarket, setCurrentMarket } = useRootStore();
  const { market } = getMarketInfoById(currentMarket);
  const { user, reserves, loading } = useAppDataContext();
  const { currentAccount } = useWeb3Context();
  const [open, setOpen] = useState(false);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const { openClaimRewards } = useModalContext();
  const trackEvent = useRootStore((store) => store.trackEvent);
  const isMigrateToV3Available = useRootStore((state) => selectIsMigrationAvailable(state));
  const showMigrateButton = user
    ? isMigrateToV3Available && currentAccount !== '' && Number(user.totalLiquidityUSD) > 0
    : false;
  const theme = useTheme();
  const downToSM = useMediaQuery(theme.breakpoints.down('sm'));

  // Transform userPoolRewards to RewardItemEnriched format
  const transformedUserPoolRewards = useMemo(() => {
    if (!user?.userPoolRewards || !reserves) return [];

    return user.userPoolRewards
      .filter(poolReward => Number(poolReward.net_claimable_amount) > 0)
      .map(poolReward => {
        const rewardTokenReserve = reserves.find(
          (reserve) => reserve.underlyingAsset.toLowerCase() === poolReward.reward_token_address.toLowerCase()
        );

        if (!rewardTokenReserve) return null;

        const rewardBalance = normalize(
          poolReward.net_claimable_amount,
          rewardTokenReserve.decimals
        );

        const rewardBalanceUsd = Number(rewardBalance) * Number(rewardTokenReserve.priceInUSD);

        return {
          reward_token_address: poolReward.reward_token_address,
          // reward_amount_wei: poolReward.net_claimable_amount,
          reward_amount_wei: poolReward.reward_amount_wei,
          merkle_proof: poolReward.merkle_proof,
          rewardContractAddress: poolReward.reward_contract_address,
          symbol: rewardTokenReserve.symbol,
          name: rewardTokenReserve.name,
          decimals: rewardTokenReserve.decimals,
          price: Number(rewardTokenReserve.priceInUSD),
          rewardAmountToClaim: Number(poolReward.net_claimable_amount),
          rewardAmountToClaimInUSD: rewardBalanceUsd,
        } as RewardItemEnriched;
      })
      .filter(Boolean) as RewardItemEnriched[];
  }, [user?.userPoolRewards, reserves]);

  // To prevent all markets from being selected in dashboard view
  useEffect(() => {
    if (currentMarket === 'all_markets') {
      setCurrentMarket(CustomMarket.proto_flow_v3);
    }
  }, [currentMarket]);

  const { claimableRewardsUsd } = user
    ? Object.keys(user.calculatedUserIncentives).reduce(
      (acc, rewardTokenAddress) => {
        const incentive: UserIncentiveData = user.calculatedUserIncentives[rewardTokenAddress];
        const rewardBalance = normalize(
          incentive.claimableRewards,
          incentive.rewardTokenDecimals
        );

        let tokenPrice = 0;
        // getting price from reserves for the native rewards for v2 markets
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

        if (rewardBalanceUsd > 0) {
          if (acc.assets.indexOf(incentive.rewardTokenSymbol) === -1) {
            acc.assets.push(incentive.rewardTokenSymbol);
          }

          acc.claimableRewardsUsd += Number(rewardBalanceUsd);
        }

        return acc;
      },
      { claimableRewardsUsd: 0, assets: [] } as { claimableRewardsUsd: number; assets: string[] }
    )
    : { claimableRewardsUsd: 0 };

  const { userPoolRewardsUsd } = user?.userPoolRewards
    ? user.userPoolRewards.reduce(
      (acc, poolReward) => {
        const rewardTokenReserve = reserves.find(
          (reserve) => reserve.underlyingAsset.toLowerCase() === poolReward.reward_token_address.toLowerCase()
        );

        if (rewardTokenReserve && Number(poolReward.net_claimable_amount) > 0) {
          // Convert wei to human readable amount using token decimals
          const rewardBalance = normalize(
            poolReward.net_claimable_amount,
            rewardTokenReserve.decimals
          );

          const tokenPrice = Number(rewardTokenReserve.priceInUSD);
          const rewardBalanceUsd = Number(rewardBalance) * tokenPrice;

          if (rewardBalanceUsd > 0) {
            if (acc.assets.indexOf(rewardTokenReserve.symbol) === -1) {
              acc.assets.push(rewardTokenReserve.symbol);
            }

            acc.userPoolRewardsUsd += Number(rewardBalanceUsd);
          }
        }

        return acc;
      },
      { userPoolRewardsUsd: 0, assets: [] } as { userPoolRewardsUsd: number; assets: string[] }
    )
    : { userPoolRewardsUsd: 0 };

  const loanToValue =
    user?.totalCollateralMarketReferenceCurrency === '0'
      ? '0'
      : valueToBigNumber(user?.totalBorrowsMarketReferenceCurrency || '0')
        .dividedBy(user?.totalCollateralMarketReferenceCurrency || '1')
        .toFixed();

  const valueTypographyVariant = downToSM ? 'main16' : 'main21';
  const noDataTypographyVariant = downToSM ? 'secondary16' : 'secondary21';

  return (
    <>
      {showMigrateButton && downToSM && (
        <Box sx={{ width: '100%' }}>
          <Link href={ROUTES.migrationTool}>
            <Button
              variant="gradient"
              sx={{
                height: '40px',
                width: '100%',
              }}
            >
              <Typography variant="buttonM">Migrate to {market.marketTitle} v3 Market</Typography>
            </Button>
          </Link>
        </Box>
      )}
      <TopInfoPanel
        titleComponent={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PageTitle
              pageTitle={'Dashboard'}
              withMarketSwitcher={true}
              showAllMarkets={false}
              bridge={currentNetworkConfig.bridge}
            />
            {showMigrateButton && !downToSM && (
              <Box sx={{ alignSelf: 'center', mb: 4, width: '100%' }}>
                <Link href={ROUTES.marketMigrationTool(currentMarket)}>
                  <Button variant="gradient" sx={{ height: '20px' }}>
                    <Typography variant="buttonS" data-cy={`migration-button`}>
                      Migrate to v3
                    </Typography>
                  </Button>
                </Link>
              </Box>
            )}
          </Box>
        }
      >
        <TopInfoPanelItem title={'Net worth'} loading={loading} hideIcon>
          {currentAccount ? (
            <FormattedNumber
              value={Number(user?.netWorthUSD || 0)}
              symbol="USD"
              variant={valueTypographyVariant}
              visibleDecimals={2}
              compact
              symbolsColor="#A5A8B6"
              symbolsVariant={noDataTypographyVariant}
            />
          ) : (
            <NoData variant={noDataTypographyVariant} sx={{ opacity: '0.7' }} />
          )}
        </TopInfoPanelItem>

        <TopInfoPanelItem
          title={
            <div style={{ display: 'flex' }}>
              Net APY
              <NetAPYTooltip
                event={{
                  eventName: GENERAL.TOOL_TIP,
                  eventParams: { tooltip: 'NET APY: Dashboard Banner' },
                }}
              />
            </div>
          }
          loading={loading}
          hideIcon
        >
          {currentAccount && user && Number(user.netWorthUSD) > 0 ? (
            <FormattedNumber
              value={user ? user.netAPY : 0}
              variant={valueTypographyVariant}
              visibleDecimals={2}
              percent
              symbolsColor="#A5A8B6"
              symbolsVariant={noDataTypographyVariant}
            />
          ) : (
            <NoData variant={noDataTypographyVariant} sx={{ opacity: '0.7' }} />
          )}
        </TopInfoPanelItem>

        {currentAccount && user?.healthFactor !== '-1' && (
          <TopInfoPanelItem
            title={<Box sx={{ display: 'inline-flex', alignItems: 'center' }}>Health factor</Box>}
            loading={loading}
            hideIcon
          >
            <HealthFactorNumber
              value={user?.healthFactor || '-1'}
              variant={valueTypographyVariant}
              onInfoClick={() => {
                trackEvent(DASHBOARD.VIEW_RISK_DETAILS);
                setOpen(true);
              }}
              HALIntegrationComponent={
                currentMarketData.halIntegration && (
                  <HALLink
                    healthFactor={user?.healthFactor || '-1'}
                    marketName={currentMarketData.halIntegration.marketName}
                    integrationURL={currentMarketData.halIntegration.URL}
                  />
                )
              }
            />
          </TopInfoPanelItem>
        )}

        {currentAccount && claimableRewardsUsd > 0 && (
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
                  symbolsVariant={noDataTypographyVariant}
                  data-cy={'Claim_Value'}
                />
              </Box>

              <Button
                variant="gradient"
                size="small"
                onClick={() => openClaimRewards()}
                sx={{ minWidth: 'unset', ml: { xs: 0, xsm: 2 } }}
                data-cy={'Dashboard_Claim_Button'}
              >
                Claim
              </Button>
            </Box>
          </TopInfoPanelItem>
        )}
        {currentAccount && userPoolRewardsUsd > 0 && (
          <TopInfoPanelItem title={'Claimable MORE Incentives'} loading={loading} hideIcon>
            <Box
              sx={{
                display: 'flex',
                alignItems: { xs: 'flex-start', xsm: 'center' },
                flexDirection: { xs: 'column', xsm: 'row' },
              }}
            >
              <Box sx={{ display: 'inline-flex', alignItems: 'center' }} data-cy={'Claim_Box'}>
                <FormattedNumber
                  value={userPoolRewardsUsd}
                  variant={valueTypographyVariant}
                  visibleDecimals={2}
                  compact
                  symbol="USD"
                  symbolsColor="#A5A8B6"
                  symbolsVariant={noDataTypographyVariant}
                  data-cy={'Claim_Value'}
                />
              </Box>

              <Button
                variant="gradient"
                size="small"
                onClick={() => setClaimModalOpen(true)}
                sx={{ minWidth: 'unset', ml: { xs: 0, xsm: 2 } }}
                data-cy={'Dashboard_Claim_Button'}
              >
                Claim
              </Button>
            </Box>
          </TopInfoPanelItem>
        )}
      </TopInfoPanel>
      <LiquidationRiskParametresInfoModal
        open={open}
        setOpen={setOpen}
        healthFactor={user?.healthFactor || '-1'}
        loanToValue={loanToValue}
        currentLoanToValue={user?.currentLoanToValue || '0'}
        currentLiquidationThreshold={user?.currentLiquidationThreshold || '0'}
      />
      <ClaimRewardsModal
        open={claimModalOpen}
        handleClose={() => setClaimModalOpen(false)}
        userAddress={currentAccount}
        rewards={transformedUserPoolRewards}
      />
    </>
  );
};
