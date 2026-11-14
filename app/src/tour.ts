// The 3-step tour after "Explore the demo mission": Today -> Body -> Trends. Not saved.
import { create } from 'zustand';
import { useNav, type Screen } from './nav.ts';

export const TOUR_STEPS: { screen: Screen; title: 'tour1Title' | 'tour2Title' | 'tour3Title'; text: 'tour1Text' | 'tour2Text' | 'tour3Text' }[] = [
  { screen: 'today', title: 'tour1Title', text: 'tour1Text' },
  { screen: 'body', title: 'tour2Title', text: 'tour2Text' },
  { screen: 'trends', title: 'tour3Title', text: 'tour3Text' },
];

interface TourState {
  step: number | null;
  start: () => void;
  next: () => void;
  stop: () => void;
}

export const useTour = create<TourState>()((set, get) => ({
  step: null,
  start: () => {
    useNav.getState().go(TOUR_STEPS[0].screen);
    set({ step: 0 });
  },
  next: () => {
    const step = get().step;
    if (step === null) return;
    if (step + 1 >= TOUR_STEPS.length) return set({ step: null });
    useNav.getState().go(TOUR_STEPS[step + 1].screen);
    set({ step: step + 1 });
  },
  stop: () => set({ step: null }),
}));
