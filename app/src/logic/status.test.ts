import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { IndicatorId, Reading, Threshold } from '../types.ts';
import { computeBaseline, computePreflightNormal, median } from './baseline.ts';
import { assessReading, ledCommandFor, overallStatus } from './status.ts';

const HR: Threshold = {
  indicator: 'hr', unit: 'bpm',
  green: { min: 50, max: 100 }, amber: { min: 40, max: 130 },
  baseline: { band: 8, bandType: 'abs', days: 3, drift: 12 },
  howToMeasure: '', source: { title: 'test', url: 'https://example.com' },
};
const SPO2: Threshold = {
  indicator: 'spo2', unit: '%',
  green: { min: 95, max: null }, amber: { min: 90, max: null },
  baseline: null, howToMeasure: '', source: { title: 'test', url: 'https://example.com' },
};

let n = 0;
const reading = (indicator: IndicatorId, day: number, value: number): Reading => ({
  id: String(n++), crewId: 'c2', time: '2026-01-01T06:00:00Z', missionDay: day, indicator, value, unit: 'bpm', source: 'sample',
});
const series = (indicator: IndicatorId, from: number, values: number[]): Reading[] => values.map((v, i) => reading(indicator, from + i, v));

describe('median and baselines', () => {
  it('median handles odd, even and empty', () => {
    assert.equal(median([3, 1, 2]), 2);
    assert.equal(median([4, 1, 3, 2]), 2.5);
    assert.equal(median([]), null);
  });
  it('baseline is the 7-day median not counting today, and needs 5 days', () => {
    const days = series('hr', 40, [63, 65, 64, 66, 64, 65, 67]);
    assert.deepEqual(computeBaseline(days, 'hr', 47), { value: 65, daysUsed: 7 });
    assert.deepEqual(computeBaseline(days.slice(0, 3), 'hr', 47), { value: null, daysUsed: 3 });
    assert.equal(computeBaseline(days, 'hr', 40).value, null); // nothing before day 40
  });
  it('pre-flight normal is the median of readings on or before day 0, and needs 3', () => {
    const pre = series('hr', -5, [61, 62, 62, 63, 62]);
    assert.equal(computePreflightNormal(pre, 'hr').value, 62);
    assert.equal(computePreflightNormal(pre.slice(0, 2), 'hr').value, null);
  });
});

describe('assessReading: ranges', () => {
  it('green is ok, amber is watch, outside amber is act, with a plain reason', () => {
    assert.equal(assessReading({ indicator: 'spo2', value: 97, missionDay: 5 }, [], SPO2).status, 'ok');
    assert.equal(assessReading({ indicator: 'spo2', value: 92, missionDay: 5 }, [], SPO2).status, 'watch');
    const act = assessReading({ indicator: 'spo2', value: 88, missionDay: 5 }, [], SPO2);
    assert.equal(act.status, 'act');
    assert.equal(act.reason, 'SpO2 88 % is below the safe range (95 % or more).');
  });
});

describe('assessReading: personal baseline (worked example, Crew Member 2, band 8)', () => {
  const pre = series('hr', -5, [61, 62, 62, 63, 62]);
  // Days 40-44 normal; days 45-46 raised; today (47) raised too. 7-day normal stays 65.
  const history = [...pre, ...series('hr', 40, [63, 65, 64, 66, 64, 74, 74])];

  it('3 days more than 8 above the 7-day normal turns watch, though the range is green', () => {
    const a = assessReading({ indicator: 'hr', value: 74, missionDay: 47 }, history, HR);
    assert.equal(a.status, 'watch');
    assert.equal(a.baseline, 65);
    assert.equal(a.reason, 'Resting heart rate 74 bpm is 9 bpm above your normal (65 bpm) for 3 days.');
  });
  it('one raised day is not enough', () => {
    const calm = [...pre, ...series('hr', 40, [63, 65, 64, 66, 64, 65, 67])];
    assert.equal(assessReading({ indicator: 'hr', value: 74, missionDay: 47 }, calm, HR).status, 'ok');
  });
  it('a gap in the days breaks the streak', () => {
    const gap = [...pre, ...series('hr', 40, [63, 65, 64, 66, 64]), reading('hr', 46, 74)]; // day 45 missing
    assert.equal(assessReading({ indicator: 'hr', value: 74, missionDay: 47 }, gap, HR).status, 'ok');
  });
  it('still learning with fewer than 5 days, and says so', () => {
    const a = assessReading({ indicator: 'hr', value: 70, missionDay: 4 }, series('hr', 1, [64, 65, 66]), HR);
    assert.equal(a.status, 'ok');
    assert.equal(a.baseline, null);
    assert.match(a.reason, /Still learning your normal: 3 of 5 days so far\./);
  });
  it('a re-check today never counts toward its own baseline', () => {
    const withToday = [...history, reading('hr', 47, 74)];
    assert.equal(assessReading({ indicator: 'hr', value: 74, missionDay: 47 }, withToday, HR).baseline, 65);
  });
});

describe('assessReading: drift since before launch', () => {
  it('flags a 7-day normal that has moved more than `drift` from the pre-flight normal', () => {
    const pre = series('hr', -5, [61, 62, 62, 63, 62]); // normal 62
    const risen = series('hr', 40, [75, 74, 75, 76, 74, 75, 75]); // normal 75 -> +13
    const a = assessReading({ indicator: 'hr', value: 75, missionDay: 47 }, [...pre, ...risen], HR);
    assert.equal(a.status, 'watch');
    assert.equal(a.reason, 'Your normal resting heart rate has risen 13 bpm since before launch (62 → 75).');
  });
  it('needs 3 pre-flight readings, and is skipped for pre-flight checks themselves', () => {
    const risen = series('hr', 40, [75, 74, 75, 76, 74, 75, 75]);
    assert.equal(assessReading({ indicator: 'hr', value: 75, missionDay: 47 }, [...series('hr', -2, [62, 62]), ...risen], HR).status, 'ok');
  });
});

describe('red only comes from the ranges', () => {
  it('a huge baseline jump inside the amber range is watch, never act', () => {
    const history = series('hr', 40, [63, 65, 64, 66, 64, 110, 110]);
    const a = assessReading({ indicator: 'hr', value: 110, missionDay: 47 }, history, HR);
    assert.equal(a.status, 'watch'); // 110 is outside green (100) but inside amber, and the baseline rule alone can't make red
  });
});

describe('overall status and the light', () => {
  it('overall is the worst status, and the LED follows it', () => {
    const mk = (status: 'ok' | 'watch' | 'act') => ({ indicator: 'hr' as const, value: 1, status, reason: '', baseline: null });
    assert.equal(overallStatus([mk('ok'), mk('watch')]), 'watch');
    assert.equal(overallStatus([mk('ok'), mk('act'), mk('watch')]), 'act');
    assert.equal(overallStatus([]), 'ok');
    assert.deepEqual(['ok', 'watch', 'act'].map((s) => ledCommandFor(s as 'ok')), ['LED GREEN', 'LED AMBER', 'LED RED']);
  });
});
