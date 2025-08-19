import type { Time } from 'lightweight-charts';

// Generic chart data point used by line/candlestick adapters
export interface ChartDataPoint {
  time: Time;
  value: number;
}

// Returns a numeric timestamp in milliseconds for consistent comparisons
export type TimeAccessor<T> = (item: T) => number;

// Formats numeric values for display (axis labels, overlays, tooltips)
export type ValueFormatter = (value: number) => string;


