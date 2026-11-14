// Which screen is showing (APP_BUILD_GUIDE.md section 3: simple state, no router). Not saved.
import { create } from 'zustand';
import { hasSeenLanding } from './landing.ts';
import type { IndicatorId } from './types.ts';

export type Screen = 'today' | 'check' | 'body' | 'trends' | 'coach' | 'earth' | 'sources' | 'settings' | 'landing';

interface NavState {
  screen: Screen;
  /** True while the person has chosen "Back to app" from the Emergency page. The red bar stays. */
  emergencyMinimized: boolean;
  /** The indicator Trends shows. A Today tile sets it before opening Trends. */
  trendIndicator: IndicatorId;
  go: (screen: Screen) => void;
  openTrend: (indicator: IndicatorId) => void;
  minimizeEmergency: () => void;
  showEmergency: () => void;
}

const SCREENS = ['today', 'check', 'body', 'trends', 'coach', 'earth', 'sources', 'settings', 'landing'] as const;

const fromHash = (): Screen => {
  const h = typeof location !== 'undefined' ? location.hash.replace('#', '') : '';
  // A first visit with no #link starts on the intro page; everything else goes where the link points.
  if (h === '' && !hasSeenLanding() && typeof window !== 'undefined') return 'landing';
  return SCREENS.find((s) => s === h) ?? 'today';
};

export const useNav = create<NavState>()((set) => ({
  screen: fromHash(),
  emergencyMinimized: false,
  trendIndicator: 'hr',
  go: (screen) => {
    if (typeof history !== 'undefined') history.replaceState(null, '', `#${screen}`);
    set({ screen });
  },
  openTrend: (indicator) => {
    if (typeof history !== 'undefined') history.replaceState(null, '', '#trends');
    set({ screen: 'trends', trendIndicator: indicator === 'bp_dia' ? 'bp_sys' : indicator });
  },
  minimizeEmergency: () => set({ emergencyMinimized: true }),
  showEmergency: () => set({ emergencyMinimized: false }),
}));

// The browser's back button and typed links like #check work too.
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => useNav.setState({ screen: fromHash() }));
}
