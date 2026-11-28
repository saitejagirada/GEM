import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GeMServicesClient,
  stripHtmlToPlainText,
  parseServiceSellerDetailPayload,
  filterAndSortServiceSellers,
} from '../services/GeMServicesClient.ts';
import {
  OFFICIAL_TRENDING_SERVICES,
  OFFICIAL_EMERGING_SERVICES,
} from '../services/MarketplaceService.ts';

describe('GeMServicesClient & Live Services Taxonomy', () => {
  it('cleans GeM Service HTML descriptions and SLA tables into readable plain text', () => {
    const raw =
      '<p><strong>1.&nbsp;Preamble</strong></p><p>Security &amp; Manpower &ldquo;STC&rdquo; &ndash; governed by GeM.</p>';
    const clean = stripHtmlToPlainText(raw);
    assert.ok(clean.includes('1. Preamble'));
    assert.ok(clean.includes('Security & Manpower "STC" – governed by GeM.'));
    assert.ok(!clean.includes('<p>'));
    assert.ok(!clean.includes('&nbsp;'));
  });

  it('builds official mkp.gem.gov.in service URLs and maps all 30 curated services to real GeM service IDs', () => {
    const allCurated = [...OFFICIAL_TRENDING_SERVICES, ...OFFICIAL_EMERGING_SERVICES];
    assert.equal(allCurated.length, 30);
    for (const srv of allCurated) {
      assert.ok(
        srv.gemServiceId && srv.gemServiceId.startsWith('services_home_'),
        `Expected valid GeM service ID for ${srv.name}, got ${srv.gemServiceId}`
      );
    }
    assert.equal(
      GeMServicesClient.buildPortalUrl('services_home_manp_manp'),
      'https://mkp.gem.gov.in/services#!/browse/services_home_manp_manp/open'
    );
  });

  it('parses live mkp.gem.gov.in get_seller_details payload including project value and certificates', () => {
    const parsed = parseServiceSellerDetailPayload('services_home_rest_ca11785255', '1954213', {
      meta: { result: 'success' },
      result: {
        seller_certificate_hash: {
          'FSSAI License': [{ certificate_hash: 'abc' }],
          'ISO 9001': [{ certificate_hash: 'def' }, { certificate_hash: 'ghi' }],
        },
        approved_project_details: {
          total_verified_projects: { value: 1 },
          total_project_value: { value: 27292164.0 },
        },
      },
    });

    assert.ok(parsed);
    assert.equal(parsed.totalVerifiedProjects, 1);
    assert.equal(parsed.totalProjectValueInr, 27292164);
    assert.deepEqual(parsed.certificates, [
      { category: 'FSSAI License', count: 1 },
      { category: 'ISO 9001', count: 2 },
    ]);

    assert.equal(
      parseServiceSellerDetailPayload('services_home_rest_ca11785255', '999', {
        meta: { result: 'invalid_input' },
        result: null,
      }),
      null
    );
  });

  it('searches service providers by name or GeM seller ID and sorts by verified project value', () => {
    const sample = [
      { sellerId: '55669', name: 'R.R.GUPTA & SONS', verifiedProjects: 0, totalValue: null },
      { sellerId: '625083', name: 'SAI ENTERPRISES', verifiedProjects: 0, totalValue: null },
      { sellerId: '1954213', name: 'SAI INVESTIGATION AND SECURITY SERVICES', verifiedProjects: 1, totalValue: 27292164 },
      { sellerId: '544067', name: 'JANHITKARI SEWA SAMITI', verifiedProjects: 1, totalValue: 4984041 },
    ];

    const byName = filterAndSortServiceSellers(sample, 'sai', 'ALL');
    assert.deepEqual(byName.map((s) => s.sellerId), ['625083', '1954213']);

    const byId = filterAndSortServiceSellers(sample, '544067', 'ALL');
    assert.deepEqual(byId.map((s) => s.name), ['JANHITKARI SEWA SAMITI']);

    const verifiedOnly = filterAndSortServiceSellers(sample, '', 'VERIFIED');
    assert.deepEqual(verifiedOnly.map((s) => s.sellerId), ['1954213', '544067']);
  });

  it('auto-fetches all multi-page service providers via fetchAllServiceSellers, deduplicates, and caches', async () => {
    const originalFetch = globalThis.fetch;
    let callCount = 0;

    globalThis.fetch = (async (input: string | URL | Request) => {
      callCount += 1;
      const url = String(input);
      const isPage1 = url.includes('page=1&');
      const isPage2 = url.includes('page=2&');
      const seller_list = isPage1
        ? {
            '1001': { name: 'ALPHA SECURITY' },
            '1002': { name: 'BETA SERVICES' },
          }
        : isPage2
          ? {
              '1002': { name: 'BETA SERVICES' },
              '3286956': { name: 'MERCURY SECURITY SERVICES' },
            }
          : {};
      const srvc_catalog_hash = isPage2
        ? { '3286956': { verified_projects: 2, total_value: 8500000 } }
        : {};
      return new Response(
        JSON.stringify({
          result: {
            seller_list,
            srvc_catalog_hash,
            pagination_meta: { total_items: 150, per_page: 10, page: isPage1 ? '1' : '2' },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    try {
      const progressEvents: Array<{ count: number; done: boolean }> = [];
      const res = await GeMServicesClient.fetchAllServiceSellers('services_test_auto_all', {
        chunkSize: 100,
        concurrency: 2,
        onProgress: (list, _total, done) => {
          progressEvents.push({ count: list.length, done });
        },
      });

      assert.equal(res.sellers.length, 3);
      assert.ok(res.sellers.some((s) => s.name === 'MERCURY SECURITY SERVICES'));
      assert.ok(progressEvents.some((e) => e.done === true));

      const callsAfterFirst = callCount;
      const cachedRes = await GeMServicesClient.fetchAllServiceSellers('services_test_auto_all');
      assert.equal(cachedRes.sellers.length, 3);
      assert.equal(callCount, callsAfterFirst);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
