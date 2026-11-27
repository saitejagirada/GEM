/**
 * GeM Mobile Companion — My Daily Tender Radar & Watchlist Service
 *
 * 100% On-Device, Direct Phone -> GeM (zero backend server, zero login required):
 * - Persists the user's business keywords (up to 6) + optional type/high-value
 *   preferences privately in AsyncStorage.
 * - Queries https://bidplus.gem.gov.in/all-bids-data in parallel per keyword,
 *   streaming results progressively as each keyword resolves while serving cached
 *   results in 0ms on app open.
 * - Detects unseen tenders ("NEW") since the previous session.
 * - Manages a local Watchlist of saved Bids & Reverse Auctions, probes live
 *   corrigendum/representation alerts via GeM's public-bid-other-details endpoint,
 *   and builds 1-tap native Calendar closing reminders.
 */

import type { DeconstructedBidDoc } from '../types/index.ts';
import {
  GeMLiveSyncService,
  type GeMPortalByType,
} from './GeMLiveSyncService.ts';
import { PortalDocService } from './PortalDocService.ts';

const STORAGE_KEY = '@gem-mobile-companion/tender-radar-v1';
const RADAR_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_KEYWORDS = 6;
const MAX_WATCHED_BIDS = 40;
const MAX_SEEN_IDS = 400;

export const SUGGESTED_RADAR_KEYWORDS: string[] = [
  'Laptop',
  'Solar',
  'CCTV',
  'Medical',
  'Furniture',
  'Manpower',
  'Electrical',
  'Vehicles',
  'Stationery',
  'Printer',
  'Air Conditioner',
  'Security',
];

export type RadarVehicleFilter = 'all' | 'product' | 'service';

export interface TenderRadarConfig {
  keywords: string[];
  vehicleFilter: RadarVehicleFilter;
  highValueOnly: boolean;
}

export interface WatchedTenderRecord {
  bid: DeconstructedBidDoc;
  savedAtUtc: string;
  hasCorrigendum?: boolean;
  hasRepresentation?: boolean;
  corrigendumCheckedAt?: string;
}

export interface RadarKeywordResult {
  keyword: string;
  total: number;
  bids: DeconstructedBidDoc[];
  error?: string;
}

export interface RadarMatchItem {
  bid: DeconstructedBidDoc;
  matchedKeywords: string[];
  isNew: boolean;
}

export interface TenderRadarState {
  hydrated: boolean;
  config: TenderRadarConfig;
  watched: WatchedTenderRecord[];
  seenBidNumbers: string[];
  byKeyword: Record<string, RadarKeywordResult>;
  lastRefreshedAt: number;
  isRefreshing: boolean;
  refreshedKeywordsCount: number;
}

interface PersistedRadarData {
  config?: Partial<TenderRadarConfig>;
  watched?: WatchedTenderRecord[];
  seenBidNumbers?: string[];
  byKeyword?: Record<string, RadarKeywordResult>;
  lastRefreshedAt?: number;
}

interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export type RadarListener = (state: TenderRadarState) => void;

