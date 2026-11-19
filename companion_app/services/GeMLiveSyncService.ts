/**
 * Direct Public GeM Bid Client (Phone -> GeM, zero backend).
 *
 * Performs the official CSRF + cookie session handshake directly against
 * https://bidplus.gem.gov.in/all-bids from the user's device, then queries
 * https://bidplus.gem.gov.in/all-bids-data and public-bid-other-details
 * directly. It deliberately never seeds, randomises, or invents commercial
 * fields not published in the official public feed.
 *
 * Account-specific data (submitted bids, rank, quoted prices, private history)
 * stays strictly inside the official GeM portal browser session.
 */

import type { BidDocType, BidLifecycleStatus, DeconstructedBidDoc } from '../types/index.ts';
import { markNetworkOnline } from '../utils/network.ts';

const NATIONAL_PORTAL_ORIGIN = 'https://bidplus.gem.gov.in';
const NATIONAL_BIDS_PAGE = `${NATIONAL_PORTAL_ORIGIN}/all-bids`;
const NATIONAL_BIDS_ENDPOINT = `${NATIONAL_PORTAL_ORIGIN}/all-bids-data`;
const NATIONAL_OTHER_DETAILS_ENDPOINT = `${NATIONAL_PORTAL_ORIGIN}/public-bid-other-details`;
const GLOBAL_BIDS_ENDPOINT = 'https://bidplus-global.gem.gov.in/all-bids-data';

const PUBLIC_FEED_TIMEOUT_MS = 12000;
const SESSION_TTL_MS = 10 * 60 * 1000;
const MOBILE_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';

type PortalField = unknown;
type PortalBid = Record<string, PortalField>;

interface PortalFeedResponse {
  status?: number;
  code?: number;
  response?: {
    response?: {
      numFound?: number;
      docs?: PortalBid[];
    };
  };
}

interface PortalSession {
  csrfToken: string;
  cookieHeader: string;
  acquiredAt: number;
}

export type GeMPortalStatusType = 'ongoing_bids' | 'bidrastatus' | 'cancelled_bids';
export type GeMPortalByType = 'all' | 'product' | 'service' | 'bidToRA' | 'boq' | 'custom';
export type GeMPortalSort =
  | 'Bid-End-Date-Oldest'
  | 'Bid-End-Date-Latest'
  | 'Bid-Start-Date-Latest'
  | 'Bid-Start-Date-Oldest';

export interface GeMPortalQueryOptions {
  page?: number;
  searchBid?: string;
  searchType?: 'fullText' | 'exact';
  bidStatusType?: GeMPortalStatusType;
  byType?: GeMPortalByType;
  highBidValue?: '' | 'highValue';
  sort?: GeMPortalSort;
}

export interface GeMPortalQueryResult {
  bids: DeconstructedBidDoc[];
  total: number;
  page: number;
  hasMore: boolean;
  portalOrigin: 'bidplus.gem.gov.in' | 'bidplus-global.gem.gov.in';
  error?: string;
}

export interface GeMBidOtherDetails {
  hasCorrigendum: boolean;
  hasRepresentation: boolean;
  checkedAt: string;
}

export interface GeMFilterOptions {
  status?: 'ALL' | 'ONGOING' | 'CLOSED' | 'RA' | 'CANCELLED' | 'AWARDED';
  type?: 'ALL' | 'PRODUCT' | 'SERVICE' | 'CUSTOM' | 'BOQ' | 'RA';
  search?: string;
  state?: string;
  categoryDomain?: string;
  minEstimatedValue?: number;
  highValueOnly?: boolean;
}

export interface GeMPortalLiveStats {
  totalPortalOngoingBids: number;
  syncedLocalBidsCount: number;
  ongoingBidsCount: number;
  closedBidsCount: number;
  productBidsCount: number;
  serviceBidsCount: number;
  boqBidsCount: number;
  customBidsCount: number;
  liveReverseAuctionsCount: number;
  cancelledBidsCount: number;
  lastSyncedTimestamp: string;
  dataSource: 'LIVE_GEM_PORTAL' | 'EMPTY';
}

export type LiveSyncListener = (bids: DeconstructedBidDoc[], stats: GeMPortalLiveStats) => void;

const first = <T,>(value: PortalField): T | undefined => {
  if (Array.isArray(value)) return value[0] as T | undefined;
  return value as T | undefined;
};

