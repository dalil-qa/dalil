// The HTTP side of POST /coach (APP_BUILD_GUIDE.md section 11), with the model call injected
// so tests can use a fake. Privacy rule: never log readings, questions or answers.
import { MAX_BODY_BYTES, SYSTEM_PROMPT, buildMessages, finalizeAnswer, parseRequest } from './coach';

/** Sends the chat to the model and returns the model's `response` field (a JSON string or an object). */
export type ModelRunner = (messages: { role: 'system' | 'user' | 'assistant'; content: string }[]) => Promise<unknown>;

/** Cloudflare's rate-limiting binding (wrangler.jsonc "ratelimits"): `limit()` says whether this request is allowed. */
export interface Limiter {
	limit(options: { key: string }): Promise<{ success: boolean }>;
}

/** What the handler needs from the Worker's environment. The limiters are optional so tests can leave them out. */
export interface CoachEnv {
	ALLOWED_ORIGINS: string;
	/** Per internet address (generous: a whole venue can share one Wi-Fi address). */
	IP_LIMITER?: Limiter;
	/** Everyone together: the ceiling that protects the free Workers AI daily allowance. */
	ALL_LIMITER?: Limiter;
}

/**
 * True when either limit is used up. Fails OPEN: if the limiter itself errors, the Coach keeps answering,
 * because a broken limiter must not take the Coach down during a demo.
 */
async function overLimit(request: Request, env: CoachEnv): Promise<boolean> {
	try {
		const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
		const results = await Promise.all([env.IP_LIMITER?.limit({ key: `ip:${ip}` }), env.ALL_LIMITER?.limit({ key: 'all' })]);
		return results.some((r) => r !== undefined && !r.success);
	} catch {
		return false;
	}
}

/** The app waits 15 s, so give up a little earlier and let it show the written cards. */
export const MODEL_TIMEOUT_MS = 12_000;

function allowedOrigins(env: CoachEnv): string[] {
	return env.ALLOWED_ORIGINS.split(',')
		.map((o) => o.trim())
		.filter(Boolean);
}

function corsHeaders(origin: string): HeadersInit {
	return {
		'Access-Control-Allow-Origin': origin,
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Access-Control-Max-Age': '86400',
		Vary: 'Origin',
	};
}

/** Every problem looks the same to the app: it then shows the written cards instead. */
function unavailable(status: number, origin: string | null): Response {
	return Response.json({ error: 'unavailable' }, { status, headers: origin ? corsHeaders(origin) : {} });
}

/** The model may hand back a JSON string or an already-parsed object. Anything else is unusable. */
function toObject(value: unknown): unknown {
	if (typeof value === 'string') {
		try {
			return JSON.parse(value);
		} catch {
			return null;
		}
	}
	return typeof value === 'object' ? value : null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error('timeout')), ms);
		promise.then(
			(v) => {
				clearTimeout(timer);
				resolve(v);
			},
			(e) => {
				clearTimeout(timer);
				reject(e);
			},
		);
	});
}

export async function handleCoach(request: Request, env: CoachEnv, runModel: ModelRunner): Promise<Response> {
	const url = new URL(request.url);
	if (url.pathname !== '/coach') return new Response('Not found', { status: 404 });

	// Only our own pages may call this (browsers always send Origin on a cross-origin POST).
	const origin = request.headers.get('Origin');
	if (!origin || !allowedOrigins(env).includes(origin)) return unavailable(403, null);

	if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
	if (request.method !== 'POST') return unavailable(405, origin);

	// Too many questions: the same "unavailable" reply as any other problem, so the app shows the written cards.
	if (await overLimit(request, env)) return unavailable(429, origin);

	// Reject big bodies before and after reading them (Content-Length can be missing or wrong).
	const declared = Number(request.headers.get('Content-Length') ?? 0);
	if (declared > MAX_BODY_BYTES) return unavailable(413, origin);
	const raw = await request.text();
	if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return unavailable(413, origin);

	let body: unknown;
	try {
		body = JSON.parse(raw);
	} catch {
		return unavailable(400, origin);
	}
	const req = parseRequest(body);
	if (!req) return unavailable(400, origin);

	try {
		// Workers AI has no separate system field: the rules go first in the message list.
		const messages = [{ role: 'system' as const, content: SYSTEM_PROMPT }, ...buildMessages(req)];
		const output = await withTimeout(runModel(messages), MODEL_TIMEOUT_MS);
		// finalizeAnswer re-checks the shape and re-applies the safety rules; a cut-off or garbled answer is null.
		const answer = finalizeAnswer(toObject(output), req);
		if (!answer) return unavailable(502, origin);
		return Response.json(answer, { headers: corsHeaders(origin) });
	} catch {
		return unavailable(502, origin);
	}
}
