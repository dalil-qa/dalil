import { Compass, Minus, Plus, RotateCcw, Usb } from 'lucide-react';
import { Button, Card } from '../components/Card.tsx';
import { SIM_SCENARIOS, type SimScenario } from '../device/simulator.ts';
import { isSerialSupported, SERIAL_UNSUPPORTED_TEXT } from '../device/serial.ts';
import { useNav } from '../nav.ts';
import { useSession } from '../session.ts';
import { useStore } from '../store.ts';

export function Settings() {
  const s = useStore();
  const go = useNav((n) => n.go);
  const connected = s.connection === 'connected';
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <h1 className="text-[28px] font-semibold text-slate-50">Settings</h1>

      <Card title="Station">
        <p className="mb-3 text-base text-slate-300">
          {connected ? (s.station?.fw === 'sim' ? 'Connected to the simulator.' : `Connected: ${s.station?.device} (heart rate: ${s.station?.hr_sensor}, temperature: ${s.station?.temp_sensor}).`) : 'Not connected.'}
        </p>
        <div className="flex flex-wrap gap-3">
          {isSerialSupported() ? (
            <Button variant="secondary" onClick={() => s.connectDevice('serial')}><Usb aria-hidden size={20} /> Connect station</Button>
          ) : (
            <p className="text-base text-slate-400">{SERIAL_UNSUPPORTED_TEXT}</p>
          )}
          <Button variant="secondary" onClick={() => s.connectDevice('simulator')}>Use simulator</Button>
          {s.connection !== 'none' && <Button variant="secondary" onClick={s.disconnectDevice}>Disconnect</Button>}
        </div>
        {s.connectError && <p role="alert" className="mt-3 text-base text-watch">{s.connectError}</p>}
        <label className="mt-4 flex items-center gap-3 text-base text-slate-200">
          <input type="checkbox" className="h-5 w-5 accent-cyan-400" checked={s.useSimulator} onChange={(e) => s.setUseSimulator(e.target.checked)} />
          Start checks with the simulator when no station is connected
        </label>
      </Card>

      <Card title="Simulator scenario">
        <label className="sr-only" htmlFor="scenario">Scenario</label>
        <select id="scenario" value={s.simScenario} onChange={(e) => s.setSimScenario(e.target.value as SimScenario)} className="w-full rounded-lg border border-white/15 bg-space-950 px-3 py-2 text-base text-slate-100 focus-visible:outline-2 focus-visible:outline-cyan-400">
          {SIM_SCENARIOS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
        <p className="mt-2 text-sm text-slate-400">The scenario applies to the next check. "Act" gives a red result for the demo.</p>
      </Card>

      <Card title="Mission day">
        <div className="flex items-center gap-4">
          <Button variant="secondary" aria-label="Previous day" onClick={() => s.setMissionDay(s.missionDay - 1)}><Minus aria-hidden size={18} /></Button>
          <span className="min-w-24 text-center text-2xl font-semibold tabular-nums">Day {s.missionDay}</span>
          <Button variant="secondary" aria-label="Next day" onClick={() => s.setMissionDay(s.missionDay + 1)}><Plus aria-hidden size={18} /></Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => { s.setCrew('c2'); s.setMission('mars'); s.setMissionDay(47); }}>Demo: Crew Member 2 · Mars transit · Day 47</Button>
        </div>
      </Card>

      <Card title="Home mode">
        <p className="mb-3 text-base text-slate-300">Huge text, one big button, results in plain words, and "Send to family". Built for people at home, not for space.</p>
        <label className="flex items-center gap-3 text-base text-slate-200">
          <input type="checkbox" className="h-5 w-5 accent-cyan-400" checked={s.homeMode} onChange={(e) => s.setHomeMode(e.target.checked)} />
          Use Home mode
        </label>
      </Card>

      <Card title="Intro">
        <Button variant="secondary" onClick={() => go('landing')}><Compass aria-hidden size={18} /> Show the intro and tour again</Button>
      </Card>

      <Card title="Reset">
        <p className="mb-3 text-base text-slate-300">Removes everything you measured or logged, and any emergencies, and reloads the sample history.</p>
        <Button variant="danger" onClick={() => { if (window.confirm('Reset the demo and delete everything saved on this computer?')) {
            s.resetDemo();
            useSession.getState().clear();
          } }}><RotateCcw aria-hidden size={18} /> Reset demo</Button>
      </Card>
    </div>
  );
}
