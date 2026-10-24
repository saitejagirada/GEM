import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { PfmsTracker } from '../services/PfmsTracker';
import type { InvoiceContractTracker, MilestoneStage } from '../types/index';

export const PfmsTrackerScreen: React.FC = () => {
  const [tracker, setTracker] = useState<InvoiceContractTracker>({
    contractId: 'GEM-CONT-2026-4401',
    invoiceNumber: 'INV/2026/0881',
    totalAmountInr: 4850000,
    buyerName: 'Directorate General of Supplies & Transport (Army HQ)',
    sellerName: 'Apex Tactical Logistics Pvt Ltd',
    cracIssueDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    statutorySlaDaysRemaining: 6,
    isDeemedAccepted: false,
    milestones: PfmsTracker.createInitialMilestones(),
    pfmsBillId: 'PFMS/MOD/2026/09912',
    bankUtrNumber: undefined,
  });

  const slaStatus = PfmsTracker.evaluateSlaStatus(tracker);
  const progressPercent = PfmsTracker.calculateProgress(tracker.milestones);
  const currentStage = PfmsTracker.getCurrentStage(tracker.milestones);

  const daysElapsed = 10 - tracker.statutorySlaDaysRemaining;
  const slaProgressPercent = Math.min(100, Math.max(0, (daysElapsed / 10) * 100));

  const handleAdvanceStage = (stage: MilestoneStage, refId?: string) => {
    setTracker((prev) => PfmsTracker.advanceStage(prev, stage, refId));
    Alert.alert(
      'Payment Stage Updated',
      `Advanced contract to ${stage}. Overall progress is now ${PfmsTracker.calculateProgress(tracker.milestones)}%.`
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Contract Header */}
      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <Text style={styles.contractBadge}>{tracker.contractId}</Text>
          <Text style={styles.invoiceText}>Inv: {tracker.invoiceNumber}</Text>
        </View>
        <Text style={styles.amountText}>₹{tracker.totalAmountInr.toLocaleString('en-IN')}</Text>
        <Text style={styles.buyerText}>Buyer: {tracker.buyerName}</Text>
        <Text style={styles.sellerText}>Seller: {tracker.sellerName}</Text>
      </View>

      {/* Statutory 10-Day SLA Countdown Card */}
      <View style={[styles.slaCard, { borderColor: slaStatus.badgeColor }]}>
        <View style={styles.slaHeaderRow}>
          <Text style={styles.slaTitle}>STATUTORY 10-DAY CRAC SLA</Text>
          <View style={[styles.slaBadge, { backgroundColor: slaStatus.badgeColor }]}>
            <Text style={styles.slaBadgeText}>{slaStatus.statusLabel}</Text>
          </View>
        </View>

        <View style={styles.slaMeterRow}>
          <Text style={styles.slaDayCounter}>
            Day {daysElapsed} of 10 Elapsed • {tracker.statutorySlaDaysRemaining} Days Remaining
          </Text>
        </View>
        <View style={styles.slaTrack}>
          <View style={[styles.slaFill, { width: `${slaProgressPercent}%`, backgroundColor: slaStatus.badgeColor }]} />
        </View>

        <Text style={styles.slaDescription}>
          Under GeM GFR Rule 149, if the buyer does not complete inspection within 10 days of delivery, deemed acceptance unlocks PFMS disbursement.
        </Text>
      </View>

      {/* Disbursement Progress Bar */}
      <View style={styles.card}>
        <View style={styles.progressHeader}>
          <Text style={styles.cardHeader}>Disbursement Progress</Text>
          <Text style={styles.progressPercent}>{progressPercent}%</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* 6-Stage Milestone Stepper */}
      <View style={styles.card}>
        <Text style={[styles.cardHeader, { marginBottom: 16 }]}>6-Stage PFMS Payment Pipeline</Text>

        {tracker.milestones.map((m, idx) => {
          const isCurrent = m.stage === currentStage;
          return (
            <View key={idx} style={styles.milestoneItem}>
              <View style={styles.timelineCol}>
                <View
                  style={[
                    styles.node,
                    m.completed ? styles.nodeCompleted : isCurrent ? styles.nodeCurrent : styles.nodePending,
                  ]}
                >
                  <Text style={[styles.nodeText, !m.completed && !isCurrent && { color: '#6B7280' }]}>
                    {m.completed ? '✓' : idx + 1}
                  </Text>
                </View>
                {idx < tracker.milestones.length - 1 && (
                  <View
                    style={[
                      styles.connector,
                      m.completed ? styles.connectorActive : styles.connectorInactive,
                    ]}
                  />
                )}
              </View>

              <View style={styles.milestoneContent}>
                <View style={styles.milestoneHeader}>
                  <Text style={[styles.milestoneTitle, m.completed && styles.titleCompleted]}>
                    {m.title}
                  </Text>
                  {m.completed && <Text style={styles.completedTag}>COMPLETED</Text>}
                  {isCurrent && !m.completed && <Text style={styles.activeTag}>IN PROGRESS</Text>}
                </View>
                <Text style={styles.milestoneDesc}>{m.description}</Text>
                {m.referenceId && <Text style={styles.refText}>Ref: {m.referenceId}</Text>}
              </View>
            </View>
          );
        })}
      </View>

      {/* Simulation Quick-Triggers */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Simulation Test Triggers</Text>
        <View style={styles.triggerRow}>
          <TouchableOpacity
            style={styles.triggerBtn}
            onPress={() => handleAdvanceStage('CRAC_APPROVED')}
            activeOpacity={0.8}
          >
            <Text style={styles.triggerBtnText}>Approve CRAC</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.triggerBtn}
            onPress={() => handleAdvanceStage('PFMS_TREASURY_SANCTION', 'PFMS-BILL-88992')}
            activeOpacity={0.8}
          >
            <Text style={styles.triggerBtnText}>Pass Bill</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.triggerBtn, { backgroundColor: '#00C853' }]}
            onPress={() => handleAdvanceStage('BANK_UTR_CREDITED', 'RBI-UTR-2026-990021')}
            activeOpacity={0.8}
          >
            <Text style={styles.triggerBtnText}>Credit UTR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, paddingBottom: 32 },
  card: {
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
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  contractBadge: { color: '#5F259F', fontSize: 13, fontWeight: '800' },
  invoiceText: { color: '#6B7280', fontSize: 12 },
  amountText: { color: '#111827', fontSize: 24, fontWeight: '900', marginVertical: 4 },
  buyerText: { color: '#374151', fontSize: 13, marginBottom: 2 },
  sellerText: { color: '#6B7280', fontSize: 12 },
  slaCard: { backgroundColor: '#FFFBEB', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1.5 },
  slaHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  slaTitle: { color: '#92400E', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  slaBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  slaBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  slaMeterRow: { marginVertical: 4 },
  slaDayCounter: { color: '#78350F', fontSize: 12, fontWeight: '700' },
  slaTrack: { height: 8, backgroundColor: '#FEF3C7', borderRadius: 4, overflow: 'hidden', marginVertical: 6 },
  slaFill: { height: '100%', borderRadius: 4 },
  slaDescription: { color: '#92400E', fontSize: 11, lineHeight: 15, marginTop: 4 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardHeader: { color: '#111827', fontSize: 14, fontWeight: '800' },
  progressPercent: { color: '#00C853', fontSize: 16, fontWeight: '900' },
  progressBarTrack: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#00C853' },
  milestoneItem: { flexDirection: 'row', marginBottom: 14 },
  timelineCol: { width: 40, alignItems: 'center' },
  node: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  nodeCompleted: { backgroundColor: '#00C853' },
  nodeCurrent: { backgroundColor: '#5F259F', borderWidth: 2, borderColor: '#C084FC' },
  nodePending: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB' },
  nodeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  connector: { width: 3, flex: 1, marginVertical: 2 },
  connectorActive: { backgroundColor: '#00C853' },
  connectorInactive: { backgroundColor: '#E5E7EB' },
  milestoneContent: { flex: 1, paddingLeft: 10 },
  milestoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  milestoneTitle: { color: '#111827', fontSize: 13, fontWeight: '700' },
  titleCompleted: { color: '#111827' },
  completedTag: { color: '#00C853', fontSize: 10, fontWeight: '800' },
  activeTag: { color: '#5F259F', fontSize: 10, fontWeight: '800' },
  milestoneDesc: { color: '#6B7280', fontSize: 11, marginTop: 2, lineHeight: 15 },
  refText: { color: '#2563EB', fontSize: 10, fontFamily: 'monospace', marginTop: 3 },
  triggerRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  triggerBtn: {
    flex: 1,
    minHeight: 44,
    backgroundColor: '#5F259F',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  triggerBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', textAlign: 'center' },
});
