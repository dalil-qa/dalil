# Automated connection tests for the Dalil station: DEVICE_BUILD_GUIDE.md 9.6, the ones that need no finger or forehead.
# Usage (close the Dalil app and any serial monitor first):
#   python3 -m venv .venv && .venv/bin/pip install pyserial
#   .venv/bin/python scripts/station/contract_test.py /dev/cu.usbserial-0001     (Mac)   or   COM5   (Windows)
import json, sys, time, serial
PORT = sys.argv[1] if len(sys.argv) > 1 else '/dev/cu.usbserial-0001'
FW = sys.argv[2] if len(sys.argv) > 2 else None   # optional: the expected FW_VERSION
s = serial.Serial(); s.port, s.baudrate, s.timeout = PORT, 115200, 0.1
s.dtr, s.rts = True, True          # both on = no reset (like Chrome)
s.open()
# Read continuously in the background, like Chrome's Web Serial (the Mac driver misbehaves after partial reads).
import threading
_raw = bytearray(); _lock = threading.Lock(); _stop = False
def _reader():
    while not _stop:
        chunk = s.read(4096)
        if chunk:
            with _lock: _raw.extend(chunk)
_t = threading.Thread(target=_reader, daemon=True); _t.start()
time.sleep(3.0)                       # opening can restart the board: let it start up
with _lock: del _raw[:]               # start fresh (the driver can replay stale bytes from before we opened)
KEYS = ['stage', 'hr', 'spo2', 'temp', 'finger', 'q', 'left']
allraw, results = [], []
_buf = b''
def collect(secs):
    global _buf
    out, end = [], time.time() + secs
    while time.time() < end:
        time.sleep(0.05)
        with _lock:
            _buf += bytes(_raw); del _raw[:]
        buf = _buf
        while b'\n' in buf:
            line, buf = buf.split(b'\n', 1)
            t = line.decode('utf-8', 'replace').strip()
            if not t: continue
            allraw.append(t)
            if t.startswith('{'):
                try: out.append(json.loads(t))
                except Exception: out.append({'_bad': t})
        _buf = buf
    return out
def send(cmd): s.write((cmd + '\n').encode())
def check(name, ok, extra=''):
    ok = bool(ok); results.append(ok); print(('PASS ' if ok else 'FAIL ') + name + (f'  -> {extra}' if extra else ''))

# 7: PING -> hello
send('PING'); m = collect(1.5)
h = [x for x in m if x.get('stage') == 'hello']
check('PING gives a hello line', len(h) == 1 and h[0].get('device') == 'dalil-station' and h[0].get('proto') == 1 and (FW is None or h[0].get('fw') == FW), h[:1])
check('hello lists the sensors (MAX30102, MLX90614, screen)', h and h[0].get('hr_sensor') == 'max30102' and h[0].get('temp_sensor') == 'mlx90614' and h[0].get('oled') is True, h[:1])
# 2: idle once a second, 7 keys in order, nulls
m = collect(5.2); idle = [x for x in m if x.get('stage') == 'idle']
check('idle about once a second', 4 <= len(idle) <= 6, f'{len(idle)} in 5 s')
check('idle has exactly the 7 keys in order, with nulls', all(list(x.keys()) == KEYS and x['hr'] is None and x['q'] is None and x['left'] is None and x['finger'] is False for x in idle))
# 3: START -> finger lines, left 20, finger false
send('START'); m = collect(3.2); fing = [x for x in m if x.get('stage') == 'finger']
check('START gives finger lines every second', 2 <= len(fing) <= 4, f'{len(fing)} in 3 s')
check('finger lines: 7 keys, temp null, finger false, left 20 with no finger', fing and all(list(x.keys()) == KEYS and x['temp'] is None for x in fing) and fing[-1]['finger'] is False and fing[-1]['left'] == 20, fing[-1:] )
# 11: START during a check -> busy
send('START'); m = collect(1.2); err = [x for x in m if x.get('stage') == 'error']
check('START during a check gives busy', any(x.get('code') == 'busy' and x.get('msg') == 'Check already running' for x in err), err)
# 10: STOP -> cancelled, back to idle
send('STOP'); m = collect(2.5); err = [x for x in m if x.get('stage') == 'error']
check('STOP gives cancelled', any(x.get('code') == 'cancelled' and x.get('msg') == 'Check cancelled' for x in err), err)
check('then idle lines again', any(x.get('stage') == 'idle' for x in m))
# 12: unknown command
send('hello123'); m = collect(1.2); err = [x for x in m if x.get('stage') == 'error']
check('unknown text gives unknown_cmd with the text', any(x.get('code') == 'unknown_cmd' and x.get('msg') == 'hello123' for x in err), err)
# lower case and spaces
send('  ping  '); m = collect(1.2)
check('commands ignore case and spaces ("  ping  ")', any(x.get('stage') == 'hello' for x in m))
# 9: LED commands are accepted (no error); you should see amber, red, green, then off
for c in ['LED AMBER', 'LED RED', 'LED GREEN', 'LED OFF']:
    send(c); m = collect(1.0)
    check(f'{c} accepted (no error)', not any(x.get('stage') == 'error' for x in m))
# 11b: no finger for 15 s -> no_finger
send('START'); m = collect(17.5); err = [x for x in m if x.get('stage') == 'error']
check('no finger for 15 s gives no_finger', any(x.get('code') == 'no_finger' and x.get('msg') == 'No finger detected' for x in err), err)
# 13: nothing but JSON and # lines, no nan / -999, max 200 chars
BOOT = ('ets ', 'rst:', 'configsip', 'clk_drv', 'mode:', 'load:', 'entry ', 'ho ', 'tail ')  # the ESP32's own start-up text (allowed, 9.5)
bad = [t for t in allraw if not (t.startswith('{') or t.startswith('#') or t.startswith(BOOT))]
check('only JSON (or #) lines', not bad, bad[:3])
check('no nan, -999 or undefined anywhere', not any(('nan' in t.lower() and '"stage"' in t) or '-999' in t or 'undefined' in t for t in allraw))
check('every JSON line at most 200 characters', all(len(t) <= 200 for t in allraw if t.startswith('{')))
_stop = True; _t.join(); s.close()
print(f'\n{sum(results)} passed, {len(results) - sum(results)} failed')
