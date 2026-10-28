import { describe, it, expect } from './test-utils.ts';
import { PfmsTracker } from '../services/PfmsTracker.ts';
import type { InvoiceContractTracker } from '../types/index.ts';

describe('PfmsTracker', () => {
  it('creates initial 6 milestones with ORDER_PLACED marked completed', () => {
    const milestones = PfmsTracker.createInitialMilestones('2026-10-24T00:00:00Z');
    expect(milestones.length).toBe(6);
    expect(milestones[0].stage).toBe('ORDER_PLACED');
    expect(milestones[0].completed).toBe(true);
    expect(milestones[1].completed).toBe(false);
  });

  it('calculates progress accurately across milestone completions', () => {
    const milestones = PfmsTracker.createInitialMilestones();
    expect(PfmsTracker.calculateProgress(milestones)).toBe(17); // 1 / 6 ~ 17%

    milestones[1].completed = true;
    milestones[2].completed = true;
    expect(PfmsTracker.calculateProgress(milestones)).toBe(50); // 3 / 6 = 50%

    milestones.forEach((m) => (m.completed = true));
    expect(PfmsTracker.calculateProgress(milestones)).toBe(100);
  });

  it('advances stages sequentially and preserves reference IDs', () => {
    const initialTracker: InvoiceContractTracker = {
      contractId: 'CONT-4001',
      invoiceNumber: 'INV-2026-90',
      totalAmountInr: 1250000,
      buyerName: 'Directorate of Health Services',
      sellerName: 'MedTech Innovations Ltd',
      statutorySlaDaysRemaining: 8,
      isDeemedAccepted: false,
      milestones: PfmsTracker.createInitialMilestones(),
    };

    const advanced = PfmsTracker.advanceStage(initialTracker, 'PFMS_TREASURY_SANCTION', 'PFMS-BILL-778899');

    expect(advanced.pfmsBillId).toBe('PFMS-BILL-778899');
    expect(advanced.milestones.find((m) => m.stage === 'PRC_ISSUED')?.completed).toBe(true);
    expect(advanced.milestones.find((m) => m.stage === 'CRAC_APPROVED')?.completed).toBe(true);
    expect(advanced.milestones.find((m) => m.stage === 'PFMS_TREASURY_SANCTION')?.completed).toBe(true);
    expect(advanced.milestones.find((m) => m.stage === 'BANK_UTR_CREDITED')?.completed).toBe(false);
    expect(advanced.statutorySlaDaysRemaining).toBe(0); // CRAC is approved
  });

  it('evaluates SLA status and handles deemed acceptance alerts', () => {
    const tracker: InvoiceContractTracker = {
      contractId: 'CONT-4002',
      invoiceNumber: 'INV-2026-91',
      totalAmountInr: 500000,
      buyerName: 'Central Reserve Police Force',
      sellerName: 'Armor Gear Pvt Ltd',
      statutorySlaDaysRemaining: 1, // Critical
      isDeemedAccepted: false,
      milestones: PfmsTracker.createInitialMilestones(),
    };

    const statusCritical = PfmsTracker.evaluateSlaStatus(tracker);
    expect(statusCritical.autoAcceptanceActive).toBe(false);
    expect(statusCritical.statusLabel).toContain('CRITICAL');

    // Day 10 SLA passed -> Deemed Accepted
    tracker.statutorySlaDaysRemaining = 0;
    tracker.isDeemedAccepted = true;
    const statusDeemed = PfmsTracker.evaluateSlaStatus(tracker);
    expect(statusDeemed.autoAcceptanceActive).toBe(true);
    expect(statusDeemed.statusLabel).toContain('Deemed Accepted');
  });
});
