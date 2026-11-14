// Which screen is showing (APP_BUILD_GUIDE.md section 3: simple state, no router). Not saved.
import { create } from 'zustand';

export type Screen = 'today' | 'check' | 'body' | 'trends' | 'coach' | 'earth' | 'sources' | 'settings';

interface NavState {
  screen: Screen;
  /** True while the person has chosen "Back to app" from the Emergency page. The red bar stays. */
  emergencyMinimized: boolean;
  go: (screen: Screen) => void;
  minimizeEmergency: () => void;
  showEmergency: () => void;
}

const SCREENS = ['today', 'check', 'body', 'trends', 'coach', 'earth', 'sources', 'settings'] as const;

const fromHash = (): Screen => {
  const h = typeof location !== 'undefined' ? location.hash.replace('#', '') : '';
  return SCREENS.find((s) => s === h) ?? 'today';
};

export const useNav = create<NavState>()((set) => ({
  screen: fromHash(),
  emergencyMinimized: false,
  go: (screen) => {
    if (typeof history !== 'undefined') history.replaceState(null, '', `#${screen}`);
    set({ screen });
  },
  minimizeEmergency: () => set({ emergencyMinimized: true }),
  showEmergency: () => set({ emergencyMinimized: false }),
}));

// The browser's back button and typed links like #check work too.
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => useNav.setState({ screen: fromHash() }));
}
