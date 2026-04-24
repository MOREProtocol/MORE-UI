import InfoIcon from '@mui/icons-material/InfoOutlined';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import { Box, IconButton, Skeleton, Tooltip, Typography, useTheme } from '@mui/material';
import BigNumber from 'bignumber.js';
import { useState } from 'react';
import { RewardsButton } from 'src/components/incentives/IncentivesButton';
import { MarketLogo } from 'src/components/MarketSwitcher';
import { FormattedNumber } from 'src/components/primitives/FormattedNumber';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { UsdChip } from 'src/components/primitives/UsdChip';
import { formatTimeRemaining } from 'src/helpers/timeHelper';
import type { VaultData } from 'src/hooks/vault/useVault';
import { networkConfigs } from 'src/utils/marketsAndNetworksConfig';
import { formatUnits } from 'viem';

interface VaultKpiGridProps {
  selectedVault: VaultData | undefined;
  legacyVault: VaultData | undefined;
  isLoading: boolean;
  isUserVaultBalancesLoading: boolean | undefined;
  isUserVaultDataLoading: boolean | undefined;
  accountAddress: string | null;
  isOmniHub: boolean;
  sdkEstimatedAssets: bigint;
  legacyMaxWithdrawBigInt: bigint;
  assetDecimals: number;
  assetPrice: number;
  assetIsLoading: boolean;
  totalPnLInAsset: number;
  pnlPercentageAsset: number;
  perVault: unknown;
  topology: { hubChainId?: number; spokeChainIds?: number[] } | null | undefined;
  chainId: number;
}

