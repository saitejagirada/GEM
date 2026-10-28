/**
 * GeM Bids Hub Screen - High-Performance Virtualized Bids & Tenders Browser
 * Renders all 34 verified live opportunities with zero touch lag:
 * - Virtualized FlatList with React.memo item rendering
 * - Scope toggle: [ 🌐 All Available Bids (34) ] vs [ ⭐ Relevant / Matched Only ]
 * - 1-tap direct verified GeM PDF download via PortalDocService
 * - Zero login barrier: public citizen/vendor discovery mode
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ScrollView,
  SafeAreaView,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import type { DeconstructedBidDoc, UserAgentProfile } from '../types/index';
import { UserAgentService } from '../services/UserAgentService';
import { BidDocService } from '../services/BidDocService';
import { PortalDocService } from '../services/PortalDocService';
import { GeMLiveSyncService } from '../services/GeMLiveSyncService';
import { BidInspectorScreen } from './BidInspectorScreen';
import { BidCountdownBadge } from '../components/BidCountdownBadge';
import { TouchButton } from '../components/TouchButton';
import { useTheme } from '../theme/ThemeContext';

export type GeMStatusTab = 'ONGOING' | 'RA' | 'CLOSED' | 'CANCELLED' | 'ALL';

interface BidsHubScreenProps {
  bids: DeconstructedBidDoc[];
  userProfile: UserAgentProfile;
  initialFilter?: string;
  mode?: 'bids' | 'tenders' | 'all';
  onSyncLive?: () => Promise<void> | void;
  isSyncing?: boolean;
}

type ScopeFilter = 'ALL' | 'MATCHED';
type TypeFilter = 'ALL' | 'PRODUCT' | 'SERVICE' | 'CUSTOM' | 'BOQ' | 'RA';

interface BidCardProps {
  bid: DeconstructedBidDoc;
  matchScore: number;
  turnoverEligible: boolean;
  verdictSummary: string;
  onInspect: (bid: DeconstructedBidDoc) => void;
  onOpenDoc: (bidNumber?: string, docUrl?: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
  fontMultiplier: number;
  isDark: boolean;
}

// Memoized Card Item for Zero Touch Lag & Smooth 60 FPS Scrolling
const MemoizedBidCard = React.memo<BidCardProps>(({
  bid,
  matchScore,
  turnoverEligible,
  verdictSummary,
  onInspect,
  onOpenDoc,
  colors,
  fontMultiplier,
  isDark,
}) => {
  const f = BidDocService.getFundamentalsSummary(bid);
  const isHighMatch = matchScore >= 75;
  const isService = bid.type === 'SERVICE';
  const isRa = bid.isRa || bid.type === 'RA' || bid.lifecycleStatus === 'BID_TO_RA';
  const lifecycle = bid.lifecycleStatus || GeMLiveSyncService.computeLifecycleStatus(bid);
  const isClosed = lifecycle === 'CLOSED' || lifecycle === 'AWARDED';
  const isCancelled = lifecycle === 'CANCELLED' || bid.isCancelled;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Card Header: Type Badge + Dynamic Lifecycle / Countdown + Bid Number */}
      <View style={styles.cardTop}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor: isRa
                  ? '#FEE2E2'
                  : isService
                  ? '#E0F2FE'
                  : bid.type === 'CUSTOM'
                  ? '#FEF3C7'
                  : bid.type === 'BOQ'
                  ? '#F3E8FF'
                  : '#EDE9FE',
              },
            ]}
          >
            <Text
              style={[
                styles.typeBadgeText,
                {
                  color: isRa
                    ? '#B91C1C'
                    : isService
                    ? '#0369A1'
                    : bid.type === 'CUSTOM'
                    ? '#B45309'
                    : bid.type === 'BOQ'
                    ? '#7E22CE'
                    : '#6D28D9',
                },
              ]}
            >
              {isRa
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
          {isCancelled ? (
            <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
              <Text style={{ color: '#DC2626', fontSize: 9.5, fontWeight: '800' }}>🚫 CANCELLED</Text>
            </View>
          ) : isClosed ? (
            <View style={[styles.statusBadge, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
              <Text style={{ color: isDark ? '#94A3B8' : '#475569', fontSize: 9.5, fontWeight: '800' }}>
                🔒 EVALUATION ({bid.evaluationStage || 'TECH'})
              </Text>
            </View>
          ) : (
            <BidCountdownBadge closingTimeUtc={bid.closingTimeUtc} />
          )}
        </View>
        <Text style={[styles.bidNumText, { color: colors.textMuted }]}>{bid.bidNumber}</Text>
      </View>

      {/* Bid Title */}
      <Text
        style={[styles.bidTitle, { color: colors.textPrimary, fontSize: 14 * fontMultiplier }]}
        numberOfLines={2}
      >
        {bid.title}
      </Text>

      {/* Department & Ministry */}
      <Text style={[styles.deptText, { color: colors.textMuted }]} numberOfLines={1}>
        {bid.department} • {bid.categoryDomain || bid.ministry}
      </Text>

      {/* Match Score Banner */}
      <View
        style={[
          styles.matchBanner,
          { backgroundColor: isHighMatch ? (isDark ? '#064E3B' : '#DCFCE7') : (isDark ? '#451A03' : '#FEF3C7') },
        ]}
      >
        <Text style={[styles.matchBannerText, { color: isHighMatch ? '#166534' : '#B45309' }]}>
          ★ {matchScore}% FIT SCORE • {verdictSummary}
        </Text>
      </View>

      {/* 4 Quick Fundamentals Grid */}
      <View style={[styles.cardGrid, { backgroundColor: isDark ? colors.surfaceSubtle : '#F8FAFC' }]}>
        <View style={styles.gridCell}>
          <Text style={[styles.cellLabel, { color: colors.textMuted }]}>EST. VALUE</Text>
          <Text style={[styles.cellValue, { color: colors.textPrimary }]}>{f.estimatedValueLabel}</Text>
        </View>
        <View style={styles.gridCell}>
          <Text style={[styles.cellLabel, { color: colors.textMuted }]}>EMD STATUS</Text>
          <Text
            style={[
              styles.cellValue,
              { color: bid.isEmdExemptForMse ? colors.emerald : '#F59E0B' },
            ]}
          >
            {bid.isEmdExemptForMse ? '🛡️ MSE Exempt (₹0)' : f.emdLabel}
          </Text>
        </View>
        <View style={styles.gridCell}>
          <Text style={[styles.cellLabel, { color: colors.textMuted }]}>MIN TURNOVER</Text>
          <Text
            style={[
              styles.cellValue,
              { color: turnoverEligible ? colors.textPrimary : '#EF4444' },
            ]}
          >
            {f.turnoverLabel} {turnoverEligible ? '✓' : '⚠️'}
          </Text>
        </View>
        <View style={styles.gridCell}>
          <Text style={[styles.cellLabel, { color: colors.textMuted }]}>DELIVERY / SLA</Text>
          <Text style={[styles.cellValue, { color: colors.textPrimary }]}>
            {isService
              ? `${bid.serviceDetails?.durationMonths || 12} Mos SLA`
              : f.deliveryPeriodLabel}
          </Text>
        </View>
      </View>

      {/* Card Actions: Zero-PDF Inspect + 1-Tap GeM Doc PDF */}
      <View style={styles.cardActions}>
        <TouchButton
          title="Inspect Zero-PDF"
          variant="outline"
          size="small"
          icon="📋"
          onPress={() => onInspect(bid)}
          style={{ flex: 1 }}
        />
        <TouchButton
          title="GeM Doc 📄"
          variant="primary"
          size="small"
          onPress={() => onOpenDoc(bid.bidNumber, bid.docUrl)}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
});

export const BidsHubScreen: React.FC<BidsHubScreenProps> = ({
  bids,
  userProfile,
  initialFilter = '',
  mode = 'all',
  onSyncLive,
  isSyncing,
}) => {
  const { colors, fontMultiplier, isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState(initialFilter);
  const [selectedBid, setSelectedBid] = useState<DeconstructedBidDoc | null>(null);
  const [statusTab, setStatusTab] = useState<GeMStatusTab>('ONGOING');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(mode === 'tenders' ? 'CUSTOM' : 'ALL');

  const now = useMemo(() => new Date(), []);
  const statusCounts = useMemo(() => {
    let ongoing = 0;
    let ra = 0;
    let closed = 0;
    let cancelled = 0;
    for (const b of bids) {
      const s = GeMLiveSyncService.computeLifecycleStatus(b, now);
      if (s === 'ONGOING' || s === 'BID_TO_RA') ongoing++;
      if (s === 'BID_TO_RA' || b.isRa || b.type === 'RA') ra++;
      if (s === 'CLOSED' || s === 'AWARDED') closed++;
      if (s === 'CANCELLED' || b.isCancelled) cancelled++;
    }
    return { ongoing, ra, closed, cancelled, total: bids.length };
  }, [bids, now]);

  const ranked = useMemo(() => UserAgentService.rankDailyBids(userProfile, bids), [userProfile, bids]);

  const handleOpenDoc = useCallback((bidNumber?: string, docUrl?: string) => {
    const targetUrl = PortalDocService.resolvePdfUrl(bidNumber, docUrl);
    if (!PortalDocService.isSafeGemUrl(targetUrl)) {
      Alert.alert('Security Notice', 'Document link is not from an official verified GeM domain.');
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
  }, []);

  const handleInspect = useCallback((bid: DeconstructedBidDoc) => {
    setSelectedBid(bid);
  }, []);

  // Filter pipeline
  const filtered = useMemo(() => {
    return ranked.filter(({ bid, evaluation }) => {
      // 0. GeM Lifecycle Status Filter (Mirroring bidplus.gem.gov.in)
      const computedStatus = GeMLiveSyncService.computeLifecycleStatus(bid, now);
      if (statusTab === 'ONGOING') {
        if (computedStatus !== 'ONGOING' && computedStatus !== 'BID_TO_RA') return false;
      } else if (statusTab === 'RA') {
        if (computedStatus !== 'BID_TO_RA' && !bid.isRa && bid.type !== 'RA') return false;
      } else if (statusTab === 'CLOSED') {
        if (computedStatus !== 'CLOSED' && computedStatus !== 'AWARDED') return false;
      } else if (statusTab === 'CANCELLED') {
        if (computedStatus !== 'CANCELLED' && !bid.isCancelled) return false;
      }

      // 1. Scope filter
      if (scopeFilter === 'MATCHED') {
        const isRelevant = evaluation.matchScore >= 60 || evaluation.isEligible;
        if (!isRelevant) return false;
      }

      // 2. Type filter
      if (typeFilter !== 'ALL') {
        if (typeFilter === 'RA') {
          if (!bid.isRa && bid.type !== 'RA' && computedStatus !== 'BID_TO_RA') return false;
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
  }, [ranked, statusTab, scopeFilter, typeFilter, searchQuery, now]);

  const renderItem = useCallback(
    ({ item }: { item: (typeof ranked)[0] }) => (
      <MemoizedBidCard
        bid={item.bid}
        matchScore={item.evaluation.matchScore}
        turnoverEligible={item.evaluation.turnoverEligible}
        verdictSummary={item.evaluation.verdictSummary}
        onInspect={handleInspect}
        onOpenDoc={handleOpenDoc}
        colors={colors}
        fontMultiplier={fontMultiplier}
        isDark={isDark}
      />
    ),
    [handleInspect, handleOpenDoc, colors, fontMultiplier, isDark]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sleek Top Search Bar with Inline Refresh & Clear */}
      <View style={[styles.searchSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.searchInputWrapper, { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search 45,399+ tenders by bid, item, ministry..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchButton
              title="✕"
              variant="ghost"
              size="small"
              onPress={() => setSearchQuery('')}
              hitSlopPadding={4}
            />
          )}
          {onSyncLive && (
            <TouchButton
              title={isSyncing ? "⟳ Syncing..." : "⟳"}
              variant="ghost"
              size="small"
              onPress={onSyncLive}
              style={styles.inlineRefreshBtn}
              textStyle={{ fontSize: 16, color: colors.primary, fontWeight: '900' }}
              hitSlopPadding={4}
            />
          )}
        </View>

        {/* Row 1: Segmented GeM Status Bar (Ongoing, Live RA, Closed, All) */}
        <View style={styles.statusSegmentRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusSegmentScroll}>
            <TouchButton
              title={`🟢 Ongoing (${statusCounts.ongoing})`}
              variant={statusTab === 'ONGOING' ? 'primary' : 'ghost'}
              size="small"
              onPress={() => setStatusTab('ONGOING')}
              style={styles.segmentedTabBtn}
            />
            <TouchButton
              title={`⚡ Live RA (${statusCounts.ra})`}
              variant={statusTab === 'RA' ? 'primary' : 'ghost'}
              size="small"
              onPress={() => setStatusTab('RA')}
              style={styles.segmentedTabBtn}
            />
            <TouchButton
              title={`🔒 Closed (${statusCounts.closed})`}
              variant={statusTab === 'CLOSED' ? 'primary' : 'ghost'}
              size="small"
              onPress={() => setStatusTab('CLOSED')}
              style={styles.segmentedTabBtn}
            />
            <TouchButton
              title={`🌐 All (${statusCounts.total})`}
              variant={statusTab === 'ALL' ? 'primary' : 'ghost'}
              size="small"
              onPress={() => setStatusTab('ALL')}
              style={styles.segmentedTabBtn}
            />
            {statusCounts.cancelled > 0 && (
              <TouchButton
                title={`🚫 Cancelled (${statusCounts.cancelled})`}
                variant={statusTab === 'CANCELLED' ? 'primary' : 'ghost'}
                size="small"
                onPress={() => setStatusTab('CANCELLED')}
                style={styles.segmentedTabBtn}
              />
            )}
          </ScrollView>
        </View>

        {/* Row 2: Consolidated Filter Chips (Vehicles + Matched Scope) */}
        <View style={styles.chipRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRowScroll}>
            <TouchButton
              title="All Vehicles"
              variant={typeFilter === 'ALL' && scopeFilter === 'ALL' ? 'saffron' : 'secondary'}
              size="small"
              onPress={() => {
                setTypeFilter('ALL');
                setScopeFilter('ALL');
              }}
              style={styles.filterChip}
            />
            <TouchButton
              title="⭐ Matched Only"
              variant={scopeFilter === 'MATCHED' ? 'saffron' : 'secondary'}
              size="small"
              onPress={() => setScopeFilter(scopeFilter === 'MATCHED' ? 'ALL' : 'MATCHED')}
              style={styles.filterChip}
            />
            <TouchButton
              title={`📦 Products (${bids.filter((b) => b.type === 'PRODUCT').length})`}
              variant={typeFilter === 'PRODUCT' ? 'saffron' : 'secondary'}
              size="small"
              onPress={() => {
                setTypeFilter(typeFilter === 'PRODUCT' ? 'ALL' : 'PRODUCT');
              }}
              style={styles.filterChip}
            />
            <TouchButton
              title={`🛠️ Services (${bids.filter((b) => b.type === 'SERVICE').length})`}
              variant={typeFilter === 'SERVICE' ? 'saffron' : 'secondary'}
              size="small"
              onPress={() => {
                setTypeFilter(typeFilter === 'SERVICE' ? 'ALL' : 'SERVICE');
              }}
              style={styles.filterChip}
            />
            <TouchButton
              title={`📊 BOQ (${bids.filter((b) => b.type === 'BOQ').length})`}
              variant={typeFilter === 'BOQ' ? 'saffron' : 'secondary'}
              size="small"
              onPress={() => {
                setTypeFilter(typeFilter === 'BOQ' ? 'ALL' : 'BOQ');
              }}
              style={styles.filterChip}
            />
            <TouchButton
              title={`📑 Custom (${bids.filter((b) => b.type === 'CUSTOM').length})`}
              variant={typeFilter === 'CUSTOM' ? 'saffron' : 'secondary'}
              size="small"
              onPress={() => {
                setTypeFilter(typeFilter === 'CUSTOM' ? 'ALL' : 'CUSTOM');
              }}
              style={styles.filterChip}
            />
          </ScrollView>
        </View>
      </View>

      {/* Virtualized FlatList with Pull-To-Refresh */}
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.bid.bidNumber}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={true}
        contentContainerStyle={styles.listContent}
        refreshControl={
          onSyncLive ? (
            <RefreshControl
              refreshing={Boolean(isSyncing)}
              onRefresh={onSyncLive}
              colors={['#0B3B60', '#FF9933']}
              tintColor="#FF9933"
            />
          ) : undefined
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={[styles.listHeaderCount, { color: colors.textMuted }]}>
              {filtered.length} {filtered.length === 1 ? 'Opportunity' : 'Opportunities'} Available
            </Text>
          </View>
        }
      />

      {/* Zero-PDF Bid Inspector Modal */}
      <BidInspectorScreen
        bid={selectedBid}
        visible={!!selectedBid}
        onClose={() => setSelectedBid(null)}
        userProfile={userProfile}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchSection: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 42,
  },
  searchIcon: { fontSize: 16, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '600', paddingVertical: 4 },
  inlineRefreshBtn: { paddingHorizontal: 6, minHeight: 36, justifyContent: 'center' },
  statusSegmentRow: { marginTop: 8 },
  statusSegmentScroll: { gap: 6 },
  segmentedTabBtn: { marginRight: 6 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2.5, borderRadius: 6 },
  chipRow: { marginTop: 6 },
  chipRowScroll: { gap: 6 },
  filterChip: { marginRight: 6 },
  listContent: { paddingHorizontal: 12, paddingBottom: 40 },
  listHeader: { paddingVertical: 4 },
  listHeaderCount: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2.5, borderRadius: 6 },
  typeBadgeText: { fontSize: 9.5, fontWeight: '900' },
  bidNumText: { fontSize: 11, fontWeight: '700' },
  bidTitle: { fontWeight: '800', lineHeight: 19, marginBottom: 3 },
  deptText: { fontSize: 11, marginBottom: 8, fontWeight: '500' },
  matchBanner: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  matchBannerText: { fontSize: 10, fontWeight: '800' },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  gridCell: { width: '48%' },
  cellLabel: { fontSize: 9, fontWeight: '800', marginBottom: 2 },
  cellValue: { fontSize: 11.5, fontWeight: '800' },
  cardActions: { flexDirection: 'row', gap: 8 },
});
