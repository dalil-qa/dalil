import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { plainHeadlineAr, plainSentenceAr, translate } from '../i18n.ts';
import { plainHeadline, plainSentence } from './plain.ts';

describe('plain words for Home mode', () => {
  it('says each status in everyday language, with no space words', () => {
    assert.equal(plainSentence('hr', 'ok'), 'Your heart rate is normal today.');
    assert.equal(plainSentence('spo2', 'watch'), 'Your oxygen level is a little different from usual.');
    assert.equal(plainSentence('temp', 'act'), 'Temperature needs attention. Please call your doctor.');
    for (const s of ['ok', 'watch', 'act'] as const) {
      assert.doesNotMatch(plainSentence('hr', s) + plainHeadline(s), /surgeon|crew|mission|station|baseline|SpO2/i);
    }
  });
  it('the headline follows the worst status', () => {
    assert.equal(plainHeadline('ok'), 'All good today.');
    assert.equal(plainHeadline('act'), 'Please call your doctor now.');
  });
  it('provides Arabic Home mode translations for headlines, sentences, and UI strings', () => {
    assert.equal(plainHeadlineAr('ok'), 'كل شيء على ما يرام اليوم.');
    assert.equal(plainSentenceAr('hr', 'ok'), 'نبض القلب طبيعي اليوم.');
    assert.equal(translate('ar', 'startCheck'), 'ابدأ الفحص');
    assert.equal(translate('en', 'startCheck'), 'Start check');
  });
});
