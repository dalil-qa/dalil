import { motion, useReducedMotion } from 'motion/react';
import { Heart as HeartIcon } from 'lucide-react';

/** Animation 1: a heart that beats at the live heart rate (one beat every 60/hr s). Not an ECG; don't label it as one. */
export function BeatingHeart({ bpm }: { bpm: number | null }) {
  const reduce = useReducedMotion();
  const beating = bpm !== null && bpm > 0 && !reduce;
  return (
    <motion.div
      aria-hidden
      className={bpm === null ? 'text-slate-600' : 'text-act'}
      animate={beating ? { scale: [1, 1.18, 1, 1.08, 1] } : { scale: 1 }}
      transition={beating ? { duration: 60 / (bpm as number), repeat: Infinity, ease: 'easeInOut' } : { duration: 0 }}
    >
      <HeartIcon size={72} fill="currentColor" strokeWidth={1.5} />
    </motion.div>
  );
}
