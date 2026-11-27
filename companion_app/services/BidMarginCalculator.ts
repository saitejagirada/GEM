/**
 * GeM Mobile Companion App - Bid Margin & Reverse Auction Floor Price Calculator
 *
 * Pure, auditable Indian GeM bidding math:
 * - Pre-fills Quantity, Est. Value, EMD (respecting MSE OEM waiver), and e-PBG from the PDF.
 * - Computes exact INR Landed Break-Even Cost (inclusive of GST, freight & GeM transaction fee),
 *   Recommended Opening Quote, Hard Reverse Auction Walk-Away Floor Price, and Working Capital
 *   cash blocked in EMD + e-PBG.
 *
 * Reference GeM Revenue Policy (Standard Public Slab):
 * - Orders below ₹5,00,000: 0% Transaction Charge
 * - Orders ₹5,00,000 and above: 0.45% of order value (capped at ₹3,00,000) + 18% GST on fee
 * Users can override the GeM fee percentage if a category-specific circular applies.
 */

import type { DeconstructedBidDoc, UserAgentProfile } from '../types/index.ts';

export interface BidMarginInput {
  quantity: number;
  unitPurchaseCostInr: number;
  gstRatePercent: number;
  freightAndOverheadTotalInr: number;
  targetMarginPercent: number;
  minWalkAwayMarginPercent: number;
  /** Optional custom GeM fee rate %. When omitted, official GeM slab (0% < ₹5L, 0.45% capped ₹3L) applies. */
  customGemFeePercent?: number;
  /** Published buyer estimated value if stated in PDF. */
  estimatedValueInr?: number;
  /** Published EMD amount from PDF (before exemption check). */
  emdAmountInr?: number;
  /** Whether tender permits MSE EMD exemption. */
  isEmdExemptForMse?: boolean;
  /** Published e-PBG percentage (0–10%). */
  epbgPercentage?: number;
  /** Published e-PBG duration in months. */
  epbgDurationMonths?: number;
  /** Optional saved private business profile to check MSE OEM EMD waiver accurately. */
  profile?: UserAgentProfile | null;
}

export interface BidMarginResult {
  quantity: number;
  baseMaterialCostTotalInr: number;
  gstAmountTotalInr: number;
  freightAndOverheadTotalInr: number;
  subtotalBeforeGemFeeInr: number;
  gemTransactionFeeExclGstInr: number;
  gemFeeGstInr: number;
  gemTransactionFeeTotalInr: number;
  effectiveGemFeePercent: number;

  /** 0% profit break-even cost (including GST, freight, and GeM transaction fee). */
  breakEvenTotalInr: number;
  breakEvenPerUnitInr: number;

  /** Recommended opening bid quote (inclusive of GST & all costs) achieving targetMarginPercent. */
  recommendedQuoteTotalInr: number;
  recommendedQuotePerUnitInr: number;
  projectedTargetProfitInr: number;

  /** Hard Reverse Auction floor price achieving minWalkAwayMarginPercent — NEVER bid below this. */
  raFloorTotalInr: number;
  raFloorPerUnitInr: number;
  projectedFloorProfitInr: number;

  /** Maximum rupee room available for RA decrements between Opening Quote and Hard Floor. */
  raNegotiationHeadroomInr: number;

  /** Variance vs Buyer Estimated Value when disclosed in PDF (negative = below estimate). */
  varianceVsEstimatePercent?: number;
  isAboveEstimate?: boolean;

  /** Working capital cash / guarantee blocked. */
  effectiveEmdCashInr: number;
  emdWaivedForMseOem: boolean;
  epbgGuaranteeAtQuoteInr: number;
  epbgPercentage: number;
  epbgDurationMonths?: number;
  totalSecurityBlockedInr: number;
}

export const GST_RATE_PRESETS: readonly number[] = [0, 5, 12, 18, 28];
export const TARGET_MARGIN_PRESETS: readonly number[] = [5, 8, 12, 15, 20];
export const FLOOR_MARGIN_PRESETS: readonly number[] = [1, 2, 3, 5];

const GEM_FEE_THRESHOLD_INR = 500000;
const GEM_DEFAULT_FEE_PERCENT = 0.45;
const GEM_FEE_CAP_INR = 300000;
const GEM_FEE_GST_RATE = 0.18;

function safeNonNegative(n: number | undefined): number {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return 0;
  return n;
}

