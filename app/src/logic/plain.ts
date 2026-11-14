// Home mode (APP_BUILD_GUIDE.md 10.10): results in plain words, with no space vocabulary.
import type { IndicatorId, Status } from '../types.ts';

const NAME: Partial<Record<IndicatorId, string>> = {
  hr: 'heart rate',
  spo2: 'oxygen level',
  temp: 'temperature',
  bp_sys: 'blood pressure',
  bp_dia: 'blood pressure',
  glucose: 'blood sugar',
  sleep: 'sleep',
  mood: 'mood',
  water: 'water',
  exercise: 'exercise',
  meals: 'meals',
};

/** One short sentence a person with no medical background can read. */
export function plainSentence(indicator: IndicatorId, status: Status): string {
  const name = NAME[indicator] ?? 'reading';
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  if (status === 'ok') return `Your ${name} is normal today.`;
  if (status === 'watch') return `Your ${name} is a little different from usual.`;
  return `${cap} needs attention. Please call your doctor.`;
}

/** The headline for the whole check. */
export function plainHeadline(overall: Status): string {
  if (overall === 'ok') return 'All good today.';
  if (overall === 'watch') return 'Something is a little different from usual.';
  return 'Please call your doctor now.';
}
