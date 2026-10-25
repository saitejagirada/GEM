import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GeMLiveSyncService } from '../services/GeMLiveSyncService.ts';
import type { DeconstructedBidDoc } from '../types/index.ts';

describe('BidLifecycleSync & Authentic GeM Website Mirroring', () => {
  const now = new Date();
  const futureDate = new Date(now.getTime() + 86400000 * 3).toISOString(); // 3 days in future
  const pastDate = new Date(now.getTime() - 86400000 * 2).toISOString(); // 2 days in past

  const activeBid: DeconstructedBidDoc = {
    bidNumber: 'GEM/2026/B/TEST_ACTIVE_101',
    title: 'Active Solar Inverters Procurement for Rural Health Centres',
    department: 'Department of Rural Health',
    ministry: 'Ministry of Health & Family Welfare',
    type: 'PRODUCT',
    categoryDomain: 'Power & Solar Energy',
    estimatedBidValueInr: 1500000,
    emdAmountInr: 0,
    isEmdExemptForMse: true,
    epbgPercentage: 3.0,
    minAnnualTurnoverInr: 750000,
    yearsExperienceRequired: 2,
    pastPerformancePercentage: 20,
    deliveryPeriodDays: 30,
    closingTimeUtc: futureDate,
    docUrl: 'https://bidplus.gem.gov.in/showbidDocument/101010',
    b_id: '101010',
    boqItems: [],
    consignees: [{ location: 'Delhi', state: 'Delhi', pincode: '110001', quantity: 20 }],
    requiredDocuments: [],
    splittingRatio: '100% to L1',
    makeInIndiaClass: 'CLASS_1',
  };

  const expiredBid: DeconstructedBidDoc = {
    bidNumber: 'GEM/2026/B/TEST_EXPIRED_202',
    title: 'Closed Tender for Desktop Workstations Supply',
    department: 'Department of Higher Education',
    ministry: 'Ministry of Education',
    type: 'PRODUCT',
    categoryDomain: 'IT & Telecom',
    estimatedBidValueInr: 3200000,
    emdAmountInr: 64000,
    isEmdExemptForMse: true,
    epbgPercentage: 3.0,
    minAnnualTurnoverInr: 1600000,
    yearsExperienceRequired: 3,
    pastPerformancePercentage: 25,
    deliveryPeriodDays: 45,
    closingTimeUtc: pastDate, // Bidding window ended
    docUrl: 'https://bidplus.gem.gov.in/showbidDocument/202020',
    b_id: '202020',
    boqItems: [],
    consignees: [{ location: 'Mumbai', state: 'Maharashtra', pincode: '400001', quantity: 50 }],
    requiredDocuments: [],
    splittingRatio: '100% to L1',
    makeInIndiaClass: 'CLASS_1',
  };

  const raBid: DeconstructedBidDoc = {
    bidNumber: 'GEM-2026-RA-TEST_303',
    title: 'Live Reverse Auction for Industrial Diesel Generators',
    department: 'Military Engineer Services',
    ministry: 'Ministry of Defence',
    type: 'RA',
    isRa: true,
    categoryDomain: 'Power & Solar Energy',
    estimatedBidValueInr: 5800000,
    emdAmountInr: 0,
    isEmdExemptForMse: true,
    epbgPercentage: 5.0,
    minAnnualTurnoverInr: 3000000,
    yearsExperienceRequired: 3,
    pastPerformancePercentage: 30,
    deliveryPeriodDays: 60,
    closingTimeUtc: futureDate,
    docUrl: 'https://bidplus.gem.gov.in/showbidDocument/303030',
    b_id: '303030',
    boqItems: [],
    consignees: [{ location: 'Chandigarh', state: 'Punjab', pincode: '160001', quantity: 5 }],
    requiredDocuments: [],
    splittingRatio: '70:30 MSE Preference',
    makeInIndiaClass: 'CLASS_1',
  };

  const cancelledBid: DeconstructedBidDoc = {
    bidNumber: 'GEM/2026/B/TEST_CANCELLED_404',
    title: 'Cancelled Printing Services Contract',
    department: 'Directorate of Printing',
    ministry: 'Ministry of Housing and Urban Affairs',
    type: 'SERVICE',
    isCancelled: true,
    categoryDomain: 'Services & Manpower',
    estimatedBidValueInr: 950000,
    emdAmountInr: 0,
    isEmdExemptForMse: true,
    epbgPercentage: 3.0,
    minAnnualTurnoverInr: 500000,
    yearsExperienceRequired: 1,
    pastPerformancePercentage: 10,
    deliveryPeriodDays: 365,
    closingTimeUtc: futureDate,
    docUrl: 'https://bidplus.gem.gov.in/showbidDocument/404040',
    b_id: '404040',
    boqItems: [],
    consignees: [{ location: 'Delhi', state: 'Delhi', pincode: '110001', quantity: 1 }],
    requiredDocuments: [],
    splittingRatio: '100% to L1',
    makeInIndiaClass: 'CLASS_1',
  };

  it('correctly computes lifecycle statuses for active, expired, RA, and cancelled tenders', () => {
    assert.strictEqual(GeMLiveSyncService.computeLifecycleStatus(activeBid, now), 'ONGOING');
    assert.strictEqual(GeMLiveSyncService.computeLifecycleStatus(expiredBid, now), 'CLOSED');
    assert.strictEqual(GeMLiveSyncService.computeLifecycleStatus(raBid, now), 'BID_TO_RA');
    assert.strictEqual(GeMLiveSyncService.computeLifecycleStatus(cancelledBid, now), 'CANCELLED');
  });

  it('ensures expired and closed bids are strictly excluded from the Ongoing stream', () => {
    GeMLiveSyncService.ingestLiveBids([activeBid, expiredBid, raBid, cancelledBid]);

    const ongoing = GeMLiveSyncService.getOngoingBids();
    const ongoingBidNumbers = ongoing.map((b) => b.bidNumber);

    // Active bid must be present in Ongoing
    assert.ok(ongoingBidNumbers.includes('GEM/2026/B/TEST_ACTIVE_101'));
    // RA bid is ongoing bidding
    assert.ok(ongoingBidNumbers.includes('GEM-2026-RA-TEST_303'));

    // Closed bid MUST NOT be in Ongoing
    assert.strictEqual(ongoingBidNumbers.includes('GEM/2026/B/TEST_EXPIRED_202'), false);
    // Cancelled bid MUST NOT be in Ongoing
    assert.strictEqual(ongoingBidNumbers.includes('GEM/2026/B/TEST_CANCELLED_404'), false);
  });

  it('routes closed bids to the Closed & Under Evaluation category', () => {
    const closed = GeMLiveSyncService.getClosedBids();
    const closedBidNumbers = closed.map((b) => b.bidNumber);

    assert.ok(closedBidNumbers.includes('GEM/2026/B/TEST_EXPIRED_202'));
    assert.strictEqual(closedBidNumbers.includes('GEM/2026/B/TEST_ACTIVE_101'), false);

    const foundClosed = closed.find((b) => b.bidNumber === 'GEM/2026/B/TEST_EXPIRED_202');
    assert.ok(foundClosed !== undefined);
    assert.strictEqual(foundClosed?.lifecycleStatus, 'CLOSED');
    assert.ok(foundClosed?.evaluationStage !== undefined);
  });

  it('routes cancelled bids strictly to the Cancelled category', () => {
    const cancelled = GeMLiveSyncService.getCancelledBids();
    const cancelledBidNumbers = cancelled.map((b) => b.bidNumber);

    assert.ok(cancelledBidNumbers.includes('GEM/2026/B/TEST_CANCELLED_404'));
    assert.strictEqual(cancelledBidNumbers.includes('GEM/2026/B/TEST_ACTIVE_101'), false);
  });

  it('dynamically reconciles when future deadline passes into the past', () => {
    // Reconcile with simulated time in the future where activeBid deadline has passed
    const futureSimulatedTime = new Date(now.getTime() + 86400000 * 5); // 5 days later
    GeMLiveSyncService.reconcileCatalog(futureSimulatedTime);

    const updated = GeMLiveSyncService.getBidById('GEM/2026/B/TEST_ACTIVE_101');
    assert.strictEqual(updated?.lifecycleStatus, 'CLOSED');

    // Reset reconciliation back to actual current time
    GeMLiveSyncService.reconcileCatalog(now);
    const reset = GeMLiveSyncService.getBidById('GEM/2026/B/TEST_ACTIVE_101');
    assert.strictEqual(reset?.lifecycleStatus, 'ONGOING');
  });
});
