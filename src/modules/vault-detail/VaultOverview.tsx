import DownloadIcon from '@mui/icons-material/Download';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import React from 'react';
import { Address } from 'src/components/Address';
import { CompactMode } from 'src/components/CompactableTypography';
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
  const { vault, isLoading, error } = useVaultInfo();
  const theme = useTheme();
  const downToMd = useMediaQuery(theme.breakpoints.down('md'));

  const priceData = generatePriceData();

  if (isLoading) return <div>Loading overview data...</div>;
  if (error) return <div>Error loading overview: {error}</div>;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, padding: 5 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <InfoOutlinedIcon sx={{ mr: 2, color: 'text.secondary' }} />
            <Typography variant="description">{vault?.overview?.description}</Typography>
          </Box>

          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
            <DownloadIcon sx={{ mr: 2, color: 'text.secondary' }} />
            <Typography
              variant="description"
              onClick={() => console.log('download brochure')}
              sx={{ cursor: 'pointer' }}
            >
              Download the vault brochure
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: '300px' }}>
          <Typography variant="subheader1" sx={{ mb: 2 }}>
            Vault Roles
          </Typography>
          <Box>
            <Typography variant="description">Owner</Typography>
            <Address
              address={vault?.overview?.roles.owner}
              link={`https://etherscan.io/address`}
              loading={isLoading}
              compactMode={downToMd ? CompactMode.SM : CompactMode.MD}
            />
          </Box>
          <Box>
            <Typography variant="description">Manager</Typography>
            <Address
              address={vault?.overview?.roles.manager}
              link={`https://etherscan.io/address`}
              loading={isLoading}
              compactMode={downToMd ? CompactMode.SM : CompactMode.MD}
            />
          </Box>
          <Box>
            <Typography variant="description">Guardian</Typography>
            <Address
              address={vault?.overview?.roles.guardian}
              link={`https://etherscan.io/address`}
              loading={isLoading}
              compactMode={downToMd ? CompactMode.SM : CompactMode.MD}
            />
          </Box>
        </Box>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="description" color="text.secondary">
            Share price
          </Typography>
        </Box>
        <Typography variant="h2" component="div" sx={{ mb: 3 }}>
          {vault?.overview?.sharePrice}
        </Typography>

        {/* Price Chart */}
        <Box sx={{ height: 300, mb: 4 }}>
          <LineChart data={priceData} height={300} />
        </Box>
      </Box>
    </Box>
  );
};
