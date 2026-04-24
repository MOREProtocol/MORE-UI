import { Avatar, Box, Button, Chip, Divider, Skeleton, Typography, useTheme } from '@mui/material';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { LineChart } from '../charts/LineChart';
import { VaultGridRow } from './VaultDataGridColumns';
import { useVaultSharePriceHistory } from 'src/hooks/vault/useVaultData';

interface VaultCardProps {
  row?: VaultGridRow;
  loading?: boolean;
  onClick?: () => void;
  onDeposit?: () => void;
  disabled?: boolean;
}

export const VaultCard = ({ row, loading, onClick, onDeposit, disabled }: VaultCardProps) => {
  const theme = useTheme();
  const apy = row?.apy7Days ?? row?.apy;
  const apyPositive = apy === undefined || apy >= 0;
  const symbols = row?.depositTokenSymbols?.length
    ? row.depositTokenSymbols
    : row?.depositTokenSymbol
    ? [row.depositTokenSymbol]
    : [];

  const { data: sharePriceHistory } = useVaultSharePriceHistory(row?.id, row?.chainId);
  console.log(sharePriceHistory)
  const hasChart = !!sharePriceHistory?.length;

  return (
    <Box
      onClick={!loading ? onClick : undefined}
      sx={{
        backgroundColor: 'background.paper',
        borderRadius: '12px',
        border: '1px solid',
        borderColor: 'divider',
        p: 2.75,
        cursor: loading ? 'default' : 'pointer',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': loading
          ? {}
          : {
              borderColor: 'rgba(242,106,21,.25)',
              boxShadow: '0 4px 24px rgba(0,0,0,.18), 0 1px 3px rgba(0,0,0,.10)',
            },
      }}
    >
      {/* Card header: token icons + omnichain badge + deposit button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Token stack + omnichain badge */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            {loading ? (
              <Skeleton variant="circular" width={30} height={30} />
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {symbols.slice(0, 3).map((sym, i) => (
                    <TokenIcon
                      key={`${sym}-${i}`}
                      symbol={sym}
                      sx={{
                        fontSize: '30px',
                        ml: i > 0 ? '-9px' : 0,
                        zIndex: 3 - i,
                        position: 'relative',
                      }}
                    />
                  ))}
                </Box>
                {row?.isOmniHub && (
                  <Chip
                    label="omnichain"
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: 10,
                      fontWeight: 600,
                      background: theme.palette.gradients.newGradient,
                      color: '#fff',
                      border: 'none',
                      ml: 0.5,
                    }}
                  />
                )}
              </>
            )}
          </Box>

          {/* Vault name */}
          {loading ? (
            <Skeleton width="65%" height={22} />
          ) : (
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {row?.vaultName}
            </Typography>
          )}

          {/* Curator line */}
          {loading ? (
            <Skeleton width="45%" height={14} sx={{ mt: 0.75 }} />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.75 }}>
              {row?.curatorLogo && (
                <Avatar src={row.curatorLogo} sx={{ width: 14, height: 14, flexShrink: 0 }} />
              )}
              <Typography variant="secondary12" color="text.secondary" component="span">
                curated by{' '}
              </Typography>
              <Typography variant="secondary12" sx={{ fontWeight: 500 }} component="span">
                {row?.curatorName || '—'}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Deposit button — larger padding */}
        {loading ? (
          <Skeleton variant="rectangular" width={82} height={36} sx={{ borderRadius: '10px', flexShrink: 0 }} />
        ) : (
          <Button
            variant="soft"
            size="medium"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              onDeposit?.();
            }}
            sx={{ flexShrink: 0, px: 2.5, py: 1 }}
          >
            Deposit
          </Button>
        )}
      </Box>

      {/* Chart */}
      {loading ? (
        <Skeleton variant="rectangular" width="100%" height={80} sx={{ borderRadius: '6px', mt: 2.5 }} />
      ) : hasChart ? (
        <Box
          sx={{ mt: 2.5, mx: -0.5 }}
          onClick={(e) => e.stopPropagation()}
        >
          <LineChart
            data={sharePriceHistory!}
            height={80}
            areaGradient
            isInteractive={false}
            isSmall
            hideAxis
            showTimePeriodSelector={false}
            yAxisFormat={row?.depositTokenSymbol}
          />
        </Box>
      ) : (
        <Box sx={{ height: 8 }} />
      )}

      {/* KPI strip */}
      <Box
        sx={{
          display: 'flex',
          mt: 2,
          pt: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* APY */}
        <Box sx={{ flex: 1, pb: 0.5 }}>
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '.07em',
              color: 'text.secondary',
              mb: 0.75,
            }}
          >
            7D APY
          </Typography>
          {loading ? (
            <Skeleton width={64} height={34} />
          ) : apy !== undefined ? (
            <FormattedNumber
              value={apy}
              percent
              variant="main21"
              sx={{
                fontSize: 24,
                fontWeight: 700,
                lineHeight: 1.15,
                color: apyPositive ? '#FF8A2A' : 'error.main',
              }}
            />
          ) : (
            <Typography sx={{ fontSize: 22, fontWeight: 500, color: 'text.secondary' }}>
              —
            </Typography>
          )}
        </Box>

        <Divider orientation="vertical" flexItem sx={{ mx: 2, opacity: 0.5 }} />

        {/* TVM */}
        <Box sx={{ flex: 1, pb: 0.5 }}>
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '.07em',
              color: 'text.secondary',
              mb: 0.75,
            }}
          >
            TVM
          </Typography>
          {loading ? (
            <Skeleton width={80} height={20} />
          ) : (
            <>
              <FormattedNumber
                value={row?.tvm ?? '0'}
                symbol={row?.depositTokenSymbol}
                compact
                variant="secondary14"
                sx={{ fontWeight: 600 }}
              />
              {(row?.tvmUsd ?? 0) > 0 && (
                <FormattedNumber
                  value={row?.tvmUsd ?? 0}
                  symbol="USD"
                  compact
                  variant="secondary12"
                  color="text.secondary"
                />
              )}
            </>
          )}
        </Box>

        <Divider orientation="vertical" flexItem sx={{ mx: 2, opacity: 0.5 }} />

        {/* Network */}
        <Box sx={{ flex: 1, pb: 0.5 }}>
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '.07em',
              color: 'text.secondary',
              mb: 0.75,
            }}
          >
            NETWORK
          </Typography>
          {loading ? (
            <Skeleton width={72} height={18} />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Avatar
                src={row?.networkIcon}
                sx={{ width: 16, height: 16, bgcolor: 'transparent', flexShrink: 0 }}
              />
              <Typography
                variant="secondary12"
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {row?.network}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};
