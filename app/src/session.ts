// Per-visit state that is not saved: the Coach conversation and what was "sent to Earth". Not persisted.
import { create } from 'zustand';
import { newId } from './id.ts';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  /** Cards the Coach used (ids), shown as chips. */
  cardIds?: string[];
  escalate?: boolean;
  /** True when the Worker could not be reached: the matching cards are shown instead. */
  fallback?: boolean;
}

interface SessionState {
  chats: Record<string, ChatMessage[]>;
  sending: boolean;
  /** When the report was sent to Earth, per crew member (simulated). */
  earthSentAt: Record<string, string | null>;
  /** The Coach's written summary, per crew member. */
  summaries: Record<string, { text: string; source: 'coach' | 'offline'; at: string } | undefined>;
  addMessage: (crewId: string, m: Omit<ChatMessage, 'id'>) => void;
  setSending: (v: boolean) => void;
  sendToEarth: (crewId: string) => void;
  setSummary: (crewId: string, s: { text: string; source: 'coach' | 'offline' }) => void;
  clear: () => void;
}

export const useSession = create<SessionState>()((set) => ({
  chats: {},
  sending: false,
  earthSentAt: {},
  summaries: {},
  addMessage: (crewId, m) => set((s) => ({ chats: { ...s.chats, [crewId]: [...(s.chats[crewId] ?? []), { ...m, id: newId() }] } })),
  setSending: (sending) => set({ sending }),
  sendToEarth: (crewId) => set((s) => ({ earthSentAt: { ...s.earthSentAt, [crewId]: new Date().toISOString() } })),
  setSummary: (crewId, v) => set((s) => ({ summaries: { ...s.summaries, [crewId]: { ...v, at: new Date().toISOString() } } })),
  clear: () => set({ chats: {}, sending: false, earthSentAt: {}, summaries: {} }),
}));
