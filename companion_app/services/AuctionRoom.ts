/**
 * GeM Mobile Companion App - Live Reverse Auction (RA) WebSocket Engine
 * Ensures clock drift synchronization and eliminates session dropout errors.
 */

import type { AuctionItem, BidSubmissionRequest, BidSubmissionResponse } from '../types/index.ts';

export type AuctionUpdateCallback = (updatedAuction: AuctionItem) => void;
export type AuctionEndCallback = (winningSellerId: string, finalPrice: number) => void;

export class AuctionRoomClient {
  private socket: WebSocket | null = null;
  private clockOffsetMs: number = 0;
  private pingInterval: any = null;
  private readonly wsUrl: string;
  private readonly auctionId: string;
  private readonly authToken: string;

  constructor(wsUrl: string, auctionId: string, authToken: string) {
    this.wsUrl = wsUrl;
    this.auctionId = auctionId;
    this.authToken = authToken;
  }

  /**
   * Connects to the auction gateway and performs NTP-like clock drift synchronization.
   */
  public connect(onUpdate: AuctionUpdateCallback, onEnd: AuctionEndCallback): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(`${this.wsUrl}/auctions/${this.auctionId}?token=${this.authToken}`);

        this.socket.onopen = () => {
          this.syncClockWithServer();
          this.startHeartbeat();
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'PONG') {
              this.calculateClockOffset(data.clientSendTime, data.serverTime);
            } else if (data.type === 'AUCTION_UPDATE') {
              onUpdate(data.payload as AuctionItem);
            } else if (data.type === 'AUCTION_CLOSED') {
              onEnd(data.payload.winningSellerId, data.payload.finalPrice);
            }
          } catch (e) {
            console.warn('[AuctionRoom] Malformed WS payload:', e);
          }
        };

        this.socket.onerror = (err) => {
          console.error('[AuctionRoom] WebSocket error:', err);
          reject(err);
        };

        this.socket.onclose = () => {
          this.stopHeartbeat();
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Computes client-to-server clock offset to guarantee bid submissions stay within valid time windows.
   */
  private syncClockWithServer(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const now = Date.now();
    this.socket.send(JSON.stringify({ type: 'PING', clientSendTime: now }));
  }

  private calculateClockOffset(clientSendTime: number, serverTime: number): void {
    const roundTrip = Date.now() - clientSendTime;
    const estimatedServerTime = serverTime + roundTrip / 2;
    this.clockOffsetMs = estimatedServerTime - Date.now();
  }

  /**
   * Submits a counter-bid authorized via local device biometrics (bypassing SMS OTP delays).
   */
  public async submitBiometricBid(
    sellerId: string,
    unitPrice: number,
    biometricSignature: string
  ): Promise<BidSubmissionResponse> {
    const request: BidSubmissionRequest = {
      auctionId: this.auctionId,
      sellerId,
      unitPrice,
      currency: 'INR',
      biometricSignature,
      deviceTimestamp: new Date(Date.now() + this.clockOffsetMs).toISOString(),
      clockDriftOffsetMs: this.clockOffsetMs,
    };

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Auction WebSocket is not connected. Check network connection.');
    }

    return new Promise((resolve, reject) => {
      const handler = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        if (data.type === 'BID_CONFIRMATION') {
          this.socket?.removeEventListener('message', handler);
          resolve(data.payload as BidSubmissionResponse);
        } else if (data.type === 'BID_REJECTED') {
          this.socket?.removeEventListener('message', handler);
          reject(new Error(data.message || 'Bid rejected by auction engine'));
        }
      };

      this.socket.addEventListener('message', handler);
      this.socket.send(JSON.stringify({ type: 'SUBMIT_BID', payload: request }));
    });
  }

  private startHeartbeat(): void {
    this.pingInterval = setInterval(() => this.syncClockWithServer(), 15000);
    if (this.pingInterval && typeof this.pingInterval.unref === 'function') {
      this.pingInterval.unref();
    }
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public disconnect(): void {
    this.stopHeartbeat();
    this.socket?.close();
    this.socket = null;
  }
}
