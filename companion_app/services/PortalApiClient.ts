/**
 * GeM Mobile Companion App - Portal API Client
 * Connects optional backend endpoints without presenting fixture rows as official
 * account data. Public discovery falls back only to the current in-memory feed.
 */

import type {
  MarketPulseStats,
  DeconstructedBidDoc,
  ForwardAuctionLot,
  ParticipatedBid,
  AcceptedOrder,
} from '../types/index.ts';
import { GeMLiveSyncService } from './GeMLiveSyncService.ts';
import { MarketplaceService, type MarketplaceItem } from './MarketplaceService.ts';

export class PortalApiClient {
  private static baseUrl = 'http://localhost:5001/api/portal';
  private static timeoutMs = 1500;

  public static setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  /**
   * Probes genuine public internet connectivity (via DNS/HTTP 204).
   * Accurately detects active 4G cellular data and Wi-Fi connections.
   */
  public static async isOnline(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('https://clients3.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res.status === 204 || res.ok;
    } catch {
      try {
        const controller2 = new AbortController();
        const timer2 = setTimeout(() => controller2.abort(), 2000);
        const res2 = await fetch('https://dns.google/resolve?name=gem.gov.in', {
          signal: controller2.signal,
        });
        clearTimeout(timer2);
        return res2.ok;
      } catch {
        return false;
      }
    }
  }

  private static async safeFetch<T>(endpoint: string, fallback: T): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      });
      clearTimeout(timer);

      if (!response.ok) {
        return fallback;
      }

      const json = await response.json();
      if (json && json.success && json.data) {
        return json.data as T;
      }
      return fallback;
    } catch {
      clearTimeout(timer);
      return fallback;
    }
  }

  public static async getMarketPulse(): Promise<MarketPulseStats> {
    return this.safeFetch<MarketPulseStats>('/market-pulse', {
      totalBidsToday: 0,
      liveReverseAuctions: 0,
      liveForwardAuctions: 0,
      closingIn24Hours: 0,
      zeroEmdBids: 0,
    });
  }

  public static async getLiveBids(pages: number = 3): Promise<DeconstructedBidDoc[]> {
    const fallback = GeMLiveSyncService.getLiveBids();
    return this.safeFetch<DeconstructedBidDoc[]>(`/live-bids?pages=${pages}`, fallback);
  }

  public static async getFeed(params?: { category?: string; state?: string; minScore?: number }): Promise<DeconstructedBidDoc[]> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.state) query.append('state', params.state);
    if (params?.minScore) query.append('minScore', String(params.minScore));

    const qs = query.toString();
    const endpoint = `/feed${qs ? `?${qs}` : ''}`;
    const fallback = GeMLiveSyncService.getLiveBids();
    return this.safeFetch<DeconstructedBidDoc[]>(endpoint, fallback);
  }

  public static async getBidFundamentals(bidNumber: string): Promise<DeconstructedBidDoc | null> {
    const fallback = GeMLiveSyncService.getBidById(bidNumber) || null;
    return this.safeFetch<DeconstructedBidDoc | null>(`/bid/${encodeURIComponent(bidNumber)}/fundamentals`, fallback);
  }

  public static async getForwardAuctions(): Promise<ForwardAuctionLot[]> {
    return this.safeFetch<ForwardAuctionLot[]>('/auctions?type=forward', []);
  }

  public static async getPortfolio(): Promise<ParticipatedBid[]> {
    return this.safeFetch<ParticipatedBid[]>('/portfolio', []);
  }

  public static async getProducts(params?: { category?: string; q?: string }): Promise<MarketplaceItem[]> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.q) query.append('q', params.q);
    const qs = query.toString();
    const endpoint = `/products${qs ? `?${qs}` : ''}`;
    return this.safeFetch<MarketplaceItem[]>(endpoint, MarketplaceService.getItems({ category: params?.category, query: params?.q }));
  }

  public static async getContracts(): Promise<AcceptedOrder[]> {
    return this.safeFetch<AcceptedOrder[]>('/contracts', []);
  }

  public static async addToPortfolio(bid: DeconstructedBidDoc): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/portfolio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bid),
        signal: controller.signal,
      });
      clearTimeout(timer);
      return response.ok;
    } catch {
      clearTimeout(timer);
      return false; // Offline saved locally
    }
  }
}
