import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MarketplaceService } from '../services/MarketplaceService.ts';

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

    const searchHits = MarketplaceService.getItems({ query: 'DUGONG' });
    assert.ok(searchHits.length >= 1);
    assert.ok(searchHits.every((i) => i.title.toLowerCase().includes('dugong') || i.oemBrand.toLowerCase().includes('dugong')));
  });

  it('filters items belonging to special outlet stores (Saras / ODOP / Startup Runway)', () => {
    const outlets = MarketplaceService.getOutletStores();
    assert.ok(outlets.some((o) => o.id === 'saras-ajeevika'));
    assert.ok(outlets.some((o) => o.id === 'startup-runway'));

    // Ingest a verified outlet item
    MarketplaceService.ingestLiveProducts([
      {
        id: 'gem-saras-live-01',
        title: 'Handloom Pure Khadi Cotton Bed Sheets Set',
        category: 'Textile Products',
        type: 'PRODUCT',
        l1PriceInr: 18500,
        priceUnit: 'per Pack of 50',
        minOrderQty: 1,
        oemBrand: 'KVIC State Handloom',
        rating: 4.9,
        totalOrders: 120,
        specSummary: {},
        procurementModes: ['DIRECT_PURCHASE'],
        msePreference: true,
        makeInIndiaPercent: 100,
        outletStore: 'saras-ajeevika',
        isAvailableOnGeM: true,
      },
    ]);

    const sarasItems = MarketplaceService.getItems({ outletStore: 'saras-ajeevika' });
    assert.ok(sarasItems.length >= 1);
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

  it('supports getMarketplaceItems alias and fetchLiveProducts gracefully', async () => {
    const aliasItems = MarketplaceService.getMarketplaceItems({ category: 'IT Products' });
    assert.ok(aliasItems.length >= 2);

    // fetchLiveProducts returns products when network is accessible or empty when offline
    const liveItems = await MarketplaceService.fetchLiveProducts();
    assert.ok(Array.isArray(liveItems));
  });

  it('subscribes to live product updates and dynamically ingests new seller products', () => {
    let captured: any[] = [];
    const unsubscribe = MarketplaceService.subscribeToProductUpdates((items) => {
      captured = items;
    });

    assert.ok(captured.length >= 60, `Expected catalog >= 60 items, got ${captured.length}`);

    // Ingest a freshly discovered live product
    const newLiveProduct = {
      id: 'gem-test-live-999',
      title: 'GeM Live Drone Surveillance Unit 4K HDR',
      category: 'Electronic Equipments',
      type: 'PRODUCT' as const,
      l1PriceInr: 125000,
      mrpInr: 180000,
      discountPercent: 30,
      priceUnit: 'per Unit',
      minOrderQty: 1,
      oemBrand: 'Garuda Aerospace',
      rating: 4.9,
      totalOrders: 320,
      specSummary: { 'Range': '15km', 'Battery': '5000mAh' },
      procurementModes: ['DIRECT_PURCHASE' as const, 'L1_COMPARISON' as const],
      msePreference: true,
      makeInIndiaPercent: 85,
      isAvailableOnGeM: true,
      imageUrl: 'https://assets-mkpbg.gem.gov.in/img/othe/drone.jpg',
      etaDelivery: '⚡ 48 Hours Express',
      unitText: '1 Kit',
      badge: 'GeM Verified',
      inStock: true,
      stockCount: 15,
    };

    const added = MarketplaceService.ingestLiveProducts([newLiveProduct]);
    assert.strictEqual(added, 1);
    assert.ok(captured.some((i) => i.id === 'gem-test-live-999'));

    unsubscribe();
  });
});
