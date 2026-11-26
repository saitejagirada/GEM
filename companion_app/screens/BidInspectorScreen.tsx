/**
 * GeM Bid & Reverse Auction Inspector Screen
 *
 * Clean, high-clarity tender brief powered 100% by direct public GeM feeds and
 * on-device PDF extraction:
 * - Executive hero summary (title, department, countdown, estimated value & EMD)
 * - Dynamic Official Documents & Buyer Attachments section (auto-discovers buyer
 *   Technical Specifications, Product Drawings, Buyer ATC/Criteria, BOQ Excel/CSV,
 *   Service SLA, and GTC links directly from the official tender PDFs)
 * - Clean 2-column hairline Key Terms table + Policy tags
 * - Honest Eligibility & Key Watchouts + 1-tap compliance letter drafts
 * - Published Scope, Delivery Locations & Interactive Document Checklist
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { DeconstructedBidDoc, OfficialBidDocument, OfficialBidDocumentKind } from '../types/index';
import { BidDocService } from '../services/BidDocService';
import { GeMLiveSyncService, type GeMBidOtherDetails } from '../services/GeMLiveSyncService';
import {
  LocalPdfScanner,
  enrichBidWithPdfScan,
  type LocalPdfScanResult,
} from '../services/LocalPdfScanner';
import { PortalDocService } from '../services/PortalDocService';
import { formatDateSafe } from '../utils/formatters';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/designTokens';
import { BidDocumentViewer } from './BidDocumentViewer';
import { PreBidDisqualificationShield } from '../components/PreBidDisqualificationShield';
import { TenderDealSheetCard } from '../components/TenderDealSheetCard';

interface BidInspectorScreenProps {
  bid: DeconstructedBidDoc | null;
  visible: boolean;
  onClose: () => void;
  onPrepareDocuments?: (bid: DeconstructedBidDoc) => void;
}

function getDocumentBadgeStyle(
  doc: OfficialBidDocument,
  colors: ThemeColors
): { label: string; bg: string; fg: string } {
  if (doc.id === 'parent-bid-document') {
    return { label: 'BID', bg: colors.primaryTint, fg: colors.primary };
  }
  if (/show(?:direct)?radocumentPdf/i.test(doc.url)) {
    return { label: 'RA', bg: colors.dangerTint, fg: colors.danger };
  }
  const map: Record<OfficialBidDocumentKind, { label: string; bg: string; fg: string }> = {
    BID: { label: 'BID', bg: colors.primaryTint, fg: colors.primary },
    SPECIFICATION: { label: 'SPEC', bg: colors.primaryTint, fg: colors.primary },
    DRAWING: { label: 'DESIGN', bg: colors.violetTint, fg: colors.violet },
    ATC: { label: 'ATC', bg: colors.warningTint, fg: colors.warning },
    BOQ: {
      label: doc.fileFormat === 'XLSX' ? 'XLSX' : doc.fileFormat === 'CSV' ? 'CSV' : 'BOQ',
      bg: colors.successTint,
      fg: colors.success,
    },
    CORRIGENDUM: { label: 'CORRIG', bg: colors.dangerTint, fg: colors.danger },
    SLA: { label: 'SLA', bg: colors.successTint, fg: colors.success },
    GTC: { label: 'GTC', bg: colors.surfaceSubtle, fg: colors.textSecondary },
    OTHER: { label: doc.fileFormat || 'DOC', bg: colors.surfaceSubtle, fg: colors.textPrimary },
  };
  return map[doc.kind] || { label: 'DOC', bg: colors.surfaceSubtle, fg: colors.textPrimary };
}

export const BidInspectorScreen: React.FC<BidInspectorScreenProps> = ({
  bid,
  visible,
  onClose,
  onPrepareDocuments,
}) => {
  const { colors, isDark } = useTheme();
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});
  const [pdfScan, setPdfScan] = useState<LocalPdfScanResult | null>(null);
  const [isScanningPdf, setIsScanningPdf] = useState(false);
  const [documentViewerVisible, setDocumentViewerVisible] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>();
  const [showDealSheet, setShowDealSheet] = useState(false);
  const [otherDetails, setOtherDetails] = useState<GeMBidOtherDetails | null>(null);

  useEffect(() => {
    setCheckedDocs({});
    setPdfScan(null);
    setOtherDetails(null);
    setDocumentViewerVisible(false);
    setShowDealSheet(false);
    setSelectedDocumentId(undefined);
    if (!bid || !visible) return;

    let cancelled = false;
    setIsScanningPdf(true);
    LocalPdfScanner.scanBidDocuments(bid)
      .then((result) => {
        if (!cancelled) setPdfScan(result);
      })
      .finally(() => {
        if (!cancelled) setIsScanningPdf(false);
      });

    const probeId = bid.b_id || bid.parentBidId;
    if (probeId) {
      GeMLiveSyncService.fetchBidOtherDetails(probeId).then((details) => {
        if (!cancelled && details) setOtherDetails(details);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [bid?.bidNumber, bid?.docUrl, bid?.b_id, bid?.parentBidId, visible]);

  const effectiveBid = useMemo(
    () => (bid ? enrichBidWithPdfScan(bid, pdfScan) : null),
    [bid, pdfScan]
  );

  const officialDocuments = useMemo(
    () => (effectiveBid ? PortalDocService.getOfficialDocuments(effectiveBid) : []),
    [effectiveBid]
  );

  if (!bid || !effectiveBid) return null;

  const fundamentals = BidDocService.getFundamentalsSummary(effectiveBid);
  const ext = pdfScan?.details?.extendedDetails;
  const scannedOk = pdfScan?.status === 'EXTRACTED';

  const requiredDocuments = Array.isArray(effectiveBid.requiredDocuments)
    ? effectiveBid.requiredDocuments
    : [];
  const boqItems = Array.isArray(effectiveBid.boqItems) ? effectiveBid.boqItems : [];
  const consignees = Array.isArray(effectiveBid.consignees) ? effectiveBid.consignees : [];

  // Separate primary & buyer-unique attachments from standard GTC reference
  const mainAndBuyerDocs = officialDocuments.filter((d) => d.kind !== 'GTC');
  const gtcDocs = officialDocuments.filter((d) => d.kind === 'GTC');
  const extraBuyerAttachmentCount = mainAndBuyerDocs.filter(
    (d) => d.id !== 'bid-document' && d.id !== 'parent-bid-document'
  ).length;

  const toggleDoc = (docName: string) => {
    setCheckedDocs((prev) => ({
      ...prev,
      [docName]: !prev[docName],
    }));
  };

  const handlePrepareDocuments = () => {
    if (onPrepareDocuments) {
      onPrepareDocuments(effectiveBid);
      return;
    }
    Alert.alert('Document preparation', 'Choose this bid from the document preparation workspace.');
  };

  const handleOpenDoc = (documentId = officialDocuments[0]?.id) => {
    const targetDocument =
      officialDocuments.find((document) => document.id === documentId) || officialDocuments[0];
    if (!targetDocument || !PortalDocService.isSafeGemUrl(targetDocument.url)) {
      Alert.alert('Security Notice', 'Document link is not from a verified official GeM domain.');
      return;
    }
    const format = targetDocument.fileFormat || PortalDocService.inferFileFormat(targetDocument.url);
    // Open non-PDF spreadsheets/SLA in viewer launcher or directly if preferred
    if (format !== 'PDF' && (format === 'XLSX' || format === 'CSV')) {
      Linking.openURL(targetDocument.url).catch(() => {
        setSelectedDocumentId(targetDocument.id);
        setDocumentViewerVisible(true);
      });
      return;
    }
    setSelectedDocumentId(targetDocument.id);
    setDocumentViewerVisible(true);
  };

  const handleScanPdfOnDevice = async () => {
    setIsScanningPdf(true);
    try {
      const result = await LocalPdfScanner.scanBidDocuments(bid);
      setPdfScan(result);
      if (result.status === 'NO_TEXT_LAYER') {
        Alert.alert('No readable text layer', result.note);
      } else if (result.status === 'TOO_LARGE') {
        Alert.alert('PDF is large', result.note);
      } else if (result.status === 'UNAVAILABLE' || result.status === 'ERROR') {
        Alert.alert('Could not scan PDF', result.note);
      }
    } finally {
      setIsScanningPdf(false);
    }
  };

  // Closing countdown
  const closingDate = bid.closingTimeUtc
    ? new Date(bid.closingTimeUtc)
    : new Date(Date.now() + 86400000 * 3);
  const isValidDate = !isNaN(closingDate.getTime());
  const diffMs = isValidDate ? Math.max(0, closingDate.getTime() - Date.now()) : 0;
  const diffHours = Math.floor(diffMs / 3600000);
  const diffMins = Math.floor((diffMs % 3600000) / 60000);
  const isClosingSoon = isValidDate && diffMs > 0 && diffHours < 24;
  const remainingLabel = !isValidDate
    ? 'See PDF'
    : diffMs === 0
      ? 'Closed'
      : diffHours > 48
        ? `${Math.floor(diffHours / 24)}d ${diffHours % 24}h left`
        : `${diffHours}h ${diffMins}m left`;

  const fallbackValue = isScanningPdf ? 'Scanning…' : scannedOk ? 'Not specified' : 'In PDF';

  const estValueDisplay =
    effectiveBid.estimatedBidValueInr !== undefined && effectiveBid.estimatedBidValueInr > 0
      ? fundamentals.estimatedValueLabel
      : effectiveBid.isHighValue
        ? '≥ ₹2 Cr'
        : isScanningPdf
          ? 'Scanning…'
          : scannedOk
            ? 'Not disclosed'
            : 'In PDF';

  const emdDisplay =
    effectiveBid.emdAmountInr !== undefined
      ? fundamentals.emdLabel
      : effectiveBid.isEmdExemptForMse
        ? 'MSE Exempt'
        : fallbackValue;
  const emdIsPositive = effectiveBid.emdAmountInr === 0 || Boolean(effectiveBid.isEmdExemptForMse);

  const epbgDisplay =
    effectiveBid.epbgPercentage !== undefined
      ? effectiveBid.epbgPercentage === 0
        ? 'Not Required (0%)'
        : effectiveBid.epbgDurationMonths
          ? `${effectiveBid.epbgPercentage}% (${effectiveBid.epbgDurationMonths} months)`
          : `${effectiveBid.epbgPercentage}%`
      : fallbackValue;

  const deliveryDisplay =
    effectiveBid.deliveryPeriodDays !== undefined
      ? `${effectiveBid.deliveryPeriodDays} Days`
      : fallbackValue;

  const turnoverDisplay =
    effectiveBid.minAnnualTurnoverInr !== undefined
      ? fundamentals.turnoverLabel
      : ext?.mseExemptionForExpAndTurnover
        ? 'MSE / Startup Relaxed'
        : fallbackValue;

  const experienceDisplay =
    effectiveBid.yearsExperienceRequired !== undefined
      ? fundamentals.experienceLabel
      : ext?.mseExemptionForExpAndTurnover
        ? 'MSE / Startup Relaxed'
        : fallbackValue;

  const splittingDisplay =
    effectiveBid.splittingRatio ||
    (effectiveBid.isSplittingApplied === false && scannedOk ? '100% to L1 (No Split)' : fallbackValue);

  const bidFormatParts: string[] = [];
  if (effectiveBid.typeOfBid) {
    bidFormatParts.push(effectiveBid.typeOfBid.replace(/\s+Bid$/i, ''));
  }
  if (effectiveBid.bidValidityDays) {
    bidFormatParts.push(`${effectiveBid.bidValidityDays}d valid`);
  }
  const totalQty = boqItems[0]?.quantity ?? ext?.totalQuantity;
  const bidFormatDisplay =
    bidFormatParts.length > 0
      ? bidFormatParts.join(' · ')
      : totalQty !== undefined
        ? `${totalQty.toLocaleString('en-IN')} Units`
        : fallbackValue;

  // Compact policy tags
  const policyTags: Array<{ label: string; bg: string; fg: string }> = [];
  if (effectiveBid.isEmdExemptForMse || ext?.mseExemptionForExpAndTurnover) {
    policyTags.push({ label: 'MSE Exemption', bg: colors.successTint, fg: colors.success });
  }
  if (effectiveBid.isEmdExemptForStartup || ext?.startupExemptionForExpAndTurnover) {
    policyTags.push({ label: 'Startup Exemption', bg: colors.successTint, fg: colors.success });
  }
  if (effectiveBid.msePurchasePreference) {
    policyTags.push({ label: 'MSE Purchase Pref', bg: colors.primaryTint, fg: colors.primary });
  }
  if (effectiveBid.miiPurchasePreference) {
    const miiLabel =
      effectiveBid.makeInIndiaClass === 'CLASS_1'
        ? 'MII Class-1 (≥50%)'
        : effectiveBid.makeInIndiaClass === 'CLASS_2'
          ? 'MII Class-2 (≥20%)'
          : 'MII Preference';
    policyTags.push({ label: miiLabel, bg: colors.warningTint, fg: colors.warning });
  }
  if (effectiveBid.pastPerformancePercentage !== undefined) {
    policyTags.push({
      label: `Past Perf ${effectiveBid.pastPerformancePercentage}%`,
      bg: colors.violetTint,
      fg: colors.violet,
    });
  }
  if (ext?.isRaEnabled || bid.isRa) {
    policyTags.push({ label: 'Reverse Auction', bg: colors.dangerTint, fg: colors.danger });
  }

  const keyTermRows: Array<{ label: string; value: string; accent?: string }> = [
    {
      label: 'Estimated Value',
      value: estValueDisplay,
      accent: effectiveBid.estimatedBidValueInr ? colors.primary : undefined,
    },
    {
      label: 'EMD Guarantee',
      value: emdDisplay,
      accent: emdIsPositive ? colors.success : undefined,
    },
    {
      label: 'e-PBG Security',
      value: epbgDisplay,
      accent:
        effectiveBid.epbgPercentage === 0
          ? colors.success
          : effectiveBid.epbgPercentage !== undefined
            ? colors.warning
            : undefined,
    },
    {
      label: 'Delivery Timeline',
      value: deliveryDisplay,
      accent: effectiveBid.deliveryPeriodDays ? colors.primary : undefined,
    },
    { label: 'Min Annual Turnover', value: turnoverDisplay },
    { label: 'Past Experience', value: experienceDisplay },
    { label: 'Splitting Rule', value: splittingDisplay },
    { label: 'Bid Format & Validity', value: bidFormatDisplay },
  ];

  const typeInfo = BidDocService.getProcurementTypeLabel(bid);
  const checkedCount = requiredDocuments.filter((d) => checkedDocs[d]).length;

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
          <StatusBar
            barStyle={isDark ? 'light-content' : 'dark-content'}
            backgroundColor={colors.surface}
          />
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Clean Theme-Native Top Bar */}
            <View
              style={[
                styles.headerBar,
                { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle },
              ]}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.headerBackBtn,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                  pressed && { opacity: 0.75 },
                ]}
                onPress={onClose}
                hitSlop={8}
                accessibilityLabel="Close tender details"
              >
                <Text style={[styles.headerBackIcon, { color: colors.textPrimary }]}>←</Text>
              </Pressable>
              <View style={styles.headerCenter}>
                <Text style={[styles.headerBidNum, { color: colors.textPrimary }]} numberOfLines={1}>
                  {bid.bidNumber}
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                  {typeInfo.label} · Official GeM Tender
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.sharePillBtn,
                  { backgroundColor: colors.primaryTint, borderColor: colors.primary },
                  pressed && { opacity: 0.78 },
                ]}
                onPress={() => setShowDealSheet(true)}
                hitSlop={6}
                accessibilityLabel="Share Tender Deal Sheet"
              >
                <Text style={[styles.sharePillText, { color: colors.primary }]}>Share ↗</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Live Corrigendum / Representation Alert */}
              {(otherDetails?.hasCorrigendum || otherDetails?.hasRepresentation) && (
                <View
                  style={[
                    styles.corrigendumBanner,
                    { backgroundColor: colors.warningTint, borderColor: colors.warning },
                  ]}
                >
                  <View style={[styles.corrigendumDot, { backgroundColor: colors.warning }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.corrigendumTitle, { color: colors.warning }]}>
                      {otherDetails.hasCorrigendum
                        ? 'Corrigendum published on GeM'
                        : 'Representation recorded on GeM'}
                    </Text>
                    <Text style={[styles.corrigendumSubtitle, { color: colors.textSecondary }]}>
                      Check the latest PDF updates before quoting.
                    </Text>
                  </View>
                </View>
              )}

              {/* 1. Clean Executive Summary Card */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                ]}
              >
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.pillBadge,
                      {
                        backgroundColor:
                          bid.isRa || bid.type === 'RA' ? colors.dangerTint : colors.primaryTint,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillBadgeText,
                        { color: bid.isRa || bid.type === 'RA' ? colors.danger : colors.primary },
                      ]}
                    >
                      {typeInfo.label.toUpperCase()}
                    </Text>
                  </View>
                  {bid.isHighValue ? (
                    <View style={[styles.pillBadge, { backgroundColor: colors.successTint }]}>
                      <Text style={[styles.pillBadgeText, { color: colors.success }]}>≥ ₹2 Cr</Text>
                    </View>
                  ) : null}
                  {bid.parentBidNumber ? (
                    <View style={[styles.pillBadge, { backgroundColor: colors.surfaceSubtle }]}>
                      <Text style={[styles.pillBadgeText, { color: colors.textSecondary }]}>
                        Parent: {bid.parentBidNumber}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text style={[styles.bidTitle, { color: colors.textPrimary }]}>
                  {effectiveBid.title || 'Untitled Bid'}
                </Text>
                <Text style={[styles.deptText, { color: colors.textSecondary }]}>
                  {[
                    effectiveBid.department,
                    effectiveBid.ministry !== effectiveBid.department ? effectiveBid.ministry : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>

                {/* 3-Metric At-a-Glance Highlights Strip */}
                <View
                  style={[
                    styles.heroMetricsStrip,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                  ]}
                >
                  <View style={styles.heroMetricCol}>
                    <Text style={[styles.heroMetricLabel, { color: colors.textMuted }]}>CLOSES IN</Text>
                    <Text
                      style={[
                        styles.heroMetricValue,
                        { color: isClosingSoon ? colors.danger : colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {remainingLabel}
                    </Text>
                    <Text style={[styles.heroMetricSub, { color: colors.textSecondary }]} numberOfLines={1}>
                      {formatDateSafe(bid.closingTimeUtc).split(',')[0]}
                    </Text>
                  </View>

                  <View style={[styles.heroDivider, { backgroundColor: colors.borderSubtle }]} />

                  <View style={styles.heroMetricCol}>
                    <Text style={[styles.heroMetricLabel, { color: colors.textMuted }]}>EST. VALUE</Text>
                    <Text
                      style={[styles.heroMetricValue, { color: colors.primary }]}
                      numberOfLines={1}
                    >
                      {estValueDisplay}
                    </Text>
                    <Text style={[styles.heroMetricSub, { color: colors.textSecondary }]} numberOfLines={1}>
                      {totalQty !== undefined ? `Qty ${totalQty.toLocaleString('en-IN')}` : 'See scope'}
                    </Text>
                  </View>

                  <View style={[styles.heroDivider, { backgroundColor: colors.borderSubtle }]} />

                  <View style={styles.heroMetricCol}>
                    <Text style={[styles.heroMetricLabel, { color: colors.textMuted }]}>EMD</Text>
                    <Text
                      style={[
                        styles.heroMetricValue,
                        { color: emdIsPositive ? colors.success : colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {effectiveBid.emdAmountInr === 0
                        ? 'None'
                        : effectiveBid.emdAmountInr
                          ? fundamentals.emdLabel.replace(/\s*\(.*?\)/, '')
                          : emdDisplay}
                    </Text>
                    <Text
                      style={[
                        styles.heroMetricSub,
                        { color: emdIsPositive ? colors.success : colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {effectiveBid.isEmdExemptForMse ? 'MSE Exempt' : deliveryDisplay}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 2. Official Documents & Dynamically Discovered Buyer Attachments */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                ]}
              >
                <View style={styles.sectionHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                      Official Documents ({mainAndBuyerDocs.length})
                    </Text>
                    <Text style={[styles.sectionSubcopy, { color: colors.textSecondary }]}>
                      {isScanningPdf
                        ? 'Scanning tender PDF for linked specs, drawings & ATC…'
                        : extraBuyerAttachmentCount > 0
                          ? `${extraBuyerAttachmentCount} extra buyer attachment${extraBuyerAttachmentCount === 1 ? '' : 's'} discovered from PDF`
                          : 'Tap any document to read directly inside the app'}
                    </Text>
                  </View>
                  {isScanningPdf ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : extraBuyerAttachmentCount > 0 ? (
                    <View style={[styles.foundBadge, { backgroundColor: colors.successTint }]}>
                      <Text style={[styles.foundBadgeText, { color: colors.success }]}>
                        +{extraBuyerAttachmentCount} Linked
                      </Text>
                    </View>
                  ) : null}
                </View>

                {mainAndBuyerDocs.map((document, idx) => {
                  const badge = getDocumentBadgeStyle(document, colors);
                  const format = document.fileFormat || PortalDocService.inferFileFormat(document.url);
                  const isPdf = format === 'PDF';

                  return (
                    <Pressable
                      key={document.id}
                      style={({ pressed }) => [
                        styles.docRow,
                        idx > 0 && {
                          borderTopWidth: StyleSheet.hairlineWidth,
                          borderTopColor: colors.borderSubtle,
                        },
                        pressed && { opacity: 0.72 },
                      ]}
                      onPress={() => handleOpenDoc(document.id)}
                    >
                      <View style={[styles.docKindBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.docKindBadgeText, { color: badge.fg }]}>
                          {badge.label}
                        </Text>
                      </View>
                      <View style={styles.docCopy}>
                        <Text
                          style={[styles.docTitle, { color: colors.textPrimary }]}
                          numberOfLines={2}
                        >
                          {document.label}
                        </Text>
                        <Text
                          style={[styles.docSubtitle, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {document.subtitle ||
                            (isPdf ? 'Official GeM PDF · Read inline' : `Official ${format} attachment`)}
                        </Text>
                      </View>
                      <Text style={[styles.docActionCue, { color: colors.primary }]}>
                        {isPdf ? 'Read ›' : 'Open ↗'}
                      </Text>
                    </Pressable>
                  );
                })}

                {/* Standard GTC Reference kept cleanly separated at bottom */}
                {gtcDocs.length > 0 ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.gtcRow,
                      { borderTopColor: colors.borderSubtle, opacity: pressed ? 0.72 : 1 },
                    ]}
                    onPress={() => handleOpenDoc(gtcDocs[0].id)}
                  >
                    <Text style={[styles.gtcRowText, { color: colors.textSecondary }]} numberOfLines={1}>
                      Standard Reference: GeM General Terms &amp; Conditions (GTC) PDF
                    </Text>
                    <Text style={[styles.gtcRowLink, { color: colors.primary }]}>View ›</Text>
                  </Pressable>
                ) : null}
              </View>

              {/* 3. Clean Scannable Key Terms Table */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                ]}
              >
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                    Key Tender Terms
                  </Text>
                  {isScanningPdf ? (
                    <View style={[styles.statusChip, { backgroundColor: colors.primaryTint }]}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={[styles.statusChipText, { color: colors.primary }]}>Scanning…</Text>
                    </View>
                  ) : scannedOk ? (
                    <Pressable
                      onPress={handleScanPdfOnDevice}
                      hitSlop={8}
                      style={[styles.statusChip, { backgroundColor: colors.successTint }]}
                    >
                      <Text style={[styles.statusChipText, { color: colors.success }]}>
                        ✓ Parsed from PDF
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={handleScanPdfOnDevice}
                      hitSlop={8}
                      style={[styles.statusChip, { backgroundColor: colors.primaryTint }]}
                    >
                      <Text style={[styles.statusChipText, { color: colors.primary }]}>Scan PDF ↻</Text>
                    </Pressable>
                  )}
                </View>

                <View style={styles.termsTable}>
                  {keyTermRows.map((row, idx) => (
                    <View
                      key={row.label}
                      style={[
                        styles.termRow,
                        idx > 0 && {
                          borderTopWidth: StyleSheet.hairlineWidth,
                          borderTopColor: colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text style={[styles.termLabel, { color: colors.textSecondary }]}>
                        {row.label}
                      </Text>
                      <Text
                        style={[styles.termValue, { color: row.accent || colors.textPrimary }]}
                        numberOfLines={2}
                      >
                        {row.value}
                      </Text>
                    </View>
                  ))}
                </View>

                {policyTags.length > 0 ? (
                  <View style={styles.policyTagsRow}>
                    {policyTags.map((tag) => (
                      <View key={tag.label} style={[styles.policyTag, { backgroundColor: tag.bg }]}>
                        <Text style={[styles.policyTagText, { color: tag.fg }]}>{tag.label}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>

              {/* 4. Honest Eligibility & Key Watchouts + Quick Letter Drafts */}
              {ext ? (
                <PreBidDisqualificationShield
                  tenderDetails={ext}
                  onPrepareDocuments={handlePrepareDocuments}
                />
              ) : null}

              {/* 5. Delivery Locations (Consignees) */}
              {consignees.length > 0 ? (
                <View
                  style={[
                    styles.card,
                    { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                  ]}
                >
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                      Delivery Locations
                    </Text>
                    <Text style={[styles.countLabel, { color: colors.primary }]}>
                      {consignees.length} Consignee{consignees.length === 1 ? '' : 's'}
                    </Text>
                  </View>
                  {consignees.map((c, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.consigneeRow,
                        idx > 0 && {
                          borderTopWidth: StyleSheet.hairlineWidth,
                          borderTopColor: colors.borderSubtle,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.consigneeLocation, { color: colors.textPrimary }]}>
                          {c.location}
                        </Text>
                        <Text style={[styles.consigneeOfficer, { color: colors.textSecondary }]}>
                          {c.reportingOfficer || 'Consignee Reporting Officer'}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.stateBadge, { color: colors.primary }]}>
                          {c.state || 'India'}
                          {c.pincode ? ` · ${c.pincode}` : ''}
                        </Text>
                        <Text style={[styles.consigneeQty, { color: colors.textPrimary }]}>
                          {c.quantity !== undefined
                            ? `${c.quantity.toLocaleString('en-IN')} Units`
                            : 'See PDF'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* 6. Interactive Seller Document Checklist */}
              {requiredDocuments.length > 0 ? (
                <View
                  style={[
                    styles.card,
                    { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                  ]}
                >
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                      Documents Required from Seller
                    </Text>
                    <Text style={[styles.countLabel, { color: colors.primary }]}>
                      {checkedCount}/{requiredDocuments.length}
                    </Text>
                  </View>
                  {requiredDocuments.map((doc, idx) => {
                    const isChecked = !!checkedDocs[doc];
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.checkRow,
                          idx > 0 && {
                            borderTopWidth: StyleSheet.hairlineWidth,
                            borderTopColor: colors.borderSubtle,
                          },
                        ]}
                        onPress={() => toggleDoc(doc)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            { borderColor: isChecked ? colors.primary : colors.border },
                            isChecked && { backgroundColor: colors.primary },
                          ]}
                        >
                          <Text style={[styles.checkMark, { color: colors.textInverse }]}>
                            {isChecked ? '✓' : ''}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.checkLabel,
                            { color: isChecked ? colors.textPrimary : colors.textSecondary },
                            isChecked && { fontWeight: '700' },
                          ]}
                        >
                          {doc}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}

              {/* 7. Published Scope */}
              {boqItems.length > 0 ? (
                <View
                  style={[
                    styles.card,
                    { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                  ]}
                >
                  <Text
                    style={[styles.sectionHeading, { color: colors.textPrimary, marginBottom: 8 }]}
                  >
                    Published Scope
                  </Text>
                  {boqItems.map((item, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.boqItemRow,
                        idx > 0 && {
                          borderTopWidth: StyleSheet.hairlineWidth,
                          borderTopColor: colors.borderSubtle,
                        },
                      ]}
                    >
                      <View style={styles.boqTopRow}>
                        <Text style={[styles.boqItemTitle, { color: colors.textPrimary }]}>
                          {item.itemTitle}
                        </Text>
                        <View style={[styles.boqQtyPill, { backgroundColor: colors.successTint }]}>
                          <Text style={[styles.boqQtyText, { color: colors.success }]}>
                            {item.quantity !== undefined
                              ? `${item.quantity.toLocaleString('en-IN')} ${item.unit || 'Units'}`
                              : 'See PDF'}
                          </Text>
                        </View>
                      </View>
                      {item.specsSummary ? (
                        <Text style={[styles.boqSpecsText, { color: colors.textSecondary }]}>
                          {item.specsSummary}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}

              <Text style={[styles.footerDisclaimer, { color: colors.textMuted }]}>
                Direct public GeM feed + local on-device PDF extraction. Final bid submission and
                account-specific pricing remain on bidplus.gem.gov.in.
              </Text>
            </ScrollView>

            {/* Streamlined Sticky Bottom Actions */}
            <View
              style={[
                styles.stickyFooter,
                { backgroundColor: colors.surface, borderTopColor: colors.borderSubtle },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.secondaryFooterBtn,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                ]}
                onPress={handlePrepareDocuments}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondaryFooterText, { color: colors.textPrimary }]}>
                  Prepare Docs
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryFooterBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleOpenDoc()}
                activeOpacity={0.85}
              >
                <Text style={[styles.primaryFooterText, { color: colors.textInverse }]}>
                  {mainAndBuyerDocs.length > 1
                    ? `Read Documents (${mainAndBuyerDocs.length})`
                    : 'Read Tender PDF'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {showDealSheet && (
        <TenderDealSheetCard
          bid={effectiveBid}
          visible={showDealSheet}
          onClose={() => setShowDealSheet(false)}
        />
      )}

      <BidDocumentViewer
        bid={effectiveBid}
        visible={documentViewerVisible}
        initialDocumentId={selectedDocumentId}
        onClose={() => setDocumentViewerVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBackIcon: { fontSize: 19, fontWeight: '700' },
  headerCenter: { flex: 1 },
  headerBidNum: { fontSize: 15, fontWeight: '800' },
  headerSubtitle: { fontSize: 11.5, marginTop: 1 },
  sharePillBtn: {
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sharePillText: { fontSize: 12, fontWeight: '800' },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 28 },
  corrigendumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
    marginBottom: 12,
    gap: 10,
  },
  corrigendumDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  corrigendumTitle: { fontSize: 12.5, fontWeight: '800' },
  corrigendumSubtitle: { fontSize: 11.5, marginTop: 1 },
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  bidTitle: { fontSize: 16.5, fontWeight: '800', lineHeight: 22.5, marginBottom: 4 },
  deptText: { fontSize: 12.5, lineHeight: 17.5, marginBottom: 12 },
  heroMetricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  heroMetricCol: {
    flex: 1,
    paddingHorizontal: 6,
  },
  heroDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
  },
  heroMetricLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  heroMetricValue: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  heroMetricSub: {
    fontSize: 10.5,
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  sectionHeading: { fontSize: 14.5, fontWeight: '800' },
  sectionSubcopy: { fontSize: 11.5, marginTop: 2 },
  foundBadge: {
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  foundBadgeText: { fontSize: 10.5, fontWeight: '800' },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    minHeight: 54,
    gap: 10,
  },
  docKindBadge: {
    minWidth: 46,
    height: 32,
    borderRadius: 7,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docKindBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  docCopy: { flex: 1 },
  docTitle: { fontSize: 13, fontWeight: '700', lineHeight: 17.5 },
  docSubtitle: { fontSize: 11, marginTop: 2 },
  docActionCue: { fontSize: 12.5, fontWeight: '800' },
  gtcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  gtcRowText: { flex: 1, fontSize: 11.5, fontWeight: '600' },
  gtcRowLink: { fontSize: 11.5, fontWeight: '800' },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  statusChipText: { fontSize: 10.5, fontWeight: '800' },
  termsTable: {
    marginTop: 2,
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    gap: 12,
  },
  termLabel: { fontSize: 12.5, fontWeight: '500', flex: 1 },
  termValue: { fontSize: 13, fontWeight: '800', textAlign: 'right', flex: 1.1 },
  policyTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  policyTag: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  policyTagText: { fontSize: 10.5, fontWeight: '700' },
  countLabel: { fontSize: 11.5, fontWeight: '800' },
  consigneeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    gap: 10,
  },
  consigneeLocation: { fontSize: 13, fontWeight: '700' },
  consigneeOfficer: { fontSize: 11.5, marginTop: 2 },
  stateBadge: { fontSize: 11, fontWeight: '700' },
  consigneeQty: { fontSize: 12.5, fontWeight: '800', marginTop: 2 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: 7,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkMark: { fontSize: 13, fontWeight: '900' },
  checkLabel: { fontSize: 12.5, flex: 1, lineHeight: 17.5 },
  boqItemRow: { paddingVertical: 9 },
  boqTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  boqItemTitle: { fontSize: 13, fontWeight: '700', flex: 1, lineHeight: 18 },
  boqQtyPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  boqQtyText: { fontSize: 11, fontWeight: '800' },
  boqSpecsText: { fontSize: 11.5, lineHeight: 16, marginTop: 4 },
  footerDisclaimer: {
    fontSize: 10.5,
    lineHeight: 15,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  stickyFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: 1,
  },
  secondaryFooterBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryFooterText: { fontSize: 13, fontWeight: '700' },
  primaryFooterBtn: {
    flex: 1.4,
    minHeight: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryFooterText: { fontSize: 13.5, fontWeight: '800' },
});
