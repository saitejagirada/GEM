import { describe, it, expect } from './test-utils.ts';
import { AuctionRoomClient } from '../services/AuctionRoom.ts';
import type { AuctionItem } from '../types/index.ts';

describe('AuctionRoomClient', () => {
  it('connects and immediately requests clock drift sync via PING', async () => {
    let pingSent = false;
    const mockSocket: any = {
      readyState: 1,
      send: (msg: string) => {
        if (msg.includes('"type":"PING"')) pingSent = true;
      },
      close: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    };

    (globalThis as any).WebSocket = function () {
      setTimeout(() => {
        if (mockSocket.onopen) mockSocket.onopen();
      }, 5);
      return mockSocket;
    };
    (globalThis as any).WebSocket.OPEN = 1;

    const client = new AuctionRoomClient('wss://gem-ra.gov.in/ws', 'auc-9988', 'auth-token-123');
    await client.connect(() => {}, () => {});

    expect(pingSent).toBe(true);
    client.disconnect();
  });

  it('receives AUCTION_UPDATE and triggers callback with latest L1 and rank', async () => {
    let updateReceived: AuctionItem | null = null;

    const mockSocket: any = {
      readyState: 1,
      send: () => {},
      close: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    };

    (globalThis as any).WebSocket = function () {
      setTimeout(() => {
        if (mockSocket.onopen) mockSocket.onopen();
      }, 5);
      return mockSocket;
    };
    (globalThis as any).WebSocket.OPEN = 1;

    const client = new AuctionRoomClient('wss://gem-ra.gov.in/ws', 'auc-9988', 'auth-token-123');
    await client.connect(
      (item) => {
        updateReceived = item;
      },
      () => {}
    );

    const mockAuction: AuctionItem = {
      id: 'auc-9988',
      contractNumber: 'GEM-2026-RA-11',
      title: 'Supply of High Speed Switches',
      category: 'Electronics',
      buyerOrganization: 'Ministry of Railways',
      closingTimeUtc: '2026-10-24T18:00:00Z',
      currentLowestBid: 450000,
      sellerRank: 2,
      sellerCurrentBid: 470000,
      minimumDecrement: 5000,
      autoExtensionMinutes: 5,
      isExtended: false,
    };

    mockSocket.onmessage({
      data: JSON.stringify({ type: 'AUCTION_UPDATE', payload: mockAuction }),
    });

    expect(updateReceived !== null).toBe(true);
    expect((updateReceived as any)?.currentLowestBid).toBe(450000);
    client.disconnect();
  });

  it('submits biometric bid with calibrated clock drift timestamp', async () => {
    let sentPayload: any = null;
    const mockSocket: any = {
      readyState: 1,
      send: (msg: string) => {
        sentPayload = JSON.parse(msg);
      },
      close: () => {},
      addEventListener: (evt: string, handler: any) => {
        if (evt === 'message') {
          setTimeout(() => {
            handler({
              data: JSON.stringify({
                type: 'BID_CONFIRMATION',
                payload: {
                  status: 'ACCEPTED',
                  rank: 1,
                  isL1: true,
                  nextMinimumBid: 440000,
                  auctionExtended: true,
                  remainingTimeMs: 300000,
                },
              }),
            });
          }, 5);
        }
      },
      removeEventListener: () => {},
    };

    (globalThis as any).WebSocket = function () {
      setTimeout(() => {
        if (mockSocket.onopen) {
          mockSocket.onopen();
          // Respond with PONG to set clock drift
          if (mockSocket.onmessage) {
            mockSocket.onmessage({
              data: JSON.stringify({
                type: 'PONG',
                clientSendTime: Date.now(),
                serverTime: Date.now() + 1500,
              }),
            });
          }
        }
      }, 5);
      return mockSocket;
    };
    (globalThis as any).WebSocket.OPEN = 1;

    const client = new AuctionRoomClient('wss://gem-ra.gov.in/ws', 'auc-9988', 'auth-token-123');
    await client.connect(() => {}, () => {});

    const response = await client.submitBiometricBid('seller-msme-01', 445000, 'biometric-sig-hash');
    expect(response.isL1).toBe(true);
    expect(response.status).toBe('ACCEPTED');
    expect(sentPayload.payload.unitPrice).toBe(445000);
    expect(sentPayload.payload.sellerId).toBe('seller-msme-01');

    client.disconnect();
  });
});
