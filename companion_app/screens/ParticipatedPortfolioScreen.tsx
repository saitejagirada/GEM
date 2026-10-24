import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import type { ParticipatedBid, ParticipatedBidStage } from '../types/index';
import { MOCK_PARTICIPATED_BIDS } from '../fixtures/mockData';

interface ParticipatedPortfolioScreenProps {
  onOpenCrac?: () => void;
  onOpenPfms?: () => void;
}

export const ParticipatedPortfolioScreen: React.FC<ParticipatedPortfolioScreenProps> = ({
  onOpenCrac,
  onOpenPfms,
}) => {
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'AWARDED'>('ACTIVE');
  const [bids] = useState<ParticipatedBid[]>(MOCK_PARTICIPATED_BIDS);

  const activeBids = bids.filter((b) => b.stage !== 'AWARDED_L1' && b.stage !== 'DISQUALIFIED');
  const awardedBids = bids.filter((b) => b.stage === 'AWARDED_L1');

  const displayedBids = activeTab === 'ACTIVE' ? activeBids : awardedBids;

  const totalQuotedActive = activeBids.reduce((sum, b) => sum + b.quotedPriceInr, 0);

  const getStageBadge = (stage: ParticipatedBidStage, rank?: number) => {
    switch (stage) {
      case 'TECHNICAL_EVALUATION':
        return { label: 'TECHNICAL EVALUATION', bg: 'rgba(59, 130, 246, 0.2)', text: '#60A5FA' };
      case 'FINANCIAL_EVALUATION':
        return { label: `FINANCIAL EVAL • RANK L${rank || 1}`, bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B' };
      case 'REVERSE_AUCTION':
        return { label: '⚡ LIVE RA ACTIVE', bg: 'rgba(0, 208, 156, 0.2)', text: '#00D09C' };
      case 'AWARDED_L1':
        return { label: '★ CONTRACT AWARDED (L1)', bg: 'rgba(167, 139, 250, 0.2)', text: '#C084FC' };
      case 'DISQUALIFIED':
        return { label: 'DISQUALIFIED', bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444' };
      default:
        return { label: stage, bg: '#1E293B', text: '#94A3B8' };
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Portfolio Header Card (PhonePe Holdings Style) */}
      <View style={styles.summaryCard}>
        <Text style={styles.summarySub}>PARTICIPATED BID PORTFOLIO</Text>
        <Text style={styles.summaryAmount}>₹{(totalQuotedActive / 100000).toFixed(2)} Lakhs</Text>
        <Text style={styles.summaryHint}>Active Tender Exposure ({activeBids.length} Submissions)</Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel}>Active Bids</Text>
            <Text style={styles.metricVal}>{activeBids.length}</Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel}>Contracts Won</Text>
            <Text style={[styles.metricVal, { color: '#00D09C' }]}>{awardedBids.length}</Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel}>Corrigenda</Text>
            <Text style={[styles.metricVal, { color: '#38BDF8' }]}>3 Issued</Text>
          </View>
        </View>
      </View>

      {/* Tabs (Min 48dp) */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'ACTIVE' && styles.tabBtnActive]}
          onPress={() => setActiveTab('ACTIVE')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'ACTIVE' && styles.tabBtnTextActive]}>
            Active Submissions ({activeBids.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'AWARDED' && styles.tabBtnActive]}
          onPress={() => setActiveTab('AWARDED')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'AWARDED' && styles.tabBtnTextActive]}>
            Awarded Orders ({awardedBids.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List of Participated Bids */}
      {displayedBids.map((b) => {
        const badge = getStageBadge(b.stage, b.currentRank);
        const priceDiff = b.quotedPriceInr - b.expectedL1BenchmarkInr;
        const diffPercent = ((priceDiff / b.expectedL1BenchmarkInr) * 100).toFixed(1);

        return (
          <View key={b.bidNumber} style={styles.bidCard}>
            {/* Top Stage Row */}
            <View style={styles.cardTopRow}>
              <View style={[styles.stageBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.stageBadgeText, { color: badge.text }]}>{badge.label}</Text>
              </View>
              {b.corrigendumCount > 0 && (
                <View style={styles.corrigendumBadge}>
                  <Text style={styles.corrigendumText}>⚡ {b.corrigendumCount} Corrigendum</Text>
                </View>
              )}
            </View>

            {/* Title & PO */}
            <Text style={styles.bidNumberText}>{b.bidNumber}</Text>
            <Text style={styles.bidTitle}>{b.itemTitle}</Text>
            <Text style={styles.deptText}>Buyer: {b.department}</Text>

            {/* Price Analysis Grid (Quoted vs Benchmark) */}
            <View style={styles.pricingRow}>
              <View style={styles.priceCol}>
                <Text style={styles.priceColLabel}>Your Quoted Price</Text>
                <Text style={styles.priceColVal}>₹{b.quotedPriceInr.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.priceCol}>
                <Text style={styles.priceColLabel}>Target L1 Benchmark</Text>
                <Text style={styles.priceColVal}>₹{b.expectedL1BenchmarkInr.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.diffCol}>
                <Text style={styles.priceColLabel}>Spread</Text>
                <Text style={[styles.diffVal, priceDiff <= 0 ? styles.diffPositive : styles.diffNegative]}>
                  {priceDiff <= 0 ? `${diffPercent}%` : `+${diffPercent}%`}
                </Text>
              </View>
            </View>

            {/* Quick Actions (Min 48dp) */}
            <View style={styles.cardActionsRow}>
              {b.stage === 'AWARDED_L1' ? (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnCrac]}
                    onPress={() => {
                      if (onOpenCrac) onOpenCrac();
                      else Alert.alert('CRAC Field Inspection', `Opening CRAC verification for ${b.bidNumber}`);
                    }}
                  >
                    <Text style={styles.actionBtnText}>📷 Field CRAC Inspection</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnPfms]}
                    onPress={() => {
                      if (onOpenPfms) onOpenPfms();
                      else Alert.alert('PFMS Disbursement', `Tracking PFMS payout for ${b.bidNumber}`);
                    }}
                  >
                    <Text style={styles.actionBtnText}>₹ PFMS Tracking</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.actionBtnSecondary}
                    onPress={() => Alert.alert('Bid Details', `Submitted: ${new Date(b.submittedAtUtc).toLocaleDateString()}`)}
                  >
                    <Text style={styles.actionBtnSecondaryText}>View Submission</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtnSecondary}
                    onPress={() => Alert.alert('Corrigenda', `No unread amendments for ${b.bidNumber}`)}
                  >
                    <Text style={styles.actionBtnSecondaryText}>Corrigenda ({b.corrigendumCount})</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B132B' },
  content: { padding: 16, paddingBottom: 32 },
  summaryCard: {
    backgroundColor: '#162032',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
  },
  summarySub: { color: '#60A5FA', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  summaryAmount: { color: '#F8FAFC', fontSize: 26, fontWeight: '900', marginVertical: 4 },
  summaryHint: { color: '#94A3B8', fontSize: 12 },
  metricsRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 8,
  },
  metricCell: { flex: 1 },
  metricLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  metricVal: { color: '#F8FAFC', fontSize: 16, fontWeight: '800', marginTop: 2 },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  tabBtnText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  tabBtnTextActive: { color: '#F8FAFC', fontWeight: '900' },
  bidCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  stageBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  stageBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  corrigendumBadge: { backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  corrigendumText: { color: '#F59E0B', fontSize: 10, fontWeight: '800' },
  bidNumberText: { color: '#64748B', fontSize: 11, fontWeight: '700', marginBottom: 2 },
  bidTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '800', lineHeight: 20, marginBottom: 4 },
  deptText: { color: '#CBD5E1', fontSize: 12, marginBottom: 12 },
  pricingRow: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  priceCol: { flex: 1.2 },
  diffCol: { flex: 0.8, alignItems: 'flex-end' },
  priceColLabel: { color: '#64748B', fontSize: 9, fontWeight: '700', marginBottom: 2 },
  priceColVal: { color: '#F8FAFC', fontSize: 13, fontWeight: '800' },
  diffVal: { fontSize: 14, fontWeight: '900', marginTop: 2 },
  diffPositive: { color: '#00D09C' },
  diffNegative: { color: '#F87171' },
  cardActionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  actionBtnCrac: { backgroundColor: '#0284C7' },
  actionBtnPfms: { backgroundColor: '#059669' },
  actionBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  actionBtnSecondary: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnSecondaryText: { color: '#CBD5E1', fontSize: 12, fontWeight: '700' },
});
