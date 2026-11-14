// Status of one reading (APP_BUILD_GUIDE.md 12.1) and of a whole check (12.2).
// Three rules, worst one wins, but the personal baselines alone never make "act":
// red only ever comes from the NASA / medical ranges (and from red-flag symptoms, 12.5).
import type { Assessment, IndicatorId, Range, Reading, Status, StationCommand, Threshold } from '../types.ts';
import { BASELINE_MIN_DAYS, computeBaseline, computePreflightNormal, dailyValues } from './baseline.ts';

export const INDICATOR_LABELS: Record<IndicatorId, string> = {
  hr: 'Resting heart rate',
  spo2: 'SpO2',
  temp: 'Skin temperature',
  bp_sys: 'Systolic blood pressure',
  bp_dia: 'Diastolic blood pressure',
  glucose: 'Blood sugar',
  sleep: 'Sleep',
  mood: 'Mood',
  water: 'Water',
  exercise: 'Exercise',
  meals: 'Meals',
};

const RANK: Record<Status, number> = { ok: 0, watch: 1, act: 2 };

export function worstStatus(statuses: Status[]): Status {
  return statuses.reduce<Status>((worst, s) => (RANK[s] > RANK[worst] ? s : worst), 'ok');
}

/** The light colour the station should show for a status (APP_BUILD_GUIDE.md 7.3). */
export function ledCommandFor(status: Status): StationCommand {
  return status === 'ok' ? 'LED GREEN' : status === 'watch' ? 'LED AMBER' : 'LED RED';
}

const inRange = (v: number, r: Range): boolean => (r.min === null || v >= r.min) && (r.max === null || v <= r.max);

const fmt = (v: number, unit: string): string => `${Number.isInteger(v) ? v : Math.round(v * 10) / 10} ${unit}`;

function describeRange(r: Range, unit: string): string {
  if (r.min !== null && r.max !== null) return `${fmt(r.min, unit)} to ${fmt(r.max, unit)}`;
  if (r.min !== null) return `${fmt(r.min, unit)} or more`;
  if (r.max !== null) return `${fmt(r.max, unit)} or less`;
  return 'any value';
}

function rangeResult(value: number, t: Threshold): { status: Status; reason: string } {
  const label = INDICATOR_LABELS[t.indicator];
  const here = fmt(value, t.unit);
  if (inRange(value, t.green)) return { status: 'ok', reason: `${label} ${here} is inside the safe range (${describeRange(t.green, t.unit)}).` };
  const status: Status = inRange(value, t.amber) ? 'watch' : 'act';
  const below = t.green.min !== null && value < t.green.min;
  const side = below ? 'below' : 'above';
  const safe = describeRange(t.green, t.unit);
  return {
    status,
    reason:
      status === 'watch'
        ? `${label} ${here} is ${side} the safe range (${safe}), but not yet in the call-the-surgeon zone.`
        : `${label} ${here} is ${side} the safe range (${safe}).`,
  };
}

export interface AssessInput {
  indicator: IndicatorId;
  value: number;
  missionDay: number;
}

/**
 * Assess one new value. `history` is the same person's earlier readings (any indicator is fine,
 * it is filtered here). Days on or after today are ignored for the baselines.
 */
export function assessReading(input: AssessInput, history: Reading[], threshold: Threshold): Assessment {
  const { indicator, value, missionDay } = input;
  const label = INDICATOR_LABELS[indicator];
  const range = rangeResult(value, threshold);

  const rule = threshold.baseline;
  if (!rule) return { indicator, value, status: range.status, reason: range.reason, baseline: null };

  // Only readings from before today, so a re-check today can't change its own baseline.
  const earlier = history.filter((r) => r.indicator === indicator && r.missionDay < missionDay);
  const base = computeBaseline(earlier, indicator, missionDay);

  let baselineStatus: Status = 'ok';
  let baselineReason: string | null = null;
  let driftReason: string | null = null;

  if (base.value === null) {
    baselineReason = `Still learning your normal: ${base.daysUsed} of ${BASELINE_MIN_DAYS} days so far.`;
  } else {
    // Today and the previous (days - 1) days must ALL be more than `band` away from the 7-day normal.
    const days = dailyValues(earlier, indicator);
    const limit = rule.bandType === 'pct' ? (base.value * rule.band) / 100 : rule.band;
    let offBy = 0;
    let direction = 0;
    let allOff = Math.abs(value - base.value) > limit;
    if (allOff) {
      direction = Math.sign(value - base.value);
      offBy = Math.abs(value - base.value);
      for (let d = 1; d < rule.days && allOff; d++) {
        const v = days.get(missionDay - d);
        allOff = v !== undefined && Math.abs(v - base.value) > limit && Math.sign(v - base.value) === direction;
      }
    }
    if (allOff) {
      baselineStatus = 'watch';
      const amount = rule.bandType === 'pct' ? `${Math.round((offBy / base.value) * 100)} %` : fmt(Math.round(offBy * 10) / 10, threshold.unit);
      baselineReason = `${label} ${fmt(value, threshold.unit)} is ${amount} ${direction > 0 ? 'above' : 'below'} your normal (${fmt(Math.round(base.value * 10) / 10, threshold.unit)}) for ${rule.days} days.`;
    }

    // Pre-flight check: has the 7-day normal crept away from the normal on Earth?
    if (rule.drift !== null && missionDay > 0) {
      const pre = computePreflightNormal(history, indicator);
      if (pre.value !== null && Math.abs(base.value - pre.value) > rule.drift) {
        const moved = Math.round(Math.abs(base.value - pre.value) * 10) / 10;
        driftReason = `Your normal ${label.toLowerCase()} has ${base.value > pre.value ? 'risen' : 'fallen'} ${fmt(moved, threshold.unit)} since before launch (${Math.round(pre.value * 10) / 10} → ${Math.round(base.value * 10) / 10}).`;
      }
    }
  }

  // Final = worst of the three, but baselines alone never make it "act" (they only reach "watch").
  const driftStatus: Status = driftReason ? 'watch' : 'ok';
  const status = worstStatus([range.status, baselineStatus, driftStatus]);

  // The reason names the rule that decided. The range wins ties, then the 7-day rule, then drift.
  let reason = range.reason;
  if (range.status === 'ok' && baselineStatus === 'watch' && baselineReason) reason = baselineReason;
  else if (range.status === 'ok' && driftReason) reason = driftReason;
  else if (range.status === 'ok' && baselineReason && baselineStatus === 'ok') reason = `${range.reason} ${baselineReason}`;

  return { indicator, value, status, reason, baseline: base.value };
}

/** 12.2: the worst status of a check's readings. Decides the LED colour and the result's headline. */
export function overallStatus(assessments: Assessment[]): Status {
  return worstStatus(assessments.map((a) => a.status));
}