/**
 * Computes official GeM Transaction Charge (excl. GST & incl. 18% GST) for a given order value.
 */
export function computeGemTransactionFee(
  orderValueInr: number,
  customFeePercent?: number
): { feeExclGstInr: number; feeGstInr: number; feeTotalInr: number; appliedPercent: number } {
  const safeValue = safeNonNegative(orderValueInr);
  if (safeValue <= 0) {
    return { feeExclGstInr: 0, feeGstInr: 0, feeTotalInr: 0, appliedPercent: 0 };
  }

  let appliedPercent: number;
  let rawFee: number;

  if (typeof customFeePercent === 'number' && Number.isFinite(customFeePercent) && customFeePercent >= 0) {
    appliedPercent = customFeePercent;
    rawFee = (safeValue * appliedPercent) / 100;
  } else if (safeValue < GEM_FEE_THRESHOLD_INR) {
    appliedPercent = 0;
    rawFee = 0;
  } else {
    appliedPercent = GEM_DEFAULT_FEE_PERCENT;
    rawFee = Math.min(GEM_FEE_CAP_INR, (safeValue * appliedPercent) / 100);
  }

  const feeExclGstInr = Math.round(rawFee);
  const feeGstInr = Math.round(feeExclGstInr * GEM_FEE_GST_RATE);
  return {
    feeExclGstInr,
    feeGstInr,
    feeTotalInr: feeExclGstInr + feeGstInr,
    appliedPercent,
  };
}

/**
 * Extracts sensible starting defaults from a live DeconstructedBidDoc without inventing user costs.
 */
export function extractCalculatorDefaultsFromBid(
  bid: DeconstructedBidDoc,
  profile?: UserAgentProfile | null
): {
  quantity: number;
  estimatedValueInr?: number;
  emdAmountInr?: number;
  isEmdExemptForMse: boolean;
  epbgPercentage: number;
  epbgDurationMonths?: number;
  suggestedUnitCostInr?: number;
  profile?: UserAgentProfile | null;
} {
  const boqQty = bid.boqItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
  const consigneeQty = bid.consignees?.reduce((sum, c) => sum + (c.quantity || 0), 0) || 0;
  const quantity = Math.max(1, boqQty || consigneeQty || 1);

  const estimatedValueInr =
    bid.estimatedBidValueInr && bid.estimatedBidValueInr > 0 ? bid.estimatedBidValueInr : undefined;

  return {
    quantity,
    estimatedValueInr,
    emdAmountInr: bid.emdAmountInr,
    isEmdExemptForMse: Boolean(bid.isEmdExemptForMse),
    epbgPercentage: bid.epbgPercentage && bid.epbgPercentage > 0 ? bid.epbgPercentage : 0,
    epbgDurationMonths: bid.epbgDurationMonths,
    // Do not pre-fill fake cost; user enters their real purchase/manufacturing cost.
    suggestedUnitCostInr: undefined,
    profile,
  };
}

