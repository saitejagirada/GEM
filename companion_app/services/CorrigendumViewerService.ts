/**
 * GeM Mobile Companion App - Live Corrigendum & Pre-Bid Representation Viewer Service
 *
 * Parses official public HTML responses directly from:
 *   - POST https://bidplus.gem.gov.in/bidding/bid/viewCorrigendum/<bidId>
 *   - POST https://bidplus.gem.gov.in/bidding/bid/getPublicTchtml/<amendmentId>
 *   - GET  https://bidplus.gem.gov.in/publish-representations/<bidId>
 *
 * Strictly zero custom backend, zero credentials, and verified *.gem.gov.in URLs only.
 */

import { GeMLiveSyncService } from './GeMLiveSyncService.ts';
import { PortalDocService } from './PortalDocService.ts';

export type CorrigendumEntryKind = 'DATE_EXTENSION' | 'PDF_AMENDMENT' | 'TC_AMENDMENT' | 'NOTE';

export interface CorrigendumEntry {
  id: string;
  modifiedOn: string;
  kind: CorrigendumEntryKind;
  summary: string;
  extendedTo?: string;
  bidOpeningDate?: string;
  pdfUrl?: string;
  tcAmendmentId?: string;
}

export interface CorrigendumResult {
  bidId: string;
  entries: CorrigendumEntry[];
  error?: string;
}

export interface RepresentationEntry {
  id: string;
  section: string;
  query: string;
  reply: string;
}

export interface RepresentationResult {
  bidId: string;
  publishedOn?: string;
  entries: RepresentationEntry[];
  error?: string;
}

const GEM_ORIGIN = 'https://bidplus.gem.gov.in';

export function decodeHtmlEntities(input: string): string {
  if (!input) return '';
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#8211;|&ndash;/gi, '–')
    .replace(/&#8212;|&mdash;/gi, '—')
    .replace(/&#(\d+);/g, (_m, code) => {
      const n = Number(code);
      return Number.isFinite(n) && n >= 32 && n <= 126 ? String.fromCharCode(n) : ' ';
    });
}

