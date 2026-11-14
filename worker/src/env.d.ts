// The secret is set with `npx wrangler secret put ANTHROPIC_API_KEY` (or worker/.dev.vars locally).
// Vars from wrangler.jsonc (ALLOWED_ORIGINS) come from the generated worker-configuration.d.ts.
interface Env {
	ANTHROPIC_API_KEY: string;
}
