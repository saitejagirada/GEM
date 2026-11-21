/**
 * GeM Mobile Companion App - High-Speed On-Device PDF Text & Clause Extractor
 *
 * Pure TypeScript / JavaScript implementation for React Native (Hermes Engine)
 * and Node environments:
 * - Self-contained RFC 1950/1951 Zlib/Deflate inflate engine (zero Node zlib dependency)
 * - Official GeM wkhtmltopdf /ToUnicode CMap glyph decoder (beginbfchar & beginbfrange)
 * - Two-column (x < 300 vs x >= 300) table row stitcher for GeM Bid Details tables
 * - Backwards-compatible literal (...) Tj / [...] TJ / <hex> Tj operator parser
 */

export interface ExtractedConsignee {
  sNo: number;
  officer?: string;
  address: string;
  pincode: string;
  state: string;
  quantity: number;
  deliveryDays?: number;
}

export interface ExtractedGeMTenderDetails {
  bidNumber?: string;
  title?: string;
  department?: string;
  ministry?: string;
  organisation?: string;
  officeName?: string;
  closingDate?: string;
  bidOpeningDate?: string;
  bidValidityDays?: number;
  totalQuantity?: number;
  itemCategory?: string;
  typeOfBid?: string;

  // Commercial & Financial Thresholds
  estimatedValueInr?: number;
  emdAmountInr?: number;
  isEmdExemptForMse: boolean;
  isEmdExemptForStartup: boolean;
  epbgPercentage?: number;
  epbgDurationMonths?: number;
  minAnnualTurnoverInr?: number;
  turnoverRawText?: string;

  // Past Experience & Performance
  yearsExperienceRequired?: number;
  pastPerformancePercentage?: number;

  // Policies & Preferences
  msePurchasePreference: boolean;
  mseExemptionForExpAndTurnover: boolean;
  startupExemptionForExpAndTurnover: boolean;
  miiPurchasePreference: boolean;
  miiLocalContentPercentage?: number;
  miiClass?: 'CLASS_1' | 'CLASS_2' | 'NON_LOCAL';

  // Logistics & Splitting
  isSplittingApplied: boolean;
  splittingRatio?: string;
  deliveryPeriodDays?: number;
  consignees: ExtractedConsignee[];
  consigneeStateDistribution: Record<string, { count: number; quantity: number; percentage: number }>;

  // Mandatory Compliance & ATC Requirements
  requiredDocuments: string[];
  requiresOemAuthorization: boolean;
  requiresCaTurnoverCertificate: boolean;
  requiresMiiDeclaration: boolean;
  requiresGstCertificate: boolean;
  requiresPastPerformanceDoc: boolean;
  atcClauses: string[];
  isRaEnabled: boolean;
}

const INDIAN_STATES_AND_UTS = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam',
  'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

// -----------------------------------------------------------------------------
// Pure-TypeScript RFC 1950 (Zlib) & RFC 1951 (Deflate) Decompressor for Hermes
// -----------------------------------------------------------------------------

const LENGTH_BASE = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
  35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258,
];
const LENGTH_EXTRA = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2,
  3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0,
];
const DIST_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
  257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577,
];
const DIST_EXTRA = [
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
  7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13,
];
const CODE_LEN_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

interface HuffmanTable {
  counts: Int32Array;
  symbols: Int32Array;
}

function buildHuffmanTable(lengths: Uint8Array, numSymbols: number): HuffmanTable {
  const counts = new Int32Array(16);
  for (let i = 0; i < numSymbols; i++) {
    const len = lengths[i];
    if (len > 0 && len < 16) counts[len]++;
  }
  const offsets = new Int32Array(16);
  let total = 0;
  for (let len = 1; len < 16; len++) {
    offsets[len] = total;
    total += counts[len];
  }
  const symbols = new Int32Array(total);
  for (let i = 0; i < numSymbols; i++) {
    const len = lengths[i];
    if (len > 0 && len < 16) {
      symbols[offsets[len]++] = i;
    }
  }
  return { counts, symbols };
}

const FIXED_LIT_LENGTHS = (() => {
  const arr = new Uint8Array(288);
  for (let i = 0; i <= 143; i++) arr[i] = 8;
  for (let i = 144; i <= 255; i++) arr[i] = 9;
  for (let i = 256; i <= 279; i++) arr[i] = 7;
  for (let i = 280; i <= 287; i++) arr[i] = 8;
  return arr;
})();

const FIXED_DIST_LENGTHS = (() => {
  const arr = new Uint8Array(32);
  arr.fill(5);
  return arr;
})();

const FIXED_LIT_TABLE = buildHuffmanTable(FIXED_LIT_LENGTHS, 288);
const FIXED_DIST_TABLE = buildHuffmanTable(FIXED_DIST_LENGTHS, 32);

