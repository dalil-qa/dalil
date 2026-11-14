import { Fingerprint, Play, RotateCcw, ScanFace, Usb, X } from 'lucide-react';
import { useState } from 'react';
import { BeatingHeart } from '../components/Heart.tsx';
import { Button, Card } from '../components/Card.tsx';
import { MetricTile } from '../components/MetricTile.tsx';
import { Ring } from '../components/Ring.tsx';
import { STATUS_INFO } from '../components/info.ts';
import { STATUS_LED, indicatorName } from '../i18n-app.ts';
import { ReasonText, StatusBadge } from '../components/Status.tsx';
import { SystemsStrip } from '../components/SystemsStrip.tsx';
import { isSerialSupported } from '../device/serial.ts';
import { errorText, useT } from '../i18n.ts';
import { formatValue } from '../logic/format.ts';
import { INDICATOR_LABELS } from '../logic/status.ts';
import { useNav } from '../nav.ts';
import { useStore } from '../store.ts';
import { HomeResult } from './Home.tsx';
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
  const { t } = useT();
  const text = connectError ?? (silent ? t('stationSilentTip') : connection === 'lost' ? t('stationLostTip') : null);
  return text ? <p role="alert" className="text-base text-watch">{text}</p> : null;
}

function Ready() {
  const connection = useStore((s) => s.connection);
  const station = useStore((s) => s.station);
  const useSimulator = useStore((s) => s.useSimulator);
  const { connectDevice, startCheck, startCheckWithSimulator } = useStore.getState();
  const [busy, setBusy] = useState(false);
  const { t } = useT();
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
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4">
      <h1 className="text-[28px] font-semibold text-slate-50">{t('readyTitle')}</h1>
      <p className="text-base text-slate-300">
        {connected ? (isSim ? t('simConnected') : t('stationConnected')) : t('noStation')} {t('takesAbout')}
      </p>
      <div className="flex flex-col gap-3 md:flex-row">
        <Step n={1} title={t('stepFinger')} hint={t('stepFingerHint')} icon={<Fingerprint size={26} />} />
        <Step n={2} title={t('stepForehead')} hint={t('stepForeheadHint')} icon={<ScanFace size={26} />} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button big disabled={!canStart || busy} onClick={start}>
          <Play aria-hidden size={22} /> {busy ? t('starting') : connected && !isSim ? t('startCheck') : t('startSim')}
        </Button>
        {connected && !isSim && (
          // The fallback ladder (pitch script section 4): one click to the simulator, clearly labelled.
          <Button variant="secondary" onClick={() => connectDevice('simulator')}>{t('useSimulator')}</Button>
        )}
        {isSerialSupported() ? (
          <Button variant="secondary" disabled={connection === 'connecting'} onClick={() => connectDevice('serial')}>
            <Usb aria-hidden size={20} /> {connected && !isSim ? t('reconnectStation') : t('connectStation')}
          </Button>
        ) : (
          <p className="text-base text-slate-400">{t('serialUnsupported')}</p>
        )}
      </div>
      <ConnectTips />
      {!canStart && <p className="text-base text-slate-400">{t('connectOrSimHint')}</p>}
    </div>
  );
}

function Measuring() {
  const live = useStore((s) => s.live);
  const stopCheck = useStore((s) => s.stopCheck);
  const { t } = useT();
  const finger = live.stage === 'finger' || live.stage === 'starting';
  const total = finger ? 20 : 5;
  const left = live.left ?? total;
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4">
      <h1 className="text-[28px] font-semibold text-slate-50">{finger ? t('step1') : t('step2')}</h1>
      <Card>
        <div className="flex flex-wrap items-center justify-around gap-8">
          <Ring value={live.stage === 'starting' ? 1 : left / total} size={190} strokeClass="stroke-cyan-400">
            <span className="text-6xl font-semibold tabular-nums text-slate-50">{live.stage === 'starting' ? '…' : left}</span>
            <span className="text-sm text-slate-400">{t('secondsLeft')}</span>
          </Ring>
          {finger ? (
            <div className="flex flex-col items-center gap-2">
              <BeatingHeart bpm={live.hr} />
              <span className="text-5xl font-semibold tabular-nums text-slate-50">{live.hr ?? '–'}<span className="ms-2 text-xl text-slate-400">bpm</span></span>
              <span className="text-xl tabular-nums text-slate-300">SpO2 {live.spo2 ?? '–'}{live.spo2 !== null ? ' %' : ''}</span>
              <div className="mt-1 w-48" aria-label={t('signalQuality')}>
                <div className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-cyan-400" style={{ width: `${Math.round((live.q ?? 0) * 100)}%` }} /></div>
                <span className="text-sm text-slate-400">{t('signalQuality')}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ScanFace aria-hidden size={72} className="text-cyan-400" />
              <span className="text-5xl font-semibold tabular-nums text-slate-50">{live.temp ?? '–'}<span className="ms-2 text-xl text-slate-400">°C</span></span>
            </div>
          )}
        </div>
        <p className="mt-6 text-center text-xl text-slate-200" aria-live="polite">
          {live.stage === 'starting' ? t('waitingStation') : finger ? (live.finger ? t('keepStill') : t('restFinger')) : t('holdForehead')}
        </p>
      </Card>
      <div><Button variant="secondary" onClick={stopCheck}><X aria-hidden size={20} /> {t('cancel')}</Button></div>
    </div>
  );
}

