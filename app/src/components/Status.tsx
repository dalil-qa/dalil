import { statusWord } from '../i18n.ts';
import { useStore } from '../store.ts';
import type { Source, Status } from '../types.ts';
import { SOURCE_INFO, STATUS_INFO } from './info.ts';

export function StatusBadge({ status, size = 'md' }: { status: Status; size?: 'md' | 'lg' }) {
  const homeMode = useStore((s) => s.homeMode);
  const lang = useStore((s) => s.lang);
  const { Icon, text, bg, border } = STATUS_INFO[status];
  const word = statusWord(status, homeMode, lang);
  const big = size === 'lg';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${bg} ${border} ${text} ${big ? 'px-4 py-1.5 text-lg' : 'px-2.5 py-0.5 text-sm'}`}>
      <Icon aria-hidden size={big ? 22 : 16} />
      {word}
    </span>
  );
}

export function SourceIcon({ source, withLabel = false }: { source: Source; withLabel?: boolean }) {
  const { label, Icon } = SOURCE_INFO[source];
  return (
    <span className="inline-flex items-center gap-1 text-sm text-slate-400" title={label}>
      <Icon aria-hidden size={14} />
      {withLabel ? label : <span className="sr-only">{label}</span>}
    </span>
  );
}

/** The one-sentence "why" under a status. */
export function ReasonText({ children }: { children: React.ReactNode }) {
  return <p className="text-base text-slate-300">{children}</p>;
}
