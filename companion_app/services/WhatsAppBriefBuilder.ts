/**
 * GeM Mobile Companion App - Role-Specific WhatsApp Brief Builder
 *
 * Generates clean, copy-ready WhatsApp briefs strictly from verified public GeM
 * tender data and exact locally extracted PDF figures:
 *   1. Partner / Decision Brief — Executive summary + exact financial terms + eligibility status
 *   2. Ask OEM (Quote + MAF) — Dealer requisition citing Bid #, Item, Qty, State & Deadline
 *   3. Ask CA (UDIN Turnover) — Auditor request citing exact Turnover requirement & ICAI UDIN checklist
 *
 * Always links to the verified official *.gem.gov.in tender PDF URL (never fake domains).
 */

import type { DeconstructedBidDoc, UserAgentProfile } from '../types/index.ts';
import { formatDateSafe, formatInr } from '../utils/formatters.ts';
import { PortalDocService } from './PortalDocService.ts';

export type BriefAudience = 'PARTNER' | 'OEM' | 'CA';

export interface BriefBuilderContext {
  bid: DeconstructedBidDoc;
  profile?: UserAgentProfile | null;
  eligibilitySummary?: string;
  consultantBranding?: {
    agencyName?: string;
    contactPhone?: string;
  };
}

export interface GeneratedWhatsAppBrief {
  audience: BriefAudience;
  title: string;
  subtitle: string;
  message: string;
  verifiedPdfUrl: string;
}

function getVerifiedTenderUrl(bid: DeconstructedBidDoc): string {
  const candidate = bid.docUrl || '';
  if (candidate && PortalDocService.isSafeGemUrl(candidate)) {
    return candidate;
  }
  const docs = PortalDocService.getOfficialDocuments(bid);
  if (docs.length > 0 && PortalDocService.isSafeGemUrl(docs[0].url)) {
    return docs[0].url;
  }
  return 'https://bidplus.gem.gov.in/all-bids';
}

function getTotalQty(bid: DeconstructedBidDoc): number | undefined {
  const boqQty = bid.boqItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
  if (boqQty > 0) return boqQty;
  const consigneeQty = bid.consignees?.reduce((sum, c) => sum + (c.quantity || 0), 0) || 0;
  if (consigneeQty > 0) return consigneeQty;
  return undefined;
}

function getDeliveryStatesText(bid: DeconstructedBidDoc): string {
  const states = Array.from(
    new Set(
      (bid.consignees || [])
        .map((c) => (c.state || '').trim())
        .filter((s) => Boolean(s) && s.toLowerCase() !== 'india')
    )
  );
  return states.length > 0 ? states.join(', ') : 'As per Bid PDF';
}

function formatExactEstimate(bid: DeconstructedBidDoc): string {
  if (bid.estimatedBidValueInr && bid.estimatedBidValueInr > 0) {
    return `₹${formatInr(bid.estimatedBidValueInr)}`;
  }
  if (bid.isHighValue) return 'High Value (≥ ₹2 Cr)';
  return 'Not disclosed in PDF';
}

function formatExactEmd(bid: DeconstructedBidDoc): string {
  if (bid.emdAmountInr === undefined) return 'Check Bid PDF';
  if (bid.emdAmountInr === 0) return '₹0 (Not Required)';
  const base = `₹${formatInr(bid.emdAmountInr)}`;
  return bid.isEmdExemptForMse ? `${base} (MSE OEM Exempt)` : base;
}

function formatExactEpbg(bid: DeconstructedBidDoc): string {
  if (bid.epbgPercentage === undefined) return 'Check Bid PDF';
  if (bid.epbgPercentage === 0) return 'Not Required (0%)';
  return bid.epbgDurationMonths
    ? `${bid.epbgPercentage}% (${bid.epbgDurationMonths} months)`
    : `${bid.epbgPercentage}%`;
}

function formatExactTurnover(bid: DeconstructedBidDoc): string {
  if (bid.minAnnualTurnoverInr && bid.minAnnualTurnoverInr > 0) {
    const lakhs = (bid.minAnnualTurnoverInr / 100000).toFixed(2).replace(/\.00$/, '');
    return `₹${formatInr(bid.minAnnualTurnoverInr)} (₹${lakhs} Lakhs)`;
  }
  return 'Not specified in PDF';
}

function getFirmSignature(ctx: BriefBuilderContext): string {
  const agency = ctx.consultantBranding?.agencyName?.trim();
  const phone = ctx.consultantBranding?.contactPhone?.trim();
  if (agency) {
    return phone ? `${agency} (${phone})` : agency;
  }
  const firm = ctx.profile?.organizationName?.trim();
  return firm || '[Your Company Name]';
}

