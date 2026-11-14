import type { KeyboardEvent, ReactNode } from 'react';
import { statusWord, useT } from '../i18n.ts';
import type { BodySystem, Status } from '../types.ts';

// Our own simple figure (APP_BUILD_GUIDE.md 10.4): no downloaded art, so no licence questions.
// Each system is a <g> that is a real button: clickable, focusable with Tab, opens with Enter or Space.

const TONE: Record<Status | 'none', string> = {
  ok: 'fill-ok/30 stroke-ok',
  watch: 'fill-watch/35 stroke-watch',
  act: 'fill-act/40 stroke-act',
  none: 'fill-white/5 stroke-slate-500',
};

interface Props {
  statuses: Record<BodySystem['id'], Status | null>;
  names: Record<BodySystem['id'], string>;
  selected: BodySystem['id'];
  highlighted: Set<BodySystem['id']>;
  onSelect: (id: BodySystem['id']) => void;
}

export function BodyFigure({ statuses, names, selected, highlighted, onSelect }: Props) {
  const { lang, t } = useT();
  const stateText = (s: Status | null) => (s ? statusWord(s, false, lang) : t('noRangeYet'));
  const part = (id: BodySystem['id'], children: (cls: string) => ReactNode, label?: string) => {
    const status = statuses[id];
    const tone = TONE[status ?? 'none'];
    const isSel = selected === id;
    const hot = highlighted.has(id);
    const cls = `${tone} ${isSel ? '[stroke-width:3.5]' : '[stroke-width:1.5]'} ${hot ? 'stroke-cyan-400 [stroke-dasharray:5_3]' : ''} group-focus-visible:stroke-white group-focus-visible:[stroke-width:4]`;
    return (
      <g
        key={id}
        role="button"
        tabIndex={0}
        aria-label={`${label ?? names[id]}: ${stateText(status)}`}
        aria-pressed={isSel}
        onClick={() => onSelect(id)}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(id);
          }
        }}
        className="group cursor-pointer outline-none"
      >
        {children(cls)}
      </g>
    );
  };

  const outlineTone = TONE[statuses.skin ?? 'none'];
  const skinSel = selected === 'skin';

  return (
    <svg viewBox="0 0 240 420" className="mx-auto h-auto w-full max-w-xs" role="group" aria-label={t('bodyFigureLabel')}>
      {/* Body silhouette. The outline is the skin: it is coloured by the skin and temperature status. */}
      <g
        role="button"
        tabIndex={0}
        aria-label={`${names.skin}: ${stateText(statuses.skin)}`}
        aria-pressed={skinSel}
        onClick={() => onSelect('skin')}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect('skin');
          }
        }}
        className="group cursor-pointer outline-none"
      >
        <circle cx="110" cy="46" r="30" className={`${outlineTone} ${skinSel ? '[stroke-width:5]' : '[stroke-width:3]'} ${highlighted.has('skin') ? 'stroke-cyan-400 [stroke-dasharray:6_3]' : ''} group-focus-visible:stroke-white`} />
        <path
          d="M78 84 Q110 74 142 84 L168 100 Q176 106 172 122 L162 196 Q158 206 150 204 L146 158 L146 250 L138 392 Q137 402 126 402 L116 402 L114 262 L106 262 L104 402 L94 402 Q83 402 82 392 L74 250 L74 158 L70 204 Q62 206 58 196 L48 122 Q44 106 52 100 Z"
          className={`${outlineTone} ${skinSel ? '[stroke-width:5]' : '[stroke-width:3]'} ${highlighted.has('skin') ? 'stroke-cyan-400 [stroke-dasharray:6_3]' : ''} group-focus-visible:stroke-white`}
        />
      </g>

      {/* Bones and muscles: arms and legs. */}
      {part('musculoskeletal', (c) => (
        <>
          <rect x="44" y="104" width="22" height="92" rx="11" className={c} />
          <rect x="154" y="104" width="22" height="92" rx="11" className={c} />
          <rect x="80" y="262" width="26" height="124" rx="13" className={c} />
          <rect x="114" y="262" width="26" height="124" rx="13" className={c} />
        </>
      ))}

      {/* Lungs, then the heart in front of them. */}
      {part('lungs', (c) => (
        <>
          <ellipse cx="88" cy="132" rx="19" ry="32" className={c} />
          <ellipse cx="132" cy="132" rx="19" ry="32" className={c} />
        </>
      ))}
      {part('heart', (c) => <path d="M110 160 C90 144 94 122 110 134 C126 122 130 144 110 160 Z" className={c} />)}

      {/* Metabolism: the abdomen. */}
      {part('metabolism', (c) => <ellipse cx="110" cy="206" rx="30" ry="26" className={c} />)}

      {/* Immune system: lymph-node dots at the neck, armpits and groin, plus a shield beside the figure. */}
      {part('immune', (c) => (
        <>
          {[[98, 82], [122, 82], [72, 112], [148, 112], [100, 244], [120, 244]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="5" className={c} />)}
          <path d="M200 100 L222 108 L222 130 C222 146 212 154 200 160 C188 154 178 146 178 130 L178 108 Z" className={c} />
        </>
      ), names.immune)}

      {/* Brain inside the head, and the eyes. */}
      {part('brain', (c) => <ellipse cx="110" cy="34" rx="19" ry="12" className={c} />)}
      {part('eyes', (c) => (
        <>
          <ellipse cx="99" cy="54" rx="6" ry="4" className={c} />
          <ellipse cx="121" cy="54" rx="6" ry="4" className={c} />
        </>
      ))}
    </svg>
  );
}
