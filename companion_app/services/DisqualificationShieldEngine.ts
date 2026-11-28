/**
 * GeM Mobile Companion App - Pre-Bid Disqualification Shield Engine
 * 
 * Protects MSMEs and sellers from technical disqualification on bidplus.gem.gov.in.
 * Evaluates extracted tender rules against vendor profile, Udyam registration,
 * past GeM contracts, and local workspace documents before final portal submission.
 */

import type {
  UserAgentProfile,
  WorkspaceDocument,
} from '../types/index.ts';
import type { ExtractedGeMTenderDetails } from './GemPdfExtractor.ts';

export type ShieldRiskSeverity = 'CRITICAL' | 'WARNING' | 'PASS';

export interface ShieldCheckItem {
  id: string;
  category: 'EMD' | 'TURNOVER' | 'EXPERIENCE' | 'MII' | 'OEM_MAF' | 'LOGISTICS' | 'STATUTORY';
  checkKind?: 'ELIGIBILITY' | 'DOCUMENT';
  title: string;
  severity: ShieldRiskSeverity;
  reason: string;
  remediation?: string;
  templateAction?: 'MII_DECLARATION' | 'CA_UDIN_REQUEST' | 'OEM_MAF_REQUEST' | 'LINK_CRAC';
}

export interface ShieldEvaluateOptions {
  isServiceTender?: boolean;
}

export interface DisqualificationShieldReport {
  bidNumber: string;
  shieldScore: number; // 0 - 100%
  overallStatus: 'BATTLE_READY' | 'ELEVATED_RISK' | 'CRITICAL_DISQUALIFICATION_RISK';
  summaryHeading: string;
  criticalDisqualificationCount: number;
  warningCount: number;
  passedCount: number;
  checks: ShieldCheckItem[];
  generatedTemplates: {
    miiSelfDeclaration?: string;
    caTurnoverRequest?: string;
    oemMafRequest?: string;
  };
}

