/**
 * Public GeM bid synchronisation.
 *
 * This service reads the public bid listing maintained by GeM. It deliberately
 * does not seed, randomise, or enrich records with guessed values. Account-only
 * fields such as submitted bids, rank, quoted price, and private status are not
 * available from this public feed and are therefore not represented here.
 */

import type { BidLifecycleStatus, DeconstructedBidDoc } from '../types/index.ts';

const OFFICIAL_BIDS_ENDPOINT = 'https://bidplus-global.gem.gov.in/all-bids-data';
const PUBLIC_FEED_TIMEOUT_MS = 12000;

type PortalField = unknown;
type PortalBid = Record<string, PortalField>;

interface PortalFeedResponse {
  code?: number;
  response?: {
    response?: {
      numFound?: number;
      docs?: PortalBid[];
    };
  };
}

export interface GeMFilterOptions {
  status?: 'ALL' | 'ONGOING' | 'CLOSED' | 'RA' | 'CANCELLED' | 'AWARDED';
  type?: 'ALL' | 'PRODUCT' | 'SERVICE' | 'CUSTOM' | 'BOQ' | 'RA';
  search?: string;
  state?: string;
  categoryDomain?: string;
  minEstimatedValue?: number;
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
  const parsed = typeof item === 'number' ? item : Number(item);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const boolValue = (value: PortalField): boolean => {
  const item = first<unknown>(value);
  return item === true || item === 1 || item === '1';
};

export class GeMLiveSyncService {
  private static liveCatalog: DeconstructedBidDoc[] = [];
  private static listeners: Set<LiveSyncListener> = new Set();
  private static lastSyncTime = '';
  private static totalPortalOngoingCount = 0;
  private static isSyncingInProgress = false;

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
      result = options.type === 'RA'
        ? result.filter((bid) => bid.isRa || bid.type === 'RA' || bid.lifecycleStatus === 'BID_TO_RA')
        : result.filter((bid) => bid.type === options.type);
    }

    if (options?.search?.trim()) {
      const query = options.search.toLowerCase().trim();
      result = result.filter((bid) =>
        [bid.bidNumber, bid.title, bid.department, bid.ministry, bid.categoryDomain]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(query))
      );
    }

    if (options?.state?.trim()) {
      const state = options.state.toLowerCase().trim();
      result = result.filter((bid) => (bid.consignees ?? []).some((consignee) => consignee.state.toLowerCase().includes(state)));
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
    return this.liveCatalog.find(
      (bid) => bid.bidNumber.toLowerCase() === query || bid.b_id?.toLowerCase() === query
    ) ?? null;
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
    if (typeof totalPortalOngoingCount === 'number') this.totalPortalOngoingCount = totalPortalOngoingCount;
    this.lastSyncTime = now.toISOString();
    this.notifyListeners();
    return addedCount;
  }

  private static buildDocumentUrl(portalBid: PortalBid, bidId: string, bidType: number): string {
    const quarter = stringValue(portalBid.qtr_dir);
    const uploadVersion = numberValue(portalBid.b_is_new_upload);
    const documentLabel = bidType === 5
      ? 'showdirectradocumentPdf'
      : bidType === 2
        ? 'showradocumentPdf'
        : 'showbidDocument';

    if (quarter && uploadVersion !== undefined) {
      return `https://bidplus-global.gem.gov.in/${documentLabel}/${bidId}/${quarter}/${uploadVersion}`;
    }
    return `https://bidplus.gem.gov.in/showbidDocument/${bidId}`;
  }

  public static mapPortalBid(portalBid: PortalBid): DeconstructedBidDoc | null {
    const bidId = stringValue(portalBid.b_id) || stringValue(portalBid.id);
    const bidNumber = stringValue(portalBid.b_bid_number);
    const closingTimeUtc = stringValue(portalBid.final_end_date_sort);
    if (!bidId || !bidNumber || !closingTimeUtc) return null;

    const bidType = numberValue(portalBid.b_bid_type) ?? 1;
    const isRa = bidType === 2 || bidType === 5 || boolValue(portalBid.b_bid_to_ra);
    const isCustom = boolValue(portalBid.b_is_custom_item);
    const category = stringValue(portalBid.b_category_name) || stringValue(portalBid.bd_category_name);
    const title = stringValue(portalBid.bbt_title) || category || 'Bid title not published';
    const department = stringValue(portalBid.ba_official_details_deptName) || 'Department not published';
    const ministry = stringValue(portalBid.ba_official_details_minName) || 'Ministry not published';
    const quantity = numberValue(portalBid.b_total_quantity);
    const estimatedValue = numberValue(portalBid.b_estimated_value) || numberValue(portalBid.estimated_value);

    return {
      bidNumber,
      title,
      department,
      ministry,
      type: isRa ? 'RA' : isCustom ? 'CUSTOM' : 'PRODUCT',
      categoryDomain: category,
      isRa,
      b_id: bidId,
      estimatedBidValueInr: estimatedValue,
      emdAmountInr: undefined,
      isEmdExemptForMse: undefined,
      epbgPercentage: undefined,
      minAnnualTurnoverInr: undefined,
      yearsExperienceRequired: undefined,
      pastPerformancePercentage: undefined,
      deliveryPeriodDays: undefined,
      boqItems: quantity !== undefined ? [{ itemTitle: title, quantity, unit: 'Published quantity', specsSummary: '' }] : [],
      consignees: [],
      requiredDocuments: [],
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

  private static async fetchOfficialPage(page: number): Promise<{ docs: PortalBid[]; total: number }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PUBLIC_FEED_TIMEOUT_MS);
    const payload = {
      page,
      param: { searchBid: '', searchType: 'fullText' },
      filter: {
        bidStatusType: 'ongoing_bids',
        byType: 'all',
        highBidValue: '',
        byEndDate: { from: '', to: '' },
        sort: 'Bid-End-Date-Oldest',
      },
    };

    try {
      const response = await fetch(OFFICIAL_BIDS_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: `payload=${encodeURIComponent(JSON.stringify(payload))}&ci_csrf_token=`,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`GeM public feed returned HTTP ${response.status}`);
      const json = (await response.json()) as PortalFeedResponse;
      const responseData = json.response?.response;
      return {
        docs: responseData?.docs ?? [],
        total: responseData?.numFound ?? 0,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  public static async syncFromPortal(maxPages = 5): Promise<{
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
      const firstPage = await this.fetchOfficialPage(1);
      const pageCount = Math.min(Math.max(1, maxPages), Math.max(1, Math.ceil(firstPage.total / 10)));
      const remainingPages = await Promise.all(
        Array.from({ length: pageCount - 1 }, (_, index) => this.fetchOfficialPage(index + 2))
      );
      const portalDocs = [firstPage.docs, ...remainingPages.map((page) => page.docs)].flat();
      const mapped = portalDocs
        .map((portalBid) => this.mapPortalBid(portalBid))
        .filter((bid): bid is DeconstructedBidDoc => bid !== null)
        .filter((bid) => this.computeLifecycleStatus(bid) === 'ONGOING' || this.computeLifecycleStatus(bid) === 'BID_TO_RA');

      this.liveCatalog = mapped;
      this.totalPortalOngoingCount = firstPage.total || mapped.length;
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
