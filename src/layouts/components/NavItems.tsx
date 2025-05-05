import { Button, List, ListItem, Typography, useMediaQuery, useTheme } from '@mui/material';
import * as React from 'react';
import { useRootStore } from 'src/store/root';
import { MarketDataType } from 'src/ui-config/marketsConfig';
import { ENABLE_TESTNET } from 'src/utils/marketsAndNetworksConfig';
import { NAV_BAR } from 'src/utils/mixPanelEvents';

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
      link: ROUTES.dashboard,
      title: 'Dashboard',
      visibleTitle: 'Dashboard',
      dataCy: 'menuDashboard',
    },
    {
      link: ROUTES.markets,
      title: 'Markets',
      visibleTitle: 'Markets',
      dataCy: 'menuMarkets',
    },
    {
      link: ROUTES.vaults,
      title: 'Vaults',
      visibleTitle: 'Vaults',
      dataCy: 'menuVaults',
      isVisible: () => ENABLE_TESTNET,
    },
    {
      link: ROUTES.staking,
      title: 'Stake',
      visibleTitle: 'Stake',
      dataCy: 'menuStake',
      isVisible: () =>
        process.env.NEXT_PUBLIC_ENABLE_STAKING === 'true' &&
        process.env.NEXT_PUBLIC_ENV === 'prod' &&
        !ENABLE_TESTNET,
    },
    {
      link: ROUTES.governance,
      title: 'Governance',
      visibleTitle: 'Governance',
      dataCy: 'menuGovernance',
      isVisible: () =>
        process.env.NEXT_PUBLIC_ENABLE_GOVERNANCE === 'true' &&
        process.env.NEXT_PUBLIC_ENV === 'prod' &&
        !ENABLE_TESTNET,
    },
    {
      link: ROUTES.faucet,
      title: 'Faucet',
      visibleTitle: 'Faucet',
      isVisible: () => process.env.NEXT_PUBLIC_ENV === 'staging' || ENABLE_TESTNET,
    },
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
                color="#F1F1F3"
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
                sx={(theme) => ({
                  color: '#F1F1F3',
                  p: '6px 8px',
                  position: 'relative',
                  '.active&:after, &:hover&:after': {
                    transform: 'scaleX(1)',
                    transformOrigin: 'bottom left',
                  },
                  '&:after': {
                    content: "''",
                    position: 'absolute',
                    width: '100%',
                    transform: 'scaleX(0)',
                    height: '2px',
                    bottom: '-6px',
                    left: '0',
                    background: theme.palette.gradients.newGradient,
                    transformOrigin: 'bottom right',
                    transition: 'transform 0.25s ease-out',
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
