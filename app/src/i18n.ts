// Arabic and English for the whole app interface. Health content (guidance cards, body-system text, sources) stays in English
// until it has an Arabic clinical review. Arabic is shown right-to-left: App.tsx sets <html dir="rtl" lang="ar">.
import { APP_AR, APP_EN } from './i18n-app.ts';
import { useStore } from './store.ts';
import type { IndicatorId, Status, SymptomId } from './types.ts';

export type Lang = 'en' | 'ar';

const EN = {
  ...APP_EN,
  appName: 'Dalil',
  exitHome: 'Exit Home mode',
  unwell: 'I feel unwell now',
  switchLang: 'العربية',
  goodMorning: 'Good morning',
  goodAfternoon: 'Good afternoon',
  goodEvening: 'Good evening',
  startCheck: 'Start check',
  lastCheck: 'Your last check',
  noCheckYet: 'No check yet. Press the big button to start.',
  sendFamily: 'Send to family',
  tellFamily: 'Tell my family',
  sendFamilyAgain: 'Send to family again',
  sentFamilyAt: 'Sent to your family at {time} (simulated).',
  callNowIfUnwell: 'If you feel very unwell, call 999 now.',
  call999: 'Call 999',
  nothingMeasured: 'The check did not measure anything this time. Please try again.',
  done: 'Done',
  // check flow
  readyTitle: 'Ready for your check',
  stationConnected: 'The station is connected.',
  simConnected: 'The simulator is connected.',
  noStation: 'No station connected yet.',
  takesAbout: 'It takes about 30 seconds, in two steps.',
  stepFinger: 'Finger in the slot',
  stepFingerHint: 'About 20 seconds. Keep still.',
  stepForehead: 'Forehead at the window',
  stepForeheadHint: 'About 5 seconds, 5 cm away.',
  starting: 'Starting…',
  startSim: 'Start check (simulator)',
  step1: 'Step 1 of 2 · Finger',
  step2: 'Step 2 of 2 · Forehead',
  secondsLeft: 'seconds left',
  signalQuality: 'Signal quality',
  waitingStation: 'Waiting for the station…',
  keepStill: 'Keep still.',
  restFinger: 'Rest your fingertip in the slot.',
  holdForehead: 'Hold your forehead at the window, about 5 cm away.',
  cancel: 'Cancel',
  checkCancelled: 'Check cancelled',
  didntWork: "That didn't work",
  somethingWrong: 'Something went wrong. Please try again.',
  tryAgain: 'Try again',
  useSimulator: 'Use the simulator',
  connectStation: 'Connect station',
  reconnectStation: 'Reconnect station',
  serialUnsupported: 'Live checks need Chrome or Edge on a computer. You can still explore with the simulator.',
  connectOrSimHint: 'Connect the station, or turn on the simulator in Settings.',
  stationSilentTip: 'Station not answering. Re-upload the Dalil program to the board, check the cable, and click Connect again.',
  stationLostTip: 'The station was disconnected. Check the cable and reconnect.',
  lowConfidence: 'The signal was weak, so treat this result with caution and measure again.',
  // emergency (home)
  emergency: 'EMERGENCY',
  emergencyOpenBar: 'Emergency open',
  reportSentBar: 'report sent',
  reportNotSentBar: 'report not sent',
  returnToEmergency: 'Return to emergency page',
  updates: 'Updates',
  started: 'started',
  justNow: 'just now',
  minAgo: '{n} min ago',
  whatsHappening: "What's happening?",
  step1Home: '1 · Call 999 now.',
  step2Home: '2 · Notify family.',
  notifyFamily: 'Notify family',
  familyNotified: 'Family notified {time} (simulated)',
  step3: '3 · While you wait:',
  step4Home: "4 · Follow the emergency operator's instructions.",
  normalNoRuleOut: "Normal readings don't rule out a heart problem. Get help anyway.",
  measureNow: 'Measure now (optional)',
  measuring: 'Measuring… keep still',
  measurementAdded: 'Measurement added to the report.',
  backToApp: 'Back to app',
  safeNow: "I'm safe now…",
  whyClosing: 'Why are you closing this?',
  helpArrived: 'Help has arrived',
  feelBetter: 'I feel better',
  mistake: 'Opened by mistake',
  keepOpen: 'Keep it open',
  source: 'Source:',
};

export type Key = keyof typeof EN;