export class DisqualificationShieldEngine {
  /**
   * Evaluates extracted tender clauses against vendor profile and attached workspace files.
   */
  public static evaluateShield(
    tender: ExtractedGeMTenderDetails,
    profile: UserAgentProfile,
    attachedDocs: WorkspaceDocument[] = [],
    options?: ShieldEvaluateOptions
  ): DisqualificationShieldReport {
    const checks: ShieldCheckItem[] = [];
    const docs = attachedDocs || [];
    const bidNo = tender.bidNumber || 'GEM/2026/BID';

    const hasDocMatch = (namePattern: RegExp, contentTags: string[]): boolean =>
      docs.some((doc) => {
        if (doc.extractedTags?.some((tag) => contentTags.includes(tag))) return true;
        return namePattern.test((doc.name || '').toLowerCase());
      });

    const isServiceTender =
      options?.isServiceTender ??
      /\b(service|services|manpower|hiring|housekeeping|facility\s+management|catering|security\s+manpower|amc)\b/i.test(
        `${tender.itemCategory || ''} ${tender.title || ''}`
      );

    // -----------------------------------------------------------------------
    // 1. EMD & MSE Goods (OEM-only) vs Services (MSE Service Provider) Check
    // -----------------------------------------------------------------------
    const hasEmd = (tender.emdAmountInr || 0) > 0;
    const hasEmdReceipt = hasDocMatch(/(emd|bank|guarantee|dd|challan|receipt|fdr)/i, ['EMD_PROOF']);
    if (!hasEmd) {
      checks.push({
        id: 'emd-check',
        category: 'EMD',
        checkKind: 'ELIGIBILITY',
        title: 'EMD Guarantee Requirement',
        severity: 'PASS',
        reason: 'Zero EMD tender. No Earnest Money Deposit required.',
      });
    } else {
      const isMse = profile.hasUdyamCertificate || profile.msmeCategory !== 'LARGE';
      const tenderAllowsMseExemption = tender.isEmdExemptForMse || tender.mseExemptionForExpAndTurnover;

      if (tenderAllowsMseExemption && isMse) {
        if (profile.isOem) {
          checks.push({
            id: 'emd-check',
            category: 'EMD',
            checkKind: 'ELIGIBILITY',
            title: 'MSE 100% EMD Waiver Validated',
            severity: 'PASS',
            reason: `Full ₹${tender.emdAmountInr?.toLocaleString('en-IN')} waiver applicable under MSE Manufacturer policy.`,
          });
        } else if (isServiceTender) {
          checks.push({
            id: 'emd-check',
            category: 'EMD',
            checkKind: 'ELIGIBILITY',
            title: 'MSE Service Provider EMD Exemption',
            severity: 'PASS',
            reason: `MSE exemption applies to registered Service Providers for ₹${tender.emdAmountInr?.toLocaleString('en-IN')} EMD. Attach valid Udyam certificate.`,
          });
        } else {
          // Critical GeM Rule: In goods tenders, traders are strictly NOT exempt from EMD!
          checks.push({
            id: 'emd-check',
            category: 'EMD',
            checkKind: 'ELIGIBILITY',
            title: 'EMD Exemption for Non-OEM (Trader Risk)',
            severity: 'CRITICAL',
            reason: `Tender requires ₹${tender.emdAmountInr?.toLocaleString('en-IN')} EMD. GeM rules allow MSE exemption only to MANUFACTURERS of goods. Since you are registered as a reseller/trader, claiming exemption without OEM status will cause instant rejection.`,
            remediation: 'Either pay the EMD guarantee via GeM advisory bank or provide an OEM Manufacturer endorsement.',
          });
        }
      } else if (isMse && !tenderAllowsMseExemption) {
        checks.push({
          id: 'emd-check',
          category: 'EMD',
          checkKind: hasEmdReceipt ? 'ELIGIBILITY' : 'DOCUMENT',
          title: 'EMD Deposit Required (No MSE Waiver)',
          severity: hasEmdReceipt ? 'PASS' : 'WARNING',
          reason: hasEmdReceipt
            ? `EMD proof attached for ₹${tender.emdAmountInr?.toLocaleString('en-IN')} requirement.`
            : `Buyer did not enable MSE EMD exemption on this tender. Mandatory ₹${tender.emdAmountInr?.toLocaleString('en-IN')} EMD instrument (e-BG / DD / FDR) is required.`,
          remediation: hasEmdReceipt ? undefined : 'Arrange EMD Bank Guarantee or Advisory Bank deposit before quoting.',
        });
      } else {
        checks.push({
          id: 'emd-check',
          category: 'EMD',
          checkKind: 'DOCUMENT',
          title: 'EMD Bank Deposit Verification',
          severity: hasEmdReceipt ? 'PASS' : 'CRITICAL',
          reason: hasEmdReceipt
            ? 'EMD payment proof / Bank guarantee instrument is attached.'
            : `Mandatory EMD deposit of ₹${tender.emdAmountInr?.toLocaleString('en-IN')} required. No deposit instrument attached.`,
          remediation: hasEmdReceipt ? undefined : 'Upload EMD Challan or Advisory Bank Guarantee document.',
        });
      }
    }

    // -----------------------------------------------------------------------
    // 2. Annual Turnover & CA UDIN Certificate Check
    // -----------------------------------------------------------------------
    const minTurnover = tender.minAnnualTurnoverInr || 0;
    if (minTurnover > 0) {
      const meetsTurnover = profile.annualTurnoverInr >= minTurnover;
      const isTurnoverExempt =
        tender.mseExemptionForExpAndTurnover &&
        profile.hasUdyamCertificate &&
        (profile.isOem || isServiceTender);
      const hasCaDoc = hasDocMatch(/(turnover|ca|udin|balance|auditor)/i, ['CA_UDIN_TURNOVER']);
      const udinVerified =
        Boolean(profile.hasVerifiedUdin) || docs.some((d) => Boolean(d.hasVerifiedUdin));

      if (meetsTurnover) {
        checks.push({
          id: 'turnover-check',
          category: 'TURNOVER',
          checkKind: hasCaDoc ? 'ELIGIBILITY' : 'DOCUMENT',
          title: 'Annual Turnover Eligibility',
          severity: hasCaDoc ? 'PASS' : 'WARNING',
          reason: hasCaDoc
            ? `Your ₹${(profile.annualTurnoverInr / 100000).toFixed(1)}L turnover meets the required ₹${(minTurnover / 100000).toFixed(1)}L threshold${udinVerified ? ' (CA UDIN verified in PDF)' : ', with CA certificate attached'}.`
            : `Turnover meets ₹${(minTurnover / 100000).toFixed(1)}L, but missing CA Turnover Certificate with mandatory 18-digit UDIN.`,
          remediation: hasCaDoc ? undefined : 'Upload a CA-certified turnover certificate citing an authentic UDIN.',
          templateAction: hasCaDoc ? undefined : 'CA_UDIN_REQUEST',
        });
      } else if (isTurnoverExempt) {
        checks.push({
          id: 'turnover-check',
          category: 'TURNOVER',
          checkKind: 'ELIGIBILITY',
          title: 'Turnover Waiver Claimed (MSE)',
          severity: 'PASS',
          reason: `MSE turnover waiver applies. You are exempt from ₹${(minTurnover / 100000).toFixed(1)}L criteria.`,
        });
      } else {
        checks.push({
          id: 'turnover-check',
          category: 'TURNOVER',
          checkKind: 'ELIGIBILITY',
          title: 'Turnover Disqualification Barrier',
          severity: 'CRITICAL',
          reason: `Disqualification: Profile turnover (₹${(profile.annualTurnoverInr / 100000).toFixed(1)}L) falls below mandatory threshold of ₹${(minTurnover / 100000).toFixed(1)}L.`,
          remediation: 'Do not submit as prime bidder unless in Joint Venture or consortium authorized by GeM terms.',
        });
      }
    } else {
      checks.push({
        id: 'turnover-check',
        category: 'TURNOVER',
        checkKind: 'ELIGIBILITY',
        title: 'Turnover Requirement',
        severity: 'PASS',
        reason: 'No minimum turnover barrier published for this tender.',
      });
    }

    // -----------------------------------------------------------------------
    // 3. Past Experience & Execution Criteria
    // -----------------------------------------------------------------------
    const reqExp = tender.yearsExperienceRequired || 0;
    const hasExpDoc = hasDocMatch(/(experience|past|crac|contract|completion|order)/i, ['CRAC_EXPERIENCE']);

    if (reqExp > 0) {
      if (profile.yearsExperience >= reqExp) {
        checks.push({
          id: 'exp-check',
          category: 'EXPERIENCE',
          checkKind: hasExpDoc ? 'ELIGIBILITY' : 'DOCUMENT',
          title: 'Past Experience Criteria',
          severity: hasExpDoc ? 'PASS' : 'WARNING',
          reason: hasExpDoc
            ? `Meets ${reqExp} years experience requirement with verified contract proof attached.`
            : `Profile meets ${reqExp} years experience, but supporting GeM contract copies / CRACs are not attached.`,
          remediation: hasExpDoc ? undefined : 'Attach copies of past executed GeM contracts with CRAC.',
          templateAction: hasExpDoc ? undefined : 'LINK_CRAC',
        });
      } else if (
        tender.mseExemptionForExpAndTurnover &&
        profile.hasUdyamCertificate &&
        (profile.isOem || isServiceTender)
      ) {
        checks.push({
          id: 'exp-check',
          category: 'EXPERIENCE',
          checkKind: 'ELIGIBILITY',
          title: 'Experience Exemption (MSE)',
          severity: 'PASS',
          reason: `MSE experience exemption applies. You are exempt from ${reqExp} years requirement.`,
        });
      } else {
        checks.push({
          id: 'exp-check',
          category: 'EXPERIENCE',
          checkKind: 'ELIGIBILITY',
          title: 'Past Experience Deficiency',
          severity: 'CRITICAL',
          reason: `Requires ${reqExp} years past public procurement experience; profile records ${profile.yearsExperience} years.`,
          remediation: 'Provide past commercial contracts or participate under MSE waiver if eligible.',
        });
      }
    }

    // -----------------------------------------------------------------------
    // 4. Make in India (MII) Local Content Declaration
    // -----------------------------------------------------------------------
    const hasMiiDeclaration = hasDocMatch(/(mii|local|make\s*in\s*india|content|declaration)/i, ['MII_DECLARATION']);
    if (tender.miiPurchasePreference || tender.miiLocalContentPercentage) {
      const requiredContent = tender.miiLocalContentPercentage || 50;
      const miiIsMandatory = Boolean(tender.requiresMiiDeclaration || tender.miiLocalContentPercentage);
      if (hasMiiDeclaration) {
        checks.push({
          id: 'mii-check',
          category: 'MII',
          checkKind: 'DOCUMENT',
          title: 'Make in India (MII) Compliance',
          severity: 'PASS',
          reason: `MII declaration uploaded, satisfying Class-${tender.miiClass === 'CLASS_1' ? 'I' : 'II'} (${requiredContent}%) requirement.`,
        });
      } else {
        checks.push({
          id: 'mii-check',
          category: 'MII',
          checkKind: 'DOCUMENT',
          title: 'Missing MII Local Content Declaration',
          severity: miiIsMandatory ? 'CRITICAL' : 'WARNING',
          reason: miiIsMandatory
            ? `Mandatory Make in India requirement: Class-${tender.miiClass === 'CLASS_1' ? 'I' : 'II'} requires minimum ${requiredContent}% local content. Draft and attach a signed MII self-declaration in Prepare Docs before bidding.`
            : `MII Purchase Preference enabled (${requiredContent}% local content). Attach a signed MII self-declaration to claim Class-${tender.miiClass === 'CLASS_1' ? 'I' : 'II'} preference.`,
          remediation: 'Generate and upload MII local content declaration on company letterhead.',
          templateAction: 'MII_DECLARATION',
        });
      }
    }

    // -----------------------------------------------------------------------
    // 5. OEM Authorization Form (MAF) Check
    // -----------------------------------------------------------------------
    const hasMafAttached = hasDocMatch(/(maf|oem|authorization|manufacturer)/i, ['OEM_MAF']);
    if (tender.requiresOemAuthorization && !profile.isOem) {
      if (hasMafAttached) {
        checks.push({
          id: 'oem-check',
          category: 'OEM_MAF',
          checkKind: 'DOCUMENT',
          title: 'OEM Authorization Form (MAF)',
          severity: 'PASS',
          reason: 'Bid-specific Manufacturer Authorization Form (MAF) attached.',
        });
      } else {
        checks.push({
          id: 'oem-check',
          category: 'OEM_MAF',
          checkKind: 'DOCUMENT',
          title: 'Missing Mandatory OEM Authorization (MAF)',
          severity: 'CRITICAL',
          reason: `Tender ATC strictly requires OEM Authorization Certificate for authorized resellers. You are bidding as a non-OEM without an attached MAF.`,
          remediation: 'Obtain bid-specific authorization certificate from OEM citing bid number and upload.',
          templateAction: 'OEM_MAF_REQUEST',
        });
      }
    }

    // -----------------------------------------------------------------------
    // 6. Logistics & Consignee Location Compatibility
    // -----------------------------------------------------------------------
    if (tender.consignees && tender.consignees.length > 0) {
      const targetStates = (profile.targetStates || []).map((s) => s.toLowerCase());
      const isPanIndia =
        targetStates.length === 0 ||
        targetStates.includes('pan-india') ||
        targetStates.includes('all india');
      const unsupportedStates = isPanIndia
        ? []
        : tender.consignees
            .map((c) => c.state)
            .filter((st) => st && st !== 'India' && !targetStates.includes(st.toLowerCase()));

      const uniqueUnsupported = Array.from(new Set(unsupportedStates));
      if (uniqueUnsupported.length > 0) {
        checks.push({
          id: 'logistics-check',
          category: 'LOGISTICS',
          checkKind: 'ELIGIBILITY',
          title: 'Multi-State Logistics Exposure',
          severity: 'WARNING',
          reason: `Tender specifies delivery in ${uniqueUnsupported.join(', ')}, which fall outside your primary target states (${profile.targetStates?.join(', ')}).`,
          remediation: 'Confirm freight logistics and state transit tax permits prior to submitting commercial price.',
        });
      } else {
        checks.push({
          id: 'logistics-check',
          category: 'LOGISTICS',
          checkKind: 'ELIGIBILITY',
          title: 'Consignee Delivery Coverage',
          severity: 'PASS',
          reason: isPanIndia
            ? 'Delivery covered under your Pan-India operational profile.'
            : 'All delivery destinations fall within your verified operational target states.',
        });
      }
    }

    // -----------------------------------------------------------------------
    // 7. Statutory Tax & Business Identity Check (GST / PAN / Udyam)
    // -----------------------------------------------------------------------
    const hasGstDoc = hasDocMatch(/(gst|pan|udyam|registration|certificate)/i, [
      'GST_STATUTORY',
      'PAN_STATUTORY',
      'UDYAM_MSME',
    ]);
    if (!hasGstDoc) {
      checks.push({
        id: 'statutory-check',
        category: 'STATUTORY',
        checkKind: 'DOCUMENT',
        title: 'Statutory Business Registration Files',
        severity: 'WARNING',
        reason: 'No GST / PAN / Udyam registration certificates identified in Company Vault or attached response files.',
        remediation: 'Add GST Registration Certificate and Udyam MSME Registration to Company Vault.',
      });
    } else {
      checks.push({
        id: 'statutory-check',
        category: 'STATUTORY',
        checkKind: 'DOCUMENT',
        title: 'Statutory Certificates Ready',
        severity: 'PASS',
        reason: 'Statutory compliance documents verified in Company Vault / bid workspace.',
      });
    }

    // -----------------------------------------------------------------------
    // Score Calculation & Aggregation
    // -----------------------------------------------------------------------
    const criticalCount = checks.filter((c) => c.severity === 'CRITICAL').length;
    const warningCount = checks.filter((c) => c.severity === 'WARNING').length;
    const passedCount = checks.filter((c) => c.severity === 'PASS').length;

    let shieldScore = 100;
    shieldScore -= criticalCount * 35;
    shieldScore -= warningCount * 10;
    shieldScore = Math.max(0, Math.min(100, shieldScore));

    let overallStatus: DisqualificationShieldReport['overallStatus'] = 'BATTLE_READY';
    let summaryHeading = 'Tender response satisfies all technical & financial barriers.';

    if (criticalCount > 0) {
      overallStatus = 'CRITICAL_DISQUALIFICATION_RISK';
      summaryHeading = `Rejected on Technical Opening: ${criticalCount} critical compliance barrier${criticalCount > 1 ? 's' : ''} detected.`;
    } else if (warningCount > 0) {
      overallStatus = 'ELEVATED_RISK';
      summaryHeading = `Qualified with caution: ${warningCount} item${warningCount > 1 ? 's require' : ' requires'} attention before submission.`;
    }

    // Generate Pre-Filled Compliance Templates
    const miiSelfDeclaration = this.generateMiiTemplate(tender, profile);
    const caTurnoverRequest = this.generateCaRequestTemplate(tender, profile);
    const oemMafRequest = this.generateOemMafTemplate(tender, profile);

    return {
      bidNumber: bidNo,
      shieldScore,
      overallStatus,
      summaryHeading,
      criticalDisqualificationCount: criticalCount,
      warningCount,
      passedCount,
      checks,
      generatedTemplates: {
        miiSelfDeclaration,
        caTurnoverRequest,
        oemMafRequest,
      },
    };
  }

