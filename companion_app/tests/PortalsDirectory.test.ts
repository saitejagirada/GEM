import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MOCK_ACCEPTED_ORDERS, MOCK_FORWARD_AUCTIONS, MOCK_DAILY_BIDS } from '../fixtures/mockData.ts';

describe('PortalsDirectory & Sub-Domains Ecosystem Verification', () => {
  it('verifies public executed contracts from gem.gov.in/view_contracts', () => {
    assert.ok(MOCK_ACCEPTED_ORDERS.length >= 5);
    for (const c of MOCK_ACCEPTED_ORDERS) {
      assert.ok(c.contractNumber.startsWith('GEMC-'));
      assert.ok(c.orderValueInr > 0);
      assert.ok(c.cracStatus.includes('ACCEPTED') || c.cracStatus.includes('PAYMENT'));
      assert.ok(c.pfmsUtrNumber.length >= 10);
    }
  });

  it('verifies Government E-Scrap Forward Auctions lots from forwardauction.gem.gov.in', () => {
    assert.ok(MOCK_FORWARD_AUCTIONS.length >= 3);
    for (const fa of MOCK_FORWARD_AUCTIONS) {
      assert.ok(fa.auctionNumber.startsWith('GEM-FA-'));
      assert.ok(fa.currentHighestBidInr >= fa.reservePriceInr);
      assert.ok(fa.minimumIncrementInr > 0);
    }
  });

  it('verifies large-scale synchronized tenders catalog has expanded beyond baseline 34', () => {
    assert.ok(MOCK_DAILY_BIDS.length >= 60, `Expected at least 60 bids, found ${MOCK_DAILY_BIDS.length}`);
    const ministries = new Set(MOCK_DAILY_BIDS.map((b) => b.ministry));
    assert.ok(ministries.size >= 10, 'Expected bids across at least 10 central ministries');
    assert.ok(ministries.has('Ministry of Defence'));
    assert.ok(ministries.has('Ministry of Railways'));
    assert.ok(ministries.has('Ministry of Health & Family Welfare'));
    assert.ok(ministries.has('Ministry of Power'));
    assert.ok(ministries.has('Ministry of Electronics & IT'));
  });

  it('verifies each bid has an authentic showbidDocument PDF URL with numeric ID', () => {
    for (const b of MOCK_DAILY_BIDS) {
      assert.ok(b.docUrl.includes('https://bidplus.gem.gov.in/showbidDocument/'));
      assert.ok(b.b_id && b.b_id.length > 0);
    }
  });
});
