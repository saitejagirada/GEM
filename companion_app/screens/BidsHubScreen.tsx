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
  Linking,
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
import { TenderRadarService } from '../services/TenderRadarService';
import { AppIcon } from '../components/AppIcons';
import { useTheme } from '../theme/ThemeContext';
import {
  SearchField,
  SegmentedTabs,
  CompactChip,
  PrimaryButton,
  SecondaryButton,
  FilterBottomSheetModal,
} from '../components/SharedUI';
import { formatLakhs, formatDateSafe } from '../utils/formatters';

function getCompactCountdown(closingTimeUtc?: string): {
  label: string;
  urgent: boolean;
  closed: boolean;
} {
  if (!closingTimeUtc) return { label: 'See PDF', urgent: false, closed: false };
  const closing = new Date(closingTimeUtc);
  if (Number.isNaN(closing.getTime())) return { label: 'See PDF', urgent: false, closed: false };
  const diffMs = closing.getTime() - Date.now();
  if (diffMs <= 0) return { label: 'Closed', urgent: false, closed: true };
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (hours >= 48) {
    return { label: `${Math.floor(hours / 24)}d ${hours % 24}h left`, urgent: false, closed: false };
  }
  return {
    label: hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`,
    urgent: hours < 24,
    closed: false,
  };
}

function formatCompactClose(closingTimeUtc?: string): string {
  if (!closingTimeUtc) return 'See PDF';
  const d = new Date(closingTimeUtc);
  if (Number.isNaN(d.getTime())) return 'See PDF';
  const day = formatDateSafe(closingTimeUtc, { day: 'numeric', month: 'short' });
  const time = formatDateSafe(closingTimeUtc, { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${day} · ${time}`;
}

export type GeMStatusTab = 'Ongoing' | 'Live RA' | 'Railways' | 'Closed' | 'Cancelled';
type TypeChip = 'All' | 'Goods' | 'Services' | 'BOQ' | 'Custom';

const BATCH_PAGES = 3; // 30 tenders per parallel GeM batch

interface BidsHubScreenProps {
  bids: DeconstructedBidDoc[];
  initialFilter?: string;
  initialSearch?: string;
  initialRailwaysOnly?: boolean;
  navTrigger?: number;
  onSyncLive?: () => Promise<void> | void;
  isSyncing?: boolean;
  onInspectBid?: (bid: DeconstructedBidDoc) => void;
  onPrepareDocuments?: (bid: DeconstructedBidDoc) => void;
}

const RAILWAYS_BIDNEXT_URL = 'https://bidnext.gem.gov.in/bidnext/public.jsp';
const IREPS_ZONAL_CONTRACTS_URL =
  'https://www.ireps.gov.in/html/misc/awardedSupplyContractZonalRly.html';

function isRailwayBid(bid: DeconstructedBidDoc): boolean {
  const hay = `${bid.ministry || ''} ${bid.department || ''}`;
  return /railway/i.test(hay);
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
  initialRailwaysOnly = false,
  navTrigger = 0,
  onSyncLive,
  isSyncing = false,
  onInspectBid,
  onPrepareDocuments,
}) => {
  const { colors, fontMultiplier, t } = useTheme();

  const [activeStatusTab, setActiveStatusTab] = useState<GeMStatusTab>(
    initialRailwaysOnly ? 'Railways' : 'Ongoing'
  );
  const [activeTypeChip, setActiveTypeChip] = useState<TypeChip>('All');
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch || '');
  const [debouncedQuery, setDebouncedQuery] = useState<string>((initialSearch || '').trim());

  const isRailwaysTab = activeStatusTab === 'Railways';

  useEffect(() => {
    if (navTrigger > 0) {
      if (initialSearch !== undefined) {
        setSearchQuery(initialSearch);
        setDebouncedQuery(initialSearch.trim());
      }
      setActiveStatusTab(initialRailwaysOnly ? 'Railways' : 'Ongoing');
    } else if (initialSearch !== undefined) {
      setSearchQuery(initialSearch);
      setDebouncedQuery(initialSearch.trim());
    }
  }, [initialSearch, initialRailwaysOnly, navTrigger]);

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
  const [watchedSet, setWatchedSet] = useState<Set<string>>(
    () => new Set(TenderRadarService.getState().watched.map((w) => w.bid.bidNumber.trim().toLowerCase()))
  );

  // Subscribe to global GeMLiveSyncService stats + Watchlist changes
  useEffect(() => {
    const unsub = GeMLiveSyncService.subscribe((_, stats) => {
      setLiveStats(stats);
    });
    const unsubRadar = TenderRadarService.subscribe((radarState) => {
      setWatchedSet(new Set(radarState.watched.map((w) => w.bid.bidNumber.trim().toLowerCase())));
    });
    return () => {
      unsub();
      unsubRadar();
    };
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
      const useExactRailwaysQuery = isRailwaysTab && !debouncedQuery;
      const isRailwaysKeywordNarrow = isRailwaysTab && Boolean(debouncedQuery) && !isExactBidNum;

      const portalSearchBid = useExactRailwaysQuery ? 'Ministry of Railways' : debouncedQuery;
      const portalSearchType: 'exact' | 'fullText' =
        useExactRailwaysQuery || isExactBidNum ? 'exact' : 'fullText';
      const batchPages = isExactBidNum ? 1 : isRailwaysKeywordNarrow ? 5 : BATCH_PAGES;

      try {
        const res = await GeMLiveSyncService.queryLivePortalBatch(
          {
            page: startPage,
            searchBid: portalSearchBid,
            searchType: portalSearchType,
            bidStatusType,
            byType,
            highBidValue: highValueOnly ? 'highValue' : '',
            sort: effectiveSort,
          },
          batchPages
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

        // Apply secondary local filter when inside Live RA + Goods/Services sub-chip or Railways keyword search
        let results = res.bids;
        if (isRailwaysKeywordNarrow) {
          results = results.filter(isRailwayBid);
        }
        if (activeStatusTab === 'Live RA' && activeTypeChip === 'Services') {
          results = results.filter((b) => b.type === 'SERVICE');
        } else if (activeStatusTab === 'Live RA' && activeTypeChip === 'Goods') {
          results = results.filter((b) => b.type !== 'SERVICE');
        }

        setQueryTotal(isRailwaysKeywordNarrow ? 0 : res.total);
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
    [activeStatusTab, isRailwaysTab, activeTypeChip, debouncedQuery, highValueOnly, sortOrder]
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
    setQueryBids([]);
    setQueryTotal(0);
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
    if (!isDefaultOngoingView) return [];
    return bids.filter((bid) => {
      const status = bid.lifecycleStatus || GeMLiveSyncService.computeLifecycleStatus(bid);
      return status === 'ONGOING' || status === 'BID_TO_RA';
    });
  }, [queryBids, isDefaultOngoingView, bids]);

  const activeTotalCount =
    queryBids !== null ? queryTotal : isDefaultOngoingView ? liveStats.totalPortalOngoingBids : 0;
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

  // Render Apple Executive Tender Card (whole card tappable, zero box-in-box clutter)
  const renderBidCard = useCallback(
    ({ item }: { item: DeconstructedBidDoc }) => {
      const isService = item.type === 'SERVICE';
      const isRa = item.isRa || item.type === 'RA' || item.lifecycleStatus === 'BID_TO_RA';
      const estVal = item.estimatedBidValueInr;
      const hasPublishedEstVal =
        estVal !== undefined && estVal > 0 && item.publishedFields?.estimatedValue !== false;
      const publishedQty = item.boqItems?.[0]?.quantity;
      const isWatched = watchedSet.has(item.bidNumber.trim().toLowerCase());
      const countdown = getCompactCountdown(item.closingTimeUtc);
      const showClosedState = activeStatusTab === 'Closed' || activeStatusTab === 'Cancelled' || countdown.closed;

      const typeLabel = isRa
        ? 'LIVE RA'
        : isService
          ? 'SERVICES'
          : item.type === 'BOQ'
            ? 'BOQ'
            : item.type === 'CUSTOM'
              ? 'CUSTOM'
              : 'GOODS';
      const typeDotColor = isRa
        ? colors.danger
        : isService
          ? colors.violet
          : colors.primary;

      const col1Label = hasPublishedEstVal
        ? 'EST. VALUE'
        : item.isHighValue
          ? 'EST. VALUE'
          : item.parentBidNumber
            ? 'PARENT BID'
            : 'EST. VALUE';
      const col1Value = hasPublishedEstVal
        ? formatLakhs(estVal)
        : item.isHighValue
          ? '≥ ₹2 Cr'
          : item.parentBidNumber
            ? item.parentBidNumber
            : 'In PDF';
      const col1Color = hasPublishedEstVal
        ? colors.primary
        : item.isHighValue
          ? colors.success
          : item.parentBidNumber
            ? colors.primary
            : colors.textMuted;

      return (
        <Pressable
          onPress={() => handleInspect(item)}
          style={({ pressed }) => [
            styles.bidCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
              opacity: pressed ? 0.84 : 1,
            },
          ]}
          accessibilityLabel={`Inspect tender ${item.bidNumber}`}
        >
          {/* Row 1: Calm Type Eyebrow + Bid Number | Live Countdown + Watch */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.typeDot, { backgroundColor: typeDotColor }]} />
              <Text style={[styles.typeEyebrowText, { color: typeDotColor }]} numberOfLines={1}>
                {typeLabel}
              </Text>
              <Text style={[styles.metaDotSep, { color: colors.textMuted }]}>·</Text>
              <Text style={[styles.bidNumberText, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.bidNumber}
              </Text>
            </View>
            <View style={styles.cardHeaderRight}>
              <View
                style={[
                  styles.countdownPill,
                  {
                    backgroundColor: showClosedState
                      ? colors.surfaceSubtle
                      : countdown.urgent
                        ? colors.dangerTint
                        : colors.primaryTint,
                  },
                ]}
              >
                {!showClosedState ? (
                  <View
                    style={[
                      styles.countdownDot,
                      { backgroundColor: countdown.urgent ? colors.danger : colors.primary },
                    ]}
                  />
                ) : null}
                <Text
                  style={[
                    styles.countdownText,
                    {
                      color: showClosedState
                        ? colors.textMuted
                        : countdown.urgent
                          ? colors.danger
                          : colors.primary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {activeStatusTab === 'Cancelled' ? 'Cancelled' : countdown.label}
                </Text>
              </View>
              <Pressable
                onPress={() => void TenderRadarService.toggleWatch(item)}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.watchMiniBtn,
                  {
                    backgroundColor: isWatched ? colors.warningTint : 'transparent',
                    opacity: pressed ? 0.65 : 1,
                  },
                ]}
                accessibilityLabel={isWatched ? 'Remove from watchlist' : 'Watch tender'}
              >
                <AppIcon
                  name={isWatched ? 'bookmarkFilled' : 'bookmark'}
                  color={isWatched ? colors.warning : colors.textMuted}
                  size={15}
                />
              </Pressable>
            </View>
          </View>

          {/* Row 2: Editorial Title + Buyer Department */}
          <Text
            style={[styles.bidTitle, { color: colors.textPrimary, fontSize: 15.5 * fontMultiplier }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          <Text style={[styles.deptText, { color: colors.textSecondary }]} numberOfLines={1}>
            {[item.department, item.ministry !== item.department ? item.ministry : '']
              .filter(Boolean)
              .join(' · ') || 'Department not published'}
          </Text>

          {/* Row 3: Hairline 3-Column Metrics Strip (Zero Box-in-Box Clutter) */}
          <View style={[styles.metricsTrioRow, { borderTopColor: colors.borderSubtle }]}>
            <View style={[styles.trioCol, { borderRightColor: colors.borderSubtle }]}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{col1Label}</Text>
              <Text
                style={[styles.metricValue, { color: col1Color }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {col1Value}
              </Text>
            </View>
            <View style={[styles.trioColMid, { borderRightColor: colors.borderSubtle }]}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>QUANTITY</Text>
              <Text
                style={[
                  styles.metricValue,
                  { color: publishedQty !== undefined ? colors.textPrimary : colors.textMuted },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {publishedQty !== undefined
                  ? `${publishedQty.toLocaleString('en-IN')} ${publishedQty === 1 ? 'Unit' : 'Units'}`
                  : 'In PDF'}
              </Text>
            </View>
            <View style={styles.trioColLast}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                {showClosedState ? 'ENDED' : 'CLOSES'}
              </Text>
              <Text
                style={[styles.metricValue, { color: colors.textPrimary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {formatCompactClose(item.closingTimeUtc)}
              </Text>
            </View>
          </View>

          {/* Row 4: Quiet Apple Action Footer (1-Tap PDF Capsule + Inspect Disclosure) */}
          <View style={[styles.cardFooterRow, { borderTopColor: colors.borderSubtle }]}>
            <View style={styles.cardFooterLeft}>
              <Pressable
                onPress={() => handleOpenDoc(item)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.pdfPillBtn,
                  { backgroundColor: colors.surfaceSubtle, opacity: pressed ? 0.68 : 1 },
                ]}
                accessibilityLabel={`Open PDF for ${item.bidNumber}`}
              >
                <AppIcon name="document" color={colors.primary} size={13} />
                <Text style={[styles.pdfPillText, { color: colors.textPrimary }]}>
                  {t('viewPdf')}
                </Text>
              </Pressable>
              {item.isHighValue ? (
                <View style={[styles.highValueMiniPill, { backgroundColor: colors.successTint }]}>
                  <Text style={[styles.highValueMiniText, { color: colors.success }]}>≥ ₹2 Cr</Text>
                </View>
              ) : item.isEmdExemptForMse ? (
                <View style={[styles.highValueMiniPill, { backgroundColor: colors.successTint }]}>
                  <Text style={[styles.highValueMiniText, { color: colors.success }]}>
                    MSE Exempt
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.inspectCueWrap}>
              <Text style={[styles.inspectCueText, { color: colors.primary }]}>
                {t('viewBidDetails')} ›
              </Text>
            </View>
          </View>
        </Pressable>
      );
    },
    [colors, fontMultiplier, watchedSet, activeStatusTab, handleOpenDoc, handleInspect, t]
  );

  const busy = (isSyncing && displayedBids.length === 0) || isQuerying;

  const isRailwaysKeywordNarrow =
    isRailwaysTab && Boolean(debouncedQuery) && !/^GEM\/\d{4}\/[BR]\/\d+/i.test(debouncedQuery);

  const tabNoun =
    activeStatusTab === 'Railways'
      ? 'live Railways tenders'
      : activeStatusTab === 'Closed'
        ? 'concluded bids'
        : activeStatusTab === 'Cancelled'
          ? 'cancelled tenders'
          : activeStatusTab === 'Live RA'
            ? 'live reverse auctions'
            : 'live tenders';

  const headerTitle =
    activeStatusTab === 'Railways'
      ? 'Railways Tenders'
      : activeStatusTab === 'Live RA'
        ? 'Live Reverse Auctions'
        : activeStatusTab === 'Closed'
          ? 'Concluded Tenders'
          : activeStatusTab === 'Cancelled'
            ? 'Cancelled Tenders'
            : 'Tenders';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Apple Elevated Sticky Header Surface (Title + Live Count + Sort + Tabs + Search + Chips) */}
      <View
        style={[
          styles.stickyHeader,
          { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle },
        ]}
      >
        <View style={styles.headerTitleRow}>
          <View style={styles.headerTitleLeft}>
            <Text style={[styles.pageTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {headerTitle}
            </Text>
            <View style={styles.liveCountRow}>
              <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.liveCountText, { color: colors.textSecondary }]} numberOfLines={1}>
                {isRailwaysKeywordNarrow
                  ? `${displayedBids.length.toLocaleString('en-IN')} matched · ${(lastPageFetched * 10).toLocaleString('en-IN')} scanned`
                  : activeTotalCount > 0
                    ? `${activeTotalCount.toLocaleString('en-IN')} ${tabNoun}`
                    : 'Live direct GeM feed'}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => setShowFilterModal(true)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.sortPillBtn,
              { backgroundColor: colors.primaryTint, opacity: pressed ? 0.72 : 1 },
            ]}
          >
            <Text style={[styles.sortPillText, { color: colors.primary }]}>{sortLabel} ▾</Text>
          </Pressable>
        </View>

        {/* 1. iOS Segmented Bar (Ongoing | Live RA | Railways | Closed | Cancelled) */}
        <SegmentedTabs
          options={['Ongoing', 'Live RA', 'Railways', 'Closed', 'Cancelled']}
          selected={activeStatusTab}
          onSelect={(tab) => setActiveStatusTab(tab as GeMStatusTab)}
          style={{ marginBottom: 10 }}
        />

        {/* 2. Borderless Tinted iOS Search Field */}
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={
            isRailwaysTab
              ? 'Search Railways tenders (coach, cable, signal…)'
              : t('bidsSearchPlaceholder')
          }
          style={[
            styles.embeddedSearch,
            { backgroundColor: colors.surfaceSubtle, borderColor: 'transparent' },
          ]}
        />

        {/* 3. Capsule Filter Chips */}
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

      {/* 4. Infinite-Scroll Tender Feed */}
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
        ListHeaderComponent={
          isRailwaysTab ? (
            <View
              style={[
                styles.railwaysCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                  borderLeftColor: colors.primary,
                },
              ]}
            >
              <View style={styles.railwaysHeaderRow}>
                <View style={[styles.railwaysIconBox, { backgroundColor: colors.primaryTint }]}>
                  <AppIcon name="rail" color={colors.primary} size={17} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.railwaysTitle, { color: colors.textPrimary }]}>
                    Indian Railways · Ministry of Railways
                  </Text>
                  <Text style={[styles.railwaysSub, { color: colors.textSecondary }]}>
                    Live Railway bids on GeM. Open dedicated BidNext or IREPS portals for
                    login-gated listings:
                  </Text>
                </View>
              </View>
              <View style={styles.railwaysActionsRow}>
                <Pressable
                  onPress={() => Linking.openURL(RAILWAYS_BIDNEXT_URL).catch(() => undefined)}
                  style={({ pressed }) => [
                    styles.railwaysPriBtn,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.78 : 1 },
                  ]}
                  accessibilityLabel="Open official GeM BidNext Railways portal"
                >
                  <Text style={[styles.railwaysPriBtnText, { color: colors.textInverse }]}>
                    GeM BidNext ↗
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => Linking.openURL(IREPS_ZONAL_CONTRACTS_URL).catch(() => undefined)}
                  style={({ pressed }) => [
                    styles.railwaysSecBtn,
                    { backgroundColor: colors.primaryTint, opacity: pressed ? 0.75 : 1 },
                  ]}
                  accessibilityLabel="Open official IREPS Zonal Railways Contracts"
                >
                  <Text style={[styles.railwaysSecBtnText, { color: colors.primary }]}>
                    IREPS Contracts ↗
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={(isQuerying || isSyncing) && displayedBids.length > 0}
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
                  {isRailwaysKeywordNarrow
                    ? `Loaded ${displayedBids.length.toLocaleString('en-IN')} matching Railways tenders`
                    : `Loaded ${displayedBids.length.toLocaleString('en-IN')} of ${activeTotalCount.toLocaleString('en-IN')} ${tabNoun}`}
                </Text>
                <SecondaryButton
                  label={isRailwaysKeywordNarrow ? 'Scan More Railways Bids' : 'Load 30 More from GeM'}
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

      {/* Filter Bottom Sheet — Apple Eyebrow Sections */}
      <FilterBottomSheetModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filter & Sort Tenders"
        onReset={resetAllFilters}
        onApply={() => setShowFilterModal(false)}
      >
        <Text style={[styles.sheetSectionEyebrow, { color: colors.textMuted }]}>
          PROCUREMENT VEHICLE
        </Text>
        <View style={styles.sheetPillWrap}>
          {(['All', 'Goods', 'Services', 'BOQ', 'Custom'] as const).map((vehicle) => (
            <CompactChip
              key={vehicle}
              label={vehicle}
              selected={activeTypeChip === vehicle}
              onPress={() => setActiveTypeChip(vehicle)}
              style={{ marginBottom: 8 }}
            />
          ))}
        </View>

        <Text style={[styles.sheetSectionEyebrow, { color: colors.textMuted, marginTop: 16 }]}>
          BID VALUE FLAG
        </Text>
        <CompactChip
          label="High Value Bids Only (≥ ₹2 Crore)"
          selected={highValueOnly}
          onPress={() => setHighValueOnly((p) => !p)}
        />

        <Text style={[styles.sheetSectionEyebrow, { color: colors.textMuted, marginTop: 16 }]}>
          SORT ORDER ON GeM
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
  stickyHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
    gap: 10,
  },
  headerTitleLeft: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.45,
    lineHeight: 25,
  },
  liveCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveCountText: {
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
  sortPillBtn: {
    minHeight: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  embeddedSearch: {
    height: 42,
    marginBottom: 10,
  },
  filterChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  railwaysCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3.5,
    padding: 15,
    marginBottom: 12,
  },
  railwaysHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  railwaysIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railwaysTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  railwaysSub: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  railwaysActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  railwaysPriBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  railwaysPriBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  railwaysSecBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  railwaysSecBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bidCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
    gap: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 5,
  },
  typeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typeEyebrowText: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  metaDotSep: {
    fontSize: 11,
  },
  bidNumberText: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
    fontVariant: ['tabular-nums'],
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
  },
  countdownDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  watchMiniBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bidTitle: {
    fontWeight: '600',
    lineHeight: 21.5,
    letterSpacing: -0.25,
    marginBottom: 4,
  },
  deptText: {
    fontSize: 13,
    lineHeight: 18,
  },
  metricsTrioRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 11,
    paddingTop: 10,
  },
  trioCol: {
    flex: 1.25,
    paddingRight: 8,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  trioColMid: {
    flex: 0.78,
    paddingHorizontal: 8,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  trioColLast: {
    flex: 1.08,
    paddingLeft: 8,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.45,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
    paddingTop: 10,
    gap: 8,
  },
  cardFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pdfPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
  },
  pdfPillText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  highValueMiniPill: {
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  highValueMiniText: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  inspectCueWrap: {
    paddingVertical: 4,
    paddingLeft: 4,
  },
  inspectCueText: {
    fontSize: 13.5,
    fontWeight: '600',
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
    fontSize: 13,
    fontWeight: '500',
  },
  footerStatusText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
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
    fontWeight: '700',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 18.5,
    textAlign: 'center',
    maxWidth: 280,
  },
  sheetSectionEyebrow: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginBottom: 9,
  },
  sheetPillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
