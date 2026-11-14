import { TriangleAlert } from 'lucide-react';
import type { GuidanceCard } from '../types.ts';
import { SourceList } from './SourceList.tsx';

/** One guidance card: what it means, what to do, and where it comes from. */
export function CardView({ card }: { card: GuidanceCard }) {
  return (
    <article className="rounded-xl border border-white/10 bg-space-950 p-4">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
        {card.title}
        {card.escalate && (
          <span className="inline-flex items-center gap-1 rounded-full border border-act/40 bg-act/15 px-2 py-0.5 text-sm font-medium text-act">
            <TriangleAlert aria-hidden size={14} /> Contact the flight surgeon
          </span>
        )}
      </h3>
      <p className="mt-1 text-base text-slate-300">{card.meaning}</p>
      <ul className="mt-2 list-disc pl-5 text-base text-slate-200">
        {card.actions.map((a) => <li key={a}>{a}</li>)}
      </ul>
      <SourceList sources={card.sources} />
    </article>
  );
}
