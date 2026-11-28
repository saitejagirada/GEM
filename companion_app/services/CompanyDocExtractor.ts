/**
 * GeM Mobile Companion App - On-Device Company Document PDF Extractor
 *
 * Parses standard Indian seller compliance PDFs 100% locally on-device
 * (Udyam Registration, GST REG-06, CA Turnover/UDIN, Past GeM CRAC/Contracts,
 * PAN, ISO/BIS certificates, Bank Mandates, and bid-specific MII/OEM MAF PDFs)
 * using GemPdfExtractor. Never uploads user files to any server and never
 * fabricates fields absent from the PDF text layer.
 */

import { GemPdfExtractor } from './GemPdfExtractor.ts';
import type { MsmeCategory, UserAgentProfile } from '../types/index.ts';

export type CompanyDocContentTag =
  | 'GST_STATUTORY'
  | 'PAN_STATUTORY'
  | 'UDYAM_MSME'
  | 'CA_UDIN_TURNOVER'
  | 'CRAC_EXPERIENCE'
  | 'ISO_QUALITY'
  | 'BANK_MANDATE'
  | 'MII_DECLARATION'
  | 'OEM_MAF'
  | 'EMD_PROOF';

export interface ExtractedCompanyDocInfo {
  textLength: number;
  hasReadableText: boolean;
  detectedTags: CompanyDocContentTag[];
  firmName?: string;
  gstin?: string;
  panNumber?: string;
  udyamNumber?: string;
  msmeCategory?: MsmeCategory;
  majorActivity?: 'MANUFACTURING' | 'SERVICES' | 'TRADING';
  isOem?: boolean;
  isServiceProvider?: boolean;
  state?: string;
  registeredAddress?: string;
  averageTurnoverInr?: number;
  financialYears?: string[];
  hasUdin?: boolean;
  udinNumber?: string;
  contractNumber?: string;
  orderValueInr?: number;
  yearsExperienceDerived?: number;
  standards?: string[];
  validUntilIso?: string;
  ifscCode?: string;
  highlights: string[];
}

export interface CompanyProfilePatchField {
  key: string;
  label: string;
  valueLabel: string;
}

export interface CompanyProfilePatch {
  organizationName?: string;
  gstin?: string;
  panNumber?: string;
  udyamNumber?: string;
  registeredAddress?: string;
  msmeCategory?: MsmeCategory;
  hasUdyamCertificate?: boolean;
  isOem?: boolean;
  isServiceProvider?: boolean;
  annualTurnoverInr?: number;
  yearsExperience?: number;
  targetStates?: string[];
  maxSingleOrderValueInr?: number;
  hasVerifiedUdin?: boolean;
  fields: CompanyProfilePatchField[];
}

/** Official 2-digit GSTIN State/UT prefix mapping */
const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
};

const KNOWN_INDIAN_STATES = Object.values(GST_STATE_CODES);

const MONTH_MAP: Record<string, string> = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
};

const B64_LOOKUP = (() => {
  const table = new Int8Array(128);
  table.fill(-1);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (let i = 0; i < chars.length; i++) {
    table[chars.charCodeAt(i)] = i;
  }
  return table;
})();

function decodeBase64(b64: string): Uint8Array {
  const len = b64.length;
  const out = new Uint8Array(Math.ceil((len * 3) / 4));
  let outIdx = 0;
  let buf = 0;
  let bits = 0;
  for (let i = 0; i < len; i++) {
    const code = b64.charCodeAt(i);
    if (code >= 128) continue;
    const val = B64_LOOKUP[code];
    if (val < 0) continue;
    buf = (buf << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[outIdx++] = (buf >> bits) & 0xff;
    }
  }
  return outIdx === out.length ? out : out.subarray(0, outIdx);
}

