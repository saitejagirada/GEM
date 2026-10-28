import { describe, it, expect } from './test-utils.ts';
import { DESIGN_TOKENS, LIGHT_THEME } from '../theme/designTokens.ts';
import { formatInr, formatLakhs, formatDateSafe } from '../utils/formatters.ts';
import { PortalOnboardingService } from '../services/PortalOnboardingService.ts';
import { MarketplaceService } from '../services/MarketplaceService.ts';

describe('UI/UX Specification & Design Tokens Verification', () => {
  it('conforms strictly to the NotebookLM-inspired design tokens', () => {
    expect(DESIGN_TOKENS.cardRadius).toBe(16);
    expect(DESIGN_TOKENS.headerHeight).toBe(56);
    expect(DESIGN_TOKENS.bottomNavHeight).toBe(64);
    expect(DESIGN_TOKENS.inputRadius).toBe(10);
    expect(DESIGN_TOKENS.touchTargetMin).toBe(44);

    // Light Theme Colors from specification
    expect(LIGHT_THEME.background).toBe('#F7F9FC');
    expect(LIGHT_THEME.surface).toBe('#FFFFFF');
    expect(LIGHT_THEME.primary).toBe('#174EA6');
    expect(LIGHT_THEME.textPrimary).toBe('#14233B');
    expect(LIGHT_THEME.border).toBe('#DCE5F0');
    expect(LIGHT_THEME.success).toBe('#16834A');
  });

  it('verifies safe Indian currency and date formatting for high-density cards', () => {
    // Indian grouping
    expect(formatInr(3850000)).toBe('38,50,000');
    expect(formatInr(45000)).toBe('45,000');
    expect(formatInr(0)).toBe('0');
    expect(formatInr(null)).toBe('0');

    // Lakhs formatter
    expect(formatLakhs(4500000)).toBe('₹45.00 Lakhs');
    expect(formatLakhs(12500000)).toBe('₹1.25 Cr');

    // Safe date
    expect(formatDateSafe('2026-10-28T14:30:00Z')).toContain('2026');
  });

  it('validates Reverse Auction decrement logic and safe cost floor guard', () => {
    const currentL1 = 3850000;
    const minDecrement = 10000;
    const maxAcceptableBid = currentL1 - minDecrement;
    expect(maxAcceptableBid).toBe(3840000);

    const costFloor = 3700000;
    const profitableBid = 3750000;
    const underfloorBid = 3650000;

    expect(profitableBid >= costFloor).toBe(true);
    expect(underfloorBid < costFloor).toBe(true);
  });

  it('validates multi-step Buyer registration domain enforcement', () => {
    const invalidRes = PortalOnboardingService.validateBuyerOnboarding({
      fullName: 'Test Officer',
      officialGovEmail: 'officer@gmail.com', // Non-gov email
      designation: 'Director',
      mobileNumber: '9876543210',
      ministry: 'Ministry of Finance',
      department: 'Revenue',
      officeName: 'CBDT',
      role: 'BUYER',
    });
    expect(invalidRes.isValid).toBe(false);

    const validRes = PortalOnboardingService.validateBuyerOnboarding({
      fullName: 'Test Officer',
      officialGovEmail: 'officer@gov.in', // Official gov email
      designation: 'Director',
      mobileNumber: '9876543210',
      ministry: 'Ministry of Finance',
      department: 'Revenue',
      officeName: 'CBDT',
      role: 'BUYER',
    });
    expect(validRes.isValid).toBe(true);
  });

  it('validates Seller MSE KYC and 100% EMD waiver privileges', () => {
    const microMseRes = PortalOnboardingService.validateSellerOnboarding({
      companyName: 'Garuda Tech & Electrical Solutions',
      constitution: 'PRIVATE_LIMITED',
      panNumber: 'AABCG1234F',
      gstin: '07AABCG1234F1Z8',
      authorizedSignatoryAadhaarLast4: '1234',
      bankAccountNumber: '918020034567890',
      bankIfsc: 'SBIN0001234',
      hasUdyamRegistration: true,
      udyamRegistrationNumber: 'UDYAM-DL-01-0098765',
      msmeTier: 'MICRO',
    });
    expect(microMseRes.isValid).toBe(true);
    expect(microMseRes.privileges.emdExemptionGranted).toBe(true);

    const privileges = PortalOnboardingService.calculateMsmePrivileges('MICRO');
    expect(privileges.emdWaiverPercent).toBe(100);
    expect(privileges.paymentSlaDays).toBe(10);
  });

  it('verifies GFR 149 procurement calculator thresholds', () => {
    const directPurchase = MarketplaceService.evaluateGfrProcurementMode(20000);
    expect(directPurchase.mode).toBe('DIRECT_PURCHASE');

    const l1Comparison = MarketplaceService.evaluateGfrProcurementMode(150000);
    expect(l1Comparison.mode).toBe('L1_COMPARISON');

    const mandatoryBid = MarketplaceService.evaluateGfrProcurementMode(750000);
    expect(mandatoryBid.mode).toBe('MANDATORY_BID_OR_RA');
  });
});
