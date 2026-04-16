import { useEffect, useState } from 'react';

/**
 * Pyth Hermes price feed IDs for common DeFi tokens.
 * Source: https://pyth.network/developers/price-feed-ids
 * Verified via https://hermes.pyth.network/v2/price_feeds?query=<SYMBOL>
 */
const PYTH_FEED_IDS: Record<string, string> = {
  // Stablecoins
  USDC: '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  'USDC.E': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  USDT: '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
  'USDT.E': '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
  DAI: '0xb0948a5e5313200c632b51bb5ca32f6de0d36e9950a942d19751e6f20c30bc0b',
  'DAI.E': '0xb0948a5e5313200c632b51bb5ca32f6de0d36e9950a942d19751e6f20c30bc0b',
  USDS: '0x77f0971af11cc8bac224917275c1bf55f2319ed5c654a1ca955c82fa2d297ea1',
  FRAX: '0x735f591e4fed988cd38df74d8fcedecf2fe8d9111664e0fd500db9aa78b316b1',
  // Major tokens
  ETH: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  WETH: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  BTC: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  WBTC: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  CBBTC: '0x2817d7bfe5c64b8ea956e9a26f573ef64e72e4d7891f2d6af9bcc93f7aff9a97',
  // Flow ecosystem
  FLOW: '0x2fb245b9a84554a0f15aa123cbb5f64cd263b59e9a87d80148cbffab50c69f30',
  WFLOW: '0x2fb245b9a84554a0f15aa123cbb5f64cd263b59e9a87d80148cbffab50c69f30',
  // Liquid staking
  WSTETH: '0x6df640f3b8963d8f8358f791f352b8364513f6ab1cca5ed3f1f7b5448980e784',
  STETH: '0xf490b178fa6efb7042e7b1762e8e58032f990137f1b1a0ea1bcc654ceae44e31',
  CBETH: '0x15ecddd26d49e1a8f1de9376ebebc03916ede873447c1255d2d5891b92ce5717',
  RETH: '0xa0255134973f4fdf2f8f7f268ebc2fb12b26df7f68f4fc3aa8aa5bbbd0a5a55b',
  // DeFi blue chips
  AAVE: '0x2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445',
  LINK: '0x8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221',
  UNI: '0x78d185a741d07edb3412b09008b7c5cfb9bbbd7d568bf00ba737b456ba171501',
  MKR: '0x9375299e31c0deb9c6bc378e6329aab44cb48ec655552a70d4b9050346a30378',
  CRV: '0xa19d04ac696c7a6616d291c7e5d1377cc8be437c327b75adb5dc1bad745fcae8',
  COMP: '0x4a8e42861cabc5ecb50996f92e7cfa2bce3fd0a2423b0c44c9b423fb2bd25478',
};

const HERMES_URL = 'https://hermes.pyth.network/v2/updates/price/latest';

// Module-level cache shared across all hook instances (refreshed every 60s)
let priceCache: Record<string, number> = {};
let lastFetchTime = 0;
const CACHE_TTL = 60_000;

interface PythPriceResult {
  prices: Record<string, number>;
  isLoading: boolean;
}

/**
 * Fetches USD prices from Pyth Hermes API for a list of token symbols.
 * Results are cached for 60s and shared across components.
 *
 * @param symbols - Array of token symbols (e.g. ['USDC', 'WETH', 'WBTC'])
 * @returns { prices: { USDC: 1.0, WETH: 2268.34, ... }, isLoading }
 */
export function usePythPrices(symbols: string[]): PythPriceResult {
  const [prices, setPrices] = useState<Record<string, number>>(priceCache);
  const [isLoading, setIsLoading] = useState(false);

  // Stable key to avoid re-fetching on every render
  const symbolsKey = symbols
    .map((s) => s.toUpperCase())
    .sort()
    .join(',');

  useEffect(() => {
    if (!symbolsKey) return;

    const normalizedSymbols = symbolsKey.split(',');

    // Return cached prices if still fresh
    const now = Date.now();
    if (now - lastFetchTime < CACHE_TTL) {
      const allCached = normalizedSymbols.every((s) => s in priceCache);
      if (allCached) {
        setPrices({ ...priceCache });
        return;
      }
    }

    // Build feedId → symbols[] map (deduplicates shared feeds like ETH/WETH)
    const feedMap: Record<string, string[]> = {};
    for (const sym of normalizedSymbols) {
      const feedId = PYTH_FEED_IDS[sym];
      if (!feedId) continue;
      if (!feedMap[feedId]) feedMap[feedId] = [];
      feedMap[feedId].push(sym);
    }

    const feedIds = Object.keys(feedMap);
    if (feedIds.length === 0) return;

    let cancelled = false;
    setIsLoading(true);

    const params = feedIds.map((id) => `ids[]=${id}`).join('&');
    fetch(`${HERMES_URL}?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const newPrices: Record<string, number> = { ...priceCache };

        if (data.parsed && Array.isArray(data.parsed)) {
          for (const entry of data.parsed) {
            const id = '0x' + entry.id;
            const price = entry.price;
            if (!price) continue;
            const usdPrice = Number(price.price) * Math.pow(10, price.expo);
            const syms = feedMap[id];
            if (syms) {
              for (const sym of syms) {
                newPrices[sym] = usdPrice;
              }
            }
          }
        }

        priceCache = newPrices;
        lastFetchTime = Date.now();
        setPrices(newPrices);
      })
      .catch(() => {
        // Silently fail — prices stay at cached values or 0
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [symbolsKey]);

  return { prices, isLoading };
}

/**
 * Get the USD price for a single symbol from the Pyth price map.
 * Returns 0 if not available.
 */
export function getPythPrice(prices: Record<string, number>, symbol: string): number {
  return prices[symbol.toUpperCase()] ?? 0;
}
