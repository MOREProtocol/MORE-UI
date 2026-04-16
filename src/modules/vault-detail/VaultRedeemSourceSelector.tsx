import { Box, Chip, Typography, useTheme } from '@mui/material';
import BigNumber from 'bignumber.js';
import { formatUnits } from 'ethers/lib/utils';
import { networkConfigs } from 'src/ui-config/networksConfig';

export interface SpokeSelection {
  chainId: number;
  balance: bigint;
  rawBalance: bigint;
  decimals: number;
}

interface UserPositionData {
  spokeShares?: Record<string | number, bigint>;
  decimals?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface VaultRedeemSourceSelectorProps {
  hubChainId: number;
  hubSelected: boolean;
  selectedSpokeChainId: number | null;
  maxAmountToRedeem: BigNumber;
  userPosition: UserPositionData;
  canRedeemFromSpoke: boolean;
  onSelectHub: () => void;
  onSelectSpoke: (spoke: SpokeSelection) => void;
}

export const VaultRedeemSourceSelector: React.FC<VaultRedeemSourceSelectorProps> = ({
  hubChainId,
  hubSelected,
  selectedSpokeChainId,
  maxAmountToRedeem,
  userPosition,
  canRedeemFromSpoke,
  onSelectHub,
  onSelectSpoke,
}) => {
  const theme = useTheme();
  const hasHubBalance = maxAmountToRedeem.gt(0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* Hub option */}
      <Box
        onClick={() => { if (hasHubBalance) onSelectHub(); }}
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 2, py: 1.5, px: 2, borderRadius: 2,
          border: '1.5px solid',
          borderColor: hubSelected ? theme.palette.other.chartHighlight : '#E0E0E0',
          cursor: hasHubBalance ? 'pointer' : 'default',
          opacity: hasHubBalance ? 1 : 0.45,
          bgcolor: 'transparent',
          transition: 'border-color 0.15s',
          '&:hover': hasHubBalance ? { borderColor: theme.palette.text.muted, bgcolor: theme.palette.background.surface } : {},
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {networkConfigs[hubChainId]?.networkLogoPath && (
            <img src={networkConfigs[hubChainId].networkLogoPath} width={32} height={32} alt="" style={{ borderRadius: '50%' }} />
          )}
          <Box>
            <Typography variant="main14" fontWeight={600}>
              {networkConfigs[hubChainId]?.name || 'Hub'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
              <Chip label="Hub" size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: theme.palette.other.chartHighlight, color: '#fff' }} />
            </Box>
          </Box>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="secondary14" fontWeight={600} color={hasHubBalance ? 'text.primary' : 'text.secondary'}>
            {hasHubBalance ? parseFloat(maxAmountToRedeem.toString()).toFixed(4) : '0'}
          </Typography>
          <Typography variant="secondary12" color="text.secondary">shares</Typography>
        </Box>
      </Box>

      {/* Spoke options */}
      {userPosition.spokeShares && Object.entries(userPosition.spokeShares).map(([cid, bal]) => {
        const spokeId = Number(cid);
        const decimals = userPosition.decimals ?? 8;
        const formatted = parseFloat(formatUnits((bal as bigint).toString(), decimals)).toFixed(4);
        const chainName = networkConfigs[spokeId]?.name || `Chain ${spokeId}`;
        const hasBalance = (bal as bigint) > BigInt(0);
        const isSelected = selectedSpokeChainId === spokeId;
        return (
          <Box
            key={cid}
            onClick={() => {
              if (hasBalance && canRedeemFromSpoke) {
                const raw = userPosition.rawSpokeShares?.[spokeId] ?? bal;
                onSelectSpoke({
                  chainId: spokeId,
                  balance: bal as bigint,
                  rawBalance: raw as bigint,
                  decimals,
                });
              }
            }}
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 2, py: 1.5, px: 2, borderRadius: 2,
              border: '1.5px solid',
              borderColor: isSelected ? theme.palette.other.chartHighlight : '#E0E0E0',
              cursor: hasBalance && canRedeemFromSpoke ? 'pointer' : 'default',
              opacity: hasBalance ? 1 : 0.45,
              bgcolor: 'transparent',
              transition: 'border-color 0.15s',
              '&:hover': hasBalance && canRedeemFromSpoke ? { borderColor: theme.palette.text.muted, bgcolor: theme.palette.background.surface } : {},
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {networkConfigs[spokeId]?.networkLogoPath && (
                <img src={networkConfigs[spokeId].networkLogoPath} width={32} height={32} alt="" style={{ borderRadius: '50%' }} />
              )}
              <Box>
                <Typography variant="main14" fontWeight={600}>{chainName}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                  <Chip label="Crosschain" size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                </Box>
              </Box>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="secondary14" fontWeight={600} color={hasBalance ? 'text.primary' : 'text.secondary'}>
                {hasBalance ? formatted : '0'}
              </Typography>
              <Typography variant="secondary12" color="text.secondary">shares</Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
