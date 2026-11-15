// End-to-end driver for Phase 3 (Chrome DevTools Protocol).
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.argv[2];
const BASE = process.env.DALIL_URL ?? 'http://127.0.0.1:4173/';
const profile = mkdtempSync(join(tmpdir(), 'dalil-e2e3-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9334', `--user-data-dir=${profile}`, '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let targets;
for (let i = 0; i < 40; i++) {
  try { targets = await (await fetch('http://127.0.0.1:9334/json')).json(); if (targets.some((t) => t.type === 'page')) break; } catch { /* not up yet */ }
  await sleep(250);
}
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
const problems = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
  if (msg.method === 'Runtime.exceptionThrown') problems.push('EXCEPTION ' + (msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text));
  if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) problems.push(msg.params.type.toUpperCase() + ' ' + msg.params.args.map((a) => a.value ?? a.description).join(' '));
};
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
const text = () => evalJs('document.body.innerText');
const SEL = "button,[role=radio],[role=tab],g[role=button],summary";
const click = (label) => evalJs(`(() => { const b=[...document.querySelectorAll(${JSON.stringify(SEL)})].find(x => (x.getAttribute('aria-label')||x.innerText||'').trim().includes(${JSON.stringify(label)})); if(!b) return false; b.dispatchEvent(new MouseEvent('click',{bubbles:true})); return true; })()`);
const waitFor = async (needle, ms = 20000) => { const end = Date.now() + ms; while (Date.now() < end) { if ((await text()).includes(needle)) return true; await sleep(250); } return false; };
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(OUT, name + '.png'), Buffer.from(r.result.data, 'base64')); };
const hash = async (h) => { await evalJs(`location.hash=${JSON.stringify('#' + h)}`); await sleep(500); };
const setInput = (sel, v) => evalJs(`(() => { const el=document.querySelector(${JSON.stringify(sel)}); const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value'); d.set.call(el,${JSON.stringify(v)}); el.dispatchEvent(new Event('input',{bubbles:true})); return !!el; })()`);
const results = [];
const check = (name, ok, extra = '') => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`); };

await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Page.navigate', { url: BASE });
await waitFor('Explore the demo mission', 20000); // a hosted page takes longer to download than a local one

// ---- 1. Landing and tour
check('First visit shows the landing page', (await text()).includes('Explore the demo mission') && (await text()).includes('Live check'));
await shot('p3-1-landing');
await click('Explore the demo mission'); await sleep(600);
check('Tour step 1 shows on Today', (await text()).includes('1 of 3 · Today') && (await text()).includes('Crew health score'));
await click('Next'); await sleep(500);
check('Tour step 2 moves to Body', (await text()).includes('2 of 3 · Body') && (await text()).includes('Heart and circulation'));
await click('Next'); await sleep(900);
check('Tour step 3 moves to Trends', (await text()).includes('3 of 3 · Trends') && (await text()).includes('Resting heart rate'));
await click('Done'); await sleep(300);
check('Tour closes', !(await text()).includes('3 of 3'));

// ---- 2. Body
await hash('body'); await sleep(500);
await shot('p3-2-body');
const names = ['Heart and circulation', 'Lungs and oxygen', 'Brain: mood and sleep', 'Metabolism and nutrition', 'Skin and temperature', 'Bones and muscles', 'Immune system', 'Eyes'];
const labels = await evalJs(`[...document.querySelectorAll('svg g[role=button]')].map(g => g.getAttribute('aria-label'))`);
check('Body figure has all 8 systems as buttons', labels?.length === 8, labels?.join(' | '));
check('Heart shows Watch, lungs OK', labels?.some((l) => l.startsWith('Heart and circulation: Watch')) && labels?.some((l) => l.startsWith('Lungs and oxygen: OK')));
let allOpen = true;
for (const n of names) {
  await evalJs(`(() => { const g=[...document.querySelectorAll('svg g[role=button]')].find(x=>x.getAttribute('aria-label').startsWith(${JSON.stringify(n)})); g.dispatchEvent(new MouseEvent('click',{bubbles:true})); })()`);
  await sleep(150);
  const h2 = await evalJs(`document.querySelector('main h2')?.innerText`);
  const t = await text();
  if (h2 !== n || !t.includes('What can be measured in space') || !t.includes('How to prevent problems')) { allOpen = false; check(`Panel for ${n}`, false, `h2=${h2}`); }
}
check('Every system opens a panel with NASA\'s five questions', allOpen);
// keyboard: focus Eyes, press Enter -> Eyes panel; Space on Skin
await evalJs(`(() => { const g=[...document.querySelectorAll('svg g[role=button]')].find(x=>x.getAttribute('aria-label').startsWith('Heart')); g.focus(); g.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); })()`); await sleep(200);
check('Enter on a focused system opens it (keyboard)', (await evalJs(`document.querySelector('main h2')?.innerText`)) === 'Heart and circulation');
check('Heart panel explains why it is Watch and shows the guidance card', (await text()).includes('above your normal') && (await text()).includes('Resting heart rate outside your usual range'));
await click('Show hazards'); await sleep(300);
check('Hazards toggle shows the five hazard chips with the mission risks starred', (await text()).includes('Radiation') && (await text()).includes('Distance from Earth') && (await text()).includes('★'));
await shot('p3-2b-body-hazards');

// ---- 3. Trends
await hash('trends'); await sleep(1200);
await shot('p3-3-trends');
check('Trends draws a chart line', (await evalJs(`document.querySelectorAll('.recharts-line').length`)) >= 1);
check("Trends shows the Day 47 story as an insight (heart rate + sleep)", (await text()).includes('above your normal for 3 days, while sleep dropped'));
check('Trends shows the Before-launch line and Earth band legend', (await text()).includes('Before launch'));
await click('Blood pressure'); await sleep(700);
check('Blood pressure draws two lines', (await evalJs(`document.querySelectorAll('.recharts-line').length`)) >= 2);
await click('Sleep'); await sleep(300); await click('7 days'); await sleep(500);
check('Range and indicator switches work without errors', (await text()).includes('Safe range or target'));
await shot('p3-3b-trends-sleep');

// ---- 4. Coach
await hash('coach'); await sleep(500);
check('Coach offers suggested questions from today\'s Watch status', (await text()).includes('Why is my resting heart rate amber?'));
await click('Why is my resting heart rate amber?');
const answered = await waitFor('Sources:', 35000);
await sleep(300); await shot('p3-4-coach');
const coachText = await text();
check('Live Coach answers with its sources (cards used)', answered && /Resting heart rate outside your usual range/.test(coachText), answered ? '' : 'no answer in 35 s: ' + coachText.slice(-300));
// offline fallback
await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
await setInput('#coach-input', 'What should I do about fatigue?'); await sleep(100); await click('Send');
check('Offline: Coach shows the guidance cards instead', await waitFor('Offline: showing the guidance cards.', 25000));
check('Offline cards include the matching ones', (await text()).includes('Feeling very tired') && (await text()).includes('Resting heart rate outside your usual range'));
await shot('p3-4b-coach-offline');
await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
// red flag word check
await setInput('#coach-input', "I have crushing chest pain and I can't breathe"); await sleep(100); await click('Send'); await sleep(900);
const em = await text();
check('Red-flag message opens the Emergency page, not the AI', em.includes('EMERGENCY') && em.includes('Chest pain or pressure') && em.includes('Trouble breathing'));
await shot('p3-4c-coach-emergency');
await click("I'm safe now"); await sleep(200); await click('Opened by mistake'); await sleep(500);
await click('Back to app').catch?.(() => {});
check('Chat explains why the Coach was skipped', (await text()).includes("This sounds urgent, so Baseera is skipping the Coach."));

// ---- 5. Earth
await hash('earth'); await sleep(600);
check('Earth shows the report with the Watch reason', (await text()).includes('Report (checked by you)') && (await text()).includes('above your normal'));
check('Earth shows priority report from the earlier emergency', (await text()).includes('PRIORITY · Day 47'));
check('While-you-wait steps come from the guidance cards', (await text()).includes('Drink some water'));
await click('Send report to Earth'); await sleep(900);
check('Mars: report travels with the 14:00 delay', (await text()).includes('Reaches Earth in 1') && (await text()).includes('Reply expected in: 27'));
await evalJs(`(() => { const el=document.querySelector('#mission'); const d=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value'); d.set.call(el,'iss'); el.dispatchEvent(new Event('change',{bubbles:true})); })()`); await sleep(300);
await click('Send again'); await sleep(3200);
check('Space Station: delivered almost at once', (await text()).includes('Delivered to Earth at'));
await click('Ask the Coach for a summary');
check('Coach summary appears (online or offline template)', await waitFor('Check it before you rely on it', 30000) || await waitFor('written from a template', 1000));
await shot('p3-5-earth');

// ---- 6. Sources and settings
await hash('sources'); await sleep(400);
const src = await text();
check('Sources page lists sources, AI use and libraries', src.includes('Where the numbers and guidance come from') && src.includes('Cloudflare Workers AI') && src.includes('Recharts'));
await shot('p3-6-sources');
await hash('settings'); await sleep(300);
check('Settings can reopen the intro', await click('Show the intro and tour again'));
await sleep(300);
check('Intro reopens', (await text()).includes('Explore the demo mission'));

console.log(results.join('\n'));
console.log(problems.length ? '\nCONSOLE PROBLEMS:\n' + [...new Set(problems)].join('\n') : '\nNo console errors or warnings.');
ws.close(); chrome.kill();
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
