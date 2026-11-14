import { Lightbulb } from 'lucide-react';
import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../components/Card.tsx';
import { SOURCE_INFO, STATUS_INFO } from '../components/info.ts';
import { thresholdFor } from '../data/index.ts';
import { indicatorName, SOURCE_KEY } from '../i18n-app.ts';
import { statusWord, useT } from '../i18n.ts';
import { computeBaseline, computePreflightNormal } from '../logic/baseline.ts';
import { formatValue } from '../logic/format.ts';
import { insights } from '../logic/insights.ts';
import { INDICATOR_LABELS, assessReading } from '../logic/status.ts';
import { useNav } from '../nav.ts';
import { useStore } from '../store.ts';
import type { IndicatorId, Reading, Source, Status } from '../types.ts';

type Range = '7' | '30' | 'all';
const RANGES = [{ id: '7', key: 'range7' }, { id: '30', key: 'range30' }, { id: 'all', key: 'rangeAll' }] as const satisfies readonly { id: Range; key: string }[];
const TAB_ORDER: IndicatorId[] = ['hr', 'spo2', 'temp', 'sleep', 'mood', 'bp_sys', 'glucose', 'water', 'meals', 'exercise'];

// Recharts needs real colour values (these are the brand tokens from index.css).
const COLOR: Record<Status | 'none', string> = { ok: '#34d399', watch: '#fbbf24', act: '#f87171', none: '#22d3ee' };

interface Point { day: number; value: number; dia?: number; status: Status | null; source: Source; unit: string }

/** One value per day (the day's latest), with its status as it was assessed on that day. */
function seriesFor(mine: Reading[], indicator: IndicatorId, from: number, to: number): Point[] {
  const threshold = thresholdFor(indicator);
  const days = new Map<number, Reading>();
  for (const r of mine.filter((x) => x.indicator === indicator && x.missionDay >= from && x.missionDay <= to)) days.set(r.missionDay, r);
  const dia = new Map<number, number>();
  if (indicator === 'bp_sys') for (const r of mine.filter((x) => x.indicator === 'bp_dia')) dia.set(r.missionDay, r.value);
  return [...days.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([day, r]) => ({
      day,
      value: r.value,
      dia: dia.get(day),
      status: threshold ? assessReading({ indicator, value: r.value, missionDay: day }, mine, threshold).status : null,
      source: r.source,
      unit: r.unit,
    }));
}

function Dot(props: { cx?: number; cy?: number; payload?: Point }) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return null;
  return <circle cx={cx} cy={cy} r={5} fill={COLOR[payload.status ?? 'none']} stroke="#0b1426" strokeWidth={2} />;
}

function Tip({ active, payload, indicator }: { active?: boolean; payload?: { payload: Point }[]; indicator: IndicatorId }) {
  const { lang, t } = useT();
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const f = formatValue(indicator, p.value, p.unit);
  const { Icon } = SOURCE_INFO[p.source];
  const label = t(SOURCE_KEY[p.source]);
  return (
    <div className="rounded-xl border border-white/15 bg-space-900 p-3 text-base text-slate-100 shadow-lg">
      <p className="font-semibold">{p.day <= 0 ? t('tipBeforeLaunch', { d: p.day }) : t('tipDay', { d: p.day })}</p>
      <p className="tabular-nums">{f.value} {f.unit}{p.dia !== undefined ? ` / ${p.dia}` : ''}</p>
      {p.status && <p className={STATUS_INFO[p.status].text}>{statusWord(p.status, false, lang)}</p>}
      <p className="inline-flex items-center gap-1 text-sm text-slate-400"><Icon aria-hidden size={14} /> {label}</p>
    </div>
  );
}

