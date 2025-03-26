import DownloadIcon from '@mui/icons-material/Download';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Box, Grid, Typography, useMediaQuery, useTheme } from '@mui/material';
import React from 'react';
import { Address } from 'src/components/Address';
import { CompactMode } from 'src/components/CompactableTypography';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { useVaultInfo } from 'src/hooks/useVaultInfo';
import { LineChart } from 'src/modules/vaults/LineChart';

// Generate fake price data for the chart
const generatePriceData = () => {
  const data = [];
  const numPoints = 100;

  for (let i = 0; i < numPoints; i++) {
    // Create a wavy pattern with some randomness
    const baseValue = 25 + Math.sin(i / 5) * 10 + Math.sin(i / 10) * 5;
    const randomFactor = Math.random() * 2 - 1; // Random value between -1 and 1
    const y = baseValue + randomFactor * 3;

    data.push({ x: i, y });
  }

  return data;
};

export const VaultOverview: React.FC = () => {
  const { vault, isLoading } = useVaultInfo();
  const theme = useTheme();
  const downToMd = useMediaQuery(theme.breakpoints.down('md'));

  const priceData = generatePriceData();

  // TODO: Nice error handling

  return (
    <Box sx={{ py: 5, px: 5 }}>
      <Grid container spacing={6} sx={{ pb: 10 }}>
        <Grid item xs={12} md={8} sx={{ gap: 30, paddingY: 5 }}>
          <Typography variant="h4" sx={{ mb: 2, pb: 4 }}>
              Vault Info
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <InfoOutlinedIcon sx={{ mr: 2, color: 'text.secondary' }} />
            <Typography variant="description">{vault?.overview?.description}</Typography>
          </Box>

          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
            <DownloadIcon sx={{ mr: 2, color: 'text.secondary' }} />
            <Typography
              variant="secondary14"
              onClick={() => console.log('download brochure')}
              sx={{ cursor: 'pointer', textDecoration: 'underline' }}
            >
              Download
            </Typography>
            <Typography variant="secondary14"> the vault brochure</Typography>
          </Box>
        </Grid>

        <Grid item xs={12} md={4}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Typography variant="h4" sx={{ mb: 2 }}>
            Vault Roles
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="main14" sx={{ py: 2 }}>
              Owner
            </Typography>
            <Address
              address={vault?.overview?.roles.owner}
              link={`https://etherscan.io/address`}
              loading={isLoading}
              isUser
              variant="secondary14"
              compactMode={downToMd ? CompactMode.SM : CompactMode.MD}
            />
          </Box>
          <Box>
            <Typography variant="main14" sx={{ py: 2 }}>
              Manager
            </Typography>
            <Address
              address={vault?.overview?.roles.manager}
              link={`https://etherscan.io/address`}
              loading={isLoading}
              isUser
              variant="secondary14"
              compactMode={downToMd ? CompactMode.SM : CompactMode.MD}
            />
          </Box>
          <Box>
            <Typography variant="main14" sx={{ py: 2 }}>
              Guardian
            </Typography>
            <Address
              address={vault?.overview?.roles.guardian}
              link={`https://etherscan.io/address`}
              loading={isLoading}
              isUser
              variant="secondary14"
              compactMode={downToMd ? CompactMode.SM : CompactMode.MD}
            />
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="main14" color="text.secondary">
            Share price
          </Typography>
        </Box>
        <FormattedNumber
          value={vault?.overview?.sharePrice}
          symbol="USD"
          compact
          variant="main40"
        />

        {/* Price Chart */}
        <Box sx={{ height: 300, mb: 4 }}>
          <LineChart data={priceData} height={300} />
        </Box>
      </Box>
    </Box>
  );
};
