import { Suspense, lazy, useEffect } from 'react';
import { EmergencyBar } from './layout/EmergencyBar.tsx';
import { Footer } from './layout/Footer.tsx';
import { Header } from './layout/Header.tsx';
import { NavRail } from './layout/NavRail.tsx';
import { useNav } from './nav.ts';
import { Tour } from './components/Tour.tsx';
import { Body } from './screens/Body.tsx';
import { Check } from './screens/Check.tsx';
import { Coach } from './screens/Coach.tsx';
import { Earth } from './screens/Earth.tsx';
import { Landing } from './screens/Landing.tsx';
import { Sources } from './screens/Sources.tsx';
// Recharts is most of the bundle, so the chart screen loads only when it is opened.
const Trends = lazy(() => import('./screens/Trends.tsx').then((m) => ({ default: m.Trends })));
import { Emergency } from './screens/Emergency.tsx';
import { Settings } from './screens/Settings.tsx';
import { Today } from './screens/Today.tsx';
import { autoReconnectStation, useStore } from './store.ts';

function Screen() {
  const screen = useNav((s) => s.screen);
  switch (screen) {
    case 'today':
      return <Today />;
    case 'check':
      return <Check />;
    case 'body':
      return <Body />;
    case 'trends':
      return (
        <Suspense fallback={<p className="text-base text-slate-400">Loading charts…</p>}>
          <Trends />
        </Suspense>
      );
    case 'coach':
      return <Coach />;
    case 'earth':
      return <Earth />;
    case 'sources':
      return <Sources />;
    default:
      return <Settings />;
  }
}

function App() {
  const screen = useNav((s) => s.screen);
  const { go, emergencyMinimized, showEmergency } = useNav();
  const stage = useStore((s) => s.live.stage);
  const emergencyId = useStore((s) => s.emergency?.id ?? null);
  const emergencyOpen = emergencyId !== null;
  const guest = useStore((s) => s.crewId === 'guest');

  // Reopen a station the user allowed before, with no popup.
  useEffect(() => {
    void autoReconnectStation();
  }, []);

  // A check started with the button on the box: show it.
  useEffect(() => {
    if ((stage === 'finger' || stage === 'forehead') && screen !== 'check') go('check');
  }, [stage, screen, go]);

  // A new emergency always covers the screen, whoever opened it.
  useEffect(() => {
    if (emergencyId) showEmergency();
  }, [emergencyId, showEmergency]);

  // The intro page is full-screen. The emergency page and its red bar still work from everywhere else.
  if (screen === 'landing') return <Landing />;

  return (
    <div className="flex min-h-screen flex-col">
      <EmergencyBar />
      <Header />
      {guest && <div role="status" className="bg-watch/15 px-4 py-2 text-base text-watch">Guest mode: nothing is saved.</div>}
      <div className="flex flex-1 flex-col md:flex-row">
        <NavRail />
        <main className="flex-1 p-5">
          <Screen />
        </main>
      </div>
      <Footer />
      <Tour />
      {emergencyOpen && !emergencyMinimized && <Emergency />}
    </div>
  );
}

export default App;
