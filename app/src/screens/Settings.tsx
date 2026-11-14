import { Compass, Minus, Plus, RotateCcw, Usb } from 'lucide-react';
import { Button, Card } from '../components/Card.tsx';
import { SIM_SCENARIOS, type SimScenario } from '../device/simulator.ts';
import { isSerialSupported, SERIAL_UNSUPPORTED_TEXT } from '../device/serial.ts';
import { useT } from '../i18n.ts';
import { useNav } from '../nav.ts';
import { useSession } from '../session.ts';
import { useStore } from '../store.ts';

export function Settings() {
  const s = useStore();
  const go = useNav((n) => n.go);
  const { t } = useT();
  const connected = s.connection === 'connected';
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <h1 className="text-[28px] font-semibold text-slate-50">{t('setTitle')}</h1>

      <Card title={t('setStation')}>
        <p className="mb-3 text-base text-slate-300">
          {connected ? (s.station?.fw === 'sim' ? t('setConnectedSim') : t('setConnectedStation', { device: s.station?.device ?? '', hr: s.station?.hr_sensor ?? '', temp: s.station?.temp_sensor ?? '' })) : t('setNotConnected')}
        </p>
        <div className="flex flex-wrap gap-3">
          {isSerialSupported() ? (
            <Button variant="secondary" onClick={() => s.connectDevice('serial')}><Usb aria-hidden size={20} /> {t('connectStation')}</Button>
          ) : (
            <p className="text-base text-slate-400">{SERIAL_UNSUPPORTED_TEXT}</p>
          )}
          <Button variant="secondary" onClick={() => s.connectDevice('simulator')}>{t('setUseSim')}</Button>
          {s.connection !== 'none' && <Button variant="secondary" onClick={s.disconnectDevice}>{t('setDisconnect')}</Button>}
        </div>
        {s.connectError && <p role="alert" className="mt-3 text-base text-watch">{s.connectError}</p>}
        <label className="mt-4 flex items-center gap-3 text-base text-slate-200">
          <input type="checkbox" className="h-5 w-5 accent-cyan-400" checked={s.useSimulator} onChange={(e) => s.setUseSimulator(e.target.checked)} />
          {t('setSimWhenNone')}
        </label>
      </Card>

      <Card title={t('setScenarioTitle')}>
        <label className="sr-only" htmlFor="scenario">{t('setScenarioLabel')}</label>
        <select id="scenario" value={s.simScenario} onChange={(e) => s.setSimScenario(e.target.value as SimScenario)} className="w-full rounded-lg border border-white/15 bg-space-950 px-3 py-2 text-base text-slate-100 focus-visible:outline-2 focus-visible:outline-cyan-400">
          {SIM_SCENARIOS.map((x) => <option key={x.id} value={x.id}>{t(`scn_${x.id}` as 'scn_normal')}</option>)}
        </select>
        <p className="mt-2 text-sm text-slate-400">{t('setScenarioNote')}</p>
      </Card>

      <Card title={t('setMissionDay')}>
        <div className="flex items-center gap-4">
          <Button variant="secondary" aria-label={t('setPrevDay')} onClick={() => s.setMissionDay(s.missionDay - 1)}><Minus aria-hidden size={18} /></Button>
          <span className="min-w-24 text-center text-2xl font-semibold tabular-nums">{t('dayN', { n: s.missionDay })}</span>
          <Button variant="secondary" aria-label={t('setNextDay')} onClick={() => s.setMissionDay(s.missionDay + 1)}><Plus aria-hidden size={18} /></Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => { s.setCrew('c2'); s.setMission('mars'); s.setMissionDay(47); }}>{t('setDemo')}</Button>
        </div>
      </Card>

      <Card title={t('setHomeTitle')}>
        <p className="mb-3 text-base text-slate-300">{t('setHomeText')}</p>
        <label className="flex items-center gap-3 text-base text-slate-200">
          <input type="checkbox" className="h-5 w-5 accent-cyan-400" checked={s.homeMode} onChange={(e) => s.setHomeMode(e.target.checked)} />
          {t('setUseHome')}
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-base text-slate-300">{t('setLangLabel')}</span>
          <Button variant={s.lang === 'en' ? 'primary' : 'secondary'} onClick={() => s.setLang('en')}>English</Button>
          <Button variant={s.lang === 'ar' ? 'primary' : 'secondary'} onClick={() => s.setLang('ar')}>العربية (Arabic RTL)</Button>
        </div>
      </Card>

      <Card title={t('setIntroTitle')}>
        <Button variant="secondary" onClick={() => go('landing')}><Compass aria-hidden size={18} /> {t('setIntroBtn')}</Button>
      </Card>

      <Card title={t('setResetTitle')}>
        <p className="mb-3 text-base text-slate-300">{t('setResetText')}</p>
        <Button variant="danger" onClick={() => { if (window.confirm(t('setResetConfirm'))) {
            s.resetDemo();
            useSession.getState().clear();
          } }}><RotateCcw aria-hidden size={18} /> {t('setResetBtn')}</Button>
      </Card>
    </div>
  );
}
