// Flight Surgeon: "Earth" (APP_BUILD_GUIDE.md 10.7). Sending is simulated; we never pretend Earth replied.
import { FileText, Send, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { askCoach } from '../coach/client.ts';
import { toRequestBody } from '../coach/send.ts';
import { Button, Card } from '../components/Card.tsx';
import { DelayAnimation } from '../components/DelayAnimation.tsx';
import { StatusBadge } from '../components/Status.tsx';
import { crewById, missionById, symptomById } from '../data/index.ts';
import { useNow } from '../hooks.ts';
import { cardsFor, recentSymptomIds } from '../logic/cards.ts';
import { formatDelay, formatValue } from '../logic/format.ts';
import { INDICATOR_SHORT, latestAssessments } from '../logic/overview.ts';
import { emergencyReportInput } from '../logic/reportInput.ts';
import { overallStatus } from '../logic/status.ts';
import { buildReport, clock } from '../logic/summary.ts';
import { useSession } from '../session.ts';
import { useStore } from '../store.ts';

export function Earth() {
  const crewId = useStore((s) => s.crewId);
  const day = useStore((s) => s.missionDay);
  const missionId = useStore((s) => s.missionId);
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
  const flagged = items.filter((i) => i.assessment && i.assessment.status !== 'ok');
  const cards = cardsFor(assessments, symptomIds);
  // The escalating cards come first: they are what to do while waiting for the surgeon.
  const waitCards = [...cards].sort((a, b) => Number(b.escalate) - Number(a.escalate));

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

  const elapsed = sentAt ? (now.getTime() - Date.parse(sentAt)) / 1000 : 0;
  const replyIn = Math.max(0, mission.oneWayDelaySec * 2 - elapsed); // the report must arrive, then Earth's answer must come back
  const mineEmergencies = [...(emergency ? [emergency] : []), ...emergencies].filter((e) => e.crewId === crewId);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <h1 className="text-[28px] font-semibold text-slate-50">Flight Surgeon <span className="text-base font-normal text-slate-400">· {mission.name}, Day {day}</span></h1>

      <Card title="Signal to Earth">
        <p className="text-base text-slate-300">One-way delay: <strong>{mission.delayLabel}</strong>{mission.id === 'mars' ? ' (an example value)' : ''}. Delay used here: {formatDelay(mission.oneWayDelaySec)}.</p>
        {sentAt ? (
          <>
            <DelayAnimation oneWaySec={mission.oneWayDelaySec} sentAt={sentAt} />
            <p className="mt-2 text-base text-slate-200" aria-live="polite">
              {replyIn > 0 ? `Reply expected in: ${formatDelay(replyIn)}` : "Earth's reply could arrive now. This demo does not simulate one."}
            </p>
          </>
        ) : (
          <p className="mt-2 text-base text-slate-400">Nothing sent yet.</p>
        )}
      </Card>

      <Card title="Report (checked by you)" action={<StatusBadge status={overall} />}>
        <p className="text-lg font-medium text-slate-100">{crewById(crewId).label} · Day {day}</p>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-base text-slate-200">
          {flagged.length === 0 && <li>Everything measured is inside the safe range.</li>}
          {flagged.map((i) => (
            <li key={i.indicator}>
              {i.assessment!.reason}{' '}
              <span className="text-slate-400">Measured {clock(i.reading.time)}{i.reading.quality != null ? `, quality ${i.reading.quality.toFixed(2)}` : ''}, {i.reading.source}.</span>
            </li>
          ))}
          {symptomIds.length > 0 && <li>Symptoms (last 3 days): {symptomIds.map((id) => symptomById(id)?.label.toLowerCase() ?? id).join(', ')}</li>}
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => useSession.getState().sendToEarth(crewId)}><Send aria-hidden size={20} /> {sentAt ? 'Send again' : 'Send report to Earth'}</Button>
          <Button variant="secondary" aria-expanded={showFull} onClick={() => setShowFull(!showFull)}><FileText aria-hidden size={20} /> {showFull ? 'Hide full report' : 'Show full report'}</Button>
        </div>
        {showFull && <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-space-950 p-4 text-sm text-slate-200">{templateText}</pre>}
      </Card>

      <Card title="Coach's summary" action={<Button variant="secondary" disabled={writing} onClick={writeSummary}><Sparkles aria-hidden size={18} /> {writing ? 'Writing…' : summary ? 'Write again' : 'Ask the Coach to write it'}</Button>}>
        {summary ? (
          <>
            <p className="text-sm text-slate-400">{summary.source === 'coach' ? 'Written by the Coach from your readings. Check it before you rely on it.' : 'Offline: the Coach could not be reached, so this was written from a template.'}</p>
            <p className="mt-2 whitespace-pre-wrap text-base text-slate-100">{summary.text}</p>
          </>
        ) : (
          <p className="text-base text-slate-400">Optional. The report above is always built from your readings, with or without the Coach.</p>
        )}
      </Card>

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

      <Card title="While you wait (from the guidance cards)">
        {waitCards.length === 0 ? (
          <p className="text-base text-slate-400">No guidance card applies right now.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {waitCards.map((c) => (
              <li key={c.id}>
                <p className="text-base font-semibold text-slate-100">{c.title}</p>
                <ul className="list-disc pl-5 text-base text-slate-200">{c.actions.map((a) => <li key={a}>{a}</li>)}</ul>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
