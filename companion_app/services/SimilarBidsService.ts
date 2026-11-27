/**
 * GeM Mobile Companion App - Similar Concluded Bids Finder
 *
 * Queries GeM's public concluded archive (`bidrastatus`) directly from the device
 * using a high-precision two-stage strategy:
 *   1. Exact GeM category matching (`searchType: 'exact'`) against the tender's
 *      primary catalog category (and base category without version/IS suffix).
 *   2. Strict token-verified fallback (`searchType: 'fullText'`) ONLY if exact
 *      matching yields 0 results, rejecting any candidate that does not genuinely
 *      match multiple distinctive domain tokens in its visible title/category.
 *
 * If no truly relevant concluded tenders exist, returns an honest empty result
 * (`bids: []`, `totalFound: 0`) rather than noisy OR-matched tenders.
 */

import type { DeconstructedBidDoc } from '../types/index.ts';
import { GeMLiveSyncService } from './GeMLiveSyncService.ts';

export type SimilarMatchMode = 'exact' | 'filtered' | 'none';

export interface SimilarBidsLookupResult {
  queryUsed: string;
  matchMode: SimilarMatchMode;
  bids: DeconstructedBidDoc[];
  totalFound: number;
  contractsPortalUrl: string;
  error?: string;
}

const GEM_AWARDED_CONTRACTS_URL = 'https://gem.gov.in/view_contracts';

const STOP_WORDS = new Set([
  'supply',
  'and',
  'for',
  'with',
  'the',
  'of',
  'in',
  'to',
  'on',
  'at',
  'by',
  'from',
  'per',
  'as',
  'conforming',
  'custom',
  'bid',
  'services',
  'service',
  'based',
  'item',
  'items',
  'goods',
  'various',
  'misc',
  'procurement',
  'purchase',
  'installation',
  'commissioning',
  'maintenance',
  'annual',
  'comprehensive',
  'charges',
  'part',
  'version',
  'type',
  'model',
  'make',
  'qty',
  'nos',
  'units',
  'unit',
  'other',
  'others',
  'general',
  'standard',
  'point',
  'care',
  'humans',
  'human',
  'complete',
  'assy',
  'assembly',
  'set',
  'pack',
  'pkt',
  'size',
  'grade',
  'class',
  'new',
  'all',
  'heavy',
  'duty',
  'system',
  'systems',
  'kva',
  'ltr',
  'mtr',
  'amp',
  'volt',
  'watt',
]);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function hasWholeWordOrStem(haystackLower: string, tokenLower: string): boolean {
  if (!tokenLower) return false;
  // Match singular/plural stem (e.g. kit/kits, cable/cables, battery/batteries)
  const stem = tokenLower.endsWith('ies') && tokenLower.length > 4
    ? `${tokenLower.slice(0, -3)}(?:y|ies)`
    : tokenLower.endsWith('s') && tokenLower.length > 4
      ? `${escapeRegex(tokenLower.slice(0, -1))}s?`
      : `${escapeRegex(tokenLower)}(?:s|es)?`;
  return new RegExp(`\\b${stem}\\b`, 'i').test(haystackLower);
}

export class SimilarBidsService {
  public static readonly contractsPortalUrl = GEM_AWARDED_CONTRACTS_URL;
  private static cache = new Map<string, SimilarBidsLookupResult>();

  public static clearCacheForTests(): void {
    this.cache.clear();
  }

