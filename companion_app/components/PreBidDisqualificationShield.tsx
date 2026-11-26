/**
 * GeM Mobile Companion App - Eligibility & Bid Watchouts Component
 *
 * Clean, honest pre-bid compliance breakdown built strictly from clauses extracted
 * locally from the official GeM PDF.
 * - When no seller profile is configured, shows transparent tender requirements and
 *   practical GeM watchouts without fabricating failure/rejection alarms against
 *   dummy profile data.
 * - When an explicit seller profile is provided, runs DisqualificationShieldEngine
 *   against the user's real profile and attached documents.
 */

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { UserAgentProfile, WorkspaceDocument } from '../types/index';
import type { ExtractedGeMTenderDetails } from '../services/GemPdfExtractor';
import {
  DisqualificationShieldEngine,
  type DisqualificationShieldReport,
} from '../services/DisqualificationShieldEngine';
import { formatInr } from '../utils/formatters';

interface PreBidDisqualificationShieldProps {
  tenderDetails: ExtractedGeMTenderDetails;
  profile?: UserAgentProfile;
  attachedDocs?: WorkspaceDocument[];
  onPrepareDocuments?: () => void;
}

interface RequirementBullet {
  id: string;
  tag: string;
  tone: 'info' | 'caution' | 'positive';
  title: string;
  detail: string;
}

