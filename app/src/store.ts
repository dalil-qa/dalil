// The one shared store (APP_BUILD_GUIDE.md section 6). Screens read it; only actions change it.
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { thresholdFor } from './data/index.ts';
import { sampleReadings, sampleSymptoms } from './data/sample.ts';
import { STATION_ERROR_TEXT, type DeviceLink, type StationHello, type StationMeasure } from './device/link.ts';
import { SerialLink, isSerialSupported } from './device/serial.ts';
import { SimulatorLink, type SimScenario } from './device/simulator.ts';
import { assessReading, ledCommandFor, overallStatus } from './logic/status.ts';
import { LOW_QUALITY } from './logic/baseline.ts';
import { simulatorBaseline } from './logic/overview.ts';
import { clock } from './logic/summary.ts';
import { newId } from './id.ts';
import type { Lang } from './i18n.ts';
import type {
  Assessment,
  EmergencyEvent,
  IndicatorId,
  MissionId,
  Reading,
  Source,
  Status,
  StationMessage,
  SymptomId,
  SymptomLog,
} from './types.ts';

export type ConnectionState = 'none' | 'connecting' | 'connected' | 'lost';

/** What the Check screen shows while a check runs. */
export interface LiveCheck {
  stage: 'idle' | 'starting' | 'finger' | 'forehead' | 'done' | 'error';
  hr: number | null;
  spo2: number | null;
  temp: number | null;
  q: number | null;
  left: number | null;
  finger: boolean;
  /** Set when stage is 'error': the station's code and the friendly text (null = show nothing). */
  error: { code: string; text: string | null } | null;
}

/** The finished check: its readings and how each one was assessed. */
export interface CheckResult {
  checkId: string;
  time: string;
  readings: Reading[];
  assessments: Assessment[];
  overall: Status;
  /** Readings that were measured but have no thresholds yet, so they are not part of `overall`. */
  unassessed: IndicatorId[];
  /** The station's signal quality was below LOW_QUALITY: shown with a caution, and kept out of the baselines. */
  lowConfidence: boolean;
}

const IDLE_LIVE: LiveCheck = { stage: 'idle', hr: null, spo2: null, temp: null, q: null, left: null, finger: false, error: null };
const HELLO_TIMEOUT_MS = 5000;
/** No message from the station for this long during a check = it is stuck (cable fine, firmware not answering). */
export const CHECK_WATCHDOG_MS = 6000;
export const NO_READING_TEXT = "The station didn't measure anything this time, so there is no result. Rest your fingertip in the slot and try again.";
export const STUCK_TEXT = 'The station stopped responding. Check the cable, then try again or use the simulator.';

interface DalilState {
  // who and where
  crewId: string;
  missionId: MissionId;
  missionDay: number;
  // data
  readings: Reading[];
  symptoms: SymptomLog[];
  emergency: EmergencyEvent | null;
  emergencies: EmergencyEvent[];
  // the station
  connection: ConnectionState;
  connectError: string | null;
  station: StationHello | null;
  /** True when no `hello` came within 5 s: show "Station not answering" with the tips (7.4). */
  stationSilent: boolean;
  live: LiveCheck;
  lastCheck: CheckResult | null;
  // settings
  useSimulator: boolean;
  simScenario: SimScenario;
  homeMode: boolean;
  /** Home mode language (the space screens stay in English). */
  lang: Lang;

  // actions
  connectDevice: (kind: 'serial' | 'simulator', options?: { reuseGranted?: boolean }) => Promise<void>;
  disconnectDevice: () => Promise<void>;
  startCheck: () => boolean;
  stopCheck: () => void;
  /** Connects the simulator if needed, then starts a check. False if it could not connect. */
  startCheckWithSimulator: () => Promise<boolean>;
  /** Back to the Ready step: forget the live numbers and the last result. */
  resetLive: () => void;
  addReadings: (readings: Reading[]) => void;
  addSymptoms: (symptoms: SymptomId[]) => void;
  setCrew: (crewId: string) => void;
  /** Forget everything the guest did and go back to the demo crew member (the judge demo runs in guest mode). */
  endGuestSession: () => void;
  setMission: (missionId: MissionId) => void;
  setMissionDay: (day: number) => void;
  setSimScenario: (scenario: SimScenario) => void;
  setUseSimulator: (on: boolean) => void;
  setHomeMode: (on: boolean) => void;
  setLang: (lang: Lang) => void;
  /** Light the station for a status (used after typed readings). An open emergency keeps it red. */
  showStatusLight: (status: Status) => void;
  resetDemo: () => void;
  openEmergency: (trigger: EmergencyEvent['trigger'], symptoms: SymptomId[]) => void;
  alertCrew: () => void;
  sendEmergencyReport: () => void;
  addEmergencyUpdate: (text: string) => void;
  closeEmergency: (reason: NonNullable<EmergencyEvent['closedReason']>) => void;
}

