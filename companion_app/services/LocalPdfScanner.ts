/**
 * Device-only GeM bid PDF details scanner.
 *
 * This is deliberately opt-in and bounded. The companion downloads a public
 * PDF only when the user asks to scan it, extracts readable PDF text locally,
 * stores a small details record, and deletes the temporary PDF. No PDF bytes
 * or extracted text are sent to a companion server.
 */

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

function decodePdfLiteral(value: string): string {
  return value
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\([\\()])/g, '$1');
}

/**
 * Extracts text from uncompressed PDF text operators. Scanned image-only PDFs
 * are reported as unsupported instead of being uploaded for remote OCR.
 */
export function extractPdfText(pdfSource: string): string {
  const blocks = Array.from(pdfSource.matchAll(/BT([\s\S]*?)ET/g)).map((match) => match[1]);
  const scopes = blocks.length > 0 ? blocks : [pdfSource];
  const parts: string[] = [];

  for (const scope of scopes) {
    // Text can be emitted as a single Tj operand or as strings inside a TJ
    // array. The BT/ET scope keeps this from treating ordinary PDF metadata as
    // bid text.
    const literalPattern = /\(((?:\\.|[^\\)])*)\)/g;
    let match: RegExpExecArray | null;
    while ((match = literalPattern.exec(scope)) !== null) {
      parts.push(decodePdfLiteral(match[1]));
    }

    const hexPattern = /<([0-9a-f\s]+)>/gi;
    while ((match = hexPattern.exec(scope)) !== null) {
      const hex = match[1].replace(/\s+/g, '');
      let decoded = '';
      for (let index = 0; index + 1 < hex.length; index += 2) {
        decoded += String.fromCharCode(parseInt(hex.slice(index, index + 2), 16));
      }
      parts.push(decoded);
    }
  }

  return parts
    .join('\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractLabeledLine(text: string, labels: string[]): string | undefined {
  const expression = new RegExp(`(?:${labels.join('|')})\\s*[:\\-]?\\s*([^\\n]{2,160})`, 'i');
  const match = text.match(expression);
  return match?.[1]?.replace(/\s+/g, ' ').trim() || undefined;
}

function extractMoney(text: string, labels: string[]): number | undefined {
  const expression = new RegExp(
    `(?:${labels.join('|')})[^\\d₹]{0,100}(?:₹|rs\\.?|inr)?\\s*([\\d,]+(?:\\.\\d+)?)`,
    'i'
  );
  const match = text.match(expression);
  if (!match) return undefined;
  const amount = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(amount) ? amount : undefined;
}

export function extractPdfDetails(text: string, fallbackBidNumber?: string): LocalPdfDetails {
  const details: LocalPdfDetails = {};
  const bidNumber =
    text.match(/\bGEM\s*\/\s*\d{4}\s*\/\s*[A-Z]+\s*\/\s*\d+\b/i)?.[0]?.replace(/\s+/g, '') ||
    fallbackBidNumber;
  const title = extractLabeledLine(text, ['bid title', 'item title', 'product name', 'service name']);
  const department = extractLabeledLine(text, ['department', 'buyer department', 'organisation']);
  const ministry = extractLabeledLine(text, ['ministry']);
  const closingDate = extractLabeledLine(text, [
    'bid closing date',
    'bid end date',
    'closing date',
    'end date',
  ]);
  const estimatedValueInr = extractMoney(text, ['estimated bid value', 'total bid value', 'estimated value']);
  const emdAmountInr = extractMoney(text, ['emd amount', 'earnest money deposit', 'emd']);

  if (bidNumber) details.bidNumber = bidNumber;
  if (title) details.title = title;
  if (department) details.department = department;
  if (ministry) details.ministry = ministry;
  if (closingDate) details.closingDate = closingDate;
  if (estimatedValueInr !== undefined) details.estimatedValueInr = estimatedValueInr;
  if (emdAmountInr !== undefined) details.emdAmountInr = emdAmountInr;

  return details;
}

function scanSource(
  source: string,
  bidNumber: string,
  documentUrl: string,
  sourceUri: string
): LocalPdfScanResult {
  const text = extractPdfText(source);
  const details = extractPdfDetails(text, bidNumber);
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
    note: 'Details were extracted locally from the readable PDF text layer. Confirm every requirement in the official GeM document.',
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
