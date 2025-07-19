// Minimal wallet client interface to avoid complex viem type constraints
interface MinimalWalletClient {
  sendTransaction: (params: {
    to: `0x${string}`;
    data: `0x${string}`;
    value?: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
    gas?: bigint;
  }) => Promise<`0x${string}`>;
}

// Relay API configuration
const RELAY_API_BASE = 'https://api.relay.link';

// Flow EVM destination tokens based on actual working addresses
export const FLOW_EVM_DESTINATION_TOKENS = {
  FLOW: {
    address: '0x0000000000000000000000000000000000000000', // Native FLOW
    symbol: 'FLOW',
    decimals: 18,
    name: 'FLOW',
    logoURI: '/icons/networks/flow.svg'
  },
  USDC: {
    address: '0xf1815bd50389c46847f0bda824ec8da914045d14', // Bridged USDC (Stargate) on Flow EVM
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin (Bridged)',
    logoURI: '/icons/tokens/usdc.svg'
  },
  USDF: {
    address: '0x2aabea2058b5ac2d339b163c6ab6f2b6d53aabed', // USDF from quote example
    symbol: 'USDF',
    decimals: 6,
    name: 'USD Flow',
    logoURI: '/icons/tokens/usdf.svg'
  }
};

export const ETHEREUM_SOURCE_TOKENS = [
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ether',
    decimals: 18,
    logoURI: '/icons/tokens/eth.svg',
    supportsBridging: true
  },
  {
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: '/icons/tokens/usdc.svg',
    supportsBridging: true
  },
  {
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoURI: '/icons/tokens/usdt.svg',
    supportsBridging: true
  },
  {
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    logoURI: '/icons/tokens/dai.svg',
    supportsBridging: true
  }
]

// Interface for Relay API token response
export interface RelayToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  supportsBridging?: boolean;
}

// Interface for Relay chains response
export interface RelayChain {
  id: number;
  name: string;
  displayName: string;
  tokens: RelayToken[];
  depositEnabled: boolean;
  tokenSupport: string;
  disabled: boolean;
}

export interface BridgeRequest {
  user: string;
  recipient: string;
  originChainId: number;
  destinationChainId: number;
  originCurrency: string;
  destinationCurrency: string;
  amount: string;
  tradeType: 'EXACT_INPUT' | 'EXACT_OUTPUT';
  referrer?: string;
  useExternalLiquidity?: boolean;
  slippageTolerance?: string;
}

export interface BridgeQuote {
  fees: {
    gas?: {
      currency: {
        chainId: number;
        address: string;
        symbol: string;
        name: string;
        decimals: number;
      };
      amount: string;
      amountFormatted: string;
      amountUsd: string;
      minimumAmount: string;
    };
    relayer?: {
      currency: {
        chainId: number;
        address: string;
        symbol: string;
        name: string;
        decimals: number;
      };
      amount: string;
      amountFormatted: string;
      amountUsd: string;
      minimumAmount: string;
    };
    relayerGas?: {
      currency: {
        chainId: number;
        address: string;
        symbol: string;
        name: string;
        decimals: number;
      };
      amount: string;
      amountFormatted: string;
      amountUsd: string;
      minimumAmount: string;
    };
    relayerService?: {
      currency: {
        chainId: number;
        address: string;
        symbol: string;
        name: string;
        decimals: number;
      };
      amount: string;
      amountFormatted: string;
      amountUsd: string;
      minimumAmount: string;
    };
    app?: {
      currency: {
        chainId: number;
        address: string;
        symbol: string;
        name: string;
        decimals: number;
      };
      amount: string;
      amountFormatted: string;
      amountUsd: string;
      minimumAmount: string;
    };
  };
  details: {
    operation: string;
    sender: string;
    recipient: string;
    currencyIn: {
      currency: {
        chainId: number;
        address: string;
        symbol: string;
        name: string;
        decimals: number;
      };
      amount: string;
      amountFormatted: string;
      amountUsd: string;
      minimumAmount: string;
    };
    currencyOut: {
      currency: {
        chainId: number;
        address: string;
        symbol: string;
        name: string;
        decimals: number;
      };
      amount: string;
      amountFormatted: string;
      amountUsd: string;
      minimumAmount: string;
    };
    totalImpact: {
      usd: string;
      percent: string;
    };
    swapImpact: {
      usd: string;
      percent: string;
    };
    rate: string;
    timeEstimate: number;
    userBalance: string;
  };
  steps: Array<{
    id: string;
    action: string;
    description: string;
    kind: string;
    requestId?: string;
    items: Array<{
      status: string;
      data: {
        from: string;
        to: string;
        data: string;
        value: string;
        maxFeePerGas?: string;
        maxPriorityFeePerGas?: string;
        chainId: number;
        gas?: string;
      };
      check?: {
        endpoint: string;
        method: string;
      };
    }>;
  }>;
}

export interface BridgeResult {
  success: boolean;
  txHash?: string;
  requestId?: string;
  error?: string;
  steps?: BridgeQuote['steps'];
  allTxHashes?: string[];
}

