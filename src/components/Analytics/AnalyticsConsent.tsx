import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { CookieConsent as AnalyticsConsentBanner } from 'react-cookie-consent';
import { Link } from 'src/components/primitives/Link';
import { useRootStore } from 'src/store/root';

export default function AnalyticsBanner() {
  const [optInAnalytics, optOutAnalytics, analyticsConfigOpen] = useRootStore((store) => [
    store.acceptAnalytics,
    store.rejectAnalytics,
    store.analyticsConfigOpen,
  ]);

  const [bannerVisible, setBannerVisible] = useState(false);

  useEffect(() => {
    // Adds a delay before showing the banner.
    const timerId = setTimeout(() => {
      setBannerVisible(true);
    }, 1000); // Start sliding in after 1 second.

    return () => clearTimeout(timerId);
  }, []);

  const theme = useTheme();

  const { breakpoints } = useTheme();
  const isMobile = useMediaQuery(breakpoints.down('sm'));

  const hasUserMadeChoice =
    typeof window !== 'undefined' && localStorage.getItem('userAcceptedAnalytics') !== null;

  // Note: If they have already chosen don't show again unless configured from footer
  if (hasUserMadeChoice) return null;

  return (
    <>
      <AnalyticsConsentBanner
        buttonText={<Typography>Allow analytics </Typography>}
        declineButtonText={<Typography>Opt-out</Typography>}
        disableStyles={true}
        visible={analyticsConfigOpen ? 'show' : 'hidden'}
        flipButtons
        style={{
          background: theme.palette.background.paper,
          bottom: isMobile ? '24px' : '24px',
          right: isMobile ? '50%' : '24px',
          left: isMobile ? '50%' : 'auto',
          position: 'fixed',
          width: '400px',
          // height: '184px',
          gap: '16px',
          display: 'flex',
          flexDirection: 'column',
          flexFlow: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: theme.palette.text.primary,
          marginBottom: '16px',
          fontSize: '14px',
          lineHeight: '20.02px',
          padding: '16px 16px',
          zIndex: 100,
          borderRadius: '12px',
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: '0px 0px 2px rgba(0, 0, 0, 0.2), 0px 2px 10px rgba(0, 0, 0, 0.1)',
          transition: 'transform 0.5s ease-out', // Add this

          transform: bannerVisible
            ? isMobile
              ? 'translateX(-50%)'
              : 'none'
            : 'translateX(100%) translateY(100%)',
        }}
        buttonStyle={{
          background: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          fontFamily: 'Inter',
          fontSize: '14px',
          borderRadius: '8px',
          margin: '0px',
          border: `1px solid ${theme.palette.primary.main}`,
          width: '172px',
          height: '36px',
          fontWeight: '700',
          cursor: 'pointer',
        }}
        declineButtonStyle={{
          background: theme.palette.background.surface,
          color: theme.palette.text.primary,
          fontFamily: 'Inter',
          fontWeight: '500',
          lineHeight: '24px',
          fontSize: '14px',
          borderRadius: '8px',
          margin: '10px',
          border: `1px solid ${theme.palette.divider}`,
          width: '172px',
          height: '36px',
          cursor: 'pointer',
        }}
        enableDeclineButton
        onDecline={() => {
          optOutAnalytics();
        }}
        onAccept={() => {
          optInAnalytics();
        }}
        cookieName="userAcceptedAnalytics"
      >
        <Box>
          We may employ on-the-spot tracking techniques during your browsing session to collect data
          on your interactions, preferences, and behaviour. This data helps us personalise your
          experience and improve our services. See our
          <Link sx={{ color: theme.palette.info.main }} href="https://more.markets/privacy-policy/">
            {' '}
            Privacy Policy.
          </Link>
        </Box>
      </AnalyticsConsentBanner>
    </>
  );
}
