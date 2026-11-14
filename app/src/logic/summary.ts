// The report for the flight surgeon, built from a template: never by the AI, so it works offline and says
// only what was measured or chosen (APP_BUILD_GUIDE.md 12.5). Also used by the Flight Surgeon screen.
import type { Source, Status } from '../types.ts';

export interface ReportReading {
  label: string; // 'HR'
  shown: string; // the value as people read it, e.g. '74 bpm', '2/5', '2.2 L'
  time: string; // ISO
  source: Source;
  quality?: number | null;
  status: Status | null; // null = no thresholds yet
}

export interface ReportInput {
  priority: boolean;
  crewLabel: string;
  missionName: string;
  missionDay: number;
  startedAt: string; // ISO
  redFlags: string[]; // labels
  latest: ReportReading[];
  trend: string[]; // plain sentences, e.g. the reasons of watch / act assessments
  otherSymptoms: string[]; // labels, last 3 days
  crewAlertedAt: string | null; // ISO
}

/** HH:MM in the viewer's clock. */
export function clock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const STATUS_WORD: Record<Status, string> = { ok: 'OK', watch: 'Watch', act: 'Call surgeon' };

function readingText(r: ReportReading): string {
  const parts = [clock(r.time), r.source];
  if (r.quality !== undefined && r.quality !== null) parts.push(`quality ${r.quality.toFixed(2)}`);
  const status = r.status && r.status !== 'ok' ? ` [${STATUS_WORD[r.status]}]` : '';
  return `${r.label} ${r.shown}${status} (${parts.join(', ')})`;
}

export function buildReport(i: ReportInput): string {
  const lines = [
    `${i.priority ? 'PRIORITY · ' : ''}Dalil ${i.priority ? 'emergency report' : 'report'}`,
    `${i.crewLabel} · ${i.missionName} · Day ${i.missionDay} · started ${clock(i.startedAt)}`,
  ];
  if (i.redFlags.length) lines.push(`Red flags: ${i.redFlags.join(', ')}`);
  lines.push(`Latest readings: ${i.latest.length ? i.latest.map(readingText).join(' · ') : 'none recorded'}`);
  lines.push(`Recent trend: ${i.trend.length ? i.trend.join('; ') : 'nothing outside the normal range'}`);
  lines.push(`Other symptoms (last 3 days): ${i.otherSymptoms.length ? i.otherSymptoms.join(', ') : 'none'}`);
  if (i.priority) lines.push(`Crew alerted: ${i.crewAlertedAt ? clock(i.crewAlertedAt) : 'not yet'}`);
  lines.push('Sent by Dalil. Guidance tool only, not a diagnosis.');
  return lines.join('\n');
}
