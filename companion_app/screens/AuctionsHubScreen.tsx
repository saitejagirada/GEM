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
} from 'react-native';
import type { ForwardAuctionLot, DeconstructedBidDoc } from '../types/index';
import { PortalApiClient } from '../services/PortalApiClient';
import { GeMLiveSyncService } from '../services/GeMLiveSyncService';
import { isNetworkOnline } from '../utils/network.ts';
import { ReverseAuctionScreen } from './ReverseAuctionScreen';
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import {
  SearchField,
  SegmentedTabs,
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
    originalBidNumber: bid.bidNumber,
    title: bid.title,
    category: bid.categoryDomain || 'Category not published',
    department: bid.department,
    buyerOrganization: bid.ministry,
    totalQuantity,
    closingTimeUtc: bid.closingTimeUtc,
    closingDateLabel: getClosingLabel(bid.closingTimeUtc),
    docUrl: bid.docUrl,
    publishedQuantity: bid.publishedFields?.quantity ?? totalQuantity !== undefined,
  };
};

export const AuctionsHubScreen: React.FC = () => {
  const { colors, fontMultiplier } = useTheme();
  const [activeTab, setActiveTab] = useState<TabMode>('Live Reverse');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [forwardLots, setForwardLots] = useState<ForwardAuctionLot[]>([]);
  const [reverseAuctions, setReverseAuctions] = useState<ReverseAuctionDetailItem[]>([]);
  const [selectedRa, setSelectedRa] = useState<ReverseAuctionDetailItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  const loadLiveAuctions = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const online = await isNetworkOnline();
      if (!online) {
        setReverseAuctions([]);
        setForwardLots([]);
        setIsOffline(true);
        return;
      }

      await GeMLiveSyncService.syncFromPortal();
      const liveDocs = GeMLiveSyncService.getReverseAuctions();
      setReverseAuctions(liveDocs.map(mapBidDocToReverseAuction));
      setIsOffline(false);

      // This optional backend may provide a public forward-auction feed. An
      // empty response is intentional; no local lots are used as a fallback.
      setForwardLots(await PortalApiClient.getForwardAuctions());
    } catch {
      setReverseAuctions([]);
      setForwardLots([]);
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

  const filteredForwardLots = useMemo(() => {
    if (!searchQuery.trim()) return forwardLots;
    const q = searchQuery.toLowerCase().trim();
    return forwardLots.filter((lot) =>
      [lot.auctionNumber, lot.title, lot.department, lot.locationYard]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [forwardLots, searchQuery]);

  if (selectedRa) {
    return <ReverseAuctionScreen auction={selectedRa} onBack={() => setSelectedRa(null)} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topSection}>
        <SegmentedTabs
          options={['Live Reverse', 'Forward e-Scrap']}
          selected={activeTab}
          onSelect={(tab) => setActiveTab(tab as TabMode)}
          counts={{ 'Live Reverse': reverseAuctions.length, 'Forward e-Scrap': forwardLots.length }}
          style={{ marginBottom: 12 }}
        />
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search auction ID, item or department"
        />
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
              <Text style={styles.emptyEmoji}>📡</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Public auction feed unavailable</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Check your internet connection and try again. No demo auction data is shown.</Text>
              <PrimaryButton label="Retry connection" onPress={loadLiveAuctions} style={{ marginTop: 14 }} />
            </View>
          ) : filteredReverseAuctions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>⚡</Text>
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
                <Text style={[styles.deptText, { color: colors.textSecondary }]} numberOfLines={2}>{ra.department} • {ra.buyerOrganization}</Text>
                <View style={[styles.metaGrid, { backgroundColor: colors.surfaceSubtle }]}>
                  <View style={styles.metaCol}>
                    <Text style={[styles.metaLabel, { color: colors.textMuted }]}>PUBLIC SOURCE</Text>
                    <Text style={[styles.metaValue, { color: colors.primary }]}>GeM live feed</Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={[styles.metaLabel, { color: colors.textMuted }]}>QUANTITY</Text>
                    <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{ra.publishedQuantity && ra.totalQuantity !== undefined ? ra.totalQuantity.toLocaleString() : 'Not published'}</Text>
                  </View>
                </View>
                <PrimaryButton label="Review public auction" onPress={() => setSelectedRa(ra)} style={{ marginTop: 10 }} />
              </View>
            ))
          )
        )}

        {activeTab === 'Forward e-Scrap' && (
          filteredForwardLots.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>↗</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No public forward-auction records loaded</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>This app does not seed auction lots or simulate bid placement. Use the official portal for current lots and authenticated bidding.</Text>
              <SecondaryButton label="Open official forward auctions ↗" onPress={() => Linking.openURL('https://forwardauction.gem.gov.in')} style={{ marginTop: 14 }} />
            </View>
          ) : (
            filteredForwardLots.map((lot) => (
              <View key={lot.id} style={[styles.auctionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardHeaderRow}>
                  <StatusBadge label={lot.category} tone="orange" />
                  <Text style={[styles.auctionNumber, { color: colors.textSecondary }]}>{lot.auctionNumber}</Text>
                </View>
                <Text style={[styles.auctionTitle, { color: colors.textPrimary, fontSize: 14 * fontMultiplier }]} numberOfLines={2}>{lot.title}</Text>
                <Text style={[styles.deptText, { color: colors.textSecondary }]} numberOfLines={2}>Location: {lot.locationYard} • {lot.department}</Text>
                <Text style={[styles.publicNote, { color: colors.textSecondary }]}>Prices, rank, and bid placement are available only in the official authenticated auction session.</Text>
                <SecondaryButton label="Open official portal ↗" onPress={() => Linking.openURL('https://forwardauction.gem.gov.in')} style={{ marginTop: 10 }} />
              </View>
            ))
          )
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topSection: { padding: DESIGN_TOKENS.pagePaddingMobile, paddingBottom: 8 },
  listContent: { padding: DESIGN_TOKENS.pagePaddingMobile, paddingTop: 4, paddingBottom: 40 },
  auctionCard: { borderRadius: DESIGN_TOKENS.cardRadius, borderWidth: DESIGN_TOKENS.borderWidth, padding: 14, marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  auctionNumber: { fontSize: 12, fontWeight: '600' },
  closingText: { fontSize: 11, fontWeight: '700' },
  auctionTitle: { fontWeight: '700', marginBottom: 4, lineHeight: 18 },
  deptText: { fontSize: 12, marginBottom: 10 },
  metaGrid: { flexDirection: 'row', borderRadius: 8, padding: 10, marginBottom: 8, justifyContent: 'space-between' },
  metaCol: { flex: 1 },
  metaLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4, marginBottom: 2 },
  metaValue: { fontSize: 13, fontWeight: '700' },
  publicNote: { fontSize: 12, lineHeight: 17 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', maxWidth: 300, lineHeight: 18 },
});
