import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GeMServicesClient, stripHtmlToPlainText } from '../services/GeMServicesClient.ts';
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
});
