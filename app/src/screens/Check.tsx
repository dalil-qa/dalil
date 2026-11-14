import { Fingerprint, Play, RotateCcw, ScanFace, Usb, X } from 'lucide-react';
import { useState } from 'react';
import { BeatingHeart } from '../components/Heart.tsx';
import { Button, Card } from '../components/Card.tsx';
import { MetricTile } from '../components/MetricTile.tsx';
import { Ring } from '../components/Ring.tsx';
import { STATUS_INFO, LED_WORD } from '../components/info.ts';
import { ReasonText, StatusBadge } from '../components/Status.tsx';
import { SystemsStrip } from '../components/SystemsStrip.tsx';
import { isSerialSupported, SERIAL_UNSUPPORTED_TEXT } from '../device/serial.ts';
import { formatValue } from '../logic/format.ts';
import { INDICATOR_LABELS } from '../logic/status.ts';
import { useNav } from '../nav.ts';
import { useStore } from '../store.ts';
import { QuickLog } from './QuickLog.tsx';

function Step({ n, title, hint, icon }: { n: number; title: string; hint: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center gap-4 rounded-2xl border border-white/10 bg-space-950 p-4">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-700/30 text-cyan-400" aria-hidden>{icon}</span>
      <div>
        <p className="text-lg font-semibold text-slate-100">{n}. {title}</p>
        <p className="text-base text-slate-400">{hint}</p>
      </div>
    </div>
  );
}

/** What to try when the station will not connect (APP_BUILD_GUIDE.md 7.4). */
function ConnectTips() {
  const connectError = useStore((s) => s.connectError);
  const silent = useStore((s) => s.stationSilent);
  const connection = useStore((s) => s.connection);
  const text = connectError ?? (silent ? 'Station not answering. Re-upload the Dalil program to the board, check the cable, and click Connect again.' : connection === 'lost' ? 'The station was disconnected. Check the cable and reconnect.' : null);
  return text ? <p role="alert" className="text-base text-watch">{text}</p> : null;
}

function Ready() {
  const connection = useStore((s) => s.connection);
  const station = useStore((s) => s.station);
  const useSimulator = useStore((s) => s.useSimulator);
  const { connectDevice, startCheck, startCheckWithSimulator } = useStore.getState();
  const [busy, setBusy] = useState(false);
  const connected = connection === 'connected';
  const isSim = station?.fw === 'sim';
  const canStart = connected || useSimulator;

  const start = async () => {
    setBusy(true);
    if (connected) startCheck();
    else await startCheckWithSimulator();
    setBusy(false);
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <h1 className="text-[28px] font-semibold text-slate-50">Ready for your check</h1>
      <p className="text-base text-slate-300">
        {connected ? (isSim ? 'The simulator is connected.' : 'The station is connected.') : 'No station connected yet.'} It takes about 30 seconds, in two steps.
      </p>
      <div className="flex flex-col gap-3 md:flex-row">
        <Step n={1} title="Finger in the slot" hint="About 20 seconds. Keep still." icon={<Fingerprint size={26} />} />
        <Step n={2} title="Forehead at the window" hint="About 5 seconds, 5 cm away." icon={<ScanFace size={26} />} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button big disabled={!canStart || busy} onClick={start}>
          <Play aria-hidden size={22} /> {busy ? 'Starting…' : connected && !isSim ? 'Start check' : 'Start check (simulator)'}
        </Button>
        {isSerialSupported() ? (
          <Button variant="secondary" disabled={connection === 'connecting'} onClick={() => connectDevice('serial')}>
            <Usb aria-hidden size={20} /> Connect station
          </Button>
        ) : (
          <p className="text-base text-slate-400">{SERIAL_UNSUPPORTED_TEXT}</p>
        )}
      </div>
      <ConnectTips />
      {!canStart && <p className="text-base text-slate-400">Connect the station, or turn on the simulator in Settings.</p>}
    </div>
  );
}

