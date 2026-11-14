// Shared types (APP_BUILD_GUIDE.md section 4). Everyone imports from here.
// Do not change without telling the others: the device contract is fixed (DEVICE_BUILD_GUIDE.md section 9).

// ---------- status ----------
export type Status = 'ok' | 'watch' | 'act';            // shown as ✓ OK · ! Watch · ✕ Call surgeon
export type Source = 'measured' | 'logged' | 'simulated' | 'sample';
// measured  = real station    📡
// logged    = typed by user   ✍️
// simulated = simulator       🧪 "Simulated"
// sample    = sample history  🧪 "Sample data"

export type IndicatorId =
  | 'hr' | 'spo2' | 'temp'                      // from the station
  | 'bp_sys' | 'bp_dia' | 'glucose'             // logged
  | 'sleep' | 'mood' | 'water' | 'exercise'     // logged
  | 'meals';                                    // logged: meals eaten today, 0–3

export type HazardId = 'radiation' | 'isolation' | 'distance' | 'gravity' | 'environment';
export type MissionId = 'iss' | 'moon' | 'rover' | 'mars';

// ---------- the one shape every number takes ----------
export interface Reading {
  id: string;              // crypto.randomUUID()
  crewId: string;          // 'c1' | 'c2' | 'c3' | 'guest'
  time: string;            // ISO date-time
  missionDay: number;      // day of the mission when it was taken
  indicator: IndicatorId;
  value: number;
  unit: string;            // 'bpm', '%', '°C', 'mmHg', 'mg/dL', 'h', '1-5', 'ml', 'min'
  source: Source;
  checkId?: string;        // readings from one station check share this
  quality?: number | null; // the station's q (0–1), station readings only
}

// ---------- symptoms ----------
export type SymptomId =
  // common
  | 'dizziness' | 'nausea' | 'headache' | 'back_pain' | 'fatigue'
  // immune
  | 'feverish' | 'rash' | 'cold_sores' | 'sore_throat'
  // eyes
  | 'vision'
  // RED FLAGS: open the Emergency page at once (section 10.11)
  | 'chest_pain' | 'breathing' | 'fainting' | 'severe_headache' | 'confusion' | 'stroke_signs';

export interface SymptomInfo {           // one entry per chip, in symptoms.json (M2)
  id: SymptomId;
  label: string;                         // 'Chest pain or pressure'
  group: 'common' | 'immune' | 'eyes' | 'redflag';
  system: BodySystem['id'];              // which body system it colours
  redFlag: boolean;                      // true = Emergency page, status act
  cardId: string | null;                 // its guidance card (not for red flags: they use emergency.json)
  source: { title: string; url: string };
}

export interface SymptomLog {
  crewId: string;
  time: string;
  missionDay: number;
  symptoms: SymptomId[];   // they pick symptom cards for the Coach and the Flight Surgeon report
}

// ---------- emergencies (section 10.11) ----------
export interface EmergencyEvent {
  id: string;
  crewId: string;
  startedAt: string;                     // ISO time the page opened
  missionDay: number;
  /** The mission it happened on, so its report still says so after the mission switch changes. */
  missionId?: MissionId;
  trigger: 'button' | 'quicklog' | 'coach';
  symptoms: SymptomId[];                 // red flags chosen (may be empty if only the button)
  latest: Assessment[];                  // the latest readings at that moment, for the report
  crewAlertedAt: string | null;
  reportSentAt: string | null;
  updates: { time: string; text: string }[];   // e.g. a check done while waiting
  closedAt: string | null;
  closedReason: 'help_arrived' | 'feel_better' | 'mistake' | null;
}

export interface EmergencyContent {      // emergency.json (M2), fixed text, no AI
  general: string[];                     // steps for any red flag
  bySymptom: Partial<Record<SymptomId, string[]>>;  // extra steps for one red flag
  sources: { title: string; url: string }[];
}

// ---------- what logic/status.ts returns ----------
export interface Assessment {
  indicator: IndicatorId;
  value: number;
  status: Status;
  reason: string;          // one plain sentence: why this status
  baseline: number | null; // null while still learning (fewer than 5 days)
}

// ---------- messages from the station (build guide §9.3), exactly ----------
export type StationMessage =
  | { stage: 'hello'; device: string; fw: string; proto: number;
      hr_sensor: 'max30102' | 'pulsesensor' | 'none';
      temp_sensor: 'mlx90614' | 'none'; oled: boolean }
  | { stage: 'idle' | 'finger' | 'forehead' | 'done';
      hr: number | null; spo2: number | null; temp: number | null;
      finger: boolean; q: number | null; left: number | null }
  | { stage: 'error';
      code: 'no_finger' | 'bad_signal' | 'cancelled' | 'no_sensors' | 'busy' | 'unknown_cmd';
      msg: string };

export type StationCommand = 'PING' | 'START' | 'STOP'
  | 'LED GREEN' | 'LED AMBER' | 'LED RED' | 'LED OFF';

// ---------- content files (section 5) ----------
export interface Range { min: number | null; max: number | null }   // null = no limit on that side

export interface Threshold {
  indicator: IndicatorId;
  unit: string;
  green: Range;            // inside = ok
  amber: Range;            // inside amber but outside green = watch; outside amber = act
  baseline: {
    band: number;          // how far from the 7-day normal counts as a change
    bandType: 'abs' | 'pct';
    days: number;          // for how many days in a row before it turns watch
    drift: number | null;  // how far the 7-day normal may move from the PRE-FLIGHT normal (12.1)
  } | null;
  howToMeasure: string;    // the "?" tip in the quick log, e.g. "Sit still 5 min, arm at heart level"
  source: { title: string; url: string };
}

export interface GuidanceCard {          // ROADMAP §10, unchanged
  id: string;
  indicator: IndicatorId | 'symptom';
  level: 'green' | 'amber' | 'red';
  title: string;
  meaning: string;
  actions: string[];
  escalate: boolean;
  sources: { title: string; url: string }[];
}

export interface BodySystem {            // answers NASA's 5 questions
  id: 'heart' | 'lungs' | 'brain' | 'metabolism' | 'skin' | 'musculoskeletal' | 'immune' | 'eyes';
  name: string;
  function: string;                      // "What it does": one plain sentence, shown first
  indicators: IndicatorId[];             // empty for systems coloured only by symptoms (immune, eyes)
  hazards: HazardId[];
  measureInSpace: string;                // Q1 what can be measured, and how, in space
  whyCheck: string;                      // Q2 why an exam is needed
  hazardEffects: string;                 // Q3 how the hazards affect it
  whenToAct: { crew: string; surgeon: string };   // Q4
  prevention: string[];                  // Q5
  sources: { title: string; url: string }[];
}

export interface Mission {
  id: MissionId;
  name: string;                          // 'Space Station', 'Moon base', 'Lunar rover', 'Mars transit'
  gravity: string;                       // 'Microgravity', '1/6 g'
  oneWayDelaySec: number;                // the value the app counts down
  delayLabel: string;                    // 'about 1.3 s', '3–22 min depending on distance'
  riskHighlights: HazardId[];            // hazards to emphasise in this environment
  radiationNote: string;
  sources: { title: string; url: string }[];
}

export interface CrewMember {
  id: 'c1' | 'c2' | 'c3' | 'guest';
  label: string;                         // 'Crew Member 2' (fictional, no real people)
  role: string;                          // 'Flight Engineer'
  color: string;                         // avatar colour
}
// Pre-flight normal: readings with missionDay <= 0 were taken on Earth before launch.
// No extra type is needed; logic/baseline.ts finds them by missionDay (12.1).
