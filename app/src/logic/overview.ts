// "What is the latest, and how is it?" for one crew member. Used by Today, the report and the Body screen.
import { thresholdFor } from '../data/index.ts';
import type { Assessment, IndicatorId, Reading } from '../types.ts';
import { assessReading } from './status.ts';

/** Short names for reports and tiles. */
export const INDICATOR_SHORT: Record<IndicatorId, string> = {
  hr: 'HR',
  spo2: 'SpO2',
  temp: 'skin',
  bp_sys: 'BP sys',
  bp_dia: 'BP dia',
  glucose: 'glucose',
  sleep: 'sleep',
  mood: 'mood',
  water: 'water',
  exercise: 'exercise',
  meals: 'meals',
};

export interface LatestItem {
  indicator: IndicatorId;
  reading: Reading;
  /** null while the indicator has no thresholds yet (M2 adds them). */
  assessment: Assessment | null;
}

const byTime = (a: Reading, b: Reading) => a.missionDay - b.missionDay || Date.parse(a.time) - Date.parse(b.time);

/** The newest reading of each indicator for this crew member, on or before `uptoDay`. */
export function latestReadings(readings: Reading[], crewId: string, uptoDay: number): Reading[] {
  const latest = new Map<IndicatorId, Reading>();
  for (const r of [...readings].filter((x) => x.crewId === crewId && x.missionDay <= uptoDay).sort(byTime)) {
    latest.set(r.indicator, r);
  }
  return [...latest.values()];
}

export function latestAssessments(readings: Reading[], crewId: string, uptoDay: number): LatestItem[] {
  const mine = readings.filter((r) => r.crewId === crewId);
  return latestReadings(readings, crewId, uptoDay).map((reading) => {
    const threshold = thresholdFor(reading.indicator);
    return {
      indicator: reading.indicator,
      reading,
      assessment: threshold
        ? assessReading({ indicator: reading.indicator, value: reading.value, missionDay: reading.missionDay }, mine, threshold)
        : null,
    };
  });
}

/** Readings of one indicator for the last `days` mission days up to today (for the sparklines). */
export function lastDays(readings: Reading[], crewId: string, indicator: IndicatorId, today: number, days = 7): (number | null)[] {
  const out: (number | null)[] = [];
  for (let d = today - days + 1; d <= today; d++) {
    const values = readings.filter((r) => r.crewId === crewId && r.indicator === indicator && r.missionDay === d).map((r) => r.value);
    out.push(values.length ? values[values.length - 1] : null);
  }
  return out;
}
