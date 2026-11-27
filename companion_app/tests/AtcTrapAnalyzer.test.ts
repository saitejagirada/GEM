import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AtcTrapAnalyzer } from '../services/AtcTrapAnalyzer.ts';
import type { ExtractedGeMTenderDetails } from '../services/GemPdfExtractor.ts';

describe('AtcTrapAnalyzer - ATC Trap Buckets & Instant PDF Keyword Search', () => {
  const sampleText = `
    Buyer Added Bid Specific Terms and Conditions:
    1. Bidder must submit valid ISO 9001 certificate and NABL accredited lab test report along with bid.
    2. Dedicated/toll free Telephone No. for Service Support and Functional Service Centre in consignee state is mandatory.
    3. Advance Sample approval required within 7 days prior to bulk supply.
    4. Comprehensive onsite warranty of 36 months with 0.5% per week Liquidated Damages penalty on delay.
    5. Option Clause: Purchaser reserves right to increase or decrease the quantity up to 25% at contracted rate.
    6. Turnkey installation and commissioning at site included in quoted price.
  `;

  const sampleDetails: ExtractedGeMTenderDetails = {
    bidNumber: 'GEM/2026/B/999111',
    isEmdExemptForMse: false,
    isEmdExemptForStartup: false,
    msePurchasePreference: false,
    mseExemptionForExpAndTurnover: false,
    startupExemptionForExpAndTurnover: false,
    miiPurchasePreference: false,
    isSplittingApplied: false,
    consignees: [],
    consigneeStateDistribution: {},
    requiredDocuments: [],
    requiresOemAuthorization: false,
    requiresCaTurnoverCertificate: false,
    requiresMiiDeclaration: false,
    requiresGstCertificate: false,
    requiresPastPerformanceDoc: false,
    atcClauses: [
      '1. Bidder must submit valid ISO 9001 certificate and NABL accredited lab test report.',
      '2. Functional Service Centre in consignee state is mandatory.',
      '3. Advance Sample approval required within 7 days.',
      '4. Comprehensive onsite warranty of 36 months with Liquidated Damages penalty.',
      '5. Option Clause: increase or decrease the quantity up to 25%.',
    ],
    isRaEnabled: false,
  };

  it('detects and prioritizes all 6 ATC risk buckets accurately', () => {
    const report = AtcTrapAnalyzer.analyze(sampleDetails, sampleText);
    assert.strictEqual(report.hasSearchableText, true);
    assert.strictEqual(report.traps.length, 6);

    const categories = report.traps.map((t) => t.category);
    assert.ok(categories.includes('CERTIFICATES'));
    assert.ok(categories.includes('LOCAL_PRESENCE'));
    assert.ok(categories.includes('SAMPLE_DEMO'));
    assert.ok(categories.includes('WARRANTY_PENALTY'));
    assert.ok(categories.includes('OPTION_CLAUSE'));
    assert.ok(categories.includes('PAYMENT_DELIVERY'));

    // High-severity traps must appear before MEDIUM/INFO
    assert.strictEqual(report.traps[0].severity, 'HIGH');
    assert.strictEqual(report.traps[report.traps.length - 1].severity, 'INFO');
  });

  it('returns highlighted PDF keyword excerpts safely without regex issues', () => {
    const matches = AtcTrapAnalyzer.searchPdfExcerpts(sampleText, 'NABL');
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].match, 'NABL');
    assert.ok(matches[0].snippet.includes('ISO 9001'));
    assert.ok(matches[0].snippet.includes('lab test report'));

    // Special regex characters in user input must never throw
    const safeSpecial = AtcTrapAnalyzer.searchPdfExcerpts(sampleText, '25%');
    assert.strictEqual(safeSpecial.length, 1);
    assert.strictEqual(safeSpecial[0].match, '25%');
  });

  it('handles empty or short queries gracefully', () => {
    assert.deepStrictEqual(AtcTrapAnalyzer.searchPdfExcerpts(sampleText, 'a'), []);
    assert.deepStrictEqual(AtcTrapAnalyzer.searchPdfExcerpts(undefined, 'warranty'), []);
    const emptyReport = AtcTrapAnalyzer.analyze(null, '');
    assert.strictEqual(emptyReport.traps.length, 0);
    assert.strictEqual(emptyReport.hasSearchableText, false);
  });
});
