import { Alert, Box, Button, CircularProgress, Link, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { BasicModal } from 'src/components/primitives/BasicModal';
import { useVault } from 'src/hooks/vault/useVault';
import { useVaultData } from 'src/hooks/vault/useVaultData';
import { networkConfigs } from 'src/utils/marketsAndNetworksConfig';
import { useBalance, useChainId, usePublicClient, useWalletClient } from 'wagmi';
import { formatUnits } from 'viem';
import { asSdkClient, bridgeSharesToHub, CHAIN_ID_TO_EID, quoteLzFee } from '@oydual31/more-vaults-sdk/viem';
import { useVaultTopology } from '@oydual31/more-vaults-sdk/react';

interface VaultBridgeSharesToHubModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const VaultBridgeSharesToHubModal: React.FC<VaultBridgeSharesToHubModalProps> = ({ isOpen, setIsOpen }) => {
  const { selectedVaultId, accountAddress, chainId: vaultChainId } = useVault();
  const wagmiChainId = useChainId();
  const vaultData = useVaultData(selectedVaultId);
  const { topology } = useVaultTopology(selectedVaultId as `0x${string}` | undefined);

  // Clients on the spoke chain (current wallet chain)
  const spokePublicClient = usePublicClient({ chainId: wagmiChainId });
  const { data: spokeWalletClient } = useWalletClient({ chainId: wagmiChainId });

  // Share balance on the spoke chain
  const { data: shareBalance, isLoading: isBalanceLoading } = useBalance({
    address: accountAddress as `0x${string}`,
    token: selectedVaultId as `0x${string}`,
    chainId: wagmiChainId,
    query: { enabled: !!accountAddress && !!selectedVaultId },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [estimatedFee, setEstimatedFee] = useState<bigint | null>(null);
  const [isFeeLoading, setIsFeeLoading] = useState(false);
  const [feeEstimateWarning, setFeeEstimateWarning] = useState(false);

  // Fallback fee: 0.005 native token
  const FALLBACK_FEE = BigInt(5e15);

  useEffect(() => {
    if (!isOpen || !selectedVaultId || !spokePublicClient) return;
    let cancelled = false;
    const run = async () => {
      setIsFeeLoading(true);
      setFeeEstimateWarning(false);
      try {
        const fee = await quoteLzFee(asSdkClient(spokePublicClient), selectedVaultId as `0x${string}`);
        if (!cancelled) {
          setEstimatedFee((fee * BigInt(110)) / BigInt(100)); // 10% buffer
        }
      } catch {
        if (!cancelled) {
          setEstimatedFee(FALLBACK_FEE);
          setFeeEstimateWarning(true);
        }
      } finally {
        if (!cancelled) setIsFeeLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedVaultId, spokePublicClient]);

  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
      setTxHash(null);
      setTxError(null);
      setEstimatedFee(null);
      setFeeEstimateWarning(false);
    }
  }, [isOpen]);

  const hubChainId = topology?.hubChainId ?? vaultChainId;
  const hubChainEid = CHAIN_ID_TO_EID[hubChainId];
  const vaultName = vaultData?.data?.overview?.name;
  const shareDecimals = shareBalance?.decimals ?? 18;
  const shares = shareBalance?.value ?? BigInt(0);
  const sharesFormatted = parseFloat(formatUnits(shares, shareDecimals)).toFixed(6);
  const hubCfg = networkConfigs[hubChainId];
  const spokeCfg = networkConfigs[wagmiChainId];

  const canBridge = shares > BigInt(0) && !!hubChainEid && !isLoading && !!spokeWalletClient;

  const handleBridge = async () => {
    if (!selectedVaultId || !accountAddress || !spokeWalletClient || !spokePublicClient) return;
    if (!hubChainEid) { setTxError('Hub chain EID not found — unsupported chain'); return; }
    if (shares === BigInt(0)) { setTxError('No shares to bridge'); return; }

    setIsLoading(true);
    setTxError(null);
    try {
      const lzFee = estimatedFee ?? FALLBACK_FEE;
      const { txHash: hash } = await bridgeSharesToHub(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        spokeWalletClient as any,
        asSdkClient(spokePublicClient),
        selectedVaultId as `0x${string}`,  // vault IS the shareOFT on spoke (CREATE3 same address)
        hubChainEid,
        shares,
        accountAddress as `0x${string}`,
        lzFee,
      );
      setTxHash(hash);
    } catch (error) {
      console.error('Error during bridgeSharesToHub:', error);
      setTxError(error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BasicModal open={isOpen} setOpen={setIsOpen}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Typography variant="h2">Bridge shares to hub</Typography>

        <Alert severity="info">
          Step 1 of 2: Bridge your vault shares from{' '}
          <strong>{spokeCfg?.name || `chain ${wagmiChainId}`}</strong> to the hub chain{' '}
          <strong>({hubCfg?.name || `chain ${hubChainId}`})</strong>.
          Once shares arrive on the hub, you can redeem them normally.
        </Alert>

        {/* Share balance row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="secondary14" color="text.secondary">Shares to bridge</Typography>
          {isBalanceLoading ? (
            <CircularProgress size={14} />
          ) : (
            <Typography variant="secondary14" fontWeight={600}>
              {sharesFormatted} {vaultName || 'vault shares'}
            </Typography>
          )}
        </Box>

        {/* Fee row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="secondary14" color="text.secondary">Bridge fee (est.)</Typography>
          {isFeeLoading ? (
            <CircularProgress size={14} />
          ) : estimatedFee != null ? (
            <Typography variant="secondary14">
              ~{parseFloat(formatUnits(estimatedFee, 18)).toFixed(6)}{' '}
              {spokeCfg?.baseAssetSymbol || 'ETH'}
              {feeEstimateWarning ? ' (fallback estimate)' : ' (excess refunded)'}
            </Typography>
          ) : (
            <Typography variant="secondary14" color="text.secondary">—</Typography>
          )}
        </Box>

        {feeEstimateWarning && (
          <Alert severity="warning" sx={{ py: 0.5 }}>
            Could not quote exact fee on this chain. A fallback of 0.005 native token will be used as msg.value — unused gas is refunded.
          </Alert>
        )}

        {txError && (
          <Box sx={{ p: 2, bgcolor: 'error.main', color: 'error.contrastText', borderRadius: 1 }}>
            <Typography variant="secondary14" fontWeight="bold">Error</Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>{txError}</Typography>
          </Box>
        )}

        {txHash ? (
          <Box sx={{ p: 2, bgcolor: 'background.surface', borderRadius: 1, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="secondary14">✅ Bridge transaction sent — shares are on the way to the hub</Typography>
            {spokeCfg?.explorerLink && (
              <Link href={`${spokeCfg.explorerLink}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" variant="secondary14">
                View on {spokeCfg.explorerName || 'explorer'} ↗
              </Link>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Step 2: Once shares arrive on {hubCfg?.name || 'the hub'}, open the Withdraw modal to redeem them.
            </Typography>
          </Box>
        ) : (
          <Button
            variant="gradient"
            size="large"
            disabled={!canBridge}
            onClick={handleBridge}
            sx={{ minHeight: '44px' }}
          >
            {isLoading && <CircularProgress color="inherit" size="16px" sx={{ mr: 2 }} />}
            {isLoading ? 'Bridging…' : shares === BigInt(0) ? 'No shares to bridge' : `Bridge ${sharesFormatted} shares to hub`}
          </Button>
        )}
      </Box>
    </BasicModal>
  );
};
