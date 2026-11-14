import { motion, useReducedMotion } from 'motion/react';
import { Globe, Satellite } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDelay } from '../logic/format.ts';
import { clock } from '../logic/summary.ts';

/**
 * Animation 3: a dot travelling from the crew to Earth (shared by the Emergency page and the Flight Surgeon screen).
 * `sentAt` is when the message left; `oneWaySec` is the mission's signal delay.
 */
export function DelayAnimation({ oneWaySec, sentAt }: { oneWaySec: number; sentAt: string }) {
  const reduce = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const sent = Date.parse(sentAt);
  const elapsed = Math.max(0, (now - sent) / 1000);
  const progress = Math.min(1, elapsed / oneWaySec);
  const delivered = elapsed >= oneWaySec;
  const arrival = new Date(sent + oneWaySec * 1000).toISOString();

  return (
    <div className="mt-2">
      <div className="flex items-center gap-3 text-slate-300">
        <Satellite aria-hidden size={22} />
        <div className="relative h-1.5 flex-1 rounded-full bg-white/10">
          <motion.div
            className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ${delivered ? 'bg-ok' : 'bg-cyan-400'}`}
            animate={{ left: `${progress * 100}%` }}
            transition={reduce ? { duration: 0 } : { duration: 0.5, ease: 'linear' }}
          />
        </div>
        <Globe aria-hidden size={22} />
      </div>
      <p className="mt-2 text-base text-slate-300">
        {delivered ? `Delivered to Earth at ${clock(arrival)}` : `Reaches Earth in ${formatDelay(oneWaySec - elapsed)}`}
        {' · '}
        Earth's reply can take about {formatDelay(oneWaySec * 2)} to come back
      </p>
    </div>
  );
}
