import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GeMLiveSyncService, extractCsrfTokenFromHtml } from '../services/GeMLiveSyncService.ts';
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

  it('extracts csrf_bd_gem_nk directly from bidplus.gem.gov.in HTML or cookie fallback', () => {
    const htmlSample = `var post_array = {'csrf_bd_gem_nk': 'efe6db721a77175d39826d6ebbf15710'};`;
    assert.equal(extractCsrfTokenFromHtml(htmlSample), 'efe6db721a77175d39826d6ebbf15710');

    const cookieFallback = extractCsrfTokenFromHtml(
      '<html></html>',
      'ci_session=abc123; csrf_gem_cookie=970052ec694ab5f4d16604a1852119f3'
    );
    assert.equal(cookieFallback, '970052ec694ab5f4d16604a1852119f3');
  });

  it('maps national bidplus service RAs and high-value flags accurately without guessing values', () => {
    const bid = GeMLiveSyncService.mapPortalBid({
      b_id: [10172181],
      b_id_parent: [9812036],
      b_bid_number: ['GEM/2026/R/771126'],
      b_bid_number_parent: ['GEM/2026/B/8100001'],
      b_category_name: ['Manpower Outsourcing Service'],
      b_total_quantity: [25],
      b_bid_type: [2],
      b_type: [1],
      b_bid_to_ra: [1],
      is_high_value: [1],
      final_start_date_sort: ['2026-11-10T10:00:00Z'],
      final_end_date_sort: ['2099-11-18T16:30:47Z'],
      ba_official_details_deptName: ['Higher Education Department'],
    });

    assert.ok(bid);
    assert.equal(bid?.type, 'SERVICE');
    assert.equal(bid?.isRa, true);
    assert.equal(bid?.isHighValue, true);
    assert.equal(bid?.parentBidNumber, 'GEM/2026/B/8100001');
    assert.equal(bid?.parentBidId, '9812036');
    assert.equal(bid?.estimatedBidValueInr, undefined);
    assert.equal(bid?.docUrl, 'https://bidplus.gem.gov.in/showradocumentPdf/10172181');
    assert.equal(
      bid?.relatedDocuments?.[0]?.url,
      'https://bidplus.gem.gov.in/showbidDocument/9812036'
    );
  });

  it('merges parallel multi-page batches cleanly without duplicates and tracks hasMore accurately', async () => {
    const origEnsure = GeMLiveSyncService.ensurePortalSession;
    const origQuery = GeMLiveSyncService.queryLivePortal;
    try {
      GeMLiveSyncService.ensurePortalSession = async () => ({
        csrfToken: 'test-token',
        cookieHeader: '',
        acquiredAt: Date.now(),
      });
      GeMLiveSyncService.queryLivePortal = async (opts = {}) => {
        const page = opts.page ?? 1;
        const base = (page - 1) * 10;
        return {
          bids: [
            makeBid({ bidNumber: `GEM/2026/B/${8000000 + base + 1}` }),
            makeBid({ bidNumber: `GEM/2026/B/${8000000 + base + 2}` }),
          ],
          total: 43962,
          page,
          hasMore: true,
          portalOrigin: 'bidplus.gem.gov.in',
        };
      };

      const batch = await GeMLiveSyncService.queryLivePortalBatch({ page: 4 }, 3);
      assert.equal(batch.bids.length, 6);
      assert.equal(batch.total, 43962);
      assert.equal(batch.lastPageFetched, 6);
      assert.equal(batch.hasMore, true);
    } finally {
      GeMLiveSyncService.ensurePortalSession = origEnsure;
      GeMLiveSyncService.queryLivePortal = origQuery;
    }
  });
});
