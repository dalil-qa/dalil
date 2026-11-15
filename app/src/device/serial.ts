// The real Crew Health Station over Web Serial (APP_BUILD_GUIDE.md section 7).
// Chrome or Edge only. Written to the fixed contract in DEVICE_BUILD_GUIDE.md section 9.
// NOTE: not yet tested against real hardware (the simulator covers the same messages).
import type { StationCommand, StationMessage } from '../types.ts';
import { Emitter, type DeviceLink, type LinkEvent } from './link.ts';
import { LineBuffer, parseLine } from './parse.ts';

const BAUD_RATE = 115200;
const PING_EVERY_MS = 10_000;
let lastGrantedPort: SerialPort | null = null;

export const SERIAL_UNSUPPORTED_TEXT =
  'Live checks need Chrome or Edge on a computer. You can still explore with the simulator.';

export function isSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/** Why connecting failed, in words the user can act on (APP_BUILD_GUIDE.md 7.4). */
export class SerialConnectError extends Error {
  readonly reason: 'unsupported' | 'no_port_chosen' | 'port_busy' | 'unknown';
  constructor(reason: SerialConnectError['reason'], message: string) {
    super(message);
    this.name = 'SerialConnectError';
    this.reason = reason;
  }
}

function explain(err: unknown): SerialConnectError {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotFoundError') {
    // The popup was closed, or no port is listed.
    return new SerialConnectError(
      'no_port_chosen',
      'No port was chosen. If none is listed, install the CP210x driver and use a data cable (not a charge-only one).',
    );
  }
  if (name === 'InvalidStateError' || name === 'NetworkError') {
    return new SerialConnectError(
      'port_busy',
      'Failed to open the serial port. Close the Arduino Serial Monitor and other Baseera tabs, then click Connect.',
    );
  }
  return new SerialConnectError('unknown', err instanceof Error ? err.message : 'Could not connect to the station.');
}

export class SerialLink implements DeviceLink {
  readonly kind = 'serial' as const;

  private messages = new Emitter<StationMessage>();
  private events = new Emitter<LinkEvent>();
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private closingOnPurpose = false;
  private onPortDisconnect = (event: Event) => {
    if (event.target === this.port) void this.handleLost();
  };

  /**
   * Opens the station. With `reuseGranted`, a port the user allowed before is opened without the popup
   * (so reconnecting during the pitch is instant); if none was allowed it falls back to the popup,
   * which only works when this is called from a click.
   */
  async connect(options: { reuseGranted?: boolean } = {}): Promise<void> {
    if (!isSerialSupported()) throw new SerialConnectError('unsupported', SERIAL_UNSUPPORTED_TEXT);
    if (this.port) return;

    let port: SerialPort | undefined;
    try {
      if (options.reuseGranted) {
        const granted = await navigator.serial.getPorts();
        port = (lastGrantedPort && granted.includes(lastGrantedPort) ? lastGrantedPort : undefined) ?? granted[0];
      }
      port ??= await navigator.serial.requestPort();
      await port.open({ baudRate: BAUD_RATE });
      lastGrantedPort = port;
    } catch (err) {
      throw explain(err);
    }
    if (!port.readable || !port.writable) throw new SerialConnectError('unknown', 'The port opened but cannot be read.');

    this.port = port;
    this.closingOnPurpose = false;
    this.writer = port.writable.getWriter();
    navigator.serial.addEventListener('disconnect', this.onPortDisconnect);
    void this.readLoop(port.readable.getReader());

    // The board may restart when the port opens; the first PING makes it say hello either way.
    this.send('PING');
    this.pingTimer = setInterval(() => this.send('PING'), PING_EVERY_MS);
  }

  async disconnect(): Promise<void> {
    this.closingOnPurpose = true;
    await this.teardown();
  }

  send(command: StationCommand): void {
    const writer = this.writer;
    if (!writer) return;
    writer.write(new TextEncoder().encode(`${command}\n`)).catch(() => {
      // A failed write means the cable is gone; the read loop reports it.
    });
  }

  onMessage(callback: (message: StationMessage) => void): () => void {
    return this.messages.on(callback);
  }

  onEvent(callback: (event: LinkEvent) => void): () => void {
    return this.events.on(callback);
  }

  // ---------- internals ----------

  private async readLoop(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
    this.reader = reader;
    const decoder = new TextDecoder();
    const buffer = new LineBuffer();
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        for (const line of buffer.push(decoder.decode(value, { stream: true }))) {
          const message = parseLine(line); // never throws; ignores boot text and "#" debug lines
          if (message) this.messages.emit(message);
        }
      }
    } catch {
      // Unplugged mid-read. Handled below.
    }
    if (!this.closingOnPurpose) await this.handleLost();
  }

  private async handleLost(): Promise<void> {
    await this.teardown();
    this.events.emit('lost');
  }

  private async teardown(): Promise<void> {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
    navigator.serial?.removeEventListener('disconnect', this.onPortDisconnect);

    const { reader, writer, port } = this;
    this.reader = null;
    this.writer = null;
    this.port = null;
    try {
      await reader?.cancel();
    } catch {
      /* already closed */
    }
    try {
      reader?.releaseLock();
    } catch {
      /* already released */
    }
    try {
      writer?.releaseLock();
    } catch {
      /* already released */
    }
    try {
      await port?.close();
    } catch {
      /* already closed */
    }
  }
}
