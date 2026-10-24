/**
 * GeM Mobile Companion App - Dedicated User Agent Service
 * Operates as a personalized 24/7 AI procurement agent for the user's organization.
 * Matches incoming daily bids against vendor profile and computes eligibility and win probability.
 */

import type {
  UserAgentProfile,
  DeconstructedBidDoc,
  BidMatchEvaluation,
} from '../types/index.ts';

export class UserAgentService {
  /**
   * Evaluates a tender against the user's organization profile and generates a comprehensive match card.
   */
  public static evaluateBid(
    profile: UserAgentProfile,
    bid: DeconstructedBidDoc
  ): BidMatchEvaluation {
    const turnoverEligible = profile.annualTurnoverInr >= bid.minAnnualTurnoverInr;
    const experienceEligible = profile.yearsExperience >= bid.yearsExperienceRequired;

    // 1. Category Score (0 - 35 points)
    const categoryMatch = profile.productCategories.some((cat) =>
      bid.title.toLowerCase().includes(cat.toLowerCase()) ||
      bid.boqItems.some((item) => item.itemTitle.toLowerCase().includes(cat.toLowerCase()))
    );
    const categoryScore = categoryMatch ? 35 : 5;

    // 2. Turnover Score (0 - 25 points)
    let turnoverScore = 0;
    if (turnoverEligible) {
      turnoverScore = 25;
    } else {
      // Partial credit if close (e.g. >= 70% of requirement)
      const ratio = profile.annualTurnoverInr / Math.max(1, bid.minAnnualTurnoverInr);
      turnoverScore = Math.floor(Math.min(20, ratio * 20));
    }

    // 3. Experience Score (0 - 20 points)
    let experienceScore = 0;
    if (experienceEligible) {
      experienceScore = 20;
    } else {
      const expRatio = profile.yearsExperience / Math.max(1, bid.yearsExperienceRequired);
      experienceScore = Math.floor(Math.min(15, expRatio * 15));
    }

    // 4. Target State / Delivery Geography Score (0 - 10 points)
    const stateMatch = bid.consignees.some((c) =>
      profile.targetStates.some((st) => c.state.toLowerCase() === st.toLowerCase())
    );
    const stateScore = stateMatch ? 10 : 2;

    // 5. EMD Exemption Benefit Score (0 - 10 points)
    const isEmdExempt =
      bid.isEmdExemptForMse && (profile.hasUdyamCertificate || profile.msmeCategory !== 'LARGE');
    const emdScore = isEmdExempt ? 10 : 4;

    const rawScore = categoryScore + turnoverScore + experienceScore + stateScore + emdScore;
    const matchScore = Math.min(100, Math.max(0, rawScore));

    const isEligible = turnoverEligible && experienceEligible;
    const emdStatus: 'EXEMPT' | 'PAYABLE' | 'NOT_APPLICABLE' =
      bid.emdAmountInr === 0 ? 'NOT_APPLICABLE' : isEmdExempt ? 'EXEMPT' : 'PAYABLE';

    let verdictTag: 'HIGH_MATCH' | 'MODERATE_MATCH' | 'DISQUALIFIED' = 'DISQUALIFIED';
    let verdictSummary = '';

    if (isEligible && matchScore >= 75) {
      verdictTag = 'HIGH_MATCH';
      verdictSummary = `Strong match: Meets turnover (₹${(bid.minAnnualTurnoverInr / 100000).toFixed(1)}L) and experience requirements. ${
        isEmdExempt ? 'EMD is 100% waived for your MSE status.' : ''
      }`;
    } else if (isEligible || matchScore >= 50) {
      verdictTag = 'MODERATE_MATCH';
      const warnings = [];
      if (!turnoverEligible) {
        warnings.push(`Turnover gap: requires ₹${(bid.minAnnualTurnoverInr / 100000).toFixed(1)}L`);
      }
      if (!experienceEligible) {
        warnings.push(`Requires ${bid.yearsExperienceRequired} yrs past experience`);
      }
      verdictSummary = warnings.length > 0 ? warnings.join('. ') : 'Good category match with delivery in target region.';
    } else {
      verdictTag = 'DISQUALIFIED';
      verdictSummary = `Disqualified: Organization turnover (₹${(profile.annualTurnoverInr / 100000).toFixed(1)}L) is below mandatory threshold of ₹${(bid.minAnnualTurnoverInr / 100000).toFixed(1)}L.`;
    }

    // Expected Winning Bid Range (typically 82% to 94% of estimated bid value)
    const baseValue = bid.estimatedBidValueInr || bid.emdAmountInr * 50; // Fallback heuristic if estimated value unstated
    const expectedWinningBidRange = {
      minInr: Math.round(baseValue * 0.82),
      maxInr: Math.round(baseValue * 0.94),
    };

    // Past Performance & Experience Analysis based on Completed GeM Orders
    let pastExperienceMatch: BidMatchEvaluation['pastExperienceMatch'] = undefined;
    if (profile.acceptedOrders && profile.acceptedOrders.length > 0) {
      const estimatedValue = bid.estimatedBidValueInr || bid.emdAmountInr * 50;
      const threshold80 = estimatedValue * 0.8;
      const threshold50 = estimatedValue * 0.5;
      const threshold40 = estimatedValue * 0.4;

      const single80 = profile.acceptedOrders.find((o) => o.orderValueInr >= threshold80);
      const orders50 = profile.acceptedOrders.filter((o) => o.orderValueInr >= threshold50);
      const orders40 = profile.acceptedOrders.filter((o) => o.orderValueInr >= threshold40);

      if (single80) {
        pastExperienceMatch = {
          qualifiesCriteria: true,
          matchingOrderNumber: single80.contractNumber,
          matchingOrderValueInr: single80.orderValueInr,
          ruleDescription: `Satisfies 80% Single-Order Criteria via Contract ${single80.contractNumber} (₹${(single80.orderValueInr / 100000).toFixed(1)}L)`,
        };
      } else if (orders50.length >= 2) {
        pastExperienceMatch = {
          qualifiesCriteria: true,
          matchingOrderNumber: orders50[0].contractNumber,
          matchingOrderValueInr: orders50[0].orderValueInr,
          ruleDescription: `Satisfies 2-Order 50% Rule with completed contracts totaling ₹${((orders50[0].orderValueInr + orders50[1].orderValueInr) / 100000).toFixed(1)}L`,
        };
      } else if (orders40.length >= 3) {
        pastExperienceMatch = {
          qualifiesCriteria: true,
          ruleDescription: `Satisfies 3-Order 40% Rule with 3 executed GeM contracts`,
        };
      } else {
        const highestOrder = Math.max(...profile.acceptedOrders.map((o) => o.orderValueInr));
        pastExperienceMatch = {
          qualifiesCriteria: false,
          ruleDescription: `Highest past order ₹${(highestOrder / 100000).toFixed(1)}L is below single-order 80% threshold (₹${(threshold80 / 100000).toFixed(1)}L)`,
        };
      }
    }

    return {
      bidNumber: bid.bidNumber,
      matchScore,
      isEligible,
      turnoverEligible,
      experienceEligible,
      emdStatus,
      verdictTag,
      verdictSummary,
      expectedWinningBidRange,
      pastExperienceMatch,
    };
  }

  /**
   * Sorts and filters daily bids, placing high-probability opportunities at the top.
   */
  public static rankDailyBids(
    profile: UserAgentProfile,
    bids: DeconstructedBidDoc[]
  ): { bid: DeconstructedBidDoc; evaluation: BidMatchEvaluation }[] {
    return bids
      .map((bid) => ({
        bid,
        evaluation: this.evaluateBid(profile, bid),
      }))
      .sort((a, b) => b.evaluation.matchScore - a.evaluation.matchScore);
  }
}
