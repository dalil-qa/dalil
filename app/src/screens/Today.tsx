import { CircleCheck, Circle, Flame, OctagonX, Play, Star } from 'lucide-react';
import { useMemo } from 'react';
import { Button, Card } from '../components/Card.tsx';
import { MetricTile } from '../components/MetricTile.tsx';
import { Ring } from '../components/Ring.tsx';
import { STATUS_INFO } from '../components/info.ts';
import { crewById, missionById } from '../data/index.ts';
import { crewTitle, indicatorName, missionTitle } from '../i18n-app.ts';
import { useT, type Key } from '../i18n.ts';
import { useNow } from '../hooks.ts';
import { formatValue } from '../logic/format.ts';
import { lastDays, latestAssessments, type LatestItem } from '../logic/overview.ts';
import { WATER_GOAL_ML, badges, checkDays, crewScore, streak } from '../logic/score.ts';
import { INDICATOR_LABELS } from '../logic/status.ts';
import { clock } from '../logic/summary.ts';
import { useNav } from '../nav.ts';
import { useStore } from '../store.ts';
import type { IndicatorId, Reading, Status } from '../types.ts';

const ORDER: IndicatorId[] = ['hr', 'spo2', 'temp', 'sleep', 'mood', 'bp_sys', 'glucose', 'water', 'meals', 'exercise'];

function greetingKey(hour: number): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
  return hour < 12 ? 'goodMorning' : hour < 18 ? 'goodAfternoon' : 'goodEvening';
}

function lastCheckText(readings: Reading[], crewId: string, today: number, t: (k: Key, v?: Record<string, string | number>) => string): string {
  const days = [...checkDays(readings, crewId)].filter((d) => d <= today);
  if (days.length === 0) return t('lastCheckNone');
  const last = Math.max(...days);
  const r = readings.find((x) => x.crewId === crewId && x.indicator === 'hr' && x.missionDay === last);
  const when = last === today ? t('whenToday') : last === today - 1 ? t('whenYesterday') : t('whenDay', { n: last });
  return t('lastCheckLine', { when: `${when}${r ? ` ${clock(r.time)}` : ''}` });
}

