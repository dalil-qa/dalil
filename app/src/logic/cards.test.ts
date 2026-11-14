import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sampleReadings, sampleSymptoms } from '../data/sample.ts';
import { cardsFor, recentSymptomIds } from './cards.ts';
import { insights } from './insights.ts';
import { latestAssessments } from './overview.ts';
import { systemStates } from './systems.ts';
import type { EmergencyEvent } from '../types.ts';

const readings = sampleReadings();
const logs = sampleSymptoms();
const states = (crewId: string, emergencies: EmergencyEvent[] = [], symptomLogs = logs, day = 47) =>
  systemStates({ items: latestAssessments(readings, crewId, day), symptomLogs, emergencies, crewId, day });
const byId = (s: ReturnType<typeof states>, id: string) => s.find((x) => x.system.id === id)!;

describe('guidance cards for the demo day', () => {
  it('Crew Member 2 gets the heart-rate and fatigue cards, and nothing that escalates', () => {
    const items = latestAssessments(readings, 'c2', 47);
    const picked = cardsFor(items.flatMap((i) => (i.assessment ? [i.assessment] : [])), recentSymptomIds(logs, 'c2', 47));
    assert.deepEqual(picked.map((c) => c.id), ['hr-rising', 'symptom-fatigue']);
    assert.ok(picked.every((c) => !c.escalate));
  });
  it('a red status brings the red, escalating card', () => {
    const picked = cardsFor([{ indicator: 'spo2', value: 88, status: 'act', reason: '', baseline: null }], []);
    assert.deepEqual(picked.map((c) => c.id), ['spo2-low']);
    assert.equal(picked[0].escalate, true);
  });
  it('Crew Member 1 needs no cards, and symptoms older than 3 days are ignored', () => {
    assert.deepEqual(cardsFor(latestAssessments(readings, 'c1', 47).flatMap((i) => (i.assessment ? [i.assessment] : [])), []), []);
    assert.deepEqual(recentSymptomIds(logs, 'c2', 49), ['fatigue']); // logged on days 46-47, still inside 3 days on day 48 but not day 50
    assert.deepEqual(recentSymptomIds(logs, 'c2', 50), []);
  });
});

describe('body system colours', () => {
  it('Crew Member 2: heart is Watch (with the reason), immune is Watch from fatigue, lungs and skin are OK', () => {
    const s = states('c2');
    assert.equal(byId(s, 'heart').status, 'watch');
    assert.match(byId(s, 'heart').reason, /above your normal/);
    assert.equal(byId(s, 'immune').status, 'watch');
    assert.match(byId(s, 'immune').reason, /fatigue/i);
    assert.equal(byId(s, 'lungs').status, 'ok');
    assert.equal(byId(s, 'skin').status, 'ok');
  });
  it('symptom-only systems are OK with "No symptoms reported"; systems with no thresholds yet are grey, not green', () => {
    const s = states('c1');
    assert.equal(byId(s, 'eyes').status, 'ok');
    assert.equal(byId(s, 'eyes').reason, 'No symptoms reported.');
    assert.equal(byId(s, 'brain').status, null);
  });
  it('an emergency red flag keeps its system red for 3 days, then stops', () => {
    const e = { id: 'e', crewId: 'c1', startedAt: '2026-02-16T06:42:00', missionDay: 47, trigger: 'button', symptoms: ['chest_pain'], latest: [], crewAlertedAt: null, reportSentAt: null, updates: [], closedAt: 'x', closedReason: 'help_arrived' } as EmergencyEvent;
    assert.equal(byId(states('c1', [e]), 'heart').status, 'act');
    assert.equal(byId(states('c1', [e], logs, 49), 'heart').status, 'act'); // still inside the window
    assert.notEqual(byId(states('c1', [e], logs, 50), 'heart').status, 'act');
  });
});

describe('insights (rules, not AI)', () => {
  it('Crew Member 2: heart rate above normal for 3 days, with the sleep link', () => {
    const out = insights(readings, 'c2', 47);
    assert.equal(out.length, 1);
    assert.match(out[0], /^Your resting heart rate has been \d+(\.\d)? bpm above your normal for 3 days, while sleep dropped to 5\.5 h\. Poor sleep can raise resting heart rate\.$/);
  });
  it('Crew Member 1 is steady all week', () => {
    assert.deepEqual(insights(readings, 'c1', 47), ['All indicators steady this week. Keep your routine.']);
  });
  it('is steady on day 44, before the change started', () => {
    assert.deepEqual(insights(readings, 'c2', 44), ['All indicators steady this week. Keep your routine.']);
  });
});
