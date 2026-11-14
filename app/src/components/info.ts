// Look-up tables for the design kit (APP_BUILD_GUIDE.md 9.2 and 9.3). Kept apart from the components.
import { CircleCheck, FlaskConical, OctagonX, PenLine, Radio, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { Source, Status } from '../types.ts';

/** Status is always colour + icon + word, never colour alone. */
export const STATUS_INFO: Record<Status, { word: string; Icon: LucideIcon; text: string; bg: string; border: string; stroke: string }> = {
  ok: { word: 'OK', Icon: CircleCheck, text: 'text-ok', bg: 'bg-ok/15', border: 'border-ok/40', stroke: 'stroke-ok' },
  watch: { word: 'Watch', Icon: TriangleAlert, text: 'text-watch', bg: 'bg-watch/15', border: 'border-watch/40', stroke: 'stroke-watch' },
  act: { word: 'Call surgeon', Icon: OctagonX, text: 'text-act', bg: 'bg-act/15', border: 'border-act/40', stroke: 'stroke-act' },
};

export const SOURCE_INFO: Record<Source, { label: string; Icon: LucideIcon }> = {
  measured: { label: 'Measured by station', Icon: Radio },
  logged: { label: 'Logged by you', Icon: PenLine },
  simulated: { label: 'Simulated', Icon: FlaskConical },
  sample: { label: 'Sample data', Icon: FlaskConical },
};

export const LED_WORD: Record<Status, string> = { ok: 'green', watch: 'amber', act: 'red' };
