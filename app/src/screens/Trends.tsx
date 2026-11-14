import { Lightbulb } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../components/Card.tsx';
import { SOURCE_INFO, STATUS_INFO } from '../components/info.ts';
import { thresholdFor } from '../data/index.ts';
import { computeBaseline, computePreflightNormal } from '../logic/baseline.ts';
import { formatValue } from '../logic/format.ts';
import { insightList } from '../logic/insights.ts';
import { latestAssessments } from '../logic/overview.ts';
import { SOURCE_KEY, indicatorName } from '../i18n-app.ts';
import { statusWord, useT, type Key } from '../i18n.ts';
import { INDICATOR_LABELS, assessReading, worstStatus } from '../logic/status.ts';
import { useNav } from '../nav.ts';
import { useStore } from '../store.ts';
import type { Assessment, IndicatorId, Reading, Source, Status } from '../types.ts';

type Range = '7' | '30' | 'all';
const RANGES: { id: Range; key: Key }[] = [{ id: '7', key: 'range7' }, { id: '30', key: 'range30' }, { id: 'all', key: 'rangeAll' }];
const TAB_ORDER: IndicatorId[] = ['hr', 'spo2', 'temp', 'sleep', 'mood', 'bp_sys', 'glucose', 'water', 'meals', 'exercise'];
const STATUS_RANK: Record<Status, number> = { act: 0, watch: 1, ok: 2 };

// The brand tokens from index.css, as CSS variables, so the chart follows the light / dark theme.
const COLOR: Record<Status | 'none', string> = { ok: 'var(--color-ok)', watch: 'var(--color-watch)', act: 'var(--color-act)', none: 'var(--color-cyan-400)' };
const AXIS = 'var(--color-slate-400)';
const GRID = 'color-mix(in srgb, var(--color-contrast) 8%, transparent)';
const GOLD = 'var(--color-gold-200)';

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

/** Round axis steps (1, 2, 5, 10, 20, 50…) so values can be read off the chart. */
function niceStep(span: number, maxTicks: number): number {
  // Smallest round step first (0.1, 0.2, 0.5, 1, 2, 5, 10, 20…) that keeps the ticks to `maxTicks`.
  for (let mag = 0.1; mag <= 10_000; mag *= 10) {
    for (const base of [1, 2, 5]) {
      const step = Math.round(base * mag * 10) / 10;
      if (span / step <= maxTicks) return step;
    }
  }
  return 10_000;
}

/** Day ticks on round numbers, plus the first and last day; never two labels crowded together. */
function dayTicks(from: number, to: number, earth: boolean): number[] {
  const step = niceStep(to - from, 6);
  const ticks = new Set<number>([from, to]);
  if (earth && from < 0) ticks.add(0);
  for (let d = Math.ceil(from / step) * step; d <= to; d += step) {
    if (Math.abs(d - from) >= step * 0.5 && Math.abs(to - d) >= step * 0.5) ticks.add(d);
  }
  return [...ticks].sort((a, b) => a - b);
}

function Tip({ active, payload, indicator }: { active?: boolean; payload?: { payload: Point }[]; indicator: IndicatorId }) {
  const { lang, t } = useT();
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const f = formatValue(indicator, p.value, p.unit);
  const { Icon } = SOURCE_INFO[p.source];
  const label = t(SOURCE_KEY[p.source]);
  return (
    <div className="rounded-xl border border-contrast/15 bg-space-900 p-3 text-base text-slate-100 shadow-lg">
      <p className="font-semibold">{p.day <= 0 ? t('tipBeforeLaunch', { d: p.day }) : t('tipDay', { d: p.day })}</p>
      <p className="tabular-nums">{f.value} {f.unit}{p.dia !== undefined ? ` / ${p.dia}` : ''}</p>
      {p.status && <p className={STATUS_INFO[p.status].text}>{statusWord(p.status, false, lang)}</p>}
      <p className="inline-flex items-center gap-1 text-sm text-slate-400"><Icon aria-hidden size={14} /> {label}</p>
    </div>
  );
}

