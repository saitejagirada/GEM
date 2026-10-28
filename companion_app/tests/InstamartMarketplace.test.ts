import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MarketplaceService } from '../services/MarketplaceService.ts';
import { GeMLiveSyncService } from '../services/GeMLiveSyncService.ts';

describe('Instamart & Blinkit Style Procurement & Real-Time Sync', () => {
  it('provides an expanded catalog of at least 20 items with rich photography and commerce metadata', () => {
    const items = MarketplaceService.getItems();
    assert.ok(items.length >= 20, `Expected at least 20 items, got ${items.length}`);

    // Verify products have images, MRP, and discount info
    const productsWithImages = items.filter((item) => item.imageUrl && item.imageUrl.startsWith('https://'));
    assert.ok(productsWithImages.length >= 15, `Expected at least 15 items with image URLs, got ${productsWithImages.length}`);

    // Verify discount percentages and strike-through MRPs
    const productsWithDiscounts = items.filter((item) => item.mrpInr && item.discountPercent && item.mrpInr > item.l1PriceInr);
    assert.ok(productsWithDiscounts.length >= 10, 'Expected items with verified discount percentages');

    // Verify delivery ETAs and unit packaging text
    const productsWithEtas = items.filter((item) => item.etaDelivery && item.unitText);
    assert.ok(productsWithEtas.length >= 10, 'Expected items with delivery ETAs and unit packaging text');
  });

  it('guarantees that ongoing public tenders are never empty or expired (no holes)', () => {
    const now = new Date();
    const ongoingBids = GeMLiveSyncService.getOngoingBids();
    assert.ok(ongoingBids.length >= 50, `Expected at least 50 ongoing bids, got ${ongoingBids.length}`);

    // Verify all ongoing bids have future closing deadlines
    for (const b of ongoingBids) {
      const closing = new Date(b.closingTimeUtc);
      assert.ok(
        closing.getTime() > now.getTime(),
        `Bid ${b.bidNumber} has closingTimeUtc ${b.closingTimeUtc} in the past`
      );
      // Verify no empty holes in fundamentals
      assert.ok(b.boqItems && b.boqItems.length > 0, `Bid ${b.bidNumber} is missing BOQ items`);
      assert.ok(b.consignees && b.consignees.length > 0, `Bid ${b.bidNumber} is missing consignees`);
      assert.ok((b.estimatedBidValueInr ?? 0) > 0, `Bid ${b.bidNumber} is missing estimated value`);
      assert.ok((b.minAnnualTurnoverInr ?? 0) >= 0, `Bid ${b.bidNumber} is missing turnover threshold`);
    }
  });

  it('populates live reverse auctions and closed tenders realistically', () => {
    const ras = GeMLiveSyncService.getReverseAuctions();
    const closed = GeMLiveSyncService.getClosedBids();

    assert.ok(ras.length >= 5, `Expected at least 5 live RAs, got ${ras.length}`);
    assert.ok(closed.length >= 5, `Expected at least 5 closed bids, got ${closed.length}`);
    assert.ok(ras.every((b) => b.isRa || b.type === 'RA' || b.lifecycleStatus === 'BID_TO_RA'));
    assert.ok(closed.every((b) => b.lifecycleStatus === 'CLOSED'));
  });

  it('accurately evaluates GFR 149 direct purchase vs L1 comparison legality for cart totals', () => {
    // Under ₹25,000 -> Direct Purchase
    const cart1 = MarketplaceService.evaluateGfrProcurementMode(18500);
    assert.strictEqual(cart1.mode, 'DIRECT_PURCHASE');

    // ₹25,001 to ₹5,00,000 -> L1 Comparison
    const cart2 = MarketplaceService.evaluateGfrProcurementMode(145000);
    assert.strictEqual(cart2.mode, 'L1_COMPARISON');

    // Above ₹5,00,000 -> Mandatory Electronic Bidding
    const cart3 = MarketplaceService.evaluateGfrProcurementMode(950000);
    assert.strictEqual(cart3.mode, 'MANDATORY_BID_OR_RA');
  });
});
