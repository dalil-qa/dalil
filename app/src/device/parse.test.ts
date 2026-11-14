import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LineBuffer, parseLine } from './parse.ts';

// The exact examples from DEVICE_BUILD_GUIDE.md 9.3.
const HELLO = '{"stage":"hello","device":"dalil-station","fw":"1.0","proto":1,"hr_sensor":"max30102","temp_sensor":"mlx90614","oled":true}';
const IDLE = '{"stage":"idle","hr":null,"spo2":null,"temp":null,"finger":false,"q":null,"left":null}';
const FINGER = '{"stage":"finger","hr":72,"spo2":98,"temp":null,"finger":true,"q":0.85,"left":12}';
const FOREHEAD = '{"stage":"forehead","hr":72,"spo2":98,"temp":34.1,"finger":false,"q":0.85,"left":3}';
const DONE = '{"stage":"done","hr":72,"spo2":98,"temp":34.2,"finger":false,"q":0.85,"left":null}';
const ERROR = '{"stage":"error","code":"no_finger","msg":"No finger detected"}';

describe('parseLine', () => {
  it('parses all six message kinds from the contract', () => {
    assert.deepEqual(parseLine(HELLO), { stage: 'hello', device: 'dalil-station', fw: '1.0', proto: 1, hr_sensor: 'max30102', temp_sensor: 'mlx90614', oled: true });
    assert.equal(parseLine(IDLE)?.stage, 'idle');
    assert.deepEqual(parseLine(FINGER), { stage: 'finger', hr: 72, spo2: 98, temp: null, finger: true, q: 0.85, left: 12 });
    assert.equal((parseLine(FOREHEAD) as { temp: number | null }).temp, 34.1);
    assert.deepEqual(parseLine(DONE), { stage: 'done', hr: 72, spo2: 98, temp: 34.2, finger: false, q: 0.85, left: null });
    assert.deepEqual(parseLine(ERROR), { stage: 'error', code: 'no_finger', msg: 'No finger detected' });
  });

  it('ignores boot text, debug lines, blank lines and junk without throwing', () => {
    for (const line of ['rst:0x1 (POWERON_RESET),boot:0x13', '# debug: sensor init', '', '   ', '{not json', '[1,2]', 'null', '{"stage":"nope"}', '{"hr":1}']) {
      assert.equal(parseLine(line), null, line);
    }
  });

  it('turns missing or non-numeric values into null, never NaN or 0', () => {
    const m = parseLine('{"stage":"finger","hr":"72","spo2":null,"finger":true}');
    assert.deepEqual(m, { stage: 'finger', hr: null, spo2: null, temp: null, finger: true, q: null, left: null });
  });

  it('rejects a hello or error with unknown values (contract says they are fixed)', () => {
    assert.equal(parseLine('{"stage":"hello","device":"x","fw":"1","proto":1,"hr_sensor":"magic","temp_sensor":"none","oled":true}'), null);
    assert.equal(parseLine('{"stage":"error","code":"exploded","msg":""}'), null);
  });

  it('tolerates Windows line endings and surrounding spaces', () => {
    assert.equal(parseLine(`  ${IDLE}\r`)?.stage, 'idle');
  });
});

describe('LineBuffer', () => {
  it('joins lines split across chunks and keeps the unfinished tail', () => {
    const b = new LineBuffer();
    assert.deepEqual(b.push('{"stage":"id'), []);
    assert.deepEqual(b.push('le"}\n{"stage":"x"}\r\nrst:0x1'), ['{"stage":"idle"}', '{"stage":"x"}']);
    assert.deepEqual(b.push(' ok\n'), ['rst:0x1 ok']);
  });
});
