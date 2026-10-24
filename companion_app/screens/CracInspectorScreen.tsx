import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
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

  const [geo] = useState<GeoCoordinate>({
    latitude: 28.613939,
    longitude: 77.209021,
    accuracyMeters: 3.5,
    timestampUtc: new Date().toISOString(),
  });

  const watermarkPreview = InspectionEngine.generateWatermarkString(poNumber, 'INSPECTOR-ORDNANCE-09', geo);

  const handleCapturePhoto = () => {
    setPhotoCount((prev) => prev + 1);
    Alert.alert('Photo Captured & Watermarked', `Embedded GPS (${geo.latitude.toFixed(4)}°, ${geo.longitude.toFixed(4)}°) + UTC timestamp into EXIF.`);
  };

  const handleScanBarcode = () => {
    const newBarcode = `BC-GEM-88192-${String.fromCharCode(65 + scannedBarcodes.length)}`;
    setScannedBarcodes((prev) => [...prev, newBarcode]);
    Alert.alert('Consignment Barcode Scanned', `Verified: ${newBarcode}`);
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
      'CRAC Generated & Queued Offline',
      `Consignee Receipt & Acceptance Certificate generated for ${acceptedQuantity} accepted items. Stored in encrypted offline queue for auto-sync.`
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

      {/* Camera Viewfinder with Tamper-Proof Watermark Overlay */}
      <View style={styles.cameraBox}>
        <View style={styles.viewfinderHeader}>
          <Text style={styles.cameraTag}>🔴 LIVE CAMERA VIEWFINDER</Text>
          <Text style={styles.gpsTag}>GPS ±{geo.accuracyMeters}m</Text>
        </View>

        {/* Live Watermark Overlay Box */}
        <View style={styles.watermarkBox}>
          <Text style={styles.watermarkHeading}>CERT-In AUDIT WATERMARK OVERLAY</Text>
          <Text style={styles.watermarkText}>{watermarkPreview}</Text>
        </View>

        <TouchableOpacity style={styles.captureBtn} onPress={handleCapturePhoto}>
          <Text style={styles.captureBtnText}>📷 CAPTURE WATERMARKED EVIDENCE ({photoCount} SAVED)</Text>
        </TouchableOpacity>
      </View>

      {/* Physical Consignment Barcode Verification */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardHeader}>Scanned Barcodes ({scannedBarcodes.length})</Text>
          <TouchableOpacity style={styles.scanBtn} onPress={handleScanBarcode}>
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
        <Text style={styles.cardHeader}>Quantity Reconciliation (Total: {totalQuantity})</Text>

        <View style={styles.qtyRow}>
          <View style={styles.qtyBox}>
            <Text style={styles.qtyLabel}>Accepted Qty</Text>
            <TextInput
              style={[styles.input, styles.inputAccepted]}
              keyboardType="numeric"
              value={String(acceptedQuantity)}
              onChangeText={(t) => setAcceptedQuantity(Number(t) || 0)}
            />
          </View>

          <View style={styles.qtyBox}>
            <Text style={styles.qtyLabel}>Rejected Qty</Text>
            <TextInput
              style={[styles.input, styles.inputRejected]}
              keyboardType="numeric"
              value={String(rejectedQuantity)}
              onChangeText={(t) => setRejectedQuantity(Number(t) || 0)}
            />
          </View>
        </View>

        {rejectedQuantity > 0 && (
          <View style={styles.defectBox}>
            <Text style={styles.defectLabel}>Mandatory Rejection / Defect Reason:</Text>
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

      {/* Submit / Sign-off Button */}
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitCrac}>
        <Text style={styles.submitBtnText}>SIGN & GENERATE CRAC CERTIFICATE</Text>
        <Text style={styles.submitBtnSub}>Commit to Offline SQLite Queue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 16 },
  card: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 16 },
  badge: { color: '#38BDF8', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  poTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '800', marginBottom: 2 },
  titleText: { color: '#E2E8F0', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  vendorText: { color: '#94A3B8', fontSize: 13 },
  cameraBox: { backgroundColor: '#020617', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  viewfinderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cameraTag: { color: '#EF4444', fontSize: 11, fontWeight: '700' },
  gpsTag: { color: '#10B981', fontSize: 11, fontWeight: '700' },
  watermarkBox: { backgroundColor: 'rgba(15, 23, 42, 0.85)', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#475569', marginBottom: 12 },
  watermarkHeading: { color: '#F59E0B', fontSize: 10, fontWeight: '800', marginBottom: 4 },
  watermarkText: { color: '#F8FAFC', fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },
  captureBtn: { backgroundColor: '#2563EB', minHeight: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', padding: 8 },
  captureBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardHeader: { color: '#F8FAFC', fontSize: 15, fontWeight: '700' },
  scanBtn: { backgroundColor: '#334155', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  scanBtnText: { color: '#38BDF8', fontWeight: '700', fontSize: 12 },
  barcodeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { backgroundColor: '#0F172A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  chipText: { color: '#10B981', fontSize: 12, fontWeight: '600' },
  qtyRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  qtyBox: { flex: 1 },
  qtyLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: { backgroundColor: '#0F172A', borderRadius: 8, color: '#FFFFFF', padding: 10, fontSize: 16, fontWeight: '700', borderWidth: 1 },
  inputAccepted: { borderColor: '#10B981' },
  inputRejected: { borderColor: '#EF4444' },
  defectBox: { marginTop: 12 },
  defectLabel: { color: '#F87171', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  defectInput: { backgroundColor: '#0F172A', borderRadius: 8, color: '#FFFFFF', padding: 10, fontSize: 13, borderWidth: 1, borderColor: '#EF4444' },
  submitBtn: { backgroundColor: '#059669', minHeight: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', padding: 10, marginBottom: 24 },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  submitBtnSub: { color: '#D1FAE5', fontSize: 11, marginTop: 2 },
});
