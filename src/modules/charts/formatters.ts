import { compactNumber } from 'src/components/primitives/FormattedNumber';

// Percent formatter with sensible precision based on magnitude
export const formatPercent = (value: number): string => {
  if (value === 0) return '0%';
  const abs = Math.abs(value);
  if (abs >= 100) return `${Math.round(value)}%`;
  if (abs >= 10) return `${value.toFixed(1).replace(/\.0$/, '')}%`;
  if (abs >= 1) return `${value.toFixed(2).replace(/\.?0+$/, '')}%`;
  return `${value.toFixed(3).replace(/\.?0+$/, '')}%`;
};

// Currency-like compact formatter (1.2K, 3.4M) with optional symbol
export const formatCurrencyCompact = (value: number, symbol?: string): string => {
  if (Math.abs(value) >= 1000) {
    const { prefix, postfix } = compactNumber({ value, visibleDecimals: 1, roundDown: true });
    return symbol ? `${symbol}${prefix}${postfix}` : `${prefix}${postfix}`;
  }
  const decimals = Math.abs(value) < 1 ? 4 : Math.abs(value) < 100 ? 2 : 1;
  const formatted = value.toFixed(decimals).replace(/\.?0+$/, '');
  return symbol ? `${symbol}${formatted}` : formatted;
};

// Factory to create a value formatter based on a unit hint
// unit examples: '%', 'USD', '$', 'ETH', token symbols, etc.
export const createValueFormatter = (unit?: string) => (value: number): string => {
  if (!unit) return value.toString();
  if (unit === '%') return formatPercent(value);
  if (unit === '$' || unit === 'USD') return formatCurrencyCompact(value, '$');
  // Default: append unit suffix for non-currency formats
  if (Math.abs(value) >= 1000) {
    const { prefix, postfix } = compactNumber({ value, visibleDecimals: 1, roundDown: true });
    return `${prefix}${postfix} ${unit}`;
  }
  const decimals = Math.abs(value) < 1 ? 4 : Math.abs(value) < 100 ? 2 : 1;
  return `${value.toFixed(decimals).replace(/\.?0+$/, '')} ${unit}`;
};


