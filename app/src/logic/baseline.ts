// Personal baselines (APP_BUILD_GUIDE.md 12.1). Pure functions: no store, no clock.
import type { IndicatorId, Reading } from '../types.ts';

export const BASELINE_WINDOW_DAYS = 7;
export const BASELINE_MIN_DAYS = 5;
export const PREFLIGHT_MIN_READINGS = 3;
/** Station readings with signal quality below this are marked low-confidence and excluded from baselines. */
export const LOW_QUALITY = 0.5;

const isTrustedQuality = (r: Reading): boolean => r.quality === undefined || r.quality === null || r.quality >= LOW_QUALITY;

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** One value per mission day (the median of that day's readings), for one indicator. */
export function dailyValues(readings: Reading[], indicator: IndicatorId): Map<number, number> {
  const byDay = new Map<number, number[]>();
  for (const r of readings) {
    if (r.indicator !== indicator || !isTrustedQuality(r)) continue;
    const list = byDay.get(r.missionDay) ?? [];
    list.push(r.value);
    byDay.set(r.missionDay, list);
  }
  const out = new Map<number, number>();
  for (const [day, values] of byDay) out.set(day, median(values) as number);
  return out;
}

export interface Baseline {
  /** The 7-day normal, or null while still learning. */
  value: number | null;
  /** How many earlier days (of the last 7) had a reading. */
  daysUsed: number;
}

/**
 * The 7-day normal: the median of the daily values over the 7 days before `today`
 * (today not counted). Needs at least 5 such days, otherwise it is still learning.
 * Pre-flight days (missionDay <= 0) are never part of it.
 */
export function computeBaseline(readings: Reading[], indicator: IndicatorId, today: number): Baseline {
  const days = dailyValues(readings, indicator);
  const window: number[] = [];
  for (let d = today - BASELINE_WINDOW_DAYS; d <= today - 1; d++) {
    if (d <= 0) continue;
    const v = days.get(d);
    if (v !== undefined) window.push(v);
  }
  if (window.length < BASELINE_MIN_DAYS) return { value: null, daysUsed: window.length };
  return { value: median(window), daysUsed: window.length };
}

export interface PreflightNormal {
  value: number | null;
  count: number;
}

/** The normal from before launch: the median of all readings taken on Earth (missionDay <= 0). Needs 3. */
export function computePreflightNormal(readings: Reading[], indicator: IndicatorId): PreflightNormal {
  const values = readings.filter((r) => r.indicator === indicator && r.missionDay <= 0 && isTrustedQuality(r)).map((r) => r.value);
  if (values.length < PREFLIGHT_MIN_READINGS) return { value: null, count: values.length };
  return { value: median(values), count: values.length };
}