export class WhatsAppBriefBuilder {
  public static build(audience: BriefAudience, ctx: BriefBuilderContext): GeneratedWhatsAppBrief {
    const { bid } = ctx;
    const bidNo = bid.bidNumber || 'GeM Bid';
    const title = bid.title || 'Government Procurement Tender';
    const dept = [bid.department, bid.ministry !== bid.department ? bid.ministry : '']
      .filter(Boolean)
      .join(' · ') || 'Government Department';
    const deadline = bid.closingTimeUtc ? formatDateSafe(bid.closingTimeUtc) : 'See Bid PDF';
    const qty = getTotalQty(bid);
    const states = getDeliveryStatesText(bid);
    const pdfUrl = getVerifiedTenderUrl(bid);
    const sender = getFirmSignature(ctx);

    if (audience === 'OEM') {
      const lines = [
        `*OEM Quote & MAF Request — GeM Bid ${bidNo}*`,
        '',
        `Dear OEM / Authorized Distributor Team,`,
        `We (*${sender}*) intend to participate in the following live GeM tender and request your best dealer quotation along with a bid-specific *Manufacturer Authorization Form (MAF)*:`,
        '',
        `*Bid No:* ${bidNo}${bid.parentBidNumber ? ` (Original Bid: ${bid.parentBidNumber})` : ''}`,
        `*Item:* ${title}`,
        `*Buyer:* ${dept}`,
        `*Quantity:* ${qty !== undefined ? `${qty.toLocaleString('en-IN')} Units` : 'As per BOQ in PDF'}`,
        `*Delivery Location:* ${states}${bid.deliveryPeriodDays ? ` (${bid.deliveryPeriodDays} days)` : ''}`,
        `*Bid Closing:* ${deadline}`,
      ];
      if (bid.miiPurchasePreference || bid.makeInIndiaClass) {
        const mii =
          bid.makeInIndiaClass === 'CLASS_1'
            ? 'Class-1 (≥50% Local Content)'
            : bid.makeInIndiaClass === 'CLASS_2'
              ? 'Class-2 (≥20% Local Content)'
              : 'MII Preference Applicable';
        lines.push(`*MII Requirement:* ${mii} — please share OEM Local Content Certificate`);
      }
      lines.push(
        '',
        `*Official GeM Bid PDF:*`,
        pdfUrl,
        '',
        `Kindly revert with product datasheet, best landing rate (incl. GST & freight), and MAF citing *${bidNo}*.`,
        '',
        `Regards,`,
        sender,
        `_Prepared via GeM Mobile Companion_`
      );

      return {
        audience: 'OEM',
        title: 'Ask OEM for Quote & MAF',
        subtitle: 'Pre-filled dealer quote + authorization request',
        message: lines.join('\n'),
        verifiedPdfUrl: pdfUrl,
      };
    }

    if (audience === 'CA') {
      const turnoverLine = formatExactTurnover(bid);
      const lines = [
        `*CA Turnover Certificate (UDIN) Request — GeM Bid ${bidNo}*`,
        '',
        `Dear CA Sir / Madam,`,
        `Our firm *${sender}* is preparing a technical submission for a live GeM government tender and needs an official *Average Annual Turnover Certificate* with valid *18-digit ICAI UDIN*.`,
        '',
        `*GeM Bid No:* ${bidNo}`,
        `*Department:* ${dept}`,
        `*Required Min. Turnover:* ${turnoverLine}`,
        `*Submission Deadline:* ${deadline}`,
        '',
        `Please include on your firm's letterhead:`,
        `1. Audited annual turnover for the last 3 financial years`,
        `2. Average annual turnover figure (INR)`,
        `3. ICAI Membership No., FRN & valid 18-digit UDIN`,
        `4. Reference to GeM Bid No. *${bidNo}*`,
        '',
        `*Official GeM Bid PDF:*`,
        pdfUrl,
        '',
        `Thank you,`,
        sender,
        `_Prepared via GeM Mobile Companion_`
      ];

      return {
        audience: 'CA',
        title: 'Ask CA for UDIN Certificate',
        subtitle: 'Pre-filled turnover & ICAI UDIN requisition',
        message: lines.join('\n'),
        verifiedPdfUrl: pdfUrl,
      };
    }

    // Default: PARTNER / Boss executive brief
    const lines = [
      `*GeM Tender Brief — ${bidNo}*`,
      `*Item:* ${title}`,
      `*Department:* ${dept}`,
      `*Delivery:* ${states}${bid.deliveryPeriodDays ? ` · ${bid.deliveryPeriodDays} Days` : ''}`,
      `*Quantity:* ${qty !== undefined ? `${qty.toLocaleString('en-IN')} Units` : 'See PDF'}`,
      '',
      `*Exact Commercial Terms (from PDF):*`,
      `• Est. Value: ${formatExactEstimate(bid)}`,
      `• EMD: ${formatExactEmd(bid)}`,
      `• e-PBG: ${formatExactEpbg(bid)}`,
      `• Min. Turnover: ${formatExactTurnover(bid)}`,
      `• Past Experience: ${bid.yearsExperienceRequired ? `${bid.yearsExperienceRequired} Years` : 'Not specified in PDF'}`,
      `• Closing: ${deadline}`,
    ];

    if (ctx.eligibilitySummary) {
      lines.push('', `*Eligibility Check:* ${ctx.eligibilitySummary}`);
    }

    lines.push(
      '',
      `*Official GeM PDF:*`,
      pdfUrl
    );

    if (ctx.consultantBranding?.agencyName || ctx.profile?.organizationName) {
      lines.push('', `Shared by: *${sender}*`);
    }
    lines.push('_Shared via GeM Mobile Companion_');

    return {
      audience: 'PARTNER',
      title: 'Partner / Team Brief',
      subtitle: 'Executive tender snapshot with exact PDF figures',
      message: lines.join('\n'),
      verifiedPdfUrl: pdfUrl,
    };
  }
}
