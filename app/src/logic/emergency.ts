// Red-flag detection (APP_BUILD_GUIDE.md 12.5). Deliberately simple: a false alarm costs one click to
// close ("Opened by mistake"); a missed emergency costs far more. No AI is involved, ever.
import type { SymptomId } from '../types.ts';

type RedFlag = Extract<SymptomId, 'chest_pain' | 'breathing' | 'fainting' | 'severe_headache' | 'confusion' | 'stroke_signs'>;

/** The starting list from the guide; Mechanical 2 can add more phrases. */
export const RED_FLAG_PHRASES: Record<RedFlag, string[]> = {
  chest_pain: ['chest pain', 'chest pressure', 'chest tight', 'pain in my chest', 'heart attack', 'ألم في الصدر', 'ضغط في الصدر'],
  breathing: ["can't breathe", 'cannot breathe', 'short of breath', 'hard to breathe', 'struggling to breathe', 'صعوبة في التنفس', 'ضيق في التنفس'],
  fainting: ['fainted', 'passed out', 'blacked out', 'about to faint', 'إغماء', 'أغمي علي'],
  severe_headache: ['worst headache', 'sudden severe headache', 'صداع شديد'],
  confusion: ['i feel confused', 'feeling confused', 'suddenly confused', 'very confused', "can't think", 'disoriented', 'ارتباك شديد'],
  stroke_signs: ['face drooping', 'arm weak', 'numb on one side', 'slurred speech', 'speech is slurred', "can't speak", 'تدلي الوجه', 'صعوبة الكلام'],
};

/** Typed text with curly apostrophes, odd spacing or capitals still matches. */
function normalise(text: string): string {
  return text.toLowerCase().replace(/[‘’ʼ`´]/g, "'").replace(/\s+/g, ' ').trim();
}

/** Every red flag whose phrase appears in the text. Empty when it looks fine. */
export function detectRedFlags(text: string): SymptomId[] {
  const t = normalise(text);
  return (Object.keys(RED_FLAG_PHRASES) as RedFlag[]).filter((flag) => RED_FLAG_PHRASES[flag].some((p) => t.includes(normalise(p))));
}
