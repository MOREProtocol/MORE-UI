import { Box, Typography } from '@mui/material';
import { RewardsButton } from 'src/components/incentives/IncentivesButton';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { Link } from 'src/components/primitives/Link';
import { ReserveSubheader } from 'src/components/ReserveSubheader';
import { TextWithTooltip } from 'src/components/TextWithTooltip';
import { ComputedReserveData } from 'src/hooks/app-data-provider/useAppDataProvider';
import { AssetCapHookData } from 'src/hooks/useAssetCaps';
import { MarketDataType, NetworkConfig } from 'src/utils/marketsAndNetworksConfig';
import { GENERAL } from 'src/utils/mixPanelEvents';

import { PanelItem } from './ReservePanels';
import { UsdChip } from 'src/components/primitives/UsdChip';
import { PoolReservesRewardsHumanized, usePoolReservesRewardsHumanized } from 'src/hooks/pool/usePoolReservesRewards';

interface BorrowInfoProps {
  reserve: ComputedReserveData;
  currentMarketData: MarketDataType;
  currentNetworkConfig: NetworkConfig;
  showBorrowCapStatus: boolean;
  borrowCap: AssetCapHookData;
}

export const BorrowInfo = ({
  reserve,
  currentMarketData,
  showBorrowCapStatus,
}: BorrowInfoProps) => {
  const rewardsQuery = usePoolReservesRewardsHumanized(currentMarketData);
  const allRewards: PoolReservesRewardsHumanized[] = rewardsQuery?.data ?? [];

  const borrowRewards = allRewards.filter((r) =>
    r.tracked_token_address?.toLowerCase() === reserve.underlyingAsset.toLowerCase()
    && ['borrow', 'supply_and_borrow'].includes(r.tracked_token_type)
  );

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
        {showBorrowCapStatus ? (
          // With a borrow cap - simplified style
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="secondary14" color="text.secondary">
                Total borrowed
              </Typography>
              <TextWithTooltip
                event={{
                  eventName: GENERAL.TOOL_TIP,
                  eventParams: {
                    tooltip: 'Total borrowed',
                    asset: reserve.underlyingAsset,
                    assetName: reserve.name,
                  },
                }}
              >
                <>
                  Borrowing of this asset is limited to a certain amount to minimize liquidity
                  pool insolvency.{' '}
                  <Link
                    href="https://docs.more.markets/developers/whats-new/supply-borrow-caps"
                    underline="always"
                  >
                    Learn more
                  </Link>
                </>
              </TextWithTooltip>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FormattedNumber value={reserve.totalDebt} variant="main16" />
                <Typography
                  component="span"
                  color="text.primary"
                  variant="secondary16"
                  sx={{ display: 'inline-block', mx: 1 }}
                >
                  of
                </Typography>
                <FormattedNumber value={reserve.borrowCap} variant="main16" />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <UsdChip value={reserve.totalDebtUSD} />
                <Typography
                  component="span"
                  color="text.primary"
                  variant="secondary16"
                  sx={{ display: 'inline-block', mx: 1 }}
                >
                  of
                </Typography>
                <UsdChip value={reserve.borrowCapUSD} />
              </Box>
            </Box>
          </Box>
        ) : (
          // Without a borrow cap
          <Box>
            <Typography variant="secondary14" color="text.secondary">
              Total borrowed
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FormattedNumber value={reserve.totalDebt} variant="main16" compact />
              </Box>
              <UsdChip
                value={reserve.totalDebtUSD}
              />
            </Box>
          </Box>
        )}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="secondary14" color="text.secondary">
              Borrow APY
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormattedNumber
                value={reserve.variableBorrowAPY || ''}
                percent
                variant="main16"
                compact
              />
            </Box>
            {borrowRewards && borrowRewards.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="main14" color="text.secondary" sx={{ ml: 1, mr: 1 }}>
                  +
                </Typography>
                <RewardsButton rewards={borrowRewards} />
              </Box>
            )}
          </Box>
        </Box>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="secondary14" color="text.secondary">
              Available liquidity
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormattedNumber
                value={reserve.formattedAvailableLiquidity ?? '0'}
                variant="main16"
                compact
              />
            </Box>
            <UsdChip value={reserve.availableLiquidityUSD} />
          </Box>
        </Box>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="secondary14" color="text.secondary">
              Utilization rate
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormattedNumber
                value={reserve.borrowUsageRatio ?? '0'}
                percent
                variant="main16"
                compact
              />
            </Box>
          </Box>
        </Box>
        {reserve.borrowCapUSD && reserve.borrowCapUSD !== '0' && (
          <PanelItem title={'Borrow cap'}>
            <FormattedNumber value={reserve.borrowCap} variant="main16" />
            <ReserveSubheader value={reserve.borrowCapUSD} />
          </PanelItem>
        )}
      </Box>
    </Box>
  );
};
