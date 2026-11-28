/**
 * Device-only GeM bid PDF details scanner.
 *
 * This is deliberately opt-in and bounded. The companion downloads a public
 * PDF directly from bidplus.gem.gov.in only when the user asks to scan it,
 * decompresses FlateDecode streams and ToUnicode CMaps locally in Hermes/Node,
 * stores a small extracted summary, and never uploads PDF bytes or text to any server.
 */

import type {
  DeconstructedBidDoc,
  OfficialBidDocument,
  OfficialBidFileFormat,
} from '../types/index.ts';
import {
  GemPdfExtractor,
  type ExtractedGeMTenderDetails,
  type ExtractedLinkedDocument,
} from './GemPdfExtractor.ts';
import { PortalDocService } from './PortalDocService.ts';
import { GeMLiveSyncService } from './GeMLiveSyncService.ts';

const SCAN_CACHE_KEY = '@gem-mobile-companion/local-pdf-scan-v7';
const MAX_SEARCHABLE_TEXT_CHARS = 60000;
const MAX_SCAN_BYTES = 12 * 1024 * 1024;
const PDF_FETCH_TIMEOUT_MS = 25000;
const PDF_FETCH_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';
const PDF_FETCH_HEADERS: Record<string, string> = {
  'User-Agent': PDF_FETCH_USER_AGENT,
  Accept: 'application/pdf,*/*',
  'Accept-Encoding': 'gzip, deflate',
  Referer: 'https://bidplus.gem.gov.in/',
};

export interface SharedPdfDownloadResult {
  ok: boolean;
  localUri?: string;
  bytes?: Uint8Array;
  detectedFormat?: OfficialBidFileFormat;
  filename?: string;
  tooLarge?: boolean;
  statusCode?: number;
  error?: string;
}

interface NativeBlobResponseInfo {
  status?: number;
  headers?: Record<string, string>;
}

interface NativeBlobResponse {
  path(): string;
  info(): NativeBlobResponseInfo;
}

interface NativeBlobUtilLike {
  config(options: { path: string; timeout?: number; followRedirect?: boolean }): {
    fetch(method: string, url: string, headers?: Record<string, string>): Promise<NativeBlobResponse>;
  };
  fs: {
    exists(path: string): Promise<boolean>;
    stat(path: string): Promise<{ size?: number }>;
    readFile(path: string, encoding: 'base64' | 'utf8'): Promise<string>;
    unlink(path: string): Promise<void>;
    dirs: { CacheDir?: string; DocumentDir?: string };
  };
}

const B64_LOOKUP = (() => {
  const table = new Int8Array(128);
  table.fill(-1);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (let i = 0; i < chars.length; i++) {
    table[chars.charCodeAt(i)] = i;
  }
  return table;
})();

function normalizeUrlKey(url: string): string {
  return url.trim().replace(/#.*$/, '');
}

function getHeaderCaseInsensitive(
  headers: Record<string, string> | undefined,
  key: string
): string | null {
  if (!headers) return null;
  const target = key.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === target) return v;
  }
  return null;
}

/**
 * Deterministic safe local cache filename for a verified official GeM PDF URL
 * shared between LocalPdfScanner (on-device extraction) and BidDocumentViewer.
 */
export function getSharedPdfCacheFileName(url: string): string {
  const norm = normalizeUrlKey(url);
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b1;
  for (let i = 0; i < norm.length; i++) {
    const ch = norm.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 ^ ch, 0x85ebca6b);
  }
  const slug = `${(h1 >>> 0).toString(36)}-${(h2 >>> 0).toString(36)}`;
  return `gem-pdf-v4-${slug}.pdf`;
}

/**
 * Validates that downloaded bytes actually contain the PDF magic header (`%PDF-`)
 * within the first 1,024 bytes (per PDF 1.7 spec) rather than an HTML error page
 * or empty 0-byte response from bidplus.gem.gov.in.
 */
