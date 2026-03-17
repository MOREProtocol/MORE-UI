import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  FormControlLabel,
  LinearProgress,
  Link,
  Tooltip,
  Typography,
} from '@mui/material';
import { getRouteTokenDecimals, useVaultDistribution } from '@oydual31/more-vaults-sdk/react';
import {
  type InboundRouteWithBalance,
  asSdkClient,
  canDeposit,
  CHAIN_ID_TO_EID,
  depositFromSpoke,
  executeCompose,
  getVaultAnalysis,
  getVaultStatus,
  LZ_TIMEOUTS,
  preflightSpokeDeposit,
  quoteComposeFee,
  quoteLzFee,
  quoteRouteDepositFee,
  waitForAsyncRequest,
  waitForCompose,
} from '@oydual31/more-vaults-sdk/viem';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BasicModal } from 'src/components/primitives/BasicModal';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { MarketLogo } from 'src/components/MarketSwitcher';
import { Asset, AssetInput } from 'src/components/transactions/AssetInput';
import { useVault } from 'src/hooks/vault/useVault';
import {
  useAssetData,
  useDepositableAssetsBalances,
  useUserVaultsData,
  useVaultData,
} from 'src/hooks/vault/useVaultData';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { useOmniFlowStore } from 'src/store/omniFlowStore';
import { useOmniRequestStore } from 'src/store/omniRequestStore';
import { useRootStore } from 'src/store/root';
import { networkConfigs } from 'src/ui-config/networksConfig';
import { roundToTokenDecimals } from 'src/utils/utils';
import { formatEther, formatUnits } from 'viem';
import { useBalance, useChainId, usePublicClient, useSwitchChain, useWalletClient } from 'wagmi';

interface VaultDepositModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  whitelistAmount?: string;
  inboundRoutes?: InboundRouteWithBalance[];
}

