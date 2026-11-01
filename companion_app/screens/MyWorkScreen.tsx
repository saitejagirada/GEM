import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import type { DeconstructedBidDoc, OfficialHandoffRecord, WorkspaceDocument } from '../types/index';
import { DataNotice } from '../components/DataNotice';
import {
  CompactChip,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  SegmentedTabs,
  StatusBadge,
} from '../components/SharedUI';
import { WorkspaceService } from '../services/WorkspaceService';
import { WorkspaceStorage } from '../services/WorkspaceStorage';
import { formatDateSafe } from '../utils/formatters';
import { BidDocumentViewer } from './BidDocumentViewer';

type PreparationSection = 'LIVE' | 'DOCUMENTS';

interface MyWorkScreenProps {
  availableBids: DeconstructedBidDoc[];
  initialBidNumber?: string;
  onOpenOfficialPortal?: () => void;
}

export const MyWorkScreen: React.FC<MyWorkScreenProps> = ({ availableBids, initialBidNumber, onOpenOfficialPortal }) => {
  const { colors, fontMultiplier } = useTheme();
  const [section, setSection] = useState<PreparationSection>('LIVE');
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [handoffs, setHandoffs] = useState<OfficialHandoffRecord[]>([]);
  const [selectedBidNumber, setSelectedBidNumber] = useState(initialBidNumber || availableBids[0]?.bidNumber || '');
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
      Alert.alert('Open official GeM workspace', 'The official GeM login page could not be opened on this device.');
    });
  }, [linkedDocuments, onOpenOfficialPortal, selectedBid]);

  const pickDocuments = useCallback(async () => {
    if (!selectedBid) {
      Alert.alert('Choose a live bid first', 'Select a bid before adding preparation files.');
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
        persisted.persistedCount > 0 ? 'Added to preparation workspace' : 'Added for this session',
        `${result.assets.length} file${result.assets.length === 1 ? '' : 's'} ready. Nothing was uploaded to GeM.`
      );
    } catch {
      Alert.alert('Could not add document', 'The device document picker returned an error. Please try again.');
    }
  }, [documents, selectedBid]);

  const removeDocument = useCallback((documentId: string) => {
    Alert.alert('Remove preparation file?', 'This only removes the local copy from this workspace.', [
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
  }, [documents]);

  const clearLocalDocuments = useCallback(() => {
    if (!documents.length) return;
    Alert.alert('Clear preparation files?', 'This removes only the local copies. It does not affect GeM.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear files',
        style: 'destructive',
        onPress: async () => {
          await WorkspaceStorage.clearDocuments(documents);
          setDocuments([]);
        },
      },
    ]);
  }, [documents]);

  const renderLiveBid = (bid: DeconstructedBidDoc) => (
    <View key={bid.bidNumber} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardTopRow}>
        <StatusBadge label={bid.isRa || bid.type === 'RA' ? 'LIVE RA' : 'LIVE BID'} tone={bid.isRa ? 'warning' : 'success'} />
        <Text style={[styles.bidNumber, { color: colors.textMuted }]}>{bid.bidNumber}</Text>
      </View>
      <Text style={[styles.bidTitle, { color: colors.textPrimary, fontSize: 15 * fontMultiplier }]}>{bid.title}</Text>
      <Text style={[styles.bidDepartment, { color: colors.textSecondary }]}>
        {bid.department} · {bid.ministry}
      </Text>
      <View style={[styles.liveMeta, { backgroundColor: colors.surfaceSubtle }]}>
        <View style={styles.metaCell}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>CLOSES</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{formatDateSafe(bid.closingTimeUtc)}</Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>SOURCE</Text>
          <Text style={[styles.metaValue, { color: colors.success }]}>GeM public feed</Text>
        </View>
      </View>
      <View style={styles.actionRow}>
        <SecondaryButton label="Open bid document" onPress={() => openOfficialBid(bid)} style={styles.actionButton} />
        <PrimaryButton label="Prepare documents" onPress={() => selectBidForPreparation(bid.bidNumber)} style={styles.actionButton} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <DataNotice>
        Public live GeM bids only · No private account history is shown. Preparation files remain on this device until you open GeM.
      </DataNotice>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={loadWorkspace} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: colors.textPrimary, fontSize: 24 * fontMultiplier }]}>Document preparation</Text>
        <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>Choose a live bid, assemble the response files, review the checklist, and continue on the official GeM portal.</Text>

        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border, borderTopColor: colors.saffron }]}>
          <Text style={[styles.summaryEyebrow, { color: colors.primary }]}>PUBLIC LIVE FEED</Text>
          <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>{availableBids.length} live bid{availableBids.length === 1 ? '' : 's'} available</Text>
          <View style={styles.summaryMetrics}>
            <View style={styles.summaryMetric}>
              <Text style={[styles.summaryMetricValue, { color: colors.primary }]}>{documents.length}</Text>
              <Text style={[styles.summaryMetricLabel, { color: colors.textSecondary }]}>local files</Text>
            </View>
            <View style={styles.summaryMetric}>
              <Text style={[styles.summaryMetricValue, { color: colors.primary }]}>{linkedDocuments.length}</Text>
              <Text style={[styles.summaryMetricLabel, { color: colors.textSecondary }]}>for selected bid</Text>
            </View>
          </View>
        </View>

        <SegmentedTabs
          options={['Live bids', 'Documents']}
          selected={section === 'LIVE' ? 'Live bids' : 'Documents'}
          onSelect={(value) => setSection(value === 'Live bids' ? 'LIVE' : 'DOCUMENTS')}
          style={styles.mainTabs}
        />

        {section === 'LIVE' ? (
          <View>
            <SectionHeader title="Prepare from a live bid" />
            {availableBids.length > 0 ? availableBids.slice(0, 20).map(renderLiveBid) : (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No live bids loaded</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Refresh the Bids tab to request the current public GeM feed.</Text>
              </View>
            )}
          </View>
        ) : (
          <View>
            <SectionHeader title="Build the response workspace" actionLabel={documents.length ? 'Clear files' : undefined} onAction={clearLocalDocuments} />
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>Files are private preparation copies. The app never uploads them to GeM automatically.</Text>
            <Text style={[styles.storageHint, { color: colors.textMuted }]}>
              {workspaceLoaded ? `${documents.filter((document) => WorkspaceStorage.isPersisted(document)).length} file${documents.filter((document) => WorkspaceStorage.isPersisted(document)).length === 1 ? '' : 's'} saved on this device` : 'Loading saved workspace files…'}
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Prepare for live bid</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {availableBids.slice(0, 20).map((bid) => (
                <CompactChip key={bid.bidNumber} label={bid.bidNumber} selected={selectedBidNumber === bid.bidNumber} onPress={() => setSelectedBidNumber(bid.bidNumber)} />
              ))}
            </ScrollView>

            {selectedBid ? (
              <View style={[styles.selectedBidCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.selectedBidEyebrow, { color: colors.primary }]}>SELECTED LIVE BID</Text>
                <Text style={[styles.selectedBidTitle, { color: colors.textPrimary }]}>{selectedBid.title}</Text>
                <Text style={[styles.selectedBidMeta, { color: colors.textSecondary }]}>{selectedBid.bidNumber} · closes {formatDateSafe(selectedBid.closingTimeUtc)}</Text>
                <SecondaryButton label="Open official bid document" onPress={() => openOfficialBid(selectedBid)} style={styles.fullButton} />
              </View>
            ) : null}

            <View style={[styles.uploadCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.uploadTitle, { color: colors.textPrimary }]}>Add response files</Text>
              <Text style={[styles.uploadText, { color: colors.textSecondary }]}>Add technical, compliance, financial, and supporting files. We keep the originals untouched.</Text>
              <SecondaryButton label={workspaceLoaded ? 'Choose files from device' : 'Loading workspace…'} icon="＋" onPress={pickDocuments} disabled={!workspaceLoaded || !selectedBid} style={styles.fullButton} />
            </View>

            {selectedBid ? (
              <View style={[styles.checklistCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <View style={styles.cardTopRow}>
                  <Text style={[styles.checklistTitle, { color: colors.textPrimary }]}>Requirement review</Text>
                  <StatusBadge label={selectedBid.requiredDocuments?.length ? 'From public record' : 'Review on GeM'} tone={selectedBid.requiredDocuments?.length ? 'success' : 'warning'} />
                </View>
                {(() => {
                  const checklist = WorkspaceService.getBidChecklist(selectedBid, documents);
                  return checklist.hasRequirements ? (
                    <>
                      <Text style={[styles.checklistProgress, { color: colors.primary }]}>{checklist.attachedCount} of {checklist.requiredCount} requirement names matched</Text>
                      {checklist.missingDocuments.slice(0, 6).map((missing) => <Text key={missing} style={[styles.missingText, { color: colors.textSecondary }]}>• {missing}</Text>)}
                    </>
                  ) : (
                    <Text style={[styles.checklistProgress, { color: colors.textSecondary }]}>The public feed does not include the tender checklist. Open the official bid document and verify every requirement before submission.</Text>
                  );
                })()}
              </View>
            ) : null}

            <SectionHeader title={linkedDocuments.length ? 'Attached files' : 'No files attached yet'} />
            {linkedDocuments.map((document) => (
              <View key={document.id} style={[styles.documentRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.documentIcon, { backgroundColor: colors.primaryTint }]}><Text style={[styles.documentIconText, { color: colors.primary }]}>DOC</Text></View>
                <View style={styles.documentMeta}>
                  <Text style={[styles.documentName, { color: colors.textPrimary }]} numberOfLines={2}>{document.name}</Text>
                  <Text style={[styles.documentSub, { color: colors.textMuted }]}>{document.kind} · {WorkspaceService.formatFileSize(document.sizeBytes)} · {WorkspaceStorage.isPersisted(document) ? 'saved on device' : 'session only'}</Text>
                </View>
                <SecondaryButton label="Remove" onPress={() => removeDocument(document.id)} style={styles.removeButton} textStyle={{ fontSize: 11 }} />
              </View>
            ))}

            {selectedBid ? (
              <View style={[styles.nextStepCard, { backgroundColor: colors.warningTint, borderColor: colors.warning }]}>
                <Text style={[styles.nextStepTitle, { color: colors.warning }]}>Continue on GeM</Text>
                <View style={styles.handoffStatus}>
                  <StatusBadge label={selectedHandoff ? 'Portal handoff started' : 'Ready for official handoff'} tone="warning" />
                  <Text style={[styles.handoffText, { color: colors.textSecondary }]}>Authentication, MFA, upload, and final submission happen on the official GeM portal.</Text>
                </View>
                <Text style={[styles.nextStepText, { color: colors.textSecondary }]}>This app does not receive your GeM password, OTP, session cookie, or official submission confirmation.</Text>
                <PrimaryButton label="Open official GeM bid" onPress={openOfficialPortal} style={styles.fullButton} />
                <SecondaryButton label="View bid document in app" onPress={() => openOfficialBid(selectedBid)} style={styles.fullButton} />
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
      <BidDocumentViewer
        bid={documentBid}
        visible={!!documentBid}
        onClose={() => setDocumentBid(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: DESIGN_TOKENS.pagePaddingMobile, paddingBottom: 40 },
  pageTitle: { fontWeight: '800', letterSpacing: -0.4, marginTop: 8 },
  pageSubtitle: { fontSize: 13, lineHeight: 19, marginTop: 4, marginBottom: 16 },
  summaryCard: { borderRadius: DESIGN_TOKENS.cardRadius, borderWidth: DESIGN_TOKENS.borderWidth, borderTopWidth: 3, padding: 16, marginBottom: 16 },
  summaryEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  summaryTitle: { fontSize: 18, fontWeight: '800', marginTop: 5 },
  summaryMetrics: { flexDirection: 'row', gap: 18, marginTop: 18 },
  summaryMetric: { flex: 1 },
  summaryMetricValue: { fontSize: 18, fontWeight: '800' },
  summaryMetricLabel: { fontSize: 10, marginTop: 2, opacity: 0.86 },
  mainTabs: { marginBottom: 18 },
  filterRow: { gap: 8, paddingBottom: 12 },
  card: { borderRadius: DESIGN_TOKENS.cardRadius, borderWidth: DESIGN_TOKENS.borderWidth, padding: 14, marginBottom: 12 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  bidNumber: { flex: 1, fontSize: 10, fontWeight: '700', textAlign: 'right' },
  bidTitle: { fontWeight: '800', lineHeight: 20, marginTop: 10 },
  bidDepartment: { fontSize: 11, marginTop: 3, marginBottom: 12 },
  liveMeta: { flexDirection: 'row', borderRadius: 10, padding: 9, gap: 9 },
  metaCell: { flex: 1 },
  metaLabel: { fontSize: 9, fontWeight: '800' },
  metaValue: { fontSize: 11, fontWeight: '700', marginTop: 3 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionButton: { flex: 1, minHeight: 42 },
  emptyCard: { borderRadius: DESIGN_TOKENS.cardRadius, borderWidth: 1, padding: 18, marginTop: 4 },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  emptyText: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  sectionDescription: { fontSize: 12, lineHeight: 17, marginBottom: 14 },
  storageHint: { fontSize: 10.5, lineHeight: 15, marginTop: -8, marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '800', marginBottom: 6 },
  selectedBidCard: { borderRadius: DESIGN_TOKENS.cardRadius, borderWidth: 1, padding: 14, marginBottom: 14 },
  selectedBidEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  selectedBidTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', marginTop: 5 },
  selectedBidMeta: { fontSize: 11, lineHeight: 16, marginTop: 5, marginBottom: 8 },
  uploadCard: { borderRadius: DESIGN_TOKENS.cardRadius, borderWidth: 1, padding: 14, marginBottom: 16 },
  uploadTitle: { fontSize: 15, fontWeight: '800' },
  uploadText: { fontSize: 11.5, lineHeight: 17, marginTop: 5, marginBottom: 12 },
  fullButton: { alignSelf: 'stretch', marginTop: 4 },
  checklistCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16 },
  checklistTitle: { fontSize: 14, fontWeight: '800' },
  checklistProgress: { fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 10 },
  missingText: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  handoffStatus: { marginTop: 10 },
  handoffText: { fontSize: 11, lineHeight: 16, marginTop: 7 },
  nextStepCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 12 },
  nextStepTitle: { fontSize: 13, fontWeight: '800' },
  nextStepText: { fontSize: 11.5, lineHeight: 17, marginTop: 4, marginBottom: 10 },
  documentRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 10, marginBottom: 8 },
  documentIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  documentIconText: { fontSize: 10, fontWeight: '900' },
  documentMeta: { flex: 1, marginHorizontal: 10 },
  documentName: { fontSize: 12, fontWeight: '700' },
  documentSub: { fontSize: 10, marginTop: 3 },
  removeButton: { minHeight: 34, paddingHorizontal: 9 },
});