function cleanLine(raw: string, maxLen = 90): string {
  return raw
    .replace(/^[:\-\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function parseDateToIso(raw: string): string | undefined {
  const s = raw.trim();
  const iso = s.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) {
    const m = iso[2].padStart(2, '0');
    const d = iso[3].padStart(2, '0');
    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
      return `${iso[1]}-${m}-${d}`;
    }
  }
  const dmy = s.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  if (dmy) {
    const d = dmy[1].padStart(2, '0');
    const m = dmy[2].padStart(2, '0');
    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
      return `${dmy[3]}-${m}-${d}`;
    }
  }
  const dMonY = s.match(/\b(\d{1,2})[\s\-,]+([A-Za-z]{3,9})[\s\-,]+(20\d{2})\b/);
  if (dMonY) {
    const mon = MONTH_MAP[dMonY[2].toLowerCase()];
    if (mon) {
      const d = dMonY[1].padStart(2, '0');
      return `${dMonY[3]}-${mon}-${d}`;
    }
  }
  return undefined;
}

function parseYearFromDate(raw: string): number | undefined {
  const m = raw.match(/\b(19[6-9]\d|20[0-3]\d)\b/);
  if (!m) return undefined;
  const yr = parseInt(m[1], 10);
  return yr >= 1960 && yr <= 2035 ? yr : undefined;
}

function formatInrShort(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2).replace(/\.?0+$/, '')} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1).replace(/\.0$/, '')} Lakhs`;
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function detectStateFromText(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const state of KNOWN_INDIAN_STATES) {
    const re = new RegExp(`\\b${state.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (re.test(lower)) return state;
  }
  return undefined;
}

