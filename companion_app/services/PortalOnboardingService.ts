/**
 * GeM Official Portal Onboarding & Registration Service
 * Reverse-engineered from https://mkp.gem.gov.in/registration/signup#!/buyer
 * and https://mkp.gem.gov.in/registration/signup#!/seller.
 * Manages official government buyer verification and seller KYC workflows.
 */

export type UserRoleType = 'BUYER_PRIMARY_HOD' | 'BUYER_SECONDARY' | 'SELLER_ENTERPRISE' | 'SERVICE_PROVIDER';
export type BusinessConstitution = 'PROPRIETORSHIP' | 'PARTNERSHIP' | 'PRIVATE_LIMITED' | 'PUBLIC_LIMITED' | 'SOCIETY_TRUST' | 'PSU';
export type MsmeTier = 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE';

export interface BuyerOnboardingRequest {
  fullName: string;
  officialGovEmail: string; // Must end in .gov.in or .nic.in
  designation: string;
  mobileNumber: string;
  ministry: string;
  department: string;
  officeName: string;
  role: 'PRIMARY_HOD' | 'BUYER' | 'CONSIGNEE' | 'PAO_DDO';
}

export interface SellerOnboardingRequest {
  companyName: string;
  constitution: BusinessConstitution;
  panNumber: string;
  gstin: string;
  authorizedSignatoryAadhaarLast4: string;
  bankAccountNumber: string;
  bankIfsc: string;
  hasUdyamRegistration: boolean;
  udyamRegistrationNumber?: string;
  msmeTier: MsmeTier;
  annualTurnoverInr: number;
  isOem: boolean;
}

export interface OnboardingValidationResult {
  isValid: boolean;
  errors: string[];
  privileges: {
    emdExemptionGranted: boolean;
    purchasePreferenceEligible: boolean; // 25% annual procurement quota under PPP-MII / MSE
    canCreateCustomBids: boolean;
    canAuthorizeCracPayment: boolean;
  };
}

export class PortalOnboardingService {
  /**
   * Validates official Government Buyer onboarding requests.
   * GFR Mandate: Primary User registration requires official government email (.gov.in / .nic.in).
   */
  public static validateBuyerOnboarding(req: BuyerOnboardingRequest): OnboardingValidationResult {
    const errors: string[] = [];

    if (!req.fullName.trim()) {
      errors.push('Full legal name of officer is mandatory.');
    }

    const email = req.officialGovEmail.trim().toLowerCase();
    const isGovEmail = /(@|\.)(gov\.in|nic\.in|mil\.in|railnet\.gov\.in)$/i.test(email);
    if (!isGovEmail) {
      errors.push('Official government email domain (.gov.in / .nic.in) is mandatory for Buyer registration on GeM.');
    }

    if (!req.ministry || req.ministry.trim().length < 3) {
      errors.push('Central / State Ministry designation is required.');
    }

    if (!req.officeName || req.officeName.trim().length < 3) {
      errors.push('Registered office name / establishment is required.');
    }

    if (!req.mobileNumber || !/^\d{10}$/.test(req.mobileNumber.trim())) {
      errors.push('Valid 10-digit Aadhaar-linked mobile number required for OTP verification.');
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      privileges: {
        emdExemptionGranted: false, // Buyers do not pay EMD
        purchasePreferenceEligible: false,
        canCreateCustomBids: req.role === 'PRIMARY_HOD' || req.role === 'BUYER',
        canAuthorizeCracPayment: req.role === 'PRIMARY_HOD' || req.role === 'PAO_DDO',
      },
    };
  }

  /**
   * Validates Seller / Service Provider registration and computes statutory MSE advantages.
   */
  public static validateSellerOnboarding(req: SellerOnboardingRequest): OnboardingValidationResult {
    const errors: string[] = [];

    if (!req.companyName.trim()) {
      errors.push('Company legal trade name is mandatory.');
    }

    // Standard Indian PAN format: 5 letters, 4 digits, 1 letter
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(req.panNumber.trim().toUpperCase())) {
      errors.push('Invalid Permanent Account Number (PAN) format.');
    }

    // Standard 15-character GSTIN format
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(req.gstin.trim().toUpperCase())) {
      errors.push('Invalid 15-character Goods & Services Tax (GSTIN) format.');
    }

    if (!req.bankAccountNumber || req.bankAccountNumber.length < 8) {
      errors.push('Valid Bank Account number required for PFMS Treasury disbursal.');
    }

    // Standard 11-character IFSC format
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(req.bankIfsc.trim().toUpperCase())) {
      errors.push('Invalid 11-character Bank IFSC Code.');
    }

    if (req.hasUdyamRegistration) {
      if (!req.udyamRegistrationNumber || !req.udyamRegistrationNumber.startsWith('UDYAM-')) {
        errors.push('Udyam Registration Number must begin with UDYAM- (e.g., UDYAM-DL-01-0012345).');
      }
    }

    const isValid = errors.length === 0;
    const isMse = req.hasUdyamRegistration && req.msmeTier !== 'LARGE';

    return {
      isValid,
      errors,
      privileges: {
        emdExemptionGranted: isMse, // 100% EMD Waiver for verified MSEs
        purchasePreferenceEligible: isMse, // L1 + 15% Purchase preference
        canCreateCustomBids: false,
        canAuthorizeCracPayment: false,
      },
    };
  }

  /**
   * Calculates MSME statutory advantages based on Udyam classification.
   */
  public static calculateMsmePrivileges(tier: MsmeTier): {
    emdWaiverPercent: number;
    purchasePreferenceBand: string;
    procurementQuotaPercent: number;
    paymentSlaDays: number;
  } {
    if (tier === 'LARGE') {
      return {
        emdWaiverPercent: 0,
        purchasePreferenceBand: 'None (General L1)',
        procurementQuotaPercent: 0,
        paymentSlaDays: 10,
      };
    }

    return {
      emdWaiverPercent: 100, // 100% EMD exemption across all central & state tenders
      purchasePreferenceBand: 'L1 + 15% matching price band',
      procurementQuotaPercent: 25, // Mandatory 25% annual government procurement quota from MSEs
      paymentSlaDays: 10, // Statutory deemed acceptance & payment within 10 days of CRAC
    };
  }
}