export function Trends() {
  const crewId = useStore((s) => s.crewId);
  const day = useStore((s) => s.missionDay);
  const readings = useStore((s) => s.readings);
  const selected = useNav((s) => s.trendIndicator);
  const { lang, t } = useT();
  const ar = lang === 'ar';
  const [range, setRange] = useState<Range>('30');
  const [chosen, setChosen] = useState<IndicatorId | null>(null);

  const mine = readings.filter((r) => r.crewId === crewId);
  const tabs = TAB_ORDER.filter((i) => mine.some((r) => r.indicator === i));
  const indicator = chosen ?? (tabs.includes(selected) ? selected : tabs[0]);

  const from = range === '7' ? day - 6 : range === '30' ? day - 29 : Math.min(-14, ...mine.map((r) => r.missionDay));
  const data = indicator ? seriesFor(mine, indicator, from, day) : [];
  const tips = insights(readings, crewId, day);

  if (!indicator) {
    return <Card title={t('trendsTitle')}><p className="text-base text-slate-300">{t('trendsNoReadings')}</p></Card>;
  }

  const threshold = thresholdFor(indicator);
  const rule = threshold?.baseline ?? null;
  const base = rule ? computeBaseline(mine, indicator, day).value : null;
  const limit = rule && base !== null ? (rule.bandType === 'pct' ? (base * rule.band) / 100 : rule.band) : 0;
  const pre = computePreflightNormal(mine, indicator).value;

  // Y range: the data plus the bands, with a little air, so every band is visible.
  const values = data.flatMap((p) => [p.value, ...(p.dia !== undefined ? [p.dia] : [])]);
  const bandBounds = [threshold?.green.min, threshold?.green.max, base !== null ? base - limit : null, base !== null ? base + limit : null, pre].filter((v): v is number => typeof v === 'number');
  const lo = Math.min(...values, ...bandBounds);
  const hi = Math.max(...values, ...bandBounds);
  const pad = Math.max((hi - lo) * 0.12, 1);
  const yMin = Math.floor(lo - pad);
  const yMax = Math.ceil(hi + pad);
  const xMin = data.length ? Math.min(from, data[0].day) : from;
  const earth = xMin <= 0;
  const isBp = indicator === 'bp_sys';

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <h1 className="text-[28px] font-semibold text-slate-50">{t('trendsTitle')}</h1>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label={t('indicatorTab')} className="flex flex-wrap gap-2">
          {tabs.map((i) => (
            <button key={i} type="button" role="tab" aria-selected={i === indicator} onClick={() => setChosen(i)} className={`rounded-full border px-4 py-1.5 text-base ${i === indicator ? 'border-cyan-400 bg-cyan-700/30 text-cyan-400' : 'border-white/20 text-slate-200 hover:bg-white/10'} focus-visible:outline-2 focus-visible:outline-cyan-400`}>
              {i === 'bp_sys' ? t('bloodPressure') : indicatorName(i, INDICATOR_LABELS[i], ar)}
            </button>
          ))}
        </div>
        <div role="group" aria-label={t('rangeLabel')} className="flex gap-2">
          {RANGES.map((r) => (
            <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => setRange(r.id)} className={`rounded-lg border px-3 py-1.5 text-sm ${range === r.id ? 'border-cyan-400 bg-cyan-700/30 text-cyan-400' : 'border-white/20 text-slate-300 hover:bg-white/10'} focus-visible:outline-2 focus-visible:outline-cyan-400`}>
              {t(r.key)}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <div dir="ltr" className="h-80 w-full" role="img" aria-label={t('chartAria', { name: indicatorName(indicator, INDICATOR_LABELS[indicator], ar), n: data.length })}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="#ffffff14" vertical={false} />
              <XAxis dataKey="day" type="number" domain={[xMin, day]} allowDecimals={false} stroke="#94a3b8" tick={{ fontSize: 14 }} label={{ value: t('axisMissionDay'), position: 'insideBottom', offset: -2, fill: '#94a3b8', fontSize: 14 }} />
              <YAxis domain={[yMin, yMax]} allowDecimals={false} stroke="#94a3b8" tick={{ fontSize: 14 }} width={44} />
              <Tooltip content={<Tip indicator={indicator} />} />
              {earth && <ReferenceArea x1={xMin} x2={0} fill="#94a3b8" fillOpacity={0.08} label={{ value: t('chartEarth'), position: 'insideTopLeft', fill: '#94a3b8', fontSize: 14 }} />}
              {threshold && <ReferenceArea y1={threshold.green.min ?? yMin} y2={threshold.green.max ?? yMax} fill="#34d399" fillOpacity={0.08} />}
              {base !== null && <ReferenceArea y1={base - limit} y2={base + limit} fill="#22d3ee" fillOpacity={0.18} />}
              {pre !== null && <ReferenceLine y={pre} stroke="#fde68a" strokeDasharray="6 4" label={{ value: t('chartBeforeLaunch'), position: 'insideBottomRight', fill: '#fde68a', fontSize: 14 }} />}
              <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2.5} dot={<Dot />} activeDot={<Dot />} isAnimationActive={false} />
              {isBp && <Line type="monotone" dataKey="dia" stroke="#a5b4fc" strokeWidth={2.5} dot={{ r: 4, fill: '#a5b4fc', stroke: '#0b1426' }} isAnimationActive={false} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-400">
          {threshold && <li><span aria-hidden className="me-1 inline-block h-3 w-3 rounded-sm bg-ok/30 align-middle" />{t('legendSafe')}</li>}
          {base !== null && <li><span aria-hidden className="me-1 inline-block h-3 w-3 rounded-sm bg-cyan-400/40 align-middle" />{t('legendNormal', { n: limit })}</li>}
          {pre !== null && <li><span aria-hidden className="me-1 inline-block h-0.5 w-4 border-t-2 border-dashed border-gold-200 align-middle" /> {t('legendBefore')}</li>}
          <li>{t('legendDots')} <span className="text-ok">{statusWord('ok', false, lang)}</span> · <span className="text-watch">{statusWord('watch', false, lang)}</span> · <span className="text-act">{statusWord('act', false, lang)}</span></li>
          {isBp && <li>{t('legendTwoLines')}</li>}
        </ul>
        {!threshold && <p className="mt-2 text-sm text-slate-500">No safe range is set for this indicator yet, so the dots are not coloured.</p>}
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {tips.length === 0 && <p className="text-base text-slate-400">{t('noInsights')}</p>}
        {tips.map((t) => (
          <div key={t} className="flex items-start gap-3 rounded-2xl border border-gold-200/30 bg-gold-200/5 p-4 text-lg text-slate-100">
            <Lightbulb aria-hidden className="mt-1 shrink-0 text-gold-200" size={22} />
            <p dir="auto">{t}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
