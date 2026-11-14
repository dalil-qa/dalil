# Dalil Coach Worker

A Cloudflare Worker that holds the Anthropic key and answers `POST /coach` for the app
(contract: `APP_BUILD_GUIDE.md` sections 11.2 to 11.4). Model: `claude-haiku-5-5`.

**Never commit a key.** The key lives only in a Worker secret, or in `worker/.dev.vars` (git-ignored) for local testing.

## Local development
1. Copy `.dev.vars.example` to `.dev.vars` and put the key in it.
2. `npm install`, then `npm run dev` (serves on http://localhost:8787).
3. The app on `http://localhost:5173` or `http://localhost:4173` may call it. Other origins get 403.

Without a key the Worker answers `{"error":"unavailable"}` (503), and the app shows the written guidance cards.

## First deploy (once)
1. Set a **monthly spending limit** on the key in the Anthropic Console.
2. `npx wrangler login` (opens the browser)
3. `npx wrangler secret put ANTHROPIC_API_KEY` (paste the key when asked)
4. `npm run deploy`, and note the `https://dalil-coach.<account>.workers.dev` address.
5. After the app's first Cloudflare Pages deploy, add its `https://<name>.pages.dev` address to `ALLOWED_ORIGINS` in `wrangler.jsonc`, then deploy again.

## Checks
- `npm test` runs the tests (validation, the safety rules, the origin / size guards).
- `npx tsc --noEmit` type-checks. After changing `wrangler.jsonc`, run `npm run cf-typegen`.

## What it guarantees
- Only the allowed origins can call it; bodies over 20 KB are refused.
- Any problem (bad input, no key, timeout, a refusal, a cut-off answer) returns `{"error":"unavailable"}`.
- The answer only cites card ids that were sent, and `escalate` is forced to true whenever a status is `act` or a used card escalates.
- It never logs readings, questions or answers.
