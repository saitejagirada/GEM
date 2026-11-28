/**
 * GeM Mobile Companion App - 3-Tab Role-Specific WhatsApp Brief Studio
 *
 * Replaces the single generic share sheet with 3 focused, exact-data briefs:
 *   1. Partner Brief — Clean Deal Sheet snapshot + exact PDF figures + Go/No-Go badge
 *   2. Ask OEM       — Pre-filled dealer quotation & bid-specific MAF request
 *   3. Ask CA        — Pre-filled ICAI UDIN Turnover Certificate requisition
 *
 * Strictly uses verified *.gem.gov.in PDF links and exact unrounded INR figures.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  NativeModules,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { DeconstructedBidDoc, UserAgentProfile } from '../types/index';
import { BusinessProfileService } from '../services/BusinessProfileService';
import {
  WhatsAppBriefBuilder,
  type BriefAudience,
} from '../services/WhatsAppBriefBuilder';
import { formatDateSafe, formatInr } from '../utils/formatters';

interface TenderDealSheetCardProps {
  bid: DeconstructedBidDoc;
  visible: boolean;
  onClose: () => void;
  eligibilitySummary?: string;
  consultantBranding?: {
    agencyName?: string;
    contactPhone?: string;
  };
}

const AUDIENCE_TABS: ReadonlyArray<{ id: BriefAudience; label: string }> = [
  { id: 'PARTNER', label: 'Partner Brief' },
  { id: 'OEM', label: 'Ask OEM (MAF)' },
  { id: 'CA', label: 'Ask CA (UDIN)' },
];

function copyTextSafe(text: string): boolean {
  try {
    const clip = NativeModules?.Clipboard || NativeModules?.RNCClipboard;
    if (clip && typeof clip.setString === 'function') {
      clip.setString(text);
      return true;
    }
  } catch {
    // Fallback handled by caller
  }
  return false;
}

export const TenderDealSheetCard: React.FC<TenderDealSheetCardProps> = ({
  bid,
  visible,
  onClose,
  eligibilitySummary,
  consultantBranding,
}) => {
  const { colors } = useTheme();
  const [audience, setAudience] = useState<BriefAudience>('PARTNER');
  const [copied, setCopied] = useState<boolean>(false);
  const [profile, setProfile] = useState<UserAgentProfile | null>(() =>
    BusinessProfileService.getProfile()
  );

  useEffect(() => {
    BusinessProfileService.hydrate().then(setProfile).catch(() => undefined);
    return BusinessProfileService.subscribe(setProfile);
  }, []);

  useEffect(() => {
    if (visible) {
      setAudience('PARTNER');
      setCopied(false);
    }
  }, [visible, bid.bidNumber]);

  const closingDate = new Date(bid.closingTimeUtc || Date.now());
  const isValidClosing = !isNaN(closingDate.getTime());
  const diffHours = isValidClosing
    ? Math.max(0, Math.round((closingDate.getTime() - Date.now()) / (1000 * 60 * 60)))
    : 0;
  const diffDays = Math.floor(diffHours / 24);
  const remainingText = !isValidClosing
    ? 'See PDF'
    : diffHours <= 0
      ? 'Closed'
      : diffDays > 0
        ? `${diffDays}d ${diffHours % 24}h left`
        : `${diffHours}h left`;

  const estValText =
    bid.estimatedBidValueInr && bid.estimatedBidValueInr > 0
      ? `₹${formatInr(bid.estimatedBidValueInr)}`
      : bid.isHighValue
        ? '≥ ₹2 Cr'
        : 'Not disclosed';

  const emdValText =
    bid.emdAmountInr === undefined
      ? 'Check PDF'
      : bid.emdAmountInr === 0
        ? 'None (₹0)'
        : `₹${formatInr(bid.emdAmountInr)}`;

  const epbgText =
    bid.epbgPercentage === undefined
      ? 'Check PDF'
      : bid.epbgPercentage === 0
        ? 'None (0%)'
        : bid.epbgDurationMonths
          ? `${bid.epbgPercentage}% (${bid.epbgDurationMonths} mo)`
          : `${bid.epbgPercentage}%`;

  const isMseExempt = Boolean(bid.isEmdExemptForMse);
  const miiText =
    bid.makeInIndiaClass === 'CLASS_1'
      ? 'Class-1 (≥50% Local)'
      : bid.makeInIndiaClass === 'CLASS_2'
        ? 'Class-2 (≥20% Local)'
        : bid.miiPurchasePreference
          ? 'MII Preference'
          : 'Not specified';

  const turnoverText =
    bid.minAnnualTurnoverInr && bid.minAnnualTurnoverInr > 0
      ? `₹${formatInr(bid.minAnnualTurnoverInr)}`
      : 'Not specified';

  const expText =
    bid.yearsExperienceRequired && bid.yearsExperienceRequired > 0
      ? `${bid.yearsExperienceRequired} Year${bid.yearsExperienceRequired === 1 ? '' : 's'}`
      : 'Not specified';

  const primaryState =
    bid.consignees?.find((c) => c.state && c.state !== 'India')?.state || 'See PDF';

  const totalQty =
    bid.boqItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) ||
    bid.consignees?.reduce((sum, c) => sum + (c.quantity || 0), 0);

  const brief = useMemo(
    () =>
      WhatsAppBriefBuilder.build(audience, {
        bid,
        profile,
        eligibilitySummary,
        consultantBranding,
      }),
    [audience, bid, profile, eligibilitySummary, consultantBranding]
  );

  const handleShare = async () => {
    try {
      await Share.share({
        message: brief.message,
        title: `${brief.title} — ${bid.bidNumber}`,
      });
    } catch {
      Alert.alert('Share unavailable', 'Unable to open the share sheet on this device.');
    }
  };

  const handleCopy = () => {
    if (copyTextSafe(brief.message)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } else {
      void handleShare();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.backdropDismiss} onPress={onClose} />
        <View
          style={[
            styles.modalCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalHeaderTitle, { color: colors.textPrimary }]}>
                WhatsApp Tender Briefs
              </Text>
              <Text style={[styles.modalHeaderSub, { color: colors.textSecondary }]}>
                Exact PDF figures · Verified bidplus.gem.gov.in link
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityLabel="Close share sheet"
            >
              <Text style={{ fontSize: 18, color: colors.textMuted, fontWeight: '700' }}>✕</Text>
            </Pressable>
          </View>

          {/* 3-Tab Audience Switcher */}
          <View
            style={[
              styles.tabBar,
              { backgroundColor: colors.surfaceSubtle, borderBottomColor: colors.borderSubtle },
            ]}
          >
            {AUDIENCE_TABS.map((tab) => {
              const active = audience === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => {
                    setAudience(tab.id);
                    setCopied(false);
                  }}
                  style={[
                    styles.tabBtn,
                    active && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                    !active && {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBtnText,
                      { color: active ? colors.textInverse : colors.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {audience === 'PARTNER' ? (
              /* Visual Deal Sheet Preview */
              <View
                style={[
                  styles.dealSheetSurface,
                  { backgroundColor: colors.surface, borderColor: colors.primary },
                ]}
              >
                <View style={[styles.topAccentBar, { backgroundColor: colors.primary }]} />

                <View style={styles.sheetTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.portalTag, { color: colors.primary }]}>
                      GeM PUBLIC TENDER BRIEF
                    </Text>
                    <Text style={[styles.bidNumberBadge, { color: colors.textPrimary }]}>
                      {bid.bidNumber || 'GeM Bid'}
                    </Text>
                  </View>
                  <View style={[styles.timerPill, { backgroundColor: colors.dangerTint }]}>
                    <Text style={[styles.timerText, { color: colors.danger }]}>
                      {remainingText}
                    </Text>
                  </View>
                </View>

                {consultantBranding?.agencyName || profile?.organizationName ? (
                  <View style={[styles.senderStrip, { backgroundColor: colors.surfaceSubtle }]}>
                    <Text style={[styles.senderText, { color: colors.textSecondary }]}>
                      Prepared by:{' '}
                      {(consultantBranding?.agencyName || profile?.organizationName || '').trim()}
                      {consultantBranding?.contactPhone
                        ? ` · ${consultantBranding.contactPhone}`
                        : ''}
                    </Text>
                  </View>
                ) : null}

                <Text style={[styles.tenderTitle, { color: colors.textPrimary }]} numberOfLines={3}>
                  {bid.title || 'Government Procurement Tender'}
                </Text>
                <Text style={[styles.deptSub, { color: colors.textSecondary }]} numberOfLines={2}>
                  {[bid.department, bid.ministry !== bid.department ? bid.ministry : '']
                    .filter(Boolean)
                    .join(' · ') || 'Government Department'}
                </Text>

                {/* Exact 3-Column Financial Matrix */}
                <View
                  style={[
                    styles.financialMatrix,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                  ]}
                >
                  <View style={styles.finCol}>
                    <Text style={[styles.finLabel, { color: colors.textMuted }]}>EST. VALUE</Text>
                    <Text style={[styles.finVal, { color: colors.primary }]} numberOfLines={1}>
                      {estValText}
                    </Text>
                  </View>
                  <View style={[styles.finDivider, { backgroundColor: colors.borderSubtle }]} />
                  <View style={styles.finCol}>
                    <Text style={[styles.finLabel, { color: colors.textMuted }]}>EMD</Text>
                    <Text style={[styles.finVal, { color: colors.textPrimary }]} numberOfLines={1}>
                      {emdValText}
                    </Text>
                  </View>
                  <View style={[styles.finDivider, { backgroundColor: colors.borderSubtle }]} />
                  <View style={styles.finCol}>
                    <Text style={[styles.finLabel, { color: colors.textMuted }]}>e-PBG</Text>
                    <Text style={[styles.finVal, { color: colors.textPrimary }]} numberOfLines={1}>
                      {epbgText}
                    </Text>
                  </View>
                </View>

                {isMseExempt ? (
                  <View style={[styles.mseBanner, { backgroundColor: colors.successTint }]}>
                    <Text style={[styles.mseBannerText, { color: colors.success }]}>
                      MSE / STARTUP EMD EXEMPTION AVAILABLE (OEM ONLY FOR GOODS)
                    </Text>
                  </View>
                ) : null}

                {eligibilitySummary ? (
                  <View style={[styles.mseBanner, { backgroundColor: colors.primaryTint }]}>
                    <Text style={[styles.mseBannerText, { color: colors.primary }]}>
                      PROFILE VERDICT: {eligibilitySummary}
                    </Text>
                  </View>
                ) : null}

                {/* Eligibility Criteria Table */}
                <View
                  style={[
                    styles.criteriaBox,
                    { borderColor: colors.borderSubtle, backgroundColor: colors.surface },
                  ]}
                >
                  <Text style={[styles.criteriaHeader, { color: colors.textMuted }]}>
                    KEY ELIGIBILITY &amp; DELIVERY
                  </Text>
                  {[
                    { label: 'Min. Annual Turnover', val: turnoverText },
                    { label: 'Past Experience', val: expText },
                    { label: 'Make in India (MII)', val: miiText },
                    {
                      label: 'Quantity & State',
                      val: `${totalQty !== undefined ? `${totalQty.toLocaleString('en-IN')} Units` : 'See PDF'} · ${primaryState}`,
                    },
                    { label: 'Closing (IST)', val: formatDateSafe(bid.closingTimeUtc) },
                  ].map((row, idx) => (
                    <View
                      key={row.label}
                      style={[
                        styles.criteriaRow,
                        idx > 0 && {
                          borderTopWidth: StyleSheet.hairlineWidth,
                          borderTopColor: colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text style={[styles.dbLabel, { color: colors.textSecondary }]}>
                        {row.label}
                      </Text>
                      <Text style={[styles.dbVal, { color: colors.textPrimary }]}>{row.val}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.sheetFooter, { borderTopColor: colors.borderSubtle }]}>
                  <Text style={[styles.footerBrand, { color: colors.primary }]}>
                    Verified GeM Public Feed
                  </Text>
                  <Text style={[styles.footerSub, { color: colors.textMuted }]} numberOfLines={1}>
                    {brief.verifiedPdfUrl.replace(/^https?:\/\//, '')}
                  </Text>
                </View>
              </View>
            ) : (
              /* Ready-to-Send OEM / CA Message Preview */
              <View
                style={[
                  styles.messagePreviewCard,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                ]}
              >
                <View style={styles.previewMetaRow}>
                  <View style={[styles.audiencePill, { backgroundColor: colors.primaryTint }]}>
                    <Text style={[styles.audiencePillText, { color: colors.primary }]}>
                      {audience === 'OEM' ? 'OEM / DISTRIBUTOR BRIEF' : 'CA / AUDITOR BRIEF'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>
                  {brief.title}
                </Text>
                <Text style={[styles.previewSub, { color: colors.textSecondary }]}>
                  {brief.subtitle}
                </Text>
                <View
                  style={[
                    styles.messageBodyBox,
                    { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                  ]}
                >
                  <Text style={[styles.messageBodyText, { color: colors.textPrimary }]} selectable>
                    {brief.message}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Footer */}
          <View
            style={[
              styles.actionRow,
              { borderTopColor: colors.borderSubtle, backgroundColor: colors.surface },
            ]}
          >
            <Pressable
              style={[
                styles.copyBtn,
                {
                  backgroundColor: copied ? colors.successTint : colors.surfaceSubtle,
                  borderColor: copied ? colors.success : colors.border,
                },
              ]}
              onPress={handleCopy}
            >
              <Text
                style={[
                  styles.copyBtnText,
                  { color: copied ? colors.success : colors.textPrimary },
                ]}
              >
                {copied ? 'Copied ✓' : 'Copy Text'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.shareBtn, { backgroundColor: colors.success }]}
              onPress={handleShare}
            >
              <Text style={[styles.shareBtnText, { color: colors.textInverse }]}>
                Share {audience === 'PARTNER' ? 'Brief' : audience === 'OEM' ? 'to OEM' : 'to CA'} ↗
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.52)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: { flex: 1 },
  modalCard: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    gap: 10,
  },
  modalHeaderTitle: { fontSize: 15.5, fontWeight: '800' },
  modalHeaderSub: { fontSize: 11.5, marginTop: 2 },
  closeBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBtnText: { fontSize: 11.5, fontWeight: '800' },
  scrollArea: { maxHeight: 520 },
  scrollContent: { padding: 14, paddingBottom: 20 },
  dealSheetSurface: {
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
    paddingBottom: 12,
  },
  topAccentBar: { height: 4, width: '100%' },
  sheetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 8,
  },
  portalTag: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.7 },
  bidNumberBadge: { fontSize: 13.5, fontWeight: '900', marginTop: 2 },
  timerPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  timerText: { fontSize: 11, fontWeight: '800' },
  senderStrip: {
    marginHorizontal: 14,
    marginTop: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  senderText: { fontSize: 10.5, fontWeight: '700' },
  tenderTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    paddingHorizontal: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  deptSub: {
    fontSize: 11.5,
    paddingHorizontal: 14,
    marginTop: 2,
    marginBottom: 10,
  },
  financialMatrix: {
    flexDirection: 'row',
    marginHorizontal: 14,
    borderRadius: 9,
    borderWidth: 1,
    paddingVertical: 9,
    marginBottom: 8,
  },
  finCol: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  finDivider: { width: 1, height: '100%' },
  finLabel: { fontSize: 8.5, fontWeight: '800', letterSpacing: 0.5 },
  finVal: { fontSize: 12, fontWeight: '900', marginTop: 3, textAlign: 'center' },
  mseBanner: {
    marginHorizontal: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 7,
    alignItems: 'center',
    marginBottom: 8,
  },
  mseBannerText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3, textAlign: 'center' },
  criteriaBox: {
    marginHorizontal: 14,
    borderRadius: 9,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  criteriaHeader: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6, marginBottom: 4 },
  criteriaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: 10,
  },
  dbLabel: { fontSize: 11, fontWeight: '600' },
  dbVal: { fontSize: 11, fontWeight: '800', textAlign: 'right', flexShrink: 1 },
  sheetFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingTop: 9,
    gap: 2,
  },
  footerBrand: { fontSize: 10.5, fontWeight: '800' },
  footerSub: { fontSize: 9.5 },
  messagePreviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  previewMetaRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  audiencePill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  audiencePillText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.5 },
  previewTitle: { fontSize: 14.5, fontWeight: '800' },
  previewSub: { fontSize: 11.5, marginTop: 2, marginBottom: 10 },
  messageBodyBox: {
    borderRadius: 9,
    borderWidth: 1,
    padding: 12,
  },
  messageBodyText: {
    fontSize: 12.5,
    lineHeight: 18.5,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  copyBtn: {
    minWidth: 102,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  copyBtnText: { fontSize: 13, fontWeight: '800' },
  shareBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  shareBtnText: { fontSize: 13.5, fontWeight: '800' },
});
