import type { KeyboardEvent, ReactNode } from 'react';
import { statusWord, useT } from '../i18n.ts';
import type { BodySystem, Status } from '../types.ts';

// Our own figure (APP_BUILD_GUIDE.md 10.4): no downloaded art, so no licence questions.
// Laid out like an anatomy chart: a neutral body in the middle, organs coloured by status, and a label for each
// system at the side, joined to its organ by a thin line. Each system (organ + line + label) is ONE <g> that is a
// real button: clickable anywhere on it, focusable with Tab, opens with Enter or Space.
// Every colour comes from the theme tokens in index.css, so it works in light and dark mode.

type Id = BodySystem['id'];
type Tone = Status | 'none';

const TONE: Record<Tone, { soft: string; stroke: string; text: string; word: string; glyph: string; effect: string }> = {
  ok: { soft: 'fill-ok/25', stroke: 'stroke-ok', text: 'fill-ok', word: 'OK', glyph: '✓', effect: '' },
  watch: { soft: 'fill-watch/30', stroke: 'stroke-watch', text: 'fill-watch', word: 'Watch', glyph: '!', effect: '[filter:drop-shadow(0_0_5px_var(--color-watch))]' },
  act: {
    soft: 'fill-act/35',
    stroke: 'stroke-act',
    text: 'fill-act',
    word: 'Call surgeon',
    glyph: '✕',
    // A slow pulse for "Call surgeon"; switched off when the system asks for reduced motion.
    effect: 'animate-pulse motion-reduce:animate-none [filter:drop-shadow(0_0_7px_var(--color-act))]',
  },
  none: { soft: 'fill-contrast/10', stroke: 'stroke-slate-500', text: 'fill-slate-400', word: 'No range yet', glyph: '–', effect: '' },
};

// Where each label sits, and the point on the organ its line starts from (viewBox 420 × 452, body centred on x = 210).
const LABEL: Record<Id, { side: 'left' | 'right'; y: number; anchor: [number, number] }> = {
  brain: { side: 'left', y: 44, anchor: [194, 46] },
  eyes: { side: 'right', y: 52, anchor: [224, 68] },
  lungs: { side: 'left', y: 136, anchor: [183, 142] },
  immune: { side: 'right', y: 118, anchor: [244, 142] },
  heart: { side: 'right', y: 184, anchor: [212, 156] },
  metabolism: { side: 'left', y: 216, anchor: [194, 212] },
  skin: { side: 'right', y: 264, anchor: [247, 262] },
  musculoskeletal: { side: 'left', y: 320, anchor: [190, 320] },
};

const PILL_W = 128;
const PILL_H = 46;
const pillX = (side: 'left' | 'right') => (side === 'left' ? 4 : 420 - 4 - PILL_W);

// The body outline: drawn as the left half and mirrored, so it is exactly symmetrical.
const SILHOUETTE =
  'M 199 82 L 198 94 C 190 99 173 99 163 107 C 155 113 152 125 152 140 L 147 196 L 141 248 C 138 260 141 274 150 275 C 158 275 160 264 158 250 L 164 198 L 172 148 C 174 178 180 200 180 222 C 180 236 172 248 172 264 L 176 352 L 181 422 C 181 430 174 436 175 442 L 203 442 C 205 436 203 430 202 422 L 204 352 L 206 294 Q 210 286 214 294 L 216 352 L 218 422 C 217 430 215 436 217 442 L 245 442 C 246 436 239 430 239 422 L 244 352 L 248 264 C 248 248 240 236 240 222 C 240 200 246 178 248 148 L 256 198 L 262 250 C 260 264 262 275 270 275 C 279 274 282 260 279 248 L 273 196 L 268 140 C 268 125 265 113 257 107 C 247 99 230 99 222 94 L 221 82 Z';