function Result({ onContinue }: { onContinue: () => void }) {
  const lastCheck = useStore((s) => s.lastCheck);
  const station = useStore((s) => s.station);
  const { lang, t } = useT();
  const ar = lang === 'ar';
  if (!lastCheck) return <Ready />;
  const { assessments, readings, overall, lowConfidence, unassessed } = lastCheck;
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-[28px] font-semibold text-slate-50">{t('yourResult')}</h1>
        <StatusBadge status={overall} size="lg" />
        <span className="text-base text-slate-300">{t('ledLight')} <strong className={STATUS_INFO[overall].text}>{t(STATUS_LED[overall])}</strong>{station?.fw === 'sim' ? t('simParen') : ''}</span>
      </div>
      {lowConfidence && (
        <p role="status" className="rounded-xl border border-watch/50 bg-watch/10 px-4 py-3 text-base text-watch">
          {t('lowConfidence')}
        </p>
      )}
      {unassessed.length > 0 && (
        <p role="status" className="text-sm text-slate-400">
          {t('notAssessed', { list: unassessed.map((i) => indicatorName(i, INDICATOR_LABELS[i], ar)).join(ar ? '، ' : ', ') })}
        </p>
      )}
      {readings.length === 0 ? (
        <Card><p className="text-base text-slate-300">{t('nothingMeasured')}</p></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {readings.map((r) => {
            const a = assessments.find((x) => x.indicator === r.indicator);
            const f = formatValue(r.indicator, r.value, r.unit);
            return (
              <div key={r.id} className="flex flex-col gap-2">
                <MetricTile size="lg" label={indicatorName(r.indicator, INDICATOR_LABELS[r.indicator], ar)} value={f.value} unit={f.unit} status={a?.status ?? null} source={r.source} />
                {a && <ReasonText>{a.reason}</ReasonText>}
              </div>
            );
          })}
        </div>
      )}
      <Card title={t('whatMeans')}>
        <SystemsStrip assessments={assessments} />
      </Card>
      <div className="flex justify-end"><Button big onClick={onContinue}>{t('continueBtn')}</Button></div>
    </div>
  );
}

function CheckError() {
  const live = useStore((s) => s.live);
  const station = useStore((s) => s.station);
  const { resetLive, startCheckWithSimulator } = useStore.getState();
  const { lang, t } = useT();
  const isSim = station?.fw === 'sim';
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-start gap-5 p-4">
      <h1 className="text-[28px] font-semibold text-slate-50">{live.error?.code === 'cancelled' ? t('checkCancelled') : t('didntWork')}</h1>
      <p role="alert" className="text-xl text-slate-200">{errorText(live.error, lang, t('somethingWrong'))}</p>
      <div className="flex flex-wrap gap-3">
        <Button big onClick={resetLive}><RotateCcw aria-hidden size={20} /> {t('tryAgain')}</Button>
        {!isSim && (
          <Button big variant="secondary" onClick={() => void startCheckWithSimulator()}>
            <Play aria-hidden size={20} /> {t('useSimulator')}
          </Button>
        )}
      </div>
    </div>
  );
}

export function Check() {
  const stage = useStore((s) => s.live.stage);
  const resetLive = useStore((s) => s.resetLive);
  const lastCheck = useStore((s) => s.lastCheck);
  const home = useStore((s) => s.homeMode);
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
  // Home mode: the result in plain words, and no quick log.
  if (stage === 'done' && home && lastCheck) return <HomeResult assessments={lastCheck.assessments} overall={lastCheck.overall} lowConfidence={lastCheck.lowConfidence} onDone={finish} />;
  if (stage === 'done') return <Result onContinue={() => setLogging(true)} />;
  return <Ready />;
}
