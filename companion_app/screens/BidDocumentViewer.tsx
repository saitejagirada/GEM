import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  NativeModules,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { DeconstructedBidDoc, OfficialBidDocument, OfficialBidDocumentKind } from '../types/index';
import { PortalDocService } from '../services/PortalDocService';
import { useTheme } from '../theme/ThemeContext';

const PDF_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';

type NativePdfComponent = React.ComponentType<{
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

function getContextBannerCopy(document: OfficialBidDocument, totalDocs: number): string {
  if (document.subtitle) return document.subtitle;
  if (/show(?:direct)?radocumentPdf/i.test(document.url) && totalDocs > 1) {
    return 'Reverse Auction schedule & rules · Switch tabs above for original bid, specs, drawings & ATC.';
  }
  if (document.id === 'parent-bid-document') {
    return 'Original GeM Bid PDF · Full technical terms, EMD, ePBG & consignees.';
  }
  return 'Official GeM tender document · Pinch or double-tap to zoom.';
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
  const documents = useMemo(
    () => (bid ? PortalDocService.getOfficialDocuments(bid) : []),
    [bid]
  );
  const [selectedDocumentId, setSelectedDocumentId] = useState(initialDocumentId || 'bid-document');
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setSelectedDocumentId(initialDocumentId || documents[0]?.id || 'bid-document');
    setPage(1);
    setPageCount(0);
    setLoadError(null);
    setRetryNonce(0);
  }, [documents, initialDocumentId, visible]);

  const selectedDocument: OfficialBidDocument | undefined =
    documents.find((document) => document.id === selectedDocumentId) || documents[0];

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

  const NativePdf = getNativePdfComponent();

  const openInSystemViewer = () => {
    Linking.openURL(selectedDocument.url).catch(() => undefined);
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

        {/* Clean Theme-Aware Header */}
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
            <View style={[styles.pagePill, { backgroundColor: colors.primaryTint }]}>
              <Text style={[styles.pagePillText, { color: colors.primary }]}>
                {isPdfDocument && pageCount > 0 ? `${page} / ${pageCount}` : format}
              </Text>
            </View>
            <Pressable
              onPress={openInSystemViewer}
              style={({ pressed }) => [
                styles.externalBtn,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                pressed && { opacity: 0.75 },
              ]}
              hitSlop={8}
              accessibilityLabel="Open file externally"
            >
              <Text style={[styles.externalBtnText, { color: colors.primary }]}>↗</Text>
            </Pressable>
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

        {/* Document context bar */}
        <View style={[styles.viewerHeading, { backgroundColor: colors.surfaceSubtle, borderBottomColor: colors.borderSubtle }]}>
          <View style={styles.viewerHeadingLeft}>
            <View style={[styles.sourceDot, { backgroundColor: colors.emerald }]} />
            <Text style={[styles.viewerSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
              {getContextBannerCopy(selectedDocument, documents.length)}
            </Text>
          </View>
        </View>

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
                  : `This official GeM ${format === 'WEB' ? 'SLA / web' : format} document opens directly on ${sourceHost}.`}
              </Text>
              <Pressable
                style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                onPress={openInSystemViewer}
              >
                <Text style={[styles.primaryActionText, { color: colors.textInverse }]}>
                  Download &amp; Open {format} File ↗
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
        </View>

        {/* Compact Footer */}
        <View style={[styles.footerNote, { backgroundColor: colors.surface, borderTopColor: colors.borderSubtle }]}>
          <Text style={[styles.footerNoteText, { color: colors.textMuted }]}>
            Direct from {sourceHost} · Read-only inline viewer · Cached locally on device
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    minHeight: 58,
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
  pagePill: {
    minWidth: 46,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    alignItems: 'center',
  },
  pagePillText: { fontSize: 11, fontWeight: '800' },
  externalBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  externalBtnText: { fontSize: 15, fontWeight: '800' },
  docTabsBar: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  docTabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  docTabChip: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 6,
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
  viewerHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  viewerHeadingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  viewerSubtitle: { flex: 1, fontSize: 11.5, lineHeight: 16 },
  pdfFrame: { flex: 1 },
  pdf: { flex: 1, width: '100%', height: '100%' },
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
  footerNote: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  footerNoteText: { fontSize: 10.5, textAlign: 'center' },
});