export function stripHtmlToText(html: string, preserveNewlines = false): string {
  if (!html) return '';
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');

  if (preserveNewlines) {
    text = text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, ' ');
    text = decodeHtmlEntities(text);
    return text
      .split(/\r?\n/)
      .map((line) => line.replace(/[ \t]+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim())
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  text = text.replace(/<[^>]+>/g, ' ');
  return decodeHtmlEntities(text).replace(/\s+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim();
}

function resolveSafeGemHref(rawHref: string): string | undefined {
  const href = decodeHtmlEntities(rawHref).trim();
  if (!href || href === '#' || /^javascript:/i.test(href)) return undefined;
  const absolute = href.startsWith('http://') || href.startsWith('https://')
    ? href
    : href.startsWith('/')
      ? `${GEM_ORIGIN}${href}`
      : `${GEM_ORIGIN}/${href}`;
  return PortalDocService.isSafeGemUrl(absolute) ? absolute : undefined;
}

export class CorrigendumViewerService {
  private static corrigendumCache = new Map<string, CorrigendumResult>();
  private static representationCache = new Map<string, RepresentationResult>();
  private static tcCache = new Map<string, string>();

  public static clearCacheForTests(): void {
    this.corrigendumCache.clear();
    this.representationCache.clear();
    this.tcCache.clear();
  }

  /**
   * Parses GeM's `viewCorrigendum/<bidId>` HTML fragment into structured chronological cards.
   * Merges companion "Bid Opening Date" wells directly onto their preceding extension card.
   */
  public static parseCorrigendumHtml(html: string, bidId: string): CorrigendumEntry[] {
    const trimmed = (html || '').trim();
    if (!trimmed || trimmed === '0') {
      return [];
    }

    // Isolate the Corrigendum Details block BEFORE trailing Bootstrap modals & scripts
    // (GeM's own trailing <script> contains `bootbox.alert('No corrigendum found...')`)
    const scriptCut = trimmed.split(/<div\s+id=["']myModal12["']|<script\b/i)[0] || trimmed;

    // Extract each <div class="well">...</div> entry
    const wellParts = scriptCut.split(/<div\s+class=["'][^"']*\bwell\b[^"']*["'][^>]*>/i).slice(1);
    if (wellParts.length === 0) {
      return [];
    }
    const entries: CorrigendumEntry[] = [];

    wellParts.forEach((rawPart, index) => {
      // Stop right before the well's closing clearfix or next outer container
      const block = rawPart.split(/<div\s+class=["']clearfix["']><\/div>\s*<\/div>/i)[0] || rawPart;
      if (!block.trim()) return;

      const spanIdMatch = block.match(/id=["']?span_(\d+)["']?/i);
      const modifiedMatch = block.match(/Modified\s*On\s*:\s*<\/strong>\s*<span[^>]*>([^<]+)<\/span>/i);
      const modifiedOn = modifiedMatch?.[1] ? decodeHtmlEntities(modifiedMatch[1]).trim() : '';

      // Split out the right-hand detail column (second col-block)
      const colBlocks = block.split(/<div\s+class=["']col-block["'][^>]*>/i).slice(1);
      const detailHtml = colBlocks.length >= 2 ? colBlocks[1] : block;
      const detailText = stripHtmlToText(detailHtml);
      if (!detailText) return;

      // Companion "Bid Opening Date: ..." well immediately following a "Bid extended to ..." well
      const openingOnlyMatch = detailText.match(/^Bid\s+Opening\s+Date\s*:\s*(.+)$/i);
      if (!modifiedOn && openingOnlyMatch?.[1]) {
        const prev = entries[entries.length - 1];
        if (prev && prev.kind === 'DATE_EXTENSION' && !prev.bidOpeningDate) {
          prev.bidOpeningDate = openingOnlyMatch[1].trim();
          return;
        }
      }

      // 1. Date extension entry
      const extendedMatch = detailText.match(/Bid\s+extended\s+to\s+([0-9:/ -]+(?:AM|PM)?)/i);
      if (extendedMatch?.[1]) {
        entries.push({
          id: spanIdMatch?.[1] || `corr-${bidId}-${index}`,
          modifiedOn,
          kind: 'DATE_EXTENSION',
          summary: `Bid closing date extended to ${extendedMatch[1].trim()}`,
          extendedTo: extendedMatch[1].trim(),
        });
        return;
      }

      // 2. Corrigendum PDF download entry
      const hrefMatch = detailHtml.match(/href=["']([^"']+)["']/i);
      const safePdfUrl = hrefMatch?.[1] ? resolveSafeGemHref(hrefMatch[1]) : undefined;
      if (safePdfUrl && /corrigendum|pdf|download/i.test(`${hrefMatch?.[1]} ${detailText}`)) {
        entries.push({
          id: spanIdMatch?.[1] || `corr-${bidId}-${index}`,
          modifiedOn,
          kind: 'PDF_AMENDMENT',
          summary: 'Official Corrigendum PDF uploaded by Buyer',
          pdfUrl: safePdfUrl,
        });
        return;
      }

      // 3. Inline Terms & Conditions / ATC amendment (`class="view_tc" data-id="..."`)
      const tcMatch =
        detailHtml.match(/class=["'][^"']*view_tc[^"']*["'][^>]*data-id=["']?(\d+)["']?/i) ||
        detailHtml.match(/data-id=["']?(\d+)["']?[^>]*class=["'][^"']*view_tc[^"']*["']/i);
      if (tcMatch?.[1]) {
        entries.push({
          id: spanIdMatch?.[1] || tcMatch[1],
          modifiedOn,
          kind: 'TC_AMENDMENT',
          summary: detailText.replace(/\bView\b/i, '').trim() || 'Buyer Terms / ATC Clause Updated',
          tcAmendmentId: tcMatch[1],
        });
        return;
      }

      // 4. General note / specification modification
      entries.push({
        id: spanIdMatch?.[1] || `corr-${bidId}-${index}`,
        modifiedOn,
        kind: 'NOTE',
        summary: detailText,
      });
    });

    return entries;
  }

  /**
   * Parses GeM's `publish-representations/<bidId>` HTML table into structured Q&A cards.
   * Automatically carries forward the section name when subsequent rows leave column 1 blank.
   */
  public static parseRepresentationHtml(
    html: string,
    bidId: string
  ): { publishedOn?: string; entries: RepresentationEntry[] } {
    const trimmed = (html || '').trim();
    if (!trimmed || /no\s+representation/i.test(trimmed)) {
      return { entries: [] };
    }

    const pubDateMatch = trimmed.match(/Response\s+Publication\s+Date\s*:\s*([^<\n]+)/i);
    const publishedOn = pubDateMatch?.[1] ? decodeHtmlEntities(pubDateMatch[1]).trim() : undefined;

    const tbodyMatch =
      trimmed.match(/<tbody[^>]*id=["']rep_res["'][^>]*>([\s\S]*?)<\/tbody>/i) ||
      trimmed.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
    const tableBody = tbodyMatch?.[1] || '';
    if (!tableBody) {
      return { publishedOn, entries: [] };
    }

    const entries: RepresentationEntry[] = [];
    const rowMatches = tableBody.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || [];
    let currentSection = 'General Clarification';

    rowMatches.forEach((rowHtml, idx) => {
      const cellMatches = rowHtml.match(/<td\b[^>]*>([\s\S]*?)<\/td>/gi) || [];
      if (cellMatches.length < 3) return;

      const rawSection = stripHtmlToText(cellMatches[0] || '');
      const query = stripHtmlToText(cellMatches[1] || '', true);
      const reply = stripHtmlToText(cellMatches[2] || '', true);

      if (rawSection) {
        currentSection = rawSection;
      }
      if (!query && !reply) return;

      entries.push({
        id: `rep-${bidId}-${idx}`,
        section: currentSection,
        query: query || 'Not stated',
        reply: reply || 'No buyer reply recorded',
      });
    });

    return { publishedOn, entries };
  }

  public static async loadCorrigenda(
    bidId: string,
    forceRefresh = false
  ): Promise<CorrigendumResult> {
    const cleanId = bidId.trim();
    if (!cleanId) return { bidId: '', entries: [] };

    if (!forceRefresh) {
      const cached = this.corrigendumCache.get(cleanId);
      if (cached) return cached;
    }

    try {
      const html = await GeMLiveSyncService.fetchCorrigendumHtml(cleanId);
      const entries = this.parseCorrigendumHtml(html, cleanId);
      const result: CorrigendumResult = { bidId: cleanId, entries };
      this.corrigendumCache.set(cleanId, result);
      return result;
    } catch (err) {
      return {
        bidId: cleanId,
        entries: [],
        error: err instanceof Error ? err.message : 'Unable to load corrigenda from GeM.',
      };
    }
  }

  public static async loadTcAmendmentText(amendmentId: string): Promise<string> {
    const cleanId = amendmentId.trim();
    if (!cleanId) return '';
    const cached = this.tcCache.get(cleanId);
    if (cached !== undefined) return cached;

    const html = await GeMLiveSyncService.fetchCorrigendumTcHtml(cleanId);
    const text = stripHtmlToText(html, true);
    this.tcCache.set(cleanId, text);
    return text;
  }

  public static async loadRepresentations(
    bidId: string,
    forceRefresh = false
  ): Promise<RepresentationResult> {
    const cleanId = bidId.trim();
    if (!cleanId) return { bidId: '', entries: [] };

    if (!forceRefresh) {
      const cached = this.representationCache.get(cleanId);
      if (cached) return cached;
    }

    try {
      const html = await GeMLiveSyncService.fetchRepresentationHtml(cleanId);
      const parsed = this.parseRepresentationHtml(html, cleanId);
      const result: RepresentationResult = {
        bidId: cleanId,
        publishedOn: parsed.publishedOn,
        entries: parsed.entries,
      };
      this.representationCache.set(cleanId, result);
      return result;
    } catch (err) {
      return {
        bidId: cleanId,
        entries: [],
        error: err instanceof Error ? err.message : 'Unable to load pre-bid representations from GeM.',
      };
    }
  }
}