/** A label written just right of the chart, at the height of a reference line, so it never sits on the data. */
function LineTag({ viewBox, text, color, dy = 0 }: { viewBox?: { x?: number; y?: number; width?: number }; text: string; color: string; dy?: number }) {
  if (!viewBox || viewBox.x === undefined || viewBox.y === undefined || viewBox.width === undefined) return null;
  return (
    <text x={viewBox.x + viewBox.width + 16} y={viewBox.y + dy + 5} fill={color} fontSize={14} fontWeight={600}>
      {text}
    </text>
  );
}

/** One figure in the summary strip. */
function Stat({ label, value, sub, className = '' }: { label: string; value: string; sub?: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 rounded-xl border border-contrast/10 bg-space-950 p-3 ${className}`}>
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-[26px] font-semibold leading-tight tabular-nums text-slate-50">{value}</span>
      {sub && <span className="text-sm text-slate-400">{sub}</span>}
    </div>
  );
}

const shown = (indicator: IndicatorId, v: number, unit: string) => {
  const f = formatValue(indicator, v, unit);
  return `${f.value}${f.unit ? ` ${f.unit}` : ''}`;
};

/** Small dots for OK days, bigger ones for Watch and Call surgeon, and a ring with the value on the latest reading. */
function Dot(props: { cx?: number; cy?: number; payload?: Point; lastDay?: number | null; indicator?: IndicatorId }) {
  const { cx, cy, payload, lastDay, indicator } = props;
  if (cx === undefined || cy === undefined || !payload || !indicator) return null;
  const s = payload.status;
  const r = s === 'act' ? 6.5 : s === 'watch' ? 5.5 : 3.5;
  const color = COLOR[s ?? 'none'];
  const isLast = payload.day === lastDay;
  return (
    <g>
      {isLast && <circle cx={cx} cy={cy} r={10} fill="none" stroke={color} strokeWidth={2} />}
      <circle cx={cx} cy={cy} r={r} fill={color} stroke="var(--color-space-900)" strokeWidth={1.5} />
      {isLast && (
        <text x={cx} y={cy - 16} textAnchor="end" fill={color} fontSize={14} fontWeight={700}>
          {shown(indicator, payload.value, payload.unit)}
        </text>
      )}
    </g>
  );
}

/** "+9 bpm", "−1.5 h", "+2 points": the change, without judging it. */
function change(indicator: IndicatorId, diff: number, unit: string, t: (k: Key) => string): string {
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '±';
  const abs = Math.abs(diff);
  if (indicator === 'mood') return `${sign}${abs} ${abs === 1 ? t('unitPoint') : t('unitPoints')}`;
  if (indicator === 'meals') return `${sign}${abs} ${abs === 1 ? t('unitMeal') : t('unitMeals')}`;
  const f = formatValue(indicator, abs, unit);
  return `${sign}${f.value}${f.unit ? ` ${f.unit}` : ''}`;
}

export function Trends() {
  const crewId = useStore((s) => s.crewId);
  const day = useStore((s) => s.missionDay);
  const readings = useStore((s) => s.readings);
  const selected = useNav((s) => s.trendIndicator);
  const [range, setRange] = useState<Range>('30');
  const [chosen, setChosen] = useState<IndicatorId | null>(null);
  const { lang, t } = useT();
  const ar = lang === 'ar';
  const nameOf = (i: IndicatorId) => (i === 'bp_sys' ? t('bloodPressure') : indicatorName(i, INDICATOR_LABELS[i], ar));

  const mine = readings.filter((r) => r.crewId === crewId);
  const latest = new Map(latestAssessments(readings, crewId, day).map((i) => [i.indicator, i]));
  const assessmentOf = (i: IndicatorId): Assessment | null => latest.get(i)?.assessment ?? null;
  // A tab's status; blood pressure is the worse of its two numbers.
  const tabStatus = (i: IndicatorId): Status | null => {
    const parts = (i === 'bp_sys' ? ['bp_sys', 'bp_dia'] : [i]).map((x) => assessmentOf(x as IndicatorId)?.status).filter((s): s is Status => !!s);
    return parts.length ? worstStatus(parts) : null;
  };
  // Tabs that need attention come first, then the usual order.
  const tabs = TAB_ORDER.filter((i) => mine.some((r) => r.indicator === i)).sort(
    (a, b) => (STATUS_RANK[tabStatus(a) ?? 'ok'] - STATUS_RANK[tabStatus(b) ?? 'ok']) || TAB_ORDER.indexOf(a) - TAB_ORDER.indexOf(b),
  );
  const indicator = chosen ?? (tabs.includes(selected) ? selected : tabs[0]);

  if (!indicator) {
    return <Card title={t('trendsTitle')}><p className="text-base text-slate-300">{t('trendsNoReadings')}</p></Card>;
  }

  const from = range === '7' ? day - 6 : range === '30' ? day - 29 : Math.min(-14, ...mine.map((r) => r.missionDay));
  const data = seriesFor(mine, indicator, from, day);
  const label = nameOf(indicator);

  const threshold = thresholdFor(indicator);
  const rule = threshold?.baseline ?? null;
  const base = rule ? computeBaseline(mine, indicator, day).value : null;
  const limit = rule && base !== null ? (rule.bandType === 'pct' ? (base * rule.band) / 100 : rule.band) : 0;
  const pre = computePreflightNormal(mine, indicator).value;
  const now = latest.get(indicator)?.reading ?? null;
  const nowDia = indicator === 'bp_sys' ? latest.get('bp_dia')?.reading ?? null : null;
  const assessment = assessmentOf(indicator);
  const status = tabStatus(indicator);
  const unit = now?.unit ?? threshold?.unit ?? '';

  // Change over the last 7 days: the latest value against the one closest to 7 days earlier.
  const series7 = seriesFor(mine, indicator, day - 7, day);
  const weekChange = now && series7.length >= 2 ? change(indicator, Math.round((series7[series7.length - 1].value - series7[0].value) * 10) / 10, unit, t) : null;

  // Insights about this tab go above the chart; the rest below it.
  const allTips = insightList(readings, crewId, day);
  const mineTips = allTips.filter((t) => t.indicators.includes(indicator === 'bp_sys' ? 'bp_sys' : indicator));
  const otherTips = allTips.filter((t) => !mineTips.includes(t));

  // Y axis: the data plus the bands, on round steps.
  const values = data.flatMap((p) => [p.value, ...(p.dia !== undefined ? [p.dia] : [])]);
  const bandBounds = [threshold?.green.min, threshold?.green.max, base !== null ? base - limit : null, base !== null ? base + limit : null, pre].filter((v): v is number => typeof v === 'number');
  const lo = Math.min(...values, ...bandBounds);
  const hi = Math.max(...values, ...bandBounds);
  const yStep = niceStep(Math.max(hi - lo, 1) * 1.15, 6);
  const yMin = Math.floor((lo - yStep * 0.3) / yStep) * yStep;
  const yMax = Math.ceil((hi + yStep * 0.3) / yStep) * yStep;
  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax + 1e-9; v += yStep) yTicks.push(Math.round(v * 100) / 100);

  const xMin = data.length ? Math.min(from, data[0].day) : from;
  const earth = xMin <= 0;
  const isBp = indicator === 'bp_sys';
  const lastDay = data.length ? data[data.length - 1].day : null;

  // "Your normal" and "Before launch" labels sit right of the chart; if the two lines are close, push them apart.
  const close = base !== null && pre !== null && Math.abs(base - pre) < (yMax - yMin) * 0.08;
  const normalDy = close ? (base >= pre ? -9 : 9) : 0;
  const preDy = close ? (pre > base ? -9 : 9) : 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <h1 className="text-[28px] font-semibold text-slate-50">{t('trendsTitle')}</h1>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label={t('indicatorTab')} className="flex flex-wrap gap-2">
          {tabs.map((i) => {
            const s = tabStatus(i);
            const info = s ? STATUS_INFO[s] : null;
            const on = i === indicator;
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={on}
                aria-label={`${nameOf(i)}${s ? `: ${statusWord(s, false, lang)}` : ''}`}
                onClick={() => setChosen(i)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-base ${on ? 'border-cyan-400 bg-cyan-700/30 text-cyan-400' : `${info && s !== 'ok' ? info.border : 'border-contrast/20'} text-slate-200 hover:bg-contrast/10`} focus-visible:outline-2 focus-visible:outline-cyan-400`}
              >
                {info && <info.Icon aria-hidden size={16} className={info.text} />}
                {nameOf(i)}
              </button>
            );
          })}
        </div>
        <div role="group" aria-label={t('rangeLabel')} className="flex gap-2">
          {RANGES.map((r) => (
            <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => setRange(r.id)} className={`rounded-lg border px-3 py-1.5 text-base ${range === r.id ? 'border-cyan-400 bg-cyan-700/30 text-cyan-400' : 'border-contrast/20 text-slate-300 hover:bg-contrast/10'} focus-visible:outline-2 focus-visible:outline-cyan-400`}>
              {t(r.key)}
            </button>
          ))}
        </div>
      </div>

      {/* The answer first: where this person is now, compared with their own normal. */}
      <Card>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className={`flex flex-col gap-1 rounded-xl border p-3 ${status ? `${STATUS_INFO[status].border} ${STATUS_INFO[status].bg}` : 'border-contrast/10 bg-space-950'}`}>
            <span className="text-sm text-slate-400">{t('nowLabel', { name: label })}</span>
            <span className="text-[26px] font-semibold leading-tight tabular-nums text-slate-50">
              {now ? (nowDia ? `${now.value}/${nowDia.value} ${now.unit}` : shown(indicator, now.value, now.unit)) : '–'}
            </span>
            {status ? (
              <span className={`inline-flex items-center gap-1 text-sm font-semibold ${STATUS_INFO[status].text}`}>
                {(() => { const I = STATUS_INFO[status].Icon; return <I aria-hidden size={16} />; })()}
                {statusWord(status, false, lang)}
              </span>
            ) : (
              <span className="text-sm text-slate-400">{t('noRangeYet')}</span>
            )}
          </div>
          <Stat label={t('yourNormal')} value={base !== null ? shown(indicator, base, unit) : rule ? t('learning') : '–'} sub={base !== null ? t('normalSub', { band: shown(indicator, limit, unit) }) : rule ? t('needs5') : t('notTracked')} />
          <Stat label={t('chartBeforeLaunch')} value={pre !== null ? shown(indicator, pre, unit) : '–'} sub={pre !== null ? t('checksOnEarth') : t('noPreflight')} />
          <Stat label={t('last7')} value={weekChange ?? '–'} sub={weekChange ? t('changeWeek') : t('notEnough')} />
        </div>
        {/* The plain reason, unless an insight below already says the same thing in more detail. */}
        {mineTips.length === 0 && <p dir="auto" className="mt-3 text-base text-slate-200">
          {assessment ? assessment.reason : threshold ? t('noReadingToday') : t('noRangeStatus')}
        </p>}
        {mineTips.map((t) => (
          <div key={t.text} className="mt-3 flex items-start gap-3 rounded-xl border border-gold-200/40 bg-gold-200/10 p-3 text-base text-slate-100">
            <Lightbulb aria-hidden className="mt-0.5 shrink-0 text-gold-200" size={20} />
            <p dir="auto">{t.text}</p>
          </div>
        ))}
      </Card>

      <Card>
        <div className="h-80 w-full" dir="ltr" role="img" aria-label={`${t('chartAria', { name: label, n: data.length })}${assessment ? ` ${assessment.reason}` : ''}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 24, right: 124, bottom: 8, left: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="day" type="number" domain={[xMin, day]} ticks={dayTicks(xMin, day, earth)} interval={0} allowDecimals={false} stroke={AXIS} tick={{ fontSize: 14, fill: AXIS }} label={{ value: t('axisMissionDay'), position: 'insideBottom', offset: -2, fill: AXIS, fontSize: 14 }} />
              <YAxis domain={[yMin, yMax]} ticks={yTicks} interval={0} allowDecimals={yStep < 1} stroke={AXIS} tick={{ fontSize: 14, fill: AXIS }} width={48} />
              <Tooltip content={<Tip indicator={indicator} />} />
              {/* Safe range: a light background. */}
              {threshold && <ReferenceArea y1={threshold.green.min ?? yMin} y2={threshold.green.max ?? yMax} fill={COLOR.ok} fillOpacity={0.08} />}
              {/* Before launch: a very light area, a divider at launch, and the word "Earth". */}
              {earth && <ReferenceArea x1={xMin} x2={0.5} fill={AXIS} fillOpacity={0.05} label={{ value: t('chartEarth'), position: 'insideTopLeft', fill: AXIS, fontSize: 14 }} />}
              {earth && <ReferenceLine x={0.5} stroke={AXIS} strokeDasharray="3 3" label={{ value: t('launch'), position: 'insideTopRight', fill: AXIS, fontSize: 14 }} />}
              {/* Your normal: a band with a solid centre line, labelled at the right. */}
              {base !== null && <ReferenceArea y1={base - limit} y2={base + limit} fill={COLOR.none} fillOpacity={0.12} />}
              {base !== null && <ReferenceLine y={base} stroke={COLOR.none} strokeWidth={1.5} label={<LineTag text={t('yourNormal')} color={COLOR.none} dy={normalDy} />} />}
              {pre !== null && <ReferenceLine y={pre} stroke={GOLD} strokeDasharray="6 4" strokeWidth={1.5} label={<LineTag text={t('chartBeforeLaunch')} color={GOLD} dy={preDy} />} />}
              <Line type="monotone" dataKey="value" stroke={COLOR.none} strokeWidth={2.5} dot={<Dot lastDay={lastDay} indicator={indicator} />} activeDot={<Dot lastDay={lastDay} indicator={indicator} />} isAnimationActive={false} />
              {isBp && <Line type="monotone" dataKey="dia" stroke="var(--color-series-2)" strokeWidth={2.5} dot={{ r: 3.5, fill: 'var(--color-series-2)', stroke: 'var(--color-space-900)' }} isAnimationActive={false} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-400">
          {threshold && <li><span aria-hidden className="mr-1.5 inline-block h-3 w-4 rounded-sm bg-ok/25 align-middle" />{t('legendSafe')}</li>}
          {base !== null && <li><span aria-hidden className="mr-1.5 inline-block h-3 w-4 rounded-sm border-y-2 border-cyan-400 bg-cyan-400/15 align-middle" />{t('legendNormal', { n: shown(indicator, limit, unit) })}</li>}
          {pre !== null && <li><span aria-hidden className="mr-1.5 inline-block h-0.5 w-4 border-t-2 border-dashed border-gold-200 align-middle" />{t('legendBefore')}</li>}
          <li>{t('dotsSmall')} <span className="text-ok">{statusWord('ok', false, lang)}</span>, {t('dotsBigger')} <span className="text-watch">{statusWord('watch', false, lang)}</span> / <span className="text-act">{statusWord('act', false, lang)}</span> · {t('dotsRinged')}</li>
          {isBp && <li>{t('legendTwoLines')}</li>}
        </ul>
      </Card>

      {otherTips.length > 0 && (
        <section aria-label={t('otherInsights')} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-slate-100">{t('otherInsights')}</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {otherTips.map((t) => (
              <button key={t.text} type="button" onClick={() => setChosen(t.indicators[0])} className="flex items-start gap-3 rounded-2xl border border-gold-200/30 bg-gold-200/5 p-4 text-left text-base text-slate-100 hover:bg-gold-200/10 focus-visible:outline-2 focus-visible:outline-cyan-400">
                <Lightbulb aria-hidden className="mt-0.5 shrink-0 text-gold-200" size={20} />
                <span dir="auto">{t.text}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {allTips.length === 0 && <p className="text-base text-slate-400">{t('noInsights')}</p>}
    </div>
  );
}