const stringValue = (value: PortalField): string | undefined => {
  const item = first<unknown>(value);
  if (typeof item === 'string' && item.trim()) return item.trim();
  if (typeof item === 'number' && Number.isFinite(item)) return String(item);
  return undefined;
};

const numberValue = (value: PortalField): number | undefined => {
  const item = first<unknown>(value);
  if (item === '' || item === null || item === undefined || typeof item === 'boolean') return undefined;
  const parsed = typeof item === 'number' ? item : Number(item);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const boolValue = (value: PortalField): boolean => {
  const item = first<unknown>(value);
  return item === true || item === 1 || item === '1';
};

export function extractCsrfTokenFromHtml(html: string, cookieHeader = ''): string {
  const patterns = [
    /csrf_bd_gem_nk['"]?\s*[:=]\s*['"]([a-f0-9]{16,64})['"]/i,
    /name=['"]csrf_bd_gem_nk['"][^>]*value=['"]([a-f0-9]{16,64})['"]/i,
    /value=['"]([a-f0-9]{16,64})['"][^>]*name=['"]csrf_bd_gem_nk['"]/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  const cookieMatch = cookieHeader.match(/csrf_gem_cookie=([a-f0-9]{16,64})/i);
  return cookieMatch?.[1] ?? '';
}

function extractCookieHeader(headers: Headers): string {
  const rawSetCookies =
    typeof (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === 'function'
      ? (headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : [];

  const cookieParts: string[] = [];
  if (rawSetCookies.length > 0) {
    for (const entry of rawSetCookies) {
      const pair = entry.split(';')[0]?.trim();
      if (pair) cookieParts.push(pair);
    }
  } else {
    const combined = headers.get('set-cookie');
    if (combined) {
      // Split comma-separated Set-Cookie header while skipping Expires date commas
      const tokens = combined.split(/,(?=\s*[a-zA-Z0-9_-]+=)/);
      for (const token of tokens) {
        const pair = token.split(';')[0]?.trim();
        if (pair) cookieParts.push(pair);
      }
    }
  }
  return cookieParts.join('; ');
}

export class GeMLiveSyncService {
  private static liveCatalog: DeconstructedBidDoc[] = [];
  private static listeners: Set<LiveSyncListener> = new Set();
  private static lastSyncTime = '';
  private static totalPortalOngoingCount = 0;
  private static isSyncingInProgress = false;
  private static cachedSession: PortalSession | null = null;
  private static sessionPromise: Promise<PortalSession> | null = null;
  private static otherDetailsCache: Map<string, GeMBidOtherDetails> = new Map();

  public static resetSessionForTests(): void {
    this.cachedSession = null;
    this.sessionPromise = null;
  }

  public static computeLifecycleStatus(bid: DeconstructedBidDoc, now: Date = new Date()): BidLifecycleStatus {
    if (bid.isCancelled || bid.lifecycleStatus === 'CANCELLED') return 'CANCELLED';
    if (bid.lifecycleStatus === 'AWARDED') return 'AWARDED';

    const closingDate = new Date(bid.closingTimeUtc);
    const hasElapsed = !Number.isNaN(closingDate.getTime()) && closingDate.getTime() <= now.getTime();

    if (bid.isRa || bid.type === 'RA' || bid.lifecycleStatus === 'BID_TO_RA') {
      return hasElapsed ? 'CLOSED' : 'BID_TO_RA';
    }

    return hasElapsed ? 'CLOSED' : 'ONGOING';
  }

  public static reconcileCatalog(now: Date = new Date()): void {
    for (const bid of this.liveCatalog) {
      bid.lifecycleStatus = this.computeLifecycleStatus(bid, now);
    }
  }

  public static subscribe(listener: LiveSyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private static notifyListeners(): void {
    this.reconcileCatalog();
    const stats = this.getLiveStats();
    for (const listener of this.listeners) {
      try {
        listener([...this.liveCatalog], stats);
      } catch (error) {
        console.warn('Error in GeM live bid listener:', error);
      }
    }
  }

  public static getLiveStats(): GeMPortalLiveStats {
    this.reconcileCatalog();
    const ongoing = this.liveCatalog.filter(
      (bid) => bid.lifecycleStatus === 'ONGOING' || bid.lifecycleStatus === 'BID_TO_RA'
    ).length;
    const closed = this.liveCatalog.filter(
      (bid) => bid.lifecycleStatus === 'CLOSED' || bid.lifecycleStatus === 'AWARDED'
    ).length;
    const cancelled = this.liveCatalog.filter((bid) => bid.lifecycleStatus === 'CANCELLED').length;

    return {
      totalPortalOngoingBids: this.totalPortalOngoingCount,
      syncedLocalBidsCount: this.liveCatalog.length,
      ongoingBidsCount: ongoing,
      closedBidsCount: closed,
      productBidsCount: this.liveCatalog.filter((bid) => bid.type === 'PRODUCT').length,
      serviceBidsCount: this.liveCatalog.filter((bid) => bid.type === 'SERVICE').length,
      boqBidsCount: this.liveCatalog.filter((bid) => bid.type === 'BOQ').length,
      customBidsCount: this.liveCatalog.filter((bid) => bid.type === 'CUSTOM').length,
      liveReverseAuctionsCount: this.liveCatalog.filter(
        (bid) => bid.lifecycleStatus === 'BID_TO_RA' || bid.isRa || bid.type === 'RA'
      ).length,
      cancelledBidsCount: cancelled,
      lastSyncedTimestamp: this.lastSyncTime,
      dataSource: this.liveCatalog.length > 0 ? 'LIVE_GEM_PORTAL' : 'EMPTY',
    };
  }

  public static getLiveBids(options?: GeMFilterOptions): DeconstructedBidDoc[] {
    this.reconcileCatalog();
    let result = [...this.liveCatalog];

    if (options?.status && options.status !== 'ALL') {
      if (options.status === 'ONGOING') {
        result = result.filter((bid) => bid.lifecycleStatus === 'ONGOING' || bid.lifecycleStatus === 'BID_TO_RA');
      } else if (options.status === 'CLOSED') {
        result = result.filter((bid) => bid.lifecycleStatus === 'CLOSED' || bid.lifecycleStatus === 'AWARDED');
      } else if (options.status === 'RA') {
        result = result.filter((bid) => bid.isRa || bid.type === 'RA' || bid.lifecycleStatus === 'BID_TO_RA');
      } else if (options.status === 'CANCELLED') {
        result = result.filter((bid) => bid.lifecycleStatus === 'CANCELLED' || bid.isCancelled);
      } else if (options.status === 'AWARDED') {
        result = result.filter((bid) => bid.lifecycleStatus === 'AWARDED');
      }
    }

    if (options?.type && options.type !== 'ALL') {
      result =
        options.type === 'RA'
          ? result.filter((bid) => bid.isRa || bid.type === 'RA' || bid.lifecycleStatus === 'BID_TO_RA')
          : result.filter((bid) => bid.type === options.type);
    }

    if (options?.highValueOnly) {
      result = result.filter((bid) => Boolean(bid.isHighValue));
    }

    if (options?.search?.trim()) {
      const query = options.search.toLowerCase().trim();
      result = result.filter((bid) =>
        [bid.bidNumber, bid.parentBidNumber, bid.title, bid.department, bid.ministry, bid.categoryDomain]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(query))
      );
    }

    if (options?.state?.trim()) {
      const state = options.state.toLowerCase().trim();
      result = result.filter((bid) =>
        (bid.consignees ?? []).some((consignee) => consignee.state.toLowerCase().includes(state))
      );
    }

    if (options?.categoryDomain && options.categoryDomain !== 'All Domains') {
      const category = options.categoryDomain.toLowerCase();
      result = result.filter((bid) =>
        [bid.categoryDomain, bid.title, bid.ministry]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(category))
      );
    }

    if (options?.minEstimatedValue) {
      result = result.filter((bid) => (bid.estimatedBidValueInr ?? 0) >= options.minEstimatedValue!);
    }

    return result;
  }

  public static getOngoingBids(options?: Omit<GeMFilterOptions, 'status'>): DeconstructedBidDoc[] {
    return this.getLiveBids({ ...options, status: 'ONGOING' });
  }

  public static getClosedBids(options?: Omit<GeMFilterOptions, 'status'>): DeconstructedBidDoc[] {
    return this.getLiveBids({ ...options, status: 'CLOSED' });
  }

  public static getReverseAuctions(options?: Omit<GeMFilterOptions, 'status'>): DeconstructedBidDoc[] {
    return this.getLiveBids({ ...options, status: 'RA' });
  }

  public static getCancelledBids(options?: Omit<GeMFilterOptions, 'status'>): DeconstructedBidDoc[] {
    return this.getLiveBids({ ...options, status: 'CANCELLED' });
  }

  public static getBidById(bidIdOrNumber: string): DeconstructedBidDoc | null {
    const query = bidIdOrNumber.trim().toLowerCase();
    return (
      this.liveCatalog.find(
        (bid) =>
          bid.bidNumber.toLowerCase() === query ||
          bid.b_id?.toLowerCase() === query ||
          bid.parentBidNumber?.toLowerCase() === query
      ) ?? null
    );
  }

  public static ingestLiveBids(newBids: DeconstructedBidDoc[], totalPortalOngoingCount?: number): number {
    if (!newBids.length) return 0;

    const existing = new Map(this.liveCatalog.map((bid) => [bid.bidNumber, bid]));
    let addedCount = 0;
    const now = new Date();

    for (const incoming of newBids) {
      incoming.lifecycleStatus = this.computeLifecycleStatus(incoming, now);
      if (!existing.has(incoming.bidNumber)) addedCount += 1;
      existing.set(incoming.bidNumber, incoming);
    }

    this.liveCatalog = Array.from(existing.values());
    if (typeof totalPortalOngoingCount === 'number' && totalPortalOngoingCount > 0) {
      this.totalPortalOngoingCount = totalPortalOngoingCount;
    }
    this.lastSyncTime = now.toISOString();
    this.notifyListeners();
    return addedCount;
  }

  private static buildDocumentUrl(portalBid: PortalBid, bidId: string, bidType: number): string {
    const quarter = stringValue(portalBid.qtr_dir);
    const uploadVersion = numberValue(portalBid.b_is_new_upload);
    const documentLabel =
      bidType === 5
        ? 'showdirectradocumentPdf'
        : bidType === 2
          ? 'showradocumentPdf'
          : 'showbidDocument';

    if (quarter && uploadVersion !== undefined) {
      return `https://bidplus-global.gem.gov.in/${documentLabel}/${bidId}/${quarter}/${uploadVersion}`;
    }
    return `${NATIONAL_PORTAL_ORIGIN}/${documentLabel}/${bidId}`;
  }

  public static mapPortalBid(
    portalBid: PortalBid,
    statusContext?: GeMPortalStatusType
  ): DeconstructedBidDoc | null {
    const bidId = stringValue(portalBid.b_id) || stringValue(portalBid.id);
    const bidNumber = stringValue(portalBid.b_bid_number);
    const closingTimeUtc = stringValue(portalBid.final_end_date_sort);
    if (!bidId || !bidNumber || !closingTimeUtc) return null;

    const bidType = numberValue(portalBid.b_bid_type) ?? 1;
    const isService = numberValue(portalBid.b_type) === 1;
    const isRa = bidType === 2 || bidType === 5 || boolValue(portalBid.b_bid_to_ra);
    const isCustom = boolValue(portalBid.b_is_custom_item);
    const isBoq = boolValue(portalBid.b_is_boq) || boolValue(portalBid.is_boq_item);
    const isHighValue = boolValue(portalBid.is_high_value);
    const isCancelled = statusContext === 'cancelled_bids' || numberValue(portalBid.b_status) === 3;

    let resolvedType: BidDocType = 'PRODUCT';
    if (isService) {
      resolvedType = 'SERVICE';
    } else if (isRa) {
      resolvedType = 'RA';
    } else if (isBoq) {
      resolvedType = 'BOQ';
    } else if (isCustom) {
      resolvedType = 'CUSTOM';
    }

    const category = stringValue(portalBid.b_category_name) || stringValue(portalBid.bd_category_name);
    const title = stringValue(portalBid.bbt_title) || category || 'Bid title not published';
    const department = stringValue(portalBid.ba_official_details_deptName) || 'Department not published';
    const ministry = stringValue(portalBid.ba_official_details_minName) || '';
    const quantity = numberValue(portalBid.b_total_quantity);
    const estimatedValue = numberValue(portalBid.b_estimated_value) || numberValue(portalBid.estimated_value);
    const startTimeUtc = stringValue(portalBid.final_start_date_sort);
    const parentBidNumber = stringValue(portalBid.b_bid_number_parent);

    return {
      bidNumber,
      title,
      department,
      ministry: ministry || department,
      type: resolvedType,
      categoryDomain: category,
      isRa,
      isCancelled,
      isHighValue,
      parentBidNumber,
      b_id: bidId,
      estimatedBidValueInr: estimatedValue,
      emdAmountInr: undefined,
      isEmdExemptForMse: undefined,
      epbgPercentage: undefined,
      minAnnualTurnoverInr: undefined,
      yearsExperienceRequired: undefined,
      pastPerformancePercentage: undefined,
      deliveryPeriodDays: undefined,
      boqItems:
        quantity !== undefined
          ? [{ itemTitle: title, quantity, unit: 'Published quantity', specsSummary: '' }]
          : [],
      consignees: [],
      requiredDocuments: [],
      startTimeUtc,
      closingTimeUtc,
      docUrl: this.buildDocumentUrl(portalBid, bidId, bidType),
      publishedFields: {
        estimatedValue: estimatedValue !== undefined,
        quantity: quantity !== undefined,
        requirements: false,
        consignees: false,
        commercialTerms: false,
      },
      source: 'LIVE_OFFICIAL_PUBLIC_FEED',
    };
  }

  /**
   * Acquires a fresh CSRF token & session cookie directly from https://bidplus.gem.gov.in/all-bids.
   * Uses native OS cookie storage (`credentials: 'include'`) on React Native and explicit Cookie headers
   * where Set-Cookie is readable (e.g. Node tests).
   */
  public static async ensurePortalSession(forceRefresh = false): Promise<PortalSession> {
    if (
      !forceRefresh &&
      this.cachedSession &&
      Date.now() - this.cachedSession.acquiredAt < SESSION_TTL_MS &&
      this.cachedSession.csrfToken
    ) {
      return this.cachedSession;
    }

    if (!forceRefresh && this.sessionPromise) {
      return this.sessionPromise;
    }

    this.sessionPromise = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PUBLIC_FEED_TIMEOUT_MS);
      try {
        const response = await fetch(NATIONAL_BIDS_PAGE, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'User-Agent': MOBILE_USER_AGENT,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`GeM portal handshake returned HTTP ${response.status}`);
        }
        const cookieHeader = extractCookieHeader(response.headers);
        const html = await response.text();
        const csrfToken = extractCsrfTokenFromHtml(html, cookieHeader);
        if (!csrfToken) {
          throw new Error('Unable to obtain GeM public session token');
        }
        markNetworkOnline();
        const session: PortalSession = {
          csrfToken,
          cookieHeader,
          acquiredAt: Date.now(),
        };
        this.cachedSession = session;
        return session;
      } finally {
        clearTimeout(timer);
        this.sessionPromise = null;
      }
    })();

    return this.sessionPromise;
  }

  private static buildQueryPayload(options: GeMPortalQueryOptions = {}) {
    return {
      page: Math.max(1, options.page ?? 1),
      param: {
        searchBid: (options.searchBid ?? '').trim(),
        searchType: options.searchType ?? 'fullText',
      },
      filter: {
        bidStatusType: options.bidStatusType ?? 'ongoing_bids',
        byType: options.byType ?? 'all',
        highBidValue: options.highBidValue ?? '',
        byEndDate: { from: '', to: '' },
        sort: options.sort ?? 'Bid-End-Date-Oldest',
      },
    };
  }

  private static async postNationalBidsData(
    payload: Record<string, unknown>,
    session: PortalSession
  ): Promise<{ docs: PortalBid[]; total: number; expiredSession?: boolean }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PUBLIC_FEED_TIMEOUT_MS);
    try {
      const headers: Record<string, string> = {
        'User-Agent': MOBILE_USER_AGENT,
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        Origin: NATIONAL_PORTAL_ORIGIN,
        Referer: NATIONAL_BIDS_PAGE,
      };
      if (session.cookieHeader) {
        headers.Cookie = session.cookieHeader;
      }

      const response = await fetch(NATIONAL_BIDS_ENDPOINT, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: `payload=${encodeURIComponent(JSON.stringify(payload))}&csrf_bd_gem_nk=${encodeURIComponent(session.csrfToken)}`,
        signal: controller.signal,
      });

      if (response.status === 403) {
        return { docs: [], total: 0, expiredSession: true };
      }
      if (!response.ok) {
        throw new Error(`GeM public feed returned HTTP ${response.status}`);
      }

      const text = await response.text();
      if (!text.trim().startsWith('{')) {
        return { docs: [], total: 0, expiredSession: true };
      }

      const json = JSON.parse(text) as PortalFeedResponse;
      const responseData = json.response?.response;
      markNetworkOnline();
      return {
        docs: responseData?.docs ?? [],
        total: responseData?.numFound ?? 0,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private static async postGlobalBidsData(
    payload: Record<string, unknown>
  ): Promise<{ docs: PortalBid[]; total: number }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PUBLIC_FEED_TIMEOUT_MS);
    try {
      const response = await fetch(GLOBAL_BIDS_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: `payload=${encodeURIComponent(JSON.stringify(payload))}&ci_csrf_token=`,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`GeM global public feed returned HTTP ${response.status}`);
      }
      const json = (await response.json()) as PortalFeedResponse;
      const responseData = json.response?.response;
      markNetworkOnline();
      return {
        docs: responseData?.docs ?? [],
        total: responseData?.numFound ?? 0,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Direct live query against GeM's public Solr feed from the user's phone.
   * Supports keyword search, exact bid lookup, ongoing/closed/cancelled status,
   * goods/services/RA/BOQ/custom filtering, high-value filter, and pagination.
   */
  public static async queryLivePortal(options: GeMPortalQueryOptions = {}): Promise<GeMPortalQueryResult> {
    const page = Math.max(1, options.page ?? 1);
    const statusType = options.bidStatusType ?? 'ongoing_bids';
    const payload = this.buildQueryPayload({ ...options, page, bidStatusType: statusType });
    const now = new Date();

    try {
      let session = await this.ensurePortalSession();
      let result = await this.postNationalBidsData(payload, session);

      if (result.expiredSession) {
        session = await this.ensurePortalSession(true);
        result = await this.postNationalBidsData(payload, session);
      }

      const mapped = result.docs
        .map((doc) => this.mapPortalBid(doc, statusType))
        .filter((bid): bid is DeconstructedBidDoc => bid !== null)
        .map((bid) => ({
          ...bid,
          lifecycleStatus: this.computeLifecycleStatus(bid, now),
        }));

      return {
        bids: mapped,
        total: result.total,
        page,
        hasMore: page * 10 < result.total && mapped.length > 0,
        portalOrigin: 'bidplus.gem.gov.in',
      };
    } catch (nationalError) {
      // Fallback to bidplus-global only for unfiltered ongoing queries if national handshake fails
      try {
        const globalResult = await this.postGlobalBidsData(payload);
        const mapped = globalResult.docs
          .map((doc) => this.mapPortalBid(doc, statusType))
          .filter((bid): bid is DeconstructedBidDoc => bid !== null)
          .map((bid) => ({
            ...bid,
            lifecycleStatus: this.computeLifecycleStatus(bid, now),
          }));

        return {
          bids: mapped,
          total: globalResult.total,
          page,
          hasMore: page * 10 < globalResult.total && mapped.length > 0,
          portalOrigin: 'bidplus-global.gem.gov.in',
        };
      } catch {
        const message =
          nationalError instanceof Error ? nationalError.message : 'Unable to reach the GeM public bid feed';
        return {
          bids: [],
          total: 0,
          page,
          hasMore: false,
          portalOrigin: 'bidplus.gem.gov.in',
          error: message,
        };
      }
    }
  }

  /**
   * Direct live bid lookup on GeM by bid number or keyword.
   * Searches ongoing bids first, then concluded Bid/RA status if not found.
   */
  public static async lookupBidOnPortal(query: string): Promise<DeconstructedBidDoc[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const isExactBidNumber = /^GEM\/\d{4}\/[BR]\/\d+/i.test(trimmed);
    const ongoingRes = await this.queryLivePortal({
      page: 1,
      searchBid: trimmed,
      searchType: isExactBidNumber ? 'exact' : 'fullText',
      bidStatusType: 'ongoing_bids',
    });

    if (ongoingRes.bids.length > 0) {
      this.ingestLiveBids(ongoingRes.bids);
      return ongoingRes.bids;
    }

    const closedRes = await this.queryLivePortal({
      page: 1,
      searchBid: trimmed,
      searchType: isExactBidNumber ? 'exact' : 'fullText',
      bidStatusType: 'bidrastatus',
      sort: 'Bid-End-Date-Latest',
    });

    if (closedRes.bids.length > 0) {
      this.ingestLiveBids(closedRes.bids);
      return closedRes.bids;
    }

    return [];
  }

  /**
   * Probes GeM's lightweight public endpoint directly for live corrigendum &
   * representation flags on a specific bid ID.
   */
  public static async fetchBidOtherDetails(bidId: string): Promise<GeMBidOtherDetails | null> {
    const cleanId = bidId.trim();
    if (!cleanId) return null;

    const cached = this.otherDetailsCache.get(cleanId);
    if (cached) return cached;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const session = await this.ensurePortalSession().catch(() => null);
      const headers: Record<string, string> = {
        'User-Agent': MOBILE_USER_AGENT,
        Accept: 'application/json',
        Referer: NATIONAL_BIDS_PAGE,
      };
      if (session?.cookieHeader) {
        headers.Cookie = session.cookieHeader;
      }

      const response = await fetch(`${NATIONAL_OTHER_DETAILS_ENDPOINT}/${encodeURIComponent(cleanId)}`, {
        method: 'GET',
        credentials: 'include',
        headers,
        signal: controller.signal,
      });
      if (!response.ok) return null;
      const json = (await response.json()) as {
        response?: { corrigendum?: boolean; representation?: boolean };
      };
      const details: GeMBidOtherDetails = {
        hasCorrigendum: Boolean(json?.response?.corrigendum),
        hasRepresentation: Boolean(json?.response?.representation),
        checkedAt: new Date().toISOString(),
      };
      this.otherDetailsCache.set(cleanId, details);
      return details;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  public static async syncFromPortal(maxPages = 3): Promise<{
    success: boolean;
    syncedCount: number;
    ongoingCount: number;
    totalPortalBids: number;
    error?: string;
  }> {
    if (this.isSyncingInProgress) {
      const stats = this.getLiveStats();
      return {
        success: stats.dataSource === 'LIVE_GEM_PORTAL',
        syncedCount: stats.syncedLocalBidsCount,
        ongoingCount: stats.ongoingBidsCount,
        totalPortalBids: stats.totalPortalOngoingBids,
      };
    }

    this.isSyncingInProgress = true;
    try {
      const firstPage = await this.queryLivePortal({
        page: 1,
        bidStatusType: 'ongoing_bids',
        byType: 'all',
        sort: 'Bid-End-Date-Oldest',
      });

      if (firstPage.error && firstPage.bids.length === 0) {
        throw new Error(firstPage.error);
      }

      const pageCount = Math.min(Math.max(1, maxPages), Math.max(1, Math.ceil(firstPage.total / 10)));
      const collected: DeconstructedBidDoc[] = [...firstPage.bids];

      if (pageCount > 1) {
        const remaining = await Promise.all(
          Array.from({ length: pageCount - 1 }, (_, index) =>
            this.queryLivePortal({
              page: index + 2,
              bidStatusType: 'ongoing_bids',
              byType: 'all',
              sort: 'Bid-End-Date-Oldest',
            })
          )
        );
        for (const pageRes of remaining) {
          collected.push(...pageRes.bids);
        }
      }

      const deduped = new Map<string, DeconstructedBidDoc>();
      for (const bid of collected) {
        const status = this.computeLifecycleStatus(bid);
        if (status === 'ONGOING' || status === 'BID_TO_RA') {
          deduped.set(bid.bidNumber, { ...bid, lifecycleStatus: status });
        }
      }

      this.liveCatalog = Array.from(deduped.values());
      this.totalPortalOngoingCount = firstPage.total || this.liveCatalog.length;
      this.lastSyncTime = new Date().toISOString();
      this.notifyListeners();

      const stats = this.getLiveStats();
      return {
        success: true,
        syncedCount: stats.syncedLocalBidsCount,
        ongoingCount: stats.ongoingBidsCount,
        totalPortalBids: stats.totalPortalOngoingBids,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reach the GeM public bid feed';
      return {
        success: false,
        syncedCount: this.liveCatalog.length,
        ongoingCount: this.getLiveStats().ongoingBidsCount,
        totalPortalBids: this.totalPortalOngoingCount,
        error: message,
      };
    } finally {
      this.isSyncingInProgress = false;
    }
  }
}
