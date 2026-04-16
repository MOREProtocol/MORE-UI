import { Alert, Box, Button, CircularProgress, LinearProgress, Link, Typography } from '@mui/material';
import type { ComposeData } from '@oydual31/more-vaults-sdk/viem';
import { networkConfigs } from 'src/ui-config/networksConfig';
import { formatUnits } from 'viem';

interface VaultOrphanSearchViewProps {
  scanning: boolean;
  orphans: ComposeData[];
  hubChainId: number;
  wagmiChainId: number;
  /** Decimals of the vault's underlying asset — used to format shares received */
  assetDecimals: number | undefined;
  /** Compose currently being executed, or null if idle */
  recovering: ComposeData | null;
  recoveryStatus: 'executing' | 'done' | 'error' | null;
  recoveryOmniStatus: 'pending' | 'completed' | 'refunded';
  recoveryOmniResult: bigint | null;
  recoveryGuid: string | null;
  recoveryError: string | null;
  totalBlocksScanned: bigint | null;
  oldestBlockDate: Date | null;
  canLoadMore: boolean;
  onBack: () => void;
  onRecover: (orphan: ComposeData) => void;
  onSwitchToHub: () => void;
  onDismissRecovery: () => void;
  onLoadMore: () => void;
}

export const VaultOrphanSearchView: React.FC<VaultOrphanSearchViewProps> = ({
  scanning,
  orphans,
  hubChainId,
  wagmiChainId,
  assetDecimals,
  recovering,
  recoveryStatus,
  recoveryOmniStatus,
  recoveryOmniResult,
  recoveryGuid,
  recoveryError,
  totalBlocksScanned,
  oldestBlockDate,
  canLoadMore,
  onBack,
  onRecover,
  onSwitchToHub,
  onDismissRecovery,
  onLoadMore,
}) => {
  const hubName = networkConfigs[hubChainId]?.name || 'hub';
  const onWrongChain = wagmiChainId !== hubChainId;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          size="small"
          variant="text"
          onClick={onBack}
          sx={{ minWidth: 0, p: 0, color: 'text.secondary', fontSize: '1.2rem' }}
        >
          ←
        </Button>
        <Typography variant="h2">Pending spoke deposits</Typography>
      </Box>

      {/* Scanning indicator */}
      {scanning && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={18} />
          <Typography variant="secondary14" color="text.secondary">
            Scanning {hubName} for pending deposits…
          </Typography>
        </Box>
      )}

      {/* Recovery execution status */}
      {recovering ? (
        <Box
          sx={{
            p: 2, borderRadius: 1, border: '1px solid',
            borderColor:
              recoveryStatus === 'error' ? 'error.main'
                : recoveryStatus === 'done' && recoveryOmniStatus !== 'pending' ? 'success.main'
                  : 'warning.main',
            display: 'flex', flexDirection: 'column', gap: 1.5,
          }}
        >
          <Typography variant="secondary14" fontWeight={700}>
            {recoveryStatus === 'executing' && 'Completing deposit…'}
            {recoveryStatus === 'done' && recoveryOmniStatus === 'pending' && 'Waiting for cross-chain accounting (~2-5 min)…'}
            {recoveryStatus === 'done' && recoveryOmniStatus === 'completed' && (
              recoveryOmniResult
                ? `Deposit complete — ${parseFloat(formatUnits(BigInt(recoveryOmniResult.toString()), assetDecimals ?? 18)).toFixed(4)} shares minted`
                : 'Deposit complete'
            )}
            {recoveryStatus === 'done' && recoveryOmniStatus === 'refunded' && 'Deposit refunded — funds returned'}
            {recoveryStatus === 'error' && 'Execute compose failed'}
          </Typography>

          {(recoveryStatus === 'executing' || (recoveryStatus === 'done' && recoveryOmniStatus === 'pending')) && (
            <LinearProgress sx={{ borderRadius: 1 }} />
          )}

          {recoveryGuid && (
            <Link
              href={`https://layerzeroscan.com/tx/${recoveryGuid}`}
              target="_blank"
              rel="noopener noreferrer"
              variant="secondary14"
            >
              Track on LayerZero Scan ↗
            </Link>
          )}

          {recoveryStatus === 'error' && recoveryError && (
            <Typography variant="caption" color="error.main">
              {recoveryError}
            </Typography>
          )}

          {(recoveryStatus === 'error' || (recoveryStatus === 'done' && recoveryOmniStatus !== 'pending')) && (
            <Button size="small" variant="outlined" onClick={onDismissRecovery}>
              {recoveryStatus === 'error' ? 'Dismiss' : 'Close'}
            </Button>
          )}
        </Box>
      ) : !scanning && orphans.length === 0 ? (
        <Typography variant="secondary14" color="text.secondary">
          No pending deposits found in the last {totalBlocksScanned !== null ? totalBlocksScanned.toLocaleString() : '…'} blocks.
        </Typography>
      ) : (
        orphans.map((orphan, idx) => (
          <Alert
            key={orphan.guid}
            severity="warning"
            icon={false}
            sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}
          >
            <Typography variant="secondary14" fontWeight={700}>
              Pending deposit #{idx + 1} found
            </Typography>
            <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
              GUID: {orphan.guid}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tokens arrived on {hubName} but the vault deposit was never executed.
            </Typography>
            <Button
              size="small"
              variant="contained"
              onClick={onWrongChain ? onSwitchToHub : () => onRecover(orphan)}
              sx={{ mt: 0.5 }}
            >
              {onWrongChain ? `Switch to ${hubName} to complete` : 'Complete Deposit'}
            </Button>
          </Alert>
        ))
      )}

      {/* Load-more controls — shown after a scan completes */}
      {!scanning && !recovering && oldestBlockDate && (
        <Typography variant="caption" color="text.secondary">
          Searched back to {oldestBlockDate.toLocaleString()}
        </Typography>
      )}
      {!scanning && !recovering && canLoadMore && (
        <Button size="small" variant="outlined" onClick={onLoadMore}>
          Search older blocks
        </Button>
      )}
    </Box>
  );
};
