import { Box, Grid, Skeleton, Typography, useMediaQuery, useTheme, Button, Menu, MenuItem } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import React, { useMemo, useState } from 'react';
import { Address } from 'src/components/Address';
import { CompactMode } from 'src/components/CompactableTypography';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useVault } from 'src/hooks/vault/useVault';
import { useVaultData } from 'src/hooks/vault/useVaultData';
import { LightweightLineChart } from 'src/modules/vaults/LightweightLineChart';
import { networkConfigs } from 'src/utils/marketsAndNetworksConfig';
import { formatUnits } from 'viem';
import { USD_DECIMALS, valueToBigNumber } from '@aave/math-utils';

export const VaultOverview: React.FC = () => {
  const { selectedVaultId, chainId } = useVault();
  const { reserves, marketReferencePriceInUsd } = useAppDataContext();
  const vaultData = useVaultData(selectedVaultId);

  const selectedVault = vaultData?.data;
  const isLoading = vaultData?.isLoading;
  const baseUrl = useMemo(() => chainId && networkConfigs[chainId] && networkConfigs[chainId].explorerLink, [chainId]);

  // State for dropdown menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedChartDataKey, setSelectedChartDataKey] = useState<'apy' | 'totalSupply'>('apy');
  const open = Boolean(anchorEl);

  const chartDataOptions = {
    apy: {
      label: 'APY',
      data: selectedVault?.overview?.historicalSnapshots?.apy || [],
    },
    totalSupply: {
      label: 'AUM',
      data: selectedVault?.overview?.historicalSnapshots?.totalSupply || [],
    },
  };

  const currentChartLabel = chartDataOptions[selectedChartDataKey]?.label || 'Share price';
  const currentChartData = chartDataOptions[selectedChartDataKey]?.data;

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
      (reserve) => reserve?.underlyingAsset?.toLowerCase() === selectedVault?.overview?.asset?.address?.toLowerCase()
    );
  }, [reserves, selectedVault]);

  const aum = useMemo(() => {
    return formatUnits(BigInt(selectedVault?.financials.liquidity.totalAssets || 0), selectedVault?.overview?.asset?.decimals || 0) || '';
  }, [selectedVault]);
  const aumInUsd = useMemo(() => {
    if (!selectedVault?.financials.liquidity.totalAssets || !reserve?.formattedPriceInMarketReferenceCurrency || !marketReferencePriceInUsd) {
      return '0';
    }

    return valueToBigNumber(selectedVault.financials.liquidity.totalAssets)
      .multipliedBy(reserve.formattedPriceInMarketReferenceCurrency)
      .multipliedBy(marketReferencePriceInUsd)
      .shiftedBy(-USD_DECIMALS)
      .shiftedBy(-(selectedVault?.overview?.asset?.decimals || 0))
      .toString();
  }, [selectedVault, reserve, marketReferencePriceInUsd]);

  const theme = useTheme();
  const downToMd = useMediaQuery(theme.breakpoints.down('md'));

  // TODO: Nice error handling

  return (
    <Box sx={{ py: 5, px: 5 }}>
      <Grid container spacing={20} sx={{ pb: 10 }}>
        <Grid item xs={12} md={9} sx={{ gap: 30, paddingY: 5 }}>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'top', mb: 2 }}>
              <Box>
                <Box>
                  <Typography variant="main16" color="text.secondary">
                    AUM
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
                          value={aum}
                          symbol={selectedVault?.overview?.asset?.symbol || ''}
                          variant="main40"
                        />
                        <FormattedNumber
                          value={aumInUsd}
                          symbol={'USD'}
                          variant="secondary21"
                        />
                      </>
                    )}
                  </Box>
                </Box>
              </Box>
              <Box>
                <Typography variant="main16" color="text.secondary" align="right">
                  Annualized APY
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
                        value={selectedVault?.overview?.apy || ''}
                        percent
                        variant="main40"
                      />
                    </>
                  )}
                </Box>
              </Box>

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
                  yAxisFormat={selectedChartDataKey === 'apy' ? '%' : selectedVault?.overview?.asset?.symbol}
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
              Owner
            </Typography>
            {isLoading ? (
              <Skeleton width={100} height={20} />
            ) : (
              selectedVault?.overview?.roles?.owner ? (
                <Address
                  address={selectedVault?.overview?.roles.owner}
                  link={`${baseUrl}/address/${selectedVault?.overview?.roles.owner}`}
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
