/**
 * Public GeM Auction Discovery — Full Paginated Live Feed
 *
 * Streams all 1,500+ live Reverse Auctions directly from bidplus.gem.gov.in
 * using parallel 3-page batching (30 auctions per scroll), live server-side
 * search, sort options, and high-value filtering.
 * Account-specific bidding, rank, and L1 placement remain on bidplus.gem.gov.in.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Linking,
  BackHandler,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import type { DeconstructedBidDoc } from '../types/index';
import { GeMLiveSyncService, type GeMPortalSort } from '../services/GeMLiveSyncService';
import { TenderRadarService } from '../services/TenderRadarService';
import { AppIcon } from '../components/AppIcons';
import { isNetworkOnline } from '../utils/network';
import { ReverseAuctionScreen } from './ReverseAuctionScreen';
import { BidDocumentViewer } from './BidDocumentViewer';
import { useTheme } from '../theme/ThemeContext';
import {
  SearchField,
  SegmentedTabs,
  CompactChip,
  PrimaryButton,
  SecondaryButton,
} from '../components/SharedUI';
import { formatDateSafe } from '../utils/formatters';

function formatCompactAuctionClose(closingTimeUtc?: string): string {
  if (!closingTimeUtc) return 'See PDF';
  const d = new Date(closingTimeUtc);
  if (Number.isNaN(d.getTime())) return 'See PDF';
  const day = formatDateSafe(closingTimeUtc, { day: 'numeric', month: 'short' });
  const time = formatDateSafe(closingTimeUtc, { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${day} · ${time}`;
}

function isUrgentClosing(closingTimeUtc?: string): boolean {
  if (!closingTimeUtc) return false;
  const d = new Date(closingTimeUtc);
  if (Number.isNaN(d.getTime())) return false;
  const diff = d.getTime() - Date.now();
  return diff > 0 && diff < 24 * 3600000;
}

type TabMode = 'Live Reverse' | 'Forward e-Scrap';

const RA_BATCH_PAGES = 3; // 30 Reverse Auctions per scroll

// Module-level session cache so switching away from Auctions tab & returning is instant (0ms)
let MODULE_RA_CACHE: {
  key: string;
  items: ReverseAuctionDetailItem[];
  total: number;
  lastPage: number;
  hasMore: boolean;
} | null = null;

export interface ReverseAuctionDetailItem {
  id: string;
  contractNumber: string;
  title: string;
  category: string;
  buyerOrganization: string;
  closingTimeUtc: string;
  originalBidNumber?: string;
  department?: string;
  totalQuantity?: number;
  closingDateLabel?: string;
  docUrl: string;
  publishedQuantity: boolean;
  sourceBid?: DeconstructedBidDoc;
}

interface AuctionsHubScreenProps {
  onPrepareDocuments?: (bid: DeconstructedBidDoc) => void;
}

const getClosingLabel = (closingTimeUtc: string): string => {
  const closingDate = new Date(closingTimeUtc);
  if (Number.isNaN(closingDate.getTime())) return 'Closing time not published';

  const diffMs = Math.max(0, closingDate.getTime() - Date.now());
  const diffHours = Math.floor(diffMs / 3600000);
  const diffMins = Math.floor((diffMs % 3600000) / 60000);
  if (diffMs === 0) return 'Closed';
  if (diffHours > 48) return `Ends in ${Math.floor(diffHours / 24)}d ${diffHours % 24}h`;
  return diffHours > 0 ? `Ends in ${diffHours}h ${diffMins}m` : `Ends in ${diffMins}m`;
};

const mapBidDocToReverseAuction = (bid: DeconstructedBidDoc): ReverseAuctionDetailItem => {
  const totalQuantity = bid.boqItems?.[0]?.quantity;

  return {
    id: `ra-${bid.b_id || bid.bidNumber}`,
    contractNumber: bid.bidNumber,
    originalBidNumber: bid.parentBidNumber || bid.bidNumber,
    title: bid.title,
    category: bid.categoryDomain || 'Category not published',
    department: bid.department,
    buyerOrganization: bid.ministry,
    totalQuantity,
    closingTimeUtc: bid.closingTimeUtc,
    closingDateLabel: getClosingLabel(bid.closingTimeUtc),
    docUrl: bid.docUrl,
    publishedQuantity: bid.publishedFields?.quantity ?? totalQuantity !== undefined,
    sourceBid: bid,
  };
};

export const AuctionsHubScreen: React.FC<AuctionsHubScreenProps> = ({ onPrepareDocuments }) => {
  const { colors, fontMultiplier, t } = useTheme();
  const [activeTab, setActiveTab] = useState<TabMode>('Live Reverse');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<GeMPortalSort>('Bid-End-Date-Oldest');
  const [highValueOnly, setHighValueOnly] = useState<boolean>(false);

  const defaultCache =
    MODULE_RA_CACHE && MODULE_RA_CACHE.key === '||Bid-End-Date-Oldest' ? MODULE_RA_CACHE : null;
  const [reverseAuctions, setReverseAuctions] = useState<ReverseAuctionDetailItem[]>(
    () => defaultCache?.items || []
  );
  const [totalPortalRas, setTotalPortalRas] = useState<number>(() => defaultCache?.total || 0);
  const [lastPageFetched, setLastPageFetched] = useState<number>(() => defaultCache?.lastPage || 0);
  const [hasMore, setHasMore] = useState<boolean>(() => defaultCache?.hasMore ?? true);

  const [selectedRa, setSelectedRa] = useState<ReverseAuctionDetailItem | null>(null);
  const [documentBid, setDocumentBid] = useState<DeconstructedBidDoc | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(() => !defaultCache);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [watchedSet, setWatchedSet] = useState<Set<string>>(
    () => new Set(TenderRadarService.getState().watched.map((w) => w.bid.bidNumber.trim().toLowerCase()))
  );

  useEffect(() => {
    const unsub = TenderRadarService.subscribe((radarState) => {
      setWatchedSet(new Set(radarState.watched.map((w) => w.bid.bidNumber.trim().toLowerCase())));
    });
    return () => unsub();
  }, []);

  const reqIdRef = useRef<number>(0);
  const loadingMoreRef = useRef<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 380);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadAuctionBatch = useCallback(
    async (startPage: number, append: boolean) => {
      const reqId = ++reqIdRef.current;
      if (append) {
        loadingMoreRef.current = true;
        setIsLoadingMore(true);
        setLoadMoreError(null);
      } else {
        setIsRefreshing(true);
        setLoadMoreError(null);
      }

      try {
        const online = await isNetworkOnline();
        if (!online) {
          if (!append) {
            setReverseAuctions([]);
            setTotalPortalRas(0);
            setIsOffline(true);
          } else {
            setLoadMoreError('You appear to be offline. Tap to retry.');
          }
          return;
        }

        const isExactBidNum = /^GEM\/\d{4}\/[BR]\/\d+/i.test(debouncedQuery);
        const batch = await GeMLiveSyncService.queryLivePortalBatch(
          {
            page: startPage,
            searchBid: debouncedQuery,
            searchType: isExactBidNum ? 'exact' : 'fullText',
            bidStatusType: 'ongoing_bids',
            byType: 'bidToRA',
            highBidValue: highValueOnly ? 'highValue' : '',
            sort: sortOrder,
          },
          isExactBidNum ? 1 : RA_BATCH_PAGES
        );

        if (reqId !== reqIdRef.current) return;

        if (batch.error && batch.bids.length === 0) {
          if (append) {
            setLoadMoreError('GeM took too long to load more auctions. Tap to retry.');
          } else {
            setReverseAuctions([]);
            setTotalPortalRas(0);
            setIsOffline(true);
            setHasMore(false);
          }
          return;
        }

        const mapped = batch.bids.map(mapBidDocToReverseAuction);
        const nextTotal = batch.total || mapped.length;
        setTotalPortalRas(nextTotal);
        setLastPageFetched(batch.lastPageFetched);
        setHasMore(batch.hasMore);
        setIsOffline(false);

        const cacheKey = `${debouncedQuery}|${highValueOnly ? 'hv' : ''}|${sortOrder}`;
        setReverseAuctions((prev) => {
          const nextItems = !append
            ? mapped
            : [
                ...prev,
                ...mapped.filter(
                  (item) => !prev.some((existing) => existing.contractNumber === item.contractNumber)
                ),
              ];
          MODULE_RA_CACHE = {
            key: cacheKey,
            items: nextItems,
            total: nextTotal,
            lastPage: batch.lastPageFetched,
            hasMore: batch.hasMore,
          };
          return nextItems;
        });
      } catch {
        if (append) {
          setLoadMoreError('Unable to load the next auctions batch. Tap to retry.');
        } else {
          setReverseAuctions([]);
          setTotalPortalRas(0);
          setIsOffline(true);
        }
      } finally {
        if (reqId === reqIdRef.current) {
          setIsRefreshing(false);
          setIsLoading(false);
          setIsLoadingMore(false);
          loadingMoreRef.current = false;
        }
      }
    },
    [debouncedQuery, highValueOnly, sortOrder]
  );

  useEffect(() => {
    const cacheKey = `${debouncedQuery}|${highValueOnly ? 'hv' : ''}|${sortOrder}`;
    if (MODULE_RA_CACHE && MODULE_RA_CACHE.key === cacheKey && MODULE_RA_CACHE.items.length > 0) {
      setReverseAuctions(MODULE_RA_CACHE.items);
      setTotalPortalRas(MODULE_RA_CACHE.total);
      setLastPageFetched(MODULE_RA_CACHE.lastPage);
      setHasMore(MODULE_RA_CACHE.hasMore);
      setIsLoading(false);
      setIsOffline(false);
      return;
    }
    setIsLoading(true);
    loadAuctionBatch(1, false);
  }, [debouncedQuery, highValueOnly, sortOrder, loadAuctionBatch]);

  useEffect(() => {
    if (!selectedRa) return;
    const onBackPress = () => {
      setSelectedRa(null);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [selectedRa]);

  const effectiveHasMore =
    hasMore && (totalPortalRas === 0 || reverseAuctions.length < totalPortalRas);

  const handleLoadMore = useCallback(() => {
    if (loadingMoreRef.current || isLoadingMore || isRefreshing || !effectiveHasMore) return;
    loadAuctionBatch(lastPageFetched + 1, true);
  }, [isLoadingMore, isRefreshing, effectiveHasMore, lastPageFetched, loadAuctionBatch]);

  const renderAuctionCard = useCallback(
    ({ item: ra }: { item: ReverseAuctionDetailItem }) => {
      const isWatched = watchedSet.has(ra.contractNumber.trim().toLowerCase());
      const urgent = isUrgentClosing(ra.closingTimeUtc);
      const isClosed = ra.closingDateLabel === 'Closed';
      const shortCountdown = (ra.closingDateLabel || 'See PDF').replace(/^Ends in\s+/i, '');

      return (
        <Pressable
          onPress={() => setSelectedRa(ra)}
          style={({ pressed }) => [
            styles.auctionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
              opacity: pressed ? 0.84 : 1,
            },
          ]}
          accessibilityLabel={`Inspect reverse auction ${ra.contractNumber}`}
        >
          {/* Row 1: Type Eyebrow + RA Number | Live Countdown + Bookmark */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.typeDot, { backgroundColor: colors.danger }]} />
              <Text style={[styles.typeEyebrow, { color: colors.danger }]}>LIVE RA</Text>
              <Text style={[styles.metaSep, { color: colors.textMuted }]}>·</Text>
              <Text style={[styles.auctionNumber, { color: colors.textSecondary }]} numberOfLines={1}>
                {ra.contractNumber}
              </Text>
            </View>
            <View style={styles.cardHeaderRight}>
              <View
                style={[
                  styles.countdownPill,
                  {
                    backgroundColor: isClosed
                      ? colors.surfaceSubtle
                      : urgent
                        ? colors.dangerTint
                        : colors.warningTint,
                  },
                ]}
              >
                {!isClosed ? (
                  <View
                    style={[
                      styles.countdownDot,
                      { backgroundColor: urgent ? colors.danger : colors.warning },
                    ]}
                  />
                ) : null}
                <Text
                  style={[
                    styles.countdownText,
                    {
                      color: isClosed
                        ? colors.textMuted
                        : urgent
                          ? colors.danger
                          : colors.warning,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {isClosed ? 'Closed' : `${shortCountdown} left`}
                </Text>
              </View>
              {ra.sourceBid ? (
                <Pressable
                  onPress={() => void TenderRadarService.toggleWatch(ra.sourceBid!)}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.watchMiniBtn,
                    {
                      backgroundColor: isWatched ? colors.warningTint : 'transparent',
                      opacity: pressed ? 0.65 : 1,
                    },
                  ]}
                  accessibilityLabel={
                    isWatched ? 'Remove from watchlist' : 'Watch reverse auction'
                  }
                >
                  <AppIcon
                    name={isWatched ? 'bookmarkFilled' : 'bookmark'}
                    color={isWatched ? colors.warning : colors.textMuted}
                    size={15}
                  />
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Row 2: Title + Department */}
          <Text
            style={[
              styles.auctionTitle,
              { color: colors.textPrimary, fontSize: 15.5 * fontMultiplier },
            ]}
            numberOfLines={2}
          >
            {ra.title}
          </Text>
          <Text style={[styles.deptText, { color: colors.textSecondary }]} numberOfLines={1}>
            {[ra.department, ra.buyerOrganization !== ra.department ? ra.buyerOrganization : '']
              .filter(Boolean)
              .join(' · ') || 'Department not published'}
          </Text>

          {/* Row 3: Hairline 3-Column Metrics Strip */}
          <View style={[styles.metricsTrioRow, { borderTopColor: colors.borderSubtle }]}>
            <View style={[styles.trioCol, { borderRightColor: colors.borderSubtle }]}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
                {ra.sourceBid?.parentBidNumber ? 'PARENT BID' : 'SOURCE'}
              </Text>
              <Text
                style={[styles.metaValue, { color: colors.primary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {ra.sourceBid?.parentBidNumber || 'GeM Live'}
              </Text>
            </View>
            <View style={[styles.trioColMid, { borderRightColor: colors.borderSubtle }]}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>QUANTITY</Text>
              <Text
                style={[
                  styles.metaValue,
                  {
                    color:
                      ra.publishedQuantity && ra.totalQuantity !== undefined
                        ? colors.textPrimary
                        : colors.textMuted,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {ra.publishedQuantity && ra.totalQuantity !== undefined
                  ? `${ra.totalQuantity.toLocaleString('en-IN')} ${ra.totalQuantity === 1 ? 'Unit' : 'Units'}`
                  : 'In PDF'}
              </Text>
            </View>
            <View style={styles.trioColLast}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>CLOSES</Text>
              <Text
                style={[styles.metaValue, { color: colors.textPrimary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {formatCompactAuctionClose(ra.closingTimeUtc)}
              </Text>
            </View>
          </View>

          {/* Row 4: Quiet Apple Footer */}
          <View style={[styles.cardFooterRow, { borderTopColor: colors.borderSubtle }]}>
            {ra.sourceBid ? (
              <Pressable
                onPress={() => setDocumentBid(ra.sourceBid || null)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.pdfPillBtn,
                  { backgroundColor: colors.surfaceSubtle, opacity: pressed ? 0.68 : 1 },
                ]}
              >
                <AppIcon name="document" color={colors.primary} size={13} />
                <Text style={[styles.pdfPillText, { color: colors.textPrimary }]}>
                  {t('viewPdf')}
                </Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Text style={[styles.inspectCueText, { color: colors.primary }]}>
              {t('inspectAuction')} ›
            </Text>
          </View>
        </Pressable>
      );
    },
    [colors, fontMultiplier, watchedSet, t]
  );

  if (selectedRa) {
    return (
      <ReverseAuctionScreen
        auction={selectedRa}
        onBack={() => setSelectedRa(null)}
        onPrepareDocuments={onPrepareDocuments}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Elevated White Apple Sticky Header */}
      <View
        style={[
          styles.stickyHeader,
          { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle },
        ]}
      >
        <View style={styles.headerTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Auctions</Text>
            <View style={styles.liveCountRow}>
              <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.progressMeta, { color: colors.textSecondary }]}>
                {activeTab === 'Forward e-Scrap'
                  ? 'Official forwardauction.gem.gov.in handoff'
                  : totalPortalRas > 0
                    ? `${totalPortalRas.toLocaleString('en-IN')} live reverse auctions on GeM`
                    : 'Live reverse auctions directly from GeM'}
              </Text>
            </View>
          </View>
        </View>

        <SegmentedTabs
          options={['Live Reverse', 'Forward e-Scrap']}
          selected={activeTab}
          onSelect={(tab) => setActiveTab(tab as TabMode)}
          counts={totalPortalRas > 0 ? { 'Live Reverse': totalPortalRas } : undefined}
          style={{ marginBottom: activeTab === 'Live Reverse' ? 10 : 0 }}
        />

        {activeTab === 'Live Reverse' && (
          <>
            <SearchField
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('auctionsSearchPlaceholder')}
              style={[
                styles.embeddedSearch,
                { backgroundColor: colors.surfaceSubtle, borderColor: 'transparent' },
              ]}
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              <CompactChip
                label="Ending Soonest"
                selected={sortOrder === 'Bid-End-Date-Oldest'}
                onPress={() => setSortOrder('Bid-End-Date-Oldest')}
              />
              <CompactChip
                label="Newest Published"
                selected={sortOrder === 'Bid-Start-Date-Latest'}
                onPress={() => setSortOrder('Bid-Start-Date-Latest')}
              />
              <CompactChip
                label="Longest Window"
                selected={sortOrder === 'Bid-End-Date-Latest'}
                onPress={() => setSortOrder('Bid-End-Date-Latest')}
              />
              <CompactChip
                label="₹2 Cr+"
                selected={highValueOnly}
                onPress={() => setHighValueOnly((p) => !p)}
              />
            </ScrollView>
          </>
        )}
      </View>

      {activeTab === 'Live Reverse' ? (
        <FlatList
          data={reverseAuctions}
          keyExtractor={(item) => item.id}
          renderItem={renderAuctionCard}
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
              refreshing={isRefreshing && reverseAuctions.length > 0}
              onRefresh={() => loadAuctionBatch(1, false)}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListFooterComponent={
            reverseAuctions.length > 0 ? (
              loadMoreError ? (
                <View style={styles.footerWrap}>
                  <Text style={[styles.footerText, { color: colors.danger }]}>{loadMoreError}</Text>
                  <SecondaryButton
                    label="Retry Next 30 Auctions"
                    onPress={handleLoadMore}
                    style={{ marginTop: 8 }}
                  />
                </View>
              ) : isLoadingMore ? (
                <View style={styles.loadingMoreRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.loadingMoreText, { color: colors.textSecondary }]}>
                    Loading next 30 live auctions from GeM…
                  </Text>
                </View>
              ) : effectiveHasMore ? (
                <View style={styles.footerWrap}>
                  <Text style={[styles.footerText, { color: colors.textMuted }]}>
                    Loaded {reverseAuctions.length.toLocaleString('en-IN')} of{' '}
                    {totalPortalRas.toLocaleString('en-IN')} live reverse auctions
                  </Text>
                  <SecondaryButton
                    label="Load 30 More Auctions"
                    onPress={handleLoadMore}
                    style={{ marginTop: 8 }}
                  />
                </View>
              ) : (
                <View style={styles.footerWrap}>
                  <Text style={[styles.footerText, { color: colors.textMuted }]}>
                    All {reverseAuctions.length.toLocaleString('en-IN')} matching reverse auctions loaded
                  </Text>
                </View>
              )
            ) : null
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary, marginTop: 16 }]}>
                  Connecting to GeM Portal...
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Fetching live reverse auctions directly from bidplus.gem.gov.in.
                </Text>
              </View>
            ) : isOffline ? (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyBadge, { backgroundColor: colors.dangerTint }]}>
                  <Text style={[styles.emptyBadgeText, { color: colors.danger }]}>!</Text>
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  Public auction feed unavailable
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Check your internet connection and try again. No demo auction data is shown.
                </Text>
                <PrimaryButton
                  label="Retry connection"
                  onPress={() => loadAuctionBatch(1, false)}
                  style={{ marginTop: 14 }}
                />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyBadge, { backgroundColor: colors.primaryTint }]}>
                  <Text style={[styles.emptyBadgeText, { color: colors.primary }]}>RA</Text>
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  No active reverse auctions found
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Try another search keyword or clear the ₹2 Cr+ filter.
                </Text>
              </View>
            )
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyBadge, { backgroundColor: colors.primaryTint }]}>
              <Text style={[styles.emptyBadgeText, { color: colors.primary }]}>FA</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Official GeM Forward Auctions
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Forward e-Scrap auctions (surplus vehicles, machinery, and scrap lots) are hosted
              directly on forwardauction.gem.gov.in with live registration and EMD verification.
            </Text>
            <PrimaryButton
              label="Open Official Forward Auctions ↗"
              onPress={() => Linking.openURL('https://forwardauction.gem.gov.in')}
              style={{ marginTop: 16 }}
            />
          </View>
        </ScrollView>
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
  container: { flex: 1 },
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
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  progressMeta: { fontSize: 12, fontWeight: '500', fontVariant: ['tabular-nums'] },
  embeddedSearch: { height: 42, marginBottom: 10 },
  chipRow: { flexDirection: 'row', alignItems: 'center' },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  auctionCard: {
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
  typeDot: { width: 6, height: 6, borderRadius: 3 },
  typeEyebrow: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.4 },
  metaSep: { fontSize: 11 },
  auctionNumber: {
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
  countdownDot: { width: 5, height: 5, borderRadius: 2.5 },
  countdownText: { fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },
  watchMiniBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auctionTitle: {
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 21.5,
    letterSpacing: -0.25,
  },
  deptText: { fontSize: 13, lineHeight: 18 },
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
  metaLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.45, marginBottom: 2 },
  metaValue: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
    paddingTop: 10,
  },
  pdfPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
  },
  pdfPillText: { fontSize: 12.5, fontWeight: '600' },
  inspectCueText: { fontSize: 13.5, fontWeight: '600' },
  footerWrap: { marginTop: 6, marginBottom: 18, alignItems: 'center' },
  footerText: { fontSize: 12, fontWeight: '500', textAlign: 'center', fontVariant: ['tabular-nums'] },
  loadingMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  loadingMoreText: { fontSize: 13, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyBadgeText: { fontSize: 15, fontWeight: '700' },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', maxWidth: 300, lineHeight: 18.5 },
});
