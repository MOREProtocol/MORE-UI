import { valueToBigNumber } from '@aave/math-utils';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { AlertTitle, Box, Typography } from '@mui/material';
import { CapsCircularStatus } from 'src/components/caps/CapsCircularStatus';
import { DebtCeilingStatus } from 'src/components/caps/DebtCeilingStatus';
import { IncentivesButton, RewardsButton } from 'src/components/incentives/IncentivesButton';
import { LiquidationPenaltyTooltip } from 'src/components/infoTooltips/LiquidationPenaltyTooltip';
import { LiquidationThresholdTooltip } from 'src/components/infoTooltips/LiquidationThresholdTooltip';
import { MaxLTVTooltip } from 'src/components/infoTooltips/MaxLTVTooltip';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { Link } from 'src/components/primitives/Link';
import { Warning } from 'src/components/primitives/Warning';
import { ReserveOverviewBox } from 'src/components/ReserveOverviewBox';
import { ReserveSubheader } from 'src/components/ReserveSubheader';
import { TextWithTooltip } from 'src/components/TextWithTooltip';
import { ComputedReserveDataWithMarket } from 'src/hooks/app-data-provider/useAppDataProvider';
import { AssetCapHookData } from 'src/hooks/useAssetCaps';
import { MarketDataType } from 'src/utils/marketsAndNetworksConfig';
import { GENERAL } from 'src/utils/mixPanelEvents';

import { ApyGraphContainer } from './graphs/ApyGraphContainer';
import { PanelItem } from './ReservePanels';

interface SupplyInfoProps {
  reserve: ComputedReserveDataWithMarket;
  currentMarketData: MarketDataType;
  renderCharts: boolean;
  showSupplyCapStatus: boolean;
  supplyCap: AssetCapHookData;
  debtCeiling: AssetCapHookData;
}

