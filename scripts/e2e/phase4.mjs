// End-to-end driver for Phase 4: APP_BUILD_GUIDE.md section 15.1 (everything that does not need the real station),
// plus Home mode and reduced motion. Chrome DevTools Protocol over Node's built-in WebSocket; no extra libraries.
// Usage: node scripts/e2e/phase4.mjs <screenshot-folder>   (see README.md in this folder)
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = (process.env.DALIL_URL ?? 'http://127.0.0.1:4173/').replace(/[?#].*$/, '');
const OUT = process.argv[2];
const PORT = 9335;
const profile = mkdtempSync(join(tmpdir(), 'dalil-e2e4-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let targets;
for (let i = 0; i < 40; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.some((t) => t.type === 'page')) break; } catch { /* not up yet */ }
  await sleep(250);
}
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
const problems = [];
const workerRequests = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
  if (msg.method === 'Runtime.exceptionThrown') problems.push('EXCEPTION ' + (msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text));
  if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) problems.push(msg.params.type.toUpperCase() + ' ' + msg.params.args.map((a) => a.value ?? a.description).join(' '));
  if (msg.method === 'Network.requestWillBeSent' && msg.params.request.url.includes('workers.dev')) workerRequests.push(msg.params.request.url);
};
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
const text = () => evalJs('document.body.innerText');
const SEL = 'button,[role=radio],[role=tab],g[role=button],summary,a';
const click = (label) => evalJs(`(() => { const b=[...document.querySelectorAll(${JSON.stringify(SEL)})].find(x => (x.getAttribute('aria-label')||x.innerText||'').trim().includes(${JSON.stringify(label)})); if(!b) return false; b.dispatchEvent(new MouseEvent('click',{bubbles:true})); return true; })()`);
const waitFor = async (needle, ms = 20000) => { const end = Date.now() + ms; while (Date.now() < end) { if ((await text()).includes(needle)) return true; await sleep(200); } return false; };
const waitForAny = async (needles, ms = 20000) => { const end = Date.now() + ms; while (Date.now() < end) { const t = await text(); const hit = needles.find((n) => t.includes(n)); if (hit) return hit; await sleep(200); } return null; };
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(OUT, name + '.png'), Buffer.from(r.result.data, 'base64')); };
const hash = async (h) => { await evalJs(`location.hash=${JSON.stringify('#' + h)}`); await sleep(400); };
const setValue = (sel, v, proto = 'HTMLInputElement') => evalJs(`(() => { const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return false; const d=Object.getOwnPropertyDescriptor(${proto}.prototype,'value'); d.set.call(el,${JSON.stringify(v)}); el.dispatchEvent(new Event(${proto === 'HTMLSelectElement' ? "'change'" : "'input'"},{bubbles:true})); return true; })()`);
const pick = (sel, v) => setValue(sel, v, 'HTMLSelectElement');
const key = async (k, code, vk) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk }); };
const viewport = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
const results = [];
const check = (name, ok, extra = '') => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`); };

/** A completely fresh load: empty browser storage, optional hash, fast simulator. */
async function fresh(h = 'today') {
  await send('Page.navigate', { url: 'about:blank' });
  await send('Storage.clearDataForOrigin', { origin: new URL(ROOT).origin, storageTypes: 'local_storage,session_storage' });
  await send('Page.navigate', { url: `${ROOT}?simspeed=20#${h}` });
  await sleep(1500);
}
/** Runs a simulated check from the Check screen and waits for a result or an error. */
async function runCheck() {
  await hash('check');
  const label = (await text()).includes('Start check (simulator)') ? 'Start check (simulator)' : 'Start check';
  await click(label);
  return waitForAny(['Your result', 'Check cancelled', "That didn't work", 'Home mode result'], 25000);
}
const setScenario = async (s) => { await hash('settings'); await pick('#scenario', s); await sleep(150); };

await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await viewport(1280, 800);

