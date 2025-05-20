import { Box, Grid, Skeleton, Stack, styled, Typography } from '@mui/material';
import BigNumber from 'bignumber.js';
import { formatUnits } from 'ethers/lib/utils';
import React, { useMemo } from 'react';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useVault } from 'src/hooks/vault/useVault';
import { useVaultData } from 'src/hooks/vault/useVaultData';

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
  fontSize: '1.3rem',
}));

export const VaultFinancials: React.FC = () => {
  const { selectedVaultId } = useVault();
  const vaultData = useVaultData(selectedVaultId);
  const { reserves } = useAppDataContext();
  const selectedVault = vaultData?.data;
  const isLoading = vaultData?.isLoading;

  const reserve = useMemo(() => {
    return reserves.find(
      (reserve) => reserve.symbol === selectedVault?.overview?.shareCurrencySymbol
    );
  }, [reserves, selectedVault]);

  const aum = selectedVault
    ? formatUnits(
      selectedVault?.financials?.liquidity?.totalAssets,
      selectedVault?.overview?.assetDecimals
    )
    : '0';
  const aumInUsd = new BigNumber(aum).multipliedBy(
    reserve?.formattedPriceInMarketReferenceCurrency
  );

  const renderMetricCardContent = (title: string, content: React.ReactElement) => (
    <MetricCard>
      {isLoading ? (
        <>
          <Skeleton variant="text" width="60%" height={24} sx={{ mb: 3 }} />
          <Stack direction="row" spacing={2} alignItems="center">
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="80%" height={32} />
              <Skeleton variant="text" width="50%" height={20} />
            </Box>
          </Stack>
        </>
      ) : (
        <>
          <Typography variant="main16" color="text.secondary" marginBottom={3}>
            {title}
          </Typography>
          {content}
        </>
      )}
    </MetricCard>
  );

  return (
    <Box sx={{ py: 8, px: 5 }}>
      <Box sx={{ mb: 4 }}>
        <SectionTitle>Basics</SectionTitle>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            {renderMetricCardContent(
              'Asset Under Management',
              <Stack direction="row" spacing={2} alignItems="center">
                <TokenIcon
                  symbol={selectedVault?.overview?.shareCurrencySymbol || ''}
                  sx={{ fontSize: '40px' }}
                />
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                  }}
                >
                  <FormattedNumber
                    value={aum}
                    symbol={selectedVault?.overview?.shareCurrencySymbol}
                    variant="main16"
                    compact
                  />
                  <FormattedNumber
                    value={aumInUsd.toString()}
                    symbol={'USD'}
                    variant="secondary14"
                    compact
                  />
                </Box>
              </Stack>
            )}
          </Grid>

          {selectedVault?.financials?.returnMetrics?.dayToDate ? (
            <Grid item xs={12} md={4}>
              <MetricCard>
                <Typography variant="main16" color="text.secondary" marginBottom={3}>
                  Return Day-to-Date
                </Typography>
                <FormattedNumber
                  value={selectedVault?.financials?.returnMetrics?.dayToDate}
                  coloredPercent
                  variant="main21"
                  compact
                />
              </MetricCard>
            </Grid>
          ) : null}

          {selectedVault?.financials?.returnMetrics?.weekToDate ? (
            <Grid item xs={12} md={4}>
              <MetricCard>
                <Typography variant="main16" color="text.secondary" marginBottom={3}>
                  Return Week-to-Date
                </Typography>
                <FormattedNumber
                  value={selectedVault?.financials?.returnMetrics?.weekToDate}
                  coloredPercent
                  variant="main21"
                  compact
                />
              </MetricCard>
            </Grid>
          ) : null}

          {selectedVault?.financials?.returnMetrics?.monthToDate ? (
            <Grid item xs={12} md={4}>
              <MetricCard>
                <Typography variant="main16" color="text.secondary" marginBottom={3}>
                  Return Month-to-Date
                </Typography>
                <FormattedNumber
                  value={selectedVault?.financials?.returnMetrics?.monthToDate}
                  coloredPercent
                  variant="main21"
                  compact
                />
              </MetricCard>
            </Grid>
          ) : null}
        </Grid>
      </Box>

      {/* <Box sx={{ mb: 4 }}>
        <SectionTitle>Fees</SectionTitle>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <MetricCard>
              <Typography variant="main16" color="text.secondary" marginBottom={3}>
                Performance Fee (annual)
              </Typography>
              <FormattedNumber
                value={selectedVault?.financials?.fees.performance.percentage}
                percent
                variant="main21"
                compact
              />
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ fontSize: '0.875rem', color: '#666' }}>Recipient:</Typography>
                <Address
                  address={selectedVault?.financials?.fees.performance.recipient}
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
                value={selectedVault?.financials?.fees.management.percentage}
                percent
                variant="main21"
                compact
              />
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ fontSize: '0.875rem', color: '#666' }}>Recipient:</Typography>
                <Address
                  address={selectedVault?.financials?.fees.management.recipient}
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
                value={selectedVault?.financials?.fees.network.percentage}
                percent
                variant="main21"
                compact
              />
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ fontSize: '0.875rem', color: '#666' }}>Recipient:</Typography>
                <Address
                  address={selectedVault?.financials?.fees.network.recipient}
                  link={`https://etherscan.io/address`}
                />
              </Stack>
            </MetricCard>
          </Grid>
        </Grid>
      </Box> */}

      <Box sx={{ mb: 4 }}>
        <SectionTitle>Liquidity</SectionTitle>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard>
              <Typography variant="main16" color="text.secondary" marginBottom={3}>
                Deposit Capacity
              </Typography>
              <FormattedNumber
                value={
                  Number(selectedVault?.financials?.liquidity?.totalAssets) /
                  Number(selectedVault?.financials?.liquidity?.maxDeposit)
                }
                percent
                variant="main21"
                compact
              />
              {/* <FormattedNumber
                value={
                  selectedVault
                    ? formatUnits(
                        selectedVault?.financials?.liquidity?.maxDeposit,
                        selectedVault?.overview?.assetDecimals
                      )
                    : '0'
                }
                symbol={selectedVault?.overview?.shareCurrencySymbol}
                variant="secondary14"
                compact
              /> */}
            </MetricCard>
          </Grid>

          {/* <Grid item xs={12} sm={6} md={3}>
            <MetricCard>
              <Typography variant="main16" color="text.secondary" marginBottom={3}>
                Return Quarter-to-Date
              </Typography>
              <FormattedNumber
                value={selectedVault?.financials?.returnMetrics.quarterToDate}
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
                value={selectedVault?.financials?.returnMetrics.yearToDate}
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
                value={selectedVault?.financials?.returnMetrics.inceptionToDate}
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
                value={selectedVault?.financials?.returnMetrics.averageMonth}
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
                value={selectedVault?.financials?.returnMetrics.bestMonth}
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
                value={selectedVault?.financials?.returnMetrics.worstMonth}
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
                value={selectedVault?.financials?.returnMetrics.trackRecord}
                symbol=" months"
                visibleDecimals={0}
                variant="main21"
                compact
              />
            </MetricCard>
          </Grid> */}
        </Grid>
      </Box>

      {/* <Box sx={{ mb: 4 }}>
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
      </Box> */}
    </Box>
  );
};
