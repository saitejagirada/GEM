/**
 * GeM Mobile Companion App - Portal API Client
 * Connects the mobile frontend to the official GeM Flask intelligence endpoints (http://localhost:5001/api/portal).
 * Implements an Offline-First design: gracefully falls back to cached fixtures if the server is offline or unreachable.
 */

import type {
  MarketPulseStats,
  DeconstructedBidDoc,
  ForwardAuctionLot,
  ParticipatedBid,
} from '../types/index.ts';
import {
  MOCK_MARKET_PULSE,
  MOCK_DAILY_BIDS,
  MOCK_FORWARD_AUCTIONS,
  MOCK_PARTICIPATED_BIDS,
} from '../fixtures/mockData.ts';

export class PortalApiClient {
  private static baseUrl = 'http://localhost:5001/api/portal';
  private static timeoutMs = 1500;

  public static setBaseUrl(url: string) {
    this.baseUrl = url;
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
    return this.safeFetch<MarketPulseStats>('/market-pulse', MOCK_MARKET_PULSE);
  }

  public static async getLiveBids(pages: number = 3): Promise<DeconstructedBidDoc[]> {
    return this.safeFetch<DeconstructedBidDoc[]>(`/live-bids?pages=${pages}`, MOCK_DAILY_BIDS);
  }

  public static async getFeed(params?: { category?: string; state?: string; minScore?: number }): Promise<DeconstructedBidDoc[]> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.state) query.append('state', params.state);
    if (params?.minScore) query.append('minScore', String(params.minScore));

    const qs = query.toString();
    const endpoint = `/feed${qs ? `?${qs}` : ''}`;
    return this.safeFetch<DeconstructedBidDoc[]>(endpoint, MOCK_DAILY_BIDS);
  }

  public static async getBidFundamentals(bidNumber: string): Promise<DeconstructedBidDoc | null> {
    const fallback = MOCK_DAILY_BIDS.find((b) => b.bidNumber === bidNumber) || null;
    return this.safeFetch<DeconstructedBidDoc | null>(`/bid/${encodeURIComponent(bidNumber)}/fundamentals`, fallback);
  }

  public static async getForwardAuctions(): Promise<ForwardAuctionLot[]> {
    return this.safeFetch<ForwardAuctionLot[]>('/auctions?type=forward', MOCK_FORWARD_AUCTIONS);
  }

  public static async getPortfolio(): Promise<ParticipatedBid[]> {
    return this.safeFetch<ParticipatedBid[]>('/portfolio', MOCK_PARTICIPATED_BIDS);
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
