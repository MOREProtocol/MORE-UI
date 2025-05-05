import { Link, Typography } from '@mui/material';

import { ROUTES } from '../../primitives/Link';
import { Warning } from '../../primitives/Warning';

export const MOREWarning = () => {
  return (
    <Warning severity="info">
      <Typography>
        Supplying your  AAVE{' '}
        tokens is not the same as staking them. If you wish to stake your  AAVE{' '}
        tokens, please go to the {' '}
        <Link href={ROUTES.staking}>
          staking view
        </Link>
      </Typography>
    </Warning>
  );
};
