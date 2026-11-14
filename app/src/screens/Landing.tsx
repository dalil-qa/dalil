import { Activity, Compass } from 'lucide-react';
import { Button } from '../components/Card.tsx';
import { markLandingSeen } from '../landing.ts';
import { Logo } from '../layout/Logo.tsx';
import { useNav } from '../nav.ts';
import { useStore } from '../store.ts';
import { useTour } from '../tour.ts';

/** First visit, or the hosted link. Global judges won't have our box, so "Explore the demo" is how they see the product. */
export function Landing() {
  const go = useNav((s) => s.go);
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 p-8 text-center">
      <Logo size={72} />
      <div>
        <h1 className="text-5xl font-semibold text-slate-50">Dalil <span aria-hidden className="text-gold-200">دليل</span></h1>
        <p className="mt-2 text-xl text-cyan-400">Crew health, guided by evidence</p>
      </div>
      <p className="text-xl text-slate-300">
        A daily health check for astronauts. Measure, understand what the numbers mean, and know when to act, even when Earth is minutes away.
      </p>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button
          big
          onClick={() => {
            markLandingSeen();
            go('check');
          }}
        >
          <Activity aria-hidden size={22} /> Live check (needs the Dalil station)
        </Button>
        <Button
          big
          variant="secondary"
          onClick={() => {
            markLandingSeen();
            // The demo mission: Crew Member 2, Mars transit, Day 47, on the simulator.
            const s = useStore.getState();
            s.setCrew('c2');
            s.setMission('mars');
            s.setMissionDay(47);
            s.setUseSimulator(true);
            useTour.getState().start();
          }}
        >
          <Compass aria-hidden size={22} /> Explore the demo mission
        </Button>
      </div>
      <p className="text-base text-slate-500">Not a medical device: guidance only.</p>
    </main>
  );
}
