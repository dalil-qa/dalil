import { ShieldAlert } from 'lucide-react';
import { useT } from '../i18n.ts';
import { useNav } from '../nav.ts';
import { clock } from '../logic/summary.ts';
import { useStore } from '../store.ts';

/** Stays at the top of every screen while an emergency is open and the page is minimised (10.11). */
export function EmergencyBar() {
  const emergency = useStore((s) => s.emergency);
  const home = useStore((s) => s.homeMode);
  const minimized = useNav((s) => s.emergencyMinimized);
  const show = useNav((s) => s.showEmergency);
  const { t } = useT();
  if (!emergency || !minimized) return null;
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 bg-act px-4 py-2 text-base font-semibold text-space-950">
      <span className="inline-flex items-center gap-2">
        <ShieldAlert aria-hidden size={20} />
        {t('emergencyOpenBar')} · {clock(emergency.startedAt)}
        {!home && ` · ${emergency.reportSentAt ? t('reportSentBar') : t('reportNotSentBar')}`}
      </span>
      <button type="button" onClick={show} className="rounded-lg bg-space-950 px-3 py-1 text-act hover:bg-space-900 focus-visible:outline-2 focus-visible:outline-contrast">
        {t('returnToEmergency')}
      </button>
    </div>
  );
}
