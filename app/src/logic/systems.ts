// The colour of each body system (APP_BUILD_GUIDE.md 10.4): the worst of its indicators' statuses and the
// symptoms logged for it in the last 3 days (ordinary symptom = watch, red flag = act). Pure functions.
import { symptomById, systems } from '../data/index.ts';
import type { BodySystem, EmergencyEvent, Status, SymptomLog } from '../types.ts';
import { SYMPTOM_WINDOW_DAYS } from './cards.ts';
import type { LatestItem } from './overview.ts';
import { worstStatus } from './status.ts';

export interface SystemState {
  system: BodySystem;
  /** null = nothing measured and no thresholds yet, so no colour can honestly be given. */
  status: Status | null;
  items: LatestItem[];
  symptoms: { label: string; redFlag: boolean }[];
  /** One plain sentence about what decided the colour. */
  reason: string;
}

export function systemStates(args: {
  items: LatestItem[];
  symptomLogs: SymptomLog[];
  /** The open emergency (if any) and closed ones: red flags keep their system red for 3 days. */
  emergencies: EmergencyEvent[];
  crewId: string;
  day: number;
}): SystemState[] {
  const { items, symptomLogs, emergencies, crewId, day } = args;
  const recent = (d: number) => d > day - SYMPTOM_WINDOW_DAYS && d <= day;

  return systems.map((system) => {
    const mine = items.filter((i) => system.indicators.includes(i.indicator));
    const statuses: Status[] = [];
    let reason = '';

    // The worst assessed indicator decides, and its own sentence explains why.
    const assessed = mine.filter((i) => i.assessment);
    for (const i of assessed) statuses.push(i.assessment!.status);
    const worstIndicator = [...assessed].sort((a, b) => rank(b.assessment!.status) - rank(a.assessment!.status))[0];
    if (worstIndicator?.assessment && worstIndicator.assessment.status !== 'ok') reason = worstIndicator.assessment.reason;

    // Symptoms logged for this system.
    const symptoms: SystemState['symptoms'] = [];
    for (const log of symptomLogs) {
      if (log.crewId !== crewId || !recent(log.missionDay)) continue;
      for (const id of log.symptoms) {
        const info = symptomById(id);
        if (info?.system === system.id && !symptoms.some((s) => s.label === info.label)) symptoms.push({ label: info.label, redFlag: info.redFlag });
      }
    }
    // Red flags from emergencies (open or closed) in the last 3 days.
    for (const e of emergencies) {
      if (e.crewId !== crewId || !recent(e.missionDay)) continue;
      for (const id of e.symptoms) {
        const info = symptomById(id);
        if (info?.system === system.id && !symptoms.some((s) => s.label === info.label)) symptoms.push({ label: info.label, redFlag: true });
      }
    }
    for (const s of symptoms) statuses.push(s.redFlag ? 'act' : 'watch');
    const worstSymptom = symptoms.find((s) => s.redFlag) ?? symptoms[0];
    if (worstSymptom && !reason) reason = `${worstSymptom.redFlag ? 'Red flag' : 'Symptom'} reported: ${worstSymptom.label.toLowerCase()}.`;

    // Systems that only symptoms colour (immune, eyes) are OK until a symptom is reported.
    if (statuses.length === 0 && system.indicators.length === 0) {
      return { system, status: 'ok' as const, items: mine, symptoms, reason: 'No symptoms reported.' };
    }
    if (statuses.length === 0) return { system, status: null, items: mine, symptoms, reason: 'No range is set for this system yet.' };

    const status = worstStatus(statuses);
    if (!reason) reason = assessed[0]?.assessment?.reason ?? 'Everything measured is inside the safe range.';
    return { system, status, items: mine, symptoms, reason };
  });
}

const rank = (s: Status) => (s === 'ok' ? 0 : s === 'watch' ? 1 : 2);
