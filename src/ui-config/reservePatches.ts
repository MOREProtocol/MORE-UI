import { unPrefixSymbol } from 'src/hooks/app-data-provider/useAppDataProvider';

/**
 * Maps onchain symbols to different symbols.
 * This is useful when you want to explode symbols via _ to render multiple symbols or when the symbol has a bridge prefix or suffix.
 */
export const SYMBOL_MAP: { [key: string]: string } = {
  BPTBALWETH: 'BPT_BAL_WETH',
};

/**
 * Maps (potentially altered via SYMBOL_MAP) symbols to a name
 * With the next version of uipooldataprovider https://github.com/aave/aave-v3-periphery/pull/89 this list can be greatly reduced/removed.
 */
export const SYMBOL_NAME_MAP: { [key: string]: string } = {
  FLOW: 'FLOW EVM',
};

export interface IconSymbolInterface {
  underlyingAsset: string;
  symbol: string;
  name?: string;
}

export interface IconMapInterface {
  iconSymbol: string;
  name?: string;
  symbol?: string;
}

export function fetchIconSymbolAndName({ underlyingAsset, symbol, name }: IconSymbolInterface) {
  const underlyingAssetMap: Record<string, IconMapInterface> = {
    '0xdd974d5c2e2928dea5f71b9825b8b646686bd200': {
      name: 'Kyber Legacy',
      symbol: 'KNCL',
      iconSymbol: 'KNCL',
    },
  };

  const lowerUnderlyingAsset = underlyingAsset.toLowerCase();
  if (underlyingAssetMap.hasOwnProperty(lowerUnderlyingAsset)) {
    return {
      symbol,
      ...underlyingAssetMap[lowerUnderlyingAsset],
    };
  }

  const unifiedSymbol = unPrefixSymbol((SYMBOL_MAP[symbol] || symbol).toUpperCase(), 'AMM');
  return {
    iconSymbol: unifiedSymbol,
    name: SYMBOL_NAME_MAP[unifiedSymbol.toUpperCase()] || name || unifiedSymbol,
    symbol,
  };
}