// The link and its listeners live outside the store: they are not state, and must not be saved.
let link: DeviceLink | null = null;
let unsubscribe: (() => void)[] = [];
let helloTimer: ReturnType<typeof setTimeout> | null = null;
let checkTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * localStorage that never throws. In private windows, or with site data blocked, the browser's storage can be
 * missing or can throw; then the app keeps working and simply doesn't remember anything after a reload.
 */
const memory = new Map<string, string>();
const safeStorage: StateStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      memory.set(key, value);
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      memory.delete(key);
    }
  },
};

/** `?simspeed=10` in the address runs the simulator 10 times faster (for tests and demos). Normal speed otherwise. */
const simSpeed = (): number => {
  try {
    const n = Number(new URLSearchParams(location.search).get('simspeed'));
    return Number.isFinite(n) && n >= 1 ? Math.min(n, 50) : 1;
  } catch {
    return 1; // not in a browser
  }
};

const nowIso = () => new Date().toISOString();

/** The state minus anything the guest made. An open emergency is kept: it stays open until it is closed. */
const withoutGuest = (s: Pick<DalilState, 'readings' | 'symptoms' | 'emergencies'>) => ({
  readings: s.readings.filter((r) => r.crewId !== 'guest'),
  symptoms: s.symptoms.filter((l) => l.crewId !== 'guest'),
  emergencies: s.emergencies.filter((e) => e.crewId !== 'guest'),
});
/** Sample symptom logs use local times without a "Z"; real ones come from toISOString(), which ends in "Z". */
const isSampleLog = (l: SymptomLog): boolean => !l.time.endsWith('Z');
const UNITS: Record<'hr' | 'spo2' | 'temp', string> = { hr: 'bpm', spo2: '%', temp: '°C' };

