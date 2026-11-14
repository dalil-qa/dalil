// The Dalil Coach Worker: POST /coach (APP_BUILD_GUIDE.md section 11).
// Privacy rule: never log readings, questions or answers.
import Anthropic from '@anthropic-ai/sdk';
import { ANSWER_SCHEMA, MAX_BODY_BYTES, SYSTEM_PROMPT, buildMessages, finalizeAnswer, parseRequest } from './coach';

const MODEL = 'claude-haiku-5-5';

function allowedOrigins(env: Env): string[] {
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

export default {
	async fetch(request, env): Promise<Response> {
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

		if (!env.ANTHROPIC_API_KEY) return unavailable(503, origin);

		try {
			// The app waits 15 s, so give up a little earlier and let it show the cards.
			const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 12_000, maxRetries: 1 });
			const response = await client.messages.create({
				model: MODEL,
				max_tokens: 2048,
				system: SYSTEM_PROMPT,
				messages: buildMessages(req),
				// effort "low" suits short chat answers. No temperature: the current API rejects it.
				output_config: { effort: 'low', format: { type: 'json_schema', schema: ANSWER_SCHEMA } },
			});

			// A refusal, a cut-off answer or anything else unusual counts as unavailable.
			if (response.stop_reason !== 'end_turn') return unavailable(502, origin);
			const text = response.content.find((b) => b.type === 'text');
			if (!text || text.type !== 'text') return unavailable(502, origin);

			const answer = finalizeAnswer(JSON.parse(text.text), req);
			if (!answer) return unavailable(502, origin);
			return Response.json(answer, { headers: corsHeaders(origin) });
		} catch {
			return unavailable(502, origin);
		}
	},
} satisfies ExportedHandler<Env>;
