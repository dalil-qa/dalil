import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

/** A circular progress ring (animation 4: it fills; with reduced motion it just shows the end state). */
export function Ring({ value, size = 160, stroke = 14, strokeClass = 'stroke-cyan-400', children }: { value: number; size?: number; stroke?: number; strokeClass?: string; children?: ReactNode }) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-contrast/10" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          className={strokeClass}
          initial={{ strokeDashoffset: reduce ? c * (1 - v) : c }}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={reduce ? { duration: 0 } : { duration: 1.1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
