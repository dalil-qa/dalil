import { Card } from '../components/Card.tsx';

const TEXT: Record<string, { title: string; body: string }> = {
  body: { title: 'Body', body: 'A clickable body figure: each system is green, amber or red and answers NASA\'s five questions (APP_BUILD_GUIDE 10.4).' },
  trends: { title: 'Trends', body: 'Charts with the NASA band, your own baseline and plain-English insights (APP_BUILD_GUIDE 10.5).' },
  coach: { title: 'Coach', body: 'Ask questions and get answers from the written guidance cards, with sources (APP_BUILD_GUIDE 10.6). The Worker behind it is already live.' },
  earth: { title: 'Earth: the flight surgeon', body: 'The report, the signal-delay animation and the surgeon\'s view (APP_BUILD_GUIDE 10.7).' },
  sources: { title: 'Sources', body: 'Every threshold, card and number with where it came from (APP_BUILD_GUIDE 10.8).' },
};

/** Stand-in for the screens that come after the demo path. */
export function Soon({ screen }: { screen: string }) {
  const t = TEXT[screen] ?? { title: screen, body: '' };
  return (
    <div className="mx-auto max-w-3xl">
      <Card title={t.title}>
        <p className="text-base text-slate-300">{t.body}</p>
        <p className="mt-3 text-base text-slate-400">This screen is built in the next phase.</p>
      </Card>
    </div>
  );
}
