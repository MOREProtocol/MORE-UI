import React, { useState, useEffect, useMemo } from 'react';
import {
  Typography,
  Alert,
  Box,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  Avatar,
  TextField,
  Button,
  Divider,
  Paper,
} from '@mui/material';
import { useAccount, useChainId, useSwitchChain, useWalletClient, useBalance, useReadContract } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { debounce } from 'lodash';
import { BridgeService, RelayToken, BridgeQuote } from '../services/BridgeService';
import { ChainIds } from '../utils/const';
import { ExternalTokenIcon } from './primitives/TokenIcon';
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
  const [success, setSuccess] = useState<string | null>(null);

  // Token lists and balances
  const [sourceTokens, setSourceTokens] = useState<RelayToken[]>([]);
  const [destinationTokens, setDestinationTokens] = useState<RelayToken[]>([]);
  const [sourceTokenBalance, setSourceTokenBalance] = useState('0');
  const [outputAmount, setOutputAmount] = useState('');

  const [estimatedFees, setEstimatedFees] = useState<{
    gasEstimate: string;
    bridgeFee: string;
    totalFeeETH: string;
    gasEstimateETH: string;
    bridgeFeeETH: string;
    totalFeeUSD?: string;
    gasEstimateUSD?: string;
    bridgeFeeUSD?: string;
    quote?: BridgeQuote;
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
      if (!debouncedAmount || parseFloat(debouncedAmount) <= 0 || !address || !selectedSourceToken || !selectedDestinationToken) {
        setEstimatedFees(null);
        setOutputAmount('');
        return;
      }

      try {
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

        setEstimatedFees(fees);

        // Calculate output amount from quote
        if (fees.quote?.details?.currencyOut) {
          const outputAmountFormatted = fees.quote.details.currencyOut.amountFormatted;
          setOutputAmount(outputAmountFormatted || '0');
        }

      } catch (err) {
        console.error('Fee estimation error:', err);
        setError('Failed to estimate fees: ' + (err as Error).message);
      } finally {
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
          `Successfully initiated bridge of ${amount} ${selectedSourceToken.symbol} to ${selectedDestinationToken.symbol} on Flow EVM! 
           ${result.txHash ? `TX: ${result.txHash.substring(0, 10)}...` : ''}
           ${result.requestId ? `Request ID: ${result.requestId}` : ''}`
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

  const handleMaxClick = () => {
    const maxAmount = sourceTokenBalance;
    setAmount(maxAmount);
    debouncedAmountChange(maxAmount);
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

  return (
    <Box sx={{
      maxWidth: 600,
      minWidth: 400,
      mx: 'auto',
      backgroundColor: 'background.surface',
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

        {/* Asset Input */}
        <Paper
          sx={{
            border: (theme) => `1px solid ${theme.palette.divider}`,
            borderRadius: '6px',
            overflow: 'hidden',
          }}
        >
          {/* Amount Input Row */}
          <Box sx={{ p: 3, pb: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="secondary14" color="text.secondary">
                Amount
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TextField
                placeholder="0.0"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                type="number"
                inputProps={{
                  step: selectedSourceToken?.symbol === 'ETH' ? '0.001' : '0.01',
                  min: '0',
                  style: { fontSize: '28px', fontWeight: 'bold', padding: 0 }
                }}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    border: 'none',
                    '& fieldset': { border: 'none' },
                    '&:hover fieldset': { border: 'none' },
                    '&.Mui-focused fieldset': { border: 'none' },
                  },
                }}
                variant="outlined"
              />

              {/* Token Selector */}
              {selectedSourceToken && (
                <FormControl variant="outlined" sx={{ minWidth: 140 }}>
                  <Select
                    value={selectedSourceToken.address}
                    onChange={(e) => {
                      const token = sourceTokens.find(t => t.address === e.target.value);
                      if (token) setSelectedSourceToken(token);
                    }}
                    sx={{
                      '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { border: 'none' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 'none' },
                    }}
                    renderValue={() => (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <ExternalTokenIcon
                          symbol={selectedSourceToken.symbol}
                          logoURI={selectedSourceToken.logoURI}
                          sx={{ width: 24, height: 24 }}
                        />
                        <Typography variant="main16" fontWeight={600}>
                          {selectedSourceToken.symbol}
                        </Typography>
                      </Box>
                    )}
                  >
                    {sourceTokens.map((token) => (
                      <MenuItem key={token.address} value={token.address}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                          <ExternalTokenIcon
                            symbol={token.symbol}
                            logoURI={token.logoURI}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="main14">{token.symbol}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {token.name}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          </Box>

          {/* Balance Row */}
          <Box sx={{ display: 'flex', alignItems: 'center', px: 3, py: 2 }}>
            <Box sx={{ flex: 1 }}>
              {/* USD Value placeholder */}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="secondary12" color="text.secondary">
                Balance{' '}
              </Typography>
              <FormattedNumber
                value={sourceTokenBalance}
                compact
                variant="secondary12"
                color="text.secondary"
                symbolsColor="text.disabled"
              />
              <Button
                size="small"
                sx={{ minWidth: 0, ml: 1, p: 0 }}
                onClick={handleMaxClick}
                disabled={isLoading || parseFloat(sourceTokenBalance) === 0}
              >
                Max
              </Button>
            </Box>
          </Box>
        </Paper>
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

        {/* Output Amount */}
        <Paper
          sx={{
            border: (theme) => `1px solid ${theme.palette.divider}`,
            borderRadius: '6px',
            overflow: 'hidden',
            opacity: 0.8,
          }}
        >
          {/* Amount Output Row */}
          <Box sx={{ p: 3, pb: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="secondary14" color="text.secondary">
                You will receive
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TextField
                placeholder="0.0"
                value={outputAmount}
                InputProps={{
                  readOnly: true,
                }}
                inputProps={{
                  style: { fontSize: '28px', fontWeight: 'bold', padding: 0 }
                }}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    border: 'none',
                    '& fieldset': { border: 'none' },
                    '&:hover fieldset': { border: 'none' },
                    '&.Mui-focused fieldset': { border: 'none' },
                  },
                  '& .MuiInputBase-input': {
                    color: 'text.secondary',
                  },
                }}
                variant="outlined"
              />

              {/* Token Selector */}
              {selectedDestinationToken && (
                <FormControl variant="outlined" sx={{ minWidth: 140 }}>
                  <Select
                    value={selectedDestinationToken.address}
                    onChange={(e) => {
                      const token = destinationTokens.find(t => t.address === e.target.value);
                      if (token) setSelectedDestinationToken(token);
                    }}
                    sx={{
                      '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { border: 'none' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 'none' },
                    }}
                    renderValue={() => (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <ExternalTokenIcon
                          symbol={selectedDestinationToken.symbol}
                          logoURI={selectedDestinationToken.logoURI}
                        />
                        <Typography variant="main16" fontWeight={600}>
                          {selectedDestinationToken.symbol}
                        </Typography>
                      </Box>
                    )}
                  >
                    {destinationTokens.map((token) => (
                      <MenuItem key={token.address} value={token.address}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                          <ExternalTokenIcon
                            symbol={token.symbol}
                            logoURI={token.logoURI}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="main14">{token.symbol}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {token.name}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          </Box>

          {/* Bottom Row */}
          <Box sx={{ display: 'flex', alignItems: 'center', px: 3, py: 2 }}>
            <Box sx={{ flex: 1 }}>
              {/* USD Value placeholder */}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Empty space to match layout */}
            </Box>
          </Box>
        </Paper>
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
                  <Typography variant="secondary14">
                    {(parseFloat(outputAmount) * 0.995).toFixed(6)} {selectedDestinationToken?.symbol}
                  </Typography>
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
                  5-15 minutes
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
                <Typography variant="caption">
                  {estimatedFees.gasEstimateETH} ETH
                  {estimatedFees.gasEstimateUSD && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      (${estimatedFees.gasEstimateUSD})
                    </Typography>
                  )}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Bridge Protocol Fee
                </Typography>
                <Typography variant="caption">
                  {estimatedFees.bridgeFeeETH} ETH
                  {estimatedFees.bridgeFeeUSD && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      (${estimatedFees.bridgeFeeUSD})
                    </Typography>
                  )}
                </Typography>
              </Box>

              <Divider sx={{ my: 1.5 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="secondary14" fontWeight={600}>
                  Total Fees
                </Typography>
                <Typography variant="secondary14" fontWeight={600}>
                  {estimatedFees.totalFeeETH} ETH
                  {estimatedFees.totalFeeUSD && (
                    <Typography component="span" variant="secondary14" color="text.secondary" sx={{ ml: 1 }}>
                      (${estimatedFees.totalFeeUSD})
                    </Typography>
                  )}
                </Typography>
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