// Bones as lines (upper arm, forearm, thigh, shin on each side) with joints at the elbows and knees.
const BONES: [number, number, number, number][] = [
  [158, 116, 152, 192], [152, 202, 148, 246], [190, 272, 190, 346], [191, 358, 192, 418],
  [262, 116, 268, 192], [268, 202, 272, 246], [230, 272, 230, 346], [229, 358, 228, 418],
];
const JOINTS: [number, number][] = [[151, 197], [269, 197], [190, 352], [230, 352]];
// Lymph nodes: neck, armpits, groin.
const LYMPH: [number, number][] = [[199, 98], [221, 98], [176, 142], [244, 142], [198, 278], [222, 278]];

interface Props {
  statuses: Record<Id, Status | null>;
  names: Record<Id, string>;
  selected: Id;
  highlighted: Set<Id>;
  onSelect: (id: Id) => void;
}

export function BodyFigure({ statuses, names, selected, highlighted, onSelect }: Props) {
  const { lang, t } = useT();
  const ar = lang === 'ar';
  // Status words: the full one for screen readers; the short one in the small labels (Arabic "Call surgeon" is long).
  const stateText = (s: Status | null) => (s ? statusWord(s, false, lang) : t('noRangeYet'));
  const pillWord = (s: Status | null) => (s ? statusWord(s, ar, lang) : t('noRangeYet'));
  /** One system: its organ shapes, the line to its label, and the label. All of it is one button. */
  const system = (id: Id, organ: (tone: (typeof TONE)[Tone], isSel: boolean) => ReactNode) => {
    const status = statuses[id];
    const tone = TONE[status ?? 'none'];
    const isSel = selected === id;
    const hot = highlighted.has(id);
    const { side, y, anchor } = LABEL[id];
    const short = t(`fig_${id}` as 'fig_heart');
    const x = pillX(side);
    const lineEnd = side === 'left' ? x + PILL_W : x;
    // Arabic reads right to left: its text starts at the right edge of the label, and the shield moves to the right.
    const inset = id === 'immune' ? 34 : 14;
    const textX = ar ? x + PILL_W - inset : x + inset;
    const shieldX = ar ? x + PILL_W - 20 : x + 20;
    return (
      <g
        key={id}
        role="button"
        tabIndex={0}
        aria-label={`${names[id]}: ${stateText(status)}`}
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
        {/* The organ. Others fade a little so the chosen one stands out. */}
        <g className={`transition-opacity ${isSel ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'} ${tone.effect}`}>{organ(tone, isSel)}</g>

        {/* The line from the organ to its label. */}
        <line x1={anchor[0]} y1={anchor[1]} x2={lineEnd} y2={y} className={`${isSel ? tone.stroke : 'stroke-slate-500'} [stroke-width:1.25]`} />
        <circle cx={anchor[0]} cy={anchor[1]} r={2.5} className={isSel ? tone.text : 'fill-slate-500'} />

        {/* Hazards: a dashed ring round the label of every system they affect. */}
        {hot && <rect x={x - 4} y={y - PILL_H / 2 - 4} width={PILL_W + 8} height={PILL_H + 8} rx={15} className="fill-none stroke-cyan-400 [stroke-dasharray:5_4] [stroke-width:1.5]" />}

        {/* The label. */}
        <rect
          x={x}
          y={y - PILL_H / 2}
          width={PILL_W}
          height={PILL_H}
          rx={12}
          className={`${isSel ? `${tone.soft} [stroke-width:3]` : 'fill-space-900 group-hover:fill-contrast/5 [stroke-width:1.5]'} ${tone.stroke} group-focus-visible:stroke-contrast group-focus-visible:[stroke-width:3.5]`}
        />
        {id === 'immune' && (
          // A small shield: the immune system's badge.
          <path d={`M ${shieldX} ${y - 11} l 9 3.5 v 7 c 0 6 -4 9.5 -9 12 c -5 -2.5 -9 -6 -9 -12 v -7 z`} className={`${tone.soft} ${tone.stroke} [stroke-width:1.5]`} />
        )}
        <text x={textX} y={y - 4} fontSize={15} fontWeight={600} className="fill-slate-100">{short}</text>
        <text x={textX} y={y + 15} fontSize={14} fontWeight={500} className={tone.text}>{tone.glyph} {status ? pillWord(status) : t('noRangeYet')}</text>
      </g>
    );
  };

  const organStroke = (tone: (typeof TONE)[Tone], isSel: boolean) => `${tone.soft} ${tone.stroke} ${isSel ? '[stroke-width:2.5]' : '[stroke-width:1.5]'}`;
  const skin = TONE[statuses.skin ?? 'none'];

  return (
    <svg viewBox="0 0 420 452" className="mx-auto h-auto w-full max-w-[440px]" role="group" aria-label={t('bodyFigureLabel')}>
      {/* Skin and temperature: the whole body. Its status shows as a soft glow round the outline, not as a fill,
          so a green skin doesn't make the whole body look "OK". */}
      {system('skin', (_tone, isSel) => (
        <>
          <path d={SILHOUETTE} className={`fill-none ${skin.stroke} opacity-35 [stroke-width:9] [stroke-linejoin:round]`} />
          <ellipse cx={210} cy={56} rx={25} ry={28} className={`fill-none ${skin.stroke} opacity-35 [stroke-width:9]`} />
          <path d={SILHOUETTE} className={`fill-space-800 ${isSel ? `${skin.stroke} [stroke-width:2.5]` : 'stroke-slate-400 [stroke-width:1.5]'} [stroke-linejoin:round]`} />
          <ellipse cx={210} cy={56} rx={25} ry={28} className={`fill-space-800 ${isSel ? `${skin.stroke} [stroke-width:2.5]` : 'stroke-slate-400 [stroke-width:1.5]'}`} />
        </>
      ))}

      {system('brain', (tone, isSel) => (
        <>
          <path d="M 194 52 C 192 40 202 32 210 34 C 218 32 228 40 226 52 C 227 58 220 62 210 61 C 200 62 193 58 194 52 Z" className={organStroke(tone, isSel)} />
          <path d="M 210 36 C 207 44 213 50 210 59" className={`fill-none ${tone.stroke} [stroke-width:1.25]`} />
        </>
      ))}

      {system('eyes', (tone, isSel) => (
        <>
          <ellipse cx={201} cy={68} rx={5.5} ry={3.2} className={organStroke(tone, isSel)} />
          <ellipse cx={219} cy={68} rx={5.5} ry={3.2} className={organStroke(tone, isSel)} />
        </>
      ))}

      {system('lungs', (tone, isSel) => (
        <>
          <path d="M 204 116 C 196 112 184 118 182 132 C 179 148 178 164 182 174 C 186 180 198 178 204 172 Z" className={organStroke(tone, isSel)} />
          <path d="M 216 116 C 224 112 236 118 238 132 C 241 148 242 164 238 174 C 234 180 222 178 216 172 Z" className={organStroke(tone, isSel)} />
        </>
      ))}

      {system('heart', (tone, isSel) => (
        <path d="M 207 166 C 192 156 191 141 200 139 C 204 138 207 141 207 144 C 207 141 210 138 214 139 C 223 141 222 156 207 166 Z" className={organStroke(tone, isSel)} />
      ))}

      {system('metabolism', (tone, isSel) => (
        <path d="M 196 196 C 190 204 192 222 206 226 C 218 230 230 222 228 208 C 227 200 220 198 214 202 C 210 205 206 200 206 194 C 206 190 199 190 196 196 Z" className={organStroke(tone, isSel)} />
      ))}

      {system('musculoskeletal', (tone, isSel) => (
        <>
          {BONES.map(([x1, y1, x2, y2]) => (
            <g key={`${x1}-${y1}`}>
              {/* A wide invisible line makes the thin bone easy to click. */}
              <line x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-transparent [stroke-width:14]" />
              <line x1={x1} y1={y1} x2={x2} y2={y2} className={`${tone.stroke} ${isSel ? '[stroke-width:6]' : '[stroke-width:4.5]'} [stroke-linecap:round] opacity-80`} />
            </g>
          ))}
          {JOINTS.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={4} className={organStroke(tone, isSel)} />)}
        </>
      ))}

      {system('immune', (tone, isSel) => (
        <>{LYMPH.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={4} className={organStroke(tone, isSel)} />)}</>
      ))}
    </svg>
  );
}
