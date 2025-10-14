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
    estimatedSeconds: number;
    estimatedTime: string;
    totalUsd: string;
    gasFee: { symbol: string; address: string; decimals: number; amountFormatted: string; amountUsd: string };
    protocolFeesByCurrency: Array<{ symbol: string; address: string; decimals: number; amountFormatted: string; amountUsd: string }>;
    fees?: BridgeQuote['fees'];
    quote?: BridgeQuote;
  }> {
    try {
      // Skip network call if amount is empty/zero/invalid
      const amountIsValid = (() => {
        try {
          const n = BigInt(request.amount || '0');
          return n > BigInt(0);
        } catch {
          return false;
        }
      })();
      if (!amountIsValid) {
        return {
          estimatedSeconds: 0,
          estimatedTime: '—',
          totalUsd: '0',
          gasFee: {
            symbol: 'ETH',
            address: '0x0000000000000000000000000000000000000000',
            decimals: 18,
            amountFormatted: '0',
            amountUsd: '0',
          },
          protocolFeesByCurrency: [],
          fees: undefined,
          quote: undefined,
        };
      }

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
          slippageTolerance: request.slippageTolerance || '50',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Quote failed: ${errorText}`);
      }

      const quote: BridgeQuote = await response.json();

      const fees = quote.fees || {};

      // Time estimate handling: API returns seconds
      const timeSecondsRaw = Number(quote.details?.timeEstimate ?? 0);
      const estimatedSeconds = Number.isFinite(timeSecondsRaw) ? Math.max(0, Math.trunc(timeSecondsRaw)) : 0;
      const estimatedTime = (() => {
        if (!estimatedSeconds) return '—';
        if (estimatedSeconds < 60) return `${estimatedSeconds}s`;
        const minutes = Math.round(estimatedSeconds / 60);
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const remMin = minutes % 60;
        return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`;
      })();

      // Gas fee (native currency of origin chain)
      const gasFee = {
        symbol: fees.gas?.currency?.symbol || 'ETH',
        address: fees.gas?.currency?.address || '0x0000000000000000000000000000000000000000',
        decimals: fees.gas?.currency?.decimals ?? 18,
        amountFormatted: fees.gas?.amountFormatted || '0',
        amountUsd: fees.gas?.amountUsd || '0',
      };

      // Group protocol fees (non-gas) by currency
      type FeeItem = { currency?: { symbol?: string; address?: string; decimals?: number }; amountFormatted?: string; amountUsd?: string };
      const rawProtocol: FeeItem[] = [fees.relayer, fees.relayerGas, fees.relayerService, fees.app].filter(Boolean) as FeeItem[];
      const byCurrencyMap = new Map<string, { symbol: string; address: string; decimals: number; amount: number; amountUsd: number }>();
      for (const f of rawProtocol) {
        const symbol = f.currency?.symbol || 'UNKNOWN';
        const address = f.currency?.address || '';
        const decimals = f.currency?.decimals ?? 18;
        const amount = parseFloat(f.amountFormatted || '0');
        const amountUsd = parseFloat(f.amountUsd || '0');
        const key = `${symbol}:${address}:${decimals}`;
        const prev = byCurrencyMap.get(key) || { symbol, address, decimals, amount: 0, amountUsd: 0 };
        prev.amount += isFinite(amount) ? amount : 0;
        prev.amountUsd += isFinite(amountUsd) ? amountUsd : 0;
        byCurrencyMap.set(key, prev);
      }
      const protocolFeesByCurrency = Array.from(byCurrencyMap.values()).map((v) => ({
        symbol: v.symbol,
        address: v.address,
        decimals: v.decimals,
        amountFormatted: v.amount.toFixed(6),
        amountUsd: v.amountUsd.toFixed(6),
      }));

      // Total USD = gas USD + sum(protocol USD)
      const totalUsd = (
        parseFloat(gasFee.amountUsd || '0') +
        protocolFeesByCurrency.reduce((acc, p) => acc + parseFloat(p.amountUsd || '0'), 0)
      ).toFixed(6);

      return {
        estimatedSeconds,
        estimatedTime,
        totalUsd,
        gasFee,
        protocolFeesByCurrency,
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