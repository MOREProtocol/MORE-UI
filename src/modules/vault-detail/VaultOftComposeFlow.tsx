import { Alert, Box, Button, CircularProgress, LinearProgress, Link, Typography } from '@mui/material';
import { type InboundRouteWithBalance } from '@oydual31/more-vaults-sdk/viem';
import { networkConfigs } from 'src/ui-config/networksConfig';
import { formatUnits } from 'viem';

export type ComposeStep = 'idle' | 'waiting-compose' | 'ready-to-execute' | 'executing' | 'done';

interface VaultOftComposeFlowProps {
  composeStep: Exclude<ComposeStep, 'idle'>;
  omniStatus: 'pending' | 'completed' | 'refunded';
  omniResult: bigint | null;
  omniGuid: string | null;
  txHash: string | null;
  isLoading: boolean;
  txError: string | null;
  selectedRoute: InboundRouteWithBalance;
  hubChainId: number;
  assetDecimals: number | undefined;
  wagmiChainId: number;
  onAction: () => void;
  onClose: () => void;
  onSwitchToHub: () => void;
  onNewDeposit?: () => void;
}

export const VaultOftComposeFlow: React.FC<VaultOftComposeFlowProps> = ({
  composeStep,
  omniStatus,
  omniResult,
  omniGuid,
  txHash,
  isLoading,
  txError,
  selectedRoute,
  hubChainId,
  assetDecimals,
  wagmiChainId,
  onAction,
  onClose,
  onSwitchToHub,
  onNewDeposit,
}) => {
  const spokeChainId = selectedRoute.spokeChainId;

  return (
    <>
      {/* Step progress label */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="secondary14" fontWeight={600}>
          {composeStep === 'waiting-compose'
            ? 'Step 1/2: Waiting for compose delivery (~5-15 min)...'
            : composeStep === 'ready-to-execute'
            ? `Step 2/2: Execute compose on ${networkConfigs[hubChainId]?.name || 'hub'}`
            : composeStep === 'executing'
            ? 'Step 2/2: Executing compose...'
            : composeStep === 'done' && omniStatus === 'pending'
            ? 'Waiting for cross-chain accounting (~2-5 min)...'
            : composeStep === 'done' && omniStatus === 'completed'
            ? 'Deposit complete!'
            : composeStep === 'done' && omniStatus === 'refunded'
            ? 'Deposit refunded'
            : 'Processing...'}
        </Typography>
        {(composeStep === 'waiting-compose' || composeStep === 'executing' ||
          (composeStep === 'done' && omniStatus === 'pending')) && (
          <LinearProgress sx={{ borderRadius: 1 }} />
        )}
      </Box>

      {/* 2-step overview */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {[
          {
            label: `Bridge tokens from ${networkConfigs[spokeChainId]?.name || 'spoke'}`,
            chain: networkConfigs[spokeChainId]?.name,
            time: '~5-15 min',
            done: !!txHash,
            active: composeStep === 'waiting-compose',
          },
          {
            label: `Execute compose on ${networkConfigs[hubChainId]?.name || 'hub'}`,
            chain: networkConfigs[hubChainId]?.name,
            time: '~2-5 min',
            done: composeStep === 'done',
            active: composeStep === 'ready-to-execute' || composeStep === 'executing',
          },
        ].map((s, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 24, height: 24, borderRadius: '50%',
                bgcolor: s.done ? 'success.main' : s.active ? 'primary.main' : 'grey.500',
                color: 'primary.contrastText',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}
            >
              {s.done ? '\u2713' : i + 1}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="secondary14" sx={{ fontWeight: s.active ? 600 : 400 }}>
                {s.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Sign on {s.chain} · {s.time}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* TX1: spoke bridge tx link */}
      {txHash && networkConfigs[spokeChainId]?.explorerLink && (
        <Box
          sx={{
            p: 2, bgcolor: 'background.surface', borderRadius: 1,
            border: '1px solid', borderColor: 'divider',
            display: 'flex', flexDirection: 'column', gap: 1,
          }}
        >
          <Typography variant="secondary14">
            {composeStep === 'waiting-compose' ? 'Tokens bridging to hub...' : 'Tokens delivered to hub'}
          </Typography>
          <Link
            href={`${networkConfigs[spokeChainId].explorerLink}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            variant="secondary14"
          >
            View TX1 on {networkConfigs[spokeChainId]?.explorerName || 'explorer'} ↗
          </Link>
        </Box>
      )}

      {/* Chain switch prompt for compose execution */}
      {composeStep === 'ready-to-execute' && wagmiChainId !== hubChainId && (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={onSwitchToHub}>
              Switch to {networkConfigs[hubChainId]?.name || 'hub'}
            </Button>
          }
        >
          Compose arrived. Switch to {networkConfigs[hubChainId]?.name || 'hub'} to continue.
        </Alert>
      )}

      {/* TX2: compose tx link + async status */}
      {composeStep === 'done' && (
        <Box
          sx={{
            p: 2, bgcolor: 'background.surface', borderRadius: 1,
            border: '1px solid', borderColor: 'divider',
            display: 'flex', flexDirection: 'column', gap: 1,
          }}
        >
          <Typography variant="secondary14">
            {omniStatus === 'pending' && 'Waiting for cross-chain accounting...'}
            {omniStatus === 'completed' && (
              omniResult
                ? `Deposit complete — ${parseFloat(formatUnits(BigInt(omniResult.toString()), assetDecimals ?? 18)).toFixed(4)} shares minted`
                : 'Deposit complete — shares minted'
            )}
            {omniStatus === 'refunded' && 'Deposit refunded — funds returned to your wallet'}
          </Typography>
          {omniGuid && (
            <Link
              href={`https://layerzeroscan.com/tx/${omniGuid}`}
              target="_blank"
              rel="noopener noreferrer"
              variant="secondary14"
            >
              Track on LayerZero Scan ↗
            </Link>
          )}
        </Box>
      )}

      {/* Error display */}
      {txError && (
        <Box sx={{ p: 2, bgcolor: 'error.main', color: 'error.contrastText', borderRadius: 1 }}>
          <Typography variant="secondary14" fontWeight="bold">Error</Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>{txError}</Typography>
        </Box>
      )}

      {/* Action buttons */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {composeStep === 'ready-to-execute' && wagmiChainId === hubChainId && (
          <Button
            variant="gradient"
            size="large"
            disabled={isLoading}
            onClick={onAction}
            sx={{ minHeight: '44px' }}
          >
            {isLoading && <CircularProgress color="inherit" size="16px" sx={{ mr: 2 }} />}
            Execute compose on {networkConfigs[hubChainId]?.name || 'hub'}
          </Button>
        )}
        {composeStep === 'done' && omniStatus !== 'pending' && (
          <Button variant="contained" size="large" onClick={onClose} sx={{ minHeight: '44px' }}>
            Close
          </Button>
        )}
        {composeStep !== 'done' && (
          <Button variant="outlined" size="large" onClick={onClose} sx={{ minHeight: '44px' }}>
            Close (progress saved)
          </Button>
        )}
        {onNewDeposit && composeStep === 'ready-to-execute' && (
          <Button variant="text" size="small" onClick={onNewDeposit} sx={{ color: 'text.secondary' }}>
            Skip for now and make a new deposit
          </Button>
        )}
      </Box>
    </>
  );
};
