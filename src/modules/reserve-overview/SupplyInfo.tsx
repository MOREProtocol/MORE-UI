import { Box, Typography } from '@mui/material';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { ReserveSubheader } from 'src/components/ReserveSubheader';
import { TextWithTooltip } from 'src/components/TextWithTooltip';
import { ComputedReserveData } from 'src/hooks/app-data-provider/useAppDataProvider';
import { AssetCapHookData } from 'src/hooks/useAssetCaps';
import { MarketDataType } from 'src/utils/marketsAndNetworksConfig';
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
  console.log('supplyCap', supplyCap);
  console.log('reserve', reserve);
  console.log('currentMarketData', currentMarketData);
  console.log('showSupplyCapStatus', showSupplyCapStatus);
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
        gap: { xs: 3, md: 8 },
        p: { xs: 4, md: 6 },
        backgroundColor: 'background.paper',
        borderRadius: 2,
      }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="secondary14" color="text.secondary">
              Total supplied
            </Typography>
            {showSupplyCapStatus && (
              <TextWithTooltip iconMargin={0.5}>
                <>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="secondary12" color="text.secondary">
                      Supply cap
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FormattedNumber value={reserve.supplyCap} variant="main14" />
                      <UsdChip value={reserve.supplyCapUSD} />
                    </Box>
                  </Box>
                </>
              </TextWithTooltip>
            )}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormattedNumber value={reserve.totalLiquidity} variant="main16" compact />
            </Box>
            <UsdChip
              value={reserve.totalLiquidityUSD}
            />
          </Box>
        </Box>
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
