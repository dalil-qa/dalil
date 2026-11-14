import { Card } from '../components/Card.tsx';
import { useT, type Key } from '../i18n.ts';
import { cards, emergencyContent, missions, symptoms, systems, thresholds } from '../data/index.ts';

interface Src {
  title: string;
  url: string;
}

// Built automatically from the data files, so a source can never be missing from this page (APP_BUILD_GUIDE.md 10.8).
const GROUPS: { topic: Key; sources: Src[] }[] = [
  { topic: 'topic_ranges', sources: thresholds.map((t) => t.source) },
  { topic: 'topic_cards', sources: cards.flatMap((c) => c.sources) },
  { topic: 'topic_systems', sources: systems.flatMap((s) => s.sources) },
  { topic: 'topic_missions', sources: missions.flatMap((m) => m.sources) },
  { topic: 'topic_symptoms', sources: symptoms.map((s) => s.source) },
  { topic: 'topic_emergency', sources: emergencyContent.sources },
];

function unique(): { title: string; url: string; topics: Key[] }[] {
  const map = new Map<string, { title: string; url: string; topics: Key[] }>();
  for (const g of GROUPS) {
    for (const s of g.sources) {
      const key = `${s.url}|${s.title}`;
      const hit = map.get(key) ?? { title: s.title, url: s.url, topics: [] };
      if (!hit.topics.includes(g.topic)) hit.topics.push(g.topic);
      map.set(key, hit);
    }
  }
  return [...map.values()];
}

const LIBRARIES: Src[] = [
  { title: 'React', url: 'https://react.dev' },
  { title: 'Vite', url: 'https://vite.dev' },
  { title: 'Tailwind CSS', url: 'https://tailwindcss.com' },
  { title: 'Recharts', url: 'https://recharts.org' },
  { title: 'Zustand', url: 'https://zustand-demo.pmnd.rs' },
  { title: 'Lucide icons', url: 'https://lucide.dev' },
  { title: 'Motion', url: 'https://motion.dev' },
];

export function Sources() {
  const list = unique();
  const { lang, t } = useT();
  const link = 'underline underline-offset-2 hover:text-cyan-400';
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <h1 className="text-[28px] font-semibold text-slate-50">{t('srcTitle')}</h1>

      <Card title={t('srcWhere')}>
        <ul className="flex flex-col gap-3">
          {list.map((s) => (
            <li key={s.url + s.title} className="text-base text-slate-200">
              <a dir="ltr" className={`${link} inline-block`} href={s.url} target="_blank" rel="noreferrer">{s.title}</a>
              <span className="block text-sm text-slate-400">{t('usedFor', { list: s.topics.map((k) => t(k)).join(lang === 'ar' ? '، ' : ', ') })}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate-400">{t('srcDraftNote')}</p>
      </Card>

      <Card title={t('srcDataTitle')}>
        <p className="text-base text-slate-300">{t('srcDataText')}</p>
      </Card>

      <Card title={t('srcAiTitle')}>
        <ul className="list-disc ps-5 text-base text-slate-300">
          <li>{t('srcAi1')}</li>
          <li>{t('srcAi2')}</li>
          <li>{t('srcAi3')}</li>
        </ul>
      </Card>

      <Card title={t('srcBuiltWith')}>
        <p className="text-base text-slate-300">
          {LIBRARIES.map((l, i) => (
            <span key={l.url}>{i > 0 && ' · '}<a className={link} href={l.url} target="_blank" rel="noreferrer">{l.title}</a></span>
          ))}
        </p>
      </Card>

      <p className="text-base text-slate-400">{t('srcFooter')}</p>
    </div>
  );
}
