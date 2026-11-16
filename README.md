# Baseera (بصيرة): crew health, guided by evidence

Built by **Team Baseera** for **NASA Space Apps 2026 (Doha)**, challenge
[Create Health Monitoring Software for Astronauts on Space Missions](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/).
*Baseera* is Arabic for *insight*: seeing clearly.

**Not a medical device: guidance only.** Baseera never diagnoses, and a red result always says to contact the flight surgeon.

Baseera is a daily health self-check for astronauts. A small USB **Crew Health Station** (heart rate, blood oxygen, forehead skin
temperature) feeds a web app that learns each person's own normal, explains what a number means, and says when to act, even
when Earth is up to 22 minutes away.

## What it does
- **Today:** crew health score, streak, and the latest value of every indicator with its status, source and sparkline.
- **Check:** a guided 30-second check (finger, then forehead), then a quick log of blood pressure, sugar, sleep, mood, water, exercise, meals and symptoms. A weak signal gets a hint ("rest your fingertip lightly, keep still") and a **Measure again** button.
- **Body:** an anatomy-chart body figure. Each of 8 systems answers NASA's five questions: what can be measured, why check, how spaceflight affects it, when to act, how to prevent problems. An optional overlay shows which spaceflight hazards affect which systems.
- **Trends:** each indicator against the safe range, the person's own normal and their pre-flight normal, with a summary (now / your normal / before launch / last 7 days) and insights written by rules (no AI).
- **Coach:** answers questions only from written guidance cards, always with their sources. Red-flag words never reach the AI.
- **Earth (flight surgeon):** three steps: the report, sending it (with the signal delay for station, Moon base, rover or Mars), and what to do while waiting. Sending is simulated.
- **Emergency ("I feel unwell now"):** one tap from every screen. Works offline, uses no AI, and sends a PRIORITY report automatically.
- **Arabic and English:** the whole app, mirrored right-to-left in Arabic, with one tap in the header. Health guidance stays in English until a clinician reviews the Arabic.
- **Home mode:** big text, one button, plain words, Heart / Oxygen / Temperature tiles, a family card with Send and Call, and a 999 alert, for older adults at home in Qatar. It uses its own fictional demo person.
- **Light and dark themes:** light by default.
- **Simulator:** the same messages as the real station, so everything can be demoed without hardware. Simulated and sample data are always labelled.

## Live
https://dalil.msulaiman00711.workers.dev (hosted on Cloudflare; deploy with `cd app && npm run build && npx wrangler deploy`).
The address still contains the project's working name; the app itself is Baseera.
- **The Coach Worker** only answers requests from the addresses in `worker/wrangler.jsonc` (`ALLOWED_ORIGINS`). A new address must be added there, and the Worker redeployed.
- **Rate limits:** 20 questions a minute per internet address and 60 a minute overall, to protect the free Workers AI allowance. Over the limit, the app shows the written cards.

## Run it
Needs a recent Node (tested on Node 24 and 26) and Chrome or Edge (Web Serial, for the real station).
```
cd app
npm install
npm run dev          # http://127.0.0.1:5173
```
- `npm test` runs the unit tests (`npm run typecheck:test` type-checks them too). `npm run build` builds to `app/dist`.
- `?simspeed=10` on the address runs the simulator 10 times faster.
- `VITE_COACH_URL` overrides the Coach address (default: the deployed Worker).
- **Browser checks of the whole app**, including Arabic: [scripts/e2e/](scripts/e2e/README.md).
- **The Coach Worker's tests:** `cd worker && npm install && npx vitest run`.

## The Crew Health Station
- **Hardware:** an ESP32 with a MAX30102 (heart rate and SpO2) in a finger slot, an MLX90614 infrared thermometer for forehead skin temperature, a 0.91" OLED, a button, an RGB light and a buzzer.
- **Firmware:** [firmware/](firmware/README.md), with install, upload and test steps for Mac and Windows.
- **Tested on the real station:** the protocol tests and repeated restarts pass. Readings have not yet been compared with medical devices on people.
- **Measurement:** heart rate and SpO2 use Maxim's sample algorithm with signal-quality filtering, a settling time and outlier rejection. A second, beat-by-beat algorithm runs alongside for comparison; it is not yet the default.
- **Skin temperature** is corrected for skin emissivity, and only steady readings are used.
- **Test scripts:** `scripts/station/contract_test.py` checks the station's protocol from a laptop. `scripts/station/algo_test.py` tests the beat-by-beat algorithm on synthetic pulses, no board needed.

## How it is built
```
app/        the web app (React, Vite, TypeScript, Tailwind CSS v4, Zustand, Recharts, Lucide, Motion)
worker/     the Coach: a Cloudflare Worker on Workers AI (no API key to keep)
firmware/   the station's program (ESP32, Arduino)
scripts/    sample-history generator, PDF quote verifier, browser checks and station tests
docs/       health content review log and verified NASA source quotes
```
- **The station talks to the app over USB serial** (Web Serial), one JSON line per message, to a fixed contract.
- **The app works offline.** Only the Coach uses the internet, and it falls back to the written cards.

## AI use (Space Apps asks us to disclose this)
- **The Coach** uses Cloudflare Workers AI (Meta Llama 3.3 70B Instruct). It answers only from the guidance cards the app sends, and it never diagnoses. The Worker and the app re-check its output: known card ids only, and red always escalates.
- **The Emergency page and red-flag detection use no AI.**
- **This code, the firmware and their draft text were written with AI assistance** (Claude Code by Anthropic), directed by Team Baseera and covered by automated tests and browser checks.
- **Health content must be checked by people.** Safe ranges, guidance cards, emergency steps and body-system text were drafted from NASA documents and public health pages (NHS, CDC, WHO, MedlinePlus), with every source cited. A clinician has not reviewed them yet. Where no source gives a limit, it is marked as the team's default. See [docs/CONTENT_REVIEW.md](docs/CONTENT_REVIEW.md) for what each number is based on, the decisions still open, and the sign-off table (empty until someone reviews).

## Sources and licences
- Our code is open source under the [MIT licence](LICENSE).
- **Libraries** (all open source): React, Vite, Tailwind CSS, Zustand, Recharts and Motion (MIT); Lucide (ISC).
- **Firmware libraries:** SparkFun MAX3010x and its examples (MIT), Maxim's SpO2 algorithm, Adafruit MLX90614, SSD1306 and GFX (BSD).
- **Health sources** are listed in the app (Sources screen): NASA-STD-3001 and its Technical Briefs, NASA Human Research Program pages, and the Canadian Space Agency's radiation monitoring page.
- **Web Serial:** [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API).

## Status
Hackathon prototype. Fictional crew members and sample data only; the real station is optional. Not validated against medical devices. Known gaps are tracked by the team.
