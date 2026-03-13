import { Alert, Box, Button, CircularProgress, Collapse, FormControlLabel, Checkbox, Link, Tooltip, Typography } from '@mui/material';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { BasicModal } from 'src/components/primitives/BasicModal';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { AssetInput, Asset } from 'src/components/transactions/AssetInput';
import { useVault } from 'src/hooks/vault/useVault';
import { useVaultData, useUserVaultsData, useAssetData, useDepositableAssetsBalances } from 'src/hooks/vault/useVaultData';
import { useRootStore } from 'src/store/root';
import { useOmniRequestStore } from 'src/store/omniRequestStore';
import { roundToTokenDecimals } from 'src/utils/utils';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { useBalance, useChainId, usePublicClient, useSwitchChain, useWalletClient } from 'wagmi';
import { formatEther, formatUnits } from 'viem';
import { networkConfigs } from 'src/ui-config/networksConfig';
import { asSdkClient, getVaultStatus, quoteLzFee, depositFromSpoke, waitForCompose, executeCompose, quoteComposeFee, preflightSpokeDeposit, CHAIN_ID_TO_EID, quoteRouteDepositFee, type InboundRouteWithBalance } from '@oydual31/more-vaults-sdk/viem';
import { getRouteTokenDecimals, useVaultDistribution } from '@oydual31/more-vaults-sdk/react';

interface VaultDepositModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  whitelistAmount?: string;
  route?: InboundRouteWithBalance;
}

