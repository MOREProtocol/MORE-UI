import { Avatar, Box, Grid, Stack, styled, Typography } from '@mui/material';
import React from 'react';
import { useVaultInfo } from 'src/hooks/useVaultInfo';

import { Address } from '../../components/Address';
import { ValueDisplay } from './utils/ValueDisplay';
// Styled components
const MetricCard = styled(Box)(() => ({
  paddingTop: '8px',
  paddingBottom: '24px',
  paddingRight: '24px',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}));

const SectionTitle = styled(Typography)(() => ({
  fontWeight: 600,
  marginBottom: '24px',
  fontSize: '1.5rem',
}));

const MetricLabel = styled(Typography)(() => ({
  color: '#666',
  marginBottom: '8px',
}));

export const VaultFinancials: React.FC = () => {
  // We're not using these values yet, but keeping the hook for future implementation
  const { vault, isLoading, error } = useVaultInfo();

  // Handle loading and error states
  if (isLoading) return <Typography>Loading financials data...</Typography>;
  if (error) return <Typography color="error">Error loading financials: {error}</Typography>;

  return (
    <Box sx={{ py: 5 }}>
      <Box sx={{ mb: 4 }}>
        <SectionTitle>Basics</SectionTitle>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <MetricCard>
              <MetricLabel>Gross Asset Value (GAV)</MetricLabel>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.main' }}>$</Avatar>
                <Box>
                  <ValueDisplay
                    value={vault?.financials?.basics.grossAssetValue.value}
                    suffix={vault?.financials?.basics.grossAssetValue.currency}
                    subValue={vault?.financials?.basics.grossAssetValue.value}
                    subValueSuffix={'US$'}
                  />
                </Box>
              </Stack>
            </MetricCard>
          </Grid>

          <Grid item xs={12} md={4}>
            <MetricCard>
              <MetricLabel>Net Asset Value (NAV)</MetricLabel>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.main' }}>$</Avatar>
                <Box>
                  <ValueDisplay
                    value={vault?.financials?.basics.netAssetValue.value}
                    suffix={vault?.financials?.basics.netAssetValue.currency}
                    subValue={vault?.financials?.basics.netAssetValue.value}
                    subValueSuffix={'US$'}
                  />
                </Box>
              </Stack>
            </MetricCard>
          </Grid>

          <Grid item xs={12} md={4}>
            <MetricCard>
              <MetricLabel>Share Supply</MetricLabel>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: 'warning.main' }}>R</Avatar>
                <ValueDisplay
                  value={vault?.financials?.basics.shareSupply.value}
                  suffix={vault?.financials?.basics.shareSupply.currency}
                  subValue={vault?.financials?.basics.shareSupply.value}
                  subValueSuffix={'US$'}
                />
              </Stack>
            </MetricCard>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mb: 4 }}>
        <SectionTitle>Fees</SectionTitle>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <MetricCard>
              <MetricLabel>Performance Fee (annual)</MetricLabel>
              <ValueDisplay value={vault?.financials?.fees.performance.percentage} suffix={'%'} />
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ fontSize: '0.875rem', color: '#666' }}>Recipient:</Typography>
                <Address
                  address={vault?.financials?.fees.performance.recipient}
                  link={`https://etherscan.io/address`}
                />
              </Stack>
            </MetricCard>
          </Grid>

          <Grid item xs={12} md={4}>
            <MetricCard>
              <MetricLabel>Management Fee (annual)</MetricLabel>
              <ValueDisplay value={vault?.financials?.fees.management.percentage} suffix={'%'} />
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ fontSize: '0.875rem', color: '#666' }}>Recipient:</Typography>
                <Address
                  address={vault?.financials?.fees.management.recipient}
                  link={`https://etherscan.io/address`}
                />
              </Stack>
            </MetricCard>
          </Grid>

          <Grid item xs={12} md={4}>
            <MetricCard>
              <MetricLabel>Network Fee (annual)</MetricLabel>
              <ValueDisplay value={vault?.financials?.fees.network.percentage} suffix={'%'} />
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ fontSize: '0.875rem', color: '#666' }}>Recipient:</Typography>
                <Address
                  address={vault?.financials?.fees.network.recipient}
                  link={`https://etherscan.io/address`}
                />
              </Stack>
            </MetricCard>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mb: 4 }}>
        <SectionTitle>Return metrics</SectionTitle>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard>
              <MetricLabel>Return Month-to-Date</MetricLabel>
              <ValueDisplay
                value={vault?.financials?.returnMetrics.monthToDate}
                isPercentage={true}
              />
            </MetricCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard>
              <MetricLabel>Return Quarter-to-Date</MetricLabel>
              <ValueDisplay
                value={vault?.financials?.returnMetrics.quarterToDate}
                isPercentage={true}
              />
            </MetricCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard>
              <MetricLabel>Return Year-to-Date</MetricLabel>
              <ValueDisplay
                value={vault?.financials?.returnMetrics.yearToDate}
                isPercentage={true}
              />
            </MetricCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard>
              <MetricLabel>Return Inception-to-Date</MetricLabel>
              <ValueDisplay
                value={vault?.financials?.returnMetrics.inceptionToDate}
                isPercentage={true}
              />
            </MetricCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard>
              <MetricLabel>Average Month</MetricLabel>
              <ValueDisplay
                value={vault?.financials?.returnMetrics.averageMonth}
                isPercentage={true}
              />
            </MetricCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard>
              <MetricLabel>Best Month</MetricLabel>
              <ValueDisplay
                value={vault?.financials?.returnMetrics.bestMonth}
                isPercentage={true}
              />
            </MetricCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard>
              <MetricLabel>Worst Month</MetricLabel>
              <ValueDisplay
                value={vault?.financials?.returnMetrics.worstMonth}
                isPercentage={true}
              />
            </MetricCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard>
              <MetricLabel>Length of Track Record</MetricLabel>
              <ValueDisplay
                value={vault?.financials?.returnMetrics.trackRecord}
                suffix="months"
                valueVisibleDecimals={0}
              />
            </MetricCard>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};
