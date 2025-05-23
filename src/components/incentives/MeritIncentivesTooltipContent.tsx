import { ReserveIncentiveResponse } from '@aave/math-utils/dist/esm/formatters/incentive/calculate-reserve-incentives';
import { Box, Typography } from '@mui/material';

import { FormattedNumber } from '../primitives/FormattedNumber';
import { Link } from '../primitives/Link';
import { Row } from '../primitives/Row';
import { TokenIcon } from '../primitives/TokenIcon';

export const MeritIncentivesTooltipContent = ({
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
        Eligible for the merit program.
      </Typography>

      <Typography variant="caption" color="text.secondary" mb={3}>
        {
          'This is a program initiated and implemented by the decentralised Aave community. Aave Labs does not guarantee the program and accepts no liability. '
        }
        <Link
          href="https://governance.more.markets/t/arfc-merit-a-new-more-alignment-user-reward-system/16646"
          sx={{ textDecoration: 'underline' }}
          variant="caption"
          color="text.secondary"
        >
          Learn more
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