export const VaultDepositModal: React.FC<VaultDepositModalProps> = ({ isOpen, setIsOpen, whitelistAmount, route }) => {
  const { signer, selectedVaultId, chainId: vaultChainId, depositInVault, depositInVaultFromToken, accountAddress, enhanceTransactionWithGas, isOmniHub, omniDeposit } = useVault();
  const wagmiChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: vaultChainId });

  // Spoke chain clients for oft-compose deposits
  const isOftCompose = !!route && route.depositType === 'oft-compose';
  const spokePublicClient = usePublicClient({ chainId: route?.spokeChainId });
  const { data: spokeWalletClient } = useWalletClient({ chainId: route?.spokeChainId });
  const vaultData = useVaultData(selectedVaultId);
  const { distribution } = useVaultDistribution(
    isOmniHub ? selectedVaultId as `0x${string}` : undefined
  );
  const selectedVault = vaultData?.data;
  const userVaultData = useUserVaultsData(accountAddress, [selectedVaultId]);
  const refreshUserVaultData = userVaultData?.[0]?.refetch;
  const [currentNetworkConfig] = useRootStore((state) => [
    state.currentNetworkConfig,
  ]);
  const { addERC20Token } = useWeb3Context();

  const primaryAssetAddress = selectedVault?.overview?.asset?.address || '';
  const primaryAssetData = useAssetData(primaryAssetAddress || '');

  const depositableAssets = (selectedVault?.overview?.depositableAssets && selectedVault.overview.depositableAssets.length > 0
    ? selectedVault.overview.depositableAssets
    : [
      {
        address: primaryAssetAddress,
        symbol: selectedVault?.overview?.asset?.symbol,
        decimals: selectedVault?.overview?.asset?.decimals,
      },
    ]
  );

  const [selectedAssetAddress, setSelectedAssetAddress] = useState<string>(depositableAssets?.[0]?.address || primaryAssetAddress);
  const [selectedAssetSymbol, setSelectedAssetSymbol] = useState<string>(
    (depositableAssets?.[0]?.symbol || '') || ''
  );
  const selectedAssetData = useAssetData(selectedAssetAddress || '');

  const depositableBalancesQuery = useDepositableAssetsBalances(selectedVaultId, accountAddress);
  const { data: walletBalanceData } = useBalance({
    address: accountAddress as `0x${string}`,
    token: (selectedAssetAddress || primaryAssetAddress) as `0x${string}`,
  });

  const assetBalances = depositableBalancesQuery.balances;
  const fallbackWalletBalance =
    assetBalances[(selectedAssetAddress || primaryAssetAddress).toLowerCase()] ?? '0';
  const walletBalance = walletBalanceData?.formatted || fallbackWalletBalance || '0';

  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txAction, setTxAction] = useState<string | null>(null);
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [addTokenLoading, setAddTokenLoading] = useState(false);
  const [addTokenSuccess, setAddTokenSuccess] = useState(false);

  // Hub chain wallet client for Stargate compose execution
  const { data: hubWalletClient } = useWalletClient({ chainId: vaultChainId });

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
  const omniStatus = useOmniRequestStore((s) => omniGuid ? s.omniRequests[omniGuid]?.status ?? 'pending' : 'pending');

  // Stargate compose state (2-TX spoke deposits)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [composeData, setComposeData] = useState<any>(null);
  const [composeStep, setComposeStep] = useState<'idle' | 'waiting-compose' | 'ready-to-execute' | 'executing' | 'done'>('idle');

  // Spoke deposit preflight state
  const [spokePreflight, setSpokePreflight] = useState<{
    isStargate: boolean;
    estimatedComposeFee: bigint;
  } | null>(null);
  const [spokePreflightError, setSpokePreflightError] = useState<string | null>(null);

  // Real fee for oft-compose: re-quoted on each amount change (debounced 500ms)
  const [realFee, setRealFee] = useState<bigint>(route?.lzFeeEstimate ?? BigInt(0));
  useEffect(() => {
    if (!route || route.depositType !== 'oft-compose' || !amount || amount === '0') return;
    const decimals = getRouteTokenDecimals(route.symbol);
    let parsedAmount: bigint;
    try { parsedAmount = BigInt(parseUnits(amount, decimals).toString()); } catch { return; }
    if (parsedAmount === BigInt(0)) return;
    const t = setTimeout(async () => {
      try {
        const fee = await quoteRouteDepositFee(route, vaultChainId, parsedAmount, accountAddress as `0x${string}`);
        setRealFee(fee);
      } catch {
        setRealFee(route.lzFeeEstimate);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [route, amount, vaultChainId, accountAddress]);

  // Reset realFee when route changes
  useEffect(() => { setRealFee(route?.lzFeeEstimate ?? BigInt(0)); }, [route]);

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

      const baseUrl = process.env.NEXT_PUBLIC_API_BASEURL ||
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
  const routeTokenDecimals = route ? getRouteTokenDecimals(route.symbol) : 18;
  const routeBalance = route ? formatUnits(route.userBalance, routeTokenDecimals) : null;

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

    return effectiveMaxAmount || '0';
  }, [walletBalance, whitelistAmount, selectedAssetData.data]);

  const assetInputConfig = useMemo(() => {
    if (!selectedAssetData.data?.decimals || !whitelistAmount || whitelistAmount === '0') {
      return {
        balance: walletBalance,
        balanceText: 'Wallet balance'
      };
    }

    const whitelistAmountFormatted = new BigNumber(whitelistAmount)
      .dividedBy(new BigNumber(10).pow(selectedAssetData.data.decimals))
      .toString();

    const isWalletLimiting = new BigNumber(walletBalance).isLessThan(whitelistAmountFormatted);

    return {
      balance: isWalletLimiting ? walletBalance : whitelistAmountFormatted,
      balanceText: isWalletLimiting ? 'Wallet balance' : 'Max whitelist allowance'
    };
  }, [walletBalance, whitelistAmount, selectedAssetData.data?.decimals]);

  // On open, verify vault is not paused and escrow is configured before allowing deposit
  useEffect(() => {
    if (!isOmniHub || isOftCompose || !isOpen || !selectedVaultId || !publicClient) return;
    let cancelled = false;
    const run = async () => {
      try {
        const status = await getVaultStatus(asSdkClient(publicClient), selectedVaultId as `0x${string}`);
        if (!cancelled) {
          setPreflight({
            paused: status.isPaused,
            escrowMissing: !status.escrow || status.escrow === '0x0000000000000000000000000000000000000000',
            recommendedDepositFlow: status.recommendedDepositFlow,
          });
        }
      } catch {
        if (!cancelled) setPreflight(null);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [isOmniHub, isOpen, selectedVaultId, publicClient]);

  // Estimate bridge fee once when modal opens — fee is amount-independent
  useEffect(() => {
    if (!isOpen) return;
    // oft-compose: display from realFee state (updated via debounced quoteRouteDepositFee)
    if (isOftCompose && route) {
      setEstimatedFee(formatUnits(route.lzFeeEstimate, 18)); // initial display; realFee updates it
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
    return () => { cancelled = true; };
  }, [isOmniHub, isOftCompose, isOpen, selectedVaultId, publicClient, route]);


  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
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
      setPreflight(null);
      setComposeData(null);
      setComposeStep('idle');
      setSpokePreflight(null);
      setSpokePreflightError(null);
    }
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
            const isPrimary = (selectedAssetAddress || '').toLowerCase() === (primaryAssetAddress || '').toLowerCase();
            const { action } = isPrimary
              ? await depositInVault(parseUnits(amount, selectedAssetData.data.decimals).toString())
              : await depositInVaultFromToken(selectedAssetAddress, parseUnits(amount, selectedAssetData.data.decimals).toString());
            setTxAction(action);
          }
        } catch (error) {
          console.error("Error updating button action state:", error);
          setTxAction(null);
        }
      } else {
        setTxAction(null);
      }
    };
    updateButtonActionState();
  }, [amount, selectedAssetData.data?.decimals, selectedAssetAddress, primaryAssetAddress, txHash, depositInVault, depositInVaultFromToken, isOmniHub, isOftCompose, preflight]);

  const handleChange = (value: string) => {
    if (txError) {
      setTxError(null);
    }

    if (value === '-1') {
      setAmount(maxAmountToSupply);
    } else {
      const decimalTruncatedValue = roundToTokenDecimals(value, selectedAssetData.data?.decimals || 18);
      setAmount(decimalTruncatedValue);
    }
  };

  const handleClick = async () => {
    if (txHash) {
      const explorerUrl = networkConfigs[vaultChainId]?.explorerLink
        ? `${networkConfigs[vaultChainId].explorerLink}/tx/${txHash}`
        : currentNetworkConfig.explorerLinkBuilder({ tx: txHash });
      window.open(explorerUrl, '_blank');
      return;
    }

    // oft-compose: cross-chain deposit via OFT from spoke chain
    if (isOftCompose && route) {
      // Step 2b: Execute compose on hub (Stargate only)
      if (composeStep === 'ready-to-execute' && composeData) {
        if (!hubWalletClient || !publicClient) { setTxError('Wallet not connected to the hub chain'); return; }
        setIsLoading(true);
        setTxError(null);
        setComposeStep('executing');
        try {
          const pc = asSdkClient(publicClient);
          const fee = await quoteComposeFee(pc, selectedVaultId as `0x${string}`);
          const feeWithBuffer = (fee * BigInt(110)) / BigInt(100);
          const { txHash: composeHash } = await executeCompose(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            hubWalletClient as any,
            pc,
            composeData,
            feeWithBuffer,
          );
          setTxHash(composeHash);
          setComposeStep('done');
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
      if (!route.spokeOft) { setTxError('Route configuration error: missing spoke OFT address'); return; }
      if (!spokeWalletClient || !spokePublicClient) { setTxError('Wallet not connected to the spoke chain'); return; }
      const hubEid = CHAIN_ID_TO_EID[vaultChainId];
      const spokeEid = CHAIN_ID_TO_EID[route.spokeChainId];
      if (!hubEid || !spokeEid) { setTxError('Unsupported chain EID'); return; }

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
            route.spokeOft,
            hubEid,
            spokeEid,
            parsedAmount,
            accountAddress as `0x${string}`,
            feeWithBuffer,
          );
          setSpokePreflight({ isStargate: pf.isStargate, estimatedComposeFee: pf.estimatedComposeFee });
        } catch (preflightErr) {
          const msg = preflightErr instanceof Error ? preflightErr.message : 'Preflight validation failed';
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
          route.spokeOft,
          hubEid,
          spokeEid,
          parsedAmount,
          accountAddress as `0x${string}`,
          feeWithBuffer,
        );
        setTxHash(result.txHash);

        // Stargate OFT: need 2nd TX on hub (waitForCompose + executeCompose)
        if (result.composeData) {
          setComposeData(result.composeData);
          setComposeStep('waiting-compose');

          // Wait for compose delivery in background
          if (publicClient) {
            waitForCompose(
              asSdkClient(publicClient),
              result.composeData,
              accountAddress as `0x${string}`,
            ).then(() => {
              setComposeStep('ready-to-execute');
            }).catch((err) => {
              console.error('waitForCompose error:', err);
              setTxError('Compose delivery timed out. You can retry the execute step later.');
              setComposeStep('ready-to-execute'); // still allow manual retry
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

    if (isOmniHub && omniDeposit) {
      if (!amount || amount === '0' || !selectedAssetData.data || selectedAssetData.data.decimals == null) return;
      setIsLoading(true);
      setTxError(null);
      try {
        const parsedAmount = parseUnits(amount, selectedAssetData.data.decimals).toString();
        const { txHash: hash, guid: capturedGuid } = await omniDeposit(parsedAmount);
        setTxHash(hash);
        if (capturedGuid) {
          // Async deposit (vault is in async mode)
          setOmniGuid(capturedGuid);
          addOmniRequest({
            guid: capturedGuid,
            vaultId: selectedVaultId!,
            chainId: vaultChainId,
            type: 'deposit',
            status: 'pending',
            txHash: hash,
            vaultName: selectedVault?.overview?.name,
          });
        }
        // No guid = sync deposit (vault is in sync mode), tx is already complete
        if (refreshUserVaultData) refreshUserVaultData();
      } catch (error) {
        console.error('Error during omni deposit:', error);
        setTxError(error instanceof Error ? error.message : 'An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Standard deposit path
    if (!amount || amount === '0' || !selectedAssetData.data || selectedAssetData.data.decimals == null || !signer || (!depositInVault && !depositInVaultFromToken) || !txAction) {
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
      const isPrimary = (selectedAssetAddress || '').toLowerCase() === (primaryAssetAddress || '').toLowerCase();
      const { tx: transactionDataForCurrentAction, action: determinedAction } = isPrimary
        ? await depositInVault(parsedAmount)
        : await depositInVaultFromToken(selectedAssetAddress, parsedAmount);

      if (txAction !== determinedAction) {
        console.warn(`Action mismatch: button shows '${txAction}', but current required action is '${determinedAction}'. Updating button.`);
        setTxAction(determinedAction);
        setIsLoading(false);
        return;
      }

      if (txAction === 'approve') {
        const enhancedTx = await enhanceTransactionWithGas(transactionDataForCurrentAction);
        const approveResponse = await signer.sendTransaction(enhancedTx);
        const approveReceipt = await approveResponse.wait();

        if (approveReceipt && approveReceipt.status === 1) {
          const isPrimaryLocal = (selectedAssetAddress || '').toLowerCase() === (primaryAssetAddress || '').toLowerCase();
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
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during the transaction.';
      setTxError(errorMessage);

      if (amount && amount !== '0' && selectedAssetData.data?.decimals != null) {
        try {
          const isPrimaryLocal = (selectedAssetAddress || '').toLowerCase() === (primaryAssetAddress || '').toLowerCase();
          const { action: currentActionState } = isPrimaryLocal
            ? await depositInVault(parseUnits(amount, selectedAssetData.data.decimals).toString())
            : await depositInVaultFromToken(selectedAssetAddress, parseUnits(amount, selectedAssetData.data.decimals).toString());
          setTxAction(currentActionState);
        } catch (recoveryError) {
          console.error("Error trying to recover button state:", recoveryError);
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
      return `Execute compose on ${networkConfigs[vaultChainId]?.name || 'hub'}`;
    }
    if (isOftCompose && composeStep === 'waiting-compose') {
      return 'Waiting for compose delivery…';
    }
    if (isOftCompose && composeStep === 'executing') {
      return 'Executing compose…';
    }

    if (txHash) {
      const explorerName = networkConfigs[vaultChainId]?.explorerName || currentNetworkConfig.explorerName;
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
      return `Bridge & deposit from ${networkConfigs[route?.spokeChainId ?? 0]?.name || 'spoke chain'}`;
    }

    return 'Deposit into the vault';
  }, [amount, primaryAssetData.data, txHash, txAction, isLoading, currentNetworkConfig.explorerName, isOmniHub, composeStep, vaultChainId]);

  const preflightBlocked = !isOftCompose && isOmniHub && preflight && (preflight.paused || preflight.escrowMissing);
  const isOnWrongChain = isOftCompose
    ? (composeStep === 'ready-to-execute'
      ? wagmiChainId !== vaultChainId // compose execute requires hub chain
      : wagmiChainId !== route!.spokeChainId)
    : isOmniHub && wagmiChainId !== vaultChainId;

  return (
    <BasicModal open={isOpen} setOpen={setIsOpen}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Typography variant="h2">
            {isOftCompose
              ? `Deposit from ${networkConfigs[route!.spokeChainId]?.name || 'spoke chain'}`
              : 'Deposit into the vault'}
          </Typography>
        </Box>
        {/* Risk Disclosure Section */}
        <Collapse in={!riskAccepted}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ mb: 2, p: 2, bgcolor: 'background.surface', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="secondary14" sx={{ color: 'text.secondary' }}>
                I understand that depositing into this vault involves a risk of loss. The protocol provides only the underlying infrastructure. The vault&apos;s owner and curator are solely responsible for managing its strategy and allocations, and assume full responsibility for its performance.
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
                      : (txHash || hasVaultTokens)
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
                      cursor: (txHash || hasVaultTokens) && !addTokenLoading ? 'pointer' : 'default',
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
                    <TokenIcon symbol={selectedAssetData.data?.symbol || ''} sx={{ fontSize: '16px' }} />
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

            <AssetInput
              value={amount}
              onChange={handleChange}
              usdValue={amountInUsd.toString(10)}
              symbol={isOftCompose ? route!.sourceTokenSymbol : (selectedAssetSymbol || '')}
              assets={isOftCompose ? [{
                address: route!.spokeToken,
                symbol: route!.sourceTokenSymbol,
                balance: routeBalance ?? '0',
                decimals: routeTokenDecimals,
              } as Asset] : depositableAssets.map((a) => ({
                address: a.address,
                symbol: a.symbol || ((a.address || '').slice(0, 6) || 'TOKEN'),
                balance: ((a.address || '').toLowerCase() === (selectedAssetAddress || '').toLowerCase())
                  ? walletBalance
                  : (assetBalances[(a.address || '').toLowerCase()] ?? '0'),
                decimals: a.decimals,
              }) as Asset)}
              onSelect={(asset) => {
                if (!isOftCompose) {
                  setSelectedAssetAddress(asset.address || '');
                  setSelectedAssetSymbol(asset.symbol || ((asset.address || '').slice(0, 6) || 'TOKEN'));
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
                  borderColor: 'error.main'
                }}
              >
                <Typography variant="secondary14" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Transaction Error
                </Typography>
                <Typography variant="caption">
                  {txError}
                </Typography>
              </Box>
            )}

            {(isOftCompose || (isOmniHub && preflight?.recommendedDepositFlow !== 'depositSimple')) && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {isOnWrongChain && (
                  <Alert
                    severity="warning"
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={() => switchChain({ chainId: isOftCompose ? route!.spokeChainId : vaultChainId })}
                      >
                        Switch network
                      </Button>
                    }
                  >
                    {isOftCompose
                      ? `Switch to ${networkConfigs[route!.spokeChainId]?.name || 'spoke chain'} to use this route.`
                      : 'You must be on the vault\'s hub network to deposit.'}
                  </Alert>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="secondary14" color="text.secondary">Bridge fee (est.)</Typography>
                  {isFeeLoading ? (
                    <CircularProgress size={14} />
                  ) : isOftCompose ? (
                    <Typography variant="secondary14">
                      ~{parseFloat(formatUnits(realFee, 18)).toFixed(6)} {route!.nativeSymbol} (excess refunded)
                    </Typography>
                  ) : estimatedFee ? (
                    <Typography variant="secondary14">
                      ~{parseFloat(estimatedFee).toFixed(6)} {networkConfigs[vaultChainId]?.baseAssetSymbol || 'ETH'} (excess refunded)
                    </Typography>
                  ) : (
                    <Typography variant="secondary14" color="text.secondary">—</Typography>
                  )}
                </Box>
              </Box>
            )}

            {/* Oracle accounting notice */}
            {isOmniHub && distribution && !distribution.oracleAccountingEnabled && (
              <Alert severity="warning" sx={{ py: 0.5 }}>
                Share price updates when deposits or withdrawals occur, returns from other chains may not be reflected yet.
              </Alert>
            )}

            {/* Stargate 2-TX warning for spoke deposits */}
            {isOftCompose && spokePreflight?.isStargate && !txHash && (
              <Alert severity="info" sx={{ py: 0.5 }}>
                This route uses Stargate and requires 2 transactions: one on{' '}
                {networkConfigs[route!.spokeChainId]?.name || 'spoke'} and one on{' '}
                {networkConfigs[vaultChainId]?.name || 'hub'}.
                {spokePreflight.estimatedComposeFee > BigInt(0) && (
                  <> You&apos;ll need ~{parseFloat(formatUnits(spokePreflight.estimatedComposeFee, 18)).toFixed(6)}{' '}
                  {networkConfigs[vaultChainId]?.baseAssetSymbol || 'ETH'} on the hub for the compose transaction.</>
                )}
              </Alert>
            )}

            {/* Spoke preflight error */}
            {spokePreflightError && !txError && (
              <Alert severity="error" sx={{ py: 0.5 }}>
                {spokePreflightError}
              </Alert>
            )}

            {/* oft-compose: show spoke tx link and compose flow status */}
            {isOftCompose && txHash && (
              <Box sx={{ p: 2, bgcolor: 'background.surface', borderRadius: 1, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {composeStep === 'idle' || composeStep === 'done' ? (
                  <Typography variant="secondary14">✅ Bridge transaction sent — tokens are on their way to the hub</Typography>
                ) : composeStep === 'waiting-compose' ? (
                  <Typography variant="secondary14">⏳ Waiting for compose delivery on hub (~5-15 min)…</Typography>
                ) : composeStep === 'ready-to-execute' ? (
                  <Typography variant="secondary14">✅ Compose arrived — switch to {networkConfigs[vaultChainId]?.name || 'hub'} and execute</Typography>
                ) : composeStep === 'executing' ? (
                  <Typography variant="secondary14">⏳ Executing compose on hub…</Typography>
                ) : null}
                {networkConfigs[route!.spokeChainId]?.explorerLink && (
                  <Link
                    href={`${networkConfigs[route!.spokeChainId].explorerLink}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="secondary14"
                  >
                    View on {networkConfigs[route!.spokeChainId]?.explorerName || 'explorer'} ↗
                  </Link>
                )}
              </Box>
            )}

            {/* Cross-chain request status tracker — shown after bridge tx confirms */}
            {isOmniHub && !isOftCompose && txHash && (
              <Box sx={{ p: 2, bgcolor: 'background.surface', borderRadius: 1, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="secondary14">
                  {omniStatus === 'pending' && '⏳ Waiting for cross-chain accounting (~2 min)…'}
                  {omniStatus === 'ready-to-execute' && '⏳ Accounting resolved, finalising…'}
                  {omniStatus === 'completed' && '✅ Deposit complete — shares minted'}
                  {omniStatus === 'refunded' && '↩️ Deposit refunded — funds returned to your wallet'}
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

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant={txHash ? 'contained' : 'gradient'}
                disabled={(!amount || amount === '0' || !!preflightBlocked || isOnWrongChain) && composeStep !== 'ready-to-execute'}
                onClick={handleClick}
                size="large"
                sx={{ minHeight: '44px' }}
                data-cy="actionButton"
              >
                {isLoading && <CircularProgress color="inherit" size="16px" sx={{ mr: 2 }} />}
                {buttonContent}
              </Button>
            </Box>
          </Box>
        </Collapse>
      </Box>
    </BasicModal>
  );
};
