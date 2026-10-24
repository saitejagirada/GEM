import { describe, it, expect } from './test-utils.ts';
import { UserAgentService } from '../services/UserAgentService.ts';
import type { UserAgentProfile, DeconstructedBidDoc } from '../types/index.ts';

describe('UserAgentService', () => {
  const mockProfile: UserAgentProfile = {
    id: 'usr-msme-01',
    organizationName: 'Kanpur Electricals & Switchgear',
    msmeCategory: 'MICRO',
    annualTurnoverInr: 5000000, // ₹50 Lakhs
    yearsExperience: 3,
    productCategories: ['LED Luminaire', 'Heavy Cables', 'Switchgear'],
    targetStates: ['Uttar Pradesh', 'Delhi', 'Haryana'],
    isOem: false,
    hasUdyamCertificate: true,
  };

  const highMatchBid: DeconstructedBidDoc = {
    bidNumber: 'GEM/2026/B/9001',
    title: 'Supply of Outdoor LED Luminaire Street Lights',
    department: 'Northern Railway',
    ministry: 'Ministry of Railways',
    type: 'PRODUCT',
    estimatedBidValueInr: 2500000, // ₹25 Lakhs
    emdAmountInr: 50000,
    isEmdExemptForMse: true,
    epbgPercentage: 3,
    minAnnualTurnoverInr: 3000000, // ₹30 Lakhs (User has 50L -> Eligible!)
    yearsExperienceRequired: 2, // User has 3 yrs -> Eligible!
    pastPerformancePercentage: 30,
    deliveryPeriodDays: 30,
    splittingRatio: '100% to L1',
    boqItems: [
      { itemTitle: 'LED Luminaire 90W IP66', quantity: 500, unit: 'Pieces', specsSummary: 'IS 16107 compliant' },
    ],
    consignees: [
      { location: 'Zonal Railway Stores', state: 'Uttar Pradesh', pincode: '208001', quantity: 500 },
    ],
    requiredDocuments: ['Udyam Registration', 'Turnover Certificate', 'Past Orders'],
    closingTimeUtc: '2026-10-25T14:00:00Z',
    docUrl: 'https://bidplus.gem.gov.in/showbidDocument/9001',
  };

  const disqualifiedBid: DeconstructedBidDoc = {
    bidNumber: 'GEM/2026/B/9002',
    title: 'Industrial Heavy Turbine Cables for Super Thermal Station',
    department: 'NTPC Limited',
    ministry: 'Ministry of Power',
    type: 'PRODUCT',
    estimatedBidValueInr: 50000000, // ₹5 Crores
    emdAmountInr: 1000000,
    isEmdExemptForMse: false,
    epbgPercentage: 5,
    minAnnualTurnoverInr: 20000000, // ₹2 Crores (User only has 50L -> Disqualified!)
    yearsExperienceRequired: 5, // User only has 3 yrs -> Disqualified!
    pastPerformancePercentage: 60,
    deliveryPeriodDays: 45,
    boqItems: [
      { itemTitle: 'Heavy Turbine Cables 33kV', quantity: 5000, unit: 'Meters', specsSummary: 'Heavy duty XLPE' },
    ],
    consignees: [
      { location: 'Singrauli Power Plant', state: 'Madhya Pradesh', pincode: '486889', quantity: 5000 },
    ],
    requiredDocuments: ['Audited Balance Sheets', 'OEM Authorization'],
    closingTimeUtc: '2026-10-26T10:00:00Z',
    docUrl: 'https://bidplus.gem.gov.in/showbidDocument/9002',
  };

  it('correctly qualifies and scores high match bid with EMD exemption', () => {
    const evaluation = UserAgentService.evaluateBid(mockProfile, highMatchBid);

    expect(evaluation.isEligible).toBe(true);
    expect(evaluation.turnoverEligible).toBe(true);
    expect(evaluation.experienceEligible).toBe(true);
    expect(evaluation.emdStatus).toBe('EXEMPT');
    expect(evaluation.verdictTag).toBe('HIGH_MATCH');
    expect(evaluation.matchScore).toBeGreaterThan(80);
    expect(evaluation.expectedWinningBidRange.minInr).toBeGreaterThan(1500000);
    expect(evaluation.expectedWinningBidRange.maxInr).toBeLessThan(2500000);
  });

  it('disqualifies tenders when turnover or experience criteria exceed profile', () => {
    const evaluation = UserAgentService.evaluateBid(mockProfile, disqualifiedBid);

    expect(evaluation.isEligible).toBe(false);
    expect(evaluation.turnoverEligible).toBe(false);
    expect(evaluation.experienceEligible).toBe(false);
    expect(evaluation.verdictTag).toBe('DISQUALIFIED');
    expect(evaluation.verdictSummary).toContain('below mandatory threshold');
  });

  it('ranks daily bids placing highest fit opportunities first', () => {
    const ranked = UserAgentService.rankDailyBids(mockProfile, [disqualifiedBid, highMatchBid]);

    expect(ranked.length).toBe(2);
    expect(ranked[0].bid.bidNumber).toBe('GEM/2026/B/9001');
    expect(ranked[0].evaluation.matchScore).toBeGreaterThan(ranked[1].evaluation.matchScore);
  });

  it('analyzes accepted orders and confirms past experience compliance', () => {
    const profileWithOrders: UserAgentProfile = {
      ...mockProfile,
      acceptedOrders: [
        {
          contractNumber: 'GEMC-511687712001',
          orderDate: '15-Jan-2026',
          title: 'Supply of Outdoor LED Luminaire Street Lights',
          buyerDepartment: 'Northern Railway',
          ministry: 'Ministry of Railways',
          category: 'Solar & Renewable Energy',
          orderValueInr: 2200000, // ₹22L >= 80% of ₹25L (₹20L)
          quantity: 500,
          cracStatus: 'CRAC_ACCEPTED',
          cracDate: '28-Jan-2026',
          slaCompliance: 'ON_TIME',
          invoiceNumber: 'INV-001',
        },
      ],
    };

    const evaluation = UserAgentService.evaluateBid(profileWithOrders, highMatchBid);
    expect(evaluation.pastExperienceMatch).toBeDefined();
    expect(evaluation.pastExperienceMatch?.qualifiesCriteria).toBe(true);
    expect(evaluation.pastExperienceMatch?.matchingOrderNumber).toBe('GEMC-511687712001');
    expect(evaluation.pastExperienceMatch?.ruleDescription).toContain('Satisfies 80% Single-Order Criteria');
  });
});
