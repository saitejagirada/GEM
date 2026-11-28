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
  type NativeScrollEvent,
  type NativeSyntheticEvent,
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
import { GeMLiveSyncService, type GeMBidOtherDetails } from '../services/GeMLiveSyncService';
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
import { BidDocumentViewer } from './BidDocumentViewer';
import { PreBidDisqualificationShield } from '../components/PreBidDisqualificationShield';
import { TenderDealSheetCard } from '../components/TenderDealSheetCard';
import { BidMarginModal } from '../components/BidMarginModal';
import { AtcTrapAndSearchCard } from '../components/AtcTrapAndSearchCard';
import { SimilarConcludedBidsCard } from '../components/SimilarConcludedBidsCard';
import { GemGlossaryModal } from '../components/GemGlossaryModal';
import {
  CorrigendumAndQaModal,
  type CorrigendumModalTab,
} from '../components/CorrigendumAndQaModal';
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

type RaSectionKey = 'overview' | 'docs' | 'terms' | 'eligibility' | 'atc' | 'similar' | 'portal';

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
  const jumpScrollRef = useRef<ScrollView>(null);
  const jumpTabXRef = useRef<Partial<Record<RaSectionKey, number>>>({});
  const jumpLockUntilRef = useRef<number>(0);
  const sectionYRef = useRef<Partial<Record<RaSectionKey, number>>>({});
  const sectionsOffsetYRef = useRef<number>(0);

  const [pdfScan, setPdfScan] = useState<LocalPdfScanResult | null>(null);
  const [isScanningPdf, setIsScanningPdf] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | undefined>();
  const [showDealSheet, setShowDealSheet] = useState(false);
  const [showMarginCalc, setShowMarginCalc] = useState(false);
  const [glossaryTerm, setGlossaryTerm] = useState<string | null>(null);
  const [otherDetails, setOtherDetails] = useState<GeMBidOtherDetails | null>(null);
  const [corrigendumBidId, setCorrigendumBidId] = useState<string | undefined>();
  const [representationBidId, setRepresentationBidId] = useState<string | undefined>();
  const [showCorrModal, setShowCorrModal] = useState(false);
  const [corrModalTab, setCorrModalTab] = useState<CorrigendumModalTab>('CORRIGENDA');
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
    setOtherDetails(null);
    setCorrigendumBidId(undefined);
    setRepresentationBidId(undefined);
    setShowCorrModal(false);
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

    const probeIds = [
      baseBid.b_id,
      baseBid.parentBidId && baseBid.parentBidId !== baseBid.b_id ? baseBid.parentBidId : undefined,
    ].filter((id): id is string => Boolean(id));
    if (probeIds.length > 0) {
      Promise.all(
        probeIds.map((id) =>
          GeMLiveSyncService.fetchBidOtherDetails(id)
            .then((details) => ({ id, details }))
            .catch(() => ({ id, details: null }))
        )
      )
        .then((results) => {
          if (cancelled) return;
          const corrHit = results.find((r) => r.details?.hasCorrigendum);
          const repHit = results.find((r) => r.details?.hasRepresentation);
          if (corrHit || repHit) {
            setCorrigendumBidId(corrHit?.id);
            setRepresentationBidId(repHit?.id);
            setOtherDetails({
              hasCorrigendum: Boolean(corrHit),
              hasRepresentation: Boolean(repHit),
              checkedAt: (corrHit?.details || repHit?.details)!.checkedAt,
            });
          }
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
    };
  }, [baseBid.bidNumber, baseBid.docUrl, baseBid.b_id, baseBid.parentBidId]);

  const handleRetryScan = () => {
    if (isScanningPdf) return;
    setIsScanningPdf(true);
    LocalPdfScanner.scanBidDocuments(baseBid, { forceRefresh: true })
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

  const syncJumpTabIntoView = (key: RaSectionKey) => {
    const tabX = jumpTabXRef.current[key];
    if (typeof tabX === 'number') {
      jumpScrollRef.current?.scrollTo({ x: Math.max(0, tabX - 24), animated: true });
    }
  };

  const scrollToSection = (key: RaSectionKey) => {
    jumpLockUntilRef.current = Date.now() + 450;
    setActiveJump(key);
    syncJumpTabIntoView(key);
    if (key === 'overview') {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    const y = sectionYRef.current[key];
    if (typeof y === 'number') {
      scrollRef.current?.scrollTo({
        y: Math.max(0, sectionsOffsetYRef.current + y - 10),
        animated: true,
      });
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (Date.now() < jumpLockUntilRef.current) return;
    const scrollY = e.nativeEvent.contentOffset.y;
    if (scrollY < 40) {
      if (activeJump !== 'overview') {
        setActiveJump('overview');
        syncJumpTabIntoView('overview');
      }
      return;
    }
    const probeY = scrollY + 96;
    const orderedKeys: RaSectionKey[] = [
      'docs',
      'terms',
      'eligibility',
      'atc',
      'similar',
      'portal',
    ];
    let matched: RaSectionKey = 'overview';
    for (const key of orderedKeys) {
      const sy = sectionYRef.current[key];
      if (typeof sy === 'number' && sectionsOffsetYRef.current + sy <= probeY) {
        matched = key;
      }
    }
    if (matched !== activeJump) {
      setActiveJump(matched);
      syncJumpTabIntoView(matched);
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

  const isHighValueFallback =
    !(effectiveBid.estimatedBidValueInr !== undefined && effectiveBid.estimatedBidValueInr > 0) &&
    Boolean(effectiveBid.isHighValue);

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

  const keyTermRows: Array<{ label: string; value: string; accent?: string; glossaryKey?: string }> = [
    {
      label: 'Estimated Value',
      value: isHighValueFallback
        ? scannedOk
          ? '≥ ₹2 Cr (GeM flag · exact hidden in PDF)'
          : '≥ ₹2 Cr (GeM High Value flag)'
        : estDisplay,
      accent: effectiveBid.estimatedBidValueInr ? colors.primary : undefined,
    },
    {
      label: 'EMD Guarantee',
      value: emdDisplay,
      accent: emdIsPositive ? colors.success : undefined,
      glossaryKey: 'EMD',
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
      glossaryKey: 'EPBG',
    },
    {
      label: 'Delivery Timeline',
      value: deliveryDisplay,
      accent: effectiveBid.deliveryPeriodDays ? colors.primary : undefined,
    },
    { label: 'Min Annual Turnover', value: turnoverDisplay, glossaryKey: 'UDIN' },
    { label: 'Past Experience', value: experienceDisplay, glossaryKey: 'CRAC' },
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
    ...(ext || pdfScan?.searchableText
      ? [{ key: 'atc' as const, label: 'ATC & Search' }]
      : []),
    { key: 'similar', label: 'Similar' },
    { key: 'portal', label: 'GeM Portal' },
  ];

  const renderDocRow = (doc: OfficialBidDocument, isFirstInGroup: boolean) => {
    const badge = getDocBadge(doc, colors);
    const format = doc.fileFormat || PortalDocService.inferFileFormat(doc.url);
    const isPdf = format === 'PDF';

    return (
      <View key={doc.id}>
        {!isFirstInGroup ? (
          <View style={[styles.insetDivider, { backgroundColor: colors.borderSubtle, marginLeft: 68 }]} />
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.docRow, pressed && { opacity: 0.68 }]}
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
          <Text
            style={[
              styles.docActionCue,
              { color: isPdf ? colors.primary : colors.textSecondary },
            ]}
          >
            {isPdf ? 'Read ›' : 'Open ↗'}
          </Text>
        </Pressable>
      </View>
    );
  };

  const closingDayDisplay = isValidDate
    ? formatDateSafe(auction.closingTimeUtc, { day: 'numeric', month: 'short', year: 'numeric' })
    : 'See PDF';
  const closingTimeDisplay = isValidDate
    ? formatDateSafe(auction.closingTimeUtc, { hour: 'numeric', minute: '2-digit', hour12: true })
    : '';

  return (
    <View style={[styles.screenRoot, { backgroundColor: colors.background }]}>
      {/* 1. Refined 52dp Apple-Style Navigation Bar */}
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
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            accessibilityLabel="Back to auctions"
          >
            <Text style={[styles.backArrow, { color: colors.primary }]}>←</Text>
          </Pressable>
        )}
        <Pressable style={styles.headerCenter} onPress={handleCopyId} hitSlop={6}>
          <View style={styles.navTitleRow}>
            <Text
              style={[styles.navTitle, { color: colors.textPrimary, fontSize: 15 * fontMultiplier }]}
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
          <Text
            style={[
              styles.headerSubMeta,
              { color: isClosingSoon ? colors.danger : colors.textMuted },
            ]}
            numberOfLines={1}
          >
            Live Reverse Auction · {remainingLabel}
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.watchChipBtn,
            {
              backgroundColor: isWatched ? colors.warningTint : 'transparent',
              opacity: pressed ? 0.65 : 1,
            },
          ]}
          onPress={() => void TenderRadarService.toggleWatch(effectiveBid)}
          hitSlop={8}
          accessibilityLabel={isWatched ? 'Remove from watched auctions' : 'Watch auction'}
        >
          <AppIcon
            name={isWatched ? 'bookmarkFilled' : 'bookmark'}
            color={isWatched ? colors.warning : colors.textSecondary}
            size={17}
          />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.shareChip,
            { backgroundColor: colors.primaryTint, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={() => setShowDealSheet(true)}
          hitSlop={6}
        >
          <Text style={[styles.shareChipText, { color: colors.primary }]}>Share ↗</Text>
        </Pressable>
      </View>

      {/* 2. Live Scroll-Spy Section Strip */}
      <View
        style={[
          styles.jumpBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle },
        ]}
      >
        <ScrollView
          ref={jumpScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.jumpBarRow}
        >
          {jumpItems.map((item) => {
            const active = activeJump === item.key;
            return (
              <Pressable
                key={item.key}
                onLayout={(e) => {
                  jumpTabXRef.current[item.key] = e.nativeEvent.layout.x;
                }}
                onPress={() => scrollToSection(item.key)}
                style={[
                  styles.jumpTab,
                  active && { borderBottomColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.jumpTabText,
                    {
                      color: active
                        ? colors.primary
                        : item.highlight
                          ? colors.success
                          : colors.textSecondary,
                      fontWeight: active ? '600' : '500',
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
        onScroll={handleScroll}
        scrollEventThrottle={32}
      >
        {/* 1. Executive Editorial Overview Sheet (Apple Stocks / Wallet Hierarchy) */}
        <View
          style={[
            styles.overviewSheet,
            { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle },
          ]}
        >
          {/* Live Corrigendum / Pre-Bid Representation Calm Banner */}
          {(otherDetails?.hasCorrigendum || otherDetails?.hasRepresentation) && (
            <View
              style={[
                styles.corrigendumBanner,
                {
                  backgroundColor: colors.warningTint,
                  borderLeftColor: colors.warning,
                },
              ]}
            >
              <View style={styles.corrigendumBannerTop}>
                <View style={[styles.corrigendumDot, { backgroundColor: colors.warning }]} />
                <Text style={[styles.corrigendumTitle, { color: colors.warning }]} numberOfLines={1}>
                  {otherDetails.hasCorrigendum && otherDetails.hasRepresentation
                    ? 'Corrigendum & Pre-Bid Q&A published'
                    : otherDetails.hasCorrigendum
                      ? 'Corrigendum published on GeM'
                      : 'Pre-Bid Q&A replies published'}
                </Text>
              </View>
              <View style={styles.corrigendumActionRow}>
                {otherDetails.hasCorrigendum ? (
                  <Pressable
                    onPress={() => {
                      setCorrModalTab('CORRIGENDA');
                      setShowCorrModal(true);
                    }}
                    style={({ pressed }) => [
                      styles.corrigendumActionBtn,
                      {
                        backgroundColor: colors.surface,
                        opacity: pressed ? 0.72 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.corrigendumActionText, { color: colors.warning }]}>
                      View Corrigenda ›
                    </Text>
                  </Pressable>
                ) : null}
                {otherDetails.hasRepresentation ? (
                  <Pressable
                    onPress={() => {
                      setCorrModalTab('QA');
                      setShowCorrModal(true);
                    }}
                    style={({ pressed }) => [
                      styles.corrigendumActionBtn,
                      {
                        backgroundColor: colors.surface,
                        opacity: pressed ? 0.72 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.corrigendumActionText, { color: colors.primary }]}>
                      View Pre-Bid Q&amp;A ›
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          )}

          {/* Calm Category Eyebrow + Countdown Pill */}
          <View style={styles.heroTopRow}>
            <View style={styles.metaInlineRow}>
              <View style={[styles.typeDot, { backgroundColor: colors.danger }]} />
              <Text style={[styles.metaTypeText, { color: colors.danger }]} numberOfLines={1}>
                LIVE REVERSE AUCTION
              </Text>
              {effectiveBid.isHighValue ? (
                <Text style={[styles.metaHighValue, { color: colors.success }]}>
                  · High Value
                </Text>
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

          <Text
            style={[
              styles.auctionTitle,
              {
                color: colors.textPrimary,
                fontSize: 19.5 * fontMultiplier,
                lineHeight: 25 * fontMultiplier,
              },
            ]}
            numberOfLines={4}
          >
            {auction.title}
          </Text>
          <Text style={[styles.deptText, { color: colors.textSecondary }]} numberOfLines={2}>
            {[
              auction.department,
              auction.buyerOrganization !== auction.department ? auction.buyerOrganization : '',
              baseBid.parentBidNumber ? `Parent ${baseBid.parentBidNumber}` : '',
            ]
              .filter(Boolean)
              .join(' · ') || 'Department unstated'}
          </Text>

          {/* 2-Tier Executive Summary Block: Value & Deadline Spotlight + 3-Col Financial Trio */}
          <View style={[styles.metricMatrix, { backgroundColor: colors.surfaceSubtle }]}>
            <View style={[styles.spotlightRow, { borderBottomColor: colors.borderSubtle }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>ESTIMATED VALUE</Text>
                <Text style={[styles.spotlightValue, { color: colors.primary }]} numberOfLines={1}>
                  {estDisplay}
                </Text>
                {(isHighValueFallback || totalQty !== undefined) ? (
                  <Text style={[styles.kpiSub, { color: colors.textSecondary }]} numberOfLines={1}>
                    {isHighValueFallback
                      ? totalQty !== undefined
                        ? `GeM High Value · Qty ${totalQty.toLocaleString('en-IN')}`
                        : 'GeM High Value flag (≥ ₹2 Cr)'
                      : `Quantity ${totalQty!.toLocaleString('en-IN')} Units`}
                  </Text>
                ) : null}
              </View>
              <View style={styles.closingCol}>
                <Text style={[styles.kpiLabel, { color: colors.textMuted, textAlign: 'right' }]}>
                  CLOSES (IST)
                </Text>
                <Text style={[styles.closingDateVal, { color: colors.textPrimary }]} numberOfLines={1}>
                  {closingDayDisplay}
                </Text>
                {closingTimeDisplay ? (
                  <Text style={[styles.kpiSub, { color: colors.textSecondary, textAlign: 'right' }]} numberOfLines={1}>
                    {closingTimeDisplay}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.trioRow}>
              <View style={[styles.trioCell, { borderRightColor: colors.borderSubtle }]}>
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>EMD</Text>
                <Text
                  style={[
                    styles.trioValue,
                    { color: emdIsPositive ? colors.success : colors.textPrimary },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {emdShortDisplay}
                </Text>
                {effectiveBid.isEmdExemptForMse ? (
                  <Text style={[styles.trioSub, { color: colors.success }]} numberOfLines={1}>
                    MSE Exempt
                  </Text>
                ) : null}
              </View>
              <View style={[styles.trioCell, { borderRightColor: colors.borderSubtle }]}>
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>e-PBG</Text>
                <Text
                  style={[
                    styles.trioValue,
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
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {effectiveBid.epbgPercentage === 0 ? 'None (0%)' : epbgDisplay}
                </Text>
              </View>
              <View style={styles.trioCellLast}>
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>DELIVERY</Text>
                <Text
                  style={[
                    styles.trioValue,
                    { color: effectiveBid.deliveryPeriodDays ? colors.primary : colors.textPrimary },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {deliveryDisplay}
                </Text>
                {primaryState ? (
                  <Text style={[styles.trioSub, { color: colors.textSecondary }]} numberOfLines={1}>
                    {primaryState}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Apple Wallet-Style Interactive Action Row for Margin & RA Calculator */}
          <Pressable
            onPress={() => setShowMarginCalc(true)}
            style={({ pressed }) => [
              styles.calcActionRow,
              { borderTopColor: colors.borderSubtle, opacity: pressed ? 0.68 : 1 },
            ]}
            accessibilityLabel="Open Bid Margin and RA Floor Calculator"
          >
            <View style={[styles.calcIconBadge, { backgroundColor: colors.primaryTint }]}>
              <AppIcon name="calculator" color={colors.primary} size={15} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.calcRowTitle, { color: colors.textPrimary }]}>
                Bid Margin &amp; RA Floor Calculator
              </Text>
              <Text style={[styles.calcRowSub, { color: colors.textSecondary }]} numberOfLines={1}>
                Calculate GST quote, safe floor &amp; working capital
              </Text>
            </View>
            <Text style={[styles.calcRowCue, { color: colors.primary }]}>Open ›</Text>
          </Pressable>
        </View>

        {/* Unified 16pt Inset-Grouped Content Stack */}
        <View
          style={styles.sectionsContainer}
          onLayout={(e) => {
            sectionsOffsetYRef.current = e.nativeEvent.layout.y;
          }}
        >
          {/* 2. Official Documents & Auto-Discovered Buyer Attachments */}
          <View
            style={styles.sectionBlock}
            onLayout={(e) => {
              sectionYRef.current.docs = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.sectionEyebrowRow}>
              <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
                OFFICIAL DOCUMENTS ({mainAndBuyerDocs.length})
              </Text>
              {isScanningPdf ? (
                <View style={styles.eyebrowInlineStatus}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.eyebrowAction, { color: colors.primary }]}>
                    Scanning PDF…
                  </Text>
                </View>
              ) : buyerAttachmentDocs.length > 0 ? (
                <Text style={[styles.eyebrowAction, { color: colors.success }]}>
                  +{buyerAttachmentDocs.length} Linked
                </Text>
              ) : null}
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
              ]}
            >
              {primaryTenderDocs.map((doc, idx) => renderDocRow(doc, idx === 0))}

              {buyerAttachmentDocs.length > 0 ? (
                <>
                  <View
                    style={[
                      styles.docSubgroupBar,
                      {
                        borderTopColor: colors.borderSubtle,
                        backgroundColor: colors.surfaceSubtle,
                      },
                    ]}
                  >
                    <Text style={[styles.docSubgroupText, { color: colors.textMuted }]}>
                      BUYER ATTACHMENTS IN PDF ({buyerAttachmentDocs.length})
                    </Text>
                  </View>
                  {buyerAttachmentDocs.map((doc, idx) => renderDocRow(doc, idx === 0))}
                </>
              ) : null}

              {gtcDocs.length > 0 ? (
                <>
                  <View
                    style={[
                      styles.insetDivider,
                      { backgroundColor: colors.borderSubtle, marginLeft: 16 },
                    ]}
                  />
                  <Pressable
                    style={({ pressed }) => [styles.gtcRow, pressed && { opacity: 0.68 }]}
                    onPress={() => openInlineDoc(gtcDocs[0].id)}
                  >
                    <Text style={[styles.gtcRowText, { color: colors.textSecondary }]} numberOfLines={1}>
                      GeM General Terms &amp; Conditions (GTC)
                    </Text>
                    <Text style={[styles.gtcRowLink, { color: colors.primary }]}>Read ›</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </View>

          {/* 3. Scannable Key Tender Terms Table */}
          <View
            style={styles.sectionBlock}
            onLayout={(e) => {
              sectionYRef.current.terms = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.sectionEyebrowRow}>
              <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
                KEY TENDER TERMS
              </Text>
              {isScanningPdf ? (
                <View style={styles.eyebrowInlineStatus}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.eyebrowAction, { color: colors.primary }]}>Scanning…</Text>
                </View>
              ) : scannedOk ? (
                <Pressable
                  onPress={handleRetryScan}
                  hitSlop={10}
                  style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                >
                  <Text style={[styles.eyebrowAction, { color: colors.success }]}>
                    ✓ Parsed from PDF
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleRetryScan}
                  hitSlop={10}
                  style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                >
                  <Text style={[styles.eyebrowAction, { color: colors.primary }]}>
                    Scan PDF ↻
                  </Text>
                </Pressable>
              )}
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
              ]}
            >
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
                    <View style={styles.termLabelWrap}>
                      <Text style={[styles.termLabel, { color: colors.textSecondary }]}>
                        {row.label}
                      </Text>
                      {row.glossaryKey ? (
                        <Pressable
                          onPress={() => setGlossaryTerm(row.glossaryKey!)}
                          hitSlop={10}
                          style={[
                            styles.termHelpDot,
                            { backgroundColor: colors.surfaceSubtle },
                          ]}
                          accessibilityLabel={`Explain ${row.label}`}
                        >
                          <Text style={[styles.termHelpDotText, { color: colors.primary }]}>?</Text>
                        </Pressable>
                      ) : null}
                    </View>
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
                <View
                  style={[
                    styles.policyTagsWrap,
                    { borderTopColor: colors.borderSubtle },
                  ]}
                >
                  {policyTags.map((tag) => (
                    <View key={tag.label} style={[styles.policyTag, { backgroundColor: tag.bg }]}>
                      <Text style={[styles.policyTagText, { color: tag.fg }]}>{tag.label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
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
                isServiceTender={effectiveBid.type === 'SERVICE'}
                onPrepareDocuments={onPrepareDocuments ? () => onPrepareDocuments(effectiveBid) : undefined}
              />
            </View>
          ) : null}

          {/* 4b. ATC Trap Extractor & Instant PDF Keyword Finder */}
          {ext || pdfScan?.searchableText ? (
            <View
              onLayout={(e) => {
                sectionYRef.current.atc = e.nativeEvent.layout.y;
              }}
            >
              <AtcTrapAndSearchCard
                tenderDetails={ext}
                searchableText={pdfScan?.searchableText}
                isScanning={isScanningPdf}
                onExplainAtc={() => setGlossaryTerm('ATC')}
              />
            </View>
          ) : null}

          {/* 5. Similar Concluded Bids & Awarded Contracts */}
          <View
            onLayout={(e) => {
              sectionYRef.current.similar = e.nativeEvent.layout.y;
            }}
          >
            <SimilarConcludedBidsCard bid={effectiveBid} />
          </View>

          {/* 6. Official GeM Portal Login Handoff */}
          <View
            style={styles.sectionBlock}
            onLayout={(e) => {
              sectionYRef.current.portal = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.sectionEyebrowRow}>
              <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
                OFFICIAL GEM PORTAL
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.portalRowCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                  opacity: pressed ? 0.72 : 1,
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
          </View>

          <Text style={[styles.footerNote, { color: colors.textMuted }]}>
            Direct public GeM feed with local on-device PDF extraction. Official auction
            participation and L1 ranking remain on bidplus.gem.gov.in.
          </Text>
        </View>
      </ScrollView>

      {/* Streamlined Sticky Bottom Actions */}
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
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
            ]}
            onPress={() => onPrepareDocuments(effectiveBid)}
            activeOpacity={0.75}
          >
            <Text style={[styles.secondaryFooterText, { color: colors.textPrimary }]}>
              Prepare Docs
            </Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.primaryFooterBtn, { backgroundColor: colors.primary }]}
          onPress={() => openInlineDoc()}
          activeOpacity={0.82}
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

      <GemGlossaryModal
        visible={glossaryTerm !== null}
        initialTermKey={glossaryTerm}
        onClose={() => setGlossaryTerm(null)}
      />

      <CorrigendumAndQaModal
        visible={showCorrModal}
        bidNumber={auction.contractNumber}
        corrigendumBidId={corrigendumBidId}
        representationBidId={representationBidId}
        hasCorrigendum={Boolean(otherDetails?.hasCorrigendum)}
        hasRepresentation={Boolean(otherDetails?.hasRepresentation)}
        initialTab={corrModalTab}
        onClose={() => setShowCorrModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  fixedHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 21, fontWeight: '600' },
  headerCenter: { flex: 1, justifyContent: 'center' },
  navTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navTitle: {
    fontWeight: '600',
    flexShrink: 1,
    letterSpacing: -0.2,
    fontVariant: ['tabular-nums'],
  },
  headerSubMeta: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  copyChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  copyChipText: { fontSize: 10.5, fontWeight: '600' },
  watchChipBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareChip: {
    paddingHorizontal: 12,
    minHeight: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareChipText: { fontSize: 12.5, fontWeight: '600' },
  jumpBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  jumpBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 20,
  },
  jumpTab: {
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  jumpTabText: { fontSize: 13 },
  corrigendumBanner: {
    borderLeftWidth: 3.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 8,
  },
  corrigendumBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  corrigendumDot: { width: 7, height: 7, borderRadius: 3.5 },
  corrigendumTitle: { fontSize: 13, fontWeight: '600', flex: 1 },
  corrigendumActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  corrigendumActionBtn: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corrigendumActionText: { fontSize: 12, fontWeight: '600' },
  container: { flex: 1 },
  contentContainer: { paddingBottom: 28 },
  overviewSheet: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionsContainer: {
    paddingHorizontal: 16,
  },
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
  eyebrowInlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyebrowAction: {
    fontSize: 12.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  metaInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
  typeDot: { width: 6, height: 6, borderRadius: 3 },
  metaTypeText: { fontSize: 11.5, fontWeight: '600', letterSpacing: 0.5 },
  metaHighValue: { fontSize: 11.5, fontWeight: '600' },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countdownDot: { width: 5, height: 5, borderRadius: 2.5 },
  countdownPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  auctionTitle: {
    fontWeight: '700',
    letterSpacing: -0.35,
    marginBottom: 6,
  },
  deptText: {
    fontSize: 13,
    lineHeight: 18.5,
    marginBottom: 14,
  },
  metricMatrix: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
  },
  spotlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  spotlightValue: {
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  closingCol: {
    alignItems: 'flex-end',
  },
  closingDateVal: {
    fontSize: 13.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  trioRow: {
    flexDirection: 'row',
  },
  trioCell: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  trioCellLast: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  kpiLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.45,
    marginBottom: 3,
  },
  kpiSub: {
    fontSize: 12,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  trioValue: {
    fontSize: 13.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  trioSub: {
    fontSize: 11,
    marginTop: 2,
  },
  calcActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    minHeight: 54,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  calcIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calcRowTitle: { fontSize: 14, fontWeight: '600' },
  calcRowSub: { fontSize: 12, marginTop: 1 },
  calcRowCue: { fontSize: 13, fontWeight: '600' },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  insetDivider: {
    height: StyleSheet.hairlineWidth,
  },
  docSubgroupBar: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  docSubgroupText: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.55,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    minHeight: 62,
    gap: 12,
  },
  docBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docBadgeText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.3 },
  docTitle: { fontSize: 14.5, fontWeight: '600', lineHeight: 19 },
  docSub: { fontSize: 12.5, marginTop: 2 },
  docActionCue: { fontSize: 13, fontWeight: '600' },
  gtcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
    gap: 8,
  },
  gtcRowText: { flex: 1, fontSize: 13.5, fontWeight: '500' },
  gtcRowLink: { fontSize: 13, fontWeight: '600' },
  termsTable: {
    paddingHorizontal: 16,
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    minHeight: 48,
    gap: 12,
  },
  termLabelWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  termLabel: { fontSize: 14, fontWeight: '400', flexShrink: 1 },
  termHelpDot: {
    width: 19,
    height: 19,
    borderRadius: 9.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termHelpDotText: { fontSize: 11, fontWeight: '700' },
  termValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1.15,
    fontVariant: ['tabular-nums'],
  },
  policyTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  policyTag: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  policyTagText: { fontSize: 12, fontWeight: '600' },
  portalRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  portalRowTitle: { fontSize: 14.5, fontWeight: '600' },
  portalRowSub: { fontSize: 12.5, lineHeight: 17.5, marginTop: 2 },
  portalRowLink: { fontSize: 13, fontWeight: '600' },
  footerNote: {
    fontSize: 11.5,
    lineHeight: 16.5,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginTop: 18,
    marginBottom: 8,
  },
  stickyFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  secondaryFooterBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryFooterText: { fontSize: 14.5, fontWeight: '600' },
  primaryFooterBtn: {
    flex: 1.45,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryFooterText: { fontSize: 14.5, fontWeight: '600' },
});
