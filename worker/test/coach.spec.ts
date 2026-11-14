import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { buildMessages, finalizeAnswer, parseRequest, type CoachRequest } from '../src/coach';

const card = (id: string, escalate = false) => ({
	id,
	title: `Card ${id}`,
	meaning: 'Meaning.',
	actions: ['Rest.'],
	escalate,
	sources: [{ title: 'NASA-STD-3001', url: 'https://example.com' }],
});

const valid = {
	mode: 'chat',
	mission: { id: 'mars', day: 47 },
	assessments: [{ indicator: 'hr', value: 74, status: 'watch', reason: 'Nine above your normal.' }],
	symptoms: ['dizziness'],
	cards: [card('hr-rising'), card('spo2-low', true)],
	question: 'Why is my heart rate amber?',
	history: [],
};

describe('parseRequest', () => {
	it('accepts the contract example', () => {
		expect(parseRequest(valid)?.mode).toBe('chat');
	});
	it('needs a question in chat mode but not in summary mode', () => {
		expect(parseRequest({ ...valid, question: '' })).toBeNull();
		expect(parseRequest({ ...valid, mode: 'summary', question: undefined })?.question).toBeNull();
	});
	it('rejects a question over 500 characters', () => {
		expect(parseRequest({ ...valid, question: 'x'.repeat(501) })).toBeNull();
	});
	it('rejects more than 6 history messages and unknown missions or statuses', () => {
		const m = { role: 'user', text: 'hi' };
		expect(parseRequest({ ...valid, history: Array(7).fill(m) })).toBeNull();
		expect(parseRequest({ ...valid, mission: { id: 'venus', day: 1 } })).toBeNull();
		expect(parseRequest({ ...valid, assessments: [{ ...valid.assessments[0], status: 'red' }] })).toBeNull();
	});
	it('never throws on junk', () => {
		for (const junk of [null, 5, 'x', [], {}, { mode: 'chat' }]) expect(parseRequest(junk)).toBeNull();
	});
});

describe('buildMessages', () => {
	it('starts with a user turn and puts the data and question last', () => {
		const req = parseRequest({ ...valid, history: [{ role: 'assistant', text: 'old' }, { role: 'user', text: 'q1' }, { role: 'assistant', text: 'a1' }] })!;
		const msgs = buildMessages(req);
		expect(msgs[0].role).toBe('user');
		expect(msgs.at(-1)?.content).toContain('Why is my heart rate amber?');
		expect(msgs.at(-1)?.content).toContain('hr-rising');
	});
});

describe('finalizeAnswer', () => {
	const req = parseRequest(valid) as CoachRequest;
	it('keeps only known card ids and removes duplicates', () => {
		const out = finalizeAnswer({ answer: 'ok', cardIds: ['hr-rising', 'made-up', 'hr-rising'], escalate: false }, req);
		expect(out?.cardIds).toEqual(['hr-rising']);
	});
	it('escalates when a used card escalates, even if the model forgot', () => {
		expect(finalizeAnswer({ answer: 'x', cardIds: ['spo2-low'], escalate: false }, req)?.escalate).toBe(true);
	});
	it('escalates when any assessment is act', () => {
		const act = parseRequest({ ...valid, assessments: [{ ...valid.assessments[0], status: 'act' }] })!;
		expect(finalizeAnswer({ answer: 'x', cardIds: [], escalate: false }, act)?.escalate).toBe(true);
	});
	it('rejects an empty or malformed answer', () => {
		expect(finalizeAnswer({ answer: '  ', cardIds: [], escalate: false }, req)).toBeNull();
		expect(finalizeAnswer({ answer: 'x', cardIds: 'no', escalate: false }, req)).toBeNull();
		expect(finalizeAnswer(null, req)).toBeNull();
	});
});

describe('POST /coach guards', () => {
	const post = (headers: Record<string, string>, body: string) =>
		SELF.fetch('https://coach.test/coach', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body });

	it('refuses requests with no Origin or a foreign Origin', async () => {
		expect((await post({}, JSON.stringify(valid))).status).toBe(403);
		expect((await post({ Origin: 'https://evil.example' }, JSON.stringify(valid))).status).toBe(403);
	});
	it('answers the browser preflight for an allowed origin', async () => {
		const res = await SELF.fetch('https://coach.test/coach', { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173' } });
		expect(res.status).toBe(204);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
	});
	it('rejects bodies over 20 KB and bad JSON with the same error shape', async () => {
		const big = await post({ Origin: 'http://localhost:5173' }, 'x'.repeat(21 * 1024));
		expect(big.status).toBe(413);
		expect(await big.json()).toEqual({ error: 'unavailable' });
		expect((await post({ Origin: 'http://localhost:5173' }, '{nope')).status).toBe(400);
	});
	it('says unavailable (so the app shows the cards) when no key is set', async () => {
		const res = await post({ Origin: 'http://localhost:5173' }, JSON.stringify(valid));
		expect(res.status).toBe(503);
		expect(await res.json()).toEqual({ error: 'unavailable' });
	});
});
