/**
 * GeM Auctions Hub Screen - High-Performance Live Auctions & Forward Auctions
 * Conforms to Screen 4 of the GeM Mobile UI Specification:
 * - SegmentedTabs: Live reverse auctions, Forward auctions, Closed
 * - SearchField: "Search auction ID, item or department"
 * - Compact auction cards with live decrement indicators
 * - Seamless detail transition into ReverseAuctionScreen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  Linking,
  Pressable,
  BackHandler,
} from 'react-native';
import type { ForwardAuctionLot, AuctionItem } from '../types/index';
import { MOCK_FORWARD_AUCTIONS } from '../fixtures/mockData';
import { PortalApiClient } from '../services/PortalApiClient';
import { ReverseAuctionScreen } from './ReverseAuctionScreen';
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import {
  SearchField,
  SegmentedTabs,
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
} from '../components/SharedUI';
import { formatInr } from '../utils/formatters';

type TabMode = 'Live Reverse' | 'Forward e-Scrap' | 'Closed';

const SAMPLE_REVERSE_AUCTIONS = [
  {
    id: 'ra-45102',
    contractNumber: 'GEM/2026/RA/45102',
    originalBidNumber: 'GEM/2026/B/890456',
    title: 'Supply of High-End Desktop Computers and Workstations',
    category: 'IT & Telecommunications',
    department: 'Department of Revenue',
    buyerOrganization: 'Ministry of Finance, New Delhi',
    totalQuantity: 120,
    closingTimeUtc: '2026-10-28T14:30:00Z',
    closingDateLabel: '14:30 IST (Ends in 3h 12m)',
    currentLowestBid: 3850000,
    sellerRank: 2,
    sellerCurrentBid: 3920000,
    minimumDecrement: 10000,
    autoExtensionMinutes: 10,
    isExtended: false,
  },
  {
    id: 'ra-99202',
    contractNumber: 'GEM/2026/RA/99202',
    originalBidNumber: 'GEM/2026/B/890123',
    title: 'Supply and Commissioning of 40W Solar LED Street Lighting Systems',
    category: 'Solar & Renewable Energy',
    department: 'Department of Rural Development',
    buyerOrganization: 'Ministry of Rural Development',
    totalQuantity: 250,
    closingTimeUtc: '2026-10-28T17:00:00Z',
    closingDateLabel: '17:00 IST (Ends in 5h 42m)',
    currentLowestBid: 2650000,
    sellerRank: 1,
    sellerCurrentBid: 2650000,
    minimumDecrement: 20000,
    autoExtensionMinutes: 10,
    isExtended: false,
  },
  {
    id: 'ra-99203',
    contractNumber: 'GEM/2026/RA/99203',
    originalBidNumber: 'GEM/2026/B/890789',
    title: 'High-Tensile Structural Hex Bolts and Fasteners (M24 Grade 8.8)',
    category: 'Heavy Engineering & Fasteners',
    department: 'Bharat Dynamics Limited',
    buyerOrganization: 'Ministry of Defence',
    totalQuantity: 50000,
    closingTimeUtc: '2026-10-29T14:30:00Z',
    closingDateLabel: 'Tomorrow, 14:30 IST',
    currentLowestBid: 1420000,
    sellerRank: 3,
    sellerCurrentBid: 1480000,
    minimumDecrement: 10000,
    autoExtensionMinutes: 10,
    isExtended: false,
  },
];

export const AuctionsHubScreen: React.FC = () => {
  const { colors, fontMultiplier } = useTheme();

  const [activeTab, setActiveTab] = useState<TabMode>('Live Reverse');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [forwardLots, setForwardLots] = useState<ForwardAuctionLot[]>(MOCK_FORWARD_AUCTIONS);
  const [selectedRa, setSelectedRa] = useState<typeof SAMPLE_REVERSE_AUCTIONS[0] | null>(null);

  useEffect(() => {
    PortalApiClient.getForwardAuctions()
      .then((lots) => {
        if (lots && lots.length > 0) setForwardLots(lots);
      })
      .catch(() => {});
  }, []);

  // BackHandler to exit reverse auction room back to catalog instead of closing app
  useEffect(() => {
    if (!selectedRa) return;

    const onBackPress = () => {
      setSelectedRa(null);
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [selectedRa]);

  const handleIncrementForwardBid = (lotId: string) => {
    setForwardLots((prev) =>
      prev.map((lot) => {
        if (lot.id === lotId) {
          const nextBid = lot.currentHighestBidInr + lot.minimumIncrementInr;
          Alert.alert(
            'Forward Bid Placed',
            `Submitted bid of ₹${formatInr(nextBid)} on ${lot.auctionNumber}. You are now the highest bidder.`
          );
          return { ...lot, currentHighestBidInr: nextBid };
        }
        return lot;
      })
    );
  };

  // If user selected a specific reverse auction, render the full Screen 4 detail
  if (selectedRa) {
    return (
      <ReverseAuctionScreen
        auction={selectedRa}
        onBack={() => setSelectedRa(null)}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Controls */}
      <View style={styles.topSection}>
        <SegmentedTabs
          options={['Live Reverse', 'Forward e-Scrap', 'Closed']}
          selected={activeTab}
          onSelect={(tab) => setActiveTab(tab as TabMode)}
          counts={{ 'Live Reverse': SAMPLE_REVERSE_AUCTIONS.length, 'Forward e-Scrap': forwardLots.length, Closed: 18 }}
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
      >
        {activeTab === 'Live Reverse' && (
          <View>
            {SAMPLE_REVERSE_AUCTIONS.map((ra) => (
              <View
                key={ra.id}
                style={[
                  styles.auctionCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <StatusBadge label="LIVE RA" tone="success" dot />
                  <Text style={[styles.auctionNumber, { color: colors.textSecondary }]}>
                    {ra.contractNumber}
                  </Text>
                  <Text style={[styles.closingText, { color: colors.warning }]}>
                    {ra.closingDateLabel}
                  </Text>
                </View>

                <Text
                  style={[styles.auctionTitle, { color: colors.textPrimary, fontSize: 14 * fontMultiplier }]}
                  numberOfLines={2}
                >
                  {ra.title}
                </Text>

                <Text style={[styles.deptText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {ra.department}
                </Text>

                <View style={[styles.metaGrid, { backgroundColor: colors.surfaceSubtle }]}>
                  <View style={styles.metaCol}>
                    <Text style={[styles.metaLabel, { color: colors.textMuted }]}>CURRENT LOWEST (L1)</Text>
                    <Text style={[styles.metaValue, { color: colors.primary }]}>
                      {formatInr(ra.currentLowestBid)}
                    </Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={[styles.metaLabel, { color: colors.textMuted }]}>MIN DECREMENT</Text>
                    <Text style={[styles.metaValue, { color: colors.textPrimary }]}>
                      ₹{formatInr(ra.minimumDecrement)}
                    </Text>
                  </View>
                </View>

                <PrimaryButton
                  label="Enter Decrement Room"
                  onPress={() => setSelectedRa(ra)}
                  style={{ marginTop: 10 }}
                />
              </View>
            ))}
          </View>
        )}

        {activeTab === 'Forward e-Scrap' && (
          <View>
            <View style={[styles.infoBanner, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
                🏛️ Official GeM Forward e-Auctions for condemned vehicles, obsolete electronics, and surplus scrap materials.
              </Text>
            </View>

            {forwardLots.map((lot) => (
              <View
                key={lot.id}
                style={[
                  styles.auctionCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <StatusBadge label={lot.category} tone="orange" />
                  <Text style={[styles.auctionNumber, { color: colors.textSecondary }]}>
                    {lot.auctionNumber}
                  </Text>
                </View>

                <Text
                  style={[styles.auctionTitle, { color: colors.textPrimary, fontSize: 14 * fontMultiplier }]}
                  numberOfLines={2}
                >
                  {lot.title}
                </Text>

                <Text style={[styles.deptText, { color: colors.textSecondary }]} numberOfLines={1}>
                  Location: {lot.locationYard} • {lot.department}
                </Text>

                <View style={[styles.metaGrid, { backgroundColor: colors.surfaceSubtle }]}>
                  <View style={styles.metaCol}>
                    <Text style={[styles.metaLabel, { color: colors.textMuted }]}>CURRENT HIGHEST BID</Text>
                    <Text style={[styles.metaValue, { color: colors.emerald }]}>
                      {formatInr(lot.currentHighestBidInr)}
                    </Text>
                  </View>
                  <View style={styles.metaCol}>
                    <Text style={[styles.metaLabel, { color: colors.textMuted }]}>MIN INCREMENT</Text>
                    <Text style={[styles.metaValue, { color: colors.textPrimary }]}>
                      +₹{formatInr(lot.minimumIncrementInr)}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardActionsRow}>
                  <SecondaryButton
                    label="Official Portal ↗"
                    onPress={() => Linking.openURL('https://forwardauction.gem.gov.in')}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <PrimaryButton
                    label={`Bid +₹${formatInr(lot.minimumIncrementInr)}`}
                    onPress={() => handleIncrementForwardBid(lot.id)}
                    style={{ flex: 1.4 }}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'Closed' && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📜</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Historical Auction Archives</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              All completed reverse and forward auctions with finalized L1 commercial comparative statements are archived.
            </Text>
          </View>
        )}
      </ScrollView>
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
  listContent: {
    padding: DESIGN_TOKENS.pagePaddingMobile,
    paddingTop: 4,
    paddingBottom: 40,
  },
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
  },
  auctionNumber: {
    fontSize: 12,
    fontWeight: '600',
  },
  closingText: {
    fontSize: 11,
    fontWeight: '700',
  },
  auctionTitle: {
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 18,
  },
  deptText: {
    fontSize: 12,
    marginBottom: 10,
  },
  metaGrid: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  infoBanner: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  infoBannerText: {
    fontSize: 12,
    lineHeight: 16,
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
    lineHeight: 18,
  },
});
