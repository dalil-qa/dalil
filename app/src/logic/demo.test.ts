import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sampleReadings, sampleSymptoms, SAMPLE_LAST_DAY } from '../data/sample.ts';
import { detectRedFlags } from './emergency.ts';
import { latestAssessments, lastDays, simulatorBaseline } from './overview.ts';
import { emergencyReportInput } from './reportInput.ts';
import { badges, crewScore, streak } from './score.ts';
import { buildReport } from './summary.ts';

const readings = sampleReadings();

describe('the demo data (sample history)', () => {
  it('covers 47 days and has no red flags or emergencies', () => {
    assert.equal(SAMPLE_LAST_DAY, 47);
    assert.ok(readings.every((r) => r.source === 'sample'));
    const flags = ['chest_pain', 'breathing', 'fainting', 'severe_headache', 'confusion', 'stroke_signs'];
    assert.ok(sampleSymptoms().every((l) => l.symptoms.every((s) => !flags.includes(s))));
  });

  it('Crew Member 2 on day 47: heart rate is Watch, because of the 7-day normal', () => {
    const hr = latestAssessments(readings, 'c2', 47).find((i) => i.indicator === 'hr');
    assert.equal(hr?.reading.value, 74);
    assert.equal(hr?.assessment?.status, 'watch');
    assert.match(hr?.assessment?.reason ?? '', /above your normal .* for 3 days\.$/);
  });

  it('Crew Member 2: vitals stay OK, while sleep, mood, water and meals are off target; crew 1 and 3 are all OK', () => {
    const status = (crew: string, i: string) => latestAssessments(readings, crew, 47).find((x) => x.indicator === i)?.assessment?.status;
    for (const ok of ['spo2', 'temp', 'bp_sys', 'bp_dia', 'exercise']) assert.equal(status('c2', ok), 'ok', ok);
    for (const watch of ['sleep', 'mood', 'water', 'meals']) assert.equal(status('c2', watch), 'watch', watch);
    for (const crew of ['c1', 'c3']) {
      const items = latestAssessments(readings, crew, 47).filter((i) => i.assessment);
      assert.ok(items.every((i) => i.assessment?.status === 'ok'), `${crew}: ${JSON.stringify(items.map((i) => [i.indicator, i.assessment?.status, i.assessment?.reason]))}`);
    }
  });

  it('on earlier days Crew Member 2 was fine (the change is real)', () => {
    assert.equal(latestAssessments(readings, 'c2', 44).find((i) => i.indicator === 'hr')?.assessment?.status, 'ok');
  });

  it('score, streak, badges and sparkline data come out right', () => {
    const items = latestAssessments(readings, 'c2', 47);
    const { score, worst } = crewScore(items);
    assert.equal(worst, 'watch');
    assert.ok(score !== null && score < 100 && score >= 60);
    assert.equal(streak(readings, 'c2', 47), 47);
    const earned = badges(readings, 'c2').filter((b) => b.earned).map((b) => b.id);
    assert.deepEqual(earned, ['first_check', 'streak_7', 'sleep_7', 'water_3', 'meals_3']);
    assert.deepEqual(lastDays(readings, 'c2', 'hr', 47, 3), [74, 74, 74]);
  });

  it('streak keeps going through yesterday while today is not done, and stops at a gap', () => {
    const without47 = readings.filter((r) => !(r.crewId === 'c2' && r.missionDay === 47));
    assert.equal(streak(without47, 'c2', 47), 46);
    const gap = readings.filter((r) => !(r.crewId === 'c2' && r.missionDay === 45));
    assert.equal(streak(gap, 'c2', 47), 2);
  });
});

describe('red-flag word check (12.5)', () => {
  it('matches the guide phrases, in any case and with curly apostrophes', () => {
    assert.deepEqual(detectRedFlags('I have crushing CHEST PAIN'), ['chest_pain']);
    assert.deepEqual(detectRedFlags('I can’t breathe properly'), ['breathing']);
    assert.deepEqual(detectRedFlags('I think I passed out and my face drooping'), ['fainting', 'stroke_signs']);
    assert.deepEqual(detectRedFlags('worst  headache of my life'), ['severe_headache']);
    assert.deepEqual(detectRedFlags('I feel confused right now'), ['confusion']);
    assert.deepEqual(detectRedFlags('my speech is slurred'), ['stroke_signs']);
    assert.deepEqual(detectRedFlags('لدي ألم في الصدر وصعوبة في التنفس'), ['chest_pain', 'breathing']);
  });
  it('stays quiet for ordinary questions, including non-symptom uses of "confused"', () => {
    for (const t of ['Why is my heart rate amber?', 'I feel a bit tired', 'how do I improve my sleep', 'I am confused by this chart', '']) assert.deepEqual(detectRedFlags(t), []);
  });
});

