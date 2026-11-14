// Gathers what the report template needs from the app's data (APP_BUILD_GUIDE.md 12.5).
import { crewById, missionById, symptomById } from '../data/index.ts';
import type { EmergencyEvent, Reading, SymptomLog } from '../types.ts';
import { formatValue } from './format.ts';
import { INDICATOR_SHORT, latestAssessments } from './overview.ts';
import type { ReportInput } from './summary.ts';

export function emergencyReportInput(args: {
  event: EmergencyEvent;
  missionId: Parameters<typeof missionById>[0];
  readings: Reading[];
  symptomLogs: SymptomLog[];
}): ReportInput {
  const { event, missionId, readings, symptomLogs } = args;
  const items = latestAssessments(readings, event.crewId, event.missionDay);

  // Symptoms from the last 3 mission days, other than the red flags already listed.
  const other = new Set<string>();
  for (const log of symptomLogs) {
    if (log.crewId !== event.crewId || log.missionDay < event.missionDay - 2 || log.missionDay > event.missionDay) continue;
    for (const id of log.symptoms) {
      const info = symptomById(id);
      if (info && !event.symptoms.includes(id)) other.add(info.label.toLowerCase());
    }
  }

  return {
    priority: true,
    crewLabel: crewById(event.crewId).label,
    missionName: missionById(missionId).name,
    missionDay: event.missionDay,
    startedAt: event.startedAt,
    redFlags: event.symptoms.map((id) => symptomById(id)?.label.toLowerCase() ?? id),
    latest: items.map((i) => ({
      label: INDICATOR_SHORT[i.indicator],
      shown: Object.values(formatValue(i.indicator, i.reading.value, i.reading.unit)).join(' ').trim(),
      time: i.reading.time,
      source: i.reading.source,
      quality: i.reading.quality,
      status: i.assessment?.status ?? null,
    })),
    // Only what is outside the normal range: the reason sentences already say why.
    trend: items.flatMap((i) => (i.assessment && i.assessment.status !== 'ok' ? [i.assessment.reason.replace(/\.$/, '')] : [])),
    otherSymptoms: [...other],
    crewAlertedAt: event.crewAlertedAt,
  };
}
