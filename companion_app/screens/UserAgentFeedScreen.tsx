import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import type { DeconstructedBidDoc, UserAgentProfile, MarketPulseStats } from '../types/index';
import { UserAgentService } from '../services/UserAgentService';
import { BidDocService } from '../services/BidDocService';
import { BidInspectorScreen } from './BidInspectorScreen';

interface UserAgentFeedScreenProps {
  userProfile: UserAgentProfile;
  bids: DeconstructedBidDoc[];
  marketPulse: MarketPulseStats;
  onAddToParticipated?: (bid: DeconstructedBidDoc) => void;
}

type FilterChip = 'ALL' | 'TOP_MATCH' | 'ZERO_EMD' | 'DEFENCE' | 'RAILWAYS' | 'CLOSING_SOON';

export const UserAgentFeedScreen: React.FC<UserAgentFeedScreenProps> = ({
  userProfile,
  bids,
  marketPulse,
  onAddToParticipated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterChip>('ALL');
  const [selectedBid, setSelectedBid] = useState<DeconstructedBidDoc | null>(null);

  // Evaluate and rank bids using the dedicated agent
  const ranked = UserAgentService.rankDailyBids(userProfile, bids);

  const filteredBids = ranked.filter(({ bid, evaluation }) => {
    // Search query filter
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchText = `${bid.bidNumber} ${bid.title} ${bid.department} ${bid.ministry}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }

    // Filter chip
    if (selectedFilter === 'TOP_MATCH') return evaluation.matchScore >= 85;
    if (selectedFilter === 'ZERO_EMD') return evaluation.emdStatus === 'EXEMPT' || bid.emdAmountInr === 0;
    if (selectedFilter === 'DEFENCE') return bid.ministry.toLowerCase().includes('defence');
    if (selectedFilter === 'RAILWAYS') return bid.ministry.toLowerCase().includes('railways');
    if (selectedFilter === 'CLOSING_SOON') {
      const hoursRemaining = (new Date(bid.closingTimeUtc).getTime() - Date.now()) / (3600 * 1000);
      return hoursRemaining <= 24;
    }
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Groww-style Market Pulse Horizontal Ticker */}
      <View style={styles.marketPulseContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pulseScroll}>
          <View style={styles.pulseCard}>
            <Text style={styles.pulseLabel}>TODAY'S BIDS</Text>
            <Text style={styles.pulseValue}>{marketPulse.totalBidsToday.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.pulseCard}>
            <Text style={styles.pulseLabel}>LIVE REVERSE AUCTIONS</Text>
            <Text style={[styles.pulseValue, { color: '#00D09C' }]}>⚡ {marketPulse.liveReverseAuctions}</Text>
          </View>
          <View style={styles.pulseCard}>
            <Text style={styles.pulseLabel}>FORWARD SCRAP LOTS</Text>
            <Text style={[styles.pulseValue, { color: '#38BDF8' }]}>♻ {marketPulse.liveForwardAuctions}</Text>
          </View>
          <View style={styles.pulseCard}>
            <Text style={styles.pulseLabel}>CLOSING &lt; 24H</Text>
            <Text style={[styles.pulseValue, { color: '#F59E0B' }]}>⏳ {marketPulse.closingIn24Hours}</Text>
          </View>
          <View style={styles.pulseCard}>
            <Text style={styles.pulseLabel}>ZERO-EMD (MSE)</Text>
            <Text style={[styles.pulseValue, { color: '#A78BFA' }]}>🛡️ {marketPulse.zeroEmdBids}</Text>
          </View>
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* Search Bar (Min 48dp) */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tenders, items, departments..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={styles.clearSearchBtn} onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sticky Filter Chips Carousel (Min 48dp Touch Targets) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterCarousel}
        >
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'ALL' && styles.chipActive]}
            onPress={() => setSelectedFilter('ALL')}
          >
            <Text style={[styles.chipText, selectedFilter === 'ALL' && styles.chipTextActive]}>All Bids</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'TOP_MATCH' && styles.chipActive]}
            onPress={() => setSelectedFilter('TOP_MATCH')}
          >
            <Text style={[styles.chipText, selectedFilter === 'TOP_MATCH' && styles.chipTextActive]}>
              ⚡ 90%+ Match
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'ZERO_EMD' && styles.chipActive]}
            onPress={() => setSelectedFilter('ZERO_EMD')}
          >
            <Text style={[styles.chipText, selectedFilter === 'ZERO_EMD' && styles.chipTextActive]}>
              🛡️ Zero EMD
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'DEFENCE' && styles.chipActive]}
            onPress={() => setSelectedFilter('DEFENCE')}
          >
            <Text style={[styles.chipText, selectedFilter === 'DEFENCE' && styles.chipTextActive]}>
              🎖️ Defence
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'RAILWAYS' && styles.chipActive]}
            onPress={() => setSelectedFilter('RAILWAYS')}
          >
            <Text style={[styles.chipText, selectedFilter === 'RAILWAYS' && styles.chipTextActive]}>
              🚂 Railways
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'CLOSING_SOON' && styles.chipActive]}
            onPress={() => setSelectedFilter('CLOSING_SOON')}
          >
            <Text style={[styles.chipText, selectedFilter === 'CLOSING_SOON' && styles.chipTextActive]}>
              ⏳ Closing Soon
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Dedicated User Agent Banner */}
        <View style={styles.agentHeroBanner}>
          <View style={styles.agentBadgeRow}>
            <Text style={styles.agentTag}>🤖 24/7 AI PROCUREMENT AGENT</Text>
            <Text style={styles.agentUdyam}>✓ Udyam MSE Active</Text>
          </View>
          <Text style={styles.agentOrgTitle}>{userProfile.organizationName}</Text>
          <Text style={styles.agentSubtitle}>
            Auto-matched {filteredBids.length} tenders for turnover ₹{(userProfile.annualTurnoverInr / 100000).toFixed(0)}L & target states ({userProfile.targetStates.join(', ')}).
          </Text>
        </View>

        {/* Bid Match Cards */}
        {filteredBids.map(({ bid, evaluation }) => {
          const f = BidDocService.getFundamentalsSummary(bid);
          const hoursLeft = Math.max(
            0,
            Math.round((new Date(bid.closingTimeUtc).getTime() - Date.now()) / (3600 * 1000))
          );

          return (
            <TouchableOpacity
              key={bid.bidNumber}
              style={styles.bidCard}
              onPress={() => setSelectedBid(bid)}
              activeOpacity={0.85}
            >
              {/* Card Top Row: Match Pill & Countdown */}
              <View style={styles.cardHeaderRow}>
                <View
                  style={[
                    styles.matchPill,
                    evaluation.matchScore >= 80 ? styles.matchPillHigh : styles.matchPillMod,
                  ]}
                >
                  <Text style={styles.matchPillText}>★ {evaluation.matchScore}% MATCH</Text>
                </View>
                <Text style={styles.timeTag}>⏳ {hoursLeft}h remaining</Text>
              </View>

              {/* Title & Department */}
              <Text style={styles.bidCardTitle}>{bid.title}</Text>
              <Text style={styles.deptText}>{bid.department} • {bid.ministry}</Text>

              {/* Groww-style 2x2 Key Fundamentals Grid */}
              <View style={styles.cardGrid}>
                <View style={styles.gridMiniCell}>
                  <Text style={styles.miniLabel}>EST. VALUE</Text>
                  <Text style={styles.miniValPrimary}>{f.estimatedValueLabel}</Text>
                </View>
                <View style={styles.gridMiniCell}>
                  <Text style={styles.miniLabel}>EMD GUARANTEE</Text>
                  <Text style={[styles.miniValSecondary, { color: '#00D09C' }]}>{f.emdLabel}</Text>
                </View>
                <View style={styles.gridMiniCell}>
                  <Text style={styles.miniLabel}>MIN TURNOVER</Text>
                  <Text style={styles.miniValPrimary}>{f.turnoverLabel}</Text>
                </View>
                <View style={styles.gridMiniCell}>
                  <Text style={styles.miniLabel}>PAST EXP</Text>
                  <Text style={styles.miniValPrimary}>{f.experienceLabel}</Text>
                </View>
              </View>

              {/* Bottom Card Action Footer (Min 48dp Target) */}
              <View style={styles.cardFooter}>
                <Text style={styles.viewDetailsText}>View Fundamentals (Zero-PDF) →</Text>
                <View style={styles.boqTag}>
                  <Text style={styles.boqTagText}>{bid.boqItems.length} BOQ Items</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Zero-PDF Bid Inspector Modal */}
      <BidInspectorScreen
        bid={selectedBid}
        visible={!!selectedBid}
        onClose={() => setSelectedBid(null)}
        userProfile={userProfile}
        onAddToParticipated={onAddToParticipated}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B132B' },
  marketPulseContainer: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingVertical: 8,
  },
  pulseScroll: { paddingHorizontal: 16, gap: 10 },
  pulseCard: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pulseLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  pulseValue: { color: '#F8FAFC', fontSize: 13, fontWeight: '900', marginTop: 2 },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
  clearSearchBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  clearSearchText: { color: '#94A3B8', fontSize: 14, fontWeight: '700' },
  filterCarousel: { gap: 8, marginBottom: 16, paddingVertical: 2 },
  filterChip: {
    minHeight: 48,
    paddingHorizontal: 16,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3B82F6',
  },
  chipText: { color: '#CBD5E1', fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#60A5FA', fontWeight: '900' },
  agentHeroBanner: {
    backgroundColor: '#162032',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#00D09C',
  },
  agentBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  agentTag: { color: '#00D09C', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  agentUdyam: { color: '#38BDF8', fontSize: 11, fontWeight: '700' },
  agentOrgTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '900', marginBottom: 2 },
  agentSubtitle: { color: '#94A3B8', fontSize: 12, lineHeight: 16 },
  bidCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  matchPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  matchPillHigh: { backgroundColor: 'rgba(0, 208, 156, 0.2)' },
  matchPillMod: { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
  matchPillText: { color: '#00D09C', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  timeTag: { color: '#F59E0B', fontSize: 11, fontWeight: '700' },
  bidCardTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '800', lineHeight: 20, marginBottom: 4 },
  deptText: { color: '#94A3B8', fontSize: 12, marginBottom: 12 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  gridMiniCell: {
    width: '48%',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  miniLabel: { color: '#64748B', fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  miniValPrimary: { color: '#F8FAFC', fontSize: 13, fontWeight: '800' },
  miniValSecondary: { fontSize: 12, fontWeight: '700' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  viewDetailsText: { color: '#38BDF8', fontSize: 13, fontWeight: '800' },
  boqTag: { backgroundColor: '#0F172A', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  boqTagText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
});
