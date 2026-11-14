// End-to-end driver: Chrome DevTools Protocol over Node's built-in WebSocket.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.argv[2];
const BASE = process.env.DALIL_URL ?? 'http://127.0.0.1:4173/';
const profile = mkdtempSync(join(tmpdir(), 'dalil-e2e-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9333', `--user-data-dir=${profile}`, '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let targets;
for (let i = 0; i < 40; i++) {
  try { targets = await (await fetch('http://127.0.0.1:9333/json')).json(); if (targets.some((t) => t.type === 'page')) break; } catch { /* not up yet */ }
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
const click = (label) => evalJs(`(() => { const b=[...document.querySelectorAll('button,[role=radio]')].find(x => (x.getAttribute('aria-label')||x.innerText||'').trim().includes(${JSON.stringify(label)})); if(!b) return false; b.click(); return true; })()`);
const waitFor = async (needle, ms = 45000) => { const end = Date.now() + ms; while (Date.now() < end) { if ((await text()).includes(needle)) return true; await sleep(300); } return false; };
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(OUT, name + '.png'), Buffer.from(r.result.data, 'base64')); };
const results = [];
const check = (name, ok, extra = '') => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`); };

await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: BASE + '#today' }); await sleep(1500);

// ---- Flow A: a full check on the simulator, Normal scenario
check('Today shows Watch on heart rate for Crew Member 2 day 47', (await text()).includes('Watch') && (await text()).includes('74'));
await click('Start morning check'); await sleep(400);
check('Check screen shows the Ready step', await waitFor('Ready for your check', 3000));
await shot('a1-ready');
check('Start check (simulator) clicked', await click('Start check (simulator)'));
check('Finger step appears with countdown and heart', await waitFor('Step 1 of 2', 8000));
await sleep(8000); await shot('a2-finger');
const fingerText = await text();
check('Live heart rate shown during finger step', /\d+\s*bpm/.test(fingerText), (fingerText.match(/\d+\s*bpm/) ?? [''])[0]);
check('Forehead step appears', await waitFor('Step 2 of 2', 30000));
await shot('a3-forehead');
check('Result appears', await waitFor('Your result', 20000));
await sleep(1800); await shot('a4-result');
const result = await text();
check('Result shows the LED colour and three readings', /Light on the station/.test(result) && /Resting heart rate/.test(result) && /SpO2/.test(result) && /Skin temperature/.test(result));
await click('Continue'); await sleep(500);
check('Quick log opens', (await text()).includes('Quick log'));
await click('4, good'); await click('3'); // mood 4, meals 3
await evalJs(`(() => { const set=(sel,v)=>{const el=document.querySelector(sel); const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value'); d.set.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true}));}; set('[aria-label=Systolic]','121'); set('[aria-label=Diastolic]','79'); set('[aria-label="Water in litres"]','2.2'); })()`);
await click('Fatigue');
await shot('a5-quicklog');
check('Save is enabled with valid input', await evalJs(`![...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Save').disabled`));
await click('Save'); await sleep(800);
check('Back on Today after saving', (await text()).includes('Good '), '');
await shot('a6-today-after');

// ---- Flow B: emergency from the header
await click('I feel unwell now'); await sleep(600);
const em = await text();
check('Emergency page opens', em.includes('EMERGENCY'));
check('Report is sent automatically', em.includes('PRIORITY report sent'));
check("Warning line is visible", em.includes("Normal readings don't rule out a heart problem"));
check('While-you-wait steps come from emergency.json', em.includes('Do not stay alone'));
await shot('b1-emergency');
await click('Alert crew'); await sleep(300);
check('Alert crew confirms with names and time', (await text()).includes('Crew alerted: Crew Member 1'));
await click('Chest pain or pressure'); await sleep(300);
check('Ticking a red flag adds it', (await text()).includes('New red flags'));
await click('Show report'); await sleep(200);
const rep = await text();
check('Report shows PRIORITY header and red flag', rep.includes('PRIORITY · Dalil emergency report') && rep.includes('Red flags: chest pain or pressure'));
await shot('b2-emergency-report');
await click('Back to app'); await sleep(400);
check('Red emergency bar stays on every screen', (await text()).includes('Emergency open'));
await click('Return to emergency page'); await sleep(300);
await click("I'm safe now"); await sleep(300);
check('Closing asks for a reason', (await text()).includes('Why are you closing this?'));
await click('Opened by mistake'); await sleep(500);
const after = await text();
check('Emergency closes into a Today banner', /Emergency on Day 47 at \d\d:\d\d: report sent/.test(after));
await shot('b3-today-after-emergency');

// ---- Flow D: "Act" scenario gives a red result and the Today banner
await send('Page.navigate', { url: BASE + '#settings' }); await sleep(1200);
await evalJs(`(() => { const el=document.querySelector('#scenario'); const d=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value'); d.set.call(el,'act'); el.dispatchEvent(new Event('change',{bubbles:true})); })()`);
await sleep(300);
check('Scenario set to Act', (await evalJs(`document.querySelector('#scenario').value`)) === 'act');
await click('Use simulator'); await sleep(500);
await evalJs(`(() => { [...document.querySelectorAll('nav button')].find(b=>b.innerText.includes('Check')).click(); })()`); await sleep(400);
await click('Start check');
check('Act check reaches a result', await waitFor('Your result', 60000));
await sleep(1800); await shot('d1-act-result');
const act = await text();
check('Result says Call surgeon with red LED', act.includes('Call surgeon') && /Light on the station:\s*red/.test(act));
await click('Continue'); await sleep(300); await click('Skip'); await sleep(600);
const todayAct = await text();
check('Today shows the red banner linking to the flight surgeon', /Call surgeon: SpO2/.test(todayAct), (todayAct.match(/Call surgeon: [^\n]*/) ?? [''])[0]);
await shot('d2-today-act');

console.log(results.join('\n'));
console.log(problems.length ? '\nCONSOLE PROBLEMS:\n' + [...new Set(problems)].join('\n') : '\nNo console errors or warnings.');
ws.close(); chrome.kill();
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
