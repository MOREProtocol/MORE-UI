import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Box, Grid, Skeleton, Typography, useMediaQuery, useTheme } from '@mui/material';
import BigNumber from 'bignumber.js';
import React, { useMemo } from 'react';
import { Address } from 'src/components/Address';
import { CompactMode } from 'src/components/CompactableTypography';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useVault } from 'src/hooks/vault/useVault';
import { useVaultData } from 'src/hooks/vault/useVaultData';
import { PreviewLineChart } from 'src/modules/vaults/LineChart';
import { networkConfigs } from 'src/utils/marketsAndNetworksConfig';

export const VaultOverview: React.FC = () => {
  const { selectedVaultId, chainId } = useVault();
  const { reserves } = useAppDataContext();
  const vaultData = useVaultData(selectedVaultId);

  const selectedVault = vaultData?.data;
  const isLoading = vaultData?.isLoading;
  const baseUrl = useMemo(() => chainId && networkConfigs[chainId].explorerLink, [chainId]);
  const reserve = useMemo(() => {
    return reserves.find(
      (reserve) => reserve.symbol === selectedVault?.overview?.shareCurrencySymbol
    );
  }, [reserves, selectedVault]);
  const sharePriceInUsd = new BigNumber(selectedVault?.overview?.sharePrice).multipliedBy(
    reserve?.formattedPriceInMarketReferenceCurrency
  );

  const theme = useTheme();
  const downToMd = useMediaQuery(theme.breakpoints.down('md'));

  // TODO: Nice error handling

  return (
    <Box sx={{ py: 5, px: 5 }}>
      <Grid container spacing={6} sx={{ pb: 10 }}>
        <Grid item xs={12} md={8} sx={{ gap: 30, paddingY: 5 }}>
          <Typography variant="h4" sx={{ mb: 2, pb: 4 }}>
            Vault Info
          </Typography>
          {isLoading ? (
            <Skeleton width={200} height={28} sx={{ mb: 2 }} />
          ) : (
            selectedVault?.overview?.description && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                <InfoOutlinedIcon sx={{ mr: 2, color: 'text.secondary' }} />
                <Typography variant="description">{selectedVault?.overview?.description}</Typography>
              </Box>
            )
          )}

          {/* <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
            <DownloadIcon sx={{ mr: 2, color: 'text.secondary' }} />
            <Typography
              variant="secondary14"
              onClick={() => console.log('download brochure')}
              sx={{ cursor: 'pointer', textDecoration: 'underline' }}
            >
              Download
            </Typography>
            <Typography variant="secondary14"> the vault brochure</Typography>
          </Box> */}
        </Grid>

        <Grid
          item
          xs={12}
          md={4}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Typography variant="h4" sx={{ mb: 2 }}>
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

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="main14" color="text.secondary">
            Share price
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'start', flexDirection: 'column' }}>
          {isLoading ? (
            <>
              <Skeleton width={200} height={53} sx={{ mb: 1 }} />
              <Skeleton width={100} height={28} />
            </>
          ) : (
            <>
              <FormattedNumber
                value={selectedVault?.overview?.sharePrice || ''}
                symbol={selectedVault?.overview?.shareCurrencySymbol || ''}
                variant="main40"
              />
              <FormattedNumber
                value={sharePriceInUsd.toString() || ''}
                symbol={'USD'}
                variant="secondary21"
              />
            </>
          )}
        </Box>

        {/* Price Chart */}
        <Box sx={{ height: 300, mb: 4 }}>
          <PreviewLineChart height={300} />
        </Box>
      </Box>
    </Box>
  );
};
