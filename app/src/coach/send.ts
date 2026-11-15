// What happens when someone sends a message to the Coach (APP_BUILD_GUIDE.md 10.6 and 12.5).
// The red-flag word check runs BEFORE anything is sent to the AI.
import { cardById, cards as allCards } from '../data/index.ts';
import { detectRedFlags } from '../logic/emergency.ts';
import { latestAssessments } from '../logic/overview.ts';
import { cardsFor, recentSymptomIds } from '../logic/cards.ts';
import { useNav } from '../nav.ts';
import { useSession } from '../session.ts';
import { useStore } from '../store.ts';
import type { Assessment, GuidanceCard } from '../types.ts';
import { MAX_HISTORY, MAX_QUESTION_CHARS, askCoach, type CoachRequestBody } from './client.ts';

export const URGENT_NOTE = "This sounds urgent, so Baseera is skipping the Coach. If it isn't an emergency, close this page and rephrase.";
export const OFFLINE_NOTE = 'Offline: showing the guidance cards.';
export const NO_CARD_NOTE = 'The Coach could not be reached, and no guidance card matches your readings right now.';

/** The assessments, symptoms and cards the Coach is allowed to see for the selected crew member. */
export function coachContext() {
  const { crewId, missionDay, readings, symptoms: logs } = useStore.getState();
  const items = latestAssessments(readings, crewId, missionDay);
  const assessments: Assessment[] = items.flatMap((i) => (i.assessment ? [i.assessment] : []));
  const symptomIds = recentSymptomIds(logs, crewId, missionDay);
  return { crewId, missionDay, assessments, symptomIds, cards: cardsFor(assessments, symptomIds) };
}

export function toRequestBody(mode: 'chat' | 'summary', question?: string): CoachRequestBody {
  const { crewId, missionDay, assessments, symptomIds, cards } = coachContext();
  const { missionId } = useStore.getState();
  const history = (useSession.getState().chats[crewId] ?? []).flatMap((m) => (m.role === 'system' || m.fallback ? [] : [{ role: m.role as 'user' | 'assistant', text: m.text }]));
  return {
    mode,
    mission: { id: missionId, day: missionDay },
    // No names ever leave the app: only indicators, values, statuses and reasons.
    assessments: assessments.map((a) => ({ indicator: a.indicator, value: a.value, status: a.status, reason: a.reason })),
    symptoms: symptomIds,
    cards: cards.map((c) => ({ id: c.id, title: c.title, meaning: c.meaning, actions: c.actions, escalate: c.escalate, sources: c.sources })),
    question,
    history: history.slice(-MAX_HISTORY),
  };
}

/** Returns what happened, for tests and for the screen. */
export async function sendCoachMessage(raw: string, fetchImpl: typeof fetch = fetch): Promise<'emergency' | 'answered' | 'offline' | 'ignored'> {
  const text = raw.trim().slice(0, MAX_QUESTION_CHARS);
  const session = useSession.getState();
  if (!text || session.sending) return 'ignored';
  const crewId = useStore.getState().crewId;

  session.addMessage(crewId, { role: 'user', text });

  // 1. The word check comes first. A red flag never reaches the AI.
  const flags = detectRedFlags(text);
  if (flags.length > 0) {
    useStore.getState().openEmergency('coach', flags);
    useNav.getState().showEmergency();
    useSession.getState().addMessage(crewId, { role: 'system', text: URGENT_NOTE });
    return 'emergency';
  }

  // 2. Ask the Worker. Any problem falls back to the written cards.
  useSession.getState().setSending(true);
  try {
    const body = toRequestBody('chat', text);
    // The question is sent as `question`, so the history must not repeat it.
    body.history = body.history.slice(0, -1);
    const result = await askCoach(body, fetchImpl);
    if (result.ok) {
      // Only cards that were actually sent can be cited.
      const sent = new Set(body.cards.map((c) => c.id));
      useSession.getState().addMessage(crewId, { role: 'assistant', text: result.reply.answer, cardIds: result.reply.cardIds.filter((id) => sent.has(id)), escalate: result.reply.escalate });
      return 'answered';
    }
    const matching = coachContext().cards;
    useSession.getState().addMessage(crewId, {
      role: 'assistant',
      text: matching.length ? OFFLINE_NOTE : NO_CARD_NOTE,
      cardIds: matching.map((c) => c.id),
      fallback: true,
    });
    return 'offline';
  } finally {
    useSession.getState().setSending(false);
  }
}

/** Cards that can be shown for a message (looked up by id, skipping unknown ones). */
export function cardsByIds(ids: string[] | undefined): GuidanceCard[] {
  return (ids ?? []).flatMap((id) => {
    const c = cardById(id);
    return c ? [c] : [];
  });
}

export { allCards };
