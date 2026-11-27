import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { BusinessProfileService } from '../services/BusinessProfileService.ts';
import { DisqualificationShieldEngine } from '../services/DisqualificationShieldEngine.ts';
import type { ExtractedGeMTenderDetails } from '../services/GemPdfExtractor.ts';

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

describe('BusinessProfileService - Private On-Device Seller Profile', () => {
  beforeEach(() => {
    BusinessProfileService.setStorageAdapterForTests(createMemoryStorage());
  });

  it('starts unconfigured (null) with zero pre-filled dummy PII', async () => {
    const hydrated = await BusinessProfileService.hydrate(true);
    assert.strictEqual(hydrated, null);
    assert.strictEqual(BusinessProfileService.hasConfiguredProfile(), false);
    assert.ok(BusinessProfileService.formatProfileSummary(null).includes('Not configured'));
  });

  it('persists, hydrates, sanitizes, and broadcasts saved business profiles', async () => {
    const events: Array<string | null> = [];
    const unsub = BusinessProfileService.subscribe((p) => {
      events.push(p ? p.organizationName : null);
    });

    const saved = await BusinessProfileService.saveProfile({
      organizationName: '  Deccan Solar Works  ',
      msmeCategory: 'SMALL',
      annualTurnoverLakhs: 120,
      yearsExperience: 5,
      isOem: true,
      hasUdyamCertificate: true,
      targetStates: ['Telangana', 'Maharashtra', 'telangana'],
    });

    assert.strictEqual(saved.organizationName, 'Deccan Solar Works');
    assert.strictEqual(saved.annualTurnoverInr, 12000000);
    assert.strictEqual(saved.yearsExperience, 5);
    assert.strictEqual(saved.isOem, true);
    assert.deepStrictEqual(saved.targetStates, ['Telangana', 'Maharashtra']);
    assert.strictEqual(BusinessProfileService.hasConfiguredProfile(), true);
    assert.ok(BusinessProfileService.formatProfileSummary(saved).includes('OEM'));
    assert.ok(BusinessProfileService.formatProfileSummary(saved).includes('₹1.2 Cr'));

    // Re-hydrate from storage
    const rehydrated = await BusinessProfileService.hydrate(true);
    assert.ok(rehydrated);
    assert.strictEqual(rehydrated.organizationName, 'Deccan Solar Works');
    assert.strictEqual(rehydrated.annualTurnoverInr, 12000000);

    await BusinessProfileService.clearProfile();
    assert.strictEqual(BusinessProfileService.getProfile(), null);
    assert.strictEqual(events[0], 'Deccan Solar Works');
    assert.strictEqual(events[events.length - 1], null);
    unsub();
  });

  it('normalizes Pan-India state coverage without false logistics warnings in DisqualificationShieldEngine', async () => {
    const profile = await BusinessProfileService.saveProfile({
      organizationName: 'Pan-India Equipments',
      msmeCategory: 'MICRO',
      annualTurnoverLakhs: 80,
      yearsExperience: 4,
      isOem: true,
      hasUdyamCertificate: true,
      targetStates: ['Pan-India', 'Delhi'],
    });

    assert.deepStrictEqual(profile.targetStates, ['Pan-India']);

    const tender: ExtractedGeMTenderDetails = {
      bidNumber: 'GEM/2026/B/9001234',
      title: 'Solar Inverter System',
      isEmdExemptForMse: false,
      isEmdExemptForStartup: false,
      msePurchasePreference: false,
      mseExemptionForExpAndTurnover: false,
      startupExemptionForExpAndTurnover: false,
      miiPurchasePreference: false,
      isSplittingApplied: false,
      consignees: [
        {
          sNo: 1,
          address: 'Port Blair Depot',
          pincode: '744101',
          state: 'Andaman and Nicobar',
          quantity: 10,
          deliveryDays: 30,
        },
      ],
      consigneeStateDistribution: {
        'Andaman and Nicobar': { count: 1, quantity: 10, percentage: 100 },
      },
      requiredDocuments: [],
      requiresOemAuthorization: false,
      requiresCaTurnoverCertificate: false,
      requiresMiiDeclaration: false,
      requiresGstCertificate: false,
      requiresPastPerformanceDoc: false,
      atcClauses: [],
      isRaEnabled: false,
    };

    const report = DisqualificationShieldEngine.evaluateShield(tender, profile, []);
    const logistics = report.checks.find((c) => c.category === 'LOGISTICS');
    assert.ok(logistics);
    assert.strictEqual(logistics.severity, 'PASS');
    assert.ok(logistics.reason.includes('Pan-India'));
  });
});
