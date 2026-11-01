import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PortalDocService } from '../services/PortalDocService.ts';

describe('PortalDocService', () => {
  it('extracts numeric bid ID and resolves to bidplus showbidDocument URL', () => {
    const url = PortalDocService.resolvePdfUrl('GEM/2026/B/8124130', 'https://gem.gov.in/bids/GEM-2026-B-8124130.pdf');
    assert.strictEqual(url, 'https://bidplus.gem.gov.in/showbidDocument/8124130');
  });

  it('preserves existing verified showbidDocument URLs', () => {
    const original = 'https://bidplus.gem.gov.in/showbidDocument/8124130';
    const url = PortalDocService.resolvePdfUrl('GEM/2026/B/8124130', original);
    assert.strictEqual(url, original);
  });

  it('replaces generic all-bids URL when numeric bid ID is present', () => {
    const url = PortalDocService.resolvePdfUrl('GEM/2026/B/8124140', 'https://bidplus.gem.gov.in/all-bids');
    assert.strictEqual(url, 'https://bidplus.gem.gov.in/showbidDocument/8124140');
  });

  it('falls back to all-bids if bid number has no numeric ID and docUrl is empty', () => {
    const url = PortalDocService.resolvePdfUrl('GEM-NO-NUM', '');
    assert.strictEqual(url, 'https://bidplus.gem.gov.in/all-bids');
  });

  it('builds one official in-app document from the public bid record', () => {
    const documents = PortalDocService.getOfficialDocuments({
      bidNumber: 'GEM/2026/B/8124130',
      title: 'Published bid',
      department: 'Department',
      ministry: 'Ministry',
      type: 'PRODUCT',
      closingTimeUtc: '2026-12-01T00:00:00.000Z',
      docUrl: 'https://bidplus.gem.gov.in/showbidDocument/8124130',
      relatedDocuments: [{
        id: 'specification',
        label: 'Technical specification',
        kind: 'SPECIFICATION',
        url: 'https://bidplus-global.gem.gov.in/specification/8124130',
        source: 'PUBLIC_GEM_RECORD',
      }, {
        id: 'unsafe',
        label: 'Unverified attachment',
        kind: 'OTHER',
        url: 'https://example.invalid/specification.pdf',
        source: 'PUBLIC_GEM_RECORD',
      }],
    });

    assert.deepStrictEqual(documents.map((document) => document.id), ['bid-document', 'specification']);
  });

  it('rejects lookalike domains from official document links', () => {
    assert.strictEqual(PortalDocService.isSafeGemUrl('https://bidplus.gem.gov.in.evil.example/document.pdf'), false);
    assert.strictEqual(PortalDocService.isSafeGemUrl('https://bidplus.gem.gov.in/document.pdf'), true);
  });
});
