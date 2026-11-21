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
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { GeMLiveSyncService } from '../services/GeMLiveSyncService';
import { isNetworkOnline } from '../utils/network';
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import {
  SearchField,
  CompactChip,
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
} from '../components/SharedUI';
import { BidInspectorScreen } from './BidInspectorScreen';
import { BidDocumentViewer } from './BidDocumentViewer';
import { formatDateSafe } from '../utils/formatters';
import type { DeconstructedBidDoc } from '../types/index';

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

        const res = await GeMLiveSyncService.queryLivePortal({
          page: targetPage,
          searchBid: debouncedQuery,
          searchType: /^GEM\/\d{4}\/[BR]\/\d+/i.test(debouncedQuery) ? 'exact' : 'fullText',
          bidStatusType: 'bidrastatus',
          byType,
          sort: 'Bid-End-Date-Latest',
        });

        if (reqId !== reqIdRef.current) return;

        if (res.error && res.bids.length === 0) {
          if (!append) setRecords([]);
          setIsOffline(true);
          return;
        }

        setIsOffline(false);
        setTotalCount(res.total);
        setPage(targetPage);
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

    return (
      <View
        style={[
          styles.contractCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <StatusBadge
            label={isRa ? 'RA CONCLUDED' : isService ? 'SERVICE BID' : 'BID CONCLUDED'}
            tone={isRa ? 'warning' : 'neutral'}
          />
          <Text style={[styles.contractNumber, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.bidNumber}
          </Text>
        </View>

        <Text
          style={[styles.contractTitle, { color: colors.textPrimary, fontSize: 14 * fontMultiplier }]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        <Text style={[styles.deptText, { color: colors.textSecondary }]} numberOfLines={1}>
          {[item.department, item.ministry !== item.department ? item.ministry : '']
            .filter(Boolean)
            .join(' • ') || 'Department not published'}
        </Text>

        <View style={[styles.metaGrid, { backgroundColor: colors.surfaceSubtle }]}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>CLOSED (IST)</Text>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {formatDateSafe(item.closingTimeUtc)}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>QUANTITY</Text>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
              {qty !== undefined ? `${qty.toLocaleString('en-IN')} Units` : 'In PDF'}
            </Text>
          </View>
        </View>

        <View style={styles.cardActionsRow}>
          <SecondaryButton
            label="View PDF"
            onPress={() => setDocumentBid(item)}
            style={{ flex: 1, marginRight: 8 }}
          />
          <PrimaryButton
            label="Inspect Record"
            onPress={() => setSelectedBid(item)}
            style={{ flex: 1.3 }}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Compact Search + Filter Toolbar */}
      <View style={[styles.headerBlock, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search concluded bids by number, item or dept"
          style={{ marginBottom: 10 }}
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

        <View style={styles.summaryStrip}>
          <Text style={[styles.countText, { color: colors.textSecondary }]} numberOfLines={1}>
            {totalCount > 0
              ? `${totalCount.toLocaleString('en-IN')} concluded bids · bidplus.gem.gov.in`
              : 'Live concluded bids · bidplus.gem.gov.in'}
          </Text>
          <Text
            style={[styles.contractsLink, { color: colors.primary }]}
            onPress={openContractsPortal}
          >
            Contracts Portal ↗
          </Text>
        </View>
      </View>

      {/* Concluded Public Records List */}
      <FlatList
        data={records}
        keyExtractor={(item) => `${item.bidNumber}-${item.b_id || ''}`}
        renderItem={renderRecordCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadConcludedRecords(1, false)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListFooterComponent={
          records.length > 0 && hasMore ? (
            <View style={{ marginTop: 6, marginBottom: 16 }}>
              <SecondaryButton
                label={isLoadingMore ? 'Loading more from GeM...' : 'Load More Concluded Bids'}
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
              <Text style={styles.emptyEmoji}>!</Text>
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
  headerBlock: {
    paddingHorizontal: DESIGN_TOKENS.pagePaddingMobile,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  countText: { fontSize: 11, fontWeight: '600', flex: 1 },
  contractsLink: { fontSize: 11.5, fontWeight: '800' },
  filterChipRow: { flexDirection: 'row', alignItems: 'center' },
  listContent: { padding: DESIGN_TOKENS.pagePaddingMobile, paddingTop: 10, paddingBottom: 40 },
  contractCard: {
    borderRadius: 10,
    borderWidth: DESIGN_TOKENS.borderWidth,
    padding: 13,
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  contractNumber: { fontSize: 12, fontWeight: '600', marginLeft: 8, flexShrink: 1 },
  contractTitle: { fontWeight: '700', marginBottom: 4, lineHeight: 20 },
  deptText: { fontSize: 12, marginBottom: 10 },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
  },
  metricItem: { width: '50%', padding: 4 },
  metricLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4, marginBottom: 2 },
  metricValue: { fontSize: 12, fontWeight: '700' },
  cardActionsRow: { flexDirection: 'row', alignItems: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', maxWidth: 300, lineHeight: 18 },
});
