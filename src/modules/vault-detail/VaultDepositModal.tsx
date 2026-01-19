import { Box, Button, CircularProgress, Typography, Checkbox, FormControlLabel, Collapse, Tooltip } from '@mui/material';
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
import { roundToTokenDecimals } from 'src/utils/utils';
import { useWeb3Context } from 'src/libs/hooks/useWeb3Context';
import { useBalance } from 'wagmi';

interface VaultDepositModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  whitelistAmount?: string;
}

export const VaultDepositModal: React.FC<VaultDepositModalProps> = ({ isOpen, setIsOpen, whitelistAmount }) => {
  const { signer, selectedVaultId, depositInVault, depositInVaultFromToken, accountAddress, enhanceTransactionWithGas } = useVault();
  const vaultData = useVaultData(selectedVaultId);
  const selectedVault = vaultData?.data;
  const userVaultData = useUserVaultsData(accountAddress, [selectedVaultId]);
  const refreshUserVaultData = userVaultData?.[0]?.refetch;
  const [currentNetworkConfig] = useRootStore((state) => [
    state.currentNetworkConfig,
  ]);
  const { addERC20Token } = useWeb3Context();

  // Use the new asset data hook instead of reserves lookup
  // Primary vault asset (used for actual deposit flow)
  const primaryAssetAddress = selectedVault?.overview?.asset?.address || '';
  const primaryAssetData = useAssetData(primaryAssetAddress || '');

  // Depositable assets from vault
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

  // Selected asset for input display/balance
  const [selectedAssetAddress, setSelectedAssetAddress] = useState<string>(depositableAssets?.[0]?.address || primaryAssetAddress);
  const [selectedAssetSymbol, setSelectedAssetSymbol] = useState<string>(
    (depositableAssets?.[0]?.symbol || '') || ''
  );
  const selectedAssetData = useAssetData(selectedAssetAddress || '');

  // Wallet balances for all depositable assets via shared hook (uses public RPC with backup rotation)
  const depositableBalancesQuery = useDepositableAssetsBalances(selectedVaultId, accountAddress);

  // Use wagmi's useBalance hook for wallet balance (wallet/provider-native).
  const { data: walletBalanceData } = useBalance({
    address: accountAddress as `0x${string}`,
    token: (selectedAssetAddress || primaryAssetAddress) as `0x${string}`,
  });

  const assetBalances = depositableBalancesQuery.balances;

  // Prefer the wallet's own provider balance when available,
  // but fall back to our JSON-RPC-based balance if wagmi cannot fetch.
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

  const amountInUsd = new BigNumber(amount).multipliedBy(selectedAssetData.data?.price || 0);

  // Check if user has vault tokens
  const userVaultBalance = userVaultData?.[0]?.data?.maxWithdraw?.toString() || '0';
  const hasVaultTokens = new BigNumber(userVaultBalance).isGreaterThan(0);

  // Handle adding vault token to wallet when curator icon is clicked
  const handleCuratorIconClick = async () => {
    if (!selectedVaultId || !selectedVault || !signer || (!txHash && !hasVaultTokens)) return;

    setAddTokenLoading(true);
    try {
      // Get the actual ERC20 symbol from the vault contract
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

  // Calculate max amount considering both wallet balance and whitelist limits
  const maxAmountToSupply = useMemo(() => {
    if (!selectedAssetData.data?.decimals) return '0';

    // Start with wallet balance
    let effectiveMaxAmount = walletBalance;

    // Apply whitelist limit if provided
    if (whitelistAmount && whitelistAmount !== '0') {
      // Convert whitelist amount from wei to readable format
      const whitelistAmountFormatted = roundToTokenDecimals(
        new BigNumber(whitelistAmount)
          .dividedBy(new BigNumber(10).pow(selectedAssetData.data.decimals))
          .toString(),
        selectedAssetData.data.decimals
      );

      // Take the minimum between wallet balance and whitelist amount
      effectiveMaxAmount = new BigNumber(walletBalance).isLessThan(whitelistAmountFormatted)
        ? walletBalance
        : whitelistAmountFormatted;
    }

    // Return effective max amount (protocol limits don't apply to non-Flow networks)
    return effectiveMaxAmount || '0';
  }, [walletBalance, whitelistAmount, selectedAssetData.data]);

  // Determine which balance and text to show in AssetInput
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

  // Effect to reset state when modal is closed
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
      if (amount && amount !== '0' && selectedAssetData.data?.decimals != null) {
        try {
          const isPrimary = (selectedAssetAddress || '').toLowerCase() === (primaryAssetAddress || '').toLowerCase();
          const { action } = isPrimary
            ? await depositInVault(parseUnits(amount, selectedAssetData.data.decimals).toString())
            : await depositInVaultFromToken(selectedAssetAddress, parseUnits(amount, selectedAssetData.data.decimals).toString());
          setTxAction(action);
        } catch (error) {
          console.error("Error updating button action state:", error);
          setTxAction(null);
        }
      } else {
        setTxAction(null);
      }
    };
    updateButtonActionState();
  }, [amount, selectedAssetData.data?.decimals, selectedAssetAddress, primaryAssetAddress, txHash, depositInVault, depositInVaultFromToken]);

  const handleChange = (value: string) => {
    // Clear any previous errors when user changes amount
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
      window.open(`${currentNetworkConfig.explorerLinkBuilder({ tx: txHash })}`, '_blank');
      return;
    }

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
    setTxError(null); // Clear any previous errors

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

          // Refresh user vault data after successful deposit
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
    if (txHash) {
      return `See transaction on ${currentNetworkConfig.explorerName}`;
    }

    if (isLoading) {
      if (txAction === 'approve') return 'Approving...';
      if (txAction === 'deposit') return 'Depositing...';
      return 'Processing...';
    }

    if (!amount || amount === '0') return 'Enter an amount';

    if (!primaryAssetData.data || txAction === null) {
      return 'Checking availability...';
    }

    if (txAction === 'approve') {
      return 'Approve token spend';
    }
    if (txAction === 'deposit') {
      return 'Deposit into the vault';
    }

    return 'Deposit into the vault';
  }, [amount, primaryAssetData.data, txHash, txAction, isLoading, currentNetworkConfig.explorerName]);

  // Can deposit from any selected asset via multi-asset deposit path

  return (
    <BasicModal open={isOpen} setOpen={setIsOpen}>
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
                    <TokenIcon symbol={selectedAssetData.data?.symbol || ''} sx={{ fontSize: '16px' }} />
                    <Typography variant="secondary12">{selectedAssetData.data?.symbol}</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
            <AssetInput
              value={amount}
              onChange={handleChange}
              usdValue={amountInUsd.toString(10)}
              symbol={selectedAssetSymbol || ''}
              assets={depositableAssets.map((a) => ({
                address: a.address,
                symbol: a.symbol || ((a.address || '').slice(0, 6) || 'TOKEN'),
                balance: ((a.address || '').toLowerCase() === (selectedAssetAddress || '').toLowerCase())
                  ? walletBalance
                  : (assetBalances[(a.address || '').toLowerCase()] ?? '0'),
                decimals: a.decimals,
              }) as Asset)}
              onSelect={(asset) => {
                setSelectedAssetAddress(asset.address || '');
                setSelectedAssetSymbol(asset.symbol || ((asset.address || '').slice(0, 6) || 'TOKEN'));
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

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant={txHash ? 'contained' : 'gradient'}
                disabled={!amount || amount === '0'}
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
