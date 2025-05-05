import { Link, Typography } from '@mui/material';

import { Warning } from '../../primitives/Warning';

interface MarketWarningProps {
  marketName?: string;
  forum?: boolean;
}

export const PolygonWarning = () => {
  return (
    <Warning severity="error">
      <Typography variant="caption">
        Update: Disruptions reported for WETH, WBTC, WMATIC, and USDT. AIP 230 will resolve the
        disruptions and the market will be operating as normal on ~26th May 13h00 UTC.{' '}
        <Link href="" target="_blank">
          Read more here.
        </Link>
      </Typography>
    </Warning>
  );
};

export const MarketWarning = ({ forum }: MarketWarningProps) => {
  return (
    <Warning severity="error">
      <Typography variant="caption">
        <Link href="" target="_blank">
          {forum ? 'Join the community discussion' : 'Learn more'}
        </Link>
      </Typography>
    </Warning>
  );
};
