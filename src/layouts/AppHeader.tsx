import { Typography, useMediaQuery, useTheme } from '@mui/material';
import Box from '@mui/material/Box';
import { useRouter } from 'next/router';
import * as React from 'react';
import { useEffect, useState } from 'react';
import NetworkSelector from 'src/components/NetworkSelector';
import { VaultManagementBundleButton } from 'src/modules/vault-detail/VaultManagement/VaultManagementBundleButton';
import { useRootStore } from 'src/store/root';
import { ChainIds } from 'src/utils/const';
import { FONT_BODY } from 'src/utils/theme';
import { useChainId, useSwitchChain } from 'wagmi';

import { LogoMenu } from './components/LogoMenu';
import { NavItems } from './components/NavItems';
import WalletWidget from './WalletWidget';

export const HEADER_HEIGHT = 96;

export function AppHeader() {
  const theme = useTheme();
  const md = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

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

  // Ensure Flow EVM is selected when required
  useEffect(() => {
    const onMarketsRoute = router.pathname.startsWith('/markets');
    if (!onMarketsRoute) return;

    if (chainId !== ChainIds.flowEVMMainnet && chainId !== ChainIds.flowEVMTestnet) {
      if (switchChain) {
        // Fire-and-forget switch to Flow EVM Mainnet
        switchChain({ chainId: ChainIds.flowEVMMainnet });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.pathname, chainId]);

  const hideNetworkSelector =
    router.pathname === '/markets' || router.pathname === '/markets/[underlyingAsset]';

  const wordmark = (
    <Typography
      component="span"
      sx={{
        fontFamily: FONT_BODY,
        fontWeight: 900,
        fontSize: 24,
        letterSpacing: '-0.045em',
        lineHeight: 1,
        color: 'text.primary',
      }}
    >
      MORE
    </Typography>
  );

  return (
    <Box
      component="header"
      sx={(theme) => ({
        position: 'sticky',
        top: 0,
        zIndex: theme.zIndex.appBar + 1,
        bgcolor: 'background.header',
        borderBottom: `1px solid ${theme.palette.divider}`,
      })}
    >
      <Box
        sx={{
          maxWidth: 1600,
          mx: 'auto',
          width: '100%',
          height: HEADER_HEIGHT,
          px: { xs: '16px', sm: '32px' },
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <LogoMenu logo={{ node: wordmark }} />
        </Box>

        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <NavItems />
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
      </Box>
    </Box>
  );
}
