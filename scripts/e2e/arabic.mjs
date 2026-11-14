// End-to-end driver for Arabic and right-to-left (Chrome DevTools Protocol).
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.argv[2];
const BASE = process.env.DALIL_URL ?? 'http://127.0.0.1:4173/';
const profile = mkdtempSync(join(tmpdir(), 'dalil-e2e5-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9335', `--user-data-dir=${profile}`, '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let targets;
for (let i = 0; i < 40; i++) {
  try { targets = await (await fetch('http://127.0.0.1:9335/json')).json(); if (targets.some((t) => t.type === 'page')) break; } catch { /* not up yet */ }
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
const overflow = () => evalJs('document.documentElement.scrollWidth - document.documentElement.clientWidth');
const dirOf = () => evalJs('document.documentElement.dir + "/" + document.documentElement.lang');

await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Page.navigate', { url: BASE });
await waitFor('Explore the demo mission', 20000);

check('English stays left-to-right by default', (await dirOf()) === 'ltr/en', await dirOf());
await click('العربية'); await sleep(500);
check('Landing switches to right-to-left Arabic', (await dirOf()) === 'rtl/ar' && (await text()).includes('استكشف المهمة التجريبية'), await dirOf());
await shot('ar-1-landing');
await click('استكشف المهمة التجريبية'); await sleep(600);
await click('تخطَّ الجولة'); await sleep(400);

for (const [route, needle, name] of [['today', 'اليوم', 'Today'], ['check', 'الفحص', 'Check'], ['body', 'الجسم', 'Body'], ['trends', 'الاتجاهات', 'Trends'], ['coach', 'المدرّب', 'Coach'], ['earth', 'الأرض', 'Earth'], ['sources', 'المصادر', 'Sources'], ['settings', 'الإعدادات', 'Settings']]) {
  await hash(route); await sleep(500);
  await shot('ar-' + route);
  const t = await text();
  check(`${name}: page is Arabic and RTL`, t.includes(needle) && (await dirOf()) === 'rtl/ar');
  for (const w of [1280, 1024]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: 800, deviceScaleFactor: 1, mobile: false });
    await sleep(250);
    check(`${name}: no sideways scrolling at ${w}px`, (await overflow()) <= 1, String(await overflow()));
  }
  await send('Emulation.clearDeviceMetricsOverride');
}

// The side navigation sits on the right in RTL.
await hash('today'); await sleep(400);
const navRight = await evalJs(`(() => { const n=document.querySelector('nav'); if(!n) return null; const r=n.getBoundingClientRect(); return r.left > innerWidth/2; })()`);
check('Navigation sits on the right-hand side', navRight === true, String(navRight));

// Emergency page in Arabic (main mode).
const opened = await evalJs(`(() => { const b=[...document.querySelectorAll('header button, button')].find(x => /أشعر بتوعك/.test(x.innerText)); if(!b) return false; b.dispatchEvent(new MouseEvent('click',{bubbles:true})); return true; })()`);
await sleep(600);
const et = await text();
check('Emergency opens in Arabic with its main-mode strings translated', opened && et.includes('نبّه الطاقم') && et.includes('تواصل مع طبيب الرحلة') && et.includes('أرسل مرة أخرى'));
check('Emergency page has no leftover English UI strings', !/Alert crew|Contact the flight surgeon|Send again|Show report|PRIORITY report/.test(et));
await shot('ar-emergency');

console.log(results.join('\n'));
console.log(problems.length ? '\nCONSOLE PROBLEMS:\n' + [...new Set(problems)].join('\n') : '\nNo console errors or warnings.');
ws.close(); chrome.kill();
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
