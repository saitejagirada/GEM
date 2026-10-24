/**
 * GeM Mobile Companion App - PFMS & Payment Milestone Service
 * Tracks invoice disbursement stages, bank UTR settlement, and 10-day CRAC statutory countdown.
 */

import type { InvoiceContractTracker, PaymentMilestone, MilestoneStage } from '../types/index.ts';

export const ORDERED_STAGES: { stage: MilestoneStage; title: string; defaultDescription: string }[] = [
  { stage: 'ORDER_PLACED', title: 'Order Placed', defaultDescription: 'Contract finalized on GeM Portal' },
  { stage: 'DISPATCHED', title: 'Goods Dispatched', defaultDescription: 'Consignment shipped by vendor with e-Way bill' },
  { stage: 'PRC_ISSUED', title: 'PRC Issued', defaultDescription: 'Provisional Receipt Certificate generated on delivery' },
  { stage: 'CRAC_APPROVED', title: 'CRAC Approved', defaultDescription: 'Consignee Receipt & Acceptance Certificate verified' },
  { stage: 'PFMS_TREASURY_SANCTION', title: 'PFMS Sanctioned', defaultDescription: 'Bill passed and sanctioned in PFMS treasury' },
  { stage: 'BANK_UTR_CREDITED', title: 'Bank UTR Credited', defaultDescription: 'Funds credited to seller bank account via RBI NEFT/RTGS' },
];

export class PfmsTracker {
  /**
   * Initializes standard milestones for a new GeM contract.
   */
  public static createInitialMilestones(orderPlacedDate: string = new Date().toISOString()): PaymentMilestone[] {
    return ORDERED_STAGES.map((s, idx) => ({
      stage: s.stage,
      title: s.title,
      completed: idx === 0,
      completedAt: idx === 0 ? orderPlacedDate : undefined,
      description: s.defaultDescription,
    }));
  }

  /**
   * Computes the overall disbursement progress percentage (0 - 100%).
   */
  public static calculateProgress(milestones: PaymentMilestone[]): number {
    if (!milestones || milestones.length === 0) return 0;
    const completedCount = milestones.filter((m) => m.completed).length;
    return Math.round((completedCount / milestones.length) * 100);
  }

  /**
   * Returns the current active stage.
   */
  public static getCurrentStage(milestones: PaymentMilestone[]): MilestoneStage {
    const uncompleted = milestones.find((m) => !m.completed);
    if (!uncompleted) {
      return 'BANK_UTR_CREDITED';
    }
    return uncompleted.stage;
  }

  /**
   * Advances the tracker to a specific stage, marking all preceding stages completed.
   */
  public static advanceStage(
    tracker: InvoiceContractTracker,
    targetStage: MilestoneStage,
    referenceId?: string
  ): InvoiceContractTracker {
    const targetIndex = ORDERED_STAGES.findIndex((s) => s.stage === targetStage);
    if (targetIndex === -1) return tracker;

    const updatedMilestones = tracker.milestones.map((m, idx) => {
      if (idx <= targetIndex) {
        return {
          ...m,
          completed: true,
          completedAt: m.completedAt || new Date().toISOString(),
          referenceId: idx === targetIndex && referenceId ? referenceId : m.referenceId,
        };
      }
      return m;
    });

    const isCracDone = targetIndex >= ORDERED_STAGES.findIndex((s) => s.stage === 'CRAC_APPROVED');

    return {
      ...tracker,
      milestones: updatedMilestones,
      bankUtrNumber: targetStage === 'BANK_UTR_CREDITED' ? referenceId || tracker.bankUtrNumber : tracker.bankUtrNumber,
      pfmsBillId: targetStage === 'PFMS_TREASURY_SANCTION' ? referenceId || tracker.pfmsBillId : tracker.pfmsBillId,
      statutorySlaDaysRemaining: isCracDone ? 0 : tracker.statutorySlaDaysRemaining,
    };
  }

  /**
   * Evaluates the statutory 10-day auto-acceptance countdown and urgency indicators.
   */
  public static evaluateSlaStatus(tracker: InvoiceContractTracker): {
    isDelayed: boolean;
    daysRemaining: number;
    autoAcceptanceActive: boolean;
    statusLabel: string;
    badgeColor: string;
  } {
    const cracMilestone = tracker.milestones.find((m) => m.stage === 'CRAC_APPROVED');
    if (cracMilestone?.completed) {
      return {
        isDelayed: false,
        daysRemaining: 0,
        autoAcceptanceActive: false,
        statusLabel: 'CRAC Approved',
        badgeColor: '#10B981', // Emerald Green
      };
    }

    if (tracker.isDeemedAccepted || tracker.statutorySlaDaysRemaining <= 0) {
      return {
        isDelayed: true,
        daysRemaining: 0,
        autoAcceptanceActive: true,
        statusLabel: 'Deemed Accepted (Day 10 SLA Reached)',
        badgeColor: '#8B5CF6', // Purple notice
      };
    }

    if (tracker.statutorySlaDaysRemaining <= 2) {
      return {
        isDelayed: false,
        daysRemaining: tracker.statutorySlaDaysRemaining,
        autoAcceptanceActive: false,
        statusLabel: `CRITICAL: ${tracker.statutorySlaDaysRemaining} Days Before Auto-Acceptance`,
        badgeColor: '#EF4444', // Red
      };
    }

    if (tracker.statutorySlaDaysRemaining <= 4) {
      return {
        isDelayed: false,
        daysRemaining: tracker.statutorySlaDaysRemaining,
        autoAcceptanceActive: false,
        statusLabel: `Warning: ${tracker.statutorySlaDaysRemaining} Days Left for CRAC`,
        badgeColor: '#F59E0B', // Amber
      };
    }

    return {
      isDelayed: false,
      daysRemaining: tracker.statutorySlaDaysRemaining,
      autoAcceptanceActive: false,
      statusLabel: `${tracker.statutorySlaDaysRemaining} Days Remaining for Inspection`,
      badgeColor: '#3B82F6', // Blue
    };
  }
}
