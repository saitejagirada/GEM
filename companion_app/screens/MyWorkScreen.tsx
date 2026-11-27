import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import {
  COMPANY_LOCKER_SLOTS,
  CompanyDocLockerService,
  type CompanyDocSlotId,
  type CompanyLockerDocument,
} from '../services/CompanyDocLockerService';
import { formatDateSafe } from '../utils/formatters';
import { BidDocumentViewer } from './BidDocumentViewer';

export type PreparationSection = 'LIVE' | 'LOCKER' | 'DOCUMENTS';

interface MyWorkScreenProps {
  availableBids: DeconstructedBidDoc[];
  initialBidNumber?: string;
  initialSection?: PreparationSection;
  onOpenOfficialPortal?: () => void;
}

export const MyWorkScreen: React.FC<MyWorkScreenProps> = ({
  availableBids,
  initialBidNumber,
  initialSection,
  onOpenOfficialPortal,
}) => {
  const { colors, fontMultiplier } = useTheme();
  const [section, setSection] = useState<PreparationSection>(
    initialSection || (initialBidNumber ? 'DOCUMENTS' : 'LIVE')
  );
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [lockerDocs, setLockerDocs] = useState<CompanyLockerDocument[]>(() =>
    CompanyDocLockerService.getDocuments()
  );
  const [handoffs, setHandoffs] = useState<OfficialHandoffRecord[]>([]);
  const [selectedBidNumber, setSelectedBidNumber] = useState(
    initialBidNumber || availableBids[0]?.bidNumber || ''
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [documentBid, setDocumentBid] = useState<DeconstructedBidDoc | null>(null);
  const [expiryModalSlot, setExpiryModalSlot] = useState<CompanyDocSlotId | null>(null);
  const [expiryInput, setExpiryInput] = useState('');

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
    if (initialSection) {
      setSection(initialSection);
    } else if (initialBidNumber) {
      setSelectedBidNumber(initialBidNumber);
      setSection('DOCUMENTS');
    }
  }, [initialBidNumber, initialSection]);

  useEffect(() => {
    if (!selectedBidNumber && availableBids.length > 0) {
      setSelectedBidNumber(availableBids[0].bidNumber);
    }
  }, [availableBids, selectedBidNumber]);

  const loadWorkspace = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [storedDocuments, storedHandoffs, storedLocker] = await Promise.all([
        WorkspaceStorage.loadDocuments(),
        WorkspaceStorage.loadHandoffs(),
        CompanyDocLockerService.hydrate(true),
      ]);
      setDocuments(storedDocuments);
      setHandoffs(storedHandoffs);
      setLockerDocs(storedLocker);
      setWorkspaceLoaded(true);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
    return CompanyDocLockerService.subscribe(setLockerDocs);
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
      Alert.alert(
        'Open official GeM workspace',
        'The official GeM login page could not be opened on this device.'
      );
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
      Alert.alert(
        'Could not add document',
        'The device document picker returned an error. Please try again.'
      );
    }
  }, [documents, selectedBid]);

  const pickLockerSlotFile = useCallback(async (slotId: CompanyDocSlotId) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'image/*',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const existing = CompanyDocLockerService.getDocumentForSlot(slotId);
      await CompanyDocLockerService.saveSlotDocument(
        slotId,
        {
          name: asset.name,
          uri: asset.uri,
          mimeType: asset.mimeType,
          size: asset.size,
        },
        existing?.expiresAtIso
      );
    } catch {
      Alert.alert('Could not save document', 'Unable to pick a file right now. Please try again.');
    }
  }, []);

  const removeLockerSlotFile = useCallback((slotId: CompanyDocSlotId, title: string) => {
    Alert.alert('Remove from Company Locker?', `Remove saved ${title} from this device?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => void CompanyDocLockerService.removeSlotDocument(slotId),
      },
    ]);
  }, []);

  const openExpiryEditor = (slotId: CompanyDocSlotId) => {
    const doc = CompanyDocLockerService.getDocumentForSlot(slotId);
    setExpiryInput(doc?.expiresAtIso || '');
    setExpiryModalSlot(slotId);
  };

  const saveExpiryDate = async () => {
    if (!expiryModalSlot) return;
    const trimmed = expiryInput.trim();
    if (trimmed && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      Alert.alert('Use YYYY-MM-DD format', 'Enter expiry date as YYYY-MM-DD (e.g. 2027-03-31) or leave blank.');
      return;
    }
    await CompanyDocLockerService.updateExpiry(expiryModalSlot, trimmed || undefined);
    setExpiryModalSlot(null);
  };

  const removeDocument = useCallback(
    (documentId: string) => {
      Alert.alert(
        'Remove preparation file?',
        'This only removes the local copy from this workspace.',
        [
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
        ]
      );
    },
    [documents]
  );

  const clearLocalDocuments = useCallback(() => {
    if (!documents.length) return;
    Alert.alert(
      'Clear preparation files?',
      'This removes only the local bid-specific copies. Your Company Locker stays intact.',
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

  const expiringOrExpiredCount = useMemo(
    () =>
      lockerDocs.filter((d) => {
        const st = CompanyDocLockerService.getExpiryStatus(d.expiresAtIso);
        return st === 'EXPIRING_SOON' || st === 'EXPIRED';
      }).length,
    [lockerDocs]
  );

  const renderLiveBid = (bid: DeconstructedBidDoc) => (
    <View
      key={bid.bidNumber}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.cardTopRow}>
        <StatusBadge
          label={bid.isRa || bid.type === 'RA' ? 'LIVE RA' : 'LIVE BID'}
          tone={bid.isRa ? 'warning' : 'success'}
        />
        <Text style={[styles.bidNumber, { color: colors.textMuted }]}>{bid.bidNumber}</Text>
      </View>
      <Text style={[styles.bidTitle, { color: colors.textPrimary, fontSize: 15 * fontMultiplier }]}>
        {bid.title}
      </Text>
      <Text style={[styles.bidDepartment, { color: colors.textSecondary }]}>
        {[bid.department, bid.ministry].filter(Boolean).join(' · ') || 'Department unstated'}
      </Text>
      <View style={[styles.liveMeta, { backgroundColor: colors.surfaceSubtle }]}>
        <View style={styles.metaCell}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>CLOSES</Text>
          <Text style={[styles.metaValue, { color: colors.textPrimary }]}>
            {formatDateSafe(bid.closingTimeUtc)}
          </Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>SOURCE</Text>
          <Text style={[styles.metaValue, { color: colors.success }]}>GeM public feed</Text>
        </View>
      </View>
      <View style={styles.actionRow}>
        <SecondaryButton
          label="Open bid document"
          onPress={() => openOfficialBid(bid)}
          style={styles.actionButton}
        />
        <PrimaryButton
          label="Prepare documents"
          onPress={() => selectBidForPreparation(bid.bidNumber)}
          style={styles.actionButton}
        />
      </View>
    </View>
  );

  const selectedTabLabel =
    section === 'LIVE' ? 'Live bids' : section === 'LOCKER' ? 'Company Locker' : 'Bid Workspace';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <DataNotice>
        Private on-device workspace · Company Locker &amp; bid files stay strictly on your phone until
        you upload on GeM.
      </DataNotice>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={loadWorkspace}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[styles.pageTitle, { color: colors.textPrimary, fontSize: 22 * fontMultiplier }]}
        >
          Document Preparation &amp; Locker
        </Text>
        <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
          Store your master company PDFs once in Company Locker — they auto-match every new tender
          checklist and eligibility check.
        </Text>

        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderTopColor: colors.saffron,
            },
          ]}
        >
          <Text style={[styles.summaryEyebrow, { color: colors.primary }]}>
            ON-DEVICE READINESS
          </Text>
          <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
            {lockerDocs.length} of {COMPANY_LOCKER_SLOTS.length} master company docs ready
          </Text>
          <View style={styles.summaryMetrics}>
            <View style={styles.summaryMetric}>
              <Text style={[styles.summaryMetricValue, { color: colors.success }]}>
                {lockerDocs.length}/{COMPANY_LOCKER_SLOTS.length}
              </Text>
              <Text style={[styles.summaryMetricLabel, { color: colors.textSecondary }]}>
                company locker
              </Text>
            </View>
            <View style={styles.summaryMetric}>
              <Text style={[styles.summaryMetricValue, { color: colors.primary }]}>
                {linkedDocuments.length}
              </Text>
              <Text style={[styles.summaryMetricLabel, { color: colors.textSecondary }]}>
                for selected bid
              </Text>
            </View>
            <View style={styles.summaryMetric}>
              <Text
                style={[
                  styles.summaryMetricValue,
                  { color: expiringOrExpiredCount > 0 ? colors.danger : colors.primary },
                ]}
              >
                {expiringOrExpiredCount}
              </Text>
              <Text style={[styles.summaryMetricLabel, { color: colors.textSecondary }]}>
                expiry alerts
              </Text>
            </View>
          </View>
        </View>

        <SegmentedTabs
          options={['Live bids', 'Company Locker', 'Bid Workspace']}
          selected={selectedTabLabel}
          onSelect={(value) =>
            setSection(
              value === 'Live bids' ? 'LIVE' : value === 'Company Locker' ? 'LOCKER' : 'DOCUMENTS'
            )
          }
          style={styles.mainTabs}
        />

        {section === 'LIVE' ? (
          <View>
            <SectionHeader title="Prepare from a live bid" />
            {availableBids.length > 0 ? (
              availableBids.slice(0, 20).map(renderLiveBid)
            ) : (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  No live bids loaded
                </Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Refresh the Bids tab to request the current public GeM feed.
                </Text>
              </View>
            )}
          </View>
        ) : section === 'LOCKER' ? (
          <View>
            <SectionHeader title="Reusable Company Doc Locker (7 GeM Slots)" />
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              Save your recurring certificates once on your phone. Every tender checklist &amp; Go/No-Go
              check automatically counts valid Locker documents.
            </Text>

            {COMPANY_LOCKER_SLOTS.map((slot) => {
              const saved = lockerDocs.find((d) => d.slotId === slot.id);
              const expStatus = CompanyDocLockerService.getExpiryStatus(saved?.expiresAtIso);
              const statusTone =
                expStatus === 'EXPIRED'
                  ? { bg: colors.dangerTint, fg: colors.danger, label: 'EXPIRED' }
                  : expStatus === 'EXPIRING_SOON'
                    ? { bg: colors.warningTint, fg: colors.warning, label: 'EXPIRING' }
                    : saved
                      ? { bg: colors.successTint, fg: colors.success, label: 'READY' }
                      : { bg: colors.surfaceSubtle, fg: colors.textMuted, label: 'MISSING' };

              return (
                <View
                  key={slot.id}
                  style={[
                    styles.lockerSlotCard,
                    { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                  ]}
                >
                  <View style={styles.lockerTopRow}>
                    <View
                      style={[
                        styles.lockerTagBox,
                        { backgroundColor: saved ? colors.successTint : colors.primaryTint },
                      ]}
                    >
                      <Text
                        style={[
                          styles.lockerTagText,
                          { color: saved ? colors.success : colors.primary },
                        ]}
                      >
                        {slot.shortTag}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.lockerSlotTitle, { color: colors.textPrimary }]}>
                        {slot.title}
                      </Text>
                      <Text
                        style={[styles.lockerSlotSub, { color: colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {saved
                          ? `${saved.name} · ${WorkspaceService.formatFileSize(saved.sizeBytes)}${saved.expiresAtIso ? ` · Exp ${saved.expiresAtIso}` : ''}`
                          : slot.hint}
                      </Text>
                    </View>
                    <View style={[styles.lockerStatusPill, { backgroundColor: statusTone.bg }]}>
                      <Text style={[styles.lockerStatusText, { color: statusTone.fg }]}>
                        {statusTone.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.lockerActionsRow}>
                    <Pressable
                      onPress={() => pickLockerSlotFile(slot.id)}
                      style={[
                        styles.lockerActionBtn,
                        {
                          backgroundColor: saved ? colors.surfaceSubtle : colors.primaryTint,
                          borderColor: saved ? colors.borderSubtle : colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.lockerActionText,
                          { color: saved ? colors.textPrimary : colors.primary },
                        ]}
                      >
                        {saved ? 'Replace File' : '+ Add PDF / File'}
                      </Text>
                    </Pressable>

                    {saved ? (
                      <>
                        <Pressable
                          onPress={() => openExpiryEditor(slot.id)}
                          style={[
                            styles.lockerActionBtn,
                            {
                              backgroundColor: colors.surfaceSubtle,
                              borderColor: colors.borderSubtle,
                            },
                          ]}
                        >
                          <Text style={[styles.lockerActionText, { color: colors.textPrimary }]}>
                            {saved.expiresAtIso ? 'Edit Expiry' : 'Set Expiry'}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => removeLockerSlotFile(slot.id, slot.title)}
                          style={[
                            styles.lockerRemoveBtn,
                            {
                              backgroundColor: colors.surfaceSubtle,
                              borderColor: colors.borderSubtle,
                            },
                          ]}
                          accessibilityLabel={`Remove ${slot.title}`}
                        >
                          <Text style={[styles.lockerActionText, { color: colors.danger }]}>✕</Text>
                        </Pressable>
                      </>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View>
            <SectionHeader
              title="Bid-Specific Response Workspace"
              actionLabel={documents.length ? 'Clear files' : undefined}
              onAction={clearLocalDocuments}
            />
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              Files are private preparation copies. The app never uploads them to GeM automatically.
            </Text>
            <Text style={[styles.storageHint, { color: colors.textMuted }]}>
              {workspaceLoaded
                ? `${documents.filter((document) => WorkspaceStorage.isPersisted(document)).length} bid file${documents.filter((document) => WorkspaceStorage.isPersisted(document)).length === 1 ? '' : 's'} + ${lockerDocs.length} Company Locker doc${lockerDocs.length === 1 ? '' : 's'} saved on this device`
                : 'Loading saved workspace files…'}
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Prepare for live bid
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {availableBids.slice(0, 20).map((bid) => (
                <CompactChip
                  key={bid.bidNumber}
                  label={bid.bidNumber}
                  selected={selectedBidNumber === bid.bidNumber}
                  onPress={() => setSelectedBidNumber(bid.bidNumber)}
                />
              ))}
            </ScrollView>

            {selectedBid ? (
              <View
                style={[
                  styles.selectedBidCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.selectedBidEyebrow, { color: colors.primary }]}>
                  SELECTED LIVE BID
                </Text>
                <Text style={[styles.selectedBidTitle, { color: colors.textPrimary }]}>
                  {selectedBid.title}
                </Text>
                <Text style={[styles.selectedBidMeta, { color: colors.textSecondary }]}>
                  {selectedBid.bidNumber} · closes {formatDateSafe(selectedBid.closingTimeUtc)}
                </Text>
                <SecondaryButton
                  label="Open official bid document"
                  onPress={() => openOfficialBid(selectedBid)}
                  style={styles.fullButton}
                />
              </View>
            ) : null}

            {/* Auto-Matched Checklist with Company Doc Locker */}
            {selectedBid ? (
              <View
                style={[
                  styles.checklistCard,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                ]}
              >
                <View style={styles.cardTopRow}>
                  <Text style={[styles.checklistTitle, { color: colors.textPrimary }]}>
                    Auto-Matched Checklist
                  </Text>
                  <StatusBadge
                    label={selectedBid.requiredDocuments?.length ? 'Locker Auto-Match' : 'Check PDF'}
                    tone={selectedBid.requiredDocuments?.length ? 'success' : 'warning'}
                  />
                </View>
                {(() => {
                  const reqs = selectedBid.requiredDocuments || [];
                  if (reqs.length === 0) {
                    return (
                      <Text style={[styles.checklistProgress, { color: colors.textSecondary }]}>
                        {lockerDocs.length > 0
                          ? `${lockerDocs.length} Company Locker master files ready. Open the bid PDF to confirm any bid-specific attachments (OEM MAF / MII).`
                          : 'Add your GST, Udyam & Turnover PDFs in Company Locker so every bid auto-matches them.'}
                      </Text>
                    );
                  }
                  const match = CompanyDocLockerService.matchBidChecklistWithLocker(
                    reqs,
                    linkedDocuments,
                    lockerDocs
                  );
                  return (
                    <>
                      <Text style={[styles.checklistProgress, { color: colors.primary }]}>
                        {match.readyCount} of {match.totalRequired} ready
                        {match.matchedFromLocker.length > 0
                          ? ` (${match.matchedFromLocker.length} auto-matched from Company Locker)`
                          : ''}
                      </Text>
                      {match.matchedFromLocker.map((m) => (
                        <Text
                          key={`lk-${m.requirement}`}
                          style={[styles.matchedLockerText, { color: colors.success }]}
                        >
                          ✓ {m.requirement} — Locker: {m.doc.name}
                        </Text>
                      ))}
                      {match.missingRequirements.slice(0, 6).map((missing) => (
                        <Text
                          key={missing}
                          style={[styles.missingText, { color: colors.textSecondary }]}
                        >
                          • Missing: {missing}
                        </Text>
                      ))}
                    </>
                  );
                })()}
              </View>
            ) : null}

            <View
              style={[
                styles.uploadCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.uploadTitle, { color: colors.textPrimary }]}>
                Add bid-specific files
              </Text>
              <Text style={[styles.uploadText, { color: colors.textSecondary }]}>
                Add OEM MAF, MII declaration, or BOQ pricing sheets specific to this tender.
              </Text>
              <SecondaryButton
                label={workspaceLoaded ? 'Choose files from device' : 'Loading workspace…'}
                icon="＋"
                onPress={pickDocuments}
                disabled={!workspaceLoaded || !selectedBid}
                style={styles.fullButton}
              />
            </View>

            <SectionHeader
              title={linkedDocuments.length ? 'Bid-specific attached files' : 'No bid-specific files attached yet'}
            />
            {linkedDocuments.map((document) => (
              <View
                key={document.id}
                style={[
                  styles.documentRow,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={[styles.documentIcon, { backgroundColor: colors.primaryTint }]}>
                  <Text style={[styles.documentIconText, { color: colors.primary }]}>DOC</Text>
                </View>
                <View style={styles.documentMeta}>
                  <Text style={[styles.documentName, { color: colors.textPrimary }]} numberOfLines={2}>
                    {document.name}
                  </Text>
                  <Text style={[styles.documentSub, { color: colors.textMuted }]}>
                    {document.kind} · {WorkspaceService.formatFileSize(document.sizeBytes)} ·{' '}
                    {WorkspaceStorage.isPersisted(document) ? 'saved on device' : 'session only'}
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

            {selectedBid ? (
              <View
                style={[
                  styles.nextStepCard,
                  { backgroundColor: colors.warningTint, borderColor: colors.warning },
                ]}
              >
                <Text style={[styles.nextStepTitle, { color: colors.warning }]}>
                  Continue on GeM
                </Text>
                <View style={styles.handoffStatus}>
                  <StatusBadge
                    label={selectedHandoff ? 'Portal handoff started' : 'Ready for official handoff'}
                    tone="warning"
                  />
                  <Text style={[styles.handoffText, { color: colors.textSecondary }]}>
                    Authentication, MFA, upload, and final submission happen on the official GeM
                    portal.
                  </Text>
                </View>
                <Text style={[styles.nextStepText, { color: colors.textSecondary }]}>
                  This app does not receive your GeM password, OTP, session cookie, or official
                  submission confirmation.
                </Text>
                <PrimaryButton
                  label="Open official GeM bid"
                  onPress={openOfficialPortal}
                  style={styles.fullButton}
                />
                <SecondaryButton
                  label="View bid document in app"
                  onPress={() => openOfficialBid(selectedBid)}
                  style={styles.fullButton}
                />
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Optional Expiry Date Reminder Modal */}
      <Modal
        visible={expiryModalSlot !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setExpiryModalSlot(null)}
      >
        <View style={styles.expiryBackdrop}>
          <View
            style={[
              styles.expiryCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.expiryTitle, { color: colors.textPrimary }]}>
              Set Certificate Expiry Reminder
            </Text>
            <Text style={[styles.expirySub, { color: colors.textSecondary }]}>
              Enter expiry date (YYYY-MM-DD) to get an alert 30 days before expiry. Leave blank to
              clear.
            </Text>
            <TextInput
              style={[
                styles.expiryInput,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.borderSubtle,
                  color: colors.textPrimary,
                },
              ]}
              value={expiryInput}
              onChangeText={setExpiryInput}
              placeholder="e.g. 2027-03-31"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.expiryBtns}>
              <SecondaryButton
                label="Cancel"
                onPress={() => setExpiryModalSlot(null)}
                style={{ flex: 1 }}
              />
              <PrimaryButton label="Save Date" onPress={saveExpiryDate} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

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
  pageSubtitle: { fontSize: 12.5, lineHeight: 18, marginTop: 4, marginBottom: 14 },
  summaryCard: {
    borderRadius: DESIGN_TOKENS.cardRadius,
    borderWidth: DESIGN_TOKENS.borderWidth,
    borderTopWidth: 3,
    padding: 15,
    marginBottom: 14,
  },
  summaryEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  summaryTitle: { fontSize: 16.5, fontWeight: '800', marginTop: 4 },
  summaryMetrics: { flexDirection: 'row', gap: 14, marginTop: 14 },
  summaryMetric: { flex: 1 },
  summaryMetricValue: { fontSize: 17, fontWeight: '800' },
  summaryMetricLabel: { fontSize: 10, marginTop: 2, opacity: 0.86 },
  mainTabs: { marginBottom: 16 },
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
  liveMeta: { flexDirection: 'row', borderRadius: 10, padding: 9, gap: 9 },
  metaCell: { flex: 1 },
  metaLabel: { fontSize: 9, fontWeight: '800' },
  metaValue: { fontSize: 11, fontWeight: '700', marginTop: 3 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionButton: { flex: 1, minHeight: 42 },
  emptyCard: { borderRadius: DESIGN_TOKENS.cardRadius, borderWidth: 1, padding: 18, marginTop: 4 },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  emptyText: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  sectionDescription: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  storageHint: { fontSize: 10.5, lineHeight: 15, marginTop: -6, marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '800', marginBottom: 6 },
  selectedBidCard: {
    borderRadius: DESIGN_TOKENS.cardRadius,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  selectedBidEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  selectedBidTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', marginTop: 5 },
  selectedBidMeta: { fontSize: 11, lineHeight: 16, marginTop: 5, marginBottom: 8 },
  uploadCard: {
    borderRadius: DESIGN_TOKENS.cardRadius,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  uploadTitle: { fontSize: 15, fontWeight: '800' },
  uploadText: { fontSize: 11.5, lineHeight: 17, marginTop: 5, marginBottom: 12 },
  fullButton: { alignSelf: 'stretch', marginTop: 4 },
  checklistCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 14 },
  checklistTitle: { fontSize: 14, fontWeight: '800' },
  checklistProgress: { fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 8 },
  matchedLockerText: { fontSize: 11.5, fontWeight: '700', lineHeight: 16, marginTop: 4 },
  missingText: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  handoffStatus: { marginTop: 10 },
  handoffText: { fontSize: 11, lineHeight: 16, marginTop: 7 },
  nextStepCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 12 },
  nextStepTitle: { fontSize: 13, fontWeight: '800' },
  nextStepText: { fontSize: 11.5, lineHeight: 17, marginTop: 4, marginBottom: 10 },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentIconText: { fontSize: 10, fontWeight: '900' },
  documentMeta: { flex: 1, marginHorizontal: 10 },
  documentName: { fontSize: 12, fontWeight: '700' },
  documentSub: { fontSize: 10, marginTop: 3 },
  removeButton: { minHeight: 34, paddingHorizontal: 9 },
  lockerSlotCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  lockerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  lockerTagBox: {
    minWidth: 54,
    height: 34,
    borderRadius: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockerTagText: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.3 },
  lockerSlotTitle: { fontSize: 13.5, fontWeight: '800' },
  lockerSlotSub: { fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  lockerStatusPill: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  lockerStatusText: { fontSize: 9.5, fontWeight: '900' },
  lockerActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  lockerActionBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  lockerRemoveBtn: {
    width: 40,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockerActionText: { fontSize: 12, fontWeight: '800' },
  expiryBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'center',
    padding: 20,
  },
  expiryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  expiryTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  expirySub: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  expiryInput: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    fontSize: 14,
    marginBottom: 14,
  },
  expiryBtns: { flexDirection: 'row', gap: 10 },
});
