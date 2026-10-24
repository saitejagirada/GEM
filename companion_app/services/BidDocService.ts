/**
 * GeM Mobile Companion App - Bid Document Deconstruction Service
 * Converts complex 50-page GeM tender documents into glanceable Groww-style fundamental blocks.
 * Enables zero-PDF decision-making on mobile devices.
 */

import type { DeconstructedBidDoc } from '../types/index.ts';

export interface BidRiskAssessment {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  flags: string[];
}

export class BidDocService {
  /**
   * Formats a glanceable 2x2 fundamentals summary for card rendering.
   */
  public static getFundamentalsSummary(bid: DeconstructedBidDoc): {
    estimatedValueLabel: string;
    emdLabel: string;
    turnoverLabel: string;
    experienceLabel: string;
    deliveryPeriodLabel: string;
    consigneeCountLabel: string;
  } {
    const estValue = bid.estimatedBidValueInr
      ? `₹${(bid.estimatedBidValueInr / 100000).toFixed(1)} Lakhs`
      : 'Unstated Budget';

    const emd =
      bid.emdAmountInr === 0
        ? '₹0 (Free)'
        : `₹${(bid.emdAmountInr / 1000).toFixed(0)}k ${bid.isEmdExemptForMse ? '(MSE Exempt)' : ''}`.trim();

    const turnover =
      bid.minAnnualTurnoverInr === 0
        ? 'No Min Required'
        : `₹${(bid.minAnnualTurnoverInr / 100000).toFixed(1)} Lakhs`;

    const experience =
      bid.yearsExperienceRequired === 0 ? 'No Exp Required' : `${bid.yearsExperienceRequired} Years`;

    const delivery = `${bid.deliveryPeriodDays} Days`;
    const consignees = `${bid.consignees.length} Destination${bid.consignees.length > 1 ? 's' : ''}`;

    return {
      estimatedValueLabel: estValue,
      emdLabel: emd,
      turnoverLabel: turnover,
      experienceLabel: experience,
      deliveryPeriodLabel: delivery,
      consigneeCountLabel: consignees,
    };
  }

  /**
   * Evaluates operational and contractual risks in the tender terms.
   */
  public static assessTenderRisks(bid: DeconstructedBidDoc): BidRiskAssessment {
    const flags: string[] = [];

    // Risk 1: Tight delivery deadline
    if (bid.deliveryPeriodDays <= 15) {
      flags.push(`High urgency delivery: Only ${bid.deliveryPeriodDays} days allowed.`);
    }

    // Risk 2: Elevated ePBG requirement
    if (bid.epbgPercentage > 5) {
      flags.push(`High Performance Guarantee: ${bid.epbgPercentage}% of order value.`);
    }

    // Risk 3: Dispersed multiple consignees
    if (bid.consignees.length >= 4) {
      flags.push(`Multi-location logistics: ${bid.consignees.length} distinct delivery hubs.`);
    }

    // Risk 4: Heavy past performance threshold
    if (bid.pastPerformancePercentage >= 50) {
      flags.push(`Strict qualification: Must have delivered ${bid.pastPerformancePercentage}% volume previously.`);
    }

    const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
      flags.length >= 2 ? 'HIGH' : flags.length === 1 ? 'MEDIUM' : 'LOW';

    return {
      riskLevel,
      flags,
    };
  }

  /**
   * Verifies required document checklist completion against vendor uploads.
   */
  public static verifyChecklist(
    bid: DeconstructedBidDoc,
    uploadedDocNames: string[]
  ): { completed: boolean; missingDocs: string[] } {
    const normalizedUploaded = uploadedDocNames.map((d) => d.toLowerCase().trim());
    const missing = bid.requiredDocuments.filter((req) => {
      const reqLower = req.toLowerCase();
      return !normalizedUploaded.some((up) => up.includes(reqLower) || reqLower.includes(up));
    });

    return {
      completed: missing.length === 0,
      missingDocs: missing,
    };
  }

  /**
   * Returns human-friendly badge label and metadata for procurement vehicle type.
   */
  public static getProcurementTypeLabel(bid: DeconstructedBidDoc): {
    code: 'PRODUCT' | 'SERVICE' | 'CUSTOM' | 'BOQ' | 'RA';
    label: string;
    isRa: boolean;
  } {
    if (bid.isRa || bid.type === 'RA') {
      return { code: 'RA', label: 'Reverse Auction', isRa: true };
    }
    if (bid.type === 'SERVICE') {
      return { code: 'SERVICE', label: 'Service Contract', isRa: false };
    }
    if (bid.type === 'CUSTOM') {
      return { code: 'CUSTOM', label: 'Custom Tender', isRa: false };
    }
    if (bid.type === 'BOQ') {
      return { code: 'BOQ', label: 'BOQ Tender', isRa: false };
    }
    return { code: 'PRODUCT', label: 'Product Bid', isRa: false };
  }
}

