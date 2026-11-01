import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Share,
  SafeAreaView,
} from 'react-native';
import type { DeconstructedBidDoc } from '../types/index';
import { BidDocService } from '../services/BidDocService';
import { LocalPdfScanner, type LocalPdfScanResult } from '../services/LocalPdfScanner';
import { PortalDocService } from '../services/PortalDocService';
import { formatDateSafe } from '../utils/formatters';
import { useTheme } from '../theme/ThemeContext';
import { BidDocumentViewer } from './BidDocumentViewer';

interface BidInspectorScreenProps {
  bid: DeconstructedBidDoc | null;
  visible: boolean;
  onClose: () => void;
  onPrepareDocuments?: (bid: DeconstructedBidDoc) => void;
}

export const BidInspectorScreen: React.FC<BidInspectorScreenProps> = ({
  bid,
  visible,
  onClose,
  onPrepareDocuments,
}) => {
  const { colors, isDark } = useTheme();
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});
  const [pdfScan, setPdfScan] = useState<LocalPdfScanResult | null>(null);
  const [isScanningPdf, setIsScanningPdf] = useState(false);
  const [documentViewerVisible, setDocumentViewerVisible] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>();

  useEffect(() => {
    setCheckedDocs({});
    setPdfScan(null);
    setDocumentViewerVisible(false);
    setSelectedDocumentId(undefined);
    if (!bid) return;

    const targetUrl = PortalDocService.resolvePdfUrl(bid.bidNumber, bid.docUrl);
    LocalPdfScanner.getCachedScan(bid.bidNumber, targetUrl).then((cached) => {
      if (cached) setPdfScan(cached);
    });
  }, [bid?.bidNumber, bid?.docUrl]);

  if (!bid) return null;

  const fundamentals = BidDocService.getFundamentalsSummary(bid);
  const risks = BidDocService.assessTenderRisks(bid);

  const requiredDocuments = Array.isArray(bid.requiredDocuments) ? bid.requiredDocuments : [];
  const boqItems = Array.isArray(bid.boqItems) ? bid.boqItems : [];
  const consignees = Array.isArray(bid.consignees) ? bid.consignees : [];

  const toggleDoc = (docName: string) => {
    setCheckedDocs((prev) => ({
      ...prev,
      [docName]: !prev[docName],
    }));
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `GeM Bid Summary: ${bid.bidNumber || 'N/A'}\n${bid.title || 'Untitled Bid'}\nEst Value: ${fundamentals.estimatedValueLabel}\nEMD: ${fundamentals.emdLabel}\nClosing: ${formatDateSafe(bid.closingTimeUtc)}`,
      });
    } catch {
      Alert.alert('Share', `Sharing summary for ${bid.bidNumber || 'bid'}`);
    }
  };

  const handlePrepareDocuments = () => {
    if (onPrepareDocuments) {
      onPrepareDocuments(bid);
      return;
    }
    Alert.alert('Document preparation', 'Choose this bid from the document preparation workspace.');
  };

  const officialDocuments = PortalDocService.getOfficialDocuments(bid);

  const handleOpenDoc = (documentId = officialDocuments[0]?.id) => {
    const targetDocument = officialDocuments.find((document) => document.id === documentId) || officialDocuments[0];
    if (!targetDocument || !PortalDocService.isSafeGemUrl(targetDocument.url)) {
      Alert.alert('Security Notice', 'Document link is not from a verified official GeM domain.');
      return;
    }
    setSelectedDocumentId(targetDocument.id);
    setDocumentViewerVisible(true);
  };

  const handleScanPdfOnDevice = async () => {
    const targetUrl = PortalDocService.resolvePdfUrl(bid.bidNumber, bid.docUrl);
    if (!PortalDocService.isSafeGemUrl(targetUrl)) {
      Alert.alert('Security Notice', 'The bid document is not from a verified official GeM domain.');
      return;
    }

    setIsScanningPdf(true);
    try {
      const result = await LocalPdfScanner.scanOfficialBidPdf(bid.bidNumber, targetUrl);
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

  const pdfFieldRows: Array<[string, string | number | undefined]> = [
    ['Bid number', pdfScan?.details.bidNumber],
    ['Title', pdfScan?.details.title],
    ['Department', pdfScan?.details.department],
    ['Ministry', pdfScan?.details.ministry],
    ['Closing date', pdfScan?.details.closingDate],
    [
      'Estimated value',
      pdfScan?.details.estimatedValueInr !== undefined
        ? `₹${pdfScan.details.estimatedValueInr.toLocaleString('en-IN')}`
        : undefined,
    ],
    [
      'EMD amount',
      pdfScan?.details.emdAmountInr !== undefined
        ? `₹${pdfScan.details.emdAmountInr.toLocaleString('en-IN')}`
        : undefined,
    ],
  ];

  const renderTypeBadge = () => {
    if (bid.isRa || bid.type === 'RA') {
      return (
        <View style={[styles.typeBadge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <Text style={[styles.typeBadgeText, { color: '#DC2626' }]}>RA · REVERSE AUCTION</Text>
        </View>
      );
    }
    if (bid.type === 'SERVICE') {
      return (
        <View style={[styles.typeBadge, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
          <Text style={[styles.typeBadgeText, { color: '#059669' }]}>SERVICE CONTRACT</Text>
        </View>
      );
    }
    if (bid.type === 'CUSTOM') {
      return (
        <View style={[styles.typeBadge, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
          <Text style={[styles.typeBadgeText, { color: '#D97706' }]}>CUSTOM TENDER</Text>
        </View>
      );
    }
    if (bid.type === 'BOQ') {
      return (
        <View style={[styles.typeBadge, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
          <Text style={[styles.typeBadgeText, { color: '#7C3AED' }]}>BOQ TENDER</Text>
        </View>
      );
    }
    return (
      <View style={[styles.typeBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
        <Text style={[styles.typeBadgeText, { color: '#2563EB' }]}>PRODUCT BID</Text>
      </View>
    );
  };

  const checkedCount = requiredDocuments.filter((d) => checkedDocs[d]).length;

  // Dynamic closing remaining calculation
  const closingDate = bid.closingTimeUtc ? new Date(bid.closingTimeUtc) : new Date(Date.now() + 86400000 * 3);
  const isValidDate = !isNaN(closingDate.getTime());
  const diffMs = isValidDate ? Math.max(0, closingDate.getTime() - Date.now()) : 0;
  const diffHours = Math.floor(diffMs / 3600000);
  const diffMins = Math.floor((diffMs % 3600000) / 60000);
  const remainingLabel = !isValidDate
    ? 'Closing date on portal'
    : diffHours > 48
    ? `${Math.floor(diffHours / 24)}d ${diffHours % 24}h remaining`
    : `${diffHours}h ${diffMins}m remaining`;

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Top Header Bar (GeM Ashoka Navy) */}
            <View style={styles.headerBar}>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close details">
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
              <View style={styles.headerCenter}>
                <Text style={styles.headerBidNum}>{bid.bidNumber}</Text>
                <Text style={styles.headerSubtitle}>Public GeM bid record</Text>
              </View>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare} accessibilityLabel="Share summary">
                <Text style={styles.shareBtnText}>↗</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
              {/* Bid Closing Cutoff & Freeze Protection Banner */}
              <View style={styles.cutoffBanner}>
                <View style={styles.cutoffLeft}>
                  <Text style={styles.cutoffIcon}>C</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cutoffTitle}>Closing: {formatDateSafe(bid.closingTimeUtc)}</Text>
                    <Text style={styles.cutoffSubtitle}>{remainingLabel} • GeM portal freezes in final 15 mins</Text>
                  </View>
                </View>
                <View style={styles.cutoffBadge}>
                  <Text style={styles.cutoffBadgeText}>SUBMIT EARLY</Text>
                </View>
              </View>

              {/* Tender Title & Ministry */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardHeaderBadges}>
                  {renderTypeBadge()}
                  {bid.categoryDomain ? (
                    <View style={styles.domainBadge}>
                      <Text style={styles.domainBadgeText}>{bid.categoryDomain}</Text>
                    </View>
                  ) : null}
                </View>
                {bid.department ? <Text style={styles.deptBadge}>{bid.department}</Text> : null}
                <Text style={[styles.bidTitle, { color: colors.textPrimary }]}>{bid.title || 'Untitled Bid'}</Text>
                {bid.ministry ? <Text style={[styles.ministryText, { color: colors.textSecondary }]}>{bid.ministry}</Text> : null}
              </View>

          {/* Service Contract Terms & SLA Standards */}
          {(bid.serviceDetails || bid.type === 'SERVICE') && (
            <View style={[styles.card, styles.serviceCard]}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceHeaderTitle}>Service contract terms &amp; SLAs</Text>
                <Text style={styles.serviceSlaBadge}>GeM SLA Governed</Text>
              </View>
              <View style={styles.serviceGrid}>
                <View style={styles.serviceCell}>
                  <Text style={styles.serviceCellLabel}>Contract Duration</Text>
                  <Text style={styles.serviceCellValue}>
                    {bid.serviceDetails?.durationMonths ? `${bid.serviceDetails.durationMonths} Months` : 'Not published'}
                  </Text>
                </View>
                <View style={styles.serviceCell}>
                  <Text style={styles.serviceCellLabel}>Manpower / Staffing</Text>
                  <Text style={styles.serviceCellValue}>
                    {bid.serviceDetails?.manpowerCount ? `${bid.serviceDetails.manpowerCount} Personnel` : 'Not published'}
                  </Text>
                </View>
                <View style={styles.serviceCell}>
                  <Text style={styles.serviceCellLabel}>Billing Cycle</Text>
                  <Text style={styles.serviceCellValue}>
                    {bid.serviceDetails?.billingCycle || 'Not published'}
                  </Text>
                </View>
                <View style={styles.serviceCell}>
                  <Text style={styles.serviceCellLabel}>Statutory Compliance</Text>
                  <Text style={[styles.serviceCellValue, { color: '#059669' }]}>
                    {bid.serviceDetails?.minimumWageCompliance === true ? 'Published compliance term' : 'Not published'}
                  </Text>
                </View>
              </View>
              <Text style={styles.serviceNote}>
                • Monthly billing subject to attendance muster roll &amp; PF/ESI challan verification prior to CRAC sign-off.
              </Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Commercial guidance</Text>
            <Text style={styles.notPublishedText}>
              Bid ranking, L1 benchmarks, seller eligibility, and account-specific participation data are not available in the public feed. Confirm commercial terms on the official GeM document.
            </Text>
          </View>

          {/* 2x2 Key Fundamentals Grid */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Key Procurement Fundamentals</Text>
            <View style={styles.grid2x2}>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>Estimated Value</Text>
                <Text style={styles.cellValuePrimary}>{fundamentals.estimatedValueLabel}</Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>EMD Guarantee</Text>
                <Text style={[styles.cellValueSecondary, { color: '#00C853' }]}>
                  {fundamentals.emdLabel}
                </Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>Min Annual Turnover</Text>
                <Text style={styles.cellValuePrimary}>{fundamentals.turnoverLabel}</Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>Past Experience</Text>
                <Text style={styles.cellValuePrimary}>{fundamentals.experienceLabel}</Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>Delivery Timeline</Text>
                <Text style={styles.cellValueSecondary}>{fundamentals.deliveryPeriodLabel}</Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>e-PBG Bank Guarantee</Text>
                <Text style={[styles.cellValueSecondary, { color: '#B45309' }]}>
                  {bid.epbgPercentage === undefined ? 'Not published' : `${bid.epbgPercentage}%`}
                </Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>Splitting Rule</Text>
                <Text style={styles.cellValueSecondary}>{bid.splittingRatio || 'Not published'}</Text>
              </View>
            </View>
          </View>

          {/* Official bid PDF and verified attachments */}
          <View style={styles.card}>
            <View style={styles.pdfScanHeader}>
              <Text style={styles.sectionHeading}>Official bid documents</Text>
              <Text style={styles.pdfScanBadge}>GeM SOURCE</Text>
            </View>
            <Text style={styles.notPublishedText}>
              Read the official document in this app. Published specifications and ATC sections are shown inside the main PDF; separate attachments appear only when GeM provides a verified document link.
            </Text>
            {officialDocuments.map((document) => (
              <TouchableOpacity
                key={document.id}
                style={styles.officialDocumentRow}
                onPress={() => handleOpenDoc(document.id)}
                activeOpacity={0.75}
              >
                <View style={styles.officialDocumentIcon}>
                  <Text style={styles.officialDocumentIconText}>{document.kind === 'BID' ? 'PDF' : 'DOC'}</Text>
                </View>
                <View style={styles.officialDocumentCopy}>
                  <Text style={styles.officialDocumentTitle}>{document.label}</Text>
                  <Text style={styles.officialDocumentSubtitle}>
                    {document.kind === 'BID' ? 'Published bid, specifications and ATC sections when included' : 'Verified GeM attachment'}
                  </Text>
                </View>
                <Text style={styles.officialDocumentAction}>View</Text>
              </TouchableOpacity>
            ))}
            {officialDocuments.length === 1 ? (
              <Text style={styles.documentAvailabilityNote}>
                The current public GeM feed does not expose separate specification or corrigendum URLs for this bid.
              </Text>
            ) : null}
          </View>

          {/* Optional, bounded, device-only PDF analysis */}
          <View style={styles.card}>
            <View style={styles.pdfScanHeader}>
              <Text style={styles.sectionHeading}>PDF details on this device</Text>
              <Text style={styles.pdfScanBadge}>DEVICE ONLY</Text>
            </View>
            <Text style={styles.notPublishedText}>
              Scan the official bid PDF only when needed. The raw file is processed on this device, removed after scanning, and never uploaded by the companion.
            </Text>
            <TouchableOpacity
              style={[styles.pdfScanButton, isScanningPdf && styles.pdfScanButtonDisabled]}
              onPress={handleScanPdfOnDevice}
              disabled={isScanningPdf}
              activeOpacity={0.8}
            >
              <Text style={styles.pdfScanButtonText}>
                {isScanningPdf ? 'Scanning on device…' : pdfScan ? 'Scan again on device' : 'Scan bid PDF on device'}
              </Text>
            </TouchableOpacity>
            {pdfScan ? (
              <View style={styles.pdfScanResult}>
                <Text style={styles.pdfScanStatus}>
                  {pdfScan.status === 'EXTRACTED'
                    ? `Read ${pdfScan.textLength.toLocaleString('en-IN')} characters locally`
                    : pdfScan.status.replace(/_/g, ' ')}
                </Text>
                {pdfFieldRows
                  .filter(([, value]) => value !== undefined && value !== '')
                  .map(([label, value]) => (
                    <View key={label} style={styles.pdfFieldRow}>
                      <Text style={styles.pdfFieldLabel}>{label}</Text>
                      <Text style={styles.pdfFieldValue}>{String(value)}</Text>
                    </View>
                  ))}
                <Text style={styles.pdfScanNote}>{pdfScan.note}</Text>
              </View>
            ) : null}
          </View>

          {/* Risk Factors Assessment */}
          {risks.flags.length > 0 && (
            <View style={[styles.card, styles.riskCard]}>
              <View style={styles.riskHeader}>
                <Text style={styles.riskTitle}>OPERATIONAL RISK ASSESSMENT: {risks.riskLevel}</Text>
              </View>
              {risks.flags.map((flag, idx) => (
                <Text key={idx} style={styles.riskFlagText}>• {flag}</Text>
              ))}
            </View>
          )}

          {/* BOQ Technical Scope */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Published scope</Text>
            {boqItems.length > 0 ? boqItems.map((item, idx) => (
              <View key={idx} style={styles.boqItemRow}>
                <View style={styles.boqTopRow}>
                  <Text style={styles.boqItemTitle}>{item.itemTitle}</Text>
                  <Text style={styles.boqQtyBadge}>
                    {item.quantity !== undefined ? `${item.quantity} ${item.unit || 'Units'}` : 'Quantity unstated'}
                  </Text>
                </View>
                {item.specsSummary ? <Text style={styles.boqSpecsText}>{item.specsSummary}</Text> : null}
              </View>
            )) : <Text style={styles.notPublishedText}>Detailed scope is not included in the public listing. Open the official bid document before preparing a response.</Text>}
          </View>

          {/* Consignee Destinations */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Delivery locations</Text>
            {consignees.length > 0 ? consignees.map((c, idx) => (
              <View key={idx} style={styles.consigneeRow}>
                <View style={styles.consigneeLeft}>
                  <Text style={styles.consigneeLocation}>{c.location}</Text>
                  <Text style={styles.consigneeOfficer}>{c.reportingOfficer || 'Consignee Officer'}</Text>
                </View>
                <View style={styles.consigneeRight}>
                  <Text style={styles.stateBadge}>{c.state || 'India'}{c.pincode ? ` (${c.pincode})` : ''}</Text>
                  <Text style={styles.consigneeQty}>{c.quantity !== undefined ? `${c.quantity} Units` : 'Scope not published'}</Text>
                </View>
              </View>
            )) : <Text style={styles.notPublishedText}>Consignee locations are not included in the public listing.</Text>}
          </View>

          {/* Interactive Document Readiness Checklist */}
          <View style={styles.card}>
            <View style={styles.checklistHeader}>
              <Text style={styles.sectionHeading}>Required document checklist</Text>
              <Text style={styles.checkRatio}>
                {requiredDocuments.length > 0 ? `${checkedCount}/${requiredDocuments.length} added` : 'Open official document'}
              </Text>
            </View>
            {requiredDocuments.length > 0 ? requiredDocuments.map((doc, idx) => {
              const isChecked = !!checkedDocs[doc];
              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.checkRow}
                  onPress={() => toggleDoc(doc)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                    <Text style={styles.checkMark}>{isChecked ? '✓' : ''}</Text>
                  </View>
                  <Text style={[styles.checkLabel, isChecked && styles.checkLabelActive]}>
                    {doc}
                  </Text>
                </TouchableOpacity>
              );
            }) : <Text style={styles.notPublishedText}>The public listing does not expose a document checklist. Confirm every requirement in the official GeM bid document.</Text>}
          </View>
        </ScrollView>

        {/* Sticky Bottom Actions Bar (GeM Ashoka Navy) */}
        <View style={styles.stickyFooter}>
          <TouchableOpacity
            style={styles.addPortfolioBtn}
            onPress={handlePrepareDocuments}
            activeOpacity={0.8}
          >
            <Text style={styles.addPortfolioText}>Prepare documents</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.officialLinkBtn}
            onPress={() => handleOpenDoc()}
            activeOpacity={0.8}
          >
            <Text style={styles.officialLinkText}>View bid PDF</Text>
          </TouchableOpacity>
        </View>
      </View>
      </SafeAreaView>
      </Modal>
      <BidDocumentViewer
        bid={bid}
        visible={documentViewerVisible}
        initialDocumentId={selectedDocumentId}
        onClose={() => setDocumentViewerVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: '#0B3B60',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerBidNum: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  headerSubtitle: { color: '#E9D5FF', fontSize: 11, fontWeight: '500' },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBtnText: { fontSize: 16 },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  verdictBanner: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
  },
  verdictHigh: { backgroundColor: '#E8F5E9', borderColor: '#00C853' },
  verdictModerate: { backgroundColor: '#FFF3E0', borderColor: '#FF6D00' },
  verdictDisqualified: { backgroundColor: '#FFEBEE', borderColor: '#D32F2F' },
  verdictTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  verdictPill: { color: '#111827', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  matchScoreText: {
    color: '#00C853',
    fontSize: 13,
    fontWeight: '800',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verdictSummary: { color: '#374151', fontSize: 13, lineHeight: 18 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  deptBadge: { color: '#0B3B60', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  bidTitle: { color: '#111827', fontSize: 15, fontWeight: '800', lineHeight: 20, marginBottom: 4 },
  ministryText: { color: '#6B7280', fontSize: 12 },
  benchmarkCard: {
    backgroundColor: '#F3E8FF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  benchmarkHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  benchmarkLabel: { color: '#0B3B60', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  benchmarkHint: { color: '#6B7280', fontSize: 10 },
  benchmarkRange: { color: '#111827', fontSize: 22, fontWeight: '900', marginVertical: 4 },
  benchmarkSub: { color: '#4B5563', fontSize: 11, lineHeight: 15 },
  sectionHeading: { color: '#111827', fontSize: 14, fontWeight: '800', marginBottom: 12 },
  notPublishedText: { color: '#6B7280', fontSize: 12, lineHeight: 17 },
  grid2x2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridCell: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cellLabel: { color: '#6B7280', fontSize: 10, fontWeight: '600', marginBottom: 2 },
  cellValuePrimary: { color: '#111827', fontSize: 13, fontWeight: '800' },
  cellValueSecondary: { color: '#2563EB', fontSize: 13, fontWeight: '700' },
  riskCard: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  riskHeader: { marginBottom: 4 },
  riskTitle: { color: '#B45309', fontSize: 11, fontWeight: '800' },
  riskFlagText: { color: '#78350F', fontSize: 12, lineHeight: 17, marginTop: 2 },
  boqItemRow: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  boqTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  boqItemTitle: { color: '#111827', fontSize: 13, fontWeight: '700', flex: 1, marginRight: 8 },
  boqQtyBadge: { color: '#00C853', fontSize: 11, fontWeight: '800', backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  boqSpecsText: { color: '#6B7280', fontSize: 11, lineHeight: 16 },
  consigneeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  consigneeLeft: { flex: 1, marginRight: 8 },
  consigneeLocation: { color: '#111827', fontSize: 13, fontWeight: '700' },
  consigneeOfficer: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  consigneeRight: { alignItems: 'flex-end' },
  stateBadge: { color: '#2563EB', fontSize: 11, fontWeight: '700' },
  consigneeQty: { color: '#374151', fontSize: 12, fontWeight: '800', marginTop: 2 },
  checklistHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  checkRatio: { color: '#0B3B60', fontSize: 12, fontWeight: '800' },
  pdfScanHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pdfScanBadge: { color: '#0B4F71', fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  officialDocumentRow: { flexDirection: 'row', alignItems: 'center', minHeight: 58, borderTopWidth: 1, borderTopColor: '#EEF1F4', paddingVertical: 9 },
  officialDocumentIcon: { width: 38, height: 38, borderRadius: 9, backgroundColor: '#EAF4F8', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  officialDocumentIconText: { color: '#0B5577', fontSize: 10, fontWeight: '900' },
  officialDocumentCopy: { flex: 1, marginRight: 8 },
  officialDocumentTitle: { color: '#1F2937', fontSize: 12, fontWeight: '800' },
  officialDocumentSubtitle: { color: '#6B7280', fontSize: 10, lineHeight: 14, marginTop: 2 },
  officialDocumentAction: { color: '#0B5577', fontSize: 12, fontWeight: '900' },
  documentAvailabilityNote: { color: '#6B7280', fontSize: 10, lineHeight: 15, borderTopWidth: 1, borderTopColor: '#EEF1F4', paddingTop: 9, marginTop: 2 },
  pdfScanButton: { minHeight: 44, borderRadius: 6, backgroundColor: '#0B4F71', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, marginTop: 14 },
  pdfScanButtonDisabled: { opacity: 0.6 },
  pdfScanButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  pdfScanResult: { borderTopWidth: 1, borderTopColor: '#D6DDE3', marginTop: 14, paddingTop: 12 },
  pdfScanStatus: { color: '#047857', fontSize: 11, fontWeight: '800', marginBottom: 6 },
  pdfFieldRow: { flexDirection: 'row', gap: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#EEF1F4' },
  pdfFieldLabel: { width: 104, color: '#6B7280', fontSize: 11, fontWeight: '700' },
  pdfFieldValue: { flex: 1, color: '#1F2937', fontSize: 11, lineHeight: 16 },
  pdfScanNote: { color: '#6B7280', fontSize: 10, lineHeight: 15, marginTop: 9 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxActive: { backgroundColor: '#0B3B60', borderColor: '#0B3B60' },
  checkMark: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  checkLabel: { color: '#374151', fontSize: 12, flex: 1 },
  checkLabelActive: { color: '#111827', fontWeight: '600' },
  stickyFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  addPortfolioBtn: {
    flex: 1.3,
    minHeight: 48,
    backgroundColor: '#0B3B60',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPortfolioText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  officialLinkBtn: {
    flex: 1,
    minHeight: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  officialLinkText: { color: '#374151', fontSize: 13, fontWeight: '700' },
  cutoffBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  cutoffLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  cutoffIcon: { fontSize: 22, marginRight: 8 },
  cutoffTitle: { color: '#92400E', fontSize: 13, fontWeight: '800' },
  cutoffSubtitle: { color: '#B45309', fontSize: 11, fontWeight: '600', marginTop: 1 },
  cutoffBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cutoffBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  oemWarningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  oemWarningIcon: { fontSize: 20, marginRight: 8, marginTop: 1 },
  oemWarningTitle: { color: '#991B1B', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  oemWarningText: { color: '#B91C1C', fontSize: 11, lineHeight: 16 },
  pastPerfCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  pastPerfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pastPerfBadge: { color: '#166534', fontSize: 12, fontWeight: '800' },
  pastPerfStatus: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pastPerfDesc: { color: '#15803D', fontSize: 12, lineHeight: 17, marginBottom: 8 },
  pastPerfFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
    paddingTop: 8,
  },
  pastPerfContract: { color: '#166534', fontSize: 11, fontWeight: '700', flex: 1, marginRight: 8 },
  copyProofBtn: {
    backgroundColor: '#166534',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  copyProofBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  cardHeaderBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  domainBadge: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  domainBadgeText: {
    color: '#374151',
    fontSize: 10,
    fontWeight: '700',
  },
  serviceCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  serviceHeaderTitle: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '800',
  },
  serviceSlaBadge: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  serviceCell: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  serviceCellLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  serviceCellValue: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
  },
  serviceNote: {
    color: '#15803D',
    fontSize: 11,
    lineHeight: 15,
    fontStyle: 'italic',
  },
});
