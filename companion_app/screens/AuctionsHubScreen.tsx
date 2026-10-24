import React, { useState, useEffect } from 'react';
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
import { PortalApiClient } from '../services/PortalApiClient';
import { ReverseAuctionScreen } from './ReverseAuctionScreen';

type AuctionMode = 'REVERSE' | 'FORWARD';

export const AuctionsHubScreen: React.FC = () => {
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
      {/* Top Segmented Mode Selector (PhonePe White/Purple Style) */}
      <View style={styles.segmentedBar}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeMode === 'REVERSE' && styles.segmentActive]}
          onPress={() => setActiveMode('REVERSE')}
        >
          <Text style={[styles.segmentText, activeMode === 'REVERSE' && styles.segmentTextActive]}>
            ⚡ Live Reverse Auctions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeMode === 'FORWARD' && styles.segmentActive]}
          onPress={() => setActiveMode('FORWARD')}
        >
          <Text style={[styles.segmentText, activeMode === 'FORWARD' && styles.segmentTextActive]}>
            ♻ Forward e-Scrap Lots
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

                {/* Quick 1-Tap Bid Button */}
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  segmentedBar: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  segmentActive: {
    backgroundColor: '#F3E8FF',
    borderColor: '#5F259F',
  },
  segmentText: { color: '#6B7280', fontSize: 12, fontWeight: '700' },
  segmentTextActive: { color: '#5F259F', fontWeight: '800' },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  forwardBanner: {
    backgroundColor: '#F3E8FF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  bannerTag: { color: '#5F259F', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  bannerTitle: { color: '#111827', fontSize: 15, fontWeight: '800', marginBottom: 2 },
  bannerSubtitle: { color: '#4B5563', fontSize: 12, lineHeight: 16 },
  lotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  lotHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catPill: { backgroundColor: '#F3E8FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  catText: { color: '#5F259F', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  lotTimeTag: { color: '#D97706', fontSize: 11, fontWeight: '700' },
  lotNumber: { color: '#6B7280', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  lotTitle: { color: '#111827', fontSize: 14, fontWeight: '700', lineHeight: 19, marginBottom: 4 },
  lotDept: { color: '#4B5563', fontSize: 12, marginBottom: 10 },
  yardBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  yardIcon: { fontSize: 12, marginRight: 6, marginTop: 1 },
  yardText: { color: '#4B5563', fontSize: 11, flex: 1, lineHeight: 15 },
  priceRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  priceCell: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  priceLabel: { color: '#6B7280', fontSize: 10, fontWeight: '600', marginBottom: 2 },
  reserveVal: { color: '#6B7280', fontSize: 13, fontWeight: '700' },
  highestVal: { color: '#00C853', fontSize: 15, fontWeight: '900' },
  bidIncrementBtn: {
    minHeight: 46,
    backgroundColor: '#5F259F',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  bidIncrementBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', textAlign: 'center' },
});