export class CompanyDocExtractor {
  /**
   * Parses plain extracted text from a user's company/compliance PDF.
   * Pure and deterministic for unit testing and Hermes execution.
   */
  public static parseCompanyDocumentText(
    rawText: string,
    hintSlotId?: string,
    now: Date = new Date()
  ): ExtractedCompanyDocInfo {
    const text = (rawText || '').replace(/\r/g, '\n');
    const trimmed = text.trim();
    const hasReadableText = trimmed.length >= 20;
    const detectedTags = new Set<CompanyDocContentTag>();
    const highlights: string[] = [];

    if (!hasReadableText) {
      return {
        textLength: trimmed.length,
        hasReadableText: false,
        detectedTags: [],
        highlights: [],
      };
    }

    // 1. GSTIN (15-char official format: 2-digit state + 10-char PAN + 1 entity + Z + checksum)
    const gstinMatch = text.match(/\b([0-3]\d[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/);
    const gstin = gstinMatch?.[1];
    if (gstin) {
      detectedTags.add('GST_STATUTORY');
      highlights.push(`GSTIN ${gstin}`);
    } else if (/form\s+gst\s+reg-?06|goods\s+and\s+services\s+tax\s+registration/i.test(text)) {
      detectedTags.add('GST_STATUTORY');
    }

    // 2. Udyam MSME Registration Number
    const udyamMatch = text.match(/\b(UDYAM-[A-Z]{2}-\d{2}-\d{7})\b/i);
    const udyamNumber = udyamMatch?.[1]?.toUpperCase();
    if (udyamNumber) {
      detectedTags.add('UDYAM_MSME');
      highlights.push(udyamNumber);
    } else if (/udyam\s+registration\s+certificate|ministry\s+of\s+micro,?\s*small\s+and\s+medium/i.test(text)) {
      detectedTags.add('UDYAM_MSME');
    }

    // 3. PAN Number (10-char format; can also be embedded in GSTIN chars 2..12)
    let panNumber: string | undefined;
    const explicitPan = text.match(
      /(?:Permanent\s+Account\s+Number|Income\s+Tax\s+Department|\bPAN\b)[^\nA-Z0-9]{0,25}([A-Z]{5}\d{4}[A-Z])\b/i
    );
    if (explicitPan?.[1]) {
      panNumber = explicitPan[1].toUpperCase();
      detectedTags.add('PAN_STATUTORY');
      highlights.push(`PAN ${panNumber}`);
    } else if (hintSlotId === 'PAN') {
      const barePan = text.match(/\b([A-Z]{5}\d{4}[A-Z])\b/);
      if (barePan?.[1]) {
        panNumber = barePan[1].toUpperCase();
        detectedTags.add('PAN_STATUTORY');
        highlights.push(`PAN ${panNumber}`);
      }
    } else if (gstin) {
      panNumber = gstin.slice(2, 12);
    }

    // 4. Firm / Legal / Trade / Enterprise Name
    const namePatterns = [
      /(?:Trade\s+Name|Legal\s+Name|Name\s+of\s+Enterprise|Enterprise\s+Name)\s*(?:\([^)\n]*\))?\s*[:\-]\s*([^\n]{3,90})/i,
      /(?:Certificate\s+is\s+(?:hereby\s+)?awarded\s+to|This\s+is\s+to\s+certify\s+that)\s*[:\-]?\s*(?:M\/s\.?\s*)?([A-Z][A-Za-z0-9&.,()\- ]{2,80})/i,
      /\bM\/s\.?\s+([A-Z][A-Za-z0-9&.,\- ]{2,75}?)(?=\s+(?:having|is|has|are|bearing|located|at\b|,|\n|$))/,
    ];
    let firmName: string | undefined;
    for (const pat of namePatterns) {
      const m = text.match(pat);
      if (m?.[1]) {
        const candidate = cleanLine(m[1]).replace(/\s*(?:GSTIN|PAN|UDYAM|Dated).*$/i, '').trim();
        if (
          candidate.length >= 3 &&
          !/^(?:not\s+applicable|n\/a|nil|none|self|the\s+company|your\s+company)$/i.test(candidate)
        ) {
          firmName = candidate;
          break;
        }
      }
    }
    if (firmName) highlights.push(firmName);

    // 5. MSME Classification & Major Activity (Manufacturing vs Services vs Trading)
    let msmeCategory: MsmeCategory | undefined;
    const msmeMatch = text.match(
      /(?:Type\s+of\s+Enterprise|Enterprise\s+Type|Classification(?:\s+Year)?)\s*[:\-]?\s*(?:[^\n]{0,30}\b)?(MICRO|SMALL|MEDIUM)\b/i
    );
    if (msmeMatch?.[1]) {
      msmeCategory = msmeMatch[1].toUpperCase() as MsmeCategory;
    } else if (/DPIIT\s+Recognition|Department\s+for\s+Promotion\s+of\s+Industry\s+and\s+Internal\s+Trade.*Startup/i.test(text)) {
      msmeCategory = 'STARTUP';
      detectedTags.add('UDYAM_MSME');
    } else if (udyamNumber) {
      const fallbackTier = text.match(/\b(MICRO|SMALL|MEDIUM)\s+Enterprise\b/i);
      if (fallbackTier?.[1]) {
        msmeCategory = fallbackTier[1].toUpperCase() as MsmeCategory;
      }
    }

    let majorActivity: 'MANUFACTURING' | 'SERVICES' | 'TRADING' | undefined;
    let isOem: boolean | undefined;
    let isServiceProvider: boolean | undefined;
    const actMatch = text.match(
      /(?:Major\s+Activity|National\s+Industry\s+Classification\s+Code|Activity\s+Type)\s*[:\-]?\s*([^\n]{3,60})/i
    );
    if (actMatch?.[1]) {
      const act = actMatch[1].toLowerCase();
      if (/manufactur/i.test(act)) {
        majorActivity = 'MANUFACTURING';
        isOem = true;
      } else if (/trading|wholesale|retail/i.test(act)) {
        majorActivity = 'TRADING';
        isOem = false;
      } else if (/service/i.test(act)) {
        majorActivity = 'SERVICES';
        isServiceProvider = true;
        isOem = false;
      }
    }
    if (msmeCategory || majorActivity) {
      highlights.push(
        [msmeCategory ? `${msmeCategory} MSE` : '', majorActivity ? majorActivity.toLowerCase() : '']
          .filter(Boolean)
          .join(' · ')
      );
    }

    // 6. State & Principal Place of Business
    const stateFromGstin = gstin ? GST_STATE_CODES[gstin.slice(0, 2)] : undefined;
    const explicitStateLine = text.match(/(?:State|Jurisdiction)\s*[:\-]\s*([^\n]{2,45})/i)?.[1];
    const state =
      stateFromGstin ||
      (explicitStateLine ? detectStateFromText(explicitStateLine) : undefined) ||
      detectStateFromText(text);

    const addrMatch = text.match(
      /(?:Principal\s+Place\s+of\s+Business|Official\s+Address\s+of\s+Enterprise|Registered\s+Address)\s*[:\-]\s*([^\n]{8,140})/i
    );
    const registeredAddress = addrMatch?.[1] ? cleanLine(addrMatch[1], 140) : undefined;

    // 7. CA Turnover Certificate & 18-character ICAI UDIN
    const udinMatch = text.match(
      /\bUDIN\s*(?:No\.?|Number)?\s*[:\-]?\s*(\d{8}[A-Z0-9]{10})\b/i
    );
    const udinNumber = udinMatch?.[1]?.toUpperCase();
    const hasUdin = Boolean(udinNumber);
    if (hasUdin) {
      detectedTags.add('CA_UDIN_TURNOVER');
      highlights.push(`UDIN verified (${udinNumber!.slice(0, 6)}…)`);
    }

    const fyMatches = Array.from(
      new Set(
        Array.from(text.matchAll(/\b(?:FY\s*)?(20\d{2}\s*[-–]\s*(?:20)?\d{2})\b/gi)).map((m) =>
          `FY ${m[1].replace(/\s+/g, '')}`
        )
      )
    ).slice(0, 5);

    let averageTurnoverInr: number | undefined;
    const avgTurnoverLine = text.match(
      /(?:Average\s+Annual\s+Turnover|Avg\.?\s*Annual\s+Turnover|3\s*Years?\s+Average\s+Turnover)(?:\s*\([^)\n]*\))?\s*[:\-]\s*([^\n]{2,60})/i
    )?.[1];
    if (avgTurnoverLine) {
      const parsed = GemPdfExtractor.parseIndianCurrency(avgTurnoverLine);
      if (parsed && parsed >= 10000) {
        averageTurnoverInr = parsed;
      }
    }

    // If no explicit "Average" row, average explicit FY turnover lines (e.g. "FY 2023-24: ₹85 Lakhs")
    if (averageTurnoverInr === undefined) {
      const fyLineMatches = Array.from(
        text.matchAll(
          /(?:FY\s*)?20\d{2}\s*[-–]\s*(?:20)?\d{2}[^\n]{0,40}?((?:₹|Rs\.?|INR)\s*[\d,]+(?:\.\d+)?(?:\s*(?:Lakhs?|Lacs?|Crores?|Cr))?|[\d,]+(?:\.\d+)?\s*(?:Lakhs?|Lacs?|Crores?|Cr))/gi
        )
      );
      const amounts: number[] = [];
      for (const m of fyLineMatches) {
        const val = GemPdfExtractor.parseIndianCurrency(m[1]);
        if (val && val >= 10000) amounts.push(val);
      }
      if (amounts.length > 0) {
        const recent = amounts.slice(-3);
        averageTurnoverInr = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
      }
    }

    if (averageTurnoverInr !== undefined) {
      detectedTags.add('CA_UDIN_TURNOVER');
      highlights.push(`Avg. Turnover ${formatInrShort(averageTurnoverInr)}`);
    } else if (/chartered\s+accountant|turnover\s+certificate|audited\s+balance\s+sheet/i.test(text)) {
      detectedTags.add('CA_UDIN_TURNOVER');
    }

    // 8. Past GeM Contract / CRAC / Experience Proof
    const contractMatch = text.match(/\b(GEMC-\d{8,16})\b/i);
    const contractNumber = contractMatch?.[1]?.toUpperCase();
    const isCracDoc = /CRAC|Consignee\s+Receipt\s+and\s+Acceptance|GeM\s+Contract|Work\s+Completion\s+Certificate|Purchase\s+Order/i.test(
      text
    );
    let orderValueInr: number | undefined;
    if (contractNumber || isCracDoc || hintSlotId === 'EXPERIENCE') {
      detectedTags.add('CRAC_EXPERIENCE');
      const orderValLine = text.match(
        /(?:Total\s+Order\s+Value|Total\s+Contract\s+Value|Order\s+Value|Contract\s+Value|Total\s+Value)\s*(?:\([^)\n]*\))?\s*[:\-]?\s*([^\n]{2,50})/i
      )?.[1];
      if (orderValLine) {
        const parsed = GemPdfExtractor.parseIndianCurrency(orderValLine);
        if (parsed && parsed >= 1000) {
          orderValueInr = parsed;
          highlights.push(`Order ${formatInrShort(parsed)}`);
        }
      }
      if (contractNumber) highlights.push(contractNumber);
    }

