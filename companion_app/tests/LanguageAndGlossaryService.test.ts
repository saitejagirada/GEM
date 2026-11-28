import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  GEM_GLOSSARY_ENTRIES,
  LanguageAndGlossaryService,
} from '../services/LanguageAndGlossaryService.ts';

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    async getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    async setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe('LanguageAndGlossaryService - Bilingual EN/HI & GeM Glossary', () => {
  beforeEach(() => {
    LanguageAndGlossaryService.setStorageAdapterForTests(createMemoryStorage());
  });

  it('defaults to English and persists Hindi toggle cleanly', async () => {
    assert.strictEqual(await LanguageAndGlossaryService.loadLanguage(), 'en');
    assert.strictEqual(LanguageAndGlossaryService.translate('en', 'tabBids'), 'Bids');
    assert.strictEqual(LanguageAndGlossaryService.translate('hi', 'tabBids'), 'निविदाएं');
    assert.strictEqual(LanguageAndGlossaryService.translate('en', 'tabMore'), 'User Account');
    assert.strictEqual(LanguageAndGlossaryService.translate('en', 'savedBookmarks'), 'Saved Bookmarks');

    await LanguageAndGlossaryService.saveLanguage('hi');
    assert.strictEqual(await LanguageAndGlossaryService.loadLanguage(), 'hi');

    assert.strictEqual(LanguageAndGlossaryService.translate('en', 'viewBidDetails'), 'View Bid Details');
    assert.strictEqual(LanguageAndGlossaryService.translate('hi', 'viewBidDetails'), 'टेंडर विवरण देखें');
    assert.strictEqual(LanguageAndGlossaryService.translate('hi', 'inspectAuction'), 'नीलामी विवरण देखें');
    assert.strictEqual(LanguageAndGlossaryService.translate('hi', 'prepareDocs'), 'दस्तावेज़ तैयार करें');
  });

  it('provides complete English and Hindi explainers for all 14 core GeM terms', () => {
    assert.ok(GEM_GLOSSARY_ENTRIES.length >= 14);
    for (const entry of GEM_GLOSSARY_ENTRIES) {
      assert.ok(entry.summaryEn.length > 15);
      assert.ok(entry.summaryHi.length > 15);
      assert.ok(entry.tipEn.length > 10);
      assert.ok(entry.tipHi.length > 10);
    }

    const epbg = LanguageAndGlossaryService.findGlossaryEntry('e-PBG');
    assert.ok(epbg);
    assert.strictEqual(epbg.key, 'EPBG');
    assert.ok(epbg.fullNameEn.includes('Performance Bank Guarantee'));
  });
});
