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

  it('preserves live showradocumentPdf and showdirectradocumentPdf URLs without overwriting with bid number', () => {
    const raUrl = 'https://bidplus.gem.gov.in/showradocumentPdf/10177309';
    assert.strictEqual(PortalDocService.resolvePdfUrl('GEM/2026/R/771831', raUrl), raUrl);

    const directRaUrl = 'https://bidplus.gem.gov.in/showdirectradocumentPdf/10199999';
    assert.strictEqual(PortalDocService.resolvePdfUrl('GEM/2026/R/779999', directRaUrl), directRaUrl);
  });

  it('exposes both RA document and Original Parent Bid PDF when parentBidId is present', () => {
    const documents = PortalDocService.getOfficialDocuments({
      bidNumber: 'GEM/2026/R/771831',
      parentBidNumber: 'GEM/2026/B/7966240',
      parentBidId: '9812036',
      b_id: '10177309',
      isRa: true,
      title: 'Heating Cable',
      department: 'Department Of Atomic Energy',
      ministry: 'PMO',
      type: 'RA',
      closingTimeUtc: '2026-11-20T14:00:00Z',
      docUrl: 'https://bidplus.gem.gov.in/showradocumentPdf/10177309',
    });

    assert.deepStrictEqual(
      documents.map((d) => ({ id: d.id, url: d.url })),
      [
        { id: 'bid-document', url: 'https://bidplus.gem.gov.in/showradocumentPdf/10177309' },
        { id: 'parent-bid-document', url: 'https://bidplus.gem.gov.in/showbidDocument/9812036' },
      ]
    );
    assert.strictEqual(documents[0].label, 'RA document');
    assert.strictEqual(documents[1].label, 'Original Bid (GEM/2026/B/7966240)');
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

  it('rejects lookalike domains from official document links while allowing official GeM attachment subdomains', () => {
    assert.strictEqual(PortalDocService.isSafeGemUrl('https://bidplus.gem.gov.in.evil.example/document.pdf'), false);
    assert.strictEqual(PortalDocService.isSafeGemUrl('http://bidplus.gem.gov.in/document.pdf'), false);
    assert.strictEqual(PortalDocService.isSafeGemUrl('https://bidplus.gem.gov.in/document.pdf'), true);
    assert.strictEqual(
      PortalDocService.isSafeGemUrl(
        'https://mkp.gem.gov.in/catalog_data/catalog_support_document/buyer_documents/123/CatalogAttrs/SpecificationDocument/spec.pdf'
      ),
      true
    );
    assert.strictEqual(
      PortalDocService.isSafeGemUrl(
        'https://fulfilment.gem.gov.in/contract/slafds?fileDownloadPath=SLA_UPLOAD_PATH/2026/Sep/GEM_2026_B_8066439/CLM0010/atc.pdf'
      ),
      true
    );
    assert.strictEqual(
      PortalDocService.isSafeGemUrl('https://admin.gem.gov.in/apis/v1/gtc/pdfByDate/?date=20260922'),
      true
    );
    assert.strictEqual(
      PortalDocService.isSafeGemUrl('https://bidnext.gem.gov.in/bidnext/public.jsp'),
      true
    );
  });

  it('infers DOC and ZIP formats from attachment URLs and detects Word/Excel files from GeM fulfilment headers', () => {
    assert.strictEqual(
      PortalDocService.inferFileFormat('https://fulfilment.gem.gov.in/files/ATC_clause.doc'),
      'DOC'
    );
    assert.strictEqual(
      PortalDocService.inferFileFormat('https://fulfilment.gem.gov.in/files/specs.docx'),
      'DOC'
    );
    assert.strictEqual(
      PortalDocService.inferFileFormat('https://fulfilment.gem.gov.in/files/drawings.zip'),
      'ZIP'
    );

    const wordProbe = PortalDocService.detectFormatFromHeaders(
      'application/msword',
      'attachment; filename="ATC_2ccd6eca_prabhakar@223.doc"',
      'https://fulfilment.gem.gov.in/contract/documentdownload'
    );
    assert.strictEqual(wordProbe.format, 'DOC');
    assert.strictEqual(wordProbe.filename, 'ATC_2ccd6eca_prabhakar@223.doc');

    const excelProbe = PortalDocService.detectFormatFromHeaders(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'attachment; filename="BOQ_Pricing.xlsx"',
      'https://fulfilment.gem.gov.in/contract/documentdownload'
    );
    assert.strictEqual(excelProbe.format, 'XLSX');
    assert.strictEqual(excelProbe.filename, 'BOQ_Pricing.xlsx');

    const pdfProbe = PortalDocService.detectFormatFromHeaders(
      'application/pdf',
      'inline; filename="GeM-Bidding-9835867.pdf"',
      'https://bidplus.gem.gov.in/showbidDocument/9835867'
    );
    assert.strictEqual(pdfProbe.format, 'PDF');
    assert.strictEqual(pdfProbe.filename, 'GeM-Bidding-9835867.pdf');
  });
});
