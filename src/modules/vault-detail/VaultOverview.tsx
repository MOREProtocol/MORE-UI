import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Box, Grid, Typography, useMediaQuery, useTheme } from '@mui/material';
import React, { useMemo } from 'react';
import { Address } from 'src/components/Address';
import { CompactMode } from 'src/components/CompactableTypography';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { useVault } from 'src/hooks/vault/useVault';
import { useVaultData } from 'src/hooks/vault/useVaultData';
import { PreviewLineChart } from 'src/modules/vaults/LineChart';
import { networkConfigs } from 'src/utils/marketsAndNetworksConfig';

export const VaultOverview: React.FC = () => {
  const { selectedVaultId, isLoading, chainId } = useVault();
  const vaultData = useVaultData(selectedVaultId);
  const selectedVault = vaultData?.data;
  const baseUrl = useMemo(() => chainId && networkConfigs[chainId].explorerLink, [chainId]);

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
          {selectedVault?.overview?.description && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <InfoOutlinedIcon sx={{ mr: 2, color: 'text.secondary' }} />
              <Typography variant="description">{selectedVault?.overview?.description}</Typography>
            </Box>
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

        {selectedVault?.overview?.roles && (
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
            {selectedVault?.overview?.roles?.curator && (
              <Box>
                <Typography variant="main14" sx={{ py: 2 }}>
                  Curator
                </Typography>
                <Address
                  address={selectedVault?.overview?.roles.curator}
                  link={`${baseUrl}/address/${selectedVault?.overview?.roles.curator}`}
                  loading={isLoading}
                  isUser
                  variant="secondary14"
                  compactMode={downToMd ? CompactMode.SM : CompactMode.MD}
                />
              </Box>
            )}
            {selectedVault?.overview?.roles?.guardian && (
              <Box>
                <Typography variant="main14" sx={{ py: 2 }}>
                  Guardian
                </Typography>
                <Address
                  address={selectedVault?.overview?.roles.guardian}
                  link={`${baseUrl}/address/${selectedVault?.overview?.roles.guardian}`}
                  loading={isLoading}
                  isUser
                  variant="secondary14"
                  compactMode={downToMd ? CompactMode.SM : CompactMode.MD}
                />
              </Box>
            )}
          </Grid>
        )}
      </Grid>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="main14" color="text.secondary">
            Share price
          </Typography>
        </Box>
        <FormattedNumber
          value={selectedVault?.overview?.sharePrice || ''}
          symbol="USD"
          compact
          variant="main40"
        />

        {/* Price Chart */}
        <Box sx={{ height: 300, mb: 4 }}>
          <PreviewLineChart height={300} />
        </Box>
      </Box>
    </Box>
  );
};