// ============ 5 & 6: every simulator scenario, and the Pulse Sensor case
await fresh('today');
const expect5 = [
  ['normal', 'Your result', 'OK'],
  ['watch', 'Your result', 'Watch'],
  ['act', 'Your result', 'Call surgeon'],
];
for (const [scenario, , word] of expect5) {
  await fresh('settings'); await pick('#scenario', scenario); await sleep(150);
  const r = await runCheck();
  const t = await text();
  check(`Scenario ${scenario}: result shows ${word}`, r === 'Your result' && new RegExp(`Your result\\s*\\n?.*${word}`, 's').test(t), r ?? 'timeout');
}
await fresh('settings'); await pick('#scenario', 'bad_signal');
let r = await runCheck();
check('Scenario bad_signal: "too weak to trust" message', r === "That didn't work" && (await text()).includes("didn't guess"), r ?? 'timeout');
await fresh('settings'); await pick('#scenario', 'no_finger');
r = await runCheck();
check('Scenario no_finger: "No finger detected" message', r === "That didn't work" && (await text()).includes('No finger detected'), r ?? 'timeout');
await fresh('settings'); await pick('#scenario', 'pulse_sensor');
r = await runCheck();
const pulseResult = await text();
check('Pulse Sensor: result has heart rate and skin temperature but no SpO2 value', r === 'Your result' && /Resting heart rate/.test(pulseResult) && !/\nSpO2\b/.test(pulseResult.split('What this means')[0]));
await click('Continue'); await sleep(400);
check('Pulse Sensor: the quick log offers a typed SpO2 box', await evalJs(`!!document.querySelector('[aria-label=SpO2]')`));
await shot('p4-5-pulse-quicklog');

// ============ 7 & 17 & 18: offline, then an emergency, then closing it
await fresh('today');
await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
r = await runCheck();
check('Offline: a full simulated check still works', r === 'Your result');
await hash('body'); check('Offline: Body works', (await text()).includes('Heart and circulation'));
await hash('trends'); await sleep(900); check('Offline: Trends works', (await evalJs(`document.querySelectorAll('.recharts-line').length`)) >= 1);
await click('I feel unwell now'); await sleep(500);
let t = await text();
check('Offline: Emergency opens and the report is sent', t.includes('EMERGENCY') && t.includes('PRIORITY report sent'));
await click('Alert crew'); await sleep(200);
check('Offline: Alert crew works', (await text()).includes('Crew alerted:'));
await click('Back to app'); await hash('earth'); await sleep(400);
check('Offline: the report appears on the Flight Surgeon screen', (await text()).includes('PRIORITY · Day 47'));
await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
await click('Return to emergency page'); await sleep(300);
await click("I'm safe now"); await sleep(250);
check('Closing asks for a reason first (event still open)', (await text()).includes('Why are you closing this?') && (await text()).includes('EMERGENCY'));
await click('Opened by mistake'); await sleep(500);
await hash('today'); await sleep(300);
check('After closing: Today shows the banner', /Emergency on Day 47 at \d\d:\d\d: report sent/.test(await text()));
await hash('earth'); await sleep(300);
check('After closing: the event is in the history', (await text()).includes('Priority reports from emergencies'));

// ============ 8: guest check, reload, and the next guest sees nothing
await fresh('today');
await pick('#crew', 'guest'); await sleep(300);
check('Guest banner is shown, with "End guest session"', (await text()).includes('Guest mode: nothing is saved.') && (await text()).includes('End guest session'));
r = await runCheck();
check('Guest: a check works', r === 'Your result');
await click('Continue'); await sleep(200); await click('Skip'); await sleep(400);
check('Guest: the check shows on Today', (await text()).includes('Resting heart rate'));
const stored = await evalJs(`localStorage.getItem('dalil-v1') ?? ''`);
check('Guest: nothing about the guest is in browser storage', !stored.includes('guest'), stored.length + ' chars stored');
await click('End guest session'); await sleep(400);
check('"End guest session" returns to Crew Member 2', (await evalJs(`document.querySelector('#crew').value`)) === 'c2');
await pick('#crew', 'guest'); await sleep(300);
check('A new guest session starts empty (no values from the last guest)', (await text()).includes('No readings yet'));
await send('Page.reload'); await sleep(1800);
check('Reload: back on the demo crew member, no guest data', (await evalJs(`document.querySelector('#crew')?.value`)) === 'c2');

