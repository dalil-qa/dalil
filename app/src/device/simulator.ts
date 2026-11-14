// The station's twin (APP_BUILD_GUIDE.md section 8). Sends exactly the same messages as the real
// station (DEVICE_BUILD_GUIDE.md 9.3), so every screen can be built and demoed without hardware.
import type { StationCommand, StationMessage } from '../types.ts';
import { Emitter, type DeviceLink, type LinkEvent } from './link.ts';

export type SimScenario = 'normal' | 'watch' | 'act' | 'bad_signal' | 'no_finger' | 'pulse_sensor';

export const SIM_SCENARIOS: { id: SimScenario; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'watch', label: 'Watch (heart rate about 12 above normal)' },
  { id: 'act', label: 'Act (SpO2 about 88 %)' },
  { id: 'bad_signal', label: 'Bad signal' },
  { id: 'no_finger', label: 'No finger' },
  { id: 'pulse_sensor', label: 'Pulse Sensor (no SpO2)' },
];

export interface SimOptions {
  scenario?: SimScenario;
  /** The crew member's normal values, which the scenarios are built around. */
  baseline?: { hr: number; spo2: number; temp: number };
  /** Milliseconds between lines. The real station sends one a second. Tests use a small number. */
  intervalMs?: number;
  /** For repeatable tests. Must return a number in [0, 1). */
  random?: () => number;
}

const FINGER_STEPS = 20; // seconds with a finger on the sensor
const FINGER_NULL_STEPS = 5; // hr and spo2 stay null for the first 5
const FOREHEAD_STEPS = 5;
const NO_FINGER_STEPS = 15;

type Phase = { name: 'idle' } | { name: 'finger'; step: number } | { name: 'forehead'; step: number };

export class SimulatorLink implements DeviceLink {
  readonly kind = 'simulator' as const;
  scenario: SimScenario;

  private baseline: { hr: number; spo2: number; temp: number };
  private intervalMs: number;
  private random: () => number;
  private messages = new Emitter<StationMessage>();
  private events = new Emitter<LinkEvent>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private phase: Phase = { name: 'idle' };

  // The numbers shown during the current check.
  private hr: number | null = null;
  private spo2: number | null = null;
  private temp: number | null = null;
  private q: number | null = null;

  constructor(options: SimOptions = {}) {
    this.scenario = options.scenario ?? 'normal';
    this.baseline = options.baseline ?? { hr: 65, spo2: 98, temp: 34.5 };
    this.intervalMs = options.intervalMs ?? 1000;
    this.random = options.random ?? Math.random;
  }

  async connect(): Promise<void> {
    if (this.timer) return;
    this.phase = { name: 'idle' };
    this.timer = setInterval(() => this.tick(), this.intervalMs);
    // The real board says hello at start-up. Deliver it after the caller has subscribed.
    queueMicrotask(() => this.sendHello());
  }

  async disconnect(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.phase = { name: 'idle' };
  }

  setScenario(scenario: SimScenario): void {
    this.scenario = scenario;
  }

  /** Build the next check around this crew member's normal values. */
  setBaseline(baseline: { hr: number; spo2: number; temp: number }): void {
    this.baseline = baseline;
  }

  onMessage(callback: (message: StationMessage) => void): () => void {
    return this.messages.on(callback);
  }

  onEvent(callback: (event: LinkEvent) => void): () => void {
    return this.events.on(callback);
  }

  send(command: StationCommand): void {
    if (!this.timer) return;
    const word = command.trim().toUpperCase();
    if (word === 'PING') return this.sendHello();
    if (word === 'START') {
      if (this.phase.name !== 'idle') return this.emitError('busy', 'A check is already running');
      this.beginCheck();
      return;
    }
    if (word === 'STOP') {
      if (this.phase.name === 'idle') return;
      this.phase = { name: 'idle' };
      return this.emitError('cancelled', 'Check cancelled');
    }
    if (word.startsWith('LED ')) return; // accepted silently
    this.emitError('unknown_cmd', 'Unknown command');
  }

  // ---------- internals ----------

