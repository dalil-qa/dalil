// The HTTP side of POST /coach (APP_BUILD_GUIDE.md section 11), with the model call injected
// so tests can use a fake. Privacy rule: never log readings, questions or answers.
import { MAX_BODY_BYTES, SYSTEM_PROMPT, buildMessages, finalizeAnswer, parseRequest } from './coach';

/** Sends the chat to the model and returns the model's `response` field (a JSON string or an object). */
export type ModelRunner = (messages: { role: 'system' | 'user' | 'assistant'; content: string }[]) => Promise<unknown>;

/** The app waits 15 s, so give up a little earlier and let it show the written cards. */
export const MODEL_TIMEOUT_MS = 12_000;

function allowedOrigins(env: { ALLOWED_ORIGINS: string }): string[] {
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

export async function handleCoach(request: Request, env: { ALLOWED_ORIGINS: string }, runModel: ModelRunner): Promise<Response> {
	const url = new URL(request.url);
	if (url.pathname !== '/coach') return new Response('Not found', { status: 404 });

	// Only our own pages may call this (browsers always send Origin on a cross-origin POST).
	const origin = request.headers.get('Origin');
	if (!origin || !allowedOrigins(env).includes(origin)) return unavailable(403, null);

	if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
	if (request.method !== 'POST') return unavailable(405, origin);

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
