import { useT } from '../i18n.ts';
import { TOUR_STEPS, useTour } from '../tour.ts';
import { Button } from './Card.tsx';

/** A small card in the corner that walks through Today, Body and Trends. */
export function Tour() {
  const step = useTour((s) => s.step);
  const { next, stop } = useTour.getState();
  const { t } = useT();
  if (step === null) return null;
  const s = TOUR_STEPS[step];
  return (
    <aside role="dialog" aria-label={t('tourLabel')} className="fixed bottom-4 end-4 z-40 flex max-w-sm flex-col gap-3 rounded-2xl border border-cyan-400/50 bg-space-900 p-5 shadow-xl">
      <p className="text-sm font-semibold text-cyan-400">{t(s.title)}</p>
      <p className="text-base text-slate-100">{t(s.text)}</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={stop}>{t('skipTour')}</Button>
        <Button onClick={next}>{step + 1 >= TOUR_STEPS.length ? t('doneTour') : t('next')}</Button>
      </div>
    </aside>
  );
}
