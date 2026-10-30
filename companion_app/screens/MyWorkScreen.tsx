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
import type {
  DeconstructedBidDoc,
  ParticipatedBid,
  WorkspaceDocument,
} from '../types/index';
import { DataNotice } from '../components/DataNotice';
import {
  CompactChip,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  SegmentedTabs,
  StatusBadge,
} from '../components/SharedUI';
import { PortalApiClient } from '../services/PortalApiClient';
import { PortalDocService } from '../services/PortalDocService';
import { SupabaseClient } from '../services/SupabaseClient';
import { WorkspaceService } from '../services/WorkspaceService';
import { WorkspaceStorage } from '../services/WorkspaceStorage';
import { formatDateSafe, formatInr } from '../utils/formatters';

type WorkspaceSection = 'BIDS' | 'DOCUMENTS';
type BidFilter = 'ALL' | 'ACTIVE' | 'AWARDED';

interface MyWorkScreenProps {
  availableBids: DeconstructedBidDoc[];
}

export const MyWorkScreen: React.FC<MyWorkScreenProps> = ({ availableBids }) => {
  const { colors, fontMultiplier } = useTheme();
  const [section, setSection] = useState<WorkspaceSection>('BIDS');
  const [bidFilter, setBidFilter] = useState<BidFilter>('ACTIVE');
  const [portfolio, setPortfolio] = useState<ParticipatedBid[]>([]);
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [selectedBidNumber, setSelectedBidNumber] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);

  const loadPortfolio = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [remoteRecords, vendorRecords, localRecords] = await Promise.all([
        PortalApiClient.getPortfolio(),
        SupabaseClient.getVendorPortfolio('usr-agent-001'),
        WorkspaceStorage.loadPortfolio(),
      ]);
      const records = WorkspaceStorage.mergePortfolioRecords([
        ...remoteRecords,
        ...vendorRecords,
        ...localRecords,
      ]);
      setPortfolio(records);
      setSelectedBidNumber((current) => current || records[0]?.bidNumber || '');
    } catch {
      const [fallback, localRecords] = await Promise.all([
        SupabaseClient.getVendorPortfolio('usr-agent-001'),
        WorkspaceStorage.loadPortfolio(),
      ]);
      const records = WorkspaceStorage.mergePortfolioRecords([...fallback, ...localRecords]);
      setPortfolio(records);
      setSelectedBidNumber((current) => current || records[0]?.bidNumber || '');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  useEffect(() => {
    let isMounted = true;
    WorkspaceStorage.loadDocuments().then((storedDocuments) => {
      if (!isMounted) return;
      setDocuments(storedDocuments);
      setWorkspaceLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeBids = useMemo(
    () => portfolio.filter((bid) => bid.stage !== 'AWARDED_L1' && bid.stage !== 'DISQUALIFIED'),
    [portfolio]
  );
  const awardedBids = useMemo(
    () => portfolio.filter((bid) => bid.stage === 'AWARDED_L1'),
    [portfolio]
  );
  const visibleBids = useMemo(() => {
    if (bidFilter === 'ACTIVE') return activeBids;
    if (bidFilter === 'AWARDED') return awardedBids;
    return portfolio;
  }, [activeBids, awardedBids, bidFilter, portfolio]);

  const selectedBid = portfolio.find((bid) => bid.bidNumber === selectedBidNumber);
  const selectedAvailableBid = availableBids.find((bid) => bid.bidNumber === selectedBidNumber);
  const linkedDocuments = documents.filter((doc) => doc.linkedBidNumber === selectedBidNumber);

  const openOfficialBid = useCallback((bidNumber?: string) => {
    const target = PortalDocService.resolvePdfUrl(bidNumber);
    Linking.openURL(target).catch(() => {
      Alert.alert('Open official GeM portal', 'The official bid page could not be opened on this device.');
    });
  }, []);

  const openOfficialPortal = useCallback(() => {
    Linking.openURL('https://mkp.gem.gov.in').catch(() => {
      Alert.alert('Open official GeM portal', 'The official marketplace could not be opened on this device.');
    });
  }, []);

  const pickDocuments = useCallback(async () => {
    if (!selectedBidNumber) {
      Alert.alert('Choose a bid first', 'Select the bid this document is being prepared for.');
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
        selectedBidNumber,
        documents
      );

      setDocuments(persisted.documents);
      setSection('DOCUMENTS');
      Alert.alert(
        persisted.persistedCount > 0 ? 'Saved to local workspace' : 'Added for this session',
        String(result.assets.length) +
          ' document' +
          (result.assets.length === 1 ? '' : 's') +
          (persisted.sessionOnlyCount > 0
            ? ' ready for review. Some files are session-only because device storage was unavailable.'
            : ' saved on this device for review. Nothing was uploaded to GeM.')
      );
    } catch {
      Alert.alert('Could not add document', 'The device document picker returned an error. Please try again.');
    }
  }, [documents, selectedBidNumber]);

  const removeDocument = useCallback((documentId: string) => {
    Alert.alert('Remove local document?', 'This only removes the preparation copy from this workspace.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const document = documents.find((item) => item.id === documentId);
          if (document) await WorkspaceStorage.removeDocument(document);
          setDocuments((current) => current.filter((doc) => doc.id !== documentId));
        },
      },
    ]);
  }, [documents]);

  const clearLocalDocuments = useCallback(() => {
    if (documents.length === 0) return;

    Alert.alert(
      'Clear local workspace files?',
      'This removes the preparation copies and their local metadata. It does not affect GeM.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear files',
          style: 'destructive',
          onPress: async () => {
            await WorkspaceStorage.clearDocuments(documents);
            setDocuments([]);
          },
        },
      ]
    );
  }, [documents]);

  const renderBidCard = (bid: ParticipatedBid) => {
    const linked = documents.filter((doc) => doc.linkedBidNumber === bid.bidNumber);
    const available = availableBids.find((candidate) => candidate.bidNumber === bid.bidNumber);
    const checklist = WorkspaceService.getChecklist(bid, available, documents);
    const tone =
      bid.stage === 'AWARDED_L1' ? 'success' : bid.stage === 'DISQUALIFIED' ? 'danger' : 'neutral';

    return (
      <View key={bid.bidNumber + '-' + bid.stage} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardTopRow}>
          <StatusBadge label={WorkspaceService.getStageLabel(bid.stage)} tone={tone} />
          <Text style={[styles.bidNumber, { color: colors.textMuted }]}>{bid.bidNumber}</Text>
        </View>
        <Text style={[styles.bidTitle, { color: colors.textPrimary, fontSize: 15 * fontMultiplier }]}>
          {bid.itemTitle}
        </Text>
        <Text style={[styles.bidDepartment, { color: colors.textSecondary }]}>{bid.department}</Text>

        <View style={[styles.metaGrid, { backgroundColor: colors.surfaceSubtle }]}>
          <View style={styles.metaCell}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>SUBMITTED</Text>
            <Text style={[styles.metaValue, { color: colors.textPrimary }]}>
              {formatDateSafe(bid.submittedAtUtc)}
            </Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>QUOTED</Text>
            <Text style={[styles.metaValue, { color: colors.textPrimary }]}>
              ₹{formatInr(bid.quotedPriceInr)}
            </Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>LOCAL DOCS</Text>
            <Text style={[styles.metaValue, { color: colors.primary }]}>
              {linked.length} attached
            </Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>CHECKLIST</Text>
            <Text style={[styles.metaValue, { color: checklist.isComplete ? colors.success : colors.warning }]}>
              {checklist.hasRequirements
                ? String(checklist.attachedCount) + '/' + String(checklist.requiredCount)
                : 'Not loaded'}
            </Text>
          </View>
        </View>

        {!checklist.hasRequirements && (
          <Text style={[styles.helperText, { color: colors.textMuted }]}>
            Requirements are not available in the local record. Verify the official bid document before submitting.
          </Text>
        )}

        <View style={styles.actionRow}>
          <SecondaryButton
            label="Prepare documents"
            onPress={() => {
              setSelectedBidNumber(bid.bidNumber);
              setSection('DOCUMENTS');
            }}
            style={styles.actionButton}
          />
          <PrimaryButton
            label="Open GeM"
            onPress={() => openOfficialBid(bid.bidNumber)}
            style={styles.actionButton}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <DataNotice>
        Phase 2 workspace · Saved files stay on this device for preparation. Nothing here is an official GeM submission.
      </DataNotice>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={loadPortfolio} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: colors.textPrimary, fontSize: 24 * fontMultiplier }]}>
          My work
        </Text>
        <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
          Keep submissions, checklists and supporting files together before you continue on GeM.
        </Text>

        <View style={[styles.summaryCard, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
          <Text style={[styles.summaryEyebrow, { color: colors.textInverse }]}>LOCAL WORKSPACE</Text>
          <Text style={[styles.summaryTitle, { color: colors.textInverse }]}>
            {activeBids.length} active bid{activeBids.length === 1 ? '' : 's'} to follow
          </Text>
          <View style={styles.summaryMetrics}>
            <View style={styles.summaryMetric}>
              <Text style={[styles.summaryMetricValue, { color: colors.textInverse }]}>{portfolio.length}</Text>
              <Text style={[styles.summaryMetricLabel, { color: colors.textInverse }]}>records</Text>
            </View>
            <View style={styles.summaryMetric}>
              <Text style={[styles.summaryMetricValue, { color: colors.textInverse }]}>{awardedBids.length}</Text>
              <Text style={[styles.summaryMetricLabel, { color: colors.textInverse }]}>awarded records</Text>
            </View>
            <View style={styles.summaryMetric}>
              <Text style={[styles.summaryMetricValue, { color: colors.textInverse }]}>{documents.length}</Text>
              <Text style={[styles.summaryMetricLabel, { color: colors.textInverse }]}>local files</Text>
            </View>
          </View>
        </View>

        <SegmentedTabs
          options={['My bids', 'Documents']}
          selected={section === 'BIDS' ? 'My bids' : 'Documents'}
          onSelect={(value) => setSection(value === 'My bids' ? 'BIDS' : 'DOCUMENTS')}
          style={styles.mainTabs}
        />

        {section === 'BIDS' ? (
          <View>
            <SectionHeader
              title="Previous bids"
              actionLabel="Refresh"
              onAction={loadPortfolio}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {(['ACTIVE', 'AWARDED', 'ALL'] as BidFilter[]).map((filter) => (
                <CompactChip
                  key={filter}
                  label={filter === 'ACTIVE' ? 'Active' : filter === 'AWARDED' ? 'Awarded' : 'All records'}
                  selected={bidFilter === filter}
                  onPress={() => setBidFilter(filter)}
                />
              ))}
            </ScrollView>

            {visibleBids.length > 0 ? (
              visibleBids.map(renderBidCard)
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No records in this view</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Add a bid from the bid inspector to start tracking it in your local workspace.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View>
            <SectionHeader
              title="Document workspace"
              actionLabel={documents.length > 0 ? 'Clear local files' : undefined}
              onAction={clearLocalDocuments}
            />
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              Select a bid, choose supporting files from your device, then review the checklist before opening GeM.
            </Text>

            <Text style={[styles.storageHint, { color: colors.textMuted }]}>
              {workspaceLoaded
                ? documents.filter((document) => WorkspaceStorage.isPersisted(document)).length +
                  ' file' +
                  (documents.filter((document) => WorkspaceStorage.isPersisted(document)).length === 1 ? '' : 's') +
                  ' saved on this device'
                : 'Loading saved workspace files…'}
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Attach to bid</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {portfolio.slice(0, 8).map((bid) => (
                <CompactChip
                  key={bid.bidNumber}
                  label={bid.bidNumber}
                  selected={selectedBidNumber === bid.bidNumber}
                  onPress={() => setSelectedBidNumber(bid.bidNumber)}
                />
              ))}
            </ScrollView>

            <View style={[styles.uploadCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.uploadTitle, { color: colors.textPrimary }]}>
                Add files for {selectedBidNumber || 'a selected bid'}
              </Text>
              <Text style={[styles.uploadText, { color: colors.textSecondary }]}>
                PDFs, images, Word and spreadsheet files are copied into app-private storage when available. They are never uploaded to GeM automatically.
              </Text>
              <SecondaryButton
                label={workspaceLoaded ? 'Choose files from device' : 'Loading workspace…'}
                icon="＋"
                onPress={pickDocuments}
                disabled={!workspaceLoaded}
                style={styles.fullButton}
              />
            </View>

            {selectedBid && (
              <View style={[styles.checklistCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <View style={styles.cardTopRow}>
                  <Text style={[styles.checklistTitle, { color: colors.textPrimary }]}>Preflight checklist</Text>
                  <StatusBadge
                    label={selectedAvailableBid ? 'Requirements loaded' : 'Review on GeM'}
                    tone={selectedAvailableBid ? 'success' : 'warning'}
                  />
                </View>
                {(() => {
                  const checklist = WorkspaceService.getChecklist(selectedBid, selectedAvailableBid, documents);
                  return checklist.hasRequirements ? (
                    <>
                      <Text style={[styles.checklistProgress, { color: colors.primary }]}>
                        {checklist.attachedCount} of {checklist.requiredCount} requirement names matched
                      </Text>
                      {checklist.missingDocuments.slice(0, 4).map((missing) => (
                        <Text key={missing} style={[styles.missingText, { color: colors.textSecondary }]}>
                          • {missing}
                        </Text>
                      ))}
                    </>
                  ) : (
                    <Text style={[styles.checklistProgress, { color: colors.textSecondary }]}>
                      The local bid record does not contain a document checklist yet. Open the official bid page to confirm requirements.
                    </Text>
                  );
                })()}
              </View>
            )}

            <SectionHeader title={linkedDocuments.length ? 'Attached files' : 'No files attached yet'} />
            {linkedDocuments.map((document) => (
              <View key={document.id} style={[styles.documentRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.documentIcon, { backgroundColor: colors.primaryTint }]}>
                  <Text style={[styles.documentIconText, { color: colors.primary }]}>DOC</Text>
                </View>
                <View style={styles.documentMeta}>
                  <Text style={[styles.documentName, { color: colors.textPrimary }]} numberOfLines={2}>
                    {document.name}
                  </Text>
                  <Text style={[styles.documentSub, { color: colors.textMuted }]}>
                    {document.kind} · {WorkspaceService.formatFileSize(document.sizeBytes)} · {WorkspaceStorage.isPersisted(document) ? 'saved on device' : 'session only'}
                  </Text>
                </View>
                <SecondaryButton
                  label="Remove"
                  onPress={() => removeDocument(document.id)}
                  style={styles.removeButton}
                  textStyle={{ fontSize: 11 }}
                />
              </View>
            ))}

            <View style={[styles.nextStepCard, { backgroundColor: colors.warningTint, borderColor: colors.warning }]}>
              <Text style={[styles.nextStepTitle, { color: colors.warning }]}>Next step</Text>
              <Text style={[styles.nextStepText, { color: colors.textSecondary }]}>
                When your checklist is ready, open the official GeM portal, complete its login and 2FA, and upload or submit there.
              </Text>
              <PrimaryButton
                label="Continue on official GeM"
                onPress={openOfficialPortal}
                style={styles.fullButton}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: DESIGN_TOKENS.pagePaddingMobile, paddingBottom: 40 },
  pageTitle: { fontWeight: '800', letterSpacing: -0.4, marginTop: 8 },
  pageSubtitle: { fontSize: 13, lineHeight: 19, marginTop: 4, marginBottom: 16 },
  summaryCard: {
    borderRadius: DESIGN_TOKENS.cardRadius,
    borderWidth: DESIGN_TOKENS.borderWidth,
    padding: 16,
    marginBottom: 16,
  },
  summaryEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  summaryTitle: { fontSize: 18, fontWeight: '800', marginTop: 5 },
  summaryMetrics: { flexDirection: 'row', gap: 18, marginTop: 18 },
  summaryMetric: { flex: 1 },
  summaryMetricValue: { fontSize: 18, fontWeight: '800' },
  summaryMetricLabel: { fontSize: 10, marginTop: 2, opacity: 0.86 },
  mainTabs: { marginBottom: 18 },
  filterRow: { gap: 8, paddingBottom: 12 },
  card: {
    borderRadius: DESIGN_TOKENS.cardRadius,
    borderWidth: DESIGN_TOKENS.borderWidth,
    padding: 14,
    marginBottom: 12,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  bidNumber: { flex: 1, fontSize: 10, fontWeight: '700', textAlign: 'right' },
  bidTitle: { fontWeight: '800', lineHeight: 20, marginTop: 10 },
  bidDepartment: { fontSize: 11, marginTop: 3, marginBottom: 12 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 10, padding: 9, gap: 9 },
  metaCell: { width: '46%' },
  metaLabel: { fontSize: 9, fontWeight: '800' },
  metaValue: { fontSize: 11.5, fontWeight: '700', marginTop: 3 },
  helperText: { fontSize: 10.5, lineHeight: 15, marginTop: 9 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionButton: { flex: 1, minHeight: 42 },
  emptyCard: { borderRadius: DESIGN_TOKENS.cardRadius, borderWidth: 1, padding: 18, marginTop: 4 },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  emptyText: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  sectionDescription: { fontSize: 12, lineHeight: 17, marginBottom: 14 },
  storageHint: { fontSize: 10.5, lineHeight: 15, marginTop: -8, marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '800', marginBottom: 6 },
  uploadCard: { borderRadius: DESIGN_TOKENS.cardRadius, borderWidth: 1, padding: 14, marginTop: 4, marginBottom: 16 },
  uploadTitle: { fontSize: 15, fontWeight: '800' },
  uploadText: { fontSize: 11.5, lineHeight: 17, marginTop: 5, marginBottom: 12 },
  fullButton: { alignSelf: 'stretch', marginTop: 4 },
  checklistCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16 },
  checklistTitle: { fontSize: 14, fontWeight: '800' },
  checklistProgress: { fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 10 },
  missingText: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  documentRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 10, marginBottom: 8 },
  documentIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  documentIconText: { fontSize: 10, fontWeight: '900' },
  documentMeta: { flex: 1, marginHorizontal: 10 },
  documentName: { fontSize: 12, fontWeight: '700' },
  documentSub: { fontSize: 10, marginTop: 3 },
  removeButton: { minHeight: 34, paddingHorizontal: 9 },
  nextStepCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 12 },
  nextStepTitle: { fontSize: 13, fontWeight: '800' },
  nextStepText: { fontSize: 11.5, lineHeight: 17, marginTop: 4, marginBottom: 10 },
});
