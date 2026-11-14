import { CircleHelp } from 'lucide-react';
import { useState } from 'react';
import { Button, Card } from '../components/Card.tsx';
import { redFlagSymptoms, symptoms as allSymptoms, thresholdFor } from '../data/index.ts';
import { UNIT_OF } from '../data/units.ts';
import { newId } from '../id.ts';
import { symptomTitle } from '../i18n-app.ts';
import { RED_FLAG_LABEL_AR, useT, type Key } from '../i18n.ts';
import { assessReading, overallStatus } from '../logic/status.ts';
import { useNav } from '../nav.ts';
import { useStore } from '../store.ts';
import type { IndicatorId, Reading, SymptomId } from '../types.ts';

// Tips for fields that have no thresholds yet (the first three come from the guide's own examples).
const FALLBACK_TIPS: Partial<Record<IndicatorId, string>> = {
  bp_sys: "Sit still for 5 minutes, feet flat, cuff on the bare upper arm at heart level, same arm each time, don't talk.",
  glucose: "Follow the meter's instructions, and note whether it was before or after a meal.",
  sleep: 'Hours actually asleep, not hours in the sleeping bag.',
  mood: 'How you feel overall today, 1 (very low) to 5 (very good).',
  water: 'Everything you drank today, in litres.',
  exercise: 'Minutes of exercise today.',
  meals: 'Meals eaten today, 0 to 3.',
  spo2: 'Read it from your own pulse oximeter, sitting still.',
};

const TIP_KEY: Partial<Record<IndicatorId, Key>> = { bp_sys: 'tipBp', glucose: 'tipGlucose', sleep: 'tipSleep', mood: 'tipMood', water: 'tipWater', exercise: 'tipExercise', meals: 'tipMeals', spo2: 'tipSpo2' };

function Tip({ indicator }: { indicator: IndicatorId }) {
  const [open, setOpen] = useState(false);
  const { lang, t } = useT();
  const key = TIP_KEY[indicator];
  const text = lang === 'ar' && key ? t(key) : (thresholdFor(indicator)?.howToMeasure ?? FALLBACK_TIPS[indicator]);
  if (!text) return null;
  return (
    <>
      <button type="button" aria-label={t('qlHowToMeasure')} aria-expanded={open} onClick={() => setOpen(!open)} className="rounded-full text-slate-400 hover:text-cyan-400 focus-visible:outline-2 focus-visible:outline-cyan-400">
        <CircleHelp aria-hidden size={18} />
      </button>
      {open && <p dir="auto" className="basis-full text-sm text-slate-300">{text}</p>}
    </>
  );
}

const inputClass = 'w-full rounded-lg border border-contrast/15 bg-space-950 px-3 py-2 text-base text-slate-100 tabular-nums focus-visible:outline-2 focus-visible:outline-cyan-400';

function Field({ label, indicator, children, error }: { label: string; indicator: IndicatorId; children: React.ReactNode; error?: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-base font-medium text-slate-200">{label}</span>
      <Tip indicator={indicator} />
      <div className="basis-full">{children}</div>
      {error && <p role="alert" className="basis-full text-sm text-act">{error}</p>}
    </div>
  );
}

/** A typed number, or null when empty. NaN when it is not a number. */
const num = (s: string): number | null => (s.trim() === '' ? null : Number(s));
const outside = (v: number | null, min: number, max: number, t: (k: Key, v?: Record<string, string | number>) => string) => (v !== null && (!Number.isFinite(v) || v < min || v > max) ? t('qlErrRange', { min, max }) : null);

const MOODS = ['😞', '😕', '😐', '🙂', '😄'];
const MOOD_KEYS = ['moodVeryLow', 'moodLow', 'moodOkay', 'moodGood', 'moodVeryGood'] as const;