function pureInflateRaw(src: Uint8Array, startOffset: number): Uint8Array | null {
  let bytePos = startOffset;
  let bitBuf = 0;
  let bitCnt = 0;

  let out = new Uint8Array(Math.max(4096, src.length * 3));
  let outLen = 0;

  const ensureOut = (extra: number) => {
    if (outLen + extra <= out.length) return;
    let nextSize = out.length * 2;
    while (nextSize < outLen + extra) nextSize *= 2;
    const next = new Uint8Array(nextSize);
    next.set(out.subarray(0, outLen));
    out = next;
  };

  const bits = (n: number): number => {
    while (bitCnt < n) {
      if (bytePos >= src.length) throw new Error('EOF');
      bitBuf |= src[bytePos++] << bitCnt;
      bitCnt += 8;
    }
    const val = bitBuf & ((1 << n) - 1);
    bitBuf >>>= n;
    bitCnt -= n;
    return val;
  };

  const decodeSymbol = (table: HuffmanTable): number => {
    let code = 0;
    let first = 0;
    let index = 0;
    for (let len = 1; len <= 15; len++) {
      code |= bits(1);
      const count = table.counts[len];
      if (code - count < first) {
        return table.symbols[index + (code - first)];
      }
      index += count;
      first += count;
      first <<= 1;
      code <<= 1;
    }
    throw new Error('Invalid Huffman code');
  };

  try {
    let bfinal = 0;
    while (!bfinal) {
      bfinal = bits(1);
      const btype = bits(2);

      if (btype === 0) {
        // Uncompressed block
        bitBuf = 0;
        bitCnt = 0;
        if (bytePos + 4 > src.length) return null;
        const len = src[bytePos] | (src[bytePos + 1] << 8);
        const nlen = src[bytePos + 2] | (src[bytePos + 3] << 8);
        bytePos += 4;
        if ((len ^ 0xffff) !== nlen) return null;
        if (bytePos + len > src.length) return null;
        ensureOut(len);
        out.set(src.subarray(bytePos, bytePos + len), outLen);
        outLen += len;
        bytePos += len;
      } else if (btype === 1 || btype === 2) {
        let litTable = FIXED_LIT_TABLE;
        let distTable = FIXED_DIST_TABLE;

        if (btype === 2) {
          const hlit = bits(5) + 257;
          const hdist = bits(5) + 1;
          const hclen = bits(4) + 4;
          const codeLengths = new Uint8Array(19);
          for (let i = 0; i < hclen; i++) {
            codeLengths[CODE_LEN_ORDER[i]] = bits(3);
          }
          const codeLenTable = buildHuffmanTable(codeLengths, 19);
          const allLengths = new Uint8Array(hlit + hdist);
          let idx = 0;
          while (idx < hlit + hdist) {
            const sym = decodeSymbol(codeLenTable);
            if (sym < 16) {
              allLengths[idx++] = sym;
            } else if (sym === 16) {
              const prev = idx > 0 ? allLengths[idx - 1] : 0;
              const rep = bits(2) + 3;
              for (let r = 0; r < rep && idx < hlit + hdist; r++) allLengths[idx++] = prev;
            } else if (sym === 17) {
              const rep = bits(3) + 3;
              for (let r = 0; r < rep && idx < hlit + hdist; r++) allLengths[idx++] = 0;
            } else if (sym === 18) {
              const rep = bits(7) + 11;
              for (let r = 0; r < rep && idx < hlit + hdist; r++) allLengths[idx++] = 0;
            }
          }
          litTable = buildHuffmanTable(allLengths.subarray(0, hlit), hlit);
          distTable = buildHuffmanTable(allLengths.subarray(hlit), hdist);
        }

        while (true) {
          const sym = decodeSymbol(litTable);
          if (sym < 256) {
            ensureOut(1);
            out[outLen++] = sym;
          } else if (sym === 256) {
            break;
          } else {
            const lenIdx = sym - 257;
            if (lenIdx < 0 || lenIdx >= LENGTH_BASE.length) return null;
            const length = LENGTH_BASE[lenIdx] + (LENGTH_EXTRA[lenIdx] ? bits(LENGTH_EXTRA[lenIdx]) : 0);
            const distSym = decodeSymbol(distTable);
            if (distSym < 0 || distSym >= DIST_BASE.length) return null;
            const distance = DIST_BASE[distSym] + (DIST_EXTRA[distSym] ? bits(DIST_EXTRA[distSym]) : 0);
            if (distance > outLen) return null;
            ensureOut(length);
            for (let k = 0; k < length; k++) {
              out[outLen] = out[outLen - distance];
              outLen++;
            }
          }
        }
      } else {
        return null;
      }
    }
    return out.subarray(0, outLen);
  } catch {
    return null;
  }
}

export function fastDecompress(buffer: Uint8Array): string {
  // Check for RFC 1950 zlib header (CMF/FLG, e.g. 0x78 0x9C, 0x78 0x01, 0x78 0xDA)
  let inflated: Uint8Array | null = null;
  if (
    buffer.length >= 2 &&
    (buffer[0] & 0x0f) === 8 &&
    ((buffer[0] << 8) + buffer[1]) % 31 === 0
  ) {
    const fdict = (buffer[1] & 0x20) !== 0;
    inflated = pureInflateRaw(buffer, fdict ? 6 : 2);
  }
  if (!inflated) {
    inflated = pureInflateRaw(buffer, 0);
  }

  const target = inflated ?? buffer;
  let out = '';
  const chunk = 8192;
  for (let i = 0; i < target.length; i += chunk) {
    out += String.fromCharCode(...target.subarray(i, Math.min(target.length, i + chunk)));
  }
  return out;
}

const PIN_PREFIX_TO_STATE: Array<[number, number, string]> = [
  [11, 11, 'Delhi'],
  [12, 13, 'Haryana'],
  [14, 16, 'Punjab'],
  [17, 17, 'Himachal Pradesh'],
  [18, 19, 'Jammu and Kashmir'],
  [20, 28, 'Uttar Pradesh'],
  [30, 34, 'Rajasthan'],
  [36, 39, 'Gujarat'],
  [40, 44, 'Maharashtra'],
  [45, 48, 'Madhya Pradesh'],
  [49, 49, 'Chhattisgarh'],
  [50, 50, 'Telangana'],
  [51, 53, 'Andhra Pradesh'],
  [56, 59, 'Karnataka'],
  [60, 64, 'Tamil Nadu'],
  [67, 69, 'Kerala'],
  [70, 74, 'West Bengal'],
  [75, 77, 'Odisha'],
  [78, 78, 'Assam'],
  [80, 85, 'Bihar'],
];