export const PreBidDisqualificationShield: React.FC<PreBidDisqualificationShieldProps> = ({
  tenderDetails,
  profile,
  attachedDocs = [],
  onPrepareDocuments,
}) => {
  const { colors } = useTheme();
  const [activeTemplate, setActiveTemplate] = useState<{ title: string; content: string } | null>(null);

  // Run profile-matched compliance engine ONLY when a real user profile is provided
  const profileReport: DisqualificationShieldReport | null = useMemo(() => {
    if (!profile) return null;
    return DisqualificationShieldEngine.evaluateShield(tenderDetails, profile, attachedDocs);
  }, [tenderDetails, profile, attachedDocs]);

  // Generate clean ready-to-share compliance letters without fabricating seller stats
  const draftTemplates = useMemo(() => {
    const templateProfile: UserAgentProfile = profile || {
      id: 'template-only',
      organizationName: '[Your Company Name]',
      msmeCategory: 'MICRO',
      annualTurnoverInr: 0,
      yearsExperience: 0,
      productCategories: [],
      targetStates: [],
      isOem: true,
      hasUdyamCertificate: false,
    };
    return {
      mii: DisqualificationShieldEngine.generateMiiTemplate(tenderDetails, templateProfile),
      ca: DisqualificationShieldEngine.generateCaRequestTemplate(tenderDetails, templateProfile),
      oem: DisqualificationShieldEngine.generateOemMafTemplate(tenderDetails, templateProfile),
    };
  }, [tenderDetails, profile]);

  // Honest tender-derived requirements & GeM rule watchouts (when no user profile is set)
  const publishedWatchouts = useMemo<RequirementBullet[]>(() => {
    const items: RequirementBullet[] = [];

    if (tenderDetails.emdAmountInr && tenderDetails.emdAmountInr > 0) {
      items.push({
        id: 'emd-rule',
        tag: 'EMD',
        tone: 'caution',
        title: `EMD of ₹${formatInr(tenderDetails.emdAmountInr)} required`,
        detail: tenderDetails.isEmdExemptForMse
          ? 'MSE EMD exemption on goods applies only to OEM Manufacturers with valid Udyam — traders/resellers must submit EMD.'
          : 'Confirm EMD bank guarantee or exemption eligibility in the tender PDF before quoting.',
      });
    } else if (tenderDetails.emdAmountInr === 0) {
      items.push({
        id: 'emd-free',
        tag: 'EMD',
        tone: 'positive',
        title: 'No EMD required',
        detail: 'Official PDF indicates EMD is not required for this tender.',
      });
    }

    if (tenderDetails.minAnnualTurnoverInr && tenderDetails.minAnnualTurnoverInr > 0) {
      const lakhs = (tenderDetails.minAnnualTurnoverInr / 100000).toFixed(1);
      items.push({
        id: 'turnover',
        tag: 'TURNOVER',
        tone: 'info',
        title: `Minimum ₹${lakhs} Lakhs average annual turnover`,
        detail: tenderDetails.mseExemptionForExpAndTurnover
          ? 'Buyer enabled MSE/Startup turnover relaxation — verify exact supporting document clause in PDF.'
          : 'Keep audited balance sheets or a CA Turnover Certificate with valid ICAI UDIN ready.',
      });
    }

    if (tenderDetails.yearsExperienceRequired && tenderDetails.yearsExperienceRequired > 0) {
      items.push({
        id: 'experience',
        tag: 'EXPERIENCE',
        tone: 'info',
        title: `${tenderDetails.yearsExperienceRequired} year${tenderDetails.yearsExperienceRequired === 1 ? '' : 's'} past experience required`,
        detail: 'Attach past government/PSU purchase orders along with CRAC or completion certificates.',
      });
    }

    if (tenderDetails.miiPurchasePreference || tenderDetails.requiresMiiDeclaration) {
      const pct = tenderDetails.miiLocalContentPercentage || 50;
      items.push({
        id: 'mii',
        tag: 'MII',
        tone: 'info',
        title: `Make in India (≥${pct}% local content)`,
        detail: 'Upload signed MII local content self-declaration on company letterhead during technical bid.',
      });
    }

    if (tenderDetails.requiresOemAuthorization) {
      items.push({
        id: 'oem',
        tag: 'OEM MAF',
        tone: 'caution',
        title: 'OEM Authorization (MAF) requested',
        detail: 'Authorized resellers/dealers must attach a bid-specific Manufacturer Authorization Form.',
      });
    }

    if (tenderDetails.epbgPercentage && tenderDetails.epbgPercentage > 0) {
      items.push({
        id: 'epbg',
        tag: 'e-PBG',
        tone: 'info',
        title: `${tenderDetails.epbgPercentage}% Performance Security${tenderDetails.epbgDurationMonths ? ` (${tenderDetails.epbgDurationMonths} months)` : ''}`,
        detail: 'Winning L1 bidder must furnish e-PBG after contract award.',
      });
    }

    return items;
  }, [tenderDetails]);

  const handleOpenTemplate = (action?: 'MII_DECLARATION' | 'CA_UDIN_REQUEST' | 'OEM_MAF_REQUEST') => {
    if (action === 'MII_DECLARATION') {
      setActiveTemplate({
        title: 'Make in India (MII) Self-Declaration',
        content: draftTemplates.mii,
      });
    } else if (action === 'CA_UDIN_REQUEST') {
      setActiveTemplate({
        title: 'CA Turnover Certificate (UDIN) Request',
        content: draftTemplates.ca,
      });
    } else if (action === 'OEM_MAF_REQUEST') {
      setActiveTemplate({
        title: 'OEM Authorization (MAF) Request',
        content: draftTemplates.oem,
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
      Alert.alert('Template Ready', 'You can copy this compliance draft from the screen.');
    }
  };

  const stateEntries = Object.entries(tenderDetails.consigneeStateDistribution || {});

  if (!profileReport && publishedWatchouts.length === 0 && stateEntries.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {profileReport ? 'Eligibility Check' : 'Eligibility & Key Watchouts'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {profileReport
              ? 'Matched against your saved seller profile'
              : 'Key rules extracted directly from the official GeM PDF'}
          </Text>
        </View>
        {profileReport ? (
          <View
            style={[
              styles.scoreBadge,
              {
                backgroundColor:
                  profileReport.overallStatus === 'BATTLE_READY'
                    ? colors.successTint
                    : profileReport.overallStatus === 'ELEVATED_RISK'
                      ? colors.warningTint
                      : colors.dangerTint,
              },
            ]}
          >
            <Text
              style={[
                styles.scoreBadgeText,
                {
                  color:
                    profileReport.overallStatus === 'BATTLE_READY'
                      ? colors.success
                      : profileReport.overallStatus === 'ELEVATED_RISK'
                        ? colors.warning
                        : colors.danger,
                },
              ]}
            >
              {profileReport.shieldScore}% Ready
            </Text>
          </View>
        ) : null}
      </View>

      {/* Mode 1: Honest published rules (default when no seller profile is configured) */}
      {!profileReport ? (
        <View style={styles.listWrap}>
          {publishedWatchouts.map((item, idx) => {
            const tagBg =
              item.tone === 'positive'
                ? colors.successTint
                : item.tone === 'caution'
                  ? colors.warningTint
                  : colors.primaryTint;
            const tagFg =
              item.tone === 'positive'
                ? colors.success
                : item.tone === 'caution'
                  ? colors.warning
                  : colors.primary;

            return (
              <View
                key={item.id}
                style={[
                  styles.watchoutRow,
                  idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSubtle },
                ]}
              >
                <View style={[styles.tagPill, { backgroundColor: tagBg }]}>
                  <Text style={[styles.tagPillText, { color: tagFg }]}>{item.tag}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                  <Text style={[styles.rowDetail, { color: colors.textSecondary }]}>{item.detail}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        /* Mode 2: Real profile comparison (clean, calm, zero emojis) */
        <View style={styles.listWrap}>
          {profileReport.checks.map((check, idx) => {
            const isCritical = check.severity === 'CRITICAL';
            const isWarning = check.severity === 'WARNING';
            const tagBg = isCritical
              ? colors.dangerTint
              : isWarning
                ? colors.warningTint
                : colors.successTint;
            const tagFg = isCritical ? colors.danger : isWarning ? colors.warning : colors.success;
            const tagText = isCritical ? 'ACTION' : isWarning ? 'CHECK' : 'OK';

            return (
              <View
                key={check.id}
                style={[
                  styles.watchoutRow,
                  idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSubtle },
                ]}
              >
                <View style={[styles.tagPill, { backgroundColor: tagBg }]}>
                  <Text style={[styles.tagPillText, { color: tagFg }]}>{tagText}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{check.title}</Text>
                  <Text style={[styles.rowDetail, { color: colors.textSecondary }]}>{check.reason}</Text>
                  {check.remediation ? (
                    <Text style={[styles.remediationLine, { color: colors.primary }]}>
                      Next step: {check.remediation}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Delivery State Split (if present in PDF) */}
      {stateEntries.length > 0 ? (
        <View style={[styles.subSection, { borderTopColor: colors.borderSubtle }]}>
          <Text style={[styles.subSectionTitle, { color: colors.textMuted }]}>DELIVERY STATES</Text>
          <View style={styles.chipWrap}>
            {stateEntries.map(([state, data]) => (
              <View
                key={state}
                style={[
                  styles.stateChip,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                ]}
              >
                <Text style={[styles.stateChipText, { color: colors.textPrimary }]}>
                  {state} · {data.quantity.toLocaleString('en-IN')} ({data.percentage}%)
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Useful 1-Tap Compliance Letter Drafts */}
      <View style={[styles.subSection, { borderTopColor: colors.borderSubtle }]}>
        <Text style={[styles.subSectionTitle, { color: colors.textMuted }]}>QUICK LETTER DRAFTS</Text>
        <View style={styles.chipWrap}>
          <Pressable
            style={({ pressed }) => [
              styles.draftBtn,
              {
                backgroundColor: colors.primaryTint,
                borderColor: colors.primary,
                opacity: pressed ? 0.78 : 1,
              },
            ]}
            onPress={() => handleOpenTemplate('MII_DECLARATION')}
          >
            <Text style={[styles.draftBtnText, { color: colors.primary }]}>MII Declaration ↗</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.draftBtn,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
                opacity: pressed ? 0.78 : 1,
              },
            ]}
            onPress={() => handleOpenTemplate('CA_UDIN_REQUEST')}
          >
            <Text style={[styles.draftBtnText, { color: colors.textPrimary }]}>CA UDIN Request ↗</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.draftBtn,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
                opacity: pressed ? 0.78 : 1,
              },
            ]}
            onPress={() => handleOpenTemplate('OEM_MAF_REQUEST')}
          >
            <Text style={[styles.draftBtnText, { color: colors.textPrimary }]}>OEM MAF Request ↗</Text>
          </Pressable>
        </View>
      </View>

      {onPrepareDocuments ? (
        <Pressable
          style={({ pressed }) => [
            styles.prepareLinkRow,
            { borderTopColor: colors.borderSubtle, opacity: pressed ? 0.75 : 1 },
          ]}
          onPress={onPrepareDocuments}
        >
          <Text style={[styles.prepareLinkText, { color: colors.primary }]}>
            Organize &amp; attach tender documents in Workspace →
          </Text>
        </Pressable>
      ) : null}

      {/* Compliance Letter Draft Modal */}
      <Modal
        visible={!!activeTemplate}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveTemplate(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setActiveTemplate(null)} />
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                {activeTemplate?.title}
              </Text>
              <Pressable onPress={() => setActiveTemplate(null)} hitSlop={10}>
                <Text style={[styles.modalClose, { color: colors.textMuted }]}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.templateContent, { color: colors.textPrimary }]}>
                {activeTemplate?.content}
              </Text>
            </ScrollView>
            <View style={[styles.modalFooter, { borderTopColor: colors.borderSubtle }]}>
              <Pressable
                style={[styles.shareBtn, { backgroundColor: colors.primary }]}
                onPress={handleShareTemplate}
              >
                <Text style={[styles.shareBtnText, { color: colors.textInverse }]}>
                  Share / Copy Draft ↗
                </Text>
              </Pressable>
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
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  title: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  scoreBadge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  scoreBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  listWrap: {
    marginTop: 2,
  },
  watchoutRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 10,
  },
  tagPill: {
    minWidth: 68,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    alignItems: 'center',
    marginTop: 1,
  },
  tagPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  rowDetail: {
    fontSize: 11.5,
    lineHeight: 16.5,
    marginTop: 2,
  },
  remediationLine: {
    fontSize: 11.5,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 4,
  },
  subSection: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  subSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stateChip: {
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  stateChipText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  draftBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  draftBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  prepareLinkRow: {
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  prepareLinkText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    maxHeight: '82%',
    paddingBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  modalTitle: { fontSize: 15, fontWeight: '800', flex: 1 },
  modalClose: { fontSize: 18, fontWeight: '700' },
  modalBody: { paddingHorizontal: 16, paddingVertical: 12, maxHeight: 420 },
  templateContent: { fontSize: 12.5, lineHeight: 19 },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  shareBtn: {
    borderRadius: 9,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnText: { fontSize: 13.5, fontWeight: '800' },
});
