import { Box, Button, Paper, Skeleton, SvgIcon, Typography, useMediaQuery, useTheme } from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import { BigNumber } from 'bignumber.js';
import { formatUnits } from 'ethers/lib/utils';
import { useEffect, useState } from 'react';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { UsdChip } from 'src/components/primitives/UsdChip';
import { useVault, VaultData } from 'src/hooks/vault/useVault';
import { LightweightLineChart } from './LightweightLineChart';
import { fetchVaultHistoricalSnapshots, formatSnapshotsForChart } from 'src/hooks/vault/vaultSubgraph';
import { RewardsButton } from 'src/components/incentives/IncentivesButton';
import { useUserVaultsData, useAssetData } from 'src/hooks/vault/useVaultData';

interface VaultAssetsListItemProps {
  data: VaultData;
  onClick?: () => void;
}

export const VaultAssetsListItem = ({ data, onClick }: VaultAssetsListItemProps) => {
  const { chainId, accountAddress } = useVault();

  // Use the vault ID from the data prop, not the globally selected vault ID
  const vaultId = data?.id;

  // Normalize vault ID to lowercase for consistency
  const normalizedVaultId = vaultId?.toLowerCase();

  // Only call the hook when we have a valid vault ID and account address
  const userVaultData = useUserVaultsData(
    accountAddress || '',
    normalizedVaultId ? [normalizedVaultId] : [],
    {
      enabled: !!normalizedVaultId && !!accountAddress
    }
  );

  const theme = useTheme();
  const upToMD = useMediaQuery(theme.breakpoints.up('md'));

  // Get asset data using oracle + fallback to reserve
  const assetData = useAssetData(data?.overview?.asset?.address || '', {
    enabled: !!data?.overview?.asset?.address
  });

  const aum = data
    ? formatUnits(data?.financials?.liquidity?.totalAssets, data?.overview?.asset?.decimals || 18)
    : '0';
  const aumInUsd = new BigNumber(aum).multipliedBy(
    assetData.data?.price || 0
  );
  const maxWithdraw = userVaultData?.[0]?.data?.maxWithdraw;
  const isUserVaultDataLoading = userVaultData?.[0]?.isLoading;

  const [historicalSnapshots, setHistoricalSnapshots] = useState<{ time: string; value: number }[] | null>(null);
  useEffect(() => {
    const fetchHistoricalSnapshots = async () => {
      const snapshots = await fetchVaultHistoricalSnapshots(chainId, data.id);
      if (snapshots) {
        const formattedSnapshots = formatSnapshotsForChart(snapshots, 'apy');
        setHistoricalSnapshots(formattedSnapshots);
      }
    };
    fetchHistoricalSnapshots();
  }, [chainId, data.id]);

  return (
    <Paper
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'stretch', md: 'center' },
        padding: 5,
        gap: { xs: 3, md: 10 },
        height: '100%',
        cursor: 'pointer',
        borderRadius: (theme) => theme.spacing(2),
        border: (theme) => `0.5px solid ${theme.palette.divider}`,
        overflow: 'hidden',
        '&:hover': {
          backgroundColor: (theme) => theme.palette.background.surface,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'left',
          width: { xs: '100%', md: '50%' },
          gap: 4,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: (theme) => theme.spacing(1.5),
            }}
          >
            <img src={data?.overview?.curatorLogo || '/MOREVault.svg'} alt="Flow Logo" style={{ width: 35, height: 35 }} />
          </Box>
          <Typography fontWeight={700}>{data.overview.name}</Typography>
        </Box>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: (theme) => theme.spacing(0.8),
            }}
          >
            <Typography
              sx={{
                color: (theme) => theme.palette.text.secondary,
                fontSize: '0.875rem',
              }}
            >
              NAV
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
              <FormattedNumber
                value={aum}
                symbol={data.overview?.asset?.symbol}
                variant="main14"
                compact
              />
              <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                <UsdChip
                  value={aumInUsd.toString() || '0'}
                />
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: (theme) => theme.spacing(0.8),
            }}
          >
            <Typography
              sx={{
                color: (theme) => theme.palette.text.secondary,
                fontSize: '0.875rem',
              }}
            >
              My deposits
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
              {isUserVaultDataLoading ? (
                <Skeleton width={80} height={20} />
              ) : (
                <>
                  <FormattedNumber
                    value={formatUnits(
                      maxWithdraw?.toBigInt() || BigInt(0),
                      data?.overview?.asset?.decimals || 18
                    ) || ''}
                    symbol={data.overview?.asset?.symbol}
                    variant="main14"
                    compact
                  />
                  <UsdChip
                    value={new BigNumber(formatUnits(
                      maxWithdraw?.toBigInt() || BigInt(0),
                      data?.overview?.asset?.decimals || 18
                    ) || '0').multipliedBy(
                      assetData.data?.price || 0
                    ).toString() || '0'}
                  />
                </>
              )}
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: (theme) => theme.spacing(0.8),
            }}
          >
            <Typography
              sx={{
                color: (theme) => theme.palette.text.secondary,
                fontSize: '0.875rem',
              }}
            >
              Annualized APY
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
              <FormattedNumber
                value={data?.overview?.apy}
                percent
                variant="main14"
                compact
              />
              {data?.incentives && data?.incentives.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                  <Typography variant="main14" color="text.secondary" sx={{ ml: 1, mr: 1 }}>
                    +
                  </Typography>
                  <RewardsButton rewards={data?.incentives} />
                </Box>
              )}
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: (theme) => theme.spacing(0.8),
            }}
          >
            <Typography
              sx={{
                color: (theme) => theme.palette.text.secondary,
                fontSize: '0.875rem',
              }}
            >
              Deposit denomination
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
              <TokenIcon
                symbol={data?.overview?.asset?.symbol || ''}
                sx={{ fontSize: '16px' }}
              />
              <Typography sx={{ fontWeight: 500, textAlign: 'right' }}>
                {data?.overview?.asset?.symbol}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {upToMD && (
        <Box sx={{ width: '50%', minWidth: '40%', px: 5 }}>
          <LightweightLineChart
            height={130}
            data={historicalSnapshots}
            isInteractive={false}
            title="APY"
            yAxisFormat="%"
            isSmall={true}
          />
        </Box>
      )}

      <Button
        variant="gradient"
        sx={{
          alignSelf: { xs: 'stretch', md: 'auto' },
          mt: { xs: 2, md: 0 }
        }}
        endIcon={upToMD && (
          <SvgIcon sx={{ fontSize: '20px' }}>
            <ArrowForwardRounded />
          </SvgIcon>
        )}
      >
        <Typography variant="main14" fontWeight={600}>
          Deposit
        </Typography>
      </Button>

    </Paper>
  );
};
