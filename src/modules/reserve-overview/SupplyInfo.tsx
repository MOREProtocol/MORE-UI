import { Box, Typography } from '@mui/material';
import { useMemo } from 'react';
import { RewardsButton } from 'src/components/incentives/IncentivesButton';
import { ComputedReserveData } from 'src/hooks/app-data-provider/useAppDataProvider';
import {
  PoolReservesRewardsHumanized,
  usePoolReservesRewardsHumanized,
} from 'src/hooks/pool/usePoolReservesRewards';
import { AssetCapHookData } from 'src/hooks/useAssetCaps';
import { MarketDataType } from 'src/utils/marketsAndNetworksConfig';

interface SupplyInfoProps {
  reserve: ComputedReserveData;
  currentMarketData: MarketDataType;
  showSupplyCapStatus: boolean;
  supplyCap: AssetCapHookData;
  debtCeiling: AssetCapHookData;
}

// Reserve-status headline figures (Total supplied, cap utilization, …) are rendered
// as stat tiles / bars by the parent page. This component stays mounted purely to
// drive the `usePoolReservesRewardsHumanized` fetch and surface any supply-side
// incentives — the one data-dependent bit that lives nowhere else.
export const SupplyInfo = ({ reserve, currentMarketData }: SupplyInfoProps) => {
  const rewardsQuery = usePoolReservesRewardsHumanized(currentMarketData);
  const allRewards: PoolReservesRewardsHumanized[] = rewardsQuery?.data ?? [];
  const supplyRewards = useMemo(
    () =>
      allRewards.filter(
        (r) =>
          r.tracked_token_address?.toLowerCase() === reserve.underlyingAsset.toLowerCase() &&
          ['supply', 'supply_and_borrow'].includes(r.tracked_token_type)
      ),
    [allRewards, reserve.underlyingAsset]
  );

  if (!supplyRewards.length) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Typography variant="secondary14" color="text.secondary">
        Supply incentives
      </Typography>
      <RewardsButton rewards={supplyRewards} />
    </Box>
  );
};
