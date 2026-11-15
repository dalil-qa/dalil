import { House, Settings } from 'lucide-react';
import { useNav } from '../nav.ts';
import { useStore } from '../store.ts';

export function Footer() {
  const go = useNav((s) => s.go);
  const setHomeMode = useStore((s) => s.setHomeMode);
  const link = 'underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-cyan-400';
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-contrast/10 px-4 py-3 text-sm text-slate-400">
      <span>Not a medical device: guidance only</span>
      <span className="flex items-center gap-4">
        <button type="button" className={`inline-flex items-center gap-1 ${link}`} onClick={() => setHomeMode(true)}>
          <House aria-hidden size={14} /> Home mode
        </button>
        <button type="button" className={link} onClick={() => go('sources')}>Sources</button>
        <button type="button" className={`inline-flex items-center gap-1 ${link}`} onClick={() => go('settings')}>
          <Settings aria-hidden size={14} /> Settings
        </button>
      </span>
    </footer>
  );
}
