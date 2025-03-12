import ShieldIcon from '@mui/icons-material/Shield';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { Avatar, Box, Grid, Rating, Stack, styled, Typography } from '@mui/material';
import React from 'react';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { useVaultInfo } from 'src/hooks/useVaultInfo';

import { Address } from '../../components/Address';

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
  fontWeight: 700,
  marginBottom: 6,
  fontSize: '1.5rem',
}));

export const VaultFinancials: React.FC = () => {
  // We're not using these values yet, but keeping the hook for future implementation
  const { vault } = useVaultInfo();

  // TODO: Nice error handling

  return (
    <Box sx={{ py: 8 }}>
      <Box sx={{ mb: 4 }}>
        <SectionTitle>Basics</SectionTitle>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <MetricCard>
              <Typography variant="main16" color="text.secondary" marginBottom={3}>
                Gross Asset Value (GAV)
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.main' }}>$</Avatar>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                  }}
                >
                  <FormattedNumber
                    value={vault?.financials?.basics.grossAssetValue.value}
                    symbol={vault?.financials?.basics.grossAssetValue.currency}
                    variant="main21"
                    compact
                  />
                  <FormattedNumber
                    value={vault?.financials?.basics.grossAssetValue.value}
                    symbol={'USD'}
                    variant="secondary14"
                    compact
                  />
                </Box>
              </Stack>
            </MetricCard>
          </Grid>

          <Grid item xs={12} md={4}>
            <MetricCard>
              <Typography variant="main16" color="text.secondary" marginBottom={3}>
                Net Asset Value (NAV)
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.main' }}>$</Avatar>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                  }}
                >
                  <FormattedNumber
                    value={vault?.financials?.basics.netAssetValue.value}
                    symbol={vault?.financials?.basics.netAssetValue.currency}
                    variant="main21"
                    compact
                  />
                  <FormattedNumber
                    value={vault?.financials?.basics.netAssetValue.value}
                    symbol={'USD'}
                    variant="secondary14"
                    compact
                  />
                </Box>
              </Stack>
            </MetricCard>
          </Grid>

          <Grid item xs={12} md={4}>
            <MetricCard>
              <Typography variant="main16" color="text.secondary" marginBottom={3}>
                Share Supply
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: 'warning.main' }}>R</Avatar>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                  }}
                >
                  <FormattedNumber
                    value={vault?.financials?.basics.shareSupply.value}
                    symbol={vault?.financials?.basics.shareSupply.currency}
                    variant="main21"
                    compact
                  />
                  <FormattedNumber
                    value={vault?.financials?.basics.shareSupply.value}
                    symbol={'USD'}
                    variant="secondary14"
                    compact
                  />
                </Box>
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
              <Typography variant="main16" color="text.secondary" marginBottom={3}>
                Performance Fee (annual)
              </Typography>
              <FormattedNumber
                value={vault?.financials?.fees.performance.percentage}
                percent
                variant="main21"
                compact
              />
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
              <Typography variant="main16" color="text.secondary" marginBottom={3}>
                Management Fee (annual)
              </Typography>
              <FormattedNumber
                value={vault?.financials?.fees.management.percentage}
                percent
                variant="main21"
                compact
              />
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
              <Typography variant="main16" color="text.secondary" marginBottom={3}>
                Network Fee (annual)
              </Typography>
              <FormattedNumber
                value={vault?.financials?.fees.network.percentage}
                percent
                variant="main21"
                compact
              />
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
              <Typography variant="main16" color="text.secondary" marginBottom={3}>
                Return Month-to-Date
              </Typography>
              <FormattedNumber
                value={vault?.financials?.returnMetrics.monthToDate}
                coloredPercent
                variant="main21"
                compact
              />
            </MetricCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard>
              <Typography variant="main16" color="text.secondary" marginBottom={3}>
                Return Quarter-to-Date
              </Typography>
              <FormattedNumber
                value={vault?.financials?.returnMetrics.quarterToDate}
                coloredPercent
                variant="main21"
                compact
              />
            </MetricCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard>
              <Typography variant="main16" color="text.secondary" marginBottom={3}>
                Return Year-to-Date
              </Typography>
              <FormattedNumber
                value={vault?.financials?.returnMetrics.yearToDate}
                coloredPercent
                variant="main21"
                compact
              />
            </MetricCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard>
              <Typography variant="main16" color="text.secondary" marginBottom={3}>
                Return Inception-to-Date
              </Typography>
              <FormattedNumber
                value={vault?.financials?.returnMetrics.inceptionToDate}
                coloredPercent
                variant="main21"
                compact
              />
            </MetricCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard>
              <Typography variant="main16" color="text.secondary" marginBottom={3}>
                Average Month
              </Typography>
              <FormattedNumber
                value={vault?.financials?.returnMetrics.averageMonth}
                coloredPercent
                variant="main21"
                compact
              />
            </MetricCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard>
              <Typography variant="main16" color="text.secondary" marginBottom={3}>
                Best Month
              </Typography>
              <FormattedNumber
                value={vault?.financials?.returnMetrics.bestMonth}
                coloredPercent
                variant="main21"
                compact
              />
            </MetricCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard>
              <Typography variant="main16" color="text.secondary" marginBottom={3}>
                Worst Month
              </Typography>
              <FormattedNumber
                value={vault?.financials?.returnMetrics.worstMonth}
                coloredPercent
                variant="main21"
                compact
              />
            </MetricCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard>
              <Typography variant="main16" color="text.secondary" marginBottom={3}>
                Length of Track Record
              </Typography>
              <FormattedNumber
                value={vault?.financials?.returnMetrics.trackRecord}
                symbol=" months"
                visibleDecimals={0}
                variant="main21"
                compact
              />
            </MetricCard>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mb: 4 }}>
        <SectionTitle>Risk metrics</SectionTitle>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard>
              <Typography variant="main16" color="text.secondary" marginBottom={3}>
                Annualized Volatility
              </Typography>
              <FormattedNumber value={0.1242} percent variant="main21" compact />
            </MetricCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard>
              <Typography variant="main16" color="text.secondary" marginBottom={3}>
                Sharp Ratio
              </Typography>
              <FormattedNumber value={0.21} visibleDecimals={2} variant="main21" compact />
            </MetricCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <MetricCard>
              <Typography variant="main16" color="text.secondary" marginBottom={3}>
                Risk Rating
              </Typography>
              <Box>
                <Rating
                  name="risk-rating"
                  value={3.5}
                  precision={0.5}
                  max={5}
                  readOnly
                  icon={<ShieldIcon color="primary" />}
                  emptyIcon={<ShieldOutlinedIcon />}
                />
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mt: 0.5,
                    width: 'calc(5 * 24px)',
                  }}
                >
                  <Typography variant="caption" fontSize={9} color="text.secondary">
                    Aggressive
                  </Typography>
                  <Typography variant="caption" fontSize={9} color="text.secondary">
                    Defensive
                  </Typography>
                </Box>
              </Box>
            </MetricCard>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};
