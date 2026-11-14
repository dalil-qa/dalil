// "Send to family" in Home mode is simulated: it only records the time. Not saved.
import { create } from 'zustand';

interface FamilyState {
  sentAt: string | null;
  send: () => void;
  reset: () => void;
}

export const useHomeFamily = create<FamilyState>()((set) => ({
  sentAt: null,
  send: () => set({ sentAt: new Date().toISOString() }),
  reset: () => set({ sentAt: null }),
}));
