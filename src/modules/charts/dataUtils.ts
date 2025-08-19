import type { TimeAccessor } from './types';
import type { TimePeriod } from './timePeriods';
import { calculateFromTimestamp } from './timePeriods';

// Sort by time ascending and remove adjacent duplicates (same timestamp)
export function sortAndDeduplicateByTime<T>(data: T[], getTimeMs: TimeAccessor<T>): T[] {
  if (!data || data.length === 0) return data;
  return [...data]
    .sort((a, b) => getTimeMs(a) - getTimeMs(b))
    .filter((item, index, array) => index === 0 || getTimeMs(item) !== getTimeMs(array[index - 1]));
}

// Filter data by relative time period using current time as reference
export function filterByPeriod<T>(data: T[], getTimeMs: TimeAccessor<T>, period: TimePeriod): T[] {
  if (!data || data.length === 0) return data;
  const nowSec = Math.floor(Date.now() / 1000);
  const fromSec = calculateFromTimestamp(period, nowSec);
  const fromMs = fromSec * 1000;
  return data.filter((item) => getTimeMs(item) >= fromMs);
}

// Helper to reset and fit the visible time range based on data length
export function computeVisibleLogicalRange(dataLength: number) {
  return { from: 0, to: Math.max(0, dataLength - 1) } as const;
}


