/**
 * GeM Bids & Tenders Hub Screen — Direct Live Public GeM UI Layer
 *
 * Streams all 40,000+ live tenders, 1,500+ Reverse Auctions, concluded bids, and
 * cancelled records directly from https://bidplus.gem.gov.in/all-bids-data using
 * parallel 3-page batching (30 tenders per scroll) and true infinite scroll.
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
  Pressable,
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

export type GeMStatusTab = 'Ongoing' | 'Live RA' | 'Closed' | 'Cancelled';
type TypeChip = 'All' | 'Goods' | 'Services' | 'BOQ' | 'Custom';

const BATCH_PAGES = 3; // 30 tenders per parallel GeM batch

interface BidsHubScreenProps {
  bids: DeconstructedBidDoc[];
  initialFilter?: string;
  initialSearch?: string;
  onSyncLive?: () => Promise<void> | void;
  isSyncing?: boolean;
  onInspectBid?: (bid: DeconstructedBidDoc) => void;
  onPrepareDocuments?: (bid: DeconstructedBidDoc) => void;
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

function mapStatusTabToPortalParam(tab: GeMStatusTab): GeMPortalStatusType {
  if (tab === 'Closed') return 'bidrastatus';
  if (tab === 'Cancelled') return 'cancelled_bids';
  return 'ongoing_bids';
}

export const BidsHubScreen: React.FC<BidsHubScreenProps> = ({
  bids,
  initialSearch,
  onSyncLive,
  isSyncing = false,
  onInspectBid,
  onPrepareDocuments,
}) => {
  const { colors, fontMultiplier } = useTheme();

  const [activeStatusTab, setActiveStatusTab] = useState<GeMStatusTab>('Ongoing');
  const [activeTypeChip, setActiveTypeChip] = useState<TypeChip>('All');
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch || '');
  const [debouncedQuery, setDebouncedQuery] = useState<string>((initialSearch || '').trim());

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearchQuery(initialSearch);
      setDebouncedQuery(initialSearch.trim());
    }
  }, [initialSearch]);

  const [highValueOnly, setHighValueOnly] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<GeMPortalSort>('Bid-Start-Date-Latest');
  const [inspectingBid, setInspectingBid] = useState<DeconstructedBidDoc | null>(null);
  const [documentBid, setDocumentBid] = useState<DeconstructedBidDoc | null>(null);

  // Live direct query state (supports seamless 30-item infinite scroll across 40,000+ tenders)
  const [liveStats, setLiveStats] = useState<GeMPortalLiveStats>(GeMLiveSyncService.getLiveStats());
  const [queryBids, setQueryBids] = useState<DeconstructedBidDoc[] | null>(null);
  const [queryTotal, setQueryTotal] = useState<number>(0);
  const [lastPageFetched, setLastPageFetched] = useState<number>(3);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const requestIdRef = useRef<number>(0);
  const isLoadingMoreRef = useRef<boolean>(false);

  // Bottom Sheet Filter State
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);

  // Subscribe to global GeMLiveSyncService stats (does NOT reset paginated list)
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
    }, 380);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isDefaultOngoingView =
    activeStatusTab === 'Ongoing' &&
    activeTypeChip === 'All' &&
    !debouncedQuery &&
    !highValueOnly &&
    sortOrder === 'Bid-Start-Date-Latest';

  const filterKey = `${activeStatusTab}|${activeTypeChip}|${debouncedQuery}|${highValueOnly ? 'hv' : 'all'}|${sortOrder}`;

  const runPortalBatch = useCallback(
    async (startPage: number, append: boolean, seedExisting?: DeconstructedBidDoc[]) => {
      const reqId = ++requestIdRef.current;
      if (append) {
        isLoadingMoreRef.current = true;
        setIsLoadingMore(true);
        setLoadMoreError(null);
      } else {
        setIsQuerying(true);
        setQueryError(null);
        setLoadMoreError(null);
      }

      const bidStatusType = mapStatusTabToPortalParam(activeStatusTab);
      const byType = mapTypeChipToPortalParam(activeStatusTab, activeTypeChip);
      const effectiveSort: GeMPortalSort =
        activeStatusTab === 'Closed' && sortOrder === 'Bid-Start-Date-Latest'
          ? 'Bid-End-Date-Latest'
          : sortOrder;
      const isExactBidNum = /^GEM\/\d{4}\/[BR]\/\d+/i.test(debouncedQuery);

      try {
        const res = await GeMLiveSyncService.queryLivePortalBatch(
          {
            page: startPage,
            searchBid: debouncedQuery,
            searchType: isExactBidNum ? 'exact' : 'fullText',
            bidStatusType,
            byType,
            highBidValue: highValueOnly ? 'highValue' : '',
            sort: effectiveSort,
          },
          isExactBidNum ? 1 : BATCH_PAGES
        );

        if (reqId !== requestIdRef.current) return;

        if (res.error && res.bids.length === 0) {
          if (append) {
            setLoadMoreError('GeM took too long to load the next batch. Tap to retry.');
          } else {
            setQueryError(res.error);
            setQueryBids([]);
            setHasMore(false);
          }
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
        setLastPageFetched(res.lastPageFetched);
        setHasMore(res.hasMore);
        setQueryBids((prev) => {
          const baseList = append ? (prev ?? seedExisting ?? []) : [];
          if (!append) return results;
          const seen = new Set(baseList.map((b) => b.bidNumber));
          return [...baseList, ...results.filter((b) => !seen.has(b.bidNumber))];
        });
      } finally {
        if (reqId === requestIdRef.current) {
          setIsQuerying(false);
          setIsLoadingMore(false);
          isLoadingMoreRef.current = false;
        }
      }
    },
    [activeStatusTab, activeTypeChip, debouncedQuery, highValueOnly, sortOrder]
  );

  // ONLY reset when the user explicitly changes tab, search, type chip, high-value flag, or sort!
  // Never reset when global liveStats / bids.length ticks in the background.
  useEffect(() => {
    if (isDefaultOngoingView) {
      requestIdRef.current += 1;
      isLoadingMoreRef.current = false;
      setQueryBids(null);
      setQueryError(null);
      setLoadMoreError(null);
      setLastPageFetched(3); // Initial App sync fetches pages 1-3 (30 latest tenders)
      setHasMore(true);
      return;
    }
    runPortalBatch(1, false);
  }, [filterKey, isDefaultOngoingView, runPortalBatch]);

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

  const activeTotalCount = queryBids !== null ? queryTotal : liveStats.totalPortalOngoingBids;
  const effectiveHasMore =
    hasMore && (activeTotalCount === 0 || displayedBids.length < activeTotalCount);

  const handleRefresh = useCallback(async () => {
    if (isDefaultOngoingView && queryBids === null) {
      await onSyncLive?.();
    } else {
      await runPortalBatch(1, false);
    }
  }, [isDefaultOngoingView, queryBids, onSyncLive, runPortalBatch]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMoreRef.current || isLoadingMore || isQuerying || !effectiveHasMore) return;
    if (isDefaultOngoingView && queryBids === null) {
      const seed = displayedBids;
      setQueryBids(seed);
      setQueryTotal(liveStats.totalPortalOngoingBids || seed.length);
      await runPortalBatch(4, true, seed);
    } else {
      await runPortalBatch(lastPageFetched + 1, true);
    }
  }, [
    isLoadingMore,
    isQuerying,
    effectiveHasMore,
    isDefaultOngoingView,
    queryBids,
    displayedBids,
    liveStats.totalPortalOngoingBids,
    lastPageFetched,
    runPortalBatch,
  ]);

  const handleOpenDoc = useCallback((bid: DeconstructedBidDoc) => {
    setDocumentBid(bid);
  }, []);

  const handleInspect = useCallback(
    (bid: DeconstructedBidDoc) => {
      if (onInspectBid) {
        onInspectBid(bid);
      } else {
        setInspectingBid(bid);
      }
    },
    [onInspectBid]
  );

  const resetAllFilters = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setActiveTypeChip('All');
    setHighValueOnly(false);
    setSortOrder('Bid-Start-Date-Latest');
  };

  const activeFilterCount =
    (activeTypeChip !== 'All' ? 1 : 0) +
    (highValueOnly ? 1 : 0) +
    (sortOrder !== 'Bid-Start-Date-Latest' ? 1 : 0);

  const sortLabel =
    sortOrder === 'Bid-Start-Date-Latest'
      ? 'Newest'
      : sortOrder === 'Bid-End-Date-Oldest'
        ? 'Ending Soon'
        : 'Longest Window';

  // Render individual bid card
  const renderBidCard = useCallback(
    ({ item }: { item: DeconstructedBidDoc }) => {
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
                label={
                  isRa
                    ? 'RA'
                    : isService
                      ? 'SERVICES'
                      : item.type === 'BOQ'
                        ? 'BOQ'
                        : item.type === 'CUSTOM'
                          ? 'CUSTOM'
                          : 'GOODS'
                }
                tone={isRa ? 'warning' : isService ? 'violet' : 'neutral'}
              />
              <Text style={[styles.bidNumberText, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.bidNumber}
              </Text>
            </View>
            {item.isHighValue ? <StatusBadge label="≥ ₹2 Cr" tone="success" /> : null}
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
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                {item.parentBidNumber ? 'ORIGINAL BID' : 'TERMS / EMD'}
              </Text>
              <Text
                style={[
                  styles.metricValue,
                  {
                    color: item.parentBidNumber
                      ? colors.primary
                      : item.isEmdExemptForMse === undefined
                        ? colors.textMuted
                        : item.isEmdExemptForMse
                          ? colors.success
                          : colors.warning,
                  },
                ]}
                numberOfLines={1}
              >
                {item.parentBidNumber
                  ? item.parentBidNumber
                  : item.isEmdExemptForMse === undefined
                    ? 'Tap to scan PDF'
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
    },
    [colors, fontMultiplier, handleOpenDoc, handleInspect]
  );

  const busy = (isSyncing && displayedBids.length === 0) || isQuerying;

  const tabNoun =
    activeStatusTab === 'Closed'
      ? 'concluded bids'
      : activeStatusTab === 'Cancelled'
        ? 'cancelled tenders'
        : activeStatusTab === 'Live RA'
          ? 'live reverse auctions'
          : 'live tenders';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Live Count & Scroll Progress Strip */}
      <View
        style={[
          styles.liveNotice,
          { backgroundColor: colors.surfaceSubtle, borderBottomColor: colors.borderSubtle },
        ]}
      >
        <View style={styles.liveNoticeTopRow}>
          <View style={styles.liveDotWrap}>
            <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.liveNoticeLabel, { color: colors.success }]}>
              LIVE GeM FEED · bidplus.gem.gov.in
            </Text>
          </View>
          <Pressable
            onPress={() => setShowFilterModal(true)}
            hitSlop={6}
            style={[styles.sortPillMini, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
          >
            <Text style={[styles.sortPillMiniText, { color: colors.primary }]}>Sort: {sortLabel} ▾</Text>
          </Pressable>
        </View>
        <Text style={[styles.liveNoticeText, { color: colors.textSecondary }]}>
          {activeTotalCount > 0
            ? `Showing ${displayedBids.length.toLocaleString('en-IN')} of ${activeTotalCount.toLocaleString('en-IN')} ${tabNoun}${effectiveHasMore ? ' · Scroll down to auto-load more' : ''}`
            : 'Direct phone-to-GeM public feed. No backend proxy or mock records.'}
        </Text>
      </View>

      {/* 1. Status Tabs (Ongoing, Live RA, Closed, Cancelled) */}
      <View style={styles.topSection}>
        <SegmentedTabs
          options={['Ongoing', 'Live RA', 'Closed', 'Cancelled']}
          selected={activeStatusTab}
          onSelect={(tab) => setActiveStatusTab(tab as GeMStatusTab)}
          style={{ marginBottom: 10 }}
        />

        {/* 2. Direct Live Search Field (queries all 43,000+ tenders directly on GeM) */}
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search all GeM tenders (e.g. Laptop, Solar, GEM/2026/...)"
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

      {/* 4. Infinite-Scroll Bid List */}
      <FlatList
        data={displayedBids}
        keyExtractor={(item) => `${item.bidNumber}-${item.b_id || ''}`}
        renderItem={renderBidCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={9}
        removeClippedSubviews={true}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.45}
        refreshControl={
          <RefreshControl
            refreshing={isQuerying || (isSyncing && displayedBids.length > 0)}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListFooterComponent={
          displayedBids.length > 0 ? (
            loadMoreError ? (
              <View style={styles.loadMoreWrap}>
                <Text style={[styles.footerStatusText, { color: colors.danger }]}>{loadMoreError}</Text>
                <SecondaryButton
                  label="Retry Next 30 Tenders"
                  onPress={handleLoadMore}
                  style={{ marginTop: 8 }}
                />
              </View>
            ) : isLoadingMore ? (
              <View style={styles.loadingMoreRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingMoreText, { color: colors.textSecondary }]}>
                  Loading next 30 {tabNoun} from GeM…
                </Text>
              </View>
            ) : effectiveHasMore ? (
              <View style={styles.loadMoreWrap}>
                <Text style={[styles.footerStatusText, { color: colors.textMuted }]}>
                  Loaded {displayedBids.length.toLocaleString('en-IN')} of{' '}
                  {activeTotalCount.toLocaleString('en-IN')} {tabNoun}
                </Text>
                <SecondaryButton
                  label="Load 30 More from GeM"
                  onPress={handleLoadMore}
                  style={{ marginTop: 8 }}
                />
              </View>
            ) : (
              <View style={styles.loadMoreWrap}>
                <Text style={[styles.footerStatusText, { color: colors.textMuted }]}>
                  All {displayedBids.length.toLocaleString('en-IN')} matching {tabNoun} loaded
                </Text>
              </View>
            )
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
              <View style={[styles.emptyBadge, { backgroundColor: colors.dangerTint }]}>
                <Text style={[styles.emptyBadgeText, { color: colors.danger }]}>!</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Unable to Reach GeM Portal</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {queryError ||
                  'Check your internet connection and tap Retry to fetch live tenders directly from GeM.'}
              </Text>
              <PrimaryButton label="Retry Live Sync" onPress={handleRefresh} style={{ marginTop: 14 }} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyBadge, { backgroundColor: colors.primaryTint }]}>
                <Text style={[styles.emptyBadgeText, { color: colors.primary }]}>GeM</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No matching tenders on GeM</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Try a different keyword or reset your filters to browse all live tenders.
              </Text>
              <SecondaryButton label="Reset Filters" onPress={resetAllFilters} style={{ marginTop: 14 }} />
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
              { label: 'Newest Published', value: 'Bid-Start-Date-Latest' },
              { label: 'Ending Soonest', value: 'Bid-End-Date-Oldest' },
              { label: 'Longest Window', value: 'Bid-End-Date-Latest' },
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
          onPrepareDocuments={onPrepareDocuments}
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
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  liveNoticeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  liveDotWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveNoticeLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  sortPillMini: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sortPillMiniText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  liveNoticeText: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
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
    marginBottom: 18,
    alignItems: 'center',
  },
  loadingMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  loadingMoreText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  footerStatusText: {
    fontSize: 11.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyBadgeText: {
    fontSize: 14,
    fontWeight: '900',
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
