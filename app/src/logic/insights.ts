// Plain-English trend insights from rules, never from AI (APP_BUILD_GUIDE.md 12.3).
// Three templates, checked in order; at most two are shown.
import { thresholdFor } from '../data/index.ts';
import type { IndicatorId, Reading } from '../types.ts';
import { computeBaseline } from './baseline.ts';
import { assessReading, INDICATOR_LABELS } from './status.ts';

const dayValue = (readings: Reading[], indicator: IndicatorId, day: number): number | undefined => {
  const values = readings.filter((r) => r.indicator === indicator && r.missionDay === day).map((r) => r.value);
  return values.length ? values[values.length - 1] : undefined;
};

const round1 = (v: number) => Math.round(v * 10) / 10;

/** An insight and the indicators it is about, so Trends can show the ones for the chosen tab first. */
export interface Insight {
  text: string;
  indicators: IndicatorId[];
}

export function insights(allReadings: Reading[], crewId: string, day: number): string[] {
  return insightList(allReadings, crewId, day).map((i) => i.text);
}

export function insightList(allReadings: Reading[], crewId: string, day: number): Insight[] {
  const mine = allReadings.filter((r) => r.crewId === crewId);
  const out: Insight[] = [];

  // 1 (and 2): an indicator outside its baseline band for as many days as its rule asks (3), with the sleep link when it applies.
  for (const indicator of ['hr', 'temp'] as IndicatorId[]) {
    const rule = thresholdFor(indicator)?.baseline;
    const today = dayValue(mine, indicator, day);
    if (!rule || today === undefined) continue;
    const base = computeBaseline(mine, indicator, day).value;
    if (base === null) continue;
    const limit = rule.bandType === 'pct' ? (base * rule.band) / 100 : rule.band;
    const direction = Math.sign(today - base);
    let n = 0;
    for (let d = day; ; d--) {
      const v = dayValue(mine, indicator, d);
      if (v === undefined || Math.abs(v - base) <= limit || Math.sign(v - base) !== direction) break;
      n++;
    }
    if (n < rule.days) continue;
    const unit = thresholdFor(indicator)?.unit ?? '';
    let text = `Your ${INDICATOR_LABELS[indicator].toLowerCase()} has been ${round1(Math.abs(today - base))} ${unit} ${direction > 0 ? 'above' : 'below'} your normal for ${n} days`;
    // Template 2: sleep at least 1 h below its own normal over the same days.
    const sleepToday = dayValue(mine, 'sleep', day);
    const sleepBase = computeBaseline(mine, 'sleep', day).value;
    const about: IndicatorId[] = [indicator];
    if (indicator === 'hr' && sleepToday !== undefined && sleepBase !== null && sleepBase - sleepToday >= 1) {
      text += `, while sleep dropped to ${round1(sleepToday)} h. NASA warns that sleep loss affects health and performance.`;
      about.push('sleep');
    } else {
      text += '.';
    }
    out.push({ text, indicators: about });
  }

  // 3: seven days with every assessed indicator green.
  if (out.length === 0 && day >= 7) {
    let steady = true;
    let seen = 0;
    for (let d = day - 6; d <= day && steady; d++) {
      for (const indicator of ['hr', 'spo2', 'temp'] as IndicatorId[]) {
        const t = thresholdFor(indicator);
        const v = dayValue(mine, indicator, d);
        if (!t || v === undefined) continue;
        seen++;
        if (assessReading({ indicator, value: v, missionDay: d }, mine, t).status !== 'ok') steady = false;
      }
    }
    if (steady && seen >= 7) out.push({ text: 'All indicators steady this week. Keep your routine.', indicators: ['hr', 'spo2', 'temp'] });
  }
  return out.slice(0, 2);
}
