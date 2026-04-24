import InfoIcon from '@mui/icons-material/InfoOutlined';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import { Box, IconButton, Skeleton, Tooltip, Typography } from '@mui/material';
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
  const [hoveredNetworkChainId, setHoveredNetworkChainId] = useState<number | null>(null);

  const depositsAmount = sdkEstimatedAssets > BigInt(0) ? sdkEstimatedAssets : legacyMaxWithdrawBigInt;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 2 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xsm: '1fr 1fr' },
          height: '100%',
          gap: 3,
          p: { xs: 4, md: 6 },
          backgroundColor: 'background.paper',
          borderRadius: '12px',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Row 1 - My deposits */}
        <Box>
          <Typography variant="secondary14" color="text.secondary">
            My Deposits
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {!accountAddress ? (
                <Typography variant="main16">–</Typography>
              ) : isLoading ? (
                <Skeleton width={80} height={24} />
              ) : (
                <FormattedNumber
                  value={formatUnits(depositsAmount, assetDecimals) || ''}
                  symbol={selectedVault?.overview?.asset?.symbol || ''}
                  variant="main16"
                  compact
                />
              )}
            </Box>
            {accountAddress && !isLoading && (
              <UsdChip
                value={
                  new BigNumber(formatUnits(depositsAmount, assetDecimals) || '0')
                    .multipliedBy(assetPrice)
                    .toString() || '0'
                }
              />
            )}
          </Box>
        </Box>

        {/* Row 1 - My Gains / Losses */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="secondary14" color="text.secondary">
              My Gains / Losses
            </Typography>
            <Tooltip
              title={
                <Box>
                  <Typography variant="main12" sx={{ fontWeight: 600 }}>Unrealized PnL</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormattedNumber value={pnlPercentageAsset} percent variant="secondary12" compact symbolsColor="#F1F1F3" />
                  </Box>
                </Box>
              }
              arrow
              placement="top"
            >
              <InfoIcon sx={{ fontSize: '14px', color: 'text.secondary' }} />
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
                  <ShareOutlinedIcon sx={{ fontSize: '14px', color: 'text.secondary' }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {!accountAddress ? (
              <Typography variant="main16" fontWeight={600}>–</Typography>
            ) : isLoading || isUserVaultBalancesLoading || isUserVaultDataLoading || assetIsLoading ? (
              <Skeleton width={80} height={24} />
            ) : !perVault ? (
              <Typography variant="main16" fontWeight={600}>–</Typography>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FormattedNumber
                  value={totalPnLInAsset}
                  symbol={selectedVault?.overview?.asset?.symbol || ''}
                  variant="main16"
                  compact
                />
                <UsdChip
                  value={new BigNumber(totalPnLInAsset).multipliedBy(assetPrice).toString() || '0'}
                />
              </Box>
            )}
          </Box>
        </Box>

        {/* Row 2 - Deposit Tokens */}
        <Box>
          <Typography variant="secondary14" color="text.secondary">Deposit Tokens</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {isLoading ? (
              <Skeleton width={80} height={24} />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                {(selectedVault?.overview?.depositableAssets &&
                  selectedVault.overview.depositableAssets.length > 0
                  ? selectedVault.overview.depositableAssets
                  : [{ address: selectedVault?.overview?.asset?.address || '', symbol: selectedVault?.overview?.asset?.symbol || '' }]
                ).map((token) => (
                  <Box key={token.address || token.symbol || Math.random().toString()} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TokenIcon symbol={token.symbol || ''} fontSize="medium" />
                    <Typography variant="main16" fontWeight={600}>{token.symbol || ''}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>

        {/* Row 2 - Networks */}
        <Box>
          <Typography variant="secondary14" color="text.secondary">Networks</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isLoading ? (
              <Skeleton width={80} height={24} />
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

        {/* Row 3 - Remaining Capacity */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="secondary14" color="text.secondary">Remaining Capacity</Typography>
            <Tooltip
              title={
                <Box>
                  <Typography variant="main12" sx={{ fontWeight: 600 }}>Deposit Cap</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormattedNumber
                      value={formatUnits(BigInt(legacyVault?.financials?.liquidity?.depositCapacity || '0'), legacyVault?.overview?.asset?.decimals || 18) || ''}
                      symbol={legacyVault?.overview?.asset?.symbol || ''}
                      variant="secondary12"
                      compact
                      symbolsColor="#F1F1F3"
                    />
                    <UsdChip
                      value={new BigNumber(formatUnits(BigInt(legacyVault?.financials?.liquidity?.depositCapacity || '0'), legacyVault?.overview?.asset?.decimals || 18) || '0').multipliedBy(assetPrice).toString() || '0'}
                    />
                  </Box>
                </Box>
              }
              arrow
              placement="top"
            >
              <InfoIcon sx={{ fontSize: '14px', color: 'text.secondary' }} />
            </Tooltip>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isLoading ? (
                <Skeleton width={80} height={24} />
              ) : (
                <FormattedNumber
                  value={formatUnits(
                    isOmniHub
                      ? BigInt(legacyVault?.financials?.liquidity?.depositCapacity || '0') - BigInt(legacyVault?.financials?.liquidity?.totalAssets || '0')
                      : BigInt(legacyVault?.financials?.liquidity?.maxDeposit || '0'),
                    legacyVault?.overview?.asset?.decimals || 18
                  ) || ''}
                  symbol={legacyVault?.overview?.asset?.symbol || ''}
                  variant="main16"
                  compact
                />
              )}
            </Box>
            {!isLoading && (
              <UsdChip
                value={new BigNumber(formatUnits(
                  isOmniHub
                    ? BigInt(legacyVault?.financials?.liquidity?.depositCapacity || '0') - BigInt(legacyVault?.financials?.liquidity?.totalAssets || '0')
                    : BigInt(legacyVault?.financials?.liquidity?.maxDeposit || '0'),
                  legacyVault?.overview?.asset?.decimals || 18
                ) || '0').multipliedBy(assetPrice).toString() || '0'}
              />
            )}
          </Box>
        </Box>

        {/* Row 3 - 7 Days APY */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="secondary14" color="text.secondary">7 Days APY</Typography>
            <Tooltip
              title={
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="main12" sx={{ fontWeight: 600 }}>Details</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {[
                      { label: '1 Day APY:', value: legacyVault?.overview?.apy1Day },
                      { label: '30 Days APY:', value: legacyVault?.overview?.apy30Days },
                      { label: 'APY:', value: legacyVault?.overview?.apy },
                    ].map(({ label, value }) => (
                      <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 3 }}>
                        <Typography variant="secondary12">{label}</Typography>
                        <FormattedNumber value={value || ''} percent variant="secondary12" compact symbolsColor="#F1F1F3" />
                      </Box>
                    ))}
                  </Box>
                </Box>
              }
              arrow
              placement="top"
            >
              <InfoIcon sx={{ fontSize: '14px', color: 'text.secondary' }} />
            </Tooltip>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isLoading ? (
                <Skeleton width={80} height={24} />
              ) : (
                <FormattedNumber value={legacyVault?.overview?.apy7Days || ''} percent variant="main16" compact />
              )}
            </Box>
            {selectedVault?.incentives && selectedVault.incentives.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="main14" color="text.secondary" sx={{ ml: 1, mr: 1 }}>+</Typography>
                <RewardsButton rewards={selectedVault.incentives} />
              </Box>
            )}
          </Box>
        </Box>

        {/* Row 4 - Rebalance Timelock */}
        <Box>
          <Typography variant="secondary14" color="text.secondary">Rebalance Timelock</Typography>
          <Typography variant="main16" fontWeight={600}>
            {isLoading ? (
              <Skeleton width={60} height={24} />
            ) : legacyVault?.overview?.withdrawalTimelock ? (
              formatTimeRemaining(Number(legacyVault.overview.withdrawalTimelock))
            ) : (
              'N/A'
            )}
          </Typography>
        </Box>

        {/* Row 4 - Fee */}
        <Box>
          <Typography variant="secondary14" color="text.secondary">Fee</Typography>
          {isLoading ? (
            <Skeleton width={60} height={24} />
          ) : (
            <FormattedNumber value={Number(legacyVault?.overview?.fee || '0') / 10000} percent variant="main16" />
          )}
        </Box>
      </Box>
    </Box>
  );
};
