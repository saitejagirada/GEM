/**
 * Public reverse-auction detail with inline PDF viewer & on-device fundamentals.
 *
 * Stays strictly read-only for authenticated fields (seller rank, L1 price,
 * bid submission stay on GeM), while surfacing official RA + Parent Bid PDFs
 * inline and extracting published commercial terms locally on device.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { DeconstructedBidDoc } from '../types/index';
import { BidDocService } from '../services/BidDocService';
import {
  LocalPdfScanner,
  enrichBidWithPdfScan,
  type LocalPdfScanResult,
} from '../services/LocalPdfScanner';
import { PortalDocService } from '../services/PortalDocService';
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import { StatusBadge, PrimaryButton, SecondaryButton } from '../components/SharedUI';
import { BidDocumentViewer } from './BidDocumentViewer';
import { BidInspectorScreen } from './BidInspectorScreen';

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

const formatClosingTime = (closingTimeUtc: string): string => {
  const date = new Date(closingTimeUtc);
  if (Number.isNaN(date.getTime())) return 'Not published';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
};

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
  const [inspectorVisible, setInspectorVisible] = useState(false);

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

  const officialDocuments = useMemo(() => PortalDocService.getOfficialDocuments(baseBid), [baseBid]);

  useEffect(() => {
    let cancelled = false;
    setPdfScan(null);
    setIsScanningPdf(true);
    LocalPdfScanner.scanBidDocuments(baseBid)
      .then((res) => {
        if (!cancelled) setPdfScan(res);
      })
      .finally(() => {
        if (!cancelled) setIsScanningPdf(false);
      });
    return () => {
      cancelled = true;
    };
  }, [baseBid]);

  const effectiveBid = enrichBidWithPdfScan(baseBid, pdfScan);
  const fundamentals = BidDocService.getFundamentalsSummary(effectiveBid);
  const scannedOk = pdfScan?.status === 'EXTRACTED';
  const ext = pdfScan?.details?.extendedDetails;
  const fallbackVal = isScanningPdf ? 'Scanning…' : scannedOk ? 'Not specified' : 'In PDF';

  const openInlineDoc = (docId?: string) => {
    setSelectedDocId(docId || officialDocuments[0]?.id);
    setViewerVisible(true);
  };

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

  const epbgDisplay =
    effectiveBid.epbgPercentage !== undefined
      ? effectiveBid.epbgPercentage === 0
        ? '0% (Free)'
        : effectiveBid.epbgDurationMonths
          ? `${effectiveBid.epbgPercentage}% (${effectiveBid.epbgDurationMonths} mo)`
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

  return (
    <View style={[styles.screenRoot, { backgroundColor: colors.background }]}>
      {/* Fixed Sub-header (never clips under top bar during scroll) */}
      <View style={[styles.fixedHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn} accessibilityLabel="Back to auctions">
            <Text style={[styles.backArrow, { color: colors.primary }]}>←</Text>
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.navTitle, { color: colors.textPrimary, fontSize: 15 * fontMultiplier }]} numberOfLines={1}>
            {auction.contractNumber}
          </Text>
          <Text style={[styles.navSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            Live Public Reverse Auction
          </Text>
        </View>
        <StatusBadge label="LIVE RA" tone="success" dot />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.summaryTopRow}>
            <StatusBadge label="REVERSE AUCTION" tone="warning" />
            {baseBid.parentBidNumber ? (
              <Text style={[styles.parentPill, { color: colors.textSecondary, backgroundColor: colors.surfaceSubtle }]}>
                Parent: {baseBid.parentBidNumber}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.auctionTitle, { color: colors.textPrimary, fontSize: 16 * fontMultiplier }]}>
            {auction.title}
          </Text>
          <Text style={[styles.deptText, { color: colors.textSecondary }]}>
            {[auction.department, auction.buyerOrganization !== auction.department ? auction.buyerOrganization : '']
              .filter(Boolean)
              .join(' • ') || 'Department unstated'}
          </Text>

          <View style={[styles.scheduleRow, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.scheduleLabel, { color: colors.textMuted }]}>CLOSING TIME</Text>
              <Text style={[styles.scheduleVal, { color: colors.textPrimary }]}>
                {formatClosingTime(auction.closingTimeUtc)}
              </Text>
            </View>
            <View style={styles.scheduleDivider} />
            <View style={{ minWidth: 72, alignItems: 'flex-end' }}>
              <Text style={[styles.scheduleLabel, { color: colors.textMuted }]}>QUANTITY</Text>
              <Text style={[styles.scheduleVal, { color: colors.primary }]}>
                {auction.publishedQuantity && auction.totalQuantity !== undefined
                  ? auction.totalQuantity.toLocaleString('en-IN')
                  : ext?.totalQuantity !== undefined
                    ? ext.totalQuantity.toLocaleString('en-IN')
                    : 'In PDF'}
              </Text>
            </View>
          </View>
        </View>

        {/* Inline PDF Documents Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Official Tender PDFs</Text>
            <View style={styles.inlineTag}>
              <Text style={styles.inlineTagText}>INLINE VIEWER</Text>
            </View>
          </View>
          {officialDocuments.map((doc, idx) => {
            const isParent = doc.id === 'parent-bid-document';
            return (
              <Pressable
                key={doc.id}
                style={({ pressed }) => [
                  styles.docRow,
                  idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                  pressed && { opacity: 0.75 },
                ]}
                onPress={() => openInlineDoc(doc.id)}
              >
                <View style={[styles.docBadge, isParent && { backgroundColor: '#E0F2FE' }]}>
                  <Text style={[styles.docBadgeText, isParent && { color: '#0369A1' }]}>
                    {isParent ? 'BID' : 'RA'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.docTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {doc.label}
                  </Text>
                  <Text style={[styles.docSub, { color: colors.textSecondary }]} numberOfLines={1}>
                    {isParent
                      ? 'Original specifications, EMD, ePBG, consignees & ATC'
                      : 'RA schedule, auto-extension & exemption terms'}
                  </Text>
                </View>
                <View style={styles.docReadPill}>
                  <Text style={styles.docReadPillText}>Read ›</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Key Procurement Fundamentals extracted locally from RA + Parent Bid PDF */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Key Procurement Fundamentals</Text>
            {isScanningPdf ? (
              <View style={styles.busyPill}>
                <ActivityIndicator size="small" color="#0B3B60" />
                <Text style={styles.busyPillText}>Scanning…</Text>
              </View>
            ) : scannedOk ? (
              <View style={styles.okPill}>
                <Text style={styles.okPillText}>✓ From PDF</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.fundamentalsGrid}>
            <FundCell label="ESTIMATED VALUE" value={estDisplay} colors={colors} />
            <FundCell
              label="EMD GUARANTEE"
              value={emdDisplay}
              accent={effectiveBid.emdAmountInr === 0 || effectiveBid.isEmdExemptForMse ? '#15803D' : undefined}
              colors={colors}
            />
            <FundCell
              label="e-PBG SECURITY"
              value={epbgDisplay}
              accent={effectiveBid.epbgPercentage === 0 ? '#15803D' : effectiveBid.epbgPercentage ? '#B45309' : undefined}
              colors={colors}
            />
            <FundCell
              label="DELIVERY TIMELINE"
              value={deliveryDisplay}
              accent={effectiveBid.deliveryPeriodDays ? '#1D4ED8' : undefined}
              colors={colors}
            />
            <FundCell label="MIN TURNOVER" value={turnoverDisplay} colors={colors} />
            <FundCell label="PAST EXPERIENCE" value={experienceDisplay} colors={colors} />
          </View>

          {pdfScan?.note ? (
            <Text style={[styles.scanNote, { color: colors.textMuted }]}>{pdfScan.note}</Text>
          ) : null}
        </View>

        {/* Primary Actions */}
        <PrimaryButton
          label="Read RA & Bid PDF Inline"
          onPress={() => openInlineDoc()}
          style={{ marginBottom: 10 }}
        />
        <SecondaryButton
          label="Full Bid Inspector & Checklist"
          onPress={() => setInspectorVisible(true)}
          style={{ marginBottom: 10 }}
        />
        <SecondaryButton
          label="Open GeM Portal Login ↗"
          onPress={() => Linking.openURL('https://ui.gem.gov.in/login')}
          style={{ marginBottom: 14 }}
        />

        {/* Compact honest footer note */}
        <Text style={[styles.footerNote, { color: colors.textMuted }]}>
          Public GeM feed + local PDF scan. Live L1 price, seller rank, and bid placement stay inside the official GeM portal after login.
        </Text>
      </ScrollView>

      <BidDocumentViewer
        bid={baseBid}
        visible={viewerVisible}
        initialDocumentId={selectedDocId}
        onClose={() => setViewerVisible(false)}
      />

      <BidInspectorScreen
        bid={baseBid}
        visible={inspectorVisible}
        onClose={() => setInspectorVisible(false)}
        onPrepareDocuments={onPrepareDocuments}
      />
    </View>
  );
};

const FundCell: React.FC<{
  label: string;
  value: string;
  accent?: string;
  colors: ReturnType<typeof useTheme>['colors'];
}> = ({ label, value, accent, colors }) => (
  <View style={[styles.fundCell, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
    <Text style={[styles.fundLabel, { color: colors.textMuted }]}>{label}</Text>
    <Text style={[styles.fundValue, { color: accent || colors.textPrimary }]} numberOfLines={2}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  fixedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 22, fontWeight: '700' },
  navTitle: { fontWeight: '800' },
  navSubtitle: { fontSize: 11, marginTop: 1 },
  container: { flex: 1 },
  contentContainer: { padding: DESIGN_TOKENS.pagePaddingMobile, paddingBottom: 36 },
  card: {
    borderRadius: 14,
    borderWidth: DESIGN_TOKENS.borderWidth,
    padding: 14,
    marginBottom: 12,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  parentPill: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  auctionTitle: { fontWeight: '800', marginBottom: 4, lineHeight: 22 },
  deptText: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  scheduleLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4, marginBottom: 2 },
  scheduleVal: { fontSize: 12, fontWeight: '800' },
  scheduleDivider: { width: 1, height: 28, backgroundColor: '#CBD5E1' },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', flex: 1 },
  inlineTag: {
    backgroundColor: '#EAF4F8',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  inlineTagText: { color: '#0B5577', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  docBadge: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docBadgeText: { color: '#DC2626', fontSize: 11, fontWeight: '900' },
  docTitle: { fontSize: 13, fontWeight: '700' },
  docSub: { fontSize: 11, marginTop: 2 },
  docReadPill: {
    backgroundColor: '#0B3B60',
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  docReadPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  busyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  busyPillText: { color: '#0B3B60', fontSize: 10, fontWeight: '800' },
  okPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  okPillText: { color: '#15803D', fontSize: 10, fontWeight: '800' },
  fundamentalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  fundCell: {
    width: '48.5%',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    minHeight: 60,
    justifyContent: 'center',
  },
  fundLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4, marginBottom: 3 },
  fundValue: { fontSize: 12.5, fontWeight: '800', lineHeight: 17 },
  scanNote: { fontSize: 10, lineHeight: 14, marginTop: 10 },
  footerNote: { fontSize: 10.5, lineHeight: 15, textAlign: 'center', paddingHorizontal: 8 },
});
