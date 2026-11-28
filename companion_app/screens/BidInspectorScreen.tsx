/**
 * GeM Bid & Tender Details Screen (High-Clarity Decision Desk)
 *
 * Designed for extended tender inspection & PDF review:
 * - Clean theme-native header with 1-tap Bid Number Copy + Deal Sheet Share
 * - Sticky Quick-Jump section strip (Overview · Docs · Terms · Eligibility · Delivery · Checklist)
 * - Executive Summary card with live closing countdown + breathable 2×2 KPI grid
 * - Official Documents & Auto-Discovered Buyer Attachments (Specs, Drawings, ATC, BOQ, SLA, GTC)
 * - Scannable Key Tender Terms table + policy tags
 * - Honest Eligibility & Key Watchouts + 1-tap compliance letter drafts
 * - Deduplicated Delivery Locations + interactive Seller Checklist with readiness progress bar
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  NativeModules,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type {
  DeconstructedBidDoc,
  OfficialBidDocument,
  OfficialBidDocumentKind,
  WorkspaceDocument,
} from '../types/index';
import { BidDocService } from '../services/BidDocService';
import {
  CompanyDocLockerService,
  type CompanyLockerDocument,
} from '../services/CompanyDocLockerService';
import { WorkspaceStorage } from '../services/WorkspaceStorage';
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
import { formatDateSafe, formatInr } from '../utils/formatters';
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

interface BidInspectorScreenProps {
  bid: DeconstructedBidDoc | null;
  visible: boolean;
  onClose: () => void;
  onPrepareDocuments?: (bid: DeconstructedBidDoc) => void;
}

type SectionKey =
  | 'overview'
  | 'docs'
  | 'terms'
  | 'eligibility'
  | 'atc'
  | 'delivery'
  | 'checklist'
  | 'similar';

function copyToClipboardSafe(value: string): boolean {
  try {
    const nativeClipboard = NativeModules?.Clipboard || NativeModules?.RNCClipboard;
    if (nativeClipboard && typeof nativeClipboard.setString === 'function') {
      nativeClipboard.setString(value);
      return true;
    }
  } catch {
    // Fall through to share sheet fallback
  }
  return false;
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
  const { colors, isDark, t } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const jumpScrollRef = useRef<ScrollView>(null);
  const jumpTabXRef = useRef<Partial<Record<SectionKey, number>>>({});
  const jumpLockUntilRef = useRef<number>(0);
  const sectionYRef = useRef<Partial<Record<SectionKey, number>>>({});
  const sectionsOffsetYRef = useRef<number>(0);

  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});
  const [lockerDocs, setLockerDocs] = useState<CompanyLockerDocument[]>(() =>
    CompanyDocLockerService.getDocuments()
  );
  const [workspaceDocs, setWorkspaceDocs] = useState<WorkspaceDocument[]>([]);
  const [pdfScan, setPdfScan] = useState<LocalPdfScanResult | null>(null);
  const [isScanningPdf, setIsScanningPdf] = useState(false);
  const [documentViewerVisible, setDocumentViewerVisible] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>();
  const [showDealSheet, setShowDealSheet] = useState(false);
  const [showMarginCalc, setShowMarginCalc] = useState(false);
  const [glossaryTerm, setGlossaryTerm] = useState<string | null>(null);
  const [otherDetails, setOtherDetails] = useState<GeMBidOtherDetails | null>(null);
  const [corrigendumBidId, setCorrigendumBidId] = useState<string | undefined>();
  const [representationBidId, setRepresentationBidId] = useState<string | undefined>();
  const [showCorrModal, setShowCorrModal] = useState(false);
  const [corrModalTab, setCorrModalTab] = useState<CorrigendumModalTab>('CORRIGENDA');
  const [copiedBidNum, setCopiedBidNum] = useState(false);
  const [activeJump, setActiveJump] = useState<SectionKey>('overview');
  const [isWatched, setIsWatched] = useState(() => TenderRadarService.isWatched(bid?.bidNumber));

  useEffect(() => {
    setIsWatched(TenderRadarService.isWatched(bid?.bidNumber));
    const unsub = TenderRadarService.subscribe(() => {
      setIsWatched(TenderRadarService.isWatched(bid?.bidNumber));
    });
    return () => unsub();
  }, [bid?.bidNumber]);

  useEffect(() => {
    CompanyDocLockerService.hydrate().then(setLockerDocs).catch(() => undefined);
    const unsubLocker = CompanyDocLockerService.subscribe(setLockerDocs);
    WorkspaceStorage.loadDocuments().then(setWorkspaceDocs).catch(() => undefined);
    const unsubWs = WorkspaceStorage.subscribeDocuments(setWorkspaceDocs);
    return () => {
      unsubLocker();
      unsubWs();
    };
  }, []);

  useEffect(() => {
    setCheckedDocs({});
    setPdfScan(null);
    setOtherDetails(null);
    setCorrigendumBidId(undefined);
    setRepresentationBidId(undefined);
    setShowCorrModal(false);
    setDocumentViewerVisible(false);
    setShowDealSheet(false);
    setShowMarginCalc(false);
    setSelectedDocumentId(undefined);
    setCopiedBidNum(false);
    setActiveJump('overview');
    sectionYRef.current = {};
    if (!bid || !visible) return;

    let cancelled = false;
    WorkspaceStorage.loadChecklistTicks(bid.bidNumber)
      .then((savedTicks) => {
        if (!cancelled) setCheckedDocs(savedTicks);
      })
      .catch(() => undefined);
    setIsScanningPdf(true);
    LocalPdfScanner.scanBidDocuments(bid)
      .then((result) => {
        if (!cancelled) setPdfScan(result);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsScanningPdf(false);
      });

    const primaryProbeId = bid.b_id;
    const parentProbeId =
      bid.parentBidId && bid.parentBidId !== bid.b_id ? bid.parentBidId : undefined;
    const probeIds = [primaryProbeId, parentProbeId].filter((id): id is string => Boolean(id));
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

  const mainAndBuyerDocs = officialDocuments.filter((d) => d.kind !== 'GTC');
  const primaryTenderDocs = mainAndBuyerDocs.filter(
    (d) => d.id === 'bid-document' || d.id === 'parent-bid-document'
  );
  const buyerAttachmentDocs = mainAndBuyerDocs.filter(
    (d) => d.id !== 'bid-document' && d.id !== 'parent-bid-document'
  );
  const gtcDocs = officialDocuments.filter((d) => d.kind === 'GTC');

  const handleCopyBidNumber = () => {
    const ok = copyToClipboardSafe(bid.bidNumber);
    if (ok) {
      setCopiedBidNum(true);
      setTimeout(() => setCopiedBidNum(false), 1800);
    } else {
      Share.share({ message: bid.bidNumber, title: bid.bidNumber }).catch(() => undefined);
    }
  };

  const syncJumpTabIntoView = (key: SectionKey) => {
    const tabX = jumpTabXRef.current[key];
    if (typeof tabX === 'number') {
      jumpScrollRef.current?.scrollTo({ x: Math.max(0, tabX - 24), animated: true });
    }
  };

  const scrollToSection = (key: SectionKey) => {
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
    const orderedKeys: SectionKey[] = [
      'docs',
      'terms',
      'eligibility',
      'atc',
      'delivery',
      'checklist',
      'similar',
    ];
    let matched: SectionKey = 'overview';
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

  const toggleDoc = (docName: string) => {
    setCheckedDocs((prev) => {
      const next = { ...prev, [docName]: !prev[docName] };
      if (bid?.bidNumber) {
        void WorkspaceStorage.saveChecklistTicks(bid.bidNumber, next);
      }
      return next;
    });
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
    if (isScanningPdf) return;
    setIsScanningPdf(true);
    try {
      const result = await LocalPdfScanner.scanBidDocuments(bid, { forceRefresh: true });
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

  const isHighValueFallback =
    !(effectiveBid.estimatedBidValueInr !== undefined && effectiveBid.estimatedBidValueInr > 0) &&
    Boolean(effectiveBid.isHighValue);

  const estValueDisplay =
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
        : fallbackValue;
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
      : fallbackValue;

  const deliveryDisplay =
    effectiveBid.deliveryPeriodDays !== undefined
      ? `${effectiveBid.deliveryPeriodDays} Days`
      : fallbackValue;

  const primaryDeliveryState =
    consignees[0]?.state ||
    Object.keys(ext?.consigneeStateDistribution || {})[0] ||
    (consignees.length > 0 ? `${consignees.length} location${consignees.length === 1 ? '' : 's'}` : undefined);

  const turnoverDisplay =
    effectiveBid.minAnnualTurnoverInr !== undefined
      ? `₹${formatInr(effectiveBid.minAnnualTurnoverInr)}`
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

  const keyTermRows: Array<{ label: string; value: string; accent?: string; glossaryKey?: string }> = [
    {
      label: 'Estimated Value',
      value: isHighValueFallback
        ? scannedOk
          ? '≥ ₹2 Cr (GeM flag · exact hidden in PDF)'
          : '≥ ₹2 Cr (GeM High Value flag)'
        : estValueDisplay,
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
    { label: 'Splitting Rule', value: splittingDisplay, glossaryKey: 'MSE' },
    { label: 'Bid Format & Validity', value: bidFormatDisplay },
  ];

  const typeInfo = BidDocService.getProcurementTypeLabel(bid);
  const isRaBid = Boolean(bid.isRa || bid.type === 'RA');
  const bidSpecificWorkspaceDocs = workspaceDocs.filter(
    (d) => d.linkedBidNumber === effectiveBid.bidNumber
  );
  const checklistMatch = CompanyDocLockerService.matchBidChecklistWithLocker(
    requiredDocuments,
    bidSpecificWorkspaceDocs,
    lockerDocs
  );
  const lockerMatchMap = new Map(
    checklistMatch.matchedFromLocker.map((m) => [m.requirement, m.doc.name])
  );
  const bidFileMatchMap = new Map(
    checklistMatch.matchedFromBidFiles.map((m) => [m.requirement, m.fileName])
  );
  const checkedCount = requiredDocuments.filter(
    (d) => Boolean(checkedDocs[d] || lockerMatchMap.has(d) || bidFileMatchMap.has(d))
  ).length;
  const checklistRatio =
    requiredDocuments.length > 0 ? checkedCount / requiredDocuments.length : 0;

  const jumpItems: Array<{ key: SectionKey; label: string; highlight?: boolean }> = [
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
    ...(consignees.length > 0
      ? [{ key: 'delivery' as const, label: `Delivery (${consignees.length})` }]
      : []),
    ...(requiredDocuments.length > 0
      ? [{ key: 'checklist' as const, label: `Checklist (${checkedCount}/${requiredDocuments.length})` }]
      : []),
    { key: 'similar', label: 'Similar' },
  ];

  const renderDocRow = (document: OfficialBidDocument, _idx: number, isFirstInGroup: boolean) => {
    const badge = getDocumentBadgeStyle(document, colors);
    const format = document.fileFormat || PortalDocService.inferFileFormat(document.url);
    const isPdf = format === 'PDF';

    return (
      <View key={document.id}>
        {!isFirstInGroup ? (
          <View style={[styles.insetDivider, { backgroundColor: colors.borderSubtle, marginLeft: 68 }]} />
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.docRow, pressed && { opacity: 0.68 }]}
          onPress={() => handleOpenDoc(document.id)}
        >
          <View style={[styles.docKindBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.docKindBadgeText, { color: badge.fg }]}>{badge.label}</Text>
          </View>
          <View style={styles.docCopy}>
            <Text style={[styles.docTitle, { color: colors.textPrimary }]} numberOfLines={2}>
              {document.label}
            </Text>
            <Text style={[styles.docSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {document.subtitle ||
                (isPdf ? 'Official GeM PDF · Read inside app' : `Official ${format} file`)}
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
    ? formatDateSafe(bid.closingTimeUtc, { day: 'numeric', month: 'short', year: 'numeric' })
    : 'See PDF';
  const closingTimeDisplay = isValidDate
    ? formatDateSafe(bid.closingTimeUtc, { hour: 'numeric', minute: '2-digit', hour12: true })
    : '';

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
          <StatusBar
            barStyle={isDark ? 'light-content' : 'dark-content'}
            backgroundColor={colors.surface}
          />
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* 1. Refined 52dp Apple-Style Navigation Bar */}
            <View
              style={[
                styles.headerBar,
                { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle },
              ]}
            >
              <Pressable
                style={({ pressed }) => [styles.headerBackBtn, pressed && { opacity: 0.6 }]}
                onPress={onClose}
                hitSlop={10}
                accessibilityLabel="Close tender details"
              >
                <Text style={[styles.headerBackIcon, { color: colors.primary }]}>←</Text>
              </Pressable>

              <Pressable
                style={styles.headerCenter}
                onPress={handleCopyBidNumber}
                hitSlop={6}
                accessibilityLabel="Copy Bid Number"
              >
                <View style={styles.headerBidRow}>
                  <Text style={[styles.headerBidNum, { color: colors.textPrimary }]} numberOfLines={1}>
                    {bid.bidNumber}
                  </Text>
                  <View
                    style={[
                      styles.copyChip,
                      {
                        backgroundColor: copiedBidNum ? colors.successTint : colors.surfaceSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.copyChipText,
                        { color: copiedBidNum ? colors.success : colors.textSecondary },
                      ]}
                    >
                      {copiedBidNum ? 'Copied ✓' : 'Copy'}
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
                  {typeInfo.label} · {remainingLabel}
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.watchHeaderBtn,
                  {
                    backgroundColor: isWatched ? colors.warningTint : colors.surfaceSubtle,
                    borderColor: isWatched ? colors.warning : colors.borderSubtle,
                    opacity: pressed ? 0.65 : 1,
                  },
                ]}
                onPress={() => void TenderRadarService.toggleWatch(effectiveBid)}
                hitSlop={8}
                accessibilityLabel={isWatched ? 'Remove from watched tenders' : 'Watch tender'}
              >
                <AppIcon
                  name={isWatched ? 'bookmarkFilled' : 'bookmark'}
                  color={isWatched ? colors.warning : colors.textPrimary}
                  size={22}
                />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.sharePillBtn,
                  { backgroundColor: colors.primaryTint },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => setShowDealSheet(true)}
                hitSlop={6}
                accessibilityLabel="Share Tender Deal Sheet"
              >
                <Text style={[styles.sharePillText, { color: colors.primary }]}>Share ↗</Text>
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
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
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
                    <View
                      style={[
                        styles.typeDot,
                        { backgroundColor: isRaBid ? colors.danger : colors.primary },
                      ]}
                    />
                    <Text
                      style={[
                        styles.metaTypeText,
                        { color: isRaBid ? colors.danger : colors.primary },
                      ]}
                      numberOfLines={1}
                    >
                      {typeInfo.label.toUpperCase()}
                    </Text>
                    {bid.isHighValue ? (
                      <Text style={[styles.metaHighValue, { color: colors.success }]}>
                        · High Value
                      </Text>
                    ) : null}
                  </View>

                  <View
                    style={[
                      styles.countdownPill,
                      {
                        backgroundColor: isClosingSoon ? colors.dangerTint : colors.primaryTint,
                      },
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

                <Text style={[styles.bidTitle, { color: colors.textPrimary }]} numberOfLines={4}>
                  {effectiveBid.title || 'Untitled Bid'}
                </Text>

                <Text style={[styles.deptText, { color: colors.textSecondary }]} numberOfLines={2}>
                  {[
                    effectiveBid.department,
                    effectiveBid.ministry !== effectiveBid.department ? effectiveBid.ministry : '',
                    bid.parentBidNumber ? `Parent ${bid.parentBidNumber}` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>

                {/* 2-Tier Executive Summary Block: Value & Deadline Spotlight + 3-Col Financial Trio */}
                <View style={[styles.metricMatrix, { backgroundColor: colors.surfaceSubtle }]}>
                  <View style={[styles.spotlightRow, { borderBottomColor: colors.borderSubtle }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>
                        ESTIMATED VALUE
                      </Text>
                      <Text style={[styles.spotlightValue, { color: colors.primary }]} numberOfLines={1}>
                        {estValueDisplay}
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
                      {primaryDeliveryState ? (
                        <Text style={[styles.trioSub, { color: colors.textSecondary }]} numberOfLines={1}>
                          {primaryDeliveryState}
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
                    {primaryTenderDocs.map((doc, idx) => renderDocRow(doc, idx, idx === 0))}

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
                        {buyerAttachmentDocs.map((doc, idx) => renderDocRow(doc, idx, idx === 0))}
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
                          onPress={() => handleOpenDoc(gtcDocs[0].id)}
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
                        onPress={handleScanPdfOnDevice}
                        hitSlop={10}
                        style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                      >
                        <Text style={[styles.eyebrowAction, { color: colors.success }]}>
                          ✓ Parsed from PDF
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={handleScanPdfOnDevice}
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

                {/* 4. Honest Eligibility & Key Watchouts + Quick Letter Drafts */}
                {ext ? (
                  <View
                    onLayout={(e) => {
                      sectionYRef.current.eligibility = e.nativeEvent.layout.y;
                    }}
                  >
                    <PreBidDisqualificationShield
                      tenderDetails={ext}
                      isServiceTender={effectiveBid.type === 'SERVICE'}
                      onPrepareDocuments={handlePrepareDocuments}
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

                {/* 5. Delivery Locations (Consignees — Deduplicated) */}
                {consignees.length > 0 ? (
                  <View
                    style={styles.sectionBlock}
                    onLayout={(e) => {
                      sectionYRef.current.delivery = e.nativeEvent.layout.y;
                    }}
                  >
                    <View style={styles.sectionEyebrowRow}>
                      <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
                        DELIVERY LOCATIONS
                      </Text>
                      <Text style={[styles.eyebrowAction, { color: colors.primary }]}>
                        {consignees.length} Consignee{consignees.length === 1 ? '' : 's'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.card,
                        { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                      ]}
                    >
                      {consignees.map((c, idx) => {
                        const stateLine = [c.state, c.pincode].filter(Boolean).join(' · ') || 'India';
                        const locNormalized = (c.location || '').replace(/\s*[-–·,]\s*/g, ' ').trim().toLowerCase();
                        const stateNormalized = stateLine.replace(/\s*[-–·,]\s*/g, ' ').trim().toLowerCase();
                        const primaryLine =
                          locNormalized && locNormalized !== stateNormalized
                            ? c.location
                            : c.reportingOfficer || 'Consignee Office';
                        const secondaryLine =
                          primaryLine === c.reportingOfficer
                            ? 'Consignee Reporting Officer'
                            : c.reportingOfficer || 'Consignee Reporting Officer';

                        return (
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
                                {primaryLine}
                              </Text>
                              <Text style={[styles.consigneeOfficer, { color: colors.textSecondary }]}>
                                {secondaryLine}
                              </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <View style={[styles.stateBadgePill, { backgroundColor: colors.surfaceSubtle }]}>
                                <Text style={[styles.stateBadge, { color: colors.primary }]}>
                                  {stateLine}
                                </Text>
                              </View>
                              <Text style={[styles.consigneeQty, { color: colors.textPrimary }]}>
                                {c.quantity !== undefined
                                  ? `${c.quantity.toLocaleString('en-IN')} Unit${c.quantity === 1 ? '' : 's'}`
                                  : 'See PDF'}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {/* 6. Interactive Seller Document Checklist (Apple Reminders Circular Style) */}
                {requiredDocuments.length > 0 ? (
                  <View
                    style={styles.sectionBlock}
                    onLayout={(e) => {
                      sectionYRef.current.checklist = e.nativeEvent.layout.y;
                    }}
                  >
                    <View style={styles.sectionEyebrowRow}>
                      <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
                        DOCUMENTS REQUIRED FROM SELLER
                      </Text>
                      <Text
                        style={[
                          styles.eyebrowAction,
                          {
                            color:
                              checkedCount === requiredDocuments.length
                                ? colors.success
                                : colors.primary,
                          },
                        ]}
                      >
                        {checkedCount}/{requiredDocuments.length} Ready
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.card,
                        { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                      ]}
                    >
                      <View style={styles.checklistProgressWrap}>
                        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceSubtle }]}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${Math.round(checklistRatio * 100)}%`,
                                backgroundColor:
                                  checkedCount === requiredDocuments.length
                                    ? colors.success
                                    : colors.primary,
                              },
                            ]}
                          />
                        </View>
                      </View>

                      {requiredDocuments.map((doc, idx) => {
                        const lockerFile = lockerMatchMap.get(doc);
                        const bidFile = bidFileMatchMap.get(doc);
                        const autoMatched = Boolean(lockerFile || bidFile);
                        const isChecked = Boolean(checkedDocs[doc] || autoMatched);
                        return (
                          <View key={idx}>
                            {idx > 0 ? (
                              <View
                                style={[
                                  styles.insetDivider,
                                  { backgroundColor: colors.borderSubtle, marginLeft: 50 },
                                ]}
                              />
                            ) : null}
                            <TouchableOpacity
                              style={styles.checkRow}
                              onPress={() => toggleDoc(doc)}
                              activeOpacity={0.68}
                            >
                              <View
                                style={[
                                  styles.checkbox,
                                  { borderColor: isChecked ? colors.success : colors.border },
                                  isChecked && { backgroundColor: colors.success },
                                ]}
                              >
                                <Text style={[styles.checkMark, { color: colors.textInverse }]}>
                                  {isChecked ? '✓' : ''}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={[
                                    styles.checkLabel,
                                    { color: isChecked ? colors.textPrimary : colors.textSecondary },
                                    isChecked && { fontWeight: '600' },
                                  ]}
                                >
                                  {doc}
                                </Text>
                                {lockerFile ? (
                                  <Text
                                    style={[styles.checkAutoSource, { color: colors.success }]}
                                    numberOfLines={1}
                                  >
                                    Company Vault · {lockerFile}
                                  </Text>
                                ) : bidFile ? (
                                  <Text
                                    style={[styles.checkAutoSource, { color: colors.primary }]}
                                    numberOfLines={1}
                                  >
                                    Bid Packet · {bidFile}
                                  </Text>
                                ) : null}
                              </View>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {/* 7. Published Scope */}
                {boqItems.length > 0 ? (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionEyebrowRow}>
                      <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
                        PUBLISHED SCOPE
                      </Text>
                      <Text style={[styles.eyebrowAction, { color: colors.textSecondary }]}>
                        {boqItems.length} Item{boqItems.length === 1 ? '' : 's'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.card,
                        { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                      ]}
                    >
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
                  </View>
                ) : null}

                {/* 8. Similar Concluded Bids & Awarded Contracts Archive */}
                <View
                  onLayout={(e) => {
                    sectionYRef.current.similar = e.nativeEvent.layout.y;
                  }}
                >
                  <SimilarConcludedBidsCard bid={effectiveBid} />
                </View>

                <Text style={[styles.footerDisclaimer, { color: colors.textMuted }]}>
                  Direct public GeM feed with local on-device PDF extraction. Official bid
                  submission and account-specific pricing remain on bidplus.gem.gov.in.
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
              <TouchableOpacity
                style={[
                  styles.secondaryFooterBtn,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                ]}
                onPress={handlePrepareDocuments}
                activeOpacity={0.75}
              >
                <Text style={[styles.secondaryFooterText, { color: colors.textPrimary }]}>
                  {t('prepareDocs')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryFooterBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleOpenDoc()}
                activeOpacity={0.82}
              >
                <Text style={[styles.primaryFooterText, { color: colors.textInverse }]}>
                  {mainAndBuyerDocs.length > 1
                    ? `${t('readDocuments')} (${mainAndBuyerDocs.length})`
                    : t('readTenderPdf')}
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
        bidNumber={bid.bidNumber}
        corrigendumBidId={corrigendumBidId}
        representationBidId={representationBidId}
        hasCorrigendum={Boolean(otherDetails?.hasCorrigendum)}
        hasRepresentation={Boolean(otherDetails?.hasRepresentation)}
        initialTab={corrModalTab}
        onClose={() => setShowCorrModal(false)}
      />

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
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBackIcon: { fontSize: 21, fontWeight: '600' },
  headerCenter: { flex: 1, justifyContent: 'center' },
  headerBidRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerBidNum: {
    fontSize: 15,
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
  copyChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  copyChipText: { fontSize: 10.5, fontWeight: '600' },
  watchHeaderBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sharePillBtn: {
    paddingHorizontal: 12,
    minHeight: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sharePillText: { fontSize: 12.5, fontWeight: '600' },
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
  jumpTabText: {
    fontSize: 13,
  },
  scrollArea: { flex: 1 },
  scrollContent: { paddingBottom: 28 },
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
  bidTitle: {
    fontSize: 19.5,
    fontWeight: '700',
    lineHeight: 25,
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
  docKindBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docKindBadgeText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.3 },
  docCopy: { flex: 1 },
  docTitle: { fontSize: 14.5, fontWeight: '600', lineHeight: 19 },
  docSubtitle: { fontSize: 12.5, marginTop: 2 },
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
  consigneeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  consigneeLocation: { fontSize: 14.5, fontWeight: '600', lineHeight: 20 },
  consigneeOfficer: { fontSize: 12.5, marginTop: 2 },
  stateBadgePill: {
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  stateBadge: { fontSize: 11.5, fontWeight: '600', fontVariant: ['tabular-nums'] },
  consigneeQty: {
    fontSize: 13.5,
    fontWeight: '600',
    marginTop: 5,
    fontVariant: ['tabular-nums'],
  },
  checklistProgressWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  progressTrack: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkMark: { fontSize: 12.5, fontWeight: '700' },
  checkLabel: { fontSize: 14, lineHeight: 20 },
  checkAutoSource: { fontSize: 11.5, fontWeight: '500', marginTop: 2 },
  boqItemRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  boqTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  boqItemTitle: { fontSize: 14.5, fontWeight: '600', flex: 1, lineHeight: 20 },
  boqQtyPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
  },
  boqQtyText: { fontSize: 11.5, fontWeight: '600', fontVariant: ['tabular-nums'] },
  boqSpecsText: { fontSize: 13, lineHeight: 18.5, marginTop: 5 },
  footerDisclaimer: {
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryFooterText: { fontSize: 14.5, fontWeight: '600' },
  primaryFooterBtn: {
    flex: 1.45,
    minHeight: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryFooterText: { fontSize: 14.5, fontWeight: '600' },
});
