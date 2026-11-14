// Which guidance cards apply right now. The app picks the cards and sends only those to the Coach,
// so the AI never sees a card it can't cite (APP_BUILD_GUIDE.md 11.2).
import { cardById, cards, symptomById } from '../data/index.ts';
import type { Assessment, GuidanceCard, SymptomId, SymptomLog } from '../types.ts';

export const SYMPTOM_WINDOW_DAYS = 3;

/** Symptoms this crew member logged in the last 3 mission days (today included). */
export function recentSymptomIds(logs: SymptomLog[], crewId: string, day: number): SymptomId[] {
  const out = new Set<SymptomId>();
  for (const l of logs) {
    if (l.crewId === crewId && l.missionDay > day - SYMPTOM_WINDOW_DAYS && l.missionDay <= day) l.symptoms.forEach((s) => out.add(s));
  }
  return [...out];
}

/** Cards for watch (amber) and act (red) statuses, then the cards of recent symptoms. No duplicates. */
export function cardsFor(assessments: Assessment[], symptomIds: SymptomId[]): GuidanceCard[] {
  const found = new Map<string, GuidanceCard>();
  for (const a of assessments) {
    if (a.status === 'ok') continue;
    const level = a.status === 'watch' ? 'amber' : 'red';
    // Blood pressure's top and bottom numbers share one set of cards (filed under bp_sys).
    const indicator = a.indicator === 'bp_dia' ? 'bp_sys' : a.indicator;
    for (const c of cards) if (c.indicator === indicator && c.level === level) found.set(c.id, c);
  }
  for (const id of symptomIds) {
    const cardId = symptomById(id)?.cardId;
    const c = cardId ? cardById(cardId) : undefined;
    if (c) found.set(c.id, c);
  }
  return [...found.values()].slice(0, 16); // the Worker accepts at most 16
}
