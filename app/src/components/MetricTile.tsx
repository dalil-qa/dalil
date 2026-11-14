import type { Source, Status } from '../types.ts';
import { STATUS_INFO } from './info.ts';
import { useT } from '../i18n.ts';
import { Sparkline } from './Sparkline.tsx';
import { SourceIcon, StatusBadge } from './Status.tsx';

export function MetricTile({ label, value, unit, status, source, spark, size = 'md', onClick }: {
  label: string;
  value: string;
  unit?: string;
  /** null = this indicator has no thresholds yet, so no status can be given. */
  status: Status | null;
  source: Source;
  spark?: (number | null)[];
  size?: 'md' | 'lg';
  onClick?: () => void;
}) {
  const { t } = useT();
  const lg = size === 'lg';
  const border = status ? STATUS_INFO[status].border : 'border-contrast/10';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`flex flex-col gap-2 rounded-2xl border bg-space-900 p-4 text-start ${border} ${onClick ? 'hover:bg-contrast/5 focus-visible:outline-2 focus-visible:outline-cyan-400' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-medium text-slate-300">{label}</span>
        <SourceIcon source={source} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`font-semibold tabular-nums text-slate-50 ${lg ? 'text-6xl' : 'text-4xl'}`}>{value}</span>
        {unit && <span className={`text-slate-400 ${lg ? 'text-xl' : 'text-base'}`}>{unit}</span>}
      </div>
      <div className="flex items-center justify-between gap-2">
        {status ? <StatusBadge status={status} /> : <span className="text-sm text-slate-500">{t('noRangeYet')}</span>}
      </div>
      {spark && <Sparkline values={spark} className={status ? STATUS_INFO[status].stroke : 'stroke-cyan-400'} />}
    </Tag>
  );
}
