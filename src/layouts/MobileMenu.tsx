import { MenuIcon } from '@heroicons/react/outline';
import {
  Box,
  Button,
  Divider,
  List,
  SvgIcon,
  Typography,
} from '@mui/material';
import React, { ReactNode } from 'react';

import { DarkModeSwitcher } from './components/DarkModeSwitcher';
import { DrawerWrapper } from './components/DrawerWrapper';
import { MobileCloseButton } from './components/MobileCloseButton';
import { NavItems } from './components/NavItems';

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
          sx={{
            p: '7px 8px',
            minWidth: 'unset',
            ml: 2,
            bgcolor: 'background.surface',
            '&:hover': {
              bgcolor: 'background.surface3',
            },
            color: 'text.primary',
          }}
          onClick={() => setOpen(true)}
        >
          <SvgIcon sx={{ color: 'text.primary' }} fontSize="small">
            <MenuIcon />
          </SvgIcon>
        </Button>
      )}

      <DrawerWrapper open={open} setOpen={setOpen} headerHeight={headerHeight}>
        <MenuItemsWrapper title={'Menu'}>
          <NavItems setOpen={setOpen} />
        </MenuItemsWrapper>
        <MenuItemsWrapper title={'Global settings'}>
          <List>
            <DarkModeSwitcher />
          </List>
        </MenuItemsWrapper>
      </DrawerWrapper>
    </>
  );
};