// ============ 9: a browser without Web Serial (Safari, Firefox, phone)
const noSerial = await send('Page.addScriptToEvaluateOnNewDocument', { source: 'delete Navigator.prototype.serial;' });
await fresh('check');
t = await text();
check('No Web Serial: shows "needs Chrome or Edge" and no Connect button', t.includes('Live checks need Chrome or Edge on a computer') && !t.includes('Connect station'));
r = await runCheck();
check('No Web Serial: the simulator still works', r === 'Your result');
await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: noSerial.result.identifier });

// ============ 10: browser storage blocked (private window, blocked site data)
const blocked = await send('Page.addScriptToEvaluateOnNewDocument', { source: "Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError')}});" });
await send('Page.navigate', { url: 'about:blank' });
await send('Page.navigate', { url: `${ROOT}?simspeed=20` }); await sleep(1500);
check('Storage blocked: the landing page still shows', (await text()).includes('Explore the demo mission'));
await click('Explore the demo mission'); await sleep(500);
check('Storage blocked: the demo mission and tour work', (await text()).includes('1 of 3 · Today') && (await text()).includes('Heart rate'));
r = await runCheck();
check('Storage blocked: a check still works', r === 'Your result');
await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: blocked.result.identifier });

// ============ 11: sizes, overflow and text size (1280x800 and 1024x768)
const SCREENS = ['today', 'check', 'body', 'trends', 'coach', 'earth', 'sources', 'settings'];
const tiny = `(() => { const out=[]; const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT); let n; while((n=walk.nextNode())){ const s=n.textContent.trim(); if(!s) continue; const el=n.parentElement; if(!el||el.closest('.sr-only')) continue; const cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden') continue; const r=el.getBoundingClientRect(); if(r.width===0||r.height===0) continue; const px=parseFloat(cs.fontSize); if(px<13.9) out.push(px+'px: '+s.slice(0,30)); } return out.slice(0,5); })()`;
for (const [w, h] of [[1280, 800], [1024, 768]]) {
  await viewport(w, h);
  await fresh('today');
  let bad = [];
  for (const s of SCREENS) {
    await hash(s); await sleep(s === 'trends' ? 1000 : 350);
    const over = await evalJs(`document.documentElement.scrollWidth - window.innerWidth`);
    const small = await evalJs(tiny);
    if (over > 1) bad.push(`${s}: ${over}px too wide`);
    if (small.length) bad.push(`${s}: small text ${small.join(' | ')}`);
    if (s === 'today' || s === 'body') await shot(`p4-11-${s}-${w}`);
  }
  check(`${w}x${h}: no horizontal overflow and no text under 14px on the 8 screens`, bad.length === 0, bad.join(' ; '));
}
await viewport(1280, 800);

// ============ 12: keyboard on the Body screen
await fresh('body');
const seen = new Set();
for (let i = 0; i < 60 && seen.size < 8; i++) {
  await key('Tab', 'Tab', 9);
  const a = await evalJs(`document.activeElement?.getAttribute('role')==='button' && document.activeElement.tagName.toLowerCase()==='g' ? document.activeElement.getAttribute('aria-label') : ''`);
  if (a) seen.add(a.split(':')[0]);
}
check('Tab reaches all 8 body systems', seen.size === 8, [...seen].join(', '));
await evalJs(`document.querySelectorAll('svg g[role=button]')[6].focus()`);
await key('Enter', 'Enter', 13); await sleep(200);
const opened = await evalJs(`document.querySelector('main h2')?.innerText`);
check('Enter opens the focused system', !!opened && opened !== 'Heart and circulation', opened);

