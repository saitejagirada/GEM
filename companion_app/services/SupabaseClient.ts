/**
-- =============================================================================
-- GeM Mobile Companion App - Production Supabase & Realtime Client
-- Architecture Stream: Thread 4 (Supabase & Realtime Data Pipeline)
-- 
-- Implements an Offline-First PostgREST query engine and Realtime Pub/Sub subscriber
-- with seamless zero-latency fallback to `mockData.ts` when offline or unconfigured.
-- =============================================================================
 */

import type {
  DeconstructedBidDoc,
  AuctionItem,
  ParticipatedBid,
  UserAgentProfile,
} from '../types/index.ts';

import {
  MOCK_DAILY_BIDS,
  MOCK_USER_PROFILE,
  MOCK_PARTICIPATED_BIDS,
} from '../fixtures/mockData.ts';

// -----------------------------------------------------------------------------
// Database Model Types
// -----------------------------------------------------------------------------

export interface SupabaseTender {
  bid_number: string;
  title: string;
  ministry: string;
  department: string;
  bid_type: string;
  estimated_value: number | null;
  emd_amount: number;
  emd_exemption_mse: boolean;
  closing_datetime: string;
  opening_datetime?: string | null;
  boq_summary?: string | null;
  consignee_states: string[];
  splitting_ratio?: string;
  make_in_india_class?: string;
  doc_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseTenderFundamentals {
  id?: string;
  tender_id: string;
  turnover_required: number;
  experience_years: number;
  delivery_period_days: number;
  epbg_percentage: number;
  epbg_amount_inr?: number;
  oem_authorization_required?: boolean;
  past_performance_percentage?: number;
  technical_clauses?: Array<{ clause: string; mandatory: boolean }>;
  required_documents?: string[];
}

export interface SupabaseReverseAuction {
  ra_number: string;
  original_bid_number?: string | null;
  title: string;
  buyer_organization: string;
  closing_time: string;
  current_l1_inr: number;
  min_decrement_inr: number;
  total_quantity: number;
  auto_extension_minutes: number;
  is_extended: boolean;
  status: 'ACTIVE' | 'EXTENDED' | 'CLOSED' | 'CANCELLED';
  winner_seller_id?: string | null;
}

export interface SupabaseCorrigendum {
  id: string;
  tender_id: string;
  amendment_type: string;
  summary: string;
  action_required: boolean;
  reconfirm_deadline?: string | null;
  previous_closing?: string | null;
  new_closing?: string | null;
  published_at: string;
}

export interface SupabaseVendorProfile {
  user_id: string;
  organization_name: string;
  udyam_number?: string;
  enterprise_type: 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'STARTUP';
  annual_turnover: number;
  years_experience: number;
  target_categories: string[];
  state: string;
  is_oem: boolean;
  biometric_auth_enabled: boolean;
}

export interface SupabaseVendorPortfolio {
  id?: string;
  user_id: string;
  bid_number: string;
  status: string;
  quoted_l1: number;
  expected_l1_benchmark?: number;
  current_rank?: number;
  pfms_stage?: string;
  crac_status?: string;
  created_at?: string;
}

// -----------------------------------------------------------------------------
// Offline Mock Fallback Records for Realtime Tables
// -----------------------------------------------------------------------------

const MOCK_REVERSE_AUCTIONS: SupabaseReverseAuction[] = [
  {
    ra_number: 'GEM-RA-2026-8801',
    original_bid_number: 'GEM/2026/B/99201',
    title: 'Live Reverse Auction: Rugged Dual-WAN GigE VPN Routers',
    buyer_organization: 'Border Security Force (BSF) HQ',
    closing_time: new Date(Date.now() + 12 * 60 * 1000 + 45 * 1000).toISOString(),
    current_l1_inr: 3840000,
    min_decrement_inr: 10000,
    total_quantity: 40,
    auto_extension_minutes: 10,
    is_extended: false,
    status: 'ACTIVE',
  },
  {
    ra_number: 'GEM-RA-2026-7712',
    original_bid_number: 'GEM/2026/B/89012',
    title: 'Live Reverse Auction: Commercial LED Batten Luminaires 45W',
    buyer_organization: 'Military Engineer Services (MES)',
    closing_time: new Date(Date.now() + 28 * 60 * 1000 + 10 * 1000).toISOString(),
    current_l1_inr: 2650000,
    min_decrement_inr: 5000,
    total_quantity: 1450,
    auto_extension_minutes: 10,
    is_extended: false,
    status: 'ACTIVE',
  },
];

const MOCK_CORRIGENDA: SupabaseCorrigendum[] = [
  {
    id: 'corr-001',
    tender_id: 'GEM/2026/B/89012',
    amendment_type: 'DUE_DATE_EXTENSION',
    summary: 'Bid submission date extended by 48 hours following representations on BIS test report submission guidelines.',
    action_required: true,
    reconfirm_deadline: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
    previous_closing: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
    new_closing: new Date(Date.now() + 60 * 3600 * 1000).toISOString(),
    published_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'corr-002',
    tender_id: 'GEM/2026/B/77102',
    amendment_type: 'TECHNICAL_SPEC_CHANGE',
    summary: 'Clause 4.2 revised: OFC attenuation limit adjusted to <= 0.35 dB/km at 1310 nm matching latest RDSO revision.',
    action_required: true,
    reconfirm_deadline: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
    previous_closing: new Date(Date.now() + 22 * 3600 * 1000).toISOString(),
    new_closing: new Date(Date.now() + 22 * 3600 * 1000).toISOString(),
    published_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
];

// -----------------------------------------------------------------------------
// Realtime Subscription Callback Types
// -----------------------------------------------------------------------------

export type ReverseAuctionListener = (auction: SupabaseReverseAuction) => void;
export type CorrigendumListener = (corrigendum: SupabaseCorrigendum) => void;

// -----------------------------------------------------------------------------
// SupabaseClient Implementation
// -----------------------------------------------------------------------------

export class SupabaseClient {
  private static supabaseUrl: string = 'https://mock-gem-supabase.supabase.co';
  private static anonKey: string = 'mock-anon-key';
  private static timeoutMs: number = 2000;
  private static isConfigured: boolean = false;
  private static forceOffline: boolean = false;

  private static raListeners: Set<ReverseAuctionListener> = new Set();
  private static corrigendaListeners: Set<CorrigendumListener> = new Set();
  private static realtimeSocket: WebSocket | null = null;
  private static localPortfolioCache: Map<string, SupabaseVendorPortfolio> = new Map();

  /**
   * Initializes or updates Supabase connection parameters.
   */
  public static configure(options: {
    url?: string;
    anonKey?: string;
    timeoutMs?: number;
    forceOffline?: boolean;
  }): void {
    if (options.url) this.supabaseUrl = options.url.replace(/\/$/, '');
    if (options.anonKey) this.anonKey = options.anonKey;
    if (options.timeoutMs) this.timeoutMs = options.timeoutMs;
    if (options.forceOffline !== undefined) this.forceOffline = options.forceOffline;

    this.isConfigured = Boolean(
      options.url &&
      !options.url.includes('mock-gem-supabase') &&
      options.anonKey &&
      options.anonKey !== 'mock-anon-key'
    );
  }

  public static isOnline(): boolean {
    return this.isConfigured && !this.forceOffline;
  }

  /**
   * Safe HTTP helper targeting PostgREST endpoints.
   */
  private static async safePostgrestFetch<T>(path: string, fallback: T): Promise<T> {
    if (!this.isOnline()) {
      return fallback;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `${this.supabaseUrl}/rest/v1/${path}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          apikey: this.anonKey,
          Authorization: `Bearer ${this.anonKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        return fallback;
      }

      const data = await response.json();
      return (data as T) ?? fallback;
    } catch {
      clearTimeout(timer);
      return fallback;
    }
  }

  // ===========================================================================
  // 1. TENDERS & FUNDAMENTALS QUERIES
  // ===========================================================================

  /**
   * Fetches tenders with optional full-text search, state filter, and limit.
   * Leverages PostgreSQL GIN indexes in production, or filters `MOCK_DAILY_BIDS` offline.
   */
  public static async getTenders(params?: {
    search?: string;
    state?: string;
    limit?: number;
  }): Promise<DeconstructedBidDoc[]> {
    const limit = params?.limit ?? 50;

    if (!this.isOnline()) {
      let filtered = [...MOCK_DAILY_BIDS];

      if (params?.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (b) =>
            b.bidNumber.toLowerCase().includes(q) ||
            b.title.toLowerCase().includes(q) ||
            b.ministry.toLowerCase().includes(q) ||
            b.department.toLowerCase().includes(q)
        );
      }

      if (params?.state) {
        const stateQuery = params.state.toLowerCase();
        filtered = filtered.filter((b) =>
          b.consignees.some((c) => c.state.toLowerCase().includes(stateQuery))
        );
      }

      return filtered.slice(0, limit);
    }

    // PostgREST Query Construction
    const searchParams = new URLSearchParams();
    searchParams.append('select', '*,tender_fundamentals(*)');
    searchParams.append('order', 'closing_datetime.asc');
    searchParams.append('limit', String(limit));

    if (params?.search) {
      // Use PostgreSQL websearch_to_tsquery or ilike
      searchParams.append('title', `ilike.*${params.search}*`);
    }

    if (params?.state) {
      searchParams.append('consignee_states', `cs.{${params.state}}`);
    }

    const rows = await this.safePostgrestFetch<any[]>(
      `tenders?${searchParams.toString()}`,
      []
    );

    if (!rows || rows.length === 0) {
      return this.getTenders({ ...params, limit }); // Fallback to offline
    }

    return rows.map((r) => this.mapRowToDeconstructedDoc(r));
  }

  /**
   * Retrieves specific tender fundamentals (2x2 glanceable cards and compliance dealbreakers).
   */
  public static async getBidFundamentals(bidNumber: string): Promise<SupabaseTenderFundamentals | null> {
    if (!this.isOnline()) {
      const match = MOCK_DAILY_BIDS.find((b) => b.bidNumber === bidNumber);
      if (!match) return null;

      return {
        tender_id: match.bidNumber,
        turnover_required: match.minAnnualTurnoverInr,
        experience_years: match.yearsExperienceRequired,
        delivery_period_days: match.deliveryPeriodDays,
        epbg_percentage: match.epbgPercentage,
        epbg_amount_inr: (match.estimatedBidValueInr ?? 0) * (match.epbgPercentage / 100),
        oem_authorization_required: match.requiredDocuments.some((d) => d.toLowerCase().includes('oem')),
        past_performance_percentage: match.pastPerformancePercentage,
        required_documents: match.requiredDocuments,
        technical_clauses: match.boqItems.map((item) => ({
          clause: `${item.itemTitle}: ${item.specsSummary}`,
          mandatory: true,
        })),
      };
    }

    const rows = await this.safePostgrestFetch<SupabaseTenderFundamentals[]>(
      `tender_fundamentals?tender_id=eq.${encodeURIComponent(bidNumber)}&limit=1`,
      []
    );

    return rows[0] || null;
  }

  // ===========================================================================
  // 2. REVERSE AUCTIONS & CORRIGENDA
  // ===========================================================================

  /**
   * Retrieves live active Reverse Auctions.
   */
  public static async getReverseAuctions(params?: {
    status?: string;
  }): Promise<SupabaseReverseAuction[]> {
    const status = params?.status ?? 'ACTIVE';

    if (!this.isOnline()) {
      return MOCK_REVERSE_AUCTIONS.filter((ra) => ra.status === status);
    }

    return this.safePostgrestFetch<SupabaseReverseAuction[]>(
      `reverse_auctions?status=eq.${encodeURIComponent(status)}&order=closing_time.asc`,
      MOCK_REVERSE_AUCTIONS
    );
  }

  /**
   * Retrieves corrigenda alerts, ordered with newest amendments first.
   */
  public static async getCorrigenda(tenderId?: string): Promise<SupabaseCorrigendum[]> {
    if (!this.isOnline()) {
      if (tenderId) {
        return MOCK_CORRIGENDA.filter((c) => c.tender_id === tenderId);
      }
      return MOCK_CORRIGENDA;
    }

    const filter = tenderId ? `tender_id=eq.${encodeURIComponent(tenderId)}&` : '';
    return this.safePostgrestFetch<SupabaseCorrigendum[]>(
      `corrigenda?${filter}order=published_at.desc`,
      MOCK_CORRIGENDA
    );
  }

  // ===========================================================================
  // 3. VENDOR PROFILE & PORTFOLIO
  // ===========================================================================

  /**
   * Fetches the vendor's MSME profile for dedicated user agent matching.
   */
  public static async getVendorProfile(userId: string): Promise<UserAgentProfile> {
    if (!this.isOnline()) {
      return MOCK_USER_PROFILE;
    }

    const rows = await this.safePostgrestFetch<SupabaseVendorProfile[]>(
      `vendor_profiles?user_id=eq.${encodeURIComponent(userId)}&limit=1`,
      []
    );

    if (rows && rows.length > 0) {
      const p = rows[0];
      return {
        id: p.user_id,
        organizationName: p.organization_name,
        msmeCategory: p.enterprise_type,
        annualTurnoverInr: p.annual_turnover,
        yearsExperience: p.years_experience,
        productCategories: p.target_categories,
        targetStates: [p.state],
        isOem: p.is_oem,
        hasUdyamCertificate: Boolean(p.udyam_number),
      };
    }

    return MOCK_USER_PROFILE;
  }

  /**
   * Retrieves participated tenders portfolio.
   */
  public static async getVendorPortfolio(userId: string): Promise<ParticipatedBid[]> {
    if (!this.isOnline()) {
      // Merge baseline mock data with any locally added items
      const localItems = Array.from(this.localPortfolioCache.values())
        .filter((i) => i.user_id === userId)
        .map((p) => this.mapPortfolioToParticipatedBid(p));

      return [...MOCK_PARTICIPATED_BIDS, ...localItems];
    }

    const rows = await this.safePostgrestFetch<any[]>(
      `vendor_portfolio?user_id=eq.${encodeURIComponent(userId)}&select=*,tenders(title,department)&order=created_at.desc`,
      []
    );

    if (!rows || rows.length === 0) {
      return MOCK_PARTICIPATED_BIDS;
    }

    return rows.map((r) => ({
      bidNumber: r.bid_number,
      itemTitle: r.tenders?.title ?? 'Tender Participation',
      department: r.tenders?.department ?? 'Government Department',
      quotedPriceInr: Number(r.quoted_l1),
      expectedL1BenchmarkInr: Number(r.expected_l1_benchmark ?? r.quoted_l1),
      submittedAtUtc: r.created_at ?? new Date().toISOString(),
      stage: r.status as any,
      currentRank: r.current_rank ?? 1,
      corrigendumCount: 0,
    }));
  }

  /**
   * Adds or updates a tender participation record in the vendor portfolio.
   */
  public static async savePortfolioItem(item: SupabaseVendorPortfolio): Promise<boolean> {
    // Save to local cache first (Offline-First guarantee)
    this.localPortfolioCache.set(`${item.user_id}:${item.bid_number}`, item);

    if (!this.isOnline()) {
      return true;
    }

    try {
      const url = `${this.supabaseUrl}/rest/v1/vendor_portfolio`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          apikey: this.anonKey,
          Authorization: `Bearer ${this.anonKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(item),
      });

      return response.ok;
    } catch {
      return true; // Still true because cached locally
    }
  }

  // ===========================================================================
  // 4. SUPABASE REALTIME PUB/SUB
  // ===========================================================================

  /**
   * Subscribes to live Reverse Auction price updates and auto-extensions.
   * Returns an unsubscribe function.
   */
  public static subscribeToReverseAuctions(
    callback: ReverseAuctionListener
  ): () => void {
    this.raListeners.add(callback);
    this.ensureRealtimeConnected();

    return () => {
      this.raListeners.delete(callback);
    };
  }

  /**
   * Subscribes to tender corrigenda alerts (deadline shifts & spec changes).
   * Returns an unsubscribe function.
   */
  public static subscribeToCorrigenda(
    callback: CorrigendumListener
  ): () => void {
    this.corrigendaListeners.add(callback);
    this.ensureRealtimeConnected();

    return () => {
      this.corrigendaListeners.delete(callback);
    };
  }

  /**
   * Manually dispatches a realtime event (useful for offline simulation and tests).
   */
  public static emitMockRealtimeEvent(
    table: 'reverse_auctions' | 'corrigenda',
    record: any
  ): void {
    if (table === 'reverse_auctions') {
      this.raListeners.forEach((fn) => fn(record as SupabaseReverseAuction));
    } else if (table === 'corrigenda') {
      this.corrigendaListeners.forEach((fn) => fn(record as SupabaseCorrigendum));
    }
  }

  /**
   * Initializes or maintains Supabase Realtime WebSocket connection.
   */
  private static ensureRealtimeConnected(): void {
    if (!this.isOnline()) {
      return;
    }

    if (this.realtimeSocket && this.realtimeSocket.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = this.supabaseUrl.replace(/^http/, 'ws');
      const endpoint = `${wsUrl}/realtime/v1/websocket?apikey=${this.anonKey}&vsn=1.0.0`;
      this.realtimeSocket = new WebSocket(endpoint);

      this.realtimeSocket.onopen = () => {
        // Phoenix Channel join message for postgres_changes
        const joinMsg = {
          topic: 'realtime:public',
          event: 'phx_join',
          payload: {
            config: {
              postgres_changes: [
                { event: '*', schema: 'public', table: 'reverse_auctions' },
                { event: '*', schema: 'public', table: 'corrigenda' },
              ],
            },
          },
          ref: '1',
        };
        this.realtimeSocket?.send(JSON.stringify(joinMsg));
      };

      this.realtimeSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'postgres_changes' && data.payload?.data) {
            const { table, record } = data.payload.data;
            this.emitMockRealtimeEvent(table, record);
          }
        } catch {
          // ignore malformed payloads
        }
      };

      this.realtimeSocket.onerror = () => {
        // Fall back gracefully to offline pub/sub
      };

      this.realtimeSocket.onclose = () => {
        this.realtimeSocket = null;
      };
    } catch {
      this.realtimeSocket = null;
    }
  }

  // ===========================================================================
  // 5. DATA ADAPTERS
  // ===========================================================================

  private static mapRowToDeconstructedDoc(row: any): DeconstructedBidDoc {
    const f = row.tender_fundamentals || {};
    return {
      bidNumber: row.bid_number,
      title: row.title,
      department: row.department,
      ministry: row.ministry,
      type: row.bid_type,
      estimatedBidValueInr: row.estimated_value ? Number(row.estimated_value) : undefined,
      emdAmountInr: Number(row.emd_amount ?? 0),
      isEmdExemptForMse: Boolean(row.emd_exemption_mse),
      epbgPercentage: Number(f.epbg_percentage ?? 3.0),
      minAnnualTurnoverInr: Number(f.turnover_required ?? 0),
      yearsExperienceRequired: Number(f.experience_years ?? 0),
      pastPerformancePercentage: Number(f.past_performance_percentage ?? 0),
      deliveryPeriodDays: Number(f.delivery_period_days ?? 30),
      splittingRatio: row.splitting_ratio ?? '100% to L1',
      makeInIndiaClass: row.make_in_india_class ?? 'CLASS_1',
      boqItems: [],
      consignees: (row.consignee_states || []).map((st: string) => ({
        location: `${st} Depot`,
        state: st,
        pincode: '000000',
        quantity: 1,
      })),
      requiredDocuments: f.required_documents ?? [],
      closingTimeUtc: row.closing_datetime,
      docUrl: row.doc_url ?? `https://gem.gov.in/bids/${row.bid_number}.pdf`,
    };
  }

  private static mapPortfolioToParticipatedBid(p: SupabaseVendorPortfolio): ParticipatedBid {
    return {
      bidNumber: p.bid_number,
      itemTitle: `Tender ${p.bid_number}`,
      department: 'Central Government Department',
      quotedPriceInr: Number(p.quoted_l1),
      expectedL1BenchmarkInr: Number(p.expected_l1_benchmark ?? p.quoted_l1),
      submittedAtUtc: p.created_at ?? new Date().toISOString(),
      stage: (p.status as any) ?? 'TECHNICAL_EVALUATION',
      currentRank: p.current_rank ?? 1,
      corrigendumCount: 0,
    };
  }
}
