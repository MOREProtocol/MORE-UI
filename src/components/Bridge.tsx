import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Typography,
  Alert,
  Box,
  CircularProgress,
  Avatar,
  Button,
  Divider,
  Paper,
} from '@mui/material';
import { useAccount, useChainId, useSwitchChain, useWalletClient, useBalance, useReadContract, usePublicClient } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { debounce } from 'lodash';
import { BridgeService, RelayToken, BridgeQuote } from '../services/BridgeService';
import { ChainIds } from '../utils/const';
import { AssetInput, Asset } from './transactions/AssetInput';
import { FormattedNumber } from './primitives/FormattedNumber';

export const BridgeContent: React.FC = () => {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();

  // Form state
  const [amount, setAmount] = useState('');
  const [debouncedAmount, setDebouncedAmount] = useState('');
  const [selectedSourceToken, setSelectedSourceToken] = useState<RelayToken | null>(null);
  const [selectedDestinationToken, setSelectedDestinationToken] = useState<RelayToken | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feeLoading, setFeeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<React.ReactNode | null>(null);

  // Token lists and balances
  const [sourceTokens, setSourceTokens] = useState<RelayToken[]>([]);
  const [destinationTokens, setDestinationTokens] = useState<RelayToken[]>([]);
  const [sourceTokenBalance, setSourceTokenBalance] = useState('0');
  const [outputAmount, setOutputAmount] = useState('');
  const requestIdRef = useRef(0);

  const [estimatedFees, setEstimatedFees] = useState<{
    estimatedTime: string;
    totalUsd: string;
    gasFee: { symbol: string; address: string; decimals: number; amountFormatted: string; amountUsd: string };
    protocolFeesByCurrency: Array<{ symbol: string; address: string; decimals: number; amountFormatted: string; amountUsd: string }>;
    quote?: BridgeQuote;
    fees?: BridgeQuote['fees'];
  } | null>(null);

  // Initialize bridge service
  const bridgeService = new BridgeService();

  // Debounced amount handler
  const debouncedAmountChange = useMemo(() => {
    return debounce((value: string) => {
      setDebouncedAmount(value);
    }, 1000);
  }, []);

  // Load available tokens
  useEffect(() => {
    const loadTokens = async () => {
      try {

        // Load source tokens from Ethereum
        const sourceTokensList = await bridgeService.getAvailableSourceTokens();
        setSourceTokens(sourceTokensList);

        // Load destination tokens for Flow EVM
        const destinationTokensList = bridgeService.getAvailableDestinationTokens();
        setDestinationTokens(destinationTokensList);

        // Set default selections
        if (sourceTokensList.length > 0 && !selectedSourceToken) {
          const ethToken = sourceTokensList.find(t => t.symbol === 'ETH') || sourceTokensList[0];
          setSelectedSourceToken(ethToken);

          // Auto-select matching destination token
          const matchingDestination = bridgeService.findDestinationToken(ethToken.symbol);
          if (matchingDestination) {
            setSelectedDestinationToken(matchingDestination);
          } else if (destinationTokensList.length > 0) {
            setSelectedDestinationToken(destinationTokensList[0]);
          }
        }

      } catch (error) {
        console.error('Error loading tokens:', error);
        setError('Failed to load available tokens');
      }
    };

    loadTokens();
  }, []);

  // Update destination token when source token changes
  useEffect(() => {
    if (selectedSourceToken) {
      const matchingDestination = bridgeService.findDestinationToken(selectedSourceToken.symbol);
      if (matchingDestination) {
        setSelectedDestinationToken(matchingDestination);
      }
    }
  }, [selectedSourceToken]);

  // Use wagmi hooks to fetch balances
  const { data: ethBalance } = useBalance({
    address: address,
    chainId: ChainIds.ethereum,
    query: {
      enabled: !!address && selectedSourceToken?.address === '0x0000000000000000000000000000000000000000',
    },
  });

  const { data: tokenBalance } = useReadContract({
    address: selectedSourceToken?.address as `0x${string}`,
    abi: [
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: 'balance', type: 'uint256' }],
      },
    ],
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ChainIds.ethereum,
    query: {
      enabled: !!address && !!selectedSourceToken && selectedSourceToken.address !== '0x0000000000000000000000000000000000000000',
    },
  });
  const publicClient = usePublicClient({ chainId: ChainIds.ethereum });
  const [allBalances, setAllBalances] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    const run = async () => {
      const map = new Map<string, string>();
      // Native ETH
      const native = sourceTokens.find((t) => t.address === '0x0000000000000000000000000000000000000000');
      if (native) {
        map.set(native.address.toLowerCase(), ethBalance ? formatUnits(ethBalance.value, native.decimals) : '0');
      }
      // ERC20s
      if (!address || !publicClient) {
        setAllBalances(map);
        return;
      }
      const abi = [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: 'balance', type: 'uint256' }],
        },
      ] as const;
      await Promise.all(
        sourceTokens
          .filter((t) => t.address !== '0x0000000000000000000000000000000000000000')
          .map(async (t) => {
            try {
              const value = (await publicClient.readContract({
                address: t.address as `0x${string}`,
                abi,
                functionName: 'balanceOf',
                args: [address as `0x${string}`],
              })) as bigint;
              map.set(t.address.toLowerCase(), formatUnits(value, t.decimals));
            } catch {
              map.set(t.address.toLowerCase(), '0');
            }
          })
      );
      setAllBalances(map);
    };
    if (sourceTokens.length > 0) run();
  }, [sourceTokens, address, publicClient, ethBalance]);

  // Update source token balance when balances change
  useEffect(() => {
    if (!selectedSourceToken) return;

    if (selectedSourceToken.address === '0x0000000000000000000000000000000000000000') {
      // Native ETH
      setSourceTokenBalance(ethBalance ? formatUnits(ethBalance.value, 18) : '0');
    } else {
      // ERC20 token
      setSourceTokenBalance(tokenBalance ? formatUnits(tokenBalance as bigint, selectedSourceToken.decimals) : '0');
    }
  }, [selectedSourceToken, ethBalance, tokenBalance]);

  // Estimate fees when debounced amount changes
  useEffect(() => {
    const estimateFees = async () => {
      const numericLike = debouncedAmount && /^\d*(?:\.\d+)?$/.test(debouncedAmount.trim());
      if (!debouncedAmount || debouncedAmount.trim() === '' || !numericLike || parseFloat(debouncedAmount) <= 0 || !address || !selectedSourceToken || !selectedDestinationToken) {
        // Invalidate any in-flight requests
        requestIdRef.current++;
        setEstimatedFees(null);
        setOutputAmount('');
        setError(null);
        return;
      }

      try {
        const myId = ++requestIdRef.current;
        setFeeLoading(true);
        setError(null);

        const fees = await bridgeService.estimateFees({
          user: address,
          recipient: address,
          originChainId: ChainIds.ethereum,
          destinationChainId: ChainIds.flowEVMMainnet,
          originCurrency: selectedSourceToken.address,
          destinationCurrency: selectedDestinationToken.address,
          amount: parseUnits(debouncedAmount, selectedSourceToken.decimals).toString(),
          tradeType: 'EXACT_INPUT',
        });
        // fees received

        if (requestIdRef.current !== myId) return; // stale
        setEstimatedFees(fees);

        // Calculate output amount from quote
        if (fees.quote?.details?.currencyOut) {
          const outputAmountFormatted = fees.quote.details.currencyOut.amountFormatted;
          if (requestIdRef.current !== myId) return; // stale
          setOutputAmount(outputAmountFormatted || '0');
        }

      } catch (err) {
        console.error('Fee estimation error:', err);
        // Only show error if this is the latest request
        setError('Failed to estimate fees: ' + (err as Error).message);
      } finally {
        // Ensure we clear loading state for the latest request only
        setFeeLoading(false);
      }
    };

    estimateFees();
  }, [debouncedAmount, address, selectedSourceToken, selectedDestinationToken]);

  const validateInputs = (): boolean => {
    if (!address) {
      setError('Please connect your wallet');
      return false;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return false;
    }
    if (!selectedSourceToken) {
      setError('Please select a source token');
      return false;
    }
    if (!selectedDestinationToken) {
      setError('Please select a destination token');
      return false;
    }
    if (parseFloat(amount) > parseFloat(sourceTokenBalance)) {
      setError('Insufficient balance');
      return false;
    }
    return true;
  };

  const executeBridge = async () => {
    if (!validateInputs() || !address || !selectedSourceToken || !selectedDestinationToken) return;

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      // Switch to Ethereum if not already
      if (chainId !== ChainIds.ethereum) {
        await switchChain?.({ chainId: ChainIds.ethereum });
        return;
      }

      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      const result = await bridgeService.executeBridge({
        user: address,
        recipient: address,
        originChainId: ChainIds.ethereum,
        destinationChainId: ChainIds.flowEVMMainnet,
        originCurrency: selectedSourceToken.address,
        destinationCurrency: selectedDestinationToken.address,
        amount: parseUnits(amount, selectedSourceToken.decimals).toString(),
        tradeType: 'EXACT_INPUT',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }, walletClient as any);

      if (result.success) {
        setSuccess(
          <Box>
            <Typography variant="main14" sx={{ display: 'block' }}>
              Successfully initiated bridge of {amount} {selectedSourceToken.symbol} to {selectedDestinationToken.symbol} on Flow EVM!
            </Typography>
            {result.txHash && (
              <Typography variant="caption" sx={{ display: 'block' }}>
                TX: <a href={`https://relay.link/transaction/${result.txHash}`} target="_blank" rel="noreferrer">{result.txHash.substring(0, 10)}...</a>
              </Typography>
            )}
            {result.requestId && (
              <Typography variant="caption" sx={{ display: 'block' }}>
                Request ID: {result.requestId}
              </Typography>
            )}
          </Box>
        );
        // Clear form
        setAmount('');
        setDebouncedAmount('');
        setEstimatedFees(null);
        setOutputAmount('');
      } else {
        setError(result.error || 'Bridge execution failed');
      }
    } catch (err) {
      setError('Bridge execution failed: ' + (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    debouncedAmountChange(value);
    setError(null);
  };


  const handleReset = () => {
    setAmount('');
    setDebouncedAmount('');
    setError(null);
    setSuccess(null);
    setEstimatedFees(null);
    setOutputAmount('');
  };

  // Display helpers for fees (new model)
  const gasSymbol = estimatedFees?.gasFee?.symbol || 'ETH';
  const protocolFeeList = estimatedFees?.protocolFeesByCurrency || [];
  const estimatedTime = estimatedFees?.estimatedTime || '—';

  // Minimum received from quote (fallback to 0.5% if not available)
  const minimumReceived = useMemo(() => {
    const minStr = estimatedFees?.quote?.details?.currencyOut?.minimumAmount;
    const decimals = estimatedFees?.quote?.details?.currencyOut?.currency?.decimals ?? selectedDestinationToken?.decimals ?? 18;
    if (minStr) {
      try {
        return formatUnits(BigInt(minStr), decimals);
      } catch {
        return undefined;
      }
    }
    if (outputAmount) {
      return (parseFloat(outputAmount) * 0.995).toFixed(6);
    }
    return undefined;
  }, [estimatedFees, selectedDestinationToken, outputAmount]);

  return (
    <Box sx={{
      maxWidth: 600,
      minWidth: 400,
      mx: 'auto',
      backgroundColor: 'background.paper',
      borderRadius: 2,
      padding: '24px',
      boxShadow: '0px 2px 1px rgba(0, 0, 0, 0.05),0px 0px 1px rgba(0, 0, 0, 0.25)',
    }}>
      {/* Title */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ mb: 1 }}>
          Bridge Assets to Flow EVM
        </Typography>
        <Typography variant="description" color="text.secondary">
          Transfer tokens from Ethereum to Flow EVM network using Relay Bridge
        </Typography>
      </Box>

      {/* Network Status Check */}
      {address && chainId !== ChainIds.ethereum && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="main14">
            Wrong Network:{' '}
            <Typography
              component="span"
              variant="main14"
              onClick={() => switchChain?.({ chainId: ChainIds.ethereum })}
              sx={{
                textDecoration: 'underline',
                cursor: 'pointer',
                '&:hover': {
                  color: 'primary.dark',
                },
              }}
            >
              Please switch to Ethereum
            </Typography>
            {' '}to bridge assets
          </Typography>
        </Alert>
      )}

      {!address && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="main14">
            Please connect your wallet to start bridging assets
          </Typography>
        </Alert>
      )}

      {/* Ethereum Source Section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar
            src="/icons/networks/ethereum.svg"
            sx={{ width: 24, height: 24 }}
          />
          <Typography variant="main16" fontWeight={600}>
            From Ethereum Mainnet
          </Typography>
        </Box>

        {sourceTokens.length > 0 && (
          <AssetInput
            value={amount}
            onChange={(val) => {
              if (val === '-1') {
                const maxAmount = sourceTokenBalance;
                setAmount(maxAmount);
                debouncedAmountChange(maxAmount);
                setError(null);
                return;
              }
              handleAmountChange(val);
            }}
            usdValue={undefined}
            symbol={selectedSourceToken?.symbol || sourceTokens[0]?.symbol || ''}
            assets={sourceTokens.map((t) => ({
              address: t.address,
              symbol: t.symbol,
              balance: allBalances.get((t.address || '').toLowerCase()) || '0',
              decimals: t.decimals,
            }) as Asset)}
            onSelect={(asset) => {
              const token = sourceTokens.find((t) => t.symbol === asset.symbol);
              if (token) setSelectedSourceToken(token);
            }}
            balanceText={'Balance'}
            maxValue={sourceTokenBalance}
            isMaxSelected={amount === sourceTokenBalance}
            inputTitle="Amount"
          />
        )}
      </Box>

      {/* Separator */}
      <Divider sx={{ my: 3 }} />

      {/* Flow EVM Destination Section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar
            src='/icons/networks/flow.svg'
            sx={{ width: 24, height: 24 }}
          />
          <Typography variant="main16" fontWeight={600}>
            To Flow EVM Mainnet
          </Typography>
        </Box>

        {destinationTokens.length > 0 && (
          <AssetInput
            value={outputAmount}
            onChange={undefined}
            usdValue={undefined}
            disableInput
            symbol={selectedDestinationToken?.symbol || destinationTokens[0]?.symbol || ''}
            assets={destinationTokens.map((t) => ({
              address: t.address,
              symbol: t.symbol,
              decimals: t.decimals,
            }) as Asset)}
            onSelect={(asset) => {
              const token = destinationTokens.find((t) => t.symbol === asset.symbol);
              if (token) setSelectedDestinationToken(token);
            }}
            inputTitle="You will receive"
          />
        )}
      </Box>

      {/* Quote and Fees Section */}
      {(feeLoading || estimatedFees) && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="main14" fontWeight={600} sx={{ mb: 2 }}>
            Quote & Fees
          </Typography>

          {feeLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 5, px: 3, bgcolor: 'background.surface', borderRadius: '6px' }}>
              <CircularProgress size={16} />
              <Typography variant="secondary12" color="text.secondary">
                Getting best quote...
              </Typography>
            </Box>
          ) : estimatedFees && (
            <Paper sx={{ p: 3, bgcolor: 'background.surface', border: '1px solid', borderColor: 'divider' }}>
              {/* Exchange Rate */}
              {selectedSourceToken && selectedDestinationToken && amount && outputAmount && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="secondary14" color="text.secondary">
                    Exchange Rate
                  </Typography>
                  <Typography variant="secondary14">
                    1 {selectedSourceToken.symbol} = {(parseFloat(outputAmount) / parseFloat(amount)).toFixed(6)} {selectedDestinationToken.symbol}
                  </Typography>
                </Box>
              )}

              {/* Slippage Tolerance */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="secondary14" color="text.secondary">
                  Slippage Tolerance
                </Typography>
                <Typography variant="secondary14">
                  0.5%
                </Typography>
              </Box>

              {/* Minimum Received */}
              {outputAmount && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="secondary14" color="text.secondary">
                    Minimum Received
                  </Typography>
                  <Box sx={{ typography: 'secondary14' }}>
                    {minimumReceived ? (
                      <FormattedNumber value={minimumReceived} symbol={selectedDestinationToken?.symbol} variant="secondary14" />
                    ) : (
                      '—'
                    )}
                  </Box>
                </Box>
              )}

              {/* Bridge Route */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="secondary14" color="text.secondary">
                  Bridge Route
                </Typography>
                <Typography variant="secondary14">
                  Relay Protocol
                </Typography>
              </Box>

              {/* Estimated Time */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="secondary14" color="text.secondary">
                  Estimated Time
                </Typography>
                <Typography variant="secondary14">
                  {estimatedTime}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Fee Breakdown */}
              <Typography variant="secondary14" fontWeight={600} color="text.secondary" sx={{ mb: 1.5 }}>
                Fee Breakdown
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Network Gas Fee
                </Typography>
                <Box sx={{ textAlign: 'right', gap: 3 }}>
                  <FormattedNumber value={estimatedFees.gasFee.amountFormatted} symbol={gasSymbol} variant="caption" sx={{ mr: 1 }} />
                  {estimatedFees.gasFee.amountUsd && (
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0 }}>
                      <Typography variant="caption">
                        (
                      </Typography>
                      <FormattedNumber value={estimatedFees.gasFee.amountUsd} symbol="USD" variant="caption" />
                      <Typography variant="caption">
                        )
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Bridge Protocol Fees (one per currency) */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Bridge Protocol Fees
                </Typography>
                <Box sx={{ textAlign: 'right', gap: 3 }}>
                  {protocolFeeList.length === 0 && (
                    <Typography variant="caption">—</Typography>
                  )}
                  {protocolFeeList.map((f, idx) => (
                    <Box key={`${f.symbol}-${idx}`} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0 }}>
                      <FormattedNumber value={f.amountFormatted} symbol={f.symbol} variant="caption" sx={{ mr: 1 }} />
                      {f.amountUsd && (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0 }}>
                          <Typography variant="caption">
                            (
                          </Typography>
                          <FormattedNumber value={f.amountUsd} symbol="USD" variant="caption" />
                          <Typography variant="caption">
                            )
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>

              <Divider sx={{ my: 1.5 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="main14" color="text.secondary">
                  Total Fees
                </Typography>
                <FormattedNumber value={estimatedFees?.totalUsd || '0'} symbol="USD" variant="secondary14" />
              </Box>

              {/* Price Impact Warning */}
              {amount && outputAmount && selectedSourceToken && (
                (() => {
                  const priceImpact = ((1 - (parseFloat(outputAmount) / parseFloat(amount))) * 100);
                  if (priceImpact > 1) {
                    return (
                      <Alert severity="warning" sx={{ mt: 2, p: 1 }}>
                        <Typography variant="caption">
                          High price impact: {priceImpact.toFixed(2)}%
                        </Typography>
                      </Alert>
                    );
                  }
                  return null;
                })()
              )}
            </Paper>
          )}
        </Box>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Success Display */}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={handleReset}
          disabled={isLoading}
          sx={{ py: 1.5 }}
        >
          Reset
        </Button>
        <Button
          variant="gradient"
          fullWidth
          size="large"
          onClick={executeBridge}
          disabled={
            isLoading ||
            !amount ||
            !selectedSourceToken ||
            !selectedDestinationToken ||
            parseFloat(amount) <= 0 ||
            parseFloat(amount) > parseFloat(sourceTokenBalance)
          }
          sx={{ py: 1.5 }}
        >
          {isLoading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            `Bridge ${selectedSourceToken?.symbol || 'Assets'}`
          )}
        </Button>
      </Box>

      {/* Footer Info */}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
        ⚠️ Powered by Relay Protocol. Always test with small amounts first.
      </Typography>
    </Box>
  );
};

export default BridgeContent; 