export function isValidPdfBytes(bytes: Uint8Array): boolean {
  if (!bytes || bytes.byteLength < 8) return false;
  const limit = Math.min(bytes.byteLength - 4, 1024);
  for (let i = 0; i <= limit; i++) {
    if (
      bytes[i] === 0x25 && // %
      bytes[i + 1] === 0x50 && // P
      bytes[i + 2] === 0x44 && // D
      bytes[i + 3] === 0x46 && // F
      bytes[i + 4] === 0x2d // -
    ) {
      return true;
    }
  }
  return false;
}

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
  /** Bounded locally extracted text layer for instant in-app ATC trap & keyword search. */
  searchableText?: string;
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
  const len = b64.length;
  // Pre-size upper bound and fill directly without allocating a regex-cleaned string
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
    searchableText: text.slice(0, MAX_SEARCHABLE_TEXT_CHARS),
    scannedAtUtc,
    note: 'Details and compliance barriers extracted locally from official GeM PDF text layer. Confirm every requirement before bidding.',
  };
}

export class LocalPdfScanner {
  public static readonly maxScanBytes = MAX_SCAN_BYTES;
  private static verifiedLocalPdfUris: Map<string, string> = new Map();
  private static inFlightDownloads: Map<string, Promise<SharedPdfDownloadResult>> = new Map();

  private static async buildDownloadHeaders(refreshSession = false): Promise<Record<string, string>> {
    const headers: Record<string, string> = { ...PDF_FETCH_HEADERS };
    try {
      let cookie = GeMLiveSyncService.getCachedCookieHeader();
      if (refreshSession && !cookie) {
        const session = await withTimeout(
          GeMLiveSyncService.ensurePortalSession(true),
          8000,
          'GeM session refresh'
        ).catch(() => null);
        cookie = session?.cookieHeader || '';
      }
      if (cookie) {
        headers.Cookie = cookie;
      }
    } catch {
      // Public PDFs still work without explicit cookie header
    }
    return headers;
  }

  public static async getCachedLocalPdfUri(documentUrl: string): Promise<string | null> {
    if (!documentUrl || !PortalDocService.isSafeGemUrl(documentUrl)) return null;
    const norm = normalizeUrlKey(documentUrl);
    const fileSystem = await this.getFileSystem();
    const cacheDir = fileSystem?.cacheDirectory || fileSystem?.documentDirectory;

    const memUri = this.verifiedLocalPdfUris.get(norm);
    if (memUri && fileSystem) {
      try {
        const info = await fileSystem.getInfoAsync(memUri);
        if (info.exists && (typeof info.size !== 'number' || info.size >= 100)) {
          return memUri;
        }
      } catch {
        // Fall through to disk check
      }
      this.verifiedLocalPdfUris.delete(norm);
    }

    if (!fileSystem || !cacheDir) return null;
    const targetUri = `${cacheDir.replace(/\/?$/, '/')}${getSharedPdfCacheFileName(norm)}`;
    try {
      const info = await fileSystem.getInfoAsync(targetUri);
      if (info.exists && typeof info.size === 'number' && info.size >= 100 && info.size <= MAX_SCAN_BYTES) {
        this.verifiedLocalPdfUris.set(norm, targetUri);
        return targetUri;
      }
    } catch {
      // Ignore cache lookup failure
    }
    return null;
  }

  public static async invalidateLocalPdfCache(documentUrl: string): Promise<void> {
    const norm = normalizeUrlKey(documentUrl);
    this.verifiedLocalPdfUris.delete(norm);
    const fileSystem = await this.getFileSystem();
    const cacheDir = fileSystem?.cacheDirectory || fileSystem?.documentDirectory;
    if (fileSystem && cacheDir) {
      const targetUri = `${cacheDir.replace(/\/?$/, '/')}${getSharedPdfCacheFileName(norm)}`;
      await fileSystem.deleteAsync(targetUri, { idempotent: true }).catch(() => undefined);
    }
  }

