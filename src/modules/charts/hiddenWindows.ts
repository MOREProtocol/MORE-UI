import type { BusinessDay, Time, UTCTimestamp } from 'lightweight-charts';
import { HIDDEN_TIME_PERIODS } from './constants';

export type HiddenTimePeriod = {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  chainId: number;
  message: string;
};

export type HiddenWindow = {
  start: UTCTimestamp;
  end: UTCTimestamp;
  message: string;
};

function parseUtcDayStartToSeconds(yyyyMmDd: string): UTCTimestamp {
  return Math.floor(new Date(`${yyyyMmDd}T00:00:00Z`).getTime() / 1000) as UTCTimestamp;
}

function parseUtcDayEndToSeconds(yyyyMmDd: string): UTCTimestamp {
  return Math.floor(new Date(`${yyyyMmDd}T23:59:59Z`).getTime() / 1000) as UTCTimestamp;
}

export function selectHiddenWindows(chainId: number | undefined): HiddenWindow[] {
  if (!chainId) return [];
  return (HIDDEN_TIME_PERIODS as HiddenTimePeriod[])
    .filter((p) => p.chainId === chainId)
    .map((p) => ({
      start: parseUtcDayStartToSeconds(p.start),
      end: parseUtcDayEndToSeconds(p.end),
      message: p.message,
    }))
    .filter((w) => Number.isFinite(w.start) && Number.isFinite(w.end) && w.end >= w.start);
}

export function toUtcTimestampSeconds(timeValue: BusinessDay | UTCTimestamp | Time | null): number | null {
  if (!timeValue) return null;
  if (typeof timeValue === 'number') return timeValue;
  if (typeof timeValue === 'string') {
    const direct = new Date(timeValue).getTime();
    if (Number.isFinite(direct)) return Math.floor(direct / 1000);
    const asUtcDay = new Date(`${timeValue}T00:00:00Z`).getTime();
    return Number.isFinite(asUtcDay) ? Math.floor(asUtcDay / 1000) : null;
  }
  const ms = Date.UTC(timeValue.year, timeValue.month - 1, timeValue.day);
  return Math.floor(ms / 1000);
}

export function makeIsHiddenTime(hiddenWindows: HiddenWindow[]) {
  if (!hiddenWindows.length) return () => false;
  return (tSeconds: number) =>
    hiddenWindows.some((w) => tSeconds >= (w.start as number) && tSeconds <= (w.end as number));
}

