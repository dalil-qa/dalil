/** A small list of "Source: title" links. */
export function SourceList({ sources }: { sources: { title: string; url: string }[] }) {
  if (sources.length === 0) return null;
  return (
    <p className="mt-2 text-sm text-slate-400">
      Source:{' '}
      {sources.map((s, i) => (
        <span key={s.url + s.title}>
          {i > 0 && '; '}
          <a className="underline underline-offset-2 hover:text-cyan-400" href={s.url} target="_blank" rel="noreferrer">{s.title}</a>
        </span>
      ))}
    </p>
  );
}
