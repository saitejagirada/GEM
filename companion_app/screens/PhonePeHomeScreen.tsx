import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import type { DeconstructedBidDoc, UserAgentProfile, MarketPulseStats, AcceptedOrder } from '../types/index';
import { MOCK_ACCEPTED_ORDERS } from '../fixtures/mockData';
import { UserAgentService } from '../services/UserAgentService';
import { BidInspectorScreen } from './BidInspectorScreen';

interface PhonePeHomeScreenProps {
  userProfile: UserAgentProfile;
  bids: DeconstructedBidDoc[];
  marketPulse: MarketPulseStats;
  onNavigateTab: (tab: 'SEARCH' | 'SCAN' | 'ALERTS' | 'HISTORY') => void;
  onOpenAuctions: () => void;
  onOpenAgentBids: () => void;
  onOpenEligibility: () => void;
  onSelectCategory: (category: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onSyncPortal?: () => void;
  isSyncingPortal?: boolean;
  lastSyncedTime?: string;
}

const FEED_CATEGORIES = ['All', 'Defence', 'Railways', 'Medical', 'Power', 'Electronics'];

export const PhonePeHomeScreen: React.FC<PhonePeHomeScreenProps> = ({
  userProfile,
  bids,
  marketPulse,
  onNavigateTab,
  onOpenAuctions,
  onOpenAgentBids,
  onOpenEligibility,
  onSelectCategory,
  onRefresh,
  isRefreshing = false,
  onSyncPortal,
  isSyncingPortal = false,
  lastSyncedTime,
}) => {
  const [selectedBid, setSelectedBid] = useState<DeconstructedBidDoc | null>(null);
  const [selectedFeedFilter, setSelectedFeedFilter] = useState<string>('All');

  const filteredBids = bids.filter((bid) => {
    if (selectedFeedFilter === 'All') return true;
    const catLower = selectedFeedFilter.toLowerCase();
    const titleMatch = (bid.title || '').toLowerCase().includes(catLower);
    const minMatch = (bid.ministry || '').toLowerCase().includes(catLower);
    const deptMatch = (bid.department || '').toLowerCase().includes(catLower);
    return titleMatch || minMatch || deptMatch;
  });

  const featuredBid = bids[0];
  const acceptedOrders: AcceptedOrder[] =
    userProfile.acceptedOrders && userProfile.acceptedOrders.length > 0
      ? userProfile.acceptedOrders
      : MOCK_ACCEPTED_ORDERS;

  const totalAcceptedValueInr = acceptedOrders.reduce(
    (sum, o) => sum + (o.orderValueInr || 0),
    0
  );

  const handleOrderPress = (order: AcceptedOrder) => {
    Alert.alert(
      `GeM Order: ${order.contractNumber}`,
      `• Title: ${order.title}\n• Buyer: ${order.buyerDepartment}\n• Ministry: ${order.ministry}\n• Order Value: ₹${(order.orderValueInr / 100000).toFixed(2)} Lakhs\n• Order Date: ${order.orderDate}\n• CRAC Status: ${order.cracStatus} (${order.cracDate || 'Verified'})\n• SLA: ${order.slaCompliance}\n• PFMS UTR: ${order.pfmsUtrNumber || 'Disbursed'}\n• Invoice: ${order.invoiceNumber}`
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#5F259F']}
            tintColor="#5F259F"
          />
        ) : undefined
      }
    >
      {/* SECTION 1: Procurement & Bidding (Exact PhonePe "Money Transfers" layout) */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Procurement &amp; Bidding</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>Active Bids: {marketPulse.totalBidsToday}</Text>
          </View>
        </View>

        {/* 4 Circular Purple Action Buttons */}
        <View style={styles.circularIconsRow}>
          {/* Button 1: My Agent Bids */}
          <TouchableOpacity style={styles.circleItem} onPress={onOpenAgentBids} activeOpacity={0.7}>
            <View style={styles.purpleCircle}>
              <Text style={styles.circleIcon}>🤖</Text>
            </View>
            <Text style={styles.circleLabel}>Daily Matched</Text>
          </TouchableOpacity>

          {/* Button 2: Live Auctions */}
          <TouchableOpacity style={styles.circleItem} onPress={onOpenAuctions} activeOpacity={0.7}>
            <View style={styles.purpleCircle}>
              <Text style={styles.circleIcon}>⚡</Text>
            </View>
            <Text style={styles.circleLabel}>Live RA</Text>
          </TouchableOpacity>

          {/* Button 3: Ending Soon (<24h) */}
          <TouchableOpacity style={styles.circleItem} onPress={() => onNavigateTab('SEARCH')} activeOpacity={0.7}>
            <View style={[styles.purpleCircle, { backgroundColor: '#EA580C', shadowColor: '#EA580C' }]}>
              <Text style={styles.circleIcon}>⏳</Text>
              <View style={styles.circlePillBadge}>
                <Text style={styles.circlePillBadgeText}>{marketPulse.closingIn24Hours}</Text>
              </View>
            </View>
            <Text style={styles.circleLabel}>Ending Soon</Text>
          </TouchableOpacity>

          {/* Button 4: Eligibility Check */}
          <TouchableOpacity style={styles.circleItem} onPress={onOpenEligibility} activeOpacity={0.7}>
            <View style={styles.purpleCircle}>
              <Text style={styles.circleIcon}>🛡️</Text>
            </View>
            <Text style={styles.circleLabel}>MSE Status</Text>
          </TouchableOpacity>
        </View>

        {/* Promo Banner directly below (PhonePe Mutual Fund SIP style) */}
        {featuredBid && (
          <TouchableOpacity
            style={styles.promoBanner}
            onPress={() => setSelectedBid(featuredBid)}
            activeOpacity={0.8}
          >
            <View style={styles.promoLeft}>
              <Text style={styles.promoTag}>FEATURED MSE TENDER</Text>
              <Text style={styles.promoTitle} numberOfLines={1}>
                {featuredBid.title}
              </Text>
              <Text style={styles.promoSub}>
                Est: ₹{((featuredBid.estimatedBidValueInr || 2850000) / 100000).toFixed(1)}L • ₹0 EMD (MSE Exempt)
              </Text>
            </View>
            <View style={styles.promoArrow}>
              <Text style={styles.promoArrowText}>View ➔</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* SECTION 2: Verified GeM Track Record (5 Completed Contracts • ₹1.32 Cr) */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Verified GeM Track Record</Text>
            <Text style={styles.sectionSubTitle}>5 Completed Contracts • CVC Pre-qualification Proof</Text>
          </View>
          <View style={[styles.headerBadge, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[styles.headerBadgeText, { color: '#15803D' }]}>
              ₹{(totalAcceptedValueInr / 100000).toFixed(2)} Lakhs
            </Text>
          </View>
        </View>

        {/* List of 5 Completed Orders */}
        <View style={styles.ordersList}>
          {acceptedOrders.map((order, index) => (
            <TouchableOpacity
              key={order.contractNumber}
              style={[styles.orderItem, index === acceptedOrders.length - 1 && styles.orderItemLast]}
              onPress={() => handleOrderPress(order)}
              activeOpacity={0.7}
            >
              <View style={styles.orderLeft}>
                <View style={styles.orderNumberRow}>
                  <Text style={styles.orderContractNumber}>{order.contractNumber}</Text>
                  <View style={styles.cracPill}>
                    <Text style={styles.cracPillText}>✓ 100% CRAC</Text>
                  </View>
                </View>
                <Text style={styles.orderTitle} numberOfLines={1}>
                  {order.title}
                </Text>
                <Text style={styles.orderDepartment} numberOfLines={1}>
                  {order.buyerDepartment} • {order.orderDate}
                </Text>
              </View>

              <View style={styles.orderRight}>
                <Text style={styles.orderValueText}>
                  ₹{(order.orderValueInr / 100000).toFixed(2)}L
                </Text>
                <View style={styles.pfmsTag}>
                  <Text style={styles.pfmsTagText}>PFMS Disbursed</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Track Record Footer Banner */}
        <View style={styles.trackRecordFooter}>
          <Text style={styles.trackRecordFooterText}>
            ✓ 100% On-Time Delivery • 0 Liquidated Damages • Pre-qualifies for bids up to ₹1.05 Cr
          </Text>
        </View>
      </View>

      {/* SECTION 3: Bid Tools & Analysis (Exact PhonePe "Recharge & Bills" layout) */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Bid Tools &amp; Analysis</Text>
        </View>

        {/* 4 Rounded Squircle Tiles */}
        <View style={styles.squircleRow}>
          {/* Tile 1: Zero-PDF Inspector */}
          <TouchableOpacity
            style={styles.squircleItem}
            onPress={() => setSelectedBid(bids[0])}
            activeOpacity={0.7}
          >
            <View style={styles.squircleBox}>
              <Text style={styles.squircleIcon}>📄</Text>
            </View>
            <Text style={styles.squircleLabel}>Zero-PDF</Text>
            <Text style={styles.squircleSubLabel}>Inspector</Text>
          </TouchableOpacity>

          {/* Tile 2: Price Intelligence */}
          <TouchableOpacity
            style={styles.squircleItem}
            onPress={() =>
              Alert.alert(
                'Price Intelligence',
                'Historical GeM L1 clearance benchmarks indicate most electronics and cable orders close between 82%–94% of estimated budget.'
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.squircleBox}>
              <Text style={styles.squircleIcon}>📊</Text>
            </View>
            <Text style={styles.squircleLabel}>L1 Price</Text>
            <Text style={styles.squircleSubLabel}>Intelligence</Text>
          </TouchableOpacity>

          {/* Tile 3: Corrigenda Watch */}
          <TouchableOpacity
            style={styles.squircleItem}
            onPress={() => onNavigateTab('ALERTS')}
            activeOpacity={0.7}
          >
            <View style={styles.squircleBox}>
              <Text style={styles.squircleIcon}>⚡</Text>
            </View>
            <Text style={styles.squircleLabel}>Corrigenda</Text>
            <Text style={styles.squircleSubLabel}>Live Watch</Text>
          </TouchableOpacity>

          {/* Tile 4: Document Vault */}
          <TouchableOpacity
            style={styles.squircleItem}
            onPress={() =>
              Alert.alert(
                'Document Vault',
                'Your Udyam MSE Registration, CA Turnover Certificate, and OEM Authorizations are verified and attached.'
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.squircleBox}>
              <Text style={styles.squircleIcon}>📁</Text>
            </View>
            <Text style={styles.squircleLabel}>Document</Text>
            <Text style={styles.squircleSubLabel}>Vault</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Split Action Banner */}
        <View style={styles.splitBannerRow}>
          <View style={styles.splitBannerLeft}>
            <Text style={styles.splitBannerTitle}>Zero-EMD Exemption Active</Text>
            <Text style={styles.splitBannerSub}>{marketPulse.zeroEmdBids} Tenders eligible for your MSE category</Text>
          </View>
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={() => onNavigateTab('SEARCH')}
            activeOpacity={0.8}
          >
            <Text style={styles.moreBtnText}>More ➔</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SECTION 4: Live GeM Tenders Feed (Matched For You) */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Live GeM Tenders Feed</Text>
            <Text style={styles.sectionSubTitle}>Auto-matched with CVC Past Performance</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{bids.length} Active Today</Text>
          </View>
        </View>

        {/* Live Portal Auto-Ingestion & Sync Controller */}
        <View style={styles.portalSyncBanner}>
          <View style={styles.portalSyncLeft}>
            <View style={styles.portalSyncTagRow}>
              <View style={styles.liveGreenDot} />
              <Text style={styles.portalSyncTag}>PUBLIC PORTAL SYNC (GEM.GOV.IN)</Text>
            </View>
            <Text style={styles.portalSyncTitle}>Auto-Ingested Daily Government Bids</Text>
            <Text style={styles.portalSyncSub}>
              {lastSyncedTime ? `Synced: ${lastSyncedTime}` : 'Synced with bidplus.gem.gov.in'} • {bids.length} Active Public Tenders
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.portalSyncBtn, isSyncingPortal && styles.portalSyncBtnDisabled]}
            onPress={onSyncPortal || onRefresh}
            disabled={isSyncingPortal}
            activeOpacity={0.8}
          >
            <Text style={styles.portalSyncBtnText}>
              {isSyncingPortal ? '⟳ Ingesting...' : '⚡ Sync Portal'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterChipsScroll}
          contentContainerStyle={styles.filterChipsRow}
        >
          {FEED_CATEGORIES.map((cat) => {
            const isActive = selectedFeedFilter === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedFeedFilter(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tender Cards */}
        {filteredBids.length === 0 ? (
          <View style={styles.emptyFilterState}>
            <Text style={styles.emptyFilterText}>No live tenders found for &quot;{selectedFeedFilter}&quot;</Text>
            <TouchableOpacity
              style={styles.resetFilterBtn}
              onPress={() => setSelectedFeedFilter('All')}
              activeOpacity={0.7}
            >
              <Text style={styles.resetFilterBtnText}>Show All Categories</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredBids.map((bid) => {
            const evalResult = UserAgentService.evaluateBid(userProfile, bid);
            const pastMatch = evalResult.pastExperienceMatch;

            return (
              <View key={bid.bidNumber} style={styles.tenderFeedCard}>
                {/* Header: Bid # & Ministry */}
                <View style={styles.tenderFeedHeader}>
                  <Text style={styles.tenderBidNumber}>{bid.bidNumber}</Text>
                  <Text style={styles.tenderDepartment} numberOfLines={1}>
                    {bid.department}
                  </Text>
                </View>

                {/* Title */}
                <Text style={styles.tenderTitle} numberOfLines={2}>
                  {bid.title}
                </Text>

                {/* 3 Metric Pills */}
                <View style={styles.tenderMetricsRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>EST. BUDGET</Text>
                    <Text style={styles.metricValue}>
                      ₹{((bid.estimatedBidValueInr || 2850000) / 100000).toFixed(1)}L
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>EMD STATUS</Text>
                    <Text style={[styles.metricValue, { color: '#059669' }]}>
                      {bid.isEmdExemptForMse ? '₹0 (MSE Waived)' : `₹${bid.emdAmountInr}`}
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>DELIVERY</Text>
                    <Text style={styles.metricValue}>{bid.deliveryPeriodDays} Days</Text>
                  </View>
                </View>

                {/* CVC Experience Match Badge */}
                {pastMatch?.eligible ? (
                  <View style={styles.cvcMatchBanner}>
                    <Text style={styles.cvcMatchTitle}>
                      ⭐ CVC Past Experience Qualified ({pastMatch.matchType})
                    </Text>
                    {pastMatch.bestMatchingOrder && (
                      <Text style={styles.cvcMatchSubtitle} numberOfLines={1}>
                        Matched: {pastMatch.bestMatchingOrder.contractNumber} (₹{(pastMatch.bestMatchingOrder.orderValueInr / 100000).toFixed(1)}L - {pastMatch.bestMatchingOrder.buyerDepartment})
                      </Text>
                    )}
                  </View>
                ) : (
                  <View style={styles.cvcStandardBanner}>
                    <Text style={styles.cvcStandardText}>
                      ℹ️ Standard Eligibility: Turnover ₹{(bid.minAnnualTurnoverInr / 100000).toFixed(1)}L • {bid.yearsExperienceRequired} yrs exp
                    </Text>
                  </View>
                )}

                {/* Action Buttons: Zero-PDF Inspect + Official Portal Doc */}
                <View style={styles.tenderActionsRow}>
                  <TouchableOpacity
                    style={styles.inspectBtn}
                    onPress={() => setSelectedBid(bid)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.inspectBtnText}>Inspect Zero-PDF ➔</Text>
                  </TouchableOpacity>
                  {bid.docUrl ? (
                    <TouchableOpacity
                      style={styles.portalPdfBtn}
                      onPress={() => {
                        if (bid.docUrl) {
                          Linking.canOpenURL(bid.docUrl)
                            .then((supported) => {
                              if (supported) {
                                Linking.openURL(bid.docUrl!);
                              } else {
                                Alert.alert(
                                  'Official GeM Portal Document',
                                  `Bid: ${bid.bidNumber}\n\nDocument Link:\n${bid.docUrl}\n\nBuyer: ${bid.department}\nMinistry: ${bid.ministry}`
                                );
                              }
                            })
                            .catch(() => {
                              Alert.alert(
                                'Official GeM Portal Document',
                                `Bid: ${bid.bidNumber}\n\nDocument Link:\n${bid.docUrl}\n\nBuyer: ${bid.department}\nMinistry: ${bid.ministry}`
                              );
                            });
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.portalPdfBtnText}>GeM Doc 📄</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* SECTION 5: Key Government Categories (Exact PhonePe "Loans / Insurance" layout) */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Key Tender Categories</Text>
        </View>

        {/* 4 Category Squircle Tiles */}
        <View style={styles.squircleRow}>
          <TouchableOpacity
            style={styles.squircleItem}
            onPress={() => onSelectCategory('Railways')}
            activeOpacity={0.7}
          >
            <View style={styles.squircleBox}>
              <Text style={styles.squircleIcon}>🚂</Text>
            </View>
            <Text style={styles.squircleLabel}>Indian</Text>
            <Text style={styles.squircleSubLabel}>Railways</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.squircleItem}
            onPress={() => onSelectCategory('Defence')}
            activeOpacity={0.7}
          >
            <View style={styles.squircleBox}>
              <Text style={styles.squircleIcon}>🎖️</Text>
            </View>
            <Text style={styles.squircleLabel}>Defence &amp;</Text>
            <Text style={styles.squircleSubLabel}>MES</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.squircleItem}
            onPress={() => onSelectCategory('Healthcare')}
            activeOpacity={0.7}
          >
            <View style={styles.squircleBox}>
              <Text style={styles.squircleIcon}>🏥</Text>
            </View>
            <Text style={styles.squircleLabel}>Medical &amp;</Text>
            <Text style={styles.squircleSubLabel}>Health</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.squircleItem}
            onPress={() => onSelectCategory('IT')}
            activeOpacity={0.7}
          >
            <View style={styles.squircleBox}>
              <Text style={styles.squircleIcon}>💻</Text>
            </View>
            <Text style={styles.squircleLabel}>IT &amp; Telecom</Text>
            <Text style={styles.squircleSubLabel}>Hardware</Text>
          </TouchableOpacity>
        </View>

        {/* Explore all tenders banner */}
        <TouchableOpacity
          style={styles.exploreBanner}
          onPress={() => onNavigateTab('SEARCH')}
          activeOpacity={0.8}
        >
          <View style={styles.exploreBannerLeft}>
            <Text style={styles.exploreBannerTitle}>Browse 1,420+ Live GeM Tenders</Text>
            <Text style={styles.exploreBannerSub}>Closing this week with verified MSE preferences</Text>
          </View>
          <Text style={styles.moreBtnText}>Explore ➔</Text>
        </TouchableOpacity>
      </View>

      {/* Modal: Zero-PDF Bid Inspector */}
      <BidInspectorScreen
        bid={selectedBid}
        visible={!!selectedBid}
        onClose={() => setSelectedBid(null)}
        userProfile={userProfile}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F3F6' },
  content: { padding: 12, paddingBottom: 32 },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#1A1C1E',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionSubTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  headerBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    color: '#5F259F',
    fontSize: 11,
    fontWeight: '700',
  },
  circularIconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  circleItem: {
    alignItems: 'center',
    width: '23%',
    minHeight: 48,
  },
  purpleCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5F259F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#5F259F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  circleIcon: {
    fontSize: 24,
  },
  circleLabel: {
    color: '#212121',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  circlePillBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  circlePillBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  promoLeft: { flex: 1, marginRight: 8 },
  promoTag: {
    color: '#5F259F',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  promoTitle: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  promoSub: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '600',
  },
  promoArrow: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  promoArrowText: {
    color: '#5F259F',
    fontSize: 11,
    fontWeight: '800',
  },
  squircleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  squircleItem: {
    alignItems: 'center',
    width: '23%',
    minHeight: 48,
  },
  squircleBox: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  squircleIcon: {
    fontSize: 22,
  },
  squircleLabel: {
    color: '#1F2937',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  squircleSubLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  splitBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  splitBannerLeft: { flex: 1, marginRight: 8 },
  splitBannerTitle: { color: '#1E293B', fontSize: 13, fontWeight: '700' },
  splitBannerSub: { color: '#64748B', fontSize: 11, marginTop: 2 },
  moreBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  moreBtnText: {
    color: '#5F259F',
    fontSize: 12,
    fontWeight: '800',
  },
  ordersList: {
    marginBottom: 12,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  orderItemLast: {
    borderBottomWidth: 0,
  },
  orderLeft: {
    flex: 1,
    marginRight: 10,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  orderContractNumber: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  cracPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  cracPillText: {
    color: '#15803D',
    fontSize: 9,
    fontWeight: '800',
  },
  orderTitle: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  orderDepartment: {
    color: '#64748B',
    fontSize: 11,
  },
  orderRight: {
    alignItems: 'flex-end',
  },
  orderValueText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  pfmsTag: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  pfmsTagText: {
    color: '#166534',
    fontSize: 9,
    fontWeight: '700',
  },
  trackRecordFooter: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  trackRecordFooterText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  tenderFeedCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tenderFeedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tenderBidNumber: {
    color: '#5F259F',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  tenderDepartment: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    maxWidth: '55%',
  },
  tenderTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    lineHeight: 18,
  },
  tenderMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricValue: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  cvcMatchBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  cvcMatchTitle: {
    color: '#065F46',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  cvcMatchSubtitle: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '600',
  },
  cvcStandardBanner: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  cvcStandardText: {
    color: '#0369A1',
    fontSize: 10,
    fontWeight: '600',
  },
  portalSyncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  portalSyncLeft: { flex: 1, marginRight: 8 },
  portalSyncTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  liveGreenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#059669',
  },
  portalSyncTag: {
    color: '#6D28D9',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  portalSyncTitle: { color: '#1E1B4B', fontSize: 13, fontWeight: '700' },
  portalSyncSub: { color: '#6B7280', fontSize: 11, marginTop: 1 },
  portalSyncBtn: {
    backgroundColor: '#5F259F',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalSyncBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  portalSyncBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  tenderActionsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  inspectBtn: {
    flex: 1,
    backgroundColor: '#5F259F',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  inspectBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  portalPdfBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  portalPdfBtnText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  exploreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  exploreBannerLeft: { flex: 1, marginRight: 8 },
  exploreBannerTitle: { color: '#1E293B', fontSize: 13, fontWeight: '700' },
  exploreBannerSub: { color: '#64748B', fontSize: 11, marginTop: 2 },
  filterChipsScroll: {
    marginVertical: 10,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F3F6',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#5F259F',
    borderColor: '#5F259F',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyFilterState: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyFilterText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 10,
    fontWeight: '500',
  },
  resetFilterBtn: {
    backgroundColor: '#5F259F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetFilterBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
