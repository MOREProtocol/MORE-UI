import { Alert, Box, Button, CircularProgress, Collapse, FormControlLabel, Checkbox, Link, MenuItem, Select, Tooltip, Typography } from '@mui/material';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import { parseUnits, formatUnits } from 'ethers/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { BasicModal } from 'src/components/primitives/BasicModal';
import { TokenIcon } from 'src/components/primitives/TokenIcon';
import { AssetInput, Asset } from 'src/components/transactions/AssetInput';
import { useVault } from 'src/hooks/vault/useVault';
import { useVaultData, useUserVaultsData, useAssetData, useDepositableAssetsBalances, useVaultProvider } from 'src/hooks/vault/useVaultData';
import { roundToTokenDecimals } from 'src/utils/utils';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { useBalance, useChainId, useSendTransaction, useSwitchChain } from 'wagmi';
import { networkConfigs } from 'src/ui-config/networksConfig';
import { quoteOmniFee } from 'src/hooks/vault/useOmniVaultActions';
import { useOmniSpokeActions, type SpokeDepositInfo } from 'src/hooks/vault/useOmniSpokeActions';
import configurationFacetAbi from 'src/libs/abis/configuration_facet_abi.json';
import bridgeFacetAbi from 'src/libs/abis/bridge_facet_abi.json'; // used for hub vault preflight + status polling

interface VaultDepositModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  whitelistAmount?: string;
}

