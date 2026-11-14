import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { useStore } from './store.ts';

const until = async (check: () => boolean, ms = 4000) => {
  const end = Date.now() + ms;
  while (!check() && Date.now() < end) await new Promise((r) => setTimeout(r, 5));
  assert.ok(check(), 'timed out');
};

describe('store + simulator, end to end', () => {
  it('connects to the simulator, runs a check and turns `done` into assessed readings', { timeout: 40_000 }, async () => {
    const s = useStore.getState();
    s.setSimScenario('act');
    await s.connectDevice('simulator');
    try {
      await until(() => useStore.getState().connection === 'connected');
      assert.equal(useStore.getState().station?.hr_sensor, 'max30102');

      assert.equal(useStore.getState().startCheck(), true);
      await until(() => useStore.getState().live.stage === 'finger');
      await until(() => useStore.getState().lastCheck !== null, 35_000);

      const { lastCheck, readings, live } = useStore.getState();
      assert.equal(live.stage, 'done');
      const fresh = readings.filter((r) => r.source === 'simulated'); // the sample history is already in the store
      assert.equal(fresh.length, 3);
      assert.ok(fresh.every((r) => r.checkId === lastCheck?.checkId && r.crewId === 'c2' && r.missionDay === 47));
      assert.equal(lastCheck?.overall, 'act'); // SpO2 about 88 % is below the amber line
      assert.equal(lastCheck?.assessments.find((a) => a.indicator === 'spo2')?.status, 'act');
    } finally {
      // Always stop the simulator, even if an assertion failed: a running timer would keep Node alive.
      await useStore.getState().disconnectDevice();
    }
    assert.equal(useStore.getState().connection, 'none');
  });

  it('starts with the demo selected and the sample history loaded', () => {
    const s = useStore.getState();
    assert.deepEqual([s.crewId, s.missionId, s.missionDay], ['c2', 'mars', 47]);
    assert.ok(s.readings.some((r) => r.source === 'sample'));
  });

  it('sends the emergency report the moment it opens, and a check taken during it becomes an update', async () => {
    const s = useStore.getState();
    s.openEmergency('button', []);
    assert.ok(useStore.getState().emergency?.reportSentAt);
    assert.equal(useStore.getState().emergency?.crewAlertedAt, null); // alerting the crew is a deliberate tap
    assert.equal(useStore.getState().emergency?.missionId, 'mars'); // remembered, so the report stays correct
    s.closeEmergency('mistake');
  });

  it('will not start a check when no station is connected', () => {
    assert.equal(useStore.getState().startCheck(), false);
  });

  it('opens one emergency, adds later red flags as updates, and closes it into history', () => {
    const s = useStore.getState();
    s.openEmergency('quicklog', ['chest_pain']);
    s.openEmergency('coach', ['chest_pain', 'breathing']);
    assert.deepEqual(useStore.getState().emergency?.symptoms, ['chest_pain', 'breathing']);
    assert.equal(useStore.getState().emergency?.updates.length, 1);
    s.closeEmergency('mistake');
    assert.equal(useStore.getState().emergency, null);
    assert.equal(useStore.getState().emergencies[0].closedReason, 'mistake');
  });

  it('switches language between English and Arabic', () => {
    const s = useStore.getState();
    assert.equal(s.lang, 'en');
    s.setLang('ar');
    assert.equal(useStore.getState().lang, 'ar');
    s.setLang('en');
    assert.equal(useStore.getState().lang, 'en');
  });
});
