/**
 * Device-only GeM bid PDF details scanner.
 *
 * This is deliberately opt-in and bounded. The companion downloads a public
 * PDF only when the user asks to scan it, extracts readable PDF text locally,
 * stores a small details record, and deletes the temporary PDF. No PDF bytes
 * or extracted text are sent to a companion server.
 */

import { GemPdfExtractor, type ExtractedGeMTenderDetails } from './GemPdfExtractor.ts';

const SCAN_CACHE_KEY = '@gem-mobile-companion/local-pdf-scan-v1';
const MAX_SCAN_BYTES = 12 * 1024 * 1024;

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
  downloadAsync(url: string, fileUri: string): Promise<{ uri?: string }>;
  getInfoAsync(uri: string): Promise<LocalFileInfo>;
  readAsStringAsync(uri: string, options?: { encoding?: string }): Promise<string>;
  deleteAsync(uri: string, options?: { idempotent?: boolean }): Promise<void>;
}

interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

/**
 * Extracts readable PDF text operators.
 */
export function extractPdfText(pdfSource: string): string {
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

  // Extended fields - only attached when present in tender text
  if (parsed.minAnnualTurnoverInr !== undefined) details.minAnnualTurnoverInr = parsed.minAnnualTurnoverInr;
  if (parsed.yearsExperienceRequired !== undefined) details.yearsExperienceRequired = parsed.yearsExperienceRequired;
  if (parsed.pastPerformancePercentage !== undefined) details.pastPerformancePercentage = parsed.pastPerformancePercentage;
  if (parsed.isEmdExemptForMse && /MSE\s+Exemption/i.test(text)) details.isEmdExemptForMse = parsed.isEmdExemptForMse;
  if (parsed.isEmdExemptForStartup && /Startup\s+Exemption/i.test(text)) details.isEmdExemptForStartup = parsed.isEmdExemptForStartup;
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

function scanSource(
  source: string,
  bidNumber: string,
  documentUrl: string,
  sourceUri: string
): LocalPdfScanResult {
  const text = extractPdfText(source);
  const details = extractPdfDetails(text, bidNumber);
  const extended = extractExtendedPdfDetails(text, bidNumber);
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
    note: 'Details and compliance barriers extracted locally from readable PDF text layer. Confirm every requirement before bidding.',
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

  public static async scanOfficialBidPdf(
    bidNumber: string,
    documentUrl: string
  ): Promise<LocalPdfScanResult> {
    const cached = await this.getCachedScan(bidNumber, documentUrl);
    if (cached) return cached;

    const fileSystem = await this.getFileSystem();
    const temporaryDirectory = fileSystem?.cacheDirectory || fileSystem?.documentDirectory;
    if (!fileSystem || !temporaryDirectory) {
      return this.unavailableResult(bidNumber, documentUrl, 'Device file storage is unavailable for local scanning.');
    }

    const safeName = bidNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const temporaryUri = `${temporaryDirectory.replace(/\/?$/, '/') }gem-pdf-scan-${safeName}.pdf`;
    let downloadedUri = temporaryUri;

    try {
      const download = await fileSystem.downloadAsync(documentUrl, temporaryUri);
      downloadedUri = download.uri || temporaryUri;
      const info = await fileSystem.getInfoAsync(downloadedUri);
      if (!info.exists) {
        return this.unavailableResult(bidNumber, documentUrl, 'The official PDF could not be downloaded to this device.');
      }
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

      const source = await fileSystem.readAsStringAsync(downloadedUri, { encoding: 'utf8' });
      const result = scanSource(source, bidNumber, documentUrl, documentUrl);
      await this.saveScan(result);
      return result;
    } catch {
      return this.unavailableResult(bidNumber, documentUrl, 'The PDF could not be read locally on this device.');
    } finally {
      await fileSystem.deleteAsync(downloadedUri, { idempotent: true }).catch(() => undefined);
    }
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
      const cache = parsed && typeof parsed === 'object' ? parsed as Record<string, LocalPdfScanResult> : {};
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