interface TransactionParams {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gas?: bigint;
}

export class BridgeService {
  async estimateFees(request: BridgeRequest): Promise<{
    totalFees: string;
    gasEstimate: string;
    bridgeFee: string;
    estimatedTime: string;
    totalFeeETH: string;
    gasEstimateETH: string;
    bridgeFeeETH: string;
    totalFeeUSD: string;
    gasEstimateUSD: string;
    bridgeFeeUSD: string;
    fees?: BridgeQuote['fees'];
    quote?: BridgeQuote;
  }> {
    try {
      const response = await fetch(`${RELAY_API_BASE}/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: request.user,
          recipient: request.recipient,
          originChainId: request.originChainId,
          destinationChainId: request.destinationChainId,
          originCurrency: request.originCurrency,
          destinationCurrency: request.destinationCurrency,
          amount: request.amount,
          tradeType: request.tradeType,
          referrer: request.referrer || 'MORE',
          useExternalLiquidity: request.useExternalLiquidity ?? false,
          slippageTolerance: request.slippageTolerance || '50', // 0.5%
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Quote failed: ${errorText}`);
      }

      const quote: BridgeQuote = await response.json();

      // Calculate fees from ALL fee categories
      const fees = quote.fees || {};
      const gasAmount = fees.gas?.amount || '0';
      const relayerAmount = fees.relayer?.amount || '0';
      const relayerGasAmount = fees.relayerGas?.amount || '0';
      const relayerServiceAmount = fees.relayerService?.amount || '0';
      const appAmount = fees.app?.amount || '0';

      // Calculate total fees in wei
      const totalFeesWei = (
        BigInt(gasAmount) +
        BigInt(relayerAmount) +
        BigInt(relayerGasAmount) +
        BigInt(relayerServiceAmount) +
        BigInt(appAmount)
      ).toString();

      // Use provided formatted ETH amounts when available
      const gasEstimateETH = fees.gas?.amountFormatted || (parseFloat(gasAmount) / 1e18).toFixed(6);
      const relayerETH = fees.relayer?.amountFormatted || (parseFloat(relayerAmount) / 1e18).toFixed(6);
      const relayerGasETH = fees.relayerGas?.amountFormatted || (parseFloat(relayerGasAmount) / 1e18).toFixed(6);
      const relayerServiceETH = fees.relayerService?.amountFormatted || (parseFloat(relayerServiceAmount) / 1e18).toFixed(6);
      const appETH = fees.app?.amountFormatted || (parseFloat(appAmount) / 1e18).toFixed(6);

      // Bridge fee is everything except gas
      const bridgeFeeETH = (
        parseFloat(relayerETH) +
        parseFloat(relayerGasETH) +
        parseFloat(relayerServiceETH) +
        parseFloat(appETH)
      ).toFixed(6);

      const totalFeeETH = (parseFloat(gasEstimateETH) + parseFloat(bridgeFeeETH)).toFixed(6);

      // Calculate USD totals from provided USD values
      const gasEstimateUSD = fees.gas?.amountUsd || '0';
      const relayerUSD = fees.relayer?.amountUsd || '0';
      const relayerGasUSD = fees.relayerGas?.amountUsd || '0';
      const relayerServiceUSD = fees.relayerService?.amountUsd || '0';
      const appUSD = fees.app?.amountUsd || '0';

      // Bridge fee USD is everything except gas
      const bridgeFeeUSD = (
        parseFloat(relayerUSD) +
        parseFloat(relayerGasUSD) +
        parseFloat(relayerServiceUSD) +
        parseFloat(appUSD)
      ).toFixed(6);

      const totalFeeUSD = (parseFloat(gasEstimateUSD) + parseFloat(bridgeFeeUSD)).toFixed(6);

      return {
        totalFees: totalFeesWei,
        gasEstimate: gasAmount,
        bridgeFee: (BigInt(relayerAmount) + BigInt(relayerGasAmount) + BigInt(relayerServiceAmount) + BigInt(appAmount)).toString(),
        estimatedTime: `${quote.details?.timeEstimate || 10} minutes`,
        totalFeeETH,
        gasEstimateETH,
        bridgeFeeETH,
        totalFeeUSD,
        gasEstimateUSD,
        bridgeFeeUSD,
        fees: quote.fees,
        quote,
      };

    } catch (error) {
      console.error('Quote estimation error:', error);
      throw new Error(`Quote failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async executeBridge(request: BridgeRequest, walletClient: MinimalWalletClient): Promise<BridgeResult> {
    try {
      // First get the quote with execution steps
      const response = await fetch(`${RELAY_API_BASE}/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: request.user,
          recipient: request.recipient,
          originChainId: request.originChainId,
          destinationChainId: request.destinationChainId,
          originCurrency: request.originCurrency,
          destinationCurrency: request.destinationCurrency,
          amount: request.amount,
          tradeType: request.tradeType,
          referrer: request.referrer || 'MORE-UI-Bridge',
          useExternalLiquidity: request.useExternalLiquidity ?? false,
          slippageTolerance: request.slippageTolerance || '50',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bridge execution failed: ${errorText}`);
      }

      const quote: BridgeQuote = await response.json();

      // Execute steps sequentially
      if (quote.steps && quote.steps.length > 0) {
        const executedTxHashes: string[] = [];
        let mainRequestId: string | undefined;

        for (let i = 0; i < quote.steps.length; i++) {
          const step = quote.steps[i];
          console.log(`Executing step ${i + 1}/${quote.steps.length}: ${step.action}`);

          if (step.items && step.items.length > 0) {
            const txData = step.items[0].data;

            try {
              // Send transaction using wallet client
              const txParams: TransactionParams = {
                to: txData.to as `0x${string}`,
                data: txData.data as `0x${string}`,
                value: BigInt(txData.value || '0'),
              };

              // Add optional gas parameters only if they exist
              if (txData.maxFeePerGas) {
                txParams.maxFeePerGas = BigInt(txData.maxFeePerGas);
              }
              if (txData.maxPriorityFeePerGas) {
                txParams.maxPriorityFeePerGas = BigInt(txData.maxPriorityFeePerGas);
              }
              if (txData.gas) {
                txParams.gas = BigInt(txData.gas);
              }

              const txHash = await walletClient.sendTransaction(txParams);

              console.log(`Step ${i + 1} transaction hash:`, txHash);
              executedTxHashes.push(txHash);

              // Track the main request ID (usually from the deposit step)
              if (step.id === 'deposit' && step.requestId) {
                mainRequestId = step.requestId;
              }

              // Note: Transaction confirmation will be handled by the calling code
              // as it requires access to the public client and wagmi config

              // For steps with status check endpoints, we could poll the status
              // This is useful for tracking cross-chain transaction progress
              if (step.items[0].check) {
                console.log(`Status check available for step ${i + 1}:`, step.items[0].check.endpoint);
              }

            } catch (txError) {
              console.error(`Step ${i + 1} transaction execution error:`, txError);
              return {
                success: false,
                error: `Step ${i + 1} (${step.action}) failed: ${txError instanceof Error ? txError.message : String(txError)}`,
                txHash: executedTxHashes[0], // Return first tx hash if any
              };
            }
          }
        }

        return {
          success: true,
          txHash: executedTxHashes[0], // Primary transaction hash
          requestId: mainRequestId,
          steps: quote.steps,
          allTxHashes: executedTxHashes,
        };
      }

      return {
        success: false,
        error: 'No executable steps returned from quote',
      };

    } catch (error) {
      console.error('Bridge execution error:', error);
      return {
        success: false,
        error: `Bridge failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // Get available source tokens for Ethereum (using fixed list)
  getAvailableSourceTokens(): RelayToken[] {
    return ETHEREUM_SOURCE_TOKENS;
  }

  // Get available destination tokens for Flow EVM
  getAvailableDestinationTokens(): RelayToken[] {
    return Object.values(FLOW_EVM_DESTINATION_TOKENS).map(token => ({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoURI,
      supportsBridging: true
    }));
  }

  // Find matching destination token for a source token
  findDestinationToken(sourceTokenSymbol: string): RelayToken | undefined {
    // Try exact symbol match first
    const exactMatch = Object.values(FLOW_EVM_DESTINATION_TOKENS).find(
      token => token.symbol === sourceTokenSymbol
    );

    if (exactMatch) {
      return {
        address: exactMatch.address,
        symbol: exactMatch.symbol,
        name: exactMatch.name,
        decimals: exactMatch.decimals,
        logoURI: exactMatch.logoURI,
        supportsBridging: true
      };
    }

    // Handle special cases
    if (sourceTokenSymbol === 'ETH') {
      return {
        address: FLOW_EVM_DESTINATION_TOKENS.FLOW.address,
        symbol: FLOW_EVM_DESTINATION_TOKENS.FLOW.symbol,
        name: FLOW_EVM_DESTINATION_TOKENS.FLOW.name,
        decimals: FLOW_EVM_DESTINATION_TOKENS.FLOW.decimals,
        logoURI: FLOW_EVM_DESTINATION_TOKENS.FLOW.logoURI,
        supportsBridging: true
      };
    }

    // Default to USDF for USD-like tokens
    if (sourceTokenSymbol.includes('USD') || sourceTokenSymbol === 'DAI') {
      return {
        address: FLOW_EVM_DESTINATION_TOKENS.USDF.address,
        symbol: FLOW_EVM_DESTINATION_TOKENS.USDF.symbol,
        name: FLOW_EVM_DESTINATION_TOKENS.USDF.name,
        decimals: FLOW_EVM_DESTINATION_TOKENS.USDF.decimals,
        logoURI: FLOW_EVM_DESTINATION_TOKENS.USDF.logoURI,
        supportsBridging: true
      };
    }

    return undefined;
  }
} 