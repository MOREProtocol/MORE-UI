import { InformationCircleIcon } from '@heroicons/react/outline';
import {
  // Badge,
  Button,
  Slide,
  // styled,
  SvgIcon,
  Typography,
  useMediaQuery,
  useScrollTrigger,
  useTheme,
} from '@mui/material';
import Box from '@mui/material/Box';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { ContentWithTooltip } from 'src/components/ContentWithTooltip';
import { BatchTransactionsButton } from 'src/components/transactions/BatchTransactions/BatchTransactionsButton';
import { VaultManagementBundleButton } from 'src/modules/vault-detail/VaultManagement/VaultManagementBundleButton';
import NetworkSelector from 'src/components/NetworkSelector';
import { useRootStore } from 'src/store/root';
import { ENABLE_TESTNET, FORK_ENABLED } from 'src/utils/marketsAndNetworksConfig';

import { Link } from '../components/primitives/Link';
import { useProtocolDataContext } from '../hooks/useProtocolDataContext';
import { uiConfig } from '../uiConfig';
import { NavItems } from './components/NavItems';
import { MobileMenu } from './MobileMenu';
import { SettingsMenu } from './SettingsMenu';
import WalletWidget from './WalletWidget';

export const HEADER_HEIGHT = 48;
interface Props {
  children: React.ReactElement;
}

// const StyledBadge = styled(Badge)(({ theme }) => ({
//   '& .MuiBadge-badge': {
//     top: '2px',
//     right: '2px',
//     borderRadius: '20px',
//     width: '10px',
//     height: '10px',
//     backgroundColor: `${theme.palette.secondary.main}`,
//     color: `${theme.palette.secondary.main}`,
//     '&::after': {
//       position: 'absolute',
//       top: 0,
//       left: 0,
//       width: '100%',
//       height: '100%',
//       borderRadius: '50%',
//       animation: 'ripple 1.2s infinite ease-in-out',
//       border: '1px solid currentColor',
//       content: '""',
//     },
//   },
//   '@keyframes ripple': {
//     '0%': {
//       transform: 'scale(.8)',
//       opacity: 1,
//     },
//     '100%': {
//       transform: 'scale(2.4)',
//       opacity: 0,
//     },
//   },
// }));

function HideOnScroll({ children }: Props) {
  const { breakpoints } = useTheme();
  const md = useMediaQuery(breakpoints.down('md'));
  const trigger = useScrollTrigger({ threshold: md ? 160 : 80 });

  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  );
}

// const SWITCH_VISITED_KEY = 'switchVisited';

