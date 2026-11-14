// The unit each indicator is stored in (APP_BUILD_GUIDE.md section 4: Reading.unit).
import type { IndicatorId } from '../types.ts';

export const UNIT_OF: Record<IndicatorId, string> = {
  hr: 'bpm',
  spo2: '%',
  temp: '°C',
  bp_sys: 'mmHg',
  bp_dia: 'mmHg',
  glucose: 'mg/dL',
  sleep: 'h',
  mood: '1-5',
  water: 'ml',
  exercise: 'min',
  meals: 'meals',
};
