import { Alert, AlertTitle } from '@mui/material';
import { useRootStore } from 'src/store/root';

import { useMarketRestriction } from './hooks';

export function FrozenMarketBanner() {
  const { isRestricted, allPaused, anyPaused } = useMarketRestriction();
  const marketTitle = useRootStore((s) => s.currentMarketData.marketTitle);

  if (!isRestricted) return null;

  if (allPaused) {
    return (
      <Alert severity="error" sx={{ borderRadius: '18px', m: 2 }}>
        <AlertTitle>The {marketTitle} market is paused</AlertTitle>
        Supplying, borrowing, withdrawing and repaying are temporarily unavailable until further
        notice.
      </Alert>
    );
  }

  return (
    <Alert severity="warning" sx={{ borderRadius: '18px', m: 2 }}>
      <AlertTitle>The {marketTitle} market is frozen</AlertTitle>
      Supplying and borrowing are disabled. You can still withdraw your supplied assets and repay
      your debt from My Positions{anyPaused ? ', except for paused assets' : ''}.
    </Alert>
  );
}
