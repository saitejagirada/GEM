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
  CompactChip,
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
  FilterBottomSheetModal,
} from '../components/SharedUI';
import { formatLakhs, formatDateSafe } from '../utils/formatters';

export type GeMStatusTab = 'Ongoing' | 'Concluded' | 'Cancelled';
type TypeChip = 'All' | 'Goods' | 'Services' | 'BOQ' | 'Custom';

interface BidsHubScreenProps {
  bids: DeconstructedBidDoc[];
  initialFilter?: string;
  initialSearch?: string;
  onSyncLive?: () => Promise<void> | void;
  isSyncing?: boolean;
  onInspectBid?: (bid: DeconstructedBidDoc) => void;
  onPrepareDocuments?: (bid: DeconstructedBidDoc) => void;
}

function mapTypeChipToPortalParam(_tab: GeMStatusTab, chip: TypeChip): GeMPortalByType {
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
        activeStatusTab === 'Concluded'
          ? 'bidrastatus'
          : activeStatusTab === 'Cancelled'
            ? 'cancelled_bids'
            : 'ongoing_bids';
      const byType = mapTypeChipToPortalParam(activeStatusTab, activeTypeChip);
      const effectiveSort: GeMPortalSort =
        activeStatusTab !== 'Ongoing' && sortOrder === 'Bid-End-Date-Oldest'
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

        const results = res.bids;

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

        {/* High-signal published metadata bar (zero filler noise) */}
        <View style={[styles.metaStrip, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}>
          <View style={styles.metaCol}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>CLOSING (IST)</Text>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {formatDateSafe(item.closingTimeUtc)}
            </Text>
          </View>
          <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
          <View style={styles.metaCol}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
              {estVal !== undefined && item.publishedFields?.estimatedValue !== false
                ? 'EST. VALUE'
                : item.parentBidNumber
                  ? 'ORIGINAL BID'
                  : 'QUANTITY'}
            </Text>
            <Text
              style={[
                styles.metricValue,
                { color: estVal || item.parentBidNumber ? colors.primary : colors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {estVal !== undefined && item.publishedFields?.estimatedValue !== false
                ? formatLakhs(estVal)
                : item.parentBidNumber
                  ? item.parentBidNumber
                  : publishedQty !== undefined
                    ? `${publishedQty.toLocaleString('en-IN')} Units`
                    : 'See PDF'}
            </Text>
          </View>
        </View>

        {/* Actions: Read PDF Inline + Inspect Fundamentals */}
        <View style={styles.cardActionsRow}>
          <SecondaryButton
            label="Read PDF"
            onPress={() => handleOpenDoc(item)}
            style={{ flex: 1, marginRight: 8 }}
          />
          <PrimaryButton
            label="Inspect Bid"
            onPress={() => handleInspect(item)}
            style={{ flex: 1.4 }}
          />
        </View>
      </View>
    );
  };

  const busy = isSyncing || isQuerying;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Clean Unified Search + Underline Tabs + Filter Chips Header */}
      <View style={[styles.headerBlock, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search GeM bids (e.g. Laptop, Solar, GEM/2026/...)"
        />

        <View style={styles.underlineTabsRow}>
          {(['Ongoing', 'Concluded', 'Cancelled'] as const).map((tab) => {
            const active = activeStatusTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveStatusTab(tab)}
                style={[styles.underlineTab, active && { borderBottomColor: colors.primary }]}
              >
                <Text
                  style={[
                    styles.underlineTabText,
                    { color: active ? colors.primary : colors.textSecondary },
                    active && styles.underlineTabTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Filter Chips + Live Count Strip */}
      <View style={styles.toolbarStrip}>
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

        {activeTotalCount > 0 ? (
          <Text style={[styles.countCaption, { color: colors.textMuted }]}>
            {activeTotalCount.toLocaleString('en-IN')} live {activeStatusTab.toLowerCase()} tenders · bidplus.gem.gov.in
          </Text>
        ) : null}
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
  headerBlock: {
    paddingHorizontal: DESIGN_TOKENS.pagePaddingMobile,
    paddingTop: 12,
    borderBottomWidth: 1,
  },
  underlineTabsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  underlineTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  underlineTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  underlineTabTextActive: {
    fontWeight: '800',
  },
  toolbarStrip: {
    paddingHorizontal: DESIGN_TOKENS.pagePaddingMobile,
    paddingTop: 10,
    paddingBottom: 6,
  },
  filterChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countCaption: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },
  listContent: {
    padding: DESIGN_TOKENS.pagePaddingMobile,
    paddingTop: 4,
    paddingBottom: 40,
  },
  bidCard: {
    borderRadius: 10,
    borderWidth: DESIGN_TOKENS.borderWidth,
    padding: 13,
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  bidNumberText: {
    fontSize: 11.5,
    fontWeight: '700',
    marginLeft: 8,
    flexShrink: 1,
  },
  bidTitle: {
    fontWeight: '700',
    marginBottom: 3,
    lineHeight: 20,
  },
  deptText: {
    fontSize: 11.5,
    marginBottom: 10,
  },
  metaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    gap: 10,
  },
  metaCol: {
    flex: 1,
  },
  metaDivider: {
    width: 1,
    height: 24,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
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
