import { describe, it } from 'node:test';
import assert from 'node:assert';
import { WhatsAppBriefBuilder } from '../services/WhatsAppBriefBuilder.ts';
import type { DeconstructedBidDoc, UserAgentProfile } from '../types/index.ts';

describe('WhatsAppBriefBuilder - Role-Specific Partner, OEM & CA Briefs', () => {
  const sampleBid: DeconstructedBidDoc = {
    bidNumber: 'GEM/2026/R/777647',
    parentBidNumber: 'GEM/2026/B/8120126',
    title: 'FRP Storage Tank & Water Supply Plumbing System',
    department: 'Department of Military Affairs',
    ministry: 'Ministry of Defence',
    type: 'RA',
    estimatedBidValueInr: 1199635,
    emdAmountInr: 36000,
    isEmdExemptForMse: true,
    epbgPercentage: 3,
    epbgDurationMonths: 38,
    minAnnualTurnoverInr: 500000,
    yearsExperienceRequired: 3,
    deliveryPeriodDays: 45,
    miiPurchasePreference: true,
    makeInIndiaClass: 'CLASS_1',
    boqItems: [{ itemTitle: 'FRP Storage Tank', quantity: 71, unit: 'Units', specsSummary: '' }],
    consignees: [{ location: 'Pune Depot', state: 'Maharashtra', pincode: '411001', quantity: 71 }],
    closingTimeUtc: '2026-11-29T08:00:00.000Z',
    docUrl: 'https://bidplus.gem.gov.in/showradocumentPdf/777647',
  };

  const sampleProfile: UserAgentProfile = {
    id: 'p1',
    organizationName: 'Deccan Infra Supplies',
    msmeCategory: 'MICRO',
    annualTurnoverInr: 7500000,
    yearsExperience: 4,
    productCategories: ['Plumbing'],
    targetStates: ['Maharashtra'],
    isOem: false,
    hasUdyamCertificate: true,
  };

  it('builds a Partner brief with exact unrounded INR amounts and verified GeM PDF link', () => {
    const brief = WhatsAppBriefBuilder.build('PARTNER', {
      bid: sampleBid,
      profile: sampleProfile,
      eligibilitySummary: 'CAUTION · 1 Blocker (Trader EMD Rule)',
    });

    assert.strictEqual(brief.audience, 'PARTNER');
    assert.ok(brief.message.includes('GEM/2026/R/777647'));
    assert.ok(brief.message.includes('₹11,99,635'));
    assert.ok(brief.message.includes('₹36,000'));
    assert.ok(brief.message.includes('3% (38 months)'));
    assert.ok(brief.message.includes('https://bidplus.gem.gov.in/showradocumentPdf/777647'));
    assert.ok(brief.message.includes('Deccan Infra Supplies'));
    assert.ok(!brief.message.includes('gemcompanion.in'));
  });

  it('builds an OEM Quote & MAF request citing Bid #, Qty, State, MII and Official PDF URL', () => {
    const brief = WhatsAppBriefBuilder.build('OEM', {
      bid: sampleBid,
      profile: sampleProfile,
    });

    assert.strictEqual(brief.audience, 'OEM');
    assert.ok(brief.message.includes('Manufacturer Authorization Form (MAF)'));
    assert.ok(brief.message.includes('71 Units'));
    assert.ok(brief.message.includes('Maharashtra'));
    assert.ok(brief.message.includes('Class-1 (≥50% Local Content)'));
    assert.ok(brief.message.includes('GEM/2026/B/8120126'));
    assert.ok(brief.message.includes('https://bidplus.gem.gov.in/showradocumentPdf/777647'));
  });

  it('builds a CA UDIN Turnover request citing exact turnover requirement and ICAI checklist', () => {
    const brief = WhatsAppBriefBuilder.build('CA', {
      bid: sampleBid,
      profile: sampleProfile,
    });

    assert.strictEqual(brief.audience, 'CA');
    assert.ok(brief.message.includes('18-digit ICAI UDIN'));
    assert.ok(brief.message.includes('₹5,00,000'));
    assert.ok(brief.message.includes('Deccan Infra Supplies'));
    assert.ok(brief.message.includes('GEM/2026/R/777647'));
  });
});