    // Derive Years of Experience conservatively from Date of Incorporation / Commencement / Registration / Earliest Contract
    let yearsExperienceDerived: number | undefined;
    const dateAnchorPatterns = [
      /(?:Date\s+of\s+(?:Incorporation|Commencement|Registration|Validity\s+From)|Contract\s+Generated\s+Date|Order\s+Date)\s*[:\-]?\s*([^\n]{6,30})/gi,
    ];
    const currentYear = now.getUTCFullYear();
    let earliestYear: number | undefined;
    for (const pat of dateAnchorPatterns) {
      for (const m of text.matchAll(pat)) {
        const yr = parseYearFromDate(m[1]);
        if (yr && yr <= currentYear && yr >= 1970) {
          if (earliestYear === undefined || yr < earliestYear) earliestYear = yr;
        }
      }
    }
    if (earliestYear !== undefined && currentYear - earliestYear >= 1) {
      yearsExperienceDerived = Math.min(50, currentYear - earliestYear);
    }

    // 9. ISO / BIS / NABL / Quality Certificates + Valid Until Date
    const stdMatches = Array.from(
      new Set(
        Array.from(
          text.matchAll(/\b(ISO\s*\d{4,5}(?::\d{4})?|BIS\b|ISI\s*Mark|NABL\b|FSSAI\b|CE\s*Certified|RoHS\b)\b/gi)
        ).map((m) => m[1].replace(/\s+/g, ' ').toUpperCase())
      )
    ).slice(0, 5);
    if (stdMatches.length > 0) {
      detectedTags.add('ISO_QUALITY');
      highlights.push(stdMatches.slice(0, 2).join(' · '));
    }

