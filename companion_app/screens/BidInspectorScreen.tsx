import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import type { DeconstructedBidDoc } from '../types/index';
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
import { BidDocumentViewer } from './BidDocumentViewer';
import { PreBidDisqualificationShield } from '../components/PreBidDisqualificationShield';
import { TenderDealSheetCard } from '../components/TenderDealSheetCard';

interface BidInspectorScreenProps {
  bid: DeconstructedBidDoc | null;
  visible: boolean;
  onClose: () => void;
  onPrepareDocuments?: (bid: DeconstructedBidDoc) => void;
}

export const BidInspectorScreen: React.FC<BidInspectorScreenProps> = ({
  bid,
  visible,
  onClose,
  onPrepareDocuments,
}) => {
  const { colors } = useTheme();
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

  const officialDocuments = useMemo(
    () => (bid ? PortalDocService.getOfficialDocuments(bid) : []),
    [bid]
  );

  if (!bid) return null;

  const effectiveBid = enrichBidWithPdfScan(bid, pdfScan);
  const fundamentals = BidDocService.getFundamentalsSummary(effectiveBid);
  const risks = BidDocService.assessTenderRisks(effectiveBid);
  const ext = pdfScan?.details?.extendedDetails;
  const scannedOk = pdfScan?.status === 'EXTRACTED';

  const requiredDocuments = Array.isArray(effectiveBid.requiredDocuments) ? effectiveBid.requiredDocuments : [];
  const boqItems = Array.isArray(effectiveBid.boqItems) ? effectiveBid.boqItems : [];
  const consignees = Array.isArray(effectiveBid.consignees) ? effectiveBid.consignees : [];

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

  const renderTypeBadge = () => {
    if (bid.isRa || bid.type === 'RA') {
      return (
        <View style={[styles.typeBadge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <Text style={[styles.typeBadgeText, { color: '#DC2626' }]}>REVERSE AUCTION</Text>
        </View>
      );
    }
    if (bid.type === 'SERVICE') {
      return (
        <View style={[styles.typeBadge, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
          <Text style={[styles.typeBadgeText, { color: '#059669' }]}>SERVICE BID</Text>
        </View>
      );
    }
    if (bid.type === 'CUSTOM') {
      return (
        <View style={[styles.typeBadge, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
          <Text style={[styles.typeBadgeText, { color: '#D97706' }]}>CUSTOM TENDER</Text>
        </View>
      );
    }
    if (bid.type === 'BOQ') {
      return (
        <View style={[styles.typeBadge, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
          <Text style={[styles.typeBadgeText, { color: '#7C3AED' }]}>BOQ TENDER</Text>
        </View>
      );
    }
    return (
      <View style={[styles.typeBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
        <Text style={[styles.typeBadgeText, { color: '#2563EB' }]}>PRODUCT BID</Text>
      </View>
    );
  };

  const checkedCount = requiredDocuments.filter((d) => checkedDocs[d]).length;

  // Dynamic closing remaining calculation
  const closingDate = bid.closingTimeUtc ? new Date(bid.closingTimeUtc) : new Date(Date.now() + 86400000 * 3);
  const isValidDate = !isNaN(closingDate.getTime());
  const diffMs = isValidDate ? Math.max(0, closingDate.getTime() - Date.now()) : 0;
  const diffHours = Math.floor(diffMs / 3600000);
  const diffMins = Math.floor((diffMs % 3600000) / 60000);
  const isClosingSoon = isValidDate && diffMs > 0 && diffHours < 24;
  const remainingLabel = !isValidDate
    ? 'See official PDF'
    : diffMs === 0
      ? 'Closing time elapsed'
      : diffHours > 48
        ? `${Math.floor(diffHours / 24)}d ${diffHours % 24}h left`
        : `${diffHours}h ${diffMins}m left`;

  // Honest, crystal-clear values for all 8 cells of the balanced 2x4 Fundamentals grid
  const fallbackValue = isScanningPdf ? 'Scanning…' : scannedOk ? 'Not specified' : 'In PDF';

  const estValueDisplay =
    effectiveBid.estimatedBidValueInr !== undefined && effectiveBid.estimatedBidValueInr > 0
      ? fundamentals.estimatedValueLabel
      : effectiveBid.isHighValue
        ? '≥ ₹2 Cr (High Value)'
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
  const emdIsPositive =
    effectiveBid.emdAmountInr === 0 || Boolean(effectiveBid.isEmdExemptForMse);

  const epbgDisplay =
    effectiveBid.epbgPercentage !== undefined
      ? effectiveBid.epbgPercentage === 0
        ? '0% (Not Required)'
        : effectiveBid.epbgDurationMonths
          ? `${effectiveBid.epbgPercentage}% (${effectiveBid.epbgDurationMonths} mo)`
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

  // Compact policy tags extracted from official PDF(s)
  const policyTags: Array<{ label: string; bg: string; color: string }> = [];
  if (effectiveBid.isEmdExemptForMse || ext?.mseExemptionForExpAndTurnover) {
    policyTags.push({ label: 'MSE Exemption', bg: '#DCFCE7', color: '#166534' });
  }
  if (effectiveBid.isEmdExemptForStartup || ext?.startupExemptionForExpAndTurnover) {
    policyTags.push({ label: 'Startup Exemption', bg: '#DCFCE7', color: '#166534' });
  }
  if (effectiveBid.msePurchasePreference) {
    policyTags.push({ label: 'MSE Purchase Pref', bg: '#E0F2FE', color: '#0369A1' });
  }
  if (effectiveBid.miiPurchasePreference) {
    const miiLabel =
      effectiveBid.makeInIndiaClass === 'CLASS_1'
        ? 'MII Class-1 (≥50%)'
        : effectiveBid.makeInIndiaClass === 'CLASS_2'
          ? 'MII Class-2 (≥20%)'
          : 'MII Preference';
    policyTags.push({ label: miiLabel, bg: '#FEF3C7', color: '#92400E' });
  }
  if (effectiveBid.pastPerformancePercentage !== undefined) {
    policyTags.push({
      label: `Past Perf ${effectiveBid.pastPerformancePercentage}%`,
      bg: '#F3E8FF',
      color: '#6B21A8',
    });
  }
  if (ext?.isRaEnabled || bid.isRa) {
    policyTags.push({ label: 'Reverse Auction', bg: '#FEE2E2', color: '#B91C1C' });
  }

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0B3B60' }}>
          <StatusBar barStyle="light-content" backgroundColor="#0B3B60" />
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Top Header Bar (GeM Ashoka Navy) */}
            <View style={styles.headerBar}>
              <Pressable
                style={({ pressed }) => [styles.headerBackBtn, pressed && { opacity: 0.75 }]}
                onPress={onClose}
                hitSlop={8}
                accessibilityLabel="Close bid details"
              >
                <Text style={styles.headerBackIcon}>←</Text>
              </Pressable>
              <View style={styles.headerCenter}>
                <Text style={styles.headerBidNum} numberOfLines={1}>{bid.bidNumber}</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {BidDocService.getProcurementTypeLabel(bid).label} · Direct GeM Feed
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.sharePillBtn, pressed && { opacity: 0.8 }]}
                onPress={() => setShowDealSheet(true)}
                hitSlop={6}
                accessibilityLabel="Share WhatsApp Deal Sheet"
              >
                <Text style={styles.sharePillText}>Share ↗</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
              {/* Live GeM Corrigendum / Representation Probe Alert */}
              {(otherDetails?.hasCorrigendum || otherDetails?.hasRepresentation) && (
                <View style={styles.corrigendumBanner}>
                  <View style={styles.corrigendumIconWrap}>
                    <Text style={styles.corrigendumIconText}>!</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.corrigendumTitle}>
                      {otherDetails.hasCorrigendum
                        ? 'Live Corrigendum Published on GeM'
                        : 'Live Representation Recorded on GeM'}
                    </Text>
                    <Text style={styles.corrigendumSubtitle}>
                      Verified directly from bidplus.gem.gov.in. Review official PDF updates before quoting.
                    </Text>
                  </View>
                </View>
              )}

              {/* 1. Hero Tender Summary Card */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardHeaderBadges}>
                  {renderTypeBadge()}
                  {bid.isHighValue ? (
                    <View style={[styles.typeBadge, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
                      <Text style={[styles.typeBadgeText, { color: '#15803D' }]}>≥ ₹2 Cr</Text>
                    </View>
                  ) : null}
                  {bid.parentBidNumber ? (
                    <View style={[styles.domainBadge, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                      <Text style={[styles.domainBadgeText, { color: colors.textSecondary }]}>
                        Parent: {bid.parentBidNumber}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text style={[styles.bidTitle, { color: colors.textPrimary }]}>
                  {effectiveBid.title || 'Untitled Bid'}
                </Text>
                <Text style={[styles.deptText, { color: colors.textSecondary }]}>
                  {[effectiveBid.department, effectiveBid.ministry !== effectiveBid.department ? effectiveBid.ministry : '']
                    .filter(Boolean)
                    .join(' • ')}
                </Text>

                {/* Closing Strip */}
                <View
                  style={[
                    styles.closingStrip,
                    {
                      backgroundColor: isClosingSoon ? '#FEF2F2' : colors.surfaceSubtle,
                      borderColor: isClosingSoon ? '#FECACA' : colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.closingLabel, { color: isClosingSoon ? '#991B1B' : colors.textMuted }]}>
                      CLOSING TIME (IST)
                    </Text>
                    <Text style={[styles.closingDateText, { color: isClosingSoon ? '#B91C1C' : colors.textPrimary }]}>
                      {formatDateSafe(bid.closingTimeUtc)}
                    </Text>
                  </View>
                  <View style={[styles.remainingPill, { backgroundColor: isClosingSoon ? '#DC2626' : '#0B3B60' }]}>
                    <Text style={styles.remainingPillText}>{remainingLabel}</Text>
                  </View>
                </View>
              </View>

              {/* 2. Official Documents — Inline PDF Viewer Quick Access */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                    Official Tender PDFs
                  </Text>
                  <View style={styles.inlineTag}>
                    <Text style={styles.inlineTagText}>INLINE VIEWER</Text>
                  </View>
                </View>
                {officialDocuments.map((document, idx) => {
                  const isParent = document.id === 'parent-bid-document';
                  const isRa = /show(?:direct)?radocumentPdf/i.test(document.url);
                  return (
                    <Pressable
                      key={document.id}
                      style={({ pressed }) => [
                        styles.docRow,
                        idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                        pressed && { opacity: 0.75 },
                      ]}
                      onPress={() => handleOpenDoc(document.id)}
                    >
                      <View style={[styles.docPdfBadge, isParent && { backgroundColor: '#E0F2FE' }]}>
                        <Text style={[styles.docPdfBadgeText, isParent && { color: '#0369A1' }]}>
                          {isRa ? 'RA' : 'PDF'}
                        </Text>
                      </View>
                      <View style={styles.docCopy}>
                        <Text style={[styles.docTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                          {document.label}
                        </Text>
                        <Text style={[styles.docSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                          {isRa
                            ? 'RA schedule, auto-extension & exemptions'
                            : isParent
                              ? 'Full technical specs, EMD, ePBG, consignees & ATC'
                              : 'Official bid specifications, terms & ATC clauses'}
                        </Text>
                      </View>
                      <View style={styles.docReadPill}>
                        <Text style={styles.docReadPillText}>Read ›</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* 3. Key Procurement Fundamentals (Balanced 2x4 Grid powered by On-Device PDF Scan) */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                    Key Procurement Fundamentals
                  </Text>
                  {isScanningPdf ? (
                    <View style={[styles.scanStatusBusy, { backgroundColor: colors.primaryTint }]}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={[styles.scanStatusBusyText, { color: colors.primary }]}>Scanning…</Text>
                    </View>
                  ) : scannedOk ? (
                    <Pressable onPress={handleScanPdfOnDevice} hitSlop={8} style={[styles.scanStatusOk, { backgroundColor: colors.successTint }]}>
                      <Text style={[styles.scanStatusOkText, { color: colors.success }]}>
                        ✓ {officialDocuments.length > 1 ? 'RA + Bid PDF' : 'From PDF'}
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable onPress={handleScanPdfOnDevice} hitSlop={8} style={[styles.scanRetryPill, { backgroundColor: colors.warningTint }]}>
                      <Text style={[styles.scanRetryText, { color: colors.warning }]}>Scan PDF ↻</Text>
                    </Pressable>
                  )}
                </View>

                {isScanningPdf ? (
                  <View style={[styles.scanningBanner, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.scanningBannerText, { color: colors.textSecondary }]}>
                      Reading official GeM PDF{officialDocuments.length > 1 ? 's' : ''} locally on your phone to extract EMD, ePBG, turnover &amp; delivery terms…
                    </Text>
                  </View>
                ) : null}

                <View style={styles.grid2x4}>
                  <View style={[styles.gridCell, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <Text style={[styles.cellLabel, { color: colors.textMuted }]}>ESTIMATED VALUE</Text>
                    <Text style={[styles.cellValue, { color: effectiveBid.estimatedBidValueInr ? colors.primary : colors.textPrimary }]} numberOfLines={2}>
                      {estValueDisplay}
                    </Text>
                  </View>

                  <View style={[styles.gridCell, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <Text style={[styles.cellLabel, { color: colors.textMuted }]}>EMD GUARANTEE</Text>
                    <Text style={[styles.cellValue, { color: emdIsPositive ? '#15803D' : colors.textPrimary }]} numberOfLines={2}>
                      {emdDisplay}
                    </Text>
                  </View>

                  <View style={[styles.gridCell, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <Text style={[styles.cellLabel, { color: colors.textMuted }]}>e-PBG SECURITY</Text>
                    <Text
                      style={[
                        styles.cellValue,
                        {
                          color:
                            effectiveBid.epbgPercentage === 0
                              ? '#15803D'
                              : effectiveBid.epbgPercentage !== undefined
                                ? '#B45309'
                                : colors.textPrimary,
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {epbgDisplay}
                    </Text>
                  </View>

                  <View style={[styles.gridCell, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <Text style={[styles.cellLabel, { color: colors.textMuted }]}>DELIVERY TIMELINE</Text>
                    <Text style={[styles.cellValue, { color: effectiveBid.deliveryPeriodDays ? '#1D4ED8' : colors.textPrimary }]} numberOfLines={2}>
                      {deliveryDisplay}
                    </Text>
                  </View>

                  <View style={[styles.gridCell, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <Text style={[styles.cellLabel, { color: colors.textMuted }]}>MIN ANNUAL TURNOVER</Text>
                    <Text style={[styles.cellValue, { color: colors.textPrimary }]} numberOfLines={2}>
                      {turnoverDisplay}
                    </Text>
                  </View>

                  <View style={[styles.gridCell, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <Text style={[styles.cellLabel, { color: colors.textMuted }]}>PAST EXPERIENCE</Text>
                    <Text style={[styles.cellValue, { color: colors.textPrimary }]} numberOfLines={2}>
                      {experienceDisplay}
                    </Text>
                  </View>

                  <View style={[styles.gridCell, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <Text style={[styles.cellLabel, { color: colors.textMuted }]}>SPLITTING RULE</Text>
                    <Text style={[styles.cellValue, { color: colors.textPrimary }]} numberOfLines={2}>
                      {splittingDisplay}
                    </Text>
                  </View>

                  <View style={[styles.gridCell, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <Text style={[styles.cellLabel, { color: colors.textMuted }]}>BID FORMAT / VALIDITY</Text>
                    <Text style={[styles.cellValue, { color: colors.textPrimary }]} numberOfLines={2}>
                      {bidFormatDisplay}
                    </Text>
                  </View>
                </View>

                {policyTags.length > 0 ? (
                  <View style={styles.policyTagsRow}>
                    {policyTags.map((tag) => (
                      <View key={tag.label} style={[styles.policyTag, { backgroundColor: tag.bg }]}>
                        <Text style={[styles.policyTagText, { color: tag.color }]}>{tag.label}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {pdfScan && !isScanningPdf ? (
                  <Text style={[styles.scanFootnote, { color: colors.textMuted }]}>
                    {pdfScan.status === 'EXTRACTED'
                      ? `${pdfScan.textLength.toLocaleString('en-IN')} chars parsed locally on device · ${pdfScan.note}`
                      : pdfScan.note}
                  </Text>
                ) : null}
              </View>

              {/* Service Contract Terms (only for service bids) */}
              {(bid.serviceDetails || bid.type === 'SERVICE') && (
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.serviceHeader}>
                    <Text style={[styles.serviceHeaderTitle, { color: colors.primary }]}>Service contract terms &amp; SLAs</Text>
                    <Text style={[styles.serviceSlaBadge, { color: colors.primary, backgroundColor: colors.primaryTint }]}>GeM SLA Governed</Text>
                  </View>
                  <View style={styles.grid2x4}>
                    <View style={[styles.serviceCell, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                      <Text style={[styles.serviceCellLabel, { color: colors.textMuted }]}>Contract Duration</Text>
                      <Text style={[styles.serviceCellValue, { color: colors.textPrimary }]}>
                        {bid.serviceDetails?.durationMonths ? `${bid.serviceDetails.durationMonths} Months` : 'See PDF'}
                      </Text>
                    </View>
                    <View style={[styles.serviceCell, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                      <Text style={[styles.serviceCellLabel, { color: colors.textMuted }]}>Manpower / Staffing</Text>
                      <Text style={[styles.serviceCellValue, { color: colors.textPrimary }]}>
                        {bid.serviceDetails?.manpowerCount ? `${bid.serviceDetails.manpowerCount} Personnel` : 'See PDF'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* 4. On-Device Pre-Bid Disqualification Shield */}
              {ext ? (
                <PreBidDisqualificationShield
                  tenderDetails={ext}
                  onPrepareDocuments={handlePrepareDocuments}
                />
              ) : null}

              {/* 5. Risk Factors Assessment */}
              {risks.flags.length > 0 && (
                <View style={[styles.card, styles.riskCard]}>
                  <Text style={styles.riskTitle}>OPERATIONAL RISK ASSESSMENT · {risks.riskLevel}</Text>
                  {risks.flags.map((flag, idx) => (
                    <Text key={idx} style={styles.riskFlagText}>• {flag}</Text>
                  ))}
                </View>
              )}

              {/* 6. Published Scope / Quantity */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionHeading, { color: colors.textPrimary, marginBottom: 10 }]}>
                  Published Scope
                </Text>
                {boqItems.length > 0 ? (
                  boqItems.map((item, idx) => (
                    <View
                      key={idx}
                      style={[styles.boqItemRow, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                    >
                      <View style={styles.boqTopRow}>
                        <Text style={[styles.boqItemTitle, { color: colors.textPrimary }]}>{item.itemTitle}</Text>
                        <Text style={styles.boqQtyBadge}>
                          {item.quantity !== undefined
                            ? `${item.quantity.toLocaleString('en-IN')} ${item.unit || 'Units'}`
                            : 'See PDF'}
                        </Text>
                      </View>
                      {item.specsSummary ? (
                        <Text style={[styles.boqSpecsText, { color: colors.textSecondary }]}>
                          {item.specsSummary}
                        </Text>
                      ) : null}
                    </View>
                  ))
                ) : (
                  <Text style={[styles.notPublishedText, { color: colors.textSecondary }]}>
                    Tap Read PDF Inline above to view the complete technical specifications and BOQ schedule.
                  </Text>
                )}
              </View>

              {/* 7. Consignee Destinations */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                    Delivery Locations
                  </Text>
                  {consignees.length > 0 ? (
                    <Text style={[styles.countPillText, { color: colors.primary }]}>
                      {consignees.length} Consignee{consignees.length === 1 ? '' : 's'}
                    </Text>
                  ) : null}
                </View>
                {consignees.length > 0 ? (
                  consignees.map((c, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.consigneeRow,
                        idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                      ]}
                    >
                      <View style={styles.consigneeLeft}>
                        <Text style={[styles.consigneeLocation, { color: colors.textPrimary }]}>{c.location}</Text>
                        <Text style={[styles.consigneeOfficer, { color: colors.textSecondary }]}>
                          {c.reportingOfficer || 'Consignee Reporting Officer'}
                        </Text>
                      </View>
                      <View style={styles.consigneeRight}>
                        <Text style={styles.stateBadge}>
                          {c.state || 'India'}{c.pincode ? ` · ${c.pincode}` : ''}
                        </Text>
                        <Text style={[styles.consigneeQty, { color: colors.textPrimary }]}>
                          {c.quantity !== undefined ? `${c.quantity.toLocaleString('en-IN')} Units` : 'See PDF'}
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.notPublishedText, { color: colors.textSecondary }]}>
                    {isScanningPdf
                      ? 'Extracting consignee table from official GeM PDF…'
                      : 'Consignee locations were not detected in text. Check the official PDF inline.'}
                  </Text>
                )}
              </View>

              {/* 8. Interactive Document Readiness Checklist */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                    Required Document Checklist
                  </Text>
                  <Text style={[styles.countPillText, { color: colors.primary }]}>
                    {requiredDocuments.length > 0 ? `${checkedCount}/${requiredDocuments.length}` : 'See PDF'}
                  </Text>
                </View>
                {requiredDocuments.length > 0 ? (
                  requiredDocuments.map((doc, idx) => {
                    const isChecked = !!checkedDocs[doc];
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.checkRow,
                          idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                        ]}
                        onPress={() => toggleDoc(doc)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                          <Text style={styles.checkMark}>{isChecked ? '✓' : ''}</Text>
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
                  })
                ) : (
                  <Text style={[styles.notPublishedText, { color: colors.textSecondary }]}>
                    {isScanningPdf
                      ? 'Extracting required seller documents from official PDF…'
                      : 'Confirm document checklist inside the official PDF viewer.'}
                  </Text>
                )}
              </View>

              {/* 9. Compact Share Deal Sheet CTA */}
              <Pressable
                style={({ pressed }) => [styles.whatsAppCardBtn, pressed && { opacity: 0.85 }]}
                onPress={() => setShowDealSheet(true)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.whatsAppCardTitle}>Forward Tender Deal Sheet</Text>
                  <Text style={styles.whatsAppCardSub}>
                    Share formatted summary with EMD, ePBG &amp; deadline on WhatsApp
                  </Text>
                </View>
                <View style={styles.whatsAppBadge}>
                  <Text style={styles.whatsAppBadgeText}>SHARE ↗</Text>
                </View>
              </Pressable>

              {/* Compact muted footer note (replaces giant top disclaimer) */}
              <Text style={[styles.footerDisclaimer, { color: colors.textMuted }]}>
                Public GeM feed + local on-device PDF extraction. Account-specific L1 pricing, rank, and bid submission stay on the official GeM portal.
              </Text>
            </ScrollView>

            {/* Sticky Bottom Actions Bar */}
            <View style={[styles.stickyFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.secondaryFooterBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                onPress={handlePrepareDocuments}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondaryFooterText, { color: colors.textPrimary }]}>Prepare Docs</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryFooterBtn}
                onPress={() => handleOpenDoc()}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryFooterText}>Read PDF Inline</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {showDealSheet && bid && (
        <TenderDealSheetCard
          bid={effectiveBid}
          visible={showDealSheet}
          onClose={() => setShowDealSheet(false)}
        />
      )}

      <BidDocumentViewer
        bid={bid}
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
    paddingVertical: 12,
    backgroundColor: '#0B3B60',
    gap: 10,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBackIcon: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  headerCenter: { flex: 1 },
  headerBidNum: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  headerSubtitle: { color: '#BFDBFE', fontSize: 11, fontWeight: '500', marginTop: 1 },
  sharePillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  sharePillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 28 },
  corrigendumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  corrigendumIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corrigendumIconText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  corrigendumTitle: { color: '#92400E', fontSize: 13, fontWeight: '800' },
  corrigendumSubtitle: { color: '#78350F', fontSize: 11, lineHeight: 15, marginTop: 2 },
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
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
    letterSpacing: 0.4,
  },
  domainBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  domainBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bidTitle: { fontSize: 16, fontWeight: '800', lineHeight: 22, marginBottom: 4 },
  deptText: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  closingStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  closingLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  closingDateText: { fontSize: 13, fontWeight: '800', marginTop: 1 },
  remainingPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  remainingPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  sectionHeading: { fontSize: 14, fontWeight: '800', flex: 1 },
  inlineTag: {
    backgroundColor: '#EAF4F8',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  inlineTagText: { color: '#0B5577', fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  docPdfBadge: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docPdfBadgeText: { color: '#DC2626', fontSize: 11, fontWeight: '900' },
  docCopy: { flex: 1 },
  docTitle: { fontSize: 13, fontWeight: '700' },
  docSubtitle: { fontSize: 11, marginTop: 2 },
  docReadPill: {
    backgroundColor: '#0B3B60',
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  docReadPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  scanStatusBusy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scanStatusBusyText: { color: '#0B3B60', fontSize: 10, fontWeight: '800' },
  scanStatusOk: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scanStatusOkText: { color: '#15803D', fontSize: 10, fontWeight: '800' },
  scanRetryPill: {
    backgroundColor: '#EAF4F8',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scanRetryText: { color: '#0B5577', fontSize: 10, fontWeight: '800' },
  scanningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  scanningBannerText: { flex: 1, fontSize: 11, lineHeight: 16 },
  grid2x4: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  gridCell: {
    width: '48.5%',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    minHeight: 62,
    justifyContent: 'center',
  },
  cellLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4, marginBottom: 4 },
  cellValue: { fontSize: 13, fontWeight: '800', lineHeight: 17 },
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
  policyTagText: { fontSize: 10, fontWeight: '800' },
  scanFootnote: { fontSize: 10, lineHeight: 14, marginTop: 10 },
  serviceCard: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  serviceHeaderTitle: { color: '#166534', fontSize: 13, fontWeight: '800' },
  serviceSlaBadge: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  serviceCell: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 9,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  serviceCellLabel: { color: '#64748B', fontSize: 10, fontWeight: '600', marginBottom: 2 },
  serviceCellValue: { color: '#0F172A', fontSize: 12, fontWeight: '800' },
  riskCard: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  riskTitle: { color: '#B45309', fontSize: 11, fontWeight: '800', marginBottom: 4 },
  riskFlagText: { color: '#78350F', fontSize: 12, lineHeight: 17, marginTop: 2 },
  notPublishedText: { fontSize: 12, lineHeight: 17 },
  boqItemRow: {
    borderRadius: 10,
    padding: 11,
    marginBottom: 6,
    borderWidth: 1,
  },
  boqTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  boqItemTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  boqQtyBadge: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  boqSpecsText: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  countPillText: { fontSize: 11, fontWeight: '800' },
  consigneeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    gap: 8,
  },
  consigneeLeft: { flex: 1 },
  consigneeLocation: { fontSize: 13, fontWeight: '700' },
  consigneeOfficer: { fontSize: 11, marginTop: 2 },
  consigneeRight: { alignItems: 'flex-end' },
  stateBadge: { color: '#2563EB', fontSize: 11, fontWeight: '700' },
  consigneeQty: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 42,
    paddingVertical: 7,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxActive: { backgroundColor: '#0B3B60', borderColor: '#0B3B60' },
  checkMark: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  checkLabel: { fontSize: 12, flex: 1, lineHeight: 17 },
  whatsAppCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B3B60',
    borderRadius: 12,
    padding: 13,
    marginBottom: 12,
    gap: 10,
  },
  whatsAppCardTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  whatsAppCardSub: { color: '#BFDBFE', fontSize: 11, marginTop: 2 },
  whatsAppBadge: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  whatsAppBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
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
    paddingVertical: 12,
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
    backgroundColor: '#0B3B60',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryFooterText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
