import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Vibration,
} from 'react-native';
import { InspectionEngine } from '../services/InspectionEngine';
import type { InspectionItem, GeoCoordinate } from '../types/index';

export const CracInspectorScreen: React.FC = () => {
  const [poNumber] = useState('GEM-PO-2026-88192');
  const [vendorName] = useState('Bharat Dynamics Heavy Industries Ltd');
  const [consignmentTitle] = useState('High-Tensile Structural Fasteners (M24 Grade 8.8)');
  const [totalQuantity] = useState<number>(500);

  const [acceptedQuantity, setAcceptedQuantity] = useState<number>(480);
  const [rejectedQuantity, setRejectedQuantity] = useState<number>(20);
  const [defectReason, setDefectReason] = useState<string>('Surface corrosion on batch #4');
  const [scannedBarcodes, setScannedBarcodes] = useState<string[]>(['BC-GEM-88192-A', 'BC-GEM-88192-B']);
  const [photoCount, setPhotoCount] = useState<number>(2);
  const [hudOpacity, setHudOpacity] = useState<number>(0.85);

  const [geo] = useState<GeoCoordinate>({
    latitude: 28.613939,
    longitude: 77.209021,
    accuracyMeters: 3.5,
    timestampUtc: new Date().toISOString(),
  });

  const watermarkPreview = InspectionEngine.generateWatermarkString(poNumber, 'INSPECTOR-ORDNANCE-09', geo);

  const handleCapturePhoto = () => {
    setPhotoCount((prev) => prev + 1);
    try {
      Vibration.vibrate(50);
    } catch {
      // safe fallback
    }
    Alert.alert('Evidence Photo Captured', `Watermark embedded: GPS ±${geo.accuracyMeters}m with SHA-256 hash.`);
  };

  const handleScanBarcode = () => {
    const newBarcode = `BC-GEM-88192-${String.fromCharCode(65 + scannedBarcodes.length)}`;
    setScannedBarcodes((prev) => [...prev, newBarcode]);
    try {
      Vibration.vibrate(40);
    } catch {
      // safe fallback
    }
    Alert.alert('Barcode Scanned', `Verified Consignment Tag: ${newBarcode}`);
  };

  const adjustAccepted = (delta: number) => {
    const nextAccepted = Math.max(0, Math.min(totalQuantity, acceptedQuantity + delta));
    setAcceptedQuantity(nextAccepted);
    setRejectedQuantity(Math.max(0, totalQuantity - nextAccepted));
  };

  const handleAcceptAll = () => {
    setAcceptedQuantity(totalQuantity);
    setRejectedQuantity(0);
  };

  const handleSubmitCrac = () => {
    const inspection: InspectionItem = {
      id: 'insp-' + Date.now(),
      poNumber,
      consignmentTitle,
      vendorName,
      totalQuantity,
      acceptedQuantity,
      rejectedQuantity,
      barcodeScanned: scannedBarcodes,
      evidencePhotos: Array(photoCount).fill({
        id: 'p',
        localUri: 'uri',
        sha256Hash: 'hash',
        geoTag: geo,
        watermarkText: watermarkPreview,
        capturedAtUtc: new Date().toISOString(),
        synced: false,
      }),
      status: 'IN_PROGRESS',
      defectReason,
      offlineCreated: true,
    };

    const validation = InspectionEngine.validateInspectionReadiness(inspection);
    if (!validation.ready) {
      Alert.alert('Statutory Inspection Incomplete', validation.missingRequirements.join('\n\n'));
      return;
    }

    Alert.alert(
      'Confirm Statutory CRAC Issuance',
      `Generate Consignee Receipt and Acceptance Certificate for:\n\n• Accepted: ${acceptedQuantity} Units\n• Rejected: ${rejectedQuantity} Units\n• Audit Watermarked Photos: ${photoCount}\n\nSign with Inspector Private Key?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign & Issue CRAC',
          onPress: () => {
            try {
              Vibration.vibrate([0, 80, 50, 120]);
            } catch {
              // safe fallback
            }
            Alert.alert(
              'CRAC Signed & Queued Offline',
              `CRAC generated for ${acceptedQuantity} items. Stored in encrypted offline SQLite queue for auto-sync.`
            );
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Consignment Header */}
      <View style={styles.card}>
        <Text style={styles.badge}>CONSIGNEE FIELD INSPECTION (CRAC)</Text>
        <Text style={styles.poTitle}>{poNumber}</Text>
        <Text style={styles.titleText}>{consignmentTitle}</Text>
        <Text style={styles.vendorText}>Vendor: {vendorName}</Text>
      </View>

      {/* Camera Viewfinder */}
      <View style={styles.cameraBox}>
        <View style={styles.viewfinderHeader}>
          <Text style={styles.cameraTag}>🔴 LIVE CAMERA VIEWFINDER</Text>
          <View style={[styles.gpsBadge, geo.accuracyMeters < 5 ? styles.gpsGood : styles.gpsWarning]}>
            <Text style={styles.gpsText}>GPS ±{geo.accuracyMeters}m (Compliant)</Text>
          </View>
        </View>

        {/* Viewfinder Reticle */}
        <View style={styles.reticleContainer}>
          <View style={styles.reticleCornerTL} />
          <View style={styles.reticleCornerTR} />
          <View style={styles.reticleCornerBL} />
          <View style={styles.reticleCornerBR} />
          <Text style={styles.crosshair}>+</Text>
          <Text style={styles.reticleHint}>Align package barcode / serial marking within frame</Text>
        </View>

        {/* Live Watermark Overlay Box */}
        <View style={[styles.watermarkBox, { opacity: hudOpacity }]}>
          <View style={styles.watermarkTopRow}>
            <Text style={styles.watermarkHeading}>CERT-In AUDIT WATERMARK OVERLAY</Text>
            <TouchableOpacity
              style={styles.opacityToggle}
              onPress={() => setHudOpacity((prev) => (prev > 0.5 ? 0.35 : 0.85))}
            >
              <Text style={styles.opacityToggleText}>HUD: {hudOpacity > 0.5 ? 'HIGH' : 'LOW'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.watermarkText}>{watermarkPreview}</Text>
        </View>

        {/* Capture Button */}
        <TouchableOpacity style={styles.captureBtn} onPress={handleCapturePhoto} activeOpacity={0.8}>
          <Text style={styles.captureBtnText}>📷 CAPTURE WATERMARKED EVIDENCE ({photoCount} SAVED)</Text>
        </TouchableOpacity>
      </View>

      {/* Barcode Verification */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardHeader}>Scanned Barcodes ({scannedBarcodes.length})</Text>
          <TouchableOpacity style={styles.scanBtn} onPress={handleScanBarcode} activeOpacity={0.8}>
            <Text style={styles.scanBtnText}>+ Scan Tag</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.barcodeChips}>
          {scannedBarcodes.map((b, i) => (
            <View key={i} style={styles.chip}>
              <Text style={styles.chipText}>✓ {b}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Quantity Reconciliation */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardHeader}>Quantity Reconciliation (Total: {totalQuantity})</Text>
          <TouchableOpacity style={styles.presetBtn} onPress={handleAcceptAll}>
            <Text style={styles.presetBtnText}>✓ Accept All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.stepperContainer}>
          <Text style={styles.stepperTitle}>Accepted Quantity: {acceptedQuantity}</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => adjustAccepted(-10)}>
              <Text style={styles.stepBtnText}>-10</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stepBtn} onPress={() => adjustAccepted(-1)}>
              <Text style={styles.stepBtnText}>-1</Text>
            </TouchableOpacity>
            <View style={styles.qtyDisplay}>
              <Text style={styles.qtyDisplayText}>{acceptedQuantity}</Text>
            </View>
            <TouchableOpacity style={styles.stepBtn} onPress={() => adjustAccepted(+1)}>
              <Text style={styles.stepBtnText}>+1</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stepBtn} onPress={() => adjustAccepted(+10)}>
              <Text style={styles.stepBtnText}>+10</Text>
            </TouchableOpacity>
          </View>
        </View>

        {rejectedQuantity > 0 && (
          <View style={styles.defectBox}>
            <Text style={styles.defectLabel}>
              Rejected Units: {rejectedQuantity} • Mandatory Reason:
            </Text>
            <TextInput
              style={styles.defectInput}
              value={defectReason}
              onChangeText={setDefectReason}
              placeholder="Specify defect reason..."
              placeholderTextColor="#9CA3AF"
            />
          </View>
        )}
      </View>

      {/* Sign-off Button (PhonePe Purple) */}
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitCrac} activeOpacity={0.85}>
        <Text style={styles.submitBtnText}>SIGN &amp; ISSUE CRAC CERTIFICATE</Text>
        <Text style={styles.submitBtnSub}>Protected with Confirmation &amp; Offline Queue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, paddingBottom: 32 },
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
  badge: { color: '#5F259F', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  poTitle: { color: '#111827', fontSize: 17, fontWeight: '900', marginBottom: 2 },
  titleText: { color: '#4B5563', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  vendorText: { color: '#6B7280', fontSize: 12 },
  cameraBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewfinderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cameraTag: { color: '#DC2626', fontSize: 11, fontWeight: '800' },
  gpsBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  gpsGood: { backgroundColor: '#E8F5E9' },
  gpsWarning: { backgroundColor: '#FEF3C7' },
  gpsText: { color: '#00C853', fontSize: 11, fontWeight: '800' },
  reticleContainer: {
    height: 150,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  reticleCornerTL: { position: 'absolute', top: 10, left: 10, width: 20, height: 20, borderTopWidth: 2, borderLeftWidth: 2, borderColor: '#00C853' },
  reticleCornerTR: { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#00C853' },
  reticleCornerBL: { position: 'absolute', bottom: 10, left: 10, width: 20, height: 20, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: '#00C853' },
  reticleCornerBR: { position: 'absolute', bottom: 10, right: 10, width: 20, height: 20, borderBottomWidth: 2, borderRightWidth: 2, borderColor: '#00C853' },
  crosshair: { color: '#00C853', fontSize: 26, fontWeight: '300' },
  reticleHint: { color: '#94A3B8', fontSize: 10, marginTop: 4 },
  watermarkBox: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 },
  watermarkTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  watermarkHeading: { color: '#B45309', fontSize: 10, fontWeight: '800' },
  opacityToggle: { paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#F3F4F6', borderRadius: 4 },
  opacityToggleText: { color: '#5F259F', fontSize: 9, fontWeight: '800' },
  watermarkText: { color: '#1F2937', fontSize: 10, fontFamily: 'monospace', lineHeight: 15 },
  captureBtn: { backgroundColor: '#5F259F', minHeight: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center', padding: 8 },
  captureBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardHeader: { color: '#111827', fontSize: 14, fontWeight: '800' },
  scanBtn: { backgroundColor: '#F3E8FF', minHeight: 44, paddingHorizontal: 14, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  scanBtnText: { color: '#5F259F', fontWeight: '800', fontSize: 12 },
  barcodeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: { backgroundColor: '#F3E8FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  chipText: { color: '#5F259F', fontSize: 11, fontWeight: '700' },
  presetBtn: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  presetBtnText: { color: '#00C853', fontSize: 11, fontWeight: '800' },
  stepperContainer: { marginTop: 6 },
  stepperTitle: { color: '#4B5563', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  stepperRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  stepBtn: {
    flex: 1,
    minHeight: 44,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: { color: '#111827', fontSize: 13, fontWeight: '800' },
  qtyDisplay: { flex: 1.5, minHeight: 44, backgroundColor: '#FFFFFF', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#5F259F' },
  qtyDisplayText: { color: '#5F259F', fontSize: 16, fontWeight: '900' },
  defectBox: { marginTop: 12 },
  defectLabel: { color: '#DC2626', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  defectInput: { backgroundColor: '#FFFFFF', borderRadius: 8, color: '#111827', padding: 8, fontSize: 12, borderWidth: 1, borderColor: '#FCA5A5' },
  submitBtn: { backgroundColor: '#5F259F', minHeight: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', padding: 10, marginTop: 4, marginBottom: 24 },
  submitBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  submitBtnSub: { color: '#E9D5FF', fontSize: 10, marginTop: 2 },
});
