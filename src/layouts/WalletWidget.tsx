import { DuplicateIcon } from '@heroicons/react/outline';
import { ChevronDownIcon, ChevronUpIcon, ExternalLinkIcon } from '@heroicons/react/solid';
import {
  Box,
  Button,
  Divider,
  List,
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
import { AUTH, GENERAL } from 'src/utils/mixPanelEvents';

import { Link } from '../components/primitives/Link';
import { ENABLE_TESTNET, getNetworkConfig, STAGING_ENV } from '../utils/marketsAndNetworksConfig';
import { DrawerWrapper } from './components/DrawerWrapper';
import { MobileCloseButton } from './components/MobileCloseButton';

interface WalletWidgetProps {
  open: boolean;
  setOpen: (value: boolean) => void;
  headerHeight: number;
}

export default function WalletWidget({ open, setOpen, headerHeight }: WalletWidgetProps) {
  const { disconnectWallet, currentAccount, connected, chainId, loading, readOnlyModeAddress } =
    useWeb3Context();
  const { openConnectModal } = useConnectModal();

  const { breakpoints, palette } = useTheme();
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
          color: '#A5A8B6',
          px: 4,
          py: 2,
        }}
      >
        Account
      </Typography>

      <Box component={component} disabled>
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <UserDisplay
            avatarProps={{ size: AvatarSize.XL }}
            titleProps={{
              typography: 'h4',
              addressCompactMode: CompactMode.MD,
            }}
            subtitleProps={{
              addressCompactMode: CompactMode.LG,
              typography: 'caption',
            }}
          />
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
      {!md && (
        <Box sx={{ display: 'flex', flexDirection: 'row', padding: '0 16px 10px' }}>
          {/* <Button
            variant="outlined"
            sx={{
              padding: '0 5px',
              marginRight: '10px',
            }}
            size="small"
            onClick={handleSwitchWallet}
          >
            Switch wallet
          </Button> */}
          <Button
            variant="outlined"
            sx={{
              padding: '0 5px',
            }}
            size="small"
            onClick={handleDisconnect}
            data-cy={`disconnect-wallet`}
          >
            Disconnect
          </Button>
        </Box>
      )}
      <Divider sx={{ my: { xs: 7, md: 0 }, borderColor: { xs: '#FFFFFF1F', md: 'divider' } }} />

      <Box component={component} disabled>
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1,
            }}
          >
            <Typography variant="caption" color={{ xs: '#FFFFFFB2', md: 'text.secondary' }}>
              Network
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box
              sx={{
                bgcolor: networkColor,
                width: 6,
                height: 6,
                mr: 2,
                boxShadow: '0px 2px 1px rgba(0, 0, 0, 0.05), 0px 0px 1px rgba(0, 0, 0, 0.25)',
                borderRadius: '50%',
              }}
            />
            <Typography color={{ xs: '#F1F1F3', md: 'text.primary' }} variant="subheader1">
              {networkConfig.name}
            </Typography>
          </Box>
        </Box>
      </Box>
      <Divider sx={{ my: { xs: 7, md: 0 }, borderColor: { xs: '#FFFFFF1F', md: 'divider' } }} />

      <Box
        component={component}
        sx={{ color: { xs: '#F1F1F3', md: 'text.primary', cursor: 'pointer' } }}
        onClick={handleCopy}
      >
        <ListItemIcon
          sx={{
            color: {
              xs: '#F1F1F3',
              md: 'primary.light',
              minWidth: 'unset',
              marginRight: 12,
            },
          }}
        >
          <SvgIcon fontSize="small">
            <DuplicateIcon />
          </SvgIcon>
        </ListItemIcon>
        <ListItemText>Copy address</ListItemText>
      </Box>

      {networkConfig?.explorerLinkBuilder && (
        <Link href={networkConfig.explorerLinkBuilder({ address: currentAccount })}>
          <Box
            component={component}
            sx={{ color: { xs: '#F1F1F3', md: 'text.primary' } }}
            onClick={handleViewOnExplorer}
          >
            <ListItemIcon
              sx={{
                color: {
                  xs: '#F1F1F3',
                  md: 'primary.light',
                  minWidth: 'unset',
                  marginRight: 12,
                },
              }}
            >
              <SvgIcon fontSize="small">
                <ExternalLinkIcon />
              </SvgIcon>
            </ListItemIcon>
            <ListItemText>View on Explorer</ListItemText>
          </Box>
        </Link>
      )}
      {md && (
        <>
          <Divider sx={{ my: { xs: 7, md: 0 }, borderColor: { xs: '#FFFFFF1F', md: 'divider' } }} />
          <Box sx={{ padding: '16px 16px 10px' }}>
            {/* <Button
              sx={{
                marginBottom: '16px',
                background: '#383D51',
                color: '#F1F1F3',
              }}
              fullWidth
              size="large"
              variant={palette.mode === 'dark' ? 'outlined' : 'text'}
              onClick={handleSwitchWallet}
            >
              Switch wallet
            </Button> */}
            <Button
              sx={{
                background: '#383D51',
                color: '#F1F1F3',
              }}
              fullWidth
              size="large"
              variant={palette.mode === 'dark' ? 'outlined' : 'text'}
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
      {md && connected && open ? (
        <MobileCloseButton setOpen={setOpen} />
      ) : loading ? (
        <Skeleton height={36} width={126} sx={{ background: '#383D51' }} />
      ) : (
        <Button
          variant={connected ? 'surface' : 'gradient'}
          aria-label="wallet"
          id="wallet-button"
          aria-controls={open ? 'wallet-button' : undefined}
          aria-expanded={open ? 'true' : undefined}
          aria-haspopup="true"
          onClick={handleClick}
          sx={{
            p: connected ? '5px 8px' : undefined,
            minWidth: hideWalletAccountText ? 'unset' : undefined,
            overflow: 'hidden' // Ensure button itself doesn't overflow
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

      {md ? (
        <DrawerWrapper open={open} setOpen={setOpen} headerHeight={headerHeight}>
          <List sx={{ px: 2, '.MuiListItem-root.Mui-disabled': { opacity: 1 } }}>
            <Content />
          </List>
        </DrawerWrapper>
      ) : (
        <Menu
          id="wallet-menu"
          MenuListProps={{
            'aria-labelledby': 'wallet-button',
          }}
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          keepMounted={true}
        >
          <MenuList disablePadding sx={{ '.MuiMenuItem-root.Mui-disabled': { opacity: 1 } }}>
            <Content component={MenuItem} />
          </MenuList>
        </Menu>
      )}
    </>
  );
}
