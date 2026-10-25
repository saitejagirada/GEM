import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  OFFICIAL_PRODUCT_CATEGORIES,
  OFFICIAL_SERVICE_CATEGORIES,
  OFFICIAL_OUTLET_STORES,
  MarketplaceService,
} from '../services/MarketplaceService.ts';

describe('BrowseMegaMenu & National Taxonomy Verification', () => {
  it('verifies that all 9 popular product categories from mkp.gem.gov.in exist', () => {
    assert.strictEqual(OFFICIAL_PRODUCT_CATEGORIES.length, 9);
    const categoryNames = OFFICIAL_PRODUCT_CATEGORIES.map((c) => c.name);
    assert.ok(categoryNames.includes('IT Products'));
    assert.ok(categoryNames.includes('Automobiles'));
    assert.ok(categoryNames.includes('Furniture'));
    assert.ok(categoryNames.includes('Medical Products'));
    assert.ok(categoryNames.includes('Stationery Items'));
    assert.ok(categoryNames.includes('Electrical Appliances'));
    assert.ok(categoryNames.includes('Electronic Equipments'));
    assert.ok(categoryNames.includes('Textile Products'));
    assert.ok(categoryNames.some((c) => c.includes('Pipes')));
  });

  it('verifies IT Products subcategories match the official portal screenshot', () => {
    const itCat = OFFICIAL_PRODUCT_CATEGORIES.find((c) => c.name === 'IT Products');
    assert.ok(itCat);
    assert.ok(itCat.subcategories.some((s) => s.toLowerCase().includes('desktop')));
    assert.ok(itCat.subcategories.some((s) => s.toLowerCase().includes('laptop')));
    assert.ok(itCat.subcategories.some((s) => s.toLowerCase().includes('printer')));
    assert.ok(itCat.subcategories.some((s) => s.toLowerCase().includes('tablet')));
  });

  it('verifies Automobiles and Medical subcategories match official GeM taxonomy', () => {
    const autoCat = OFFICIAL_PRODUCT_CATEGORIES.find((c) => c.name === 'Automobiles');
    assert.ok(autoCat);
    assert.ok(autoCat.subcategories.includes('Buses'));
    assert.ok(autoCat.subcategories.includes('Tractors'));
    assert.ok(autoCat.subcategories.includes('Cars'));
    assert.ok(autoCat.subcategories.includes('Utility Vehicles'));

    const medCat = OFFICIAL_PRODUCT_CATEGORIES.find((c) => c.name === 'Medical Products');
    assert.ok(medCat);
    assert.ok(medCat.subcategories.some((s) => s.includes('Sanitizer')));
    assert.ok(medCat.subcategories.some((s) => s.includes('Surgical Gloves')));
    assert.ok(medCat.subcategories.some((s) => s.includes('Syringes')));
  });

  it('verifies Trending and Emerging Services are properly cataloged', () => {
    assert.ok(OFFICIAL_SERVICE_CATEGORIES.length >= 7);
    const serviceNames = OFFICIAL_SERVICE_CATEGORIES.map((s) => s.name);
    assert.ok(serviceNames.some((n) => n.includes('Manpower')));
    assert.ok(serviceNames.some((n) => n.includes('Vehicle') || n.includes('Cab')));
    assert.ok(serviceNames.some((n) => n.includes('Facility') || n.includes('Security')));
  });

  it('verifies all 5 National Outlet Stores are available', () => {
    assert.strictEqual(OFFICIAL_OUTLET_STORES.length, 5);
    const storeIds = OFFICIAL_OUTLET_STORES.map((o) => o.id);
    assert.ok(storeIds.includes('saras-ajeevika'));
    assert.ok(storeIds.includes('odop'));
    assert.ok(storeIds.includes('startup-runway'));
    assert.ok(storeIds.includes('womaniya'));
    assert.ok(storeIds.includes('millets'));
  });

  it('filters items correctly when subcategory or category is chosen', () => {
    const itItems = MarketplaceService.getItems({ category: 'IT Products' });
    assert.ok(itItems.length > 0);
    for (const item of itItems) {
      assert.strictEqual(item.category, 'IT Products');
    }
  });
});