export function Today() {
  const crewId = useStore((s) => s.crewId);
  const missionId = useStore((s) => s.missionId);
  const day = useStore((s) => s.missionDay);
  const readings = useStore((s) => s.readings);
  const emergencies = useStore((s) => s.emergencies);
  const go = useNav((s) => s.go);
  const openTrend = useNav((s) => s.openTrend);
  const now = useNow();
  const { lang, t } = useT();
  const ar = lang === 'ar';

  const items = useMemo(() => latestAssessments(readings, crewId, day), [readings, crewId, day]);
  const { score, worst } = crewScore(items);
  const run = streak(readings, crewId, day);
  const earned = useMemo(() => badges(readings, crewId), [readings, crewId]);
  const act = items.filter((i) => i.assessment?.status === 'act');

  const byIndicator = new Map(items.map((i) => [i.indicator, i]));
  const spark = (i: IndicatorId) => lastDays(readings, crewId, i, day);

  // Blood pressure is one tile showing both numbers.
  const bpSys = byIndicator.get('bp_sys');
  const bpDia = byIndicator.get('bp_dia');

  const tile = (i: LatestItem) => {
    const f = formatValue(i.indicator, i.reading.value, i.reading.unit);
    return (
      <MetricTile
        key={i.indicator}
        label={indicatorName(i.indicator, INDICATOR_LABELS[i.indicator], ar)}
        value={f.value}
        unit={f.unit}
        status={i.assessment?.status ?? null}
        source={i.reading.source}
        spark={spark(i.indicator)}
        onClick={() => openTrend(i.indicator)}
      />
    );
  };

  const today = (indicator: IndicatorId) => readings.filter((r) => r.crewId === crewId && r.missionDay === day && r.indicator === indicator);
  const water = today('water').at(-1)?.value ?? 0;
  const routine = [
    { label: t('routineMorning'), done: today('hr').length > 0 },
    { label: t('routineEvening'), done: today('sleep').length > 0 || today('mood').length > 0 },
    { label: t('routineWater', { n: WATER_GOAL_ML / 1000 }), done: water >= WATER_GOAL_ML },
  ];

  const todaysEmergency = emergencies.find((e) => e.crewId === crewId && e.missionDay === day);

  return (
    <div className="flex flex-col gap-5">
      {act.length > 0 && (
        <button type="button" onClick={() => go('earth')} className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-start text-lg font-semibold ${STATUS_INFO.act.border} ${STATUS_INFO.act.bg} ${STATUS_INFO.act.text}`}>
          <OctagonX aria-hidden size={26} />
          {t(act.length > 1 ? 'actBannerMany' : 'actBannerOne', { list: act.map((a) => indicatorName(a.indicator, INDICATOR_LABELS[a.indicator], ar)).join(ar ? '، ' : ', ') })}
        </button>
      )}
      {todaysEmergency && (
        <div role="status" className="rounded-2xl border-2 border-act bg-act/10 p-4 text-base text-act">
          {t('emergencyToday', { day: todaysEmergency.missionDay, time: clock(todaysEmergency.startedAt) })}
        </div>
      )}

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-[28px] font-semibold text-slate-50">{t(greetingKey(now.getHours()))}{ar ? '، ' : ', '}{crewTitle(crewId, crewById(crewId).label, ar)}</h1>
        <span className="text-base text-slate-400">{t('missionDayLine', { mission: missionTitle(missionId, missionById(missionId).name, ar), day })}</span>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-8">
          <Ring value={score === null ? 0 : score / 100} size={168} strokeClass={score === null ? 'stroke-white/20' : STATUS_INFO[worst as Status].stroke}>
            <span className="text-5xl font-semibold tabular-nums text-gold-200">{score ?? '–'}</span>
            <span className="text-sm text-slate-400">{t('crewScore')}</span>
          </Ring>
          <div className="flex flex-col gap-3">
            <Button big onClick={() => go('check')}>
              <Play aria-hidden size={22} /> {t('startMorning')}
            </Button>
            <span className="text-base text-slate-300">{lastCheckText(readings, crewId, day, t)}</span>
          </div>
          {run > 0 && (
            <div className="flex items-center gap-2 text-xl font-semibold text-gold-200">
              <Flame aria-hidden size={26} /> {t('streakDays', { n: run })}
            </div>
          )}
        </div>
      </Card>

      {items.length === 0 ? (
        <Card title={t('noReadingsTitle')}>
          <p className="text-base text-slate-300">{t('noReadingsText')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ORDER.map((id) => {
            if (id === 'bp_sys') {
              if (!bpSys) return null;
              return (
                <MetricTile
                  key="bp"
                  label={t('bloodPressure')}
                  value={`${bpSys.reading.value}${bpDia ? `/${bpDia.reading.value}` : ''}`}
                  unit="mmHg"
                  status={bpSys.assessment?.status ?? null}
                  source={bpSys.reading.source}
                  spark={spark('bp_sys')}
                  onClick={() => openTrend('bp_sys')}
                />
              );
            }
            const item = byIndicator.get(id);
            return item ? tile(item) : null;
          })}
        </div>
      )}

      {items.some((i) => i.reading.source === 'sample' || i.reading.source === 'simulated') && (
        <p className="text-sm text-slate-400">{t('sampleNote')}</p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title={t('routineTitle')}>
          <ul className="flex flex-col gap-2">
            {routine.map((r) => (
              <li key={r.label} className="flex items-center gap-2 text-base">
                {r.done ? <CircleCheck aria-hidden className="text-ok" size={20} /> : <Circle aria-hidden className="text-slate-500" size={20} />}
                <span className={r.done ? 'text-slate-300' : 'text-slate-100'}>{r.label}</span>
                <span className="sr-only">{r.done ? t('srDone') : t('srNotDone')}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t('badgesTitle')}>
          <ul className="flex flex-wrap gap-2">
            {earned.map((b) => (
              <li key={b.id} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${b.earned ? 'border-gold-200/50 text-gold-200' : 'border-white/10 text-slate-500'}`}>
                <Star aria-hidden size={14} fill={b.earned ? 'currentColor' : 'none'} />
                {t(`badge_${b.id}` as 'badge_first_check')}
                <span className="sr-only">{b.earned ? t('srEarned') : t('srNotEarned')}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