  /**
   * Splits GeM's multi-category title/categoryDomain string cleanly.
   * GeM joins distinct catalog categories with a comma followed immediately by a non-space
   * character (e.g. "Dengue, Malaria, Typhoid & Others,Point of Care Rapid"), whereas commas
   * inside a single category name have a trailing space.
   */
  public static extractPrimaryCategorySegment(
    bid: Pick<DeconstructedBidDoc, 'title' | 'categoryDomain'>
  ): string {
    const raw = [bid.categoryDomain, bid.title].find(
      (v): v is string => Boolean(v && v.trim() && !/not\s+published/i.test(v))
    );
    if (!raw) return '';

    const segments = raw
      .split(/,(?=\S)/)
      .map((s) => normalizeWhitespace(s))
      .filter(Boolean);

    let primary = segments[0] || normalizeWhitespace(raw);

    // Unwrap boilerplate prefixes like "Custom Bid for Services - Annual Maintenance of CCTV"
    const customMatch = primary.match(/^custom\s+bid\s+for\s+(?:services|goods)\s*[-–:]\s*(.+)$/i);
    if (customMatch?.[1]) {
      primary = normalizeWhitespace(customMatch[1]);
    }

    // If first segment was just a stock/material code (e.g. "JP8115010200"), pick first descriptive segment
    if (/^[A-Z0-9\s/-]+$/i.test(primary) && /\d{5,}/.test(primary) && segments.length > 1) {
      const descriptive = segments.find(
        (seg) => !(/^[A-Z0-9\s/-]+$/i.test(seg) && /\d{5,}/.test(seg)) && /[a-zA-Z]{3,}/.test(seg)
      );
      if (descriptive) primary = descriptive;
    }

    return primary;
  }

  /**
   * Produces up to 2 high-precision exact GeM category query strings to try with `searchType: 'exact'`.
   */
  public static buildExactCategoryCandidates(
    bid: Pick<DeconstructedBidDoc, 'title' | 'categoryDomain'>
  ): string[] {
    const primary = this.extractPrimaryCategorySegment(bid);
    if (!primary || primary.length < 4) return [];

    const candidates: string[] = [];
    const pushUnique = (val: string) => {
      const cleaned = normalizeWhitespace(val.replace(/[,;:\-–]+$/, ''));
      if (cleaned.length < 4 || cleaned.length > 120) return;
      // Ignore pure alphanumeric part/stock numbers
      if (/^[A-Z0-9\s/-]+$/i.test(cleaned) && /\d{4,}/.test(cleaned) && cleaned.split(' ').length <= 3) {
        return;
      }
      const key = cleaned.toLowerCase();
      if (!candidates.some((c) => c.toLowerCase() === key)) {
        candidates.push(cleaned);
      }
    };

    // Candidate 1: Full primary GeM category name (e.g. "Point of Care Rapid Test Kits for Humans – Dengue, Malaria, Typhoid & Others" or "FRP Storage Tank (V2)")
    pushUnique(primary);

    // Candidate 2: Base catalog category stripped of trailing sub-clauses, version tags, and IS standards
    const baseCategory = normalizeWhitespace(
      primary
        .split(/\s+[–—-]\s+|;/)[0]
        .replace(/\(V\d+(?:\.\d+)?\)/gi, ' ')
        .replace(/\bConforming\s+to\s+IS\b.*$/i, ' ')
        .replace(/\bIS\s*\d+(?:\s*\(Part\s*\d+\))?/gi, ' ')
        .replace(/\([^)]{3,40}\)\s*$/g, ' ')
        .replace(/\s+for\s+humans\b/gi, ' ')
    );
    pushUnique(baseCategory);