// ============ 14: the Emergency button on every screen
await fresh('today');
let all14 = true; const failed14 = [];
for (const s of SCREENS) {
  await hash(s); await sleep(300);
  const clicked = await click('I feel unwell now'); await sleep(350);
  const t14 = await text();
  if (!clicked || !t14.includes('EMERGENCY') || !t14.includes('PRIORITY report sent')) { all14 = false; failed14.push(s); }
  await click("I'm safe now"); await sleep(150); await click('Opened by mistake'); await sleep(250);
}
check('"I feel unwell now" opens the Emergency page, with the report sent, on all 8 screens', all14, failed14.join(', '));

// ============ 15: a red-flag chip in the quick log, with the typed values kept
await fresh('today');
r = await runCheck();
await click('Continue'); await sleep(300);
await setValue('[aria-label=Systolic]', '131'); await setValue('[aria-label=Diastolic]', '84');
await click('Chest pain or pressure'); await sleep(400);
t = await text();
check('Quick log red flag: Emergency opens at once with chest pain ticked', t.includes('EMERGENCY') && (await evalJs(`[...document.querySelectorAll('button[aria-pressed=true]')].some(b=>b.innerText.includes('Chest pain'))`)));
await click('Back to app'); await sleep(300);
check('Quick log red flag: what was typed is kept', (await evalJs(`document.querySelector('[aria-label=Systolic]')?.value`)) === '131');
await click('Return to emergency page'); await sleep(200); await click("I'm safe now"); await sleep(150); await click('Opened by mistake'); await sleep(250);

// ============ 16: a red-flag message in the Coach never sends a request to the Worker
await hash('coach'); await sleep(400);
const before = workerRequests.length;
await setValue('#coach-input', 'I have chest pain'); await sleep(100); await click('Send'); await sleep(1200);
check('Coach red flag: the Emergency page opens', (await text()).includes('EMERGENCY'));
check('Coach red flag: NO request went to the Worker', workerRequests.length === before, `${workerRequests.length - before} new requests`);
await click("I'm safe now"); await sleep(150); await click('Opened by mistake'); await sleep(250);

// ============ 19: an emergency in guest mode survives a reload until it is closed
await fresh('today');
await pick('#crew', 'guest'); await sleep(250);
await click('I feel unwell now'); await sleep(400);
await send('Page.reload'); await sleep(1800);
t = await text();
check('Guest emergency: still open after a reload', t.includes('EMERGENCY') && t.includes('Guest'));
await click("I'm safe now"); await sleep(150); await click('Opened by mistake'); await sleep(250);

// ============ 20: Trends shows the pre-flight checks and the dashed Before launch line
await fresh('trends');
for (let i = 0; i < 40 && !(await evalJs(`document.querySelectorAll('.recharts-line').length`)); i++) await sleep(150);
await click('Whole mission'); await sleep(900);
const axis = await evalJs(`[...document.querySelectorAll('.recharts-xAxis-tick-labels text')].map(e=>e.textContent)`);
check('Trends (whole mission): the axis starts before day 1 and the Before launch line is shown', axis.some((a) => /^[-\u2212]\d+/.test(a)) && (await text()).includes('Before launch'), axis.join(','));
await shot('p4-20-trends-whole');

// ============ 21: Lunar rover
await fresh('earth');
await pick('#mission', 'rover'); await sleep(300);
check('Lunar rover: delay about 1.3 s', (await text()).includes('about 1.3 s'));
await hash('body'); await sleep(500);
// Hazards start hidden on the Body screen; show them, then the rover's risks must be pre-marked.
await click('Show hazards'); await sleep(300);
const stars = await evalJs(`[...document.querySelectorAll('button[aria-pressed]')].filter(b=>b.innerText.includes('★')).map(b=>b.innerText.replace(' ★',''))`);
check("Lunar rover: its risks are highlighted on the Body screen", ['Radiation', 'Isolation', 'Environment'].every((x) => stars.includes(x)) && (await evalJs(`document.querySelectorAll('svg [class*="stroke-dasharray"]').length`)) > 0, stars.join(','));

