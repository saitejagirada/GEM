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

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import type { DeconstructedBidDoc } from '../types/index';
import { GeMLiveSyncService } from '../services/GeMLiveSyncService';
import { BidInspectorScreen } from './BidInspectorScreen';
import { BidDocumentViewer } from './BidDocumentViewer';
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import {
  SearchField,
  SegmentedTabs,
  CompactChip,
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
  FilterBottomSheetModal,
} from '../components/SharedUI';
import { formatLakhs, formatDateSafe } from '../utils/formatters';

export type GeMStatusTab = 'Ongoing' | 'Live RA';

interface BidsHubScreenProps {
  bids: DeconstructedBidDoc[];
  initialFilter?: string;
  onSyncLive?: () => Promise<void> | void;
  isSyncing?: boolean;
  onInspectBid?: (bid: DeconstructedBidDoc) => void;
}

export const BidsHubScreen: React.FC<BidsHubScreenProps> = ({
  bids,
  onSyncLive,
  isSyncing = false,
  onInspectBid,
}) => {
  const { colors, fontMultiplier } = useTheme();

  const [activeStatusTab, setActiveStatusTab] = useState<GeMStatusTab>('Ongoing');
  const [activeTypeChip, setActiveTypeChip] = useState<'All' | 'Goods' | 'Services'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectingBid, setInspectingBid] = useState<DeconstructedBidDoc | null>(null);
  const [documentBid, setDocumentBid] = useState<DeconstructedBidDoc | null>(null);

  // Bottom Sheet Filter State
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [filterMseOnly, setFilterMseOnly] = useState<boolean>(false);
  const [filterMinValLakhs, setFilterMinValLakhs] = useState<number>(0);

  // Hardware BackHandler to close inspector modal or filter sheet
  useEffect(() => {
    const handleBack = () => {
      if (documentBid) {
        setDocumentBid(null);
        return true;
      }
      if (inspectingBid) {
        setInspectingBid(null);
        return true;
      }
      if (showFilterModal) {
        setShowFilterModal(false);
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => sub.remove();
  }, [documentBid, inspectingBid, showFilterModal]);

  // Status Tab Counts
  const counts = useMemo(() => {
    let ongoing = 0;
    let liveRa = 0;

    bids.forEach((bid) => {
      const status = bid.lifecycleStatus || GeMLiveSyncService.computeLifecycleStatus(bid);
      const isRa = bid.isRa || bid.type === 'RA' || status === 'BID_TO_RA';
      if (isRa) {
        liveRa++;
      } else {
        ongoing++;
      }
    });

    return { Ongoing: ongoing, 'Live RA': liveRa };
  }, [bids]);

  // Filtered Bids Query
  const filteredBids = useMemo(() => {
    return bids.filter((bid) => {
      const status = bid.lifecycleStatus || GeMLiveSyncService.computeLifecycleStatus(bid);
      const isRa = bid.isRa || bid.type === 'RA' || status === 'BID_TO_RA';

      // 1. Status Tab filter
      if (activeStatusTab === 'Live RA') {
        if (!isRa) return false;
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

  const handleOpenDoc = useCallback((bid: DeconstructedBidDoc) => {
    setDocumentBid(bid);
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
    const isService = item.type === 'SERVICE';
    const isRa = item.isRa || item.type === 'RA' || item.lifecycleStatus === 'BID_TO_RA';
    const estVal = item.estimatedBidValueInr;
    const boqCount = item.boqItems?.length || 0;

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
            <Text style={[styles.metricValue, { color: colors.primary }]}>
              {item.publishedFields?.estimatedValue === false ? 'Not published' : formatLakhs(estVal)}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>QUANTITY / SCOPE</Text>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
              {boqCount > 0 ? `${boqCount} ${boqCount === 1 ? 'Package' : 'Line Items'}` : 'Not published'}
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
              {item.isEmdExemptForMse === undefined ? 'Not published' : item.isEmdExemptForMse ? 'MSE exempt' : 'Applicable'}
            </Text>
          </View>
        </View>

        {/* Actions: View Bid Details + PDF download */}
        <View style={styles.cardActionsRow}>
          <SecondaryButton
            label="View PDF"
            onPress={() => handleOpenDoc(item)}
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
      <View style={[styles.liveNotice, { backgroundColor: colors.surfaceSubtle, borderBottomColor: colors.border }]}>
        <Text style={[styles.liveNoticeLabel, { color: colors.success }]}>LIVE PUBLIC FEED</Text>
        <Text style={[styles.liveNoticeText, { color: colors.textSecondary }]}>Current published GeM bids. Account-specific submissions are not included.</Text>
      </View>
      {/* 1. Status Tabs: current ongoing public bids and live RAs */}
      <View style={styles.topSection}>
        <SegmentedTabs
          options={['Ongoing', 'Live RA']}
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
            icon="≡"
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
          isSyncing ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary, marginTop: 16 }]}>
                Connecting to GeM Portal...
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Synchronizing live published tenders and opportunities.
              </Text>
            </View>
          ) : bids.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>!</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Tenders Available (Offline)</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Unable to load live tenders from GeM portal. Please check your internet connection and tap Retry.
              </Text>
              {onSyncLive && (
                <PrimaryButton
                  label="Retry Live Sync"
                  onPress={onSyncLive}
                  style={{ marginTop: 14 }}
                />
              )}
            </View>
          ) : (
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
          )
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
          visible={true}
          onClose={() => setInspectingBid(null)}
        />
      )}

      {documentBid && (
        <BidDocumentViewer
          bid={documentBid}
          visible={true}
          onClose={() => setDocumentBid(null)}
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
  liveNotice: {
    paddingHorizontal: DESIGN_TOKENS.pagePaddingMobile,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  liveNoticeLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  liveNoticeText: { fontSize: 10.5, lineHeight: 14, marginTop: 2 },
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
