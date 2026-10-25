import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GeMLiveSyncService } from '../services/GeMLiveSyncService.ts';
import type { DeconstructedBidDoc } from '../types/index.ts';

describe('GeMLiveSyncService & Real-Time Synchronization', () => {
  it('retrieves live portal statistics with official 45,399+ tender scale', () => {
    const stats = GeMLiveSyncService.getLiveStats();
    assert.ok(stats.totalPortalOngoingBids >= 45000);
    assert.ok(stats.syncedLocalBidsCount >= 60);
    assert.ok(stats.productBidsCount > 0);
    assert.ok(stats.serviceBidsCount > 0);
  });

  it('filters live bids accurately by type and domain category', () => {
    const allBids = GeMLiveSyncService.getLiveBids({ type: 'ALL' });
    const productBids = GeMLiveSyncService.getLiveBids({ type: 'PRODUCT' });
    const serviceBids = GeMLiveSyncService.getLiveBids({ type: 'SERVICE' });

    assert.ok(allBids.length >= 60);
    assert.ok(productBids.length > 0);
    assert.ok(serviceBids.length > 0);
    assert.strictEqual(
      productBids.every((b) => b.type === 'PRODUCT'),
      true
    );
    assert.strictEqual(
      serviceBids.every((b) => b.type === 'SERVICE'),
      true
    );
  });

  it('searches live bids by bid number, title, and ministry keywords', () => {
    const searchDefence = GeMLiveSyncService.getLiveBids({ search: 'Defence' });
    assert.ok(searchDefence.length > 0);
    for (const b of searchDefence) {
      const match =
        b.ministry.toLowerCase().includes('defence') ||
        b.department.toLowerCase().includes('defence') ||
        b.title.toLowerCase().includes('defence') ||
        (b.categoryDomain && b.categoryDomain.toLowerCase().includes('defence'));
      assert.ok(match);
    }
  });

  it('looks up a bid by numeric b_id or bidNumber', () => {
    const bids = GeMLiveSyncService.getLiveBids();
    const firstBid = bids[0];
    const foundByNum = GeMLiveSyncService.getBidById(firstBid.bidNumber);
    assert.ok(foundByNum !== null);
    assert.strictEqual(foundByNum.bidNumber, firstBid.bidNumber);

    if (firstBid.b_id) {
      const foundById = GeMLiveSyncService.getBidById(firstBid.b_id);
      assert.ok(foundById !== null);
      assert.strictEqual(foundById.bidNumber, firstBid.bidNumber);
    }
  });

  it('ingests newly discovered live bids dynamically and notifies subscribers', () => {
    let notified = false;
    const unsubscribe = GeMLiveSyncService.subscribe((updatedBids, stats) => {
      notified = true;
      assert.ok(updatedBids.length > 0);
      assert.ok(stats.syncedLocalBidsCount > 0);
    });

    const mockNewBid: DeconstructedBidDoc = {
      bidNumber: 'GEM/2026/B/LIVE_999999',
      title: 'Testing Realtime Synchronization Ingestion Service',
      department: 'Central Public Works Department',
      ministry: 'Ministry of Housing and Urban Affairs',
      type: 'PRODUCT',
      estimatedBidValueInr: 1200000,
      emdAmountInr: 0,
      isEmdExemptForMse: true,
      epbgPercentage: 3.0,
      minAnnualTurnoverInr: 600000,
      yearsExperienceRequired: 2,
      pastPerformancePercentage: 20,
      deliveryPeriodDays: 30,
      closingTimeUtc: new Date(Date.now() + 86400000 * 5).toISOString(),
      docUrl: 'https://bidplus.gem.gov.in/showbidDocument/999999',
      b_id: '999999',
      boqItems: [],
      consignees: [{ location: 'Delhi', state: 'Delhi', pincode: '110001', quantity: 10 }],
      requiredDocuments: [],
      splittingRatio: '100% to L1',
      makeInIndiaClass: 'CLASS_1',
      matchScore: 90,
      verdictTag: 'HIGH_MATCH',
      verdictSummary: 'Direct live test opportunity',
    };

    const added = GeMLiveSyncService.ingestLiveBids([mockNewBid]);
    assert.strictEqual(added, 1);
    assert.strictEqual(notified, true);

    const retrieved = GeMLiveSyncService.getBidById('GEM/2026/B/LIVE_999999');
    assert.ok(retrieved !== null);
    assert.strictEqual(retrieved.department, 'Central Public Works Department');

    unsubscribe();
  });
});