  private static async readFileBytes(
    uri: string,
    fileSystem: LocalFileSystem | null,
    blobUtil: NativeBlobUtilLike | null
  ): Promise<Uint8Array | null> {
    if (fileSystem) {
      try {
        const b64 = await fileSystem.readAsStringAsync(uri, { encoding: 'base64' });
        if (b64) return decodeBase64ToUint8Array(b64);
      } catch {
        // Try blobUtil below
      }
    }
    if (blobUtil) {
      try {
        const fsPath = uri.replace(/^file:\/\//i, '');
        const b64 = await blobUtil.fs.readFile(fsPath, 'base64');
        if (b64) return decodeBase64ToUint8Array(b64);
      } catch {
        // Fall through
      }
    }
    return null;
  }

  /**
   * Downloads and verifies an official GeM PDF into a shared local cache file so
   * LocalPdfScanner and BidDocumentViewer never double-download the same document.
   * Validates `%PDF-` magic bytes, detects buyer-uploaded non-PDF formats (.docx/.xlsx/.zip),
   * deduplicates concurrent requests, and retries once with a refreshed GeM session on failure.
   */
  public static async downloadPdfToSharedCache(
    documentUrl: string,
    options?: { forceRefresh?: boolean; readBytes?: boolean }
  ): Promise<SharedPdfDownloadResult> {
    if (!documentUrl || !PortalDocService.isSafeGemUrl(documentUrl)) {
      return { ok: false, error: 'Document link is not from a verified official GeM domain.' };
    }

    const norm = normalizeUrlKey(documentUrl);
    const forceRefresh = Boolean(options?.forceRefresh);
    const needBytes = Boolean(options?.readBytes);

    if (forceRefresh) {
      await this.invalidateLocalPdfCache(norm);
    }

    if (!forceRefresh) {
      const inflight = this.inFlightDownloads.get(norm);
      if (inflight) {
        const shared = await inflight;
        if (shared.ok && needBytes && !shared.bytes && shared.localUri) {
          const [fs, blob] = await Promise.all([this.getFileSystem(), this.getBlobUtil()]);
          const bytes = await this.readFileBytes(shared.localUri, fs, blob);
          if (bytes && isValidPdfBytes(bytes)) {
            return { ...shared, bytes };
          }
        }
        return shared;
      }
    }

    const job = this.performVerifiedDownload(norm, forceRefresh, needBytes);
    this.inFlightDownloads.set(norm, job);
    try {
      return await job;
    } finally {
      if (this.inFlightDownloads.get(norm) === job) {
        this.inFlightDownloads.delete(norm);
      }
    }
  }

  private static async performVerifiedDownload(
    documentUrl: string,
    forceRefresh: boolean,
    needBytes: boolean
  ): Promise<SharedPdfDownloadResult> {
    const [fileSystem, blobUtil] = await Promise.all([this.getFileSystem(), this.getBlobUtil()]);
    const rawCacheDir =
      fileSystem?.cacheDirectory ||
      fileSystem?.documentDirectory ||
      (blobUtil?.fs?.dirs?.CacheDir ? `file://${blobUtil.fs.dirs.CacheDir}` : null);
    const cacheDir = rawCacheDir ? rawCacheDir.replace(/\/?$/, '/') : null;
    const sharedFileName = getSharedPdfCacheFileName(documentUrl);
    const sharedUri = cacheDir ? `${cacheDir}${sharedFileName}` : null;
    const sharedFsPath = sharedUri ? sharedUri.replace(/^file:\/\//i, '') : null;

    // 0. Instant hit on already-verified disk cache
    if (!forceRefresh && sharedUri && fileSystem) {
      try {
        const info = await fileSystem.getInfoAsync(sharedUri);
        if (info.exists && typeof info.size === 'number' && info.size >= 100 && info.size <= MAX_SCAN_BYTES) {
          const bytes = await this.readFileBytes(sharedUri, fileSystem, blobUtil);
          if (bytes && isValidPdfBytes(bytes)) {
            this.verifiedLocalPdfUris.set(documentUrl, sharedUri);
            return { ok: true, localUri: sharedUri, bytes: needBytes ? bytes : undefined };
          }
          // Cached file was corrupt/HTML — purge immediately
          await fileSystem.deleteAsync(sharedUri, { idempotent: true }).catch(() => undefined);
          this.verifiedLocalPdfUris.delete(documentUrl);
        }
      } catch {
        // Proceed to fresh download
      }
    }

    let lastStatusCode: number | undefined;
    let lastError: string | undefined;

    // 1. Primary native fast path: ReactNativeBlobUtil (fast OkHttp binary client used by react-native-pdf)
    if (blobUtil && sharedUri && sharedFsPath) {
      const headers = await this.buildDownloadHeaders(false);
      try {
        const resp = await withTimeout(
          blobUtil
            .config({
              path: sharedFsPath,
              timeout: PDF_FETCH_TIMEOUT_MS,
              followRedirect: true,
            })
            .fetch('GET', documentUrl, headers),
          PDF_FETCH_TIMEOUT_MS + 2000,
          'PDF download'
        );
        const info = resp.info();
        const status = typeof info?.status === 'number' ? info.status : 200;
        lastStatusCode = status;
        const ct = getHeaderCaseInsensitive(info?.headers, 'content-type');
        const cd = getHeaderCaseInsensitive(info?.headers, 'content-disposition');
        const detected = PortalDocService.detectFormatFromHeaders(ct, cd, documentUrl);

        if (status >= 400) {
          await blobUtil.fs.unlink(sharedFsPath).catch(() => undefined);
          lastError = `GeM returned HTTP ${status} while downloading this document.`;
        } else if (
          detected.format !== 'PDF' &&
          !PortalDocService.isOfficialPdfUrl(documentUrl)
        ) {
          await blobUtil.fs.unlink(sharedFsPath).catch(() => undefined);
          return {
            ok: false,
            detectedFormat: detected.format,
            filename: detected.filename,
            statusCode: status,
          };
        } else {
          const stat = await blobUtil.fs.stat(sharedFsPath).catch(() => ({ size: 0 }));
          const fileSize = Number(stat?.size || 0);
          if (fileSize > MAX_SCAN_BYTES) {
            await blobUtil.fs.unlink(sharedFsPath).catch(() => undefined);
            return {
              ok: false,
              tooLarge: true,
              statusCode: status,
              error: 'This PDF is larger than the 12 MB device limit.',
            };
          }
          if (fileSize >= 100) {
            const bytes = await this.readFileBytes(sharedUri, fileSystem, blobUtil);
            if (bytes && isValidPdfBytes(bytes)) {
              this.verifiedLocalPdfUris.set(documentUrl, sharedUri);
              return { ok: true, localUri: sharedUri, bytes: needBytes ? bytes : undefined, statusCode: status };
            }
          }
          // Non-PDF / empty response — delete bad file and retry via stage 2 with refreshed GeM session
          await blobUtil.fs.unlink(sharedFsPath).catch(() => undefined);
          lastError = 'GeM returned an incomplete or non-PDF response on the first try.';
        }
      } catch (err) {
        await blobUtil.fs.unlink(sharedFsPath).catch(() => undefined);
        lastError = err instanceof Error ? err.message : 'Unable to download PDF from GeM.';
      }
    }

    // 2. Resilient native retry path: expo-file-system with refreshed GeM session cookie
    if (fileSystem && sharedUri) {
      const headers = await this.buildDownloadHeaders(true);
      try {
        const download = await withTimeout(
          fileSystem.downloadAsync(documentUrl, sharedUri, { headers }),
          PDF_FETCH_TIMEOUT_MS,
          'PDF retry download'
        );
        const downloadedUri = download.uri || sharedUri;
        if (typeof download.status === 'number') {
          lastStatusCode = download.status;
          if (download.status >= 400) {
            await fileSystem.deleteAsync(downloadedUri, { idempotent: true }).catch(() => undefined);
            return {
              ok: false,
              statusCode: download.status,
              error: `GeM returned HTTP ${download.status} while downloading this PDF.`,
            };
          }
        }
        const info = await fileSystem.getInfoAsync(downloadedUri);
        if (info.exists) {
          if (typeof info.size === 'number' && info.size > MAX_SCAN_BYTES) {
            await fileSystem.deleteAsync(downloadedUri, { idempotent: true }).catch(() => undefined);
            return {
              ok: false,
              tooLarge: true,
              error: 'This PDF is larger than the 12 MB device scan limit.',
            };
          }
          if (typeof info.size !== 'number' || info.size >= 100) {
            const bytes = await this.readFileBytes(downloadedUri, fileSystem, blobUtil);
            if (bytes && isValidPdfBytes(bytes)) {
              this.verifiedLocalPdfUris.set(documentUrl, downloadedUri);
              return { ok: true, localUri: downloadedUri, bytes: needBytes ? bytes : undefined };
            }
          }
        }
        await fileSystem.deleteAsync(downloadedUri, { idempotent: true }).catch(() => undefined);
      } catch (err) {
        await fileSystem.deleteAsync(sharedUri, { idempotent: true }).catch(() => undefined);
        lastError = err instanceof Error ? err.message : lastError;
      }
    }

    // 3. Direct binary fetch path (Node.js / Web / final fallback)
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const abortTimer = controller
      ? setTimeout(() => controller.abort(), PDF_FETCH_TIMEOUT_MS)
      : undefined;
    try {
      const headers = await this.buildDownloadHeaders(true);
      const response = await withTimeout(
        fetch(documentUrl, {
          method: 'GET',
          headers,
          signal: controller?.signal,
        }),
        PDF_FETCH_TIMEOUT_MS,
        'PDF fetch'
      );
      lastStatusCode = response.status;
      if (response.ok && typeof response.arrayBuffer === 'function') {
        const contentLen = Number(response.headers?.get?.('content-length') || 0);
        if (contentLen > MAX_SCAN_BYTES) {
          return {
            ok: false,
            tooLarge: true,
            statusCode: response.status,
            error: 'This PDF is larger than the 12 MB device scan limit.',
          };
        }
        const bytes = new Uint8Array(
          await withTimeout(response.arrayBuffer(), PDF_FETCH_TIMEOUT_MS, 'PDF buffer read')
        );
        if (bytes.byteLength > MAX_SCAN_BYTES) {
          return {
            ok: false,
            tooLarge: true,
            statusCode: response.status,
            error: 'This PDF is larger than the 12 MB device scan limit.',
          };
        }
        if (bytes.byteLength >= 100 && isValidPdfBytes(bytes)) {
          return { ok: true, bytes, statusCode: response.status };
        }
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : lastError;
    } finally {
      if (abortTimer) clearTimeout(abortTimer);
    }

    return {
      ok: false,
      statusCode: lastStatusCode,
      error:
        lastError ||
        'GeM took too long to return this PDF. Tap Retry or open the official document in your browser.',
    };
  }

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
  public static async scanBidDocuments(
    bid: DeconstructedBidDoc,
    options?: { forceRefresh?: boolean }
  ): Promise<LocalPdfScanResult> {
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
      return this.scanOfficialBidPdf(bid.bidNumber, primaryDoc.url, options);
    }

    const [parentScan, raScan] = await Promise.all([
      this.scanOfficialBidPdf(
        bid.parentBidNumber || `${bid.bidNumber}-parent`,
        parentDoc.url,
        options
      ).catch(() =>
        this.unavailableResult(
          bid.parentBidNumber || bid.bidNumber,
          parentDoc.url,
          'Original Bid PDF timed out.'
        )
      ),
      this.scanOfficialBidPdf(bid.bidNumber, primaryDoc.url, options).catch(() =>
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

    const mergedSearchableText = [parentScan.searchableText, raScan.searchableText]
      .filter(Boolean)
      .join('\n')
      .slice(0, MAX_SEARCHABLE_TEXT_CHARS);

    return {
      bidNumber: bid.bidNumber,
      documentUrl: primaryDoc.url,
      sourceUri: parentDoc.url,
      status: 'EXTRACTED',
      details: mergedDetails,
      textLength: parentScan.textLength + raScan.textLength,
      searchableText: mergedSearchableText || undefined,
      scannedAtUtc: new Date().toISOString(),
      note: `Extracted locally from RA PDF + Original Bid PDF (${bid.parentBidNumber || 'Parent Bid'}). Confirm all clauses before bidding.`,
    };
  }

  public static async scanOfficialBidPdf(
    bidNumber: string,
    documentUrl: string,
    options?: { forceRefresh?: boolean }
  ): Promise<LocalPdfScanResult> {
    const forceRefresh = Boolean(options?.forceRefresh);
    if (!forceRefresh) {
      const cached = await this.getCachedScan(bidNumber, documentUrl);
      if (cached && cached.status === 'EXTRACTED') return cached;
    }

    const download = await this.downloadPdfToSharedCache(documentUrl, {
      forceRefresh,
      readBytes: true,
    });

    if (download.tooLarge) {
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

    if (download.ok && download.bytes) {
      const result = scanSource(download.bytes, bidNumber, documentUrl, download.localUri || documentUrl);
      if (result.status === 'EXTRACTED') {
        await this.saveScan(result);
      }
      return result;
    }

    return this.unavailableResult(
      bidNumber,
      documentUrl,
      download.error ||
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

  private static async getBlobUtil(): Promise<NativeBlobUtilLike | null> {
    if (typeof require !== 'function') return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const rn = require('react-native') as { NativeModules?: Record<string, unknown> };
      if (!rn?.NativeModules?.ReactNativeBlobUtil) return null;
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('react-native-blob-util') as { default?: unknown };
      return ((mod && mod.default) || mod) as NativeBlobUtilLike;
    } catch {
      return null;
    }
  }
}
