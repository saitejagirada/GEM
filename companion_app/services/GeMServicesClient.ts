/**
 * GeM Official Services Public API Client (Direct Phone -> mkp.gem.gov.in)
 *
 * Queries GeM's official public Services catalog APIs directly without any
 * intermediate backend or login:
 * - Directory (380+ active services):
 *   GET https://mkp.gem.gov.in/cms/others/api/services?page=1&per_page=20&filter_active=true
 * - Live Service Specification, Core Parameters & Official SLA/STC:
 *   GET https://mkp.gem.gov.in/cms/others/api/services/{service_id}
 * - Live Registered Service Providers (paginated):
 *   GET https://mkp.gem.gov.in/pub/api/service_catalogs/{service_id}/get_seller_list?page=1
 */

const MKP_ORIGIN = 'https://mkp.gem.gov.in';
const SERVICE_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';
const REQUEST_TIMEOUT_MS = 10000;

export interface LiveGeMServiceSummary {
  id: string;
  displayName: string;
  slugUrl: string;
  description: string;
  imageUrl?: string;
  portalUrl: string;
  isAvailable: boolean;
}

export interface LiveGeMServiceParameter {
  name: string;
  options: string[];
}

export interface LiveGeMServiceDetail {
  id: string;
  displayName: string;
  versionNumber?: string;
  description: string;
  imageUrl?: string;
  portalUrl: string;
  isBidOnly: boolean;
  isCustomBidService: boolean;
  totalCatalogCount?: number;
  minContractDays?: number;
  maxContractDays?: number;
  serviceLeadDays?: number;
  autoCracDays?: number;
  qcbsRequired: boolean;
  splittingEnabled: boolean;
  raEnabled: boolean;
  coreParameters: LiveGeMServiceParameter[];
  slaText: string;
}

export interface LiveGeMServiceSeller {
  sellerId: string;
  name: string;
  verifiedProjects: number;
  totalValue?: string | number | null;
}

export interface LiveGeMServiceSellerCertificate {
  category: string;
  count: number;
}

export interface LiveGeMServiceSellerDetail {
  sellerId: string;
  serviceId: string;
  totalVerifiedProjects: number;
  totalProjectValueInr: number;
  certificates: LiveGeMServiceSellerCertificate[];
}

export type ServiceSellerFilterMode = 'ALL' | 'VERIFIED' | 'HIGHEST_VALUE';

export function parseNumericProjectValue(val?: string | number | null): number {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function parseServiceSellerDetailPayload(
  serviceId: string,
  sellerId: string,
  json: {
    meta?: { result?: string };
    result?: {
      seller_certificate_hash?: Record<string, unknown>;
      approved_project_details?: {
        total_verified_projects?: { value?: number | string };
        total_project_value?: { value?: number | string };
      };
    } | null;
  } | null
): LiveGeMServiceSellerDetail | null {
  const r = json?.result;
  if (!r || json?.meta?.result !== 'success') return null;

  const approved = r.approved_project_details;
  const totalVerifiedProjects = Math.max(
    0,
    Math.round(parseNumericProjectValue(approved?.total_verified_projects?.value))
  );
  const totalProjectValueInr = Math.max(
    0,
    parseNumericProjectValue(approved?.total_project_value?.value)
  );

  const certHash = r.seller_certificate_hash && typeof r.seller_certificate_hash === 'object'
    ? r.seller_certificate_hash
    : {};
  const certificates: LiveGeMServiceSellerCertificate[] = Object.entries(certHash)
    .map(([category, items]) => ({
      category: category.trim(),
      count: Array.isArray(items) ? items.length : items ? 1 : 0,
    }))
    .filter((c) => Boolean(c.category) && c.count > 0);

  return {
    sellerId,
    serviceId,
    totalVerifiedProjects,
    totalProjectValueInr,
    certificates,
  };
}

export function filterAndSortServiceSellers(
  sellers: LiveGeMServiceSeller[],
  query: string,
  mode: ServiceSellerFilterMode
): LiveGeMServiceSeller[] {
  const q = query.trim().toLowerCase();
  let list = sellers;

  if (q) {
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.sellerId.toLowerCase().includes(q)
    );
  }

  if (mode === 'VERIFIED') {
    list = list.filter(
      (s) => s.verifiedProjects > 0 || parseNumericProjectValue(s.totalValue) > 0
    );
  }

  if (mode === 'HIGHEST_VALUE' || mode === 'VERIFIED') {
    return [...list].sort((a, b) => {
      const valDiff =
        parseNumericProjectValue(b.totalValue) - parseNumericProjectValue(a.totalValue);
      if (valDiff !== 0) return valDiff;
      if (b.verifiedProjects !== a.verifiedProjects) {
        return b.verifiedProjects - a.verifiedProjects;
      }
      return a.name.localeCompare(b.name);
    });
  }

  return list;
}

