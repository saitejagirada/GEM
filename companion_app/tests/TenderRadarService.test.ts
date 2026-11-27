import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  TenderRadarService,
  buildClosingReminderUrl,
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

  it('streams parallel keyword queries, deduplicates overlapping matches, and flags NEW tenders on repeat visits', async () => {
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
              ? [makeBid('GEM/2026/B/8100001', 'Solar Street Light LED')]
              : [
                  makeBid('GEM/2026/B/8100001', 'Solar Street Light LED'),
                  makeBid('GEM/2026/B/8100099', 'Solar Hybrid Inverter 10kVA'),
                ];
          return { bids: list, total: 320, page: 1, hasMore: true, portalOrigin: 'bidplus.gem.gov.in' };
        }
        return {
          bids: [
            makeBid('GEM/2026/B/8100001', 'Solar Street Light LED'), // overlaps with Solar!
            makeBid('GEM/2026/B/8200002', 'IP CCTV Surveillance Camera'),
          ],
          total: 360,
          page: 1,
          hasMore: true,
          portalOrigin: 'bidplus.gem.gov.in',
        };
      };

      await TenderRadarService.saveConfig({ keywords: ['Solar', 'CCTV'] }, false);
      const state1 = await TenderRadarService.refreshRadar(true);
      const matches1 = TenderRadarService.getAggregatedMatches(state1);

      assert.equal(matches1.length, 2, 'Overlapping bid should be deduplicated across keywords');
      const overlap = matches1.find((m) => m.bid.bidNumber === 'GEM/2026/B/8100001');
      assert.deepEqual(overlap?.matchedKeywords, ['Solar', 'CCTV']);

      // Round 2: new tender GEM/2026/B/8100099 arrives -> flagged as isNew = true and sorted first
      callRound = 2;
      const state2 = await TenderRadarService.refreshRadar(true);
      const matches2 = TenderRadarService.getAggregatedMatches(state2);
      assert.equal(matches2.length, 3);
      assert.equal(matches2[0].bid.bidNumber, 'GEM/2026/B/8100099');
      assert.equal(matches2[0].isNew, true);
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
});
