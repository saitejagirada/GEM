/**
 * Public Reverse Auction Detail Screen (Decision Desk)
 *
 * Matches BidInspectorScreen's upgraded visual language:
 * - 1-tap Copy RA Number + Share Deal Sheet header
 * - Sticky Quick-Jump section strip (Overview · Docs · Terms · Eligibility · Portal)
 * - Executive Summary card with live countdown pill + breathable 2×2 KPI grid
 * - Official Documents clearly grouped (Primary RA/Bid PDFs vs Buyer Attachments)
 * - Scannable Key Tender Terms + honest Eligibility Watchouts & letter drafts
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  NativeModules,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { DeconstructedBidDoc, OfficialBidDocument, OfficialBidDocumentKind } from '../types/index';
import { BidDocService } from '../services/BidDocService';
import {
  LocalPdfScanner,
  enrichBidWithPdfScan,
  type LocalPdfScanResult,
} from '../services/LocalPdfScanner';
import { PortalDocService } from '../services/PortalDocService';
import { TenderRadarService } from '../services/TenderRadarService';
import { AppIcon } from '../components/AppIcons';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/designTokens';
import { StatusBadge } from '../components/SharedUI';
import { BidDocumentViewer } from './BidDocumentViewer';
import { PreBidDisqualificationShield } from '../components/PreBidDisqualificationShield';
import { TenderDealSheetCard } from '../components/TenderDealSheetCard';
import { BidMarginModal } from '../components/BidMarginModal';
import { formatDateSafe, formatInr } from '../utils/formatters';

export interface PublicReverseAuctionRecord {
  id: string;
  contractNumber: string;
  title: string;
  category: string;
  buyerOrganization: string;
  closingTimeUtc: string;
  originalBidNumber?: string;
  department?: string;
  totalQuantity?: number;
  closingDateLabel?: string;
  docUrl: string;
  publishedQuantity: boolean;
  sourceBid?: DeconstructedBidDoc;
}

interface ReverseAuctionScreenProps {
  auction: PublicReverseAuctionRecord;
  onBack?: () => void;
  onPrepareDocuments?: (bid: DeconstructedBidDoc) => void;
}

type RaSectionKey = 'overview' | 'docs' | 'terms' | 'eligibility' | 'portal';

function copyToClipboardSafe(value: string): boolean {
  try {
    const nativeClipboard = NativeModules?.Clipboard || NativeModules?.RNCClipboard;
    if (nativeClipboard && typeof nativeClipboard.setString === 'function') {
      nativeClipboard.setString(value);
      return true;
    }
  } catch {
    // Fallback to share sheet
  }
  return false;
}

function getDocBadge(
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

export const ReverseAuctionScreen: React.FC<ReverseAuctionScreenProps> = ({
  auction,
  onBack,
  onPrepareDocuments,
}) => {
  const { colors, fontMultiplier } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const sectionYRef = useRef<Partial<Record<RaSectionKey, number>>>({});

  const [pdfScan, setPdfScan] = useState<LocalPdfScanResult | null>(null);
  const [isScanningPdf, setIsScanningPdf] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | undefined>();
  const [showDealSheet, setShowDealSheet] = useState(false);
  const [showMarginCalc, setShowMarginCalc] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [activeJump, setActiveJump] = useState<RaSectionKey>('overview');
  const [isWatched, setIsWatched] = useState(() => TenderRadarService.isWatched(auction.contractNumber));

  useEffect(() => {
    setIsWatched(TenderRadarService.isWatched(auction.contractNumber));
    const unsub = TenderRadarService.subscribe(() => {
      setIsWatched(TenderRadarService.isWatched(auction.contractNumber));
    });
    return () => unsub();
  }, [auction.contractNumber]);

  const baseBid = useMemo<DeconstructedBidDoc>(() => {
    if (auction.sourceBid) return auction.sourceBid;
    return {
      bidNumber: auction.contractNumber,
      title: auction.title,
      department: auction.department || auction.buyerOrganization,
      ministry: auction.buyerOrganization,
      type: 'RA',
      isRa: true,
      categoryDomain: auction.category,
      parentBidNumber:
        auction.originalBidNumber && auction.originalBidNumber !== auction.contractNumber
          ? auction.originalBidNumber
          : undefined,
      closingTimeUtc: auction.closingTimeUtc,
      docUrl: auction.docUrl,
      boqItems:
        auction.publishedQuantity && auction.totalQuantity !== undefined
          ? [{ itemTitle: auction.title, quantity: auction.totalQuantity, unit: 'Units', specsSummary: '' }]
          : [],
      consignees: [],
      requiredDocuments: [],
      publishedFields: {
        estimatedValue: false,
        quantity: auction.publishedQuantity,
        requirements: false,
        consignees: false,
        commercialTerms: false,
      },
      source: 'LIVE_OFFICIAL_PUBLIC_FEED',
    };
  }, [auction]);

  useEffect(() => {
    let cancelled = false;
    setPdfScan(null);
    setIsScanningPdf(true);
    setActiveJump('overview');
    sectionYRef.current = {};
    LocalPdfScanner.scanBidDocuments(baseBid)
      .then((res) => {
        if (!cancelled) setPdfScan(res);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsScanningPdf(false);
      });
    return () => {
      cancelled = true;
    };
  }, [baseBid.bidNumber, baseBid.docUrl, baseBid.b_id, baseBid.parentBidId]);

  const handleRetryScan = () => {
    if (isScanningPdf) return;
    setIsScanningPdf(true);
    LocalPdfScanner.scanBidDocuments(baseBid)
      .then((res) => setPdfScan(res))
      .catch(() => undefined)
      .finally(() => setIsScanningPdf(false));
  };

  const handleCopyId = () => {
    if (copyToClipboardSafe(auction.contractNumber)) {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1800);
    } else {
      Share.share({ message: auction.contractNumber }).catch(() => undefined);
    }
  };

  const scrollToSection = (key: RaSectionKey) => {
    setActiveJump(key);
    if (key === 'overview') {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    const y = sectionYRef.current[key];
    if (typeof y === 'number') {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
    }
  };

  const effectiveBid = useMemo(() => enrichBidWithPdfScan(baseBid, pdfScan), [baseBid, pdfScan]);
  const officialDocuments = useMemo(
    () => PortalDocService.getOfficialDocuments(effectiveBid),
    [effectiveBid]
  );

  const mainAndBuyerDocs = officialDocuments.filter((d) => d.kind !== 'GTC');
  const primaryTenderDocs = mainAndBuyerDocs.filter(
    (d) => d.id === 'bid-document' || d.id === 'parent-bid-document'
  );
  const buyerAttachmentDocs = mainAndBuyerDocs.filter(
    (d) => d.id !== 'bid-document' && d.id !== 'parent-bid-document'
  );
  const gtcDocs = officialDocuments.filter((d) => d.kind === 'GTC');

  const fundamentals = BidDocService.getFundamentalsSummary(effectiveBid);
  const scannedOk = pdfScan?.status === 'EXTRACTED';
  const ext = pdfScan?.details?.extendedDetails;
  const fallbackVal = isScanningPdf ? 'Scanning…' : scannedOk ? 'Not specified' : 'In PDF';

  const openInlineDoc = (docId?: string) => {
    const target = officialDocuments.find((d) => d.id === docId) || officialDocuments[0];
    if (!target || !PortalDocService.isSafeGemUrl(target.url)) {
      Alert.alert('Security Notice', 'Document link is not from a verified official GeM domain.');
      return;
    }
    const format = target.fileFormat || PortalDocService.inferFileFormat(target.url);
    if (format === 'XLSX' || format === 'CSV') {
      Linking.openURL(target.url).catch(() => {
        setSelectedDocId(target.id);
        setViewerVisible(true);
      });
      return;
    }
    setSelectedDocId(target.id);
    setViewerVisible(true);
  };

  const closingDate = new Date(auction.closingTimeUtc);
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

  const estDisplay =
    effectiveBid.estimatedBidValueInr !== undefined && effectiveBid.estimatedBidValueInr > 0
      ? `₹${formatInr(effectiveBid.estimatedBidValueInr)}`
      : effectiveBid.isHighValue
        ? '≥ ₹2 Cr'
        : isScanningPdf
          ? 'Scanning…'
          : scannedOk
            ? 'Not disclosed'
            : 'In PDF';

  const emdDisplay =
    effectiveBid.emdAmountInr !== undefined
      ? effectiveBid.emdAmountInr === 0
        ? '₹0 (Not Required)'
        : `₹${formatInr(effectiveBid.emdAmountInr)}${effectiveBid.isEmdExemptForMse ? ' (MSE Exempt)' : ''}`
      : effectiveBid.isEmdExemptForMse
        ? 'MSE Exempt'
        : fallbackVal;
  const emdShortDisplay =
    effectiveBid.emdAmountInr === 0
      ? 'None (₹0)'
      : effectiveBid.emdAmountInr !== undefined
        ? `₹${formatInr(effectiveBid.emdAmountInr)}`
        : emdDisplay;
  const emdIsPositive = effectiveBid.emdAmountInr === 0 || Boolean(effectiveBid.isEmdExemptForMse);

  const epbgDisplay =
    effectiveBid.epbgPercentage !== undefined
      ? effectiveBid.epbgPercentage === 0
        ? 'Not Required (0%)'
        : effectiveBid.epbgDurationMonths
          ? `${effectiveBid.epbgPercentage}% (${effectiveBid.epbgDurationMonths} mo)`
          : `${effectiveBid.epbgPercentage}%`
      : fallbackVal;

  const deliveryDisplay =
    effectiveBid.deliveryPeriodDays !== undefined ? `${effectiveBid.deliveryPeriodDays} Days` : fallbackVal;

  const primaryState =
    effectiveBid.consignees?.[0]?.state ||
    Object.keys(ext?.consigneeStateDistribution || {})[0];

  const turnoverDisplay =
    effectiveBid.minAnnualTurnoverInr !== undefined
      ? `₹${formatInr(effectiveBid.minAnnualTurnoverInr)}`
      : ext?.mseExemptionForExpAndTurnover
        ? 'MSE / Startup Relaxed'
        : fallbackVal;

  const experienceDisplay =
    effectiveBid.yearsExperienceRequired !== undefined
      ? fundamentals.experienceLabel
      : ext?.mseExemptionForExpAndTurnover
        ? 'MSE / Startup Relaxed'
        : fallbackVal;

  const totalQty =
    auction.publishedQuantity && auction.totalQuantity !== undefined
      ? auction.totalQuantity
      : ext?.totalQuantity;

  const keyTermRows: Array<{ label: string; value: string; accent?: string }> = [
    {
      label: 'Estimated Value',
      value: estDisplay,
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
  ];

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
    policyTags.push({
      label:
        effectiveBid.makeInIndiaClass === 'CLASS_1'
          ? 'MII Class-1 (≥50%)'
          : effectiveBid.makeInIndiaClass === 'CLASS_2'
            ? 'MII Class-2 (≥20%)'
            : 'MII Preference',
      bg: colors.warningTint,
      fg: colors.warning,
    });
  }

  const jumpItems: Array<{ key: RaSectionKey; label: string; highlight?: boolean }> = [
    { key: 'overview', label: 'Overview' },
    {
      key: 'docs',
      label: `Docs (${mainAndBuyerDocs.length})`,
      highlight: buyerAttachmentDocs.length > 0,
    },
    { key: 'terms', label: 'Terms' },
    ...(ext ? [{ key: 'eligibility' as const, label: 'Eligibility' }] : []),
    { key: 'portal', label: 'GeM Portal' },
  ];

  const renderDocRow = (doc: OfficialBidDocument, isFirstInGroup: boolean) => {
    const badge = getDocBadge(doc, colors);
    const format = doc.fileFormat || PortalDocService.inferFileFormat(doc.url);
    const isPdf = format === 'PDF';

    return (
      <Pressable
        key={doc.id}
        style={({ pressed }) => [
          styles.docRow,
          !isFirstInGroup && {
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.borderSubtle,
          },
          pressed && { opacity: 0.74 },
        ]}
        onPress={() => openInlineDoc(doc.id)}
      >
        <View style={[styles.docBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.docBadgeText, { color: badge.fg }]}>{badge.label}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.docTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {doc.label}
          </Text>
          <Text style={[styles.docSub, { color: colors.textSecondary }]} numberOfLines={1}>
            {doc.subtitle || (isPdf ? 'Official GeM PDF · Read inside app' : `Official ${format} file`)}
          </Text>
        </View>
        <View
          style={[
            styles.docActionPill,
            {
              backgroundColor: isPdf ? colors.primaryTint : colors.surfaceSubtle,
              borderColor: isPdf ? 'transparent' : colors.borderSubtle,
            },
          ]}
        >
          <Text style={[styles.docActionCue, { color: isPdf ? colors.primary : colors.textPrimary }]}>
            {isPdf ? 'Read ›' : 'Open ↗'}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.screenRoot, { backgroundColor: colors.background }]}>
      {/* Fixed Sub-header with 1-Tap Copy RA Number */}
      <View
        style={[
          styles.fixedHeader,
          { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle },
        ]}
      >
        {onBack && (
          <Pressable
            onPress={onBack}
            hitSlop={10}
            style={[
              styles.backBtn,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
            ]}
            accessibilityLabel="Back to auctions"
          >
            <Text style={[styles.backArrow, { color: colors.textPrimary }]}>←</Text>
          </Pressable>
        )}
        <Pressable style={{ flex: 1 }} onPress={handleCopyId} hitSlop={4}>
          <View style={styles.navTitleRow}>
            <Text
              style={[styles.navTitle, { color: colors.textPrimary, fontSize: 14.5 * fontMultiplier }]}
              numberOfLines={1}
            >
              {auction.contractNumber}
            </Text>
            <View
              style={[
                styles.copyChip,
                { backgroundColor: copiedId ? colors.successTint : colors.surfaceSubtle },
              ]}
            >
              <Text
                style={[
                  styles.copyChipText,
                  { color: copiedId ? colors.success : colors.textSecondary },
                ]}
              >
                {copiedId ? 'Copied ✓' : 'Copy'}
              </Text>
            </View>
          </View>
          <Text style={[styles.navSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            Live RA · Closes {formatDateSafe(auction.closingTimeUtc)}
          </Text>
        </Pressable>
        <StatusBadge label="LIVE RA" tone="success" dot />
        <Pressable
          style={[
            styles.watchChipBtn,
            {
              backgroundColor: isWatched ? colors.warningTint : colors.surfaceSubtle,
              borderColor: isWatched ? colors.warning : colors.borderSubtle,
            },
          ]}
          onPress={() => void TenderRadarService.toggleWatch(effectiveBid)}
          hitSlop={6}
          accessibilityLabel={isWatched ? 'Remove from watched auctions' : 'Watch auction'}
        >
          <AppIcon
            name={isWatched ? 'bookmarkFilled' : 'bookmark'}
            color={isWatched ? colors.warning : colors.textSecondary}
            size={14}
          />
        </Pressable>
        <Pressable
          style={[styles.shareChip, { backgroundColor: colors.primaryTint }]}
          onPress={() => setShowDealSheet(true)}
          hitSlop={6}
        >
          <Text style={[styles.shareChipText, { color: colors.primary }]}>Share ↗</Text>
        </Pressable>
      </View>

      {/* Sticky Quick-Jump Strip */}
      <View
        style={[
          styles.jumpBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.jumpBarRow}
        >
          {jumpItems.map((item) => {
            const active = activeJump === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => scrollToSection(item.key)}
                style={[
                  styles.jumpPill,
                  {
                    backgroundColor: active
                      ? colors.primary
                      : item.highlight
                        ? colors.successTint
                        : colors.surfaceSubtle,
                    borderColor: active
                      ? colors.primary
                      : item.highlight
                        ? colors.success
                        : colors.borderSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.jumpPillText,
                    {
                      color: active
                        ? colors.textInverse
                        : item.highlight
                          ? colors.success
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Executive Summary Card with Accent Strip & 2×2 KPI Grid */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
          ]}
        >
          <View style={[styles.heroAccentStrip, { backgroundColor: colors.danger }]} />
          <View style={styles.heroCardInner}>
            <View style={styles.heroTopRow}>
              <View style={styles.badgeRow}>
                <View style={[styles.pillBadge, { backgroundColor: colors.dangerTint }]}>
                  <Text style={[styles.pillBadgeText, { color: colors.danger }]}>REVERSE AUCTION</Text>
                </View>
                {baseBid.parentBidNumber ? (
                  <View style={[styles.pillBadge, { backgroundColor: colors.surfaceSubtle }]}>
                    <Text style={[styles.pillBadgeText, { color: colors.textSecondary }]}>
                      Parent: {baseBid.parentBidNumber}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View
                style={[
                  styles.countdownPill,
                  { backgroundColor: isClosingSoon ? colors.dangerTint : colors.primaryTint },
                ]}
              >
                <View
                  style={[
                    styles.countdownDot,
                    { backgroundColor: isClosingSoon ? colors.danger : colors.primary },
                  ]}
                />
                <Text
                  style={[
                    styles.countdownPillText,
                    { color: isClosingSoon ? colors.danger : colors.primary },
                  ]}
                >
                  {remainingLabel}
                </Text>
              </View>
            </View>

            <Text style={[styles.auctionTitle, { color: colors.textPrimary, fontSize: 17 * fontMultiplier }]}>
              {auction.title}
            </Text>
            <Text style={[styles.deptText, { color: colors.textSecondary }]}>
              {[
                auction.department,
                auction.buyerOrganization !== auction.department ? auction.buyerOrganization : '',
              ]
                .filter(Boolean)
                .join(' · ') || 'Department unstated'}
            </Text>

            {/* Breathable 2×2 KPI Grid */}
            <View style={styles.kpiGrid}>
              <View
                style={[
                  styles.kpiTile,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                ]}
              >
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>EST. VALUE</Text>
                <Text style={[styles.kpiValue, { color: colors.primary }]} numberOfLines={1}>
                  {estDisplay}
                </Text>
                <Text style={[styles.kpiSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {totalQty !== undefined ? `Qty ${totalQty.toLocaleString('en-IN')} Units` : 'See PDF scope'}
                </Text>
              </View>

              <View
                style={[
                  styles.kpiTile,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                ]}
              >
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>EMD GUARANTEE</Text>
                <Text
                  style={[
                    styles.kpiValue,
                    { color: emdIsPositive ? colors.success : colors.textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {emdShortDisplay}
                </Text>
                <Text
                  style={[
                    styles.kpiSub,
                    { color: effectiveBid.isEmdExemptForMse ? colors.success : colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {effectiveBid.emdAmountInr === 0
                    ? 'Not required for any bidder'
                    : effectiveBid.isEmdExemptForMse
                      ? 'MSE Exempt (OEM)'
                      : 'Check PDF terms'}
                </Text>
              </View>

              <View
                style={[
                  styles.kpiTile,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                ]}
              >
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>e-PBG SECURITY</Text>
                <Text
                  style={[
                    styles.kpiValue,
                    {
                      color:
                        effectiveBid.epbgPercentage === 0
                          ? colors.success
                          : effectiveBid.epbgPercentage
                            ? colors.warning
                            : colors.textPrimary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {epbgDisplay}
                </Text>
                <Text style={[styles.kpiSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  Post-award performance
                </Text>
              </View>

              <View
                style={[
                  styles.kpiTile,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                ]}
              >
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>DELIVERY</Text>
                <Text
                  style={[
                    styles.kpiValue,
                    { color: effectiveBid.deliveryPeriodDays ? colors.primary : colors.textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {deliveryDisplay}
                </Text>
                <Text style={[styles.kpiSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {primaryState || 'See consignees'}
                </Text>
              </View>
            </View>

            {/* 1-Tap Bid Margin & RA Floor Calculator Launcher */}
            <Pressable
              onPress={() => setShowMarginCalc(true)}
              style={({ pressed }) => [
                styles.calcTriggerRow,
                {
                  backgroundColor: colors.primaryTint,
                  borderColor: colors.borderSubtle,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
              accessibilityLabel="Open Bid Margin and RA Floor Calculator"
            >
              <View style={[styles.calcIconBox, { backgroundColor: colors.surface }]}>
                <AppIcon name="calculator" color={colors.primary} size={15} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.calcTriggerTitle, { color: colors.primary }]}>
                  RA Walk-Away Floor &amp; Margin Calculator
                </Text>
                <Text style={[styles.calcTriggerSub, { color: colors.textSecondary }]}>
                  Set your safe decrement floor before entering live RA
                </Text>
              </View>
              <Text style={[styles.calcTriggerCue, { color: colors.primary }]}>Calculate ›</Text>
            </Pressable>
          </View>
        </View>

        {/* 2. Official Documents & Auto-Discovered Buyer Attachments */}
        <View
          onLayout={(e) => {
            sectionYRef.current.docs = e.nativeEvent.layout.y;
          }}
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Official Documents ({mainAndBuyerDocs.length})
              </Text>
              <Text style={[styles.sectionSubcopy, { color: colors.textSecondary }]}>
                {isScanningPdf
                  ? 'Scanning RA & Original Bid PDFs for specs, drawings & ATC…'
                  : buyerAttachmentDocs.length > 0
                    ? `${buyerAttachmentDocs.length} buyer attachment${buyerAttachmentDocs.length === 1 ? '' : 's'} discovered`
                    : 'Tap any document to read inside the app'}
              </Text>
            </View>
            {isScanningPdf ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : buyerAttachmentDocs.length > 0 ? (
              <View style={[styles.foundBadge, { backgroundColor: colors.successTint }]}>
                <Text style={[styles.foundBadgeText, { color: colors.success }]}>
                  +{buyerAttachmentDocs.length} Linked
                </Text>
              </View>
            ) : null}
          </View>

          {primaryTenderDocs.map((doc, idx) => renderDocRow(doc, idx === 0))}

          {buyerAttachmentDocs.length > 0 ? (
            <>
              <View
                style={[
                  styles.docGroupHeader,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                ]}
              >
                <Text style={[styles.docGroupHeaderText, { color: colors.primary }]}>
                  BUYER ATTACHMENTS DISCOVERED IN PDF ({buyerAttachmentDocs.length})
                </Text>
              </View>
              {buyerAttachmentDocs.map((doc, idx) => renderDocRow(doc, idx === 0))}
            </>
          ) : null}

          {gtcDocs.length > 0 ? (
            <Pressable
              style={[styles.gtcRow, { borderTopColor: colors.borderSubtle }]}
              onPress={() => openInlineDoc(gtcDocs[0].id)}
            >
              <Text style={[styles.gtcRowText, { color: colors.textSecondary }]} numberOfLines={1}>
                GeM General Terms &amp; Conditions (GTC)
              </Text>
              <Text style={[styles.gtcRowLink, { color: colors.primary }]}>View PDF ›</Text>
            </Pressable>
          ) : null}
        </View>

        {/* 3. Scannable Key Tender Terms Table */}
        <View
          onLayout={(e) => {
            sectionYRef.current.terms = e.nativeEvent.layout.y;
          }}
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Key Tender Terms</Text>
              {scannedOk ? (
                <Text style={[styles.sectionSubcopy, { color: colors.textSecondary }]} numberOfLines={1}>
                  {baseBid.parentBidNumber
                    ? `Exact figures from Original Bid PDF (${baseBid.parentBidNumber})`
                    : 'Exact figures from RA PDF'}
                </Text>
              ) : null}
            </View>
            {isScanningPdf ? (
              <View style={[styles.statusChip, { backgroundColor: colors.primaryTint }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.statusChipText, { color: colors.primary }]}>Scanning…</Text>
              </View>
            ) : scannedOk ? (
              <Pressable
                onPress={handleRetryScan}
                hitSlop={6}
                style={[styles.statusChip, { backgroundColor: colors.successTint }]}
              >
                <Text style={[styles.statusChipText, { color: colors.success }]}>✓ Parsed from PDF</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.statusChip, { backgroundColor: colors.primaryTint }]}
                onPress={handleRetryScan}
                hitSlop={6}
              >
                <Text style={[styles.statusChipText, { color: colors.primary }]}>Scan PDF ↻</Text>
              </Pressable>
            )}
          </View>

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
              <Text style={[styles.termLabel, { color: colors.textSecondary }]}>{row.label}</Text>
              <Text
                style={[styles.termValue, { color: row.accent || colors.textPrimary }]}
                numberOfLines={2}
              >
                {row.value}
              </Text>
            </View>
          ))}

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

        {/* 4. Honest Eligibility & Key Watchouts */}
        {ext ? (
          <View
            onLayout={(e) => {
              sectionYRef.current.eligibility = e.nativeEvent.layout.y;
            }}
          >
            <PreBidDisqualificationShield
              tenderDetails={ext}
              onPrepareDocuments={onPrepareDocuments ? () => onPrepareDocuments(effectiveBid) : undefined}
            />
          </View>
        ) : null}

        {/* Official GeM Portal Login Handoff */}
        <Pressable
          onLayout={(e) => {
            sectionYRef.current.portal = e.nativeEvent.layout.y;
          }}
          style={({ pressed }) => [
            styles.portalRowCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
              opacity: pressed ? 0.78 : 1,
            },
          ]}
          onPress={() => Linking.openURL('https://ui.gem.gov.in/login').catch(() => undefined)}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.portalRowTitle, { color: colors.textPrimary }]}>
              Participate on Official GeM Portal
            </Text>
            <Text style={[styles.portalRowSub, { color: colors.textSecondary }]}>
              Live L1 pricing, seller rank &amp; auction bidding happen on bidplus.gem.gov.in
            </Text>
          </View>
          <View style={[styles.docActionPill, { backgroundColor: colors.primaryTint, borderColor: 'transparent' }]}>
            <Text style={[styles.portalRowLink, { color: colors.primary }]}>Login ↗</Text>
          </View>
        </Pressable>

        <Text style={[styles.footerNote, { color: colors.textMuted }]}>
          Direct public GeM feed + local on-device PDF extraction.
        </Text>
      </ScrollView>

      {/* Clean Sticky Bottom Bar */}
      <View
        style={[
          styles.stickyFooter,
          { backgroundColor: colors.surface, borderTopColor: colors.borderSubtle },
        ]}
      >
        {onPrepareDocuments ? (
          <TouchableOpacity
            style={[
              styles.secondaryFooterBtn,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
            ]}
            onPress={() => onPrepareDocuments(effectiveBid)}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryFooterText, { color: colors.textPrimary }]}>
              Prepare Docs
            </Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.primaryFooterBtn, { backgroundColor: colors.primary }]}
          onPress={() => openInlineDoc()}
          activeOpacity={0.85}
        >
          <Text style={[styles.primaryFooterText, { color: colors.textInverse }]}>
            {mainAndBuyerDocs.length > 1
              ? `Read Documents (${mainAndBuyerDocs.length})`
              : 'Read RA PDF'}
          </Text>
        </TouchableOpacity>
      </View>

      <BidDocumentViewer
        bid={effectiveBid}
        visible={viewerVisible}
        initialDocumentId={selectedDocId}
        onClose={() => setViewerVisible(false)}
      />

      {showDealSheet && (
        <TenderDealSheetCard
          bid={effectiveBid}
          visible={showDealSheet}
          onClose={() => setShowDealSheet(false)}
        />
      )}

      {showMarginCalc && (
        <BidMarginModal
          bid={effectiveBid}
          visible={showMarginCalc}
          onClose={() => setShowMarginCalc(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  fixedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 19, fontWeight: '700' },
  navTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  navTitle: { fontWeight: '800', flexShrink: 1 },
  copyChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  copyChipText: { fontSize: 9.5, fontWeight: '800' },
  navSubtitle: { fontSize: 11, marginTop: 1 },
  watchChipBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareChip: {
    paddingHorizontal: 10,
    minHeight: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareChipText: { fontSize: 11.5, fontWeight: '800' },
  jumpBar: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  jumpBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 7,
  },
  jumpPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  jumpPillText: { fontSize: 11.5, fontWeight: '700' },
  container: { flex: 1 },
  contentContainer: { padding: 14, paddingBottom: 24 },
  heroCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  heroAccentStrip: { height: 4, width: '100%' },
  heroCardInner: { padding: 14 },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countdownDot: { width: 6, height: 6, borderRadius: 3 },
  countdownPillText: { fontSize: 10.5, fontWeight: '800' },
  auctionTitle: { fontWeight: '800', marginBottom: 4, lineHeight: 23 },
  deptText: { fontSize: 12.5, lineHeight: 17.5, marginBottom: 12 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpiTile: {
    width: '48.6%',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  kpiLabel: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.5, marginBottom: 3 },
  kpiValue: { fontSize: 14.5, fontWeight: '800' },
  kpiSub: { fontSize: 10.5, marginTop: 2 },
  calcTriggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
    minHeight: 48,
  },
  calcIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calcTriggerTitle: { fontSize: 12.5, fontWeight: '800' },
  calcTriggerSub: { fontSize: 10.5, marginTop: 1 },
  calcTriggerCue: { fontSize: 12, fontWeight: '800' },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  sectionSubcopy: { fontSize: 11.5, marginTop: 2 },
  foundBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  foundBadgeText: { fontSize: 10.5, fontWeight: '800' },
  docGroupHeader: {
    marginTop: 8,
    marginBottom: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
  },
  docGroupHeaderText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6 },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    minHeight: 56,
    gap: 10,
  },
  docBadge: {
    minWidth: 48,
    height: 34,
    borderRadius: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  docTitle: { fontSize: 13.5, fontWeight: '700', lineHeight: 18 },
  docSub: { fontSize: 11, marginTop: 2 },
  docActionPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  docActionCue: { fontSize: 11.5, fontWeight: '800' },
  gtcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 11,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  gtcRowText: { flex: 1, fontSize: 12, fontWeight: '600' },
  gtcRowLink: { fontSize: 12, fontWeight: '800' },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusChipText: { fontSize: 10.5, fontWeight: '800' },
  termRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 12,
  },
  termLabel: { fontSize: 12.5, fontWeight: '500', flex: 1 },
  termValue: { fontSize: 13, fontWeight: '800', textAlign: 'right', flex: 1.15 },
  policyTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  policyTag: { borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4 },
  policyTagText: { fontSize: 10.5, fontWeight: '700' },
  portalRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  portalRowTitle: { fontSize: 13.5, fontWeight: '800' },
  portalRowSub: { fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  portalRowLink: { fontSize: 12, fontWeight: '800' },
  footerNote: { fontSize: 10.5, textAlign: 'center', marginBottom: 8 },
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryFooterText: { fontSize: 13, fontWeight: '700' },
  primaryFooterBtn: {
    flex: 1.45,
    minHeight: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryFooterText: { fontSize: 13.5, fontWeight: '800' },
});
