import { motion, useReducedMotion } from 'motion/react';
import { Globe, Rocket } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDelay } from '../logic/format.ts';
import { clock } from '../logic/summary.ts';

/**
 * Animation 3 (shared by the Emergency page and the Earth screen): the report travelling from the crew to Earth,
 * then the time Earth's reply needs to come back. `sentAt` is when the message left; `oneWaySec` is the mission's
 * one-way signal delay. Nothing is really sent, and no reply is simulated: the second leg only shows the earliest
 * time a reply could arrive.
 */
export function DelayAnimation({ oneWaySec, sentAt, from = 'Crew' }: { oneWaySec: number; sentAt: string; from?: string }) {
  const reduce = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const sent = Date.parse(sentAt);
  const elapsed = Math.max(0, (now - sent) / 1000);
  const out = Math.min(1, elapsed / oneWaySec); // 0 → 1 while the report travels to Earth
  const back = Math.min(1, Math.max(0, (elapsed - oneWaySec) / oneWaySec)); // 0 → 1 while a reply could travel back
  const delivered = elapsed >= oneWaySec;
  const replyPossible = elapsed >= oneWaySec * 2;
  const arrival = new Date(sent + oneWaySec * 1000).toISOString();

  const node = (Icon: typeof Rocket, label: string, tone: string) => (
    <div className="flex w-20 shrink-0 flex-col items-center gap-1 text-center">
      <span className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${tone}`}>
        <Icon aria-hidden size={24} />
      </span>
      <span className="text-sm font-medium text-slate-300">{label}</span>
    </div>
  );

  /** One leg of the journey: a track, the glowing pulse on it, and its status line underneath. */
  const leg = (progress: number, direction: 'out' | 'back', active: boolean, done: boolean, text: string) => (
    <div className="flex flex-col gap-1.5">
      <div className="relative h-2 rounded-full bg-contrast/10">
        <div
          className={`absolute top-0 h-2 rounded-full ${done ? 'bg-ok/50' : 'bg-cyan-400/40'}`}
          style={direction === 'out' ? { left: 0, width: `${progress * 100}%` } : { right: 0, width: `${progress * 100}%` }}
        />
        {active && (
          <motion.span
            aria-hidden
            className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ${done ? 'bg-ok' : 'bg-cyan-400'} shadow-[0_0_0_6px_color-mix(in_srgb,var(--color-cyan-400)_25%,transparent)]`}
            animate={{ left: `${(direction === 'out' ? progress : 1 - progress) * 100}%`, scale: reduce || done ? 1 : [1, 1.25, 1] }}
            transition={reduce ? { duration: 0 } : { left: { duration: 0.5, ease: 'linear' }, scale: { duration: 1.4, repeat: Infinity } }}
          />
        )}
      </div>
      <p className={`text-base ${done ? 'text-ok' : 'text-slate-200'}`}>{text}</p>
    </div>
  );

  return (
    <div className="mt-3 rounded-xl border border-contrast/10 bg-space-950 p-4">
      <p className="sr-only">
        Report sent at {clock(sentAt)}. It reaches Earth after {formatDelay(oneWaySec)}, and a reply needs the same time to come back.
      </p>
      <div className="flex items-center gap-3">
        {node(Rocket, from, 'border-cyan-400 bg-cyan-700/15 text-cyan-400')}
        <div className="flex flex-1 flex-col gap-3">
          {leg(out, 'out', true, delivered, delivered ? `Delivered to Earth at ${clock(arrival)}` : `→ Reaches Earth in ${formatDelay(oneWaySec - elapsed)}`)}
          {leg(
            back,
            'back',
            delivered,
            replyPossible,
            replyPossible
              ? "← Earth's reply could arrive now (this demo doesn't simulate one)"
              : `← Reply expected in: ${formatDelay(oneWaySec * 2 - elapsed)}`,
          )}
        </div>
        {node(Globe, 'Earth', 'border-ok bg-ok/15 text-ok')}
      </div>
    </div>
  );
}
