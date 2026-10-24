import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Share,
} from 'react-native';
import type { DeconstructedBidDoc, UserAgentProfile } from '../types/index';
import { UserAgentService } from '../services/UserAgentService';
import { BidDocService } from '../services/BidDocService';

interface BidInspectorScreenProps {
  bid: DeconstructedBidDoc | null;
  visible: boolean;
  onClose: () => void;
  userProfile: UserAgentProfile;
  onAddToParticipated?: (bid: DeconstructedBidDoc) => void;
}

export const BidInspectorScreen: React.FC<BidInspectorScreenProps> = ({
  bid,
  visible,
  onClose,
  userProfile,
  onAddToParticipated,
}) => {
  if (!bid) return null;

  const evaluation = UserAgentService.evaluateBid(userProfile, bid);
  const fundamentals = BidDocService.getFundamentalsSummary(bid);
  const risks = BidDocService.assessTenderRisks(bid);

  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({
    'Udyam Registration Certificate (MSE)': true,
    'Udyam Registration Certificate': true,
    'Udyam MSE Exemption Certificate': true,
  });

  const toggleDoc = (docName: string) => {
    setCheckedDocs((prev) => ({
      ...prev,
      [docName]: !prev[docName],
    }));
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `GeM Bid Summary: ${bid.bidNumber}\n${bid.title}\nEst Value: ${fundamentals.estimatedValueLabel}\nEMD: ${fundamentals.emdLabel}\nClosing: ${new Date(bid.closingTimeUtc).toLocaleString('en-IN')}`,
      });
    } catch {
      Alert.alert('Share', `Sharing summary for ${bid.bidNumber}`);
    }
  };

  const handleAddPortfolio = () => {
    if (onAddToParticipated) {
      onAddToParticipated(bid);
    }
    Alert.alert('Added to Portfolio', `Bid ${bid.bidNumber} tracked in your Participated Bids.`);
  };

  const checkedCount = bid.requiredDocuments.filter((d) => checkedDocs[d]).length;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close details">
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerBidNum}>{bid.bidNumber}</Text>
            <Text style={styles.headerSubtitle}>Zero-PDF Instant Fundamentals</Text>
          </View>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} accessibilityLabel="Share summary">
            <Text style={styles.shareBtnText}>📤</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          {/* Eligibility Verdict Banner */}
          <View
            style={[
              styles.verdictBanner,
              evaluation.verdictTag === 'HIGH_MATCH' && styles.verdictHigh,
              evaluation.verdictTag === 'MODERATE_MATCH' && styles.verdictModerate,
              evaluation.verdictTag === 'DISQUALIFIED' && styles.verdictDisqualified,
            ]}
          >
            <View style={styles.verdictTopRow}>
              <Text style={styles.verdictPill}>
                {evaluation.verdictTag === 'HIGH_MATCH'
                  ? '★ ELIGIBLE TO BID'
                  : evaluation.verdictTag === 'MODERATE_MATCH'
                  ? '⚠ CONDITIONAL MATCH'
                  : '✕ CRITERIA SHORTFALL'}
              </Text>
              <Text style={styles.matchScoreText}>{evaluation.matchScore}% FIT</Text>
            </View>
            <Text style={styles.verdictSummary}>{evaluation.verdictSummary}</Text>
          </View>

          {/* Tender Title & Ministry */}
          <View style={styles.card}>
            <Text style={styles.deptBadge}>{bid.department}</Text>
            <Text style={styles.bidTitle}>{bid.title}</Text>
            <Text style={styles.ministryText}>{bid.ministry}</Text>
          </View>

          {/* Expected Winning L1 Benchmark (Groww Price Guidance Style) */}
          <View style={styles.benchmarkCard}>
            <View style={styles.benchmarkHeader}>
              <Text style={styles.benchmarkLabel}>EXPECTED WINNING L1 BENCHMARK</Text>
              <Text style={styles.benchmarkHint}>AI Predictive Range</Text>
            </View>
            <Text style={styles.benchmarkRange}>
              ₹{(evaluation.expectedWinningBidRange.minInr / 100000).toFixed(2)}L – ₹
              {(evaluation.expectedWinningBidRange.maxInr / 100000).toFixed(2)}L
            </Text>
            <Text style={styles.benchmarkSub}>
              Based on historical {bid.category || 'MES/Defence'} procurement clearing ratios (82%–94% of budget).
            </Text>
          </View>

          {/* Groww-style 2x2 Key Fundamentals Grid */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Key Procurement Fundamentals</Text>
            <View style={styles.grid2x2}>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>Estimated Value</Text>
                <Text style={styles.cellValuePrimary}>{fundamentals.estimatedValueLabel}</Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>EMD Guarantee</Text>
                <Text style={[styles.cellValueSecondary, { color: '#00D09C' }]}>
                  {fundamentals.emdLabel}
                </Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>Min Annual Turnover</Text>
                <Text style={styles.cellValuePrimary}>{fundamentals.turnoverLabel}</Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>Past Experience</Text>
                <Text style={styles.cellValuePrimary}>{fundamentals.experienceLabel}</Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>Delivery Timeline</Text>
                <Text style={styles.cellValueSecondary}>{fundamentals.deliveryPeriodLabel}</Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>Splitting Rule</Text>
                <Text style={styles.cellValueSecondary}>{bid.splittingRatio || '100% to L1'}</Text>
              </View>
            </View>
          </View>

          {/* Risk Factors Assessment */}
          {risks.flags.length > 0 && (
            <View style={[styles.card, styles.riskCard]}>
              <View style={styles.riskHeader}>
                <Text style={styles.riskTitle}>OPERATIONAL RISK ASSESSMENT: {risks.riskLevel}</Text>
              </View>
              {risks.flags.map((flag, idx) => (
                <Text key={idx} style={styles.riskFlagText}>• {flag}</Text>
              ))}
            </View>
          )}

          {/* BOQ Technical Scope */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>BOQ & Scope Breakdown ({bid.boqItems.length} Items)</Text>
            {bid.boqItems.map((item, idx) => (
              <View key={idx} style={styles.boqItemRow}>
                <View style={styles.boqTopRow}>
                  <Text style={styles.boqItemTitle}>{item.itemTitle}</Text>
                  <Text style={styles.boqQtyBadge}>
                    {item.quantity} {item.unit}
                  </Text>
                </View>
                <Text style={styles.boqSpecsText}>{item.specsSummary}</Text>
              </View>
            ))}
          </View>

          {/* Consignee Destinations */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Consignee Delivery Locations</Text>
            {bid.consignees.map((c, idx) => (
              <View key={idx} style={styles.consigneeRow}>
                <View style={styles.consigneeLeft}>
                  <Text style={styles.consigneeLocation}>{c.location}</Text>
                  <Text style={styles.consigneeOfficer}>{c.reportingOfficer || 'Consignee Officer'}</Text>
                </View>
                <View style={styles.consigneeRight}>
                  <Text style={styles.stateBadge}>{c.state} ({c.pincode})</Text>
                  <Text style={styles.consigneeQty}>{c.quantity} Units</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Interactive Document Readiness Checklist */}
          <View style={styles.card}>
            <View style={styles.checklistHeader}>
              <Text style={styles.sectionHeading}>Required Document Checklist</Text>
              <Text style={styles.checkRatio}>
                {checkedCount}/{bid.requiredDocuments.length} Ready
              </Text>
            </View>
            {bid.requiredDocuments.map((doc, idx) => {
              const isChecked = !!checkedDocs[doc];
              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.checkRow}
                  onPress={() => toggleDoc(doc)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                    <Text style={styles.checkMark}>{isChecked ? '✓' : ''}</Text>
                  </View>
                  <Text style={[styles.checkLabel, isChecked && styles.checkLabelActive]}>
                    {doc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Sticky Bottom Actions Bar (Min 48dp Touch Targets) */}
        <View style={styles.stickyFooter}>
          <TouchableOpacity
            style={styles.addPortfolioBtn}
            onPress={handleAddPortfolio}
            activeOpacity={0.8}
          >
            <Text style={styles.addPortfolioText}>+ Track in Portfolio</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.officialLinkBtn}
            onPress={() => Alert.alert('GeM Official Portal', `Direct link: ${bid.docUrl}`)}
            activeOpacity={0.8}
          >
            <Text style={styles.officialLinkText}>Open GeM Link ↗</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B132B' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#0B132B',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: '#F8FAFC', fontSize: 18, fontWeight: '700' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerBidNum: { color: '#F8FAFC', fontSize: 15, fontWeight: '800' },
  headerSubtitle: { color: '#00D09C', fontSize: 11, fontWeight: '600' },
  shareBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBtnText: { fontSize: 18 },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  verdictBanner: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  verdictHigh: {
    backgroundColor: 'rgba(0, 208, 156, 0.15)',
    borderColor: '#00D09C',
  },
  verdictModerate: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
  },
  verdictDisqualified: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  verdictTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  verdictPill: { color: '#F8FAFC', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  matchScoreText: {
    color: '#00D09C',
    fontSize: 14,
    fontWeight: '800',
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verdictSummary: { color: '#E2E8F0', fontSize: 13, lineHeight: 18 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  deptBadge: { color: '#38BDF8', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  bidTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '800', lineHeight: 22, marginBottom: 4 },
  ministryText: { color: '#94A3B8', fontSize: 12 },
  benchmarkCard: {
    backgroundColor: '#162032',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  benchmarkHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  benchmarkLabel: { color: '#60A5FA', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  benchmarkHint: { color: '#94A3B8', fontSize: 11 },
  benchmarkRange: { color: '#F8FAFC', fontSize: 24, fontWeight: '900', marginVertical: 4 },
  benchmarkSub: { color: '#94A3B8', fontSize: 11, lineHeight: 16 },
  sectionHeading: { color: '#F8FAFC', fontSize: 15, fontWeight: '800', marginBottom: 12 },
  grid2x2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCell: {
    width: '48%',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cellLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  cellValuePrimary: { color: '#F8FAFC', fontSize: 15, fontWeight: '800' },
  cellValueSecondary: { color: '#38BDF8', fontSize: 14, fontWeight: '700' },
  riskCard: { borderColor: '#F59E0B' },
  riskHeader: { marginBottom: 6 },
  riskTitle: { color: '#FBBF24', fontSize: 12, fontWeight: '800' },
  riskFlagText: { color: '#E2E8F0', fontSize: 12, lineHeight: 18, marginTop: 2 },
  boqItemRow: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  boqTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  boqItemTitle: { color: '#F8FAFC', fontSize: 13, fontWeight: '700', flex: 1, marginRight: 8 },
  boqQtyBadge: { color: '#00D09C', fontSize: 12, fontWeight: '800', backgroundColor: 'rgba(0, 208, 156, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  boqSpecsText: { color: '#94A3B8', fontSize: 11, lineHeight: 16 },
  consigneeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  consigneeLeft: { flex: 1, marginRight: 8 },
  consigneeLocation: { color: '#F8FAFC', fontSize: 13, fontWeight: '700' },
  consigneeOfficer: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  consigneeRight: { alignItems: 'flex-end' },
  stateBadge: { color: '#38BDF8', fontSize: 11, fontWeight: '700' },
  consigneeQty: { color: '#CBD5E1', fontSize: 12, fontWeight: '800', marginTop: 2 },
  checklistHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  checkRatio: { color: '#00D09C', fontSize: 13, fontWeight: '800' },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxActive: { backgroundColor: '#00D09C', borderColor: '#00D09C' },
  checkMark: { color: '#0B132B', fontSize: 15, fontWeight: '900' },
  checkLabel: { color: '#E2E8F0', fontSize: 13, flex: 1 },
  checkLabelActive: { color: '#F8FAFC', fontWeight: '600' },
  stickyFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#0B132B',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  addPortfolioBtn: {
    flex: 1.3,
    minHeight: 52,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPortfolioText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  officialLinkBtn: {
    flex: 1,
    minHeight: 52,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  officialLinkText: { color: '#CBD5E1', fontSize: 13, fontWeight: '700' },
});