function inferStateFromPincode(pincode: string): string {
  const prefix = parseInt(pincode.slice(0, 2), 10);
  if (!Number.isFinite(prefix)) return 'India';
  for (const [min, max, state] of PIN_PREFIX_TO_STATE) {
    if (prefix >= min && prefix <= max) return state;
  }
  return 'India';
}

function decodePdfHexString(rawHex: string): string {
  const hex = rawHex.replace(/\s+/g, '');
  if (!hex || hex.length < 2) return '';

  // Detect UTF-16BE hex strings used by TCPDF (e.g., GeM RA PDFs: <005200410020...>)
  let isUtf16Be = false;
  if (hex.length >= 4 && hex.length % 4 === 0) {
    if (/^feff/i.test(hex)) {
      isUtf16Be = true;
    } else {
      const pairs = hex.length / 4;
      let zeroHighBytes = 0;
      for (let i = 0; i < hex.length; i += 4) {
        const hi = parseInt(hex.slice(i, i + 2), 16);
        if (hi === 0x00 || hi === 0x09 || hi === 0x20) {
          zeroHighBytes += 1;
        }
      }
      if (zeroHighBytes / pairs >= 0.6) {
        isUtf16Be = true;
      }
    }
  }

  if (isUtf16Be) {
    let start = /^feff/i.test(hex) ? 4 : 0;
    let decoded = '';
    for (let i = start; i + 3 < hex.length; i += 4) {
      const code = parseInt(hex.slice(i, i + 4), 16);
      if (code === 0) continue;
      // Strip Devanagari bilingual headers so ASCII English key/values align cleanly
      if (code >= 0x0900 && code <= 0x097f) continue;
      decoded += String.fromCharCode(code);
    }
    return decoded;
  }

  let decoded = '';
  for (let i = 0; i + 1 < hex.length; i += 2) {
    const code = parseInt(hex.slice(i, i + 2), 16);
    if (code === 0) continue;
    decoded += String.fromCharCode(code);
  }
  return decoded;
}

function stringToUint8Array(str: string): Uint8Array {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i) & 0xff;
  }
  return arr;
}

function parseToUnicodeCMap(cmapText: string): Map<number, string> {
  const map = new Map<number, string>();
  if (!cmapText) return map;

  for (const block of cmapText.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const pair of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
      const code = parseInt(pair[1], 16);
      const hex = pair[2];
      let decoded = '';
      for (let i = 0; i < hex.length; i += 4) {
        decoded += String.fromCodePoint(parseInt(hex.slice(i, i + 4), 16));
      }
      map.set(code, decoded);
    }
  }

  for (const block of cmapText.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    const lines = block[1].trim().split(/[\r\n]+/);
    for (const line of lines) {
      const arrMatch = line.match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*\[([\s\S]*?)\]/);
      if (arrMatch) {
        const start = parseInt(arrMatch[1], 16);
        const items = Array.from(arrMatch[3].matchAll(/<([0-9a-fA-F]+)>/g)).map((m) => m[1]);
        items.forEach((u, idx) => {
          let decoded = '';
          for (let i = 0; i < u.length; i += 4) {
            decoded += String.fromCodePoint(parseInt(u.slice(i, i + 4), 16));
          }
          map.set(start + idx, decoded);
        });
        continue;
      }
      const seqMatch = line.match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/);
      if (seqMatch) {
        const start = parseInt(seqMatch[1], 16);
        const end = parseInt(seqMatch[2], 16);
        const base = parseInt(seqMatch[3], 16);
        for (let c = start; c <= end; c++) {
          map.set(c, String.fromCodePoint(base + (c - start)));
        }
      }
    }
  }

  return map;
}

