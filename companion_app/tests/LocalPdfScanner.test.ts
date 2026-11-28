import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  extractPdfDetails,
  extractPdfText,
  getSharedPdfCacheFileName,
  isValidPdfBytes,
  LocalPdfScanner,
} from '../services/LocalPdfScanner.ts';

describe('LocalPdfScanner', () => {
  it('extracts readable PDF text operators without a server round trip', () => {
    const source = 'BT (Bid Title: LED Street Light) Tj (Department: Public Works) Tj ET';
    assert.equal(extractPdfText(source), 'Bid Title: LED Street Light\nDepartment: Public Works');
  });

  it('maps only labeled PDF values into bid details', () => {
    const text = [
      'Bid Title: LED Street Light',
      'Department: Public Works',
      'Ministry: Ministry of Housing',
      'Bid Closing Date: 22/11/2026 15:00',
      'Estimated Bid Value: ₹1,25,000',
      'EMD Amount: Rs. 2,500',
    ].join('\n');

    assert.deepEqual(extractPdfDetails(text, 'GEM/2026/B/123'), {
      bidNumber: 'GEM/2026/B/123',
      title: 'LED Street Light',
      department: 'Public Works',
      ministry: 'Ministry of Housing',
      closingDate: '22/11/2026 15:00',
      estimatedValueInr: 125000,
      emdAmountInr: 2500,
    });
  });

  it('does not fabricate fields when the PDF text does not publish them', () => {
    assert.deepEqual(extractPdfDetails('General tender terms only', 'GEM/2026/B/456'), {
      bidNumber: 'GEM/2026/B/456',
    });
  });

  it('keeps the device scan bounded to protect storage and battery', () => {
    assert.equal(LocalPdfScanner.maxScanBytes, 12 * 1024 * 1024);
  });

  it('validates %PDF- magic header bytes and rejects HTML/empty GeM responses', () => {
    const validPdf = new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<< /Title () >>');
    const offsetPdf = new TextEncoder().encode('\n\n%PDF-1.7\n4 0 obj');
    const htmlErr = new TextEncoder().encode('<!DOCTYPE html><html><title>404</title></html>');
    const empty = new Uint8Array(0);

    assert.equal(isValidPdfBytes(validPdf), true);
    assert.equal(isValidPdfBytes(offsetPdf), true);
    assert.equal(isValidPdfBytes(htmlErr), false);
    assert.equal(isValidPdfBytes(empty), false);
  });

  it('builds deterministic shared cache filenames for Railway and Bid PDFs', () => {
    const a = getSharedPdfCacheFileName('https://bidplus.gem.gov.in/showbidDocument/10097702');
    const aDup = getSharedPdfCacheFileName('https://bidplus.gem.gov.in/showbidDocument/10097702#page=1');
    const b = getSharedPdfCacheFileName('https://bidplus.gem.gov.in/showbidDocument/10226469');

    assert.equal(a, aDup);
    assert.notEqual(a, b);
    assert.ok(a.startsWith('gem-pdf-v4-') && a.endsWith('.pdf'));
  });
});