export const VaultDepositModal: React.FC<VaultDepositModalProps> = ({
  isOpen,
  setIsOpen,
  whitelistAmount,
  inboundRoutes,
}) => {
  const {
    signer,
    selectedVaultId,
    chainId: vaultChainId,
    depositInVault,
    depositInVaultFromToken,
    accountAddress,
    enhanceTransactionWithGas,
    isOmniHub,
    omniHubChainId,
    omniDeposit,
  } = useVault();
  const wagmiChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const vaultData = useVaultData(selectedVaultId);
  const selectedVault = vaultData?.data;
  // For omni vaults, use SDK-resolved hub chain; legacy as fallback for non-omni
  const hubChainId = isOmniHub ? omniHubChainId : (selectedVault?.chainId || vaultChainId);
  const publicClient = usePublicClient({ chainId: hubChainId });

  // Inline route selection (for omni vaults — replaces the external Route Picker dialog)
  const [selectedRoute, setSelectedRoute] = useState<InboundRouteWithBalance | null>(null);
  const [pickerChainId, setPickerChainId] = useState<number | null>(null);

  const routesByChain = useMemo(() => {
    if (!inboundRoutes || inboundRoutes.length === 0) return [];
    const chainMap = new Map<
      number,
      {
        chainId: number;
        chainName: string;
        chainLogo: string | undefined;
        isDirect: boolean;
        totalBalance: number;
        nativeSymbol: string;
        routes: InboundRouteWithBalance[];
      }
    >();
    for (const r of inboundRoutes) {
      const cfg = networkConfigs[r.spokeChainId];
      if (!chainMap.has(r.spokeChainId)) {
        chainMap.set(r.spokeChainId, {
          chainId: r.spokeChainId,
          chainName: cfg?.name || `Chain ${r.spokeChainId}`,
          chainLogo: cfg?.networkLogoPath,
          isDirect: r.depositType === 'direct' || r.depositType === 'direct-async',
          totalBalance: 0,
          nativeSymbol: r.nativeSymbol,
          routes: [],
        });
      }
      const entry = chainMap.get(r.spokeChainId)!;
      entry.routes.push(r);
      const decimals = getRouteTokenDecimals(r.symbol);
      entry.totalBalance += parseFloat(formatUnits(r.userBalance, decimals));
    }
    return Array.from(chainMap.values()).sort((a, b) => {
      if (a.isDirect && !b.isDirect) return -1;
      if (!a.isDirect && b.isDirect) return 1;
      return b.totalBalance - a.totalBalance;
    });
  }, [inboundRoutes]);

  // Auto-select hub chain (isDirect) when routes load or modal opens, unless already selected
  useEffect(() => {
    if (!isOpen || routesByChain.length === 0) return;
    // Only set default if nothing is selected yet
    setPickerChainId((prev) => {
      if (prev !== null) return prev;
      const hub = routesByChain.find((c) => c.isDirect) ?? routesByChain[0];
      if (hub.routes.length === 1) setSelectedRoute(hub.routes[0]);
      return hub.chainId;
    });
  }, [isOpen, routesByChain]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Spoke chain clients for oft-compose deposits
  const isOftCompose = !!selectedRoute && selectedRoute.depositType === 'oft-compose';
  const spokePublicClient = usePublicClient({ chainId: selectedRoute?.spokeChainId });
  const { data: spokeWalletClient } = useWalletClient({ chainId: selectedRoute?.spokeChainId });
  const { distribution } = useVaultDistribution(
    isOmniHub ? (selectedVaultId as `0x${string}`) : undefined
  );
  const userVaultData = useUserVaultsData(accountAddress, [selectedVaultId]);
  const refreshUserVaultData = userVaultData?.[0]?.refetch;
  const [currentNetworkConfig] = useRootStore((state) => [state.currentNetworkConfig]);
  const { addERC20Token } = useWeb3Context();

  const primaryAssetAddress = selectedVault?.overview?.asset?.address || '';
  const primaryAssetData = useAssetData(primaryAssetAddress || '');

  // SDK depositable assets (getVaultAnalysis) — dynamic token selector for omni vaults
  const [sdkDepositableAssets, setSdkDepositableAssets] = useState<
    Array<{ address: string; symbol: string; name: string; decimals: number }> | null
  >(null);

  const depositableAssets = useMemo(() => {
    // For omni vaults, prefer SDK analysis (correct hub-chain addresses)
    if (isOmniHub && sdkDepositableAssets && sdkDepositableAssets.length > 0) {
      return sdkDepositableAssets;
    }
    return selectedVault?.overview?.depositableAssets &&
      selectedVault.overview.depositableAssets.length > 0
        ? selectedVault.overview.depositableAssets
        : [
            {
              address: primaryAssetAddress,
              symbol: selectedVault?.overview?.asset?.symbol,
              decimals: selectedVault?.overview?.asset?.decimals,
            },
          ];
  }, [isOmniHub, sdkDepositableAssets, selectedVault, primaryAssetAddress]);

  const [selectedAssetAddress, setSelectedAssetAddress] = useState<string>(
    depositableAssets?.[0]?.address || primaryAssetAddress
  );
  const [selectedAssetSymbol, setSelectedAssetSymbol] = useState<string>(
    depositableAssets?.[0]?.symbol || '' || ''
  );
  const selectedAssetData = useAssetData(selectedAssetAddress || '');

  const depositableBalancesQuery = useDepositableAssetsBalances(selectedVaultId, accountAddress);
  // For omni hub direct deposits, use selectedRoute.spokeToken (correct hub-chain address)
  // because primaryAssetAddress may be from a different chain's metadata.
  const balanceTokenAddress = (isOmniHub && selectedRoute?.spokeToken
    ? selectedRoute.spokeToken
    : (selectedAssetAddress || primaryAssetAddress)) as `0x${string}`;
  const { data: walletBalanceData } = useBalance({
    address: accountAddress as `0x${string}`,
    token: balanceTokenAddress,
    chainId: isOmniHub && !isOftCompose ? hubChainId : undefined,
  });

  const assetBalances = depositableBalancesQuery.balances;
  const fallbackWalletBalance =
    assetBalances[(selectedAssetAddress || primaryAssetAddress).toLowerCase()] ?? '0';
  // For omni hub, trust useBalance (reads correct token on correct chain); skip fallback
  const walletBalance = isOmniHub
    ? (walletBalanceData?.formatted || '0')
    : (walletBalanceData?.formatted || fallbackWalletBalance || '0');

  // Check ETH balance on hub for Stargate 2-TX compose fee
  const { data: hubEthBalance } = useBalance({
    address: accountAddress as `0x${string}`,
    chainId: hubChainId,
    query: { enabled: isOftCompose && !!accountAddress },
  });

  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txAction, setTxAction] = useState<string | null>(null);
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [addTokenLoading, setAddTokenLoading] = useState(false);
  const [addTokenSuccess, setAddTokenSuccess] = useState(false);

  // Hub chain wallet client for Stargate compose execution
  const { data: hubWalletClient } = useWalletClient({ chainId: hubChainId });

  // Omni vault state
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const [isFeeLoading, setIsFeeLoading] = useState(false);
  const [omniGuid, setOmniGuid] = useState<string | null>(null);
  const [preflight, setPreflight] = useState<{
    paused: boolean;
    escrowMissing: boolean;
    recommendedDepositFlow: 'depositSimple' | 'depositAsync' | 'mintAsync' | 'none' | null;
  } | null>(null);
  const addOmniRequest = useOmniRequestStore((s) => s.addOmniRequest);
  const flowStore = useOmniFlowStore();
  const queryClient = useQueryClient();

  // Omni async status — updated by waitForAsyncRequest inline
  const [omniStatus, setOmniStatus] = useState<'pending' | 'completed' | 'refunded'>('pending');
  const [omniResult, setOmniResult] = useState<bigint | null>(null);

  // SDK deposit eligibility (canDeposit) — maxDeposit cap + whitelist check
  const [depositEligibility, setDepositEligibility] = useState<{
    allowed: boolean;
    reason: string;
    maxDeposit?: bigint;
    whitelistEnabled?: boolean;
  } | null>(null);

  // Fetch deposit eligibility and analysis for omni vaults
  useEffect(() => {
    if (!isOmniHub || !selectedVaultId || !publicClient || !accountAddress) return;
    let cancelled = false;
    const run = async () => {
      try {
        const [eligibility, analysis] = await Promise.all([
          canDeposit(
            asSdkClient(publicClient),
            selectedVaultId as `0x${string}`,
            accountAddress as `0x${string}`
          ),
          getVaultAnalysis(asSdkClient(publicClient), selectedVaultId as `0x${string}`),
        ]);
        if (cancelled) return;
        setDepositEligibility(eligibility);
        if (analysis.depositableAssets.length > 0) {
          setSdkDepositableAssets(analysis.depositableAssets);
        }
      } catch {
        // SDK functions may not be available on older vaults
      }
    };
    run();
    return () => { cancelled = true; };
  }, [isOmniHub, selectedVaultId, publicClient, accountAddress]);

  // Stargate compose state (2-TX spoke deposits)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [composeData, setComposeData] = useState<any>(null);
  const [composeStep, setComposeStep] = useState<
    'idle' | 'waiting-compose' | 'ready-to-execute' | 'executing' | 'done'
  >('idle');

  // Spoke deposit preflight state
  const [_spokePreflight, setSpokePreflight] = useState<{
    isStargate: boolean;
    estimatedComposeFee: bigint;
  } | null>(null);
  const [spokePreflightError, setSpokePreflightError] = useState<string | null>(null);

  // Real fee for oft-compose: re-quoted on each amount change (debounced 500ms)
  const [realFee, setRealFee] = useState<bigint>(selectedRoute?.lzFeeEstimate ?? BigInt(0));
  useEffect(() => {
    if (!selectedRoute || selectedRoute.depositType !== 'oft-compose' || !amount || amount === '0') return;
    const decimals = getRouteTokenDecimals(selectedRoute.symbol);
    let parsedAmount: bigint;
    try {
      parsedAmount = BigInt(parseUnits(amount, decimals).toString());
    } catch {
      return;
    }
    if (parsedAmount === BigInt(0)) return;
    const t = setTimeout(async () => {
      try {
        const fee = await quoteRouteDepositFee(
          selectedRoute,
          hubChainId,
          parsedAmount,
          accountAddress as `0x${string}`
        );
        setRealFee(fee);
      } catch {
        setRealFee(selectedRoute.lzFeeEstimate);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [selectedRoute, amount, hubChainId, accountAddress]);

  // Reset realFee when route changes
  useEffect(() => {
    setRealFee(selectedRoute?.lzFeeEstimate ?? BigInt(0));
  }, [selectedRoute]);

  const amountInUsd = new BigNumber(amount).multipliedBy(selectedAssetData.data?.price || 0);

  const userVaultBalance = userVaultData?.[0]?.data?.maxWithdraw?.toString() || '0';
  const hasVaultTokens = new BigNumber(userVaultBalance).isGreaterThan(0);

  const handleCuratorIconClick = async () => {
    if (!selectedVaultId || !selectedVault || !signer || (!txHash && !hasVaultTokens)) return;

    setAddTokenLoading(true);
    try {
      const vaultContract = new ethers.Contract(
        selectedVaultId,
        [
          `function symbol() external view returns (string)`,
          `function decimals() external view returns (uint8)`,
        ],
        signer
      );

      const [vaultSymbol, vaultDecimals] = await Promise.all([
        vaultContract.symbol().catch(() => 'VAULT'),
        vaultContract.decimals().catch(() => 18),
      ]);

      const baseUrl =
        process.env.NEXT_PUBLIC_API_BASEURL ||
        (typeof window !== 'undefined' ? window.location.origin : 'https://app.more.markets');
      const imageUrl = selectedVault.overview.curatorLogo
        ? `${baseUrl}/${selectedVault.overview.curatorLogo}`
        : undefined;

      const success = await addERC20Token({
        address: selectedVaultId,
        symbol: vaultSymbol,
        decimals: vaultDecimals,
        image: imageUrl,
      });

      if (success) {
        setAddTokenSuccess(true);
      }
    } catch (error) {
      console.error('Failed to add vault token to wallet:', error);
    } finally {
      setAddTokenLoading(false);
    }
  };

  // Balances/decimals override for oft-compose routes
  const routeTokenDecimals = selectedRoute ? getRouteTokenDecimals(selectedRoute.symbol) : 18;
  const routeBalance = selectedRoute ? formatUnits(selectedRoute.userBalance, routeTokenDecimals) : null;

  const maxAmountToSupply = useMemo(() => {
    if (isOftCompose && routeBalance != null) return routeBalance;
    if (!selectedAssetData.data?.decimals) return '0';

    let effectiveMaxAmount = walletBalance;

    if (whitelistAmount && whitelistAmount !== '0') {
      const whitelistAmountFormatted = roundToTokenDecimals(
        new BigNumber(whitelistAmount)
          .dividedBy(new BigNumber(10).pow(selectedAssetData.data.decimals))
          .toString(),
        selectedAssetData.data.decimals
      );

      effectiveMaxAmount = new BigNumber(walletBalance).isLessThan(whitelistAmountFormatted)
        ? walletBalance
        : whitelistAmountFormatted;
    }

    // Cap by SDK maxDeposit if available (canDeposit response)
    if (depositEligibility?.maxDeposit != null && selectedAssetData.data?.decimals != null) {
      const maxDepositFormatted = formatUnits(depositEligibility.maxDeposit, selectedAssetData.data.decimals);
      if (new BigNumber(effectiveMaxAmount).isGreaterThan(maxDepositFormatted)) {
        effectiveMaxAmount = maxDepositFormatted;
      }
    }

    return effectiveMaxAmount || '0';
  }, [walletBalance, whitelistAmount, selectedAssetData.data, depositEligibility]);

  const assetInputConfig = useMemo(() => {
    if (!selectedAssetData.data?.decimals || !whitelistAmount || whitelistAmount === '0') {
      return {
        balance: walletBalance,
        balanceText: 'Wallet balance',
      };
    }

    const whitelistAmountFormatted = new BigNumber(whitelistAmount)
      .dividedBy(new BigNumber(10).pow(selectedAssetData.data.decimals))
      .toString();

    const isWalletLimiting = new BigNumber(walletBalance).isLessThan(whitelistAmountFormatted);

    return {
      balance: isWalletLimiting ? walletBalance : whitelistAmountFormatted,
      balanceText: isWalletLimiting ? 'Wallet balance' : 'Max whitelist allowance',
    };
  }, [walletBalance, whitelistAmount, selectedAssetData.data?.decimals]);

  // Auto-switch chain when a route is selected
  useEffect(() => {
    if (!isOpen || !selectedRoute) return;
    if (isOftCompose) {
      // OFT compose: switch based on step
      if (composeStep === 'idle' && wagmiChainId !== selectedRoute.spokeChainId) {
        switchChain({ chainId: selectedRoute.spokeChainId });
      } else if (composeStep === 'ready-to-execute' && wagmiChainId !== hubChainId) {
        switchChain({ chainId: hubChainId });
      }
    } else {
      // Hub / direct deposit: switch to hub chain
      if (wagmiChainId !== hubChainId) {
        switchChain({ chainId: hubChainId });
      }
    }
  }, [isOpen, isOftCompose, selectedRoute, composeStep, wagmiChainId, hubChainId]);

  // On open, verify vault is not paused and escrow is configured before allowing deposit
  useEffect(() => {
    if (!isOmniHub || isOftCompose || !isOpen || !selectedVaultId || !publicClient) return;
    let cancelled = false;
    const run = async () => {
      try {
        const status = await getVaultStatus(
          asSdkClient(publicClient),
          selectedVaultId as `0x${string}`
        );
        if (!cancelled) {
          setPreflight({
            paused: status.isPaused,
            escrowMissing:
              !status.escrow || status.escrow === '0x0000000000000000000000000000000000000000',
            recommendedDepositFlow: status.recommendedDepositFlow,
          });
        }
      } catch {
        if (!cancelled) setPreflight(null);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [isOmniHub, isOpen, selectedVaultId, publicClient]);

  // Estimate bridge fee once when modal opens — fee is amount-independent
  useEffect(() => {
    if (!isOpen) return;
    // oft-compose: display from realFee state (updated via debounced quoteRouteDepositFee)
    if (isOftCompose && selectedRoute) {
      setEstimatedFee(formatUnits(selectedRoute.lzFeeEstimate, 18)); // initial display; realFee updates it
      return;
    }
    if (!isOmniHub || !selectedVaultId || !publicClient) return;
    let cancelled = false;
    const run = async () => {
      setIsFeeLoading(true);
      try {
        const fee = await quoteLzFee(asSdkClient(publicClient), selectedVaultId as `0x${string}`);
        if (!cancelled) {
          setEstimatedFee(formatEther((fee * BigInt(101)) / BigInt(100)));
        }
      } catch {
        if (!cancelled) setEstimatedFee(null);
      } finally {
        if (!cancelled) setIsFeeLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [isOmniHub, isOftCompose, isOpen, selectedVaultId, publicClient, selectedRoute]);

  // Restore Stargate compose flow from persistent store when modal opens
  useEffect(() => {
    if (!isOpen || !selectedVaultId) return;
    const saved = flowStore.getFlow(selectedVaultId);
    if (saved && saved.type === 'stargate-compose' && saved.step !== 'done') {
      if (saved.spokeTxHash) setTxHash(saved.spokeTxHash);
      if (saved.omniGuid) setOmniGuid(saved.omniGuid);

      const partialCompose = saved.composeGuid ? {
        endpoint: saved.composeEndpoint,
        from: saved.composeFrom,
        to: saved.composeTo,
        guid: saved.composeGuid,
        index: saved.composeIndex ?? 0,
        message: saved.composeMessage,
        isStargate: saved.composeIsStargate ?? true,
        hubChainId: saved.hubChainId ?? hubChainId,
        hubBlockStart: BigInt(saved.composeHubBlockStart || '0'),
      } : null;

      // If from is 0x0 or message is missing, re-resolve via waitForCompose
      const needsResolve = partialCompose && (
        !saved.composeFrom || saved.composeFrom === '0x0000000000000000000000000000000000000000' ||
        !saved.composeMessage || saved.composeMessage === '0x'
      );

      if (needsResolve && partialCompose && publicClient && accountAddress) {
        setComposeStep('waiting-compose');
        // Race with a 15s timeout — old flows don't have hubBlockStart so scanning is slow
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000));
        Promise.race([
          waitForCompose(
            asSdkClient(publicClient),
            partialCompose as any,
            accountAddress as `0x${string}`,
          ),
          timeoutPromise,
        ])
          .then((resolved) => {
            if (resolved) {
              setComposeData(resolved);
              setComposeStep('ready-to-execute');
              flowStore.updateFlow(selectedVaultId, {
                step: 'ready-to-execute',
                composeFrom: resolved.from,
                composeMessage: resolved.message,
              });
            } else {
              // Timeout — use what we have, user can retry
              console.warn('waitForCompose timed out during recovery, using partial data');
              setComposeData(partialCompose as any);
              setComposeStep('ready-to-execute');
            }
          })
          .catch((err) => {
            console.error('waitForCompose recovery error:', err);
            // Still set compose data with what we have — executeCompose may work
            if (partialCompose) setComposeData(partialCompose as any);
            setComposeStep('ready-to-execute');
          });
      } else if (partialCompose) {
        setComposeData(partialCompose as any);
        setComposeStep(saved.step);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedVaultId]);

  // Reset state when modal closes — keep flow if compose is in progress
  const [wasOpen, setWasOpen] = useState(false);
  useEffect(() => {
    if (isOpen) {
      setWasOpen(true);
      return;
    }
    // Only clean up if the modal was actually open and then closed (not on mount)
    if (!wasOpen) return;
    setWasOpen(false);
    const shouldClearFlow = composeStep === 'idle' || composeStep === 'done';
    if (shouldClearFlow && selectedVaultId) {
      flowStore.removeFlow(selectedVaultId);
    }
    setAmount('');
    setTxHash(null);
    setTxAction(null);
    setIsLoading(false);
    setRiskAccepted(false);
    setTxError(null);
    setAddTokenLoading(false);
    setAddTokenSuccess(false);
    setEstimatedFee(null);
    setOmniGuid(null);
    setOmniStatus('pending');
    setOmniResult(null);
    setPreflight(null);
    setComposeData(null);
    setComposeStep('idle');
    setSpokePreflight(null);
    setSpokePreflightError(null);
    setSelectedRoute(null);
    setPickerChainId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Keep selected asset synced with vault data when it changes
  useEffect(() => {
    const first = depositableAssets?.[0]?.address || primaryAssetAddress;
    setSelectedAssetAddress(first);
    const firstSymbol = depositableAssets?.[0]?.symbol || '';
    setSelectedAssetSymbol(firstSymbol || selectedAssetData.data?.symbol || '');
  }, [primaryAssetAddress, selectedVault?.overview?.depositableAssets]);

  useEffect(() => {
    const updateButtonActionState = async () => {
      if (txHash) {
        setTxAction(null);
        return;
      }
      if (amount && amount !== '0') {
        try {
          if (isOftCompose) {
            setTxAction('oft-compose-deposit');
          } else if (isOmniHub) {
            // omni hub vault (smartDeposit auto-detects sync vs async)
            setTxAction('omni-deposit');
          } else if (selectedAssetData.data?.decimals != null) {
            const isPrimary =
              (selectedAssetAddress || '').toLowerCase() ===
              (primaryAssetAddress || '').toLowerCase();
            const { action } = isPrimary
              ? await depositInVault(parseUnits(amount, selectedAssetData.data.decimals).toString())
              : await depositInVaultFromToken(
                  selectedAssetAddress,
                  parseUnits(amount, selectedAssetData.data.decimals).toString()
                );
            setTxAction(action);
          }
        } catch (error) {
          console.error('Error updating button action state:', error);
          setTxAction(null);
        }
      } else {
        setTxAction(null);
      }
    };
    updateButtonActionState();
  }, [
    amount,
    selectedAssetData.data?.decimals,
    selectedAssetAddress,
    primaryAssetAddress,
    txHash,
    depositInVault,
    depositInVaultFromToken,
    isOmniHub,
    isOftCompose,
    preflight,
  ]);

  const handleChange = (value: string) => {
    if (txError) {
      setTxError(null);
    }

    if (value === '-1') {
      setAmount(maxAmountToSupply);
    } else {
      const decimalTruncatedValue = roundToTokenDecimals(
        value,
        selectedAssetData.data?.decimals || 18
      );
      setAmount(decimalTruncatedValue);
    }
  };

  const handleClick = async () => {
    // oft-compose: cross-chain deposit via OFT from spoke chain
    // Check compose step BEFORE txHash — txHash may be set from TX1 (spoke)
    if (isOftCompose && selectedRoute) {
      // Step 2b: Execute compose on hub (Stargate only)
      if (composeStep === 'ready-to-execute' && composeData) {
        if (!hubWalletClient || !publicClient) {
          setTxError('Wallet not connected to the hub chain');
          return;
        }
        setIsLoading(true);
        setTxError(null);
        setComposeStep('executing');
        try {
          const pc = asSdkClient(publicClient);
          // Include spokeEid + receiver so fee covers readFee + shareSendFee
          const fee = await quoteComposeFee(
            pc,
            selectedVaultId as `0x${string}`,
            CHAIN_ID_TO_EID[selectedRoute.spokeChainId],
            accountAddress as `0x${string}`,
          );
          const composeResult = await executeCompose(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            hubWalletClient as any,
            pc,
            composeData,
            fee // SDK already includes 10% buffer
          );
          setTxHash(composeResult.txHash);
          setComposeStep('done');
          if (selectedVaultId) flowStore.removeFlow(selectedVaultId);

          // SDK 0.2.6: executeCompose now returns guid for async vaults
          if (composeResult.guid) {
            setOmniGuid(composeResult.guid);
            setOmniStatus('pending');
            setIsLoading(false); // unlock UI while waiting
            const final = await waitForAsyncRequest(
              pc,
              selectedVaultId as `0x${string}`,
              composeResult.guid as `0x${string}`,
              LZ_TIMEOUTS.POLL_INTERVAL,
              LZ_TIMEOUTS.LZ_READ_CALLBACK,
            );
            setOmniStatus(final.status as 'completed' | 'refunded');
            setOmniResult(final.result);
            queryClient.invalidateQueries({ queryKey: ['userPositionMultiChain'] });
            queryClient.invalidateQueries({ queryKey: ['vaultStatus'] });
          }
          if (refreshUserVaultData) refreshUserVaultData();
        } catch (error) {
          console.error('Error executing compose:', error);
          setComposeStep('ready-to-execute');
          setTxError(error instanceof Error ? error.message : 'Failed to execute compose on hub.');
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Step 1: Send OFT from spoke
      if (!amount || amount === '0') return;
      if (!selectedRoute.spokeOft) {
        setTxError('Route configuration error: missing spoke OFT address');
        return;
      }
      if (!spokeWalletClient || !spokePublicClient) {
        setTxError('Wallet not connected to the spoke chain');
        return;
      }
      const hubEid = CHAIN_ID_TO_EID[hubChainId];
      const spokeEid = CHAIN_ID_TO_EID[selectedRoute.spokeChainId];
      if (!hubEid || !spokeEid) {
        setTxError('Unsupported chain EID');
        return;
      }

      setIsLoading(true);
      setTxError(null);
      setSpokePreflightError(null);
      try {
        const parsedAmount = BigInt(parseUnits(amount, routeTokenDecimals).toString());
        const feeWithBuffer = (realFee * BigInt(101)) / BigInt(100);

        // Preflight validation: check balance, gas on spoke, composer on hub
        try {
          const pf = await preflightSpokeDeposit(
            asSdkClient(spokePublicClient),
            selectedVaultId as `0x${string}`,
            selectedRoute.spokeOft,
            hubEid,
            spokeEid,
            parsedAmount,
            accountAddress as `0x${string}`,
            feeWithBuffer
          );
          setSpokePreflight({
            isStargate: pf.isStargate,
            estimatedComposeFee: pf.estimatedComposeFee,
          });
        } catch (preflightErr) {
          const raw =
            preflightErr instanceof Error ? preflightErr.message : 'Preflight validation failed';
          let msg = raw;
          if (raw.includes('Insufficient ETH on hub')) {
            const needMatch = raw.match(/Need:\s*~?(\d+)\s*wei/);
            const haveMatch = raw.match(/Have:\s*(\d+)\s*wei/);
            const need = needMatch ? (Number(needMatch[1]) / 1e18).toFixed(6) : '?';
            const have = haveMatch ? (Number(haveMatch[1]) / 1e18).toFixed(6) : '?';
            msg = `Not enough ETH on ${networkConfigs[hubChainId]?.name || 'hub'} for step 2. You have ${have} ETH but need ~${need} ETH.`;
          } else if (raw.includes('Insufficient')) {
            msg = `Not enough funds. ${raw.split(']').pop()?.trim() || raw}`;
          }
          setSpokePreflightError(msg);
          setTxError(msg);
          setIsLoading(false);
          return;
        }

        const result = await depositFromSpoke(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          spokeWalletClient as any,
          asSdkClient(spokePublicClient),
          selectedVaultId as `0x${string}`,
          selectedRoute.spokeOft,
          hubEid,
          spokeEid,
          parsedAmount,
          accountAddress as `0x${string}`,
          feeWithBuffer
        );
        setTxHash(result.txHash);

        // Stargate OFT: need 2nd TX on hub (waitForCompose + executeCompose)
        if (result.composeData) {
          setComposeData(result.composeData);
          setComposeStep('waiting-compose');
          if (selectedVaultId) {
            flowStore.setFlow(selectedVaultId, {
              type: 'stargate-compose',
              step: 'waiting-compose',
              vaultId: selectedVaultId,
              hubChainId: hubChainId,
              spokeChainId: selectedRoute.spokeChainId,
              spokeTxHash: result.txHash,
              composeEndpoint: result.composeData.endpoint ?? null,
              composeFrom: result.composeData.from ?? null,
              composeTo: result.composeData.to ?? null,
              composeGuid: result.composeData.guid ?? null,
              composeIndex: result.composeData.index ?? null,
              composeMessage: result.composeData.message ?? null,
              composeIsStargate: result.composeData.isStargate ?? true,
              composeHubBlockStart: String(result.composeData.hubBlockStart ?? '0'),
              composeTxHash: null,
              omniGuid: null,
            });
          }

          // Wait for compose delivery in background
          if (publicClient) {
            waitForCompose(
              asSdkClient(publicClient),
              result.composeData,
              accountAddress as `0x${string}`
            )
              .then((resolvedCompose) => {
                // Update composeData with real from + message from the SDK
                setComposeData(resolvedCompose);
                setComposeStep('ready-to-execute');
                if (selectedVaultId)
                  flowStore.updateFlow(selectedVaultId, {
                    step: 'ready-to-execute',
                    composeFrom: resolvedCompose.from,
                    composeMessage: resolvedCompose.message,
                  });
              })
              .catch((err) => {
                console.error('waitForCompose error:', err);
                // Don't show error — compose may still arrive, allow manual execute
                setComposeStep('ready-to-execute');
              });
          }
        } else {
          // Standard OFT: compose auto-executes in 1 TX, done
          if (refreshUserVaultData) refreshUserVaultData();
        }
      } catch (error) {
        console.error('Error during spoke deposit:', error);
        setTxError(error instanceof Error ? error.message : 'An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // If a TX was already submitted, open explorer
    if (txHash) {
      const explorerUrl = networkConfigs[hubChainId]?.explorerLink
        ? `${networkConfigs[hubChainId].explorerLink}/tx/${txHash}`
        : currentNetworkConfig.explorerLinkBuilder({ tx: txHash });
      window.open(explorerUrl, '_blank');
      return;
    }

    if (isOmniHub && omniDeposit) {
      if (
        !amount ||
        amount === '0' ||
        !selectedAssetData.data ||
        selectedAssetData.data.decimals == null
      )
        return;
      setIsLoading(true);
      setTxError(null);
      setOmniStatus('pending');
      setOmniResult(null);
      try {
        const parsedAmount = parseUnits(amount, selectedAssetData.data.decimals).toString();
        const { txHash: hash, guid: capturedGuid } = await omniDeposit(parsedAmount);
        setTxHash(hash);
        if (capturedGuid) {
          setOmniGuid(capturedGuid);
          addOmniRequest({
            guid: capturedGuid,
            vaultId: selectedVaultId!,
            chainId: hubChainId,
            type: 'deposit',
            status: 'pending',
            txHash: hash,
            vaultName: selectedVault?.overview?.name,
          });
          // Wait for async finalization via GUID polling (SDK 0.2.6)
          setIsLoading(false); // unlock UI while waiting
          const final = await waitForAsyncRequest(
            asSdkClient(publicClient!),
            selectedVaultId as `0x${string}`,
            capturedGuid as `0x${string}`,
            LZ_TIMEOUTS.POLL_INTERVAL,
            LZ_TIMEOUTS.LZ_READ_CALLBACK,
          );
          setOmniStatus(final.status as 'completed' | 'refunded');
          setOmniResult(final.result);
          // Refresh position data
          queryClient.invalidateQueries({ queryKey: ['userPositionMultiChain'] });
          queryClient.invalidateQueries({ queryKey: ['vaultStatus'] });
          if (refreshUserVaultData) refreshUserVaultData();
        } else {
          // Sync deposit — shares received immediately
          if (refreshUserVaultData) refreshUserVaultData();
        }
      } catch (error) {
        console.error('Error during omni deposit:', error);
        setTxError(error instanceof Error ? error.message : 'An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Standard deposit path
    if (
      !amount ||
      amount === '0' ||
      !selectedAssetData.data ||
      selectedAssetData.data.decimals == null ||
      !signer ||
      (!depositInVault && !depositInVaultFromToken) ||
      !txAction
    ) {
      console.warn('Deposit/Approval prerequisites not met or action not determined:', {
        amount,
        assetDataExists: !!selectedAssetData.data,
        signerExists: !!signer,
        depositInVaultFn: typeof depositInVault,
        currentTxAction: txAction,
      });
      return;
    }

    setIsLoading(true);
    setTxError(null);

    try {
      const parsedAmount = parseUnits(amount, selectedAssetData.data.decimals).toString();
      const isPrimary =
        (selectedAssetAddress || '').toLowerCase() === (primaryAssetAddress || '').toLowerCase();
      const { tx: transactionDataForCurrentAction, action: determinedAction } = isPrimary
        ? await depositInVault(parsedAmount)
        : await depositInVaultFromToken(selectedAssetAddress, parsedAmount);

      if (txAction !== determinedAction) {
        console.warn(
          `Action mismatch: button shows '${txAction}', but current required action is '${determinedAction}'. Updating button.`
        );
        setTxAction(determinedAction);
        setIsLoading(false);
        return;
      }

      if (txAction === 'approve') {
        const enhancedTx = await enhanceTransactionWithGas(transactionDataForCurrentAction);
        const approveResponse = await signer.sendTransaction(enhancedTx);
        const approveReceipt = await approveResponse.wait();

        if (approveReceipt && approveReceipt.status === 1) {
          const isPrimaryLocal =
            (selectedAssetAddress || '').toLowerCase() ===
            (primaryAssetAddress || '').toLowerCase();
          const { action: nextAction } = isPrimaryLocal
            ? await depositInVault(parsedAmount)
            : await depositInVaultFromToken(selectedAssetAddress, parsedAmount);
          setTxAction(nextAction);
        } else {
          console.error('Approval transaction failed or was rejected.');
          setTxError('Approval transaction failed or was rejected.');
        }
      } else if (txAction === 'deposit') {
        const enhancedTx = await enhanceTransactionWithGas(transactionDataForCurrentAction);
        const depositResponse = await signer.sendTransaction(enhancedTx);
        const depositReceipt = await depositResponse.wait();

        if (depositReceipt && depositReceipt.status === 1) {
          setTxHash(depositReceipt.transactionHash);

          if (refreshUserVaultData) {
            refreshUserVaultData();
          }
        } else {
          console.error('Deposit transaction failed.');
          setTxError('Deposit transaction failed or was rejected.');
        }
      }
    } catch (error) {
      console.error('Error during transaction process:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred during the transaction.';
      setTxError(errorMessage);

      if (amount && amount !== '0' && selectedAssetData.data?.decimals != null) {
        try {
          const isPrimaryLocal =
            (selectedAssetAddress || '').toLowerCase() ===
            (primaryAssetAddress || '').toLowerCase();
          const { action: currentActionState } = isPrimaryLocal
            ? await depositInVault(parseUnits(amount, selectedAssetData.data.decimals).toString())
            : await depositInVaultFromToken(
                selectedAssetAddress,
                parseUnits(amount, selectedAssetData.data.decimals).toString()
              );
          setTxAction(currentActionState);
        } catch (recoveryError) {
          console.error('Error trying to recover button state:', recoveryError);
          setTxAction(null);
        }
      } else {
        setTxAction(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const buttonContent = useMemo(() => {
    // Stargate compose: ready to execute on hub
    if (isOftCompose && composeStep === 'ready-to-execute') {
      return `Execute compose on ${networkConfigs[hubChainId]?.name || 'hub'}`;
    }
    if (isOftCompose && composeStep === 'waiting-compose') {
      return 'Waiting for compose delivery…';
    }
    if (isOftCompose && composeStep === 'executing') {
      return 'Executing compose…';
    }

    if (txHash) {
      const explorerName =
        networkConfigs[hubChainId]?.explorerName || currentNetworkConfig.explorerName;
      return `See transaction on ${explorerName}`;
    }

    if (isLoading) {
      if (txAction === 'deposit') return 'Depositing...';
      if (txAction === 'omni-deposit') return 'Depositing...';
      return 'Processing...';
    }

    if (!amount || amount === '0') return 'Enter an amount';

    if (txAction === null || (!isOmniHub && !primaryAssetData.data)) {
      return 'Checking availability...';
    }

    if (txAction === 'approve') {
      return 'Approve token spend';
    }
    if (txAction === 'deposit') {
      return 'Deposit into the vault';
    }
    if (txAction === 'omni-deposit') {
      return 'Deposit into the vault';
    }
    if (txAction === 'oft-compose-deposit') {
      return `Bridge & deposit from ${
        networkConfigs[selectedRoute?.spokeChainId ?? 0]?.name || 'spoke chain'
      }`;
    }

    return 'Deposit into the vault';
  }, [
    amount,
    primaryAssetData.data,
    txHash,
    txAction,
    isLoading,
    currentNetworkConfig.explorerName,
    isOmniHub,
    composeStep,
    hubChainId,
  ]);

  const preflightBlocked =
    (!isOftCompose && isOmniHub && preflight && (preflight.paused || preflight.escrowMissing)) ||
    (depositEligibility && !depositEligibility.allowed);
  const isOnWrongChain = isOftCompose
    ? composeStep === 'ready-to-execute'
      ? wagmiChainId !== hubChainId // compose execute requires hub chain
      : wagmiChainId !== selectedRoute!.spokeChainId
    : isOmniHub && wagmiChainId !== hubChainId;

  return (
    <BasicModal open={isOpen} setOpen={setIsOpen}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Typography variant="h2">
            {isOftCompose
              ? `Deposit from ${networkConfigs[selectedRoute!.spokeChainId]?.name || 'spoke chain'}`
              : 'Deposit into the vault'}
          </Typography>
        </Box>
        {/* Risk Disclosure Section */}
        <Collapse in={!riskAccepted}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box
              sx={{
                mb: 2,
                p: 2,
                bgcolor: 'background.surface',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="secondary14" sx={{ color: 'text.secondary' }}>
                I understand that depositing into this vault involves a risk of loss. The protocol
                provides only the underlying infrastructure. The vault&apos;s owner and curator are
                solely responsible for managing its strategy and allocations, and assume full
                responsibility for its performance.
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={riskAccepted}
                  onChange={(e) => setRiskAccepted(e.target.checked)}
                  sx={{ color: 'text.secondary' }}
                />
              }
              label={
                <Typography variant="secondary14" sx={{ color: 'text.secondary' }}>
                  I understand and accept the risks.
                </Typography>
              }
            />
          </Box>
        </Collapse>

        {/* Deposit Interface Section */}
        <Collapse in={riskAccepted}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pb: 3,
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Tooltip
                  title={
                    addTokenSuccess
                      ? 'Vault token added to wallet!'
                      : txHash || hasVaultTokens
                      ? 'Click to add vault token to your wallet'
                      : ''
                  }
                  enterDelay={1000}
                  placement="top"
                  arrow
                >
                  <Box
                    onClick={handleCuratorIconClick}
                    sx={{
                      cursor:
                        (txHash || hasVaultTokens) && !addTokenLoading ? 'pointer' : 'default',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      '&:hover': {
                        opacity: (txHash || hasVaultTokens) && !addTokenLoading ? 0.8 : 1,
                      },
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <img
                      src={selectedVault?.overview?.curatorLogo || '/MOREVault.svg'}
                      width="45px"
                      height="45px"
                      alt="token-svg"
                      style={{ borderRadius: '50%' }}
                    />
                    {addTokenLoading && (
                      <CircularProgress
                        size={20}
                        sx={{
                          position: 'absolute',
                          color: 'primary.main',
                        }}
                      />
                    )}
                    {addTokenSuccess && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -5,
                          right: -5,
                          backgroundColor: 'success.main',
                          borderRadius: '50%',
                          width: 16,
                          height: 16,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          color: 'white',
                        }}
                      >
                        ✓
                      </Box>
                    )}
                  </Box>
                </Tooltip>
                <Box>
                  <Typography variant="main16">{selectedVault?.overview?.name}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TokenIcon
                      symbol={selectedAssetData.data?.symbol || ''}
                      sx={{ fontSize: '16px' }}
                    />
                    <Typography variant="secondary12">{selectedAssetData.data?.symbol}</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Preflight warnings */}
            {isOmniHub && preflight?.paused && (
              <Alert severity="error">
                This vault is currently paused. Deposits are temporarily disabled.
              </Alert>
            )}
            {isOmniHub && preflight?.escrowMissing && (
              <Alert severity="error">
                This vault&apos;s escrow is not configured. Deposits are disabled.
              </Alert>
            )}
            {depositEligibility && !depositEligibility.allowed && depositEligibility.reason === 'not-whitelisted' && (
              <Alert severity="warning">
                Your address is not whitelisted for deposits in this vault.
              </Alert>
            )}
            {depositEligibility && !depositEligibility.allowed && depositEligibility.reason === 'capacity-full' && (
              <Alert severity="warning">
                This vault has reached its deposit capacity.
              </Alert>
            )}

            {/* ── INLINE CHAIN / ASSET SELECTOR (omni vaults only) ── */}
            {isOmniHub && routesByChain.length > 0 && !(isOftCompose && composeStep !== 'idle') && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="secondary14" color="text.secondary" fontWeight={600}>
                  From network
                </Typography>

                {/* Chain cards — always visible */}
                {routesByChain.map((chain) => {
                  const isSelected = pickerChainId === chain.chainId;
                  const hasBalance = chain.totalBalance > 0;
                  return (
                    <Box
                      key={chain.chainId}
                      onClick={() => {
                        if (isSelected) return;
                        if (amount) setAmount('');
                        setPickerChainId(chain.chainId);
                        // Single asset on this chain → auto-select the route
                        if (chain.routes.length === 1) {
                          setSelectedRoute(chain.routes[0]);
                        } else {
                          setSelectedRoute(null);
                        }
                      }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        py: 1.5,
                        px: 2,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s, background 0.15s',
                        bgcolor: isSelected ? 'action.selected' : 'transparent',
                        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <MarketLogo size={32} logo={chain.chainLogo} />
                        <Box>
                          <Typography variant="main14" fontWeight={600}>
                            {chain.chainName}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {chain.isDirect ? (
                              <Chip
                                label="Hub"
                                size="small"
                                color="success"
                                sx={{ fontSize: '0.6rem', height: 16 }}
                              />
                            ) : (
                              <Chip
                                label="Cross-chain"
                                size="small"
                                sx={{ fontSize: '0.6rem', height: 16, bgcolor: 'action.hover' }}
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>
                      {hasBalance && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: 'success.main',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </Box>
                  );
                })}

                {/* Asset cards — shown when selected chain has multiple assets */}
                {pickerChainId != null && (() => {
                  const chainGroup = routesByChain.find((c) => c.chainId === pickerChainId);
                  if (!chainGroup || chainGroup.routes.length <= 1) return null;
                  return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pl: 1 }}>
                      <Typography variant="secondary12" color="text.secondary">
                        Select asset to deposit from {networkConfigs[pickerChainId]?.name || 'chain'}
                      </Typography>
                      {chainGroup.routes.map((r, idx) => {
                        const decimals = getRouteTokenDecimals(r.symbol);
                        const hasBalance = r.userBalance > BigInt(0);
                        const formattedBalance = parseFloat(
                          formatUnits(r.userBalance, decimals)
                        ).toLocaleString(undefined, { maximumFractionDigits: 4 });
                        const lzFeeEth =
                          r.depositType === 'oft-compose'
                            ? parseFloat(formatUnits(r.lzFeeEstimate, 18)).toFixed(5)
                            : null;
                        const isAssetSelected = selectedRoute === r;
                        return (
                          <Box
                            key={idx}
                            onClick={() => {
                              if (amount) setAmount('');
                              setSelectedRoute(r);
                            }}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 2,
                              py: 1.5,
                              px: 2,
                              borderRadius: 2,
                              border: '1px solid',
                              borderColor: isAssetSelected ? 'primary.main' : 'divider',
                              cursor: 'pointer',
                              opacity: hasBalance ? 1 : 0.45,
                              bgcolor: isAssetSelected ? 'action.selected' : 'transparent',
                              transition: 'border-color 0.15s, background 0.15s',
                              '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <TokenIcon symbol={r.sourceTokenSymbol} sx={{ fontSize: 32 }} />
                              <Box>
                                <Typography variant="main14" fontWeight={600}>
                                  {r.sourceTokenSymbol}
                                </Typography>
                                {lzFeeEth && (
                                  <Typography variant="secondary12" color="text.secondary">
                                    ~{lzFeeEth} {r.nativeSymbol} bridge fee
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                              <Typography
                                variant="secondary14"
                                fontWeight={600}
                                color={hasBalance ? 'text.primary' : 'text.secondary'}
                              >
                                {hasBalance ? formattedBalance : '0'}
                              </Typography>
                              <Typography variant="secondary12" color="text.secondary">
                                {r.sourceTokenSymbol}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  );
                })()}
              </Box>
            )}

            {/* ── OFT-COMPOSE STEPPER ── */}
            {isOftCompose && composeStep !== 'idle' ? (
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
                      label: `Bridge tokens from ${networkConfigs[selectedRoute!.spokeChainId]?.name || 'spoke'}`,
                      chain: networkConfigs[selectedRoute!.spokeChainId]?.name,
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
                {txHash && networkConfigs[selectedRoute!.spokeChainId]?.explorerLink && (
                  <Box
                    sx={{
                      p: 2, bgcolor: 'background.surface', borderRadius: 1,
                      border: '1px solid', borderColor: 'divider',
                      display: 'flex', flexDirection: 'column', gap: 1,
                    }}
                  >
                    <Typography variant="secondary14">
                      {composeStep === 'waiting-compose'
                        ? 'Tokens bridging to hub...'
                        : 'Tokens delivered to hub'}
                    </Typography>
                    <Link
                      href={`${networkConfigs[selectedRoute!.spokeChainId].explorerLink}/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="secondary14"
                    >
                      View TX1 on {networkConfigs[selectedRoute!.spokeChainId]?.explorerName || 'explorer'} ↗
                    </Link>
                  </Box>
                )}

                {/* Chain switch prompt for compose execution */}
                {composeStep === 'ready-to-execute' && wagmiChainId !== hubChainId && (
                  <Alert
                    severity="warning"
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={() => switchChain({ chainId: hubChainId })}
                      >
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
                          ? `Deposit complete — ${parseFloat(formatUnits(BigInt(omniResult.toString()), selectedAssetData.data?.decimals ?? 18)).toFixed(4)} shares minted`
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
                      onClick={handleClick}
                      sx={{ minHeight: '44px' }}
                    >
                      {isLoading && <CircularProgress color="inherit" size="16px" sx={{ mr: 2 }} />}
                      Execute compose on {networkConfigs[hubChainId]?.name || 'hub'}
                    </Button>
                  )}
                  {composeStep === 'done' && omniStatus !== 'pending' && (
                    <Button
                      variant="contained"
                      size="large"
                      onClick={() => setIsOpen(false)}
                      sx={{ minHeight: '44px' }}
                    >
                      Close
                    </Button>
                  )}
                  {composeStep !== 'done' && (
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={() => setIsOpen(false)}
                      sx={{ minHeight: '44px' }}
                    >
                      Close (progress saved)
                    </Button>
                  )}
                </Box>
              </>
            ) : (
              <>
                {/* ── STANDARD DEPOSIT UI (amount input) — hidden when hub stepper active or no route selected ── */}
                {!(isOmniHub && !isOftCompose && txHash) && !(routesByChain.length > 0 && !selectedRoute) && (
                  <>
                    <AssetInput
                      value={amount}
                      onChange={handleChange}
                      usdValue={amountInUsd.toString(10)}
                      symbol={isOftCompose ? selectedRoute!.sourceTokenSymbol : selectedAssetSymbol || ''}
                      assets={
                        isOftCompose
                          ? [
                              {
                                address: selectedRoute!.spokeToken,
                                symbol: selectedRoute!.sourceTokenSymbol,
                                balance: routeBalance ?? '0',
                                decimals: routeTokenDecimals,
                              } as Asset,
                            ]
                          : depositableAssets.map(
                              (a) =>
                                ({
                                  address: a.address,
                                  symbol: a.symbol || (a.address || '').slice(0, 6) || 'TOKEN',
                                  balance:
                                    (a.address || '').toLowerCase() ===
                                    (selectedAssetAddress || '').toLowerCase()
                                      ? walletBalance
                                      : assetBalances[(a.address || '').toLowerCase()] ?? '0',
                                  decimals: a.decimals,
                                } as Asset)
                            )
                      }
                      onSelect={(asset) => {
                        if (!isOftCompose) {
                          setSelectedAssetAddress(asset.address || '');
                          setSelectedAssetSymbol(
                            asset.symbol || (asset.address || '').slice(0, 6) || 'TOKEN'
                          );
                        }
                      }}
                      maxValue={maxAmountToSupply}
                      isMaxSelected={amount === maxAmountToSupply}
                      balanceText={isOftCompose ? 'Balance on spoke' : assetInputConfig.balanceText}
                    />
                    {txError && (
                      <Box
                        sx={{
                          mb: 2,
                          p: 2,
                          bgcolor: 'error.main',
                          color: 'error.contrastText',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'error.main',
                        }}
                      >
                        <Typography variant="secondary14" sx={{ fontWeight: 'bold', mb: 1 }}>
                          Transaction Error
                        </Typography>
                        <Typography variant="caption">{txError}</Typography>
                      </Box>
                    )}

                    {/* Wrong-chain alert */}
                    {isOnWrongChain && (
                      <Alert
                        severity="warning"
                        action={
                          <Button
                            color="inherit"
                            size="small"
                            onClick={() => {
                              const targetChain = isOftCompose
                                ? selectedRoute!.spokeChainId
                                : hubChainId;
                              switchChain({ chainId: targetChain });
                            }}
                          >
                            Switch network
                          </Button>
                        }
                      >
                        {isOftCompose
                          ? `Switch to ${
                              networkConfigs[selectedRoute!.spokeChainId]?.name || 'spoke chain'
                            } to use this route.`
                          : `Switch to ${networkConfigs[hubChainId]?.name || 'hub chain'} to deposit.`}
                      </Alert>
                    )}

                    {/* Bridge fee + info — compact row */}
                    {isOftCompose ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="secondary14" color="text.secondary">
                          Bridge fee (est.)
                        </Typography>
                        {isFeeLoading ? (
                          <CircularProgress size={14} />
                        ) : (
                          <Typography variant="secondary14">
                            ~{parseFloat(formatUnits(realFee, 18)).toFixed(6)} {selectedRoute!.nativeSymbol}
                          </Typography>
                        )}
                      </Box>
                    ) : (isOmniHub && preflight?.recommendedDepositFlow !== 'depositSimple') ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="secondary14" color="text.secondary">
                          Bridge fee (est.)
                        </Typography>
                        {isFeeLoading ? (
                          <CircularProgress size={14} />
                        ) : estimatedFee ? (
                          <Typography variant="secondary14">
                            ~{parseFloat(estimatedFee).toFixed(6)}{' '}
                            {networkConfigs[hubChainId]?.baseAssetSymbol || 'ETH'}
                          </Typography>
                        ) : (
                          <Typography variant="secondary14" color="text.secondary">—</Typography>
                        )}
                      </Box>
                    ) : null}

                    {/* Oracle accounting notice — hub deposits only */}
                    {isOmniHub && !isOftCompose && distribution && !distribution.oracleAccountingEnabled && (
                      <Alert severity="warning" sx={{ py: 0.5 }}>
                        Share price updates when deposits or withdrawals occur, returns from other chains
                        may not be reflected yet.
                      </Alert>
                    )}

                    {/* Low ETH warning — only show when ETH is actually insufficient */}
                    {isOftCompose && hubEthBalance && hubEthBalance.value < BigInt(1e14) && (
                      <Alert severity="error" sx={{ py: 0.5 }}>
                        You need ETH on {networkConfigs[hubChainId]?.name || 'hub'} for step 2. You only have{' '}
                        {parseFloat(hubEthBalance.formatted).toFixed(6)} ETH — send more before depositing.
                      </Alert>
                    )}

                    {/* Spoke preflight error */}
                    {spokePreflightError && !txError && (
                      <Alert severity="error" sx={{ py: 0.5 }}>
                        {spokePreflightError.includes('Insufficient ETH on hub')
                          ? `Not enough ETH on ${networkConfigs[hubChainId]?.name || 'hub'} for step 2.`
                          : spokePreflightError}
                      </Alert>
                    )}
                  </>
                )}

                {/* Hub deposit stepper — shown after TX is submitted */}
                {isOmniHub && !isOftCompose && txHash && (() => {
                  const steps = [
                    {
                      label: 'Deposit',
                      done: !!txHash,
                      active: !!txHash && omniStatus === 'pending' && !omniGuid,
                    },
                    {
                      label: 'Cross-chain accounting',
                      done: omniStatus === 'completed' || omniStatus === 'refunded',
                      active: omniStatus === 'pending' && !!omniGuid,
                    },
                  ];
                  const statusLabel = omniStatus === 'pending'
                    ? (omniGuid ? 'Waiting for cross-chain accounting (~2-5 min)...' : 'Transaction confirmed')
                    : omniStatus === 'completed'
                    ? (omniResult
                        ? `Deposit complete — ${parseFloat(formatUnits(BigInt(omniResult.toString()), selectedAssetData.data?.decimals ?? 18)).toFixed(4)} shares minted`
                        : 'Deposit complete — shares minted')
                    : 'Deposit refunded — funds returned to your wallet';
                  return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Typography variant="secondary14" fontWeight={600}>{statusLabel}</Typography>
                      {omniStatus === 'pending' && <LinearProgress sx={{ borderRadius: 1 }} />}

                      {/* Step circles */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {steps.map((s, i) => (
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
                            <Typography variant="secondary14" sx={{ fontWeight: s.active ? 600 : 400 }}>
                              {s.label}
                            </Typography>
                          </Box>
                        ))}
                      </Box>

                      {/* TX link */}
                      <Box
                        sx={{
                          p: 2, bgcolor: 'background.surface', borderRadius: 1,
                          border: '1px solid', borderColor: 'divider',
                          display: 'flex', flexDirection: 'column', gap: 1,
                        }}
                      >
                        <Link
                          href={`${networkConfigs[hubChainId]?.explorerLink}/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="secondary14"
                        >
                          View on {networkConfigs[hubChainId]?.explorerName || 'explorer'} ↗
                        </Link>
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
                    </Box>
                  );
                })()}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Hide main action button when hub stepper is active */}
                  {!(isOmniHub && !isOftCompose && txHash) && (
                    <Button
                      variant={txHash ? 'contained' : 'gradient'}
                      disabled={
                        isOnWrongChain ||
                        (!amount || amount === '0' || !!preflightBlocked ||
                          (isOftCompose && hubEthBalance && hubEthBalance.value < BigInt(1e14)))
                      }
                      onClick={handleClick}
                      size="large"
                      sx={{ minHeight: '44px' }}
                      data-cy="actionButton"
                    >
                      {isLoading && <CircularProgress color="inherit" size="16px" sx={{ mr: 2 }} />}
                      {buttonContent}
                    </Button>
                  )}
                  {txHash && (
                    <Button
                      variant="outlined"
                      onClick={() => setIsOpen(false)}
                      size="large"
                      sx={{ minHeight: '44px' }}
                    >
                      Close
                    </Button>
                  )}
                </Box>
              </>
            )}
          </Box>
        </Collapse>
      </Box>
    </BasicModal>
  );
};
