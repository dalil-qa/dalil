import { Card } from '../components/Card.tsx';
import { cards, emergencyContent, missions, symptoms, systems, thresholds } from '../data/index.ts';

interface Src {
  title: string;
  url: string;
}

// Built automatically from the data files, so a source can never be missing from this page (APP_BUILD_GUIDE.md 10.8).
const GROUPS: { topic: string; sources: Src[] }[] = [
  { topic: 'Safe ranges', sources: thresholds.map((t) => t.source) },
  { topic: 'Guidance cards', sources: cards.flatMap((c) => c.sources) },
  { topic: 'Body systems', sources: systems.flatMap((s) => s.sources) },
  { topic: 'Missions', sources: missions.flatMap((m) => m.sources) },
  { topic: 'Symptoms', sources: symptoms.map((s) => s.source) },
  { topic: 'Emergency steps', sources: emergencyContent.sources },
];

function unique(): { title: string; url: string; topics: string[] }[] {
  const map = new Map<string, { title: string; url: string; topics: string[] }>();
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
  const link = 'underline underline-offset-2 hover:text-cyan-400';
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <h1 className="text-[28px] font-semibold text-slate-50">Sources</h1>

      <Card title="Where the numbers and guidance come from">
        <ul className="flex flex-col gap-3">
          {list.map((s) => (
            <li key={s.url + s.title} className="text-base text-slate-200">
              <a className={link} href={s.url} target="_blank" rel="noreferrer">{s.title}</a>
              <span className="block text-sm text-slate-400">Used for: {s.topics.join(', ').toLowerCase()}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate-400">Some entries are placeholders marked DRAFT: the health team is replacing them with the exact sources. Treat DRAFT content as unchecked.</p>
      </Card>

      <Card title="Data you see">
        <p className="text-base text-slate-300">Values marked <strong>Measured by station</strong> come from the Dalil Crew Health Station. <strong>Simulated</strong> and <strong>Sample data</strong> are made up for the demo, from fictional crew members, and are always labelled. <strong>Logged by you</strong> is typed in.</p>
      </Card>

      <Card title="AI use">
        <ul className="list-disc pl-5 text-base text-slate-300">
          <li>The Coach uses Cloudflare Workers AI (Meta Llama 3.3 70B Instruct) and answers only from the guidance cards above. It never diagnoses, and a red status always says to contact the flight surgeon.</li>
          <li>Red-flag symptoms and the Emergency page never use AI.</li>
          <li>This app's code and draft text were written with help from AI (Claude Code by Anthropic), and reviewed by the team.</li>
        </ul>
      </Card>

      <Card title="Built with">
        <p className="text-base text-slate-300">
          {LIBRARIES.map((l, i) => (
            <span key={l.url}>{i > 0 && ' · '}<a className={link} href={l.url} target="_blank" rel="noreferrer">{l.title}</a></span>
          ))}
        </p>
      </Card>

      <p className="text-base text-slate-400">Dalil is a guidance tool for a hackathon project. It is not a medical device and does not replace a doctor.</p>
    </div>
  );
}
