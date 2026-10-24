import { describe, it, expect } from './test-utils.ts';
import { InspectionEngine } from '../services/InspectionEngine.ts';
import type { InspectionItem, GeoCoordinate } from '../types/index.ts';

describe('InspectionEngine', () => {
  const mockGeo: GeoCoordinate = {
    latitude: 28.613939,
    longitude: 77.209021,
    accuracyMeters: 4.2,
    timestampUtc: '2026-10-24T10:00:00Z',
  };

  it('generates a compliant CERT-In watermark string', () => {
    const watermark = InspectionEngine.generateWatermarkString('GEM-PO-889900', 'CONSIGNEE-DELHI-01', mockGeo);
    expect(watermark).toContain('GeM INSPECTION | PO: GEM-PO-889900');
    expect(watermark).toContain('CONSIGNEE: CONSIGNEE-DELHI-01');
    expect(watermark).toContain('LAT: 28.613939° | LON: 77.209021°');
    expect(watermark).toContain('±4.2m');
  });

  it('rejects inspection readiness when evidence photos are under 2', () => {
    const invalidInspection: InspectionItem = {
      id: 'insp-1',
      poNumber: 'PO-123',
      consignmentTitle: 'Industrial Steel Pipes',
      vendorName: 'Bharat Steel Corp',
      totalQuantity: 100,
      acceptedQuantity: 100,
      rejectedQuantity: 0,
      barcodeScanned: ['BC-001'],
      evidencePhotos: [
        {
          id: 'p1',
          localUri: 'file:///photo1.jpg',
          sha256Hash: 'hash1',
          geoTag: mockGeo,
          watermarkText: 'test',
          capturedAtUtc: '2026-10-24T10:00:00Z',
          synced: true,
        },
      ],
      status: 'IN_PROGRESS',
      offlineCreated: false,
    };

    const result = InspectionEngine.validateInspectionReadiness(invalidInspection);
    expect(result.ready).toBe(false);
    expect(result.missingRequirements).toContain('Minimum 2 geo-tagged evidence photos are required for CRAC issuance.');
  });

  it('rejects inspection readiness when total quantities do not reconcile', () => {
    const mismatchedInspection: InspectionItem = {
      id: 'insp-2',
      poNumber: 'PO-124',
      consignmentTitle: 'Office Desks',
      vendorName: 'Wood Works Ltd',
      totalQuantity: 50,
      acceptedQuantity: 40,
      rejectedQuantity: 5, // 45 != 50
      barcodeScanned: ['BC-002'],
      evidencePhotos: [
        { id: 'p1', localUri: 'u1', sha256Hash: 'h1', geoTag: mockGeo, watermarkText: 'w1', capturedAtUtc: 'now', synced: true },
        { id: 'p2', localUri: 'u2', sha256Hash: 'h2', geoTag: mockGeo, watermarkText: 'w2', capturedAtUtc: 'now', synced: true },
      ],
      status: 'IN_PROGRESS',
      offlineCreated: false,
    };

    const result = InspectionEngine.validateInspectionReadiness(mismatchedInspection);
    expect(result.ready).toBe(false);
    expect(result.missingRequirements.some((r) => r.includes('Quantity mismatch'))).toBe(true);
  });

  it('requires defect reason when items are rejected', () => {
    const noReasonInspection: InspectionItem = {
      id: 'insp-3',
      poNumber: 'PO-125',
      consignmentTitle: 'Network Routers',
      vendorName: 'Cisco Systems Partner',
      totalQuantity: 10,
      acceptedQuantity: 8,
      rejectedQuantity: 2,
      barcodeScanned: ['BC-003'],
      evidencePhotos: [
        { id: 'p1', localUri: 'u1', sha256Hash: 'h1', geoTag: mockGeo, watermarkText: 'w1', capturedAtUtc: 'now', synced: true },
        { id: 'p2', localUri: 'u2', sha256Hash: 'h2', geoTag: mockGeo, watermarkText: 'w2', capturedAtUtc: 'now', synced: true },
      ],
      status: 'IN_PROGRESS',
      defectReason: '',
      offlineCreated: false,
    };

    const result = InspectionEngine.validateInspectionReadiness(noReasonInspection);
    expect(result.ready).toBe(false);
    expect(result.missingRequirements).toContain('Rejection reason must be specified when rejecting items.');
  });

  it('correctly calculates 10-day SLA countdown and triggers deemed acceptance on day 10', () => {
    const today = new Date();

    // 3 days ago -> 7 days remaining, NORMAL
    const delivery3DaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const sla3 = InspectionEngine.evaluateStatutorySla(delivery3DaysAgo);
    expect(sla3.daysRemaining).toBe(7);
    expect(sla3.isDeemedAccepted).toBe(false);
    expect(sla3.urgencyLevel).toBe('NORMAL');

    // 7 days ago -> 3 days remaining, WARNING
    const delivery7DaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const sla7 = InspectionEngine.evaluateStatutorySla(delivery7DaysAgo);
    expect(sla7.daysRemaining).toBe(3);
    expect(sla7.urgencyLevel).toBe('WARNING');

    // 9 days ago -> 1 day remaining, CRITICAL
    const delivery9DaysAgo = new Date(today.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString();
    const sla9 = InspectionEngine.evaluateStatutorySla(delivery9DaysAgo);
    expect(sla9.daysRemaining).toBe(1);
    expect(sla9.urgencyLevel).toBe('CRITICAL');

    // 11 days ago -> 0 days remaining, ESCALATED & deemed accepted
    const delivery11DaysAgo = new Date(today.getTime() - 11 * 24 * 60 * 60 * 1000).toISOString();
    const sla11 = InspectionEngine.evaluateStatutorySla(delivery11DaysAgo);
    expect(sla11.daysRemaining).toBe(0);
    expect(sla11.isDeemedAccepted).toBe(true);
    expect(sla11.urgencyLevel).toBe('ESCALATED');
  });
});
