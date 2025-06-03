import { Box, Grid, Skeleton, Typography, useMediaQuery, useTheme, Button, Menu, MenuItem } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import BigNumber from 'bignumber.js';
import React, { useMemo, useState } from 'react';
import { Address } from 'src/components/Address';
import { CompactMode } from 'src/components/CompactableTypography';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useVault } from 'src/hooks/vault/useVault';
import { useVaultData } from 'src/hooks/vault/useVaultData';
import { LightweightLineChart } from 'src/modules/vaults/LightweightLineChart';
import { networkConfigs } from 'src/utils/marketsAndNetworksConfig';

export const VaultOverview: React.FC = () => {
  const { selectedVaultId, chainId } = useVault();
  const { reserves } = useAppDataContext();
  const vaultData = useVaultData(selectedVaultId);

  const selectedVault = vaultData?.data;
  const isLoading = vaultData?.isLoading;
  const baseUrl = useMemo(() => chainId && networkConfigs[chainId] && networkConfigs[chainId].explorerLink, [chainId]);

  // State for dropdown menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedChartDataKey, setSelectedChartDataKey] = useState<'apy' | 'totalSupply'>('totalSupply');
  const open = Boolean(anchorEl);

  const chartDataOptions = {
    apy: {
      label: 'APY',
      valueSuffix: '%',
      data: selectedVault?.overview?.historicalSnapshots?.apy || [],
    },
    totalSupply: {
      label: 'Total Supply',
      valueSuffix: '$',
      data: selectedVault?.overview?.historicalSnapshots?.totalSupply || [],
    },
  };

  const currentChartLabel = chartDataOptions[selectedChartDataKey]?.label || 'Share price';
  const currentChartData = chartDataOptions[selectedChartDataKey]?.data;
  const currentChartValueSuffix = chartDataOptions[selectedChartDataKey]?.valueSuffix;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (optionKey: 'apy' | 'totalSupply') => {
    setSelectedChartDataKey(optionKey);
    handleClose();
  };

  const reserve = useMemo(() => {
    return reserves.find(
      (reserve) => reserve?.underlyingAsset?.toLowerCase() === selectedVault?.overview?.assetAddress?.toLowerCase()
    );
  }, [reserves, selectedVault]);

  // This sharePriceInUsd is for the main display, not the chart
  const sharePriceInUsd = new BigNumber(selectedVault?.overview?.sharePrice).multipliedBy(
    reserve?.formattedPriceInMarketReferenceCurrency
  );

  const theme = useTheme();
  const downToMd = useMediaQuery(theme.breakpoints.down('md'));

  // TODO: Nice error handling

  return (
    <Box sx={{ py: 5, px: 5 }}>
      <Grid container spacing={20} sx={{ pb: 10 }}>
        <Grid item xs={12} md={9} sx={{ gap: 30, paddingY: 5 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="main16" color="text.secondary">
              Share Price
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'start', flexDirection: 'column' }}>
              {/* This section displays the current main value (e.g. current Share Price), not historical data */}
              {isLoading ? (
                <>
                  <Skeleton width={200} height={53} sx={{ mb: 1 }} />
                  <Skeleton width={100} height={28} />
                </>
              ) : (
                <>
                  <FormattedNumber
                    value={selectedVault?.overview?.sharePrice || ''} // This might need to change based on dropdown too if we want this header value to change
                    symbol={selectedVault?.overview?.shareCurrencySymbol || ''} // This might need to change
                    variant="main40"
                  />
                  <FormattedNumber
                    value={sharePriceInUsd.toString() || ''} // And this USD value
                    symbol={'USD'}
                    variant="secondary21"
                  />
                </>
              )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mt: 7 }}>
              {/* Dropdown for Chart Data Selection */}
              <Button
                id="chart-data-button"
                aria-controls={open ? 'chart-data-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
                onClick={handleClick}
                sx={{
                  color: 'text.secondary',
                  p: 0, // Remove default padding to make it look like Typography
                  textTransform: 'none', // Keep text casing as is
                  minWidth: 'auto', // Adjust minWidth
                  justifyContent: 'flex-start', // Align text to start
                  '&:hover': {
                    backgroundColor: 'transparent', // No background change on hover
                  },
                }}
              >
                <Typography variant="main16" component="span" sx={{ mr: 0.5 }}>
                  {currentChartLabel}
                </Typography>
                <ArrowDropDownIcon sx={{ color: 'text.secondary' }} />
              </Button>
              <Menu
                id="chart-data-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                MenuListProps={{
                  'aria-labelledby': 'chart-data-button',
                }}
              >
                {Object.keys(chartDataOptions).map((key) => (
                  <MenuItem
                    key={key}
                    selected={key === selectedChartDataKey}
                    onClick={() => handleMenuItemClick(key as 'apy' | 'totalSupply')}
                  >
                    {chartDataOptions[key as 'apy' | 'totalSupply'].label}
                  </MenuItem>
                ))}
              </Menu>
            </Box>

            {/* Price Chart - Now dynamically shows selected data */}
            <Box sx={{ height: 300, mb: 4 }}>
              {isLoading ? (
                <Skeleton variant="rectangular" width="100%" height={200} />
              ) : currentChartData && currentChartData.length > 0 ? (
                <LightweightLineChart
                  height={200}
                  data={currentChartData}
                  valueSuffix={currentChartValueSuffix}
                />
              ) : (
                <Typography sx={{ textAlign: 'center', pt: 5 }}>
                  No historical data available for {currentChartLabel}.
                </Typography>
              )}
            </Box>
          </Box>
        </Grid>

        <Grid
          item
          xs={12}
          md={3}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <Typography variant="main16" color="text.secondary" sx={{ mb: 2 }}>
            Vault Roles
          </Typography>
          <Box>
            <Typography variant="main14" sx={{ py: 2 }}>
              Curator
            </Typography>
            {isLoading ? (
              <Skeleton width={100} height={20} />
            ) : (
              selectedVault?.overview?.roles?.curator ? (
                <Address
                  address={selectedVault?.overview?.roles.curator}
                  link={`${baseUrl}/address/${selectedVault?.overview?.roles.curator}`}
                  loading={isLoading}
                  isUser
                  variant="secondary14"
                  compactMode={downToMd ? CompactMode.SM : CompactMode.MD}
                />
              ) : (
                <Typography variant="secondary14">
                  None
                </Typography>
              )
            )}
          </Box>
          <Box>
            <Typography variant="main14" sx={{ py: 2 }}>
              Guardian
            </Typography>
            {isLoading ? (
              <Skeleton width={100} height={20} />
            ) : (
              selectedVault?.overview?.roles?.guardian ? (
                <Address
                  address={selectedVault?.overview?.roles.guardian}
                  link={`${baseUrl}/address/${selectedVault?.overview?.roles.guardian}`}
                  loading={isLoading}
                  isUser
                  variant="secondary14"
                  compactMode={downToMd ? CompactMode.SM : CompactMode.MD}
                />
              ) : (
                <Typography variant="secondary14">
                  None
                </Typography>
              )
            )}
          </Box>
        </Grid>
      </Grid>


    </Box>
  );
};
