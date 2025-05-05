import { Typography } from '@mui/material';
import { useRootStore } from 'src/store/root';
import { GENERAL } from 'src/utils/mixPanelEvents';

import { Link } from '../primitives/Link';
import { Warning } from '../primitives/Warning';

export const CooldownWarning = () => {
  const trackEvent = useRootStore((store) => store.trackEvent);
  return (
    <Warning severity="warning" sx={{ '.MuiAlert-message': { p: 0 }, mb: 6 }}>
      <Typography variant="subheader1">
        Cooldown period warning
      </Typography>
      <Typography variant="caption">
        
          The cooldown period is the time required prior to unstaking your tokens (20 days). You can
          only withdraw your assets from the Security Module after the cooldown period and within
          the unstake window.
          <Link
            href="https://docs.more.markets/faq/migration-and-staking"
            fontWeight={500}
            onClick={() =>
              trackEvent(GENERAL.EXTERNAL_LINK, {
                Link: 'Cooldown Period Warning',
              })
            }
          >
            Learn more
          </Link>
        
      </Typography>
    </Warning>
  );
};
