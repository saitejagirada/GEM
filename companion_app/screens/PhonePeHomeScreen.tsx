import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import type { DeconstructedBidDoc, UserAgentProfile, MarketPulseStats } from '../types/index';
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
}

export const PhonePeHomeScreen: React.FC<PhonePeHomeScreenProps> = ({
  userProfile,
  bids,
  marketPulse,
  onNavigateTab,
  onOpenAuctions,
  onOpenAgentBids,
  onOpenEligibility,
  onSelectCategory,
}) => {
  const [selectedBid, setSelectedBid] = useState<DeconstructedBidDoc | null>(null);

  const featuredBid = bids[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
                Est: ₹{(featuredBid.estimatedBidValueInr! / 100000).toFixed(1)}L • ₹0 EMD (MSE Exempt)
              </Text>
            </View>
            <View style={styles.promoArrow}>
              <Text style={styles.promoArrowText}>View ➔</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* SECTION 2: Bid Tools & Analysis (Exact PhonePe "Recharge & Bills" layout) */}
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

        {/* Bottom Split Action Banner (PhonePe Buy SIM / More style) */}
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

      {/* SECTION 3: Key Government Categories (Exact PhonePe "Loans / Insurance" layout) */}
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
});
