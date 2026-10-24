import { describe, it, expect } from './test-utils.ts';
import { PortalApiClient } from '../services/PortalApiClient.ts';

describe('PortalApiClient', () => {
  it('falls back gracefully to offline fixtures when server is unreachable', async () => {
    // Point to non-existent endpoint to verify fallback
    PortalApiClient.setBaseUrl('http://127.0.0.1:59999/api/portal');

    const pulse = await PortalApiClient.getMarketPulse();
    expect(pulse).toBeDefined();
    expect(pulse.totalBidsToday).toBe(1420);

    const feed = await PortalApiClient.getFeed();
    expect(feed.length).toBeGreaterThan(0);
    expect(feed[0].bidNumber).toContain('GEM');

    const forwardAuctions = await PortalApiClient.getForwardAuctions();
    expect(forwardAuctions.length).toBeGreaterThan(0);

    const portfolio = await PortalApiClient.getPortfolio();
    expect(portfolio.length).toBeGreaterThan(0);
  });
});
