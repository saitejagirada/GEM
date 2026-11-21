import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import type { DeconstructedBidDoc, OfficialHandoffRecord, WorkspaceDocument } from '../types/index';
import {
  CompactChip,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
} from '../components/SharedUI';
import { WorkspaceService } from '../services/WorkspaceService';
import { WorkspaceStorage } from '../services/WorkspaceStorage';
import { formatDateSafe } from '../utils/formatters';
import { BidDocumentViewer } from './BidDocumentViewer';

type PreparationSection = 'DOCUMENTS' | 'LIVE';

interface MyWorkScreenProps {
  availableBids: DeconstructedBidDoc[];
  initialBidNumber?: string;
  onOpenOfficialPortal?: () => void;
}

export const MyWorkScreen: React.FC<MyWorkScreenProps> = ({
  availableBids,
  initialBidNumber,
  onOpenOfficialPortal,
}) => {
  const { colors, fontMultiplier } = useTheme();
  const [section, setSection] = useState<PreparationSection>(initialBidNumber ? 'DOCUMENTS' : 'DOCUMENTS');
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [handoffs, setHandoffs] = useState<OfficialHandoffRecord[]>([]);
  const [selectedBidNumber, setSelectedBidNumber] = useState(
    initialBidNumber || availableBids[0]?.bidNumber || ''
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [documentBid, setDocumentBid] = useState<DeconstructedBidDoc | null>(null);

  const selectedBid = useMemo(
    () => availableBids.find((bid) => bid.bidNumber === selectedBidNumber),
    [availableBids, selectedBidNumber]
  );
  const linkedDocuments = useMemo(
    () => documents.filter((document) => document.linkedBidNumber === selectedBidNumber),
    [documents, selectedBidNumber]
  );
  const selectedHandoff = handoffs.find((handoff) => handoff.bidNumber === selectedBidNumber);

  useEffect(() => {
    if (initialBidNumber) {
      setSelectedBidNumber(initialBidNumber);
      setSection('DOCUMENTS');
    }
  }, [initialBidNumber]);

  useEffect(() => {
    if (!selectedBidNumber && availableBids.length > 0) {
      setSelectedBidNumber(availableBids[0].bidNumber);
    }
  }, [availableBids, selectedBidNumber]);

  const loadWorkspace = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [storedDocuments, storedHandoffs] = await Promise.all([
        WorkspaceStorage.loadDocuments(),
        WorkspaceStorage.loadHandoffs(),
      ]);
      setDocuments(storedDocuments);
      setHandoffs(storedHandoffs);
      setWorkspaceLoaded(true);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const selectBidForPreparation = useCallback((bidNumber: string) => {
    setSelectedBidNumber(bidNumber);
    setSection('DOCUMENTS');
  }, []);

  const openOfficialBid = useCallback((bid?: DeconstructedBidDoc) => {
    if (!bid) return;
    setDocumentBid(bid);
  }, []);

  const openOfficialPortal = useCallback(async () => {
    if (!selectedBid) return;
    const handoff = await WorkspaceStorage.beginOfficialHandoff(
      selectedBid.bidNumber,
      linkedDocuments.map((document) => document.id)
    );
    setHandoffs((current) => WorkspaceStorage.mergeHandoffs([...current, handoff]));
    if (onOpenOfficialPortal) {
      onOpenOfficialPortal();
      return;
    }
    Linking.openURL('https://ui.gem.gov.in/login').catch(() => {
      Alert.alert('Official GeM Portal', 'Visit https://ui.gem.gov.in/login in your browser.');
    });
  }, [linkedDocuments, onOpenOfficialPortal, selectedBid]);

  const pickDocuments = useCallback(async () => {
    if (!selectedBid) {
      Alert.alert('Select a bid first', 'Choose a live bid before staging preparation files.');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'image/*',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const persisted = await WorkspaceStorage.persistPickedDocuments(
        result.assets,
        selectedBid.bidNumber,
        documents
      );
      setDocuments(persisted.documents);
      Alert.alert(
        persisted.persistedCount > 0 ? 'Saved locally on device' : 'Added for this session',
        `${result.assets.length} file${result.assets.length === 1 ? '' : 's'} staged for ${selectedBid.bidNumber}. Nothing is uploaded automatically.`
      );
    } catch {
      Alert.alert('Could not add file', 'The document picker returned an error. Please try again.');
    }
  }, [documents, selectedBid]);

  const removeDocument = useCallback(
    (documentId: string) => {
      Alert.alert('Remove staged file?', 'This removes only the local workspace copy.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const document = documents.find((item) => item.id === documentId);
            if (document) await WorkspaceStorage.removeDocument(document);
            setDocuments((current) => current.filter((item) => item.id !== documentId));
          },
        },
      ]);
    },
    [documents]
  );

  const clearLocalDocuments = useCallback(() => {
    if (!documents.length) return;
    Alert.alert('Clear all staged files?', 'Removes only local copies on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all',
        style: 'destructive',
        onPress: async () => {
          await WorkspaceStorage.clearDocuments(documents);
          setDocuments([]);
        },
      },
    ]);
  }, [documents]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Compact Underline Tabs Header */}
      <View style={[styles.tabsHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(
          [
            { id: 'DOCUMENTS', label: `Staged Files (${documents.length})` },
            { id: 'LIVE', label: `Choose Bid (${availableBids.length})` },
          ] as const
        ).map((tab) => {
          const active = section === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setSection(tab.id)}
              style={[styles.tabBtn, active && { borderBottomColor: colors.primary }]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? colors.primary : colors.textSecondary },
                  active && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={loadWorkspace} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {section === 'LIVE' ? (
          availableBids.length > 0 ? (
            availableBids.slice(0, 20).map((bid) => (
              <View
                key={bid.bidNumber}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.cardTopRow}>
                  <StatusBadge
                    label={bid.isRa || bid.type === 'RA' ? 'LIVE RA' : 'LIVE BID'}
                    tone={bid.isRa ? 'warning' : 'success'}
                  />
                  <Text style={[styles.bidNumber, { color: colors.textSecondary }]} numberOfLines={1}>
                    {bid.bidNumber}
                  </Text>
                </View>
                <Text
                  style={[styles.bidTitle, { color: colors.textPrimary, fontSize: 14 * fontMultiplier }]}
                  numberOfLines={2}
                >
                  {bid.title}
                </Text>
                <Text style={[styles.bidDepartment, { color: colors.textSecondary }]} numberOfLines={1}>
                  {bid.department} · Closes {formatDateSafe(bid.closingTimeUtc)}
                </Text>
                <View style={styles.actionRow}>
                  <SecondaryButton
                    label="Read PDF"
                    onPress={() => openOfficialBid(bid)}
                    style={styles.actionButton}
                  />
                  <PrimaryButton
                    label="Select Bid"
                    onPress={() => selectBidForPreparation(bid.bidNumber)}
                    style={styles.actionButton}
                  />
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No live bids loaded yet</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Open the Bids tab to sync live tenders from bidplus.gem.gov.in.
              </Text>
            </View>
          )
        ) : (
          <View>
            {/* Active Bid Selector Strip */}
            {availableBids.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.bidChipRow}
              >
                {availableBids.slice(0, 15).map((bid) => (
                  <CompactChip
                    key={bid.bidNumber}
                    label={bid.bidNumber}
                    selected={selectedBidNumber === bid.bidNumber}
                    onPress={() => setSelectedBidNumber(bid.bidNumber)}
                  />
                ))}
              </ScrollView>
            ) : null}

            {/* Selected Bid Card */}
            {selectedBid ? (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardTopRow}>
                  <Text style={[styles.eyebrow, { color: colors.primary }]}>TARGET BID</Text>
                  <Text style={[styles.bidNumber, { color: colors.textSecondary }]}>{selectedBid.bidNumber}</Text>
                </View>
                <Text style={[styles.selectedTitle, { color: colors.textPrimary }]}>{selectedBid.title}</Text>
                <Text style={[styles.selectedMeta, { color: colors.textSecondary }]}>
                  Closes {formatDateSafe(selectedBid.closingTimeUtc)}
                </Text>
                <View style={styles.actionRow}>
                  <SecondaryButton
                    label="Read PDF Inline"
                    onPress={() => openOfficialBid(selectedBid)}
                    style={styles.actionButton}
                  />
                  <PrimaryButton
                    label="+ Add Files"
                    onPress={pickDocuments}
                    disabled={!workspaceLoaded}
                    style={styles.actionButton}
                  />
                </View>
              </View>
            ) : (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Choose a bid to prepare files</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Switch to the Choose Bid tab or tap Prepare Docs from any tender.
                </Text>
              </View>
            )}

            {/* Staged Files Section */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                STAGED LOCAL FILES ({linkedDocuments.length})
              </Text>
              {documents.length > 0 ? (
                <Pressable onPress={clearLocalDocuments} hitSlop={8}>
                  <Text style={[styles.clearLink, { color: colors.danger }]}>Clear all</Text>
                </Pressable>
              ) : null}
            </View>

            {linkedDocuments.length === 0 ? (
              <View style={[styles.emptyFilesBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No files staged for this bid yet. Tap + Add Files to attach PDFs, certificates, or spreadsheets locally on device.
                </Text>
              </View>
            ) : (
              linkedDocuments.map((document) => (
                <View
                  key={document.id}
                  style={[styles.documentRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={[styles.docBadge, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <Text style={[styles.docBadgeText, { color: colors.primary }]}>{document.kind.slice(0, 3)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.documentName, { color: colors.textPrimary }]} numberOfLines={2}>
                      {document.name}
                    </Text>
                    <Text style={[styles.documentSub, { color: colors.textMuted }]}>
                      {WorkspaceService.formatFileSize(document.sizeBytes)} ·{' '}
                      {WorkspaceStorage.isPersisted(document) ? 'Saved on device' : 'Session only'}
                    </Text>
                  </View>
                  <Pressable onPress={() => removeDocument(document.id)} hitSlop={8} style={styles.removeBtn}>
                    <Text style={[styles.removeText, { color: colors.danger }]}>Remove</Text>
                  </Pressable>
                </View>
              ))
            )}

            {/* Official Portal Handoff */}
            {selectedBid ? (
              <View style={[styles.handoffCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardTopRow}>
                  <Text style={[styles.handoffTitle, { color: colors.textPrimary }]}>Ready to submit?</Text>
                  <StatusBadge
                    label={selectedHandoff ? 'Handoff Logged' : 'On GeM Portal'}
                    tone={selectedHandoff ? 'success' : 'neutral'}
                  />
                </View>
                <Text style={[styles.handoffCopy, { color: colors.textSecondary }]}>
                  Files remain private on your device. Sign in with 2FA on ui.gem.gov.in to upload and submit your bid.
                </Text>
                <PrimaryButton
                  label="Continue on Official GeM Portal ↗"
                  onPress={openOfficialPortal}
                  style={{ marginTop: 10 }}
                />
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      <BidDocumentViewer
        bid={documentBid}
        visible={Boolean(documentBid)}
        onClose={() => setDocumentBid(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabsHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 14,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  tabLabelActive: { fontWeight: '800' },
  content: { padding: DESIGN_TOKENS.pagePaddingMobile, paddingBottom: 36 },
  bidChipRow: { paddingBottom: 12 },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 13,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  bidNumber: { fontSize: 11.5, fontWeight: '700' },
  bidTitle: { fontWeight: '700', lineHeight: 19, marginTop: 8 },
  bidDepartment: { fontSize: 11.5, marginTop: 4, marginBottom: 10 },
  selectedTitle: { fontSize: 14.5, fontWeight: '800', lineHeight: 20, marginTop: 6 },
  selectedMeta: { fontSize: 11.5, marginTop: 3, marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1, minHeight: 40 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  clearLink: { fontSize: 11.5, fontWeight: '700' },
  emptyFilesBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  emptyText: { fontSize: 12, lineHeight: 17 },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 11,
    marginBottom: 8,
    gap: 10,
  },
  docBadge: {
    width: 38,
    height: 36,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docBadgeText: { fontSize: 10, fontWeight: '900' },
  documentName: { fontSize: 12.5, fontWeight: '700' },
  documentSub: { fontSize: 10.5, marginTop: 2 },
  removeBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  removeText: { fontSize: 11.5, fontWeight: '700' },
  handoffCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginTop: 6,
  },
  handoffTitle: { fontSize: 14, fontWeight: '800' },
  handoffCopy: { fontSize: 12, lineHeight: 17, marginTop: 6 },
});