describe('the emergency report template', () => {
  it('builds the PRIORITY report from live data, with statuses, trend and other symptoms', () => {
    const event = {
      id: 'e1', crewId: 'c2', startedAt: '2026-02-16T06:42:00', missionDay: 47, trigger: 'quicklog' as const,
      symptoms: ['chest_pain' as const], latest: [], crewAlertedAt: '2026-02-16T06:42:30', reportSentAt: '2026-02-16T06:42:00',
      updates: [], closedAt: null, closedReason: null,
    };
    const report = buildReport(emergencyReportInput({ event, missionId: 'mars', readings, symptomLogs: sampleSymptoms() }));
    const lines = report.split('\n');
    assert.equal(lines[0], 'PRIORITY · Dalil emergency report');
    assert.equal(lines[1], 'Crew Member 2 · Mars transit · Day 47 · started 06:42');
    assert.equal(lines[2], 'Red flags: chest pain or pressure');
    assert.match(report, /Latest readings: HR 74 bpm \[Watch\] \(06:40, sample, quality 0\.90\)/);
    assert.match(report, /Recent trend: .*above your normal/);
    assert.match(report, /Other symptoms \(last 3 days\): fatigue/);
    assert.match(report, /Crew alerted: 06:42/);
    assert.equal(lines.at(-1), 'Sent by Dalil. Guidance tool only, not a diagnosis.');
  });

  it('shows values the way people read them: 2/5 mood, 1.2 L water', () => {
    const event = {
      id: 'e2', crewId: 'c2', startedAt: '2026-02-16T06:42:00', missionDay: 47, trigger: 'button' as const,
      symptoms: [], latest: [], crewAlertedAt: null, reportSentAt: null, updates: [], closedAt: null, closedReason: null,
    };
    const report = buildReport(emergencyReportInput({ event, missionId: 'mars', readings, symptomLogs: [] }));
    assert.match(report, /mood 2\/5 /);
    assert.match(report, /water 1\.2 L /);
    assert.match(report, /meals 2\/3 /);
    assert.doesNotMatch(report, /1-5| \d+ ml\b/);
  });

  it('says "none recorded" instead of inventing values when there are no readings', () => {
    const report = buildReport({
      priority: true, crewLabel: 'Guest', missionName: 'Space Station', missionDay: 3, startedAt: '2026-01-03T10:00:00',
      redFlags: ['trouble breathing'], latest: [], trend: [], otherSymptoms: [], crewAlertedAt: null,
    });
    assert.match(report, /Latest readings: none recorded/);
    assert.match(report, /Crew alerted: not yet/);
  });
});

describe('the simulator follows each crew member', () => {
  it('uses their own 7-day normal, and sensible defaults when there is no history', () => {
    assert.deepEqual(simulatorBaseline(readings, 'c1', 47), { hr: 62, spo2: 98, temp: 34.3 });
    assert.equal(simulatorBaseline(readings, 'c3', 47).hr, 68);
    assert.equal(simulatorBaseline(readings, 'c2', 47).hr, 65); // the 7-day normal before the rise
    assert.deepEqual(simulatorBaseline([], 'guest', 47), { hr: 65, spo2: 98, temp: 34.5 });
  });
});

describe('an emergency report keeps the mission it happened on', () => {
  it('says Mars transit even if the mission switch now says Space Station', () => {
    const event = {
      id: 'e3', crewId: 'c2', startedAt: '2026-02-16T06:42:00', missionDay: 47, missionId: 'mars' as const, trigger: 'button' as const,
      symptoms: [], latest: [], crewAlertedAt: null, reportSentAt: null, updates: [], closedAt: null, closedReason: null,
    };
    const report = buildReport(emergencyReportInput({ event, missionId: 'iss', readings, symptomLogs: [] }));
    assert.match(report, /Crew Member 2 · Mars transit · Day 47/);
  });
});
