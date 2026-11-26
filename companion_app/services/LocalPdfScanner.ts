/**
 * Device-only GeM bid PDF details scanner.
 *
 * This is deliberately opt-in and bounded. The companion downloads a public
 * PDF directly from bidplus.gem.gov.in only when the user asks to scan it,
 * decompresses FlateDecode streams and ToUnicode CMaps locally in Hermes/Node,
 * stores a small extracted summary, and never uploads PDF bytes or text to any server.
 */

import type { DeconstructedBidDoc, OfficialBidDocument } from '../types/index.ts';
import {
  GemPdfExtractor,
  type ExtractedGeMTenderDetails,
  type ExtractedLinkedDocument,
} from './GemPdfExtractor.ts';
import { PortalDocService } from './PortalDocService.ts';

const SCAN_CACHE_KEY = '@gem-mobile-companion/local-pdf-scan-v4';
const MAX_SCAN_BYTES = 12 * 1024 * 1024;
const PDF_FETCH_TIMEOUT_MS = 15000;
const PDF_FETCH_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';
const PDF_FETCH_HEADERS: Record<string, string> = {
  'User-Agent': PDF_FETCH_USER_AGENT,
  Accept: 'application/pdf,*/*',
  Referer: 'https://bidplus.gem.gov.in/',
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    promise.then(
      (val) => {
        if (timer) clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        if (timer) clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export type LocalPdfScanStatus =
  | 'EXTRACTED'
  | 'NO_TEXT_LAYER'
  | 'TOO_LARGE'
  | 'UNAVAILABLE'
  | 'ERROR';

export interface LocalPdfDetails {
  bidNumber?: string;
  title?: string;
  department?: string;
  ministry?: string;
  closingDate?: string;
  estimatedValueInr?: number;
  emdAmountInr?: number;

  // Extended Compliance & Disqualification Fields
  minAnnualTurnoverInr?: number;
  yearsExperienceRequired?: number;
  pastPerformancePercentage?: number;
  isEmdExemptForMse?: boolean;
  isEmdExemptForStartup?: boolean;
  msePurchasePreference?: boolean;
  miiPurchasePreference?: boolean;
  miiLocalContentPercentage?: number;
  miiClass?: 'CLASS_1' | 'CLASS_2' | 'NON_LOCAL';
  epbgPercentage?: number;
  splittingRatio?: string;
  requiredDocuments?: string[];
  consigneesCount?: number;
  deliveryPeriodDays?: number;
  linkedDocuments?: ExtractedLinkedDocument[];
  extendedDetails?: ExtractedGeMTenderDetails;
}

export interface LocalPdfScanResult {
  bidNumber: string;
  documentUrl: string;
  sourceUri: string;
  status: LocalPdfScanStatus;
  details: LocalPdfDetails;
  textLength: number;
  scannedAtUtc: string;
  note: string;
}

interface LocalFileInfo {
  exists: boolean;
  size?: number;
}

interface LocalFileSystem {
  cacheDirectory?: string | null;
  documentDirectory?: string | null;
  downloadAsync(
    url: string,
    fileUri: string,
    options?: { headers?: Record<string, string> }
  ): Promise<{ uri?: string; status?: number }>;
  getInfoAsync(uri: string): Promise<LocalFileInfo>;
  readAsStringAsync(uri: string, options?: { encoding?: string }): Promise<string>;
  deleteAsync(uri: string, options?: { idempotent?: boolean }): Promise<void>;
}

interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

function decodeBase64ToUint8Array(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, '');
  const lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const outLen = Math.floor((clean.length * 3) / 4) - (clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0);
  const out = new Uint8Array(Math.max(0, outLen));
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = lookup.indexOf(clean[i]);
    const b = lookup.indexOf(clean[i + 1]);
    const c = lookup.indexOf(clean[i + 2]);
    const d = lookup.indexOf(clean[i + 3]);
    const triplet = (a << 18) | (b << 12) | ((c > 0 ? c : 0) << 6) | (d > 0 ? d : 0);
    if (p < outLen) out[p++] = (triplet >> 16) & 0xff;
    if (p < outLen && clean[i + 2] !== '=') out[p++] = (triplet >> 8) & 0xff;
    if (p < outLen && clean[i + 3] !== '=') out[p++] = triplet & 0xff;
  }
  return out;
}

/**
 * Extracts readable PDF text operators (supports raw string or Uint8Array binary bytes).
 */
export function extractPdfText(pdfSource: string | Uint8Array): string {
  return GemPdfExtractor.extractTextFromPdfSource(pdfSource);
}

export function extractPdfDetails(text: string, fallbackBidNumber?: string): LocalPdfDetails {
  const parsed = GemPdfExtractor.parseGeMTenderText(text, fallbackBidNumber);
  const details: LocalPdfDetails = {};

  if (parsed.bidNumber) details.bidNumber = parsed.bidNumber;
  if (parsed.title) details.title = parsed.title;
  if (parsed.department) details.department = parsed.department;
  if (parsed.ministry) details.ministry = parsed.ministry;
  if (parsed.closingDate) details.closingDate = parsed.closingDate;
  if (parsed.estimatedValueInr !== undefined) details.estimatedValueInr = parsed.estimatedValueInr;
  if (parsed.emdAmountInr !== undefined) details.emdAmountInr = parsed.emdAmountInr;

  if (parsed.minAnnualTurnoverInr !== undefined) details.minAnnualTurnoverInr = parsed.minAnnualTurnoverInr;
  if (parsed.yearsExperienceRequired !== undefined) details.yearsExperienceRequired = parsed.yearsExperienceRequired;
  if (parsed.pastPerformancePercentage !== undefined) details.pastPerformancePercentage = parsed.pastPerformancePercentage;
  if (parsed.isEmdExemptForMse && /MSE\s+(?:Exemption|Relaxation)/i.test(text)) details.isEmdExemptForMse = parsed.isEmdExemptForMse;
  if (parsed.isEmdExemptForStartup && /Startup\s+(?:Exemption|Relaxation)/i.test(text)) details.isEmdExemptForStartup = parsed.isEmdExemptForStartup;
  if (parsed.msePurchasePreference && /MSE\s+Purchase\s+Preference/i.test(text)) details.msePurchasePreference = parsed.msePurchasePreference;
  if (parsed.miiPurchasePreference && /MII\s+Purchase\s+Preference/i.test(text)) details.miiPurchasePreference = parsed.miiPurchasePreference;
  if (parsed.miiLocalContentPercentage !== undefined) details.miiLocalContentPercentage = parsed.miiLocalContentPercentage;
  if (parsed.miiClass) details.miiClass = parsed.miiClass;
  if (parsed.epbgPercentage !== undefined) details.epbgPercentage = parsed.epbgPercentage;
  if (parsed.splittingRatio) details.splittingRatio = parsed.splittingRatio;
  if (parsed.deliveryPeriodDays !== undefined) details.deliveryPeriodDays = parsed.deliveryPeriodDays;
  if (parsed.requiredDocuments && parsed.requiredDocuments.length > 0 && /Document\s+required/i.test(text)) {
    details.requiredDocuments = parsed.requiredDocuments;
  }
  if (parsed.consignees && parsed.consignees.length > 0 && /Consignees?\s*\//i.test(text)) {
    details.consigneesCount = parsed.consignees.length;
  }

  return details;
}

export function extractExtendedPdfDetails(text: string, fallbackBidNumber?: string): ExtractedGeMTenderDetails {
  return GemPdfExtractor.parseGeMTenderText(text, fallbackBidNumber);
}

/**
 * Merges locally extracted PDF scan fields into a public DeconstructedBidDoc
 * so the 2x2 Fundamentals card, Disqualification Shield, Checklist, and WhatsApp
 * Deal Sheet immediately display the real values parsed from the official GeM PDF.
 */
export function enrichBidWithPdfScan(
  bid: DeconstructedBidDoc,
  scan: LocalPdfScanResult | null
): DeconstructedBidDoc {
  if (!scan || scan.status !== 'EXTRACTED') return bid;
  const d = scan.details;
  const ext = d.extendedDetails;

  const estimatedBidValueInr = bid.estimatedBidValueInr ?? d.estimatedValueInr ?? ext?.estimatedValueInr;
  const emdAmountInr = bid.emdAmountInr ?? d.emdAmountInr ?? ext?.emdAmountInr;
  const isEmdExemptForMse =
    bid.isEmdExemptForMse !== undefined
      ? bid.isEmdExemptForMse
      : d.isEmdExemptForMse !== undefined
        ? d.isEmdExemptForMse
        : ext?.isEmdExemptForMse;
  const epbgPercentage = bid.epbgPercentage ?? d.epbgPercentage ?? ext?.epbgPercentage;
  const epbgDurationMonths = bid.epbgDurationMonths ?? ext?.epbgDurationMonths;
  const minAnnualTurnoverInr = bid.minAnnualTurnoverInr ?? d.minAnnualTurnoverInr ?? ext?.minAnnualTurnoverInr;
  const yearsExperienceRequired =
    bid.yearsExperienceRequired ?? d.yearsExperienceRequired ?? ext?.yearsExperienceRequired;
  const pastPerformancePercentage =
    bid.pastPerformancePercentage ?? d.pastPerformancePercentage ?? ext?.pastPerformancePercentage;
  const deliveryPeriodDays = bid.deliveryPeriodDays ?? d.deliveryPeriodDays ?? ext?.deliveryPeriodDays;
  const isSplittingApplied = bid.isSplittingApplied ?? ext?.isSplittingApplied;
  const splittingRatio = bid.splittingRatio ?? d.splittingRatio ?? ext?.splittingRatio;
  const makeInIndiaClass = bid.makeInIndiaClass ?? d.miiClass ?? ext?.miiClass;
  const msePurchasePreference = bid.msePurchasePreference ?? d.msePurchasePreference ?? ext?.msePurchasePreference;
  const miiPurchasePreference = bid.miiPurchasePreference ?? d.miiPurchasePreference ?? ext?.miiPurchasePreference;
  const isEmdExemptForStartup = bid.isEmdExemptForStartup ?? d.isEmdExemptForStartup ?? ext?.isEmdExemptForStartup;
  const bidValidityDays = bid.bidValidityDays ?? ext?.bidValidityDays;
  const typeOfBid = bid.typeOfBid ?? ext?.typeOfBid;

  const requiredDocuments =
    bid.requiredDocuments && bid.requiredDocuments.length > 0
      ? bid.requiredDocuments
      : d.requiredDocuments && d.requiredDocuments.length > 0
      ? d.requiredDocuments
      : ext?.requiredDocuments ?? [];

  const consignees =
    bid.consignees && bid.consignees.length > 0
      ? bid.consignees
      : (ext?.consignees ?? []).map((c) => ({
          location: c.address,
          state: c.state,
          pincode: c.pincode,
          quantity: c.quantity,
          reportingOfficer: c.officer,
        }));

  const boqItems =
    bid.boqItems && bid.boqItems.length > 0
      ? bid.boqItems
      : ext?.totalQuantity !== undefined
      ? [
          {
            itemTitle: d.title || ext.itemCategory || bid.title,
            quantity: ext.totalQuantity,
            unit: 'Units',
            specsSummary: ext.typeOfBid || 'Extracted from official GeM PDF',
          },
        ]
      : [];

  const discoveredLinks = d.linkedDocuments ?? ext?.linkedDocuments ?? [];
  const mergedRelatedDocuments: OfficialBidDocument[] = [...(bid.relatedDocuments ?? [])];
  const seenRelatedUrls = new Set(
    [bid.docUrl, ...mergedRelatedDocuments.map((doc) => doc.url)]
      .filter(Boolean)
      .map((u) => u.trim().replace(/#.*$/, '').toLowerCase())
  );
  for (const link of discoveredLinks) {
    if (!link?.url || !PortalDocService.isSafeGemUrl(link.url)) continue;
    const norm = link.url.trim().replace(/#.*$/, '').toLowerCase();
    if (seenRelatedUrls.has(norm)) continue;
    seenRelatedUrls.add(norm);
    mergedRelatedDocuments.push({
      id: link.id,
      label: link.label,
      subtitle: link.subtitle,
      kind: link.kind,
      fileFormat: link.fileFormat,
      url: link.url,
      source: 'EXTRACTED_FROM_PDF',
    });
  }

  return {
    ...bid,
    title: bid.title && bid.title !== 'Bid title not published' ? bid.title : d.title || bid.title,
    department:
      bid.department && bid.department !== 'Department not published'
        ? bid.department
        : d.department || bid.department,
    ministry:
      bid.ministry && bid.ministry !== 'Ministry not published' ? bid.ministry : d.ministry || bid.ministry,
    estimatedBidValueInr,
    emdAmountInr,
    isEmdExemptForMse,
    isEmdExemptForStartup,
    epbgPercentage,
    epbgDurationMonths,
    minAnnualTurnoverInr,
    yearsExperienceRequired,
    pastPerformancePercentage,
    deliveryPeriodDays,
    isSplittingApplied,
    splittingRatio,
    makeInIndiaClass,
    msePurchasePreference,
    miiPurchasePreference,
    bidValidityDays,
    typeOfBid,
    requiredDocuments,
    consignees,
    boqItems,
    relatedDocuments: mergedRelatedDocuments,
    publishedFields: {
      estimatedValue: estimatedBidValueInr !== undefined,
      quantity: boqItems.length > 0,
      requirements:
        minAnnualTurnoverInr !== undefined ||
        yearsExperienceRequired !== undefined ||
        requiredDocuments.length > 0,
      consignees: consignees.length > 0,
      commercialTerms:
        emdAmountInr !== undefined || epbgPercentage !== undefined || deliveryPeriodDays !== undefined,
    },
  };
}

function scanSource(
  source: string | Uint8Array,
  bidNumber: string,
  documentUrl: string,
  sourceUri: string
): LocalPdfScanResult {
  const text = extractPdfText(source);
  const details = extractPdfDetails(text, bidNumber);
  const extended = extractExtendedPdfDetails(text, bidNumber);
  const linkedDocuments = GemPdfExtractor.extractLinkedDocumentsFromPdf(source, [documentUrl]);
  details.linkedDocuments = linkedDocuments;
  extended.linkedDocuments = linkedDocuments;
  details.extendedDetails = extended;

  const scannedAtUtc = new Date().toISOString();

  if (text.length < 20) {
    return {
      bidNumber,
      documentUrl,
      sourceUri,
      status: 'NO_TEXT_LAYER',
      details,
      textLength: text.length,
      scannedAtUtc,
      note: 'This PDF has no readable text layer for the device scanner. Open the official GeM document to review it.',
    };
  }

  return {
    bidNumber,
    documentUrl,
    sourceUri,
    status: 'EXTRACTED',
    details,
    textLength: text.length,
    scannedAtUtc,
    note: 'Details and compliance barriers extracted locally from official GeM PDF text layer. Confirm every requirement before bidding.',
  };
}

export class LocalPdfScanner {
  public static readonly maxScanBytes = MAX_SCAN_BYTES;

  public static async getCachedScan(
    bidNumber: string,
    documentUrl: string
  ): Promise<LocalPdfScanResult | null> {
    const storage = await this.getStorage();
    if (!storage) return null;

    try {
      const raw = await storage.getItem(SCAN_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object') return null;
      const cached = (parsed as Record<string, unknown>)[bidNumber];
      if (!cached || typeof cached !== 'object') return null;
      const candidate = cached as Partial<LocalPdfScanResult>;
      if (candidate.documentUrl !== documentUrl || candidate.bidNumber !== bidNumber) return null;
      return candidate as LocalPdfScanResult;
    } catch {
      return null;
    }
  }

  /**
   * Scans the official PDF(s) for a bid or Reverse Auction locally on device.
   * For Reverse Auctions that link to a Parent Bid PDF (`showbidDocument/{b_id_parent}`),
   * scans BOTH the Parent Bid PDF (which contains commercial terms, EMD, ePBG,
   * turnover, consignees, and ATC) and the RA PDF (which contains RA dates &
   * RA-specific MSE/Startup exemptions), merging them cleanly.
   */
  public static async scanBidDocuments(bid: DeconstructedBidDoc): Promise<LocalPdfScanResult> {
    const documents = PortalDocService.getOfficialDocuments(bid);
    const primaryDoc = documents[0];
    if (!primaryDoc || !PortalDocService.isSafeGemUrl(primaryDoc.url)) {
      return this.unavailableResult(
        bid.bidNumber,
        bid.docUrl || '',
        'No verified official GeM PDF URL is available for this tender.'
      );
    }

    const parentDoc = documents.find(
      (doc) => doc.id === 'parent-bid-document' || (doc.id !== primaryDoc.id && /showbidDocument/i.test(doc.url))
    );

    if (!parentDoc || !PortalDocService.isSafeGemUrl(parentDoc.url)) {
      return this.scanOfficialBidPdf(bid.bidNumber, primaryDoc.url);
    }

    const [parentScan, raScan] = await Promise.all([
      this.scanOfficialBidPdf(bid.parentBidNumber || `${bid.bidNumber}-parent`, parentDoc.url).catch(
        () => this.unavailableResult(bid.parentBidNumber || bid.bidNumber, parentDoc.url, 'Original Bid PDF timed out.')
      ),
      this.scanOfficialBidPdf(bid.bidNumber, primaryDoc.url).catch(() =>
        this.unavailableResult(bid.bidNumber, primaryDoc.url, 'RA PDF timed out.')
      ),
    ]);

    if (parentScan.status !== 'EXTRACTED' && raScan.status !== 'EXTRACTED') {
      return raScan.status !== 'UNAVAILABLE' ? raScan : parentScan;
    }
    if (parentScan.status !== 'EXTRACTED') return raScan;
    if (raScan.status !== 'EXTRACTED') {
      return {
        ...parentScan,
        bidNumber: bid.bidNumber,
        note: `Commercial terms extracted locally from Original Bid PDF (${bid.parentBidNumber || 'parent tender'}).`,
      };
    }

    const pDetails = parentScan.details;
    const rDetails = raScan.details;
    const pExt = pDetails.extendedDetails;
    const rExt = rDetails.extendedDetails;

    const mergedLinkedDocs: ExtractedLinkedDocument[] = [];
    const seenLinkedUrls = new Set(
      [primaryDoc.url, parentDoc.url].map((u) => u.trim().replace(/#.*$/, '').toLowerCase())
    );
    for (const doc of [
      ...(pDetails.linkedDocuments ?? pExt?.linkedDocuments ?? []),
      ...(rDetails.linkedDocuments ?? rExt?.linkedDocuments ?? []),
    ]) {
      const norm = doc.url.trim().replace(/#.*$/, '').toLowerCase();
      if (seenLinkedUrls.has(norm)) continue;
      seenLinkedUrls.add(norm);
      mergedLinkedDocs.push(doc);
    }

    const mergedExtended: ExtractedGeMTenderDetails | undefined = pExt
      ? {
          ...pExt,
          bidNumber: bid.bidNumber,
          closingDate: rExt?.closingDate || pExt.closingDate,
          totalQuantity: rExt?.totalQuantity ?? pExt.totalQuantity,
          isEmdExemptForMse: Boolean(pExt.isEmdExemptForMse || rExt?.isEmdExemptForMse),
          isEmdExemptForStartup: Boolean(pExt.isEmdExemptForStartup || rExt?.isEmdExemptForStartup),
          mseExemptionForExpAndTurnover: Boolean(
            pExt.mseExemptionForExpAndTurnover || rExt?.mseExemptionForExpAndTurnover
          ),
          startupExemptionForExpAndTurnover: Boolean(
            pExt.startupExemptionForExpAndTurnover || rExt?.startupExemptionForExpAndTurnover
          ),
          isRaEnabled: true,
          linkedDocuments: mergedLinkedDocs,
        }
      : rExt
        ? { ...rExt, linkedDocuments: mergedLinkedDocs }
        : undefined;

    const mergedDetails: LocalPdfDetails = {
      ...pDetails,
      bidNumber: bid.bidNumber,
      title: rDetails.title || pDetails.title,
      department: rDetails.department || pDetails.department,
      ministry: rDetails.ministry || pDetails.ministry,
      closingDate: rDetails.closingDate || pDetails.closingDate,
      isEmdExemptForMse: pDetails.isEmdExemptForMse || rDetails.isEmdExemptForMse || undefined,
      isEmdExemptForStartup: pDetails.isEmdExemptForStartup || rDetails.isEmdExemptForStartup || undefined,
      linkedDocuments: mergedLinkedDocs,
      extendedDetails: mergedExtended,
    };

    return {
      bidNumber: bid.bidNumber,
      documentUrl: primaryDoc.url,
      sourceUri: parentDoc.url,
      status: 'EXTRACTED',
      details: mergedDetails,
      textLength: parentScan.textLength + raScan.textLength,
      scannedAtUtc: new Date().toISOString(),
      note: `Extracted locally from RA PDF + Original Bid PDF (${bid.parentBidNumber || 'Parent Bid'}). Confirm all clauses before bidding.`,
    };
  }

  public static async scanOfficialBidPdf(
    bidNumber: string,
    documentUrl: string
  ): Promise<LocalPdfScanResult> {
    const cached = await this.getCachedScan(bidNumber, documentUrl);
    if (cached && cached.status === 'EXTRACTED') return cached;

    // 1. Native fast path (Android/iOS): expo-file-system with browser User-Agent headers.
    // bidplus.gem.gov.in stalls bare okhttp User-Agents, and RN's fetch().arrayBuffer() is
    // unavailable on Hermes 0.74, so downloading once via expo-file-system with explicit headers
    // avoids double-downloading and completes in ~1-3 seconds.
    const fileSystem = await this.getFileSystem();
    const temporaryDirectory = fileSystem?.cacheDirectory || fileSystem?.documentDirectory;
    if (fileSystem && temporaryDirectory) {
      const safeName = bidNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
      const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const temporaryUri = `${temporaryDirectory.replace(/\/?$/, '/')}gem-pdf-scan-${safeName}-${nonce}.pdf`;
      let downloadedUri = temporaryUri;

      try {
        const download = await withTimeout(
          fileSystem.downloadAsync(documentUrl, temporaryUri, {
            headers: PDF_FETCH_HEADERS,
          }),
          PDF_FETCH_TIMEOUT_MS,
          'PDF download'
        );
        downloadedUri = download.uri || temporaryUri;
        if (typeof download.status === 'number' && download.status >= 400) {
          return this.unavailableResult(
            bidNumber,
            documentUrl,
            `GeM returned HTTP ${download.status} while downloading this PDF.`
          );
        }
        const info = await fileSystem.getInfoAsync(downloadedUri);
        if (info.exists) {
          if (typeof info.size === 'number' && info.size > MAX_SCAN_BYTES) {
            return {
              bidNumber,
              documentUrl,
              sourceUri: documentUrl,
              status: 'TOO_LARGE',
              details: {},
              textLength: 0,
              scannedAtUtc: new Date().toISOString(),
              note: 'This PDF is larger than the 12 MB device scan limit. Open it on GeM instead of using battery and storage for a large local scan.',
            };
          }
          if (typeof info.size !== 'number' || info.size > 0) {
            let source: string | Uint8Array;
            try {
              const b64 = await fileSystem.readAsStringAsync(downloadedUri, { encoding: 'base64' });
              source = decodeBase64ToUint8Array(b64);
            } catch {
              source = await fileSystem.readAsStringAsync(downloadedUri, { encoding: 'utf8' });
            }
            const result = scanSource(source, bidNumber, documentUrl, documentUrl);
            await this.saveScan(result);
            return result;
          }
        }
      } catch {
        // Fall through to bounded fetch fallback below
      } finally {
        await fileSystem.deleteAsync(downloadedUri, { idempotent: true }).catch(() => undefined);
      }
    }

    // 2. Direct binary fetch path (Node.js / Web / fallback when native download fails)
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const abortTimer = controller
      ? setTimeout(() => controller.abort(), PDF_FETCH_TIMEOUT_MS)
      : undefined;
    try {
      const response = await withTimeout(
        fetch(documentUrl, {
          method: 'GET',
          headers: PDF_FETCH_HEADERS,
          signal: controller?.signal,
        }),
        PDF_FETCH_TIMEOUT_MS,
        'PDF fetch'
      );
      if (response.ok && typeof response.arrayBuffer === 'function') {
        const contentLen = Number(response.headers?.get?.('content-length') || 0);
        if (contentLen > MAX_SCAN_BYTES) {
          return {
            bidNumber,
            documentUrl,
            sourceUri: documentUrl,
            status: 'TOO_LARGE',
            details: {},
            textLength: 0,
            scannedAtUtc: new Date().toISOString(),
            note: 'This PDF is larger than the 12 MB device scan limit. Open it on GeM instead of using battery and storage for a large local scan.',
          };
        }
        const bytes = new Uint8Array(
          await withTimeout(response.arrayBuffer(), PDF_FETCH_TIMEOUT_MS, 'PDF buffer read')
        );
        if (bytes.byteLength > MAX_SCAN_BYTES) {
          return {
            bidNumber,
            documentUrl,
            sourceUri: documentUrl,
            status: 'TOO_LARGE',
            details: {},
            textLength: 0,
            scannedAtUtc: new Date().toISOString(),
            note: 'This PDF is larger than the 12 MB device scan limit. Open it on GeM instead of using battery and storage for a large local scan.',
          };
        }
        if (bytes.byteLength > 0) {
          const result = scanSource(bytes, bidNumber, documentUrl, documentUrl);
          await this.saveScan(result);
          return result;
        }
      }
    } catch {
      // Bounded failure — return clean unavailable result so UI never hangs
    } finally {
      if (abortTimer) clearTimeout(abortTimer);
    }

    return this.unavailableResult(
      bidNumber,
      documentUrl,
      'GeM took too long to return this PDF. Tap Scan PDF to retry or open the document inline.'
    );
  }

  public static async scanLocalPdf(
    bidNumber: string,
    documentUrl: string,
    localUri: string
  ): Promise<LocalPdfScanResult> {
    const fileSystem = await this.getFileSystem();
    if (!fileSystem) {
      return this.unavailableResult(bidNumber, documentUrl, 'Device file storage is unavailable for local scanning.');
    }

    try {
      const info = await fileSystem.getInfoAsync(localUri);
      if (!info.exists) {
        return this.unavailableResult(bidNumber, documentUrl, 'The selected PDF is no longer available on this device.');
      }
      if (typeof info.size === 'number' && info.size > MAX_SCAN_BYTES) {
        return {
          bidNumber,
          documentUrl,
          sourceUri: localUri,
          status: 'TOO_LARGE',
          details: {},
          textLength: 0,
          scannedAtUtc: new Date().toISOString(),
          note: 'This PDF is larger than the 12 MB device scan limit.',
        };
      }

      const source = await fileSystem.readAsStringAsync(localUri, { encoding: 'utf8' });
      return scanSource(source, bidNumber, documentUrl, localUri);
    } catch {
      return this.unavailableResult(bidNumber, documentUrl, 'The selected PDF could not be read locally on this device.');
    }
  }

  private static unavailableResult(
    bidNumber: string,
    documentUrl: string,
    note: string
  ): LocalPdfScanResult {
    return {
      bidNumber,
      documentUrl,
      sourceUri: documentUrl,
      status: 'UNAVAILABLE',
      details: {},
      textLength: 0,
      scannedAtUtc: new Date().toISOString(),
      note,
    };
  }

  private static async saveScan(result: LocalPdfScanResult): Promise<void> {
    const storage = await this.getStorage();
    if (!storage) return;

    try {
      const raw = await storage.getItem(SCAN_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const cache = parsed && typeof parsed === 'object' ? (parsed as Record<string, LocalPdfScanResult>) : {};
      cache[result.bidNumber] = result;
      await storage.setItem(SCAN_CACHE_KEY, JSON.stringify(cache));
    } catch {
      // Scanning still succeeds for the current session when the metadata cache is unavailable.
    }
  }

  private static async getStorage(): Promise<KeyValueStorage | null> {
    try {
      const module = await import('@react-native-async-storage/async-storage');
      return (module.default || module) as unknown as KeyValueStorage;
    } catch {
      return null;
    }
  }

  private static async getFileSystem(): Promise<LocalFileSystem | null> {
    try {
      const module = await import('expo-file-system');
      return module as unknown as LocalFileSystem;
    } catch {
      return null;
    }
  }
}
