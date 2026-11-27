import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  BidMarginCalculator,
  computeGemTransactionFee,
  extractCalculatorDefaultsFromBid,
} from '../services/BidMarginCalculator.ts';
import type { DeconstructedBidDoc, UserAgentProfile } from '../types/index.ts';

describe('BidMarginCalculator - Exact GeM Margin & RA Floor Math', () => {
  it('applies official GeM transaction fee slab (0% below ₹5L, 0.45% capped at ₹3L + 18% GST)', () => {
    const underThreshold = computeGemTransactionFee(499000);
    assert.strictEqual(underThreshold.feeExclGstInr, 0);
    assert.strictEqual(underThreshold.feeTotalInr, 0);

    const standardOrder = computeGemTransactionFee(1000000); // ₹10L -> 0.45% = ₹4,500 + 18% GST (₹810) = ₹5,310
    assert.strictEqual(standardOrder.feeExclGstInr, 4500);
    assert.strictEqual(standardOrder.feeGstInr, 810);
    assert.strictEqual(standardOrder.feeTotalInr, 5310);

    const megaOrder = computeGemTransactionFee(100000000); // ₹10 Cr -> capped at ₹3,00,000 + ₹54,000 GST
    assert.strictEqual(megaOrder.feeExclGstInr, 300000);
    assert.strictEqual(megaOrder.feeGstInr, 54000);
    assert.strictEqual(megaOrder.feeTotalInr, 354000);
  });

  it('computes exact break-even, opening quote, RA floor, headroom, and estimate variance', () => {
    const result = BidMarginCalculator.calculate({
      quantity: 10,
      unitPurchaseCostInr: 40000, // Base = ₹4,00,000
      gstRatePercent: 18, // GST = ₹72,000
      freightAndOverheadTotalInr: 28000, // Subtotal = ₹5,00,000
      targetMarginPercent: 12,
      minWalkAwayMarginPercent: 3,
      estimatedValueInr: 600000,
      emdAmountInr: 15000,
      isEmdExemptForMse: false,
      epbgPercentage: 3,
      epbgDurationMonths: 14,
    });

    assert.strictEqual(result.baseMaterialCostTotalInr, 400000);
    assert.strictEqual(result.gstAmountTotalInr, 72000);
    assert.strictEqual(result.subtotalBeforeGemFeeInr, 500000);
    assert.ok(result.gemTransactionFeeTotalInr > 0);
    assert.ok(result.recommendedQuoteTotalInr > result.raFloorTotalInr);
    assert.ok(result.raFloorTotalInr > result.breakEvenTotalInr);
    assert.strictEqual(
      result.raNegotiationHeadroomInr,
      result.recommendedQuoteTotalInr - result.raFloorTotalInr
    );
    assert.strictEqual(result.isAboveEstimate, false);
    assert.ok(typeof result.varianceVsEstimatePercent === 'number' && result.varianceVsEstimatePercent < 0);
    assert.strictEqual(result.effectiveEmdCashInr, 15000);
    assert.strictEqual(result.emdWaivedForMseOem, false);
    assert.strictEqual(result.epbgGuaranteeAtQuoteInr, Math.round(result.recommendedQuoteTotalInr * 0.03));
  });

  it('waives EMD working capital ONLY for MSE OEM manufacturers (never for resellers)', () => {
    const mseOem: UserAgentProfile = {
      id: 'p1',
      organizationName: 'Solar OEM',
      msmeCategory: 'MICRO',
      annualTurnoverInr: 5000000,
      yearsExperience: 3,
      productCategories: [],
      targetStates: ['Pan-India'],
      isOem: true,
      hasUdyamCertificate: true,
    };
    const mseTrader: UserAgentProfile = { ...mseOem, isOem: false };

    const oemResult = BidMarginCalculator.calculate({
      quantity: 5,
      unitPurchaseCostInr: 100000,
      gstRatePercent: 18,
      freightAndOverheadTotalInr: 0,
      targetMarginPercent: 10,
      minWalkAwayMarginPercent: 3,
      emdAmountInr: 36000,
      isEmdExemptForMse: true,
      epbgPercentage: 3,
      profile: mseOem,
    });

    const traderResult = BidMarginCalculator.calculate({
      quantity: 5,
      unitPurchaseCostInr: 100000,
      gstRatePercent: 18,
      freightAndOverheadTotalInr: 0,
      targetMarginPercent: 10,
      minWalkAwayMarginPercent: 3,
      emdAmountInr: 36000,
      isEmdExemptForMse: true,
      epbgPercentage: 3,
      profile: mseTrader,
    });

    assert.strictEqual(oemResult.emdWaivedForMseOem, true);
    assert.strictEqual(oemResult.effectiveEmdCashInr, 0);
    assert.strictEqual(traderResult.emdWaivedForMseOem, false);
    assert.strictEqual(traderResult.effectiveEmdCashInr, 36000);
  });

  it('extracts defaults from a live bid without fabricating unit purchase cost', () => {
    const bid: DeconstructedBidDoc = {
      bidNumber: 'GEM/2026/R/777647',
      title: 'FRP Storage Tank',
      department: 'Department of Military Affairs',
      ministry: 'Ministry of Defence',
      type: 'RA',
      estimatedBidValueInr: 1199635,
      emdAmountInr: 36000,
      isEmdExemptForMse: true,
      epbgPercentage: 3,
      epbgDurationMonths: 38,
      boqItems: [{ itemTitle: 'FRP Tank', quantity: 71, unit: 'Units', specsSummary: '' }],
      closingTimeUtc: new Date(Date.now() + 86400000).toISOString(),
      docUrl: 'https://bidplus.gem.gov.in/showradocumentPdf/777647',
    };

    const defaults = extractCalculatorDefaultsFromBid(bid);
    assert.strictEqual(defaults.quantity, 71);
    assert.strictEqual(defaults.estimatedValueInr, 1199635);
    assert.strictEqual(defaults.emdAmountInr, 36000);
    assert.strictEqual(defaults.epbgPercentage, 3);
    assert.strictEqual(defaults.epbgDurationMonths, 38);
    assert.strictEqual(defaults.suggestedUnitCostInr, undefined);
  });
});
