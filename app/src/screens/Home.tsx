// Home mode (APP_BUILD_GUIDE.md 10.10): huge text, one big button, results in plain words, and "Send to family"
// instead of the flight surgeon. For the Qatar older-people part of the pitch.
import { Languages, Phone, Play, Send, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Button, Card } from '../components/Card.tsx';
import { STATUS_INFO } from '../components/info.ts';
import { StatusBadge } from '../components/Status.tsx';
import { useNow } from '../hooks.ts';
import { plainHeadlineAr, plainSentenceAr, useT } from '../i18n.ts';
import { latestAssessments } from '../logic/overview.ts';
import { plainHeadline, plainSentence } from '../logic/plain.ts';
import { overallStatus } from '../logic/status.ts';
import { clock } from '../logic/summary.ts';
import { Logo } from '../layout/Logo.tsx';
import { useHomeFamily } from '../homeFamily.ts';
import { useNav } from '../nav.ts';
import { useStore } from '../store.ts';
import type { Assessment } from '../types.ts';

export function HomeHeader() {
  const { openEmergency, setHomeMode, setLang } = useStore.getState();
  const showEmergency = useNav((s) => s.showEmergency);
  const { lang, t } = useT();
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-space-950 px-5 py-4">
      <div className="flex items-center gap-2 text-2xl font-semibold text-slate-50"><Logo size={36} /> {t('appName')}</div>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-space-900 px-4 text-base font-medium text-slate-100 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-400"
        >
          <Languages aria-hidden size={20} /> {t('switchLang')}
        </button>
        <button type="button" onClick={() => setHomeMode(false)} className="text-base text-slate-400 underline underline-offset-4 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-cyan-400">{t('exitHome')}</button>
        <button
          type="button"
          onClick={() => {
            openEmergency('button', []);
            showEmergency();
          }}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-act bg-act/10 px-5 text-lg font-semibold text-act hover:bg-act/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-act"
        >
          <TriangleAlert aria-hidden size={22} /> {t('unwell')}
        </button>
      </div>
    </header>
  );
}

/** "Send to family" is simulated, like sending to the flight surgeon. */
function SendToFamily({ text }: { text?: string }) {
  const sentAt = useHomeFamily((s) => s.sentAt);
  const { t } = useT();
  return (
    <div className="flex flex-col items-start gap-2">
      <Button big variant="secondary" onClick={() => useHomeFamily.getState().send()}>
        <Send aria-hidden size={22} /> {sentAt ? t('sendFamilyAgain') : (text ?? t('sendFamily'))}
      </Button>
      {sentAt && <p role="status" className="text-lg text-ok">{t('sentFamilyAt', { time: clock(sentAt) })}</p>}
    </div>
  );
}

export function HomeToday() {
  const crewId = useStore((s) => s.crewId);
  const day = useStore((s) => s.missionDay);
  const readings = useStore((s) => s.readings);
  const go = useNav((s) => s.go);
  const { lang, t } = useT();
  const items = latestAssessments(readings, crewId, day);
  const assessed = items.flatMap((i) => (i.assessment ? [i.assessment] : []));
  const overall = overallStatus(assessed);
  const hour = useNow().getHours();
  const greeting = hour < 12 ? t('goodMorning') : hour < 18 ? t('goodAfternoon') : t('goodEvening');
  const headline = lang === 'ar' ? plainHeadlineAr(overall) : plainHeadline(overall);
  const sentence = (a: Assessment) => (lang === 'ar' ? plainSentenceAr(a.indicator, a.status) : plainSentence(a.indicator, a.status));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6">
      <h1 className="text-5xl font-semibold text-slate-50">{greeting}</h1>
      <Button big className="min-h-24 text-3xl" onClick={() => go('check')}>
        <Play aria-hidden size={36} /> {t('startCheck')}
      </Button>
      {assessed.length > 0 ? (
        <Card title={t('lastCheck')}>
          <div className="mb-3"><StatusBadge status={overall} size="lg" /></div>
          <p className="text-2xl text-slate-100">{headline}</p>
          <ul className="mt-3 flex flex-col gap-2 text-xl text-slate-200">
            {assessed.map((a) => <li key={a.indicator}>{sentence(a)}</li>)}
          </ul>
        </Card>
      ) : (
        <p className="text-xl text-slate-300">{t('noCheckYet')}</p>
      )}
      <SendToFamily />
    </div>
  );
}

export function HomeResult({ assessments, overall, onDone }: { assessments: Assessment[]; overall: Assessment['status']; onDone: () => void }) {
  const [asked, setAsked] = useState(false);
  const { lang, t } = useT();
  const headline = lang === 'ar' ? plainHeadlineAr(overall) : plainHeadline(overall);
  const sentence = (a: Assessment) => (lang === 'ar' ? plainSentenceAr(a.indicator, a.status) : plainSentence(a.indicator, a.status));
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6">
      <div className="flex flex-wrap items-center gap-4">
        <StatusBadge status={overall} size="lg" />
        <h1 className={`text-4xl font-semibold ${STATUS_INFO[overall].text}`}>{headline}</h1>
      </div>
      {overall === 'act' && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border-2 border-act bg-act/10 p-5 text-2xl text-act">
          <p>{t('callNowIfUnwell')}</p>
          <a href="tel:999" className="inline-flex w-fit items-center gap-2 rounded-xl bg-act px-5 py-3 text-xl font-semibold text-space-950 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><Phone aria-hidden size={24} /> {t('call999')}</a>
        </div>
      )}
      <ul className="flex flex-col gap-3 text-2xl text-slate-100">
        {assessments.map((a) => <li key={a.indicator}>{sentence(a)}</li>)}
        {assessments.length === 0 && <li>{t('nothingMeasured')}</li>}
      </ul>
      <SendToFamily text={overall === 'ok' ? t('sendFamily') : t('tellFamily')} />
      <div className="flex flex-wrap gap-4">
        <Button big onClick={() => { setAsked(true); onDone(); }}>{t('done')}</Button>
      </div>
      <span className="sr-only">{asked ? 'closed' : ''}</span>
    </div>
  );
}
