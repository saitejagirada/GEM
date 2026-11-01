import { describe, it, expect } from './test-utils.ts';
import { PortalApiClient } from '../services/PortalApiClient.ts';

describe('PortalApiClient', () => {
  it('returns empty account-scoped data when the optional backend is unreachable', async () => {
    // Point to a non-existent endpoint to verify that no fixture account is shown.
    PortalApiClient.setBaseUrl('http://127.0.0.1:59999/api/portal');

    const pulse = await PortalApiClient.getMarketPulse();
    expect(pulse).toBeDefined();
    expect(pulse.totalBidsToday).toBe(0);

    const feed = await PortalApiClient.getFeed();
    expect(feed.length).toBe(0);

    const forwardAuctions = await PortalApiClient.getForwardAuctions();
    expect(forwardAuctions.length).toBe(0);

    const portfolio = await PortalApiClient.getPortfolio();
    expect(portfolio.length).toBe(0);

    const liveBids = await PortalApiClient.getLiveBids(2);
    expect(liveBids.length).toBe(0);
  });
});