export interface LiveGeMServiceListResponse {
  services: LiveGeMServiceSummary[];
  total: number;
  page: number;
  hasMore: boolean;
}

export interface LiveGeMServiceSellersResponse {
  sellers: LiveGeMServiceSeller[];
  total: number;
  page: number;
  hasMore: boolean;
}

/**
 * Strips HTML tags and decodes common HTML entities returned in GeM service
 * descriptions and Service STC / SLA tables into readable plain text.
 */
export function stripHtmlToPlainText(html?: string | null): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/(?:p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/td>/gi, ' · ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&ndash;|&mdash;/gi, '–')
    .replace(/\u200b/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': SERVICE_USER_AGENT,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export class GeMServicesClient {
  private static detailCache = new Map<string, LiveGeMServiceDetail>();
  private static sellerDetailCache = new Map<string, LiveGeMServiceSellerDetail>();
  private static allSellersCache = new Map<string, { sellers: LiveGeMServiceSeller[]; total: number }>();
  private static directoryPageCache = new Map<string, LiveGeMServiceListResponse>();
  private static fullDirectoryCache: { services: LiveGeMServiceSummary[]; total: number } | null = null;
  private static fullDirectoryPromise: Promise<{ services: LiveGeMServiceSummary[]; total: number }> | null = null;

  public static buildPortalUrl(serviceId: string): string {
    return `${MKP_ORIGIN}/services#!/browse/${encodeURIComponent(serviceId)}/open`;
  }

  /**
   * Fetches and caches the full active GeM Services directory (380+ services with
   * official photos & descriptions) using parallel 100-item pages so category filters
   * and keyword search work instantaneously across every live GeM service.
   */
  public static async fetchAllLiveServices(
    forceRefresh = false
  ): Promise<{ services: LiveGeMServiceSummary[]; total: number }> {
    if (!forceRefresh && this.fullDirectoryCache && this.fullDirectoryCache.services.length > 0) {
      return this.fullDirectoryCache;
    }
    if (!forceRefresh && this.fullDirectoryPromise) {
      return this.fullDirectoryPromise;
    }

    this.fullDirectoryPromise = (async () => {
      const perPage = 100;
      const first = await this.fetchLiveServicesDirectory(1, perPage);
      const total = first.total || first.services.length;
      const totalPages = Math.min(6, Math.max(1, Math.ceil(total / perPage)));

      const all: LiveGeMServiceSummary[] = [...first.services];
      if (totalPages > 1) {
        const rest = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            this.fetchLiveServicesDirectory(i + 2, perPage).catch(() => ({
              services: [],
              total,
              page: i + 2,
              hasMore: false,
            }))
          )
        );
        const seen = new Set(all.map((s) => s.id));
        for (const pageRes of rest) {
          for (const srv of pageRes.services) {
            if (!seen.has(srv.id)) {
              seen.add(srv.id);
              all.push(srv);
            }
          }
        }
      }

      const result = { services: all, total: Math.max(total, all.length) };
      if (all.length > 0) {
        this.fullDirectoryCache = result;
      }
      return result;
    })().finally(() => {
      this.fullDirectoryPromise = null;
    });

    return this.fullDirectoryPromise;
  }

  /**
   * Fetches paginated active services directly from GeM's live catalog (380+ services).
   */
  public static async fetchLiveServicesDirectory(
    page = 1,
    perPage = 20
  ): Promise<LiveGeMServiceListResponse> {
    const cacheKey = `${page}:${perPage}`;
    const cached = this.directoryPageCache.get(cacheKey);
    if (cached) return cached;

    const url = `${MKP_ORIGIN}/cms/others/api/services?page=${page}&per_page=${perPage}&filter_active=true`;
    const json = await fetchJsonWithTimeout<{
      result?: {
        total_entries?: number;
        services?: Array<{
          id?: string;
          display_name?: string;
          url?: string;
          description?: string;
          image_url?: string;
          down_for_buyer?: boolean;
        }>;
      };
    }>(url);

    const rawList = json?.result?.services ?? [];
    const total = Number(json?.result?.total_entries ?? rawList.length);
    const services: LiveGeMServiceSummary[] = rawList
      .filter((item): item is Required<Pick<typeof item, 'id' | 'display_name'>> & typeof item =>
        Boolean(item?.id && item?.display_name)
      )
      .map((item) => ({
        id: item.id,
        displayName: item.display_name.trim(),
        slugUrl: item.url || item.id,
        description: stripHtmlToPlainText(item.description).slice(0, 260),
        imageUrl: item.image_url?.startsWith('http') ? item.image_url : undefined,
        portalUrl: this.buildPortalUrl(item.id),
        isAvailable: !item.down_for_buyer,
      }));

    const result: LiveGeMServiceListResponse = {
      services,
      total,
      page,
      hasMore: page * perPage < total && services.length > 0,
    };

    if (services.length > 0) {
      this.directoryPageCache.set(cacheKey, result);
    }
    return result;
  }

  /**
   * Fetches full live GeM specifications, contract durations, core parameters,
   * and official Service STC / SLA text for a specific service ID.
   */
  public static async fetchServiceDetail(serviceId: string): Promise<LiveGeMServiceDetail | null> {
    const cleanId = serviceId.trim();
    if (!cleanId) return null;

    const cached = this.detailCache.get(cleanId);
    if (cached) return cached;

    const url = `${MKP_ORIGIN}/cms/others/api/services/${encodeURIComponent(cleanId)}`;
    const json = await fetchJsonWithTimeout<{
      result?: {
        id?: string;
        display_name?: string;
        version_number?: string | number;
        description?: string;
        image_url?: string;
        sla?: string;
        is_bid_only?: boolean;
        bid_only_category?: boolean;
        is_custom_bid_service?: boolean;
        service_catalogs_count?: Record<string, number> | number;
        specifications?: {
          minimum_contract_period?: number;
          maximum_contract_period?: number;
          service_lead_days?: number;
          no_of_days_for_service_auto_crac?: number;
          bid_qcbs_required?: boolean;
          is_splitting_enabled?: boolean;
          disable_RA?: boolean;
          spec_data?: {
            core?: Record<string, { display_name?: string; value?: unknown[] }>;
          };
        };
      };
    }>(url);

    const r = json?.result;
    if (!r?.display_name) return null;

    const specs = r.specifications;
    const coreObj = specs?.spec_data?.core ?? {};
    const coreParameters: LiveGeMServiceParameter[] = Object.values(coreObj)
      .filter((param) => Boolean(param?.display_name))
      .slice(0, 14)
      .map((param) => ({
        name: String(param.display_name).trim(),
        options: Array.isArray(param.value)
          ? param.value
              .map((v) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : ''))
              .filter(Boolean)
              .slice(0, 8)
          : [],
      }));

    let totalCatalogCount: number | undefined;
    if (typeof r.service_catalogs_count === 'number') {
      totalCatalogCount = r.service_catalogs_count;
    } else if (r.service_catalogs_count && typeof r.service_catalogs_count === 'object') {
      const exact = r.service_catalogs_count[cleanId];
      if (typeof exact === 'number') totalCatalogCount = exact;
    }

    const detail: LiveGeMServiceDetail = {
      id: r.id || cleanId,
      displayName: r.display_name.trim(),
      versionNumber: r.version_number !== undefined ? String(r.version_number) : undefined,
      description: stripHtmlToPlainText(r.description),
      imageUrl: r.image_url?.startsWith('http') ? r.image_url : undefined,
      portalUrl: this.buildPortalUrl(r.id || cleanId),
      isBidOnly: Boolean(r.is_bid_only || r.bid_only_category),
      isCustomBidService: Boolean(r.is_custom_bid_service),
      totalCatalogCount,
      minContractDays: typeof specs?.minimum_contract_period === 'number' ? specs.minimum_contract_period : undefined,
      maxContractDays: typeof specs?.maximum_contract_period === 'number' ? specs.maximum_contract_period : undefined,
      serviceLeadDays: typeof specs?.service_lead_days === 'number' ? specs.service_lead_days : undefined,
      autoCracDays:
        typeof specs?.no_of_days_for_service_auto_crac === 'number'
          ? specs.no_of_days_for_service_auto_crac
          : undefined,
      qcbsRequired: Boolean(specs?.bid_qcbs_required),
      splittingEnabled: Boolean(specs?.is_splitting_enabled),
      raEnabled: specs?.disable_RA !== true,
      coreParameters,
      slaText: stripHtmlToPlainText(r.sla).slice(0, 5000),
    };

    this.detailCache.set(cleanId, detail);
    return detail;
  }

  /**
   * Fetches paginated live registered GeM Service Providers for a specific service ID.
   * Uses `per_page=100..500` (live-verified on mkp.gem.gov.in) for high-throughput browsing.
   */
  public static async fetchServiceSellers(
    serviceId: string,
    page = 1,
    perPage = 100,
    timeoutMs?: number
  ): Promise<LiveGeMServiceSellersResponse> {
    const cleanId = serviceId.trim();
    if (!cleanId) return { sellers: [], total: 0, page, hasMore: false };

    const safePerPage = Math.min(1000, Math.max(10, perPage));
    const effectiveTimeout = timeoutMs ?? (safePerPage >= 500 ? 22000 : REQUEST_TIMEOUT_MS);
    const url = `${MKP_ORIGIN}/pub/api/service_catalogs/${encodeURIComponent(cleanId)}/get_seller_list?page=${page}&per_page=${safePerPage}`;
    const json = await fetchJsonWithTimeout<{
      result?: {
        seller_list?: Record<string, { name?: string }>;
        srvc_catalog_hash?: Record<string, { verified_projects?: number; total_value?: string | number | null }>;
        pagination_meta?: { total_items?: number; per_page?: number; page?: string | number };
      };
    }>(url, effectiveTimeout);

    const sellerMap = json?.result?.seller_list ?? {};
    const catalogHash = json?.result?.srvc_catalog_hash ?? {};
    const meta = json?.result?.pagination_meta;
    const total = Number(meta?.total_items ?? Object.keys(sellerMap).length);

    const sellers: LiveGeMServiceSeller[] = Object.entries(sellerMap)
      .filter(([, info]) => Boolean(info?.name))
      .map(([sellerId, info]) => ({
        sellerId,
        name: String(info.name).trim(),
        verifiedProjects: Number(catalogHash[sellerId]?.verified_projects ?? 0),
        totalValue: catalogHash[sellerId]?.total_value ?? null,
      }));

    // GeM returns `pagination_meta.per_page: 10` even when `per_page=500` returns 500 sellers.
    const effectivePerPage = Math.max(safePerPage, sellers.length, Number(meta?.per_page ?? 10));

    return {
      sellers,
      total,
      page,
      hasMore: page * effectivePerPage < total && sellers.length > 0,
    };
  }

  /**
   * Returns cached full provider list for a service if already fetched this session.
   */
  public static getCachedAllServiceSellers(
    serviceId: string
  ): { sellers: LiveGeMServiceSeller[]; total: number } | null {
    const cleanId = serviceId.trim();
    if (!cleanId) return null;
    return this.allSellersCache.get(cleanId) ?? null;
  }

  /**
   * Automatically fetches ALL live registered GeM Service Providers for a service in one
   * pass (no manual "next, next" paging) by fast-painting page 1 (100 sellers) and then
   * streaming all remaining 500-seller chunks concurrently via 5 parallel workers.
   */
  public static async fetchAllServiceSellers(
    serviceId: string,
    options?: {
      onProgress?: (
        sellers: LiveGeMServiceSeller[],
        total: number,
        isComplete: boolean
      ) => void;
      isCancelled?: () => boolean;
      chunkSize?: number;
      concurrency?: number;
    }
  ): Promise<{ sellers: LiveGeMServiceSeller[]; total: number }> {
    const cleanId = serviceId.trim();
    if (!cleanId) return { sellers: [], total: 0 };

    const cached = this.allSellersCache.get(cleanId);
    if (cached && cached.sellers.length > 0) {
      options?.onProgress?.(cached.sellers, cached.total, true);
      return cached;
    }

    const sellerById = new Map<string, LiveGeMServiceSeller>();
    const mergeSellers = (batch: LiveGeMServiceSeller[]) => {
      for (const item of batch) {
        const existing = sellerById.get(item.sellerId);
        if (!existing) {
          sellerById.set(item.sellerId, item);
        } else if (
          parseNumericProjectValue(item.totalValue) > parseNumericProjectValue(existing.totalValue) ||
          item.verifiedProjects > existing.verifiedProjects
        ) {
          sellerById.set(item.sellerId, item);
        }
      }
    };

    // Step 1: Fast first paint (100 sellers in ~1s so UI renders immediately)
    const first = await this.fetchServiceSellers(cleanId, 1, 100);
    if (options?.isCancelled?.()) {
      return { sellers: first.sellers, total: first.total };
    }
    mergeSellers(first.sellers);
    let total = Math.max(first.total, sellerById.size);

    if (!first.hasMore || total <= first.sellers.length) {
      const doneList = Array.from(sellerById.values());
      const doneResult = { sellers: doneList, total: Math.max(total, doneList.length) };
      if (doneList.length > 0) {
        this.allSellersCache.set(cleanId, doneResult);
      }
      options?.onProgress?.(doneResult.sellers, doneResult.total, true);
      return doneResult;
    }

    options?.onProgress?.(Array.from(sellerById.values()), total, false);

    // Step 2: Parallel 500-seller streaming across ALL remaining pages automatically
    const chunkSize = Math.min(500, Math.max(100, options?.chunkSize ?? 500));
    const concurrency = Math.min(6, Math.max(2, options?.concurrency ?? 5));
    const totalChunkPages = Math.ceil(total / chunkSize);
    const pageQueue: number[] = Array.from({ length: totalChunkPages }, (_, idx) => idx + 1);

    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < pageQueue.length) {
        if (options?.isCancelled?.()) return;
        const pageNum = pageQueue[nextIndex++];
        let res = await this.fetchServiceSellers(cleanId, pageNum, chunkSize, 22000);
        // Retry once cleanly if GeM briefly stalled on a 500-row chunk
        if (res.sellers.length === 0 && !options?.isCancelled?.()) {
          res = await this.fetchServiceSellers(cleanId, pageNum, chunkSize, 24000);
        }
        if (options?.isCancelled?.()) return;
        if (res.sellers.length > 0) {
          mergeSellers(res.sellers);
          total = Math.max(total, res.total, sellerById.size);
          options?.onProgress?.(Array.from(sellerById.values()), total, false);
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(concurrency, pageQueue.length) }, () => worker())
    );

    const finalList = Array.from(sellerById.values());
    const finalTotal = Math.max(total, finalList.length);
    const finalResult = { sellers: finalList, total: finalTotal };

    if (!options?.isCancelled?.()) {
      // Cache only when we completed an uninterrupted full sweep
      if (finalList.length > 0) {
        this.allSellersCache.set(cleanId, finalResult);
      }
      options?.onProgress?.(finalResult.sellers, finalResult.total, true);
    }

    return finalResult;
  }

  /**
   * Fetches live public seller credentials & verified GeM project value for a specific
   * Service Provider via mkp.gem.gov.in's public `get_seller_details` endpoint.
   */
  public static async fetchServiceSellerDetail(
    serviceId: string,
    sellerId: string
  ): Promise<LiveGeMServiceSellerDetail | null> {
    const cleanServiceId = serviceId.trim();
    const cleanSellerId = sellerId.trim();
    if (!cleanServiceId || !cleanSellerId) return null;

    const cacheKey = `${cleanServiceId}:${cleanSellerId}`;
    const cached = this.sellerDetailCache.get(cacheKey);
    if (cached) return cached;

    const url = `${MKP_ORIGIN}/pub/api/service_catalogs/${encodeURIComponent(cleanServiceId)}/get_seller_details?seller_id=${encodeURIComponent(cleanSellerId)}&show_seller_details=true`;
    const json = await fetchJsonWithTimeout<{
      meta?: { result?: string };
      result?: {
        seller_certificate_hash?: Record<string, unknown>;
        approved_project_details?: {
          total_verified_projects?: { value?: number | string };
          total_project_value?: { value?: number | string };
        };
      } | null;
    }>(url);

    const parsed = parseServiceSellerDetailPayload(cleanServiceId, cleanSellerId, json);
    if (parsed) {
      this.sellerDetailCache.set(cacheKey, parsed);
    }
    return parsed;
  }
}
