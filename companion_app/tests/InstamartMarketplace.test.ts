import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MarketplaceService } from '../services/MarketplaceService.ts';
import { GeMLiveSyncService } from '../services/GeMLiveSyncService.ts';

describe('Public marketplace and live bid feed boundaries', () => {
  it('provides an expanded public marketplace catalog with commerce metadata', () => {
    const items = MarketplaceService.getItems();
    assert.ok(items.length >= 20, `Expected at least 20 items, got ${items.length}`);
    assert.ok(items.filter((item) => item.imageUrl?.startsWith('https://')).length >= 15);
    assert.ok(items.filter((item) => item.mrpInr && item.discountPercent && item.mrpInr > item.l1PriceInr).length >= 10);
  });

  it('does not fabricate bid fundamentals when the public feed omits them', () => {
    const bid = GeMLiveSyncService.mapPortalBid({
      b_id: ['654321'],
      b_bid_number: ['GEM/2026/B/6543210'],
      b_category_name: ['Office Equipment'],
      final_end_date_sort: ['2099-11-02T13:00:00Z'],
      b_bid_type: [1],
    });

    assert.ok(bid);
    assert.equal(bid?.estimatedBidValueInr, undefined);
    assert.equal(bid?.boqItems?.length, 0);
    assert.equal(bid?.consignees?.length, 0);
    assert.equal(bid?.requiredDocuments?.length, 0);
  });

  it('keeps the GFR 149 procurement calculator deterministic', () => {
    assert.strictEqual(MarketplaceService.evaluateGfrProcurementMode(18500).mode, 'DIRECT_PURCHASE');
    assert.strictEqual(MarketplaceService.evaluateGfrProcurementMode(145000).mode, 'L1_COMPARISON');
    assert.strictEqual(MarketplaceService.evaluateGfrProcurementMode(950000).mode, 'MANDATORY_BID_OR_RA');
  });
});