export function AppHeader() {
  const { breakpoints } = useTheme();
  const md = useMediaQuery(breakpoints.down('md'));
  const sm = useMediaQuery(breakpoints.down('sm'));

  // const [visitedSwitch, setVisitedSwitch] = useState(() => {
  //   if (typeof window === 'undefined') return true;
  //   return Boolean(localStorage.getItem(SWITCH_VISITED_KEY));
  // });

  const [mobileDrawerOpen, setMobileDrawerOpen] = useRootStore((state) => [
    state.mobileDrawerOpen,
    state.setMobileDrawerOpen,
  ]);

  // const { openSwitch } = useModalContext();

  const { currentMarketData } = useProtocolDataContext();
  const [walletWidgetOpen, setWalletWidgetOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [batchTransactionsOpen, setBatchTransactionsOpen] = useState(false);
  useEffect(() => {
    if (mobileDrawerOpen && !md) {
      setMobileDrawerOpen(false);
    }
    if (walletWidgetOpen) {
      setWalletWidgetOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [md]);

  const toggleWalletWigit = (state: boolean) => {
    if (md) setMobileDrawerOpen(state);
    setWalletWidgetOpen(state);
  };

  const toggleMobileMenu = (state: boolean) => {
    if (md) setMobileDrawerOpen(state);
    setMobileMenuOpen(state);
  };

  const disableTestnet = () => {
    localStorage.setItem('testnetsEnabled', 'false');
    // Set window.location to trigger a page reload when navigating to the the dashboard
    window.location.href = '/';
  };

  const disableFork = () => {
    localStorage.setItem('testnetsEnabled', 'false');
    localStorage.removeItem('forkEnabled');
    localStorage.removeItem('forkBaseChainId');
    localStorage.removeItem('forkNetworkId');
    localStorage.removeItem('forkRPCUrl');
    // Set window.location to trigger a page reload when navigating to the the dashboard
    window.location.href = '/';
  };

  // const handleSwitchClick = () => {
  //   localStorage.setItem(SWITCH_VISITED_KEY, 'true');
  //   setVisitedSwitch(true);
  //   openSwitch();
  // };

  const testnetTooltip = (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start', gap: 1 }}>
      <Typography variant="subheader1">Testnet mode is ON</Typography>
      <Typography variant="description">
        The app is running in testnet mode. Learn how it works in{' '}
        <Link
          href="https://docs.more.markets/faq/testing-more"
          style={{ fontSize: '14px', fontWeight: 400, textDecoration: 'underline' }}
        >
          FAQ.
        </Link>
      </Typography>
      <Button variant="outlined" sx={{ mt: '12px' }} onClick={disableTestnet}>
        Disable testnet
      </Button>
    </Box>
  );

  const forkTooltip = (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start', gap: 1 }}>
      <Typography variant="subheader1">Fork mode is ON</Typography>
      <Typography variant="description">The app is running in fork mode.</Typography>
      <Button variant="outlined" sx={{ mt: '12px' }} onClick={disableFork}>
        Disable fork
      </Button>
    </Box>
  );

  return (
    <HideOnScroll>
      <Box
        component="header"
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        sx={(theme) => ({
          height: HEADER_HEIGHT,
          position: 'sticky',
          top: 0,
          transition: theme.transitions.create('top'),
          zIndex: theme.zIndex.appBar,
          bgcolor: theme.palette.background.header,
          padding: {
            xs: mobileMenuOpen || walletWidgetOpen ? '8px 20px' : '8px 8px 8px 20px',
            xsm: '8px 20px',
          },
          display: 'flex',
          alignItems: 'center',
          flexDirection: 'space-between',
          boxShadow: 'inset 0px -1px 0px rgba(242, 243, 247, 0.16)',
        })}
      >
        <Box
          component={Link}
          href="/"
          aria-label="Go to homepage"
          sx={{
            lineHeight: 0,
            mr: 3,
            transition: '0.3s ease all',
            '&:hover': { opacity: 0.7 },
          }}
          onClick={() => setMobileMenuOpen(false)}
        >
          {md ? (
            <img src={uiConfig.appLogoMobile} alt="MORE" width={30} height={30} />
          ) : (
            <img src={uiConfig.appLogo} alt="MORE" width={130} height={30} />
          )}
        </Box>
        <Box sx={{ mr: sm ? 1 : 3 }}>
          {ENABLE_TESTNET && (
            <ContentWithTooltip tooltipContent={testnetTooltip} offset={[0, -4]} withoutHover>
              <Button
                variant="surface"
                size="small"
                color="primary"
                sx={{
                  backgroundColor: '#B6509E',
                  '&:hover, &.Mui-focusVisible': { backgroundColor: 'rgba(182, 80, 158, 0.7)' },
                }}
              >
                TESTNET
                <SvgIcon sx={{ marginLeft: '2px', fontSize: '16px' }}>
                  <InformationCircleIcon />
                </SvgIcon>
              </Button>
            </ContentWithTooltip>
          )}
        </Box>
        <Box sx={{ mr: sm ? 1 : 3 }}>
          {FORK_ENABLED && currentMarketData?.isFork && (
            <ContentWithTooltip tooltipContent={forkTooltip} offset={[0, -4]} withoutHover>
              <Button
                variant="surface"
                size="small"
                color="primary"
                sx={{
                  backgroundColor: '#B6509E',
                  '&:hover, &.Mui-focusVisible': { backgroundColor: 'rgba(182, 80, 158, 0.7)' },
                }}
              >
                FORK
                <SvgIcon sx={{ marginLeft: '2px', fontSize: '16px' }}>
                  <InformationCircleIcon />
                </SvgIcon>
              </Button>
            </ContentWithTooltip>
          )}
        </Box>

        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <NavItems />
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <NetworkSelector />
        <VaultManagementBundleButton />
        <BatchTransactionsButton open={batchTransactionsOpen} setOpen={setBatchTransactionsOpen} />

        {!mobileMenuOpen && (
          <WalletWidget
            open={walletWidgetOpen}
            setOpen={toggleWalletWigit}
            headerHeight={HEADER_HEIGHT}
          />
        )}

        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <SettingsMenu />
        </Box>

        {!walletWidgetOpen && (
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <MobileMenu
              open={mobileMenuOpen}
              setOpen={toggleMobileMenu}
              headerHeight={HEADER_HEIGHT}
            />
          </Box>
        )}
      </Box>
    </HideOnScroll>
  );
}
