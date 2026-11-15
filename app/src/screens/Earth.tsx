// Earth · Flight Surgeon (APP_BUILD_GUIDE.md 10.7). Sending is simulated; we never pretend Earth replied.
// Three steps, in the order a crew member needs them: 1 the report, 2 send it to Earth, 3 what to do while waiting.
import { ChevronRight, FileText, Info, Send, Sparkles } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { askCoach } from '../coach/client.ts';
import { toRequestBody } from '../coach/send.ts';
import { Button, Card } from '../components/Card.tsx';
import { DelayAnimation } from '../components/DelayAnimation.tsx';
import { SOURCE_INFO, STATUS_INFO } from '../components/info.ts';
import { StatusBadge } from '../components/Status.tsx';
import { crewById, missionById, missions, symptomById } from '../data/index.ts';
import { useNow } from '../hooks.ts';
import { cardsFor, recentSymptomIds } from '../logic/cards.ts';
import { formatValue } from '../logic/format.ts';
import { INDICATOR_SHORT, latestAssessments } from '../logic/overview.ts';
import { emergencyReportInput } from '../logic/reportInput.ts';
import { overallStatus } from '../logic/status.ts';
import { buildReport, clock } from '../logic/summary.ts';
import { useSession } from '../session.ts';
import { useStore } from '../store.ts';
import type { MissionId } from '../types.ts';

/** Short delay words for the comparison strip (the full wording, with sources, is in missions.json). */
const SHORT_DELAY: Record<MissionId, string> = { iss: '1–1.5 s', moon: '1.3 s', rover: '1.3 s', mars: 'up to 22 min' };

/** The station's signal quality (0–1) in words people understand. */
function signalWords(q: number | null | undefined): string | null {
  if (q === null || q === undefined) return null;
  return q >= 0.8 ? 'good signal' : q >= 0.5 ? 'fair signal' : 'weak signal';
}

