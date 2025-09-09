import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  Box,
  Typography,
  SvgIcon,
  Avatar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/solid';
import { useChainId, useSwitchChain } from 'wagmi';
import { useRouter } from 'next/router';
import { useRootStore } from '../store/root';
import { availableMarkets, marketsData, getNetworkConfig, ENABLE_TESTNET, NetworkConfig } from '../utils/marketsAndNetworksConfig';
import { ChainIds } from '../utils/const';
import { ROUTES } from './primitives/Link';

export default function NetworkSelector() {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { setCurrentMarket } = useRootStore();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const { breakpoints } = useTheme();
  const isMobile = useMediaQuery(breakpoints.down('md'));

  // Get current network config using unified configuration
  const getCurrentNetworkConfig = () => {
    return getNetworkConfig(chainId || 747); // Default to Flow EVM
  };

  const currentNetworkConfig = getCurrentNetworkConfig();

  // Get available networks from available markets
  const marketNetworks = availableMarkets.map(marketId => {
    const marketData = marketsData[marketId];
    const networkConfig = getNetworkConfig(marketData.chainId);
    return {
      marketId,
      marketData,
      networkConfig,
      isMarket: true,
    };
  }).filter((network, index, self) =>
    // Remove duplicates based on chainId and filter testnet in production
    index === self.findIndex(n => n.marketData.chainId === network.marketData.chainId) &&
    (ENABLE_TESTNET || !network.networkConfig.isTestnet)
  );

  // Add Ethereum mainnet for bridging (even though it's not a market)
  const ethereumNetwork = {
    marketId: null,
    marketData: {
      chainId: ChainIds.ethereum,
      marketTitle: 'Ethereum',
    },
    networkConfig: getNetworkConfig(ChainIds.ethereum),
    isMarket: false,
  };

  const availableNetworks = [ethereumNetwork, ...marketNetworks];

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNetworkSwitch = async (network: typeof availableNetworks[0]) => {
    try {
      // Check if we're currently on a vault detail page
      const isOnVaultPage = router.pathname === '/vault-detail';

      // Switch chain via wagmi first
      await switchChain?.({ chainId: network.marketData.chainId });

      // Update the market in the store only after successful chain switch
      // and only if it's a market network (not Ethereum)
      if (network.isMarket && network.marketId) {
        setCurrentMarket(network.marketId);
        console.log(`Switched to market: ${network.marketId} on network: ${network.marketData.chainId}`);
      } else {
        console.log(`Switched to non-market network: ${network.marketData.chainId} (${network.networkConfig.name})`);
      }

      // If user manually switches network while on vault page, redirect to vaults list
      if (isOnVaultPage) {
        console.log('Manual network switch detected on vault page, redirecting to vaults list');
        router.push(ROUTES.vaults);
      }

      handleClose();
    } catch (error) {
      console.error('Error switching network:', error);
      // Don't update the market if chain switch failed
      handleClose();
    }
  };

  const getNetworkDisplayName = (config: NetworkConfig) => {
    return config.displayName || config.name || 'Unknown';
  };

  return (
    <>
      <Button
        onClick={handleClick}
        variant="surface"
        sx={{
          p: '7px 8px',
          minWidth: 'unset',
          maxWidth: { xs: '120px', sm: '140px', md: '180px' },
          height: '36px',
          gap: 1,
          alignItems: 'center',
          mr: 2,
          overflow: 'hidden', // Ensure button itself doesn't overflow
          bgcolor: 'background.surface',
          '&:hover': {
            bgcolor: 'background.surface3',
          },
          color: 'text.primary',
        }}
        endIcon={
          <SvgIcon>
            {open ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </SvgIcon>
        }
        aria-label="Network selector"
      >
        <Avatar
          src={currentNetworkConfig.networkLogoPath}
          sx={{ width: 20, height: 20 }}
        />
        {!isMobile && (
          <Typography
            variant="subheader2"
            title={getNetworkDisplayName(currentNetworkConfig)} // Show full name on hover
            sx={{
              fontSize: '14px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: { xs: '80px', sm: '100px', md: '120px' } // Responsive width
            }}
          >
            {getNetworkDisplayName(currentNetworkConfig)}
          </Typography>
        )}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          sx: { py: 1 },
        }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      >
        {availableNetworks.map((network) => (
          <MenuItem
            key={network.marketData.chainId}
            onClick={() => handleNetworkSwitch(network)}
            selected={chainId === network.marketData.chainId}
            sx={{
              py: 2,
              px: 2,
              '&.Mui-selected': {
                backgroundColor: 'action.selected',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={network.networkConfig.networkLogoPath}
                sx={{ width: 20, height: 20 }}
              />
              <Box>
                <Typography variant="secondary14">
                  {getNetworkDisplayName(network.networkConfig)}
                </Typography>
                {network.networkConfig.isTestnet && (
                  <Typography variant="caption" color="text.secondary">
                    Testnet
                  </Typography>
                )}
                {network.networkConfig.isFork && (
                  <Typography variant="caption" color="text.secondary">
                    Fork
                  </Typography>
                )}
              </Box>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
} 