/**
 * Public GeM auction discovery.
 *
 * The public listing can show live auction records, but it does not expose a
 * seller's rank, quoted price, bid history, or authenticated bid placement.
 * Those actions stay on the official GeM portal.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  BackHandler,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import type { DeconstructedBidDoc } from '../types/index';
import { GeMLiveSyncService } from '../services/GeMLiveSyncService';
import { isNetworkOnline } from '../utils/network';
import { ReverseAuctionScreen } from './ReverseAuctionScreen';
import { BidDocumentViewer } from './BidDocumentViewer';
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import {
  SearchField,
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
} from '../components/SharedUI';

type TabMode = 'Live Reverse' | 'Forward e-Scrap';

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
  const [reverseAuctions, setReverseAuctions] = useState<ReverseAuctionDetailItem[]>([]);
  const [totalPortalRas, setTotalPortalRas] = useState<number>(0);
  const [selectedRa, setSelectedRa] = useState<ReverseAuctionDetailItem | null>(null);
  const [documentBid, setDocumentBid] = useState<DeconstructedBidDoc | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  const loadLiveAuctions = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const online = await isNetworkOnline();
      if (!online) {
        setReverseAuctions([]);
        setTotalPortalRas(0);
        setIsOffline(true);
        return;
      }

      // Query live Reverse Auctions directly from bidplus.gem.gov.in (zero backend)
      const [page1, page2] = await Promise.all([
        GeMLiveSyncService.queryLivePortal({
          page: 1,
          bidStatusType: 'ongoing_bids',
          byType: 'bidToRA',
          sort: 'Bid-End-Date-Oldest',
        }),
        GeMLiveSyncService.queryLivePortal({
          page: 2,
          bidStatusType: 'ongoing_bids',
          byType: 'bidToRA',
          sort: 'Bid-End-Date-Oldest',
        }),
      ]);

      const combined = [...page1.bids, ...page2.bids];
      const deduped = Array.from(new Map(combined.map((b) => [b.bidNumber, b])).values());

      if (page1.error && deduped.length === 0) {
        setReverseAuctions([]);
        setTotalPortalRas(0);
        setIsOffline(true);
        return;
      }

      setReverseAuctions(deduped.map(mapBidDocToReverseAuction));
      setTotalPortalRas(page1.total || deduped.length);
      setIsOffline(false);
    } catch {
      setReverseAuctions([]);
      setTotalPortalRas(0);
      setIsOffline(true);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLiveAuctions();
  }, [loadLiveAuctions]);

  useEffect(() => {
    if (!selectedRa) return;
    const onBackPress = () => {
      setSelectedRa(null);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [selectedRa]);

  const filteredReverseAuctions = useMemo(() => {
    if (!searchQuery.trim()) return reverseAuctions;
    const q = searchQuery.toLowerCase().trim();
    return reverseAuctions.filter((ra) =>
      [ra.contractNumber, ra.originalBidNumber, ra.title, ra.department, ra.buyerOrganization]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [reverseAuctions, searchQuery]);

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
      <View style={[styles.headerBlock, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search reverse auction ID, item or department"
        />

        <View style={styles.underlineTabsRow}>
          {(['Live Reverse', 'Forward e-Scrap'] as const).map((tab) => {
            const active = activeTab === tab;
            const label =
              tab === 'Live Reverse' && (totalPortalRas || reverseAuctions.length) > 0
                ? `Live Reverse (${(totalPortalRas || reverseAuctions.length).toLocaleString('en-IN')})`
                : tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.underlineTab, active && { borderBottomColor: colors.primary }]}
              >
                <Text
                  style={[
                    styles.underlineTabText,
                    { color: active ? colors.primary : colors.textSecondary },
                    active && styles.underlineTabTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={loadLiveAuctions}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {activeTab === 'Live Reverse' && (
          isLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary, marginTop: 16 }]}>Connecting to GeM Portal...</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Fetching current public reverse-auction records.</Text>
            </View>
          ) : isOffline ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>!</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Public auction feed unavailable</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Check your internet connection and try again. No demo auction data is shown.</Text>
              <PrimaryButton label="Retry connection" onPress={loadLiveAuctions} style={{ marginTop: 14 }} />
            </View>
          ) : filteredReverseAuctions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>RA</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No active reverse auctions found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Try another search or refresh the public GeM feed.</Text>
            </View>
          ) : (
            filteredReverseAuctions.map((ra) => (
              <View key={ra.id} style={[styles.auctionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardHeaderRow}>
                  <StatusBadge label="LIVE RA" tone="success" dot />
                  <Text style={[styles.auctionNumber, { color: colors.textSecondary }]}>{ra.contractNumber}</Text>
                  <Text style={[styles.closingText, { color: colors.warning }]}>{ra.closingDateLabel}</Text>
                </View>
                <Text style={[styles.auctionTitle, { color: colors.textPrimary, fontSize: 14 * fontMultiplier }]} numberOfLines={2}>{ra.title}</Text>
                <Text style={[styles.deptText, { color: colors.textSecondary }]} numberOfLines={2}>
                  {[ra.department, ra.buyerOrganization].filter(Boolean).join(' • ') || 'Department unstated'}
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
            ))
          )
        )}

        {activeTab === 'Forward e-Scrap' && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>FA</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Official GeM Forward Auctions</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Forward e-Scrap auctions (surplus vehicles, machinery, and scrap lots) are hosted directly on forwardauction.gem.gov.in with live registration and EMD verification.
            </Text>
            <PrimaryButton
              label="Open Official Forward Auctions ↗"
              onPress={() => Linking.openURL('https://forwardauction.gem.gov.in')}
              style={{ marginTop: 16 }}
            />
          </View>
        )}
      </ScrollView>

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
  underlineTabText: { fontSize: 13, fontWeight: '600' },
  underlineTabTextActive: { fontWeight: '800' },
  listContent: { padding: DESIGN_TOKENS.pagePaddingMobile, paddingTop: 10, paddingBottom: 40 },
  auctionCard: { borderRadius: 10, borderWidth: DESIGN_TOKENS.borderWidth, padding: 13, marginBottom: 10 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  auctionNumber: { fontSize: 12, fontWeight: '600' },
  closingText: { fontSize: 11, fontWeight: '700' },
  auctionTitle: { fontWeight: '700', marginBottom: 4, lineHeight: 18 },
  deptText: { fontSize: 12, marginBottom: 10 },
  metaGrid: { flexDirection: 'row', borderRadius: 8, padding: 10, marginBottom: 8, justifyContent: 'space-between' },
  metaCol: { flex: 1 },
  metaLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4, marginBottom: 2 },
  metaValue: { fontSize: 13, fontWeight: '700' },
  cardActionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  publicNote: { fontSize: 12, lineHeight: 17 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', maxWidth: 300, lineHeight: 18 },
});
