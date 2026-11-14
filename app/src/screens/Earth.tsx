// Flight Surgeon: "Earth" (APP_BUILD_GUIDE.md 10.7). Sending is simulated; we never pretend Earth replied.
import { FileText, Send, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { askCoach } from '../coach/client.ts';
import { toRequestBody } from '../coach/send.ts';
import { Button, Card } from '../components/Card.tsx';
import { DelayAnimation } from '../components/DelayAnimation.tsx';
import { StatusBadge } from '../components/Status.tsx';
import { crewById, missionById, symptomById } from '../data/index.ts';
import { crewTitle, missionTitle, symptomTitle, SOURCE_KEY } from '../i18n-app.ts';
import { useT } from '../i18n.ts';
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
  const { lang, t } = useT();
  const ar = lang === 'ar';
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
      <h1 className="text-[28px] font-semibold text-slate-50">{t('earthTitle')} <span className="text-base font-normal text-slate-400">· {t('missionDayLine', { mission: missionTitle(mission.id, mission.name, ar), day })}</span></h1>

      <Card title={t('signalTitle')}>
        <p className="text-base text-slate-300">{t('oneWayDelay')} <strong>{ar ? t(`delay_${mission.id}` as 'delay_iss') : mission.delayLabel}</strong>{mission.id === 'mars' ? ` ${t('exampleValue')}` : ''}. {t('delayUsed', { d: formatDelay(mission.oneWayDelaySec) })}</p>
        {sentAt ? (
          <>
            <DelayAnimation oneWaySec={mission.oneWayDelaySec} sentAt={sentAt} />
            <p className="mt-2 text-base text-slate-200" aria-live="polite">
              {replyIn > 0 ? t('replyExpected', { d: formatDelay(replyIn) }) : t('replyNow')}
            </p>
          </>
        ) : (
          <p className="mt-2 text-base text-slate-400">{t('nothingSent')}</p>
        )}
      </Card>

      <Card title={t('reportTitle')} action={<StatusBadge status={overall} />}>
        <p className="text-lg font-medium text-slate-100">{crewTitle(crewId, crewById(crewId).label, ar)} · {t('dayN', { n: day })}</p>
        <ul className="mt-2 flex list-disc flex-col gap-1 ps-5 text-base text-slate-200">
          {flagged.length === 0 && <li>{t('allOk')}</li>}
          {flagged.map((i) => (
            <li key={i.indicator}>
              <span dir="auto">{i.assessment!.reason}</span>{' '}
              <span className="text-slate-400">{t('measuredLine', { time: clock(i.reading.time), q: i.reading.quality != null ? t('qualityPart', { q: i.reading.quality.toFixed(2) }) : '', src: t(SOURCE_KEY[i.reading.source]) })}</span>
            </li>
          ))}
          {symptomIds.length > 0 && <li>{t('symptomsLine', { list: symptomIds.map((id) => symptomTitle(id, symptomById(id)?.label.toLowerCase() ?? id, ar)).join(ar ? '، ' : ', ') })}</li>}
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => useSession.getState().sendToEarth(crewId)}><Send aria-hidden size={20} /> {sentAt ? t('sendAgain') : t('sendEarth')}</Button>
          <Button variant="secondary" aria-expanded={showFull} onClick={() => setShowFull(!showFull)}><FileText aria-hidden size={20} /> {showFull ? t('hideFull') : t('showFull')}</Button>
        </div>
        {showFull && <pre dir="ltr" className="mt-3 whitespace-pre-wrap rounded-xl bg-space-950 p-4 text-sm text-slate-200">{templateText}</pre>}
      </Card>

      <Card title={t('summaryTitle')} action={<Button variant="secondary" disabled={writing} onClick={writeSummary}><Sparkles aria-hidden size={18} /> {writing ? t('writing') : summary ? t('writeAgain') : t('askCoachWrite')}</Button>}>
        {summary ? (
          <>
            <p className="text-sm text-slate-400">{summary.source === 'coach' ? t('summaryCoach') : t('summaryOffline')}</p>
            <p className="mt-2 whitespace-pre-wrap text-base text-slate-100">{summary.text}</p>
          </>
        ) : (
          <p className="text-base text-slate-400">{t('summaryHint')}</p>
        )}
      </Card>

      {mineEmergencies.length > 0 && (
        <Card title={t('priorityTitle')}>
          <ul className="flex flex-col gap-3">
            {mineEmergencies.map((e) => (
              <li key={e.id}>
                <p className="text-base font-semibold text-act">{t('priorityLine', { day: e.missionDay, time: clock(e.startedAt), sent: e.reportSentAt ? t('sentAt', { time: clock(e.reportSentAt) }) : t('notSent'), open: e.closedAt ? '' : t('openSuffix') })}</p>
                <pre className="mt-1 whitespace-pre-wrap rounded-xl bg-space-950 p-3 text-sm text-slate-200">{buildReport(emergencyReportInput({ event: e, missionId, readings, symptomLogs: logs }))}</pre>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title={t('waitTitle')}>
        {waitCards.length === 0 ? (
          <p className="text-base text-slate-400">{t('noCardApplies')}</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {waitCards.map((c) => (
              <li key={c.id}>
                <p dir="auto" className="text-base font-semibold text-slate-100">{c.title}</p>
                <ul dir="auto" className="list-disc ps-5 text-base text-slate-200">{c.actions.map((a) => <li key={a}>{a}</li>)}</ul>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