  /**
   * Generates a fully-compliant Make in India (MII) self-declaration text.
   */
  public static generateMiiTemplate(tender: ExtractedGeMTenderDetails, profile: UserAgentProfile): string {
    const localContent = tender.miiLocalContentPercentage || 50;
    const bidNo = tender.bidNumber || 'GEM/2026/B/XXXXXX';
    const org = profile.organizationName || 'Our Enterprise';

    const addressLine =
      profile.registeredAddress ||
      `[Enter Factory / Works Address], ${profile.targetStates?.[0] || 'India'}`;

    return `SELF-DECLARATION UNDER MAKE IN INDIA (MII) POLICY
(To be printed on Bidder's Official Company Letterhead)

To,
The Buyer Organization / Consignee,
GeM Bid Number: ${bidNo}
Item Description: ${tender.title || tender.itemCategory || 'Tender Items'}

Sub: Declaration regarding Local Content Compliance for GeM Bid No: ${bidNo}

Respected Sir/Madam,

We, M/s ${org}, hereby declare that:
1. We are offering products that comply with the Public Procurement (Preference to Make in India) Order 2017 (P-45021/2/2017-PP (BE-II) dated 16.09.2020) issued by DPIIT.
2. The local content in the offered products is ${localContent}%, qualifying our firm as a 'Class-${localContent >= 50 ? 'I' : 'II'} Local Supplier'.
3. The location(s) at which local value addition is carried out:
   Factory / Works: ${addressLine}.
4. We understand that false declarations violate the Integrity Pact and GeM General Terms and Conditions (GTC), inviting debarment under Rule 151(iii) of GFR 2017.

Authorized Signatory
For M/s ${org}
Name: [Authorized Signatory Name]
Designation: Managing Director / Partner
Company Stamp & Date`;
  }

