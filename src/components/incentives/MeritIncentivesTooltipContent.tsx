import { ReserveIncentiveResponse } from '@aave/math-utils/dist/esm/formatters/incentive/calculate-reserve-incentives';
import { Box, Typography } from '@mui/material';

import { FormattedNumber } from '../primitives/FormattedNumber';
import { Link } from '../primitives/Link';
import { Row } from '../primitives/Row';
import { TokenIcon } from '../primitives/TokenIcon';

export const RewardsIncentivesTooltipContent = ({
  incentiveAPR,
  rewardTokenSymbol,
}: Omit<ReserveIncentiveResponse, 'rewardTokenAddress'>) => {
  const typographyVariant = 'secondary12';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'start',
        flexDirection: 'column',
      }}
    >
      <Typography variant="caption" color="text.primary" mb={3}>
        Incentives Eligibility.
      </Typography>

      <Typography variant="caption" color="text.secondary" mb={3}>
        {
          'Incentive programs are provided by third parties. MORE does not guarantee these programs and accepts no liability for them. Some positions are not eligible for incentives. '
        }
        <Link
          href="https://docs.more.markets/resources/incentives"
          target="_blank"
          rel="noopener noreferrer"
          sx={{ textDecoration: 'underline' }}
          variant="caption"
          color="text.secondary"
        >
          Read more
        </Link>
      </Typography>

      <Box sx={{ width: '100%' }}>
        <Row
          height={32}
          caption={
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                mb: 0,
              }}
            >
              <TokenIcon symbol={rewardTokenSymbol} sx={{ fontSize: '20px', mr: 1 }} />
              <Typography variant={typographyVariant}>{rewardTokenSymbol}</Typography>
            </Box>
          }
          width="100%"
        >
          <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
            <FormattedNumber value={+incentiveAPR} percent variant={typographyVariant} />
            <Typography variant={typographyVariant} sx={{ ml: 1 }}>
              APR
            </Typography>
          </Box>
        </Row>
      </Box>
    </Box>
  );
};