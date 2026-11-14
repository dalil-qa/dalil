import { Activity, Compass, Languages } from 'lucide-react';
import { Button } from '../components/Card.tsx';
import { useT } from '../i18n.ts';
import { markLandingSeen } from '../landing.ts';
import { Logo } from '../layout/Logo.tsx';
import { useNav } from '../nav.ts';
import { useStore } from '../store.ts';
import { useTour } from '../tour.ts';

/** First visit, or the hosted link. Global judges won't have our box, so "Explore the demo" is how they see the product. */
export function Landing() {
  const go = useNav((s) => s.go);
  const { lang, t } = useT();
  const setLang = useStore((s) => s.setLang);
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 p-8 text-center">
      <Logo size={72} />
      <div>
        <h1 className="text-5xl font-semibold text-slate-50">Dalil <span aria-hidden className="text-gold-200">دليل</span></h1>
        <p className="mt-2 text-xl text-cyan-400">{t('tagline')}</p>
      </div>
      <p className="text-xl text-slate-300">
        {t('landingBlurb')}
      </p>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button
          big
          onClick={() => {
            markLandingSeen();
            go('check');
          }}
        >
          <Activity aria-hidden size={22} /> {t('liveCheckBtn')}
        </Button>
        <Button
          big
          variant="secondary"
          onClick={() => {
            markLandingSeen();
            // The demo mission: Crew Member 2, Mars transit, Day 47, on the simulator.
            const s = useStore.getState();
            s.setCrew('c2');
            s.setMission('mars');
            s.setMissionDay(47);
            s.setUseSimulator(true);
            useTour.getState().start();
          }}
        >
          <Compass aria-hidden size={22} /> {t('exploreDemo')}
        </Button>
      </div>
      <p className="text-base text-slate-500">{t('notMedical')}.</p>
      <button type="button" lang={lang === 'ar' ? 'en' : 'ar'} onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-base text-slate-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-400">
        <Languages aria-hidden size={18} /> {t('switchLang')}
      </button>
    </main>
  );
}
