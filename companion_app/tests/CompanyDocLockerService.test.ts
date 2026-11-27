import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { CompanyDocLockerService } from '../services/CompanyDocLockerService.ts';

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    async getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    async setItem(key: string, value: string) {
      store.set(key, value);
    },
    async removeItem(key: string) {
      store.delete(key);
    },
  };
}

describe('CompanyDocLockerService - Reusable Seller Locker & Auto-Matching', () => {
  beforeEach(() => {
    CompanyDocLockerService.setAdaptersForTests(createMemoryStorage(), null);
  });

  it('saves, hydrates, tracks expiry status, and removes slot documents cleanly', async () => {
    const saved = await CompanyDocLockerService.saveSlotDocument(
      'GST',
      { name: 'Firm_GST_REG06.pdf', uri: 'file:///tmp/gst.pdf', size: 120000 },
      '2027-06-30'
    );
    assert.strictEqual(saved.slotId, 'GST');
    assert.strictEqual(CompanyDocLockerService.getDocuments().length, 1);

    const rehydrated = await CompanyDocLockerService.hydrate(true);
    assert.strictEqual(rehydrated.length, 1);
    assert.strictEqual(rehydrated[0].name, 'Firm_GST_REG06.pdf');

    const refDate = new Date('2026-11-27T00:00:00Z');
    assert.strictEqual(CompanyDocLockerService.getExpiryStatus('2027-06-30', refDate), 'VALID');
    assert.strictEqual(CompanyDocLockerService.getExpiryStatus('2026-12-10', refDate), 'EXPIRING_SOON');
    assert.strictEqual(CompanyDocLockerService.getExpiryStatus('2026-10-01', refDate), 'EXPIRED');

    await CompanyDocLockerService.removeSlotDocument('GST');
    assert.strictEqual(CompanyDocLockerService.getDocuments().length, 0);
  });

  it('auto-matches tender required checklists against non-expired Company Locker docs', async () => {
    const refDate = new Date('2026-11-27T00:00:00Z');
    await CompanyDocLockerService.saveSlotDocument('TURNOVER', {
      name: 'CA_UDIN_FY25.pdf',
      uri: 'file:///tmp/ca.pdf',
    });
    await CompanyDocLockerService.saveSlotDocument('EXPERIENCE', {
      name: 'GeM_CRAC_Bundle.pdf',
      uri: 'file:///tmp/crac.pdf',
    });
    await CompanyDocLockerService.saveSlotDocument(
      'ISO_QUALITY',
      { name: 'ISO_9001_Old.pdf', uri: 'file:///tmp/iso.pdf' },
      '2025-01-01' // Expired — must NOT be auto-matched!
    );

    const match = CompanyDocLockerService.matchBidChecklistWithLocker(
      [
        'Bidder Turnover',
        'Experience Criteria',
        'ISO 9001 Certificate',
        'OEM Authorization Certificate',
      ],
      [],
      CompanyDocLockerService.getDocuments(),
      refDate
    );

    assert.strictEqual(match.totalRequired, 4);
    assert.strictEqual(match.readyCount, 2);
    assert.strictEqual(match.matchedFromLocker.length, 2);
    assert.deepStrictEqual(match.missingRequirements, [
      'ISO 9001 Certificate',
      'OEM Authorization Certificate',
    ]);

    // Synthetic WorkspaceDocument projection excludes expired locker docs
    const projected = CompanyDocLockerService.toWorkspaceDocuments(
      CompanyDocLockerService.getDocuments(),
      refDate
    );
    assert.strictEqual(projected.length, 2);
    assert.ok(projected.some((d) => /turnover|udin/i.test(d.name)));
    assert.ok(projected.some((d) => /crac|experience/i.test(d.name)));
  });
});
