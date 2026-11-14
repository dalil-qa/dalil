# Browser checks (no extra libraries)

These drive the real app in headless Chrome through the DevTools protocol, using only Node's built-in `WebSocket`.
Run them before the Sunday freeze (APP_BUILD_GUIDE section 15).

```
cd app
npm run build
npx vite preview --port 4173 --host 127.0.0.1      # leave this running in one terminal
```
Then, in another terminal, from the `dalil` folder:
```
mkdir shots
node scripts/e2e/phase2.mjs shots     # a full simulated check, quick log, the Emergency path, the red "Act" case
node scripts/e2e/phase3.mjs shots     # landing and tour, Body, Trends, Coach (live and offline), Earth, Sources
```
Each prints PASS / FAIL lines and any console errors, and saves screenshots into the folder you give it.

- `CHROME` sets the Chrome path if it is not in the usual place; `DALIL_URL` sets the address (default `http://127.0.0.1:4173/`).
- The Coach checks call the deployed Worker, so they need internet. The address must be in the Worker's `ALLOWED_ORIGINS`.
- Each run takes about 2 minutes (the simulator runs in real time).
