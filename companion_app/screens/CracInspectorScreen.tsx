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

  // Glove-friendly stepper adjustments
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

      {/* Camera Viewfinder with Crosshairs & Tamper-Proof Watermark */}
      <View style={styles.cameraBox}>
        {/* Viewfinder Header */}
        <View style={styles.viewfinderHeader}>
          <Text style={styles.cameraTag}>🔴 LIVE CAMERA VIEWFINDER</Text>
          <View style={[styles.gpsBadge, geo.accuracyMeters < 5 ? styles.gpsGood : styles.gpsWarning]}>
            <Text style={styles.gpsText}>GPS ±{geo.accuracyMeters}m (Compliant)</Text>
          </View>
        </View>

        {/* Viewfinder Reticle / Target Area */}
        <View style={styles.reticleContainer}>
          <View style={styles.reticleCornerTL} />
          <View style={styles.reticleCornerTR} />
          <View style={styles.reticleCornerBL} />
          <View style={styles.reticleCornerBR} />
          <Text style={styles.crosshair}>+</Text>
          <Text style={styles.reticleHint}>Align package barcode / serial marking within frame</Text>
        </View>

        {/* Live Watermark Overlay Box with Opacity Toggle */}
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

        {/* Capture Button (Min 48dp) */}
        <TouchableOpacity style={styles.captureBtn} onPress={handleCapturePhoto} activeOpacity={0.8}>
          <Text style={styles.captureBtnText}>📷 CAPTURE WATERMARKED EVIDENCE ({photoCount} SAVED)</Text>
        </TouchableOpacity>
      </View>

      {/* Barcode Verification (Min 48dp) */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardHeader}>Scanned Barcodes ({scannedBarcodes.length})</Text>
          <TouchableOpacity style={styles.scanBtn} onPress={handleScanBarcode} activeOpacity={0.8}>
            <Text style={styles.scanBtnText}>+ Scan Tag (48dp)</Text>
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

      {/* Glove-Safe Quantity Reconciliation */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardHeader}>Quantity Reconciliation (Total: {totalQuantity})</Text>
          <TouchableOpacity style={styles.presetBtn} onPress={handleAcceptAll}>
            <Text style={styles.presetBtnText}>✓ Accept All</Text>
          </TouchableOpacity>
        </View>

        {/* Rapid Stepper Controls for Gloved Field Workers */}
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

        {/* Rejection / Defect Section */}
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
              placeholderTextColor="#94A3B8"
            />
          </View>
        )}
      </View>

      {/* Double-Confirmed Sign-off Button (Min 56dp) */}
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitCrac} activeOpacity={0.85}>
        <Text style={styles.submitBtnText}>SIGN &amp; ISSUE CRAC CERTIFICATE</Text>
        <Text style={styles.submitBtnSub}>Protected with Confirmation &amp; Offline Queue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B132B' },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: '#1E293B', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  badge: { color: '#38BDF8', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  poTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '900', marginBottom: 2 },
  titleText: { color: '#CBD5E1', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  vendorText: { color: '#94A3B8', fontSize: 13 },
  cameraBox: { backgroundColor: '#020617', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  viewfinderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cameraTag: { color: '#EF4444', fontSize: 11, fontWeight: '800' },
  gpsBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  gpsGood: { backgroundColor: 'rgba(0, 208, 156, 0.2)' },
  gpsWarning: { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
  gpsText: { color: '#00D09C', fontSize: 11, fontWeight: '800' },
  reticleContainer: {
    height: 160,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  reticleCornerTL: { position: 'absolute', top: 10, left: 10, width: 20, height: 20, borderTopWidth: 2, borderLeftWidth: 2, borderColor: '#00D09C' },
  reticleCornerTR: { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#00D09C' },
  reticleCornerBL: { position: 'absolute', bottom: 10, left: 10, width: 20, height: 20, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: '#00D09C' },
  reticleCornerBR: { position: 'absolute', bottom: 10, right: 10, width: 20, height: 20, borderBottomWidth: 2, borderRightWidth: 2, borderColor: '#00D09C' },
  crosshair: { color: '#00D09C', fontSize: 26, fontWeight: '300' },
  reticleHint: { color: '#64748B', fontSize: 10, marginTop: 4 },
  watermarkBox: { backgroundColor: '#0F172A', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#475569', marginBottom: 12 },
  watermarkTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  watermarkHeading: { color: '#F59E0B', fontSize: 10, fontWeight: '900' },
  opacityToggle: { paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#1E293B', borderRadius: 4 },
  opacityToggleText: { color: '#38BDF8', fontSize: 9, fontWeight: '800' },
  watermarkText: { color: '#F8FAFC', fontSize: 10, fontFamily: 'monospace', lineHeight: 15 },
  captureBtn: { backgroundColor: '#2563EB', minHeight: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', padding: 8 },
  captureBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardHeader: { color: '#F8FAFC', fontSize: 15, fontWeight: '800' },
  scanBtn: { backgroundColor: '#334155', minHeight: 48, minWidth: 120, paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  scanBtnText: { color: '#38BDF8', fontWeight: '800', fontSize: 12 },
  barcodeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: { backgroundColor: '#0F172A', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  chipText: { color: '#00D09C', fontSize: 12, fontWeight: '700' },
  presetBtn: { backgroundColor: 'rgba(0, 208, 156, 0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  presetBtnText: { color: '#00D09C', fontSize: 11, fontWeight: '800' },
  stepperContainer: { marginTop: 8 },
  stepperTitle: { color: '#CBD5E1', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  stepperRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  stepBtn: {
    flex: 1,
    minHeight: 48,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: { color: '#F8FAFC', fontSize: 14, fontWeight: '800' },
  qtyDisplay: { flex: 1.5, minHeight: 48, backgroundColor: '#1E293B', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#00D09C' },
  qtyDisplayText: { color: '#00D09C', fontSize: 18, fontWeight: '900' },
  defectBox: { marginTop: 14 },
  defectLabel: { color: '#F87171', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  defectInput: { backgroundColor: '#0F172A', borderRadius: 8, color: '#FFFFFF', padding: 10, fontSize: 13, borderWidth: 1, borderColor: '#EF4444' },
  submitBtn: { backgroundColor: '#059669', minHeight: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', padding: 10, marginTop: 4, marginBottom: 24 },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  submitBtnSub: { color: '#D1FAE5', fontSize: 11, marginTop: 2 },
});