// ============ 22: an immune symptom turns the immune system to Watch
await fresh('today');
await pick('#crew', 'c1'); await sleep(250);
await hash('body'); await sleep(300);
const immuneBefore = await evalJs(`[...document.querySelectorAll('svg g[role=button]')].find(g=>g.getAttribute('aria-label').startsWith('Immune')).getAttribute('aria-label')`);
r = await runCheck(); await click('Continue'); await sleep(300); await click('Sore throat'); await click('Save'); await sleep(500);
await hash('body'); await sleep(300);
const immuneAfter = await evalJs(`[...document.querySelectorAll('svg g[role=button]')].find(g=>g.getAttribute('aria-label').startsWith('Immune')).getAttribute('aria-label')`);
check('Sore throat: Immune goes from OK to Watch', immuneBefore.includes('OK') && immuneAfter.includes('Watch'), `${immuneBefore} -> ${immuneAfter}`);

// ============ Home mode
await fresh('today');
await click('Home mode'); await sleep(500);
t = await text();
check('Home mode: one big Start check button, no space vocabulary in the header', t.includes('Start check') && !/Mars|Crew Member|Day 47/.test(t.split('\n').slice(0, 6).join(' ')));
const fs = await evalJs(`parseFloat(getComputedStyle(document.documentElement).fontSize)`);
check('Home mode: text is bigger', fs >= 20, fs + 'px');
await shot('p4-home-today');
await click('Start check'); await sleep(400);
await click('Start check (simulator)');
check('Home mode: the result is in plain words', await waitFor('Your heart rate is normal today.', 20000));
check('Home mode: "Send to family" instead of the flight surgeon', (await text()).includes('Send to family') && !/surgeon/i.test(await text()));
await click('Send to family'); await sleep(300);
check('Home mode: Send to family confirms', (await text()).includes('Sent to your family at'));
await shot('p4-home-result');
await click('I feel unwell now'); await sleep(500);
t = await text();
check('Home mode: Emergency says "Call 999 now" and "Notify family", with no signal-delay countdown', t.includes('Call 999 now') && t.includes('Notify family') && !t.includes('Reaches Earth') && !t.includes('flight surgeon'));
check('Home mode: the warning line is still shown', t.includes("Normal readings don't rule out a heart problem"));
await shot('p4-home-emergency');
await click("I'm safe now"); await sleep(150); await click('Opened by mistake'); await sleep(250);
await click('Exit Home mode'); await sleep(400);
check('Exiting Home mode restores the normal app', (await text()).includes('Crew Member') && (await evalJs(`parseFloat(getComputedStyle(document.documentElement).fontSize)`)) < 20);

// ============ Reduced motion: the end state is shown at once
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await fresh('today');
const offset = await evalJs(`(() => { const c=[...document.querySelectorAll('svg circle')].find(x=>x.getAttribute('stroke-dasharray')); if(!c) return null; return parseFloat(getComputedStyle(c).strokeDashoffset) / parseFloat(c.getAttribute('stroke-dasharray')); })()`);
check('Reduced motion: the score ring shows its end state immediately', offset !== null && offset < 0.5, String(offset));
await send('Emulation.setEmulatedMedia', { features: [] });

// ============ 13: the console, for the whole run
console.log(results.join('\n'));
const fails = results.filter((x) => x.startsWith('FAIL')).length;
console.log(`\n${results.length - fails} passed, ${fails} failed`);
console.log(problems.length ? '\nCONSOLE PROBLEMS:\n' + [...new Set(problems)].join('\n') : '\nNo console errors or warnings (checklist item 13).');
ws.close(); chrome.kill();
process.exit(fails || problems.length ? 1 : 0);