export class BidMarginCalculator {
  public static calculate(input: BidMarginInput): BidMarginResult {
    const quantity = Math.max(1, Math.round(safeNonNegative(input.quantity) || 1));
    const unitCost = safeNonNegative(input.unitPurchaseCostInr);
    const gstRate = Math.min(100, safeNonNegative(input.gstRatePercent));
    const freightTotal = safeNonNegative(input.freightAndOverheadTotalInr);
    const targetMargin = Math.min(200, safeNonNegative(input.targetMarginPercent));
    const floorMargin = Math.min(targetMargin, safeNonNegative(input.minWalkAwayMarginPercent));

    const baseMaterialCostTotalInr = Math.round(unitCost * quantity);
    const gstAmountTotalInr = Math.round((baseMaterialCostTotalInr * gstRate) / 100);
    const subtotalBeforeGemFeeInr = baseMaterialCostTotalInr + gstAmountTotalInr + Math.round(freightTotal);

    // Estimate quote order value first to calculate GeM transaction fee accurately
    const prelimQuoteTotal = Math.round(subtotalBeforeGemFeeInr * (1 + targetMargin / 100));
    const gemFee = computeGemTransactionFee(prelimQuoteTotal, input.customGemFeePercent);

    const breakEvenTotalInr = subtotalBeforeGemFeeInr + gemFee.feeTotalInr;
    const breakEvenPerUnitInr = Math.round(breakEvenTotalInr / quantity);

    const recommendedQuoteTotalInr = Math.round(
      subtotalBeforeGemFeeInr * (1 + targetMargin / 100) + gemFee.feeTotalInr
    );
    const recommendedQuotePerUnitInr = Math.round(recommendedQuoteTotalInr / quantity);
    const projectedTargetProfitInr = Math.max(0, recommendedQuoteTotalInr - breakEvenTotalInr);

    // Hard Reverse Auction walk-away floor
    const prelimFloorTotal = Math.round(subtotalBeforeGemFeeInr * (1 + floorMargin / 100));
    const floorGemFee = computeGemTransactionFee(prelimFloorTotal, input.customGemFeePercent);
    const raFloorTotalInr = Math.round(
      subtotalBeforeGemFeeInr * (1 + floorMargin / 100) + floorGemFee.feeTotalInr
    );
    const raFloorPerUnitInr = Math.round(raFloorTotalInr / quantity);
    const projectedFloorProfitInr = Math.max(
      0,
      raFloorTotalInr - (subtotalBeforeGemFeeInr + floorGemFee.feeTotalInr)
    );
    const raNegotiationHeadroomInr = Math.max(0, recommendedQuoteTotalInr - raFloorTotalInr);

    // Estimate variance (only when official estimated value exists in PDF)
    let varianceVsEstimatePercent: number | undefined;
    let isAboveEstimate: boolean | undefined;
    if (input.estimatedValueInr && input.estimatedValueInr > 0 && recommendedQuoteTotalInr > 0) {
      const pct = ((recommendedQuoteTotalInr - input.estimatedValueInr) / input.estimatedValueInr) * 100;
      varianceVsEstimatePercent = Math.round(pct * 10) / 10;
      isAboveEstimate = recommendedQuoteTotalInr > input.estimatedValueInr;
    }

    // EMD cash calculation respecting GeM's real MSE OEM exemption policy
    const publishedEmd = safeNonNegative(input.emdAmountInr);
    const isMseProfile = Boolean(
      input.profile &&
        (input.profile.hasUdyamCertificate || input.profile.msmeCategory !== 'LARGE')
    );
    const emdWaivedForMseOem = Boolean(
      publishedEmd > 0 && input.isEmdExemptForMse && input.profile?.isOem && isMseProfile
    );
    const effectiveEmdCashInr = emdWaivedForMseOem ? 0 : Math.round(publishedEmd);

    // e-PBG guarantee on recommended quote (fallback to estimated value if quote is 0)
    const epbgPercentage = Math.min(25, safeNonNegative(input.epbgPercentage));
    const epbgBase = recommendedQuoteTotalInr > 0 ? recommendedQuoteTotalInr : safeNonNegative(input.estimatedValueInr);
    const epbgGuaranteeAtQuoteInr =
      epbgPercentage > 0 && epbgBase > 0 ? Math.round((epbgBase * epbgPercentage) / 100) : 0;

    // EMD is refunded once e-PBG is furnished, or both may overlap briefly; show clear combined figure
    const totalSecurityBlockedInr = effectiveEmdCashInr + epbgGuaranteeAtQuoteInr;

    return {
      quantity,
      baseMaterialCostTotalInr,
      gstAmountTotalInr,
      freightAndOverheadTotalInr: Math.round(freightTotal),
      subtotalBeforeGemFeeInr,
      gemTransactionFeeExclGstInr: gemFee.feeExclGstInr,
      gemFeeGstInr: gemFee.feeGstInr,
      gemTransactionFeeTotalInr: gemFee.feeTotalInr,
      effectiveGemFeePercent: gemFee.appliedPercent,
      breakEvenTotalInr,
      breakEvenPerUnitInr,
      recommendedQuoteTotalInr,
      recommendedQuotePerUnitInr,
      projectedTargetProfitInr,
      raFloorTotalInr,
      raFloorPerUnitInr,
      projectedFloorProfitInr,
      raNegotiationHeadroomInr,
      varianceVsEstimatePercent,
      isAboveEstimate,
      effectiveEmdCashInr,
      emdWaivedForMseOem,
      epbgGuaranteeAtQuoteInr,
      epbgPercentage,
      epbgDurationMonths: input.epbgDurationMonths,
      totalSecurityBlockedInr,
    };
  }
}
