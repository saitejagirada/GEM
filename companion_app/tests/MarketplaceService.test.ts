import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MarketplaceService, OFFICIAL_PRODUCT_CATEGORIES, OFFICIAL_SERVICE_CATEGORIES, OFFICIAL_OUTLET_STORES } from '../services/MarketplaceService.ts';

describe('MarketplaceService', () => {
  it('retrieves official 9 product categories and verified service categories', () => {
    const products = MarketplaceService.getProductCategories();
    assert.strictEqual(products.length, 9);
    assert.ok(products.some((p) => p.name === 'IT Products'));
    assert.ok(products.some((p) => p.name === 'Automobiles'));
    assert.ok(products.some((p) => p.name === 'Medical Products'));

    const services = MarketplaceService.getServiceCategories();
    assert.ok(services.length >= 7);
    assert.ok(services.some((s) => s.name === 'Security Services'));
    assert.ok(services.some((s) => s.name === 'Drone Services'));
  });

  it('filters marketplace items by keyword and category', () => {
    const itItems = MarketplaceService.getItems({ category: 'IT Products' });
    assert.ok(itItems.length >= 2);
    assert.ok(itItems.every((i) => i.category === 'IT Products'));

    const searchHits = MarketplaceService.getItems({ query: 'Luminaire' });
    assert.strictEqual(searchHits.length, 1);
    assert.strictEqual(searchHits[0].id, 'itm-003');
  });

  it('filters items belonging to special outlet stores (Saras / ODOP / Startup Runway)', () => {
    const outlets = MarketplaceService.getOutletStores();
    assert.ok(outlets.some((o) => o.id === 'saras-ajeevika'));
    assert.ok(outlets.some((o) => o.id === 'startup-runway'));

    const sarasItems = MarketplaceService.getItems({ outletStore: 'saras-ajeevika' });
    assert.strictEqual(sarasItems.length, 1);
    assert.strictEqual(sarasItems[0].outletStore, 'saras-ajeevika');
  });

  it('evaluates GFR 149 legal procurement thresholds accurately', () => {
    // Under 25,000 -> Direct Purchase
    const direct = MarketplaceService.evaluateGfrProcurementMode(18000);
    assert.strictEqual(direct.mode, 'DIRECT_PURCHASE');

    // 25,001 to 5,00,000 -> L1 Comparison
    const l1 = MarketplaceService.evaluateGfrProcurementMode(240000);
    assert.strictEqual(l1.mode, 'L1_COMPARISON');

    // Above 5,00,000 -> Mandatory Bid / RA
    const bid = MarketplaceService.evaluateGfrProcurementMode(1800000);
    assert.strictEqual(bid.mode, 'MANDATORY_BID_OR_RA');
  });
});
