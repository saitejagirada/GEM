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
    cracIssueDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
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

      {/* Statutory 10-Day SLA Countdown Card with Visual Day Meter */}
      <View style={[styles.slaCard, { borderColor: slaStatus.badgeColor }]}>
        <View style={styles.slaHeaderRow}>
          <Text style={styles.slaTitle}>STATUTORY 10-DAY CRAC SLA</Text>
          <View style={[styles.slaBadge, { backgroundColor: slaStatus.badgeColor }]}>
            <Text style={styles.slaBadgeText}>{slaStatus.statusLabel}</Text>
          </View>
        </View>

        {/* Day Meter */}
        <View style={styles.slaMeterRow}>
          <Text style={styles.slaDayCounter}>
            Day {daysElapsed} of 10 Elapsed • {tracker.statutorySlaDaysRemaining} Days Remaining
          </Text>
        </View>
        <View style={styles.slaTrack}>
          <View style={[styles.slaFill, { width: `${slaProgressPercent}%`, backgroundColor: slaStatus.badgeColor }]} />
        </View>

        <Text style={styles.slaDescription}>
          Under GeM GFR Rule 149, if the buyer fails to sign the CRAC within 10 days of physical delivery, the system automatically triggers deemed acceptance and unlocks PFMS treasury disbursement.
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

      {/* 6-Stage Milestone Stepper (4dp Connectors & 36dp Nodes) */}
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
                  <Text style={styles.nodeText}>{m.completed ? '✓' : idx + 1}</Text>
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

      {/* Simulation Quick-Triggers (Min 48dp Touch Targets) */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Simulation Test Triggers (48dp Touch Targets)</Text>
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
            <Text style={styles.triggerBtnText}>Pass PFMS Bill</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.triggerBtn, { backgroundColor: '#059669' }]}
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
  container: { flex: 1, backgroundColor: '#0B132B' },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: '#1E293B', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  contractBadge: { color: '#00D09C', fontSize: 13, fontWeight: '800' },
  invoiceText: { color: '#94A3B8', fontSize: 12 },
  amountText: { color: '#F8FAFC', fontSize: 26, fontWeight: '900', marginVertical: 4 },
  buyerText: { color: '#CBD5E1', fontSize: 13, marginBottom: 2 },
  sellerText: { color: '#94A3B8', fontSize: 12 },
  slaCard: { backgroundColor: '#162032', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1.5 },
  slaHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  slaTitle: { color: '#F8FAFC', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  slaBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  slaBadgeText: { color: '#0B132B', fontSize: 11, fontWeight: '900' },
  slaMeterRow: { marginVertical: 6 },
  slaDayCounter: { color: '#CBD5E1', fontSize: 12, fontWeight: '700' },
  slaTrack: { height: 8, backgroundColor: '#0F172A', borderRadius: 4, overflow: 'hidden', marginVertical: 6 },
  slaFill: { height: '100%', borderRadius: 4 },
  slaDescription: { color: '#94A3B8', fontSize: 11, lineHeight: 16, marginTop: 4 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardHeader: { color: '#F8FAFC', fontSize: 15, fontWeight: '800' },
  progressPercent: { color: '#00D09C', fontSize: 16, fontWeight: '900' },
  progressBarTrack: { height: 10, backgroundColor: '#0F172A', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#00D09C' },
  milestoneItem: { flexDirection: 'row', marginBottom: 16 },
  timelineCol: { width: 44, alignItems: 'center' },
  node: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  nodeCompleted: { backgroundColor: '#00D09C' },
  nodeCurrent: { backgroundColor: '#2563EB', borderWidth: 2.5, borderColor: '#60A5FA' },
  nodePending: { backgroundColor: '#334155' },
  nodeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  connector: { width: 4, flex: 1, marginVertical: 2 },
  connectorActive: { backgroundColor: '#00D09C' },
  connectorInactive: { backgroundColor: '#334155' },
  milestoneContent: { flex: 1, paddingLeft: 12 },
  milestoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  milestoneTitle: { color: '#E2E8F0', fontSize: 14, fontWeight: '700' },
  titleCompleted: { color: '#F8FAFC' },
  completedTag: { color: '#00D09C', fontSize: 10, fontWeight: '800' },
  activeTag: { color: '#38BDF8', fontSize: 10, fontWeight: '800' },
  milestoneDesc: { color: '#94A3B8', fontSize: 12, marginTop: 2, lineHeight: 16 },
  refText: { color: '#38BDF8', fontSize: 11, fontFamily: 'monospace', marginTop: 4 },
  triggerRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  triggerBtn: {
    flex: 1,
    minHeight: 48,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  triggerBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', textAlign: 'center' },
});
