/**
 * GeM Mobile Companion App - Pre-Bid Disqualification Shield Component
 * 
 * Interactive pre-submission checklist and compliance verification card.
 * Protects vendors against technical disqualification by cross-referencing
 * on-device extracted tender clauses against seller profile and uploaded files.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext.tsx';
import type { UserAgentProfile, WorkspaceDocument } from '../types/index.ts';
import type { ExtractedGeMTenderDetails } from '../services/GemPdfExtractor.ts';
import { DisqualificationShieldEngine, type DisqualificationShieldReport } from '../services/DisqualificationShieldEngine.ts';

interface PreBidDisqualificationShieldProps {
  tenderDetails: ExtractedGeMTenderDetails;
  profile?: UserAgentProfile;
  attachedDocs?: WorkspaceDocument[];
  onPrepareDocuments?: () => void;
}

export const PreBidDisqualificationShield: React.FC<PreBidDisqualificationShieldProps> = ({
  tenderDetails,
  profile,
  attachedDocs = [],
  onPrepareDocuments,
}) => {
  const { colors } = useTheme();
  const [activeTemplate, setActiveTemplate] = useState<{ title: string; content: string } | null>(null);

  const safeProfile: UserAgentProfile = profile || {
    id: 'default-profile',
    organizationName: 'Verified Enterprise',
    msmeCategory: 'MICRO',
    annualTurnoverInr: 5000000,
    yearsExperience: 3,
    productCategories: ['LED Luminaire', 'IT', 'Solar'],
    targetStates: ['Delhi', 'Uttar Pradesh', 'Maharashtra'],
    isOem: false,
    hasUdyamCertificate: true,
  };

  const report: DisqualificationShieldReport = DisqualificationShieldEngine.evaluateShield(
    tenderDetails,
    safeProfile,
    attachedDocs
  );

  const getStatusColor = (status: DisqualificationShieldReport['overallStatus']) => {
    switch (status) {
      case 'BATTLE_READY':
        return '#059669'; // Emerald
      case 'ELEVATED_RISK':
        return '#D97706'; // Saffron Gold
      case 'CRITICAL_DISQUALIFICATION_RISK':
        return '#DC2626'; // Crimson Red
    }
  };

  const getStatusBadgeText = (status: DisqualificationShieldReport['overallStatus']) => {
    switch (status) {
      case 'BATTLE_READY':
        return `SHIELD ACTIVE · ${report.shieldScore}% PASS`;
      case 'ELEVATED_RISK':
        return `CAUTION · ${report.shieldScore}% READINESS`;
      case 'CRITICAL_DISQUALIFICATION_RISK':
        return `CRITICAL RISK · ${report.shieldScore}% (DISQUALIFICATION LIKELY)`;
    }
  };

  const handleOpenTemplate = (action?: string) => {
    if (!action) return;
    if (action === 'MII_DECLARATION' && report.generatedTemplates.miiSelfDeclaration) {
      setActiveTemplate({
        title: 'Make in India (MII) Self-Declaration',
        content: report.generatedTemplates.miiSelfDeclaration,
      });
    } else if (action === 'CA_UDIN_REQUEST' && report.generatedTemplates.caTurnoverRequest) {
      setActiveTemplate({
        title: 'Requisition for CA Turnover Certificate with UDIN',
        content: report.generatedTemplates.caTurnoverRequest,
      });
    } else if (action === 'OEM_MAF_REQUEST' && report.generatedTemplates.oemMafRequest) {
      setActiveTemplate({
        title: 'OEM Authorization Form (MAF) Requisition',
        content: report.generatedTemplates.oemMafRequest,
      });
    }
  };

  const handleShareTemplate = async () => {
    if (!activeTemplate) return;
    try {
      await Share.share({
        title: activeTemplate.title,
        message: activeTemplate.content,
      });
    } catch {
      Alert.alert('Copy Template', 'Template text ready.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.shieldIcon}>🛡️</Text>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Pre-Bid Disqualification Shield</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>On-Device Technical Evaluation Verification</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.overallStatus) + '20', borderColor: getStatusColor(report.overallStatus) }]}>
          <Text style={[styles.statusBadgeText, { color: getStatusColor(report.overallStatus) }]}>
            {getStatusBadgeText(report.overallStatus)}
          </Text>
        </View>
      </View>

      {/* Summary Banner */}
      <View style={[styles.summaryBanner, { backgroundColor: getStatusColor(report.overallStatus) + '15', borderColor: getStatusColor(report.overallStatus) + '40' }]}>
        <Text style={[styles.summaryText, { color: getStatusColor(report.overallStatus) }]}>
          {report.summaryHeading}
        </Text>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricCell, { backgroundColor: '#F0FDF4' }]}>
          <Text style={[styles.metricCount, { color: '#059669' }]}>{report.passedCount}</Text>
          <Text style={styles.metricLabel}>Passed</Text>
        </View>
        <View style={[styles.metricCell, { backgroundColor: '#FEF3C7' }]}>
          <Text style={[styles.metricCount, { color: '#D97706' }]}>{report.warningCount}</Text>
          <Text style={styles.metricLabel}>Warnings</Text>
        </View>
        <View style={[styles.metricCell, { backgroundColor: '#FEF2F2' }]}>
          <Text style={[styles.metricCount, { color: '#DC2626' }]}>{report.criticalDisqualificationCount}</Text>
          <Text style={styles.metricLabel}>Blocking</Text>
        </View>
      </View>

      {/* Checks List */}
      <View style={styles.checklist}>
        {report.checks.map((check) => {
          const isCritical = check.severity === 'CRITICAL';
          const isWarning = check.severity === 'WARNING';
          const icon = isCritical ? '✕' : isWarning ? '⚠' : '✓';
          const iconBg = isCritical ? '#FEF2F2' : isWarning ? '#FEF3C7' : '#ECFDF5';
          const iconColor = isCritical ? '#DC2626' : isWarning ? '#D97706' : '#059669';

          return (
            <View key={check.id} style={[styles.checkCard, { borderColor: isCritical ? '#FECACA' : colors.border }]}>
              <View style={styles.checkHeader}>
                <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
                  <Text style={[styles.iconText, { color: iconColor }]}>{icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.checkTitle, { color: colors.textPrimary }]}>{check.title}</Text>
                  <Text style={[styles.checkReason, { color: colors.textSecondary }]}>{check.reason}</Text>
                </View>
              </View>

              {check.remediation ? (
                <View style={styles.remediationBox}>
                  <Text style={styles.remediationText}>💡 Remediation: {check.remediation}</Text>
                  {check.templateAction ? (
                    <TouchableOpacity
                      style={styles.templateButton}
                      onPress={() => handleOpenTemplate(check.templateAction)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.templateButtonText}>Draft Compliance Letter ↗</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {/* Consignee Logistics Distribution Matrix */}
      {tenderDetails.consignees && tenderDetails.consignees.length > 0 ? (
        <View style={styles.logisticsCard}>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Consignee Delivery Split</Text>
          <View style={styles.stateTagsRow}>
            {Object.entries(tenderDetails.consigneeStateDistribution).map(([state, data]) => (
              <View key={state} style={styles.stateTag}>
                <Text style={styles.stateTagTitle}>{state}</Text>
                <Text style={styles.stateTagMeta}>{data.quantity} Units ({data.percentage}%)</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Prepare Documents Handoff */}
      {onPrepareDocuments ? (
        <TouchableOpacity style={styles.prepareButton} onPress={onPrepareDocuments} activeOpacity={0.8}>
          <Text style={styles.prepareButtonText}>Attach Missing Documents in Workspace →</Text>
        </TouchableOpacity>
      ) : null}

      {/* Template Modal */}
      <Modal visible={!!activeTemplate} animationType="slide" transparent onRequestClose={() => setActiveTemplate(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{activeTemplate?.title}</Text>
              <TouchableOpacity onPress={() => setActiveTemplate(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.templateContent, { color: colors.textPrimary }]}>{activeTemplate?.content}</Text>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShareTemplate}>
                <Text style={styles.shareBtnText}>Share / Copy Text</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  shieldIcon: {
    fontSize: 24,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  summaryBanner: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  metricCell: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  metricCount: {
    fontSize: 16,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 2,
  },
  checklist: {
    marginTop: 12,
    gap: 8,
  },
  checkCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  checkHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 13,
    fontWeight: '900',
  },
  checkTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  checkReason: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  remediationBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0B5577',
  },
  remediationText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 15,
  },
  templateButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#0B5577',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 6,
  },
  templateButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  logisticsCard: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  stateTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stateTag: {
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  stateTagTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
  },
  stateTagMeta: {
    fontSize: 10,
    color: '#3B82F6',
    marginTop: 1,
  },
  prepareButton: {
    backgroundColor: '#0B3B60',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  prepareButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    borderRadius: 12,
    maxHeight: '80%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  modalClose: {
    fontSize: 18,
    color: '#64748B',
    paddingHorizontal: 8,
  },
  modalBody: {
    marginVertical: 12,
  },
  templateContent: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
  },
  shareBtn: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
