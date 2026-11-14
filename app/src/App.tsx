import { useEffect } from 'react';
import { EmergencyBar } from './layout/EmergencyBar.tsx';
import { Footer } from './layout/Footer.tsx';
import { Header } from './layout/Header.tsx';
import { NavRail } from './layout/NavRail.tsx';
import { useNav } from './nav.ts';
import { Check } from './screens/Check.tsx';
import { Emergency } from './screens/Emergency.tsx';
import { Settings } from './screens/Settings.tsx';
import { Soon } from './screens/Soon.tsx';
import { Today } from './screens/Today.tsx';
import { autoReconnectStation, useStore } from './store.ts';

function Screen() {
  const screen = useNav((s) => s.screen);
  switch (screen) {
    case 'today':
      return <Today />;
    case 'check':
      return <Check />;
    case 'settings':
      return <Settings />;
    default:
      return <Soon screen={screen} />;
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
      {emergencyOpen && !emergencyMinimized && <Emergency />}
    </div>
  );
}

export default App;