export function QuickLog({ onDone }: { onDone: () => void }) {
  const crewId = useStore((s) => s.crewId);
  const missionDay = useStore((s) => s.missionDay);
  const station = useStore((s) => s.station);
  const lastCheck = useStore((s) => s.lastCheck);
  const { addReadings, addSymptoms, openEmergency, showStatusLight } = useStore.getState();
  const showEmergency = useNav((s) => s.showEmergency);
  const { lang, t } = useT();
  const ar = lang === 'ar';

  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');
  const [glucose, setGlucose] = useState('');
  const [sleep, setSleep] = useState<number | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [water, setWater] = useState('');
  const [exercise, setExercise] = useState('');
  const [meals, setMeals] = useState<number | null>(null);
  const [spo2, setSpo2] = useState('');
  const [chips, setChips] = useState<SymptomId[]>([]);

  const needsSpo2 = station?.hr_sensor === 'pulsesensor' && !lastCheck?.readings.some((r) => r.indicator === 'spo2');

  const sysNum = num(sys);
  const diaNum = num(dia);
  const bpRangeError = outside(sysNum, 60, 260, t) ?? outside(diaNum, 30, 160, t);
  const errors = {
    bp:
      (sysNum === null) !== (diaNum === null)
        ? t('qlErrBothBp')
        : bpRangeError ?? (sysNum !== null && diaNum !== null && sysNum <= diaNum ? t('qlErrSysDia') : null),
    glucose: outside(num(glucose), 20, 600, t),
    water: outside(num(water), 0, 10, t),
    exercise: outside(num(exercise), 0, 600, t),
    spo2: outside(num(spo2), 50, 100, t),
  };
  const invalid = Object.values(errors).some(Boolean);

  const save = () => {
    const time = new Date().toISOString();
    const make = (indicator: IndicatorId, value: number): Reading => ({
      id: newId(), crewId, time, missionDay, indicator, value, unit: UNIT_OF[indicator], source: 'logged', checkId: lastCheck?.checkId,
    });
    const out: Reading[] = [];
    if (sysNum !== null && diaNum !== null) out.push(make('bp_sys', sysNum), make('bp_dia', diaNum));
    if (num(glucose) !== null) out.push(make('glucose', num(glucose) as number));
    if (sleep !== null) out.push(make('sleep', sleep));
    if (mood !== null) out.push(make('mood', mood));
    if (num(water) !== null) out.push(make('water', Math.round((num(water) as number) * 1000)));
    if (num(exercise) !== null) out.push(make('exercise', num(exercise) as number));
    if (meals !== null) out.push(make('meals', meals));
    if (needsSpo2 && num(spo2) !== null) out.push(make('spo2', num(spo2) as number));
    if (out.length) {
      const history = useStore.getState().readings.filter((r) => r.crewId === crewId);
      const typedAssessments = out.flatMap((r) => {
        const th = thresholdFor(r.indicator);
        return th ? [assessReading({ indicator: r.indicator, value: r.value, missionDay }, history, th)] : [];
      });
      const combined = [...(lastCheck?.assessments ?? []), ...typedAssessments];
      if (combined.length) showStatusLight(overallStatus(combined));
      addReadings(out);
    }
    if (chips.length) addSymptoms(chips);
    onDone();
  };

  const toggle = (id: SymptomId) => setChips((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-base ${on ? 'border-cyan-400 bg-cyan-700/40 text-slate-50' : 'border-contrast/20 text-slate-200 hover:bg-contrast/10'} focus-visible:outline-2 focus-visible:outline-cyan-400`;
  const groups: { title: string; group: 'common' | 'immune' | 'eyes' }[] = [{ title: t('qlCommon'), group: 'common' }, { title: t('qlImmune'), group: 'immune' }, { title: t('qlEyes'), group: 'eyes' }];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <h1 className="text-[28px] font-semibold text-slate-50">{t('qlTitle')} <span className="text-base font-normal text-slate-400">{t('qlSub')}</span></h1>

      <Card>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t('qlBp')} indicator="bp_sys" error={errors.bp}>
            <div className="flex items-center gap-2">
              <input aria-label={t('qlSys')} inputMode="numeric" className={inputClass} placeholder="120" value={sys} onChange={(e) => setSys(e.target.value)} />
              <span aria-hidden className="text-slate-400">/</span>
              <input aria-label={t('qlDia')} inputMode="numeric" className={inputClass} placeholder="80" value={dia} onChange={(e) => setDia(e.target.value)} />
            </div>
          </Field>
          <Field label={t('qlGlucose')} indicator="glucose" error={errors.glucose}>
            <input aria-label={t('qlGlucoseAria')} inputMode="decimal" className={inputClass} placeholder="98" value={glucose} onChange={(e) => setGlucose(e.target.value)} />
          </Field>
          <Field label={t('qlSleep')} indicator="sleep">
            <div className="flex items-center gap-3">
              <Button variant="secondary" aria-label={t('qlLessSleep')} onClick={() => setSleep(Math.max(0, (sleep ?? 7) - 0.5))}>−</Button>
              <span className="min-w-16 text-center text-2xl font-semibold tabular-nums">{sleep === null ? '–' : sleep}</span>
              <Button variant="secondary" aria-label={t('qlMoreSleep')} onClick={() => setSleep(Math.min(16, (sleep ?? 7) + 0.5))}>+</Button>
            </div>
          </Field>
          <Field label={t('qlMood')} indicator="mood">
            <div className="flex gap-2" role="radiogroup" aria-label={t('qlMood')}>
              {MOODS.map((emoji, i) => (
                <button key={emoji} type="button" role="radio" aria-checked={mood === i + 1} aria-label={`${i + 1}, ${t(MOOD_KEYS[i])}`} onClick={() => setMood(i + 1)} className={`h-12 w-12 rounded-xl border text-2xl ${mood === i + 1 ? 'border-cyan-400 bg-cyan-700/40' : 'border-contrast/20 hover:bg-contrast/10'} focus-visible:outline-2 focus-visible:outline-cyan-400`}>
                  {emoji}
                </button>
              ))}
            </div>
          </Field>
          <Field label={t('qlWater')} indicator="water" error={errors.water}>
            <input aria-label={t('qlWaterAria')} inputMode="decimal" className={inputClass} placeholder="2" value={water} onChange={(e) => setWater(e.target.value)} />
          </Field>
          <Field label={t('qlExercise')} indicator="exercise" error={errors.exercise}>
            <input aria-label={t('qlExerciseAria')} inputMode="numeric" className={inputClass} placeholder="40" value={exercise} onChange={(e) => setExercise(e.target.value)} />
          </Field>
          <Field label={t('qlMeals')} indicator="meals">
            <div className="flex gap-2" role="radiogroup" aria-label={t('qlMealsAria')}>
              {[0, 1, 2, 3].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={meals === n} onClick={() => setMeals(n)} className={`h-12 w-12 rounded-xl border text-xl font-semibold ${meals === n ? 'border-cyan-400 bg-cyan-700/40' : 'border-contrast/20 hover:bg-contrast/10'} focus-visible:outline-2 focus-visible:outline-cyan-400`}>
                  {n}
                </button>
              ))}
            </div>
          </Field>
          {needsSpo2 && (
            <Field label={t('qlSpo2')} indicator="spo2" error={errors.spo2}>
              <input aria-label="SpO2" inputMode="numeric" className={inputClass} placeholder="97" value={spo2} onChange={(e) => setSpo2(e.target.value)} />
            </Field>
          )}
        </div>
      </Card>

      <Card title={t('qlHowFeel')}>
        <div className="flex flex-col gap-3">
          {groups.map(({ title, group }) => (
            <div key={group} className="flex flex-wrap items-center gap-2">
              <span className="w-20 text-base text-slate-400">{title}</span>
              {allSymptoms.filter((s) => s.group === group).map((s) => (
                <button key={s.id} type="button" aria-pressed={chips.includes(s.id)} onClick={() => toggle(s.id)} className={chip(chips.includes(s.id))}>{symptomTitle(s.id, s.label, ar)}</button>
              ))}
            </div>
          ))}
        </div>

        {/* Red flags: tapping one opens the Emergency page at once. What was typed above is kept (this screen stays mounted). */}
        <div className="mt-5 rounded-2xl border-2 border-act p-4">
          <p className="mb-3 text-lg font-semibold text-act">{t('qlNeedHelp')}</p>
          <div className="flex flex-wrap gap-2">
            {redFlagSymptoms.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  openEmergency('quicklog', [s.id]);
                  showEmergency();
                }}
                className="rounded-full border border-act px-3 py-1.5 text-base text-act hover:bg-act/20 focus-visible:outline-2 focus-visible:outline-act"
              >
                {ar ? (RED_FLAG_LABEL_AR[s.id] ?? s.label) : s.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onDone}>{t('qlSkip')}</Button>
        <Button disabled={invalid} onClick={save}>{t('qlSave')}</Button>
      </div>
    </div>
  );
}
