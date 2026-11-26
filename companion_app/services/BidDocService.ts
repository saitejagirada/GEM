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

function formatIndianAmount(amountInr: number): string {
  if (amountInr >= 10000000) {
    return `₹${(amountInr / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
  }
  if (amountInr >= 100000) {
    const lakhs = amountInr / 100000;
    return `₹${lakhs >= 100 ? lakhs.toFixed(0) : lakhs.toFixed(1)} Lakhs`;
  }
  if (amountInr >= 1000) {
    return `₹${(amountInr / 1000).toFixed(0)}k`;
  }
  return `₹${amountInr.toLocaleString('en-IN')}`;
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
    const estValue =
      bid.estimatedBidValueInr !== undefined && bid.estimatedBidValueInr > 0
        ? formatIndianAmount(bid.estimatedBidValueInr)
        : 'Not published';

    const emd =
      bid.emdAmountInr === undefined
        ? 'Not published'
        : bid.emdAmountInr === 0
          ? '₹0 (Free)'
          : `${formatIndianAmount(bid.emdAmountInr)} ${bid.isEmdExemptForMse ? '(MSE Exempt)' : ''}`.trim();

    const turnover =
      bid.minAnnualTurnoverInr === undefined
        ? 'Not published'
        : bid.minAnnualTurnoverInr === 0
          ? 'No minimum published'
          : formatIndianAmount(bid.minAnnualTurnoverInr);

    const experience =
      bid.yearsExperienceRequired === undefined
        ? 'Not published'
        : bid.yearsExperienceRequired === 0
          ? 'No experience published'
          : `${bid.yearsExperienceRequired} Years`;

    const delivery = bid?.deliveryPeriodDays === undefined ? 'Not published' : `${bid.deliveryPeriodDays} Days`;
    const consigneesArr = Array.isArray(bid?.consignees) ? bid.consignees : [];
    const consignees = consigneesArr.length > 0
      ? `${consigneesArr.length} Destination${consigneesArr.length === 1 ? '' : 's'}`
      : 'Not published';

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
    const consigneesArr = Array.isArray(bid?.consignees) ? bid.consignees : [];

    // Risk 1: Tight delivery deadline
    if (bid?.deliveryPeriodDays && bid.deliveryPeriodDays <= 15) {
      flags.push(`High urgency delivery: Only ${bid.deliveryPeriodDays} days allowed.`);
    }

    // Risk 2: Elevated ePBG requirement
    if (bid?.epbgPercentage && bid.epbgPercentage > 5) {
      flags.push(`High Performance Guarantee: ${bid.epbgPercentage}% of order value.`);
    }

    // Risk 3: Dispersed multiple consignees
    if (consigneesArr.length >= 4) {
      flags.push(`Multi-location logistics: ${consigneesArr.length} distinct delivery hubs.`);
    }

    // Risk 4: Heavy past performance threshold
    if (bid?.pastPerformancePercentage && bid.pastPerformancePercentage >= 50) {
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
    const normalizedUploaded = (uploadedDocNames || []).map((d) => d.toLowerCase().trim());
    const requiredDocs = Array.isArray(bid?.requiredDocuments) ? bid.requiredDocuments : [];
    const missing = requiredDocs.filter((req) => {
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

