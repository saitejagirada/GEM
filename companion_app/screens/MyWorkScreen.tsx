/**
 * GeM Mobile Companion App - Prepare Documents & Smart Company Vault Screen
 *
 * Apple HIG inset-grouped workspace uniting:
 * 1. Bid Packet: auto-scans the active tender PDF (works for Ongoing, Railways,
 *    Live RA, Concluded & searched bids), matches Company Vault + bid-specific
 *    files against every requirement, generates pre-filled compliance letters
 *    (MII, CA UDIN, OEM MAF), and supports 1-tap Share / Export & GeM handoff.
 * 2. Company Vault: unified Business Profile + 7-slot document vault (with
 *    multi-file CRAC & ISO/BIS support). Uploading a GST, Udyam, CA Turnover,
 *    or CRAC PDF locally parses real facts on-device and offers 1-tap profile sync.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../theme/ThemeContext';
import type {
  DeconstructedBidDoc,
  OfficialHandoffRecord,
  UserAgentProfile,
  WorkspaceDocument,
} from '../types/index';
import { CompactChip, SegmentedTabs } from '../components/SharedUI';
import { AppIcon } from '../components/AppIcons';
import { BusinessProfileModal } from '../components/BusinessProfileModal';
import { BusinessProfileService } from '../services/BusinessProfileService';
import {
  CompanyDocExtractor,
  type CompanyProfilePatch,
} from '../services/CompanyDocExtractor';
import {
  COMPANY_LOCKER_SLOTS,
  CompanyDocLockerService,
  type CompanyDocSlotId,
  type CompanyLockerDocument,
} from '../services/CompanyDocLockerService';
import { DisqualificationShieldEngine } from '../services/DisqualificationShieldEngine';
import type { ExtractedGeMTenderDetails } from '../services/GemPdfExtractor';
import {
  LocalPdfScanner,
  enrichBidWithPdfScan,
  type LocalPdfScanResult,
} from '../services/LocalPdfScanner';
import { WorkspaceService } from '../services/WorkspaceService';
import { WorkspaceStorage } from '../services/WorkspaceStorage';
import { formatDateSafe } from '../utils/formatters';
import { BidDocumentViewer } from './BidDocumentViewer';

export type PreparationSection = 'LIVE' | 'LOCKER' | 'DOCUMENTS';

interface MyWorkScreenProps {
  availableBids: DeconstructedBidDoc[];
  initialBid?: DeconstructedBidDoc | null;
  initialBidNumber?: string;
  initialSection?: PreparationSection;
  onOpenOfficialPortal?: () => void;
}

function normalizeSection(section?: PreparationSection): 'DOCUMENTS' | 'LOCKER' {
  return section === 'LOCKER' ? 'LOCKER' : 'DOCUMENTS';
}

export const MyWorkScreen: React.FC<MyWorkScreenProps> = ({
  availableBids,
  initialBid,
  initialBidNumber,
  initialSection,
  onOpenOfficialPortal,
}) => {
  const { colors, fontMultiplier } = useTheme();
  const [section, setSection] = useState<'DOCUMENTS' | 'LOCKER'>(() =>
    normalizeSection(initialSection)
  );
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [lockerDocs, setLockerDocs] = useState<CompanyLockerDocument[]>(() =>
    CompanyDocLockerService.getDocuments()
  );
  const [profile, setProfile] = useState<UserAgentProfile | null>(() =>
    BusinessProfileService.getProfile()
  );
  const [handoffs, setHandoffs] = useState<OfficialHandoffRecord[]>([]);
  const [selectedBidNumber, setSelectedBidNumber] = useState<string>(
    initialBid?.bidNumber || initialBidNumber || availableBids[0]?.bidNumber || ''
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);

  // Scanned PDF state for the currently selected bid (ensures Railway / RA / searched bids always have real checklists)
  const [bidScan, setBidScan] = useState<LocalPdfScanResult | null>(null);
  const [isScanningBid, setIsScanningBid] = useState(false);
  const [manualTicks, setManualTicks] = useState<Record<string, boolean>>({});

  // Modals
  const [documentBid, setDocumentBid] = useState<DeconstructedBidDoc | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [expiryTargetId, setExpiryTargetId] = useState<string | null>(null);
  const [expiryInput, setExpiryInput] = useState('');
  const [pendingExtractReview, setPendingExtractReview] = useState<{
    docName: string;
    patch: CompanyProfilePatch;
  } | null>(null);
  const [activeLetterDraft, setActiveLetterDraft] = useState<{
    title: string;
    content: string;
  } | null>(null);

  // Merge initialBid cleanly at the front so Railway / Live RA / searched bids are never dropped
  const allCandidateBids = useMemo(() => {
    const map = new Map<string, DeconstructedBidDoc>();
    if (initialBid?.bidNumber) map.set(initialBid.bidNumber, initialBid);
    for (const bid of availableBids) {
      if (bid?.bidNumber && !map.has(bid.bidNumber)) {
        map.set(bid.bidNumber, bid);
      }
    }
    return Array.from(map.values());
  }, [initialBid, availableBids]);

  const rawSelectedBid = useMemo(
    () => allCandidateBids.find((b) => b.bidNumber === selectedBidNumber) || allCandidateBids[0],
    [allCandidateBids, selectedBidNumber]
  );

  const selectedBid = useMemo(
    () => (rawSelectedBid ? enrichBidWithPdfScan(rawSelectedBid, bidScan) : undefined),
    [rawSelectedBid, bidScan]
  );

  const linkedDocuments = useMemo(
    () =>
      selectedBid
        ? documents.filter((document) => document.linkedBidNumber === selectedBid.bidNumber)
        : [],
    [documents, selectedBid]
  );
  const selectedHandoff = selectedBid
    ? handoffs.find((handoff) => handoff.bidNumber === selectedBid.bidNumber)
    : undefined;

  useEffect(() => {
    if (initialSection) {
      setSection(normalizeSection(initialSection));
    }
    const incomingNum = initialBid?.bidNumber || initialBidNumber;
    if (incomingNum) {
      setSelectedBidNumber(incomingNum);
      if (!initialSection) setSection('DOCUMENTS');
    }
  }, [initialBid?.bidNumber, initialBidNumber, initialSection]);

  useEffect(() => {
    if (!selectedBidNumber && allCandidateBids.length > 0) {
      setSelectedBidNumber(allCandidateBids[0].bidNumber);
    }
  }, [allCandidateBids, selectedBidNumber]);

  const loadWorkspace = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [storedDocuments, storedHandoffs, storedLocker, storedProfile] = await Promise.all([
        WorkspaceStorage.loadDocuments(),
        WorkspaceStorage.loadHandoffs(),
        CompanyDocLockerService.hydrate(true),
        BusinessProfileService.hydrate(true),
      ]);
      setDocuments(storedDocuments);
      setHandoffs(storedHandoffs);
      setLockerDocs(storedLocker);
      setProfile(storedProfile);
      setWorkspaceLoaded(true);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
    const unsubLocker = CompanyDocLockerService.subscribe(setLockerDocs);
    const unsubProfile = BusinessProfileService.subscribe(setProfile);
    const unsubDocs = WorkspaceStorage.subscribeDocuments(setDocuments);
    return () => {
      unsubLocker();
      unsubProfile();
      unsubDocs();
    };
  }, [loadWorkspace]);

  // Auto-load persisted checklist ticks + scan selected bid PDF when needed
  useEffect(() => {
    setBidScan(null);
    setManualTicks({});
    if (!rawSelectedBid) return;

    let cancelled = false;
    WorkspaceStorage.loadChecklistTicks(rawSelectedBid.bidNumber)
      .then((ticks) => {
        if (!cancelled) setManualTicks(ticks);
      })
      .catch(() => undefined);

    setIsScanningBid(true);
    LocalPdfScanner.scanBidDocuments(rawSelectedBid)
      .then((res) => {
        if (!cancelled) setBidScan(res);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsScanningBid(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rawSelectedBid?.bidNumber, rawSelectedBid?.docUrl, rawSelectedBid?.b_id]);

  // Compute live Eligibility Verdict + Readiness Checklist for selected bid
  const tenderDetailsForEngine = useMemo<ExtractedGeMTenderDetails | null>(() => {
    if (!selectedBid) return null;
    if (bidScan?.details?.extendedDetails) return bidScan.details.extendedDetails;
    return {
      bidNumber: selectedBid.bidNumber,
      title: selectedBid.title,
      department: selectedBid.department,
      ministry: selectedBid.ministry,
      estimatedValueInr: selectedBid.estimatedBidValueInr,
      emdAmountInr: selectedBid.emdAmountInr,
      isEmdExemptForMse: Boolean(selectedBid.isEmdExemptForMse),
      isEmdExemptForStartup: Boolean(selectedBid.isEmdExemptForStartup),
      epbgPercentage: selectedBid.epbgPercentage,
      epbgDurationMonths: selectedBid.epbgDurationMonths,
      minAnnualTurnoverInr: selectedBid.minAnnualTurnoverInr,
      yearsExperienceRequired: selectedBid.yearsExperienceRequired,
      pastPerformancePercentage: selectedBid.pastPerformancePercentage,
      msePurchasePreference: Boolean(selectedBid.msePurchasePreference),
      mseExemptionForExpAndTurnover: false,
      startupExemptionForExpAndTurnover: false,
      miiPurchasePreference: Boolean(selectedBid.miiPurchasePreference),
      miiClass: selectedBid.makeInIndiaClass,
      isSplittingApplied: Boolean(selectedBid.isSplittingApplied),
      splittingRatio: selectedBid.splittingRatio,
      deliveryPeriodDays: selectedBid.deliveryPeriodDays,
      consignees: (selectedBid.consignees || []).map((c, i) => ({
        sNo: i + 1,
        officer: c.reportingOfficer,
        address: c.location,
        pincode: c.pincode,
        state: c.state,
        quantity: c.quantity,
      })),
      consigneeStateDistribution: {},
      requiredDocuments: selectedBid.requiredDocuments || [],
      requiresOemAuthorization: false,
      requiresCaTurnoverCertificate: Boolean(selectedBid.minAnnualTurnoverInr),
      requiresMiiDeclaration: Boolean(selectedBid.miiPurchasePreference),
      requiresGstCertificate: true,
      requiresPastPerformanceDoc: Boolean(selectedBid.yearsExperienceRequired),
      atcClauses: [],
      isRaEnabled: Boolean(selectedBid.isRa),
    };
  }, [selectedBid, bidScan]);

  const combinedDocsForEngine = useMemo(
    () => [...linkedDocuments, ...CompanyDocLockerService.toWorkspaceDocuments(lockerDocs)],
    [linkedDocuments, lockerDocs]
  );

  const shieldReport = useMemo(() => {
    if (!profile || !tenderDetailsForEngine || !selectedBid) return null;
    return DisqualificationShieldEngine.evaluateShield(
      tenderDetailsForEngine,
      profile,
      combinedDocsForEngine,
      { isServiceTender: selectedBid.type === 'SERVICE' }
    );
  }, [profile, tenderDetailsForEngine, selectedBid, combinedDocsForEngine]);

  const checklistMatch = useMemo(() => {
    const reqs = selectedBid?.requiredDocuments || [];
    return CompanyDocLockerService.matchBidChecklistWithLocker(reqs, linkedDocuments, lockerDocs);
  }, [selectedBid?.requiredDocuments, linkedDocuments, lockerDocs]);

  const filledSlotCount = useMemo(
    () => CompanyDocLockerService.getFilledSlotCount(lockerDocs),
    [lockerDocs]
  );

  const expiringOrExpiredCount = useMemo(
    () =>
      lockerDocs.filter((d) => {
        const st = CompanyDocLockerService.getExpiryStatus(d.expiresAtIso);
        return st === 'EXPIRING_SOON' || st === 'EXPIRED';
      }).length,
    [lockerDocs]
  );

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
        'Open Official GeM Portal',
        'Could not open the GeM login page on this device.'
      );
    });
  }, [linkedDocuments, onOpenOfficialPortal, selectedBid]);

  const pickBidDocuments = useCallback(async () => {
    if (!selectedBid) {
      Alert.alert('Select a Tender', 'Choose a live tender before attaching bid-specific files.');
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
    } catch {
      Alert.alert('Could Not Add File', 'The device file picker returned an error. Please try again.');
    }
  }, [documents, selectedBid]);

  const pickLockerSlotFile = useCallback(
    async (slotId: CompanyDocSlotId) => {
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
        const slotMeta = COMPANY_LOCKER_SLOTS.find((s) => s.id === slotId);
        const existing = slotMeta?.allowMultiple
          ? undefined
          : CompanyDocLockerService.getDocumentForSlot(slotId);

        const saved = await CompanyDocLockerService.saveSlotDocument(
          slotId,
          {
            name: asset.name,
            uri: asset.uri,
            mimeType: asset.mimeType,
            size: asset.size,
          },
          existing?.expiresAtIso
        );

        if (saved.extracted?.hasReadableText) {
          const patch = CompanyDocExtractor.buildProfilePatch(saved.extracted, profile);
          if (patch.fields.length > 0) {
            setPendingExtractReview({ docName: saved.name, patch });
          }
        } else if (/pdf/i.test(asset.mimeType || '') || /\.pdf$/i.test(asset.name)) {
          Alert.alert(
            'Saved to Company Vault',
            'This PDF appears to be a scanned image without selectable text. It is stored in your Vault — you can update turnover/tier manually in Business Profile if needed.'
          );
        }
      } catch {
        Alert.alert('Could Not Save File', 'Unable to pick a file right now. Please try again.');
      }
    },
    [profile]
  );

  const applyExtractedProfilePatch = async () => {
    if (!pendingExtractReview) return;
    await BusinessProfileService.applyExtractedPatch(pendingExtractReview.patch);
    setPendingExtractReview(null);
  };

  const shareLocalFile = useCallback(async (name: string, uri: string, subtitle?: string) => {
    try {
      await Share.share(
        Platform.OS === 'ios'
          ? { title: name, url: uri, message: subtitle ? `${name} — ${subtitle}` : name }
          : {
              title: name,
              message: `${name}${subtitle ? `\n${subtitle}` : ''}\nSaved on device: ${uri}`,
            }
      );
    } catch {
      Alert.alert('Share Unavailable', 'Unable to open the share sheet for this file right now.');
    }
  }, []);

  const shareBidReadinessBrief = useCallback(async () => {
    if (!selectedBid) return;
    const lines = [
      `GeM Bid Readiness Packet — ${selectedBid.bidNumber}`,
      selectedBid.title,
      `Closes: ${formatDateSafe(selectedBid.closingTimeUtc)}`,
      '',
      `Company Vault Ready: ${filledSlotCount}/${COMPANY_LOCKER_SLOTS.length} slots`,
      `Checklist: ${checklistMatch.readyCount}/${checklistMatch.totalRequired} matched`,
    ];
    if (checklistMatch.matchedFromLocker.length > 0) {
      lines.push('', 'Covered by Company Vault:');
      checklistMatch.matchedFromLocker.forEach((m) =>
        lines.push(`✓ ${m.requirement} (${m.doc.name})`)
      );
    }
    if (checklistMatch.matchedFromBidFiles.length > 0) {
      lines.push('', 'Attached Bid-Specific Files:');
      checklistMatch.matchedFromBidFiles.forEach((m) =>
        lines.push(`✓ ${m.requirement} (${m.fileName})`)
      );
    }
    if (checklistMatch.missingRequirements.length > 0) {
      lines.push('', 'Still Pending:');
      checklistMatch.missingRequirements.forEach((req) => lines.push(`• ${req}`));
    }
    lines.push('', `Official GeM PDF: ${selectedBid.docUrl}`);
    await Share.share({ title: `Bid Packet ${selectedBid.bidNumber}`, message: lines.join('\n') }).catch(
      () => undefined
    );
  }, [selectedBid, filledSlotCount, checklistMatch]);

  const openLetterDraft = (kind: 'MII' | 'CA' | 'OEM') => {
    if (!tenderDetailsForEngine) return;
    const effectiveProfile: UserAgentProfile = profile || {
      id: 'draft-only',
      organizationName: '[Your Company Name]',
      msmeCategory: 'MICRO',
      annualTurnoverInr: 0,
      yearsExperience: 0,
      productCategories: [],
      targetStates: ['India'],
      isOem: true,
      hasUdyamCertificate: false,
    };
    if (kind === 'MII') {
      setActiveLetterDraft({
        title: 'Make in India (MII) Self-Declaration',
        content: DisqualificationShieldEngine.generateMiiTemplate(
          tenderDetailsForEngine,
          effectiveProfile
        ),
      });
    } else if (kind === 'CA') {
      setActiveLetterDraft({
        title: 'CA Turnover Certificate (UDIN) Request',
        content: DisqualificationShieldEngine.generateCaRequestTemplate(
          tenderDetailsForEngine,
          effectiveProfile
        ),
      });
    } else {
      setActiveLetterDraft({
        title: 'OEM Authorization (MAF) Request',
        content: DisqualificationShieldEngine.generateOemMafTemplate(
          tenderDetailsForEngine,
          effectiveProfile
        ),
      });
    }
  };

  const toggleManualChecklistItem = (req: string) => {
    if (!selectedBid) return;
    setManualTicks((prev) => {
      const next = { ...prev, [req]: !prev[req] };
      void WorkspaceStorage.saveChecklistTicks(selectedBid.bidNumber, next);
      return next;
    });
  };

  const removeDocument = useCallback(
    (documentId: string) => {
      Alert.alert(
        'Remove File from Bid Packet?',
        'This only removes the local copy from this tender packet.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              const doc = documents.find((item) => item.id === documentId);
              if (doc) await WorkspaceStorage.removeDocument(doc);
              setDocuments((current) => current.filter((item) => item.id !== documentId));
            },
          },
        ]
      );
    },
    [documents]
  );

  const clearSelectedBidDocuments = useCallback(() => {
    if (!selectedBid || linkedDocuments.length === 0) return;
    Alert.alert(
      `Clear files for ${selectedBid.bidNumber}?`,
      'Only files attached to this tender will be removed. Your Company Vault and other tenders stay intact.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Bid Files',
          style: 'destructive',
          onPress: async () => {
            const remaining = await WorkspaceStorage.clearDocumentsForBid(
              selectedBid.bidNumber,
              documents
            );
            setDocuments(remaining);
          },
        },
      ]
    );
  }, [selectedBid, linkedDocuments.length, documents]);

  const removeLockerDoc = useCallback((doc: CompanyLockerDocument) => {
    Alert.alert('Remove from Company Vault?', `Remove "${doc.name}" from this device?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => void CompanyDocLockerService.removeDocumentById(doc.id),
      },
    ]);
  }, []);

  const openExpiryEditor = (doc: CompanyLockerDocument) => {
    setExpiryInput(doc.expiresAtIso || '');
    setExpiryTargetId(doc.id);
  };

  const saveExpiryDate = async () => {
    if (!expiryTargetId) return;
    const trimmed = expiryInput.trim();
    if (trimmed && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      Alert.alert(
        'Use YYYY-MM-DD Format',
        'Enter expiry date as YYYY-MM-DD (e.g. 2027-03-31) or leave blank to clear.'
      );
      return;
    }
    await CompanyDocLockerService.updateExpiry(expiryTargetId, trimmed || undefined);
    setExpiryTargetId(null);
  };

  const lockerMatchMap = useMemo(
    () => new Map(checklistMatch.matchedFromLocker.map((m) => [m.requirement, m.doc])),
    [checklistMatch.matchedFromLocker]
  );
  const bidFileMatchMap = useMemo(
    () => new Map(checklistMatch.matchedFromBidFiles.map((m) => [m.requirement, m.fileName])),
    [checklistMatch.matchedFromBidFiles]
  );

  const requiredDocsList = selectedBid?.requiredDocuments || [];
  const totalReadyItems = requiredDocsList.filter(
    (req) => Boolean(lockerMatchMap.has(req) || bidFileMatchMap.has(req) || manualTicks[req])
  ).length;
  const readinessPct =
    requiredDocsList.length > 0 ? Math.round((totalReadyItems / requiredDocsList.length) * 100) : 0;

  const verdictPill = useMemo(() => {
    if (!profile) {
      return { label: 'Setup Profile', bg: colors.primaryTint, fg: colors.primary };
    }
    if (!shieldReport) {
      return { label: isScanningBid ? 'Checking…' : 'Profile Active', bg: colors.surfaceSubtle, fg: colors.textSecondary };
    }
    if (shieldReport.overallStatus === 'BATTLE_READY') {
      return { label: 'GO · Eligible', bg: colors.successTint, fg: colors.success };
    }
    if (shieldReport.overallStatus === 'ELEVATED_RISK') {
      return {
        label: `Caution · ${shieldReport.warningCount} Check${shieldReport.warningCount === 1 ? '' : 's'}`,
        bg: colors.warningTint,
        fg: colors.warning,
      };
    }
    return {
      label: `No-Go · ${shieldReport.criticalDisqualificationCount} Blocker${shieldReport.criticalDisqualificationCount === 1 ? '' : 's'}`,
      bg: colors.dangerTint,
      fg: colors.danger,
    };
  }, [profile, shieldReport, isScanningBid, colors]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Elevated Apple Sticky Header */}
      <View
        style={[
          styles.stickyHeader,
          { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle },
        ]}
      >
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
              {section === 'LOCKER' ? 'Company Vault' : 'Bid Packet'}
            </Text>
            <Text style={[styles.headerMeta, { color: colors.textSecondary }]}>
              {filledSlotCount}/{COMPANY_LOCKER_SLOTS.length} vault slots · {linkedDocuments.length}{' '}
              bid file{linkedDocuments.length === 1 ? '' : 's'}
              {expiringOrExpiredCount > 0 ? ` · ${expiringOrExpiredCount} expiry alert` : ''}
            </Text>
          </View>
          <Pressable
            onPress={() => setShowProfileModal(true)}
            style={({ pressed }) => [
              styles.profilePillBtn,
              { backgroundColor: colors.primaryTint, opacity: pressed ? 0.72 : 1 },
            ]}
          >
            <AppIcon name="profile" color={colors.primary} size={13} />
            <Text style={[styles.profilePillText, { color: colors.primary }]}>
              {profile ? 'Profile' : 'Setup'}
            </Text>
          </Pressable>
        </View>

        <SegmentedTabs
          options={['Bid Packet', 'Company Vault']}
          selected={section === 'LOCKER' ? 'Company Vault' : 'Bid Packet'}
          onSelect={(val) => setSection(val === 'Company Vault' ? 'LOCKER' : 'DOCUMENTS')}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={loadWorkspace}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {section === 'DOCUMENTS' ? (
          <>
            {/* 1. Active Tender Switcher */}
            {allCandidateBids.length > 0 ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionEyebrowRow}>
                  <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
                    ACTIVE TENDER
                  </Text>
                  {selectedBid ? (
                    <Pressable
                      onPress={() => setShowProfileModal(true)}
                      style={[styles.verdictChip, { backgroundColor: verdictPill.bg }]}
                    >
                      <Text style={[styles.verdictChipText, { color: verdictPill.fg }]}>
                        {verdictPill.label}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {allCandidateBids.length > 1 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.bidChipStrip}
                  >
                    {allCandidateBids.slice(0, 15).map((bid) => (
                      <CompactChip
                        key={bid.bidNumber}
                        label={bid.bidNumber}
                        selected={selectedBid?.bidNumber === bid.bidNumber}
                        onPress={() => setSelectedBidNumber(bid.bidNumber)}
                      />
                    ))}
                  </ScrollView>
                ) : null}

                {selectedBid ? (
                  <View
                    style={[
                      styles.card,
                      { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                    ]}
                  >
                    <View style={styles.cardPad}>
                      <Text
                        style={[
                          styles.bidTitle,
                          { color: colors.textPrimary, fontSize: 15.5 * fontMultiplier },
                        ]}
                        numberOfLines={2}
                      >
                        {selectedBid.title}
                      </Text>
                      <Text style={[styles.bidSub, { color: colors.textSecondary }]} numberOfLines={2}>
                        {[selectedBid.department, selectedBid.ministry !== selectedBid.department ? selectedBid.ministry : '']
                          .filter(Boolean)
                          .join(' · ')}{' '}
                        · Closes {formatDateSafe(selectedBid.closingTimeUtc)}
                      </Text>

                      <View style={styles.bidQuickActions}>
                        <Pressable
                          onPress={() => setDocumentBid(selectedBid)}
                          style={({ pressed }) => [
                            styles.pillBtn,
                            { backgroundColor: colors.surfaceSubtle, opacity: pressed ? 0.7 : 1 },
                          ]}
                        >
                          <AppIcon name="document" color={colors.primary} size={13} />
                          <Text style={[styles.pillBtnText, { color: colors.textPrimary }]}>
                            Read PDF
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={shareBidReadinessBrief}
                          style={({ pressed }) => [
                            styles.pillBtn,
                            { backgroundColor: colors.surfaceSubtle, opacity: pressed ? 0.7 : 1 },
                          ]}
                        >
                          <Text style={[styles.pillBtnText, { color: colors.textPrimary }]}>
                            Share Packet ↗
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={openOfficialPortal}
                          style={({ pressed }) => [
                            styles.pillBtn,
                            { backgroundColor: colors.primaryTint, opacity: pressed ? 0.72 : 1 },
                          ]}
                        >
                          <Text style={[styles.pillBtnText, { color: colors.primary }]}>
                            GeM Portal ↗
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.sectionBlock}>
                <View
                  style={[
                    styles.card,
                    styles.cardPad,
                    { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                  ]}
                >
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    No tender selected yet
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    Open any tender in Bids or Auctions and tap Prepare Docs to auto-build its
                    document checklist here.
                  </Text>
                </View>
              </View>
            )}

            {/* 2. Live Auto-Matched Bid Readiness Checklist */}
            {selectedBid ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionEyebrowRow}>
                  <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
                    TENDER CHECKLIST
                  </Text>
                  {isScanningBid ? (
                    <View style={styles.inlineStatus}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={[styles.eyebrowAction, { color: colors.primary }]}>
                        Scanning PDF…
                      </Text>
                    </View>
                  ) : requiredDocsList.length > 0 ? (
                    <Text
                      style={[
                        styles.eyebrowAction,
                        {
                          color:
                            totalReadyItems === requiredDocsList.length
                              ? colors.success
                              : colors.primary,
                        },
                      ]}
                    >
                      {totalReadyItems}/{requiredDocsList.length} Ready
                    </Text>
                  ) : (
                    <Pressable onPress={() => setSection('LOCKER')} hitSlop={8}>
                      <Text style={[styles.eyebrowAction, { color: colors.primary }]}>
                        Open Vault ›
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
                  {requiredDocsList.length > 0 ? (
                    <>
                      <View style={styles.progressWrap}>
                        <View
                          style={[styles.progressTrack, { backgroundColor: colors.surfaceSubtle }]}
                        >
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${readinessPct}%`,
                                backgroundColor:
                                  totalReadyItems === requiredDocsList.length
                                    ? colors.success
                                    : colors.primary,
                              },
                            ]}
                          />
                        </View>
                      </View>

                      {requiredDocsList.map((req, idx) => {
                        const vaultDoc = lockerMatchMap.get(req);
                        const bidFile = bidFileMatchMap.get(req);
                        const isChecked = Boolean(vaultDoc || bidFile || manualTicks[req]);
                        const suggestDraft: 'MII' | 'CA' | 'OEM' | null =
                          !isChecked && /mii|local\s*content|make\s*in\s*india/i.test(req)
                            ? 'MII'
                            : !isChecked && /turnover|udin|auditor/i.test(req)
                              ? 'CA'
                              : !isChecked && /oem|maf|manufacturer\s*auth/i.test(req)
                                ? 'OEM'
                                : null;

                        return (
                          <View key={`${req}-${idx}`}>
                            {idx > 0 ? (
                              <View
                                style={[
                                  styles.insetDivider,
                                  { backgroundColor: colors.borderSubtle, marginLeft: 50 },
                                ]}
                              />
                            ) : null}
                            <View style={styles.checkRow}>
                              <Pressable
                                onPress={() => toggleManualChecklistItem(req)}
                                hitSlop={8}
                                style={[
                                  styles.circleCheck,
                                  {
                                    borderColor: isChecked ? colors.success : colors.border,
                                    backgroundColor: isChecked ? colors.success : 'transparent',
                                  },
                                ]}
                              >
                                <Text style={[styles.circleCheckMark, { color: colors.textInverse }]}>
                                  {isChecked ? '✓' : ''}
                                </Text>
                              </Pressable>
                              <Pressable
                                style={{ flex: 1 }}
                                onPress={() => toggleManualChecklistItem(req)}
                              >
                                <Text
                                  style={[
                                    styles.checkTitle,
                                    {
                                      color: isChecked ? colors.textPrimary : colors.textSecondary,
                                      fontWeight: isChecked ? '600' : '400',
                                    },
                                  ]}
                                >
                                  {req}
                                </Text>
                                {vaultDoc ? (
                                  <Text
                                    style={[styles.checkMeta, { color: colors.success }]}
                                    numberOfLines={1}
                                  >
                                    Company Vault · {vaultDoc.name}
                                  </Text>
                                ) : bidFile ? (
                                  <Text
                                    style={[styles.checkMeta, { color: colors.primary }]}
                                    numberOfLines={1}
                                  >
                                    Bid Packet · {bidFile}
                                  </Text>
                                ) : (
                                  <Text style={[styles.checkMeta, { color: colors.textMuted }]}>
                                    Not attached yet
                                  </Text>
                                )}
                              </Pressable>

                              {!isChecked ? (
                                <Pressable
                                  onPress={() =>
                                    suggestDraft ? openLetterDraft(suggestDraft) : pickBidDocuments()
                                  }
                                  style={({ pressed }) => [
                                    styles.miniActionPill,
                                    {
                                      backgroundColor: colors.primaryTint,
                                      opacity: pressed ? 0.72 : 1,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[styles.miniActionText, { color: colors.primary }]}
                                  >
                                    {suggestDraft ? 'Draft ↗' : '+ Add'}
                                  </Text>
                                </Pressable>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </>
                  ) : (
                    <View style={styles.cardPad}>
                      <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                        {isScanningBid
                          ? 'Extracting exact required seller documents from the official GeM PDF…'
                          : filledSlotCount > 0
                            ? `${filledSlotCount} Company Vault slots ready. Open the official Bid PDF to verify any custom ATC certificates.`
                            : 'Add your GST, Udyam & Turnover PDFs in Company Vault to auto-match every tender checklist.'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ) : null}

            {/* 3. Pre-Filled Compliance Letter Drafts */}
            {selectedBid ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionEyebrowRow}>
                  <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
                    QUICK COMPLIANCE LETTER DRAFTS
                  </Text>
                </View>
                <View
                  style={[
                    styles.card,
                    styles.cardPad,
                    { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                  ]}
                >
                  <Text style={[styles.helperCopy, { color: colors.textSecondary }]}>
                    Pre-filled with {profile?.organizationName || 'your firm details'} and{' '}
                    {selectedBid.bidNumber}. Share or print on company letterhead.
                  </Text>
                  <View style={styles.draftChipsRow}>
                    <Pressable
                      onPress={() => openLetterDraft('MII')}
                      style={({ pressed }) => [
                        styles.draftChip,
                        { backgroundColor: colors.primaryTint, opacity: pressed ? 0.72 : 1 },
                      ]}
                    >
                      <Text style={[styles.draftChipText, { color: colors.primary }]}>
                        MII Declaration ↗
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => openLetterDraft('CA')}
                      style={({ pressed }) => [
                        styles.draftChip,
                        { backgroundColor: colors.surfaceSubtle, opacity: pressed ? 0.72 : 1 },
                      ]}
                    >
                      <Text style={[styles.draftChipText, { color: colors.textPrimary }]}>
                        CA UDIN Request ↗
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => openLetterDraft('OEM')}
                      style={({ pressed }) => [
                        styles.draftChip,
                        { backgroundColor: colors.surfaceSubtle, opacity: pressed ? 0.72 : 1 },
                      ]}
                    >
                      <Text style={[styles.draftChipText, { color: colors.textPrimary }]}>
                        OEM MAF Request ↗
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : null}

            {/* 4. Bid-Specific Attached Files (Bid-Scoped Clear!) */}
            {selectedBid ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionEyebrowRow}>
                  <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
                    BID-SPECIFIC FILES ({linkedDocuments.length})
                  </Text>
                  {linkedDocuments.length > 0 ? (
                    <Pressable onPress={clearSelectedBidDocuments} hitSlop={8}>
                      <Text style={[styles.eyebrowAction, { color: colors.danger }]}>
                        Clear This Bid
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.card,
                    { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                  ]}
                >
                  <Pressable
                    onPress={pickBidDocuments}
                    disabled={!workspaceLoaded}
                    style={({ pressed }) => [
                      styles.addRowBtn,
                      { opacity: pressed ? 0.68 : 1 },
                    ]}
                  >
                    <View style={[styles.addIconBox, { backgroundColor: colors.primaryTint }]}>
                      <Text style={[styles.addIconPlus, { color: colors.primary }]}>＋</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.addRowTitle, { color: colors.primary }]}>
                        Attach Bid-Specific File (PDF / Image / Doc)
                      </Text>
                      <Text style={[styles.addRowSub, { color: colors.textSecondary }]}>
                        OEM MAF, signed MII declaration, EMD receipt, or BOQ sheet — auto-scanned on device
                      </Text>
                    </View>
                  </Pressable>

                  {linkedDocuments.map((doc) => (
                    <View key={doc.id}>
                      <View
                        style={[
                          styles.insetDivider,
                          { backgroundColor: colors.borderSubtle, marginLeft: 16 },
                        ]}
                      />
                      <View style={styles.fileRow}>
                        <View style={[styles.fileBadge, { backgroundColor: colors.surfaceSubtle }]}>
                          <Text style={[styles.fileBadgeText, { color: colors.primary }]}>
                            {/\.pdf$/i.test(doc.name) ? 'PDF' : doc.kind.slice(0, 4)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.fileName, { color: colors.textPrimary }]}
                            numberOfLines={2}
                          >
                            {doc.name}
                          </Text>
                          <Text style={[styles.fileMeta, { color: colors.textSecondary }]}>
                            {WorkspaceService.formatFileSize(doc.sizeBytes)} ·{' '}
                            {WorkspaceStorage.isPersisted(doc) ? 'On device' : 'Session only'}
                          </Text>
                          {doc.extractedHighlights && doc.extractedHighlights.length > 0 ? (
                            <Text
                              style={[styles.extractedLine, { color: colors.success }]}
                              numberOfLines={1}
                            >
                              Detected: {doc.extractedHighlights.join(' · ')}
                            </Text>
                          ) : null}
                        </View>
                        <Pressable
                          onPress={() => shareLocalFile(doc.name, doc.uri, selectedBid.bidNumber)}
                          hitSlop={8}
                          style={[styles.iconPillBtn, { backgroundColor: colors.surfaceSubtle }]}
                        >
                          <Text style={[styles.iconPillText, { color: colors.primary }]}>↗</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => removeDocument(doc.id)}
                          hitSlop={8}
                          style={[styles.iconPillBtn, { backgroundColor: colors.surfaceSubtle }]}
                        >
                          <Text style={[styles.iconPillText, { color: colors.danger }]}>✕</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* 5. Official GeM Portal Handoff */}
            {selectedBid ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionEyebrowRow}>
                  <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
                    OFFICIAL PORTAL SUBMISSION
                  </Text>
                  {selectedHandoff ? (
                    <Text style={[styles.eyebrowAction, { color: colors.success }]}>
                      Handoff Started
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={openOfficialPortal}
                  style={({ pressed }) => [
                    styles.card,
                    styles.handoffRow,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderSubtle,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.handoffTitle, { color: colors.textPrimary }]}>
                      Continue Submission on bidplus.gem.gov.in
                    </Text>
                    <Text style={[styles.handoffSub, { color: colors.textSecondary }]}>
                      Login, OTP &amp; final upload happen directly on GeM. Files stay private on your phone.
                    </Text>
                  </View>
                  <Text style={[styles.handoffCue, { color: colors.primary }]}>Open ↗</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : (
          /* TAB 2: UNIFIED COMPANY VAULT (Business Profile + Smart 7-Slot Document Vault) */
          <>
            {/* 1. Unified Business Profile Card */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionEyebrowRow}>
                <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
                  BUSINESS PROFILE
                </Text>
                <Pressable onPress={() => setShowProfileModal(true)} hitSlop={8}>
                  <Text style={[styles.eyebrowAction, { color: colors.primary }]}>
                    {profile ? 'Edit' : 'Set Up'}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => setShowProfileModal(true)}
                style={({ pressed }) => [
                  styles.card,
                  styles.cardPad,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderSubtle,
                    opacity: pressed ? 0.78 : 1,
                  },
                ]}
              >
                {profile ? (
                  <>
                    <Text style={[styles.profileFirmName, { color: colors.textPrimary }]}>
                      {profile.organizationName || 'Your Business Profile'}
                    </Text>
                    <Text style={[styles.profileSummaryLine, { color: colors.textSecondary }]}>
                      {BusinessProfileService.formatProfileSummary(profile)}
                    </Text>
                    {(profile.gstin || profile.udyamNumber || profile.hasVerifiedUdin) ? (
                      <View style={styles.verifiedBadgesRow}>
                        {profile.gstin ? (
                          <View style={[styles.verifiedChip, { backgroundColor: colors.successTint }]}>
                            <Text style={[styles.verifiedChipText, { color: colors.success }]}>
                              GSTIN {profile.gstin}
                            </Text>
                          </View>
                        ) : null}
                        {profile.udyamNumber ? (
                          <View style={[styles.verifiedChip, { backgroundColor: colors.primaryTint }]}>
                            <Text style={[styles.verifiedChipText, { color: colors.primary }]}>
                              {profile.udyamNumber}
                            </Text>
                          </View>
                        ) : null}
                        {profile.hasVerifiedUdin ? (
                          <View style={[styles.verifiedChip, { backgroundColor: colors.successTint }]}>
                            <Text style={[styles.verifiedChipText, { color: colors.success }]}>
                              CA UDIN Verified
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </>
                ) : (
                  <View style={styles.emptyProfileRow}>
                    <View style={[styles.addIconBox, { backgroundColor: colors.primaryTint }]}>
                      <AppIcon name="profile" color={colors.primary} size={17} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.profileFirmName, { color: colors.primary }]}>
                        Set up profile or upload a company PDF below
                      </Text>
                      <Text style={[styles.profileSummaryLine, { color: colors.textSecondary }]}>
                        Uploading your GST, Udyam, or CA Turnover PDF auto-extracts details locally on
                        your phone to compare against every tender.
                      </Text>
                    </View>
                  </View>
                )}
              </Pressable>
            </View>

            {/* 2. Smart 7-Slot Reusable Company Vault (with Multi-File CRAC & ISO Support) */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionEyebrowRow}>
                <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
                  COMPANY DOCUMENT VAULT ({filledSlotCount}/{COMPANY_LOCKER_SLOTS.length})
                </Text>
              </View>
              <Text style={[styles.vaultIntroNote, { color: colors.textSecondary }]}>
                Upload once privately on-device. Digital PDFs automatically extract Firm Name, GSTIN,
                Udyam tier, Turnover, UDIN &amp; expiry dates to update your profile and match every bid.
              </Text>

              {COMPANY_LOCKER_SLOTS.map((slot) => {
                const slotDocs = lockerDocs.filter((d) => d.slotId === slot.id);
                const hasFiles = slotDocs.length > 0;
                const hasExpired = slotDocs.some(
                  (d) => CompanyDocLockerService.getExpiryStatus(d.expiresAtIso) === 'EXPIRED'
                );
                const hasExpiring = slotDocs.some(
                  (d) => CompanyDocLockerService.getExpiryStatus(d.expiresAtIso) === 'EXPIRING_SOON'
                );
                const statusTone = hasExpired
                  ? { bg: colors.dangerTint, fg: colors.danger, label: 'Expired' }
                  : hasExpiring
                    ? { bg: colors.warningTint, fg: colors.warning, label: 'Expiring' }
                    : hasFiles
                      ? {
                          bg: colors.successTint,
                          fg: colors.success,
                          label: slot.allowMultiple && slotDocs.length > 1 ? `${slotDocs.length} Ready` : 'Ready',
                        }
                      : { bg: colors.surfaceSubtle, fg: colors.textMuted, label: 'Missing' };

                return (
                  <View
                    key={slot.id}
                    style={[
                      styles.card,
                      styles.vaultSlotCard,
                      { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                    ]}
                  >
                    <View style={styles.vaultSlotHeader}>
                      <View
                        style={[
                          styles.slotTagBox,
                          { backgroundColor: hasFiles ? colors.successTint : colors.primaryTint },
                        ]}
                      >
                        <Text
                          style={[
                            styles.slotTagText,
                            { color: hasFiles ? colors.success : colors.primary },
                          ]}
                        >
                          {slot.shortTag}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.slotTitle, { color: colors.textPrimary }]}>
                          {slot.title}
                        </Text>
                        {!hasFiles ? (
                          <Text style={[styles.slotHint, { color: colors.textSecondary }]}>
                            {slot.hint}
                          </Text>
                        ) : null}
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: statusTone.bg }]}>
                        <Text style={[styles.statusPillText, { color: statusTone.fg }]}>
                          {statusTone.label}
                        </Text>
                      </View>
                    </View>

                    {/* Saved files inside this slot */}
                    {slotDocs.map((doc) => {
                      const expSt = CompanyDocLockerService.getExpiryStatus(doc.expiresAtIso);
                      return (
                        <View
                          key={doc.id}
                          style={[
                            styles.savedVaultFileRow,
                            { borderTopColor: colors.borderSubtle },
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[styles.savedVaultFileName, { color: colors.textPrimary }]}
                              numberOfLines={1}
                            >
                              {doc.name}
                            </Text>
                            <Text style={[styles.fileMeta, { color: colors.textSecondary }]}>
                              {WorkspaceService.formatFileSize(doc.sizeBytes)}
                              {doc.expiresAtIso
                                ? ` · ${expSt === 'EXPIRED' ? 'Expired' : 'Valid till'} ${doc.expiresAtIso}`
                                : ''}
                            </Text>
                            {doc.extracted?.highlights && doc.extracted.highlights.length > 0 ? (
                              <Text
                                style={[styles.extractedLine, { color: colors.success }]}
                                numberOfLines={2}
                              >
                                {doc.extracted.highlights.join(' · ')}
                              </Text>
                            ) : null}
                          </View>
                          <Pressable
                            onPress={() => openExpiryEditor(doc)}
                            hitSlop={6}
                            style={[styles.miniTextBtn, { backgroundColor: colors.surfaceSubtle }]}
                          >
                            <Text style={[styles.miniTextBtnLabel, { color: colors.textPrimary }]}>
                              {doc.expiresAtIso ? 'Date' : 'Expiry'}
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => shareLocalFile(doc.name, doc.uri, slot.title)}
                            hitSlop={6}
                            style={[styles.iconPillBtn, { backgroundColor: colors.surfaceSubtle }]}
                          >
                            <Text style={[styles.iconPillText, { color: colors.primary }]}>↗</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => removeLockerDoc(doc)}
                            hitSlop={6}
                            style={[styles.iconPillBtn, { backgroundColor: colors.surfaceSubtle }]}
                          >
                            <Text style={[styles.iconPillText, { color: colors.danger }]}>✕</Text>
                          </Pressable>
                        </View>
                      );
                    })}

                    {/* Add / Replace Action Footer */}
                    <Pressable
                      onPress={() => pickLockerSlotFile(slot.id)}
                      style={({ pressed }) => [
                        styles.slotAddFooter,
                        {
                          borderTopColor: colors.borderSubtle,
                          opacity: pressed ? 0.68 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.slotAddFooterText, { color: colors.primary }]}>
                        {!hasFiles
                          ? '+ Add PDF / Certificate'
                          : slot.allowMultiple
                            ? '+ Add Another Certificate'
                            : 'Replace File'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <Text style={[styles.footerNote, { color: colors.textMuted }]}>
          100% private on-device storage &amp; PDF extraction. Nothing is ever sent to any server.
        </Text>
      </ScrollView>

      {/* 1. Extracted Company PDF Details Review Modal */}
      <Modal
        visible={pendingExtractReview !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPendingExtractReview(null)}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setPendingExtractReview(null)} />
          <View
            style={[
              styles.bottomSheet,
              { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
              Details Found in Your PDF
            </Text>
            <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>
              Extracted locally from {pendingExtractReview?.docName}. Apply these verified details
              to your Business Profile so every bid compares automatically?
            </Text>

            <View
              style={[
                styles.extractedCard,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
              ]}
            >
              {pendingExtractReview?.patch.fields.map((field, idx) => (
                <View
                  key={field.key}
                  style={[
                    styles.extractedFieldRow,
                    idx > 0 && {
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <Text style={[styles.extractedFieldLabel, { color: colors.textSecondary }]}>
                    {field.label}
                  </Text>
                  <Text
                    style={[styles.extractedFieldVal, { color: colors.textPrimary }]}
                    numberOfLines={2}
                  >
                    {field.valueLabel}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.sheetBtnRow}>
              <Pressable
                onPress={() => setPendingExtractReview(null)}
                style={[styles.sheetSecBtn, { backgroundColor: colors.surfaceSubtle }]}
              >
                <Text style={[styles.sheetSecBtnText, { color: colors.textPrimary }]}>
                  Keep File Only
                </Text>
              </Pressable>
              <Pressable
                onPress={applyExtractedProfilePatch}
                style={[styles.sheetPriBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.sheetPriBtnText, { color: colors.textInverse }]}>
                  Apply to Profile
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Compliance Letter Draft Modal */}
      <Modal
        visible={activeLetterDraft !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveLetterDraft(null)}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setActiveLetterDraft(null)} />
          <View
            style={[
              styles.bottomSheet,
              { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.draftModalHeader}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary, flex: 1 }]}>
                {activeLetterDraft?.title}
              </Text>
              <Pressable onPress={() => setActiveLetterDraft(null)} hitSlop={10}>
                <Text style={[styles.closeX, { color: colors.textMuted }]}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.draftScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.draftBody, { color: colors.textPrimary }]}>
                {activeLetterDraft?.content}
              </Text>
            </ScrollView>
            <Pressable
              onPress={() => {
                if (!activeLetterDraft) return;
                Share.share({
                  title: activeLetterDraft.title,
                  message: activeLetterDraft.content,
                }).catch(() => undefined);
              }}
              style={[styles.sheetPriBtnFull, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.sheetPriBtnText, { color: colors.textInverse }]}>
                Share / Copy Draft ↗
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 3. Certificate Expiry Reminder Modal */}
      <Modal
        visible={expiryTargetId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setExpiryTargetId(null)}
      >
        <View style={styles.expiryBackdrop}>
          <View
            style={[
              styles.expiryCard,
              { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
            ]}
          >
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
              Certificate Expiry Reminder
            </Text>
            <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>
              Enter expiry date (YYYY-MM-DD) for a 30-day alert, or leave blank to clear.
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
            <View style={styles.sheetBtnRow}>
              <Pressable
                onPress={() => setExpiryTargetId(null)}
                style={[styles.sheetSecBtn, { backgroundColor: colors.surfaceSubtle }]}
              >
                <Text style={[styles.sheetSecBtnText, { color: colors.textPrimary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={saveExpiryDate}
                style={[styles.sheetPriBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.sheetPriBtnText, { color: colors.textInverse }]}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <BusinessProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSaved={(saved) => setProfile(saved)}
      />

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
  stickyHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  headerMeta: {
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  profilePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
  },
  profilePillText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  sectionBlock: {
    marginTop: 18,
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
  eyebrowAction: {
    fontSize: 12.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  inlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verdictChip: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 10,
  },
  verdictChipText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  bidChipStrip: {
    paddingBottom: 10,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cardPad: {
    padding: 16,
  },
  insetDivider: {
    height: StyleSheet.hairlineWidth,
  },
  bidTitle: {
    fontWeight: '600',
    lineHeight: 21.5,
    letterSpacing: -0.25,
  },
  bidSub: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  bidQuickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
  },
  pillBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  progressWrap: {
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 54,
    gap: 12,
  },
  circleCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCheckMark: {
    fontSize: 12,
    fontWeight: '700',
  },
  checkTitle: {
    fontSize: 14,
    lineHeight: 19.5,
  },
  checkMeta: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
  },
  miniActionPill: {
    paddingHorizontal: 10,
    minHeight: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  helperCopy: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 11,
  },
  draftChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  draftChip: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftChipText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  addRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  addIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconPlus: {
    fontSize: 20,
    fontWeight: '600',
  },
  addRowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  addRowSub: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  fileBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  fileName: {
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 18.5,
  },
  fileMeta: {
    fontSize: 11.5,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  extractedLine: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 3,
  },
  iconPillBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  handoffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  handoffTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  handoffSub: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  handoffCue: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 15.5,
    fontWeight: '600',
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  profileFirmName: {
    fontSize: 15.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  profileSummaryLine: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
  emptyProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  verifiedBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  verifiedChip: {
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
  },
  verifiedChipText: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  vaultIntroNote: {
    fontSize: 12.5,
    lineHeight: 18,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  vaultSlotCard: {
    marginBottom: 12,
  },
  vaultSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  slotTagBox: {
    minWidth: 50,
    height: 36,
    borderRadius: 10,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  slotTitle: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  slotHint: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  statusPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  savedVaultFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 8,
  },
  savedVaultFileName: {
    fontSize: 13,
    fontWeight: '600',
  },
  miniTextBtn: {
    minHeight: 32,
    paddingHorizontal: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniTextBtnLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  slotAddFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotAddFooterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footerNote: {
    fontSize: 11.5,
    lineHeight: 16.5,
    textAlign: 'center',
    marginTop: 18,
    paddingHorizontal: 12,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 22,
    maxHeight: '82%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  sheetSub: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    marginBottom: 14,
  },
  extractedCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  extractedFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    gap: 12,
  },
  extractedFieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  extractedFieldVal: {
    fontSize: 13.5,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1.2,
    fontVariant: ['tabular-nums'],
  },
  sheetBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sheetSecBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSecBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sheetPriBtn: {
    flex: 1.3,
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetPriBtnFull: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  sheetPriBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  draftModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  closeX: {
    fontSize: 18,
    fontWeight: '600',
  },
  draftScroll: {
    maxHeight: 380,
  },
  draftBody: {
    fontSize: 13.5,
    lineHeight: 20.5,
  },
  expiryBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'center',
    padding: 20,
  },
  expiryCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
  },
  expiryInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 46,
    fontSize: 14.5,
    marginBottom: 16,
  },
});
