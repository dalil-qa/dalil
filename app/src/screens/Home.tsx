// Home mode (APP_BUILD_GUIDE.md 10.10): huge text, one big button, results in plain words, and "Send to family"
// instead of the flight surgeon. For the Qatar older-people part of the pitch.
import { Phone, Play, Send, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Button, Card } from '../components/Card.tsx';
import { STATUS_INFO } from '../components/info.ts';
import { StatusBadge } from '../components/Status.tsx';
import { useNow } from '../hooks.ts';
import { latestAssessments } from '../logic/overview.ts';
import { plainHeadline, plainSentence } from '../logic/plain.ts';
import { overallStatus } from '../logic/status.ts';
import { clock } from '../logic/summary.ts';
import { Logo } from '../layout/Logo.tsx';
import { useHomeFamily } from '../homeFamily.ts';
import { useNav } from '../nav.ts';
import { useStore } from '../store.ts';
import type { Assessment } from '../types.ts';

export function HomeHeader() {
  const { openEmergency, setHomeMode } = useStore.getState();
  const showEmergency = useNav((s) => s.showEmergency);
  return (
    <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-space-950 px-5 py-4">
      <div className="flex items-center gap-2 text-2xl font-semibold text-slate-50"><Logo size={36} /> Dalil</div>
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => setHomeMode(false)} className="text-base text-slate-400 underline underline-offset-4 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-cyan-400">Exit Home mode</button>
        <button
          type="button"
          onClick={() => {
            openEmergency('button', []);
            showEmergency();
          }}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-act bg-act/10 px-5 text-lg font-semibold text-act hover:bg-act/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-act"
        >
          <TriangleAlert aria-hidden size={22} /> I feel unwell now
        </button>
      </div>
    </header>
  );
}

/** "Send to family" is simulated, like sending to the flight surgeon. */
function SendToFamily({ text }: { text?: string }) {
  const sentAt = useHomeFamily((s) => s.sentAt);
  return (
    <div className="flex flex-col items-start gap-2">
      <Button big variant="secondary" onClick={() => useHomeFamily.getState().send()}>
        <Send aria-hidden size={22} /> {sentAt ? 'Send to family again' : (text ?? 'Send to family')}
      </Button>
      {sentAt && <p role="status" className="text-lg text-ok">Sent to your family at {clock(sentAt)}.</p>}
    </div>
  );
}

export function HomeToday() {
  const crewId = useStore((s) => s.crewId);
  const day = useStore((s) => s.missionDay);
  const readings = useStore((s) => s.readings);
  const go = useNav((s) => s.go);
  const items = latestAssessments(readings, crewId, day);
  const assessed = items.flatMap((i) => (i.assessment ? [i.assessment] : []));
  const overall = overallStatus(assessed);
  const hour = useNow().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6">
      <h1 className="text-5xl font-semibold text-slate-50">{greeting}</h1>
      <Button big className="min-h-24 text-3xl" onClick={() => go('check')}>
        <Play aria-hidden size={36} /> Start check
      </Button>
      {assessed.length > 0 ? (
        <Card title="Your last check">
          <div className="mb-3"><StatusBadge status={overall} size="lg" /></div>
          <p className="text-2xl text-slate-100">{plainHeadline(overall)}</p>
          <ul className="mt-3 flex flex-col gap-2 text-xl text-slate-200">
            {assessed.map((a) => <li key={a.indicator}>{plainSentence(a.indicator, a.status)}</li>)}
          </ul>
        </Card>
      ) : (
        <p className="text-xl text-slate-300">No check yet. Press the big button to start.</p>
      )}
      <SendToFamily />
    </div>
  );
}

export function HomeResult({ assessments, overall, onDone }: { assessments: Assessment[]; overall: Assessment['status']; onDone: () => void }) {
  const [asked, setAsked] = useState(false);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6">
      <div className="flex flex-wrap items-center gap-4">
        <StatusBadge status={overall} size="lg" />
        <h1 className={`text-4xl font-semibold ${STATUS_INFO[overall].text}`}>{plainHeadline(overall)}</h1>
      </div>
      {overall === 'act' && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border-2 border-act bg-act/10 p-5 text-2xl text-act">
          <p>If you feel very unwell, call 999 now.</p>
          <a href="tel:999" className="inline-flex w-fit items-center gap-2 rounded-xl bg-act px-5 py-3 text-xl font-semibold text-space-950 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><Phone aria-hidden size={24} /> Call 999</a>
        </div>
      )}
      <ul className="flex flex-col gap-3 text-2xl text-slate-100">
        {assessments.map((a) => <li key={a.indicator}>{plainSentence(a.indicator, a.status)}</li>)}
        {assessments.length === 0 && <li>The check did not measure anything this time. Please try again.</li>}
      </ul>
      <SendToFamily text={overall === 'ok' ? 'Send to family' : 'Tell my family'} />
      <div className="flex flex-wrap gap-4">
        <Button big onClick={() => { setAsked(true); onDone(); }}>Done</Button>
      </div>
      <span className="sr-only">{asked ? 'closed' : ''}</span>
    </div>
  );
}
