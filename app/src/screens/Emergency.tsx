// "I feel unwell now" (APP_BUILD_GUIDE.md 10.11). Rules this page must never break:
// no AI on this page, no medicine names or doses, steps 1 and 2 never wait for a measurement,
// and the warning line is always visible. Everything here works with Wi-Fi off.
import { BellRing, Check, Info, Phone, Send, ShieldAlert, Stethoscope } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../components/Card.tsx';
import { DelayAnimation } from '../components/DelayAnimation.tsx';
import { crew, crewById, emergencyContent, missionById, redFlagSymptoms, symptomById } from '../data/index.ts';
import { useNow } from '../hooks.ts';
import { HOME_STEPS_AR, RED_FLAG_LABEL_AR, useT } from '../i18n.ts';
import { emergencyReportInput } from '../logic/reportInput.ts';
import { buildReport, clock } from '../logic/summary.ts';
import { useNav } from '../nav.ts';
import { useStore } from '../store.ts';
import type { EmergencyEvent, SymptomId } from '../types.ts';

const REASONS: { id: NonNullable<EmergencyEvent['closedReason']>; label: string }[] = [
  { id: 'help_arrived', label: 'Help has arrived' },
  { id: 'feel_better', label: 'I feel better' },
  { id: 'mistake', label: 'Opened by mistake' },
];

