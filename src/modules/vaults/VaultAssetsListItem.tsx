import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { Box, Paper, Typography } from '@mui/material';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { VaultData } from 'src/hooks/vault/useVault';

import { PreviewLineChart } from './LineChart';

interface VaultAssetsListItemProps {
  data: VaultData;
  onClick?: () => void;
}

export const VaultAssetsListItem = ({ data, onClick }: VaultAssetsListItemProps) => {
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
              <FormattedNumber
                value={data.financials?.basics?.grossAssetValue.value}
                symbol={data.financials?.basics?.grossAssetValue.currency}
                variant="main14"
                compact
              />
              {/* TODO: Add in $ */}
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
                Net APY
              </Typography>
              <Typography sx={{ fontWeight: 500, textAlign: 'right' }}>
                {data.financials?.returnMetrics?.averageMonth}%
              </Typography>
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
              <Typography sx={{ fontWeight: 500, textAlign: 'right' }}>
                {data.financials?.basics?.grossAssetValue?.currency}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ width: '50%', minWidth: '40%', minHeight: 100 }}>
            <PreviewLineChart height={100} />
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#000',
          color: 'white',
          padding: '6px 20px',
        }}
      >
        <Box>
          {/* <Typography
            sx={{
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.7)',
            }}
          >
            Share price
          </Typography>
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: '1.25rem',
              color: 'white',
            }}
          >
            ${data.financials?.basics?.shareSupply.value}
          </Typography> */}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'end', flexDirection: 'column' }}>
            <Typography
              sx={{
                fontWeight: 500,
                color: '#4CAF50',
              }}
            >
              +{data.financials?.returnMetrics?.averageMonth}%
            </Typography>
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.7)',
                mx: 1,
              }}
            >
              24h
            </Typography>
          </Box>
          <ArrowForwardIosIcon sx={{ fontSize: 16, color: 'white' }} />
        </Box>
      </Box>
    </Paper>
  );
};
