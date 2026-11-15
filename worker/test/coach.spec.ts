import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { buildMessages, finalizeAnswer, parseRequest, type CoachRequest } from '../src/coach';
import { handleCoach, type ModelRunner } from '../src/handler';

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
	it('rejects an answer that names a medication or dosage, while allowing mg/dL blood glucose units', () => {
		expect(finalizeAnswer({ answer: 'Take 400 mg of ibuprofen and rest.', cardIds: [], escalate: false }, req)).toBeNull();
		expect(finalizeAnswer({ answer: 'Take paracetamol for the headache.', cardIds: [], escalate: false }, req)).toBeNull();
		expect(finalizeAnswer({ answer: 'Your blood sugar is 98 mg/dL, which is normal.', cardIds: [], escalate: false }, req)?.answer).toContain('98 mg/dL');
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
});

describe('handleCoach with a fake model', () => {
	const env = { ALLOWED_ORIGINS: 'http://localhost:5173' };
	const call = (runModel: ModelRunner, body: unknown = valid) =>
		handleCoach(
			new Request('https://coach.test/coach', {
				method: 'POST',
				headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			}),
			env,
			runModel,
		);
	const good = { answer: 'Your heart rate is above your normal.', cardIds: ['hr-rising'], escalate: false };

	it('returns the answer when the model sends a JSON string', async () => {
		const res = await call(async () => JSON.stringify(good));
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual(good);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
	});

	it('also accepts an already-parsed object', async () => {
		expect(await (await call(async () => good)).json()).toEqual(good);
	});

	it('sends the model a system prompt first and the question last', async () => {
		let seen: Parameters<ModelRunner>[0] = [];
		await call(async (messages) => {
			seen = messages;
			return good;
		});
		expect(seen[0].role).toBe('system');
		expect(seen.at(-1)?.content).toContain('Why is my heart rate amber?');
	});

	it('says unavailable when the model throws, is cut off, or sends garbage', async () => {
		for (const run of [
			async () => {
				throw new Error('model down');
			},
			async () => '{"answer":"cut off mid-sen',
			async () => 'Sure! Here is some text, not JSON.',
			async () => undefined,
			async () => ({ answer: 5 }),
		] as ModelRunner[]) {
			const res = await call(run);
			expect(res.status).toBe(502);
			expect(await res.json()).toEqual({ error: 'unavailable' });
		}
	});

	it('forces escalate and drops unknown card ids even if the model gets them wrong', async () => {
		const out = (await (await call(async () => ({ answer: 'x', cardIds: ['spo2-low', 'ghost'], escalate: false }))).json()) as { cardIds: string[]; escalate: boolean };
		expect(out.cardIds).toEqual(['spo2-low']);
		expect(out.escalate).toBe(true);
	});

	it('never calls the model for a bad request or a foreign origin', async () => {
		let calls = 0;
		const run: ModelRunner = async () => {
			calls++;
			return good;
		};
		expect((await call(run, { ...valid, question: '' })).status).toBe(400);
		const foreign = await handleCoach(
			new Request('https://coach.test/coach', { method: 'POST', headers: { Origin: 'https://evil.example' }, body: JSON.stringify(valid) }),
			env,
			run,
		);
		expect(foreign.status).toBe(403);
		expect(calls).toBe(0);
	});
});

describe('rate limits', () => {
	const post = () =>
		new Request('https://coach.test/coach', {
			method: 'POST',
			headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7' },
			body: JSON.stringify(valid),
		});
	const good = { answer: 'Your heart rate is above your normal.', cardIds: ['hr-rising'], escalate: false };
	const limiter = (success: boolean, seen: string[] = []) => ({ limit: async ({ key }: { key: string }) => (seen.push(key), { success }) });

	it('answers when both limits allow it, keyed by internet address and for everyone', async () => {
		const seen: string[] = [];
		const res = await handleCoach(post(), { ALLOWED_ORIGINS: 'http://localhost:5173', IP_LIMITER: limiter(true, seen), ALL_LIMITER: limiter(true, seen) }, async () => good);
		expect(res.status).toBe(200);
		expect(seen.sort()).toEqual(['all', 'ip:203.0.113.7']);
	});
	it('returns 429 "unavailable" without calling the model when either limit is used up', async () => {
		for (const env of [
			{ ALLOWED_ORIGINS: 'http://localhost:5173', IP_LIMITER: limiter(false), ALL_LIMITER: limiter(true) },
			{ ALLOWED_ORIGINS: 'http://localhost:5173', IP_LIMITER: limiter(true), ALL_LIMITER: limiter(false) },
		]) {
			let calls = 0;
			const res = await handleCoach(post(), env, async () => (calls++, good));
			expect(res.status).toBe(429);
			expect(await res.json()).toEqual({ error: 'unavailable' });
			expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
			expect(calls).toBe(0);
		}
	});
	it('does not count the browser preflight, and keeps answering if the limiter itself fails', async () => {
		const seen: string[] = [];
		const pre = await handleCoach(
			new Request('https://coach.test/coach', { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173' } }),
			{ ALLOWED_ORIGINS: 'http://localhost:5173', IP_LIMITER: limiter(false, seen) },
			async () => good,
		);
		expect(pre.status).toBe(204);
		expect(seen).toEqual([]);
		const broken = { limit: async () => { throw new Error('limiter down'); } };
		const res = await handleCoach(post(), { ALLOWED_ORIGINS: 'http://localhost:5173', IP_LIMITER: broken }, async () => good);
		expect(res.status).toBe(200);
	});
});
