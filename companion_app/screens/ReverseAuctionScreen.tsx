import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import type { AuctionItem } from '../types/index.ts';

export const ReverseAuctionScreen: React.FC = () => {
  const [auction, setAuction] = useState<AuctionItem>({
    id: 'auc-7788',
    contractNumber: 'GEM-2026-RA-99201',
    title: 'High-Density Rugged Tactical Routers',
    category: 'Network & Telecommunications',
    buyerOrganization: 'Border Security Force (BSF)',
    closingTimeUtc: new Date(Date.now() + 180000).toISOString(), // 3 mins remaining
    currentLowestBid: 3850000,
    sellerRank: 2,
    sellerCurrentBid: 3900000,
    minimumDecrement: 25000,
    autoExtensionMinutes: 5,
    isExtended: false,
  });

  const [remainingSeconds, setRemainingSeconds] = useState<number>(180);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [bidHistory, setBidHistory] = useState<{ price: number; rank: number; time: string }[]>([
    { price: 3900000, rank: 2, time: '12:20:15' },
    { price: 4100000, rank: 2, time: '12:15:00' },
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleQuickBid = (decrementAmount: number) => {
    const nextBid = auction.currentLowestBid - decrementAmount;
    setSubmitting(true);

    setTimeout(() => {
      setAuction((prev) => ({
        ...prev,
        currentLowestBid: nextBid,
        sellerCurrentBid: nextBid,
        sellerRank: 1, // Becomes L1
        isExtended: remainingSeconds < 300,
      }));

      setBidHistory((prev) => [
        { price: nextBid, rank: 1, time: new Date().toLocaleTimeString() },
        ...prev,
      ]);

      setSubmitting(false);
      Alert.alert('Bid Submitted', `Biometric counter-bid of ₹${nextBid.toLocaleString('en-IN')} accepted! You are now L1.`);
    }, 600);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info Card */}
      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <Text style={styles.categoryBadge}>{auction.category}</Text>
          <View style={[styles.statusBadge, auction.sellerRank === 1 ? styles.badgeL1 : styles.badgeL2]}>
            <Text style={styles.badgeText}>{auction.sellerRank === 1 ? '★ YOU ARE L1' : 'RANK L2'}</Text>
          </View>
        </View>

        <Text style={styles.auctionTitle}>{auction.title}</Text>
        <Text style={styles.buyerText}>Buyer: {auction.buyerOrganization}</Text>
        <Text style={styles.contractText}>PO Ref: {auction.contractNumber}</Text>
      </View>

      {/* Live Timer Banner */}
      <View style={[styles.timerBanner, remainingSeconds < 120 && styles.timerUrgent]}>
        <Text style={styles.timerLabel}>CLOSING COUNTDOWN</Text>
        <Text style={styles.timerDigits}>{formatTimer(remainingSeconds)}</Text>
        {auction.isExtended && (
          <Text style={styles.extendedNotice}>⚡ Auto-Extension (+5 mins) Active</Text>
        )}
      </View>

      {/* Price Board */}
      <View style={styles.priceRow}>
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Current L1 Price</Text>
          <Text style={styles.priceValueL1}>₹{auction.currentLowestBid.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Your Last Bid</Text>
          <Text style={styles.priceValueMine}>₹{auction.sellerCurrentBid?.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {/* 1-Tap Biometric Counter-Bid Actions */}
      <View style={styles.actionSection}>
        <Text style={styles.sectionHeader}>Instant Counter-Bid (Biometric Auth)</Text>
        <Text style={styles.hintText}>Min Decrement: ₹{auction.minimumDecrement.toLocaleString('en-IN')}</Text>

        <View style={styles.bidButtonRow}>
          <TouchableOpacity
            style={[styles.bidButton, styles.bidBtnStandard]}
            onPress={() => handleQuickBid(25000)}
            disabled={submitting}
          >
            <Text style={styles.bidBtnSubtitle}>Decrement Min</Text>
            <Text style={styles.bidBtnTitle}>-₹25,000</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bidButton, styles.bidBtnAggressive]}
            onPress={() => handleQuickBid(50000)}
            disabled={submitting}
          >
            <Text style={styles.bidBtnSubtitle}>Aggressive</Text>
            <Text style={styles.bidBtnTitle}>-₹50,000</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Audit History Log */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Bid Audit History</Text>
        {bidHistory.map((b, idx) => (
          <View key={idx} style={styles.historyRow}>
            <Text style={styles.historyTime}>{b.time}</Text>
            <Text style={styles.historyPrice}>₹{b.price.toLocaleString('en-IN')}</Text>
            <Text style={[styles.historyRank, b.rank === 1 ? styles.textL1 : styles.textL2]}>
              Rank L{b.rank}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B132B' },
  content: { padding: 16 },
  card: { backgroundColor: '#1C2541', borderRadius: 12, padding: 16, marginBottom: 16 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryBadge: { color: '#6FFFE9', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeL1: { backgroundColor: '#10B981' },
  badgeL2: { backgroundColor: '#F59E0B' },
  badgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  auctionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  buyerText: { color: '#94A3B8', fontSize: 14, marginBottom: 2 },
  contractText: { color: '#64748B', fontSize: 12 },
  timerBanner: { backgroundColor: '#3A506B', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  timerUrgent: { backgroundColor: '#EF4444' },
  timerLabel: { color: '#E2E8F0', fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  timerDigits: { color: '#FFFFFF', fontSize: 36, fontWeight: '900', marginVertical: 4 },
  extendedNotice: { color: '#FEF08A', fontSize: 12, fontWeight: '700' },
  priceRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  priceCard: { flex: 1, backgroundColor: '#1C2541', borderRadius: 12, padding: 14, alignItems: 'center' },
  priceLabel: { color: '#94A3B8', fontSize: 12, marginBottom: 4 },
  priceValueL1: { color: '#10B981', fontSize: 20, fontWeight: '800' },
  priceValueMine: { color: '#F1F5F9', fontSize: 18, fontWeight: '700' },
  actionSection: { marginBottom: 16 },
  sectionHeader: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  hintText: { color: '#94A3B8', fontSize: 12, marginBottom: 12 },
  bidButtonRow: { flexDirection: 'row', gap: 12 },
  bidButton: { flex: 1, minHeight: 56, borderRadius: 10, justifyContent: 'center', alignItems: 'center', padding: 8 },
  bidBtnStandard: { backgroundColor: '#2563EB' },
  bidBtnAggressive: { backgroundColor: '#059669' },
  bidBtnSubtitle: { color: '#E2E8F0', fontSize: 11, fontWeight: '600' },
  bidBtnTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#334155' },
  historyTime: { color: '#94A3B8', fontSize: 13 },
  historyPrice: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  historyRank: { fontWeight: '700', fontSize: 13 },
  textL1: { color: '#10B981' },
  textL2: { color: '#F59E0B' },
});
