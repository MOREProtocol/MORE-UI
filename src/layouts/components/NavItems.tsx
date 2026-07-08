import { Button, List, ListItem, Typography, useMediaQuery, useTheme } from '@mui/material';
import * as React from 'react';
import { useRootStore } from 'src/store/root';
import { MarketDataType } from 'src/ui-config/marketsConfig';
import { NAV_BAR } from 'src/utils/mixPanelEvents';
import { FONT_BODY } from 'src/utils/theme';

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
  dataCy?: string;
}

export const NavItems = ({ setOpen }: NavItemsProps) => {
  const { currentMarketData } = useProtocolDataContext();

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
    // Dashboard lives in the wallet/account dropdown (WalletWidget), not the main nav.
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
        .map((item, index) => (
          <ListItem
            sx={{
              width: { xs: '100%', md: 'unset' },
              mr: { xs: 0, md: '4px' },
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
