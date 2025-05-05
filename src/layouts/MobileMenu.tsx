import { MenuIcon } from '@heroicons/react/outline';
import {
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  SvgIcon,
  Typography,
} from '@mui/material';
import React, { ReactNode } from 'react';
import { PROD_ENV } from 'src/utils/marketsAndNetworksConfig';

import { Link } from '../components/primitives/Link';
import { moreNavigation } from '../ui-config/menu-items';
import { DarkModeSwitcher } from './components/DarkModeSwitcher';
import { DrawerWrapper } from './components/DrawerWrapper';
import { MobileCloseButton } from './components/MobileCloseButton';
import { NavItems } from './components/NavItems';
import { TestNetModeSwitcher } from './components/TestNetModeSwitcher';

interface MobileMenuProps {
  open: boolean;
  setOpen: (value: boolean) => void;
  headerHeight: number;
}

const MenuItemsWrapper = ({ children, title }: { children: ReactNode; title: ReactNode }) => (
  <Box sx={{ mb: 6, '&:last-of-type': { mb: 0, '.MuiDivider-root': { display: 'none' } } }}>
    <Box sx={{ px: 2 }}>
      <Typography variant="subheader2" sx={{ color: '#A5A8B6', px: 4, py: 2 }}>
        {title}
      </Typography>

      {children}
    </Box>

    <Divider sx={{ borderColor: '#F2F3F729', mt: 6 }} />
  </Box>
);

export const MobileMenu = ({ open, setOpen, headerHeight }: MobileMenuProps) => {
  return (
    <>
      {open ? (
        <MobileCloseButton setOpen={setOpen} />
      ) : (
        <Button
          id="settings-button-mobile"
          variant="surface"
          sx={{ p: '7px 8px', minWidth: 'unset', ml: 2 }}
          onClick={() => setOpen(true)}
        >
          <SvgIcon sx={{ color: '#F1F1F3' }} fontSize="small">
            <MenuIcon />
          </SvgIcon>
        </Button>
      )}

      <DrawerWrapper open={open} setOpen={setOpen} headerHeight={headerHeight}>
        <MenuItemsWrapper title={'Menu'}>
          <NavItems />
        </MenuItemsWrapper>
        <MenuItemsWrapper title={'Global settings'}>
          <List>
            <DarkModeSwitcher />
            {PROD_ENV && <TestNetModeSwitcher />}
          </List>
        </MenuItemsWrapper>
        <MenuItemsWrapper title={'Links'}>
          <List>
            <ListItem
              sx={{ color: '#F1F1F3' }}
              component={Link}
              href={'/v3-migration'}
              onClick={() => setOpen(false)}
            >
              <ListItemText>Migrate to More V3</ListItemText>
            </ListItem>
            {moreNavigation.length > 0 ? (
              moreNavigation.map((item, index) => (
                <ListItem component={Link} href={item.link} sx={{ color: '#F1F1F3' }} key={index}>
                  <ListItemIcon sx={{ minWidth: 'unset', mr: 3 }}>
                    <SvgIcon sx={{ fontSize: '20px', color: '#F1F1F3' }}>{item.icon}</SvgIcon>
                  </ListItemIcon>
                </ListItem>
              ))
            ) : (
              <></>
            )}
          </List>
        </MenuItemsWrapper>
      </DrawerWrapper>
    </>
  );
};
