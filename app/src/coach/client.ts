// Talks to the Coach Worker (APP_BUILD_GUIDE.md 11.2 / 11.3 / 11.5). 15 s timeout; any problem is a plain
// `{ ok: false }` so the app can show the written guidance cards instead.
import type { GuidanceCard, MissionId, Status } from '../types.ts';

/** The deployed Worker. Override with VITE_COACH_URL (for example when running `wrangler dev`). */
export const COACH_URL: string =
  ((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_COACH_URL) ?? 'https://dalil-coach.msulaiman00711.workers.dev';

export const COACH_TIMEOUT_MS = 15_000;
export const MAX_QUESTION_CHARS = 500;
export const MAX_HISTORY = 6;

export interface CoachRequestBody {
  mode: 'chat' | 'summary';
  mission: { id: MissionId; day: number };
  assessments: { indicator: string; value: number; status: Status; reason: string }[];
  symptoms: string[];
  cards: Pick<GuidanceCard, 'id' | 'title' | 'meaning' | 'actions' | 'escalate' | 'sources'>[];
  question?: string;
  history: { role: 'user' | 'assistant'; text: string }[];
}

export interface CoachReply {
  answer: string;
  cardIds: string[];
  escalate: boolean;
}

export type CoachResult = { ok: true; reply: CoachReply } | { ok: false };

/** Trims the request to what the Worker accepts: no names, a 500-character question, the last 6 messages. */
export function prepareBody(body: CoachRequestBody): CoachRequestBody {
  return {
    ...body,
    question: body.question === undefined ? undefined : body.question.slice(0, MAX_QUESTION_CHARS),
    history: body.history.slice(-MAX_HISTORY).map((m) => ({ role: m.role, text: m.text.slice(0, 1200) })),
  };
}

function isReply(v: unknown): v is CoachReply {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.answer === 'string' && r.answer.trim() !== '' && Array.isArray(r.cardIds) && r.cardIds.every((c) => typeof c === 'string') && typeof r.escalate === 'boolean';
}

export async function askCoach(body: CoachRequestBody, fetchImpl: typeof fetch = fetch, timeoutMs = COACH_TIMEOUT_MS): Promise<CoachResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${COACH_URL}/coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prepareBody(body)),
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false };
    const data: unknown = await res.json();
    return isReply(data) ? { ok: true, reply: data } : { ok: false };
  } catch {
    return { ok: false }; // offline, timed out, blocked or not JSON
  } finally {
    clearTimeout(timer);
  }
}
