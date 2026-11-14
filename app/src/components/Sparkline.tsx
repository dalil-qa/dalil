/** A 7-day mini line with no axes. Missing days are skipped. */
export function Sparkline({ values, className = 'stroke-cyan-400' }: { values: (number | null)[]; className?: string }) {
  const points = values.flatMap((v, i) => (v === null ? [] : [{ i, v }]));
  if (points.length < 2) return <div className="h-8" aria-hidden />;
  const min = Math.min(...points.map((p) => p.v));
  const max = Math.max(...points.map((p) => p.v));
  const span = max - min || 1;
  const w = 100;
  const h = 28;
  const x = (i: number) => (i / Math.max(1, values.length - 1)) * w;
  const y = (v: number) => h - 3 - ((v - min) / span) * (h - 6);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline points={points.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" className={className} />
    </svg>
  );
}
