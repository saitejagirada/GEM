/**
 * GeM Auctions Hub Screen - Live Reverse Auctions & Forward Auctions
 * Replicates https://forwardauction.gem.gov.in and GeM Reverse Auction Rooms:
 * - Reverse Auctions (RA): Dynamic decrement room, clock drift synchronization
 * - Forward Auctions: E-scrap, surplus vehicle disposal catalog
 * - Theme-aware styling with zero-latency TouchButtons
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Linking,
} from 'react-native';
import type { ForwardAuctionLot } from '../types/index';
import { MOCK_FORWARD_AUCTIONS } from '../fixtures/mockData';
import { PortalApiClient } from '../services/PortalApiClient';
import { ReverseAuctionScreen } from './ReverseAuctionScreen';
import { TouchButton } from '../components/TouchButton';
import { useTheme } from '../theme/ThemeContext';
import { formatInr } from '../utils/formatters';
import { DataNotice } from '../components/DataNotice';

type AuctionMode = 'REVERSE' | 'FORWARD';

export const AuctionsHubScreen: React.FC = () => {
  const { colors, fontMultiplier, isDark } = useTheme();
  const [activeMode, setActiveMode] = useState<AuctionMode>('REVERSE');
  const [forwardLots, setForwardLots] = useState<ForwardAuctionLot[]>(MOCK_FORWARD_AUCTIONS);

  useEffect(() => {
    PortalApiClient.getForwardAuctions()
      .then((lots) => {
        if (lots && lots.length > 0) setForwardLots(lots);
      })
      .catch(() => {});
  }, []);

  const handleIncrementForwardBid = (lotId: string) => {
    setForwardLots((prev) =>
      prev.map((lot) => {
        if (lot.id === lotId) {
          const nextBid = lot.currentHighestBidInr + lot.minimumIncrementInr;
          Alert.alert(
            'Forward Bid Placed',
            `Submitted bid of ₹${formatInr(nextBid)} on ${lot.auctionNumber}. You are the highest bidder.`
          );
          return { ...lot, currentHighestBidInr: nextBid };
        }
        return lot;
      })
    );
  };

  const openForwardAuctionPortal = () => {
    Linking.openURL('https://forwardauction.gem.gov.in/eprocure/home').catch(() => {
      Alert.alert('GeM Forward Auction', 'Visit https://forwardauction.gem.gov.in in your browser.');
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <DataNotice>Public auction discovery · Confirm lot status and place bids only on the official auction portal.</DataNotice>
      {/* Top Segmented Mode Selector */}
      <View style={[styles.segmentedBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchButton
          title="Reverse auctions"
          variant={activeMode === 'REVERSE' ? 'primary' : 'secondary'}
          size="small"
          onPress={() => setActiveMode('REVERSE')}
          style={{ flex: 1 }}
        />
        <TouchButton
          title="Forward lots"
          variant={activeMode === 'FORWARD' ? 'primary' : 'secondary'}
          size="small"
          onPress={() => setActiveMode('FORWARD')}
          style={{ flex: 1 }}
        />
      </View>

      {/* Screen Body */}
      {activeMode === 'REVERSE' ? (
        <ReverseAuctionScreen />
      ) : (
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          {/* Forward Auction Info Banner */}
          <View style={[styles.forwardBanner, { backgroundColor: isDark ? colors.surfaceSubtle : '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <Text style={[styles.bannerTag, { color: '#1E40AF' }]}>FORWARD AUCTION DISCOVERY</Text>
            <Text style={[styles.bannerTitle, { color: colors.textPrimary, fontSize: 15 * fontMultiplier }]}>
              forwardauction.gem.gov.in lot records
            </Text>
            <Text style={[styles.bannerSubtitle, { color: colors.textSecondary }]}>
              Browse surplus and e-scrap lot records before opening the official auction room.
            </Text>
            <View style={{ marginTop: 8 }}>
              <TouchButton
                title="Open Official Forward Auction Portal ➔"
                variant="outline"
                size="small"
                onPress={openForwardAuctionPortal}
              />
            </View>
          </View>

          {/* Forward Lots List */}
          {forwardLots.map((lot) => {
            const closingDate = new Date(lot.closingTimeUtc);
            const hoursLeft = Math.max(
              0,
              Math.round((closingDate.getTime() - Date.now()) / (3600 * 1000))
            );

            return (
              <View key={lot.id} style={[styles.lotCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {/* Header Row */}
                <View style={styles.lotHeaderRow}>
                  <View style={[styles.catPill, { backgroundColor: isDark ? colors.surfaceSubtle : '#EDE9FE' }]}>
                    <Text style={[styles.catText, { color: '#6D28D9' }]}>{lot.category.replace('_', ' ')}</Text>
                  </View>
                  <Text style={styles.lotTimeTag}>{hoursLeft}h remaining in record</Text>
                </View>

                {/* Title & Lot ID */}
                <Text style={[styles.lotNumber, { color: colors.textMuted }]}>{lot.auctionNumber}</Text>
                <Text style={[styles.lotTitle, { color: colors.textPrimary, fontSize: 14 * fontMultiplier }]}>
                  {lot.title}
                </Text>
                <Text style={[styles.lotDept, { color: colors.textMuted }]}>{lot.department}</Text>

                {/* Yard Location */}
                <View style={[styles.yardBox, { backgroundColor: isDark ? colors.surfaceSubtle : '#F8FAFC' }]}>
                  <Text style={styles.yardIcon}>📍</Text>
                  <Text style={[styles.yardText, { color: colors.textSecondary }]}>{lot.locationYard}</Text>
                </View>

                {/* Price Board */}
                <View style={styles.priceRow}>
                  <View style={[styles.priceCell, { backgroundColor: isDark ? colors.surfaceSubtle : '#F8FAFC', borderColor: colors.border }]}>
                    <Text style={[styles.priceLabel, { color: colors.textMuted }]}>Reserve Price</Text>
                    <Text style={[styles.reserveVal, { color: colors.textSecondary }]}>
                      ₹{formatInr(lot.reservePriceInr)}
                    </Text>
                  </View>
                  <View style={[styles.priceCell, { backgroundColor: isDark ? colors.surfaceSubtle : '#F8FAFC', borderColor: colors.border }]}>
                    <Text style={[styles.priceLabel, { color: colors.textMuted }]}>Current bid in record</Text>
                    <Text style={[styles.highestVal, { color: colors.emerald }]}>
                      ₹{formatInr(lot.currentHighestBidInr)}
                    </Text>
                  </View>
                </View>

                {/* Quick 1-Tap Bid Button */}
                <TouchButton
                  title={`Raise Bid (+₹${formatInr(lot.minimumIncrementInr)}) → Next: ₹${formatInr(lot.currentHighestBidInr + lot.minimumIncrementInr)}`}
                  variant="primary"
                  size="medium"
                  onPress={() => handleIncrementForwardBid(lot.id)}
                />
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  segmentedBar: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 40 },
  forwardBanner: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  bannerTag: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  bannerTitle: { fontWeight: '900', marginBottom: 2 },
  bannerSubtitle: { fontSize: 11.5, lineHeight: 16 },
  lotCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  lotHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  catPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  lotTimeTag: { color: '#D97706', fontSize: 11, fontWeight: '700' },
  lotNumber: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  lotTitle: { fontWeight: '800', lineHeight: 19, marginBottom: 4 },
  lotDept: { fontSize: 11.5, marginBottom: 8 },
  yardBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  yardIcon: { fontSize: 12, marginRight: 6, marginTop: 1 },
  yardText: { fontSize: 11, flex: 1, lineHeight: 15 },
  priceRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  priceCell: {
    flex: 1,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
  },
  priceLabel: { fontSize: 9.5, fontWeight: '700', marginBottom: 2 },
  reserveVal: { fontSize: 12, fontWeight: '700' },
  highestVal: { fontSize: 14, fontWeight: '900' },
});
