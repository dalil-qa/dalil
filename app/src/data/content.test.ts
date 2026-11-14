import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cardById, cards, crew, emergencyContent, missions, symptoms, systems, thresholds } from './index.ts';

const urlOk = (u: string) => /^https:\/\/[^\s]+\.[^\s]+/.test(u);
const allText = JSON.stringify({ thresholds, cards, systems, symptoms, emergencyContent, missions, crew });

describe('health content follows the guide\'s rules', () => {
  it('every threshold, card, symptom, system, mission and emergency item has a source with a working-looking link', () => {
    const sources = [
      ...thresholds.map((t) => t.source),
      ...cards.flatMap((c) => c.sources),
      ...symptoms.map((s) => s.source),
      ...systems.flatMap((s) => s.sources),
      ...missions.flatMap((m) => m.sources),
      ...emergencyContent.sources,
    ];
    assert.ok(sources.length > 60);
    for (const s of sources) {
      assert.ok(s.title.length > 8, `source title too short: ${JSON.stringify(s)}`);
      assert.ok(urlOk(s.url), `bad link: ${s.url}`);
    }
    for (const c of cards) assert.ok(c.sources.length >= 1, `${c.id} has no source`);
    for (const m of missions) assert.ok(m.sources.length >= 1, `${m.id} has no source`);
    for (const s of systems) assert.ok(s.sources.length >= 1, `${s.id} has no source`);
  });

  it('nothing still says DRAFT or EXAMPLE, and nothing is left as a to-do', () => {
    // Case-sensitive on purpose: "for example" in a sentence is fine, a leftover EXAMPLE label is not.
    const found = allText.match(/\bDRAFT\b|\bEXAMPLE\b|lorem ipsum|\bTODO\b|Mechanical [23] to/g) ?? [];
    assert.deepEqual(found, []);
  });

  it('every red card escalates and tells the person to contact the flight surgeon; no amber card escalates', () => {
    for (const c of cards.filter((x) => x.level === 'red')) {
      assert.equal(c.escalate, true, c.id);
      assert.ok(c.actions.some((a) => /Contact the flight surgeon/i.test(a)), `${c.id} must say to contact the flight surgeon`);
    }
    for (const c of cards.filter((x) => x.level === 'amber')) assert.equal(c.escalate, false, c.id);
  });

  it('every symptom card exists, red flags have no card (they use emergency.json), and every card is used', () => {
    for (const s of symptoms) {
      if (s.redFlag) assert.equal(s.cardId, null, `${s.id} is a red flag and must not have a card`);
      if (s.cardId) assert.ok(cardById(s.cardId), `${s.id} points to a missing card ${s.cardId}`);
    }
    const used = new Set(symptoms.flatMap((s) => (s.cardId ? [s.cardId] : [])));
    for (const c of cards.filter((x) => x.indicator === 'symptom')) assert.ok(used.has(c.id), `${c.id} is never linked from a symptom`);
  });

  it('every indicator that can be logged has a range or target, and lifestyle indicators can never reach Call surgeon', () => {
    const have = new Set(thresholds.map((t) => t.indicator));
    for (const i of ['hr', 'spo2', 'temp', 'bp_sys', 'bp_dia', 'glucose', 'sleep', 'mood', 'water', 'exercise', 'meals']) assert.ok(have.has(i as never), i);
    // The lowest value a person can enter must still be inside the amber range, so it is Watch and never Call surgeon.
    const LOWEST: Record<string, number> = { sleep: 0, mood: 1, water: 0, exercise: 0, meals: 0 };
    for (const [i, lowest] of Object.entries(LOWEST)) {
      const t = thresholds.find((x) => x.indicator === i)!;
      assert.ok(t.amber.min !== null && t.amber.min <= lowest, `${i}: the amber range must include the lowest possible value`);
      assert.ok(t.amber.max === null || t.amber.max >= 5, `${i}: the amber range must reach the top of the scale`); // mood is a 1-5 scale
    }
    for (const t of thresholds) assert.ok(t.howToMeasure.length > 10, `${t.indicator} needs a how-to-measure tip`);
  });

  it('no medicine names or doses appear anywhere a person reads them (APP_BUILD_GUIDE 5.1)', () => {
    const names = allText.match(/\b(aspirin|ibuprofen|paracetamol|acetaminophen|nitroglycerin|GTN|insulin|antibiotic|melatonin|bisphosphonate|alendronate|promethazine|scopolamine)\b/gi) ?? [];
    assert.deepEqual(names, []);
    // A dose looks like "300 mg" or "1000 IU". "mg/dL" (blood sugar) is a measurement, not a dose.
    const doses = allText.match(/\b\d+\s?(mg|mcg|µg|IU|I\.U\.)(?![/\w])/g) ?? [];
    assert.deepEqual(doses, []);
  });

  it('the red-flag symptoms are exactly the six in the guide, and the Emergency steps are plain sentences', () => {
    assert.deepEqual(symptoms.filter((s) => s.redFlag).map((s) => s.id).sort(), ['breathing', 'chest_pain', 'confusion', 'fainting', 'severe_headache', 'stroke_signs']);
    assert.ok(emergencyContent.general.length >= 3);
    for (const step of [...emergencyContent.general, ...Object.values(emergencyContent.bySymptom).flat()]) assert.match(step, /^[A-Z].*[.]$/, step);
  });

  it('each mission has gravity, a delay label, risks and a radiation note, and the rover shares the Moon\'s delay', () => {
    assert.equal(missions.length, 4);
    for (const m of missions) {
      assert.ok(m.gravity && m.delayLabel && m.riskHighlights.length >= 2 && m.radiationNote.length > 40, m.id);
    }
    assert.equal(missions.find((m) => m.id === 'rover')?.oneWayDelaySec, missions.find((m) => m.id === 'moon')?.oneWayDelaySec);
  });

  it('every body system answers all five questions in words', () => {
    assert.equal(systems.length, 8);
    for (const s of systems) {
      for (const text of [s.function, s.measureInSpace, s.whyCheck, s.hazardEffects, s.whenToAct.crew, s.whenToAct.surgeon]) assert.ok(text.length > 25, `${s.id}: ${text}`);
      assert.ok(s.prevention.length >= 2 && s.prevention.every((p) => p.length > 10), s.id);
      assert.ok(s.hazards.length >= 1, s.id);
    }
  });
});
