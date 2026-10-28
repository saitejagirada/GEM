import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import type { ParticipatedBid, ParticipatedBidStage } from '../types/index';
import { MOCK_PARTICIPATED_BIDS, MOCK_ACCEPTED_ORDERS } from '../fixtures/mockData';
import { PortalApiClient } from '../services/PortalApiClient';
import { formatInr } from '../utils/formatters';

interface ParticipatedPortfolioScreenProps {
  onOpenCrac?: () => void;
  onOpenPfms?: () => void;
}

export const ParticipatedPortfolioScreen: React.FC<ParticipatedPortfolioScreenProps> = ({
  onOpenCrac,
  onOpenPfms,
}) => {
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'AWARDED' | 'CREDENTIAL_BANK'>('ACTIVE');
  const [bids, setBids] = useState<ParticipatedBid[]>(MOCK_PARTICIPATED_BIDS);

  useEffect(() => {
    PortalApiClient.getPortfolio()
      .then((items) => {
        if (items && items.length > 0) setBids(items);
      })
      .catch(() => {});
  }, []);

  const activeBids = bids.filter((b) => b.stage !== 'AWARDED_L1' && b.stage !== 'DISQUALIFIED');
  const awardedBids = bids.filter((b) => b.stage === 'AWARDED_L1');

  const displayedBids = activeTab === 'ACTIVE' ? activeBids : awardedBids;
  const totalQuotedActive = activeBids.reduce((sum, b) => sum + b.quotedPriceInr, 0);

  const getStageBadge = (stage: ParticipatedBidStage, rank?: number) => {
    switch (stage) {
      case 'TECHNICAL_EVALUATION':
        return { label: 'TECHNICAL EVALUATION', bg: '#EFF6FF', text: '#2563EB' };
      case 'FINANCIAL_EVALUATION':
        return { label: `FINANCIAL EVAL • RANK L${rank || 1}`, bg: '#FEF3C7', text: '#D97706' };
      case 'REVERSE_AUCTION':
        return { label: '⚡ LIVE RA ACTIVE', bg: '#F3E8FF', text: '#5F259F' };
      case 'AWARDED_L1':
        return { label: '★ CONTRACT AWARDED (L1)', bg: '#E8F5E9', text: '#00C853' };
      case 'DISQUALIFIED':
        return { label: 'DISQUALIFIED', bg: '#FEE2E2', text: '#DC2626' };
      default:
        return { label: stage, bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Title */}
      <Text style={styles.screenTitle}>History &amp; Submissions</Text>

      {/* Summary Card (PhonePe Balance / Holdings Style) */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <Text style={styles.summarySub}>ACTIVE TENDER EXPOSURE</Text>
          <Text style={styles.summaryBidsCount}>{activeBids.length} Submissions</Text>
        </View>
        <Text style={styles.summaryAmount}>₹{(totalQuotedActive / 100000).toFixed(2)} Lakhs</Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel}>Active Submissions</Text>
            <Text style={styles.metricVal}>{activeBids.length}</Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel}>Contracts Won</Text>
            <Text style={[styles.metricVal, { color: '#00C853' }]}>{awardedBids.length}</Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel}>Corrigenda</Text>
            <Text style={[styles.metricVal, { color: '#2563EB' }]}>3 Issued</Text>
          </View>
        </View>
      </View>

      {/* Tabs (PhonePe Pill Filter Style) */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'ACTIVE' && styles.tabBtnActive]}
          onPress={() => setActiveTab('ACTIVE')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === 'ACTIVE' && styles.tabBtnTextActive]}>
            Active Bids ({activeBids.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'AWARDED' && styles.tabBtnActive]}
          onPress={() => setActiveTab('AWARDED')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === 'AWARDED' && styles.tabBtnTextActive]}>
            Awarded Orders ({awardedBids.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'CREDENTIAL_BANK' && styles.tabBtnActive]}
          onPress={() => setActiveTab('CREDENTIAL_BANK')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === 'CREDENTIAL_BANK' && styles.tabBtnTextActive]}>
            Credential Bank ({MOCK_ACCEPTED_ORDERS.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Credential Bank Tab View */}
      {activeTab === 'CREDENTIAL_BANK' ? (
        <View>
          <View style={styles.credentialBanner}>
            <Text style={styles.credentialBannerTitle}>Verified GeM Credential Bank (Past Performance)</Text>
            <Text style={styles.credentialBannerSub}>
              5 Completed contracts totaling ₹1.32 Crores with 100% CRAC acceptance. Ready to attach as experience proof.
            </Text>
          </View>

          {MOCK_ACCEPTED_ORDERS.map((order) => (
            <View key={order.contractNumber} style={styles.bidCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.contractPill}>
                  <Text style={styles.contractPillText}>{order.contractNumber}</Text>
                </View>
                <View style={styles.credentialCracBadge}>
                  <Text style={styles.credentialCracText}>✓ CRAC CLEARED &amp; PAID</Text>
                </View>
              </View>

              <Text style={styles.bidTitle}>{order.title}</Text>
              <Text style={styles.deptText}>Buyer: {order.buyerDepartment} • {order.ministry}</Text>

              <View style={styles.pricingRow}>
                <View style={styles.priceCol}>
                  <Text style={styles.priceColLabel}>Invoiced Value</Text>
                  <Text style={[styles.priceColVal, { color: '#15803D' }]}>
                    ₹{(order.orderValueInr / 100000).toFixed(2)} Lakhs
                  </Text>
                </View>
                <View style={styles.priceCol}>
                  <Text style={styles.priceColLabel}>Delivery Compliance</Text>
                  <Text style={styles.priceColVal}>
                    {order.slaCompliance === 'EARLY_DELIVERY' ? '⚡ Early Delivery' : '✓ 100% On-Time'}
                  </Text>
                </View>
                <View style={styles.priceCol}>
                  <Text style={styles.priceColLabel}>CRAC Date</Text>
                  <Text style={styles.priceColVal}>{order.cracDate}</Text>
                </View>
              </View>

              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  style={styles.copyDocBtn}
                  onPress={() =>
                    Alert.alert(
                      'Past Performance Proof Copied',
                      `Contract: ${order.contractNumber}\nBuyer: ${order.buyerDepartment}\nAmount: ₹${(order.orderValueInr / 100000).toFixed(2)} Lakhs\nCRAC Date: ${order.cracDate}\nPFMS UTR: ${order.pfmsUtrNumber || 'Verified'}\n\nReady to paste into GeM Technical Bid Submission.`
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Text style={styles.copyDocBtnText}>Copy as CVC Experience Proof 📋</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : (
        displayedBids.map((b) => {
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

              {/* Price Analysis Grid (Masked if in Technical Evaluation) */}
              {b.stage === 'TECHNICAL_EVALUATION' ? (
                <View style={styles.sealedEnvelopeBox}>
                  <Text style={styles.sealedEnvelopeTitle}>🔒 Sealed Financial Envelope</Text>
                  <Text style={styles.sealedEnvelopeText}>
                    Under GeM GFR Rules, financial quotations and competitor rankings remain encrypted until all technical evaluations are finalized.
                  </Text>
                </View>
              ) : (
                <View style={styles.pricingRow}>
                  <View style={styles.priceCol}>
                    <Text style={styles.priceColLabel}>Your Quoted Price</Text>
                    <Text style={styles.priceColVal}>₹{formatInr(b.quotedPriceInr)}</Text>
                  </View>
                  <View style={styles.priceCol}>
                    <Text style={styles.priceColLabel}>Target L1 Benchmark</Text>
                    <Text style={styles.priceColVal}>₹{formatInr(b.expectedL1BenchmarkInr)}</Text>
                  </View>
                  <View style={styles.diffCol}>
                    <Text style={styles.priceColLabel}>Variance</Text>
                    <Text style={[styles.diffVal, priceDiff <= 0 ? styles.diffPositive : styles.diffNegative]}>
                      {priceDiff <= 0 ? `${diffPercent}%` : `+${diffPercent}%`}
                    </Text>
                  </View>
                </View>
              )}

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
                    <Text style={styles.actionBtnSecondaryText}>View Bid Submission</Text>
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
      }))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, paddingBottom: 32 },
  screenTitle: {
    color: '#1A1C1E',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#F3E8FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  summaryTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summarySub: { color: '#5F259F', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  summaryBidsCount: { color: '#5F259F', fontSize: 11, fontWeight: '700' },
  summaryAmount: { color: '#1A1C1E', fontSize: 26, fontWeight: '900', marginVertical: 6 },
  metricsRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E9D5FF',
    gap: 8,
  },
  metricCell: { flex: 1 },
  metricLabel: { color: '#6B7280', fontSize: 10, fontWeight: '600' },
  metricVal: { color: '#111827', fontSize: 15, fontWeight: '800', marginTop: 2 },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: { color: '#6B7280', fontSize: 12, fontWeight: '700' },
  tabBtnTextActive: { color: '#5F259F', fontWeight: '800' },
  bidCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  stageBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  stageBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  corrigendumBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  corrigendumText: { color: '#D97706', fontSize: 10, fontWeight: '700' },
  bidNumberText: { color: '#6B7280', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  bidTitle: { color: '#111827', fontSize: 14, fontWeight: '700', lineHeight: 19, marginBottom: 4 },
  deptText: { color: '#6B7280', fontSize: 11, marginBottom: 12 },
  pricingRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  priceCol: { flex: 1.2 },
  diffCol: { flex: 0.8, alignItems: 'flex-end' },
  priceColLabel: { color: '#9CA3AF', fontSize: 9, fontWeight: '700', marginBottom: 2 },
  priceColVal: { color: '#1F2937', fontSize: 12, fontWeight: '800' },
  diffVal: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  diffPositive: { color: '#00C853' },
  diffNegative: { color: '#DC2626' },
  cardActionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  actionBtnCrac: { backgroundColor: '#5F259F' },
  actionBtnPfms: { backgroundColor: '#059669' },
  actionBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  actionBtnSecondary: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnSecondaryText: { color: '#374151', fontSize: 12, fontWeight: '600' },
  sealedEnvelopeBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  sealedEnvelopeTitle: { color: '#1E40AF', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  sealedEnvelopeText: { color: '#2563EB', fontSize: 11, lineHeight: 16 },
  credentialBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  credentialBannerTitle: { color: '#166534', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  credentialBannerSub: { color: '#15803D', fontSize: 11, lineHeight: 16 },
  contractPill: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  contractPillText: { color: '#5F259F', fontSize: 11, fontWeight: '800' },
  credentialCracBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  credentialCracText: { color: '#15803D', fontSize: 10, fontWeight: '900' },
  copyDocBtn: {
    flex: 1,
    minHeight: 44,
    backgroundColor: '#166534',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyDocBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});
