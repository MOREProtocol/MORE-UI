import { valueToBigNumber } from '@aave/math-utils';
import { Box, Typography } from '@mui/material';
import { CapsCircularStatus } from 'src/components/caps/CapsCircularStatus';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { Link } from 'src/components/primitives/Link';
import { ReserveSubheader } from 'src/components/ReserveSubheader';
import { TextWithTooltip } from 'src/components/TextWithTooltip';
import { ComputedReserveData } from 'src/hooks/app-data-provider/useAppDataProvider';
import { AssetCapHookData } from 'src/hooks/useAssetCaps';
import { MarketDataType } from 'src/utils/marketsAndNetworksConfig';
import { GENERAL } from 'src/utils/mixPanelEvents';
import { PoolReservesRewardsHumanized, usePoolReservesRewardsHumanized } from 'src/hooks/pool/usePoolReservesRewards';

import { PanelItem } from './ReservePanels';
import { useMemo } from 'react';
import { UsdChip } from 'src/components/primitives/UsdChip';
import { RewardsButton } from 'src/components/incentives/IncentivesButton';

interface SupplyInfoProps {
  reserve: ComputedReserveData;
  currentMarketData: MarketDataType;
  showSupplyCapStatus: boolean;
  supplyCap: AssetCapHookData;
  debtCeiling: AssetCapHookData;
}

export const SupplyInfo = ({
  reserve,
  currentMarketData,
  showSupplyCapStatus,
  supplyCap,
}: SupplyInfoProps) => {
  const rewardsQuery = usePoolReservesRewardsHumanized(currentMarketData);
  const allRewards: PoolReservesRewardsHumanized[] = rewardsQuery?.data ?? [];
  const supplyRewards = useMemo(() => allRewards.filter(
    (r) =>
      r.tracked_token_address?.toLowerCase() === reserve.underlyingAsset.toLowerCase() &&
      ['supply', 'supply_and_borrow'].includes(r.tracked_token_type)
  ), [allRewards, reserve.underlyingAsset]);
  return (
    <Box sx={{ flexGrow: 1, minWidth: 0, maxWidth: '100%', width: '100%' }}>
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', xsm: '1fr 1fr' },
        height: '100%',
        gap: 3,
        p: { xs: 4, md: 6 },
        backgroundColor: 'background.paper',
        borderRadius: 2,
      }}>
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
          <Box>
            <Typography variant="secondary14" color="text.secondary">
              Total supplied
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FormattedNumber value={reserve.totalLiquidity} variant="main16" compact />
              </Box>
              <UsdChip
                value={reserve.totalLiquidityUSD}
              />
            </Box>
          </Box>
        )}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="secondary14" color="text.secondary">
              APY
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormattedNumber
                value={reserve.supplyAPY || ''}
                percent
                variant="main16"
                compact
              />
            </Box>
            {supplyRewards && supplyRewards.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="main14" color="text.secondary" sx={{ ml: 1, mr: 1 }}>
                  +
                </Typography>
                <RewardsButton rewards={supplyRewards} />
              </Box>
            )}
          </Box>
        </Box>
        {reserve.unbacked && reserve.unbacked !== '0' && (
          <PanelItem title={'Unbacked'}>
            <FormattedNumber value={reserve.unbacked} variant="main16" symbol={reserve.name} />
            <ReserveSubheader value={reserve.unbackedUSD} />
          </PanelItem>
        )}
      </Box>

    </Box>
  );
};
