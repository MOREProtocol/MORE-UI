import { Alert } from '@mui/material';
import { Link, ROUTES } from 'src/components/primitives/Link';

interface ReserveStatusWarningProps {
  reserve: { symbol: string; isFrozen: boolean; isPaused: boolean };
}

/** Banner on the reserve page explaining which actions remain available for a frozen or paused asset. */
export const ReserveStatusWarning = ({ reserve }: ReserveStatusWarningProps) => {
  if (reserve.isPaused) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        {reserve.symbol} is paused. No actions can be taken on this asset until further notice.
      </Alert>
    );
  }

  if (reserve.isFrozen) {
    return (
      <Alert severity="warning" sx={{ borderRadius: 2 }}>
        {reserve.symbol} is frozen. Supplying and borrowing are disabled. You can still withdraw and
        repay from <Link href={ROUTES.markets}>My Positions</Link> on the Markets page.
      </Alert>
    );
  }

  return null;
};
