import { useEffect } from 'react';
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
import { HomeHeader, HomeToday } from './screens/Home.tsx';
import { Landing } from './screens/Landing.tsx';
import { Sources } from './screens/Sources.tsx';
import { Trends } from './screens/Trends.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
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
      return <Trends />;
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
  const home = useStore((s) => s.homeMode);
  const lang = useStore((s) => s.lang);
  const guest = useStore((s) => s.crewId === 'guest');
  const endGuestSession = useStore((s) => s.endGuestSession);

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

  // Home mode makes everything bigger (the page's root font size) and switches to RTL when Arabic is active.
  useEffect(() => {
    document.documentElement.classList.toggle('home-mode', home);
    const isAr = home && lang === 'ar';
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = isAr ? 'ar' : 'en';
  }, [home, lang]);

  // The intro page is full-screen. The emergency page and its red bar still work from everywhere else.
  if (screen === 'landing') return <Landing />;

  // Home mode: one big button and plain words. The emergency page and its red bar still work.
  if (home) {
    return (
      <div className="flex min-h-screen flex-col">
        <EmergencyBar />
        <HomeHeader />
        <main className="flex-1">{screen === 'check' ? <Check /> : <HomeToday />}</main>
        {emergencyOpen && !emergencyMinimized && <Emergency />}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <EmergencyBar />
      <Header />
      {guest && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 bg-watch/15 px-4 py-2 text-base text-watch">
          <span>Guest mode: nothing is saved.</span>
          <button type="button" onClick={endGuestSession} className="rounded-lg border border-watch/50 px-3 py-1 text-sm font-medium hover:bg-watch/20 focus-visible:outline-2 focus-visible:outline-watch">
            End guest session
          </button>
        </div>
      )}
      <div className="flex flex-1 flex-col md:flex-row">
        <NavRail />
        <main className="flex-1 p-5">
          <ErrorBoundary key={screen} onHome={() => go('today')}>
            <Screen />
          </ErrorBoundary>
        </main>
      </div>
      <Footer />
      <Tour />
      {emergencyOpen && !emergencyMinimized && <Emergency />}
    </div>
  );
}

export default App;
