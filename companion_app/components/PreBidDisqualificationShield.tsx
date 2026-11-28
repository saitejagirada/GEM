/**
 * GeM Mobile Companion App - Eligibility & Go/No-Go Bid Watchouts Component
 *
 * Clean, honest pre-bid compliance breakdown built strictly from clauses extracted
 * locally from the official GeM PDF.
 * - Before a Business Profile is configured: shows transparent tender requirements
 *   from the PDF + a 1-tap "Set up 30s Business Profile" CTA (zero dummy PII).
 * - Once the user saves their private on-device Business Profile: runs
 *   DisqualificationShieldEngine live against their real criteria and any attached
 *   Workspace documents to display a clear GO / CAUTION / NO-GO verdict.
 */

import React, { useEffect, useMemo, useState } from 'react';
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
import { BusinessProfileService } from '../services/BusinessProfileService';
import {
  CompanyDocLockerService,
  type CompanyLockerDocument,
} from '../services/CompanyDocLockerService';
import { WorkspaceStorage } from '../services/WorkspaceStorage';
import { formatInr } from '../utils/formatters';
import { AppIcon } from './AppIcons';
import { BusinessProfileModal } from './BusinessProfileModal';

interface PreBidDisqualificationShieldProps {
  tenderDetails: ExtractedGeMTenderDetails;
  isServiceTender?: boolean;
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
  isServiceTender,
  profile,
  attachedDocs,
  onPrepareDocuments,
}) => {
  const { colors } = useTheme();
  const [activeTemplate, setActiveTemplate] = useState<{ title: string; content: string } | null>(
    null
  );
  const [savedProfile, setSavedProfile] = useState<UserAgentProfile | null>(() =>
    BusinessProfileService.getProfile()
  );
  const [workspaceDocs, setWorkspaceDocs] = useState<WorkspaceDocument[]>([]);
  const [lockerDocs, setLockerDocs] = useState<CompanyLockerDocument[]>(() =>
    CompanyDocLockerService.getDocuments()
  );
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    BusinessProfileService.hydrate().then(setSavedProfile).catch(() => undefined);
    const unsubProfile = BusinessProfileService.subscribe(setSavedProfile);
    CompanyDocLockerService.hydrate().then(setLockerDocs).catch(() => undefined);
    const unsubLocker = CompanyDocLockerService.subscribe(setLockerDocs);
    return () => {
      unsubProfile();
      unsubLocker();
    };
  }, []);

  useEffect(() => {
    if (attachedDocs !== undefined) return;
    let cancelled = false;
    const filterForBid = (docs: WorkspaceDocument[]) => {
      const bidNo = tenderDetails.bidNumber;
      return bidNo ? docs.filter((d) => !d.linkedBidNumber || d.linkedBidNumber === bidNo) : docs;
    };
    WorkspaceStorage.loadDocuments()
      .then((docs) => {
        if (!cancelled) setWorkspaceDocs(filterForBid(docs));
      })
      .catch(() => undefined);
    const unsubDocs = WorkspaceStorage.subscribeDocuments((docs) => {
      if (!cancelled) setWorkspaceDocs(filterForBid(docs));
    });
    return () => {
      cancelled = true;
      unsubDocs();
    };
  }, [attachedDocs, tenderDetails.bidNumber]);

  const activeProfile = profile ?? savedProfile ?? undefined;
  const activeDocs = useMemo(() => {
    if (attachedDocs !== undefined) return attachedDocs;
    return [...workspaceDocs, ...CompanyDocLockerService.toWorkspaceDocuments(lockerDocs)];
  }, [attachedDocs, workspaceDocs, lockerDocs]);

  // Run profile-matched compliance engine ONLY when a real user profile is provided/configured
  const profileReport: DisqualificationShieldReport | null = useMemo(() => {
    if (!activeProfile) return null;
    return DisqualificationShieldEngine.evaluateShield(tenderDetails, activeProfile, activeDocs, {
      isServiceTender,
    });
  }, [tenderDetails, activeProfile, activeDocs, isServiceTender]);

  // Generate clean ready-to-share compliance letters without fabricating seller stats
  const draftTemplates = useMemo(() => {
    const templateProfile: UserAgentProfile = activeProfile || {
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
  }, [tenderDetails, activeProfile]);

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
      items.push({
        id: 'turnover',
        tag: 'TURNOVER',
        tone: 'info',
        title: `Minimum ₹${formatInr(tenderDetails.minAnnualTurnoverInr)} average annual turnover`,
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

  const verdictMeta = useMemo(() => {
    if (!profileReport) return null;
    if (profileReport.overallStatus === 'BATTLE_READY') {
      return {
        label: 'GO · ELIGIBLE',
        bg: colors.successTint,
        fg: colors.success,
        border: colors.success,
        headline: 'Your business profile meets the published criteria for this tender.',
      };
    }
    if (profileReport.overallStatus === 'ELEVATED_RISK') {
      return {
        label: `CAUTION · ${profileReport.warningCount} CHECK${profileReport.warningCount === 1 ? '' : 'S'}`,
        bg: colors.warningTint,
        fg: colors.warning,
        border: colors.warning,
        headline: profileReport.summaryHeading,
      };
    }
    return {
      label: `NO-GO · ${profileReport.criticalDisqualificationCount} BLOCKER${profileReport.criticalDisqualificationCount === 1 ? '' : 'S'}`,
      bg: colors.dangerTint,
      fg: colors.danger,
      border: colors.danger,
      headline: profileReport.summaryHeading,
    };
  }, [profileReport, colors]);

  return (
    <View style={styles.sectionBlock}>
      {/* Apple Inset-Grouped External Section Header */}
      <View style={styles.sectionEyebrowRow}>
        <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
          {profileReport ? 'ELIGIBILITY VERDICT' : 'ELIGIBILITY & WATCHOUTS'}
        </Text>
        {profileReport ? (
          <Pressable
            onPress={() => setShowProfileModal(true)}
            hitSlop={10}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <Text style={[styles.eyebrowAction, { color: colors.primary }]}>Edit Profile</Text>
          </Pressable>
        ) : null}
      </View>

      <View
        style={[
          styles.container,
          { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
        ]}
      >
        {/* Live Go / Caution / No-Go Verdict Header (Mode 2) OR 30s Profile Setup Row (Mode 1) */}
        {profileReport && verdictMeta ? (
          <View
            style={[
              styles.verdictBanner,
              {
                backgroundColor: verdictMeta.bg,
                borderLeftColor: verdictMeta.border,
              },
            ]}
          >
            <View style={styles.verdictTopRow}>
              <Text style={[styles.verdictBadgeText, { color: verdictMeta.fg }]}>
                {verdictMeta.label}
              </Text>
              <Text style={[styles.verdictCounts, { color: verdictMeta.fg }]}>
                {profileReport.passedCount} OK · {profileReport.warningCount} Check ·{' '}
                {profileReport.criticalDisqualificationCount} Blocker
              </Text>
            </View>
            <Text style={[styles.verdictHeadline, { color: colors.textPrimary }]}>
              {verdictMeta.headline}
            </Text>
            {activeProfile ? (
              <Text style={[styles.verdictProfileMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                {BusinessProfileService.formatProfileSummary(activeProfile)}
              </Text>
            ) : null}
          </View>
        ) : (
          <Pressable
            onPress={() => setShowProfileModal(true)}
            style={({ pressed }) => [
              styles.setupPromptBox,
              {
                backgroundColor: colors.primaryTint,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View style={[styles.setupIconWrap, { backgroundColor: colors.surface }]}>
              <AppIcon name="profile" color={colors.primary} size={17} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.setupPromptTitle, { color: colors.primary }]}>
                Check if your business qualifies
              </Text>
              <Text style={[styles.setupPromptSub, { color: colors.textSecondary }]}>
                Set up a 30s private profile (OEM/Reseller, Turnover, MSE) for instant Go/No-Go verdicts.
              </Text>
            </View>
            <Text style={[styles.setupPromptCta, { color: colors.primary }]}>Setup ›</Text>
          </Pressable>
        )}

        {/* Mode 1: Honest published rules (default when no seller profile is configured) */}
        {!profileReport ? (
          publishedWatchouts.length > 0 ? (
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
                      idx > 0 && {
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: colors.borderSubtle,
                      },
                    ]}
                  >
                    <View style={styles.checkTitleLine}>
                      <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                        {item.title}
                      </Text>
                      <View style={[styles.tagPill, { backgroundColor: tagBg }]}>
                        <Text style={[styles.tagPillText, { color: tagFg }]}>{item.tag}</Text>
                      </View>
                    </View>
                    <Text style={[styles.rowDetail, { color: colors.textSecondary }]}>
                      {item.detail}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={[styles.noRulesNote, { color: colors.textSecondary }]}>
              No mandatory turnover, EMD, or experience thresholds were flagged in the scanned summary.
              Confirm full terms inside the official Bid PDF.
            </Text>
          )
        ) : (
          /* Mode 2: Separated Company Eligibility vs. Bid Paperwork Checks */
          (() => {
            const eligibilityChecks = profileReport.checks.filter(
              (c) => (c.checkKind ?? 'ELIGIBILITY') === 'ELIGIBILITY'
            );
            const documentChecks = profileReport.checks.filter((c) => c.checkKind === 'DOCUMENT');
            const renderCheckRow = (
              check: DisqualificationShieldReport['checks'][number],
              idx: number
            ) => {
              const isCritical = check.severity === 'CRITICAL';
              const isWarning = check.severity === 'WARNING';
              const tagBg = isCritical
                ? colors.dangerTint
                : isWarning
                  ? colors.warningTint
                  : colors.successTint;
              const tagFg = isCritical
                ? colors.danger
                : isWarning
                  ? colors.warning
                  : colors.success;
              const tagText = isCritical ? 'Blocker' : isWarning ? 'Check' : 'Pass';

              return (
                <View
                  key={check.id}
                  style={[
                    styles.watchoutRow,
                    idx > 0 && {
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <View style={styles.checkTitleLine}>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                      {check.title}
                    </Text>
                    <View style={[styles.tagPill, { backgroundColor: tagBg }]}>
                      <Text style={[styles.tagPillText, { color: tagFg }]}>{tagText}</Text>
                    </View>
                  </View>
                  <Text style={[styles.rowDetail, { color: colors.textSecondary }]}>
                    {check.reason}
                  </Text>
                </View>
              );
            };

            return (
              <View>
                {eligibilityChecks.length > 0 ? (
                  <View style={styles.listWrap}>
                    <Text style={[styles.groupEyebrow, { color: colors.textMuted }]}>
                      COMPANY ELIGIBILITY
                    </Text>
                    {eligibilityChecks.map(renderCheckRow)}
                  </View>
                ) : null}
                {documentChecks.length > 0 ? (
                  <View
                    style={[
                      styles.listWrap,
                      eligibilityChecks.length > 0 && {
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: colors.borderSubtle,
                      },
                    ]}
                  >
                    <Text style={[styles.groupEyebrow, { color: colors.textMuted }]}>
                      REQUIRED PAPERWORK
                    </Text>
                    {documentChecks.map(renderCheckRow)}
                  </View>
                ) : null}
              </View>
            );
          })()
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
                    { backgroundColor: colors.surfaceSubtle },
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
          <Text style={[styles.subSectionTitle, { color: colors.textMuted }]}>
            QUICK LETTER DRAFTS
          </Text>
          <View style={styles.chipWrap}>
            <Pressable
              style={({ pressed }) => [
                styles.draftBtn,
                {
                  backgroundColor: colors.primaryTint,
                  opacity: pressed ? 0.75 : 1,
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
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
              onPress={() => handleOpenTemplate('CA_UDIN_REQUEST')}
            >
              <Text style={[styles.draftBtnText, { color: colors.textPrimary }]}>
                CA UDIN Request ↗
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.draftBtn,
                {
                  backgroundColor: colors.surfaceSubtle,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
              onPress={() => handleOpenTemplate('OEM_MAF_REQUEST')}
            >
              <Text style={[styles.draftBtnText, { color: colors.textPrimary }]}>
                OEM MAF Request ↗
              </Text>
            </Pressable>
          </View>
        </View>

        {onPrepareDocuments ? (
          <Pressable
            style={({ pressed }) => [
              styles.prepareLinkRow,
              { borderTopColor: colors.borderSubtle, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={onPrepareDocuments}
          >
            <Text style={[styles.prepareLinkText, { color: colors.primary }]}>
              Organize &amp; attach tender documents in Workspace
            </Text>
            <Text style={[styles.prepareChevron, { color: colors.textMuted }]}>›</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Compliance Letter Draft Modal */}
      <Modal
        visible={!!activeTemplate}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveTemplate(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setActiveTemplate(null)} />
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
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

      {/* Private On-Device Business Profile Modal */}
      <BusinessProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSaved={(saved) => setSavedProfile(saved)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  sectionBlock: {
    marginTop: 20,
  },
  sectionEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
    gap: 8,
  },
  sectionEyebrow: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  eyebrowAction: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  container: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  verdictBanner: {
    borderLeftWidth: 3.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  verdictTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 5,
  },
  verdictBadgeText: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  verdictCounts: {
    fontSize: 11.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  verdictHeadline: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  verdictProfileMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  setupPromptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 60,
  },
  setupIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupPromptTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  setupPromptSub: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  setupPromptCta: {
    fontSize: 13,
    fontWeight: '600',
  },
  noRulesNote: {
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  listWrap: {
    paddingHorizontal: 16,
  },
  groupEyebrow: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.55,
    paddingTop: 12,
    paddingBottom: 2,
  },
  watchoutRow: {
    paddingVertical: 14,
  },
  checkTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  rowTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    lineHeight: 20,
    flex: 1,
  },
  tagPill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rowDetail: {
    fontSize: 13,
    lineHeight: 19,
  },
  subSection: {
    marginHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  subSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 9,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stateChip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stateChipText: {
    fontSize: 12.5,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  draftBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 38,
    justifyContent: 'center',
  },
  draftBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  prepareLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  prepareLinkText: {
    fontSize: 13.5,
    fontWeight: '600',
    flex: 1,
  },
  prepareChevron: {
    fontSize: 19,
    fontWeight: '400',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: '82%',
    paddingTop: 10,
    paddingBottom: 16,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  modalClose: { fontSize: 18, fontWeight: '600' },
  modalBody: { paddingHorizontal: 16, paddingVertical: 14, maxHeight: 420 },
  templateContent: { fontSize: 13.5, lineHeight: 21 },
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
