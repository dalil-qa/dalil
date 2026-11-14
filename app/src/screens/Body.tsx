import { useMemo, useState } from 'react';
import { BodyFigure } from '../components/BodyFigure.tsx';
import { CardView } from '../components/CardView.tsx';
import { Card } from '../components/Card.tsx';
import { Sparkline } from '../components/Sparkline.tsx';
import { SourceIcon, StatusBadge } from '../components/Status.tsx';
import { STATUS_INFO } from '../components/info.ts';
import { missionById, symptomById, systems } from '../data/index.ts';
import { indicatorName } from '../i18n-app.ts';
import { useT } from '../i18n.ts';
import { cardsFor, recentSymptomIds } from '../logic/cards.ts';
import { formatValue } from '../logic/format.ts';
import { lastDays, latestAssessments } from '../logic/overview.ts';
import { INDICATOR_LABELS } from '../logic/status.ts';
import { systemStates, type SystemState } from '../logic/systems.ts';
import { useStore } from '../store.ts';
import type { BodySystem, HazardId } from '../types.ts';

const HAZARDS = [
  { id: 'radiation', key: 'hzRadiation' },
  { id: 'isolation', key: 'hzIsolation' },
  { id: 'distance', key: 'hzDistance' },
  { id: 'gravity', key: 'hzGravity' },
  { id: 'environment', key: 'hzEnvironment' },
] as const satisfies readonly { id: HazardId; key: string }[];

/** NASA's five questions, on screen. */
function Question({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-contrast/10 bg-space-950 px-4 py-3">
      <summary className="cursor-pointer list-none text-lg font-medium text-slate-100 marker:hidden focus-visible:outline-2 focus-visible:outline-cyan-400">
        <span aria-hidden className="me-2 inline-block text-cyan-400 transition-transform group-open:rotate-90">▸</span>
        {title}
      </summary>
      <div dir="auto" className="mt-2 text-base text-slate-300">{children}</div>
    </details>
  );
}

function Panel({ state }: { state: SystemState }) {
  const crewId = useStore((s) => s.crewId);
  const day = useStore((s) => s.missionDay);
  const readings = useStore((s) => s.readings);
  const logs = useStore((s) => s.symptoms);
  const { system } = state;
  const { lang, t } = useT();
  const ar = lang === 'ar';

  const cards = useMemo(() => {
    const assessments = state.items.flatMap((i) => (i.assessment ? [i.assessment] : []));
    // Cards for this system's indicators, plus the cards of recent symptoms that belong to this system.
    const ids = recentSymptomIds(logs, crewId, day).filter((id) => symptomById(id)?.system === system.id);
    return cardsFor(assessments, ids);
  }, [state, system.id, logs, crewId, day]);
  const first = state.items[0];

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-slate-50">{t(`sys_${system.id}` as 'sys_heart')}</h2>
        {state.status ? <StatusBadge status={state.status} size="lg" /> : <span className="text-base text-slate-400">{t('noRangeYet')}</span>}
      </div>
      <p dir="auto" className="mt-1 text-lg text-slate-300">{system.function}</p>
      <p dir="auto" className="mt-3 text-base text-slate-200">{state.reason}</p>

      {state.items.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {state.items.map((i) => {
            const f = formatValue(i.indicator, i.reading.value, i.reading.unit);
            return (
              <li key={i.indicator} className="flex flex-wrap items-center gap-3 text-base text-slate-200">
                <span className="min-w-44 font-medium">{indicatorName(i.indicator, INDICATOR_LABELS[i.indicator], ar)}</span>
                <span className="tabular-nums">{f.value} {f.unit}</span>
                {i.assessment && <StatusBadge status={i.assessment.status} />}
                <SourceIcon source={i.reading.source} />
              </li>
            );
          })}
        </ul>
      )}
      {first && (
        <div className="mt-2 max-w-xs" aria-label={`${INDICATOR_LABELS[first.indicator]}, last 7 days`}>
          <Sparkline values={lastDays(readings, crewId, first.indicator, day)} className={state.status ? STATUS_INFO[state.status].stroke : 'stroke-cyan-400'} />
          <span className="text-sm text-slate-400">{t('last7')}</span>
        </div>
      )}
      {state.symptoms.length > 0 && <p className="mt-3 text-base text-slate-300">{t('symptomsLast3', { list: state.symptoms.map((s) => s.label.toLowerCase()).join(', ') })}</p>}

      <div className="mt-4 flex flex-col gap-2">
        <Question title={t('qMeasure')}>{system.measureInSpace}</Question>
        <Question title={t('qWhy')}>{system.whyCheck}</Question>
        <Question title={t('qEffects')}>{system.hazardEffects}</Question>
        <Question title={t('qWhen')}>
          <p><strong className="text-slate-100">{t('youLabel')}</strong> {system.whenToAct.crew}</p>
          <p className="mt-1"><strong className="text-slate-100">{t('surgeonLabel')}</strong> {system.whenToAct.surgeon}</p>
        </Question>
        <Question title={t('qPrevent')}>
          <ul className="list-disc ps-5">{system.prevention.map((p) => <li key={p}>{p}</li>)}</ul>
        </Question>
      </div>

      {cards.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          <h3 className="text-lg font-semibold text-slate-100">{t('guidanceTitle')}</h3>
          {cards.map((c) => <CardView key={c.id} card={c} />)}
        </div>
      )}
      <p className="mt-3 text-sm text-slate-400">
        {t('source')}{' '}
        {system.sources.map((s) => <a key={s.url + s.title} className="underline underline-offset-2 hover:text-cyan-400" href={s.url} target="_blank" rel="noreferrer">{s.title}</a>)}
      </p>
    </Card>
  );
}

