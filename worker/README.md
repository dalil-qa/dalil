# Dalil Coach Worker

A Cloudflare Worker that answers `POST /coach` for the app (contract: `APP_BUILD_GUIDE.md` sections 11.2 to 11.3).
The model runs on **Cloudflare Workers AI** through the `AI` binding, so there is **no API key to create, store or leak**.
Model: `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (change the `MODEL` constant in `src/index.ts`; it needs chat input and JSON mode).

## Live address
`https://dalil-coach.msulaiman00711.workers.dev/coach` (deployed 2026-11-14). Only the origins in `ALLOWED_ORIGINS` may call it.

## Deploy
1. `npx wrangler login` (once; opens the browser).
2. `npm run deploy`.

There is no secret to set. Usage is billed to the Cloudflare account that deploys it (check the Workers AI free allowance in the dashboard).
If the allowance runs out, or the model is slow, the Worker answers `{"error":"unavailable"}` and the app shows the written guidance cards.

## When the app is on Cloudflare Pages
Add its `https://<name>.pages.dev` address to `ALLOWED_ORIGINS` in `wrangler.jsonc`, then deploy again.

## Local development
`npm run dev` serves on http://localhost:8787. The `AI` binding always runs remotely on your Cloudflare account, so a local call uses real (small) usage.
The app on `http://localhost:5173` or `http://localhost:4173` may call it.

## Checks
- `npm test` (19 tests: validation, the safety rules, the origin / size guards, and the model path with a fake model). Tests use `wrangler.test.jsonc`, which has no `ai` binding, so they never call Cloudflare.
- `npx tsc --noEmit` type-checks. After changing `wrangler.jsonc`, run `npm run cf-typegen`.

## What it guarantees
- Only the allowed origins can call it; bodies over 20 KB are refused.
- Any problem (bad input, timeout after 12 s, the model failing, a cut-off or garbled answer) returns `{"error":"unavailable"}`.
- The answer only cites card ids that were sent, and `escalate` is forced to true whenever a status is `act` or a used card escalates, even if the model forgets.
- It never logs readings, questions or answers.
