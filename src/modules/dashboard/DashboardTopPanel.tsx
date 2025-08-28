import { ChainId } from '@aave/contract-helpers';
import { normalize, UserIncentiveData, valueToBigNumber } from '@aave/math-utils';
import { Box, Button, Typography, useMediaQuery, useTheme } from '@mui/material';
import Link from 'next/link';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { NetAPYTooltip } from 'src/components/infoTooltips/NetAPYTooltip';
import { TextWithTooltip } from 'src/components/TextWithTooltip';
import { getMarketInfoById } from 'src/components/MarketSwitcher';
import { ROUTES } from 'src/components/primitives/Link';
import { PageTitle } from 'src/components/TopInfoPanel/PageTitle';
import { useModalContext } from 'src/hooks/useModal';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { useRootStore } from 'src/store/root';
import { useUserPoolReservesRewardsHumanized } from 'src/hooks/pool/useUserPoolReservesRewards';
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

export const DashboardTopPanel = () => {
  const { currentNetworkConfig, currentMarketData, currentMarket, setCurrentMarket } = useRootStore();
  const { market } = getMarketInfoById(currentMarket);
  const { user, reserves, loading } = useAppDataContext();
  const { currentAccount } = useWeb3Context();
  const [open, setOpen] = useState(false);
  const { openClaimRewards } = useModalContext();
  const trackEvent = useRootStore((store) => store.trackEvent);
  const isMigrateToV3Available = useRootStore((state) => selectIsMigrationAvailable(state));
  const showMigrateButton = user
    ? isMigrateToV3Available && currentAccount !== '' && Number(user.totalLiquidityUSD) > 0
    : false;
  const theme = useTheme();
  const downToSM = useMediaQuery(theme.breakpoints.down('sm'));

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

  // New rewards system values
  const userPoolRewardsQuery = useUserPoolReservesRewardsHumanized(currentMarketData);
  const distributedRewards = userPoolRewardsQuery?.data?.distributed || [];
  const accruingRewards = userPoolRewardsQuery?.data?.accruing || [];

  const claimableRewardsUsdNew = distributedRewards.reduce((acc, r) => {
    const reserve = reserves.find((res) => res.underlyingAsset.toLowerCase() === r.reward_token_address.toLowerCase());
    const decimals = reserve ? Number(reserve.decimals || 18) : 18;
    const price = reserve ? Number(reserve.priceInUSD || 0) : 0;
    const netTokens = valueToBigNumber(r.net_claimable_amount).dividedBy(valueToBigNumber(10).pow(decimals));
    return acc + netTokens.multipliedBy(price).toNumber();
  }, 0);

  const accruingRewardsUsdNew = accruingRewards.reduce((acc, r) => {
    const reserve = reserves.find((res) => res.underlyingAsset.toLowerCase() === r.reward_token_address.toLowerCase());
    const decimals = reserve ? Number(reserve.decimals || 18) : 18;
    const price = reserve ? Number(reserve.priceInUSD || 0) : 0;
    const estTokens = valueToBigNumber(r.amount_wei_estimated).dividedBy(valueToBigNumber(10).pow(decimals));
    return acc + estTokens.multipliedBy(price).toNumber();
  }, 0);

  // Latest update time for accruing rewards
  const lastAccruingUpdateAt = accruingRewards.reduce((max, r) => {
    const updatedAt = Number(r?.updated_at || 0);
    return updatedAt > max ? updatedAt : max;
  }, 0);
  const lastAccruingUpdateAtDate = lastAccruingUpdateAt
    ? new Date(lastAccruingUpdateAt > 1e12 ? lastAccruingUpdateAt : lastAccruingUpdateAt * 1000)
    : undefined;

  const totalClaimableUsd = claimableRewardsUsd + claimableRewardsUsdNew;

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

        {currentAccount && (totalClaimableUsd > 0 || accruingRewardsUsdNew > 0) && (
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
                  value={totalClaimableUsd}
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
        {accruingRewardsUsdNew > 0 && (
          <TopInfoPanelItem
            title={
              <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                Accruing rewards
                {lastAccruingUpdateAtDate && (
                  <TextWithTooltip iconMargin={0.5}>
                    <>
                      {`Last update: ${lastAccruingUpdateAtDate.toLocaleString()}`}
                    </>
                  </TextWithTooltip>
                )}
              </Box>
            }
            loading={loading}
            hideIcon
          >
            <FormattedNumber
              value={accruingRewardsUsdNew}
              variant={valueTypographyVariant}
              visibleDecimals={2}
              compact
              symbol="USD"
              symbolsColor="#A5A8B6"
              symbolsVariant={noDataTypographyVariant}
            />
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
    </>
  );
};
