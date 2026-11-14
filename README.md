# Dalil: crew health, guided by evidence

Team Dalil's entry for **NASA Space Apps 2026 (Doha)**, challenge
[Create Health Monitoring Software for Astronauts on Space Missions](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/).

**Not a medical device: guidance only.** Dalil never diagnoses, and a red result always says to contact the flight surgeon.

Dalil is a daily health self-check for astronauts. A small USB "Crew Health Station" (heart rate, blood oxygen, forehead skin
temperature) feeds a web app that learns each person's own normal, explains what a number means, and says when to act, even
when Earth is up to 22 minutes away.

## What it does
- **Today:** crew health score, streak, and the latest value of every indicator with its status, source and sparkline.
- **Check:** a guided 30-second check (finger, then forehead), then a quick log of blood pressure, sugar, sleep, mood, water, exercise, meals and symptoms.
- **Body:** a clickable body figure. Each of 8 systems answers NASA's five questions: what can be measured, why check, how spaceflight affects it, when to act, how to prevent problems.
- **Trends:** each indicator against the safe range, the person's own normal, and their pre-flight normal, with insights written by rules (no AI).
- **Coach:** answers questions only from written guidance cards, always with their sources. Red-flag words never reach the AI.
- **Earth (flight surgeon):** the report, the signal delay for the chosen mission (station, Moon base, rover, Mars), and what to do while waiting.
- **Emergency ("I feel unwell now"):** one tap from every screen. Works offline, uses no AI, and sends a PRIORITY report automatically.
- **Home mode:** huge text, one big button, results in plain words and "Send to family", for people at home.
- **Simulator:** the same messages as the real station, so everything can be demoed without hardware. Simulated and sample data are always labelled.

## Run it
Needs a recent Node (tested on Node 26) and Chrome or Edge (Web Serial, for the real station).
```
cd app
npm install
npm run dev          # http://127.0.0.1:5173
```
- `npm test` runs the unit tests (`npm run typecheck:test` type-checks them too). `npm run build` builds to `app/dist`.
- `?simspeed=10` on the address runs the simulator 10 times faster.
- `VITE_COACH_URL` overrides the Coach address (default: the deployed Worker).
- Browser checks of the whole app: [scripts/e2e/](scripts/e2e/README.md).

## How it is built
```
app/        the web app (React, Vite, TypeScript, Tailwind CSS v4, Zustand, Recharts, Lucide, Motion)
worker/     the Coach: a Cloudflare Worker on Workers AI (no API key to keep)
firmware/   the station's Arduino program (ESP32), added by the electronics team
scripts/    the sample-history generator and the browser checks
```
The station talks to the app over USB serial (Web Serial), one JSON line per message, to a fixed contract.
The app works offline; only the Coach uses the internet, and it falls back to the written cards.

## AI use (Space Apps asks us to disclose this)
- **The Coach** uses Cloudflare Workers AI (Meta Llama 3.3 70B Instruct). It answers only from the guidance cards the app sends, never diagnoses, and the app re-checks its output (known card ids only, escalate on red).
- **The Emergency page and red-flag detection use no AI.**
- **This code and its draft text were written with AI assistance** (Claude Code by Anthropic), directed by the team and covered by automated tests and browser checks.
- **Health content must be checked by people.** Safe ranges, guidance cards, emergency steps and body-system text start as draft placeholders and are marked DRAFT until the team's health researchers replace them with cited sources. Team review log: _to be filled in by the team before submission._

## Sources and licences
- Our code is open source under the [MIT licence](LICENSE).
- Libraries (all open source): React, Vite, Tailwind CSS, Zustand, Recharts and Motion (MIT); Lucide (ISC).
- Health sources are listed in the app (Sources screen) and in the planning repository: NASA-STD-3001 and its Technical Briefs, NASA Human Research Program pages, and the Canadian Space Agency's radiation monitoring page.
- Web Serial: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API).

## Status
Hackathon prototype. Fictional crew members and sample data only; the real station is optional. Known gaps are tracked by the team.