    return candidates.slice(0, 2);
  }

  /**
   * Extracts distinctive, high-signal domain tokens (stripping stock/part codes,
   * version suffixes, IS numbers, and generic procurement noise words).
   */
  public static extractDomainTokens(rawText: string): string[] {
    if (!rawText || !rawText.trim()) return [];

    const cleaned = rawText
      .replace(/\(V\d+(?:\.\d+)?\)/gi, ' ')
      .replace(/\bIS\s*\d+(?:\s*\(Part\s*\d+\))?/gi, ' ')
      .replace(/\b[A-Z]{0,4}\d{4,}[A-Z0-9]*\b/gi, ' ')
      .replace(/[^a-zA-Z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const meaningful: string[] = [];
    const seen = new Set<string>();

    for (const rawToken of cleaned.split(/[\s-]+/)) {
      const token = rawToken.trim();
      if (token.length < 3) continue;
      if (/^\d+$/.test(token)) continue;
      // Skip mixed alphanumeric codes like "X3", "GL500", "D103"
      if (/\d/.test(token) && /[a-zA-Z]/.test(token)) continue;
      const lower = token.toLowerCase();
      if (STOP_WORDS.has(lower) || seen.has(lower)) continue;
      seen.add(lower);
      meaningful.push(token);
    }

    return meaningful;
  }

  /**
   * Derives a concise, high-signal display & search keyword from a tender's category or title.
   * Strips stock part numbers (e.g. "JP8115010200", "4000015190"), "(V2)/(V3)", and IS standards.
   */
  public static buildSearchKeyword(bid: Pick<DeconstructedBidDoc, 'title' | 'categoryDomain'>): string {
    const primary = this.extractPrimaryCategorySegment(bid);
    const rawSource = primary || [bid.categoryDomain, bid.title]
      .filter((v): v is string => Boolean(v && v.trim() && !/not\s+published/i.test(v)))
      .join(' ');

    if (!rawSource.trim()) return '';

    const tokens = this.extractDomainTokens(rawSource);
    if (tokens.length > 0) {
      return tokens.slice(0, 3).join(' ');
    }

    return primary.slice(0, 40).trim();
  }

  /**
   * Strict on-device relevance verifier: ensures every shown concluded bid genuinely
   * belongs to the same product/service domain rather than GeM's noisy OR-search fallout.
   */
  public static filterRelevantConcludedBids(
    sourceBid: Pick<DeconstructedBidDoc, 'bidNumber' | 'parentBidNumber' | 'title' | 'categoryDomain'>,
    queryUsed: string,
    candidates: DeconstructedBidDoc[],
    mode: 'exact' | 'filtered'
  ): DeconstructedBidDoc[] {
    const queryLower = normalizeWhitespace(queryUsed).toLowerCase();
    const queryTokens = this.extractDomainTokens(queryUsed).map((t) => t.toLowerCase());
    const sourceTokens = this.extractDomainTokens(
      this.extractPrimaryCategorySegment(sourceBid) || sourceBid.title || ''
    ).map((t) => t.toLowerCase());
    const anchorTokens = queryTokens.length > 0 ? queryTokens : sourceTokens.slice(0, 4);

    // Require strong overlap so a single incidental word can never pass
    const minRequiredHits =
      mode === 'exact'
        ? 1
        : anchorTokens.length <= 1
          ? 1
          : anchorTokens.length === 2
            ? 2
            : Math.max(2, Math.ceil(anchorTokens.length * 0.65));

    const seenBidNumbers = new Set<string>();
    const scored: Array<{ bid: DeconstructedBidDoc; score: number }> = [];

    for (const item of candidates) {
      if (!item?.bidNumber) continue;
      if (item.bidNumber === sourceBid.bidNumber || item.bidNumber === sourceBid.parentBidNumber) {
        continue;
      }
      if (seenBidNumbers.has(item.bidNumber)) continue;

      const candidateText = normalizeWhitespace(
        `${item.categoryDomain || ''} ${item.title || ''}`
      ).toLowerCase();
      if (!candidateText) continue;

      const exactPhraseHit = queryLower.length >= 4 && candidateText.includes(queryLower);
      let tokenHits = 0;
      for (const tok of anchorTokens) {
        if (hasWholeWordOrStem(candidateText, tok)) {
          tokenHits += 1;
        }
      }

      if (mode === 'exact') {
        if (!exactPhraseHit && tokenHits < Math.min(2, anchorTokens.length)) {
          continue;
        }
      } else {
        // Strict filtered mode: must contain exact phrase OR meet strict multi-token threshold
        if (!exactPhraseHit && tokenHits < minRequiredHits) {
          continue;
        }
      }

      seenBidNumbers.add(item.bidNumber);
      const score = (exactPhraseHit ? 100 : 0) + tokenHits * 15;
      scored.push({ bid: item, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map((entry) => entry.bid).slice(0, 8);
  }

  /**
   * Fetches genuinely similar recently concluded/evaluated GeM bids (`bidrastatus`).
   * Tries exact GeM category matching first, then strict token-verified fallback.
   * Returns `bids: []` honestly if no genuinely similar concluded tenders exist.
   */
  public static async findSimilarConcludedBids(
    bid: DeconstructedBidDoc,
    overrideQuery?: string
  ): Promise<SimilarBidsLookupResult> {
    const trimmedOverride = overrideQuery?.trim() || '';
    const exactCandidates = trimmedOverride
      ? [trimmedOverride]
      : this.buildExactCategoryCandidates(bid);
    const fallbackKeyword = trimmedOverride || this.buildSearchKeyword(bid);
    const displayQuery = exactCandidates[0] || fallbackKeyword;

    if (!displayQuery) {
      return {
        queryUsed: '',
        matchMode: 'none',
        bids: [],
        totalFound: 0,
        contractsPortalUrl: GEM_AWARDED_CONTRACTS_URL,
      };
    }

    const cacheKey = `${displayQuery.toLowerCase()}::${bid.bidNumber}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Stage 1: High-precision Exact Category Search on GeM (`searchType: 'exact'`)
      let lastError: string | undefined;
      for (const exactQuery of exactCandidates) {
        const res = await GeMLiveSyncService.queryLivePortal({
          page: 1,
          searchBid: exactQuery,
          searchType: 'exact',
          bidStatusType: 'bidrastatus',
          sort: 'Bid-End-Date-Latest',
        });
        if (res.error) {
          lastError = res.error;
          continue;
        }

        const verified = this.filterRelevantConcludedBids(bid, exactQuery, res.bids || [], 'exact');
        if (verified.length > 0) {
          const allReturnedMatched =
            (res.bids || []).length > 0 && verified.length >= Math.min(res.bids.length - 1, 1);
          const output: SimilarBidsLookupResult = {
            queryUsed: exactQuery,
            matchMode: 'exact',
            bids: verified,
            totalFound: allReturnedMatched ? Math.max(res.total || 0, verified.length) : verified.length,
            contractsPortalUrl: GEM_AWARDED_CONTRACTS_URL,
          };
          this.cache.set(cacheKey, output);
          return output;
        }
      }

      // Stage 2: Strict On-Device Token-Verified Fallback (only when we have >= 2 distinctive tokens)
      const distinctiveTokens = this.extractDomainTokens(fallbackKeyword);
      if (distinctiveTokens.length >= 2) {
        const strictQuery = distinctiveTokens.slice(0, 3).join(' ');
        const res = await GeMLiveSyncService.queryLivePortal({
          page: 1,
          searchBid: strictQuery,
          searchType: 'fullText',
          bidStatusType: 'bidrastatus',
          sort: 'Bid-End-Date-Latest',
        });
        if (res.error) {
          lastError = res.error;
        } else {
          const verified = this.filterRelevantConcludedBids(
            bid,
            strictQuery,
            res.bids || [],
            'filtered'
          );
          if (verified.length > 0) {
            const output: SimilarBidsLookupResult = {
              queryUsed: strictQuery,
              matchMode: 'filtered',
              bids: verified,
              // Never show GeM's raw unfiltered OR-count (e.g. 51,859); report verified matches only
              totalFound: verified.length,
              contractsPortalUrl: GEM_AWARDED_CONTRACTS_URL,
            };
            this.cache.set(cacheKey, output);
            return output;
          }
        }
      }

      // Honest empty result when nothing genuinely matches
      const emptyOutput: SimilarBidsLookupResult = {
        queryUsed: displayQuery,
        matchMode: 'none',
        bids: [],
        totalFound: 0,
        contractsPortalUrl: GEM_AWARDED_CONTRACTS_URL,
        error: lastError,
      };
      if (!lastError) {
        this.cache.set(cacheKey, emptyOutput);
      }
      return emptyOutput;
    } catch (err) {
      return {
        queryUsed: displayQuery,
        matchMode: 'none',
        bids: [],
        totalFound: 0,
        contractsPortalUrl: GEM_AWARDED_CONTRACTS_URL,
        error: err instanceof Error ? err.message : 'Unable to query concluded bids on GeM.',
      };
    }
  }
}
