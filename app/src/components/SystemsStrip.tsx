import { motion, useReducedMotion } from 'motion/react';
import { Bone, Brain, Eye, Heart, ShieldPlus, Thermometer, Utensils, Wind, type LucideIcon } from 'lucide-react';
import type { Assessment, BodySystem, IndicatorId, Status } from '../types.ts';
import { STATUS_INFO } from './info.ts';
import { worstStatus } from '../logic/status.ts';

const SYSTEMS: { id: BodySystem['id']; name: string; Icon: LucideIcon; indicators: IndicatorId[] }[] = [
  { id: 'heart', name: 'Heart', Icon: Heart, indicators: ['hr', 'bp_sys', 'bp_dia'] },
  { id: 'lungs', name: 'Lungs', Icon: Wind, indicators: ['spo2'] },
  { id: 'brain', name: 'Brain', Icon: Brain, indicators: ['mood', 'sleep'] },
  { id: 'metabolism', name: 'Metabolism', Icon: Utensils, indicators: ['glucose', 'water', 'meals'] },
  { id: 'skin', name: 'Skin', Icon: Thermometer, indicators: ['temp'] },
  { id: 'musculoskeletal', name: 'Bones', Icon: Bone, indicators: ['exercise'] },
  { id: 'immune', name: 'Immune', Icon: ShieldPlus, indicators: [] },
  { id: 'eyes', name: 'Eyes', Icon: Eye, indicators: [] },
];

/**
 * Animation 2 (a stand-in until the body figure exists): the body systems light up one by one,
 * about 150 ms apart, in the colour of what was just measured. Systems with nothing measured stay grey.
 */
export function SystemsStrip({ assessments }: { assessments: Assessment[] }) {
  const reduce = useReducedMotion();
  return (
    <ul className="grid grid-cols-4 gap-3 sm:grid-cols-8" aria-label="Body systems">
      {SYSTEMS.map(({ id, name, Icon, indicators }, i) => {
        const statuses = assessments.filter((a) => indicators.includes(a.indicator)).map((a) => a.status);
        const status: Status | null = statuses.length ? worstStatus(statuses) : null;
        const info = status ? STATUS_INFO[status] : null;
        return (
          <motion.li
            key={id}
            initial={reduce ? false : { opacity: 0.25, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduce ? { duration: 0 } : { delay: i * 0.15, duration: 0.3 }}
            className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-sm ${info ? `${info.border} ${info.bg} ${info.text}` : 'border-white/10 text-slate-500'}`}
          >
            <Icon aria-hidden size={26} />
            <span className="font-medium">{name}</span>
            <span className="text-sm">{info ? info.word : 'Not measured'}</span>
          </motion.li>
        );
      })}
    </ul>
  );
}