export function Body() {
  const crewId = useStore((s) => s.crewId);
  const day = useStore((s) => s.missionDay);
  const missionId = useStore((s) => s.missionId);
  const readings = useStore((s) => s.readings);
  const logs = useStore((s) => s.symptoms);
  const emergency = useStore((s) => s.emergency);
  const emergencies = useStore((s) => s.emergencies);
  const { t } = useT();
  const [selected, setSelected] = useState<BodySystem['id']>('heart');
  // Off at first, so the figure reads cleanly; the mission's own risks are pre-marked once they're shown.
  const [showHazards, setShowHazards] = useState(false);
  const [picked, setPicked] = useState<Set<HazardId> | null>(null);

  const states = useMemo(
    () => systemStates({ items: latestAssessments(readings, crewId, day), symptomLogs: logs, emergencies: [...(emergency ? [emergency] : []), ...emergencies], crewId, day }),
    [readings, logs, emergency, emergencies, crewId, day],
  );
  const byId = Object.fromEntries(states.map((s) => [s.system.id, s])) as Record<BodySystem['id'], SystemState>;

  // The mission's own risks are pre-marked the first time the hazards are shown.
  const active = picked ?? new Set<HazardId>(missionById(missionId).riskHighlights);
  const highlighted = new Set<BodySystem['id']>(showHazards ? systems.filter((s) => s.hazards.some((h) => active.has(h))).map((s) => s.id) : []);
  const toggleHazard = (h: HazardId) => {
    const next = new Set(active);
    if (next.has(h)) next.delete(h);
    else next.add(h);
    setPicked(next);
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <h1 className="text-[28px] font-semibold text-slate-50">{t('bodyTitle')}</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
        <div className="flex flex-col gap-4">
          <BodyFigure
            statuses={Object.fromEntries(states.map((s) => [s.system.id, s.status])) as Record<BodySystem['id'], never>}
            names={Object.fromEntries(states.map((s) => [s.system.id, t(`sys_${s.system.id}` as 'sys_heart')])) as Record<BodySystem['id'], string>}
            selected={selected}
            highlighted={highlighted}
            onSelect={setSelected}
          />
          <button type="button" aria-pressed={showHazards} onClick={() => setShowHazards(!showHazards)} className={`rounded-xl border px-4 py-2 text-base font-medium focus-visible:outline-2 focus-visible:outline-cyan-400 ${showHazards ? 'border-cyan-400 bg-cyan-700/30 text-cyan-400' : 'border-contrast/20 text-slate-200 hover:bg-contrast/10'}`}>
            {showHazards ? t('hideHazards') : t('showHazards')}
          </button>
          {showHazards && (
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('hazardsLabel')}>
              {HAZARDS.map((h) => (
                <button key={h.id} type="button" aria-pressed={active.has(h.id)} onClick={() => toggleHazard(h.id)} className={`rounded-full border px-3 py-1.5 text-sm ${active.has(h.id) ? 'border-cyan-400 bg-cyan-700/30 text-cyan-400' : 'border-contrast/20 text-slate-300 hover:bg-contrast/10'} focus-visible:outline-2 focus-visible:outline-cyan-400`}>
                  {t(h.key)}{missionById(missionId).riskHighlights.includes(h.id) ? ' ★' : ''}
                </button>
              ))}
              <p className="basis-full text-sm text-slate-400">{t('hazardNote')}</p>
            </div>
          )}
        </div>
        <Panel state={byId[selected]} />
      </div>
    </div>
  );
}