function Measuring() {
  const live = useStore((s) => s.live);
  const stopCheck = useStore((s) => s.stopCheck);
  const finger = live.stage === 'finger' || live.stage === 'starting';
  const total = finger ? 20 : 5;
  const left = live.left ?? total;
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <h1 className="text-[28px] font-semibold text-slate-50">{finger ? 'Step 1 of 2 · Finger' : 'Step 2 of 2 · Forehead'}</h1>
      <Card>
        <div className="flex flex-wrap items-center justify-around gap-8">
          <Ring value={live.stage === 'starting' ? 1 : left / total} size={190} strokeClass="stroke-cyan-400">
            <span className="text-6xl font-semibold tabular-nums text-slate-50">{live.stage === 'starting' ? '…' : left}</span>
            <span className="text-sm text-slate-400">seconds left</span>
          </Ring>
          {finger ? (
            <div className="flex flex-col items-center gap-2">
              <BeatingHeart bpm={live.hr} />
              <span className="text-5xl font-semibold tabular-nums text-slate-50">{live.hr ?? '–'}<span className="ml-2 text-xl text-slate-400">bpm</span></span>
              <span className="text-xl tabular-nums text-slate-300">SpO2 {live.spo2 ?? '–'}{live.spo2 !== null ? ' %' : ''}</span>
              <div className="mt-1 w-48" aria-label="Signal quality">
                <div className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-cyan-400" style={{ width: `${Math.round((live.q ?? 0) * 100)}%` }} /></div>
                <span className="text-sm text-slate-400">Signal quality</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ScanFace aria-hidden size={72} className="text-cyan-400" />
              <span className="text-5xl font-semibold tabular-nums text-slate-50">{live.temp ?? '–'}<span className="ml-2 text-xl text-slate-400">°C</span></span>
            </div>
          )}
        </div>
        <p className="mt-6 text-center text-xl text-slate-200" aria-live="polite">
          {live.stage === 'starting' ? 'Waiting for the station…' : finger ? (live.finger ? 'Keep still.' : 'Rest your fingertip in the slot.') : 'Hold your forehead at the window, about 5 cm away.'}
        </p>
      </Card>
      <div><Button variant="secondary" onClick={stopCheck}><X aria-hidden size={20} /> Cancel</Button></div>
    </div>
  );
}

function Result({ onContinue }: { onContinue: () => void }) {
  const lastCheck = useStore((s) => s.lastCheck);
  const station = useStore((s) => s.station);
  if (!lastCheck) return <Ready />;
  const { assessments, readings, overall } = lastCheck;
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-[28px] font-semibold text-slate-50">Your result</h1>
        <StatusBadge status={overall} size="lg" />
        <span className="text-base text-slate-300">Light on the station: <strong className={STATUS_INFO[overall].text}>{LED_WORD[overall]}</strong>{station?.fw === 'sim' ? ' (simulated)' : ''}</span>
      </div>
      {readings.length === 0 ? (
        <Card><p className="text-base text-slate-300">The station did not measure anything this time. Try again.</p></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {readings.map((r) => {
            const a = assessments.find((x) => x.indicator === r.indicator);
            const f = formatValue(r.indicator, r.value, r.unit);
            return (
              <div key={r.id} className="flex flex-col gap-2">
                <MetricTile size="lg" label={INDICATOR_LABELS[r.indicator]} value={f.value} unit={f.unit} status={a?.status ?? null} source={r.source} />
                {a && <ReasonText>{a.reason}</ReasonText>}
              </div>
            );
          })}
        </div>
      )}
      <Card title="What this means for your body">
        <SystemsStrip assessments={assessments} />
      </Card>
      <div className="flex justify-end"><Button big onClick={onContinue}>Continue</Button></div>
    </div>
  );
}

function CheckError() {
  const live = useStore((s) => s.live);
  const resetLive = useStore((s) => s.resetLive);
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-start gap-5">
      <h1 className="text-[28px] font-semibold text-slate-50">{live.error?.code === 'cancelled' ? 'Check cancelled' : "That didn't work"}</h1>
      <p role="alert" className="text-xl text-slate-200">{live.error?.text ?? 'Something went wrong. Please try again.'}</p>
      <Button big onClick={resetLive}><RotateCcw aria-hidden size={20} /> Try again</Button>
    </div>
  );
}

export function Check() {
  const stage = useStore((s) => s.live.stage);
  const resetLive = useStore((s) => s.resetLive);
  const go = useNav((s) => s.go);
  const [logging, setLogging] = useState(false);

  const finish = () => {
    setLogging(false);
    resetLive();
    go('today');
  };

  if (logging) return <QuickLog onDone={finish} />;
  if (stage === 'error') return <CheckError />;
  if (stage === 'starting' || stage === 'finger' || stage === 'forehead') return <Measuring />;
  if (stage === 'done') return <Result onContinue={() => setLogging(true)} />;
  return <Ready />;
}
