import { describe, it, expect } from './test-utils.ts';
import { BidDocService } from '../services/BidDocService.ts';
import type { DeconstructedBidDoc } from '../types/index.ts';

describe('BidDocService', () => {
  const sampleBid: DeconstructedBidDoc = {
    bidNumber: 'GEM/2026/B/8822',
    title: 'Supply of Industrial High Speed Network Switches',
    department: 'Ministry of Communications',
    ministry: 'Ministry of Communications',
    type: 'PRODUCT',
    estimatedBidValueInr: 1200000, // ₹12 Lakhs
    emdAmountInr: 24000,
    isEmdExemptForMse: true,
    epbgPercentage: 3,
    minAnnualTurnoverInr: 1500000, // ₹15 Lakhs
    yearsExperienceRequired: 2,
    pastPerformancePercentage: 20,
    deliveryPeriodDays: 25,
    boqItems: [
      { itemTitle: '24-Port Managed Gigabit Switch', quantity: 40, unit: 'Pieces', specsSummary: 'Layer 3' },
    ],
    consignees: [
      { location: 'New Delhi HQ', state: 'Delhi', pincode: '110001', quantity: 20 },
      { location: 'Bengaluru Center', state: 'Karnataka', pincode: '560001', quantity: 20 },
    ],
    requiredDocuments: ['Udyam Registration', 'GSTIN', 'Past Orders'],
    closingTimeUtc: '2026-10-27T18:00:00Z',
    docUrl: 'https://bidplus.gem.gov.in/showbidDocument/8822',
  };

  it('formats glanceable 2x2 fundamentals summary for card display', () => {
    const summary = BidDocService.getFundamentalsSummary(sampleBid);

    expect(summary.estimatedValueLabel).toBe('₹12.0 Lakhs');
    expect(summary.emdLabel).toContain('₹24k');
    expect(summary.emdLabel).toContain('(MSE Exempt)');
    expect(summary.turnoverLabel).toBe('₹15.0 Lakhs');
    expect(summary.experienceLabel).toBe('2 Years');
    expect(summary.deliveryPeriodLabel).toBe('25 Days');
    expect(summary.consigneeCountLabel).toBe('2 Destinations');
  });

  it('assesses tender risks and flags tight deadlines or high guarantees', () => {
    const tightBid: DeconstructedBidDoc = {
      ...sampleBid,
      deliveryPeriodDays: 10, // <= 15 days -> risk
      epbgPercentage: 8, // > 5% -> risk
      consignees: [
        { location: 'Hub 1', state: 'DL', pincode: '110001', quantity: 10 },
        { location: 'Hub 2', state: 'UP', pincode: '201301', quantity: 10 },
        { location: 'Hub 3', state: 'HR', pincode: '122001', quantity: 10 },
        { location: 'Hub 4', state: 'MH', pincode: '400001', quantity: 10 },
      ], // >= 4 locations -> risk
    };

    const assessment = BidDocService.assessTenderRisks(tightBid);
    expect(assessment.riskLevel).toBe('HIGH');
    expect(assessment.flags.length).toBeGreaterThan(1);
    expect(assessment.flags.some((f) => f.includes('Only 10 days'))).toBe(true);
  });

  it('verifies checklist and correctly identifies missing mandatory documents', () => {
    // Missing 'Past Orders'
    const verification = BidDocService.verifyChecklist(sampleBid, ['Udyam Registration', 'GSTIN Certificate']);

    expect(verification.completed).toBe(false);
    expect(verification.missingDocs).toContain('Past Orders');

    // All uploaded
    const completeVerification = BidDocService.verifyChecklist(sampleBid, [
      'udyam registration',
      'gstin certificate',
      'past orders proof',
    ]);
    expect(completeVerification.completed).toBe(true);
    expect(completeVerification.missingDocs.length).toBe(0);
  });

  it('correctly classifies all 5 GeM procurement vehicle types', () => {
    expect(BidDocService.getProcurementTypeLabel(sampleBid).label).toBe('Product Bid');
    expect(BidDocService.getProcurementTypeLabel({ ...sampleBid, type: 'SERVICE' }).label).toBe('Service Contract');
    expect(BidDocService.getProcurementTypeLabel({ ...sampleBid, type: 'CUSTOM' }).label).toBe('Custom Tender');
    expect(BidDocService.getProcurementTypeLabel({ ...sampleBid, type: 'BOQ' }).label).toBe('BOQ Tender');
    expect(BidDocService.getProcurementTypeLabel({ ...sampleBid, type: 'RA' }).label).toBe('Reverse Auction');
    expect(BidDocService.getProcurementTypeLabel({ ...sampleBid, isRa: true }).isRa).toBe(true);
  });
});
