/**
 * GeM Bids & Tenders Hub Screen — Direct Live Public GeM UI Layer
 *
 * Passes live search, status tabs (Ongoing, Live RA, Closed), vehicle filters
 * (All, Goods, Services, BOQ, Custom, High Value >= ₹2Cr), and pagination
 * directly from the user's phone to https://bidplus.gem.gov.in/all-bids-data.
 * Zero backend server, zero bundled snapshots, zero invented commercial fields.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
import {
  GeMLiveSyncService,
  type GeMPortalByType,
  type GeMPortalLiveStats,
  type GeMPortalSort,
  type GeMPortalStatusType,
} from '../services/GeMLiveSyncService';
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

export type GeMStatusTab = 'Ongoing' | 'Live RA' | 'Closed';
type TypeChip = 'All' | 'Goods' | 'Services' | 'BOQ' | 'Custom';

interface BidsHubScreenProps {
  bids: DeconstructedBidDoc[];
  initialFilter?: string;
  onSyncLive?: () => Promise<void> | void;
  isSyncing?: boolean;
  onInspectBid?: (bid: DeconstructedBidDoc) => void;
}

function mapTypeChipToPortalParam(tab: GeMStatusTab, chip: TypeChip): GeMPortalByType {
  if (tab === 'Live RA') return 'bidToRA';
  switch (chip) {
    case 'Goods':
      return 'product';
    case 'Services':
      return 'service';
    case 'BOQ':
      return 'boq';
    case 'Custom':
      return 'custom';
    default:
      return 'all';
  }
}

export const BidsHubScreen: React.FC<BidsHubScreenProps> = ({
  bids,
  onSyncLive,
  isSyncing = false,
  onInspectBid,
}) => {
  const { colors, fontMultiplier } = useTheme();

  const [activeStatusTab, setActiveStatusTab] = useState<GeMStatusTab>('Ongoing');
  const [activeTypeChip, setActiveTypeChip] = useState<TypeChip>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [highValueOnly, setHighValueOnly] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<GeMPortalSort>('Bid-End-Date-Oldest');
  const [inspectingBid, setInspectingBid] = useState<DeconstructedBidDoc | null>(null);
  const [documentBid, setDocumentBid] = useState<DeconstructedBidDoc | null>(null);

  // Live direct query state (for search, tab switches, filters, and pagination)
  const [liveStats, setLiveStats] = useState<GeMPortalLiveStats>(GeMLiveSyncService.getLiveStats());
  const [queryBids, setQueryBids] = useState<DeconstructedBidDoc[] | null>(null);
  const [queryTotal, setQueryTotal] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const requestIdRef = useRef<number>(0);

  // Bottom Sheet Filter State
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);

  // Subscribe to global GeMLiveSyncService stats
  useEffect(() => {
    const unsub = GeMLiveSyncService.subscribe((_, stats) => {
      setLiveStats(stats);
    });
    return () => unsub();
  }, []);

  // Debounce search input so typing delegates smoothly to bidplus.gem.gov.in
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isDefaultOngoingView =
    activeStatusTab === 'Ongoing' &&
    activeTypeChip === 'All' &&
    !debouncedQuery &&
    !highValueOnly &&
    sortOrder === 'Bid-End-Date-Oldest';

  // Execute a direct Phone -> bidplus.gem.gov.in query whenever tabs, filters, or search change
  const runPortalQuery = useCallback(
    async (page: number, append: boolean) => {
      const reqId = ++requestIdRef.current;
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsQuerying(true);
      }
      setQueryError(null);

      const bidStatusType: GeMPortalStatusType =
        activeStatusTab === 'Closed' ? 'bidrastatus' : 'ongoing_bids';
      const byType = mapTypeChipToPortalParam(activeStatusTab, activeTypeChip);
      const effectiveSort: GeMPortalSort =
        activeStatusTab === 'Closed' && sortOrder === 'Bid-End-Date-Oldest'
          ? 'Bid-End-Date-Latest'
          : sortOrder;
      const isExactBidNum = /^GEM\/\d{4}\/[BR]\/\d+/i.test(debouncedQuery);

      try {
        const res = await GeMLiveSyncService.queryLivePortal({
          page,
          searchBid: debouncedQuery,
          searchType: isExactBidNum ? 'exact' : 'fullText',
          bidStatusType,
          byType,
          highBidValue: highValueOnly ? 'highValue' : '',
          sort: effectiveSort,
        });

        if (reqId !== requestIdRef.current) return;

        if (res.error && res.bids.length === 0) {
          setQueryError(res.error);
          if (!append) setQueryBids([]);
          setHasMore(false);
          return;
        }

        // Apply secondary local filter when inside Live RA + Goods/Services sub-chip
        let results = res.bids;
        if (activeStatusTab === 'Live RA' && activeTypeChip === 'Services') {
          results = results.filter((b) => b.type === 'SERVICE');
        } else if (activeStatusTab === 'Live RA' && activeTypeChip === 'Goods') {
          results = results.filter((b) => b.type !== 'SERVICE');
        }

        setQueryTotal(res.total);
        setCurrentPage(page);
        setHasMore(res.hasMore);
        setQueryBids((prev) => {
          if (!append || !prev) return results;
          const seen = new Set(prev.map((b) => b.bidNumber));
          return [...prev, ...results.filter((b) => !seen.has(b.bidNumber))];
        });
      } finally {
        if (reqId === requestIdRef.current) {
          setIsQuerying(false);
          setIsLoadingMore(false);
        }
      }
    },
    [activeStatusTab, activeTypeChip, debouncedQuery, highValueOnly, sortOrder]
  );

  useEffect(() => {
    if (isDefaultOngoingView) {
      requestIdRef.current += 1;
      setQueryBids(null);
      setQueryError(null);
      setCurrentPage(3); // Initial App sync fetches pages 1-3
      setHasMore(liveStats.totalPortalOngoingBids > bids.length);
      return;
    }
    runPortalQuery(1, false);
  }, [isDefaultOngoingView, runPortalQuery, bids.length, liveStats.totalPortalOngoingBids]);

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

  const displayedBids = useMemo(() => {
    if (queryBids !== null) return queryBids;
    return bids.filter((bid) => {
      const status = bid.lifecycleStatus || GeMLiveSyncService.computeLifecycleStatus(bid);
      return status === 'ONGOING' || status === 'BID_TO_RA';
    });
  }, [queryBids, bids]);

  const handleRefresh = useCallback(async () => {
    if (isDefaultOngoingView) {
      await onSyncLive?.();
    } else {
      await runPortalQuery(1, false);
    }
  }, [isDefaultOngoingView, onSyncLive, runPortalQuery]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || isQuerying || !hasMore) return;
    if (isDefaultOngoingView && queryBids === null) {
      // Seed queryBids with current synced list, then append page 4 directly from GeM
      setQueryBids(displayedBids);
      await runPortalQuery(4, true);
    } else {
      await runPortalQuery(currentPage + 1, true);
    }
  }, [isLoadingMore, isQuerying, hasMore, isDefaultOngoingView, queryBids, displayedBids, currentPage, runPortalQuery]);

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

  const resetAllFilters = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setActiveTypeChip('All');
    setHighValueOnly(false);
    setSortOrder('Bid-End-Date-Oldest');
  };

  const activeTotalCount = queryBids !== null ? queryTotal : liveStats.totalPortalOngoingBids;
  const activeFilterCount =
    (activeTypeChip !== 'All' ? 1 : 0) +
    (highValueOnly ? 1 : 0) +
    (sortOrder !== 'Bid-End-Date-Oldest' ? 1 : 0);

  // Render individual bid card
  const renderBidCard = ({ item }: { item: DeconstructedBidDoc }) => {
    const isService = item.type === 'SERVICE';
    const isRa = item.isRa || item.type === 'RA' || item.lifecycleStatus === 'BID_TO_RA';
    const estVal = item.estimatedBidValueInr;
    const publishedQty = item.boqItems?.[0]?.quantity;

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
        {/* Card Header: Type Tag, High Value Tag, Bid Number */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderLeft}>
            <StatusBadge
              label={isRa ? 'RA' : isService ? 'SERVICES' : item.type === 'BOQ' ? 'BOQ' : item.type === 'CUSTOM' ? 'CUSTOM' : 'GOODS'}
              tone={isRa ? 'warning' : isService ? 'violet' : 'neutral'}
            />
            <Text style={[styles.bidNumberText, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.bidNumber}
            </Text>
          </View>
          {item.isHighValue ? (
            <StatusBadge label="≥ ₹2 Cr" tone="success" />
          ) : null}
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
          {[item.department, item.ministry !== item.department ? item.ministry : '']
            .filter(Boolean)
            .join(' • ') || 'Department not published'}
        </Text>

        {/* 2x2 Glanceable Metrics Grid — strictly published portal values */}
        <View style={[styles.metaGrid, { backgroundColor: colors.surfaceSubtle }]}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>EST. VALUE</Text>
            <Text style={[styles.metricValue, { color: estVal ? colors.primary : colors.textMuted }]}>
              {estVal === undefined || item.publishedFields?.estimatedValue === false
                ? item.isHighValue
                  ? 'High Value (≥ ₹2 Cr)'
                  : 'In PDF'
                : formatLakhs(estVal)}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>QUANTITY</Text>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
              {publishedQty !== undefined ? `${publishedQty.toLocaleString('en-IN')} Units` : 'In PDF'}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>CLOSING (IST)</Text>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {formatDateSafe(item.closingTimeUtc)}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>TERMS / EMD</Text>
            <Text
              style={[
                styles.metricValue,
                {
                  color:
                    item.isEmdExemptForMse === undefined
                      ? colors.textMuted
                      : item.isEmdExemptForMse
                      ? colors.success
                      : colors.warning,
                },
              ]}
            >
              {item.isEmdExemptForMse === undefined
                ? 'Scan PDF on device'
                : item.isEmdExemptForMse
                ? 'MSE exempt'
                : 'Applicable'}
            </Text>
          </View>
        </View>

        {/* Actions: View PDF + Inspect Details */}
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

  const busy = isSyncing || isQuerying;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.liveNotice, { backgroundColor: colors.surfaceSubtle, borderBottomColor: colors.border }]}>
        <Text style={[styles.liveNoticeLabel, { color: colors.success }]}>
          DIRECT GeM PORTAL FEED · bidplus.gem.gov.in
        </Text>
        <Text style={[styles.liveNoticeText, { color: colors.textSecondary }]}>
          {activeTotalCount > 0
            ? `${activeTotalCount.toLocaleString('en-IN')} live public ${
                activeStatusTab === 'Closed' ? 'concluded records' : activeStatusTab === 'Live RA' ? 'reverse auctions' : 'tenders'
              } directly from GeM`
            : 'Direct phone-to-GeM public feed. No backend proxy or mock records.'}
        </Text>
      </View>

      {/* 1. Status Tabs */}
      <View style={styles.topSection}>
        <SegmentedTabs
          options={['Ongoing', 'Live RA', 'Closed']}
          selected={activeStatusTab}
          onSelect={(tab) => setActiveStatusTab(tab as GeMStatusTab)}
          style={{ marginBottom: 12 }}
        />

        {/* 2. Direct Live Search Field (queries bidplus.gem.gov.in directly) */}
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Live search GeM (e.g. Laptop, Solar, GEM/2026/...)"
          style={{ marginBottom: 10 }}
        />

        {/* 3. Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipRow}
        >
          <CompactChip
            label={activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
            icon="≡"
            selected={showFilterModal || activeFilterCount > 0}
            onPress={() => setShowFilterModal(true)}
          />
          {(['All', 'Goods', 'Services', 'BOQ', 'Custom'] as const).map((chip) => (
            <CompactChip
              key={chip}
              label={chip}
              selected={activeTypeChip === chip}
              onPress={() => setActiveTypeChip(chip)}
            />
          ))}
          <CompactChip
            label="₹2 Cr+"
            selected={highValueOnly}
            onPress={() => setHighValueOnly((prev) => !prev)}
          />
        </ScrollView>
      </View>

      {/* 4. Bid List */}
      <FlatList
        data={displayedBids}
        keyExtractor={(item) => `${item.bidNumber}-${item.b_id || ''}`}
        renderItem={renderBidCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={busy}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListFooterComponent={
          displayedBids.length > 0 && hasMore ? (
            <View style={styles.loadMoreWrap}>
              <SecondaryButton
                label={isLoadingMore ? 'Loading more from GeM...' : 'Load More from GeM'}
                onPress={handleLoadMore}
                disabled={isLoadingMore}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          busy ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary, marginTop: 16 }]}>
                Querying bidplus.gem.gov.in...
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Fetching live public tenders directly from the official GeM portal.
              </Text>
            </View>
          ) : queryError || (isDefaultOngoingView && bids.length === 0) ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>!</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Unable to Reach GeM Portal</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {queryError || 'Check your internet connection and tap Retry to fetch live tenders directly from GeM.'}
              </Text>
              <PrimaryButton
                label="Retry Live Sync"
                onPress={handleRefresh}
                style={{ marginTop: 14 }}
              />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No matching tenders on GeM</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Try a different keyword or reset your filters.
              </Text>
              <SecondaryButton
                label="Reset Filters"
                onPress={resetAllFilters}
                style={{ marginTop: 14 }}
              />
            </View>
          )
        }
      />

      {/* Filter Bottom Sheet — maps directly to real GeM portal parameters */}
      <FilterBottomSheetModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Live GeM Portal Filters"
        onReset={resetAllFilters}
        onApply={() => setShowFilterModal(false)}
      >
        <Text style={[styles.sheetSectionTitle, { color: colors.textPrimary }]}>Procurement Vehicle</Text>
        <View style={styles.sheetPillWrap}>
          {(['All', 'Goods', 'Services', 'BOQ', 'Custom'] as const).map((t) => (
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
          Bid Value Filter (Official GeM Flag)
        </Text>
        <CompactChip
          label="High Value Bids Only (≥ ₹2 Crore)"
          selected={highValueOnly}
          onPress={() => setHighValueOnly((p) => !p)}
        />

        <Text style={[styles.sheetSectionTitle, { color: colors.textPrimary, marginTop: 14 }]}>
          Sort Order on GeM
        </Text>
        <View style={styles.sheetPillWrap}>
          {(
            [
              { label: 'Ending Soonest', value: 'Bid-End-Date-Oldest' },
              { label: 'Ending Latest', value: 'Bid-End-Date-Latest' },
              { label: 'Newest Published', value: 'Bid-Start-Date-Latest' },
            ] as const
          ).map((opt) => (
            <CompactChip
              key={opt.value}
              label={opt.label}
              selected={sortOrder === opt.value}
              onPress={() => setSortOrder(opt.value)}
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

      <BidDocumentViewer
        bid={documentBid}
        visible={Boolean(documentBid)}
        onClose={() => setDocumentBid(null)}
      />
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
  liveNoticeLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  liveNoticeText: {
    fontSize: 10.5,
    lineHeight: 14,
    marginTop: 2,
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
    flex: 1,
    marginRight: 8,
  },
  bidNumberText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
    flexShrink: 1,
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
  loadMoreWrap: {
    marginTop: 6,
    marginBottom: 16,
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
