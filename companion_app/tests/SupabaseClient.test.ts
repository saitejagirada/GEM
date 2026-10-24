import { describe, it, expect, beforeEach } from './test-utils.ts';
import {
  SupabaseClient,
  type SupabaseReverseAuction,
  type SupabaseCorrigendum,
} from '../services/SupabaseClient.ts';

describe('SupabaseClient', () => {
  beforeEach(() => {
    // Reset configuration to offline-first default
    SupabaseClient.configure({
      url: 'https://mock-gem-supabase.supabase.co',
      anonKey: 'mock-anon-key',
      forceOffline: true,
    });
  });

  it('queries tenders with offline fallback and applies keyword search filtering', async () => {
    const tenders = await SupabaseClient.getTenders();
    expect(tenders).toBeDefined();
    expect(tenders.length).toBeGreaterThan(0);
    expect(tenders[0].bidNumber).toContain('GEM');

    // Test keyword search filter
    const searchResults = await SupabaseClient.getTenders({ search: 'Routers' });
    expect(searchResults.length).toBe(1);
    expect(searchResults[0].bidNumber).toBe('GEM/2026/B/99201');
    expect(searchResults[0].ministry).toBe('Ministry of Home Affairs');
  });

  it('filters tenders by consignee state offline', async () => {
    const delhiBids = await SupabaseClient.getTenders({ state: 'Delhi' });
    expect(delhiBids.length).toBeGreaterThan(0);
    expect(delhiBids.some((b) => b.bidNumber === 'GEM/2026/B/89012')).toBe(true);

    const nonExistentState = await SupabaseClient.getTenders({ state: 'Goa' });
    expect(nonExistentState.length).toBe(0);
  });

  it('retrieves glanceable 2x2 tender fundamentals with epbg amount calculation', async () => {
    const fundamentals = await SupabaseClient.getBidFundamentals('GEM/2026/B/89012');
    expect(fundamentals).toBeDefined();
    expect(fundamentals?.tender_id).toBe('GEM/2026/B/89012');
    expect(fundamentals?.turnover_required).toBe(2500000);
    expect(fundamentals?.experience_years).toBe(2);
    expect(fundamentals?.delivery_period_days).toBe(30);
    expect(fundamentals?.epbg_percentage).toBe(3.0);
    expect(fundamentals?.epbg_amount_inr).toBe(85500); // 3% of 2,850,000
    expect(fundamentals?.oem_authorization_required).toBe(true);
  });

  it('returns null when fundamentals are queried for non-existent tender', async () => {
    const fundamentals = await SupabaseClient.getBidFundamentals('GEM/NON_EXISTENT_999');
    expect(fundamentals).toBe(null);
  });

  it('retrieves active reverse auctions with L1 prices and minimum decrements', async () => {
    const auctions = await SupabaseClient.getReverseAuctions({ status: 'ACTIVE' });
    expect(auctions.length).toBe(2);
    expect(auctions[0].ra_number).toBe('GEM-RA-2026-8801');
    expect(auctions[0].current_l1_inr).toBe(3840000);
    expect(auctions[0].min_decrement_inr).toBe(10000);
    expect(auctions[0].status).toBe('ACTIVE');
  });

  it('retrieves corrigenda alerts ordered with action_required and reconfirm deadline', async () => {
    const alerts = await SupabaseClient.getCorrigenda();
    expect(alerts.length).toBe(2);
    expect(alerts[0].amendment_type).toBe('DUE_DATE_EXTENSION');
    expect(alerts[0].action_required).toBe(true);
    expect(alerts[0].reconfirm_deadline).toBeDefined();

    // Query specific tender corrigenda
    const specific = await SupabaseClient.getCorrigenda('GEM/2026/B/77102');
    expect(specific.length).toBe(1);
    expect(specific[0].amendment_type).toBe('TECHNICAL_SPEC_CHANGE');
  });

  it('retrieves vendor profile mapped to UserAgentProfile format', async () => {
    const profile = await SupabaseClient.getVendorProfile('usr-agent-001');
    expect(profile).toBeDefined();
    expect(profile.organizationName).toBe('Garuda Tech & Electrical Solutions');
    expect(profile.msmeCategory).toBe('MICRO');
    expect(profile.hasUdyamCertificate).toBe(true);
    expect(profile.productCategories).toContain('LED Luminaire');
    expect(profile.acceptedOrders).toBeDefined();
    expect(profile.acceptedOrders?.length).toBe(5);
  });

  it('manages vendor portfolio offline and preserves local bid additions', async () => {
    const initialPortfolio = await SupabaseClient.getVendorPortfolio('usr-agent-001');
    expect(initialPortfolio.length).toBeGreaterThan(0);

    // Save a new portfolio bid
    const saved = await SupabaseClient.savePortfolioItem({
      user_id: 'usr-agent-001',
      bid_number: 'GEM/2026/B/77102',
      status: 'AWARDED_L1',
      quoted_l1: 4100000,
      expected_l1_benchmark: 4200000,
      current_rank: 1,
      pfms_stage: 'CRAC_APPROVED',
      crac_status: 'ACCEPTED',
    });
    expect(saved).toBe(true);

    // Verify retrieval includes newly added bid
    const updatedPortfolio = await SupabaseClient.getVendorPortfolio('usr-agent-001');
    expect(updatedPortfolio.some((b) => b.bidNumber === 'GEM/2026/B/77102')).toBe(true);
  });

  it('supports Supabase Realtime pub/sub subscriptions for reverse auctions and corrigenda', () => {
    let receivedRa: SupabaseReverseAuction | null = null;
    let receivedCorr: SupabaseCorrigendum | null = null;

    const unsubRa = SupabaseClient.subscribeToReverseAuctions((ra) => {
      receivedRa = ra;
    });

    const unsubCorr = SupabaseClient.subscribeToCorrigenda((corr) => {
      receivedCorr = corr;
    });

    // Simulate realtime broadcast event
    const mockRaUpdate: SupabaseReverseAuction = {
      ra_number: 'GEM-RA-2026-8801',
      title: 'Live Reverse Auction',
      buyer_organization: 'BSF',
      closing_time: new Date().toISOString(),
      current_l1_inr: 3790000,
      min_decrement_inr: 10000,
      total_quantity: 40,
      auto_extension_minutes: 10,
      is_extended: true,
      status: 'EXTENDED',
    };

    SupabaseClient.emitMockRealtimeEvent('reverse_auctions', mockRaUpdate);
    expect(receivedRa).toEqual(mockRaUpdate);

    const mockCorrUpdate: SupabaseCorrigendum = {
      id: 'corr-003',
      tender_id: 'GEM/2026/B/99201',
      amendment_type: 'BOQ_REVISION',
      summary: 'Updated quantity requirement for remote border outposts.',
      action_required: true,
      published_at: new Date().toISOString(),
    };

    SupabaseClient.emitMockRealtimeEvent('corrigenda', mockCorrUpdate);
    expect(receivedCorr).toEqual(mockCorrUpdate);

    // Test unsubscribe
    unsubRa();
    unsubCorr();

    receivedRa = null;
    receivedCorr = null;
    SupabaseClient.emitMockRealtimeEvent('reverse_auctions', mockRaUpdate);
    expect(receivedRa).toBe(null);
  });

  it('retrieves the 5 accepted GeM orders with full CRAC and PFMS fields', async () => {
    const orders = await SupabaseClient.getAcceptedOrders();
    expect(orders.length).toBe(5);
    expect(orders[0].contractNumber).toBe('GEMC-511687712001');
    expect(orders[0].cracStatus).toBe('CRAC_ACCEPTED');
    expect(orders[0].orderValueInr).toBe(1850000);
    expect(orders[4].contractNumber).toBe('GEMC-511687712005');

    // Also verify getVendorPortfolio contains the accepted orders
    const portfolio = await SupabaseClient.getVendorPortfolio('usr-agent-001');
    expect(portfolio.some((b) => b.bidNumber === 'GEMC-511687712001')).toBe(true);
    expect(portfolio.some((b) => b.bidNumber === 'GEMC-511687712005')).toBe(true);
  });

  it('filters opportunities by procurement type and domain category', async () => {
    // Test SERVICE filter
    const serviceBids = await SupabaseClient.getTenders({ bidType: 'SERVICE' });
    expect(serviceBids.length).toBeGreaterThan(0);
    expect(serviceBids.every((b) => b.type === 'SERVICE')).toBe(true);
    expect(serviceBids.some((b) => b.bidNumber === 'GEM/2026/B/8124130')).toBe(true);

    // Test Domain Category filter
    const manpowerBids = await SupabaseClient.getTenders({ categoryDomain: 'Services & Manpower' });
    expect(manpowerBids.length).toBeGreaterThan(0);
    expect(manpowerBids[0].categoryDomain).toBe('Services & Manpower');
  });
});