const AR: Record<Key, string> = {
  ...APP_AR,
  appName: 'دليل',
  exitHome: 'الخروج من الوضع المنزلي',
  unwell: 'أشعر بتوعك الآن',
  switchLang: 'English',
  goodMorning: 'صباح الخير',
  goodAfternoon: 'مساء الخير',
  goodEvening: 'مساء الخير',
  startCheck: 'ابدأ الفحص',
  lastCheck: 'آخر فحص لك',
  noCheckYet: 'لا يوجد فحص بعد. اضغط الزر الكبير للبدء.',
  sendFamily: 'أرسل إلى العائلة',
  tellFamily: 'أخبر عائلتي',
  sendFamilyAgain: 'أرسل إلى العائلة مرة أخرى',
  sentFamilyAt: 'تم الإرسال إلى عائلتك الساعة {time} (محاكاة).',
  callNowIfUnwell: 'إذا كنت تشعر بتوعك شديد، اتصل بالرقم 999 الآن.',
  call999: 'اتصل بـ 999',
  nothingMeasured: 'لم يقِس الفحص أي شيء هذه المرة. يرجى المحاولة مرة أخرى.',
  done: 'تم',
  readyTitle: 'جاهز للفحص',
  stationConnected: 'الجهاز متصل.',
  simConnected: 'جهاز المحاكاة متصل.',
  noStation: 'لا يوجد جهاز متصل بعد.',
  takesAbout: 'يستغرق الفحص حوالي 30 ثانية، على خطوتين.',
  stepFinger: 'ضع إصبعك في الفتحة',
  stepFingerHint: 'حوالي 20 ثانية. ابقَ ثابتًا.',
  stepForehead: 'قرّب جبهتك من النافذة',
  stepForeheadHint: 'حوالي 5 ثوانٍ، على بعد 5 سم.',
  starting: 'جارٍ البدء…',
  startSim: 'ابدأ الفحص (محاكاة)',
  step1: 'الخطوة 1 من 2 · الإصبع',
  step2: 'الخطوة 2 من 2 · الجبهة',
  secondsLeft: 'ثانية متبقية',
  signalQuality: 'جودة الإشارة',
  waitingStation: 'بانتظار الجهاز…',
  keepStill: 'ابقَ ثابتًا.',
  restFinger: 'ضع طرف إصبعك في الفتحة.',
  holdForehead: 'قرّب جبهتك من النافذة، على بعد حوالي 5 سم.',
  cancel: 'إلغاء',
  checkCancelled: 'تم إلغاء الفحص',
  didntWork: 'لم ينجح الفحص',
  somethingWrong: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
  tryAgain: 'حاول مرة أخرى',
  useSimulator: 'استخدم المحاكاة',
  connectStation: 'توصيل الجهاز',
  reconnectStation: 'إعادة توصيل الجهاز',
  serialUnsupported: 'تحتاج الفحوصات المباشرة إلى متصفح Chrome أو Edge على جهاز كمبيوتر. لا يزال بإمكانك التجربة باستخدام المحاكاة.',
  connectOrSimHint: 'وصّل الجهاز، أو فعّل المحاكاة من الإعدادات.',
  stationSilentTip: 'الجهاز لا يستجيب. أعد رفع برنامج دليل إلى اللوحة، وتحقق من الكابل، ثم اضغط توصيل مرة أخرى.',
  stationLostTip: 'تم فصل الجهاز. تحقق من الكابل وأعد التوصيل.',
  lowConfidence: 'كانت الإشارة ضعيفة، لذا تعامل مع هذه النتيجة بحذر وأعد القياس.',
  emergency: 'حالة طارئة',
  emergencyOpenBar: 'حالة طارئة مفتوحة',
  reportSentBar: 'تم إرسال التقرير',
  reportNotSentBar: 'لم يُرسل التقرير',
  returnToEmergency: 'العودة إلى صفحة الطوارئ',
  updates: 'التحديثات',
  started: 'بدأت',
  justNow: 'الآن',
  minAgo: 'قبل {n} دقيقة',
  whatsHappening: 'ماذا يحدث؟',
  step1Home: '1 · اتصل بالرقم 999 الآن.',
  step2Home: '2 · أبلغ العائلة.',
  notifyFamily: 'أبلغ العائلة',
  familyNotified: 'تم إبلاغ العائلة {time} (محاكاة)',
  step3: '3 · أثناء الانتظار:',
  step4Home: '4 · اتبع تعليمات موظف الطوارئ.',
  normalNoRuleOut: 'القراءات الطبيعية لا تستبعد وجود مشكلة في القلب. اطلب المساعدة على أي حال.',
  measureNow: 'قِس الآن (اختياري)',
  measuring: 'جارٍ القياس… ابقَ ثابتًا',
  measurementAdded: 'أُضيف القياس إلى التقرير.',
  backToApp: 'العودة إلى التطبيق',
  safeNow: 'أنا بأمان الآن…',
  whyClosing: 'لماذا تغلق هذه الصفحة؟',
  helpArrived: 'وصلت المساعدة',
  feelBetter: 'أشعر بتحسن',
  mistake: 'فُتحت بالخطأ',
  keepOpen: 'أبقِها مفتوحة',
  source: 'المصدر:',
};

export function translate(lang: Lang, key: Key, vars: Record<string, string | number> = {}): string {
  const text = (lang === 'ar' ? AR : EN)[key];
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
}

/** The active language. Arabic applies to the whole app, not only Home mode. */
export function activeLang(_homeMode: boolean, lang: Lang): Lang {
  return lang;
}

/** `t('startCheck')` in the language Home mode is using (English everywhere else). */
export function useT() {
  const lang = useStore((s) => activeLang(s.homeMode, s.lang));
  return { lang, t: (key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars) };
}

