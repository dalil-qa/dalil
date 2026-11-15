// Red-flag detection (APP_BUILD_GUIDE.md 12.5). Deliberately simple: a false alarm costs one click to
// close ("Opened by mistake"); a missed emergency costs far more. No AI is involved, ever.
//
// Two kinds of rule, both checked after the text is normalised (see `normalise`):
// 1. phrases: matched anywhere in the text ("passed out", "worst headache")
// 2. word pairs: a body word close to a problem word, in either order ("my chest hurts", "tightness in my chest")
import type { SymptomId } from '../types.ts';

type RedFlag = Extract<SymptomId, 'chest_pain' | 'breathing' | 'fainting' | 'severe_headache' | 'confusion' | 'stroke_signs'>;

/** Phrases, written the way `normalise` leaves them: no apostrophes, "can't" / "cannot" / "can not" are all "cant". */
export const RED_FLAG_PHRASES: Record<RedFlag, string[]> = {
  chest_pain: ['chest pain', 'heart attack', 'ألم في الصدر', 'ضغط في الصدر'],
  breathing: ['breathless', 'out of breath', 'gasping for air', 'cant get air', 'cant get enough air', 'suffocating', 'صعوبة في التنفس', 'ضيق في التنفس', 'لا أستطيع التنفس'],
  fainting: ['faint', 'fainted', 'fainting', 'passed out', 'blacked out', 'black out', 'lost consciousness', 'collapsed', 'إغماء', 'أغمي علي', 'أشعر بالإغماء'],
  severe_headache: ['worst headache', 'severe headache', 'sudden headache', 'thunderclap', 'صداع شديد'],
  // Plain "confused" is left out on purpose: "I am confused by this chart" is not an emergency.
  confusion: ['i feel confused', 'feeling confused', 'suddenly confused', 'very confused', 'cant think', 'disoriented', 'disorientated', 'dont know where i am', 'ارتباك شديد'],
  stroke_signs: ['face drooping', 'drooping face', 'droopy face', 'slurred', 'cant speak', 'cant talk', 'trouble speaking', 'cant move my arm', 'cant lift my arm', 'cant feel my arm', 'cant feel my face', 'numb on one side', 'تدلي الوجه', 'صعوبة الكلام'],
};

/** A body word within `PAIR_WINDOW` words of a problem word, in either order, means that red flag. */
const PAIR_WINDOW = 3;
const WORD_PAIRS: { flag: RedFlag; body: string[]; problem: string[] }[] = [
  {
    flag: 'chest_pain',
    body: ['chest'],
    problem: ['pain', 'painful', 'hurt', 'hurts', 'hurting', 'tight', 'tightness', 'pressure', 'squeezing', 'crushing', 'heavy', 'heaviness', 'ache', 'aching', 'burning'],
  },
  {
    flag: 'breathing',
    body: ['breathe', 'breathing', 'breath'],
    problem: ['cant', 'trouble', 'hard', 'difficult', 'difficulty', 'short', 'struggling', 'struggle', 'unable', 'problem', 'problems', 'gasping', 'stopped'],
  },
  {
    flag: 'severe_headache',
    body: ['headache'],
    problem: ['sudden', 'suddenly', 'worst', 'severe', 'excruciating', 'unbearable', 'exploding'],
  },
  {
    flag: 'stroke_signs',
    body: ['face', 'arm', 'side'],
    problem: ['numb', 'numbness', 'weak', 'weakness', 'drooping', 'droopy', 'droops', 'paralysed', 'paralyzed'],
  },
];

/**
 * Lower case, straight apostrophes then none at all ("can't" → "cant", "I'm" → "im"),
 * "cannot" / "can not" → "cant", punctuation → spaces, single spaces. Arabic letters are kept as they are.
 */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ`´']/g, '')
    .replace(/\bcan not\b|\bcannot\b/g, 'cant')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ARABIC = /[؀-ۿ]/;

/**
 * English phrases must match whole words ("faint" matches "I feel faint" but not "faintly visible").
 * Arabic phrases match anywhere, because Arabic joins small words onto the next one ("وصعوبة" = "and difficulty").
 */
function hasPhrase(t: string, phrase: string): boolean {
  if (ARABIC.test(phrase)) return t.includes(phrase);
  return ` ${t} `.includes(` ${phrase} `);
}

function hasPair(words: string[], body: string[], problem: string[]): boolean {
  for (let i = 0; i < words.length; i++) {
    if (!body.includes(words[i])) continue;
    for (let j = Math.max(0, i - PAIR_WINDOW); j <= Math.min(words.length - 1, i + PAIR_WINDOW); j++) {
      if (j !== i && problem.includes(words[j])) return true;
    }
  }
  return false;
}

/** Every red flag found in the text, in a fixed order. Empty when it looks fine. */
export function detectRedFlags(text: string): SymptomId[] {
  const t = normalise(text);
  if (!t) return [];
  const words = t.split(' ');
  return (Object.keys(RED_FLAG_PHRASES) as RedFlag[]).filter(
    (flag) =>
      RED_FLAG_PHRASES[flag].some((p) => hasPhrase(t, normalise(p))) ||
      WORD_PAIRS.some((rule) => rule.flag === flag && hasPair(words, rule.body, rule.problem)),
  );
}
