import {
  DuplicateIcon,
  ExternalLinkIcon,
  LogoutIcon,
  ViewGridIcon,
} from '@heroicons/react/outline';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/solid';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import {
  alpha,
  Box,
  Button,
  Divider,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  MenuList,
  Skeleton,
  SvgIcon,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import React, { useState } from 'react';
import { AvatarSize } from 'src/components/Avatar';
import { CompactMode } from 'src/components/CompactableTypography';
import { Warning } from 'src/components/primitives/Warning';
import { UserDisplay } from 'src/components/UserDisplay';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { useRootStore } from 'src/store/root';
import { AUTH, GENERAL, NAV_BAR } from 'src/utils/mixPanelEvents';

import { Link, ROUTES } from '../components/primitives/Link';
import { ENABLE_TESTNET, getNetworkConfig, STAGING_ENV } from '../utils/marketsAndNetworksConfig';

interface WalletWidgetProps {
  open: boolean;
  setOpen: (value: boolean) => void;
  headerHeight: number;
}

export default function WalletWidget({ open, setOpen }: WalletWidgetProps) {
  const { disconnectWallet, currentAccount, connected, chainId, loading, readOnlyModeAddress } =
    useWeb3Context();
  const { openConnectModal } = useConnectModal();

  const { breakpoints } = useTheme();
  const xsm = useMediaQuery(breakpoints.down('xsm'));
  const md = useMediaQuery(breakpoints.down('md'));
  const trackEvent = useRootStore((store) => store.trackEvent);

  const [anchorEl, setAnchorEl] = useState<Element | null>(null);

  const networkConfig = getNetworkConfig(chainId);
  let networkColor = '';
  if (networkConfig?.isFork) {
    networkColor = '#ff4a8d';
  } else if (networkConfig?.isTestnet) {
    networkColor = '#7157ff';
  } else {
    networkColor = '#65c970';
  }

  const handleClose = () => {
    setOpen(false);
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    if (!connected) {
      trackEvent(GENERAL.OPEN_MODAL, { modal: 'Connect Waller' });
      openConnectModal();
    } else {
      setOpen(true);
      setAnchorEl(event.currentTarget);
    }
  };

  const handleDisconnect = () => {
    if (connected) {
      disconnectWallet();
      trackEvent(AUTH.DISCONNECT_WALLET);
      handleClose();
    }
  };

  const handleDashboard = () => {
    trackEvent(NAV_BAR.MAIN_MENU, { nav_link: 'Dashboard' });
    handleClose();
  };

  const handleCopy = async () => {
    navigator.clipboard.writeText(currentAccount);
    trackEvent(AUTH.COPY_ADDRESS);
    handleClose();
  };

  // const handleSwitchWallet = (): void => {
  //   openConnectModal();
  //   trackEvent(AUTH.SWITCH_WALLET);
  //   handleClose();
  // };

  const handleViewOnExplorer = (): void => {
    trackEvent(GENERAL.EXTERNAL_LINK, { Link: 'Etherscan for Wallet' });
    handleClose();
  };

  const hideWalletAccountText = xsm && (ENABLE_TESTNET || STAGING_ENV || readOnlyModeAddress);

  const Content = ({ component = ListItem }: { component?: typeof MenuItem | typeof ListItem }) => (
    <>
      <Typography
        variant="subheader2"
        sx={{
          display: { xs: 'block', md: 'none' },
          color: 'text.secondary',
          px: 4,
          py: 2,
        }}
      >
        Account
      </Typography>

      <Box component={component} disabled sx={{ '&:hover': { backgroundColor: 'transparent' } }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <UserDisplay
            oneLiner
            avatarProps={{ size: AvatarSize.LG }}
            titleProps={{
              variant: 'main16',
              addressCompactMode: CompactMode.MD,
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', pl: '40px', mt: '2px' }}>
            <Box
              sx={{
                bgcolor: networkColor,
                width: 6,
                height: 6,
                borderRadius: '50%',
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" color="text.muted">
              {networkConfig.name}
            </Typography>
          </Box>
          {readOnlyModeAddress && (
            <Warning
              icon={false}
              severity="warning"
              sx={{ mt: 3, mb: 0, ...(md ? { background: '#301E04', color: '#FFDCA8' } : {}) }}
            >
              Read-only mode.
            </Warning>
          )}
        </Box>
      </Box>
      <Divider sx={{ my: { xs: 7, md: '4px' }, borderColor: 'divider' }} />

      <MenuItem
        component={Link}
        href={ROUTES.userDashboard}
        onClick={handleDashboard}
        sx={{ color: 'text.primary' }}
      >
        <ListItemIcon>
          <SvgIcon sx={{ fontSize: 16 }}>
            <ViewGridIcon />
          </SvgIcon>
        </ListItemIcon>
        <ListItemText primaryTypographyProps={{ variant: 'subheader2' }}>Dashboard</ListItemText>
      </MenuItem>

      <Box
        component={component}
        sx={{
          color: 'text.primary',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
        }}
        onClick={handleCopy}
      >
        <ListItemIcon>
          <SvgIcon sx={{ fontSize: 16 }}>
            <DuplicateIcon />
          </SvgIcon>
        </ListItemIcon>
        <ListItemText primaryTypographyProps={{ variant: 'subheader2' }}>Copy address</ListItemText>
      </Box>

      {networkConfig?.explorerLinkBuilder && (
        <MenuItem
          component={Link}
          href={networkConfig.explorerLinkBuilder({ address: currentAccount })}
          onClick={handleViewOnExplorer}
          sx={{ color: 'text.primary' }}
        >
          <ListItemIcon>
            <SvgIcon sx={{ fontSize: 16 }}>
              <ExternalLinkIcon />
            </SvgIcon>
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ variant: 'subheader2' }}>
            View on Explorer
          </ListItemText>
        </MenuItem>
      )}

      {!md && (
        <>
          <Divider sx={{ borderColor: 'divider' }} />
          <Box
            component={component}
            sx={{
              color: 'error.main',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              '&:hover': {
                backgroundColor: (theme) => alpha(theme.palette.error.main, 0.08),
              },
            }}
            onClick={handleDisconnect}
            data-cy={`disconnect-wallet`}
          >
            <ListItemIcon sx={{ color: 'error.main' }}>
              <SvgIcon sx={{ fontSize: 16 }}>
                <LogoutIcon />
              </SvgIcon>
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ variant: 'subheader2' }}>
              Disconnect
            </ListItemText>
          </Box>
        </>
      )}
      {md && (
        <>
          <Box sx={{ padding: '16px 16px 10px' }}>
            <Button
              sx={{
                color: 'error.main',
                borderColor: 'error.main',
                '&:hover': {
                  borderColor: 'error.main',
                  backgroundColor: (theme) => alpha(theme.palette.error.main, 0.08),
                },
              }}
              fullWidth
              size="large"
              variant="outlined"
              onClick={handleDisconnect}
            >
              Disconnect
            </Button>
          </Box>
        </>
      )}
    </>
  );

  return (
    <>
      {loading ? (
        <Skeleton
          height={36}
          width={126}
          sx={{ background: (theme) => alpha(theme.palette.background.paper, 0.75) }}
        />
      ) : (
        <Button
          variant={connected ? 'outlined' : 'contained'}
          color="primary"
          size="small"
          aria-label="wallet"
          id="wallet-button"
          aria-controls={open ? 'wallet-button' : undefined}
          aria-expanded={open ? 'true' : undefined}
          aria-haspopup="true"
          onClick={handleClick}
          startIcon={
            !connected ? <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 18 }} /> : undefined
          }
          sx={{
            height: 40,
            p: connected ? '0 12px 0 6px' : '0 18px',
            minWidth: hideWalletAccountText ? 'unset' : undefined,
            overflow: 'hidden', // Ensure button itself doesn't overflow
          }}
          endIcon={
            connected &&
            !hideWalletAccountText &&
            !md && (
              <SvgIcon
                sx={{
                  display: { xs: 'none', md: 'block' },
                }}
              >
                {open ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </SvgIcon>
            )
          }
        >
          {connected ? (
            <UserDisplay
              avatarProps={{ size: AvatarSize.SM }}
              oneLiner={true}
              titleProps={{ variant: 'buttonM' }}
            />
          ) : (
            'Connect wallet'
          )}
        </Button>
      )}

      <Menu
        id="wallet-menu"
        MenuListProps={{
          'aria-labelledby': 'wallet-button',
        }}
        PaperProps={{
          elevation: 0,
          variant: 'outlined',
          style: { minWidth: 260, marginTop: '8px' },
        }}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        keepMounted={true}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuList
          disablePadding
          sx={{
            p: '6px',
            outline: 'none',
            '.MuiMenuItem-root': {
              borderRadius: '10px',
              padding: '9px 12px',
            },
            '.MuiMenuItem-root.Mui-disabled': { opacity: 1 },
          }}
        >
          <Content component={MenuItem} />
        </MenuList>
      </Menu>
    </>
  );
}