export const SupplyInfo = ({
  reserve,
  currentMarketData,
  renderCharts,
  showSupplyCapStatus,
  supplyCap,
  debtCeiling,
}: SupplyInfoProps) => {
  return (
    <Box sx={{ flexGrow: 1, minWidth: 0, maxWidth: '100%', width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {showSupplyCapStatus ? (
          // With supply cap
          <>
            <CapsCircularStatus
              value={supplyCap.percentUsed}
              tooltipContent={
                <>
                  {'Maximum amount available to supply is '}
                  <FormattedNumber
                    value={
                      valueToBigNumber(reserve.supplyCap).toNumber() -
                      valueToBigNumber(reserve.totalLiquidity).toNumber()
                    }
                    variant="secondary12"
                  />{' '}
                  {reserve.symbol} (
                  <FormattedNumber
                    value={
                      valueToBigNumber(reserve.supplyCapUSD).toNumber() -
                      valueToBigNumber(reserve.totalLiquidityUSD).toNumber()
                    }
                    variant="secondary12"
                    symbol="USD"
                  />
                  ).
                </>
              }
            />
            <PanelItem
              title={
                <Box display="flex" alignItems="center">
                  Total supplied
                  <TextWithTooltip
                    event={{
                      eventName: GENERAL.TOOL_TIP,
                      eventParams: {
                        tooltip: 'Total Supply',
                        asset: reserve.underlyingAsset,
                        assetName: reserve.name,
                      },
                    }}
                  >
                    <>
                      {
                        'Asset supply is limited to a certain amount to reduce protocol exposure to the asset and to help manage risks involved. '
                      }
                      <Link
                        href="https://docs.more.markets/developers/whats-new/supply-borrow-caps"
                        underline="always"
                      >
                        Learn more
                      </Link>
                    </>
                  </TextWithTooltip>
                </Box>
              }
            >
              <Box>
                <FormattedNumber value={reserve.totalLiquidity} variant="main16" compact />
                <Typography
                  component="span"
                  color="text.primary"
                  variant="secondary16"
                  sx={{ display: 'inline-block', mx: 1 }}
                >
                  of
                </Typography>
                <FormattedNumber value={reserve.supplyCap} variant="main16" />
              </Box>
              <Box>
                <ReserveSubheader value={reserve.totalLiquidityUSD} />
                <Typography
                  component="span"
                  color="text.secondary"
                  variant="secondary12"
                  sx={{ display: 'inline-block', mx: 1 }}
                >
                  of
                </Typography>
                <ReserveSubheader value={reserve.supplyCapUSD} />
              </Box>
            </PanelItem>
          </>
        ) : (
          // Without supply cap
          <PanelItem
            title={
              <Box display="flex" alignItems="center">
                Total supplied
              </Box>
            }
          >
            <FormattedNumber value={reserve.totalLiquidity} variant="main16" compact />
            <ReserveSubheader value={reserve.totalLiquidityUSD} />
          </PanelItem>
        )}
        <PanelItem title={'APY'}>
          <FormattedNumber value={reserve.supplyAPY} percent variant="main16" />
          <IncentivesButton
            symbol={reserve.symbol}
            incentives={reserve.aIncentivesData || []}
            displayBlank={true}
          />
          <RewardsButton rewards={reserve.rewards} symbol={reserve.symbol} />
        </PanelItem>
        {reserve.unbacked && reserve.unbacked !== '0' && (
          <PanelItem title={'Unbacked'}>
            <FormattedNumber value={reserve.unbacked} variant="main16" symbol={reserve.name} />
            <ReserveSubheader value={reserve.unbackedUSD} />
          </PanelItem>
        )}
      </Box>
      {renderCharts && (reserve.borrowingEnabled || Number(reserve.totalDebt) > 0) && (
        <ApyGraphContainer
          graphKey="supply"
          reserve={reserve}
          currentMarketData={currentMarketData}
        />
      )}
      <div>
        {reserve.isIsolated ? (
          <Box sx={{ pt: '42px', pb: '12px' }}>
            <Typography variant="subheader1" color="text.main" paddingBottom={'12px'}>
              Collateral usage
            </Typography>
            <Warning severity="warning">
              <Typography variant="subheader1">
                Asset can only be used as collateral in isolation mode only.
              </Typography>
              <Typography variant="caption">
                In Isolation mode you cannot supply other assets as collateral for borrowing. Assets
                used as collateral in Isolation mode can only be borrowed to a specific debt
                ceiling.{' '}
                <Link href="https://docs.more.markets/faq/more-v3-features#isolation-mode">
                  Learn more
                </Link>
              </Typography>
            </Warning>
          </Box>
        ) : reserve.reserveLiquidationThreshold !== '0' ? (
          <Box
            sx={{ display: 'inline-flex', alignItems: 'center', pt: '42px', pb: '12px' }}
            paddingTop={'42px'}
          >
            <Typography variant="subheader1" color="text.main">
              Collateral usage
            </Typography>
            <CheckRoundedIcon fontSize="small" color="success" sx={{ ml: 2 }} />
            <Typography variant="subheader1" sx={{ color: '#46BC4B' }}>
              Can be collateral
            </Typography>
          </Box>
        ) : (
          <Box sx={{ pt: '42px', pb: '12px' }}>
            <Typography variant="subheader1" color="text.main">
              Collateral usage
            </Typography>
            <Warning sx={{ my: '12px' }} severity="warning">
              Asset cannot be used as collateral.
            </Warning>
          </Box>
        )}
      </div>
      {reserve.reserveLiquidationThreshold !== '0' && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <ReserveOverviewBox
            title={
              <MaxLTVTooltip
                event={{
                  eventName: GENERAL.TOOL_TIP,
                  eventParams: {
                    tooltip: 'MAX LTV',
                    asset: reserve.underlyingAsset,
                    assetName: reserve.name,
                  },
                }}
                variant="description"
                text={'Max LTV'}
              />
            }
          >
            <FormattedNumber
              value={reserve.formattedBaseLTVasCollateral}
              percent
              variant="secondary14"
              visibleDecimals={2}
            />
          </ReserveOverviewBox>

          <ReserveOverviewBox
            title={
              <LiquidationThresholdTooltip
                event={{
                  eventName: GENERAL.TOOL_TIP,
                  eventParams: {
                    tooltip: 'Liquidation threshold',
                    asset: reserve.underlyingAsset,
                    assetName: reserve.name,
                  },
                }}
                variant="description"
                text={'Liquidation threshold'}
              />
            }
          >
            <FormattedNumber
              value={reserve.formattedReserveLiquidationThreshold}
              percent
              variant="secondary14"
              visibleDecimals={2}
            />
          </ReserveOverviewBox>

          <ReserveOverviewBox
            title={
              <LiquidationPenaltyTooltip
                event={{
                  eventName: GENERAL.TOOL_TIP,
                  eventParams: {
                    tooltip: 'Liquidation penalty',
                    asset: reserve.underlyingAsset,
                    assetName: reserve.name,
                  },
                }}
                variant="description"
                text={'Liquidation penalty'}
              />
            }
          >
            <FormattedNumber
              value={reserve.formattedReserveLiquidationBonus}
              percent
              variant="secondary14"
              visibleDecimals={2}
            />
          </ReserveOverviewBox>

          {reserve.isIsolated && (
            <ReserveOverviewBox fullWidth>
              <DebtCeilingStatus
                debt={reserve.isolationModeTotalDebtUSD}
                ceiling={reserve.debtCeilingUSD}
                usageData={debtCeiling}
              />
            </ReserveOverviewBox>
          )}
        </Box>
      )}
      {reserve.symbol == 'stETH' && (
        <Box>
          <Warning severity="info">
            <AlertTitle>Staking Rewards</AlertTitle>
            stETH supplied as collateral will continue to accrue staking rewards provided by daily
            rebases.{' '}
            <Link
              href="https://docs.more.markets"
              underline="always"
            >
              Learn more
            </Link>
          </Warning>
        </Box>
      )}
    </Box>
  );
};
