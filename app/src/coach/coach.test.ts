import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { useSession } from '../session.ts';
import { useStore } from '../store.ts';
import { askCoach, prepareBody, type CoachRequestBody } from './client.ts';
import { NO_CARD_NOTE, OFFLINE_NOTE, URGENT_NOTE, coachContext, sendCoachMessage } from './send.ts';

const body = (over: Partial<CoachRequestBody> = {}): CoachRequestBody => ({
  mode: 'chat', mission: { id: 'mars', day: 47 }, assessments: [], symptoms: [], cards: [], question: 'hi', history: [], ...over,
});
const jsonResponse = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const calls: { url: string; body: CoachRequestBody }[] = [];
const fakeFetch = (respond: () => Response | Promise<Response>): typeof fetch =>
  (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return respond();
  }) as typeof fetch;

beforeEach(() => {
  calls.length = 0;
  useSession.getState().clear();
  useStore.setState({ crewId: 'c2', missionId: 'mars', missionDay: 47, emergency: null, emergencies: [] });
});

describe('askCoach', () => {
  it('returns the reply from a good response', async () => {
    const r = await askCoach(body(), fakeFetch(() => jsonResponse({ answer: 'Rest.', cardIds: ['hr-rising'], escalate: false })));
    assert.deepEqual(r, { ok: true, reply: { answer: 'Rest.', cardIds: ['hr-rising'], escalate: false } });
    assert.match(calls[0].url, /\/coach$/);
  });
  it('is not ok for an error status, an {error} body, a malformed body, a network failure or a timeout', async () => {
    for (const f of [
      fakeFetch(() => jsonResponse({ error: 'unavailable' }, 503)),
      fakeFetch(() => jsonResponse({ error: 'unavailable' })),
      fakeFetch(() => jsonResponse({ answer: 5 })),
      fakeFetch(() => new Response('not json', { status: 200 })),
      (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch,
    ]) assert.deepEqual(await askCoach(body(), f), { ok: false });
    const slow = ((_u: string, init?: RequestInit) => new Promise((_res, rej) => init?.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError'))))) as unknown as typeof fetch;
    assert.deepEqual(await askCoach(body(), slow, 30), { ok: false });
  });
  it('trims the question to 500 characters and the history to 6 messages', () => {
    const h = Array.from({ length: 9 }, (_, i) => ({ role: 'user' as const, text: `m${i}` }));
    const b = prepareBody(body({ question: 'x'.repeat(900), history: h }));
    assert.equal(b.question?.length, 500);
    assert.deepEqual(b.history.map((m) => m.text), ['m3', 'm4', 'm5', 'm6', 'm7', 'm8']);
  });
});

describe('sendCoachMessage', () => {
  it('a red-flag message never reaches the AI: it opens the emergency and explains why', async () => {
    const r = await sendCoachMessage('I have crushing chest pain', fakeFetch(() => jsonResponse({ answer: 'x', cardIds: [], escalate: false })));
    assert.equal(r, 'emergency');
    assert.equal(calls.length, 0);
    assert.deepEqual(useStore.getState().emergency?.symptoms, ['chest_pain']);
    assert.equal(useStore.getState().emergency?.trigger, 'coach');
    const chat = useSession.getState().chats.c2;
    assert.equal(chat.at(-1)?.role, 'system');
    assert.equal(chat.at(-1)?.text, URGENT_NOTE);
    useStore.getState().closeEmergency('mistake');
  });

  it('an ordinary question sends only the matching cards and no names, and shows the answer with its sources', async () => {
    const r = await sendCoachMessage('Why is my resting heart rate amber?', fakeFetch(() => jsonResponse({ answer: 'It is above your normal.', cardIds: ['hr-rising', 'ghost'], escalate: false })));
    assert.equal(r, 'answered');
    const sent = calls[0].body;
    assert.deepEqual(sent.cards.map((c) => c.id).sort(), ['hr-rising', 'meals-low', 'mood-low', 'sleep-low', 'symptom-fatigue', 'water-low']); // the cards for Crew Member 2's Watch statuses and recent symptom
    assert.equal(sent.question, 'Why is my resting heart rate amber?');
    assert.deepEqual(sent.history, []); // the question is not repeated in the history
    assert.ok(!JSON.stringify(sent).includes('Crew Member'));
    assert.ok(sent.assessments.some((a) => a.indicator === 'hr' && a.status === 'watch'));
    const last = useSession.getState().chats.c2.at(-1);
    assert.deepEqual(last?.cardIds, ['hr-rising']); // 'ghost' was never sent, so it can't be cited
  });

  it('when the Worker cannot be reached it shows the matching cards instead', async () => {
    const r = await sendCoachMessage('Why is my heart rate amber?', (async () => { throw new TypeError('offline'); }) as unknown as typeof fetch);
    assert.equal(r, 'offline');
    const last = useSession.getState().chats.c2.at(-1);
    assert.equal(last?.text, OFFLINE_NOTE);
    assert.equal(last?.fallback, true);
    assert.deepEqual([...(last?.cardIds ?? [])].sort(), ['hr-rising', 'meals-low', 'mood-low', 'sleep-low', 'symptom-fatigue', 'water-low']);
  });

  it('says so plainly when offline and no card matches', async () => {
    useStore.setState({ crewId: 'c1' });
    await sendCoachMessage('How is my health today?', (async () => { throw new TypeError('offline'); }) as unknown as typeof fetch);
    assert.equal(useSession.getState().chats.c1.at(-1)?.text, NO_CARD_NOTE);
    assert.deepEqual(coachContext().cards, []);
  });

  it('ignores empty messages, and keeps follow-up history for the next question', async () => {
    assert.equal(await sendCoachMessage('   '), 'ignored');
    await sendCoachMessage('Why is my heart rate amber?', fakeFetch(() => jsonResponse({ answer: 'First answer.', cardIds: [], escalate: false })));
    await sendCoachMessage('And what can I do?', fakeFetch(() => jsonResponse({ answer: 'Second.', cardIds: [], escalate: false })));
    assert.deepEqual(calls[1].body.history, [{ role: 'user', text: 'Why is my heart rate amber?' }, { role: 'assistant', text: 'First answer.' }]);
  });
});