    let validUntilIso: string | undefined;
    const expiryMatch = text.match(
      /(?:Valid\s+Until|Valid\s+Upto|Valid\s+Up\s+to|Expiry\s+Date|Date\s+of\s+Expiry|Valid\s+Till)\s*[:\-]?\s*([^\n]{6,32})/i
    );
    if (expiryMatch?.[1]) {
      validUntilIso = parseDateToIso(expiryMatch[1]);
      if (validUntilIso) highlights.push(`Valid until ${validUntilIso}`);
    }

    // 10. Bank Mandate / IFSC
    const ifscMatch = text.match(/\bIFSC\s*(?:Code)?\s*[:\-]?\s*([A-Z]{4}0[A-Z0-9]{6})\b/i);
    const ifscCode = ifscMatch?.[1]?.toUpperCase();
    if (ifscCode || /cancelled\s+cheque|bank\s+mandate|electronic\s+clearing|neft\s*\/\s*rtgs/i.test(text)) {
      detectedTags.add('BANK_MANDATE');
      if (ifscCode) highlights.push(`IFSC ${ifscCode}`);
    }

    // 11. Bid-Specific Compliance Documents (MII Self-Declaration, OEM MAF, EMD Challan/BG)
    if (
      /make\s+in\s+india|local\s+content|class[\s\-]*(?:i|1|ii|2)\s+local\s+supplier|p-45021\/2\/2017/i.test(text)
    ) {
      detectedTags.add('MII_DECLARATION');
      if (!highlights.some((h) => /MII/i.test(h))) highlights.push('MII Local Content Declaration');
    }
    if (
      /manufacturer\s+authorization\s+form|oem\s+authorization|hereby\s+authorize\s+M\/s/i.test(text)
    ) {
      detectedTags.add('OEM_MAF');
      highlights.push('OEM Authorization (MAF)');
    }
    if (
      /earnest\s+money\s+deposit|bank\s+guarantee|e-?bg|emd\s+(?:challan|receipt|fdr|dd)/i.test(text) &&
      !detectedTags.has('CA_UDIN_TURNOVER')
    ) {
      detectedTags.add('EMD_PROOF');
      highlights.push('EMD / Bank Guarantee Proof');
    }