// ---------- plain-words results (logic/plain.ts in Arabic) ----------

const NAME_AR: Partial<Record<IndicatorId, string>> = {
  hr: 'نبض القلب',
  spo2: 'مستوى الأكسجين',
  temp: 'الحرارة',
  bp_sys: 'ضغط الدم',
  bp_dia: 'ضغط الدم',
  glucose: 'سكر الدم',
  sleep: 'النوم',
  mood: 'المزاج',
  water: 'شرب الماء',
  exercise: 'الرياضة',
  meals: 'الوجبات',
};

export function plainSentenceAr(indicator: IndicatorId, status: Status): string {
  const name = NAME_AR[indicator] ?? 'القراءة';
  if (status === 'ok') return `${name} طبيعي اليوم.`;
  if (status === 'watch') return `${name} مختلف قليلًا عن المعتاد.`;
  return `${name} يحتاج إلى انتباه. يرجى الاتصال بطبيبك.`;
}

export function plainHeadlineAr(overall: Status): string {
  if (overall === 'ok') return 'كل شيء على ما يرام اليوم.';
  if (overall === 'watch') return 'هناك شيء مختلف قليلًا عن المعتاد.';
  return 'يرجى الاتصال بطبيبك الآن.';
}

/** Status badge wording: avoids "Call surgeon" in Home mode and translates into Arabic when active. */
export function statusWord(status: Status, homeMode: boolean, lang: Lang): string {
  if (lang === 'ar') {
    return status === 'ok' ? 'طبيعي' : status === 'watch' ? 'للمتابعة' : homeMode ? 'اتصل بالطبيب' : 'اتصل بطبيب الرحلة';
  }
  if (homeMode) {
    return status === 'ok' ? 'OK' : status === 'watch' ? 'Watch' : 'Call doctor';
  }
  return status === 'ok' ? 'OK' : status === 'watch' ? 'Watch' : 'Call surgeon';
}

const STATION_ERROR_AR: Record<string, string> = {
  no_finger: 'لم يتم اكتشاف الإصبع. ضع طرف إصبعك في الفتحة وحاول مرة أخرى.',
  bad_signal: 'كانت الإشارة ضعيفة جدًا ولا يمكن الوثوق بها. دفّئ يدك، وابقَ ثابتًا، وحاول مرة أخرى.',
  cancelled: 'تم إلغاء الفحص.',
  no_sensors: 'لا يستطيع الجهاز العثور على المستشعرات. اطلب من المسؤول التحقق من الأسلاك.',
  no_reading: 'لم يقِس الجهاز أي شيء هذه المرة، لذا لا توجد نتيجة. ضع طرف إصبعك في الفتحة وحاول مرة أخرى.',
  stuck: 'توقف الجهاز عن الاستجابة. تحقق من الكابل، ثم حاول مرة أخرى أو استخدم المحاكاة.',
};

export function errorText(error: { code: string; text: string | null } | null, lang: Lang, fallback: string): string {
  if (!error) return fallback;
  if (lang === 'ar' && STATION_ERROR_AR[error.code]) return STATION_ERROR_AR[error.code];
  return error.text ?? fallback;
}

// ---------- red-flag labels and home emergency steps ----------

export const RED_FLAG_LABEL_AR: Partial<Record<SymptomId, string>> = {
  chest_pain: 'ألم أو ضغط في الصدر',
  breathing: 'صعوبة في التنفس',
  fainting: 'إغماء أو شعور بقرب الإغماء',
  severe_headache: 'صداع شديد ومفاجئ',
  confusion: 'ارتباك أو تشوش',
  stroke_signs: 'علامات جلطة (تدلي الوجه، ضعف الذراع، صعوبة الكلام)',
};

/** Arabic home steps: the same NHS-based steps as emergency.json, worded for home instead of a spacecraft. */
export const HOME_STEPS_AR = {
  general: [
    'اجلس أو استلقِ واسترح في وضعية مريحة.',
    'لا تبقَ وحدك: اطلب من أحد أن يبقى معك ويتأكد من أنك تستجيب وتتنفس.',
    'إذا وجدك أحد لا تستجيب ولا تتنفس، فعليه الاتصال بالرقم 999 والبدء بالإنعاش القلبي الرئوي.',
  ],
  bySymptom: {
    chest_pain: ['اجلس مع إسناد ظهرك وثني ركبتيك، وابقَ ثابتًا.'],
    fainting: ['إذا شعرت بالإغماء، استلقِ وارفع ساقيك، أو اجلس وأنزل رأسك بين ركبتيك.'],
    severe_headache: ['سجّل وقت بدء الصداع. أخبر الطبيب عن أي خدر أو ضعف أو ارتباك أو صعوبة في الكلام أو فقدان للرؤية.'],
    confusion: ['اطلب من أحد أن يبقى معك.'],
    stroke_signs: ['سجّل وقت ظهور العلامات. علامات الجلطة تحتاج إلى مساعدة طبية عاجلة حتى لو اختفت بعد وقت قصير.'],
  } as Partial<Record<SymptomId, string[]>>,
};
