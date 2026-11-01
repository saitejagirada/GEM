import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GeMLiveSyncService } from '../services/GeMLiveSyncService.ts';
import type { DeconstructedBidDoc } from '../types/index.ts';

const makeBid = (overrides: Partial<DeconstructedBidDoc> = {}): DeconstructedBidDoc => ({
  bidNumber: `GEM/2026/B/TEST_${Math.random().toString(36).slice(2, 8)}`,
  title: 'Public procurement opportunity',
  department: 'Department published by GeM',
  ministry: 'Ministry published by GeM',
  type: 'PRODUCT',
  closingTimeUtc: new Date(Date.now() + 86400000).toISOString(),
  docUrl: 'https://bidplus.gem.gov.in/showbidDocument/123456',
  boqItems: [],
  consignees: [],
  requiredDocuments: [],
  ...overrides,
});

describe('GeMLiveSyncService', () => {
  it('starts empty instead of displaying fixture or demo bids', () => {
    const stats = GeMLiveSyncService.getLiveStats();
    assert.equal(stats.dataSource, 'EMPTY');
    assert.equal(stats.syncedLocalBidsCount, 0);
  });

  it('maps only fields present in the official public response', () => {
    const bid = GeMLiveSyncService.mapPortalBid({
      b_id: [123456],
      b_bid_number: ['GEM/2026/B/1234567'],
      b_category_name: ['Clinical Equipment'],
      bbt_title: ['Clinical Infant Warmer'],
      b_total_quantity: [4],
      b_bid_type: [1],
      final_end_date_sort: ['2099-11-02T13:00:00Z'],
      qtr_dir: ['OctQ426'],
      b_is_new_upload: [3],
      ba_official_details_minName: ['Ministry of Health'],
      ba_official_details_deptName: ['Department of Health'],
    });

    assert.ok(bid);
    assert.equal(bid?.bidNumber, 'GEM/2026/B/1234567');
    assert.equal(bid?.title, 'Clinical Infant Warmer');
    assert.equal(bid?.estimatedBidValueInr, undefined);
    assert.equal(bid?.requiredDocuments?.length, 0);
    assert.equal(bid?.publishedFields?.requirements, false);
    assert.ok(bid?.docUrl.includes('bidplus-global.gem.gov.in/showbidDocument/123456/'));
  });

  it('filters and reconciles records inserted by a live sync', () => {
    const active = makeBid({ bidNumber: 'GEM/2026/B/ACTIVE_TEST', title: 'Solar equipment' });
    const service = makeBid({ bidNumber: 'GEM/2026/B/SERVICE_TEST', type: 'SERVICE', title: 'Facility service' });
    const expired = makeBid({
      bidNumber: 'GEM/2026/B/EXPIRED_TEST',
      closingTimeUtc: new Date(Date.now() - 3600000).toISOString(),
    });

    GeMLiveSyncService.ingestLiveBids([active, service, expired], 3);
    assert.equal(GeMLiveSyncService.getOngoingBids().some((bid) => bid.bidNumber === active.bidNumber), true);
    assert.equal(GeMLiveSyncService.getOngoingBids().some((bid) => bid.bidNumber === expired.bidNumber), false);
    assert.equal(GeMLiveSyncService.getLiveBids({ type: 'SERVICE' })[0]?.bidNumber, service.bidNumber);
    assert.equal(GeMLiveSyncService.getBidById(active.bidNumber)?.title, 'Solar equipment');
  });

  it('notifies subscribers when fresh live records are ingested', () => {
    let notified = false;
    const unsubscribe = GeMLiveSyncService.subscribe((bids, stats) => {
      notified = true;
      assert.ok(bids.length > 0);
      assert.ok(stats.syncedLocalBidsCount > 0);
    });

    GeMLiveSyncService.ingestLiveBids([makeBid({ bidNumber: 'GEM/2026/B/LIVE_TEST' })]);
    unsubscribe();
    assert.equal(notified, true);
  });
});
