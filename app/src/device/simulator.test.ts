import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { StationMessage } from '../types.ts';
import type { StationMeasure } from './link.ts';
import { SimulatorLink, type SimScenario } from './simulator.ts';

/** Runs one check on a fast simulator and returns every message from START onwards. */
async function runCheck(scenario: SimScenario, options: { stopAfter?: number } = {}): Promise<StationMessage[]> {
  const sim = new SimulatorLink({ scenario, intervalMs: 1, random: () => 0.5 });
  const all: StationMessage[] = [];
  sim.onMessage((m) => all.push(m));
  await sim.connect();
  await new Promise((r) => setTimeout(r, 5));
  all.length = 0;
  sim.send('START');
  if (options.stopAfter !== undefined) {
    await new Promise((r) => setTimeout(r, options.stopAfter));
    sim.send('STOP');
    await new Promise((r) => setTimeout(r, 5));
  } else {
    for (let i = 0; i < 400 && !all.some((m) => m.stage === 'done' || m.stage === 'error'); i++) await new Promise((r) => setTimeout(r, 2));
  }
  await sim.disconnect();
  return all.filter((m) => m.stage !== 'idle');
}

describe('SimulatorLink', () => {
  it('says hello on connect and again on PING', async () => {
    const sim = new SimulatorLink({ intervalMs: 1000 });
    const seen: StationMessage[] = [];
    sim.onMessage((m) => seen.push(m));
    await sim.connect();
    await Promise.resolve();
    sim.send('PING');
    await sim.disconnect();
    assert.equal(seen.filter((m) => m.stage === 'hello').length, 2);
    assert.equal(seen[0].stage === 'hello' && seen[0].hr_sensor, 'max30102');
  });

  it('normal: 20 finger lines counting 20..1 (numbers after the first 5), 5 forehead lines, then done', async () => {
    const msgs = await runCheck('normal');
    const fingers = msgs.filter((m) => m.stage === 'finger') as StationMeasure[];
    const foreheads = msgs.filter((m) => m.stage === 'forehead') as StationMeasure[];
    assert.equal(fingers.length, 20);
    assert.deepEqual(fingers.map((m) => m.left), Array.from({ length: 20 }, (_, i) => 20 - i));
    assert.ok(fingers.slice(0, 5).every((m) => m.hr === null && m.spo2 === null));
    assert.ok(fingers.slice(5).every((m) => m.hr !== null && m.spo2 !== null && m.q !== null && m.q >= 0.8 && m.q <= 0.95));
    assert.equal(foreheads.length, 5);
    assert.equal(foreheads[0].temp, null); // temp appears on the second line
    assert.notEqual(foreheads[1].temp, null);
    const done = msgs.at(-1) as StationMeasure;
    assert.equal(done.stage, 'done');
    assert.deepEqual([done.hr, done.spo2, done.temp], [65, 98, 34.5]);
    assert.equal(done.left, null);
  });

  it('watch: heart rate about 10 above normal. act: SpO2 clearly below 90', async () => {
    const watch = (await runCheck('watch')).at(-1) as StationMeasure;
    assert.equal(watch.hr, 75);
    const act = (await runCheck('act')).at(-1) as StationMeasure;
    assert.equal(act.spo2, 88);
  });

  it('bad_signal ends in an error, no_finger sends finger:false then an error, pulse_sensor never has SpO2', async () => {
    assert.deepEqual((await runCheck('bad_signal')).at(-1), { stage: 'error', code: 'bad_signal', msg: 'Signal too weak' });
    const nf = await runCheck('no_finger');
    assert.ok(nf.slice(0, -1).every((m) => m.stage === 'finger' && !m.finger));
    assert.equal(nf.at(-1)?.stage === 'error' && (nf.at(-1) as { code: string }).code, 'no_finger');
    const pulse = await runCheck('pulse_sensor');
    const done = pulse.at(-1) as StationMeasure;
    assert.equal(done.spo2, null);
    assert.notEqual(done.hr, null);
  });

  it('STOP cancels a running check; START during a check says busy; unknown commands are reported', async () => {
    const stopped = await runCheck('normal', { stopAfter: 6 });
    assert.equal(stopped.at(-1)?.stage === 'error' && (stopped.at(-1) as { code: string }).code, 'cancelled');

    const sim = new SimulatorLink({ intervalMs: 1000 });
    const seen: StationMessage[] = [];
    sim.onMessage((m) => seen.push(m));
    await sim.connect();
    sim.send('START');
    sim.send('START');
    sim.send('LED GREEN'); // accepted silently
    sim.send('DANCE' as never);
    await sim.disconnect();
    const codes = seen.filter((m) => m.stage === 'error').map((m) => (m as { code: string }).code);
    assert.deepEqual(codes, ['busy', 'unknown_cmd']);
  });
});
