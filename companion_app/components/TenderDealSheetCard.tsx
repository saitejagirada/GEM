import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { DeconstructedBidDoc } from '../types/index';
import { formatLakhs } from '../utils/formatters';

interface TenderDealSheetCardProps {
  bid: DeconstructedBidDoc;
  visible: boolean;
  onClose: () => void;
  consultantBranding?: {
    agencyName?: string;
    contactPhone?: string;
  };
}

/**
 * 1080x1350 WhatsApp Deal Sheet Card
 * Designed specifically for high-conversion forwarding in Indian contractor WhatsApp groups.
 * Operates on 100% public data with ZERO login requirements.
 */
export const TenderDealSheetCard: React.FC<TenderDealSheetCardProps> = ({
  bid,
  visible,
  onClose,
  consultantBranding,
}) => {
  const { colors, isDark } = useTheme();
  const [copied, setCopied] = useState<boolean>(false);

  // Time remaining calculation
  const closingDate = new Date(bid.closingTimeUtc || Date.now());
  const now = new Date();
  const diffHours = Math.max(0, Math.round((closingDate.getTime() - now.getTime()) / (1000 * 60 * 60)));
  const diffDays = Math.floor(diffHours / 24);
  const remainingText =
    diffHours <= 0
      ? 'Bid Closed'
      : diffDays > 0
      ? `⏳ Closes in ${diffDays}d ${diffHours % 24}h`
      : `🚨 Closes in ${diffHours} Hours!`;

  // Formatting values (strictly exact published/extracted values — zero fabrication)
  const estVal = bid.estimatedBidValueInr;
  const estValText =
    estVal && estVal > 0
      ? formatLakhs(estVal)
      : bid.isHighValue
        ? 'High Value (≥ ₹2 Cr)'
        : 'Not disclosed in PDF';
  const emdVal = bid.emdAmountInr;
  const emdValText =
    emdVal === undefined
      ? 'Check PDF'
      : emdVal === 0
        ? 'Not Required (₹0)'
        : `₹${emdVal.toLocaleString('en-IN')}`;
  const epbgText =
    bid.epbgPercentage === undefined
      ? 'Check PDF'
      : bid.epbgPercentage === 0
        ? 'Not Required (0%)'
        : bid.epbgDurationMonths
          ? `${bid.epbgPercentage}% (${bid.epbgDurationMonths} mo)`
          : `${bid.epbgPercentage}%`;

  const isMseExempt = Boolean(bid.isEmdExemptForMse);
  const miiText =
    bid.makeInIndiaClass === 'CLASS_1'
      ? 'Class-1 (≥50% Local Content)'
      : bid.makeInIndiaClass === 'CLASS_2'
        ? 'Class-2 (≥20% Local Content)'
        : bid.miiPurchasePreference
          ? 'MII Preference Applicable'
          : 'Not specified in PDF';

  const turnoverReq = bid.minAnnualTurnoverInr;
  const turnoverText =
    turnoverReq && turnoverReq > 0
      ? formatLakhs(turnoverReq)
      : 'Not specified in PDF';
  const expYears = bid.yearsExperienceRequired;
  const expText =
    expYears && expYears > 0 ? `${expYears} Years` : 'Not specified in PDF';

  const primaryState = bid.consignees?.[0]?.state || 'Pan-India';
  const totalQty =
    bid.boqItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) ||
    bid.consignees?.reduce((sum, c) => sum + (c.quantity || 0), 0) ||
    1;

  // WhatsApp text payload for forwarding alongside the visual snapshot
  const shareText = `⚡ *GeM Tender Alert: ${bid.title || 'Government Procurement'}*
📍 *Department:* ${bid.department || 'Government Department'}, ${primaryState}
💰 *Est. Value:* ${estValText}
🛡️ *EMD Amount:* ${emdValText} (${isMseExempt ? '🟢 MSE/Startup EXEMPT: YES' : 'Exemption: Per Tender'})
📋 *Turnover Req:* ${turnoverText}
🏭 *Make in India (MII):* ${miiText}
⏳ *Deadline:* ${closingDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} (${remainingText})
🔖 *GeM Bid No:* ${bid.bidNumber || 'N/A'}

👉 *Deconstruct full BOQ, technical specs & check MSE turnover eligibility (100% Free • No Login Needed):*
https://gemcompanion.in/b/${encodeURIComponent(bid.bidNumber || 'view')}?src=wa

${consultantBranding?.agencyName ? `💼 Shared by: *${consultantBranding.agencyName}* (Ph: ${consultantBranding.contactPhone || ''})\n` : ''}_Deconstructed via GeM Mobile Companion App_`;

  const handleShareToWhatsApp = async () => {
    try {
      await Share.share({
        message: shareText,
        title: `GeM Tender: ${bid.bidNumber || 'Alert'}`,
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      Alert.alert('Sharing Error', 'Unable to open share sheet.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
          {/* Header Action Bar */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalHeaderTitle, { color: colors.textPrimary }]}>
              WhatsApp Tender Deal Sheet
            </Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Text style={{ fontSize: 18, color: colors.textSecondary, fontWeight: '700' }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            {/* 1080x1350 Aspect Ratio Preview Container */}
            <View style={styles.dealSheetSurface}>
              {/* Tricolor Micro-Accent Ribbon */}
              <View style={styles.tricolorBar}>
                <View style={[styles.triStrip, { backgroundColor: '#FF9933' }]} />
                <View style={[styles.triStrip, { backgroundColor: '#FFFFFF' }]} />
                <View style={[styles.triStrip, { backgroundColor: '#138808' }]} />
              </View>

              {/* Deal Sheet Header */}
              <View style={styles.sheetTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.portalTag}>GeM PUBLIC TENDER SNAPSHOT</Text>
                  <Text style={styles.bidNumberBadge}>{bid.bidNumber || 'GEM/2026/B/BID'}</Text>
                </View>
                <View style={styles.timerPill}>
                  <Text style={styles.timerText}>{remainingText}</Text>
                </View>
              </View>

              {/* Agency Co-Branding (If Consultant Mode) */}
              {consultantBranding?.agencyName ? (
                <View style={styles.consultantBadge}>
                  <Text style={styles.consultantBadgeText}>
                    💼 PREPARED BY: {consultantBranding.agencyName.toUpperCase()}
                    {consultantBranding.contactPhone ? ` • ${consultantBranding.contactPhone}` : ''}
                  </Text>
                </View>
              ) : null}

              {/* Scope Title */}
              <Text style={styles.tenderTitle} numberOfLines={2}>
                {bid.title || 'Supply & Delivery of Materials / Services'}
              </Text>
              <Text style={styles.deptSub}>
                {[bid.department, bid.ministry].filter(Boolean).join(' • ') || 'Central Government Procurement'}
              </Text>

              {/* The Financial Big Three Matrix (3-Column Surface) */}
              <View style={styles.financialMatrix}>
                <View style={styles.finCol}>
                  <Text style={styles.finLabel}>EST. VALUE</Text>
                  <Text style={styles.finVal}>{estValText}</Text>
                </View>
                <View style={styles.finDivider} />
                <View style={styles.finCol}>
                  <Text style={styles.finLabel}>EMD AMOUNT</Text>
                  <Text style={styles.finVal}>{emdValText}</Text>
                </View>
                <View style={styles.finDivider} />
                <View style={styles.finCol}>
                  <Text style={styles.finLabel}>e-PBG SECURITY</Text>
                  <Text style={styles.finVal}>{epbgText}</Text>
                </View>
              </View>

              {/* High-Impact Green MSE Exemption Banner */}
              <View style={[styles.mseBanner, { backgroundColor: isMseExempt ? '#DCFCE7' : '#FEF3C7' }]}>
                <Text style={[styles.mseBannerText, { color: isMseExempt ? '#15803D' : '#92400E' }]}>
                  {isMseExempt
                    ? '🟢 MSE & STARTUP EMD EXEMPTION: 100% WAIVED'
                    : '⚠️ EMD DEPOSIT REQUIRED (Check tender terms)'}
                </Text>
              </View>

              {/* 4 Critical Eligibility Dealbreakers */}
              <View style={styles.dealbreakersCard}>
                <Text style={styles.dealbreakerHeader}>⚡ CRITICAL ELIGIBILITY CRITERIA</Text>

                <View style={styles.dealbreakerRow}>
                  <Text style={styles.dbLabel}>• Min. Annual Turnover:</Text>
                  <Text style={styles.dbVal}>{turnoverText}</Text>
                </View>

                <View style={styles.dealbreakerRow}>
                  <Text style={styles.dbLabel}>• Past Experience Years:</Text>
                  <Text style={styles.dbVal}>{expText}</Text>
                </View>

                <View style={styles.dealbreakerRow}>
                  <Text style={styles.dbLabel}>• Make in India (MII):</Text>
                  <Text style={styles.dbVal}>{miiText}</Text>
                </View>

                <View style={styles.dealbreakerRow}>
                  <Text style={styles.dbLabel}>• Reseller OEM Auth (MAF):</Text>
                  <Text style={styles.dbVal}>{bid.type === 'SERVICE' ? 'Service Contract' : 'Required for Resellers'}</Text>
                </View>
              </View>

              {/* Delivery & Quantity Footprint */}
              <View style={styles.footprintRow}>
                <Text style={styles.footprintText}>
                  📦 Total Qty: <Text style={{ fontWeight: '700' }}>{totalQty.toLocaleString('en-IN')} Units</Text>
                </Text>
                <Text style={styles.footprintText}>
                  📍 Consignee:{' '}
                  <Text style={{ fontWeight: '700' }}>
                    {primaryState}
                  </Text>
                </Text>
              </View>

              {/* Viral Attribution Footer */}
              <View style={styles.dealSheetFooter}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.footerBrand}>GeM Mobile Companion</Text>
                  <Text style={styles.footerSub}>Zero-Login Public Discovery • No Passwords Ever</Text>
                </View>
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>100% FREE</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action Footer Button */}
          <View style={styles.actionRow}>
            <Pressable
              style={styles.shareBtn}
              onPress={handleShareToWhatsApp}
              android_ripple={{ color: '#25D366' }}
            >
              <Text style={styles.shareBtnIcon}>📲</Text>
              <Text style={styles.shareBtnText}>
                {copied ? 'Copied to WhatsApp!' : 'Share Deal Sheet to WhatsApp'}
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  modalHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
  },
  dealSheetSurface: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#0F2C59',
    overflow: 'hidden',
    paddingBottom: 12,
  },
  tricolorBar: {
    flexDirection: 'row',
    height: 4,
    width: '100%',
  },
  triStrip: {
    flex: 1,
    height: '100%',
  },
  sheetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  portalTag: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#0F2C59',
  },
  bidNumberBadge: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1E3A8A',
    marginTop: 2,
  },
  timerPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  consultantBadge: {
    backgroundColor: '#F1F5F9',
    marginHorizontal: 14,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  consultantBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#334155',
  },
  tenderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    paddingHorizontal: 14,
    marginTop: 6,
    lineHeight: 19,
  },
  deptSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    paddingHorizontal: 14,
    marginTop: 2,
    marginBottom: 10,
  },
  financialMatrix: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    marginBottom: 8,
  },
  finCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  finDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    height: '100%',
  },
  finLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  finVal: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F2C59',
    marginTop: 2,
    textAlign: 'center',
  },
  mseBanner: {
    marginHorizontal: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  mseBannerText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dealbreakersCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    marginBottom: 8,
  },
  dealbreakerHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F2C59',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  dealbreakerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  dbLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  dbVal: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
  },
  footprintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 8,
  },
  footprintText: {
    fontSize: 10,
    color: '#64748B',
  },
  dealSheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  footerBrand: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F2C59',
  },
  footerSub: {
    fontSize: 8,
    color: '#94A3B8',
    marginTop: 1,
  },
  freeBadge: {
    backgroundColor: '#0F2C59',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  freeBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionRow: {
    padding: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  shareBtn: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  shareBtnIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