/** A numbered step heading. */
function Step({ n, title, action, children }: { n: number; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-50">
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-700 text-base text-white">{n}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function Earth() {
  const crewId = useStore((s) => s.crewId);
  const day = useStore((s) => s.missionDay);
  const missionId = useStore((s) => s.missionId);
  const setMission = useStore((s) => s.setMission);
  const readings = useStore((s) => s.readings);
  const logs = useStore((s) => s.symptoms);
  const emergency = useStore((s) => s.emergency);
  const emergencies = useStore((s) => s.emergencies);
  const sentAt = useSession((s) => s.earthSentAt[crewId]) ?? null;
  const summary = useSession((s) => s.summaries[crewId]);
  const [writing, setWriting] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const now = useNow(1000);
  const mission = missionById(missionId);

  const items = useMemo(() => latestAssessments(readings, crewId, day), [readings, crewId, day]);
  const assessments = items.flatMap((i) => (i.assessment ? [i.assessment] : []));
  const overall = overallStatus(assessments);
  const symptomIds = recentSymptomIds(logs, crewId, day);
  // Call surgeon first, then Watch.
  const flagged = items
    .filter((i) => i.assessment && i.assessment.status !== 'ok')
    .sort((a, b) => (a.assessment!.status === 'act' ? 0 : 1) - (b.assessment!.status === 'act' ? 0 : 1));
  const cards = cardsFor(assessments, symptomIds);
  // Urgent (escalating) cards open; the rest collapse to one line. With no urgent card, the first one opens.
  const waitCards = [...cards].sort((a, b) => Number(b.escalate) - Number(a.escalate));
  const anyUrgent = waitCards.some((c) => c.escalate);

  const templateText = buildReport({
    priority: false,
    crewLabel: crewById(crewId).label,
    missionName: mission.name,
    missionDay: day,
    startedAt: now.toISOString(), // when the report was prepared
    redFlags: [],
    latest: items.map((i) => ({
      label: INDICATOR_SHORT[i.indicator],
      shown: Object.values(formatValue(i.indicator, i.reading.value, i.reading.unit)).join(' ').trim(),
      time: i.reading.time,
      source: i.reading.source,
      quality: i.reading.quality,
      status: i.assessment?.status ?? null,
    })),
    trend: flagged.map((i) => i.assessment!.reason.replace(/\.$/, '')),
    otherSymptoms: symptomIds.map((id) => symptomById(id)?.label.toLowerCase() ?? id),
    crewAlertedAt: null,
  });

  const writeSummary = async () => {
    setWriting(true);
    const result = await askCoach(toRequestBody('summary'));
    useSession.getState().setSummary(crewId, result.ok ? { text: result.reply.answer, source: 'coach' } : { text: templateText, source: 'offline' });
    setWriting(false);
  };

  const mineEmergencies = [...(emergency ? [emergency] : []), ...emergencies].filter((e) => e.crewId === crewId);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <h1 className="text-[28px] font-semibold text-slate-50">
        Earth · Flight Surgeon <span className="text-base font-normal text-slate-400">· {mission.name}, Day {day}</span>
      </h1>

      {/* Emergencies matter most, so their PRIORITY reports come first. */}
      {mineEmergencies.length > 0 && (
        <Card title="Priority reports from emergencies">
          <ul className="flex flex-col gap-3">
            {mineEmergencies.map((e) => (
              <li key={e.id}>
                <p className="text-base font-semibold text-act">PRIORITY · Day {e.missionDay} · {clock(e.startedAt)} · {e.reportSentAt ? `sent ${clock(e.reportSentAt)}` : 'not sent'}{e.closedAt ? '' : ' · open'}</p>
                <pre className="mt-1 whitespace-pre-wrap rounded-xl bg-space-950 p-3 text-sm text-slate-200">{buildReport(emergencyReportInput({ event: e, missionId, readings, symptomLogs: logs }))}</pre>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 1 · The report, built from the readings (the Coach can add a written summary). */}
      <Step n={1} title="Report (checked by you)" action={<StatusBadge status={overall} />}>
        <p className="text-lg font-medium text-slate-100">{crewById(crewId).label} · Day {day}</p>
        <ul className="mt-3 flex flex-col gap-2.5">
          {flagged.length === 0 && (
            <li className="flex items-start gap-2 text-base text-slate-200">
              <STATUS_INFO.ok.Icon aria-hidden size={20} className="mt-0.5 shrink-0 text-ok" /> Everything measured is inside the safe range.
            </li>
          )}
          {flagged.map((i) => {
            const info = STATUS_INFO[i.assessment!.status];
            const meta = [clock(i.reading.time), signalWords(i.reading.quality), SOURCE_INFO[i.reading.source].label].filter(Boolean).join(' · ');
            return (
              <li key={i.indicator} className="flex items-start gap-2">
                <info.Icon aria-label={info.word} size={20} className={`mt-0.5 shrink-0 ${info.text}`} />
                <div>
                  <p className="text-base text-slate-100">{i.assessment!.reason}</p>
                  <p className="text-sm text-slate-400">{meta}</p>
                </div>
              </li>
            );
          })}
          {symptomIds.length > 0 && (
            <li className="flex items-start gap-2 text-base text-slate-200">
              <Info aria-hidden size={20} className="mt-0.5 shrink-0 text-slate-400" />
              Symptoms (last 3 days): {symptomIds.map((id) => symptomById(id)?.label.toLowerCase() ?? id).join(', ')}
            </li>
          )}
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="secondary" aria-expanded={showFull} onClick={() => setShowFull(!showFull)}><FileText aria-hidden size={20} /> {showFull ? 'Hide full report' : 'Show full report'}</Button>
          <Button variant="secondary" disabled={writing} onClick={writeSummary}><Sparkles aria-hidden size={18} /> {writing ? 'Writing…' : summary ? 'Ask the Coach again' : 'Ask the Coach for a summary'}</Button>
        </div>
        {showFull && <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-space-950 p-4 text-sm text-slate-200">{templateText}</pre>}
        {summary && (
          <div className="mt-3 rounded-xl border border-contrast/10 bg-space-950 p-4">
            <p className="text-sm text-slate-400">{summary.source === 'coach' ? "Coach's summary, written from your readings. Check it before you rely on it." : 'Offline: the Coach could not be reached, so this was written from a template.'}</p>
            <p className="mt-2 whitespace-pre-wrap text-base text-slate-100">{summary.text}</p>
          </div>
        )}
      </Step>

      {/* 2 · Send it, and see how long Earth takes. */}
      <Step n={2} title="Send to Earth">
        <p className="text-base text-slate-200">
          <strong>{mission.name}:</strong> {mission.delayLabel}. A message takes that long to reach the flight surgeon, and the reply the same again.
        </p>

        {/* Why distance matters: the same report, four places. Click one to switch the mission. */}
        <div role="group" aria-label="Signal delay by mission" className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {missions.map((m) => {
            const on = m.id === missionId;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={on}
                onClick={() => setMission(m.id)}
                className={`flex flex-col items-start rounded-xl border px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-cyan-400 ${on ? 'border-cyan-400 bg-cyan-700/20' : 'border-contrast/15 hover:bg-contrast/5'}`}
              >
                <span className={`text-sm ${on ? 'text-cyan-400' : 'text-slate-400'}`}>{m.name}</span>
                <span className="text-lg font-semibold tabular-nums text-slate-50">{SHORT_DELAY[m.id]}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={() => useSession.getState().sendToEarth(crewId)}>
            <Send aria-hidden size={20} /> {sentAt ? 'Send again (simulated)' : 'Send report to Earth (simulated)'}
          </Button>
          {!sentAt && <span className="text-base text-slate-400">Nothing sent yet.</span>}
        </div>
        {sentAt && <DelayAnimation oneWaySec={mission.oneWayDelaySec} sentAt={sentAt} from={mission.name} />}
        <p className="mt-3 flex items-start gap-2 text-sm text-slate-400">
          <Info aria-hidden size={16} className="mt-0.5 shrink-0" />
          Simulated: nothing leaves this app. A real mission would send the report over the spacecraft's link to the flight surgeon.
        </p>
      </Step>

      {/* 3 · While waiting: urgent guidance open, the rest one line each. */}
      <Step n={3} title="While you wait">
        {waitCards.length === 0 ? (
          <p className="text-base text-slate-400">No guidance card applies right now.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {waitCards.map((c, idx) => (
              <details key={c.id} open={c.escalate || (!anyUrgent && idx === 0)} className="group rounded-xl border border-contrast/10 bg-space-950 px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-base font-semibold text-slate-100 focus-visible:outline-2 focus-visible:outline-cyan-400">
                  <ChevronRight aria-hidden size={18} className="shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
                  {c.title}
                  {c.escalate && <span className="rounded-full bg-act/15 px-2 py-0.5 text-sm font-semibold text-act">Urgent</span>}
                  <span className="ml-auto text-sm font-normal text-slate-400">{c.actions.length} {c.actions.length === 1 ? 'step' : 'steps'}</span>
                </summary>
                <ul className="mt-2 list-disc pl-10 text-base text-slate-200">{c.actions.map((a) => <li key={a}>{a}</li>)}</ul>
              </details>
            ))}
          </div>
        )}
      </Step>
    </div>
  );
}
