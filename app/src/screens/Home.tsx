// Home mode (APP_BUILD_GUIDE.md 10.10): huge text, one big button, results in plain words, and "Send to family"
// instead of the flight surgeon. For the Qatar older-people part of the pitch.
import { HeartPulse, Languages, Phone, Play, Send, Thermometer, TriangleAlert, Users, Wind, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Button, Card } from '../components/Card.tsx';
import { STATUS_INFO } from '../components/info.ts';
import { StatusBadge } from '../components/Status.tsx';
import { useNow } from '../hooks.ts';
import { plainHeadlineAr, plainSentenceAr, useT } from '../i18n.ts';
import { latestAssessments } from '../logic/overview.ts';
import { plainHeadline, plainSentence } from '../logic/plain.ts';
import { overallStatus } from '../logic/status.ts';
import { streak } from '../logic/score.ts';
import { crewTitle } from '../i18n-app.ts';
import { clock } from '../logic/summary.ts';
import { Logo } from '../layout/Logo.tsx';
import { useHomeFamily } from '../homeFamily.ts';
import { useNav } from '../nav.ts';
import { useStore } from '../store.ts';
import type { Assessment, IndicatorId } from '../types.ts';

export function HomeHeader() {
  const { openEmergency, setHomeMode, setLang } = useStore.getState();
  const showEmergency = useNav((s) => s.showEmergency);
  const { lang, t } = useT();
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-contrast/10 bg-space-950 px-5 py-4">
      <div className="flex items-center gap-2 text-2xl font-semibold text-slate-50"><Logo size={36} /> {t('appName')}</div>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-contrast/20 bg-space-900 px-4 text-base font-medium text-slate-100 hover:bg-contrast/10 focus-visible:outline-2 focus-visible:outline-cyan-400"
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

/** Collapse bp_sys + bp_dia into a single blood pressure entry with the worse status so it is not repeated twice. */
function dedupeBloodPressure(assessments: Assessment[]): Assessment[] {
  const bp = assessments.filter((a) => a.indicator === 'bp_sys' || a.indicator === 'bp_dia');
  if (bp.length <= 1) return assessments;
  const combined: Assessment = { ...bp[0], indicator: 'bp_sys', status: overallStatus(bp) };
  let inserted = false;
  return assessments.flatMap((a) => {
    if (a.indicator === 'bp_sys' || a.indicator === 'bp_dia') {
      if (inserted) return [];
      inserted = true;
      return [combined];
    }
    return [a];
  });
}

/** The three things the station measures, as big tiles: icon, name, number, status, and the plain sentence. */
const TILES: { indicator: IndicatorId; key: 'tileHeart' | 'tileOxygen' | 'tileTemp'; Icon: LucideIcon; unit: string }[] = [
  { indicator: 'hr', key: 'tileHeart', Icon: HeartPulse, unit: 'bpm' },
  { indicator: 'spo2', key: 'tileOxygen', Icon: Wind, unit: '%' },
  { indicator: 'temp', key: 'tileTemp', Icon: Thermometer, unit: '°C' },
];

function HomeTiles({ assessments }: { assessments: Assessment[] }) {
  const { lang, t } = useT();
  const shown = TILES.flatMap((tile) => {
    const a = assessments.find((x) => x.indicator === tile.indicator);
    return a ? [{ tile, a }] : [];
  });
  if (shown.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {shown.map(({ tile, a }) => {
        const info = STATUS_INFO[a.status];
        return (
          <div key={tile.indicator} className={`flex flex-col gap-3 rounded-2xl border-2 p-5 ${info.border} ${info.bg}`}>
            <div className="flex items-center gap-2 text-xl font-semibold text-slate-100">
              <tile.Icon aria-hidden size={28} className={info.text} /> {t(tile.key)}
            </div>
            <p className="text-4xl font-semibold tabular-nums text-slate-50">
              {a.value}<span className="ms-1 text-xl font-normal text-slate-300">{tile.unit}</span>
            </p>
            <StatusBadge status={a.status} size="lg" />
            <p className="text-lg text-slate-200">{lang === 'ar' ? plainSentenceAr(a.indicator, a.status) : plainSentence(a.indicator, a.status)}</p>
          </div>
        );
      })}
    </div>
  );
}

/** Everything else that was assessed (sleep, water, mood…), one plain line each with its status icon. */
function AlsoToday({ assessments }: { assessments: Assessment[] }) {
  const { lang, t } = useT();
  const rest = assessments.filter((a) => !TILES.some((tile) => tile.indicator === a.indicator));
  if (rest.length === 0) return null;
  return (
    <Card title={t('alsoToday')}>
      <ul className="flex flex-col gap-3 text-xl text-slate-200">
        {rest.map((a) => {
          const info = STATUS_INFO[a.status];
          return (
            <li key={a.indicator} className="flex items-start gap-3">
              <info.Icon aria-label={info.word} size={26} className={`mt-0.5 shrink-0 ${info.text}`} />
              {lang === 'ar' ? plainSentenceAr(a.indicator, a.status) : plainSentence(a.indicator, a.status)}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** "Your family" with Send and Call. Both are simulated, like sending to the flight surgeon. */
function FamilyCard({ sendText }: { sendText?: string }) {
  const { t } = useT();
  const [calling, setCalling] = useState(false);
  return (
    <Card title={t('familyTitle')}>
      <div className="flex flex-wrap items-center gap-4">
        <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-700/20 text-cyan-400"><Users size={28} /></span>
        <div>
          <p className="text-2xl font-semibold text-slate-50">{t('familyMember')}</p>
          <p className="text-lg text-slate-300">{t('familyHint')}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-start gap-4">
        <SendToFamily text={sendText} />
        <Button big variant="secondary" onClick={() => setCalling(true)}><Phone aria-hidden size={22} /> {t('callFamily')}</Button>
      </div>
      {calling && <p role="status" className="mt-3 text-lg text-cyan-400">{t('callingFamily')}</p>}
    </Card>
  );
}

export function HomeToday() {
  const crewId = useStore((s) => s.crewId);
  const day = useStore((s) => s.missionDay);
  const readings = useStore((s) => s.readings);
  const go = useNav((s) => s.go);
  const { lang, t } = useT();
  const items = latestAssessments(readings, crewId, day);
  const assessed = dedupeBloodPressure(items.flatMap((i) => (i.assessment ? [i.assessment] : [])));
  // "Last check: today 07:10 · 12 days in a row", from the station readings.
  const lastStation = items.filter((i) => i.indicator === 'hr' || i.indicator === 'spo2' || i.indicator === 'temp').map((i) => i.reading).sort((a, b) => b.time.localeCompare(a.time))[0];
  const inRow = streak(readings, crewId, day);
  const name = crewTitle(crewId, crewId === 'h1' ? 'Abu Ahmed' : '', lang === 'ar');
  const overall = overallStatus(assessed);
  const hour = useNow().getHours();
  const greeting = hour < 12 ? t('goodMorning') : hour < 18 ? t('goodAfternoon') : t('goodEvening');
  const headline = lang === 'ar' ? plainHeadlineAr(overall) : plainHeadline(overall);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6">
      <div>
        <h1 className="text-5xl font-semibold text-slate-50">{name ? t('homeGreetingName', { greeting, name }) : greeting}</h1>
        {lastStation && (
          <p className="mt-3 text-xl text-slate-300">
            {t('lastCheckAt', { when: lastStation.missionDay === day ? t('todayAt', { time: clock(lastStation.time) }) : t('dayAt', { day: lastStation.missionDay, time: clock(lastStation.time) }) })}
            {inRow > 1 ? ` · ${t('daysInRow', { n: inRow })}` : ''}
          </p>
        )}
      </div>
      <Button big className="min-h-24 text-3xl" onClick={() => go('check')}>
        <Play aria-hidden size={36} /> {t('startCheck')}
      </Button>
      {assessed.length > 0 ? (
        <section aria-label={t('lastCheck')} className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-4">
            <StatusBadge status={overall} size="lg" />
            <p className="text-2xl text-slate-100">{headline}</p>
          </div>
          <HomeTiles assessments={assessed} />
          <AlsoToday assessments={assessed} />
        </section>
      ) : (
        <p className="text-xl text-slate-300">{t('noCheckYet')}</p>
      )}
      <FamilyCard />
    </div>
  );
}

export function HomeResult({ assessments, overall, lowConfidence = false, onDone, onAgain }: { assessments: Assessment[]; overall: Assessment['status']; lowConfidence?: boolean; onDone: () => void; onAgain?: () => void }) {
  const [asked, setAsked] = useState(false);
  const { lang, t } = useT();
  const list = dedupeBloodPressure(assessments);
  const headline = lang === 'ar' ? plainHeadlineAr(overall) : plainHeadline(overall);
  const sentence = (a: Assessment) => (lang === 'ar' ? plainSentenceAr(a.indicator, a.status) : plainSentence(a.indicator, a.status));
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6">
      <div className="flex flex-wrap items-center gap-4">
        <StatusBadge status={overall} size="lg" />
        <h1 className={`text-4xl font-semibold ${STATUS_INFO[overall].text}`}>{headline}</h1>
      </div>
      {lowConfidence && (
        <div role="status" className="flex flex-col items-start gap-3 rounded-2xl border border-watch/50 bg-watch/10 px-5 py-4 text-xl text-watch">
          <p>{t('lowConfidence')}</p>
          {onAgain && <Button big variant="secondary" onClick={onAgain}><Play aria-hidden size={22} /> {t('measureAgain')}</Button>}
        </div>
      )}
      {overall === 'act' && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border-2 border-act bg-act/10 p-5 text-2xl text-act">
          <p>{t('callNowIfUnwell')}</p>
          <a href="tel:999" className="inline-flex w-fit items-center gap-2 rounded-xl bg-act px-5 py-3 text-xl font-semibold text-space-950 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-contrast"><Phone aria-hidden size={24} /> {t('call999')}</a>
        </div>
      )}
      {list.length === 0 ? (
        <p className="text-2xl text-slate-100">{t('nothingMeasured')}</p>
      ) : (
        <>
          <HomeTiles assessments={list} />
          {/* Anything typed in, beyond the station's three readings. */}
          {list.some((a) => !TILES.some((tile) => tile.indicator === a.indicator)) && (
            <ul className="flex flex-col gap-3 text-2xl text-slate-100">
              {list.filter((a) => !TILES.some((tile) => tile.indicator === a.indicator)).map((a) => <li key={a.indicator}>{sentence(a)}</li>)}
            </ul>
          )}
        </>
      )}
      <FamilyCard sendText={overall === 'ok' ? t('sendFamily') : t('tellFamily')} />
      <div className="flex flex-wrap gap-4">
        <Button big onClick={() => { setAsked(true); onDone(); }}>{t('done')}</Button>
      </div>
      <span className="sr-only">{asked ? 'closed' : ''}</span>
    </div>
  );
}
