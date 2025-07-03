import { Box, Paper, Typography, useMediaQuery, useTheme } from '@mui/material';
import { BigNumber } from 'bignumber.js';
import { formatUnits } from 'ethers/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { useVault, VaultData } from 'src/hooks/vault/useVault';
import { LightweightLineChart } from './LightweightLineChart';
import { fetchVaultHistoricalSnapshots, formatSnapshotsForChart } from 'src/hooks/vault/vaultSubgraph';

interface VaultAssetsListItemProps {
  data: VaultData;
  onClick?: () => void;
}

export const VaultAssetsListItem = ({ data, onClick }: VaultAssetsListItemProps) => {
  const { reserves } = useAppDataContext();
  const { chainId } = useVault();
  const theme = useTheme();
  const upToMD = useMediaQuery(theme.breakpoints.up('md'));
  const reserve = useMemo(() => {
    return reserves.find((reserve) => reserve.underlyingAsset.toLowerCase() === data?.overview?.asset?.address?.toLowerCase());
  }, [reserves, data]);

  const aum = data
    ? formatUnits(data?.financials?.liquidity?.totalAssets, data?.overview?.asset?.decimals || 18)
    : '0';
  const aumInUsd = new BigNumber(aum).multipliedBy(
    reserve?.formattedPriceInMarketReferenceCurrency
  );
  const sharePrice = data?.overview?.sharePrice;
  const sharePriceInUsd = new BigNumber(sharePrice).multipliedBy(
    reserve?.formattedPriceInMarketReferenceCurrency
  );

  const [historicalSnapshots, setHistoricalSnapshots] = useState<{ time: string; value: number }[] | null>(null);
  useEffect(() => {
    const fetchHistoricalSnapshots = async () => {
      const snapshots = await fetchVaultHistoricalSnapshots(chainId, data.id);
      if (snapshots) {
        const formattedSnapshots = formatSnapshotsForChart(snapshots, 'totalSupply');
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
        flexDirection: 'row',
        padding: 5,
        gap: 15,
        height: '100%',
        cursor: 'pointer',
        borderRadius: (theme) => theme.spacing(2),
        border: (theme) => `0.5px solid ${theme.palette.divider}`,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'left',
          width: upToMD ? '50%' : '100%',
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
            <img src={'/MOREVault.svg'} alt="Flow Logo" style={{ width: 35, height: 35 }} />
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
              AUM
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
              <FormattedNumber
                value={aum}
                symbol={data.overview?.asset?.symbol}
                variant="main14"
                compact
              />
              <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                <Typography variant="secondary14" color="text.secondary">
                  {'('}
                </Typography>
                <FormattedNumber
                  value={aumInUsd.toString()}
                  symbol={'USD'}
                  variant="secondary14"
                  compact
                />
                <Typography variant="secondary14" color="text.secondary">
                  {')'}
                </Typography>
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
              Share Price
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
              <FormattedNumber
                value={sharePrice}
                symbol={data?.overview?.asset?.symbol}
                variant="main14"
                compact
              />
              <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                <Typography variant="secondary14" color="text.secondary">
                  {'('}
                </Typography>
                <FormattedNumber
                  value={sharePriceInUsd.toString()}
                  symbol={'USD'}
                  variant="secondary14"
                  compact
                />
                <Typography variant="secondary14" color="text.secondary">
                  {')'}
                </Typography>
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
            title="Total Supply"
            isSmall={true}
          />
        </Box>
      )}

    </Paper>
  );
};