export function sanitizeRadarKeyword(raw: string): string {
  return raw
    .replace(/[^\w\s&/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 32);
}

const RADAR_STOP_WORDS = new Set([
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
]);

// Words that match thousands of unrelated GeM departments/tenders when sent in OR fullText queries
// (e.g. "Air" matches Indian Air Force Cricket Bats; "Water" matches Water Tankers; "Office" matches Stationery)
const GENERIC_MULTIWORD_TOKENS = new Set([
  'air',
  'water',
  'office',
  'system',
  'systems',
  'machine',
  'machines',
  'unit',
  'units',
  'equipment',
  'service',
  'services',
  'item',
  'items',
  'supply',
  'panel',
  'panels',
  'set',
  'kit',
  'kits',
  'work',
  'works',
  'new',
  'high',
  'smart',
  'digital',
  'electric',
  'power',
  'auto',
  'mini',
  'heavy',
  'light',
  'sheet',
  'board',
  'box',
  'stand',
  'room',
  'home',
  'general',
  'standard',
  'type',
  'based',
  'multi',
  'all',
  'portable',
  'mobile',
  'industrial',
  'commercial',
  'domestic',
]);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractRadarTokens(keyword: string): string[] {
  return sanitizeRadarKeyword(keyword)
    .toLowerCase()
    .split(/[\s/&_-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !RADAR_STOP_WORDS.has(t));
}

function tokenMatchesText(haystackLower: string, tokenLower: string): boolean {
  if (!haystackLower || !tokenLower) return false;
  if (tokenLower === 'purifier') {
    return /\bpurif(?:ier|iers|ication|ying|y)\b/i.test(haystackLower);
  }
  if (tokenLower === 'conditioner') {
    return /\bcondition(?:er|ers|ing)\b/i.test(haystackLower);
  }
  if (tokenLower === 'medical') {
    return /\b(?:medical|medicine|medicines|hospital|clinical|surgical|diagnostic|pharma)\b/i.test(
      haystackLower
    );
  }
  if (tokenLower === 'electrical') {
    return /\belectric(?:al|s)?\b/i.test(haystackLower);
  }
  if (tokenLower === 'vehicles' || tokenLower === 'vehicle') {
    return /\b(?:vehicle|vehicles|car|cars|bus|buses|ambulance|truck|tractor|suv|sedan|bolero|jeep)\b/i.test(
      haystackLower
    );
  }
  const stem =
    tokenLower.endsWith('ies') && tokenLower.length > 4
      ? `${escapeRegex(tokenLower.slice(0, -3))}(?:y|ies)`
      : tokenLower.endsWith('s') && tokenLower.length > 4
        ? `${escapeRegex(tokenLower.slice(0, -1))}s?`
        : `${escapeRegex(tokenLower)}(?:s|es)?`;
  return new RegExp(`\\b${stem}\\b`, 'i').test(haystackLower);
}

/**
 * Picks the highest-signal search term to send to GeM's Solr `fullText` API.
 * GeM splits multi-word `fullText` queries with OR logic, so "Air Conditioner" gets drowned
 * by 3,700+ Indian Air Force tenders unless we anchor on the distinctive word ("Conditioner").
 */
export function pickBestGeMSearchQuery(keyword: string): string {
  const clean = sanitizeRadarKeyword(keyword);
  const tokens = extractRadarTokens(clean);
  if (tokens.length <= 1) return clean;

  const distinctive = tokens.filter((t) => !GENERIC_MULTIWORD_TOKENS.has(t));
  const hasGeneric = tokens.some((t) => GENERIC_MULTIWORD_TOKENS.has(t));

  if (distinctive.length > 0 && hasGeneric) {
    // Use the longest distinctive word (e.g. "Conditioner", "Purifier", "Chair", "Solar")
    const best = [...distinctive].sort((a, b) => b.length - a.length)[0];
    return best.charAt(0).toUpperCase() + best.slice(1);
  }

  return clean;
}

/**
 * Strict on-device relevance filter & ranker for Daily Tender Radar.
 * Rejects GeM OR-search fallout (e.g. Cricket Bats for "Air Conditioner" or unrelated
 * Facility Management contracts where a word only appeared in a buyer's office address).
 */
export function filterRelevantRadarBids(
  keyword: string,
  candidates: DeconstructedBidDoc[]
): DeconstructedBidDoc[] {
  const cleanKeyword = sanitizeRadarKeyword(keyword).toLowerCase();
  const tokens = extractRadarTokens(keyword);
  if (!cleanKeyword || tokens.length === 0) return candidates;

  const distinctiveTokens = tokens.filter((t) => !GENERIC_MULTIWORD_TOKENS.has(t));
  const scored: Array<{ bid: DeconstructedBidDoc; score: number }> = [];

  for (const bid of candidates) {
    const itemText = `${bid.title || ''} ${bid.categoryDomain || ''}`.toLowerCase();
    if (!itemText.trim()) continue;

    const exactPhrase =
      cleanKeyword.length >= 3 &&
      new RegExp(`\\b${escapeRegex(cleanKeyword)}\\b`, 'i').test(itemText);

    let matchedAllCount = 0;
    let matchedDistinctiveCount = 0;
    for (const tok of tokens) {
      if (tokenMatchesText(itemText, tok)) {
        matchedAllCount += 1;
        if (!GENERIC_MULTIWORD_TOKENS.has(tok)) {
          matchedDistinctiveCount += 1;
        }
      }
    }

    let passes = false;
    if (tokens.length === 1) {
      passes = exactPhrase || matchedAllCount >= 1;
    } else if (distinctiveTokens.length > 0) {
      // Multi-word with distinctive anchor (e.g. "Air Conditioner", "Water Purifier", "Office Chair"):
      // MUST match exact phrase, ALL tokens, or at least one distinctive non-generic noun
      passes = exactPhrase || matchedAllCount === tokens.length || matchedDistinctiveCount >= 1;
    } else {
      // All tokens are generic (e.g. "Office System"): require exact phrase or all tokens
      passes = exactPhrase || matchedAllCount === tokens.length;
    }

    if (!passes) continue;

    const score =
      (exactPhrase ? 120 : 0) +
      (matchedAllCount === tokens.length ? 60 : 0) +
      matchedDistinctiveCount * 35 +
      matchedAllCount * 10;
    scored.push({ bid, score });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aStart = a.bid.startTimeUtc ? new Date(a.bid.startTimeUtc).getTime() : 0;
    const bStart = b.bid.startTimeUtc ? new Date(b.bid.startTimeUtc).getTime() : 0;
    return bStart - aStart;
  });

  return scored.map((entry) => entry.bid);
}

/**
 * Formats an ISO UTC timestamp into Google Calendar UTC date format: YYYYMMDDTHHMMSSZ
 */
function formatCalendarUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/**
 * Builds a universal Calendar deep-link (opens Google Calendar app on Android & browser/calendar on iOS)
 * scheduled from 2 hours before closing until the official GeM closing time.
 */
export function buildClosingReminderUrl(bid: DeconstructedBidDoc): string {
  const closing = new Date(bid.closingTimeUtc);
  const validClosing = !Number.isNaN(closing.getTime())
    ? closing
    : new Date(Date.now() + 24 * 3600 * 1000);
  const start = new Date(Math.max(Date.now(), validClosing.getTime() - 2 * 3600 * 1000));

  const docUrl = PortalDocService.resolvePdfUrl(bid.bidNumber, bid.docUrl);
  const title = `GeM Closing: ${bid.bidNumber} — ${(bid.title || 'Tender').slice(0, 70)}`;
  const details = [
    `GeM Bid/RA: ${bid.bidNumber}`,
    `Item: ${bid.title}`,
    bid.department ? `Department: ${bid.department}` : '',
    bid.parentBidNumber ? `Original Bid: ${bid.parentBidNumber}` : '',
    `Official GeM PDF: ${docUrl}`,
    `Submit on Official Portal: https://bidplus.gem.gov.in`,
  ]
    .filter(Boolean)
    .join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatCalendarUtc(start)}/${formatCalendarUtc(validClosing)}`,
    details,
    location: 'https://bidplus.gem.gov.in',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export class TenderRadarService {
  private static state: TenderRadarState = {
    hydrated: false,
    config: {
      keywords: [],
      vehicleFilter: 'all',
      highValueOnly: false,
    },
    watched: [],
    seenBidNumbers: [],
    byKeyword: {},
    lastRefreshedAt: 0,
    isRefreshing: false,
    refreshedKeywordsCount: 0,
  };

  private static listeners: Set<RadarListener> = new Set();
  private static hydratePromise: Promise<TenderRadarState> | null = null;
  private static refreshNonce = 0;

  public static resetForTests(): void {
    this.state = {
      hydrated: false,
      config: { keywords: [], vehicleFilter: 'all', highValueOnly: false },
      watched: [],
      seenBidNumbers: [],
      byKeyword: {},
      lastRefreshedAt: 0,
      isRefreshing: false,
      refreshedKeywordsCount: 0,
    };
    this.listeners.clear();
    this.hydratePromise = null;
    this.refreshNonce = 0;
  }

  public static getState(): TenderRadarState {
    return this.state;
  }

  public static subscribe(listener: RadarListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static emit(): void {
    const snapshot: TenderRadarState = {
      ...this.state,
      config: {
        ...this.state.config,
        keywords: [...this.state.config.keywords],
      },
      watched: [...this.state.watched],
      seenBidNumbers: [...this.state.seenBidNumbers],
      byKeyword: { ...this.state.byKeyword },
    };
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch {
        // Keep other listeners running
      }
    }
  }

  public static async hydrate(): Promise<TenderRadarState> {
    if (this.state.hydrated) return this.state;
    if (this.hydratePromise) return this.hydratePromise;

    this.hydratePromise = (async () => {
      const storage = await this.getStorage();
      if (storage) {
        try {
          const raw = await storage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as PersistedRadarData;
            const keywords = Array.isArray(parsed?.config?.keywords)
              ? parsed.config.keywords
                  .map((k) => sanitizeRadarKeyword(String(k)))
                  .filter(Boolean)
                  .slice(0, MAX_KEYWORDS)
              : [];
            const vehicleFilter: RadarVehicleFilter =
              parsed?.config?.vehicleFilter === 'product' || parsed?.config?.vehicleFilter === 'service'
                ? parsed.config.vehicleFilter
                : 'all';
            const highValueOnly = Boolean(parsed?.config?.highValueOnly);
            const watched = Array.isArray(parsed?.watched)
              ? parsed.watched
                  .filter((w) => w && w.bid && typeof w.bid.bidNumber === 'string')
                  .slice(0, MAX_WATCHED_BIDS)
              : [];
            const seenBidNumbers = Array.isArray(parsed?.seenBidNumbers)
              ? parsed.seenBidNumbers.filter((id) => typeof id === 'string').slice(0, MAX_SEEN_IDS)
              : [];
            const byKeyword =
              parsed?.byKeyword && typeof parsed.byKeyword === 'object' ? parsed.byKeyword : {};
            const lastRefreshedAt =
              typeof parsed?.lastRefreshedAt === 'number' ? parsed.lastRefreshedAt : 0;

            this.state = {
              ...this.state,
              hydrated: true,
              config: { keywords, vehicleFilter, highValueOnly },
              watched,
              seenBidNumbers,
              byKeyword,
              lastRefreshedAt,
            };
          } else {
            this.state = { ...this.state, hydrated: true };
          }
        } catch {
          this.state = { ...this.state, hydrated: true };
        }
      } else {
        this.state = { ...this.state, hydrated: true };
      }

      this.emit();
      return this.state;
    })();

    try {
      return await this.hydratePromise;
    } finally {
      this.hydratePromise = null;
    }
  }

  private static async persist(): Promise<void> {
    const storage = await this.getStorage();
    if (!storage) return;
    try {
      const payload: PersistedRadarData = {
        config: this.state.config,
        watched: this.state.watched.slice(0, MAX_WATCHED_BIDS),
        seenBidNumbers: this.state.seenBidNumbers.slice(0, MAX_SEEN_IDS),
        byKeyword: this.state.byKeyword,
        lastRefreshedAt: this.state.lastRefreshedAt,
      };
      await storage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // In-memory state still remains active
    }
  }

  public static async saveConfig(
    next: Partial<TenderRadarConfig>,
    autoRefresh = true
  ): Promise<TenderRadarState> {
    await this.hydrate();
    const dedupedKeywords: string[] = [];
    const seenLower = new Set<string>();
    const rawKeywords = next.keywords ?? this.state.config.keywords;
    for (const raw of rawKeywords) {
      const clean = sanitizeRadarKeyword(raw);
      if (!clean) continue;
      const key = clean.toLowerCase();
      if (seenLower.has(key)) continue;
      seenLower.add(key);
      dedupedKeywords.push(clean);
      if (dedupedKeywords.length >= MAX_KEYWORDS) break;
    }

    const nextConfig: TenderRadarConfig = {
      keywords: dedupedKeywords,
      vehicleFilter: next.vehicleFilter ?? this.state.config.vehicleFilter,
      highValueOnly: next.highValueOnly ?? this.state.config.highValueOnly,
    };

    const wasUnconfigured = this.state.config.keywords.length === 0;
    const filtersChanged =
      nextConfig.vehicleFilter !== this.state.config.vehicleFilter ||
      nextConfig.highValueOnly !== this.state.config.highValueOnly;

    // Clear stale cache whenever filters change or Radar is cleared; otherwise prune removed keywords only
    const allowedSet = new Set(dedupedKeywords.map((k) => k.toLowerCase()));
    const prunedByKeyword: Record<string, RadarKeywordResult> = {};
    if (!filtersChanged && dedupedKeywords.length > 0) {
      for (const [k, v] of Object.entries(this.state.byKeyword)) {
        if (allowedSet.has(k.toLowerCase())) {
          prunedByKeyword[k] = v;
        }
      }
    }

    // Reset seen baseline when clearing Radar or activating fresh from empty so initial results never scream NEW
    const nextSeen =
      dedupedKeywords.length === 0 || wasUnconfigured ? [] : this.state.seenBidNumbers;

    this.state = {
      ...this.state,
      config: nextConfig,
      byKeyword: prunedByKeyword,
      seenBidNumbers: nextSeen,
      lastRefreshedAt: 0,
    };
    this.emit();
    await this.persist();

    if (autoRefresh && dedupedKeywords.length > 0) {
      void this.refreshRadar(true);
    }

    return this.state;
  }

  public static isWatched(bidNumber?: string): boolean {
    if (!bidNumber) return false;
    const norm = bidNumber.trim().toLowerCase();
    return this.state.watched.some((w) => w.bid.bidNumber.trim().toLowerCase() === norm);
  }

  public static async toggleWatch(bid: DeconstructedBidDoc): Promise<boolean> {
    await this.hydrate();
    const norm = bid.bidNumber.trim().toLowerCase();
    const existingIdx = this.state.watched.findIndex(
      (w) => w.bid.bidNumber.trim().toLowerCase() === norm
    );

    let nowWatched = false;
    let nextWatched: WatchedTenderRecord[];
    if (existingIdx >= 0) {
      nextWatched = this.state.watched.filter((_, idx) => idx !== existingIdx);
      nowWatched = false;
    } else {
      const entry: WatchedTenderRecord = {
        bid,
        savedAtUtc: new Date().toISOString(),
      };
      nextWatched = [entry, ...this.state.watched].slice(0, MAX_WATCHED_BIDS);
      nowWatched = true;
    }

    this.state = { ...this.state, watched: nextWatched };
    this.emit();
    await this.persist();

    // Immediately probe corrigendum status for a newly watched bid
    if (nowWatched && (bid.b_id || bid.parentBidId)) {
      void this.probeSingleCorrigendum(bid.bidNumber, bid.b_id || bid.parentBidId!);
    }

    return nowWatched;
  }

  public static async removeWatched(bidNumber: string): Promise<void> {
    await this.hydrate();
    const norm = bidNumber.trim().toLowerCase();
    this.state = {
      ...this.state,
      watched: this.state.watched.filter((w) => w.bid.bidNumber.trim().toLowerCase() !== norm),
    };
    this.emit();
    await this.persist();
  }

  private static async probeSingleCorrigendum(bidNumber: string, probeId: string): Promise<void> {
    const details = await GeMLiveSyncService.fetchBidOtherDetails(probeId).catch(() => null);
    if (!details) return;
    const norm = bidNumber.trim().toLowerCase();
    let changed = false;
    const nextWatched = this.state.watched.map((item) => {
      if (item.bid.bidNumber.trim().toLowerCase() !== norm) return item;
      changed = true;
      return {
        ...item,
        hasCorrigendum: details.hasCorrigendum,
        hasRepresentation: details.hasRepresentation,
        corrigendumCheckedAt: details.checkedAt,
      };
    });
    if (changed) {
      this.state = { ...this.state, watched: nextWatched };
      this.emit();
      await this.persist();
    }
  }

  /**
   * Checks live corrigendum & representation flags across all active watched tenders.
   */
  public static async checkWatchedCorrigenda(): Promise<void> {
    await this.hydrate();
    const activeWatched = this.state.watched.filter((item) => {
      const status = GeMLiveSyncService.computeLifecycleStatus(item.bid);
      return (status === 'ONGOING' || status === 'BID_TO_RA') && Boolean(item.bid.b_id || item.bid.parentBidId);
    });
    if (activeWatched.length === 0) return;

    await Promise.all(
      activeWatched.slice(0, 10).map((item) =>
        this.probeSingleCorrigendum(item.bid.bidNumber, (item.bid.b_id || item.bid.parentBidId)!)
      )
    );
  }

  /**
   * Streams live matching tenders directly from bidplus.gem.gov.in across all saved
   * business keywords in parallel. Each keyword updates the UI as soon as it arrives.
   */
  public static async refreshRadar(force = false): Promise<TenderRadarState> {
    await this.hydrate();
    const { keywords, vehicleFilter, highValueOnly } = this.state.config;
    if (keywords.length === 0) return this.state;

    const isFresh =
      !force &&
      this.state.lastRefreshedAt > 0 &&
      Date.now() - this.state.lastRefreshedAt < RADAR_CACHE_TTL_MS &&
      Object.keys(this.state.byKeyword).length >= keywords.length;
    if (isFresh) return this.state;

    const runId = ++this.refreshNonce;
    const prevSeenSet = new Set(this.state.seenBidNumbers);
    const hasPreviousBaseline = prevSeenSet.size > 0;

    this.state = {
      ...this.state,
      isRefreshing: true,
      refreshedKeywordsCount: 0,
    };
    this.emit();

    // Warm single shared CSRF session once
    await GeMLiveSyncService.ensurePortalSession().catch(() => null);

    const byType: GeMPortalByType =
      vehicleFilter === 'product' ? 'product' : vehicleFilter === 'service' ? 'service' : 'all';

    let completedCount = 0;
    const newlyDiscoveredIds = new Set<string>();

    // Process keywords sequentially (1 polite request at a time) so GeM's PHP ci_session
    // file lock never serializes/times out concurrent POSTs on Android OkHttp.
    for (const keyword of keywords) {
      if (runId !== this.refreshNonce) return this.state;

      const portalQuery = pickBestGeMSearchQuery(keyword);
      const isMultiWord = extractRadarTokens(keyword).length > 1;

      const page1 = await GeMLiveSyncService.queryLivePortal({
        page: 1,
        searchBid: portalQuery,
        searchType: 'fullText',
        bidStatusType: 'ongoing_bids',
        byType,
        highBidValue: highValueOnly ? 'highValue' : '',
        sort: 'Bid-Start-Date-Latest',
      });

      if (runId !== this.refreshNonce) return this.state;

      let combinedRaw = [...(page1.bids || [])];
      let portalTotal = page1.total || 0;
      let fetchError = page1.error;

      // Only fetch Page 2 when a multi-word keyword needs more relevant candidates
      if (!fetchError && isMultiWord && page1.hasMore) {
        const page1Relevant = filterRelevantRadarBids(keyword, combinedRaw);
        if (page1Relevant.length < 6) {
          const page2 = await GeMLiveSyncService.queryLivePortal({
            page: 2,
            searchBid: portalQuery,
            searchType: 'fullText',
            bidStatusType: 'ongoing_bids',
            byType,
            highBidValue: highValueOnly ? 'highValue' : '',
            sort: 'Bid-Start-Date-Latest',
          });
          if (runId !== this.refreshNonce) return this.state;
          if (!page2.error && page2.bids.length > 0) {
            const seen = new Set(combinedRaw.map((b) => b.bidNumber));
            for (const b of page2.bids) {
              if (!seen.has(b.bidNumber)) {
                seen.add(b.bidNumber);
                combinedRaw.push(b);
              }
            }
          }
        }
      }

      const relevantBids = filterRelevantRadarBids(keyword, combinedRaw);
      const activeRelevant = relevantBids.filter((b) => {
        const status = GeMLiveSyncService.computeLifecycleStatus(b);
        return status === 'ONGOING' || status === 'BID_TO_RA';
      });

      completedCount += 1;

      // Preserve existing cached matches on a transient network error instead of blanking to 0
      const prevBucket = this.state.byKeyword[keyword];
      if (fetchError && prevBucket && prevBucket.bids.length > 0) {
        for (const b of prevBucket.bids) {
          newlyDiscoveredIds.add(b.bidNumber);
        }
        this.state = {
          ...this.state,
          byKeyword: {
            ...this.state.byKeyword,
            [keyword]: { ...prevBucket, error: fetchError },
          },
          refreshedKeywordsCount: completedCount,
        };
        this.emit();
        continue;
      }

      for (const b of activeRelevant) {
        newlyDiscoveredIds.add(b.bidNumber);
      }

      // Only report GeM's raw total when single-word and most returned docs genuinely matched;
      // otherwise report verified relevant count so pills never display bogus OR-search noise counts.
      const rawCount = combinedRaw.length;
      const highPrecisionPortalTotal =
        !isMultiWord && rawCount > 0 && activeRelevant.length >= Math.ceil(rawCount * 0.6)
          ? portalTotal
          : activeRelevant.length;

      const nextByKeyword: Record<string, RadarKeywordResult> = {
        ...this.state.byKeyword,
        [keyword]: {
          keyword,
          total: highPrecisionPortalTotal,
          bids: activeRelevant,
          error: fetchError,
        },
      };

      this.state = {
        ...this.state,
        byKeyword: nextByKeyword,
        refreshedKeywordsCount: completedCount,
      };
      this.emit();
    }

    if (runId !== this.refreshNonce) return this.state;

    // On first-ever run, establish baseline seen set so subsequent visits accurately highlight NEW arrivals.
    // On repeat runs, preserve previous seen set during this session and append new IDs only after markAllSeen().
    const updatedSeen = hasPreviousBaseline
      ? this.state.seenBidNumbers
      : Array.from(newlyDiscoveredIds).slice(0, MAX_SEEN_IDS);

    this.state = {
      ...this.state,
      seenBidNumbers: updatedSeen,
      lastRefreshedAt: Date.now(),
      isRefreshing: false,
      refreshedKeywordsCount: keywords.length,
    };
    this.emit();
    await this.persist();
    return this.state;
  }

  public static async markBidSeen(bidNumber: string): Promise<void> {
    if (!bidNumber || this.state.seenBidNumbers.includes(bidNumber)) return;
    this.state = {
      ...this.state,
      seenBidNumbers: [bidNumber, ...this.state.seenBidNumbers].slice(0, MAX_SEEN_IDS),
    };
    this.emit();
    await this.persist();
  }

  public static async markAllSeen(): Promise<void> {
    const allIds = this.getAggregatedMatches(this.state).map((m) => m.bid.bidNumber);
    if (allIds.length === 0) return;
    const merged = Array.from(new Set([...allIds, ...this.state.seenBidNumbers])).slice(
      0,
      MAX_SEEN_IDS
    );
    this.state = {
      ...this.state,
      seenBidNumbers: merged,
    };
    this.emit();
    await this.persist();
  }

  /**
   * Aggregates & deduplicates live Radar matches across all saved keywords (or a selected keyword),
   * tagging unseen bids as `isNew` and sorting newest-first / closing-soonest cleanly.
   */
  public static getAggregatedMatches(
    state: TenderRadarState,
    selectedKeyword?: string
  ): RadarMatchItem[] {
    const seenSet = new Set(state.seenBidNumbers);
    const hasBaseline = seenSet.size > 0;
    const byBid = new Map<string, RadarMatchItem>();

    const targetKeywords = selectedKeyword
      ? state.config.keywords.filter((k) => k.toLowerCase() === selectedKeyword.toLowerCase())
      : state.config.keywords;

    for (const kw of targetKeywords) {
      const bucket = state.byKeyword[kw];
      if (!bucket || !Array.isArray(bucket.bids)) continue;
      for (const bid of bucket.bids) {
        const status = GeMLiveSyncService.computeLifecycleStatus(bid);
        if (status !== 'ONGOING' && status !== 'BID_TO_RA') continue;
        const existing = byBid.get(bid.bidNumber);
        if (existing) {
          if (!existing.matchedKeywords.includes(kw)) {
            existing.matchedKeywords.push(kw);
          }
        } else {
          byBid.set(bid.bidNumber, {
            bid,
            matchedKeywords: [kw],
            isNew: hasBaseline && !seenSet.has(bid.bidNumber),
          });
        }
      }
    }

    return Array.from(byBid.values()).sort((a, b) => {
      if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
      const aStart = a.bid.startTimeUtc ? new Date(a.bid.startTimeUtc).getTime() : 0;
      const bStart = b.bid.startTimeUtc ? new Date(b.bid.startTimeUtc).getTime() : 0;
      return bStart - aStart;
    });
  }

  private static async getStorage(): Promise<KeyValueStorage | null> {
    try {
      const mod = await import('@react-native-async-storage/async-storage');
      return (mod.default || mod) as unknown as KeyValueStorage;
    } catch {
      return null;
    }
  }
}
