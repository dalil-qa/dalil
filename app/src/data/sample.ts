// Turns the compact history.json (made by scripts/make-history.ts) into Readings and SymptomLogs.
// It is sample data: every reading has source "sample" and is never saved to the browser.
import type { IndicatorId, Reading, SymptomId, SymptomLog } from '../types.ts';
import historyJson from './history.json' with { type: 'json' };
import { UNIT_OF } from './units.ts';

interface Compact {
  lastDay: number;
  readings: [string, number, string, number][];
  symptoms: [string, number, string[]][];
}
const history = historyJson as Compact;

/** The last mission day the sample history covers. */
export const SAMPLE_LAST_DAY = history.lastDay;

// The morning station check also gives blood pressure on some days; everything else is the evening log.
const MORNING: IndicatorId[] = ['hr', 'spo2', 'temp', 'bp_sys', 'bp_dia'];

/** A local date-time string (no "Z") so it shows as 06:40 on any laptop. */
export function localIso(day: number, hour: number, minute: number): string {
  const d = new Date(Date.UTC(2026, 0, day));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(hour)}:${p(minute)}:00`;
}

export function sampleReadings(): Reading[] {
  return history.readings.map(([crewId, day, indicator, value]) => {
    const id = indicator as IndicatorId;
    const morning = MORNING.includes(id);
    return {
      id: `sample-${crewId}-${day}-${indicator}`,
      crewId,
      time: morning ? localIso(day, 6, 40) : localIso(day, 21, 0),
      missionDay: day,
      indicator: id,
      value,
      unit: UNIT_OF[id],
      source: 'sample' as const,
      checkId: morning ? `sample-${crewId}-${day}-am` : undefined,
      quality: morning ? 0.9 : undefined,
    };
  });
}

export function sampleSymptoms(): SymptomLog[] {
  return history.symptoms.map(([crewId, day, ids]) => ({
    crewId,
    time: localIso(day, 21, 0),
    missionDay: day,
    symptoms: ids as SymptomId[],
  }));
}
