// The Dalil Coach Worker: POST /coach (APP_BUILD_GUIDE.md section 11).
// The model runs on Cloudflare Workers AI through the `AI` binding, so there is no API key to manage.
import { ANSWER_SCHEMA } from './coach';
import { handleCoach } from './handler';

// Swap the model here. Needs chat `messages` input and JSON mode (`response_format: json_schema`).
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

export default {
	async fetch(request, env): Promise<Response> {
		return handleCoach(request, env, async (messages) => {
			const result = await env.AI.run(MODEL, {
				messages,
				max_tokens: 800, // answers are at most about 120 words; summaries a little longer
				temperature: 0.2, // steady wording: the same data should give the same advice
				response_format: { type: 'json_schema', json_schema: ANSWER_SCHEMA },
			});
			return (result as { response?: unknown }).response;
		});
	},
} satisfies ExportedHandler<Env>;
