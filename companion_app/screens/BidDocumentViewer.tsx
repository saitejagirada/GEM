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
import type { DeconstructedBidDoc, OfficialBidDocument } from '../types/index';
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
    // Lazy require avoids crashing builds that don't compile react-native-blob-util
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-pdf');
    cachedPdfComponent = (mod?.default ?? mod) as NativePdfComponent;
  } catch {
    cachedPdfComponent = null;
  }
  return cachedPdfComponent;
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
  const { colors } = useTheme();
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

  const safeId = (bid.b_id || bid.bidNumber).replace(/[^a-zA-Z0-9_-]/g, '-');
  const cacheFileName = `gem-v2-${safeId}-${selectedDocument.id}.pdf`;

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

  const isParentDoc = selectedDocument.id === 'parent-bid-document';
  const isRaDoc = /show(?:direct)?radocumentPdf/i.test(selectedDocument.url);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: '#0B3B60' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#0B3B60" />

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.headerBackBtn, pressed && { opacity: 0.75 }]}
            hitSlop={8}
            accessibilityLabel="Close document viewer"
          >
            <Text style={styles.headerBackIcon}>←</Text>
          </Pressable>

          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {selectedDocument.label}
            </Text>
            <Text style={styles.headerBidNumber} numberOfLines={1}>
              {bid.bidNumber}
            </Text>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.pagePill}>
              <Text style={styles.pagePillText}>
                {pageCount > 0 ? `${page} / ${pageCount}` : 'PDF'}
              </Text>
            </View>
            <Pressable
              onPress={openInSystemViewer}
              style={({ pressed }) => [styles.externalBtn, pressed && { opacity: 0.75 }]}
              hitSlop={8}
              accessibilityLabel="Open PDF in external browser or viewer"
            >
              <Text style={styles.externalBtnText}>↗</Text>
            </Pressable>
          </View>
        </View>

        {/* Multi-document switcher (e.g. RA Document <-> Original Bid PDF) */}
        {documents.length > 1 ? (
          <View style={[styles.docTabsBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.docTabsRow}>
              {documents.map((document) => {
                const active = selectedDocument.id === document.id;
                const badgeLabel =
                  document.id === 'parent-bid-document'
                    ? 'PARENT BID'
                    : /show(?:direct)?radocumentPdf/i.test(document.url)
                      ? 'RA PDF'
                      : document.kind;
                return (
                  <Pressable
                    key={document.id}
                    onPress={() => selectDocument(document)}
                    style={[
                      styles.docTabChip,
                      {
                        backgroundColor: active ? '#0B3B60' : colors.surfaceSubtle,
                        borderColor: active ? '#0B3B60' : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.docTabKind, { color: active ? '#93C5FD' : colors.textMuted }]}>
                      {badgeLabel}
                    </Text>
                    <Text
                      style={[styles.docTabLabel, { color: active ? '#FFFFFF' : colors.textPrimary }]}
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

        {/* Document context bar (fixed horizontal layout so it never collapses) */}
        <View style={[styles.viewerHeading, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.viewerHeadingLeft}>
            <View style={[styles.sourceDot, { backgroundColor: '#16A34A' }]} />
            <Text style={[styles.viewerSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
              {isRaDoc && documents.length > 1
                ? 'Reverse Auction schedule & rules · Switch to Original Bid tab for full specs, EMD & consignees.'
                : isParentDoc
                  ? 'Original GeM Bid PDF · Includes full technical specifications, commercial terms & ATC clauses.'
                  : 'Official bidplus.gem.gov.in PDF · Pinch or double-tap to zoom.'}
            </Text>
          </View>
        </View>

        {/* Inline PDF Viewport */}
        <View style={styles.pdfFrame}>
          {!NativePdf || loadError ? (
            <View style={[styles.errorState, { backgroundColor: colors.background }]}>
              <View style={styles.errorBadge}>
                <Text style={styles.errorIcon}>{NativePdf ? '!' : 'PDF'}</Text>
              </View>
              <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
                {NativePdf ? 'Could not load PDF inline' : 'Open Official GeM PDF'}
              </Text>
              <Text style={[styles.errorText, { color: colors.textSecondary }]}>
                {NativePdf
                  ? loadError || 'GeM may be slow to respond. Retry inline viewing or open the official PDF in your browser.'
                  : 'Tap below to download and read this official document directly from bidplus.gem.gov.in.'}
              </Text>
              <View style={styles.errorActions}>
                {NativePdf ? (
                  <Pressable style={styles.primaryActionBtn} onPress={handleRetry}>
                    <Text style={styles.primaryActionText}>Retry Inline Viewer</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={NativePdf ? styles.secondaryActionBtn : styles.primaryActionBtn}
                  onPress={openInSystemViewer}
                >
                  <Text style={NativePdf ? styles.secondaryActionText : styles.primaryActionText}>
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
                      : 'Unable to fetch the PDF from bidplus.gem.gov.in.';
                setLoadError(msg.length > 140 ? `${msg.slice(0, 140)}…` : msg);
              }}
              style={styles.pdf}
              renderActivityIndicator={(progress) => (
                <View style={[styles.loadingState, { backgroundColor: colors.background }]}>
                  <ActivityIndicator size="large" color="#0B3B60" />
                  <Text style={[styles.loadingTitle, { color: colors.textPrimary }]}>
                    Loading official GeM PDF…
                  </Text>
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    {progress > 0 ? `${Math.round(progress * 100)}% downloaded directly from GeM` : 'Connecting to bidplus.gem.gov.in'}
                  </Text>
                </View>
              )}
            />
          )}
        </View>

        {/* Compact Footer */}
        <View style={[styles.footerNote, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Text style={[styles.footerNoteText, { color: colors.textMuted }]}>
            Direct from bidplus.gem.gov.in · Read-only inline viewer · Cached locally on device only
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B3B60',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackIcon: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  headerCopy: { flex: 1 },
  headerTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  headerBidNumber: { color: '#BFDBFE', fontSize: 11, fontWeight: '600', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pagePill: {
    minWidth: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  pagePillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  externalBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  externalBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
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
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 230,
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
    paddingVertical: 8,
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
  viewerSubtitle: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
  },
  pdfFrame: { flex: 1, backgroundColor: '#CBD5E1' },
  pdf: { flex: 1, width: '100%', backgroundColor: '#CBD5E1' },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingTitle: { fontSize: 14, fontWeight: '700', marginTop: 14 },
  loadingText: { fontSize: 12, marginTop: 4, textAlign: 'center' },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  errorBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIcon: { color: '#B45309', fontSize: 22, fontWeight: '900' },
  errorTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center', marginTop: 14 },
  errorText: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6, maxWidth: 300 },
  errorActions: { width: '100%', maxWidth: 260, marginTop: 20, gap: 10 },
  primaryActionBtn: {
    backgroundColor: '#0B3B60',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  secondaryActionBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryActionText: { color: '#0B3B60', fontSize: 13, fontWeight: '800' },
  footerNote: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  footerNoteText: { fontSize: 10, lineHeight: 14, textAlign: 'center' },
});
