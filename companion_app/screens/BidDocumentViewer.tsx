/**
 * GeM Inline Document Reader (High-Focus PDF Viewer)
 *
 * Designed for comfortable, extended reading of dense GeM Bid PDFs, Specs,
 * Drawings, ATC documents, and GTC references:
 * - Multi-document horizontal tab switcher (RA, Original Bid, Specs, Drawings, ATC, BOQ, GTC)
 * - Focus Reading Mode (1-tap header toggle or single-tap PDF canvas -> ~94% viewport)
 * - In-viewer "Terms" Quick-Peek sheet (inspect EMD, e-PBG, Delivery, Turnover without losing your page)
 * - Native Prev / Next page stepper bar + Share / Open External launcher
 * - Safe in-PDF *.gem.gov.in hyperlink interception
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  NativeModules,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { DeconstructedBidDoc, OfficialBidDocument, OfficialBidDocumentKind } from '../types/index';
import { BidDocService } from '../services/BidDocService';
import { PortalDocService } from '../services/PortalDocService';
import { useTheme } from '../theme/ThemeContext';
import { formatDateSafe, formatInr } from '../utils/formatters';

const PDF_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';

interface NativePdfHandle {
  setPage?: (pageNumber: number) => void;
}

type NativePdfComponent = React.ComponentType<{
  ref?: React.Ref<NativePdfHandle>;
  source: {
    uri: string;
    cache?: boolean;
    cacheFileName?: string;
    headers?: Record<string, string>;
  };
  trustAllCerts?: boolean;
  fitPolicy?: number;
  enableDoubleTapZoom?: boolean;
  spacing?: number;
  onLoadProgress?: (percent: number) => void;
  onLoadComplete?: (numberOfPages: number) => void;
  onPageChanged?: (page: number, numberOfPages: number) => void;
  onPageSingleTap?: (page: number, x: number, y: number) => void;
  onPressLink?: (uri: string) => void;
  onError?: (error: unknown) => void;
  style?: object;
  renderActivityIndicator?: (progress: number) => React.ReactNode;
}>;

let cachedPdfComponent: NativePdfComponent | null | undefined;

function getNativePdfComponent(): NativePdfComponent | null {
  if (cachedPdfComponent !== undefined) return cachedPdfComponent;
  const hasBlobNative = Boolean(
    NativeModules?.ReactNativeBlobUtil || NativeModules?.RNFetchBlob
  );
  if (!hasBlobNative) {
    cachedPdfComponent = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-pdf');
    cachedPdfComponent = (mod?.default ?? mod) as NativePdfComponent;
  } catch {
    cachedPdfComponent = null;
  }
  return cachedPdfComponent;
}

function getBadgeLabel(document: OfficialBidDocument): string {
  if (document.id === 'parent-bid-document') return 'PARENT BID';
  if (/show(?:direct)?radocumentPdf/i.test(document.url)) return 'RA PDF';
  const map: Record<OfficialBidDocumentKind, string> = {
    BID: 'BID PDF',
    SPECIFICATION: 'SPEC',
    DRAWING: 'DESIGN',
    ATC: 'ATC',
    BOQ: document.fileFormat === 'XLSX' ? 'XLSX' : document.fileFormat === 'CSV' ? 'CSV' : 'BOQ',
    CORRIGENDUM: 'CORRIG',
    SLA: 'SLA',
    GTC: 'GTC',
    OTHER: document.fileFormat || 'DOC',
  };
  return map[document.kind] || 'DOC';
}

interface BidDocumentViewerProps {
  bid: DeconstructedBidDoc | null;
  visible: boolean;
  initialDocumentId?: string;
  onClose: () => void;
}

export const BidDocumentViewer: React.FC<BidDocumentViewerProps> = ({
  bid,
  visible,
  initialDocumentId,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const pdfRef = useRef<NativePdfHandle | null>(null);

  const documents = useMemo(
    () => (bid ? PortalDocService.getOfficialDocuments(bid) : []),
    [bid]
  );
  const [selectedDocumentId, setSelectedDocumentId] = useState(initialDocumentId || 'bid-document');
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [showTermsPeek, setShowTermsPeek] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelectedDocumentId(initialDocumentId || documents[0]?.id || 'bid-document');
    setPage(1);
    setPageCount(0);
    setLoadError(null);
    setRetryNonce(0);
    setFocusMode(false);
    setShowTermsPeek(false);
  }, [documents, initialDocumentId, visible]);

  const selectedDocument: OfficialBidDocument | undefined =
    documents.find((document) => document.id === selectedDocumentId) || documents[0];

  const quickTermsRows = useMemo(() => {
    if (!bid) return [];
    const f = BidDocService.getFundamentalsSummary(bid);
    const estVal =
      bid.estimatedBidValueInr && bid.estimatedBidValueInr > 0
        ? `₹${formatInr(bid.estimatedBidValueInr)}`
        : bid.isHighValue
          ? '≥ ₹2 Cr'
          : 'Not disclosed in PDF';
    const emdVal =
      bid.emdAmountInr === undefined
        ? bid.isEmdExemptForMse
          ? 'MSE Exempt'
          : 'See PDF'
        : bid.emdAmountInr === 0
          ? '₹0 (Not Required)'
          : `₹${formatInr(bid.emdAmountInr)}${bid.isEmdExemptForMse ? ' (MSE Exempt)' : ''}`;
    const epbg =
      bid.epbgPercentage !== undefined
        ? bid.epbgPercentage === 0
          ? 'Not Required (0%)'
          : bid.epbgDurationMonths
            ? `${bid.epbgPercentage}% (${bid.epbgDurationMonths} mo)`
            : `${bid.epbgPercentage}%`
        : 'See PDF';
    const qty = bid.boqItems?.[0]?.quantity;
    const states = Array.from(new Set((bid.consignees || []).map((c) => c.state).filter(Boolean)));
    return [
      { label: 'Closes (IST)', value: formatDateSafe(bid.closingTimeUtc) },
      { label: 'Estimated Value', value: estVal },
      { label: 'EMD Guarantee', value: emdVal },
      { label: 'e-PBG Security', value: epbg },
      { label: 'Delivery Timeline', value: bid.deliveryPeriodDays ? `${bid.deliveryPeriodDays} Days` : 'See PDF' },
      { label: 'Quantity', value: qty !== undefined ? `${qty.toLocaleString('en-IN')} Units` : 'See PDF' },
      { label: 'Min Annual Turnover', value: bid.minAnnualTurnoverInr !== undefined ? `₹${formatInr(bid.minAnnualTurnoverInr)}` : 'See PDF' },
      { label: 'Past Experience', value: bid.yearsExperienceRequired !== undefined ? f.experienceLabel : 'See PDF' },
      ...(states.length > 0 ? [{ label: 'Delivery States', value: states.join(', ') }] : []),
    ];
  }, [bid]);

  if (!bid || !selectedDocument) return null;

  const format = selectedDocument.fileFormat || PortalDocService.inferFileFormat(selectedDocument.url);
  const isPdfDocument = format === 'PDF';
  const safeId = (bid.b_id || bid.bidNumber).replace(/[^a-zA-Z0-9_-]/g, '-');
  const urlHash = Array.from(selectedDocument.url).reduce((h, c) => ((h * 31 + c.charCodeAt(0)) | 0), 7);
  const cacheFileName = `gem-v3-${safeId}-${selectedDocument.id}-${Math.abs(urlHash)}.pdf`;

  const selectDocument = (document: OfficialBidDocument) => {
    setSelectedDocumentId(document.id);
    setPage(1);
    setPageCount(0);
    setLoadError(null);
  };

  const handleRetry = () => {
    setLoadError(null);
    setPage(1);
    setPageCount(0);
    setRetryNonce((n) => n + 1);
  };

  const jumpPage = (delta: number) => {
    if (pageCount <= 0) return;
    const target = Math.min(pageCount, Math.max(1, page + delta));
    if (target === page) return;
    setPage(target);
    pdfRef.current?.setPage?.(target);
  };

  const handlePdfLinkPress = (uri: string) => {
    const clean = uri.trim();
    if (!PortalDocService.isSafeGemUrl(clean)) return;
    const norm = clean.replace(/#.*$/, '').toLowerCase();
    const matchedDoc = documents.find(
      (d) => d.url.trim().replace(/#.*$/, '').toLowerCase() === norm
    );
    if (matchedDoc) {
      selectDocument(matchedDoc);
      return;
    }
    Linking.openURL(clean).catch(() => undefined);
  };

  const NativePdf = getNativePdfComponent();

  const openInSystemViewer = () => {
    Linking.openURL(selectedDocument.url).catch(() => undefined);
  };

  const shareDocumentLink = () => {
    Share.share({
      title: `${bid.bidNumber} — ${selectedDocument.label}`,
      message: `${bid.bidNumber} (${selectedDocument.label})\nOfficial GeM Document: ${selectedDocument.url}`,
    }).catch(() => undefined);
  };

  const sourceHost = (() => {
    try {
      return new URL(selectedDocument.url).hostname;
    } catch {
      return 'gem.gov.in';
    }
  })();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.surface}
        />

        {/* Compact Top Bar (hidden during Focus Reading Mode for max PDF area) */}
        {!focusMode && (
          <>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle }]}>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.headerBackBtn,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                  pressed && { opacity: 0.75 },
                ]}
                hitSlop={8}
                accessibilityLabel="Close document viewer"
              >
                <Text style={[styles.headerBackIcon, { color: colors.textPrimary }]}>←</Text>
              </Pressable>

              <View style={styles.headerCopy}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {selectedDocument.label}
                </Text>
                <Text style={[styles.headerBidNumber, { color: colors.textSecondary }]} numberOfLines={1}>
                  {bid.bidNumber} · {sourceHost}
                </Text>
              </View>

              <View style={styles.headerRight}>
                <Pressable
                  onPress={() => setShowTermsPeek((p) => !p)}
                  style={({ pressed }) => [
                    styles.headerChipBtn,
                    {
                      backgroundColor: showTermsPeek ? colors.primary : colors.primaryTint,
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}
                  hitSlop={6}
                  accessibilityLabel="Quick tender terms"
                >
                  <Text
                    style={[
                      styles.headerChipText,
                      { color: showTermsPeek ? colors.textInverse : colors.primary },
                    ]}
                  >
                    Terms
                  </Text>
                </Pressable>

                {isPdfDocument && NativePdf && !loadError ? (
                  <Pressable
                    onPress={() => setFocusMode(true)}
                    style={({ pressed }) => [
                      styles.headerChipBtn,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderWidth: 1,
                        borderColor: colors.borderSubtle,
                        opacity: pressed ? 0.78 : 1,
                      },
                    ]}
                    hitSlop={6}
                    accessibilityLabel="Enter focus reading mode"
                  >
                    <Text style={[styles.headerChipText, { color: colors.textPrimary }]}>Focus</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Multi-document switcher (Bid, Parent Bid, Specs, Drawings, ATC, BOQ, SLA, GTC) */}
            {documents.length > 1 ? (
              <View style={[styles.docTabsBar, { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.docTabsRow}>
                  {documents.map((document) => {
                    const active = selectedDocument.id === document.id;
                    return (
                      <Pressable
                        key={document.id}
                        onPress={() => selectDocument(document)}
                        style={[
                          styles.docTabChip,
                          {
                            backgroundColor: active ? colors.primary : colors.surfaceSubtle,
                            borderColor: active ? colors.primary : colors.borderSubtle,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.docTabKind,
                            { color: active ? colors.textInverse : colors.primary, opacity: active ? 0.85 : 1 },
                          ]}
                        >
                          {getBadgeLabel(document)}
                        </Text>
                        <Text
                          style={[
                            styles.docTabLabel,
                            { color: active ? colors.textInverse : colors.textPrimary },
                          ]}
                          numberOfLines={1}
                        >
                          {document.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}
          </>
        )}

        {/* Viewport: Native Inline PDF OR Clean Non-PDF Attachment Launcher (XLSX / CSV / SLA) */}
        <View style={[styles.pdfFrame, { backgroundColor: colors.background }]}>
          {!isPdfDocument ? (
            <View style={[styles.errorState, { backgroundColor: colors.background }]}>
              <View style={[styles.formatPillBig, { backgroundColor: colors.primaryTint, borderColor: colors.primary }]}>
                <Text style={[styles.formatPillBigText, { color: colors.primary }]}>{format}</Text>
              </View>
              <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
                {selectedDocument.label}
              </Text>
              <Text style={[styles.errorText, { color: colors.textSecondary }]}>
                {format === 'XLSX' || format === 'CSV'
                  ? `This buyer-attached ${format} spreadsheet is hosted directly on ${sourceHost}. Open it in Excel, Sheets, or your browser to inspect all BOQ rows.`
                  : `This official GeM ${format === 'WEB' ? 'catalogue / SLA web' : format} document opens directly on ${sourceHost}.`}
              </Text>
              <Pressable
                style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                onPress={openInSystemViewer}
              >
                <Text style={[styles.primaryActionText, { color: colors.textInverse }]}>
                  Open {format === 'WEB' ? 'Official Page' : `${format} File`} ↗
                </Text>
              </Pressable>
            </View>
          ) : !NativePdf || loadError ? (
            <View style={[styles.errorState, { backgroundColor: colors.background }]}>
              <View style={[styles.errorBadge, { backgroundColor: colors.dangerTint }]}>
                <Text style={[styles.errorIcon, { color: colors.danger }]}>{NativePdf ? '!' : 'PDF'}</Text>
              </View>
              <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
                {NativePdf ? 'Could not load PDF inline' : 'Open Official GeM PDF'}
              </Text>
              <Text style={[styles.errorText, { color: colors.textSecondary }]}>
                {NativePdf
                  ? loadError || 'GeM may be slow to respond. Retry inline viewing or open the official PDF in your browser.'
                  : `Tap below to download and read this official document directly from ${sourceHost}.`}
              </Text>
              <View style={styles.errorActions}>
                {NativePdf ? (
                  <Pressable
                    style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                    onPress={handleRetry}
                  >
                    <Text style={[styles.primaryActionText, { color: colors.textInverse }]}>
                      Retry Inline Viewer
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={
                    NativePdf
                      ? [styles.secondaryActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]
                      : [styles.primaryActionBtn, { backgroundColor: colors.primary }]
                  }
                  onPress={openInSystemViewer}
                >
                  <Text
                    style={
                      NativePdf
                        ? [styles.secondaryActionText, { color: colors.primary }]
                        : [styles.primaryActionText, { color: colors.textInverse }]
                    }
                  >
                    Open Official PDF ↗
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <NativePdf
              ref={pdfRef}
              key={`${selectedDocument.id}-${retryNonce}`}
              source={{
                uri: selectedDocument.url,
                cache: retryNonce === 0,
                cacheFileName,
                headers: {
                  'User-Agent': PDF_USER_AGENT,
                  Accept: 'application/pdf,*/*',
                  Referer: 'https://bidplus.gem.gov.in/',
                },
              }}
              trustAllCerts={false}
              fitPolicy={0}
              spacing={8}
              enableDoubleTapZoom
              onLoadProgress={() => undefined}
              onLoadComplete={(numberOfPages) => {
                setPageCount(numberOfPages);
                setLoadError(null);
              }}
              onPageChanged={(currentPage, numberOfPages) => {
                setPage(currentPage);
                setPageCount(numberOfPages);
              }}
              onPageSingleTap={() => setFocusMode((prev) => !prev)}
              onPressLink={handlePdfLinkPress}
              onError={(err) => {
                const msg =
                  err instanceof Error
                    ? err.message
                    : typeof err === 'string'
                      ? err
                      : `Unable to fetch the PDF from ${sourceHost}.`;
                setLoadError(msg.length > 140 ? `${msg.slice(0, 140)}…` : msg);
              }}
              style={styles.pdf}
              renderActivityIndicator={(progress) => (
                <View style={[styles.loadingState, { backgroundColor: colors.background }]}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.loadingTitle, { color: colors.textPrimary }]}>
                    Loading {selectedDocument.label}…
                  </Text>
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    {progress > 0
                      ? `${Math.round(progress * 100)}% downloaded directly from ${sourceHost}`
                      : `Connecting directly to ${sourceHost}`}
                  </Text>
                </View>
              )}
            />
          )}

          {/* Floating Exit-Focus Pill when in Focus Reading Mode */}
          {focusMode && (
            <View style={styles.focusOverlayBar} pointerEvents="box-none">
              <Pressable
                onPress={() => setFocusMode(false)}
                style={[
                  styles.focusExitPill,
                  { backgroundColor: colors.primary, shadowColor: '#000' },
                ]}
              >
                <Text style={[styles.focusExitText, { color: colors.textInverse }]}>
                  Exit Focus{pageCount > 0 ? ` · ${page} / ${pageCount}` : ''}
                </Text>
              </Pressable>
            </View>
          )}

          {/* In-Viewer Quick Terms Peek Sheet (check EMD / Delivery / e-PBG without leaving page) */}
          {showTermsPeek && !focusMode && (
            <View style={styles.termsOverlay}>
              <Pressable style={{ flex: 1 }} onPress={() => setShowTermsPeek(false)} />
              <View
                style={[
                  styles.termsSheet,
                  { backgroundColor: colors.surface, borderTopColor: colors.border },
                ]}
              >
                <View style={[styles.termsSheetHeader, { borderBottomColor: colors.borderSubtle }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.termsSheetTitle, { color: colors.textPrimary }]}>
                      Quick Tender Terms
                    </Text>
                    <Text style={[styles.termsSheetSub, { color: colors.textSecondary }]} numberOfLines={1}>
                      {bid.bidNumber} · {bid.title}
                    </Text>
                  </View>
                  <Pressable onPress={() => setShowTermsPeek(false)} hitSlop={10}>
                    <Text style={[styles.termsSheetClose, { color: colors.textMuted }]}>✕</Text>
                  </Pressable>
                </View>
                <ScrollView style={styles.termsSheetBody} showsVerticalScrollIndicator={false}>
                  {quickTermsRows.map((row, idx) => (
                    <View
                      key={row.label}
                      style={[
                        styles.termsSheetRow,
                        idx > 0 && {
                          borderTopWidth: StyleSheet.hairlineWidth,
                          borderTopColor: colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text style={[styles.termsSheetLabel, { color: colors.textSecondary }]}>
                        {row.label}
                      </Text>
                      <Text style={[styles.termsSheetValue, { color: colors.textPrimary }]}>
                        {row.value}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
        </View>

        {/* Interactive Bottom Reader Bar (Prev / Page Counter / Next / Share / Open External) */}
        {!focusMode && (
          <View style={[styles.readerFooter, { backgroundColor: colors.surface, borderTopColor: colors.borderSubtle }]}>
            {isPdfDocument && pageCount > 1 ? (
              <View style={styles.pageStepperGroup}>
                <Pressable
                  onPress={() => jumpPage(-1)}
                  disabled={page <= 1}
                  style={[
                    styles.stepperBtn,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.borderSubtle,
                      opacity: page <= 1 ? 0.4 : 1,
                    },
                  ]}
                  accessibilityLabel="Previous page"
                >
                  <Text style={[styles.stepperBtnText, { color: colors.textPrimary }]}>‹ Prev</Text>
                </Pressable>

                <View style={[styles.pageCounterPill, { backgroundColor: colors.primaryTint }]}>
                  <Text style={[styles.pageCounterText, { color: colors.primary }]}>
                    {page} / {pageCount}
                  </Text>
                </View>

                <Pressable
                  onPress={() => jumpPage(1)}
                  disabled={page >= pageCount}
                  style={[
                    styles.stepperBtn,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.borderSubtle,
                      opacity: page >= pageCount ? 0.4 : 1,
                    },
                  ]}
                  accessibilityLabel="Next page"
                >
                  <Text style={[styles.stepperBtnText, { color: colors.textPrimary }]}>Next ›</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.sourceCaptionWrap}>
                <View style={[styles.sourceDot, { backgroundColor: colors.emerald }]} />
                <Text style={[styles.footerCaption, { color: colors.textSecondary }]} numberOfLines={1}>
                  Direct from {sourceHost}
                  {pageCount === 1 ? ' · 1 page' : ''}
                </Text>
              </View>
            )}

            <View style={styles.footerRightBtns}>
              <Pressable
                onPress={shareDocumentLink}
                style={({ pressed }) => [
                  styles.footerIconBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.borderSubtle,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
                hitSlop={6}
                accessibilityLabel="Share document link"
              >
                <Text style={[styles.footerIconBtnText, { color: colors.textPrimary }]}>Share</Text>
              </Pressable>
              <Pressable
                onPress={openInSystemViewer}
                style={({ pressed }) => [
                  styles.footerIconBtn,
                  {
                    backgroundColor: colors.primaryTint,
                    borderColor: 'transparent',
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
                hitSlop={6}
                accessibilityLabel="Open externally"
              >
                <Text style={[styles.footerIconBtnText, { color: colors.primary }]}>Open ↗</Text>
              </Pressable>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackIcon: { fontSize: 19, fontWeight: '700' },
  headerCopy: { flex: 1 },
  headerTitle: { fontSize: 14, fontWeight: '800' },
  headerBidNumber: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerChipBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerChipText: { fontSize: 11.5, fontWeight: '800' },
  docTabsBar: {
    borderBottomWidth: 1,
    paddingVertical: 7,
  },
  docTabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  docTabChip: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 210,
  },
  docTabKind: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  docTabLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  pdfFrame: { flex: 1, position: 'relative' },
  pdf: { flex: 1, width: '100%', height: '100%' },
  focusOverlayBar: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 20,
  },
  focusExitPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 4,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  focusExitText: { fontSize: 12, fontWeight: '800' },
  termsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    zIndex: 15,
  },
  termsSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    maxHeight: '70%',
    paddingBottom: 14,
  },
  termsSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  termsSheetTitle: { fontSize: 15, fontWeight: '800' },
  termsSheetSub: { fontSize: 11.5, marginTop: 2 },
  termsSheetClose: { fontSize: 18, fontWeight: '700' },
  termsSheetBody: { paddingHorizontal: 16 },
  termsSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 12,
  },
  termsSheetLabel: { fontSize: 12.5, fontWeight: '500', flex: 1 },
  termsSheetValue: { fontSize: 13, fontWeight: '800', textAlign: 'right', flex: 1.2 },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingTitle: { fontSize: 15, fontWeight: '700', marginTop: 12, textAlign: 'center' },
  loadingText: { fontSize: 12, marginTop: 4, textAlign: 'center' },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  formatPillBig: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginBottom: 14,
  },
  formatPillBigText: { fontSize: 16, fontWeight: '900', letterSpacing: 0.8 },
  errorBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  errorIcon: { fontSize: 18, fontWeight: '900' },
  errorTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  errorText: { fontSize: 13, textAlign: 'center', lineHeight: 19, maxWidth: 310, marginBottom: 18 },
  errorActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  primaryActionBtn: {
    borderRadius: 9,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: { fontSize: 13, fontWeight: '800' },
  secondaryActionBtn: {
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: { fontSize: 13, fontWeight: '700' },
  readerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  pageStepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minHeight: 34,
    justifyContent: 'center',
  },
  stepperBtnText: { fontSize: 11.5, fontWeight: '800' },
  pageCounterPill: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minHeight: 34,
    justifyContent: 'center',
  },
  pageCounterText: { fontSize: 11.5, fontWeight: '800' },
  sourceCaptionWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceDot: { width: 7, height: 7, borderRadius: 4 },
  footerCaption: { fontSize: 11.5, fontWeight: '600', flex: 1 },
  footerRightBtns: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerIconBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minHeight: 34,
    justifyContent: 'center',
  },
  footerIconBtnText: { fontSize: 11.5, fontWeight: '800' },
});
