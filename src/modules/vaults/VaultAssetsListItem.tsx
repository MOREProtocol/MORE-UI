import { Box, Paper, Typography } from '@mui/material';
import { BigNumber } from 'bignumber.js';
import { formatUnits } from 'ethers/lib/utils';
import { useMemo } from 'react';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { useAppDataContext } from 'src/hooks/app-data-provider/useAppDataProvider';
import { VaultData } from 'src/hooks/vault/useVault';

import { PreviewLineChart } from './LineChart';

interface VaultAssetsListItemProps {
  data: VaultData;
  onClick?: () => void;
}

export const VaultAssetsListItem = ({ data, onClick }: VaultAssetsListItemProps) => {
  const { reserves } = useAppDataContext();
  const reserve = useMemo(() => {
    return reserves.find((reserve) => reserve.symbol === data?.overview?.shareCurrencySymbol);
  }, [reserves, data]);

  const aum = data
    ? formatUnits(data?.financials?.liquidity?.totalAssets, data?.overview?.assetDecimals)
    : '0';
  const aumInUsd = new BigNumber(aum).multipliedBy(
    reserve?.formattedPriceInMarketReferenceCurrency
  );
  const sharePrice = data?.overview?.sharePrice;
  const sharePriceInUsd = new BigNumber(sharePrice).multipliedBy(
    reserve?.formattedPriceInMarketReferenceCurrency
  );

  return (
    <Paper
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
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
          alignItems: 'center',
          padding: '16px 16px 16px 16px',
        }}
      >
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

      <Box
        sx={{
          display: 'flex',
          paddingLeft: (theme) => theme.spacing(5),
          paddingRight: (theme) => theme.spacing(5),
          gap: (theme) => theme.spacing(5),
          flexGrow: 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: 2,
            width: '100%',
            alignItems: 'center',
          }}
        >
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
                  symbol={data.overview?.shareCurrencySymbol}
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
                  symbol={data?.overview?.shareCurrencySymbol}
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
                  symbol={data?.overview?.shareCurrencySymbol || ''}
                  sx={{ fontSize: '16px' }}
                />
                <Typography sx={{ fontWeight: 500, textAlign: 'right' }}>
                  {data?.overview?.shareCurrencySymbol}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ width: '50%', minWidth: '40%', minHeight: 100 }}>
            <PreviewLineChart height={100} />
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};
