import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Vibration,
  Animated,
} from 'react-native';
import type { AuctionItem } from '../types/index';

export const ReverseAuctionScreen: React.FC = () => {
  const [auction, setAuction] = useState<AuctionItem>({
    id: 'auc-7788',
    contractNumber: 'GEM-2026-RA-99201',
    title: 'High-Density Rugged Tactical Routers (MIL-STD-810G)',
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

  // Animated urgency pulse for countdown
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Countdown timer
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

  // Pulse animation when time is urgent (< 120s)
  useEffect(() => {
    if (remainingSeconds < 120 && remainingSeconds > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.04,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [remainingSeconds < 120]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const executeBid = (decrementAmount: number) => {
    const nextBid = auction.currentLowestBid - decrementAmount;
    setSubmitting(true);

    // Haptic feedback for bid confirmation
    try {
      Vibration.vibrate([0, 60, 40, 100]);
    } catch {
      // safe fallback if vibration unavailable on platform
    }

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
      Alert.alert(
        'Bid Accepted (L1 Secured)',
        `Counter-bid of ₹${nextBid.toLocaleString('en-IN')} submitted successfully! You are now L1.`
      );
    }, 500);
  };

  const handleQuickBid = (decrementAmount: number, label: string) => {
    const targetBid = auction.currentLowestBid - decrementAmount;
    Alert.alert(
      'Confirm Counter-Bid Submission',
      `Submit biometric bid of ₹${targetBid.toLocaleString('en-IN')} (${label}) to claim Rank L1?\n\nThis action cannot be undone under GeM RA rules.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Submit ₹${targetBid.toLocaleString('en-IN')}`,
          style: 'default',
          onPress: () => executeBid(decrementAmount),
        },
      ]
    );
  };

  const gapToL1 = (auction.sellerCurrentBid || 0) - auction.currentLowestBid;

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

      {/* Live Timer Banner with Urgency Pulse */}
      <Animated.View
        style={[
          styles.timerBanner,
          remainingSeconds < 120 && styles.timerUrgent,
          { transform: [{ scale: remainingSeconds < 120 ? pulseAnim : 1 }] },
        ]}
      >
        <Text style={styles.timerLabel}>CLOSING COUNTDOWN</Text>
        <Text style={styles.timerDigits}>{formatTimer(remainingSeconds)}</Text>
        {auction.isExtended ? (
          <Text style={styles.extendedNotice}>⚡ Auto-Extension (+5 mins) Triggered</Text>
        ) : (
          <Text style={styles.subTimerHint}>Sub-second sync with GeM RA Engine</Text>
        )}
      </Animated.View>

      {/* Real-time Gap to L1 Ticker */}
      <View style={[styles.gapCard, auction.sellerRank === 1 ? styles.gapCardL1 : styles.gapCardLagging]}>
        <Text style={styles.gapTitle}>CURRENT COMPETITIVE STANDING</Text>
        <Text style={styles.gapAmount}>
          {auction.sellerRank === 1
            ? '✓ Leading at L1 (₹' + auction.currentLowestBid.toLocaleString('en-IN') + ')'
            : '▲ GAP TO L1: ₹' + gapToL1.toLocaleString('en-IN') + ' Behind'}
        </Text>
        <Text style={styles.gapSub}>
          {auction.sellerRank === 1
            ? 'No further action needed unless outbid.'
            : 'Decrement by at least ₹' + auction.minimumDecrement.toLocaleString('en-IN') + ' to claim L1.'}
        </Text>
      </View>

      {/* Price Board (High Contrast AAA) */}
      <View style={styles.priceRow}>
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Current L1 Price</Text>
          <Text style={styles.priceValueL1}>₹{auction.currentLowestBid.toLocaleString('en-IN')}</Text>
          <Text style={styles.priceSubLabel}>Lowest Qualified Bid</Text>
        </View>
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Your Last Bid</Text>
          <Text style={styles.priceValueMine}>₹{auction.sellerCurrentBid?.toLocaleString('en-IN')}</Text>
          <Text style={styles.priceSubLabel}>Submitted 12:20 PM</Text>
        </View>
      </View>

      {/* Glove-Safe Counter-Bid Actions (Double-Confirmed to prevent ₹50k mis-taps) */}
      <View style={styles.actionSection}>
        <Text style={styles.sectionHeader}>Instant Counter-Bid Actions</Text>
        <Text style={styles.hintText}>
          Protected against accidental taps • Requires confirmation to decrement
        </Text>

        <View style={styles.bidButtonRow}>
          <TouchableOpacity
            style={[styles.bidButton, styles.bidBtnStandard]}
            onPress={() => handleQuickBid(auction.minimumDecrement, 'Min Step')}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.bidBtnSubtitle}>Decrement Min</Text>
            <Text style={styles.bidBtnTitle}>-₹{auction.minimumDecrement.toLocaleString('en-IN')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bidButton, styles.bidBtnAggressive]}
            onPress={() => handleQuickBid(auction.minimumDecrement * 2, '2x Aggressive')}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.bidBtnSubtitle}>Aggressive (2x)</Text>
            <Text style={styles.bidBtnTitle}>-₹{(auction.minimumDecrement * 2).toLocaleString('en-IN')}</Text>
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
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: '#1E293B', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryBadge: { color: '#00D09C', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeL1: { backgroundColor: '#00D09C' },
  badgeL2: { backgroundColor: '#F59E0B' },
  badgeText: { color: '#0B132B', fontWeight: '900', fontSize: 12 },
  auctionTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '800', marginBottom: 6 },
  buyerText: { color: '#CBD5E1', fontSize: 13, marginBottom: 2 },
  contractText: { color: '#94A3B8', fontSize: 12 },
  timerBanner: { backgroundColor: '#1E293B', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 16, borderWidth: 1.5, borderColor: '#38BDF8' },
  timerUrgent: { backgroundColor: '#991B1B', borderColor: '#EF4444' },
  timerLabel: { color: '#E2E8F0', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  timerDigits: { color: '#FFFFFF', fontSize: 38, fontWeight: '900', marginVertical: 4 },
  extendedNotice: { color: '#FEF08A', fontSize: 12, fontWeight: '800' },
  subTimerHint: { color: '#94A3B8', fontSize: 11 },
  gapCard: { borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1.5 },
  gapCardLagging: { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: '#F59E0B' },
  gapCardL1: { backgroundColor: 'rgba(0, 208, 156, 0.12)', borderColor: '#00D09C' },
  gapTitle: { color: '#94A3B8', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  gapAmount: { color: '#F8FAFC', fontSize: 18, fontWeight: '900', marginVertical: 4 },
  gapSub: { color: '#CBD5E1', fontSize: 12 },
  priceRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  priceCard: { flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  priceLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  priceValueL1: { color: '#00D09C', fontSize: 20, fontWeight: '900' },
  priceValueMine: { color: '#F8FAFC', fontSize: 18, fontWeight: '800' },
  priceSubLabel: { color: '#64748B', fontSize: 10, marginTop: 2 },
  actionSection: { marginBottom: 16 },
  sectionHeader: { color: '#F8FAFC', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  hintText: { color: '#94A3B8', fontSize: 12, marginBottom: 12 },
  bidButtonRow: { flexDirection: 'row', gap: 12 },
  bidButton: { flex: 1, minHeight: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', padding: 8 },
  bidBtnStandard: { backgroundColor: '#2563EB' },
  bidBtnAggressive: { backgroundColor: '#059669' },
  bidBtnSubtitle: { color: '#E2E8F0', fontSize: 11, fontWeight: '700' },
  bidBtnTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#334155' },
  historyTime: { color: '#94A3B8', fontSize: 13 },
  historyPrice: { color: '#F8FAFC', fontSize: 14, fontWeight: '700' },
  historyRank: { fontWeight: '800', fontSize: 13 },
  textL1: { color: '#00D09C' },
  textL2: { color: '#F59E0B' },
});
