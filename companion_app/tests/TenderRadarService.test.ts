import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  TenderRadarService,
  buildClosingReminderUrl,
  buildSavedBookmarksReview,
  filterRelevantRadarBids,
  pickBestGeMSearchQuery,
  sanitizeRadarKeyword,
} from '../services/TenderRadarService.ts';
import { GeMLiveSyncService } from '../services/GeMLiveSyncService.ts';
import type { DeconstructedBidDoc } from '../types/index.ts';

const makeBid = (bidNumber: string, title: string, hoursAhead = 36): DeconstructedBidDoc => ({
  bidNumber,
  b_id: bidNumber.replace(/\D/g, ''),
  title,
  department: 'Department of Electronics',
  ministry: 'Ministry of Electronics',
  type: 'PRODUCT',
  startTimeUtc: new Date(Date.now() - 3600 * 1000).toISOString(),
  closingTimeUtc: new Date(Date.now() + hoursAhead * 3600 * 1000).toISOString(),
  docUrl: `https://bidplus.gem.gov.in/showbidDocument/${bidNumber.replace(/\D/g, '')}`,
  boqItems: [{ itemTitle: title, quantity: 10, unit: 'Units', specsSummary: '' }],
  consignees: [],
  requiredDocuments: [],
});

describe('TenderRadarService - Daily Tender Radar & Watchlist', () => {
  beforeEach(() => {
    TenderRadarService.resetForTests();
  });

  it('sanitizes, deduplicates case-insensitively, and caps saved keywords at 6', async () => {
    assert.equal(sanitizeRadarKeyword('  Solar!!   Panels  '), 'Solar Panels');

    const state = await TenderRadarService.saveConfig(
      {
        keywords: ['Solar', 'solar', 'CCTV', 'Laptop', 'Medical', 'Furniture', 'Printer', 'Extra'],
        vehicleFilter: 'product',
        highValueOnly: true,
      },
      false
    );

    assert.deepEqual(state.config.keywords, [
      'Solar',
      'CCTV',
      'Laptop',
      'Medical',
      'Furniture',
      'Printer',
    ]);
    assert.equal(state.config.vehicleFilter, 'product');
    assert.equal(state.config.highValueOnly, true);
  });

  it('anchors multi-word queries on distinctive nouns and filters out GeM OR-search noise', () => {
    assert.equal(pickBestGeMSearchQuery('Air Conditioner'), 'Conditioner');
    assert.equal(pickBestGeMSearchQuery('Water Purifier'), 'Purifier');
    assert.equal(pickBestGeMSearchQuery('Office Chair'), 'Chair');
    assert.equal(pickBestGeMSearchQuery('Solar Panel'), 'Solar');
    assert.equal(pickBestGeMSearchQuery('Laptop'), 'Laptop');

    const mixedAc = [
      makeBid('GEM/2026/R/778011', 'Cricket Bat,Cricket Ball,Volley Ball Net'),
      makeBid('GEM/2026/R/778005', 'Repair of Diesel Generators DG Sets'),
      makeBid('GEM/2026/B/8323725', 'Window Air Conditioner Including Green AC'),
      makeBid('GEM/2026/B/8249632', 'Split Air Conditioner Wall Mount Type (V3)'),
    ];
    const filteredAc = filterRelevantRadarBids('Air Conditioner', mixedAc);
    assert.equal(filteredAc.length, 2);
    assert.ok(filteredAc.every((b) => /conditioner/i.test(b.title)));

    const mixedPurifier = [
      makeBid('GEM/2026/R/777933', 'Telescopic Ladder 24 feet heavy duty'),
      makeBid('GEM/2026/R/777115', 'ANNUAL MAINTENANCE SERVICES FOR WATER PURIFICATION SYSTEM'),
      makeBid('GEM/2026/B/8321543', 'Heavy duty Mixer Grinder,Portable water Purifier'),
    ];
    const filteredPurifier = filterRelevantRadarBids('Water Purifier', mixedPurifier);
    assert.equal(filteredPurifier.length, 2);
  });

  it('toggles watched tenders, checks live corrigenda, and notifies subscribers', async () => {
    const origFetchOther = GeMLiveSyncService.fetchBidOtherDetails;
    try {
      GeMLiveSyncService.fetchBidOtherDetails = async () => ({
        hasCorrigendum: true,
        hasRepresentation: false,
        checkedAt: new Date().toISOString(),
      });

      const bid = makeBid('GEM/2026/B/9001111', 'Solar Rooftop Plant 50kW', 12);
      let notifyCount = 0;
      const unsub = TenderRadarService.subscribe(() => {
        notifyCount += 1;
      });

      const added = await TenderRadarService.toggleWatch(bid);
      assert.equal(added, true);
      assert.equal(TenderRadarService.isWatched(bid.bidNumber), true);

      await TenderRadarService.checkWatchedCorrigenda();
      const watchedRecord = TenderRadarService.getState().watched[0];
      assert.equal(watchedRecord?.hasCorrigendum, true);
      assert.ok(notifyCount >= 2);

      const removed = await TenderRadarService.toggleWatch(bid);
      assert.equal(removed, false);
      assert.equal(TenderRadarService.isWatched(bid.bidNumber), false);
      unsub();
    } finally {
      GeMLiveSyncService.fetchBidOtherDetails = origFetchOther;
    }
  });

  it('streams parallel keyword queries, deduplicates overlapping matches, flags NEW on repeat visits, and clears NEW via markAllSeen', async () => {
    const origEnsure = GeMLiveSyncService.ensurePortalSession;
    const origQuery = GeMLiveSyncService.queryLivePortal;

    let callRound = 1;
    try {
      GeMLiveSyncService.ensurePortalSession = async () => ({
        csrfToken: 'radar-test-token',
        cookieHeader: '',
        acquiredAt: Date.now(),
      });
      GeMLiveSyncService.queryLivePortal = async (opts = {}) => {
        const kw = opts.searchBid || '';
        if (kw === 'Solar') {
          const list =
            callRound === 1
              ? [makeBid('GEM/2026/B/8100001', 'Solar CCTV Street Light LED')]
              : [
                  makeBid('GEM/2026/B/8100001', 'Solar CCTV Street Light LED'),
                  makeBid('GEM/2026/B/8100099', 'Solar Hybrid Inverter 10kVA'),
                ];
          return { bids: list, total: 10, page: 1, hasMore: false, portalOrigin: 'bidplus.gem.gov.in' };
        }
        return {
          bids: [
            makeBid('GEM/2026/B/8100001', 'Solar CCTV Street Light LED'), // overlaps with Solar!
            makeBid('GEM/2026/B/8200002', 'IP CCTV Surveillance Camera'),
          ],
          total: 10,
          page: 1,
          hasMore: false,
          portalOrigin: 'bidplus.gem.gov.in',
        };
      };

      await TenderRadarService.saveConfig({ keywords: ['Solar', 'CCTV'] }, false);
      const state1 = await TenderRadarService.refreshRadar(true);
      const matches1 = TenderRadarService.getAggregatedMatches(state1);

      assert.equal(matches1.length, 2, 'Overlapping bid should be deduplicated across keywords');
      assert.equal(matches1.filter((m) => m.isNew).length, 0, 'First run establishes baseline with 0 NEW');
      const overlap = matches1.find((m) => m.bid.bidNumber === 'GEM/2026/B/8100001');
      assert.deepEqual(overlap?.matchedKeywords, ['Solar', 'CCTV']);

      // Round 2: new tender GEM/2026/B/8100099 arrives -> flagged as isNew = true and sorted first
      callRound = 2;
      const state2 = await TenderRadarService.refreshRadar(true);
      const matches2 = TenderRadarService.getAggregatedMatches(state2);
      assert.equal(matches2.length, 3);
      assert.equal(matches2[0].bid.bidNumber, 'GEM/2026/B/8100099');
      assert.equal(matches2[0].isNew, true);

      // Mark all seen clears NEW badges cleanly
      await TenderRadarService.markAllSeen();
      const afterSeen = TenderRadarService.getAggregatedMatches(TenderRadarService.getState());
      assert.equal(afterSeen.filter((m) => m.isNew).length, 0);

      // Changing vehicleFilter or highValueOnly invalidates stale cached results immediately
      const afterFilterChange = await TenderRadarService.saveConfig({ highValueOnly: true }, false);
      assert.deepEqual(Object.keys(afterFilterChange.byKeyword), []);
    } finally {
      GeMLiveSyncService.ensurePortalSession = origEnsure;
      GeMLiveSyncService.queryLivePortal = origQuery;
    }
  });

  it('builds a valid Calendar closing reminder deep-link containing bid number and verified GeM PDF URL', () => {
    const bid = makeBid('GEM/2026/B/8120126', 'FRP Storage Tank (V2)', 48);
    const url = buildClosingReminderUrl(bid);
    assert.ok(url.startsWith('https://calendar.google.com/calendar/render?'));
    assert.ok(url.includes('GEM%2F2026%2FB%2F8120126'));
    assert.ok(url.includes('bidplus.gem.gov.in'));
  });

  it('categorizes saved bookmarks into Open (urgent-first) vs Closed/Cancelled and clears only closed entries', async () => {
    const now = Date.now();
    const urgentOpen = makeBid('GEM/2026/B/9100001', 'Urgent Oxygen Concentrator', 6);
    const laterOpenRa: DeconstructedBidDoc = {
      ...makeBid('GEM/2026/R/9100002', 'Live Reverse Auction Cables', 72),
      type: 'RA',
      isRa: true,
    };
    const closedBid = makeBid('GEM/2026/B/9100003', 'Expired Lab Centrifuge', -10);
    const cancelledBid: DeconstructedBidDoc = {
      ...makeBid('GEM/2026/B/9100004', 'Cancelled Security Contract', 24),
      lifecycleStatus: 'CANCELLED',
      isCancelled: true,
    };

    const review = buildSavedBookmarksReview(
      [
        { bid: laterOpenRa, savedAtUtc: new Date(now - 5000).toISOString() },
        { bid: closedBid, savedAtUtc: new Date(now - 4000).toISOString() },
        { bid: urgentOpen, savedAtUtc: new Date(now - 3000).toISOString() },
        { bid: cancelledBid, savedAtUtc: new Date(now - 2000).toISOString() },
      ],
      now
    );

    assert.equal(review.schemaVersion, 2);
    assert.equal(review.totalCount, 4);
    assert.equal(review.openCount, 2);
    assert.equal(review.closedCount, 2);
    // Open sorted soonest closing first
    assert.equal(review.openBookmarks[0].bidNumber, 'GEM/2026/B/9100001');
    assert.equal(review.openBookmarks[0].detailedStatus, 'CLOSING_SOON');
    assert.equal(review.openBookmarks[1].bidNumber, 'GEM/2026/R/9100002');
    assert.equal(review.openBookmarks[1].detailedStatus, 'LIVE_RA');

    // Closed contains both expired and cancelled tenders with proper labels
    const closedById = new Map(review.closedBookmarks.map((b) => [b.bidNumber, b]));
    assert.equal(closedById.get('GEM/2026/B/9100003')?.detailedStatus, 'CLOSED');
    assert.ok(closedById.get('GEM/2026/B/9100003')?.remainingLabel.includes('Closed'));
    assert.equal(closedById.get('GEM/2026/B/9100004')?.detailedStatus, 'CANCELLED');
    assert.equal(closedById.get('GEM/2026/B/9100004')?.remainingLabel, 'Cancelled');

    // Service-level toggle + clearClosedBookmarks keeps Open tenders untouched
    await TenderRadarService.toggleWatch(urgentOpen);
    await TenderRadarService.toggleWatch(closedBid);
    await TenderRadarService.toggleWatch(cancelledBid);
    const removed = await TenderRadarService.clearClosedBookmarks(now);
    assert.equal(removed, 2);
    const remaining = TenderRadarService.getSavedBookmarksReview(now);
    assert.equal(remaining.openCount, 1);
    assert.equal(remaining.closedCount, 0);
    assert.equal(remaining.openBookmarks[0].bidNumber, 'GEM/2026/B/9100001');
  });
});
