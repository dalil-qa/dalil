// The 3-step tour after "Explore the demo mission": Today -> Body -> Trends. Not saved.
import { create } from 'zustand';
import { useNav, type Screen } from './nav.ts';

export const TOUR_STEPS: { screen: Screen; title: string; text: string }[] = [
  { screen: 'today', title: '1 of 3 · Today', text: "Your crew health score and latest values. Heart rate is 'Watch' because it has stayed above this person's own normal for 3 days." },
  { screen: 'body', title: '2 of 3 · Body', text: 'Tap a system to see what it does and answers to NASA\'s five questions. Colours follow the latest readings and symptoms.' },
  { screen: 'trends', title: '3 of 3 · Trends', text: "The safe range, this person's own normal, and what changed before launch and since. Insights are written by rules, not AI." },
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
