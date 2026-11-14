// The one interface both the real station (serial.ts) and its twin (simulator.ts) implement.
// The rest of the app can't tell them apart, except that simulator readings are marked "simulated".
import type { StationCommand, StationMessage } from '../types.ts';

export type LinkEvent = 'lost';

/** The station's measurement message (idle / finger / forehead / done share one shape). */
export type StationMeasure = Extract<StationMessage, { hr: number | null }>;
/** The station's hello message. */
export type StationHello = Extract<StationMessage, { stage: 'hello' }>;

export interface DeviceLink {
  /** 'serial' = the real station, 'simulator' = the twin. Decides each reading's source. */
  readonly kind: 'serial' | 'simulator';
  /** Opens the connection. Rejects with an Error whose message is safe to show (see serial.ts). */
  connect(): Promise<void>;
  /** Closes it on purpose (no 'lost' event). */
  disconnect(): Promise<void>;
  /** One command per call; the link adds the newline. Never throws. */
  send(command: StationCommand): void;
  /** Subscribe to parsed station messages. Returns the unsubscribe function. */
  onMessage(callback: (message: StationMessage) => void): () => void;
  /** Subscribe to connection events (cable pulled, port closed). Returns the unsubscribe function. */
  onEvent(callback: (event: LinkEvent) => void): () => void;
}

/** What the app says for each station error code (APP_BUILD_GUIDE.md 7.3). null = show nothing. */
export const STATION_ERROR_TEXT: Record<string, string | null> = {
  no_finger: 'No finger detected. Rest your fingertip in the slot and try again.',
  bad_signal: "The signal was too weak to trust, so we didn't guess. Warm your hand, keep still, and try again.",
  cancelled: 'Check cancelled.',
  no_sensors: "The station can't find its sensors. Ask the station host to check the wires.",
  busy: null, // a check is already running
  unknown_cmd: null, // console only
};

/** A tiny listener list, shared by both links. */
export class Emitter<T> {
  private listeners = new Set<(value: T) => void>();

  on(callback: (value: T) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  emit(value: T): void {
    for (const listener of [...this.listeners]) {
      try {
        listener(value);
      } catch (err) {
        console.error('Listener failed', err); // one bad listener must not stop the others
      }
    }
  }
}
