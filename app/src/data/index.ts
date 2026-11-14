// Typed access to the content files in this folder (APP_BUILD_GUIDE.md section 5).
// Other files (cards, systems, symptoms...) are added here as M2 and M3 deliver them.
import type { IndicatorId, Threshold } from '../types.ts';
import thresholdsJson from './thresholds.json' with { type: 'json' };

export const thresholds = thresholdsJson as Threshold[];

export function thresholdFor(indicator: IndicatorId): Threshold | undefined {
  return thresholds.find((t) => t.indicator === indicator);
}
