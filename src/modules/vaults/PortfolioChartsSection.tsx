import { Box, Typography, Skeleton, useTheme, useMediaQuery, SvgIcon, Tooltip, Button } from '@mui/material';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { useState } from 'react';

import { PnLChart } from '../charts/PnLChart';
import { LineChart } from '../charts/LineChart';
import { TimePeriod } from '../charts/timePeriods';
import { useUserPortfolioMetrics } from 'src/hooks/vault/useVaultData';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';

type Props = {
  accountAddress?: string;
  aggregatedUserDepositsUsd?: string;
  positionsApy?: number;
  isLoadingVaults: boolean;
  isLoading: boolean;
  claimableRewardsUsd: number;
  onOpenRewardModal: () => void;
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
};

export const PortfolioChartsSection = ({
  accountAddress,
  aggregatedUserDepositsUsd,
  positionsApy,
  isLoadingVaults,
  isLoading,
  claimableRewardsUsd,
  onOpenRewardModal,
  selectedPeriod,
  onPeriodChange,
}: Props) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [selectedChartDataKey, setSelectedChartDataKey] = useState<'portfolioValue' | 'pnl'>('portfolioValue');
  // chart key is local-only UI state

  // Fetch portfolio metrics locally here (for charts and KPIs)
  const portfolioMetricsQuery = useUserPortfolioMetrics(accountAddress || '', selectedPeriod, {
    enabled: !!accountAddress,
    keepPreviousData: true,
  });
  const portfolioMetrics = portfolioMetricsQuery?.data;
  const isLoadingPortfolioMetrics = portfolioMetricsQuery?.isLoading;
  const isInitialLoadingPortfolioMetrics = isLoadingPortfolioMetrics && !portfolioMetrics;

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'left',
      flexDirection: { xs: 'column', md: 'row' },
      gap: { xs: 2, md: 5 },
      mt: 4,
    }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 3, md: 4 },
            mb: { xs: 4, md: 0 },
            height: '100%',
          }}
        >
          {/* KPI Grid - align with VaultDetail left metrics */}
          <Box
            sx={{
              backgroundColor: 'background.paper',
              borderRadius: 2,
              p: { xs: 4, md: 6 },
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', xsm: '1fr 1fr' },
              gap: 3,
            }}
          >
            {/* Realized P&L */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="secondary14" color="text.secondary">
                  Realized P&L
                </Typography>
                <Tooltip
                  title={
                    <Box>
                      <Typography variant="main12" sx={{ fontWeight: 600 }}>
                        Last update
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="secondary12" sx={{ color: '#F1F1F3' }}>
                          {portfolioMetrics?.lastUpdatedTimestamp
                            ? new Date(portfolioMetrics.lastUpdatedTimestamp * 1000).toLocaleString()
                            : '-'}
                        </Typography>
                      </Box>
                    </Box>
                  }
                  arrow
                  placement="top"
                >
                  <InfoIcon sx={{ fontSize: '14px', color: 'text.secondary' }} />
                </Tooltip>
              </Box>
              {isInitialLoadingPortfolioMetrics ? (
                <Skeleton width={80} height={24} />
              ) : portfolioMetrics ? (
                <FormattedNumber
                  value={portfolioMetrics?.totalRealizedPnLUSD || '0'}
                  symbol="USD"
                  variant="main16"
                  sx={{ fontWeight: 800 }}
                />
              ) : (
                <Typography variant="main16">–</Typography>
              )}
            </Box>

            {/* Unrealized P&L */}
            <Box>
              <Typography variant="secondary14" color="text.secondary">
                Unrealized P&L
              </Typography>
              {isInitialLoadingPortfolioMetrics ? (
                <Skeleton width={80} height={24} />
              ) : portfolioMetrics ? (
                <FormattedNumber
                  value={portfolioMetrics?.totalUnrealizedPnLUSD || '0'}
                  symbol="USD"
                  variant="main16"
                  sx={{ fontWeight: 800 }}
                />
              ) : (
                <Typography variant="main16">–</Typography>
              )}
            </Box>

            <Box>
              <Typography variant="secondary14" color="text.secondary">
                Positions APY
              </Typography>
              {isInitialLoadingPortfolioMetrics || isLoadingVaults ? (
                <Skeleton width={80} height={24} />
              ) : (!accountAddress || positionsApy === undefined || !portfolioMetrics) ? (
                <Typography variant="main16">–</Typography>
              ) : (
                <FormattedNumber
                  value={positionsApy}
                  percent
                  variant="main16"
                  sx={{ fontWeight: 800 }}
                />
              )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'left' }}>
              <Typography variant="secondary14" color="text.secondary" sx={{ mb: 1 }}>
                Available Rewards
              </Typography>
              {(!accountAddress || claimableRewardsUsd === 0) ? (
                <Typography variant="main16">–</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                  <FormattedNumber
                    value={claimableRewardsUsd}
                    variant="main16"
                    visibleDecimals={2}
                    compact
                    symbol="USD"
                    symbolsColor="#A5A8B6"
                    symbolsVariant="secondary16"
                  />
                  <Button
                    variant="gradient"
                    size="small"
                    onClick={onOpenRewardModal}
                    sx={{ minWidth: 'unset', ml: { xs: 0, xsm: 2 } }}
                  >
                    Claim
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 5,
        backgroundColor: 'background.paper',
        borderRadius: 2,
        position: 'relative'
      }}>
        <Box sx={{
          position: 'absolute',
          top: { xs: 8, md: 12 },
          left: { xs: 8, md: 12 },
          zIndex: 10,
          display: 'flex',
          alignItems: 'left',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: { xs: 2, sm: 3 },
          px: { xs: 2, md: 3 },
          py: { xs: 1, md: 2 },
        }}>
          <Box sx={{ display: 'flex', alignItems: 'left', flexDirection: 'column', gap: 0 }}>
            <Typography variant="secondary14" color="text.secondary">My Deposits</Typography>
            <Box
              onClick={() => setSelectedChartDataKey('portfolioValue')}
              sx={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                flexDirection: 'row',
                gap: 1,
                border: isLoading ? 'none' : selectedChartDataKey === 'portfolioValue' ? '1.5px solid #FF9900' : '1.5px solid #E0E0E0',
                borderRadius: '6px',
                padding: '2px 6px',
                width: 'fit-content',
                backdropFilter: 'blur(2px)',
                '&:hover': {
                  backgroundColor: theme.palette.background.surface,
                  border: `1.5px solid ${theme.palette.text.muted}`,
                },
              }}>
              {isLoading ? <Skeleton width={60} height={24} /> : <>
                <FormattedNumber
                  value={aggregatedUserDepositsUsd || '0'}
                  symbol="USD"
                  variant="main16"
                  sx={{ fontWeight: 800 }}
                />
                <SvgIcon sx={{
                  fontSize: '20px',
                  color: selectedChartDataKey === 'portfolioValue' ? "#FF9900" : theme.palette.text.muted,
                }}
                >
                  <ShowChartIcon />
                </SvgIcon>
              </>}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'left', flexDirection: 'column', gap: 0 }}>
            <Typography variant="secondary14" color="text.secondary">My P&L</Typography>
            <Box sx={{ display: 'flex', alignItems: 'left', flexDirection: 'row', gap: 1 }}>
              <Box
                onClick={() => setSelectedChartDataKey('pnl')}
                sx={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 1,
                  border: isLoading ? 'none' : selectedChartDataKey === 'pnl' ? '1.5px solid #FF9900' : '1.5px solid #E0E0E0',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  width: 'fit-content',
                  backdropFilter: 'blur(2px)',
                  '&:hover': {
                    backgroundColor: theme.palette.background.surface,
                    border: `1.5px solid ${theme.palette.text.muted}`,
                  },
                }}>
                {isInitialLoadingPortfolioMetrics ? <Skeleton width={60} height={24} /> : <>
                  <FormattedNumber
                    value={(portfolioMetrics?.totalRealizedPnLUSD || 0) + (portfolioMetrics?.totalUnrealizedPnLUSD || 0)}
                    symbol="USD"
                    variant="main16"
                    sx={{ fontWeight: 800 }}
                  />
                  <SvgIcon sx={{
                    fontSize: '20px',
                    color: selectedChartDataKey === 'pnl' ? "#FF9900" : theme.palette.text.muted,
                  }}
                  >
                    <ShowChartIcon />
                  </SvgIcon>
                </>}
              </Box>
            </Box>
          </Box>
        </Box>
        <Box sx={{
          backgroundColor: 'background.paper',
          py: { xs: 2, md: 6 },
          pl: { xs: 2, md: 6 },
          borderRadius: 2,
        }}>
          {isInitialLoadingPortfolioMetrics ? (
            <Skeleton variant="rectangular" width="100%" height={250} />
          ) : selectedChartDataKey === "portfolioValue" ? (
            portfolioMetrics?.dailyAmountEvolution && portfolioMetrics?.dailyAmountEvolution?.length > 0 ? (
              <LineChart
                data={portfolioMetrics?.dailyAmountEvolution}
                height={isMobile ? 200 : 250}
                isInteractive={true}
                isSmall={isMobile}
                yAxisFormat="USD"
                showTimePeriodSelector={true}
                selectedPeriod={selectedPeriod}
                onPeriodChange={onPeriodChange}
              />
            ) : (
              <Typography sx={{ textAlign: 'center', pt: 20 }}>
                No historical data available for Portfolio Value.
              </Typography>
            )) : (
            portfolioMetrics?.dailyPnLEvolution && portfolioMetrics?.dailyPnLEvolution?.length > 0 ? (
              <PnLChart
                data={portfolioMetrics?.dailyPnLEvolution}
                percentData={portfolioMetrics?.dailyPnLPercentEvolution}
                height={isMobile ? 200 : 250}
                isInteractive={true}
                isSmall={isMobile}
                topOffset={50}
                showTimePeriodSelector={true}
                selectedPeriod={selectedPeriod}
                onPeriodChange={onPeriodChange}
              />
            ) : (
              <Typography sx={{ textAlign: 'center', pt: 20 }}>
                No historical data available for P&L.
              </Typography>
            ))
          }
        </Box>
      </Box>
    </Box>
  );
};


