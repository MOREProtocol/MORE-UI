import { Box, Typography } from '@mui/material';
import { RewardsButton } from 'src/components/incentives/IncentivesButton';
import { ComputedReserveData } from 'src/hooks/app-data-provider/useAppDataProvider';
import {
  PoolReservesRewardsHumanized,
  usePoolReservesRewardsHumanized,
} from 'src/hooks/pool/usePoolReservesRewards';
import { AssetCapHookData } from 'src/hooks/useAssetCaps';
import { MarketDataType, NetworkConfig } from 'src/utils/marketsAndNetworksConfig';

interface BorrowInfoProps {
  reserve: ComputedReserveData;
  currentMarketData: MarketDataType;
  currentNetworkConfig: NetworkConfig;
  showBorrowCapStatus: boolean;
  borrowCap: AssetCapHookData;
}

// See SupplyInfo: the headline reserve figures render as tiles/bars in the parent.
// This component stays mounted to drive the rewards fetch and show borrow-side
// incentives when the reserve has any.
export const BorrowInfo = ({ reserve, currentMarketData }: BorrowInfoProps) => {
  const rewardsQuery = usePoolReservesRewardsHumanized(currentMarketData);
  const allRewards: PoolReservesRewardsHumanized[] = rewardsQuery?.data ?? [];

  const borrowRewards = allRewards.filter(
    (r) =>
      r.tracked_token_address?.toLowerCase() === reserve.underlyingAsset.toLowerCase() &&
      ['borrow', 'supply_and_borrow'].includes(r.tracked_token_type)
  );

  if (!borrowRewards.length) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Typography variant="secondary14" color="text.secondary">
        Borrow incentives
      </Typography>
      <RewardsButton rewards={borrowRewards} />
    </Box>
  );
};