  /**
   * Generates CA Turnover Certificate Request letter with 18-digit UDIN placeholder.
   */
  public static generateCaRequestTemplate(tender: ExtractedGeMTenderDetails, profile: UserAgentProfile): string {
    const bidNo = tender.bidNumber || 'GEM/2026/B/XXXXXX';
    const org = profile.organizationName || 'Our Enterprise';
    const reqTurnover = tender.minAnnualTurnoverInr ? `₹${(tender.minAnnualTurnoverInr / 100000).toFixed(1)} Lakhs` : 'As per bid';

    return `REQUEST FOR CA TURNOVER CERTIFICATE WITH UDIN
(For submission under GeM Tender: ${bidNo})

Date: ${new Date().toLocaleDateString('en-IN')}
To,
M/s [Chartered Accountants Firm Name],
Statutory Auditors,

Sub: Requisition for Annual Turnover Certificate with ICAI UDIN for GeM Bid ${bidNo}

Dear Sir/Madam,

Our firm M/s ${org} is participating in Government e-Marketplace (GeM) Tender No. ${bidNo}.
The buyer has mandated a Minimum Average Annual Turnover of ${reqTurnover} across the last 3 financial years (FY 2022-23, FY 2023-24, FY 2024-25).

Kindly issue an official Turnover Certificate on your letterhead incorporating:
1. Financial Year-wise Audited Turnover (INR)
2. Average Annual Turnover figure
3. ICAI Membership Number & Firm Registration Number (FRN)
4. Valid 18-digit Unique Document Identification Number (UDIN) generated from ICAI portal.

Thanking you,
Yours sincerely,
For ${org}`;
  }

