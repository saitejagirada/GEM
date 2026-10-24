import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import type { DeconstructedBidDoc, UserAgentProfile } from '../types/index';
import { UserAgentService } from '../services/UserAgentService';
import { BidDocService } from '../services/BidDocService';
import { PortalDocService } from '../services/PortalDocService';
import { BidInspectorScreen } from './BidInspectorScreen';
import { BidCountdownBadge } from '../components/BidCountdownBadge';

export interface PhonePeSearchScreenProps {
  bids: DeconstructedBidDoc[];
  userProfile: UserAgentProfile;
  initialFilter?: string;
  mode?: 'bids' | 'tenders' | 'all';
}

type ScopeFilter = 'ALL' | 'MATCHED';
type TypeFilter = 'ALL' | 'PRODUCT' | 'SERVICE' | 'CUSTOM' | 'BOQ' | 'RA';

export const PhonePeSearchScreen: React.FC<PhonePeSearchScreenProps> = ({
  bids,
  userProfile,
  initialFilter = '',
  mode = 'all',
}) => {
  const [searchQuery, setSearchQuery] = useState(initialFilter);
  const [selectedBid, setSelectedBid] = useState<DeconstructedBidDoc | null>(null);
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(
    mode === 'tenders' ? 'CUSTOM' : 'ALL'
  );

  const ranked = UserAgentService.rankDailyBids(userProfile, bids);

  const handleOpenDoc = (url?: string, bidNumber?: string) => {
    const targetUrl = PortalDocService.resolvePdfUrl(bidNumber, url);
    if (!PortalDocService.isSafeGemUrl(targetUrl)) {
      Alert.alert('Security Notice', 'Document link is not from a verified official GeM domain.');
      return;
    }
    Linking.canOpenURL(targetUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(targetUrl);
        } else {
          Alert.alert('Official GeM Portal Document', `Bid: ${bidNumber || 'N/A'}\n\nLink:\n${targetUrl}`);
        }
      })
      .catch(() => {
        Alert.alert('Official GeM Portal Document', `Bid: ${bidNumber || 'N/A'}\n\nLink:\n${targetUrl}`);
      });
  };

  // Filter pipeline
  const filtered = ranked.filter(({ bid, evaluation }) => {
    // 1. Scope filter (All vs Matched Only)
    if (scopeFilter === 'MATCHED') {
      const isRelevant = evaluation.matchScore >= 60 || evaluation.isEligible;
      if (!isRelevant) return false;
    }

    // 2. Type filter
    if (typeFilter !== 'ALL') {
      if (typeFilter === 'RA') {
        if (!bid.isRa && bid.type !== 'RA') return false;
      } else if (bid.type !== typeFilter) {
        return false;
      }
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const numMatch = bid.bidNumber.toLowerCase().includes(q);
      const titleMatch = bid.title.toLowerCase().includes(q);
      const deptMatch = bid.department.toLowerCase().includes(q);
      const minMatch = bid.ministry.toLowerCase().includes(q);
      const catMatch = (bid.categoryDomain || '').toLowerCase().includes(q);
      if (!numMatch && !titleMatch && !deptMatch && !minMatch && !catMatch) {
        return false;
      }
    }

    return true;
  });

  const titleText =
    mode === 'bids'
      ? 'GeM Bids Catalog'
      : mode === 'tenders'
      ? 'GeM Tenders & Contracts'
      : 'Browse GeM Opportunities';

  const subtitleText =
    mode === 'bids'
      ? 'Showing all available product and direct procurement bids'
      : mode === 'tenders'
      ? 'Custom specifications, BOQ turnkey projects and service contracts'
      : 'All active public opportunities across central & state departments';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Titles */}
      <View style={styles.titleSection}>
        <Text style={styles.screenTitle}>{titleText}</Text>
        <Text style={styles.screenSubtitle}>{subtitleText}</Text>
      </View>

      {/* Scope Segment Bar: [ All Opportunities (34) ] vs [ ⭐ Relevant Only ] */}
      <View style={styles.scopeSegmentContainer}>
        <TouchableOpacity
          style={[styles.scopeBtn, scopeFilter === 'ALL' && styles.scopeBtnActive]}
          onPress={() => setScopeFilter('ALL')}
          activeOpacity={0.8}
        >
          <Text style={[styles.scopeBtnText, scopeFilter === 'ALL' && styles.scopeBtnTextActive]}>
            🌐 All Available ({bids.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.scopeBtn, scopeFilter === 'MATCHED' && styles.scopeBtnActive]}
          onPress={() => setScopeFilter('MATCHED')}
          activeOpacity={0.8}
        >
          <Text style={[styles.scopeBtnText, scopeFilter === 'MATCHED' && styles.scopeBtnTextActive]}>
            ⭐ Relevant / Matched Only
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search bid number, item, department or ministry..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Procurement Type Filter Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterPillsRow}>
        <TouchableOpacity
          style={[styles.typePill, typeFilter === 'ALL' && styles.typePillActive]}
          onPress={() => setTypeFilter('ALL')}
        >
          <Text style={[styles.typePillText, typeFilter === 'ALL' && styles.typePillTextActive]}>
            All ({bids.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.typePill, typeFilter === 'PRODUCT' && styles.typePillActive]}
          onPress={() => setTypeFilter('PRODUCT')}
        >
          <Text style={[styles.typePillText, typeFilter === 'PRODUCT' && styles.typePillTextActive]}>
            📦 Products ({bids.filter((b) => b.type === 'PRODUCT').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.typePill, typeFilter === 'SERVICE' && styles.typePillActive]}
          onPress={() => setTypeFilter('SERVICE')}
        >
          <Text style={[styles.typePillText, typeFilter === 'SERVICE' && styles.typePillTextActive]}>
            🛠️ Services ({bids.filter((b) => b.type === 'SERVICE').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.typePill, typeFilter === 'CUSTOM' && styles.typePillActive]}
          onPress={() => setTypeFilter('CUSTOM')}
        >
          <Text style={[styles.typePillText, typeFilter === 'CUSTOM' && styles.typePillTextActive]}>
            📑 Custom ({bids.filter((b) => b.type === 'CUSTOM').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.typePill, typeFilter === 'BOQ' && styles.typePillActive]}
          onPress={() => setTypeFilter('BOQ')}
        >
          <Text style={[styles.typePillText, typeFilter === 'BOQ' && styles.typePillTextActive]}>
            📊 BOQ ({bids.filter((b) => b.type === 'BOQ').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.typePill, typeFilter === 'RA' && styles.typePillActive]}
          onPress={() => setTypeFilter('RA')}
        >
          <Text style={[styles.typePillText, typeFilter === 'RA' && styles.typePillTextActive]}>
            ⚡ Live RA ({bids.filter((b) => b.isRa || b.type === 'RA').length})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Popular Suggestions */}
      <View style={styles.popularRow}>
        <TouchableOpacity style={styles.quickChip} onPress={() => setSearchQuery('LED')}>
          <Text style={styles.quickChipText}>⚡ LED Lights</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickChip} onPress={() => setSearchQuery('Solar')}>
          <Text style={styles.quickChipText}>☀️ Solar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickChip} onPress={() => setSearchQuery('Defence')}>
          <Text style={styles.quickChipText}>🎖️ Defence</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickChip} onPress={() => setSearchQuery('Railways')}>
          <Text style={styles.quickChipText}>🚂 Railways</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickChip} onPress={() => setSearchQuery('Cables')}>
          <Text style={styles.quickChipText}>🔌 Cables</Text>
        </TouchableOpacity>
      </View>

      {/* Results Count Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filtered.length} {filtered.length === 1 ? 'Opportunity' : 'Opportunities'} Available
        </Text>
        {(searchQuery.length > 0 || typeFilter !== 'ALL' || scopeFilter !== 'ALL') && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setTypeFilter('ALL');
              setScopeFilter('ALL');
            }}
          >
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Cards List */}
      {filtered.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No matching opportunities found</Text>
          <Text style={styles.emptySubtitle}>Try resetting filters or searching a different term</Text>
          <TouchableOpacity
            style={styles.emptyResetBtn}
            onPress={() => {
              setSearchQuery('');
              setTypeFilter('ALL');
              setScopeFilter('ALL');
            }}
          >
            <Text style={styles.emptyResetText}>Show All {bids.length} Bids</Text>
          </TouchableOpacity>
        </View>
      ) : (
        filtered.map(({ bid, evaluation }) => {
          const f = BidDocService.getFundamentalsSummary(bid);
          const isHighMatch = evaluation.matchScore >= 75;
          const isService = bid.type === 'SERVICE';

          return (
            <View key={bid.bidNumber} style={styles.bidCard}>
              {/* Card Top: Type + Countdown + Bid Number */}
              <View style={styles.cardTop}>
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.typeBadge,
                      bid.isRa || bid.type === 'RA'
                        ? styles.typeRa
                        : isService
                        ? styles.typeService
                        : bid.type === 'CUSTOM'
                        ? styles.typeCustom
                        : styles.typeProduct,
                    ]}
                  >
                    <Text style={styles.typeBadgeText}>
                      {bid.isRa || bid.type === 'RA'
                        ? '⚡ LIVE RA'
                        : isService
                        ? '🛠️ SERVICE'
                        : bid.type === 'CUSTOM'
                        ? '📑 CUSTOM'
                        : bid.type === 'BOQ'
                        ? '📊 BOQ'
                        : '📦 GOODS'}
                    </Text>
                  </View>
                  <BidCountdownBadge closingTimeUtc={bid.closingTimeUtc} />
                </View>
                <Text style={styles.bidNumText}>{bid.bidNumber}</Text>
              </View>

              {/* Title & Department */}
              <Text style={styles.bidTitle}>{bid.title}</Text>
              <Text style={styles.deptText}>
                {bid.department} • {bid.categoryDomain || bid.ministry}
              </Text>

              {/* Match Banner */}
              <View
                style={[
                  styles.matchBanner,
                  isHighMatch ? styles.matchBannerHigh : styles.matchBannerMod,
                ]}
              >
                <Text style={styles.matchBannerText}>
                  ★ {evaluation.matchScore}% MATCH SCORE • {evaluation.verdictSummary}
                </Text>
              </View>

              {/* 4 Quick Fundamentals Grid */}
              <View style={styles.cardGrid}>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>EST. VALUE</Text>
                  <Text style={styles.cellValue}>{f.estimatedValueLabel}</Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>EMD WAIVER STATUS</Text>
                  <Text
                    style={[
                      styles.cellValue,
                      { color: bid.isEmdExemptForMse ? '#00C853' : '#F59E0B' },
                    ]}
                  >
                    {bid.isEmdExemptForMse ? '🛡️ MSE Exempt (₹0)' : f.emdLabel}
                  </Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>MIN TURNOVER</Text>
                  <Text
                    style={[
                      styles.cellValue,
                      { color: evaluation.turnoverEligible ? '#0F172A' : '#EF4444' },
                    ]}
                  >
                    {f.turnoverLabel} {evaluation.turnoverEligible ? '✓' : '⚠️'}
                  </Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={styles.cellLabel}>DELIVERY / SLA</Text>
                  <Text style={styles.cellValue}>
                    {isService
                      ? `${bid.serviceDetails?.durationMonths || 12} Mos SLA`
                      : f.deliveryPeriodLabel}
                  </Text>
                </View>
              </View>

              {/* Card Footer Actions: Inspect + Direct PDF */}
              <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={styles.inspectBtn}
                  onPress={() => setSelectedBid(bid)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.inspectBtnText}>Inspect Fundamentals ➔</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.docBtn}
                  onPress={() => handleOpenDoc(bid.docUrl, bid.bidNumber)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.docBtnText}>GeM Doc 📄</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },
  titleSection: { marginBottom: 12 },
  screenTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  scopeSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  scopeBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  scopeBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  scopeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  scopeBtnTextActive: {
    color: '#5F259F',
    fontWeight: '900',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
  clearBtn: { padding: 6 },
  clearBtnText: { color: '#64748B', fontSize: 14, fontWeight: '700' },
  filterPillsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  typePill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  typePillActive: {
    backgroundColor: '#5F259F',
    borderColor: '#5F259F',
  },
  typePillText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  typePillTextActive: {
    color: '#FFFFFF',
  },
  popularRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  quickChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quickChipText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultsCount: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resetText: {
    color: '#5F259F',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { color: '#0F172A', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  emptySubtitle: { color: '#64748B', fontSize: 12, textAlign: 'center', marginBottom: 14 },
  emptyResetBtn: {
    backgroundColor: '#5F259F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyResetText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  bidCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeProduct: { backgroundColor: '#EDE9FE' },
  typeService: { backgroundColor: '#E0F2FE' },
  typeCustom: { backgroundColor: '#FEF3C7' },
  typeRa: { backgroundColor: '#FEE2E2' },
  typeBadgeText: {
    color: '#1E293B',
    fontSize: 10,
    fontWeight: '900',
  },
  bidNumText: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  bidTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
    marginBottom: 3,
  },
  deptText: { color: '#64748B', fontSize: 11, marginBottom: 8, fontWeight: '500' },
  matchBanner: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  matchBannerHigh: { backgroundColor: '#DCFCE7' },
  matchBannerMod: { backgroundColor: '#FEF3C7' },
  matchBannerText: { color: '#166534', fontSize: 10, fontWeight: '800' },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  gridCell: { width: '48%' },
  cellLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '800', marginBottom: 2 },
  cellValue: { color: '#0F172A', fontSize: 12, fontWeight: '800' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    gap: 8,
  },
  inspectBtn: {
    flex: 1,
    backgroundColor: '#F3E8FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  inspectBtnText: { color: '#7E22CE', fontSize: 12, fontWeight: '800' },
  docBtn: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  docBtnText: { color: '#4338CA', fontSize: 12, fontWeight: '800' },
});
