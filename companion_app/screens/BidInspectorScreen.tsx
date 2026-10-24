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
  Linking,
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
    Alert.alert('Tracked in History', `Bid ${bid.bidNumber} added to your Participated Submissions.`);
  };

  const handleOpenDoc = () => {
    if (!bid.docUrl) {
      Alert.alert('Notice', 'No official document link available for this bid.');
      return;
    }
    const isSafeGemUrl = bid.docUrl.startsWith('https://bidplus.gem.gov.in') || bid.docUrl.startsWith('https://gem.gov.in');
    if (!isSafeGemUrl) {
      Alert.alert('Security Notice', 'Document link is not from a verified official GeM domain.');
      return;
    }
    Linking.canOpenURL(bid.docUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(bid.docUrl);
        } else {
          Alert.alert('Official GeM Portal', `Bid: ${bid.bidNumber}\n\nDocument Link:\n${bid.docUrl}`);
        }
      })
      .catch(() => {
        Alert.alert('Official GeM Portal', `Bid: ${bid.bidNumber}\n\nDocument Link:\n${bid.docUrl}`);
      });
  };

  const renderTypeBadge = () => {
    if (bid.isRa || bid.type === 'RA') {
      return (
        <View style={[styles.typeBadge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <Text style={[styles.typeBadgeText, { color: '#DC2626' }]}>⚡ REVERSE AUCTION</Text>
        </View>
      );
    }
    if (bid.type === 'SERVICE') {
      return (
        <View style={[styles.typeBadge, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
          <Text style={[styles.typeBadgeText, { color: '#059669' }]}>🛠️ SERVICE CONTRACT</Text>
        </View>
      );
    }
    if (bid.type === 'CUSTOM') {
      return (
        <View style={[styles.typeBadge, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
          <Text style={[styles.typeBadgeText, { color: '#D97706' }]}>📑 CUSTOM TENDER</Text>
        </View>
      );
    }
    if (bid.type === 'BOQ') {
      return (
        <View style={[styles.typeBadge, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
          <Text style={[styles.typeBadgeText, { color: '#7C3AED' }]}>📊 BOQ TENDER</Text>
        </View>
      );
    }
    return (
      <View style={[styles.typeBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
        <Text style={[styles.typeBadgeText, { color: '#2563EB' }]}>📦 PRODUCT BID</Text>
      </View>
    );
  };

  const checkedCount = bid.requiredDocuments.filter((d) => checkedDocs[d]).length;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Header Bar (PhonePe Purple) */}
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
          {/* Bid Closing Cutoff & Freeze Protection Banner */}
          <View style={styles.cutoffBanner}>
            <View style={styles.cutoffLeft}>
              <Text style={styles.cutoffIcon}>⏱️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cutoffTitle}>Closing: 28-Oct-2026, 03:00 PM</Text>
                <Text style={styles.cutoffSubtitle}>18h 42m remaining • GeM portal freezes in final 15 mins</Text>
              </View>
            </View>
            <View style={styles.cutoffBadge}>
              <Text style={styles.cutoffBadgeText}>SUBMIT EARLY</Text>
            </View>
          </View>

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

          {/* Reseller OEM Authorization (MAF) Mandatory Warning */}
          {userProfile && !userProfile.isOem && (
            <View style={styles.oemWarningCard}>
              <Text style={styles.oemWarningIcon}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.oemWarningTitle}>OEM Authorization (MAF) Mandatory for Resellers</Text>
                <Text style={styles.oemWarningText}>
                  Your profile is registered as Reseller. Ensure you upload a valid Manufacturer Authorization Form (MAF), or technical scrutiny will disqualify this bid immediately.
                </Text>
              </View>
            </View>
          )}

          {/* CVC Past Performance Qualification Card based on Accepted Orders */}
          {evaluation.pastExperienceMatch && (
            <View style={styles.pastPerfCard}>
              <View style={styles.pastPerfHeader}>
                <Text style={styles.pastPerfBadge}>
                  {evaluation.pastExperienceMatch.qualifiesCriteria
                    ? '★ CVC PAST PERFORMANCE QUALIFIED'
                    : '⚠ EXPERIENCE CRITERIA SHORTFALL'}
                </Text>
                <Text style={styles.pastPerfStatus}>CRAC Verified</Text>
              </View>
              <Text style={styles.pastPerfDesc}>
                {evaluation.pastExperienceMatch.ruleDescription}
              </Text>
              {evaluation.pastExperienceMatch.matchingOrderNumber && (
                <View style={styles.pastPerfFooter}>
                  <Text style={styles.pastPerfContract}>
                    Verified GeM Order: {evaluation.pastExperienceMatch.matchingOrderNumber}
                  </Text>
                  <TouchableOpacity
                    style={styles.copyProofBtn}
                    onPress={() =>
                      Alert.alert(
                        'CRAC Proof Copied',
                        `Contract: ${evaluation.pastExperienceMatch?.matchingOrderNumber}\nAmount: ₹${((evaluation.pastExperienceMatch?.matchingOrderValueInr || 0) / 100000).toFixed(1)} Lakhs\nStatus: CRAC Accepted & PFMS UTR Cleared`
                      )
                    }
                  >
                    <Text style={styles.copyProofBtnText}>Copy Proof 📋</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Tender Title & Ministry */}
          <View style={styles.card}>
            <View style={styles.cardHeaderBadges}>
              {renderTypeBadge()}
              {bid.categoryDomain ? (
                <View style={styles.domainBadge}>
                  <Text style={styles.domainBadgeText}>{bid.categoryDomain}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.deptBadge}>{bid.department}</Text>
            <Text style={styles.bidTitle}>{bid.title}</Text>
            <Text style={styles.ministryText}>{bid.ministry}</Text>
          </View>

          {/* Service Contract Terms & SLA Standards */}
          {(bid.serviceDetails || bid.type === 'SERVICE') && (
            <View style={[styles.card, styles.serviceCard]}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceHeaderTitle}>🛠️ Service Contract Terms &amp; SLAs</Text>
                <Text style={styles.serviceSlaBadge}>GeM SLA Governed</Text>
              </View>
              <View style={styles.serviceGrid}>
                <View style={styles.serviceCell}>
                  <Text style={styles.serviceCellLabel}>Contract Duration</Text>
                  <Text style={styles.serviceCellValue}>
                    {bid.serviceDetails?.durationMonths ? `${bid.serviceDetails.durationMonths} Months` : '12 Months'}
                  </Text>
                </View>
                <View style={styles.serviceCell}>
                  <Text style={styles.serviceCellLabel}>Manpower / Staffing</Text>
                  <Text style={styles.serviceCellValue}>
                    {bid.serviceDetails?.manpowerCount ? `${bid.serviceDetails.manpowerCount} Personnel` : 'As per Scope'}
                  </Text>
                </View>
                <View style={styles.serviceCell}>
                  <Text style={styles.serviceCellLabel}>Billing Cycle</Text>
                  <Text style={styles.serviceCellValue}>
                    {bid.serviceDetails?.billingCycle || 'Monthly Invoice'}
                  </Text>
                </View>
                <View style={styles.serviceCell}>
                  <Text style={styles.serviceCellLabel}>Statutory Compliance</Text>
                  <Text style={[styles.serviceCellValue, { color: '#059669' }]}>
                    {bid.serviceDetails?.minimumWageCompliance !== false ? 'Central Min Wages Act' : 'Standard'}
                  </Text>
                </View>
              </View>
              <Text style={styles.serviceNote}>
                • Monthly billing subject to attendance muster roll &amp; PF/ESI challan verification prior to CRAC sign-off.
              </Text>
            </View>
          )}

          {/* Expected Winning L1 Benchmark Range */}
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
              Based on historical {bid.category || 'procurement'} clearing ratios (82%–94% of budget).
            </Text>
          </View>

          {/* 2x2 Key Fundamentals Grid */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Key Procurement Fundamentals</Text>
            <View style={styles.grid2x2}>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>Estimated Value</Text>
                <Text style={styles.cellValuePrimary}>{fundamentals.estimatedValueLabel}</Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>EMD Guarantee</Text>
                <Text style={[styles.cellValueSecondary, { color: '#00C853' }]}>
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
                <Text style={styles.cellLabel}>e-PBG Bank Guarantee</Text>
                <Text style={[styles.cellValueSecondary, { color: '#B45309' }]}>
                  {bid.epbgPercentage || 3}% (₹{(((bid.estimatedBidValueInr || 2850000) * (bid.epbgPercentage || 3)) / 10000000).toFixed(2)}L)
                </Text>
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
            <Text style={styles.sectionHeading}>BOQ &amp; Scope Breakdown ({bid.boqItems.length} Items)</Text>
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

        {/* Sticky Bottom Actions Bar (PhonePe Purple) */}
        <View style={styles.stickyFooter}>
          <TouchableOpacity
            style={styles.addPortfolioBtn}
            onPress={handleAddPortfolio}
            activeOpacity={0.8}
          >
            <Text style={styles.addPortfolioText}>+ Track in History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.officialLinkBtn}
            onPress={handleOpenDoc}
            activeOpacity={0.8}
          >
            <Text style={styles.officialLinkText}>Open GeM ↗</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: '#5F259F',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerBidNum: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  headerSubtitle: { color: '#E9D5FF', fontSize: 11, fontWeight: '500' },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBtnText: { fontSize: 16 },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  verdictBanner: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
  },
  verdictHigh: { backgroundColor: '#E8F5E9', borderColor: '#00C853' },
  verdictModerate: { backgroundColor: '#FFF3E0', borderColor: '#FF6D00' },
  verdictDisqualified: { backgroundColor: '#FFEBEE', borderColor: '#D32F2F' },
  verdictTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  verdictPill: { color: '#111827', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  matchScoreText: {
    color: '#00C853',
    fontSize: 13,
    fontWeight: '800',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verdictSummary: { color: '#374151', fontSize: 13, lineHeight: 18 },
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
  deptBadge: { color: '#5F259F', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  bidTitle: { color: '#111827', fontSize: 15, fontWeight: '800', lineHeight: 20, marginBottom: 4 },
  ministryText: { color: '#6B7280', fontSize: 12 },
  benchmarkCard: {
    backgroundColor: '#F3E8FF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  benchmarkHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  benchmarkLabel: { color: '#5F259F', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  benchmarkHint: { color: '#6B7280', fontSize: 10 },
  benchmarkRange: { color: '#111827', fontSize: 22, fontWeight: '900', marginVertical: 4 },
  benchmarkSub: { color: '#4B5563', fontSize: 11, lineHeight: 15 },
  sectionHeading: { color: '#111827', fontSize: 14, fontWeight: '800', marginBottom: 12 },
  grid2x2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridCell: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cellLabel: { color: '#6B7280', fontSize: 10, fontWeight: '600', marginBottom: 2 },
  cellValuePrimary: { color: '#111827', fontSize: 13, fontWeight: '800' },
  cellValueSecondary: { color: '#2563EB', fontSize: 13, fontWeight: '700' },
  riskCard: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  riskHeader: { marginBottom: 4 },
  riskTitle: { color: '#B45309', fontSize: 11, fontWeight: '800' },
  riskFlagText: { color: '#78350F', fontSize: 12, lineHeight: 17, marginTop: 2 },
  boqItemRow: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  boqTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  boqItemTitle: { color: '#111827', fontSize: 13, fontWeight: '700', flex: 1, marginRight: 8 },
  boqQtyBadge: { color: '#00C853', fontSize: 11, fontWeight: '800', backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  boqSpecsText: { color: '#6B7280', fontSize: 11, lineHeight: 16 },
  consigneeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  consigneeLeft: { flex: 1, marginRight: 8 },
  consigneeLocation: { color: '#111827', fontSize: 13, fontWeight: '700' },
  consigneeOfficer: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  consigneeRight: { alignItems: 'flex-end' },
  stateBadge: { color: '#2563EB', fontSize: 11, fontWeight: '700' },
  consigneeQty: { color: '#374151', fontSize: 12, fontWeight: '800', marginTop: 2 },
  checklistHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  checkRatio: { color: '#5F259F', fontSize: 12, fontWeight: '800' },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxActive: { backgroundColor: '#5F259F', borderColor: '#5F259F' },
  checkMark: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  checkLabel: { color: '#374151', fontSize: 12, flex: 1 },
  checkLabelActive: { color: '#111827', fontWeight: '600' },
  stickyFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  addPortfolioBtn: {
    flex: 1.3,
    minHeight: 48,
    backgroundColor: '#5F259F',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPortfolioText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  officialLinkBtn: {
    flex: 1,
    minHeight: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  officialLinkText: { color: '#374151', fontSize: 13, fontWeight: '700' },
  cutoffBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  cutoffLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  cutoffIcon: { fontSize: 22, marginRight: 8 },
  cutoffTitle: { color: '#92400E', fontSize: 13, fontWeight: '800' },
  cutoffSubtitle: { color: '#B45309', fontSize: 11, fontWeight: '600', marginTop: 1 },
  cutoffBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cutoffBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  oemWarningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  oemWarningIcon: { fontSize: 20, marginRight: 8, marginTop: 1 },
  oemWarningTitle: { color: '#991B1B', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  oemWarningText: { color: '#B91C1C', fontSize: 11, lineHeight: 16 },
  pastPerfCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  pastPerfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pastPerfBadge: { color: '#166534', fontSize: 12, fontWeight: '800' },
  pastPerfStatus: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pastPerfDesc: { color: '#15803D', fontSize: 12, lineHeight: 17, marginBottom: 8 },
  pastPerfFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
    paddingTop: 8,
  },
  pastPerfContract: { color: '#166534', fontSize: 11, fontWeight: '700', flex: 1, marginRight: 8 },
  copyProofBtn: {
    backgroundColor: '#166534',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  copyProofBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  cardHeaderBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  domainBadge: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  domainBadgeText: {
    color: '#374151',
    fontSize: 10,
    fontWeight: '700',
  },
  serviceCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  serviceHeaderTitle: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '800',
  },
  serviceSlaBadge: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  serviceCell: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  serviceCellLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  serviceCellValue: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
  },
  serviceNote: {
    color: '#15803D',
    fontSize: 11,
    lineHeight: 15,
    fontStyle: 'italic',
  },
});
