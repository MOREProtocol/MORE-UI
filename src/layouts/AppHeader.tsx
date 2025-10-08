import {
  Slide,
  useMediaQuery,
  useScrollTrigger,
  useTheme,
  alpha,
} from '@mui/material';
import Box from '@mui/material/Box';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { LogoMenu } from './components/LogoMenu';
import { VaultManagementBundleButton } from 'src/modules/vault-detail/VaultManagement/VaultManagementBundleButton';
import NetworkSelector from 'src/components/NetworkSelector';
import { useRootStore } from 'src/store/root';

import { uiConfig } from '../uiConfig';
import { NavItems } from './components/NavItems';
import WalletWidget from './WalletWidget';

export const HEADER_HEIGHT = 48;
interface Props {
  children: React.ReactElement;
}

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

export function AppHeader() {
  const theme = useTheme();
  const md = useMediaQuery(theme.breakpoints.down('md'));
  const isDark = theme.palette.mode === 'dark';
  const desktopLogo = isDark ? uiConfig.appLogoDark : uiConfig.appLogo;
  const mobileLogo = uiConfig.appLogoMobile;
  const logo = md ? { src: mobileLogo, width: 30, height: 30 } : { src: desktopLogo, width: 130, height: 30 };
  const router = useRouter();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useRootStore((state) => [
    state.mobileDrawerOpen,
    state.setMobileDrawerOpen,
  ]);

  const [walletWidgetOpen, setWalletWidgetOpen] = useState(false);
  // const [batchTransactionsOpen, setBatchTransactionsOpen] = useState(false);
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

  const hideNetworkSelector =
    router.pathname === '/markets' || router.pathname === '/markets/[underlyingAsset]';

  return (
    <HideOnScroll>
      <Box
        sx={(theme) => ({
          height: HEADER_HEIGHT,
          position: 'sticky',
          top: 12,
          mb: 5,
          transition: theme.transitions.create('top'),
          zIndex: theme.zIndex.appBar + 1,
          bgcolor: alpha(theme.palette.background.paper, 0.75),
          backdropFilter: 'blur(10px)',
          padding: {
            xs: '8px 8px 8px 20px',
            xsm: '8px 20px',
          },
          display: 'flex',
          alignItems: 'center',
          flexDirection: 'space-between',
          borderRadius: '30px',
          mx: 2,
        })}
      >
        <Box sx={{ mr: 3 }}>
          <LogoMenu logo={logo} />
        </Box>

        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <NavItems />
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {!hideNetworkSelector && <NetworkSelector />}
        <VaultManagementBundleButton />
        {/* BATCH TRANSACTIONS DISABLED FOR NOW */}
        {/* <BatchTransactionsButton open={batchTransactionsOpen} setOpen={setBatchTransactionsOpen} /> */}

        <WalletWidget
          open={walletWidgetOpen}
          setOpen={toggleWalletWigit}
          headerHeight={HEADER_HEIGHT}
        />

      </Box>
    </HideOnScroll>
  );
}
