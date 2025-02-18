import { ChevronDownIcon } from '@heroicons/react/outline';
import { Trans } from '@lingui/react/macro';
import {
  Box,
  BoxProps,
  ListItemText,
  MenuItem,
  SvgIcon,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import React from 'react';
import { useRootStore } from 'src/store/root';
import { BaseNetworkConfig } from 'src/ui-config/networksConfig';
import { DASHBOARD } from 'src/utils/mixPanelEvents';

import {
  availableMarkets,
  CustomMarket,
  ENABLE_TESTNET,
  MarketDataType,
  marketsData,
  networkConfigs,
  STAGING_ENV,
} from '../utils/marketsAndNetworksConfig';

export const getMarketInfoById = (marketId: CustomMarket | 'all_markets') => {
  if (marketId === 'all_markets') {
    return {
      market: {
        marketTitle: 'All Markets',
        isFork: false,
        v3: false,
        chainId: 0,
      },
      network: networkConfigs[Object.values(marketsData)[0].chainId],
    };
  }
  const market: MarketDataType = marketsData[marketId as CustomMarket];
  const network: BaseNetworkConfig = networkConfigs[market.chainId];

  return { market, network };
};

export const getMarketHelpData = (marketName: string) => {
  const testChains = [
    'Görli',
    'Ropsten',
    'Mumbai',
    'Sepolia',
    'Fuji',
    'Testnet',
    'Kovan',
    'Rinkeby',
  ];
  const arrayName = marketName.split(' ');
  const testChainName = arrayName.filter((el) => testChains.indexOf(el) > -1);
  const marketTitle = arrayName.filter((el) => !testChainName.includes(el)).join(' ');
  return {
    name: marketTitle,
    testChainName: testChainName[0],
  };
};

export type Market = {
  marketTitle: string;
  networkName: string;
  networkLogo: string;
  selected?: boolean;
};

type MarketLogoProps = {
  size: number;
  logo: string;
  testChainName?: string;
  sx?: BoxProps;
};

export const MarketLogo = ({ size, logo, testChainName, sx }: MarketLogoProps) => {
  return (
    <Box sx={{ mr: 2, width: size, height: size, position: 'relative', ...sx }}>
      <img src={logo} alt="" width="100%" height="100%" />

      {testChainName && (
        <Tooltip title={testChainName} arrow>
          <Box
            sx={{
              bgcolor: '#29B6F6',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              color: 'common.white',
              fontSize: '12px',
              lineHeight: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              right: '-2px',
              bottom: '-2px',
            }}
          >
            {testChainName.split('')[0]}
          </Box>
        </Tooltip>
      )}
    </Box>
  );
};

export const MarketSwitcher = () => {
  const { currentMarket, setCurrentMarket } = useRootStore();
  const theme = useTheme();
  const upToLG = useMediaQuery(theme.breakpoints.up('lg'));
  const downToXSM = useMediaQuery(theme.breakpoints.down('xsm'));
  const trackEvent = useRootStore((store) => store.trackEvent);

  const handleMarketChange = (marketId: CustomMarket | 'all_markets') => {
    trackEvent(DASHBOARD.CHANGE_MARKET, { market: marketId });
    setCurrentMarket(marketId as unknown as CustomMarket);
  };

  const handleMarketSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleMarketChange(e.target.value as CustomMarket | 'all_markets');
  };

  return (
    <TextField
      select
      aria-label="select market"
      data-cy="marketSelector"
      value={currentMarket}
      onChange={handleMarketSelect}
      sx={{
        mr: 2,
        '& .MuiOutlinedInput-notchedOutline': {
          border: 'none',
        },
      }}
      SelectProps={{
        native: false,
        className: 'MarketSwitcher__select',
        IconComponent: (props) => (
          <SvgIcon fontSize="medium" {...props}>
            <ChevronDownIcon />
          </SvgIcon>
        ),
        renderValue: (marketId) => {
          const { market, network } = getMarketInfoById(marketId as CustomMarket | 'all_markets');
          return (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {marketId !== 'all_markets' && (
                <MarketLogo
                  size={upToLG ? 32 : 28}
                  logo={network.networkLogoPath}
                  testChainName={getMarketHelpData(market.marketTitle).testChainName}
                />
              )}
              <Box sx={{ mr: 1, display: 'inline-flex', alignItems: 'flex-start' }}>
                <Typography
                  variant={upToLG ? 'display1' : 'h1'}
                  sx={{
                    fontSize: downToXSM ? '1.55rem' : undefined,
                    color: 'common.white',
                    mr: 1,
                  }}
                >
                  {getMarketHelpData(market.marketTitle).name} {market.isFork ? 'Fork' : ''}
                  {upToLG && marketId !== 'all_markets' && ' Market'}
                </Typography>
                {marketId !== 'all_markets' && (
                  <>
                    {market.v3 ? (
                      <Box
                        sx={{
                          color: '#fff',
                          px: 2,
                          borderRadius: '12px',
                          background: (theme) => theme.palette.gradients.newGradient,
                        }}
                      >
                        <Typography variant="subheader2">V3</Typography>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          color: '#A5A8B6',
                          px: 2,
                          borderRadius: '12px',
                          backgroundColor: '#383D51',
                        }}
                      >
                        <Typography variant="subheader2">V2</Typography>
                      </Box>
                    )}
                  </>
                )}
              </Box>
            </Box>
          );
        },
        sx: {
          '&.MarketSwitcher__select .MuiSelect-outlined': {
            pl: 0,
            py: 0,
            backgroundColor: 'transparent !important',
          },
          '.MuiSelect-icon': { color: '#F1F1F3' },
        },
        MenuProps: {
          anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'right',
          },
          PaperProps: {
            style: {
              minWidth: 240,
            },
            variant: 'outlined',
            elevation: 0,
          },
        },
      }}
    >
      <Box>
        <Typography variant="subheader2" color="text.secondary" sx={{ px: 4, pt: 2 }}>
          <Trans>
            {ENABLE_TESTNET || STAGING_ENV ? 'Select More Testnet Market' : 'Select More Market'}
          </Trans>
        </Typography>
      </Box>

      <MenuItem
        data-cy={`marketSelector_all_markets`}
        value="all_markets"
        onClick={() => handleMarketChange('all_markets')}
        sx={{
          '.MuiListItemIcon-root': { minWidth: 'unset' },
        }}
      >
        <ListItemText sx={{ mr: 0 }}>All markets</ListItemText>
      </MenuItem>

      {availableMarkets.map((marketId: CustomMarket) => {
        const { market, network } = getMarketInfoById(marketId);
        const marketNaming = getMarketHelpData(market.marketTitle);
        return (
          <MenuItem
            key={marketId}
            data-cy={`marketSelector_${marketId}`}
            value={marketId}
            sx={{
              '.MuiListItemIcon-root': { minWidth: 'unset' },
            }}
          >
            <MarketLogo
              size={32}
              logo={network.networkLogoPath}
              testChainName={marketNaming.testChainName}
            />
            <ListItemText sx={{ mr: 0 }}>
              {marketNaming.name} {market.isFork ? 'Fork' : ''}
            </ListItemText>
            <ListItemText sx={{ textAlign: 'right' }}>
              <Typography color="text.muted" variant="description">
                {marketNaming.testChainName}
              </Typography>
            </ListItemText>
          </MenuItem>
        );
      })}
    </TextField>
  );
};