export const useStore = create<DalilState>()(
  persist(
    (set, get) => {
      // ---------- the check watchdog ----------
      const clearWatchdog = (): void => {
        if (checkTimer) clearTimeout(checkTimer);
        checkTimer = null;
      };
      /** (Re)arm it: called on START and on every live message, so only silence trips it. */
      const armWatchdog = (): void => {
        clearWatchdog();
        checkTimer = setTimeout(() => {
          checkTimer = null;
          const stage = get().live.stage;
          if (stage !== 'starting' && stage !== 'finger' && stage !== 'forehead') return;
          link?.send('STOP');
          set({ live: { ...IDLE_LIVE, stage: 'error', error: { code: 'stuck', text: STUCK_TEXT } } });
        }, CHECK_WATCHDOG_MS);
      };

      /** Everything the station sends comes through here (APP_BUILD_GUIDE.md 7.3). */
      const handleMessage = (m: StationMessage): void => {
        // Any valid line proves the station is alive: don't stay stuck on "connecting" if its hello was missed.
        if (m.stage !== 'hello' && get().connection === 'connecting') {
          if (helloTimer) clearTimeout(helloTimer);
          const fallbackStation: StationHello = get().station ?? {
            stage: 'hello',
            device: 'dalil-station',
            fw: link?.kind === 'simulator' ? 'sim' : '1.0',
            proto: 1,
            hr_sensor: 'max30102',
            temp_sensor: 'mlx90614',
            oled: false,
          };
          set({ station: fallbackStation, connection: 'connected', stationSilent: false, connectError: null });
          link?.send('PING');
        }
        switch (m.stage) {
          case 'hello':
            if (helloTimer) clearTimeout(helloTimer);
            set({ station: m, connection: 'connected', stationSilent: false, connectError: null });
            return;
          case 'idle':
            return; // the station is waiting; nothing to show
          case 'finger':
          case 'forehead':
            armWatchdog(); // also covers a check started with the button on the box
            set({ live: { stage: m.stage, hr: m.hr, spo2: m.spo2, temp: m.temp, q: m.q, left: m.left, finger: m.finger, error: null } });
            return;
          case 'done':
            clearWatchdog();
            finishCheck(m);
            return;
          case 'error': {
            if (m.code === 'busy') return; // a check is already running; the watchdog covers a station that never starts
            const text = STATION_ERROR_TEXT[m.code] ?? null;
            if (m.code === 'unknown_cmd') {
              console.debug('Station did not understand a command:', m.msg);
              return;
            }
            clearWatchdog();
            set({ live: { ...IDLE_LIVE, stage: 'error', error: { code: m.code, text } } });
            return;
          }
        }
      };

      /** `done` is the result: turn it into readings, assess them, and send the light colour back. */
      const finishCheck = (m: StationMeasure): void => {
        const { crewId, missionDay, readings } = get();
        const source: Source = link?.kind === 'serial' ? 'measured' : 'simulated';
        const checkId = newId();
        const time = nowIso();
        const values: [keyof typeof UNITS, number | null][] = [['hr', m.hr], ['spo2', m.spo2], ['temp', m.temp]];

        // Nothing measured is not a result: never show (or light) green for a check that didn't happen.
        if (values.every(([, v]) => v === null)) {
          set({ lastCheck: null, live: { ...IDLE_LIVE, stage: 'error', error: { code: 'no_reading', text: NO_READING_TEXT } } });
          link?.send(get().emergency ? 'LED RED' : 'LED OFF');
          return;
        }

        const newReadings: Reading[] = [];
        for (const [indicator, value] of values) {
          if (value === null) continue; // skip the nulls: they were not measured
          newReadings.push({
            id: newId(),
            crewId,
            time,
            missionDay,
            indicator,
            value,
            unit: UNITS[indicator],
            source,
            checkId,
            quality: m.q,
          });
        }

        const history = readings.filter((r) => r.crewId === crewId);
        const assessments: Assessment[] = [];
        const unassessed: IndicatorId[] = [];
        for (const r of newReadings) {
          const threshold = thresholdFor(r.indicator);
          if (!threshold) {
            unassessed.push(r.indicator); // no thresholds for it yet (M2): say so rather than guess
            continue;
          }
          assessments.push(assessReading({ indicator: r.indicator, value: r.value, missionDay }, history, threshold));
        }

        const overall = overallStatus(assessments);
        const lowConfidence = m.q !== null && m.q < LOW_QUALITY;
        const result: CheckResult = { checkId, time, readings: newReadings, assessments, overall, unassessed, lowConfidence };
        const summary = newReadings.map((r) => `${r.indicator === 'spo2' ? 'SpO2' : r.indicator === 'temp' ? 'skin' : 'HR'} ${r.value} ${r.unit}`).join(', ');
        set((s) => ({
          readings: [...s.readings, ...newReadings],
          lastCheck: result,
          live: { stage: 'done', hr: m.hr, spo2: m.spo2, temp: m.temp, q: m.q, left: null, finger: false, error: null },
          // A check taken during an emergency is added to it as an update (and sent as a follow-up),
          // but only if it is the same person's emergency: a guest's check must not land in Crew Member 2's report.
          emergency:
            s.emergency && s.emergency.crewId === crewId
              ? { ...s.emergency, updates: [...s.emergency.updates, { time, text: `Update ${clock(time)}: ${summary}` }] }
              : s.emergency,
        }));
        // An open emergency keeps the light red.
        link?.send(get().emergency ? 'LED RED' : ledCommandFor(overall));
      };

      const abortRunningCheck = (): void => {
        clearWatchdog();
        const stage = get().live.stage;
        if (stage === 'starting' || stage === 'finger' || stage === 'forehead') link?.send('STOP');
      };

      const closeLink = async (): Promise<void> => {
        if (helloTimer) clearTimeout(helloTimer);
        helloTimer = null;
        clearWatchdog();
        for (const off of unsubscribe) off();
        unsubscribe = [];
        const old = link;
        link = null;
        await old?.disconnect();
      };

      return {
        // The pitch demo: Crew Member 2, Mars transit, Day 47 (the sample history ends on day 47).
        crewId: 'c2',
        missionId: 'mars',
        missionDay: 47,
        readings: sampleReadings(),
        symptoms: sampleSymptoms(),
        emergency: null,
        emergencies: [],
        connection: 'none',
        connectError: null,
        station: null,
        stationSilent: false,
        live: IDLE_LIVE,
        lastCheck: null,
        useSimulator: true,
        simScenario: 'normal',
        homeMode: false,
        lang: 'en',

        connectDevice: async (kind, options) => {
          await closeLink();
          set({ connection: 'connecting', connectError: null, station: null, stationSilent: false, live: IDLE_LIVE });
          const next: DeviceLink = kind === 'simulator' ? new SimulatorLink({ scenario: get().simScenario, intervalMs: 1000 / simSpeed() }) : new SerialLink();
          link = next;
          unsubscribe = [
            next.onMessage(handleMessage),
            next.onEvent((event) => {
              if (event === 'lost') {
                clearWatchdog();
                set({ connection: 'lost', live: IDLE_LIVE }); // a running check is discarded
              }
            }),
          ];
          try {
            if (next instanceof SerialLink) await next.connect({ reuseGranted: options?.reuseGranted });
            else await next.connect();
          } catch (err) {
            await closeLink();
            set({ connection: 'none', connectError: err instanceof Error ? err.message : 'Could not connect.' });
            return;
          }
          // The board may restart when the port opens. No hello after 5 s means it is not answering.
          helloTimer = setTimeout(() => {
            if (get().connection === 'connecting') set({ stationSilent: true });
          }, HELLO_TIMEOUT_MS);
        },

        disconnectDevice: async () => {
          await closeLink();
          set({ connection: 'none', station: null, stationSilent: false, live: IDLE_LIVE });
        },

        startCheck: () => {
          if (!link || get().connection !== 'connected') return false;
          set({ live: { ...IDLE_LIVE, stage: 'starting' }, lastCheck: null });
          // A simulated "Normal" check follows the selected crew member's own history.
          if (link instanceof SimulatorLink) link.setBaseline(simulatorBaseline(get().readings, get().crewId, get().missionDay));
          link.send('START');
          armWatchdog(); // a station that never answers START must not leave "Waiting for the station…" forever
          return true;
        },

        stopCheck: () => {
          clearWatchdog();
          link?.send('STOP');
          const stage = get().live.stage;
          if (stage === 'starting' || stage === 'finger' || stage === 'forehead') {
            set({ live: { ...IDLE_LIVE, stage: 'error', error: { code: 'cancelled', text: STATION_ERROR_TEXT.cancelled } } });
          }
        },

        startCheckWithSimulator: async () => {
          if (get().connection !== 'connected') {
            await get().connectDevice('simulator');
            const end = Date.now() + 3000;
            while (get().connection !== 'connected' && Date.now() < end) await new Promise((r) => setTimeout(r, 20));
          }
          return get().startCheck();
        },

        resetLive: () => {
          clearWatchdog();
          set({ live: IDLE_LIVE, lastCheck: null });
        },

        addReadings: (readings) => set((s) => ({ readings: [...s.readings, ...readings] })),

        addSymptoms: (symptoms) =>
          set((s) => ({
            symptoms: [...s.symptoms, { crewId: s.crewId, time: nowIso(), missionDay: s.missionDay, symptoms }],
          })),

        showStatusLight: (status) => {
          link?.send(get().emergency ? 'LED RED' : ledCommandFor(status));
        },

        // Starting a guest session always starts empty, so one visitor never sees the previous visitor's values.
        setCrew: (crewId) => {
          abortRunningCheck();
          set((s) => ({
            crewId,
            lastCheck: null,
            live: IDLE_LIVE,
            ...(crewId === 'guest' ? withoutGuest(s) : {}),
          }));
        },

        endGuestSession: () => {
          abortRunningCheck();
          set((s) => ({ ...withoutGuest(s), crewId: s.crewId === 'guest' ? 'c2' : s.crewId, lastCheck: null, live: IDLE_LIVE }));
        },
        setMission: (missionId) => set({ missionId }),
        setMissionDay: (day) => set({ missionDay: Math.trunc(day) }),

        setSimScenario: (scenario) => {
          if (link instanceof SimulatorLink) link.setScenario(scenario);
          set({ simScenario: scenario });
        },
        setUseSimulator: (on) => set({ useSimulator: on }),
        setHomeMode: (on) => set({ homeMode: on }),
        setLang: (lang) => set({ lang }),

        resetDemo: () => {
          abortRunningCheck();
          set({ readings: sampleReadings(), symptoms: sampleSymptoms(), emergency: null, emergencies: [], lastCheck: null, live: IDLE_LIVE });
          useStore.persist.clearStorage();
        },

        openEmergency: (trigger, symptoms) => {
          const { emergency, crewId, missionDay, missionId, lastCheck } = get();
          if (emergency && emergency.crewId === crewId) {
            // A second emergency while one is open only adds the new red flags as an update.
            const added = symptoms.filter((s) => !emergency.symptoms.includes(s));
            if (added.length === 0) return;
            set({
              emergency: {
                ...emergency,
                symptoms: [...emergency.symptoms, ...added],
                updates: [...emergency.updates, { time: nowIso(), text: `New red flags: ${added.join(', ')}` }],
              },
            });
            return;
          }
          // Someone else's emergency is still open (e.g. a guest's, then the crew switch changed): never lose it.
          // It moves to the history with a note, so its report still shows on the Earth screen.
          if (emergency) {
            const time = nowIso();
            const archived: EmergencyEvent = {
              ...emergency,
              closedAt: time,
              updates: [...emergency.updates, { time, text: `Moved to history ${clock(time)}: a new emergency was opened for another person` }],
            };
            set((s) => ({ emergencies: [...s.emergencies, archived] }));
          }
          set({
            emergency: {
              id: newId(),
              crewId,
              startedAt: nowIso(),
              missionDay,
              missionId,
              trigger,
              symptoms,
              latest: lastCheck?.assessments ?? [],
              crewAlertedAt: null,
              reportSentAt: nowIso(), // sent automatically the moment it opens (10.11); steps 1 and 2 never wait
              updates: [],
              closedAt: null,
              closedReason: null,
            },
          });
          link?.send('LED RED');
        },

        alertCrew: () =>
          set((s) => (s.emergency && !s.emergency.crewAlertedAt ? { emergency: { ...s.emergency, crewAlertedAt: nowIso() } } : s)),

        sendEmergencyReport: () =>
          set((s) => {
            if (!s.emergency) return s;
            const time = nowIso();
            return { emergency: { ...s.emergency, reportSentAt: time, updates: [...s.emergency.updates, { time, text: `Report sent again ${clock(time)}` }] } };
          }),

        addEmergencyUpdate: (text) =>
          set((s) => (s.emergency ? { emergency: { ...s.emergency, updates: [...s.emergency.updates, { time: nowIso(), text }] } } : s)),

        closeEmergency: (reason) => {
          const { emergency, lastCheck } = get();
          if (!emergency) return;
          const closed: EmergencyEvent = { ...emergency, closedAt: nowIso(), closedReason: reason };
          set((s) => ({ emergency: null, emergencies: [...s.emergencies, closed] }));
          link?.send(lastCheck ? ledCommandFor(lastCheck.overall) : 'LED OFF');
        },
      };
    },
    {
      name: 'dalil-v1',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      // Save only what the person made: real and typed readings, symptom logs, emergencies.
      // Sample history and simulator readings load fresh. Guest data is never saved,
      // except that an open emergency stays open until it is closed, even for a guest.
      // On load, the saved readings and logs are added to a fresh copy of the sample history.
      merge: (saved, current) => {
        const p = (saved ?? {}) as Partial<DalilState>;
        const savedReadings = p.readings ?? [];
        return {
          ...current,
          ...p,
          readings: [...current.readings.filter((r) => r.source === 'sample'), ...savedReadings],
          symptoms: [...current.symptoms.filter(isSampleLog), ...(p.symptoms ?? [])],
          // The demo opens on day 47, but real readings saved on later days (Settings → Next day) must not
          // vanish after a reload: screens only show readings up to the current mission day.
          missionDay: savedReadings.reduce((max, r) => (Number.isFinite(r.missionDay) && r.missionDay > max ? r.missionDay : max), current.missionDay),
        };
      },
      partialize: (s) => ({
        readings: s.readings.filter((r) => (r.source === 'measured' || r.source === 'logged') && r.crewId !== 'guest'),
        symptoms: s.symptoms.filter((l) => l.crewId !== 'guest' && !isSampleLog(l)),
        emergency: s.emergency,
        emergencies: s.emergencies.filter((e) => e.crewId !== 'guest'),
        lang: s.lang,
      }),
    },
  ),
);

/** On page load: reopen a station the user already allowed, with no popup (APP_BUILD_GUIDE.md 7.1). */
export async function autoReconnectStation(): Promise<void> {
  if (!isSerialSupported()) return;
  try {
    if ((await navigator.serial.getPorts()).length > 0) await useStore.getState().connectDevice('serial', { reuseGranted: true });
  } catch {
    // Not allowed before, or the port is busy: the Connect button is still there.
  }
}