  private sendHello(): void {
    this.messages.emit({
      stage: 'hello',
      device: 'dalil-station',
      fw: 'sim',
      proto: 1,
      hr_sensor: this.scenario === 'pulse_sensor' ? 'pulsesensor' : 'max30102',
      temp_sensor: 'mlx90614',
      oled: true,
    });
  }

  private emitError(code: 'no_finger' | 'bad_signal' | 'cancelled' | 'no_sensors' | 'busy' | 'unknown_cmd', msg: string): void {
    this.messages.emit({ stage: 'error', code, msg });
  }

  private jitter(amount: number): number {
    return (this.random() - 0.5) * 2 * amount;
  }

  private beginCheck(): void {
    // Fix this check's numbers up front so the lines are steady, with small jitter on top.
    const { hr, spo2, temp } = this.baseline;
    this.hr = null;
    this.spo2 = null;
    this.temp = null;
    this.q = null;
    this.phase = { name: 'finger', step: 0 };
    this.targets = {
      // "Watch" is clearly above the 8 bpm band even with the +-2 jitter (10 to 14 above normal), so it is amber every time.
      hr: this.scenario === 'watch' ? hr + 12 : hr,
      // Clearly below any amber line (about 90 %), so "Act" is red every time, not only when the jitter allows it.
      spo2: this.scenario === 'act' ? 88 : spo2,
      temp,
    };
  }

  private targets = { hr: 65, spo2: 98, temp: 34.5 };

  private tick(): void {
    const phase = this.phase;
    if (phase.name === 'idle') {
      this.messages.emit({ stage: 'idle', hr: null, spo2: null, temp: null, finger: false, q: null, left: null });
      return;
    }
    if (phase.name === 'finger') return this.tickFinger(phase.step);
    this.tickForehead(phase.step);
  }

  private tickFinger(step: number): void {
    if (this.scenario === 'no_finger') {
      if (step >= NO_FINGER_STEPS) {
        this.phase = { name: 'idle' };
        return this.emitError('no_finger', 'No finger detected');
      }
      this.messages.emit({ stage: 'finger', hr: null, spo2: null, temp: null, finger: false, q: null, left: null });
      this.phase = { name: 'finger', step: step + 1 };
      return;
    }

    if (step >= FINGER_STEPS) {
      if (this.scenario === 'bad_signal') {
        this.phase = { name: 'idle' };
        return this.emitError('bad_signal', 'Signal too weak');
      }
      this.phase = { name: 'forehead', step: 0 };
      return this.tickForehead(0);
    }

    if (step >= FINGER_NULL_STEPS) {
      this.hr = Math.round(this.targets.hr + this.jitter(2));
      this.spo2 = this.scenario === 'pulse_sensor' ? null : Math.min(100, Math.round(this.targets.spo2 + this.jitter(1)));
      this.q = Math.round((0.8 + this.random() * 0.15) * 100) / 100;
    }
    // A weak signal in the "bad signal" scenario never produces numbers worth trusting.
    const weak = this.scenario === 'bad_signal';
    this.messages.emit({
      stage: 'finger',
      hr: weak ? null : this.hr,
      spo2: weak ? null : this.spo2,
      temp: null,
      finger: true,
      q: weak ? 0.2 : this.q,
      left: FINGER_STEPS - step,
    });
    this.phase = { name: 'finger', step: step + 1 };
  }

  private tickForehead(step: number): void {
    if (step >= FOREHEAD_STEPS) {
      this.messages.emit({ stage: 'done', hr: this.hr, spo2: this.spo2, temp: this.temp, finger: false, q: this.q, left: null });
      this.phase = { name: 'idle' };
      return;
    }
    if (step >= 1) this.temp = Math.round((this.targets.temp + this.jitter(0.2)) * 10) / 10; // temp appears on the 2nd line
    this.messages.emit({ stage: 'forehead', hr: this.hr, spo2: this.spo2, temp: this.temp, finger: false, q: this.q, left: FOREHEAD_STEPS - step });
    this.phase = { name: 'forehead', step: step + 1 };
  }
}
