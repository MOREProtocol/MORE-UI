import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { Box, Typography } from '@mui/material';
import { Link } from 'src/components/primitives/Link';
import { Warning } from 'src/components/primitives/Warning';
import { ComputedReserveData } from 'src/hooks/app-data-provider/useAppDataProvider';

interface CollateralUsageHeaderProps {
  reserve: ComputedReserveData;
}

export const CollateralUsageHeader = ({ reserve }: CollateralUsageHeaderProps) => {
  return (
    <>
      {reserve.isIsolated ? (
        <Box>
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
        <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
          <CheckRoundedIcon fontSize="small" color="success" sx={{ ml: 2 }} />
          <Typography variant="subheader1" sx={{ color: '#46BC4B' }}>
            Can be collateral
          </Typography>
        </Box>
      ) : (
        <Box>
          <Warning sx={{ my: '12px' }} severity="warning">
            Asset cannot be used as collateral.
          </Warning>
        </Box>
      )}
    </>
  );
};


