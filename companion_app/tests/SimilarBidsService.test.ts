import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { SimilarBidsService } from '../services/SimilarBidsService.ts';
import { GeMLiveSyncService } from '../services/GeMLiveSyncService.ts';
import type { DeconstructedBidDoc } from '../types/index.ts';

describe('SimilarBidsService - High-Precision Category Matching & Strict Relevance Filter', () => {
  beforeEach(() => {
    SimilarBidsService.clearCacheForTests();
  });

  it('splits GeM no-space multi-category commas without breaking internal commas', () => {
    const candidates = SimilarBidsService.buildExactCategoryCandidates({
      title: 'Point of Care Rapid Test Kits for Humans – Dengue, Malaria, Typhoid & Others,Point of Care Rapid',
      categoryDomain: 'Point of Care Rapid Test Kits for Humans – Dengue, Malaria, Typhoid & Others,Point of Care Rapid ',
    });
    assert.strictEqual(
      candidates[0],
      'Point of Care Rapid Test Kits for Humans – Dengue, Malaria, Typhoid & Others'
    );
    assert.strictEqual(candidates[1], 'Point of Care Rapid Test Kits');

    const tank = SimilarBidsService.buildExactCategoryCandidates({
      title: 'FRP Storage Tank (V2),Water Supply Plumbing System,RO Consumables Package',
      categoryDomain: undefined,
    });
    assert.strictEqual(tank[0], 'FRP Storage Tank (V2)');
    assert.strictEqual(tank[1], 'FRP Storage Tank');
  });

  it('strips noisy stock codes, version suffixes, and IS numbers to extract clean domain keywords', () => {
    const q1 = SimilarBidsService.buildSearchKeyword({
      title: 'Portland Pozzolana Cement (Fly Ash Based) (V3) Conforming to IS 1489 (Part 1)',
      categoryDomain: undefined,
    });
    assert.strictEqual(q1, 'Portland Pozzolana Cement');

    const q2 = SimilarBidsService.buildSearchKeyword({
      title: 'JP8115010200,JP8121250005,4000015190, Solar Street LED Luminaire',
      categoryDomain: undefined,
    });
    assert.strictEqual(q2, 'Solar Street LED');

    const q3 = SimilarBidsService.buildSearchKeyword({
      title: 'Custom Bid for Services - Comprehensive Annual Maintenance Charges for CCTVs of Nashik',
      categoryDomain: 'CCTV Maintenance',
    });
    assert.ok(q3.toLowerCase().includes('cctv'));
  });

  it('uses searchType=exact first and excludes the current bid and parent bid', async () => {
    const originalQuery = GeMLiveSyncService.queryLivePortal;
    const calls: Array<{ searchType?: string; searchBid?: string; status?: string }> = [];

    GeMLiveSyncService.queryLivePortal = async (opts = {}) => {
      calls.push({ searchType: opts.searchType, searchBid: opts.searchBid, status: opts.bidStatusType });
      return {
        bids: [
          {
            bidNumber: 'GEM/2026/R/777857',
            title: 'Point of Care Rapid Test Kits for Humans – Dengue, Malaria, Typhoid & Others',
            department: 'Health',
            ministry: 'MoHFW',
            type: 'RA',
            closingTimeUtc: '2026-11-30T10:00:00Z',
            docUrl: 'https://bidplus.gem.gov.in/showradocumentPdf/777857',
          },
          {
            bidNumber: 'GEM/2026/B/7838238',
            title: 'Point of Care Rapid Test Kits for Humans – Dengue, Malaria, Typhoid & Others',
            department: 'Health',
            ministry: 'MoHFW',
            type: 'PRODUCT',
            closingTimeUtc: '2026-10-15T10:00:00Z',
            docUrl: 'https://bidplus.gem.gov.in/showbidDocument/7838238',
          },
          {
            bidNumber: 'GEM/2026/B/8216863',
            title: 'Point of Care Rapid Test Kits for Humans – Dengue, Malaria, Typhoid & Others',
            department: 'AIIMS',
            ministry: 'MoHFW',
            type: 'PRODUCT',
            closingTimeUtc: '2026-11-20T10:00:00Z',
            docUrl: 'https://bidplus.gem.gov.in/showbidDocument/8216863',
          },
        ],
        total: 147,
        page: 1,
        hasMore: true,
        portalOrigin: 'bidplus.gem.gov.in',
      };
    };

    try {
      const currentBid: DeconstructedBidDoc = {
        bidNumber: 'GEM/2026/R/777857',
        parentBidNumber: 'GEM/2026/B/7838238',
        title: 'Point of Care Rapid Test Kits for Humans – Dengue, Malaria, Typhoid & Others,Point of Care Rapid',
        department: 'Health',
        ministry: 'MoHFW',
        type: 'RA',
        closingTimeUtc: '2026-11-30T10:00:00Z',
        docUrl: 'https://bidplus.gem.gov.in/showradocumentPdf/777857',
      };

      const result = await SimilarBidsService.findSimilarConcludedBids(currentBid);
      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0].status, 'bidrastatus');
      assert.strictEqual(calls[0].searchType, 'exact');
      assert.strictEqual(
        calls[0].searchBid,
        'Point of Care Rapid Test Kits for Humans – Dengue, Malaria, Typhoid & Others'
      );
      assert.strictEqual(result.matchMode, 'exact');
      assert.strictEqual(result.bids.length, 1);
      assert.strictEqual(result.bids[0].bidNumber, 'GEM/2026/B/8216863');
    } finally {
      GeMLiveSyncService.queryLivePortal = originalQuery;
    }
  });

  it('rejects noisy unrelated fullText OR-matches and returns honest empty result instead', async () => {
    const originalQuery = GeMLiveSyncService.queryLivePortal;

    GeMLiveSyncService.queryLivePortal = async (opts = {}) => {
      if (opts.searchType === 'exact') {
        return { bids: [], total: 0, page: 1, hasMore: false, portalOrigin: 'bidplus.gem.gov.in' };
      }
      // Simulate GeM's noisy fullText OR blast returning unrelated tenders
      return {
        bids: [
          {
            bidNumber: 'GEM/2026/R/776297',
            title: 'Emergency Light 5W,Rechargeble Torch,Yellow Paper A4 Size,Scribbling Pad',
            department: 'Defence',
            ministry: 'MoD',
            type: 'RA',
            closingTimeUtc: '2026-11-27T11:00:00Z',
            docUrl: 'https://bidplus.gem.gov.in/showradocumentPdf/776297',
          },
          {
            bidNumber: 'GEM/2026/B/8281701',
            title: 'OPERATING SYSTEM SOFTWARE,OFFICE PRODUCTIVITY SUITE',
            department: 'DMA',
            ministry: 'MoD',
            type: 'PRODUCT',
            closingTimeUtc: '2026-11-27T10:00:00Z',
            docUrl: 'https://bidplus.gem.gov.in/showbidDocument/8281701',
          },
          {
            bidNumber: 'GEM/2026/B/8252895',
            title: 'BEVEL GAUGE 200 MM,DRILL POINT ANGLE GAUGE',
            department: 'Labour',
            ministry: 'Gujarat',
            type: 'PRODUCT',
            closingTimeUtc: '2026-11-27T10:00:00Z',
            docUrl: 'https://bidplus.gem.gov.in/showbidDocument/8252895',
          },
        ],
        total: 51859,
        page: 1,
        hasMore: true,
        portalOrigin: 'bidplus.gem.gov.in',
      };
    };

    try {
      const obscureBid: DeconstructedBidDoc = {
        bidNumber: 'GEM/2026/R/776188',
        title: 'GENR 15 KVA X3 IXC GL 500 217532 FUEL STRAINER OIL,11 KVA X3 OIL FILTER',
        department: 'DMA',
        ministry: 'MoD',
        type: 'RA',
        closingTimeUtc: '2026-11-30T10:00:00Z',
        docUrl: 'https://bidplus.gem.gov.in/showradocumentPdf/776188',
      };

      const result = await SimilarBidsService.findSimilarConcludedBids(obscureBid);
      assert.strictEqual(result.matchMode, 'none');
      assert.strictEqual(result.bids.length, 0);
      assert.strictEqual(result.totalFound, 0);
    } finally {
      GeMLiveSyncService.queryLivePortal = originalQuery;
    }
  });

  it('keeps genuinely matching multi-token tenders in fallback mode while dropping single-word noise', async () => {
    const originalQuery = GeMLiveSyncService.queryLivePortal;

    GeMLiveSyncService.queryLivePortal = async (opts = {}) => {
      if (opts.searchType === 'exact') {
        return { bids: [], total: 0, page: 1, hasMore: false, portalOrigin: 'bidplus.gem.gov.in' };
      }
      return {
        bids: [
          {
            bidNumber: 'GEM/2026/R/775479',
            title: 'Stitching and Tailoring Service - Tailoring; Cotton; Schools',
            department: 'Education',
            ministry: 'State',
            type: 'SERVICE',
            closingTimeUtc: '2026-11-25T10:00:00Z',
            docUrl: 'https://bidplus.gem.gov.in/showradocumentPdf/775479',
          },
          {
            bidNumber: 'GEM/2026/R/774286',
            title: 'Binding and Stitching Services - Offset Printing',
            department: 'Printing',
            ministry: 'State',
            type: 'SERVICE',
            closingTimeUtc: '2026-11-24T10:00:00Z',
            docUrl: 'https://bidplus.gem.gov.in/showradocumentPdf/774286',
          },
          {
            bidNumber: 'GEM/2026/B/8231696',
            title: 'Curtains JD,Curtains cash,Curtains ad',
            department: 'Railways',
            ministry: 'MoR',
            type: 'PRODUCT',
            closingTimeUtc: '2026-11-23T10:00:00Z',
            docUrl: 'https://bidplus.gem.gov.in/showbidDocument/8231696',
          },
        ],
        total: 2983,
        page: 1,
        hasMore: true,
        portalOrigin: 'bidplus.gem.gov.in',
      };
    };

    try {
      const serviceBid: DeconstructedBidDoc = {
        bidNumber: 'GEM/2026/R/777770',
        title: 'Stitching and Tailoring Service - Cutting + Stitching + Tailoring; PWPC; Navy',
        department: 'Defence',
        ministry: 'MoD',
        type: 'SERVICE',
        closingTimeUtc: '2026-11-30T10:00:00Z',
        docUrl: 'https://bidplus.gem.gov.in/showradocumentPdf/777770',
      };

      const result = await SimilarBidsService.findSimilarConcludedBids(serviceBid);
      assert.strictEqual(result.matchMode, 'filtered');
      assert.strictEqual(result.bids.length, 1);
      assert.strictEqual(result.bids[0].bidNumber, 'GEM/2026/R/775479');
      // Must report exact verified match count (1), never GeM's raw OR count (2,983)
      assert.strictEqual(result.totalFound, 1);
    } finally {
      GeMLiveSyncService.queryLivePortal = originalQuery;
    }
  });
});
