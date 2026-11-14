// Crew health score, streak and badges (APP_BUILD_GUIDE.md 12.4). Pure functions.
import type { Reading, Status } from '../types.ts';
import type { LatestItem } from './overview.ts';
import { worstStatus } from './status.ts';

const POINTS: Record<Status, number> = { ok: 100, watch: 60, act: 20 };

/** 0-100: the average over today's latest indicators (ok 100, watch 60, act 20). null when nothing is assessed yet. */
export function crewScore(items: LatestItem[]): { score: number | null; worst: Status } {
  const assessed = items.flatMap((i) => (i.assessment ? [i.assessment.status] : []));
  if (assessed.length === 0) return { score: null, worst: 'ok' };
  const score = Math.round(assessed.reduce((sum, s) => sum + POINTS[s], 0) / assessed.length);
  return { score, worst: worstStatus(assessed) };
}

/** Mission days with a completed check: a day with a heart-rate reading (the station gives one every check). */
export function checkDays(readings: Reading[], crewId: string): Set<number> {
  return new Set(readings.filter((r) => r.crewId === crewId && r.indicator === 'hr' && r.missionDay >= 1).map((r) => r.missionDay));
}

/** Consecutive days with a check, ending today (or yesterday while today's check is still to do). */
export function streak(readings: Reading[], crewId: string, today: number): number {
  const days = checkDays(readings, crewId);
  let d = days.has(today) ? today : today - 1;
  let n = 0;
  while (d >= 1 && days.has(d)) {
    n++;
    d--;
  }
  return n;
}

function dailyLatest(readings: Reading[], crewId: string, indicator: Reading['indicator']): Map<number, number> {
  const out = new Map<number, number>();
  for (const r of readings.filter((x) => x.crewId === crewId && x.indicator === indicator)) out.set(r.missionDay, r.value);
  return out;
}

/** True when `pred` holds on `n` days in a row, at any point. */
function hasRun(values: Map<number, number>, pred: (v: number) => boolean, n: number): boolean {
  let run = 0;
  const days = [...values.keys()].sort((a, b) => a - b);
  let prev = Number.NEGATIVE_INFINITY;
  for (const d of days) {
    run = d === prev + 1 && pred(values.get(d) as number) ? run + 1 : pred(values.get(d) as number) ? 1 : 0;
    prev = d;
    if (run >= n) return true;
  }
  return false;
}

/** The longest run of consecutive check days. */
function longestStreak(days: Set<number>): number {
  let best = 0;
  let run = 0;
  let prev = Number.NEGATIVE_INFINITY;
  for (const d of [...days].sort((a, b) => a - b)) {
    run = d === prev + 1 ? run + 1 : 1;
    prev = d;
    best = Math.max(best, run);
  }
  return best;
}

export const WATER_GOAL_ML = 2000;

export interface Badge {
  id: string;
  label: string;
  earned: boolean;
}

export function badges(readings: Reading[], crewId: string): Badge[] {
  const days = checkDays(readings, crewId);
  return [
    { id: 'first_check', label: 'First check', earned: days.size > 0 },
    { id: 'streak_7', label: '7-day streak', earned: longestStreak(days) >= 7 },
    { id: 'sleep_7', label: 'Sleep 7 h × 3', earned: hasRun(dailyLatest(readings, crewId, 'sleep'), (v) => v >= 7, 3) },
    { id: 'water_3', label: 'Water goal × 3', earned: hasRun(dailyLatest(readings, crewId, 'water'), (v) => v >= WATER_GOAL_ML, 3) },
    { id: 'meals_3', label: '3 meals × 3', earned: hasRun(dailyLatest(readings, crewId, 'meals'), (v) => v >= 3, 3) },
  ];
}