export const VaultKpiGrid: React.FC<VaultKpiGridProps> = ({
  selectedVault,
  legacyVault,
  isLoading,
  isUserVaultBalancesLoading,
  isUserVaultDataLoading,
  accountAddress,
  isOmniHub,
  sdkEstimatedAssets,
  legacyMaxWithdrawBigInt,
  assetDecimals,
  assetPrice,
  assetIsLoading,
  totalPnLInAsset,
  pnlPercentageAsset,
  perVault,
  topology,
  chainId,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [hoveredNetworkChainId, setHoveredNetworkChainId] = useState<number | null>(null);

  const depositsAmount = sdkEstimatedAssets > BigInt(0) ? sdkEstimatedAssets : legacyMaxWithdrawBigInt;
  const depositsFormatted = formatUnits(depositsAmount, assetDecimals);
  const depositsUsd = new BigNumber(depositsFormatted || '0').multipliedBy(assetPrice).toString();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 2,
        background: isDark
          ? `radial-gradient(120% 140% at 85% -20%, rgba(242,106,21,.16), transparent 55%),
             linear-gradient(180deg, ${theme.palette.background.surface2}, ${theme.palette.background.surface})`
          : `radial-gradient(120% 140% at 85% -20%, rgba(242,106,21,.12), transparent 55%),
             linear-gradient(180deg, ${theme.palette.background.surface2}, ${theme.palette.background.paper})`,
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,.10)' : 'rgba(40,25,15,.12)',
        borderRadius: '14px',
        boxShadow: isDark
          ? '0 1px 0 rgba(255,255,255,.04) inset, 0 30px 60px -30px rgba(0,0,0,.7)'
          : '0 1px 0 rgba(255,255,255,.9) inset, 0 18px 40px -20px rgba(120,70,20,.14)',
        p: { xs: 3, md: 4 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Eyebrow */}
      <Typography
        sx={{
          fontSize: '10.5px',
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          color: 'text.muted',
          fontWeight: 500,
          mb: 2,
        }}
      >
        Your Position
      </Typography>

      {/* Hero: My Deposits */}
      <Box sx={{ mb: 0.5 }}>
        <Typography variant="secondary14" color="text.muted" sx={{ mb: 0.5 }}>
          My Deposits
        </Typography>
        {!accountAddress ? (
          <Typography
            sx={{
              fontFamily: theme.typography.h1.fontFamily,
              fontSize: 32,
              fontWeight: 600,
              letterSpacing: '-.018em',
              lineHeight: 1.05,
              color: 'text.primary',
            }}
          >
            —
          </Typography>
        ) : isLoading ? (
          <Skeleton width={120} height={38} />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
            <Typography
              sx={{
                fontFamily: theme.typography.h1.fontFamily,
                fontSize: 32,
                fontWeight: 600,
                letterSpacing: '-.018em',
                lineHeight: 1.05,
                color: 'text.primary',
              }}
            >
              <FormattedNumber
                value={depositsFormatted || ''}
                compact
                variant="main21"
                sx={{
                  fontFamily: theme.typography.h1.fontFamily,
                  fontSize: 32,
                  fontWeight: 600,
                  letterSpacing: '-.018em',
                  lineHeight: 1.05,
                }}
              />
            </Typography>
            <Typography sx={{ fontFamily: theme.typography.fontFamily, fontSize: 14, color: 'text.muted', fontWeight: 500 }}>
              {selectedVault?.overview?.asset?.symbol || ''}
            </Typography>
          </Box>
        )}
        {accountAddress && !isLoading && (
          <Box sx={{ mt: 0.5 }}>
            <UsdChip value={depositsUsd} />
          </Box>
        )}
      </Box>

      {/* Hairline */}
      <Box
        sx={{
          height: '1px',
          background: isDark ? 'rgba(255,255,255,.06)' : 'rgba(40,25,15,.08)',
          my: 3,
        }}
      />

      {/* KPI grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: { xs: 3, md: 4 },
        }}
      >
        {/* My Gains / Losses */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
            <Typography variant="secondary14" color="text.muted">
              My Gains / Losses
            </Typography>
            <Tooltip
              title={
                <Box>
                  <Typography variant="main12" sx={{ fontWeight: 600 }}>Unrealized PnL</Typography>
                  <FormattedNumber value={pnlPercentageAsset} percent variant="secondary12" compact symbolsColor="#F1F1F3" />
                </Box>
              }
              arrow
              placement="top"
            >
              <InfoIcon sx={{ fontSize: '13px', color: 'text.muted' }} />
            </Tooltip>
            {accountAddress && perVault && (
              <Tooltip title="Share on X" arrow placement="top">
                <IconButton
                  size="small"
                  aria-label="share PnL on X"
                  sx={{ padding: '1px' }}
                  onClick={() => {
                    const rawPnLAsset = totalPnLInAsset || 0;
                    const rawPnLUsd = rawPnLAsset * assetPrice;
                    const absAsset = Math.abs(rawPnLAsset);
                    const absUsd = Math.abs(rawPnLUsd);
                    const decimalsForFormat = absAsset >= 1 ? 2 : 6;
                    const formattedAsset = new Intl.NumberFormat('en-US', {
                      maximumFractionDigits: decimalsForFormat,
                      minimumFractionDigits: 0,
                    }).format(absAsset);
                    const assetSymbol = selectedVault?.overview?.asset?.symbol || '';
                    const valueStringUsd = new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      maximumFractionDigits: 2,
                    }).format(absUsd);
                    const direction = rawPnLAsset > 0 ? 'gain' : rawPnLAsset < 0 ? 'loss' : 'break-even';
                    const vaultName = selectedVault?.overview?.name || 'this vault';
                    const text = `My PnL shows a ${formattedAsset} ${assetSymbol} (${valueStringUsd}) ${direction} on my LP to ${vaultName} on @MORE_DeFi.`;
                    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                >
                  <ShareOutlinedIcon sx={{ fontSize: '13px', color: 'text.muted' }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          {!accountAddress ? (
            <Typography variant="main16" fontWeight={600}>—</Typography>
          ) : isLoading || isUserVaultBalancesLoading || isUserVaultDataLoading || assetIsLoading ? (
            <Skeleton width={70} height={22} />
          ) : !perVault ? (
            <Typography variant="main16" fontWeight={600}>—</Typography>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormattedNumber value={totalPnLInAsset} symbol={selectedVault?.overview?.asset?.symbol || ''} variant="main16" compact />
              <UsdChip value={new BigNumber(totalPnLInAsset).multipliedBy(assetPrice).toString()} />
            </Box>
          )}
        </Box>

        {/* 7 Days APY */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
            <Typography variant="secondary14" color="text.muted">7 Days APY</Typography>
            <Tooltip
              title={
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="main12" sx={{ fontWeight: 600 }}>Details</Typography>
                  {[
                    { label: '1 Day APY:', value: legacyVault?.overview?.apy1Day },
                    { label: '30 Days APY:', value: legacyVault?.overview?.apy30Days },
                    { label: 'APY:', value: legacyVault?.overview?.apy },
                  ].map(({ label, value }) => (
                    <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 3 }}>
                      <Typography variant="secondary12">{label}</Typography>
                      <FormattedNumber value={value || ''} percent variant="secondary12" compact symbolsColor="#F1F1F3" />
                    </Box>
                  ))}
                </Box>
              }
              arrow
              placement="top"
            >
              <InfoIcon sx={{ fontSize: '13px', color: 'text.muted' }} />
            </Tooltip>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isLoading ? (
              <Skeleton width={60} height={22} />
            ) : (
              <FormattedNumber value={legacyVault?.overview?.apy7Days || ''} percent variant="main16" compact />
            )}
            {selectedVault?.incentives && selectedVault.incentives.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="main14" color="text.muted" sx={{ mx: 0.5 }}>+</Typography>
                <RewardsButton rewards={selectedVault.incentives} />
              </Box>
            )}
          </Box>
        </Box>

        {/* Remaining Capacity */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
            <Typography variant="secondary14" color="text.muted">Remaining Capacity</Typography>
            <Tooltip
              title={
                <Box>
                  <Typography variant="main12" sx={{ fontWeight: 600 }}>Deposit Cap</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormattedNumber
                      value={formatUnits(BigInt(legacyVault?.financials?.liquidity?.depositCapacity || '0'), legacyVault?.overview?.asset?.decimals || 18)}
                      symbol={legacyVault?.overview?.asset?.symbol || ''}
                      variant="secondary12"
                      compact
                      symbolsColor="#F1F1F3"
                    />
                    <UsdChip
                      value={new BigNumber(formatUnits(BigInt(legacyVault?.financials?.liquidity?.depositCapacity || '0'), legacyVault?.overview?.asset?.decimals || 18)).multipliedBy(assetPrice).toString()}
                    />
                  </Box>
                </Box>
              }
              arrow
              placement="top"
            >
              <InfoIcon sx={{ fontSize: '13px', color: 'text.muted' }} />
            </Tooltip>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {isLoading ? (
              <Skeleton width={70} height={22} />
            ) : (
              <>
                <FormattedNumber
                  value={formatUnits(
                    isOmniHub
                      ? BigInt(legacyVault?.financials?.liquidity?.depositCapacity || '0') - BigInt(legacyVault?.financials?.liquidity?.totalAssets || '0')
                      : BigInt(legacyVault?.financials?.liquidity?.maxDeposit || '0'),
                    legacyVault?.overview?.asset?.decimals || 18
                  )}
                  symbol={legacyVault?.overview?.asset?.symbol || ''}
                  variant="main16"
                  compact
                />
                <UsdChip
                  value={new BigNumber(formatUnits(
                    isOmniHub
                      ? BigInt(legacyVault?.financials?.liquidity?.depositCapacity || '0') - BigInt(legacyVault?.financials?.liquidity?.totalAssets || '0')
                      : BigInt(legacyVault?.financials?.liquidity?.maxDeposit || '0'),
                    legacyVault?.overview?.asset?.decimals || 18
                  )).multipliedBy(assetPrice).toString()}
                />
              </>
            )}
          </Box>
        </Box>

        {/* Rebalance Timelock */}
        <Box>
          <Typography variant="secondary14" color="text.muted" sx={{ mb: 0.5 }}>Rebalance Timelock</Typography>
          <Typography variant="main16" fontWeight={600}>
            {isLoading ? (
              <Skeleton width={55} height={22} />
            ) : legacyVault?.overview?.withdrawalTimelock ? (
              formatTimeRemaining(Number(legacyVault.overview.withdrawalTimelock))
            ) : (
              'N/A'
            )}
          </Typography>
        </Box>

        {/* Deposit Tokens */}
        <Box>
          <Typography variant="secondary14" color="text.muted" sx={{ mb: 0.5 }}>Deposit Tokens</Typography>
          {isLoading ? (
            <Skeleton width={80} height={22} />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              {(selectedVault?.overview?.depositableAssets?.length
                ? selectedVault.overview.depositableAssets
                : [{ address: selectedVault?.overview?.asset?.address || '', symbol: selectedVault?.overview?.asset?.symbol || '' }]
              ).map((token) => (
                <Box key={token.address || token.symbol || Math.random().toString()} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <TokenIcon symbol={token.symbol || ''} fontSize="medium" />
                  <Typography variant="main16" fontWeight={600}>{token.symbol || ''}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Networks */}
        <Box>
          <Typography variant="secondary14" color="text.muted" sx={{ mb: 0.5 }}>Networks</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isLoading ? (
              <Skeleton width={80} height={22} />
            ) : (() => {
              const hubChainId = topology?.hubChainId ?? chainId;
              const hubCfg = networkConfigs[hubChainId];
              const spokeIds = topology?.spokeChainIds || [];
              const allChainIds = [hubChainId, ...spokeIds];
              return (
                <>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      minWidth: 22 + Math.max(0, allChainIds.length - 1) * 18,
                      '&:hover > * + *': { marginLeft: '-4px' },
                    }}
                    onMouseLeave={() => setHoveredNetworkChainId(null)}
                  >
                    {allChainIds.map((cId, idx) => (
                      <Box
                        key={cId}
                        onMouseEnter={() => setHoveredNetworkChainId(cId)}
                        onMouseLeave={() => setHoveredNetworkChainId(null)}
                        sx={{ ml: idx > 0 ? '-14px' : 0, zIndex: allChainIds.length - idx, transition: 'margin-left 0.2s ease', cursor: 'default' }}
                      >
                        <MarketLogo size={22} logo={networkConfigs[cId]?.networkLogoPath} />
                      </Box>
                    ))}
                  </Box>
                  <Typography variant="main14">
                    {hoveredNetworkChainId !== null
                      ? networkConfigs[hoveredNetworkChainId]?.name || `Chain ${hoveredNetworkChainId}`
                      : `${hubCfg?.name || `Chain ${hubChainId}`}${spokeIds.length > 0 ? ` + ${spokeIds.length} chain${spokeIds.length > 1 ? 's' : ''}` : ''}`}
                  </Typography>
                </>
              );
            })()}
          </Box>
        </Box>

        {/* Fee */}
        <Box>
          <Typography variant="secondary14" color="text.muted" sx={{ mb: 0.5 }}>Fee</Typography>
          {isLoading ? (
            <Skeleton width={50} height={22} />
          ) : (
            <FormattedNumber value={Number(legacyVault?.overview?.fee || '0') / 10000} percent variant="main16" />
          )}
        </Box>
      </Box>
    </Box>
  );
};
