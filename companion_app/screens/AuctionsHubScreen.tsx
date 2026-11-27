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
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import {
  SearchField,
  SegmentedTabs,
  CompactChip,
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
} from '../components/SharedUI';

type TabMode = 'Live Reverse' | 'Forward e-Scrap';

const RA_BATCH_PAGES = 3; // 30 Reverse Auctions per scroll

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
  const { colors, fontMultiplier } = useTheme();
  const [activeTab, setActiveTab] = useState<TabMode>('Live Reverse');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<GeMPortalSort>('Bid-End-Date-Oldest');
  const [highValueOnly, setHighValueOnly] = useState<boolean>(false);

  const [reverseAuctions, setReverseAuctions] = useState<ReverseAuctionDetailItem[]>([]);
  const [totalPortalRas, setTotalPortalRas] = useState<number>(0);
  const [lastPageFetched, setLastPageFetched] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const [selectedRa, setSelectedRa] = useState<ReverseAuctionDetailItem | null>(null);
  const [documentBid, setDocumentBid] = useState<DeconstructedBidDoc | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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
        setTotalPortalRas(batch.total || mapped.length);
        setLastPageFetched(batch.lastPageFetched);
        setHasMore(batch.hasMore);
        setIsOffline(false);

        setReverseAuctions((prev) => {
          if (!append) return mapped;
          const seen = new Set(prev.map((item) => item.contractNumber));
          return [...prev, ...mapped.filter((item) => !seen.has(item.contractNumber))];
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
    setIsLoading(true);
    loadAuctionBatch(1, false);
  }, [loadAuctionBatch]);

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
    ({ item: ra }: { item: ReverseAuctionDetailItem }) => (
      <View
        style={[
          styles.auctionCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <StatusBadge label="LIVE RA" tone="success" dot />
          <Text style={[styles.auctionNumber, { color: colors.textSecondary }]} numberOfLines={1}>
            {ra.contractNumber}
          </Text>
          <Text style={[styles.closingText, { color: colors.warning }]}>{ra.closingDateLabel}</Text>
          {ra.sourceBid ? (
            <Pressable
              onPress={() => void TenderRadarService.toggleWatch(ra.sourceBid!)}
              hitSlop={8}
              style={[
                styles.watchMiniBtn,
                {
                  backgroundColor: watchedSet.has(ra.contractNumber.trim().toLowerCase())
                    ? colors.warningTint
                    : colors.surfaceSubtle,
                  borderColor: watchedSet.has(ra.contractNumber.trim().toLowerCase())
                    ? colors.warning
                    : colors.borderSubtle,
                },
              ]}
              accessibilityLabel={
                watchedSet.has(ra.contractNumber.trim().toLowerCase())
                  ? 'Remove from watchlist'
                  : 'Watch reverse auction'
              }
            >
              <AppIcon
                name={
                  watchedSet.has(ra.contractNumber.trim().toLowerCase())
                    ? 'bookmarkFilled'
                    : 'bookmark'
                }
                color={
                  watchedSet.has(ra.contractNumber.trim().toLowerCase())
                    ? colors.warning
                    : colors.textMuted
                }
                size={13}
              />
            </Pressable>
          ) : null}
        </View>
        <Text
          style={[styles.auctionTitle, { color: colors.textPrimary, fontSize: 14 * fontMultiplier }]}
          numberOfLines={2}
        >
          {ra.title}
        </Text>
        <Text style={[styles.deptText, { color: colors.textSecondary }]} numberOfLines={2}>
          {[ra.department, ra.buyerOrganization !== ra.department ? ra.buyerOrganization : '']
            .filter(Boolean)
            .join(' • ') || 'Department unstated'}
        </Text>
        <View style={[styles.metaGrid, { backgroundColor: colors.surfaceSubtle }]}>
          <View style={styles.metaCol}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
              {ra.sourceBid?.parentBidNumber ? 'PARENT BID' : 'PUBLIC SOURCE'}
            </Text>
            <Text style={[styles.metaValue, { color: colors.primary }]} numberOfLines={1}>
              {ra.sourceBid?.parentBidNumber || 'GeM live feed'}
            </Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>QUANTITY</Text>
            <Text style={[styles.metaValue, { color: colors.textPrimary }]}>
              {ra.publishedQuantity && ra.totalQuantity !== undefined
                ? ra.totalQuantity.toLocaleString('en-IN')
                : 'In PDF'}
            </Text>
          </View>
        </View>
        <View style={styles.cardActionsRow}>
          {ra.sourceBid ? (
            <SecondaryButton
              label="View PDF"
              onPress={() => setDocumentBid(ra.sourceBid || null)}
              style={{ flex: 1, marginRight: 8 }}
            />
          ) : null}
          <PrimaryButton
            label="Inspect Auction"
            onPress={() => setSelectedRa(ra)}
            style={{ flex: 1.4 }}
          />
        </View>
      </View>
    ),
    [colors, fontMultiplier, watchedSet]
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
      <View style={styles.topSection}>
        <SegmentedTabs
          options={['Live Reverse', 'Forward e-Scrap']}
          selected={activeTab}
          onSelect={(tab) => setActiveTab(tab as TabMode)}
          counts={{ 'Live Reverse': totalPortalRas || reverseAuctions.length }}
          style={{ marginBottom: 10 }}
        />

        {activeTab === 'Live Reverse' && (
          <>
            <SearchField
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Live search all GeM reverse auctions (ID, item, dept)"
              style={{ marginBottom: 10 }}
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

            {totalPortalRas > 0 && !isLoading ? (
              <Text style={[styles.progressMeta, { color: colors.textSecondary }]}>
                Showing {reverseAuctions.length.toLocaleString('en-IN')} of{' '}
                {totalPortalRas.toLocaleString('en-IN')} live reverse auctions on GeM
              </Text>
            ) : null}
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
              refreshing={isRefreshing && !isLoading}
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
  topSection: { padding: DESIGN_TOKENS.pagePaddingMobile, paddingBottom: 6 },
  chipRow: { flexDirection: 'row', alignItems: 'center' },
  progressMeta: { fontSize: 11, fontWeight: '600', marginTop: 8 },
  listContent: { padding: DESIGN_TOKENS.pagePaddingMobile, paddingTop: 4, paddingBottom: 40 },
  auctionCard: {
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
    gap: 8,
  },
  auctionNumber: { fontSize: 12, fontWeight: '600', flex: 1 },
  closingText: { fontSize: 11, fontWeight: '700' },
  watchMiniBtn: {
    width: 28,
    height: 26,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auctionTitle: { fontWeight: '700', marginBottom: 4, lineHeight: 18 },
  deptText: { fontSize: 12, marginBottom: 10 },
  metaGrid: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  metaCol: { flex: 1 },
  metaLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4, marginBottom: 2 },
  metaValue: { fontSize: 13, fontWeight: '700' },
  cardActionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  footerWrap: { marginTop: 6, marginBottom: 18, alignItems: 'center' },
  footerText: { fontSize: 11.5, fontWeight: '600', textAlign: 'center' },
  loadingMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  loadingMoreText: { fontSize: 12.5, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyBadgeText: { fontSize: 15, fontWeight: '900' },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', maxWidth: 300, lineHeight: 18 },
});
