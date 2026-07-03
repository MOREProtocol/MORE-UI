import { Button, List, ListItem, Typography, useMediaQuery, useTheme } from '@mui/material';
import * as React from 'react';
import { useRootStore } from 'src/store/root';
import { MarketDataType } from 'src/ui-config/marketsConfig';
import { NAV_BAR } from 'src/utils/mixPanelEvents';
import { FONT_BODY } from 'src/utils/theme';

import { useWeb3Context } from '../../libs/hooks/useWeb3Context';
import { Link, ROUTES } from '../../components/primitives/Link';
import { useProtocolDataContext } from '../../hooks/useProtocolDataContext';
import { MoreMenu } from '../MoreMenu';

interface NavItemsProps {
  setOpen?: (value: boolean) => void;
}

interface Navigation {
  link: string;
  title: string;
  visibleTitle: string;
  isVisible?: (data: MarketDataType) => boolean | undefined;
  // Wallet-gated items (e.g. Dashboard) only appear once an account is connected.
  requiresWallet?: boolean;
  dataCy?: string;
}

export const NavItems = ({ setOpen }: NavItemsProps) => {
  const { currentMarketData } = useProtocolDataContext();
  const { currentAccount } = useWeb3Context();

  const navigation: Navigation[] = [
    {
      link: ROUTES.vaults || ROUTES.dashboard,
      title: 'Vaults',
      visibleTitle: 'Vaults',
      dataCy: 'menuVaults',
    },
    {
      link: ROUTES.markets,
      title: 'Markets',
      visibleTitle: 'Markets',
      dataCy: 'menuMarkets',
    },
    {
      link: ROUTES.userDashboard,
      title: 'Dashboard',
      visibleTitle: 'Dashboard',
      requiresWallet: true,
      dataCy: 'menuDashboard',
    },
    {
      link: ROUTES.bridge,
      title: 'Bridge',
      visibleTitle: 'Bridge',
      dataCy: 'menuBridge',
    },
    // {
    //   link: ROUTES.faucet,
    //   title: 'Faucet',
    //   visibleTitle: 'Faucet',
    //   isVisible: () => process.env.NEXT_PUBLIC_ENV === 'staging' || ENABLE_TESTNET,
    // },
  ];

  const { breakpoints } = useTheme();
  const md = useMediaQuery(breakpoints.down('md'));
  const trackEvent = useRootStore((store) => store.trackEvent);
  const handleClick = (title: string, isMd: boolean) => {
    if (isMd && setOpen) {
      trackEvent(NAV_BAR.MAIN_MENU, { nav_link: title });
      setOpen(false);
    } else {
      trackEvent(NAV_BAR.MAIN_MENU, { nav_link: title });
    }
  };
  return (
    <List
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', md: 'center' },
        flexDirection: { xs: 'column', md: 'row' },
      }}
      disablePadding
    >
      {navigation
        .filter((item) => !item.isVisible || item.isVisible(currentMarketData))
        .filter((item) => !item.requiresWallet || !!currentAccount)
        // Bridge already has its own dedicated ghost pill in the header's right cluster on
        // desktop, so it's excluded here to avoid appearing twice. It stays in this list for
        // the mobile (Typography) branch below, where it remains reachable.
        .filter((item) => md || item.link !== ROUTES.bridge)
        .map((item, index) => (
          <ListItem
            sx={{
              width: { xs: '100%', md: 'unset' },
              mr: { xs: 0, md: 2 },
            }}
            data-cy={item.dataCy}
            disablePadding
            key={index}
          >
            {md ? (
              <Typography
                component={Link}
                href={item.link}
                variant="h2"
                color="primary.main"
                sx={{ width: '100%', p: 4 }}
                onClick={() => handleClick(item.title, true)}
              >
                {item.visibleTitle}
              </Typography>
            ) : (
              <Button
                component={Link}
                onClick={() => handleClick(item.title, false)}
                href={item.link}
                disableRipple
                sx={(theme) => ({
                  fontFamily: FONT_BODY,
                  fontWeight: 600,
                  fontSize: 14,
                  minHeight: 'unset',
                  color: 'text.secondary',
                  px: '14px',
                  py: '8px',
                  borderRadius: '9999px',
                  '&:hover': {
                    color: 'text.primary',
                    backgroundColor: 'background.surface',
                  },
                  '&.active': {
                    color: theme.palette.mode === 'dark' ? 'var(--brand-400)' : 'var(--brand-700)',
                    backgroundColor:
                      theme.palette.mode === 'dark'
                        ? 'var(--app-bold-orange-soft)'
                        : 'var(--brand-50)',
                  },
                })}
              >
                {item.visibleTitle}
              </Button>
            )}
          </ListItem>
        ))}

      <ListItem sx={{ display: { xs: 'none', md: 'flex' }, width: 'unset' }} disablePadding>
        <MoreMenu />
      </ListItem>
    </List>
  );
};