export const VaultDepositModal: React.FC<VaultDepositModalProps> = ({ isOpen, setIsOpen, whitelistAmount }) => {
  const { signer, selectedVaultId, chainId: vaultChainId, depositInVault, depositInVaultFromToken, accountAddress, enhanceTransactionWithGas, isOmniHub, omniDeposit, checkOmniDepositAction, spokeVaults } = useVault();
  const wagmiChainId = useChainId();
  const { switchChain, switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const vaultProvider = useVaultProvider(vaultChainId);
  const vaultData = useVaultData(selectedVaultId);
  const selectedVault = vaultData?.data;
  const userVaultData = useUserVaultsData(accountAddress, [selectedVaultId]);
  const refreshUserVaultData = userVaultData?.[0]?.refetch;
  const { addERC20Token } = useWeb3Context();

  // Hub chain is where the vault actually lives (from vault data), not the wallet chain
  const hubChainId: number = selectedVault?.chainId ?? vaultChainId;

  // ── Deposit chain selection ───────────────────────────────────────────────
  // Defaults to hub chain; user can switch to any spoke chain
  const [selectedDepositChainId, setSelectedDepositChainId] = useState<number>(hubChainId);
  // Captured once when the modal opens — restored when it closes or after each spoke tx
  const [originalChainId, setOriginalChainId] = useState<number | null>(null);

  const isUsingSpoke = isOmniHub && !!spokeVaults?.length && selectedDepositChainId !== hubChainId;
  const currentSpokeVault = spokeVaults?.find(s => s.chainId === selectedDepositChainId);
  const spokeOFTAddress = currentSpokeVault?.address ?? null;

  // Provider for the currently selected deposit chain (spoke or hub)
  const spokeProvider = useVaultProvider(isUsingSpoke ? selectedDepositChainId : 0);

  const { quoteSpokeDepositFee, spokeDeposit, checkSpokeDepositAction, getSpokeDepositInfo } = useOmniSpokeActions(
    selectedVaultId,
    hubChainId,
    selectedDepositChainId,
  );

  // ── Spoke token info ──────────────────────────────────────────────────────
  const [spokeDepositInfo, setSpokeDepositInfo] = useState<SpokeDepositInfo | null>(null);
  const [spokeTokenDecimals, setSpokeTokenDecimals] = useState<number>(6); // USDC default
  const [spokeTokenSymbol, setSpokeTokenSymbol] = useState<string>('');
  const [spokeTokenBalance, setSpokeTokenBalance] = useState<string>('0');
  const [isSpokeInfoLoading, setIsSpokeInfoLoading] = useState(false);

  // ── Primary vault asset state (hub flow) ─────────────────────────────────
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

  // ── Omni hub vault state ──────────────────────────────────────────────────
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const [isFeeLoading, setIsFeeLoading] = useState(false);
  const [omniGuid, setOmniGuid] = useState<string | null>(null);
  const [omniStatus, setOmniStatus] = useState<'pending' | 'fulfilled' | 'finalized'>('pending');
  const [omniFinalizationResult, setOmniFinalizationResult] = useState<string | null>(null);
  const [preflight, setPreflight] = useState<{ paused: boolean; escrowMissing: boolean } | null>(null);

  const amountInUsd = new BigNumber(amount).multipliedBy(
    isUsingSpoke ? 0 : (selectedAssetData.data?.price || 0)
  );

  const userVaultBalance = userVaultData?.[0]?.data?.maxWithdraw?.toString() || '0';
  const hasVaultTokens = new BigNumber(userVaultBalance).isGreaterThan(0);

  // Effective decimals and symbol for the current deposit path
  const effectiveDecimals = isUsingSpoke ? spokeTokenDecimals : (selectedAssetData.data?.decimals ?? 18);
  const effectiveSymbol = isUsingSpoke ? (spokeTokenSymbol || selectedVault?.overview?.asset?.symbol || '') : (selectedAssetSymbol || '');
  // Explorer info for the selected deposit chain
  const depositChainExplorerName = networkConfigs[isUsingSpoke ? selectedDepositChainId : hubChainId]?.explorerName || 'Explorer';
  const depositChainExplorerLink = networkConfigs[isUsingSpoke ? selectedDepositChainId : hubChainId]?.explorerLink || '';

  // ── Capture original chain once on modal open; reset when it closes ──────
  useEffect(() => {
    if (isOpen && originalChainId === null) {
      setOriginalChainId(wagmiChainId);
    }
    if (!isOpen) {
      setOriginalChainId(null);
    }
  // wagmiChainId intentionally excluded: we only want the value at open time
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Reset selected chain when hubChainId is resolved ─────────────────────
  useEffect(() => {
    if (hubChainId && selectedDepositChainId !== hubChainId && !isUsingSpoke) {
      setSelectedDepositChainId(hubChainId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubChainId]);

  // ── Load spoke token info when spoke chain is selected ───────────────────
  useEffect(() => {
    if (!isUsingSpoke || !spokeOFTAddress || !spokeProvider || !accountAddress) return;
    let cancelled = false;

    const load = async () => {
      setIsSpokeInfoLoading(true);
      setSpokeDepositInfo(null);
      try {
        const info = await getSpokeDepositInfo(spokeOFTAddress);
        if (cancelled) return;
        setSpokeDepositInfo(info);

        const tokenContract = new ethers.Contract(info.tokenAddress, [
          'function decimals() external view returns (uint8)',
          'function symbol() external view returns (string)',
          'function balanceOf(address) external view returns (uint256)',
        ], spokeProvider);

        const [dec, sym, bal] = await Promise.all([
          tokenContract.decimals().catch(() => 6),
          tokenContract.symbol().catch(() => selectedVault?.overview?.asset?.symbol || ''),
          tokenContract.balanceOf(accountAddress).catch(() => ethers.BigNumber.from(0)),
        ]);

        if (!cancelled) {
          setSpokeTokenDecimals(dec);
          setSpokeTokenSymbol(sym);
          setSpokeTokenBalance(formatUnits(bal, dec));
        }
      } catch {
        if (!cancelled) setSpokeTokenBalance('0');
      } finally {
        if (!cancelled) setIsSpokeInfoLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [isUsingSpoke, spokeOFTAddress, spokeProvider, accountAddress, getSpokeDepositInfo, selectedVault?.overview?.asset?.symbol]);

  // ── On open, verify hub vault is not paused and escrow is configured ──────
  useEffect(() => {
    if (!isOmniHub || !isOpen || !selectedVaultId || !vaultProvider) return;
    let cancelled = false;
    const run = async () => {
      try {
        const configFacet = new ethers.Contract(selectedVaultId, configurationFacetAbi, vaultProvider);
        const [isPaused, escrow] = await Promise.all([
          configFacet.paused().catch(() => false),
          configFacet.getEscrow().catch(() => ethers.constants.AddressZero),
        ]);
        if (!cancelled) {
          setPreflight({
            paused: !!isPaused,
            escrowMissing: escrow === ethers.constants.AddressZero,
          });
        }
      } catch {
        if (!cancelled) setPreflight(null);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [isOmniHub, isOpen, selectedVaultId, vaultProvider]);

  // ── Estimate bridge fee once when modal opens or deposit chain changes ────
  useEffect(() => {
    if (!isOmniHub || !isOpen || !selectedVaultId) return;
    let cancelled = false;

    const run = async () => {
      setIsFeeLoading(true);
      setEstimatedFee(null);
      try {
        if (isUsingSpoke && spokeOFTAddress && spokeDepositInfo && amount && parseFloat(amount) > 0) {
          // Spoke fee: quote via OFT.quoteSend on the OFT address
          const amountInWei = parseUnits(amount, effectiveDecimals).toString();
          const fee = await quoteSpokeDepositFee(spokeDepositInfo, amountInWei);
          if (!cancelled) {
            setEstimatedFee(fee ? ethers.utils.formatEther(fee) : null);
          }
        } else if (!isUsingSpoke && vaultProvider) {
          // Hub fee: quote from the bridge facet
          const fee = await quoteOmniFee(selectedVaultId, vaultProvider);
          if (!cancelled) {
            setEstimatedFee(ethers.utils.formatEther(fee.mul(101).div(100)));
          }
        }
      } catch {
        if (!cancelled) setEstimatedFee(null);
      } finally {
        if (!cancelled) setIsFeeLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  // Spoke fee depends on amount; hub fee is amount-independent
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOmniHub, isOpen, selectedVaultId, isUsingSpoke, spokeOFTAddress, spokeDepositInfo, selectedDepositChainId, amount]);

  // ── Poll cross-chain request status after hub deposit tx confirms ─────────
  useEffect(() => {
    if (!omniGuid || !selectedVaultId || !vaultProvider || omniStatus === 'finalized') return;
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      try {
        const bridge = new ethers.Contract(selectedVaultId, bridgeFacetAbi, vaultProvider);
        const info = await bridge.getRequestInfo(omniGuid);
        if (!cancelled) {
          if (info.finalized) {
            setOmniStatus('finalized');
            setOmniFinalizationResult(info.finalizationResult.toString());
          } else if (info.fulfilled) {
            setOmniStatus('fulfilled');
          }
        }
      } catch {
        // Silently ignore polling errors
      }
    };
    poll();
    const interval = setInterval(poll, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [omniGuid, selectedVaultId, vaultProvider, omniStatus]);

  // ── Reset all state when modal closes ────────────────────────────────────
  const handleSetOpen = (open: boolean) => {
    if (!open) {
      // Restore wallet to the chain it was on when the modal opened
      const chainToRestore = originalChainId ?? hubChainId;
      if (wagmiChainId !== chainToRestore) {
        switchChain({ chainId: chainToRestore });
      }
      setSelectedDepositChainId(hubChainId);
      setSpokeDepositInfo(null);
      setSpokeTokenBalance('0');
      setSpokeTokenSymbol('');
    }
    setIsOpen(open);
  };

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
      setOmniStatus('pending');
      setOmniFinalizationResult(null);
      setPreflight(null);
      setIsSpokeInfoLoading(false);
    }
  }, [isOpen]);

  // ── Keep selected asset synced with vault data ────────────────────────────
  useEffect(() => {
    const first = depositableAssets?.[0]?.address || primaryAssetAddress;
    setSelectedAssetAddress(first);
    const firstSymbol = depositableAssets?.[0]?.symbol || '';
    setSelectedAssetSymbol(firstSymbol || selectedAssetData.data?.symbol || '');
  }, [primaryAssetAddress, selectedVault?.overview?.depositableAssets]);

  // ── Determine button action ───────────────────────────────────────────────
  useEffect(() => {
    const updateButtonActionState = async () => {
      if (txHash) {
        setTxAction(null);
        return;
      }
      if (!amount || amount === '0' || parseFloat(amount) <= 0) {
        setTxAction(null);
        return;
      }

      try {
        if (isUsingSpoke && spokeOFTAddress && spokeDepositInfo && checkSpokeDepositAction) {
          if (effectiveDecimals == null) return;
          const amountInWei = parseUnits(amount, effectiveDecimals).toString();
          const action = await checkSpokeDepositAction(amountInWei, spokeDepositInfo);
          setTxAction(action);
        } else if (isOmniHub && checkOmniDepositAction) {
          if (selectedAssetData.data?.decimals == null) return;
          const action = await checkOmniDepositAction(parseUnits(amount, selectedAssetData.data.decimals).toString());
          setTxAction(action);
        } else {
          if (selectedAssetData.data?.decimals == null) return;
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
    };
    updateButtonActionState();
  }, [amount, selectedAssetData.data?.decimals, selectedAssetAddress, primaryAssetAddress, txHash, depositInVault, depositInVaultFromToken, isOmniHub, checkOmniDepositAction, isUsingSpoke, spokeOFTAddress, spokeDepositInfo, checkSpokeDepositAction, effectiveDecimals]);

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

  const maxAmountToSupply = useMemo(() => {
    if (isUsingSpoke) {
      // For spoke deposits, max is the spoke token balance (no whitelist cap)
      return spokeTokenBalance || '0';
    }

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
  }, [isUsingSpoke, spokeTokenBalance, walletBalance, whitelistAmount, selectedAssetData.data]);

  const assetInputConfig = useMemo(() => {
    if (isUsingSpoke) {
      return { balance: spokeTokenBalance, balanceText: 'Wallet balance' };
    }

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
  }, [isUsingSpoke, spokeTokenBalance, walletBalance, whitelistAmount, selectedAssetData.data?.decimals]);

  const handleChange = (value: string) => {
    if (txError) {
      setTxError(null);
    }

    if (value === '-1') {
      setAmount(maxAmountToSupply);
    } else {
      const decimalTruncatedValue = roundToTokenDecimals(value, effectiveDecimals || 18);
      setAmount(decimalTruncatedValue);
    }
  };

  const handleClick = async () => {
    if (txHash) {
      const explorerUrl = `${depositChainExplorerLink}/tx/${txHash}`;
      window.open(explorerUrl, '_blank');
      return;
    }

    // ── Spoke deposit path ──────────────────────────────────────────────────
    if (isUsingSpoke && spokeOFTAddress && spokeDepositInfo) {
      if (!amount || amount === '0' || !txAction || !accountAddress) return;
      setIsLoading(true);
      setTxError(null);
      try {
        const amountInWei = parseUnits(amount, effectiveDecimals).toString();

        // Refresh fee quote right before building the tx
        const currentFee = await quoteSpokeDepositFee(spokeDepositInfo, amountInWei);

        const { tx, action: determinedAction } = await spokeDeposit(amountInWei, spokeDepositInfo, currentFee);

        if (txAction !== determinedAction) {
          setTxAction(determinedAction);
          setIsLoading(false);
          return;
        }

        if (txAction === 'approve') {
          // wagmi v2 requires an explicit chain switch before sending on a different chain
          if (wagmiChainId !== selectedDepositChainId) {
            await switchChainAsync({ chainId: selectedDepositChainId });
          }
          const hash = await sendTransactionAsync({
            to: tx.to as `0x${string}`,
            data: tx.data as `0x${string}`,
            chainId: selectedDepositChainId,
          });
          await spokeProvider?.waitForTransaction(hash);
          // Restore original chain after approve so the rest of the app is unaffected
          const chainToRestore = originalChainId ?? hubChainId;
          if (wagmiChainId !== chainToRestore) switchChain({ chainId: chainToRestore });
          // Recheck action after approval
          const nextAction = await checkSpokeDepositAction(amountInWei, spokeDepositInfo);
          setTxAction(nextAction);
        } else if (txAction === 'spoke-deposit') {
          // wagmi v2 requires an explicit chain switch before sending on a different chain
          if (wagmiChainId !== selectedDepositChainId) {
            await switchChainAsync({ chainId: selectedDepositChainId });
          }
          const hash = await sendTransactionAsync({
            to: tx.to as `0x${string}`,
            data: tx.data as `0x${string}`,
            value: tx.value ? BigInt(tx.value.toString()) : BigInt(0),
            chainId: selectedDepositChainId,
          });
          await spokeProvider?.waitForTransaction(hash);
          // Restore original chain immediately after tx confirms
          const chainToRestore = originalChainId ?? hubChainId;
          if (wagmiChainId !== chainToRestore) switchChain({ chainId: chainToRestore });
          setTxHash(hash);
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

    // ── Hub omni deposit path ───────────────────────────────────────────────
    if (isOmniHub && omniDeposit) {
      if (!amount || amount === '0' || !selectedAssetData.data || selectedAssetData.data.decimals == null || !signer || !txAction) return;
      setIsLoading(true);
      setTxError(null);
      try {
        const parsedAmount = parseUnits(amount, selectedAssetData.data.decimals).toString();
        const { tx, action: determinedAction, guid: capturedGuid } = await omniDeposit(parsedAmount);

        if (txAction !== determinedAction) {
          setTxAction(determinedAction);
          setIsLoading(false);
          return;
        }

        if (txAction === 'approve') {
          const enhancedTx = await enhanceTransactionWithGas(tx);
          const approveResponse = await signer.sendTransaction(enhancedTx);
          const approveReceipt = await approveResponse.wait();
          if (approveReceipt && approveReceipt.status === 1) {
            const { action: nextAction } = await omniDeposit(parsedAmount);
            setTxAction(nextAction);
          } else {
            setTxError('Approval transaction failed or was rejected.');
          }
        } else if (txAction === 'omni-deposit') {
          const hash = await sendTransactionAsync({
            to: tx.to as `0x${string}`,
            data: tx.data as `0x${string}`,
            value: tx.value ? BigInt(tx.value.toString()) : BigInt(0),
            chainId: vaultChainId,
          });
          const receipt = await vaultProvider?.waitForTransaction(hash);
          if (receipt && receipt.status === 1) {
            setTxHash(hash);
            if (capturedGuid) {
              setOmniGuid(capturedGuid);
              setOmniStatus('pending');
            }
            if (refreshUserVaultData) refreshUserVaultData();
          } else {
            setTxError('Deposit transaction failed or was rejected.');
          }
        }
      } catch (error) {
        console.error('Error during omni deposit:', error);
        setTxError(error instanceof Error ? error.message : 'An unexpected error occurred.');
        try {
          if (amount && amount !== '0' && selectedAssetData.data?.decimals != null) {
            const { action } = await omniDeposit(parseUnits(amount, selectedAssetData.data.decimals).toString());
            setTxAction(action);
          }
        } catch { setTxAction(null); }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // ── Standard deposit path ───────────────────────────────────────────────
    if (!amount || amount === '0' || !selectedAssetData.data || selectedAssetData.data.decimals == null || !signer || (!depositInVault && !depositInVaultFromToken) || !txAction) {
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
          setTxError('Approval transaction failed or was rejected.');
        }
      } else if (txAction === 'deposit') {
        const enhancedTx = await enhanceTransactionWithGas(transactionDataForCurrentAction);
        const depositResponse = await signer.sendTransaction(enhancedTx);
        const depositReceipt = await depositResponse.wait();

        if (depositReceipt && depositReceipt.status === 1) {
          setTxHash(depositReceipt.transactionHash);
          if (refreshUserVaultData) refreshUserVaultData();
        } else {
          setTxError('Deposit transaction failed or was rejected.');
        }
      }
    } catch (error) {
      console.error('Error during transaction process:', error);
      setTxError(error instanceof Error ? error.message : 'An unexpected error occurred during the transaction.');

      if (amount && amount !== '0' && selectedAssetData.data?.decimals != null) {
        try {
          const isPrimaryLocal = (selectedAssetAddress || '').toLowerCase() === (primaryAssetAddress || '').toLowerCase();
          const { action: currentActionState } = isPrimaryLocal
            ? await depositInVault(parseUnits(amount, selectedAssetData.data.decimals).toString())
            : await depositInVaultFromToken(selectedAssetAddress, parseUnits(amount, selectedAssetData.data.decimals).toString());
          setTxAction(currentActionState);
        } catch {
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
    if (txHash) {
      return `See transaction on ${depositChainExplorerName}`;
    }

    if (isLoading) {
      if (txAction === 'approve') return 'Approving...';
      if (txAction === 'spoke-deposit') return 'Depositing via bridge...';
      if (txAction === 'deposit') return 'Depositing...';
      if (txAction === 'omni-deposit') return 'Depositing...';
      return 'Processing...';
    }

    if (!amount || amount === '0') return 'Enter an amount';

    if (isUsingSpoke) {
      if (txAction === null) return 'Checking availability...';
      if (txAction === 'approve') return `Approve ${effectiveSymbol} spend`;
      return `Deposit via ${networkConfigs[selectedDepositChainId]?.displayName || networkConfigs[selectedDepositChainId]?.name || 'Spoke'}`;
    }

    if (txAction === null || (!isOmniHub && !primaryAssetData.data)) {
      return 'Checking availability...';
    }

    if (txAction === 'approve') return 'Approve token spend';
    if (txAction === 'deposit') return 'Deposit into the vault';
    if (txAction === 'omni-deposit') return 'Deposit into the vault';

    return 'Deposit into the vault';
  }, [amount, primaryAssetData.data, txHash, txAction, isLoading, isUsingSpoke, selectedDepositChainId, effectiveSymbol, depositChainExplorerName, isOmniHub]);

  const preflightBlocked = isOmniHub && !isUsingSpoke && preflight && (preflight.paused || preflight.escrowMissing);

  // For the hub deposit path, the wallet must be on the hub chain (no auto-switch)
  const isHubChainMismatch = !isUsingSpoke && isOmniHub && wagmiChainId !== hubChainId;

  // Chain options for the selector: hub first, then each spoke
  const chainOptions = useMemo(() => {
    if (!isOmniHub) return [];
    const options: { chainId: number; label: string }[] = [
      {
        chainId: hubChainId,
        label: networkConfigs[hubChainId]?.displayName || networkConfigs[hubChainId]?.name || `Chain ${hubChainId}`,
      },
    ];
    for (const sv of spokeVaults ?? []) {
      options.push({
        chainId: sv.chainId,
        label: networkConfigs[sv.chainId]?.displayName || networkConfigs[sv.chainId]?.name || `Chain ${sv.chainId}`,
      });
    }
    return options;
  }, [isOmniHub, hubChainId, spokeVaults]);

  return (
    <BasicModal open={isOpen} setOpen={handleSetOpen} backdropBlur={isUsingSpoke}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Typography variant="h2">Deposit into the vault</Typography>
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
                    <TokenIcon symbol={effectiveSymbol || ''} sx={{ fontSize: '16px' }} />
                    <Typography variant="secondary12">{effectiveSymbol}</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Chain selector — shown for omni hub vaults with spoke chains */}
            {isOmniHub && chainOptions.length > 1 && !txHash && (
              <Box>
                <Typography variant="secondary12" sx={{ color: 'text.secondary', mb: 1 }}>
                  Deposit from
                </Typography>
                <Select
                  size="small"
                  fullWidth
                  value={selectedDepositChainId}
                  onChange={(e) => {
                    const newChainId = Number(e.target.value);
                    setSelectedDepositChainId(newChainId);
                    setAmount('');
                    setTxAction(null);
                    setEstimatedFee(null);
                    setTxError(null);
                  }}
                  sx={{ fontSize: '14px' }}
                >
                  {chainOptions.map((opt) => (
                    <MenuItem key={opt.chainId} value={opt.chainId}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {networkConfigs[opt.chainId]?.networkLogoPath && (
                          <img
                            src={networkConfigs[opt.chainId].networkLogoPath}
                            width={18}
                            height={18}
                            alt={opt.label}
                            style={{ borderRadius: '50%' }}
                          />
                        )}
                        {opt.label}
                        {opt.chainId === hubChainId && (
                          <Typography variant="secondary12" sx={{ color: 'text.secondary', ml: 0.5 }}>(Hub)</Typography>
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            )}

            {/* Spoke deposit info banner */}
            {isUsingSpoke && (
              <Alert severity="info" sx={{ py: 1 }}>
                Tokens are sent from {networkConfigs[selectedDepositChainId]?.displayName || 'the spoke chain'} directly to the vault on {networkConfigs[hubChainId]?.displayName || 'the hub'}. Shares arrive after cross-chain processing (~5 min).
              </Alert>
            )}

            {/* Preflight warnings (hub deposit only) */}
            {!isUsingSpoke && isOmniHub && preflight?.paused && (
              <Alert severity="error">
                This vault is currently paused. Deposits are temporarily disabled.
              </Alert>
            )}
            {!isUsingSpoke && isOmniHub && preflight?.escrowMissing && (
              <Alert severity="error">
                This vault&apos;s escrow is not configured. Deposits are disabled.
              </Alert>
            )}

            <AssetInput
              value={amount}
              onChange={handleChange}
              usdValue={amountInUsd.toString(10)}
              symbol={effectiveSymbol || ''}
              assets={isUsingSpoke
                // For spoke deposits, show only the underlying token (PYUSD, USDC, etc.)
                ? [{
                  address: spokeDepositInfo?.tokenAddress || '',
                  symbol: effectiveSymbol || '',
                  balance: spokeTokenBalance,
                  decimals: spokeTokenDecimals,
                } as Asset]
                : depositableAssets.map((a) => ({
                  address: a.address,
                  symbol: a.symbol || ((a.address || '').slice(0, 6) || 'TOKEN'),
                  balance: ((a.address || '').toLowerCase() === (selectedAssetAddress || '').toLowerCase())
                    ? walletBalance
                    : (assetBalances[(a.address || '').toLowerCase()] ?? '0'),
                  decimals: a.decimals,
                }) as Asset)
              }
              onSelect={(asset) => {
                if (!isUsingSpoke) {
                  setSelectedAssetAddress(asset.address || '');
                  setSelectedAssetSymbol(asset.symbol || ((asset.address || '').slice(0, 6) || 'TOKEN'));
                }
              }}
              maxValue={maxAmountToSupply}
              isMaxSelected={amount === maxAmountToSupply}
              balanceText={assetInputConfig.balanceText}
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

            {/* Chain switch alert and fee row */}
            {(isOmniHub || isUsingSpoke) && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Hub deposit: user must be on hub chain manually (no auto-switch for hub path) */}
                {!isUsingSpoke && wagmiChainId !== hubChainId && (
                  <Alert
                    severity="warning"
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={() => switchChain({ chainId: hubChainId })}
                      >
                        Switch network
                      </Button>
                    }
                  >
                    You must be on the vault&apos;s hub network to deposit.
                  </Alert>
                )}
                {/* Spoke deposit: wallet will be switched at tx time */}
                {isUsingSpoke && wagmiChainId !== selectedDepositChainId && (
                  <Alert severity="info" sx={{ py: 0.5 }}>
                    Your wallet will switch to {networkConfigs[selectedDepositChainId]?.displayName || 'the spoke chain'} to sign the transaction, then switch back automatically.
                  </Alert>
                )}
                {/* Bridge fee estimate */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="secondary14" color="text.secondary">
                    {isUsingSpoke ? 'LayerZero fee (est.)' : 'Bridge fee (est.)'}
                  </Typography>
                  {isFeeLoading ? (
                    <CircularProgress size={14} />
                  ) : estimatedFee ? (
                    <Typography variant="secondary14">
                      ~{parseFloat(estimatedFee).toFixed(6)}{' '}
                      {networkConfigs[isUsingSpoke ? selectedDepositChainId : hubChainId]?.baseAssetSymbol || 'ETH'}
                      {!isUsingSpoke && ' (excess refunded)'}
                    </Typography>
                  ) : (
                    <Typography variant="secondary14" color="text.secondary">
                      {isUsingSpoke && (!amount || parseFloat(amount) <= 0) ? 'Enter amount to estimate' : '—'}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {/* Cross-chain request status tracker — shown after hub deposit tx confirms */}
            {isOmniHub && !isUsingSpoke && txHash && (
              <Box sx={{ p: 2, bgcolor: 'background.surface', borderRadius: 1, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="secondary14">
                  {omniStatus === 'pending' && '⏳ Waiting for cross-chain accounting (~2 min)…'}
                  {omniStatus === 'fulfilled' && '⏳ Accounting resolved, finalising…'}
                  {omniStatus === 'finalized' && `✅ Complete — ${omniFinalizationResult && selectedVault?.overview?.decimals ? parseFloat(ethers.utils.formatUnits(omniFinalizationResult, selectedVault.overview.decimals)).toFixed(6) : '?'} shares minted`}
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

            {/* Spoke deposit: LZ scan link via tx hash after success */}
            {isUsingSpoke && txHash && (
              <Box sx={{ p: 2, bgcolor: 'background.surface', borderRadius: 1, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="secondary14">
                  ⏳ Tokens sent — shares will arrive on the hub after cross-chain processing (~5 min).
                </Typography>
                <Link
                  href={`https://layerzeroscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="secondary14"
                >
                  Track on LayerZero Scan ↗
                </Link>
              </Box>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant={txHash ? 'contained' : 'gradient'}
                disabled={
                  !amount ||
                  amount === '0' ||
                  isHubChainMismatch ||
                  !!preflightBlocked ||
                  (isUsingSpoke && isSpokeInfoLoading)
                }
                onClick={handleClick}
                size="large"
                sx={{ minHeight: '44px' }}
                data-cy="actionButton"
              >
                {(isLoading || (isUsingSpoke && isSpokeInfoLoading && !txHash)) && (
                  <CircularProgress color="inherit" size="16px" sx={{ mr: 2 }} />
                )}
                {buttonContent}
              </Button>
            </Box>
          </Box>
        </Collapse>
      </Box>
    </BasicModal>
  );
};
