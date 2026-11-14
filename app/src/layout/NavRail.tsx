import { Activity, Globe, House, MessageCircle, TrendingUp, UserRound, type LucideIcon } from 'lucide-react';
import { useT } from '../i18n.ts';
import { useNav, type Screen } from '../nav.ts';

const ITEMS = [
  { screen: 'today', key: 'navToday', Icon: House },
  { screen: 'check', key: 'navCheck', Icon: Activity },
  { screen: 'body', key: 'navBody', Icon: UserRound },
  { screen: 'trends', key: 'navTrends', Icon: TrendingUp },
  { screen: 'coach', key: 'navCoach', Icon: MessageCircle },
  { screen: 'earth', key: 'navEarth', Icon: Globe },
] as const satisfies readonly { screen: Screen; key: string; Icon: LucideIcon }[];

export function NavRail() {
  const { screen, go } = useNav();
  const { t } = useT();
  return (
    <nav aria-label={t('navScreens')} className="flex gap-1 border-b border-contrast/10 p-2 md:w-28 md:flex-col md:border-b-0 md:border-e">
      {ITEMS.map(({ screen: s, key, Icon }) => (
        <button
          key={s}
          type="button"
          onClick={() => go(s)}
          aria-current={screen === s ? 'page' : undefined}
          className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-3 text-base font-medium md:flex-none focus-visible:outline-2 focus-visible:outline-cyan-400 ${screen === s ? 'bg-cyan-700/30 text-cyan-400' : 'text-slate-300 hover:bg-contrast/5'}`}
        >
          <Icon aria-hidden size={24} />
          {t(key)}
        </button>
      ))}
    </nav>
  );
}
