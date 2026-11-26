/**
 * Public Reverse Auction Detail Screen
 *
 * Matches BidInspectorScreen's clean visual language and uses the universal
 * on-device PDF linked-document discovery engine so Reverse Auctions show:
 * - Executive 3-metric highlights strip (Closes In, Est. Value, EMD)
 * - Official Documents (RA PDF + Original Bid PDF + all auto-discovered buyer
 *   Technical Specifications, Product Drawings, ATC/Criteria, BOQ Excel/CSV, GTC)
 * - Scannable hairline Key Tender Terms table + Policy tags
 * - Honest Eligibility & Key Watchouts + 1-tap compliance letter drafts
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
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
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/designTokens';
import { StatusBadge } from '../components/SharedUI';
import { BidDocumentViewer } from './BidDocumentViewer';
import { PreBidDisqualificationShield } from '../components/PreBidDisqualificationShield';
import { TenderDealSheetCard } from '../components/TenderDealSheetCard';
import { formatDateSafe } from '../utils/formatters';

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
  const [pdfScan, setPdfScan] = useState<LocalPdfScanResult | null>(null);
  const [isScanningPdf, setIsScanningPdf] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | undefined>();
  const [showDealSheet, setShowDealSheet] = useState(false);

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

  const effectiveBid = useMemo(() => enrichBidWithPdfScan(baseBid, pdfScan), [baseBid, pdfScan]);
  const officialDocuments = useMemo(
    () => PortalDocService.getOfficialDocuments(effectiveBid),
    [effectiveBid]
  );

  const mainAndBuyerDocs = officialDocuments.filter((d) => d.kind !== 'GTC');
  const gtcDocs = officialDocuments.filter((d) => d.kind === 'GTC');
  const extraBuyerAttachmentCount = mainAndBuyerDocs.filter(
    (d) => d.id !== 'bid-document' && d.id !== 'parent-bid-document'
  ).length;

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

  // Closing countdown
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
        : fallbackVal;
  const emdIsPositive = effectiveBid.emdAmountInr === 0 || Boolean(effectiveBid.isEmdExemptForMse);

  const epbgDisplay =
    effectiveBid.epbgPercentage !== undefined
      ? effectiveBid.epbgPercentage === 0
        ? 'Not Required (0%)'
        : effectiveBid.epbgDurationMonths
          ? `${effectiveBid.epbgPercentage}% (${effectiveBid.epbgDurationMonths} months)`
          : `${effectiveBid.epbgPercentage}%`
      : fallbackVal;

  const deliveryDisplay =
    effectiveBid.deliveryPeriodDays !== undefined ? `${effectiveBid.deliveryPeriodDays} Days` : fallbackVal;

  const turnoverDisplay =
    effectiveBid.minAnnualTurnoverInr !== undefined
      ? fundamentals.turnoverLabel
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

  return (
    <View style={[styles.screenRoot, { backgroundColor: colors.background }]}>
      {/* Fixed Sub-header */}
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
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.navTitle, { color: colors.textPrimary, fontSize: 15 * fontMultiplier }]}
            numberOfLines={1}
          >
            {auction.contractNumber}
          </Text>
          <Text style={[styles.navSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            Live Public Reverse Auction
          </Text>
        </View>
        <StatusBadge label="LIVE RA" tone="success" dot />
        <Pressable
          style={[styles.shareChip, { backgroundColor: colors.primaryTint }]}
          onPress={() => setShowDealSheet(true)}
          hitSlop={6}
        >
          <Text style={[styles.shareChipText, { color: colors.primary }]}>Share ↗</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Clean Executive Summary Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
          ]}
        >
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

          <Text style={[styles.auctionTitle, { color: colors.textPrimary, fontSize: 16.5 * fontMultiplier }]}>
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

          {/* 3-Metric At-a-Glance Strip */}
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
                {formatDateSafe(auction.closingTimeUtc).split(',')[0]}
              </Text>
            </View>

            <View style={[styles.heroDivider, { backgroundColor: colors.borderSubtle }]} />

            <View style={styles.heroMetricCol}>
              <Text style={[styles.heroMetricLabel, { color: colors.textMuted }]}>EST. VALUE</Text>
              <Text style={[styles.heroMetricValue, { color: colors.primary }]} numberOfLines={1}>
                {estDisplay}
              </Text>
              <Text style={[styles.heroMetricSub, { color: colors.textSecondary }]} numberOfLines={1}>
                {totalQty !== undefined ? `Qty ${totalQty.toLocaleString('en-IN')}` : 'See PDF'}
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
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Official Documents ({mainAndBuyerDocs.length})
              </Text>
              <Text style={[styles.sectionSubcopy, { color: colors.textSecondary }]}>
                {isScanningPdf
                  ? 'Scanning RA & Original Bid PDFs for linked specs & ATC…'
                  : extraBuyerAttachmentCount > 0
                    ? `${extraBuyerAttachmentCount} extra buyer attachment${extraBuyerAttachmentCount === 1 ? '' : 's'} discovered`
                    : 'Tap any document to read inline'}
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

          {mainAndBuyerDocs.map((doc, idx) => {
            const badge = getDocBadge(doc, colors);
            const format = doc.fileFormat || PortalDocService.inferFileFormat(doc.url);
            const isPdf = format === 'PDF';

            return (
              <Pressable
                key={doc.id}
                style={({ pressed }) => [
                  styles.docRow,
                  idx > 0 && {
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
                    {doc.subtitle || (isPdf ? 'Official GeM PDF · Read inline' : `Official ${format} file`)}
                  </Text>
                </View>
                <Text style={[styles.docActionCue, { color: colors.primary }]}>
                  {isPdf ? 'Read ›' : 'Open ↗'}
                </Text>
              </Pressable>
            );
          })}

          {gtcDocs.length > 0 ? (
            <Pressable
              style={[styles.gtcRow, { borderTopColor: colors.borderSubtle }]}
              onPress={() => openInlineDoc(gtcDocs[0].id)}
            >
              <Text style={[styles.gtcRowText, { color: colors.textSecondary }]} numberOfLines={1}>
                Standard Reference: GeM General Terms &amp; Conditions (GTC) PDF
              </Text>
              <Text style={[styles.gtcRowLink, { color: colors.primary }]}>View ›</Text>
            </Pressable>
          ) : null}
        </View>

        {/* 3. Clean Scannable Key Tender Terms Table */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Key Tender Terms</Text>
            {isScanningPdf ? (
              <View style={[styles.statusChip, { backgroundColor: colors.primaryTint }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.statusChipText, { color: colors.primary }]}>Scanning…</Text>
              </View>
            ) : scannedOk ? (
              <View style={[styles.statusChip, { backgroundColor: colors.successTint }]}>
                <Text style={[styles.statusChipText, { color: colors.success }]}>✓ Parsed from PDF</Text>
              </View>
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
          <PreBidDisqualificationShield
            tenderDetails={ext}
            onPrepareDocuments={onPrepareDocuments ? () => onPrepareDocuments(effectiveBid) : undefined}
          />
        ) : null}

        {/* Official GeM Portal Login Handoff */}
        <Pressable
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
          <Text style={[styles.portalRowLink, { color: colors.primary }]}>Login ↗</Text>
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
  navTitle: { fontWeight: '800' },
  navSubtitle: { fontSize: 11, marginTop: 1 },
  shareChip: {
    paddingHorizontal: 10,
    minHeight: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareChipText: { fontSize: 11.5, fontWeight: '800' },
  container: { flex: 1 },
  contentContainer: { padding: 14, paddingBottom: 24 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
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
  pillBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  auctionTitle: { fontWeight: '800', marginBottom: 4, lineHeight: 22.5 },
  deptText: { fontSize: 12.5, lineHeight: 17.5, marginBottom: 12 },
  heroMetricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  heroMetricCol: { flex: 1, paddingHorizontal: 6 },
  heroDivider: { width: StyleSheet.hairlineWidth, height: 36 },
  heroMetricLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  heroMetricValue: { fontSize: 13.5, fontWeight: '800' },
  heroMetricSub: { fontSize: 10.5, marginTop: 1 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: { fontSize: 14.5, fontWeight: '800' },
  sectionSubcopy: { fontSize: 11.5, marginTop: 2 },
  foundBadge: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 },
  foundBadgeText: { fontSize: 10.5, fontWeight: '800' },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    minHeight: 54,
    gap: 10,
  },
  docBadge: {
    minWidth: 46,
    height: 32,
    borderRadius: 7,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  docTitle: { fontSize: 13, fontWeight: '700', lineHeight: 17.5 },
  docSub: { fontSize: 11, marginTop: 2 },
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
  termRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    gap: 12,
  },
  termLabel: { fontSize: 12.5, fontWeight: '500', flex: 1 },
  termValue: { fontSize: 13, fontWeight: '800', textAlign: 'right', flex: 1.1 },
  policyTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  policyTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  policyTagText: { fontSize: 10.5, fontWeight: '700' },
  portalRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 13,
    marginBottom: 12,
    gap: 10,
  },
  portalRowTitle: { fontSize: 13, fontWeight: '700' },
  portalRowSub: { fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  portalRowLink: { fontSize: 12.5, fontWeight: '800' },
  footerNote: { fontSize: 10.5, lineHeight: 15, textAlign: 'center', paddingHorizontal: 8 },
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
