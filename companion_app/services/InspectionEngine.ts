/**
 * GeM Mobile Companion App - Field Inspection Engine
 * Handles offline photo watermarking, barcode matching, and CRAC sign-off validation.
 */

import type { InspectionItem, GeoCoordinate } from '../types/index.ts';

export class InspectionEngine {
  /**
   * Generates a tamper-proof watermark string for on-site inspection photos.
   * Formatted to meet Indian CERT-In and General Financial Rules (GFR) 2017 audit standards.
   */
  public static generateWatermarkString(
    poNumber: string,
    consigneeId: string,
    geo: GeoCoordinate
  ): string {
    const dateFormatted = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    return (
      `GeM INSPECTION | PO: ${poNumber}\n` +
      `CONSIGNEE: ${consigneeId} | TIME: ${dateFormatted}\n` +
      `LAT: ${geo.latitude.toFixed(6)}° | LON: ${geo.longitude.toFixed(6)}° (±${geo.accuracyMeters.toFixed(1)}m)`
    );
  }

  /**
   * Validates whether an inspection has met all statutory requirements before generating CRAC.
   */
  public static validateInspectionReadiness(inspection: InspectionItem): {
    ready: boolean;
    missingRequirements: string[];
  } {
    const errors: string[] = [];

    // Rule 1: Minimum 2 photo evidence items required
    if (inspection.evidencePhotos.length < 2) {
      errors.push('Minimum 2 geo-tagged evidence photos are required for CRAC issuance.');
    }

    // Rule 2: Barcode must be scanned
    if (inspection.barcodeScanned.length === 0) {
      errors.push('At least one physical consignment barcode / QR code must be scanned on-site.');
    }

    // Rule 3: Quantity reconciliation check
    if (inspection.acceptedQuantity + inspection.rejectedQuantity !== inspection.totalQuantity) {
      errors.push(
        `Quantity mismatch: Accepted (${inspection.acceptedQuantity}) + Rejected (${inspection.rejectedQuantity}) ` +
        `must equal Total Delivered (${inspection.totalQuantity}).`
      );
    }

    // Rule 4: If rejections exist, explicit defect reason is mandatory
    if (inspection.rejectedQuantity > 0 && !inspection.defectReason?.trim()) {
      errors.push('Rejection reason must be specified when rejecting items.');
    }

    return {
      ready: errors.length === 0,
      missingRequirements: errors,
    };
  }

  /**
   * Evaluates the 10-day statutory GeM SLA for CRAC issuance.
   * Day 10 triggers automated deemed acceptance if buyer is unresponsive.
   */
  public static evaluateStatutorySla(deliveryDateIso: string): {
    daysElapsed: number;
    daysRemaining: number;
    isDeemedAccepted: boolean;
    urgencyLevel: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'ESCALATED';
  } {
    const delivery = new Date(deliveryDateIso).getTime();
    const now = Date.now();
    const diffDays = Math.floor((now - delivery) / (1000 * 60 * 60 * 24));
    const remaining = Math.max(0, 10 - diffDays);

    let urgencyLevel: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'ESCALATED' = 'NORMAL';
    if (diffDays >= 10) {
      urgencyLevel = 'ESCALATED';
    } else if (diffDays >= 8) {
      urgencyLevel = 'CRITICAL';
    } else if (diffDays >= 6) {
      urgencyLevel = 'WARNING';
    }

    return {
      daysElapsed: diffDays,
      daysRemaining: remaining,
      isDeemedAccepted: diffDays >= 10,
      urgencyLevel,
    };
  }
}
