import { useMemo, useState } from 'react';
import { BodyFigure } from '../components/BodyFigure.tsx';
import { CardView } from '../components/CardView.tsx';
import { Card } from '../components/Card.tsx';
import { Sparkline } from '../components/Sparkline.tsx';
import { SourceIcon, StatusBadge } from '../components/Status.tsx';
import { STATUS_INFO } from '../components/info.ts';
import { missionById, symptomById, systems } from '../data/index.ts';
import { cardsFor, recentSymptomIds } from '../logic/cards.ts';
import { formatValue } from '../logic/format.ts';
import { lastDays, latestAssessments } from '../logic/overview.ts';
import { INDICATOR_LABELS } from '../logic/status.ts';
import { systemStates, type SystemState } from '../logic/systems.ts';
import { useStore } from '../store.ts';
import type { BodySystem, HazardId } from '../types.ts';

const HAZARDS: { id: HazardId; label: string }[] = [
  { id: 'radiation', label: 'Radiation' },
  { id: 'isolation', label: 'Isolation' },
  { id: 'distance', label: 'Distance from Earth' },
  { id: 'gravity', label: 'Gravity' },
  { id: 'environment', label: 'Environment' },
];

/** NASA's five questions, on screen. */
function Question({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-contrast/10 bg-space-950 px-4 py-3">
      <summary className="cursor-pointer list-none text-lg font-medium text-slate-100 marker:hidden focus-visible:outline-2 focus-visible:outline-cyan-400">
        <span aria-hidden className="mr-2 inline-block text-cyan-400 transition-transform group-open:rotate-90">▸</span>
        {title}
      </summary>
      <div className="mt-2 text-base text-slate-300">{children}</div>
    </details>
  );
}

function Panel({ state }: { state: SystemState }) {
  const crewId = useStore((s) => s.crewId);
  const day = useStore((s) => s.missionDay);
  const readings = useStore((s) => s.readings);
  const logs = useStore((s) => s.symptoms);
  const { system } = state;

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
        <h2 className="text-2xl font-semibold text-slate-50">{system.name}</h2>
        {state.status ? <StatusBadge status={state.status} size="lg" /> : <span className="text-base text-slate-400">No range set yet</span>}
      </div>
      <p className="mt-1 text-lg text-slate-300">{system.function}</p>
      <p className="mt-3 text-base text-slate-200">{state.reason}</p>

      {state.items.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {state.items.map((i) => {
            const f = formatValue(i.indicator, i.reading.value, i.reading.unit);
            return (
              <li key={i.indicator} className="flex flex-wrap items-center gap-3 text-base text-slate-200">
                <span className="min-w-44 font-medium">{INDICATOR_LABELS[i.indicator]}</span>
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
          <span className="text-sm text-slate-400">Last 7 days</span>
        </div>
      )}
      {state.symptoms.length > 0 && <p className="mt-3 text-base text-slate-300">Symptoms (last 3 days): {state.symptoms.map((s) => s.label.toLowerCase()).join(', ')}</p>}

      <div className="mt-4 flex flex-col gap-2">
        <Question title="What can be measured in space">{system.measureInSpace}</Question>
        <Question title="Why check it">{system.whyCheck}</Question>
        <Question title="How spaceflight affects it">{system.hazardEffects}</Question>
        <Question title="When to act: you / the flight surgeon">
          <p><strong className="text-slate-100">You:</strong> {system.whenToAct.crew}</p>
          <p className="mt-1"><strong className="text-slate-100">The flight surgeon:</strong> {system.whenToAct.surgeon}</p>
        </Question>
        <Question title="How to prevent problems">
          <ul className="list-disc pl-5">{system.prevention.map((p) => <li key={p}>{p}</li>)}</ul>
        </Question>
      </div>

      {cards.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          <h3 className="text-lg font-semibold text-slate-100">Guidance</h3>
          {cards.map((c) => <CardView key={c.id} card={c} />)}
        </div>
      )}
      <p className="mt-3 text-sm text-slate-400">
        Source:{' '}
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
      <h1 className="text-[28px] font-semibold text-slate-50">Body</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
        <div className="flex flex-col gap-4">
          <BodyFigure
            statuses={Object.fromEntries(states.map((s) => [s.system.id, s.status])) as Record<BodySystem['id'], never>}
            names={Object.fromEntries(states.map((s) => [s.system.id, s.system.name])) as Record<BodySystem['id'], string>}
            selected={selected}
            highlighted={highlighted}
            onSelect={setSelected}
          />
          <button type="button" aria-pressed={showHazards} onClick={() => setShowHazards(!showHazards)} className={`rounded-xl border px-4 py-2 text-base font-medium focus-visible:outline-2 focus-visible:outline-cyan-400 ${showHazards ? 'border-cyan-400 bg-cyan-700/30 text-cyan-400' : 'border-contrast/20 text-slate-200 hover:bg-contrast/10'}`}>
            {showHazards ? 'Hide hazards' : 'Show hazards'}
          </button>
          {showHazards && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Hazards">
              {HAZARDS.map((h) => (
                <button key={h.id} type="button" aria-pressed={active.has(h.id)} onClick={() => toggleHazard(h.id)} className={`rounded-full border px-3 py-1.5 text-sm ${active.has(h.id) ? 'border-cyan-400 bg-cyan-700/30 text-cyan-400' : 'border-contrast/20 text-slate-300 hover:bg-contrast/10'} focus-visible:outline-2 focus-visible:outline-cyan-400`}>
                  {h.label}{missionById(missionId).riskHighlights.includes(h.id) ? ' ★' : ''}
                </button>
              ))}
              <p className="basis-full text-sm text-slate-400">A dashed ring marks the label of every system these hazards affect. ★ marks this mission's main risks.</p>
            </div>
          )}
        </div>
        <Panel state={byId[selected]} />
      </div>
    </div>
  );
}