    return {
      textLength: trimmed.length,
      hasReadableText: true,
      detectedTags: Array.from(detectedTags),
      firmName,
      gstin,
      panNumber,
      udyamNumber,
      msmeCategory,
      majorActivity,
      isOem,
      isServiceProvider,
      state,
      registeredAddress,
      averageTurnoverInr,
      financialYears: fyMatches.length > 0 ? fyMatches : undefined,
      hasUdin,
      udinNumber,
      contractNumber,
      orderValueInr,
      yearsExperienceDerived,
      standards: stdMatches.length > 0 ? stdMatches : undefined,
      validUntilIso,
      ifscCode,
      highlights: Array.from(new Set(highlights)).slice(0, 4),
    };
  }

  /**
   * Builds a safe, user-reviewable patch to update BusinessProfileService
   * from an extracted company PDF without overwriting unrelated user fields.
   */
  public static buildProfilePatch(
    extracted: ExtractedCompanyDocInfo,
    currentProfile: UserAgentProfile | null
  ): CompanyProfilePatch {
    const fields: CompanyProfilePatchField[] = [];
    const patch: CompanyProfilePatch = { fields };

    if (extracted.firmName && extracted.firmName !== currentProfile?.organizationName) {
      patch.organizationName = extracted.firmName;
      fields.push({ key: 'organizationName', label: 'Firm Name', valueLabel: extracted.firmName });
    }
    if (extracted.gstin && extracted.gstin !== currentProfile?.gstin) {
      patch.gstin = extracted.gstin;
      fields.push({ key: 'gstin', label: 'GSTIN', valueLabel: extracted.gstin });
    }
    if (extracted.udyamNumber && extracted.udyamNumber !== currentProfile?.udyamNumber) {
      patch.udyamNumber = extracted.udyamNumber;
      patch.hasUdyamCertificate = true;
      fields.push({ key: 'udyamNumber', label: 'Udyam Registration', valueLabel: extracted.udyamNumber });
    }
    if (extracted.panNumber && extracted.panNumber !== currentProfile?.panNumber) {
      patch.panNumber = extracted.panNumber;
      fields.push({ key: 'panNumber', label: 'PAN', valueLabel: extracted.panNumber });
    }
    if (extracted.msmeCategory && extracted.msmeCategory !== currentProfile?.msmeCategory) {
      patch.msmeCategory = extracted.msmeCategory;
      if (extracted.msmeCategory !== 'LARGE') patch.hasUdyamCertificate = true;
      fields.push({
        key: 'msmeCategory',
        label: 'Enterprise Tier',
        valueLabel: `${extracted.msmeCategory} MSE`,
      });
    }
    if (extracted.isOem !== undefined && extracted.isOem !== currentProfile?.isOem) {
      patch.isOem = extracted.isOem;
      fields.push({
        key: 'isOem',
        label: 'Seller Role',
        valueLabel: extracted.isOem
          ? 'OEM / Manufacturer'
          : extracted.isServiceProvider
            ? 'Service Provider'
            : 'Reseller / Trader',
      });
    }
    if (
      extracted.isServiceProvider !== undefined &&
      extracted.isServiceProvider !== currentProfile?.isServiceProvider
    ) {
      patch.isServiceProvider = extracted.isServiceProvider;
    }
    if (
      extracted.averageTurnoverInr !== undefined &&
      extracted.averageTurnoverInr > 0 &&
      extracted.averageTurnoverInr !== currentProfile?.annualTurnoverInr
    ) {
      patch.annualTurnoverInr = extracted.averageTurnoverInr;
      fields.push({
        key: 'annualTurnoverInr',
        label: 'Avg. Annual Turnover',
        valueLabel: formatInrShort(extracted.averageTurnoverInr),
      });
    }
    if (extracted.hasUdin && !currentProfile?.hasVerifiedUdin) {
      patch.hasVerifiedUdin = true;
      fields.push({
        key: 'hasVerifiedUdin',
        label: 'ICAI UDIN',
        valueLabel: extracted.udinNumber ? `Verified (${extracted.udinNumber})` : 'Verified',
      });
    }
    if (
      extracted.yearsExperienceDerived !== undefined &&
      extracted.yearsExperienceDerived > (currentProfile?.yearsExperience ?? 0)
    ) {
      patch.yearsExperience = extracted.yearsExperienceDerived;
      fields.push({
        key: 'yearsExperience',
        label: 'Years in Business',
        valueLabel: `${extracted.yearsExperienceDerived} yr${extracted.yearsExperienceDerived === 1 ? '' : 's'}`,
      });
    }
    if (
      extracted.orderValueInr !== undefined &&
      extracted.orderValueInr > (currentProfile?.maxSingleOrderValueInr ?? 0)
    ) {
      patch.maxSingleOrderValueInr = extracted.orderValueInr;
      fields.push({
        key: 'maxSingleOrderValueInr',
        label: 'Verified Order Value',
        valueLabel: formatInrShort(extracted.orderValueInr),
      });
    }
    if (extracted.registeredAddress && extracted.registeredAddress !== currentProfile?.registeredAddress) {
      patch.registeredAddress = extracted.registeredAddress;
      fields.push({
        key: 'registeredAddress',
        label: 'Registered Address',
        valueLabel: extracted.registeredAddress,
      });
    }
    if (extracted.state) {
      const existingStates = currentProfile?.targetStates || [];
      const isPanIndia = existingStates.some((s) => /pan-?india|all india/i.test(s));
      if (
        !currentProfile ||
        (!isPanIndia && !existingStates.some((s) => s.toLowerCase() === extracted.state!.toLowerCase()))
      ) {
        patch.targetStates = currentProfile
          ? [...existingStates, extracted.state]
          : [extracted.state];
        fields.push({
          key: 'targetStates',
          label: 'Home State',
          valueLabel: extracted.state,
        });
      }
    }

    return patch;
  }

  /**
   * Reads a local PDF on the user's device (<= 10 MB) and extracts company/compliance details.
   * Non-PDF files (images, Word docs) cleanly return `{ hasReadableText: false }`.
   */
  public static async extractFromLocalFile(
    localUri: string,
    mimeType?: string,
    fileName?: string,
    hintSlotId?: string
  ): Promise<ExtractedCompanyDocInfo> {
    const isPdf =
      /pdf/i.test(mimeType || '') ||
      /\.pdf$/i.test(fileName || '') ||
      /\.pdf(?:$|\?)/i.test(localUri);
    if (!isPdf) {
      return {
        textLength: 0,
        hasReadableText: false,
        detectedTags: [],
        highlights: [],
      };
    }

    try {
      const fsMod = await import('expo-file-system');
      const info = await fsMod.getInfoAsync(localUri);
      if (!info.exists) {
        return { textLength: 0, hasReadableText: false, detectedTags: [], highlights: [] };
      }
      if ('size' in info && typeof info.size === 'number' && info.size > 10 * 1024 * 1024) {
        return { textLength: 0, hasReadableText: false, detectedTags: [], highlights: [] };
      }
      const b64 = await fsMod.readAsStringAsync(localUri, { encoding: 'base64' });
      const bytes = decodeBase64(b64);
      const text = GemPdfExtractor.extractTextFromPdfSource(bytes);
      return this.parseCompanyDocumentText(text, hintSlotId);
    } catch {
      return { textLength: 0, hasReadableText: false, detectedTags: [], highlights: [] };
    }
  }
}
