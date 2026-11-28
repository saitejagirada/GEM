/**
 * GeM Concluded Bids & Official Contracts Registry (Direct Phone -> GeM)
 *
 * Queries concluded public Bid / RA results directly from https://bidplus.gem.gov.in
 * (bidStatusType: 'bidrastatus') with zero backend proxy, and provides a direct
 * official handoff to https://gem.gov.in/view_contracts for signed contracts & CRAC/PFMS records.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { GeMLiveSyncService } from '../services/GeMLiveSyncService';
import { isNetworkOnline } from '../utils/network';
import { useTheme } from '../theme/ThemeContext';
import {
  SearchField,
  CompactChip,
  PrimaryButton,
  SecondaryButton,
} from '../components/SharedUI';
import { BidInspectorScreen } from './BidInspectorScreen';
import { BidDocumentViewer } from './BidDocumentViewer';
import { formatDateSafe } from '../utils/formatters';
import type { DeconstructedBidDoc } from '../types/index';

function formatCompactClosedDate(closingTimeUtc?: string): string {
  if (!closingTimeUtc) return 'See PDF';
  const d = new Date(closingTimeUtc);
  if (Number.isNaN(d.getTime())) return 'See PDF';
  return formatDateSafe(closingTimeUtc, { day: 'numeric', month: 'short', year: 'numeric' });
}

type ConcludedFilter = 'ALL' | 'GOODS' | 'SERVICES' | 'RA';

export interface OrdersKnowledgeScreenProps {
  initialSearch?: string;
  onPrepareDocuments?: (bid: DeconstructedBidDoc) => void;
}

export const OrdersKnowledgeScreen: React.FC<OrdersKnowledgeScreenProps> = ({
  initialSearch,
  onPrepareDocuments,
}) => {
  const { colors, fontMultiplier } = useTheme();

  const [records, setRecords] = useState<DeconstructedBidDoc[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>(initialSearch || '');
  const [debouncedQuery, setDebouncedQuery] = useState<string>((initialSearch || '').trim());

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearchQuery(initialSearch);
      setDebouncedQuery(initialSearch.trim());
    }
  }, [initialSearch]);
  const [activeFilter, setActiveFilter] = useState<ConcludedFilter>('ALL');
  const [selectedBid, setSelectedBid] = useState<DeconstructedBidDoc | null>(null);
  const [documentBid, setDocumentBid] = useState<DeconstructedBidDoc | null>(null);
  const reqIdRef = useRef<number>(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadConcludedRecords = useCallback(
    async (targetPage: number = 1, append: boolean = false) => {
      const reqId = ++reqIdRef.current;
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const online = await isNetworkOnline();
        if (!online) {
          if (!append) setRecords([]);
          setIsOffline(true);
          return;
        }

        const byType =
          activeFilter === 'GOODS'
            ? 'product'
            : activeFilter === 'SERVICES'
              ? 'service'
              : activeFilter === 'RA'
                ? 'bidToRA'
                : 'all';

        const isExact = /^GEM\/\d{4}\/[BR]\/\d+/i.test(debouncedQuery);
        const res = await GeMLiveSyncService.queryLivePortalBatch(
          {
            page: targetPage,
            searchBid: debouncedQuery,
            searchType: isExact ? 'exact' : 'fullText',
            bidStatusType: 'bidrastatus',
            byType,
            sort: 'Bid-End-Date-Latest',
          },
          isExact ? 1 : 3
        );

        if (reqId !== reqIdRef.current) return;

        if (res.error && res.bids.length === 0) {
          if (!append) setRecords([]);
          setIsOffline(true);
          return;
        }

        setIsOffline(false);
        setTotalCount(res.total);
        setPage(res.lastPageFetched);
        setHasMore(res.hasMore);
        setRecords((prev) => {
          if (!append) return res.bids;
          const seen = new Set(prev.map((item) => item.bidNumber));
          return [...prev, ...res.bids.filter((item) => !seen.has(item.bidNumber))];
        });
      } catch {
        if (!append) setRecords([]);
        setIsOffline(true);
      } finally {
        if (reqId === reqIdRef.current) {
          setIsRefreshing(false);
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [activeFilter, debouncedQuery]
  );

  useEffect(() => {
    loadConcludedRecords(1, false);
  }, [loadConcludedRecords]);

  const openContractsPortal = useCallback(() => {
    Linking.openURL('https://gem.gov.in/view_contracts').catch(() => {
      Alert.alert('GeM Contracts', 'Visit https://gem.gov.in/view_contracts in your browser.');
    });
  }, []);

  const renderRecordCard = ({ item }: { item: DeconstructedBidDoc }) => {
    const isRa = item.isRa || item.type === 'RA';
    const isService = item.type === 'SERVICE';
    const qty = item.boqItems?.[0]?.quantity;
    const typeLabel = isRa ? 'RA CONCLUDED' : isService ? 'SERVICE BID' : 'CONCLUDED';
    const dotColor = isRa ? colors.warning : isService ? colors.violet : colors.primary;

    return (
      <Pressable
        onPress={() => setSelectedBid(item)}
        style={({ pressed }) => [
          styles.contractCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderSubtle,
            opacity: pressed ? 0.84 : 1,
          },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.typeDot, { backgroundColor: dotColor }]} />
            <Text style={[styles.typeEyebrow, { color: dotColor }]}>{typeLabel}</Text>
            <Text style={[styles.metaSep, { color: colors.textMuted }]}>·</Text>
            <Text style={[styles.contractNumber, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.bidNumber}
            </Text>
          </View>
          <View style={[styles.closedPill, { backgroundColor: colors.surfaceSubtle }]}>
            <Text style={[styles.closedPillText, { color: colors.textSecondary }]}>Closed</Text>
          </View>
        </View>

        <Text
          style={[styles.contractTitle, { color: colors.textPrimary, fontSize: 15.5 * fontMultiplier }]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        <Text style={[styles.deptText, { color: colors.textSecondary }]} numberOfLines={1}>
          {[item.department, item.ministry !== item.department ? item.ministry : '']
            .filter(Boolean)
            .join(' · ') || 'Department not published'}
        </Text>

        <View style={[styles.metricsRow, { borderTopColor: colors.borderSubtle }]}>
          <View style={[styles.metricCol, { borderRightColor: colors.borderSubtle }]}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>CLOSED DATE</Text>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {formatCompactClosedDate(item.closingTimeUtc)}
            </Text>
          </View>
          <View style={styles.metricColLast}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>QUANTITY</Text>
            <Text
              style={[
                styles.metricValue,
                { color: qty !== undefined ? colors.textPrimary : colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {qty !== undefined
                ? `${qty.toLocaleString('en-IN')} ${qty === 1 ? 'Unit' : 'Units'}`
                : 'In PDF'}
            </Text>
          </View>
        </View>

        <View style={[styles.cardFooterRow, { borderTopColor: colors.borderSubtle }]}>
          <Pressable
            onPress={() => setDocumentBid(item)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.pdfPillBtn,
              { backgroundColor: colors.surfaceSubtle, opacity: pressed ? 0.68 : 1 },
            ]}
          >
            <Text style={[styles.pdfPillText, { color: colors.textPrimary }]}>View PDF</Text>
          </Pressable>
          <Text style={[styles.inspectCue, { color: colors.primary }]}>Inspect Record ›</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Elevated White Apple Header */}
      <View
        style={[
          styles.stickyHeader,
          { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle },
        ]}
      >
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.countHeadline, { color: colors.textSecondary }]}>
              {totalCount > 0
                ? `${totalCount.toLocaleString('en-IN')} concluded public bids on GeM`
                : 'Live concluded bids from bidplus.gem.gov.in'}
            </Text>
          </View>
          <Pressable
            onPress={openContractsPortal}
            hitSlop={8}
            style={({ pressed }) => [
              styles.contractsPillBtn,
              { backgroundColor: colors.primaryTint, opacity: pressed ? 0.72 : 1 },
            ]}
          >
            <Text style={[styles.contractsPillText, { color: colors.primary }]}>
              GeM Contracts ↗
            </Text>
          </Pressable>
        </View>

        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search concluded bids by number, item or dept"
          style={[
            styles.embeddedSearch,
            { backgroundColor: colors.surfaceSubtle, borderColor: 'transparent' },
          ]}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipRow}
        >
          {(
            [
              { id: 'ALL', label: 'All Concluded' },
              { id: 'GOODS', label: 'Goods' },
              { id: 'SERVICES', label: 'Services' },
              { id: 'RA', label: 'Reverse Auctions' },
            ] as const
          ).map((chip) => (
            <CompactChip
              key={chip.id}
              label={chip.label}
              selected={activeFilter === chip.id}
              onPress={() => setActiveFilter(chip.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Concluded Public Records List */}
      <FlatList
        data={records}
        keyExtractor={(item) => `${item.bidNumber}-${item.b_id || ''}`}
        renderItem={renderRecordCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (!isLoadingMore && !isRefreshing && hasMore) {
            loadConcludedRecords(page + 1, true);
          }
        }}
        onEndReachedThreshold={0.45}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing && records.length > 0}
            onRefresh={() => loadConcludedRecords(1, false)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListFooterComponent={
          records.length > 0 && hasMore ? (
            <View style={{ marginTop: 6, marginBottom: 16 }}>
              <SecondaryButton
                label={
                  isLoadingMore
                    ? 'Loading next 30 concluded bids…'
                    : `Load 30 More (${records.length.toLocaleString('en-IN')} of ${totalCount.toLocaleString('en-IN')})`
                }
                onPress={() => loadConcludedRecords(page + 1, true)}
                disabled={isLoadingMore}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          isLoading || isRefreshing ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary, marginTop: 14 }]}>
                Querying bidplus.gem.gov.in...
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Loading concluded public bid and RA records directly from GeM.
              </Text>
            </View>
          ) : isOffline ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyBadge, { backgroundColor: colors.dangerTint }]}>
                <Text style={[styles.emptyBadgeText, { color: colors.danger }]}>!</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Unable to Reach GeM Portal</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Check your internet connection and retry, or open GeM executed contracts directly in your browser.
              </Text>
              <PrimaryButton
                label="Retry Live Sync"
                onPress={() => loadConcludedRecords(1, false)}
                style={{ marginTop: 14 }}
              />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No matching concluded records</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Try another search term or view signed contracts directly on gem.gov.in/view_contracts.
              </Text>
            </View>
          )
        }
      />

      {selectedBid && (
        <BidInspectorScreen
          bid={selectedBid}
          visible={true}
          onClose={() => setSelectedBid(null)}
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
  container: { flex: 1 },
  stickyHeader: {
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  countHeadline: {
    fontSize: 12.5,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  contractsPillBtn: {
    minHeight: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contractsPillText: { fontSize: 12, fontWeight: '600' },
  embeddedSearch: { height: 42, marginBottom: 10 },
  filterChipRow: { flexDirection: 'row', alignItems: 'center' },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  contractCard: {
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
  contractNumber: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
    fontVariant: ['tabular-nums'],
  },
  closedPill: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  closedPillText: { fontSize: 11, fontWeight: '600' },
  contractTitle: {
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 21.5,
    letterSpacing: -0.25,
  },
  deptText: { fontSize: 13, lineHeight: 18 },
  metricsRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 11,
    paddingTop: 10,
  },
  metricCol: {
    flex: 1,
    paddingRight: 10,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  metricColLast: {
    flex: 1,
    paddingLeft: 12,
  },
  metricLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.45, marginBottom: 2 },
  metricValue: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
    paddingTop: 10,
  },
  pdfPillBtn: {
    minHeight: 34,
    paddingHorizontal: 13,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfPillText: { fontSize: 12.5, fontWeight: '600' },
  inspectCue: { fontSize: 13.5, fontWeight: '600' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyBadgeText: { fontSize: 16, fontWeight: '700' },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', maxWidth: 300, lineHeight: 18.5 },
});
