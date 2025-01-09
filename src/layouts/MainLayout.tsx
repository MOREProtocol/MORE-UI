import { Box } from '@mui/material';
import React, { ReactNode } from 'react';
import AnalyticsConsent from 'src/components/Analytics/AnalyticsConsent';
import { FeedbackModal } from 'src/layouts/FeedbackDialog';
import { FORK_ENABLED } from 'src/utils/marketsAndNetworksConfig';

import { AppFooter } from './AppFooter';
import { AppHeader } from './AppHeader';
// import TopBarNotify from './TopBarNotify';

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* <TopBarNotify
        notifyText="MORE Markets is now live on Flow Crescendo Mainnet!"
        learnMoreLink="https://mirror.xyz/0xA85C9020A57179C61d9794353DCaa7d9A6c16ad9/CoMo7eIjiLdMbmXXv4YIadrZwDQNn-zgjtSjokxzmRQ"
        buttonText="Read the full announcement here"
      /> */}
      <AppHeader />
      <Box component="main" sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {children}
      </Box>

      <AppFooter />
      <FeedbackModal />
      {FORK_ENABLED ? null : <AnalyticsConsent />}
    </>
  );
}