export class GemPdfExtractor {
  /**
   * Decodes PDF literal string escape sequences.
   */
  public static decodePdfLiteral(literal: string): string {
    return literal
      .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)))
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\b/g, '\b')
      .replace(/\\f/g, '\f')
      .replace(/\\([\\()])/g, '$1');
  }

  /**
   * High-speed raw PDF text layer extraction.
   * Supports both:
   * 1. Real GeM wkhtmltopdf PDFs (Type0 /Identity-H fonts with /ToUnicode CMaps & two-column layout)
   * 2. Standard literal / hex PDF content streams.
   */
  public static extractTextFromPdfSource(pdfSource: string | Uint8Array): string {
    let rawPdf = '';
    if (typeof pdfSource === 'string') {
      rawPdf = pdfSource;
    } else {
      const chunk = 8192;
      for (let i = 0; i < pdfSource.length; i += chunk) {
        rawPdf += String.fromCharCode(...pdfSource.subarray(i, Math.min(pdfSource.length, i + chunk)));
      }
    }

    // 1. Check for numbered PDF objects with /ToUnicode font CMaps (real wkhtmltopdf GeM PDFs)
    const objects = new Map<string, string>();
    const objRegex = /(\d+)\s+0\s+obj\b([\s\S]*?)endobj/g;
    let objMatch: RegExpExecArray | null;
    while ((objMatch = objRegex.exec(rawPdf)) !== null) {
      objects.set(objMatch[1], objMatch[2]);
    }

    const getObjectStream = (objBody?: string): string => {
      if (!objBody) return '';
      const sm = objBody.match(/stream[\r\n]+([\s\S]*?)[\r\n]+endstream/);
      if (!sm) return '';
      if (objBody.includes('/FlateDecode')) {
        return fastDecompress(stringToUint8Array(sm[1]));
      }
      return sm[1];
    };

    const fontMaps = new Map<string, Map<number, string>>();
    if (objects.size > 0) {
      for (const [, body] of objects) {
        for (const fe of body.matchAll(/\/(F\d+)\s+(\d+)\s+0\s+R/g)) {
          const fontName = fe[1];
          const fontObj = objects.get(fe[2]);
          const toUni = fontObj?.match(/\/ToUnicode\s+(\d+)\s+0\s+R/);
          if (toUni && !fontMaps.has(fontName)) {
            const cmapStream = getObjectStream(objects.get(toUni[1]));
            const parsedMap = parseToUnicodeCMap(cmapStream);
            if (parsedMap.size > 0) {
              fontMaps.set(fontName, parsedMap);
            }
          }
        }
      }
    }

    if (fontMaps.size > 0) {
      const cmapLines: string[] = [];
      for (const [, body] of objects) {
        if (!body.includes('/FlateDecode') || body.includes('/Subtype /Image') || body.includes('/Length1')) {
          continue;
        }
        const stream = getObjectStream(body);
        if (!stream.includes('BT')) continue;
        this.extractCMapPositionedRows(stream, fontMaps, cmapLines);
      }
      if (cmapLines.length > 0) {
        return cmapLines.join('\n').trim();
      }
    }

    // 2. Standard stream / operator pass (for literal Tj/TJ & ASCII hex PDFs)
    const textPieces: string[] = [];
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match: RegExpExecArray | null;
    let hasStreamMatches = false;

    while ((match = streamRegex.exec(rawPdf)) !== null) {
      hasStreamMatches = true;
      const streamContent = match[1];
      const matchIndex = match.index;
      const leadingChunk = rawPdf.slice(Math.max(0, matchIndex - 300), matchIndex);

      let decompressed = streamContent;
      if (leadingChunk.includes('/FlateDecode')) {
        decompressed = fastDecompress(stringToUint8Array(streamContent));
      }

      this.extractTextFromOperatorStream(decompressed, textPieces);
    }

    if (!hasStreamMatches || textPieces.length === 0) {
      this.extractTextFromOperatorStream(rawPdf, textPieces);
    }

    return textPieces
      .join('\n')
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Decodes wkhtmltopdf positioned glyph runs using per-font ToUnicode CMaps and
   * stitches left (x < 300) and right (x >= 300) table cells on the same Y row.
   */
  private static extractCMapPositionedRows(
    stream: string,
    fontMaps: Map<string, Map<number, string>>,
    outputLines: string[]
  ): void {
    const spans: Array<{ x: number; y: number; text: string }> = [];

    for (const bt of stream.matchAll(/BT([\s\S]*?)ET/g)) {
      // Remove duplicate BDC .. EMC shadow runs emitted by wkhtmltopdf
      const clean = bt[1].replace(/\/Span\s*<<[\s\S]*?>>\s*BDC[\s\S]*?EMC/g, '');
      let currentFont = 'F8';
      let x = 0;
      let y = 0;
      let text = '';
      let spanX = 0;
      let spanY = 0;

      const tokenRe =
        /\/(F\d+)\s+[\d.]+\s+Tf|1\s+0\s+0\s+-1\s+([-\d.]+)\s+([-\d.]+)\s+Tm|([-\d.]+)\s+([-\d.]+)\s+Td|<([0-9a-fA-F]+)>\s*Tj/g;
      let tok: RegExpExecArray | null;
      while ((tok = tokenRe.exec(clean)) !== null) {
        if (tok[1]) {
          currentFont = tok[1];
        } else if (tok[2] !== undefined) {
          if (text.trim()) {
            spans.push({ x: spanX, y: spanY, text: text.trim() });
            text = '';
          }
          x = parseFloat(tok[2]);
          y = parseFloat(tok[3]);
        } else if (tok[4] !== undefined) {
          const dx = parseFloat(tok[4]);
          const dy = parseFloat(tok[5]);
          if (Math.abs(dy) > 2 || Math.abs(dx) > 40) {
            if (text.trim()) {
              spans.push({ x: spanX, y: spanY, text: text.trim() });
              text = '';
            }
          }
          x += dx;
          y += dy;
        } else if (tok[6]) {
          if (!text) {
            spanX = x;
            spanY = y;
          }
          const hex = tok[6];
          const fmap = fontMaps.get(currentFont);
          for (let i = 0; i < hex.length; i += 4) {
            const code = parseInt(hex.slice(i, i + 4), 16);
            text += fmap?.get(code) ?? '';
          }
        }
      }
      if (text.trim()) {
        spans.push({ x: spanX, y: spanY, text: text.trim() });
      }
    }

    const rows: Array<{ y: number; items: Array<{ x: number; text: string }> }> = [];
    for (const sp of spans) {
      const ascii = sp.text
        .replace(/[\u0900-\u097F]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!ascii || ascii === '/' || ascii === '( )') continue;
      let row = rows.find((r) => Math.abs(r.y - sp.y) <= 10);
      if (!row) {
        row = { y: sp.y, items: [] };
        rows.push(row);
      }
      row.items.push({ x: sp.x, text: ascii.replace(/^\/\s*/, '') });
    }

    rows.sort((a, b) => b.y - a.y);
    for (const r of rows) {
      r.items.sort((a, b) => a.x - b.x);
      const left = r.items
        .filter((i) => i.x < 300)
        .map((i) => i.text)
        .join(' ')
        .trim();
      const right = r.items
        .filter((i) => i.x >= 300)
        .map((i) => i.text)
        .join(' ')
        .trim();
      if (left && right) {
        outputLines.push(`${left} : ${right}`);
      } else if (left || right) {
        outputLines.push(left || right);
      }
    }
  }

  /**
   * Parses BT ... ET blocks and decodes Tj and TJ operators into text lines.
   * Handles literal strings, ASCII hex strings, and TCPDF UTF-16BE hex strings.
   */
  private static extractTextFromOperatorStream(stream: string, output: string[]): void {
    const btMatches = stream.matchAll(/BT([\s\S]*?)ET/g);
    for (const bt of btMatches) {
      const scope = bt[1];

      const tjArrayRegex = /\[(.*?)\]\s*TJ/gi;
      let tjMatch: RegExpExecArray | null;
      while ((tjMatch = tjArrayRegex.exec(scope)) !== null) {
        const inner = tjMatch[1];
        const tokenPattern = /\(((?:\\.|[^\\)])*)\)|<([0-9a-f\s]+)>/gi;
        let tokMatch: RegExpExecArray | null;
        const lineParts: string[] = [];
        while ((tokMatch = tokenPattern.exec(inner)) !== null) {
          if (tokMatch[1] !== undefined) {
            lineParts.push(this.decodePdfLiteral(tokMatch[1]));
          } else if (tokMatch[2] !== undefined) {
            const decodedHex = decodePdfHexString(tokMatch[2]);
            if (decodedHex) lineParts.push(decodedHex);
          }
        }
        const joined = lineParts.join('').trim();
        if (joined) {
          output.push(joined);
        }
      }

      const tjSimpleRegex = /\(((?:\\.|[^\\)])*)\)\s*Tj/gi;
      let simpleMatch: RegExpExecArray | null;
      while ((simpleMatch = tjSimpleRegex.exec(scope)) !== null) {
        const decoded = this.decodePdfLiteral(simpleMatch[1]);
        if (decoded) output.push(decoded);
      }

      const hexRegex = /<([0-9a-f\s]+)>\s*T[jJ]/gi;
      let hexMatch: RegExpExecArray | null;
      while ((hexMatch = hexRegex.exec(scope)) !== null) {
        const decoded = decodePdfHexString(hexMatch[1]).trim();
        if (decoded) output.push(decoded);
      }
    }
  }

  /**
   * Helper to extract a single labeled line with flexible whitespace, parentheses, and colons.
   */
  public static extractLabeledField(text: string, labels: string[]): string | undefined {
    const escaped = labels.map((l) => l.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
    const regex = new RegExp(`(?:${escaped})(?:\\s*\\([^)]*\\))?\\s*[:\\-]?\\s*([^\\n\\r]{2,180})`, 'i');
    const match = text.match(regex);
    return match?.[1]?.replace(/^[:\-\s]+/, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Parses Indian monetary values with Lakhs, Crores, or raw numbers into an INR integer.
   */
  public static parseIndianCurrency(valStr: string): number | undefined {
    if (!valStr) return undefined;
    const clean = valStr.replace(/₹|Rs\.?|INR|,/gi, '').trim();

    const croreMatch = clean.match(/([\d.]+)\s*(?:Crores?|Cr)/i);
    if (croreMatch) {
      const num = parseFloat(croreMatch[1]);
      return Number.isFinite(num) ? Math.round(num * 10000000) : undefined;
    }

    const lakhMatch = clean.match(/([\d.]+)\s*(?:Lakhs?|Lacs?|L\b)/i);
    if (lakhMatch) {
      const num = parseFloat(lakhMatch[1]);
      return Number.isFinite(num) ? Math.round(num * 100000) : undefined;
    }

    const directMatch = clean.match(/^([\d.]+)/);
    if (directMatch) {
      const num = parseFloat(directMatch[1]);
      return Number.isFinite(num) ? Math.round(num) : undefined;
    }

    return undefined;
  }

  /**
   * Master GeM Tender Extraction Engine.
   * Applies exact regex and heuristic rules across all standard tables and clauses,
   * including multi-line wrapped labels produced by wkhtmltopdf on bidplus.gem.gov.in.
   */
  public static parseGeMTenderText(text: string, fallbackBidNumber?: string): ExtractedGeMTenderDetails {
    const bidNumberMatch =
      text.match(/\bGEM\s*\/\s*\d{4}\s*\/\s*[A-Z]+\s*\/\s*\d+\b/i)?.[0]?.replace(/\s+/g, '') ||
      fallbackBidNumber;

    const itemCategory = this.extractLabeledField(text, ['item category', 'primary product category', 'category']);
    const title =
      this.extractLabeledField(text, ['bid title', 'item title', 'product name', 'service name']) || itemCategory;
    const department = this.extractLabeledField(text, ['department name', 'buyer department', 'department']);
    const ministry = this.extractLabeledField(text, ['ministry/state name', 'ministry']);
    const organisation = this.extractLabeledField(text, ['organisation name', 'organization']);
    const officeName = this.extractLabeledField(text, ['office name']);
    const closingDate = this.extractLabeledField(text, [
      'bid end date/time',
      'ra end date/time',
      'bid closing date',
      'end date',
    ]);
    const bidOpeningDate = this.extractLabeledField(text, [
      'bid opening date/time',
      'ra start date/time',
      'bid opening date',
      'bid opening',
    ]);

    const validityMatch = text.match(/Bid\s+Offer[\s\S]{0,40}?(\d+)\s*\(\s*Days\s*\)/i);
    const bidValidityDays = validityMatch ? parseInt(validityMatch[1], 10) : undefined;

    const qtyMatch = text.match(/Total\s+Quantity\s*[:\-\n]?\s*(\d+)/i);
    const totalQuantity = qtyMatch ? parseInt(qtyMatch[1], 10) : undefined;

    const typeOfBid = this.extractLabeledField(text, ['type of bid']);

    // 2. Turnover Extraction (supports single-line, wkhtmltopdf wrapped label, and bilingual Hindi/English row wrap)
    const turnoverCandidates = [
      this.extractLabeledField(text, [
        'minimum average annual turnover of the bidder',
        'minimum average annual turnover',
        'minimum average annual',
        'bidder turnover',
        'annual turnover of bidder',
        'oem average turnover',
      ]),
      text.match(/Minimum\s+Average\s+Annual[\s\S]{0,60}?([\d.]+\s*(?:Lakhs?|Lacs?|Crores?|Cr)(?:\s*\(s\))?)/i)?.[1],
      text.match(
        /:\s*([\d.]+\s*(?:Lakhs?|Lacs?|Crores?|Cr)(?:\s*\(s\))?)\s*\n[^\n]{0,40}(?:Minimum\s+Average\s+Annual|Bidder\s+Turnover|OEM\s+Average\s+Turnover)/i
      )?.[1],
    ];
    let turnoverLine: string | undefined;
    let minAnnualTurnoverInr: number | undefined;
    for (const candidate of turnoverCandidates) {
      if (!candidate) continue;
      const parsed = this.parseIndianCurrency(candidate);
      if (parsed !== undefined) {
        turnoverLine = candidate;
        minAnnualTurnoverInr = parsed;
        break;
      }
    }

    // 3. Past Experience Extraction (supports single-line AND wkhtmltopdf wrapped label)
    const expMatch = text.match(/Years\s+of\s+Past\s+Experience\s+Required[^\d]{0,35}(\d+(?:\.\d+)?)\s*Year/i);
    const yearsExperienceRequired = expMatch ? parseFloat(expMatch[1]) : undefined;

    const pastPerfMatch = text.match(/Past\s+Performance\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*%/i);
    const pastPerformancePercentage = pastPerfMatch ? parseFloat(pastPerfMatch[1]) : undefined;

    // 4. MSE & Startup Exemptions (handles both single-line, wkhtmltopdf wrapped, and TCPDF RA multiline layouts)
    const mseExemptionMatch = text.match(
      /MSE\s+(?:Exemption|Relaxation)\s+for\s+Years[\s\S]{0,65}?[:\-\n]\s*(Yes|No)\b/i
    );
    const mseExemptionForExpAndTurnover = mseExemptionMatch ? mseExemptionMatch[1].toLowerCase() === 'yes' : false;

    const startupExemptionMatch = text.match(
      /Startup\s+(?:Exemption|Relaxation)\s+for\s+Years[\s\S]{0,65}?[:\-\n]\s*(Yes|No)\b/i
    );
    const startupExemptionForExpAndTurnover = startupExemptionMatch
      ? startupExemptionMatch[1].toLowerCase() === 'yes'
      : false;

    const emdMseFootnoteMatch =
      /EMD\s+EXEMPTION\s*[:\-]?\s*.*?(?:manufacturers\s+for\s+goods|service\s+providers)/i.test(text);
    const isEmdExemptForMse =
      mseExemptionForExpAndTurnover || emdMseFootnoteMatch || /EMD\s+Exemption\s*[:\-]?\s*Yes/i.test(text);
    const isEmdExemptForStartup =
      startupExemptionForExpAndTurnover || /Startup\s+EMD\s+Exemption\s*[:\-]?\s*Yes/i.test(text);

    const msePrefMatch = text.match(/MSE\s+Purchase\s+Preference[\s\S]{0,40}?\b(Yes|No)\b/i);
    const msePurchasePreference = msePrefMatch
      ? msePrefMatch[1].toLowerCase() === 'yes'
      : /Purchase\s+preference\s+to\s+Micro\s+and\s+Small\s+Enterprises/i.test(text);

    // 5. Make in India (MII) Local Content Requirement
    const miiPrefMatch = text.match(/MII\s+Purchase\s+Preference\s*[:\-]?\s*(Yes|No)/i);
    const miiPurchasePreference = miiPrefMatch
      ? miiPrefMatch[1].toLowerCase() === 'yes'
      : /Preference\s+to\s+Make\s+In\s+India\s+products/i.test(text);

    let miiLocalContentPercentage: number | undefined;
    const localContentMatch = text.match(
      /(?:minimum\s+local\s+content|local\s+content(?:\s+percentage)?)[^\d%]{0,40}(\d+(?:\.\d+)?)\s*%/i
    );
    if (localContentMatch) {
      miiLocalContentPercentage = parseFloat(localContentMatch[1]);
    } else if (/Class\s*1\s+local\s+supplier/i.test(text)) {
      miiLocalContentPercentage = 50;
    } else if (/Class\s*2\s+local\s+supplier/i.test(text)) {
      miiLocalContentPercentage = 20;
    }

    let miiClass: 'CLASS_1' | 'CLASS_2' | 'NON_LOCAL' | undefined;
    if (miiLocalContentPercentage !== undefined) {
      if (miiLocalContentPercentage >= 50) miiClass = 'CLASS_1';
      else if (miiLocalContentPercentage >= 20) miiClass = 'CLASS_2';
      else miiClass = 'NON_LOCAL';
    }

    // 6. Financial Guarantees (EMD and ePBG)
    const estimatedValueInr = this.extractMoneyValue(text, [
      'estimated bid value',
      'total bid value',
      'estimated value',
    ]);
    let emdAmountInr = this.extractMoneyValue(text, ['emd amount', 'earnest money deposit']);
    if (emdAmountInr === undefined && /EMD\s+Detail[\s\S]{0,40}?Required\s*[:\-]?\s*No\b/i.test(text)) {
      emdAmountInr = 0;
    }

    const epbgPercentMatch = text.match(/ePBG\s+Percentage\s*\(\s*%\s*\)\s*[:\-]?\s*([\d.]+)/i);
    let epbgPercentage = epbgPercentMatch ? parseFloat(epbgPercentMatch[1]) : undefined;
    if (epbgPercentage === undefined && /ePBG\s+Detail[\s\S]{0,40}?Required\s*[:\-]?\s*No\b/i.test(text)) {
      epbgPercentage = 0;
    }

    const epbgDurationMatch = text.match(/Duration\s+of\s+ePBG(?:\s+required)?[^\d]{0,35}(\d+)/i);
    const epbgDurationMonths = epbgDurationMatch ? parseInt(epbgDurationMatch[1], 10) : undefined;

    // 7. Delivery & Splitting
    const splittingAppliedMatch = text.match(/Bid\s+splitting\s+(not\s+applied|applied)/i);
    const isSplittingApplied = splittingAppliedMatch
      ? !splittingAppliedMatch[1].toLowerCase().includes('not')
      : /Splitting\s*[:\-]?\s*Yes/i.test(text);

    const splitRatioMatch = text.match(/Splitting\s*(?:Ratio)?\s*[:\-]?\s*(\d+\s*:\s*\d+)/i);
    const splittingRatio = splitRatioMatch
      ? splitRatioMatch[1].replace(/\s+/g, '')
      : splittingAppliedMatch && splittingAppliedMatch[1].toLowerCase().includes('not')
        ? '100% to L1 (No Split)'
        : undefined;

    const consignees = this.extractConsigneesTable(text);
    const consigneeDeliveryDays = consignees.find((c) => c.deliveryDays !== undefined)?.deliveryDays;
    const deliveryDaysMatch = text.match(/Delivery\s+(?:Period|Days)\s*(?:\(Days\))?\s*[:\-]?\s*(\d+)/i);
    const deliveryPeriodDays = deliveryDaysMatch
      ? parseInt(deliveryDaysMatch[1], 10)
      : consigneeDeliveryDays;

    const consigneeStateDistribution = this.computeStateDistribution(consignees, totalQuantity);

    // 9. Document Required from Seller & ATC Requirements
    const requiredDocuments = this.extractRequiredDocumentsList(text);
    const atcClauses = this.extractAtcClauses(text);

    const allDocText = (requiredDocuments.join(' ') + ' ' + atcClauses.join(' ')).toLowerCase();
    const requiresOemAuthorization = /oem\s+authorization|manufacturer\s+authorization|maf\b/i.test(allDocText);
    const requiresCaTurnoverCertificate = /ca\s+turnover|udin|chartered\s+accountant\s+certificate/i.test(allDocText);
    const requiresMiiDeclaration = /local\s+content|make\s+in\s+india|mii\s+declaration|self\s+declaration/i.test(
      allDocText
    );
    const requiresGstCertificate = /gst|pan/i.test(allDocText);
    const requiresPastPerformanceDoc =
      /past\s+performance|crac|completion\s+certificate|copies\s+of\s+contract/i.test(allDocText);

    const isRaEnabled = /Bid\s+to\s+RA\s+enabled\s*[:\-]?\s*Yes/i.test(text);

    return {
      bidNumber: bidNumberMatch,
      title,
      department,
      ministry,
      organisation,
      officeName,
      closingDate,
      bidOpeningDate,
      bidValidityDays,
      totalQuantity,
      itemCategory,
      typeOfBid,
      estimatedValueInr,
      emdAmountInr,
      isEmdExemptForMse,
      isEmdExemptForStartup,
      epbgPercentage,
      epbgDurationMonths,
      minAnnualTurnoverInr,
      turnoverRawText: turnoverLine,
      yearsExperienceRequired,
      pastPerformancePercentage,
      msePurchasePreference,
      mseExemptionForExpAndTurnover,
      startupExemptionForExpAndTurnover,
      miiPurchasePreference,
      miiLocalContentPercentage,
      miiClass,
      isSplittingApplied,
      splittingRatio,
      deliveryPeriodDays,
      consignees,
      consigneeStateDistribution,
      requiredDocuments,
      requiresOemAuthorization,
      requiresCaTurnoverCertificate,
      requiresMiiDeclaration,
      requiresGstCertificate,
      requiresPastPerformanceDoc,
      atcClauses,
      isRaEnabled,
    };
  }

  private static extractMoneyValue(text: string, labels: string[]): number | undefined {
    const escaped = labels.map((l) => l.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
    const regex = new RegExp(`(?:${escaped})[^\\d₹]{0,60}(?:₹|rs\\.?|inr)?\\s*([\\d,]+(?:\\.\\d+)?)`, 'i');
    const match = text.match(regex);
    if (!match) return undefined;
    const amount = Number(match[1].replace(/,/g, ''));
    return Number.isFinite(amount) ? amount : undefined;
  }

  public static extractConsigneesTable(text: string): ExtractedConsignee[] {
    const consignees: ExtractedConsignee[] = [];
    const tableScopeMatch = text.match(
      /Consignees?\s*\/\s*Reporting\s+Officer[\s\S]*?(?:Buyer\s+Added|Specifications?|Disclaimer|$)/i
    );
    const scope = tableScopeMatch ? tableScopeMatch[0] : text;

    const pincodeRegex = /\b([1-9][0-9]{5})\b/g;
    let pinMatch: RegExpExecArray | null;

    let sNo = 1;
    while ((pinMatch = pincodeRegex.exec(scope)) !== null) {
      const pin = pinMatch[1];
      const matchIndex = pinMatch.index;

      const lineStart = scope.lastIndexOf('\n', matchIndex);
      const lineEnd = scope.indexOf('\n', matchIndex + 6);
      const rowScope = scope.slice(lineStart === -1 ? 0 : lineStart + 1, lineEnd === -1 ? scope.length : lineEnd);
      const nextLineEnd = lineEnd === -1 ? -1 : scope.indexOf('\n', lineEnd + 1);
      const nextLine =
        lineEnd === -1
          ? ''
          : scope.slice(lineEnd + 1, nextLineEnd === -1 ? scope.length : nextLineEnd);
      // Only merge the continuation line if it does not start another consignee pincode
      const hasNextRowContinuation = Boolean(nextLine && !/\b[1-9][0-9]{5}\b/.test(nextLine));
      const combinedRow = hasNextRowContinuation ? `${rowScope} ${nextLine}` : rowScope;

      let matchedState = 'India';
      for (const st of INDIAN_STATES_AND_UTS) {
        if (new RegExp(`\\b${st}\\b`, 'i').test(combinedRow)) {
          matchedState = st;
          break;
        }
      }
      if (matchedState === 'India') {
        matchedState = inferStateFromPincode(pin);
      }

      const pinPosInRow = rowScope.indexOf(pin);
      const afterPin = rowScope.slice(pinPosInRow + 6);
      let numbersAfter = Array.from(afterPin.matchAll(/\b(\d+)\b/g)).map((m) => parseInt(m[1], 10));
      if (numbersAfter.length === 0 && hasNextRowContinuation) {
        // wkhtmltopdf wraps ": <qty> <deliveryDays>" onto the line immediately following the pincode
        const rightColMatch = nextLine.match(/:\s*(\d+)\s+(\d+)\b/);
        if (rightColMatch) {
          numbersAfter = [parseInt(rightColMatch[1], 10), parseInt(rightColMatch[2], 10)];
        } else {
          numbersAfter = Array.from(nextLine.matchAll(/\b(\d+)\b/g))
            .map((m) => parseInt(m[1], 10))
            .filter((n) => n > 1);
        }
      }

      let quantity = 1;
      let deliveryDays: number | undefined;

      if (numbersAfter.length >= 2) {
        quantity = numbersAfter[numbersAfter.length - 2];
        deliveryDays = numbersAfter[numbersAfter.length - 1];
      } else if (numbersAfter.length === 1) {
        quantity = numbersAfter[0];
      }

      const beforePin = rowScope.slice(0, pinPosInRow);
      const officerSource = beforePin.trim() ? beforePin : hasNextRowContinuation ? nextLine : '';
      const officerMatch = officerSource.match(/(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/);
      const officer = officerMatch ? officerMatch[0] : undefined;

      consignees.push({
        sNo: sNo++,
        officer,
        address: `${matchedState} - ${pin}`,
        pincode: pin,
        state: matchedState,
        quantity,
        deliveryDays,
      });
    }

    return consignees;
  }

  private static computeStateDistribution(
    consignees: ExtractedConsignee[],
    totalQtyFallback?: number
  ): Record<string, { count: number; quantity: number; percentage: number }> {
    const dist: Record<string, { count: number; quantity: number; percentage: number }> = {};
    const totalQty = consignees.reduce((acc, c) => acc + c.quantity, 0) || totalQtyFallback || 1;

    for (const c of consignees) {
      const st = c.state;
      if (!dist[st]) {
        dist[st] = { count: 0, quantity: 0, percentage: 0 };
      }
      dist[st].count += 1;
      dist[st].quantity += c.quantity;
    }

    for (const st of Object.keys(dist)) {
      dist[st].percentage = Math.round((dist[st].quantity / totalQty) * 100);
    }

    return dist;
  }

  public static extractRequiredDocumentsList(text: string): string[] {
    const docs: string[] = [];
    const sectionMatch = text.match(
      /Document\s+required(?:\s+from\s+seller)?\s*[:\-]?([\s\S]*?)(?:\*In\s+case|Past\s+Performance|Bid\s+to\s+RA|$)/i
    );
    if (sectionMatch) {
      const lines = sectionMatch[1]
        .split(/\n|,|•/)
        .map((l) => l.replace(/^[:\-\s]+/, '').trim())
        .filter(
          (l) =>
            l.length > 3 &&
            l.length < 95 &&
            !/^\d+$/.test(l) &&
            !/^\d+\s*\/\s*\d+$/.test(l) &&
            !/^\([^)]*\)$/.test(l) &&
            !/^from\s+seller\b/i.test(l) &&
            !/eligibility\s+for\s+exemption|uploaded\s+for\s+evaluation|supporting\s+documents\s+to\s+prove/i.test(l)
        );

      for (const line of lines) {
        if (!docs.includes(line)) {
          docs.push(line);
        }
      }
    }

    const standardDocChecks = [
      'Experience Criteria',
      'Bidder Turnover',
      'Certificate (Requested in ATC)',
      'Additional Doc 1 (Requested in ATC)',
      'Additional Doc 2 (Requested in ATC)',
      'Additional Doc 3 (Requested in ATC)',
      'Additional Doc 4 (Requested in ATC)',
      'OEM Authorization Certificate',
      'OEM Annual Turnover',
      'Compliance of BoQ specification and supporting document',
      'Past Performance',
    ];

    for (const std of standardDocChecks) {
      if (text.includes(std) && !docs.includes(std)) {
        docs.push(std);
      }
    }

    return docs;
  }

  public static extractAtcClauses(text: string): string[] {
    const clauses: string[] = [];
    const atcMatch = text.match(
      /(?:Buyer\s+Added\s+Bid\s+Specific\s+Terms\s+and\s+Conditions|Buyer\s+Added\s+ATC)[\s\S]*?(?:Disclaimer|$)/i
    );
    if (!atcMatch) return clauses;

    const atcScope = atcMatch[0];
    const numberedClauses = atcScope.split(/\n(?=\d+\.\s+)/g);

    for (const block of numberedClauses) {
      const trimmed = block.trim().replace(/\s+/g, ' ');
      if (trimmed.length > 10 && !trimmed.toLowerCase().startsWith('disclaimer')) {
        clauses.push(trimmed.slice(0, 300));
      }
    }

    return clauses;
  }
}
