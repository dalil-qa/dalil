// How a stored value is shown to people.
import type { IndicatorId } from '../types.ts';

export function formatValue(indicator: IndicatorId, value: number, unit: string): { value: string; unit: string } {
  const round1 = (v: number) => String(Math.round(v * 10) / 10);
  switch (indicator) {
    case 'water':
      return { value: round1(value / 1000), unit: 'L' };
    case 'mood':
      return { value: `${value}/5`, unit: '' };
    case 'meals':
      return { value: `${value}/3`, unit: 'meals' };
    case 'sleep':
      return { value: round1(value), unit: 'h' };
    case 'temp':
      return { value: round1(value), unit };
    default:
      return { value: String(Math.round(value * 10) / 10), unit };
  }
}

/** "13:12" for 792 s; "1.3 s" for short delays. */
export function formatDelay(sec: number): string {
  if (sec < 60) return `${Math.round(sec * 10) / 10} s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
