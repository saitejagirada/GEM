import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PortalOnboardingService } from '../services/PortalOnboardingService.ts';

describe('PortalOnboardingService', () => {
  it('validates official Buyer registration and enforces .gov.in/.nic.in domain requirement', () => {
    // Valid government officer
    const valid = PortalOnboardingService.validateBuyerOnboarding({
      fullName: 'Dr. Ramesh Kumar',
      officialGovEmail: 'ramesh.k@nic.in',
      designation: 'Director Procurement',
      mobileNumber: '9876543210',
      ministry: 'Ministry of Defence',
      department: 'Directorate of Ordnance',
      officeName: 'Central Ordnance Depot, Delhi',
      role: 'PRIMARY_HOD',
    });
    assert.strictEqual(valid.isValid, true);
    assert.strictEqual(valid.errors.length, 0);
    assert.strictEqual(valid.privileges.canCreateCustomBids, true);

    // Invalid non-gov email
    const invalid = PortalOnboardingService.validateBuyerOnboarding({
      fullName: 'Ramesh Kumar',
      officialGovEmail: 'ramesh@gmail.com',
      designation: 'Staff',
      mobileNumber: '9876543210',
      ministry: 'Ministry of Power',
      department: 'Operations',
      officeName: 'Office',
      role: 'BUYER',
    });
    assert.strictEqual(invalid.isValid, false);
    assert.ok(invalid.errors.some((e) => e.includes('.gov.in / .nic.in')));
  });

  it('validates Seller registration and grants 100% EMD waiver for verified Udyam MSE', () => {
    const validSeller = PortalOnboardingService.validateSellerOnboarding({
      companyName: 'Akash Solar & Power Technologies Pvt Ltd',
      constitution: 'PRIVATE_LIMITED',
      panNumber: 'ABCDE1234F',
      gstin: '07ABCDE1234F1Z5',
      authorizedSignatoryAadhaarLast4: '4321',
      bankAccountNumber: '918020034567890',
      bankIfsc: 'SBIN0001234',
      hasUdyamRegistration: true,
      udyamRegistrationNumber: 'UDYAM-DL-01-0089123',
      msmeTier: 'SMALL',
      annualTurnoverInr: 85000000,
      isOem: true,
    });

    assert.strictEqual(validSeller.isValid, true);
    assert.strictEqual(validSeller.errors.length, 0);
    assert.strictEqual(validSeller.privileges.emdExemptionGranted, true);
    assert.strictEqual(validSeller.privileges.purchasePreferenceEligible, true);
  });

  it('computes 25% annual quota and 10-day CRAC payment privileges for Micro/Small enterprises', () => {
    const privileges = PortalOnboardingService.calculateMsmePrivileges('MICRO');
    assert.strictEqual(privileges.emdWaiverPercent, 100);
    assert.strictEqual(privileges.procurementQuotaPercent, 25);
    assert.strictEqual(privileges.paymentSlaDays, 10);

    const largePrivileges = PortalOnboardingService.calculateMsmePrivileges('LARGE');
    assert.strictEqual(largePrivileges.emdWaiverPercent, 0);
    assert.strictEqual(largePrivileges.procurementQuotaPercent, 0);
  });
});