export function Emergency() {
  const emergency = useStore((s) => s.emergency);
  const missionId = useStore((s) => s.missionId);
  const readings = useStore((s) => s.readings);
  const symptomLogs = useStore((s) => s.symptoms);
  const live = useStore((s) => s.live);
  const connection = useStore((s) => s.connection);
  const useSimulator = useStore((s) => s.useSimulator);
  const home = useStore((s) => s.homeMode);
  const { openEmergency, alertCrew, sendEmergencyReport, closeEmergency, startCheck, startCheckWithSimulator } = useStore.getState();
  const minimize = useNav((s) => s.minimizeEmergency);
  const now = useNow(15_000);
  const { lang, t } = useT();
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [closing, setClosing] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const report = useMemo(
    () => (emergency ? buildReport(emergencyReportInput({ event: emergency, missionId, readings, symptomLogs })) : ''),
    [emergency, missionId, readings, symptomLogs],
  );
  if (!emergency) return null;

  const mission = missionById(missionId);
  const me = crewById(emergency.crewId);
  const others = crew.filter((c) => c.id !== emergency.crewId && c.id !== 'guest');
  const minutesAgo = Math.max(0, Math.round((now.getTime() - Date.parse(emergency.startedAt)) / 60000));

  // Steps for any red flag first, then the extra steps for the ticked red flags (all from emergency.json, or Arabic home steps).
  const stepSource = lang === 'ar' ? HOME_STEPS_AR : emergencyContent;
  const steps = [
    ...stepSource.general,
    ...emergency.symptoms.flatMap((id) => stepSource.bySymptom[id] ?? []),
  ];

  const measuring = live.stage === 'starting' || live.stage === 'finger' || live.stage === 'forehead';
  const measure = () => (connection === 'connected' ? startCheck() : startCheckWithSimulator());

  const flagChip = (id: SymptomId) => emergency.symptoms.includes(id);

  return (
    <div role="dialog" aria-modal="true" aria-label={t('emergency')} className="fixed inset-0 z-50 overflow-y-auto bg-space-950">
      <div className="mx-auto flex max-w-4xl flex-col gap-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-act px-5 py-3 text-space-950">
          <h1 className="inline-flex items-center gap-2 text-2xl font-bold"><ShieldAlert aria-hidden size={28} /> {t('emergency')} · {t('started')} {clock(emergency.startedAt)} ({minutesAgo === 0 ? t('justNow') : t('minAgo', { n: minutesAgo })})</h1>
          {!home && <span className="text-lg font-semibold">{me.label}</span>}
        </div>

        <section aria-label="What is happening">
          <p className="mb-2 text-lg font-semibold text-slate-100">{t('whatsHappening')}</p>
          <div className="flex flex-wrap gap-2">
            {redFlagSymptoms.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={flagChip(s.id)}
                disabled={flagChip(s.id)}
                onClick={() => openEmergency('button', [s.id])}
                className={`inline-flex items-center gap-1 rounded-full border-2 px-3 py-1.5 text-base ${flagChip(s.id) ? 'border-act bg-act/25 font-semibold text-act' : 'border-act/60 text-slate-200 hover:bg-act/15'} focus-visible:outline-2 focus-visible:outline-act`}
              >
                {flagChip(s.id) && <Check aria-hidden size={16} />} {lang === 'ar' ? (RED_FLAG_LABEL_AR[s.id] ?? s.label) : s.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/15 bg-space-900 p-5" aria-label="Step 1: tell a crewmate">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-50">{home ? t('step1Home') : '1 · Tell a crewmate now.'}</h2>
            {home ? (
              <a href="tel:999" className="inline-flex min-h-14 items-center gap-2 rounded-xl bg-act px-7 text-lg font-semibold text-space-950 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><Phone aria-hidden size={22} /> {t('call999')}</a>
            ) : (
              <Button big variant="danger" onClick={alertCrew} disabled={!!emergency.crewAlertedAt}>
                <BellRing aria-hidden size={22} /> {emergency.crewAlertedAt ? `Alerted ${clock(emergency.crewAlertedAt)} (simulated)` : 'Alert crew'}
              </Button>
            )}
          </div>
          {!home && emergency.crewAlertedAt && (
            <p className="mt-2 text-base text-ok">Crew alerted: {others.map((c) => `${c.label} (${c.role})`).join(', ')} · {clock(emergency.crewAlertedAt)} (simulated)</p>
          )}
        </section>

        {home ? (
          <section className="rounded-2xl border border-white/15 bg-space-900 p-5" aria-label="Step 2: notify family">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-50">{t('step2Home')}</h2>
              <Button big variant="danger" onClick={alertCrew} disabled={!!emergency.crewAlertedAt}>
                <Send aria-hidden size={22} /> {emergency.crewAlertedAt ? t('familyNotified', { time: clock(emergency.crewAlertedAt) }) : t('notifyFamily')}
              </Button>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-white/15 bg-space-900 p-5" aria-label="Step 2: contact the flight surgeon">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-50">2 · Contact the flight surgeon.</h2>
            <span className="inline-flex items-center gap-2 text-base font-semibold text-ok"><Send aria-hidden size={18} /> PRIORITY report sent {emergency.reportSentAt ? clock(emergency.reportSentAt) : ''} (simulated)</span>
          </div>
          {emergency.reportSentAt && <DelayAnimation oneWaySec={mission.oneWayDelaySec} sentAt={emergency.reportSentAt} />}
          <div className="mt-3 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={sendEmergencyReport}>Send again</Button>
            <Button variant="secondary" aria-expanded={showReport} onClick={() => setShowReport(!showReport)}>{showReport ? 'Hide report' : 'Show report'}</Button>
          </div>
          {showReport && <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-space-950 p-4 text-sm text-slate-200">{report}</pre>}
        </section>
        )}

        <section className="rounded-2xl border border-white/15 bg-space-900 p-5" aria-label="Step 3: while you wait">
          <h2 className="mb-3 text-xl font-semibold text-slate-50">{t('step3')}</h2>
          <ul className="flex flex-col gap-2">
            {steps.map((text) => (
              <li key={text}>
                <label className="flex cursor-pointer items-center gap-3 text-lg text-slate-100">
                  <input type="checkbox" className="h-5 w-5 accent-cyan-400" checked={!!ticked[text]} onChange={(e) => setTicked({ ...ticked, [text]: e.target.checked })} />
                  {text}
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-slate-400">
            {t('source')} {emergencyContent.sources.map((s) => <a key={s.url + s.title} className="underline" href={s.url} target="_blank" rel="noreferrer">{s.title}</a>)}
          </p>
        </section>

        <section className="rounded-2xl border border-white/15 bg-space-900 p-5" aria-label="Step 4: procedures">
          <h2 className="inline-flex items-center gap-2 text-xl font-semibold text-slate-50"><Stethoscope aria-hidden size={22} /> {home ? t('step4Home') : "4 · Follow your mission's medical procedures and the crew medical officer."}</h2>
        </section>

        {/* Always visible: our station has no ECG and cannot detect a heart attack. */}
        <p className="flex items-start gap-2 rounded-xl border border-watch/50 bg-watch/10 p-4 text-lg font-medium text-watch">
          <Info aria-hidden className="mt-1 shrink-0" size={20} />
          {t('normalNoRuleOut')}
        </p>

        {emergency.updates.length > 0 && (
          <section aria-label="Updates">
            <h2 className="mb-1 text-lg font-semibold text-slate-100">Updates</h2>
            <ul className="text-base text-slate-300">{emergency.updates.map((u) => <li key={u.time + u.text}>{u.text.startsWith('Update') || u.text.startsWith('Report') || u.text.startsWith('New') ? u.text : `${clock(u.time)}: ${u.text}`}</li>)}</ul>
          </section>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Button variant="secondary" disabled={measuring || (connection !== 'connected' && !useSimulator)} onClick={measure}>
              {measuring ? t('measuring') : t('measureNow')}
            </Button>
            {live.stage === 'done' && <span className="text-sm text-ok">{t('measurementAdded')}</span>}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={minimize} className="text-base text-slate-300 underline underline-offset-4 hover:text-slate-50 focus-visible:outline-2 focus-visible:outline-cyan-400">{t('backToApp')}</button>
            <Button variant="secondary" onClick={() => setClosing(true)}>{t('safeNow')}</Button>
          </div>
        </div>

        {closing && (
          <div role="group" aria-label={t('whyClosing')} className="rounded-2xl border-2 border-white/25 bg-space-900 p-5">
            <p className="mb-3 text-lg font-semibold text-slate-100">{t('whyClosing')}</p>
            <div className="flex flex-wrap gap-3">
              {REASONS.map((r) => <Button key={r.id} variant="secondary" onClick={() => { closeEmergency(r.id); setClosing(false); }}>{r.id === 'help_arrived' ? t('helpArrived') : r.id === 'feel_better' ? t('feelBetter') : t('mistake')}</Button>)}
              <Button variant="primary" onClick={() => setClosing(false)}>{t('keepOpen')}</Button>
            </div>
          </div>
        )}
        <span className="sr-only">{emergency.symptoms.map((id) => symptomById(id)?.label).join(', ')}</span>
      </div>
    </div>
  );
}
