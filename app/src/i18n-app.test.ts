import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { APP_AR, APP_EN } from './i18n-app.ts';
import { statusWord } from './i18n.ts';

const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

describe('Arabic main-app dictionary', () => {
  it('has the same keys and the same {placeholders} as English, and no empty strings', () => {
    assert.deepEqual(Object.keys(APP_AR).sort(), Object.keys(APP_EN).sort());
    for (const k of Object.keys(APP_EN) as (keyof typeof APP_EN)[]) {
      assert.ok(APP_AR[k].trim().length > 0, `${k} is empty in Arabic`);
      assert.deepEqual(holes(APP_AR[k]), holes(APP_EN[k]), `${k}: placeholders differ`);
    }
  });

  it('shows the status in Arabic in both modes, and keeps the "contact" wording', () => {
    assert.equal(statusWord('ok', false, 'ar'), 'طبيعي');
    assert.equal(statusWord('watch', true, 'ar'), 'للمتابعة');
    assert.equal(statusWord('act', false, 'ar'), 'اتصل بطبيب الرحلة');
    assert.equal(statusWord('act', true, 'ar'), 'اتصل بالطبيب');
    assert.equal(statusWord('act', false, 'en'), 'Call surgeon');
  });
});