  /**
   * Generates OEM Manufacturer Authorization Form (MAF) Requisition.
   */
  public static generateOemMafTemplate(tender: ExtractedGeMTenderDetails, profile: UserAgentProfile): string {
    const bidNo = tender.bidNumber || 'GEM/2026/B/XXXXXX';
    const org = profile.organizationName || 'Our Enterprise';

    return `MANUFACTURER AUTHORIZATION FORM (MAF) REQUISITION
(To be issued by Principal OEM on their official Letterhead)

Date: [Date]
To,
The Competent Authority,
Department: ${tender.department || 'Government Purchaser'},
GeM Bid Reference No: ${bidNo}

Dear Sir/Madam,

WHEREAS [OEM Legal Entity Name], who are official and proven manufacturers of [Tender Item / Products], having factories at [Factory Address], do hereby authorize M/s ${org} [Vendor Address] to submit a bid, negotiate and conclude the contract with you against Bid No. ${bidNo}.

We hereby extend our standard comprehensive warranty for the goods offered by M/s ${org} for the duration specified in the tender (${tender.deliveryPeriodDays || 30} days delivery, 12 months minimum warranty). We also confirm that in case of default or dispute, the OEM will support spare parts and service escalation.

Yours faithfully,
For and on behalf of [Principal OEM Name]
[Signature & Seal of OEM Authority]`;
  }
}
