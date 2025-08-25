export type TimePeriod = '7d' | '1m' | '3m' | '1y';

export const TIME_PERIODS: TimePeriod[] = ['7d', '1m', '3m', '1y'];

export const periodToSeconds = (period: TimePeriod): number => {
  switch (period) {
    case '7d':
      return 7 * 24 * 60 * 60;
    case '1m':
      return 30 * 24 * 60 * 60;
    case '3m':
      return 3 * 30 * 24 * 60 * 60;
    case '1y':
      return 365 * 24 * 60 * 60;
    default:
      return 3 * 30 * 24 * 60 * 60;
  }
};

export const periodToMs = (period: TimePeriod): number => periodToSeconds(period) * 1000;

export const calculateFromTimestamp = (
  period: TimePeriod,
  nowSec: number = Math.floor(Date.now() / 1000)
): number => {
  return nowSec - periodToSeconds(period);
};


