/**
 * GeM Bids & Tenders Hub Screen - NotebookLM-Inspired Procurement Browser
 * Conforms to Screen 3 of the GeM Mobile UI Specification:
 * - SegmentedTabs: Ongoing, Live RA, Closed with dynamic counts
 * - SearchField with clean icon & clear button
 * - Filter chips: All, Goods, Services, Filters [icon]
 * - Compact Bid Cards matching Screen 3 layout
 * - Filter bottom sheet for Department, Est Value, and MSE/EMD criteria
 * - Full Bid Inspector modal integration
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Alert,
  Linking,
  RefreshControl,
  Pressable,
} from 'react-native';
import type { DeconstructedBidDoc, UserAgentProfile } from '../types/index';
import { UserAgentService } from '../services/UserAgentService';
import { BidDocService } from '../services/BidDocService';
import { PortalDocService } from '../services/PortalDocService';
import { GeMLiveSyncService } from '../services/GeMLiveSyncService';
import { BidInspectorScreen } from './BidInspectorScreen';
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import {
  SearchField,
  SegmentedTabs,
  CompactChip,
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
  MetricBox,
  FilterBottomSheetModal,
} from '../components/SharedUI';
import { formatLakhs, formatDateSafe } from '../utils/formatters';

export type GeMStatusTab = 'Ongoing' | 'Live RA' | 'Closed';

interface BidsHubScreenProps {
  bids: DeconstructedBidDoc[];
  userProfile: UserAgentProfile;
  initialFilter?: string;
  onSyncLive?: () => Promise<void> | void;
  isSyncing?: boolean;
  onInspectBid?: (bid: DeconstructedBidDoc) => void;
}

export const BidsHubScreen: React.FC<BidsHubScreenProps> = ({
  bids,
  userProfile,
  onSyncLive,
  isSyncing = false,
  onInspectBid,
}) => {
  const { colors, fontMultiplier } = useTheme();

  const [activeStatusTab, setActiveStatusTab] = useState<GeMStatusTab>('Ongoing');
  const [activeTypeChip, setActiveTypeChip] = useState<'All' | 'Goods' | 'Services'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [savedBidNumbers, setSavedBidNumbers] = useState<Set<string>>(new Set());
  const [inspectingBid, setInspectingBid] = useState<DeconstructedBidDoc | null>(null);

  // Bottom Sheet Filter State
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [filterMseOnly, setFilterMseOnly] = useState<boolean>(false);
  const [filterMinValLakhs, setFilterMinValLakhs] = useState<number>(0);

  // Status Tab Counts
  const counts = useMemo(() => {
    let ongoing = 0;
    let liveRa = 0;
    let closed = 0;

    bids.forEach((bid) => {
      const status = bid.lifecycleStatus || GeMLiveSyncService.computeLifecycleStatus(bid);
      const isRa = bid.isRa || bid.type === 'RA' || status === 'BID_TO_RA';
      if (isRa) {
        liveRa++;
      } else if (status === 'CLOSED' || status === 'AWARDED' || status === 'CANCELLED') {
        closed++;
      } else {
        ongoing++;
      }
    });

    return { Ongoing: ongoing, 'Live RA': liveRa, Closed: closed };
  }, [bids]);

  // Filtered Bids Query
  const filteredBids = useMemo(() => {
    return bids.filter((bid) => {
      const status = bid.lifecycleStatus || GeMLiveSyncService.computeLifecycleStatus(bid);
      const isRa = bid.isRa || bid.type === 'RA' || status === 'BID_TO_RA';

      // 1. Status Tab filter
      if (activeStatusTab === 'Live RA') {
        if (!isRa) return false;
      } else if (activeStatusTab === 'Closed') {
        if (status !== 'CLOSED' && status !== 'AWARDED' && status !== 'CANCELLED') return false;
      } else {
        // Ongoing
        if (isRa || status === 'CLOSED' || status === 'AWARDED' || status === 'CANCELLED') return false;
      }

      // 2. Type Chip filter
      if (activeTypeChip === 'Goods' && bid.type === 'SERVICE') return false;
      if (activeTypeChip === 'Services' && bid.type !== 'SERVICE') return false;

      // 3. MSE filter
      if (filterMseOnly && !bid.isEmdExemptForMse) return false;

      // 4. Min Value filter
      if (filterMinValLakhs > 0) {
        const val = bid.estimatedBidValueInr || 0;
        if (val < filterMinValLakhs * 100000) return false;
      }

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesBid = bid.bidNumber.toLowerCase().includes(q);
        const matchesTitle = bid.title.toLowerCase().includes(q);
        const matchesDept = bid.department.toLowerCase().includes(q);
        if (!matchesBid && !matchesTitle && !matchesDept) return false;
      }

      return true;
    });
  }, [bids, activeStatusTab, activeTypeChip, filterMseOnly, filterMinValLakhs, searchQuery]);

  const toggleSaveBid = (bidNumber: string) => {
    setSavedBidNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(bidNumber)) next.delete(bidNumber);
      else next.add(bidNumber);
      return next;
    });
  };

  const handleOpenDoc = useCallback((bidNumber: string, docUrl?: string) => {
    const verifiedUrl = PortalDocService.getOfficialDocUrl(bidNumber, docUrl);
    Linking.openURL(verifiedUrl).catch(() => {
      Alert.alert('Bid Document', `Download URL: ${verifiedUrl}`);
    });
  }, []);

  const handleInspect = (bid: DeconstructedBidDoc) => {
    if (onInspectBid) {
      onInspectBid(bid);
    } else {
      setInspectingBid(bid);
    }
  };

  // Render individual bid card
  const renderBidCard = ({ item }: { item: DeconstructedBidDoc }) => {
    const isSaved = savedBidNumbers.has(item.bidNumber);
    const isService = item.type === 'SERVICE';
    const isRa = item.isRa || item.type === 'RA' || item.lifecycleStatus === 'BID_TO_RA';
    const match = UserAgentService.evaluateBidMatch(item, userProfile);
    const estVal = item.estimatedBidValueInr || 2500000;
    const boqCount = item.boqItems?.length || 1;

    return (
      <View
        style={[
          styles.bidCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Card Header: Type Tag, Bid Number, Bookmark */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderLeft}>
            <StatusBadge
              label={isRa ? 'RA' : isService ? 'SERVICES' : 'GOODS'}
              tone={isRa ? 'warning' : isService ? 'violet' : 'neutral'}
            />
            <Text style={[styles.bidNumberText, { color: colors.textSecondary }]}>
              {item.bidNumber}
            </Text>
          </View>
          <Pressable
            onPress={() => toggleSaveBid(item.bidNumber)}
            hitSlop={8}
            style={styles.bookmarkBtn}
            accessibilityLabel="Bookmark bid"
          >
            <Text style={[styles.bookmarkIcon, { color: isSaved ? colors.primary : colors.textMuted }]}>
              {isSaved ? '★' : '☆'}
            </Text>
          </Pressable>
        </View>

        {/* Bid Title */}
        <Text
          style={[styles.bidTitle, { color: colors.textPrimary, fontSize: 15 * fontMultiplier }]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        {/* Buyer Department */}
        <Text style={[styles.deptText, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.department} • {item.ministry}
        </Text>

        {/* 2x2 Glanceable Metrics Grid */}
        <View style={[styles.metaGrid, { backgroundColor: colors.surfaceSubtle }]}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>EST. VALUE</Text>
            <Text style={[styles.metricValue, { color: colors.primary }]}>{formatLakhs(estVal)}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>QUANTITY / SCOPE</Text>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
              {boqCount} {boqCount === 1 ? 'Package' : 'Line Items'}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>CLOSING (IST)</Text>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {formatDateSafe(item.closingTimeUtc)}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>MSE / EMD</Text>
            <Text
              style={[
                styles.metricValue,
                { color: item.isEmdExemptForMse ? colors.success : colors.warning },
              ]}
            >
              {item.isEmdExemptForMse ? '100% Exempt' : 'EMD Applicable'}
            </Text>
          </View>
        </View>

        {/* Actions: View Bid Details + PDF download */}
        <View style={styles.cardActionsRow}>
          <SecondaryButton
            label="PDF Doc ↗"
            onPress={() => handleOpenDoc(item.bidNumber, item.docUrl)}
            style={{ flex: 1, marginRight: 8 }}
          />
          <PrimaryButton
            label="View Bid Details"
            onPress={() => handleInspect(item)}
            style={{ flex: 1.5 }}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 1. Status Tabs: Ongoing (100) | Live RA (12) | Closed */}
      <View style={styles.topSection}>
        <SegmentedTabs
          options={['Ongoing', 'Live RA', 'Closed']}
          selected={activeStatusTab}
          onSelect={(tab) => setActiveStatusTab(tab as GeMStatusTab)}
          counts={counts}
          style={{ marginBottom: 12 }}
        />

        {/* 2. Search Field */}
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by bid number, item or department"
          style={{ marginBottom: 10 }}
        />

        {/* 3. Filter Chips: All | Goods | Services | Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipRow}
        >
          <CompactChip
            label="Filters"
            icon="⚙️"
            selected={showFilterModal || filterMseOnly || filterMinValLakhs > 0}
            onPress={() => setShowFilterModal(true)}
          />
          <CompactChip
            label="All"
            selected={activeTypeChip === 'All'}
            onPress={() => setActiveTypeChip('All')}
          />
          <CompactChip
            label="Goods"
            selected={activeTypeChip === 'Goods'}
            onPress={() => setActiveTypeChip('Goods')}
          />
          <CompactChip
            label="Services"
            selected={activeTypeChip === 'Services'}
            onPress={() => setActiveTypeChip('Services')}
          />
        </ScrollView>
      </View>

      {/* 4. Bid List */}
      <FlatList
        data={filteredBids}
        keyExtractor={(item) => item.bidNumber}
        renderItem={renderBidCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onSyncLive ? (
            <RefreshControl
              refreshing={isSyncing}
              onRefresh={onSyncLive}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          ) : undefined
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No opportunities found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Try adjusting your search criteria or switching to a different status tab.
            </Text>
            <SecondaryButton
              label="Reset Filters"
              onPress={() => {
                setSearchQuery('');
                setActiveTypeChip('All');
                setFilterMseOnly(false);
                setFilterMinValLakhs(0);
              }}
              style={{ marginTop: 14 }}
            />
          </View>
        }
      />

      {/* Filter Bottom Sheet */}
      <FilterBottomSheetModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Refine Opportunities"
        onReset={() => {
          setActiveTypeChip('All');
          setFilterMseOnly(false);
          setFilterMinValLakhs(0);
        }}
        onApply={() => {}}
      >
        <Text style={[styles.sheetSectionTitle, { color: colors.textPrimary }]}>Procurement Vehicle</Text>
        <View style={styles.sheetPillWrap}>
          {(['All', 'Goods', 'Services'] as const).map((t) => (
            <CompactChip
              key={t}
              label={t}
              selected={activeTypeChip === t}
              onPress={() => setActiveTypeChip(t)}
              style={{ marginBottom: 8 }}
            />
          ))}
        </View>

        <Text style={[styles.sheetSectionTitle, { color: colors.textPrimary, marginTop: 14 }]}>
          MSME Privilege
        </Text>
        <CompactChip
          label="100% EMD Exemption Only"
          selected={filterMseOnly}
          onPress={() => setFilterMseOnly((p) => !p)}
        />

        <Text style={[styles.sheetSectionTitle, { color: colors.textPrimary, marginTop: 14 }]}>
          Minimum Estimated Value
        </Text>
        <View style={styles.sheetPillWrap}>
          {[0, 10, 25, 50, 100].map((v) => (
            <CompactChip
              key={v}
              label={v === 0 ? 'Any Value' : `₹${v}L+`}
              selected={filterMinValLakhs === v}
              onPress={() => setFilterMinValLakhs(v)}
              style={{ marginBottom: 8 }}
            />
          ))}
        </View>
      </FilterBottomSheetModal>

      {/* Bid Detail Inspection Modal */}
      {inspectingBid && (
        <BidInspectorScreen
          bid={inspectingBid}
          userProfile={userProfile}
          visible={true}
          onClose={() => setInspectingBid(null)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSection: {
    padding: DESIGN_TOKENS.pagePaddingMobile,
    paddingBottom: 8,
  },
  filterChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContent: {
    padding: DESIGN_TOKENS.pagePaddingMobile,
    paddingTop: 4,
    paddingBottom: 40,
  },
  bidCard: {
    borderRadius: DESIGN_TOKENS.cardRadius,
    borderWidth: DESIGN_TOKENS.borderWidth,
    padding: 14,
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bidNumberText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  bookmarkBtn: {
    padding: 4,
  },
  bookmarkIcon: {
    fontSize: 18,
  },
  bidTitle: {
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 20,
  },
  deptText: {
    fontSize: 12,
    marginBottom: 10,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
  },
  metricItem: {
    width: '50%',
    padding: 4,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
  },
  sheetSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  sheetPillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
