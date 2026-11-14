import { Activity, Globe, House, MessageCircle, TrendingUp, UserRound, type LucideIcon } from 'lucide-react';
import { useNav, type Screen } from '../nav.ts';

const ITEMS: { screen: Screen; label: string; Icon: LucideIcon }[] = [
  { screen: 'today', label: 'Today', Icon: House },
  { screen: 'check', label: 'Check', Icon: Activity },
  { screen: 'body', label: 'Body', Icon: UserRound },
  { screen: 'trends', label: 'Trends', Icon: TrendingUp },
  { screen: 'coach', label: 'Coach', Icon: MessageCircle },
  { screen: 'earth', label: 'Earth', Icon: Globe },
];

export function NavRail() {
  const { screen, go } = useNav();
  return (
    <nav aria-label="Screens" className="flex gap-1 border-b border-white/10 p-2 md:w-28 md:flex-col md:border-b-0 md:border-r">
      {ITEMS.map(({ screen: s, label, Icon }) => (
        <button
          key={s}
          type="button"
          onClick={() => go(s)}
          aria-current={screen === s ? 'page' : undefined}
          className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-3 text-base font-medium md:flex-none focus-visible:outline-2 focus-visible:outline-cyan-400 ${screen === s ? 'bg-cyan-700/30 text-cyan-400' : 'text-slate-300 hover:bg-white/5'}`}
        >
          <Icon aria-hidden size={24} />
          {label}
        </button>
      ))}
    </nav>
  );
}
