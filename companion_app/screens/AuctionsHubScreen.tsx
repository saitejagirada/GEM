import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import type { ForwardAuctionLot } from '../types/index';
import { MOCK_FORWARD_AUCTIONS } from '../fixtures/mockData';
import { ReverseAuctionScreen } from './ReverseAuctionScreen';

type AuctionMode = 'REVERSE' | 'FORWARD';

export const AuctionsHubScreen: React.FC = () => {
  const [activeMode, setActiveMode] = useState<AuctionMode>('REVERSE');
  const [forwardLots, setForwardLots] = useState<ForwardAuctionLot[]>(MOCK_FORWARD_AUCTIONS);

  const handleIncrementForwardBid = (lotId: string) => {
    setForwardLots((prev) =>
      prev.map((lot) => {
        if (lot.id === lotId) {
          const nextBid = lot.currentHighestBidInr + lot.minimumIncrementInr;
          Alert.alert(
            'Forward Bid Placed',
            `Submitted bid of ₹${nextBid.toLocaleString('en-IN')} on ${lot.auctionNumber}. You are the highest bidder.`
          );
          return { ...lot, currentHighestBidInr: nextBid };
        }
        return lot;
      })
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Segmented Mode Selector (Min 48dp touch bounds) */}
      <View style={styles.segmentedBar}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeMode === 'REVERSE' && styles.segmentActive]}
          onPress={() => setActiveMode('REVERSE')}
        >
          <Text style={[styles.segmentText, activeMode === 'REVERSE' && styles.segmentTextActive]}>
            ⚡ Reverse Auctions (RA)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeMode === 'FORWARD' && styles.segmentActive]}
          onPress={() => setActiveMode('FORWARD')}
        >
          <Text style={[styles.segmentText, activeMode === 'FORWARD' && styles.segmentTextActive]}>
            ♻ Forward Auctions (e-Scrap)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Screen Body */}
      {activeMode === 'REVERSE' ? (
        <ReverseAuctionScreen />
      ) : (
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          {/* Forward Auction Info Banner */}
          <View style={styles.forwardBanner}>
            <Text style={styles.bannerTag}>GOVERNMENT SURPLUS ASSETS &amp; E-SCRAP</Text>
            <Text style={styles.bannerTitle}>forwardauction.gem.gov.in Live Lots</Text>
            <Text style={styles.bannerSubtitle}>
              Direct bidding on decommissioned defense machinery, railway scrap &amp; public sector vehicles.
            </Text>
          </View>

          {/* Forward Lots List */}
          {forwardLots.map((lot) => {
            const closingDate = new Date(lot.closingTimeUtc);
            const hoursLeft = Math.max(
              0,
              Math.round((closingDate.getTime() - Date.now()) / (3600 * 1000))
            );

            return (
              <View key={lot.id} style={styles.lotCard}>
                {/* Header Row */}
                <View style={styles.lotHeaderRow}>
                  <View style={styles.catPill}>
                    <Text style={styles.catText}>{lot.category.replace('_', ' ')}</Text>
                  </View>
                  <Text style={styles.lotTimeTag}>⏳ {hoursLeft}h left</Text>
                </View>

                {/* Title & Lot ID */}
                <Text style={styles.lotNumber}>{lot.auctionNumber}</Text>
                <Text style={styles.lotTitle}>{lot.title}</Text>
                <Text style={styles.lotDept}>{lot.department}</Text>

                {/* Yard Location */}
                <View style={styles.yardBox}>
                  <Text style={styles.yardIcon}>📍</Text>
                  <Text style={styles.yardText}>{lot.locationYard}</Text>
                </View>

                {/* Price Board */}
                <View style={styles.priceRow}>
                  <View style={styles.priceCell}>
                    <Text style={styles.priceLabel}>Reserve Price</Text>
                    <Text style={styles.reserveVal}>₹{lot.reservePriceInr.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.priceCell}>
                    <Text style={styles.priceLabel}>Current Highest Bid</Text>
                    <Text style={styles.highestVal}>₹{lot.currentHighestBidInr.toLocaleString('en-IN')}</Text>
                  </View>
                </View>

                {/* Quick 1-Tap Bid Button (Min 48dp) */}
                <TouchableOpacity
                  style={styles.bidIncrementBtn}
                  onPress={() => handleIncrementForwardBid(lot.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.bidIncrementBtnText}>
                    Raise Bid (+₹{lot.minimumIncrementInr.toLocaleString('en-IN')}) → Next: ₹
                    {(lot.currentHighestBidInr + lot.minimumIncrementInr).toLocaleString('en-IN')}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B132B' },
  segmentedBar: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  segmentActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3B82F6',
  },
  segmentText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  segmentTextActive: { color: '#60A5FA', fontWeight: '900' },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  forwardBanner: {
    backgroundColor: '#162032',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  bannerTag: { color: '#38BDF8', fontSize: 10, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
  bannerTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '800', marginBottom: 2 },
  bannerSubtitle: { color: '#94A3B8', fontSize: 12, lineHeight: 16 },
  lotCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  lotHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catPill: { backgroundColor: 'rgba(56, 189, 248, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  catText: { color: '#38BDF8', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  lotTimeTag: { color: '#F59E0B', fontSize: 11, fontWeight: '700' },
  lotNumber: { color: '#64748B', fontSize: 11, fontWeight: '700', marginBottom: 2 },
  lotTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '800', lineHeight: 20, marginBottom: 4 },
  lotDept: { color: '#CBD5E1', fontSize: 12, marginBottom: 10 },
  yardBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  yardIcon: { fontSize: 12, marginRight: 6, marginTop: 1 },
  yardText: { color: '#94A3B8', fontSize: 11, flex: 1, lineHeight: 15 },
  priceRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  priceCell: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  priceLabel: { color: '#64748B', fontSize: 10, fontWeight: '700', marginBottom: 2 },
  reserveVal: { color: '#94A3B8', fontSize: 14, fontWeight: '700' },
  highestVal: { color: '#00D09C', fontSize: 16, fontWeight: '900' },
  bidIncrementBtn: {
    minHeight: 48,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  bidIncrementBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', textAlign: 'center' },
});
