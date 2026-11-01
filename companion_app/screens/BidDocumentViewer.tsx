import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Pdf from 'react-native-pdf';
import type { DeconstructedBidDoc, OfficialBidDocument } from '../types/index';
import { PortalDocService } from '../services/PortalDocService';

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
  const documents = useMemo(
    () => (bid ? PortalDocService.getOfficialDocuments(bid) : []),
    [bid]
  );
  const [selectedDocumentId, setSelectedDocumentId] = useState(initialDocumentId || 'bid-document');
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelectedDocumentId(initialDocumentId || documents[0]?.id || 'bid-document');
    setPage(1);
    setPageCount(0);
    setLoadError(false);
  }, [documents, initialDocumentId, visible]);

  const selectedDocument: OfficialBidDocument | undefined = documents.find(
    (document) => document.id === selectedDocumentId
  ) || documents[0];

  if (!bid || !selectedDocument) return null;

  const cacheFileName = `gem-${(bid.b_id || bid.bidNumber).replace(/[^a-zA-Z0-9_-]/g, '-')}-${selectedDocument.id}.pdf`;

  const selectDocument = (document: OfficialBidDocument) => {
    setSelectedDocumentId(document.id);
    setPage(1);
    setPageCount(0);
    setLoadError(false);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerButton} hitSlop={8} accessibilityLabel="Close document viewer">
            <Text style={styles.headerButtonText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Official GeM document</Text>
            <Text style={styles.headerBidNumber} numberOfLines={1}>{bid.bidNumber}</Text>
          </View>
          <View style={styles.pagePill}>
            <Text style={styles.pagePillText}>{pageCount ? `${page}/${pageCount}` : 'PDF'}</Text>
          </View>
        </View>

        {documents.length > 1 ? (
          <View style={styles.documentPickerPanel}>
            <Text style={styles.documentPickerLabel}>Documents published with this bid</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.documentPickerRow}>
              {documents.map((document) => (
                <Pressable
                  key={document.id}
                  onPress={() => selectDocument(document)}
                  style={[styles.documentChip, selectedDocument.id === document.id && styles.documentChipActive]}
                >
                  <Text style={[styles.documentChipKind, selectedDocument.id === document.id && styles.documentChipTextActive]}>
                    {document.kind}
                  </Text>
                  <Text style={[styles.documentChipLabel, selectedDocument.id === document.id && styles.documentChipTextActive]} numberOfLines={1}>
                    {document.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.viewerHeading}>
          <View style={styles.viewerHeadingCopy}>
            <Text style={styles.viewerTitle}>{selectedDocument.label}</Text>
            <Text style={styles.viewerSubtitle}>
              {documents.length === 1
                ? 'Published specifications and ATC sections, when present, are inside this official bid PDF.'
                : `${selectedDocument.kind === 'BID' ? 'Published specifications and ATC sections may be inside this file.' : 'Official attachment'} · GeM source`}
            </Text>
          </View>
        </View>

        <View style={styles.pdfFrame}>
          {loadError ? (
            <View style={styles.errorState}>
              <Text style={styles.errorIcon}>!</Text>
              <Text style={styles.errorTitle}>This document could not be displayed</Text>
              <Text style={styles.errorText}>Check your connection and try opening the document again from the bid details.</Text>
              <Pressable style={styles.retryButton} onPress={() => setLoadError(false)}>
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <Pdf
              key={selectedDocument.id}
              source={{
                uri: selectedDocument.url,
                cache: true,
                cacheFileName,
              }}
              trustAllCerts={false}
              fitPolicy={0}
              enableDoubleTapZoom
              onLoadProgress={() => undefined}
              onLoadComplete={(numberOfPages) => setPageCount(numberOfPages)}
              onPageChanged={(currentPage, numberOfPages) => {
                setPage(currentPage);
                setPageCount(numberOfPages);
              }}
              onError={() => setLoadError(true)}
              style={styles.pdf}
              renderActivityIndicator={(progress) => (
                <View style={styles.loadingState}>
                  <ActivityIndicator size="large" color="#0B5577" />
                  <Text style={styles.loadingText}>Loading official document {Math.round((progress || 0) * 100)}%</Text>
                </View>
              )}
            />
          )}
        </View>

        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>Read-only viewer · The PDF is cached privately by this device for smoother page viewing. It is not uploaded by the companion.</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F9' },
  header: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B3B60',
    paddingHorizontal: 14,
    gap: 10,
  },
  headerButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#315D7D', alignItems: 'center', justifyContent: 'center' },
  headerButtonText: { color: '#FFFFFF', fontSize: 36, lineHeight: 38, fontWeight: '300', marginTop: -4 },
  headerCopy: { flex: 1 },
  headerTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  headerBidNumber: { color: '#D9E7F0', fontSize: 11, marginTop: 3 },
  pagePill: { minWidth: 48, borderRadius: 16, backgroundColor: '#FFFFFF1A', paddingHorizontal: 9, paddingVertical: 7, alignItems: 'center' },
  pagePillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  documentPickerPanel: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#D7E0E6', paddingTop: 10 },
  documentPickerLabel: { color: '#5A6A75', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, paddingHorizontal: 14 },
  documentPickerRow: { gap: 8, paddingHorizontal: 14, paddingVertical: 9 },
  documentChip: { minWidth: 132, maxWidth: 220, borderWidth: 1, borderColor: '#CBD5DC', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#FFFFFF' },
  documentChipActive: { borderColor: '#0B5577', backgroundColor: '#EAF4F8' },
  documentChipKind: { color: '#6A7882', fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  documentChipLabel: { color: '#263643', fontSize: 12, fontWeight: '700', marginTop: 3 },
  documentChipTextActive: { color: '#0B5577' },
  viewerHeading: { backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E1E7EB' },
  viewerHeadingCopy: { flex: 1 },
  viewerTitle: { color: '#1D2C37', fontSize: 15, fontWeight: '800' },
  viewerSubtitle: { color: '#64737D', fontSize: 11, lineHeight: 16, marginTop: 3 },
  pdfFrame: { flex: 1, backgroundColor: '#DDE5EA' },
  pdf: { flex: 1, width: '100%', backgroundColor: '#DDE5EA' },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F7F9' },
  loadingText: { color: '#4D626E', fontSize: 12, marginTop: 12 },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#F4F7F9' },
  errorIcon: { color: '#B45309', fontSize: 36, fontWeight: '900' },
  errorTitle: { color: '#263643', fontSize: 16, fontWeight: '800', textAlign: 'center', marginTop: 10 },
  errorText: { color: '#64737D', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7, maxWidth: 300 },
  retryButton: { backgroundColor: '#0B5577', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, marginTop: 18 },
  retryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  footerNote: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#D7E0E6', paddingHorizontal: 14, paddingVertical: 8 },
  footerNoteText: { color: '#697780', fontSize: 10, lineHeight: 14, textAlign: 'center' },
});
