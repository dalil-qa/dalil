import { TriangleAlert } from 'lucide-react';
import { crew, crewById, missions } from '../data/index.ts';
import { useNow } from '../hooks.ts';
import { useNav } from '../nav.ts';
import { useStore, type ConnectionState } from '../store.ts';
import type { MissionId } from '../types.ts';
import { Logo } from './Logo.tsx';

function ConnectionPill() {
  const connection = useStore((s) => s.connection);
  const silent = useStore((s) => s.stationSilent);
  const station = useStore((s) => s.station);
  const sim = station?.fw === 'sim';
  const label: Record<ConnectionState, string> = { none: 'No station', connecting: silent ? 'Station not answering' : 'Connecting…', connected: sim ? '🧪 Simulator' : 'Station connected', lost: 'Station disconnected' };
  const tone = connection === 'connected' ? 'text-ok border-ok/40' : connection === 'connecting' ? 'text-watch border-watch/40' : connection === 'lost' ? 'text-act border-act/40' : 'text-slate-400 border-white/15';
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${tone}`}>
      <span aria-hidden className="h-2 w-2 rounded-full bg-current" />
      {label[connection]}
    </span>
  );
}

const selectClass = 'rounded-lg border border-white/15 bg-space-900 px-2.5 py-1.5 text-base text-slate-100 focus-visible:outline-2 focus-visible:outline-cyan-400';

export function Header() {
  const { crewId, missionId, missionDay, setCrew, setMission, openEmergency } = useStore();
  const showEmergency = useNav((s) => s.showEmergency);
  const now = useNow();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 bg-space-950 px-4 py-3">
      <div className="flex items-center gap-2 text-xl font-semibold text-slate-50">
        <Logo />
        Dalil
      </div>
      <label className="sr-only" htmlFor="mission">Mission</label>
      <select id="mission" className={selectClass} value={missionId} onChange={(e) => setMission(e.target.value as MissionId)}>
        {missions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      <span className="text-base text-slate-300 tabular-nums">Day {missionDay} · {time}</span>
      <label className="sr-only" htmlFor="crew">Crew member</label>
      <select id="crew" className={selectClass} value={crewId} onChange={(e) => setCrew(e.target.value)}>
        {crew.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <ConnectionPill />
      <div className="ml-auto">
        {/* Always visible, never in a menu (10.1). */}
        <button
          type="button"
          onClick={() => {
            openEmergency('button', []);
            showEmergency();
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-act bg-act/10 px-4 text-base font-semibold text-act hover:bg-act/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-act"
        >
          <TriangleAlert aria-hidden size={20} />
          I feel unwell now
        </button>
      </div>
      <span className="sr-only">Signed in as {crewById(crewId).label}</span>
    </header>
  );
}
