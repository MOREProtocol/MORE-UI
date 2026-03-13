import {
  Alert,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Link,
  Typography,
} from '@mui/material';
import { useVaultTopology } from '@oydual31/more-vaults-sdk/react';
import {
  type SpokeRedeemRoute,
  asSdkClient,
  bridgeAssetsToSpoke,
  bridgeSharesToHub,
  LZ_TIMEOUTS,
  OFT_ABI,
  preflightSpokeRedeem,
  resolveRedeemAddresses,
  smartRedeem,
} from '@oydual31/more-vaults-sdk/viem';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BasicModal } from 'src/components/primitives/BasicModal';
import { useVault } from 'src/hooks/vault/useVault';
import { useVaultData } from 'src/hooks/vault/useVaultData';
import { useOmniFlowStore } from 'src/store/omniFlowStore';
import { useOmniRequestStore } from 'src/store/omniRequestStore';
import { networkConfigs } from 'src/utils/marketsAndNetworksConfig';
import { formatUnits } from 'viem';
import { useBalance, useChainId, usePublicClient, useSwitchChain, useWalletClient } from 'wagmi';

type RedeemStep =
  | 'loading'
  | 'ready'
  | 'bridging_shares'
  | 'waiting_shares'
  | 'switch_to_hub'
  | 'redeeming'
  | 'waiting_redeem'
  | 'bridging_assets'
  | 'waiting_assets'
  | 'done';

interface VaultBridgeSharesToHubModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const VaultBridgeSharesToHubModal: React.FC<VaultBridgeSharesToHubModalProps> = ({
  isOpen,
  setIsOpen,
}) => {
  const { selectedVaultId, accountAddress, chainId: vaultChainId } = useVault();
  const wagmiChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const vaultData = useVaultData(selectedVaultId);
  const { topology } = useVaultTopology(selectedVaultId as `0x${string}` | undefined);
  const addOmniRequest = useOmniRequestStore((s) => s.addOmniRequest);
  const flowStore = useOmniFlowStore();

  const hubChainId = topology?.hubChainId ?? vaultChainId;
  const spokeChainId = wagmiChainId; // user opened modal from spoke chain

  // Clients on spoke chain
  const spokePublicClient = usePublicClient({ chainId: spokeChainId });
  const { data: spokeWalletClient } = useWalletClient({ chainId: spokeChainId });

  // Clients on hub chain
  const hubPublicClient = usePublicClient({ chainId: hubChainId });
  const { data: hubWalletClient } = useWalletClient({ chainId: hubChainId });

  // Share balance on the spoke chain
  const { data: shareBalance, isLoading: isBalanceLoading } = useBalance({
    address: accountAddress as `0x${string}`,
    token: selectedVaultId as `0x${string}`,
    chainId: spokeChainId,
    query: { enabled: !!accountAddress && !!selectedVaultId },
  });

  const [step, setStep] = useState<RedeemStep>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [route, setRoute] = useState<SpokeRedeemRoute | null>(null);
  const [shareBridgeFee, setShareBridgeFee] = useState<bigint>(BigInt(0));
  const [preflightData, setPreflightData] = useState<{
    spokeNativeBalance: bigint;
    hubNativeBalance: bigint;
    estimatedAssetBridgeFee: bigint;
  } | null>(null);

  // TX hashes for each step
  const [shareBridgeTxHash, setShareBridgeTxHash] = useState<string | null>(null);
  const [redeemTxHash, setRedeemTxHash] = useState<string | null>(null);
  const [redeemGuid, setRedeemGuid] = useState<string | null>(null);
  const [assetsReceived, setAssetsReceived] = useState<bigint>(BigInt(0));
  const [assetBridgeTxHash, setAssetBridgeTxHash] = useState<string | null>(null);

  // Progress tracking
  const [stepStartTime, setStepStartTime] = useState<number>(0);
  const [progressPct, setProgressPct] = useState<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const shares = shareBalance?.value ?? BigInt(0);
  const shareDecimals = shareBalance?.decimals ?? 18;
  const sharesFormatted = parseFloat(formatUnits(shares, shareDecimals)).toFixed(6);
  const hubCfg = networkConfigs[hubChainId];
  const spokeCfg = networkConfigs[spokeChainId];
  const vaultName = vaultData?.data?.overview?.name;

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Helper: persist current flow state
  const persistFlow = useCallback(
    (
      overrides: Partial<{
        step: RedeemStep;
        shareBridgeTxHash: string | null;
        redeemTxHash: string | null;
        redeemGuid: string | null;
        assetBridgeTxHash: string | null;
        assetsReceived: bigint;
      }>
    ) => {
      if (!selectedVaultId) return;
      flowStore.setFlow(selectedVaultId, {
        type: 'spoke-redeem',
        step: overrides.step ?? step,
        vaultId: selectedVaultId,
        hubChainId,
        spokeChainId,
        shareBridgeTxHash: overrides.shareBridgeTxHash ?? shareBridgeTxHash,
        redeemTxHash: overrides.redeemTxHash ?? redeemTxHash,
        redeemGuid: overrides.redeemGuid ?? redeemGuid,
        assetBridgeTxHash: overrides.assetBridgeTxHash ?? assetBridgeTxHash,
        assetsReceived: String(overrides.assetsReceived ?? assetsReceived),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      selectedVaultId,
      hubChainId,
      spokeChainId,
      step,
      shareBridgeTxHash,
      redeemTxHash,
      redeemGuid,
      assetBridgeTxHash,
      assetsReceived,
    ]
  );

  // Restore flow state from persistent store when modal opens
  useEffect(() => {
    if (!isOpen || !selectedVaultId) return;
    const saved = flowStore.getFlow(selectedVaultId);
    if (saved && saved.type === 'spoke-redeem' && saved.step !== 'done') {
      setStep(saved.step);
      setShareBridgeTxHash(saved.shareBridgeTxHash);
      setRedeemTxHash(saved.redeemTxHash);
      setRedeemGuid(saved.redeemGuid);
      setAssetBridgeTxHash(saved.assetBridgeTxHash);
      setAssetsReceived(BigInt(saved.assetsReceived || '0'));
      // Restart polling if we're in a waiting state
      if (saved.step === 'waiting_shares') {
        setStepStartTime(Date.now());
        pollSharesOnHub();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedVaultId]);

  // Reset state when modal closes — only clear if flow is done or hasn't started
  useEffect(() => {
    if (!isOpen) {
      const shouldClear = step === 'loading' || step === 'ready' || step === 'done';
      if (shouldClear && selectedVaultId) {
        flowStore.removeFlow(selectedVaultId);
      }
      setStep('loading');
      setIsLoading(false);
      setTxError(null);
      setRoute(null);
      setShareBridgeFee(BigInt(0));
      setPreflightData(null);
      setShareBridgeTxHash(null);
      setRedeemTxHash(null);
      setRedeemGuid(null);
      setAssetsReceived(BigInt(0));
      setAssetBridgeTxHash(null);
      setProgressPct(0);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Step 0: Resolve addresses + preflight when modal opens
  useEffect(() => {
    if (
      !isOpen ||
      !selectedVaultId ||
      !hubPublicClient ||
      !spokePublicClient ||
      !accountAddress ||
      shares === BigInt(0)
    )
      return;
    let cancelled = false;
    const run = async () => {
      try {
        // Resolve all addresses for the cross-chain redeem
        const resolvedRoute = await resolveRedeemAddresses(
          asSdkClient(hubPublicClient),
          selectedVaultId as `0x${string}`,
          hubChainId,
          spokeChainId
        );
        if (cancelled) return;
        setRoute(resolvedRoute);

        // Quote share bridge fee (TX1)
        const toBytes32 = `0x${(accountAddress as string)
          .slice(2)
          .padStart(64, '0')}` as `0x${string}`;
        const quoteResult = await (asSdkClient(spokePublicClient) as any).readContract({
          address: resolvedRoute.spokeShareOft,
          abi: OFT_ABI,
          functionName: 'quoteSend',
          args: [
            {
              dstEid: resolvedRoute.hubEid,
              to: toBytes32,
              amountLD: shares,
              minAmountLD: shares,
              extraOptions: '0x',
              composeMsg: '0x',
              oftCmd: '0x',
            },
            false,
          ],
        });
        if (cancelled) return;
        const bridgeFee = quoteResult.nativeFee;
        setShareBridgeFee(bridgeFee);

        // Preflight validation
        const pf = await preflightSpokeRedeem(
          resolvedRoute,
          shares,
          accountAddress as `0x${string}`,
          bridgeFee
        );
        if (cancelled) return;
        setPreflightData({
          spokeNativeBalance: pf.spokeNativeBalance,
          hubNativeBalance: pf.hubNativeBalance,
          estimatedAssetBridgeFee: pf.estimatedAssetBridgeFee,
        });
        setStep('ready');
      } catch (err) {
        if (!cancelled) {
          console.error('Cross-chain redeem preflight error:', err);
          setTxError(err instanceof Error ? err.message : 'Failed to prepare cross-chain redeem.');
          setStep('ready'); // show error state
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    selectedVaultId,
    hubPublicClient,
    spokePublicClient,
    accountAddress,
    shares > BigInt(0),
  ]);

  // Progress bar update for waiting steps
  useEffect(() => {
    if (!['waiting_shares', 'waiting_redeem', 'waiting_assets'].includes(step)) {
      setProgressPct(0);
      return;
    }
    const timeoutMs =
      step === 'waiting_shares'
        ? LZ_TIMEOUTS.OFT_BRIDGE
        : step === 'waiting_redeem'
        ? LZ_TIMEOUTS.LZ_READ_CALLBACK
        : LZ_TIMEOUTS.STARGATE_BRIDGE;
    const start = stepStartTime || Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgressPct(Math.min(95, (elapsed / timeoutMs) * 100));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, stepStartTime]);

  // Poll for shares arrival on hub (Step 1 → Step 2 transition)
  const pollSharesOnHub = useCallback(() => {
    if (!hubPublicClient || !selectedVaultId || !accountAddress) return;
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const balance = await (asSdkClient(hubPublicClient) as any).readContract({
          address: selectedVaultId as `0x${string}`,
          abi: [
            {
              name: 'balanceOf',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'account', type: 'address' }],
              outputs: [{ name: '', type: 'uint256' }],
            },
          ],
          functionName: 'balanceOf',
          args: [accountAddress as `0x${string}`],
        });
        if (balance > BigInt(0)) {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setStep('switch_to_hub');
          persistFlow({ step: 'switch_to_hub' });
        }
      } catch (e) {
        console.warn('[CrossChainRedeem] poll shares on hub error:', e);
      }
    }, LZ_TIMEOUTS.POLL_INTERVAL);
  }, [hubPublicClient, selectedVaultId, accountAddress]);

  // Step 1: Bridge shares to hub
  const handleBridgeShares = async () => {
    if (!selectedVaultId || !accountAddress || !spokeWalletClient || !spokePublicClient || !route)
      return;
    setIsLoading(true);
    setTxError(null);
    setStep('bridging_shares');
    try {
      const fee =
        shareBridgeFee > BigInt(0) ? (shareBridgeFee * BigInt(110)) / BigInt(100) : BigInt(5e15);
      const { txHash: hash } = await bridgeSharesToHub(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        spokeWalletClient as any,
        asSdkClient(spokePublicClient),
        route.spokeShareOft,
        route.hubEid,
        shares,
        accountAddress as `0x${string}`,
        fee
      );
      setShareBridgeTxHash(hash);
      setStep('waiting_shares');
      setStepStartTime(Date.now());
      persistFlow({ step: 'waiting_shares', shareBridgeTxHash: hash });
      pollSharesOnHub();
    } catch (error) {
      console.error('Error during bridgeSharesToHub:', error);
      setTxError(error instanceof Error ? error.message : 'Failed to bridge shares.');
      setStep('ready');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Redeem on hub
  const handleRedeem = async () => {
    if (!selectedVaultId || !accountAddress || !hubWalletClient || !hubPublicClient) return;
    setIsLoading(true);
    setTxError(null);
    setStep('redeeming');
    try {
      const vault = selectedVaultId as `0x${string}`;
      const owner = accountAddress as `0x${string}`;

      // Read current hub share balance
      const hubShares = await (asSdkClient(hubPublicClient) as any).readContract({
        address: vault,
        abi: [
          {
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }],
          },
        ],
        functionName: 'balanceOf',
        args: [owner],
      });

      const result = await smartRedeem(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hubWalletClient as any,
        asSdkClient(hubPublicClient),
        { vault },
        hubShares,
        owner,
        owner
      );
      setRedeemTxHash(result.txHash);
      persistFlow({ redeemTxHash: result.txHash });

      if ('guid' in result) {
        // Async vault — need to wait for LZ callback
        setRedeemGuid(result.guid);
        persistFlow({
          redeemTxHash: result.txHash,
          redeemGuid: result.guid,
          step: 'waiting_redeem',
        });
        addOmniRequest({
          guid: result.guid,
          vaultId: selectedVaultId!,
          chainId: hubChainId,
          type: 'redeem',
          status: 'pending',
          txHash: result.txHash,
          vaultName,
        });
        setStep('waiting_redeem');
        setStepStartTime(Date.now());

        // Poll for redeem completion (check asset balance increase on hub)
        if (pollRef.current) clearInterval(pollRef.current);
        const assetBefore = await (asSdkClient(hubPublicClient) as any).readContract({
          address: route!.hubAsset,
          abi: [
            {
              name: 'balanceOf',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'account', type: 'address' }],
              outputs: [{ name: '', type: 'uint256' }],
            },
          ],
          functionName: 'balanceOf',
          args: [owner],
        });
        pollRef.current = setInterval(async () => {
          try {
            const assetNow = await (asSdkClient(hubPublicClient) as any).readContract({
              address: route!.hubAsset,
              abi: [
                {
                  name: 'balanceOf',
                  type: 'function',
                  stateMutability: 'view',
                  inputs: [{ name: 'account', type: 'address' }],
                  outputs: [{ name: '', type: 'uint256' }],
                },
              ],
              functionName: 'balanceOf',
              args: [owner],
            });
            if ((assetNow as bigint) > (assetBefore as bigint)) {
              if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
              }
              const received = (assetNow as bigint) - (assetBefore as bigint);
              setAssetsReceived(received);
              setStep('bridging_assets');
              persistFlow({ step: 'bridging_assets', assetsReceived: received });
            }
          } catch (e) {
            console.warn('[CrossChainRedeem] poll asset balance error:', e);
          }
        }, LZ_TIMEOUTS.POLL_INTERVAL);
      } else {
        // Sync vault — assets available immediately
        setAssetsReceived(result.assets);
        setStep('bridging_assets');
        persistFlow({ step: 'bridging_assets', assetsReceived: result.assets });
      }
    } catch (error) {
      console.error('Error during smartRedeem:', error);
      setTxError(error instanceof Error ? error.message : 'Redeem failed.');
      setStep('switch_to_hub');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Bridge assets back to spoke
  const handleBridgeAssets = async () => {
    if (
      !route ||
      !hubWalletClient ||
      !hubPublicClient ||
      !accountAddress ||
      assetsReceived === BigInt(0)
    )
      return;
    setIsLoading(true);
    setTxError(null);
    try {
      // Quote asset bridge fee
      const toBytes32 = `0x${(accountAddress as string)
        .slice(2)
        .padStart(64, '0')}` as `0x${string}`;
      const quoteResult = await (asSdkClient(hubPublicClient) as any).readContract({
        address: route.hubAssetOft,
        abi: OFT_ABI,
        functionName: 'quoteSend',
        args: [
          {
            dstEid: route.spokeEid,
            to: toBytes32,
            amountLD: assetsReceived,
            minAmountLD: (assetsReceived * BigInt(99)) / BigInt(100), // 1% slippage for Stargate
            extraOptions: '0x',
            composeMsg: '0x',
            oftCmd: route.isStargate ? '0x01' : '0x', // TAXI mode for Stargate
          },
          false,
        ],
      });
      const fee = (quoteResult.nativeFee * BigInt(110)) / BigInt(100); // 10% buffer

      const { txHash: hash } = await bridgeAssetsToSpoke(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hubWalletClient as any,
        asSdkClient(hubPublicClient),
        route.hubAssetOft,
        route.spokeEid,
        assetsReceived,
        accountAddress as `0x${string}`,
        fee,
        route.isStargate
      );
      setAssetBridgeTxHash(hash);
      setStep('waiting_assets');
      setStepStartTime(Date.now());
      persistFlow({ step: 'waiting_assets', assetBridgeTxHash: hash });

      // Assets will arrive on spoke automatically — show success after timeout
      setTimeout(() => {
        setStep('done');
        if (selectedVaultId) flowStore.removeFlow(selectedVaultId);
      }, 30000); // Show done after 30s, actual delivery can take longer
    } catch (error) {
      console.error('Error during bridgeAssetsToSpoke:', error);
      setTxError(error instanceof Error ? error.message : 'Failed to bridge assets back.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step labels for progress display
  const stepLabels: Record<RedeemStep, string> = {
    loading: 'Preparing...',
    ready: 'Ready to start',
    bridging_shares: 'Step 1/3: Bridging shares to hub...',
    waiting_shares: `Step 1/3: Waiting for shares on ${hubCfg?.name || 'hub'} (~7 min)...`,
    switch_to_hub: `Step 2/3: Switch to ${hubCfg?.name || 'hub'} to redeem`,
    redeeming: 'Step 2/3: Redeeming on hub...',
    waiting_redeem: 'Step 2/3: Waiting for redeem confirmation (~5 min)...',
    bridging_assets: `Step 3/3: Bridge assets back to ${spokeCfg?.name || 'spoke'}`,
    waiting_assets: `Step 3/3: Assets on the way to ${spokeCfg?.name || 'spoke'}...`,
    done: 'Cross-chain redeem complete!',
  };

  const isWaiting = ['waiting_shares', 'waiting_redeem', 'waiting_assets'].includes(step);
  const needsHubChain = ['switch_to_hub', 'redeeming', 'bridging_assets'].includes(step);
  const onWrongChain = needsHubChain && wagmiChainId !== hubChainId;

  return (
    <BasicModal open={isOpen} setOpen={setIsOpen}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Typography variant="h2">Cross-chain withdrawal</Typography>

        {/* Step progress */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="secondary14" fontWeight={600}>
            {stepLabels[step]}
          </Typography>
          {isWaiting && (
            <LinearProgress variant="determinate" value={progressPct} sx={{ borderRadius: 1 }} />
          )}
        </Box>

        {/* Step 0: Loading/Preflight */}
        {step === 'loading' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="secondary14">Resolving addresses and validating...</Typography>
          </Box>
        )}

        {/* Ready: Show summary */}
        {step === 'ready' && !txError && (
          <>
            <Alert severity="info">
              This will withdraw your shares from{' '}
              <strong>{spokeCfg?.name || `chain ${spokeChainId}`}</strong> through the hub{' '}
              <strong>({hubCfg?.name || `chain ${hubChainId}`})</strong> and bridge assets back. The
              full process takes ~15-30 minutes across 3 transactions.
            </Alert>

            {/* Summary rows */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="secondary14" color="text.secondary">
                Shares to redeem
              </Typography>
              <Typography variant="secondary14" fontWeight={600}>
                {isBalanceLoading ? (
                  <CircularProgress size={14} />
                ) : (
                  `${sharesFormatted} ${vaultName || 'shares'}`
                )}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="secondary14" color="text.secondary">
                Share bridge fee (TX1)
              </Typography>
              <Typography variant="secondary14">
                ~{parseFloat(formatUnits(shareBridgeFee, 18)).toFixed(6)}{' '}
                {spokeCfg?.baseAssetSymbol || 'ETH'}
              </Typography>
            </Box>

            {preflightData && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="secondary14" color="text.secondary">
                    Gas on {spokeCfg?.name || 'spoke'}
                  </Typography>
                  <Typography variant="secondary14">
                    {parseFloat(formatUnits(preflightData.spokeNativeBalance, 18)).toFixed(6)}{' '}
                    {spokeCfg?.baseAssetSymbol || 'ETH'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="secondary14" color="text.secondary">
                    Gas on {hubCfg?.name || 'hub'}
                  </Typography>
                  <Typography variant="secondary14">
                    {parseFloat(formatUnits(preflightData.hubNativeBalance, 18)).toFixed(6)}{' '}
                    {hubCfg?.baseAssetSymbol || 'ETH'}
                  </Typography>
                </Box>
                {preflightData.estimatedAssetBridgeFee > BigInt(0) && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="secondary14" color="text.secondary">
                      Asset bridge fee (TX3, est.)
                    </Typography>
                    <Typography variant="secondary14">
                      ~
                      {parseFloat(formatUnits(preflightData.estimatedAssetBridgeFee, 18)).toFixed(
                        6
                      )}{' '}
                      {hubCfg?.baseAssetSymbol || 'ETH'}
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </>
        )}

        {/* Step 1 complete: show bridge tx */}
        {shareBridgeTxHash && (
          <Box
            sx={{
              p: 2,
              bgcolor: 'background.surface',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <Typography variant="secondary14">
              {step === 'waiting_shares'
                ? '⏳ Shares bridging to hub...'
                : '✅ Shares bridged to hub'}
            </Typography>
            {spokeCfg?.explorerLink && (
              <Link
                href={`${spokeCfg.explorerLink}/tx/${shareBridgeTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary14"
              >
                View TX1 on {spokeCfg.explorerName || 'explorer'} ↗
              </Link>
            )}
          </Box>
        )}

        {/* Chain switch prompt */}
        {step === 'switch_to_hub' && onWrongChain && (
          <Alert
            severity="warning"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => switchChain({ chainId: hubChainId })}
              >
                Switch to {hubCfg?.name || 'hub'}
              </Button>
            }
          >
            Shares have arrived. Switch to {hubCfg?.name || 'hub'} to continue.
          </Alert>
        )}

        {/* Step 2 complete: show redeem tx */}
        {redeemTxHash && (
          <Box
            sx={{
              p: 2,
              bgcolor: 'background.surface',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <Typography variant="secondary14">
              {step === 'waiting_redeem'
                ? '⏳ Waiting for redeem confirmation...'
                : '✅ Redeemed on hub'}
            </Typography>
            {hubCfg?.explorerLink && (
              <Link
                href={`${hubCfg.explorerLink}/tx/${redeemTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary14"
              >
                View TX2 on {hubCfg.explorerName || 'explorer'} ↗
              </Link>
            )}
            {redeemGuid && (
              <Link
                href={`https://layerzeroscan.com/tx/${redeemGuid}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary14"
              >
                Track on LayerZero Scan ↗
              </Link>
            )}
          </Box>
        )}

        {/* Step 3 complete: show asset bridge tx */}
        {assetBridgeTxHash && (
          <Box
            sx={{
              p: 2,
              bgcolor: 'background.surface',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <Typography variant="secondary14">
              {step === 'waiting_assets'
                ? `⏳ Assets on the way to ${spokeCfg?.name || 'spoke'} (~${
                    route?.isStargate ? '13-30' : '7-15'
                  } min)...`
                : `✅ Assets sent to ${spokeCfg?.name || 'spoke'}`}
            </Typography>
            {hubCfg?.explorerLink && (
              <Link
                href={`${hubCfg.explorerLink}/tx/${assetBridgeTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary14"
              >
                View TX3 on {hubCfg.explorerName || 'explorer'} ↗
              </Link>
            )}
          </Box>
        )}

        {/* Done */}
        {step === 'done' && (
          <Alert severity="success">
            Cross-chain withdrawal complete. Your {route?.symbol || 'assets'} should arrive on{' '}
            {spokeCfg?.name || 'spoke'} shortly.
          </Alert>
        )}

        {/* Error */}
        {txError && (
          <Box sx={{ p: 2, bgcolor: 'error.main', color: 'error.contrastText', borderRadius: 1 }}>
            <Typography variant="secondary14" fontWeight="bold">
              Error
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
              {txError}
            </Typography>
          </Box>
        )}

        {/* Action buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {step === 'ready' && !txError && (
            <Button
              variant="gradient"
              size="large"
              disabled={shares === BigInt(0) || isLoading}
              onClick={handleBridgeShares}
              sx={{ minHeight: '44px' }}
            >
              {isLoading && <CircularProgress color="inherit" size="16px" sx={{ mr: 2 }} />}
              {shares === BigInt(0) ? 'No shares to redeem' : `Start cross-chain withdrawal`}
            </Button>
          )}

          {step === 'switch_to_hub' && !onWrongChain && (
            <Button
              variant="gradient"
              size="large"
              disabled={isLoading}
              onClick={handleRedeem}
              sx={{ minHeight: '44px' }}
            >
              {isLoading && <CircularProgress color="inherit" size="16px" sx={{ mr: 2 }} />}
              Redeem shares on {hubCfg?.name || 'hub'}
            </Button>
          )}

          {step === 'bridging_assets' && (
            <Button
              variant="gradient"
              size="large"
              disabled={isLoading || assetsReceived === BigInt(0)}
              onClick={handleBridgeAssets}
              sx={{ minHeight: '44px' }}
            >
              {isLoading && <CircularProgress color="inherit" size="16px" sx={{ mr: 2 }} />}
              Bridge assets to {spokeCfg?.name || 'spoke'}
            </Button>
          )}

          {step === 'done' && (
            <Button
              variant="contained"
              size="large"
              onClick={() => setIsOpen(false)}
              sx={{ minHeight: '44px' }}
            >
              Close
            </Button>
          )}
        </Box>
      </Box>
    </BasicModal>
  );
};
