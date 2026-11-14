// One text line from the station -> one StationMessage, or null.
// Rules (APP_BUILD_GUIDE.md 7.2): ignore anything not starting with "{", never throw,
// accept only the six stage values. Contract: DEVICE_BUILD_GUIDE.md section 9.3.
import type { StationMessage } from '../types.ts';

const HR_SENSORS = ['max30102', 'pulsesensor', 'none'] as const;
const TEMP_SENSORS = ['mlx90614', 'none'] as const;
const ERROR_CODES = ['no_finger', 'bad_signal', 'cancelled', 'no_sensors', 'busy', 'unknown_cmd'] as const;

type Obj = Record<string, unknown>;

/** A finite number, or null for null / missing / NaN / anything else (the contract says null = not measured). */
function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function oneOf<T extends string>(list: readonly T[], v: unknown): T | null {
  return typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : null;
}

export function parseLine(line: string): StationMessage | null {
  const text = line.trim();
  if (!text.startsWith('{')) return null; // start-up text, "# debug" lines, blank lines

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const o = raw as Obj;

  switch (o.stage) {
    case 'hello': {
      if (typeof o.device !== 'string' || typeof o.fw !== 'string' || typeof o.proto !== 'number') return null;
      const hr = oneOf(HR_SENSORS, o.hr_sensor);
      const temp = oneOf(TEMP_SENSORS, o.temp_sensor);
      if (!hr || !temp) return null;
      return { stage: 'hello', device: o.device, fw: o.fw, proto: o.proto, hr_sensor: hr, temp_sensor: temp, oled: o.oled === true };
    }
    case 'idle':
    case 'finger':
    case 'forehead':
    case 'done':
      return {
        stage: o.stage,
        hr: numOrNull(o.hr),
        spo2: numOrNull(o.spo2),
        temp: numOrNull(o.temp),
        finger: o.finger === true,
        q: numOrNull(o.q),
        left: numOrNull(o.left),
      };
    case 'error': {
      const code = oneOf(ERROR_CODES, o.code);
      if (!code) return null;
      return { stage: 'error', code, msg: typeof o.msg === 'string' ? o.msg : '' };
    }
    default:
      return null;
  }
}

/** Splits streamed text into complete lines. Keeps the unfinished tail for the next chunk. */
export class LineBuffer {
  private tail = '';

  push(chunk: string): string[] {
    const parts = (this.tail + chunk).split('\n');
    this.tail = parts.pop() ?? '';
    return parts.map((p) => p.replace(/\r$/, ''));
  }

  reset(): void {
    this.tail = '';
  }
}
