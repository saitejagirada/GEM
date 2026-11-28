/**
 * GeM Onboarding & Registration Screen
 * Conforms to Screens 7 & 8 of the GeM Mobile UI Specification:
 * - Screen 7: Buyer Registration with 3-Step Progress Tracker (Department, Officer Details, Review)
 * - Screen 8: Seller / MSE KYC with 4-Step Progress Tracker (Business, Tax IDs, Classification, Review)
 * - Rounded input fields with explicit labels and placeholders
 * - MSE statutory benefit privileges (100% EMD waiver & 10-day payment SLA)
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Linking,
  Pressable,
} from 'react-native';
import { PortalOnboardingService, MsmeTier, BusinessConstitution } from '../services/PortalOnboardingService';
import { BusinessProfileService } from '../services/BusinessProfileService';
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import {
  SegmentedTabs,
  CompactChip,
  PrimaryButton,
  SecondaryButton,
} from '../components/SharedUI';

export interface PortalRegistrationScreenProps {
  initialMode?: 'BUYER' | 'SELLER';
  onBack?: () => void;
}

const CONSTITUTION_MAP: Record<string, BusinessConstitution> = {
  Proprietorship: 'PROPRIETORSHIP',
  'Private Limited': 'PRIVATE_LIMITED',
  Partnership: 'PARTNERSHIP',
  LLP: 'PARTNERSHIP',
  Society: 'SOCIETY_TRUST',
};

export const PortalRegistrationScreen: React.FC<PortalRegistrationScreenProps> = ({
  initialMode = 'BUYER',
  onBack,
}) => {
  const { colors, fontMultiplier } = useTheme();
  const savedProfile = useMemo(() => BusinessProfileService.getProfile(), []);

  const [activeRole, setActiveRole] = useState<'BUYER' | 'SELLER'>(initialMode);

  // Buyer Stepper (Screen 7) — clean empty defaults (zero pre-filled dummy PII)
  const [buyerStep, setBuyerStep] = useState<number>(1);
  const [buyerMinistry, setBuyerMinistry] = useState<string>('');
  const [buyerOffice, setBuyerOffice] = useState<string>('');
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerEmail, setBuyerEmail] = useState<string>('');
  const [buyerRole, setBuyerRole] = useState<'Primary User / HOD' | 'Secondary Buyer'>('Primary User / HOD');

  // Seller Stepper (Screen 8) — clean empty defaults (zero pre-filled dummy PII)
  const [sellerStep, setSellerStep] = useState<number>(1);
  const [enterpriseName, setEnterpriseName] = useState<string>('');
  const [businessType, setBusinessType] = useState<string>('Proprietorship');
  const [sellerPan, setSellerPan] = useState<string>('');
  const [sellerGstin, setSellerGstin] = useState<string>('');
  const [sellerUdyam, setSellerUdyam] = useState<string>('');
  const [classification, setClassification] = useState<MsmeTier>('MICRO');

  const buyerEmailTrimmed = buyerEmail.trim().toLowerCase();
  const buyerEmailIsGov =
    buyerEmailTrimmed.length > 0 &&
    /(@|\.)(gov\.in|nic\.in|mil\.in|railnet\.gov\.in)$/i.test(buyerEmailTrimmed);

  const buyerValidation = useMemo(
    () =>
      PortalOnboardingService.validateBuyerOnboarding({
        fullName: buyerName,
        officialGovEmail: buyerEmail,
        designation: buyerRole,
        mobileNumber: '9999999999',
        ministry: buyerMinistry,
        department: buyerMinistry,
        officeName: buyerOffice,
        role: buyerRole === 'Primary User / HOD' ? 'PRIMARY_HOD' : 'BUYER',
      }),
    [buyerName, buyerEmail, buyerRole, buyerMinistry, buyerOffice]
  );

  const sellerPanValid = sellerPan.trim().length > 0 && /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(sellerPan.trim().toUpperCase());
  const sellerGstinValid =
    sellerGstin.trim().length === 0 ||
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(sellerGstin.trim().toUpperCase());
  const sellerUdyamValid =
    sellerUdyam.trim().length === 0 || /^UDYAM-/i.test(sellerUdyam.trim());

  const sellerPrivileges = useMemo(
    () => PortalOnboardingService.calculateMsmePrivileges(classification),
    [classification]
  );

  const sellerValidation = useMemo(
    () =>
      PortalOnboardingService.validateSellerOnboarding({
        companyName: enterpriseName,
        constitution: CONSTITUTION_MAP[businessType] || 'PROPRIETORSHIP',
        panNumber: sellerPan,
        gstin: sellerGstin || '07AAAAA0000A1Z5',
        authorizedSignatoryAadhaarLast4: '0000',
        bankAccountNumber: '0000000000',
        bankIfsc: 'SBIN0000001',
        hasUdyamRegistration: sellerUdyam.trim().length > 0,
        udyamRegistrationNumber: sellerUdyam.trim().toUpperCase() || undefined,
        msmeTier: classification,
      }),
    [enterpriseName, businessType, sellerPan, sellerGstin, sellerUdyam, classification]
  );

  const applySavedBusinessProfile = () => {
    if (!savedProfile) return;
    if (savedProfile.organizationName) setEnterpriseName(savedProfile.organizationName);
    const tier: MsmeTier =
      savedProfile.msmeCategory === 'MICRO' ||
      savedProfile.msmeCategory === 'SMALL' ||
      savedProfile.msmeCategory === 'MEDIUM' ||
      savedProfile.msmeCategory === 'LARGE'
        ? savedProfile.msmeCategory
        : 'MICRO';
    setClassification(tier);
  };

  const openOfficialSignup = (type: 'buyer' | 'seller') => {
    const url = `https://mkp.gem.gov.in/registration/signup#!/${type}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('GeM Signup', `Visit ${url} in your browser.`);
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sticky 48dp Sub-Screen Header */}
      <View
        style={[
          styles.stickyHeader,
          { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle },
        ]}
      >
        {onBack && (
          <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn} accessibilityLabel="Go back">
            <Text style={[styles.backArrow, { color: colors.primary }]}>←</Text>
          </Pressable>
        )}
        <Text style={[styles.navTitle, { color: colors.textPrimary, fontSize: 16.5 * fontMultiplier }]}>
          {activeRole === 'BUYER' ? 'Buyer Registration Guide' : 'Seller / MSE KYC Guide'}
        </Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Role Switcher */}
        <SegmentedTabs
          options={['Buyer Registration', 'Seller / MSE KYC']}
          selected={activeRole === 'BUYER' ? 'Buyer Registration' : 'Seller / MSE KYC'}
          onSelect={(tab) => {
            setActiveRole(tab === 'Buyer Registration' ? 'BUYER' : 'SELLER');
          }}
          style={{ marginBottom: 16 }}
        />

      {/* =========================================================================
          SCREEN 7: BUYER REGISTRATION
      ========================================================================= */}
      {activeRole === 'BUYER' && (
        <View>
          {/* Progress Tracker (3 Steps: Department -> Officer -> Review) */}
          <View style={styles.stepperContainer}>
            {[
              { step: 1, label: 'Department' },
              { step: 2, label: 'Officer Details' },
              { step: 3, label: 'Review' },
            ].map((s, idx) => {
              const isActive = buyerStep === s.step;
              const isPast = buyerStep > s.step;
              return (
                <Pressable
                  key={s.step}
                  onPress={() => setBuyerStep(s.step)}
                  style={styles.stepItem}
                >
                  <View
                    style={[
                      styles.stepCircle,
                      {
                        backgroundColor: isActive
                          ? colors.primary
                          : isPast
                          ? colors.success
                          : colors.surfaceSubtle,
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepNum,
                        { color: isActive || isPast ? colors.textInverse : colors.textSecondary },
                      ]}
                    >
                      {isPast ? '✓' : s.step}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      {
                        color: isActive ? colors.primary : colors.textSecondary,
                        fontWeight: isActive ? '700' : '400',
                      },
                    ]}
                  >
                    {s.label}
                  </Text>
                  {idx < 2 && <View style={[styles.stepLine, { backgroundColor: colors.border }]} />}
                </Pressable>
              );
            })}
          </View>

          {/* Form Card */}
          <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {buyerStep === 1 && (
              <View>
                <Text style={[styles.formSecHeader, { color: colors.textPrimary }]}>
                  Department &amp; Office Establishment
                </Text>
                <Text style={[styles.formDesc, { color: colors.textSecondary }]}>
                  Specify the Central or State ministry and designated office unit.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                    Ministry / Department <Text style={{ color: colors.crimson }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.inputBox, { borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="e.g. Ministry of Finance"
                    placeholderTextColor={colors.textMuted}
                    value={buyerMinistry}
                    onChangeText={setBuyerMinistry}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                    Office Name / Establishment <Text style={{ color: colors.crimson }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.inputBox, { borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="e.g. Directorate of Income Tax"
                    placeholderTextColor={colors.textMuted}
                    value={buyerOffice}
                    onChangeText={setBuyerOffice}
                  />
                </View>

                <PrimaryButton
                  label="Continue to Step 2: Officer Details →"
                  onPress={() => setBuyerStep(2)}
                  style={{ marginTop: 12 }}
                />
              </View>
            )}

            {buyerStep === 2 && (
              <View>
                <Text style={[styles.formSecHeader, { color: colors.textPrimary }]}>
                  Officer In-Charge Information
                </Text>
                <Text style={[styles.formDesc, { color: colors.textSecondary }]}>
                  Per statutory GeM policy, government buyers must register using official gov.in / nic.in domains.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                    Officer Full Legal Name <Text style={{ color: colors.crimson }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.inputBox, { borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="e.g. Rajesh Kumar"
                    placeholderTextColor={colors.textMuted}
                    value={buyerName}
                    onChangeText={setBuyerName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                    Official Government Email <Text style={{ color: colors.crimson }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.inputBox, { borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="name@gov.in or name@nic.in"
                    placeholderTextColor={colors.textMuted}
                    value={buyerEmail}
                    onChangeText={setBuyerEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {buyerEmailTrimmed.length > 0 && (
                    <Text
                      style={[
                        styles.validationHint,
                        { color: buyerEmailIsGov ? colors.success : colors.danger },
                      ]}
                    >
                      {buyerEmailIsGov
                        ? '✓ Official government email domain recognized'
                        : 'GeM Buyer registration requires an official @gov.in / @nic.in email.'}
                    </Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                    Buyer Role <Text style={{ color: colors.crimson }}>*</Text>
                  </Text>
                  <View style={styles.radioGroup}>
                    {(['Primary User / HOD', 'Secondary Buyer'] as const).map((r) => (
                      <Pressable
                        key={r}
                        onPress={() => setBuyerRole(r)}
                        style={[
                          styles.radioOption,
                          {
                            backgroundColor: buyerRole === r ? colors.primaryTint : colors.surfaceSubtle,
                            borderColor: buyerRole === r ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.radioDot, { color: colors.primary }]}>
                          {buyerRole === r ? '●' : '○'}
                        </Text>
                        <Text style={[styles.radioLabel, { color: colors.textPrimary }]}>{r}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.btnRow}>
                  <SecondaryButton
                    label="← Back"
                    onPress={() => setBuyerStep(1)}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <PrimaryButton
                    label="Continue to Step 3: Review →"
                    onPress={() => setBuyerStep(3)}
                    style={{ flex: 2 }}
                  />
                </View>
              </View>
            )}

            {buyerStep === 3 && (
              <View>
                <Text style={[styles.formSecHeader, { color: colors.textPrimary }]}>
                  Review &amp; Official Submission
                </Text>
                <View style={[styles.reviewCard, { backgroundColor: colors.surfaceSubtle }]}>
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewKey, { color: colors.textSecondary }]}>Ministry:</Text>
                    <Text style={[styles.reviewVal, { color: colors.textPrimary }]}>{buyerMinistry || 'Not entered'}</Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewKey, { color: colors.textSecondary }]}>Office Unit:</Text>
                    <Text style={[styles.reviewVal, { color: colors.textPrimary }]}>{buyerOffice || 'Not entered'}</Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewKey, { color: colors.textSecondary }]}>Officer Name:</Text>
                    <Text style={[styles.reviewVal, { color: colors.textPrimary }]}>{buyerName || 'Not entered'}</Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewKey, { color: colors.textSecondary }]}>Gov Email:</Text>
                    <Text style={[styles.reviewVal, { color: colors.textPrimary }]}>{buyerEmail || 'Not entered'}</Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewKey, { color: colors.textSecondary }]}>Designated Role:</Text>
                    <Text style={[styles.reviewVal, { color: colors.primary }]}>{buyerRole}</Text>
                  </View>
                </View>

                {buyerValidation.errors.length > 0 && (
                  <View style={[styles.validationBox, { backgroundColor: colors.warningTint, borderColor: colors.warning }]}>
                    <Text style={[styles.validationBoxTitle, { color: colors.warning }]}>
                      Checklist before official signup
                    </Text>
                    {buyerValidation.errors.map((err) => (
                      <Text key={err} style={[styles.validationBoxItem, { color: colors.textPrimary }]}>
                        • {err}
                      </Text>
                    ))}
                  </View>
                )}

                <PrimaryButton
                  label="Open Official GeM Buyer Signup ↗"
                  onPress={() => openOfficialSignup('buyer')}
                  style={{ marginTop: 14 }}
                />
              </View>
            )}
          </View>
        </View>
      )}

      {/* =========================================================================
          SCREEN 8: SELLER / MSE KYC
      ========================================================================= */}
      {activeRole === 'SELLER' && (
        <View>
          {/* Progress Tracker (4 Steps: Business -> Tax IDs -> Classification -> Review) */}
          <View style={styles.stepperContainer}>
            {[
              { step: 1, label: 'Business' },
              { step: 2, label: 'Tax IDs' },
              { step: 3, label: 'Classification' },
              { step: 4, label: 'Review' },
            ].map((s, idx) => {
              const isActive = sellerStep === s.step;
              const isPast = sellerStep > s.step;
              return (
                <Pressable
                  key={s.step}
                  onPress={() => setSellerStep(s.step)}
                  style={styles.stepItem}
                >
                  <View
                    style={[
                      styles.stepCircle,
                      {
                        backgroundColor: isActive
                          ? colors.primary
                          : isPast
                          ? colors.success
                          : colors.surfaceSubtle,
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepNum,
                        { color: isActive || isPast ? colors.textInverse : colors.textSecondary },
                      ]}
                    >
                      {isPast ? '✓' : s.step}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      {
                        color: isActive ? colors.primary : colors.textSecondary,
                        fontWeight: isActive ? '700' : '400',
                      },
                    ]}
                  >
                    {s.label}
                  </Text>
                  {idx < 3 && <View style={[styles.stepLine, { backgroundColor: colors.border }]} />}
                </Pressable>
              );
            })}
          </View>

          {/* Form Card */}
          <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {sellerStep === 1 && (
              <View>
                <Text style={[styles.formSecHeader, { color: colors.textPrimary }]}>
                  Enterprise &amp; Constitution
                </Text>
                <Text style={[styles.formDesc, { color: colors.textSecondary }]}>
                  Prepare your details privately on-device before completing Aadhaar/PAN OTP signup on GeM.
                </Text>

                {savedProfile?.organizationName ? (
                  <Pressable
                    onPress={applySavedBusinessProfile}
                    style={[
                      styles.prefillBanner,
                      { backgroundColor: colors.primaryTint, borderColor: colors.primary },
                    ]}
                  >
                    <Text style={[styles.prefillText, { color: colors.primary }]}>
                      Fill from My Business Profile ({savedProfile.organizationName}) →
                    </Text>
                  </Pressable>
                ) : null}

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                    Enterprise / Company Name <Text style={{ color: colors.crimson }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.inputBox, { borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="Enter legal business / trade name"
                    placeholderTextColor={colors.textMuted}
                    value={enterpriseName}
                    onChangeText={setEnterpriseName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                    Business Constitution <Text style={{ color: colors.crimson }}>*</Text>
                  </Text>
                  <View style={styles.chipWrap}>
                    {['Proprietorship', 'Private Limited', 'Partnership', 'LLP', 'Society'].map((type) => (
                      <CompactChip
                        key={type}
                        label={type}
                        selected={businessType === type}
                        onPress={() => setBusinessType(type)}
                        style={{ marginBottom: 8 }}
                      />
                    ))}
                  </View>
                </View>

                <PrimaryButton
                  label="Continue to Step 2: Tax IDs →"
                  onPress={() => setSellerStep(2)}
                  style={{ marginTop: 12 }}
                />
              </View>
            )}

            {sellerStep === 2 && (
              <View>
                <Text style={[styles.formSecHeader, { color: colors.textPrimary }]}>
                  Registration &amp; Tax Identifiers
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                    Income Tax PAN <Text style={{ color: colors.crimson }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.inputBox, { borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="e.g. ABCDE1234F"
                    placeholderTextColor={colors.textMuted}
                    value={sellerPan}
                    onChangeText={setSellerPan}
                    autoCapitalize="characters"
                  />
                  {sellerPan.trim().length > 0 && (
                    <Text style={[styles.validationHint, { color: sellerPanValid ? colors.success : colors.danger }]}>
                      {sellerPanValid ? '✓ Valid 10-character PAN format' : 'PAN must be 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)'}
                    </Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                    GSTIN (Goods and Services Tax ID)
                  </Text>
                  <TextInput
                    style={[styles.inputBox, { borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="e.g. 07ABCDE1234F1Z5"
                    placeholderTextColor={colors.textMuted}
                    value={sellerGstin}
                    onChangeText={setSellerGstin}
                    autoCapitalize="characters"
                  />
                  {sellerGstin.trim().length > 0 && (
                    <Text style={[styles.validationHint, { color: sellerGstinValid ? colors.success : colors.danger }]}>
                      {sellerGstinValid ? '✓ Valid 15-character GSTIN format' : 'GSTIN must be 15 characters (e.g. 07ABCDE1234F1Z5)'}
                    </Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                    MSME Udyam Registration Number
                  </Text>
                  <TextInput
                    style={[styles.inputBox, { borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="e.g. UDYAM-DL-01-0012345"
                    placeholderTextColor={colors.textMuted}
                    value={sellerUdyam}
                    onChangeText={setSellerUdyam}
                    autoCapitalize="characters"
                  />
                  {sellerUdyam.trim().length > 0 && !sellerUdyamValid && (
                    <Text style={[styles.validationHint, { color: colors.danger }]}>
                      Udyam numbers begin with UDYAM- (e.g. UDYAM-DL-01-0012345)
                    </Text>
                  )}
                </View>

                <View style={styles.btnRow}>
                  <SecondaryButton
                    label="← Back"
                    onPress={() => setSellerStep(1)}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <PrimaryButton
                    label="Continue to Step 3: Classification →"
                    onPress={() => setSellerStep(3)}
                    style={{ flex: 2 }}
                  />
                </View>
              </View>
            )}

            {sellerStep === 3 && (
              <View>
                <Text style={[styles.formSecHeader, { color: colors.textPrimary }]}>
                  Enterprise Classification
                </Text>
                <Text style={[styles.formDesc, { color: colors.textSecondary }]}>
                  Select your certified enterprise category per MSME Development Act criteria:
                </Text>

                <View style={styles.classificationGrid}>
                  {(['MICRO', 'SMALL', 'MEDIUM', 'LARGE'] as MsmeTier[]).map((tier) => (
                    <Pressable
                      key={tier}
                      onPress={() => setClassification(tier)}
                      style={[
                        styles.tierCard,
                        {
                          backgroundColor: classification === tier ? colors.primaryTint : colors.surfaceSubtle,
                          borderColor: classification === tier ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.tierTitle, { color: colors.textPrimary }]}>{tier}</Text>
                      <Text style={[styles.tierSub, { color: colors.textMuted }]}>
                        {tier === 'MICRO'
                          ? 'Inv ≤ ₹1 Cr | Turn ≤ ₹5 Cr'
                          : tier === 'SMALL'
                          ? 'Inv ≤ ₹10 Cr | Turn ≤ ₹50 Cr'
                          : tier === 'MEDIUM'
                          ? 'Inv ≤ ₹50 Cr | Turn ≤ ₹250 Cr'
                          : 'General Non-MSME'}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Dynamic Statutory Benefit Notice driven by PortalOnboardingService */}
                <View
                  style={[
                    styles.benefitNotice,
                    {
                      backgroundColor:
                        sellerPrivileges.emdWaiverPercent > 0
                          ? colors.successTint
                          : colors.surfaceSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.benefitTitle,
                      {
                        color:
                          sellerPrivileges.emdWaiverPercent > 0
                            ? colors.success
                            : colors.textPrimary,
                      },
                    ]}
                  >
                    {sellerPrivileges.emdWaiverPercent > 0
                      ? `Eligible ${classification} MSE statutory privileges`
                      : 'General Non-MSME procurement terms'}
                  </Text>
                  <Text style={[styles.benefitDesc, { color: colors.textPrimary }]}>
                    {sellerPrivileges.emdWaiverPercent > 0
                      ? `• ${sellerPrivileges.emdWaiverPercent}% EMD Exemption on eligible public procurement tenders (OEMs for Goods).\n• Purchase preference: ${sellerPrivileges.purchasePreferenceBand} (${sellerPrivileges.procurementQuotaPercent}% MSE quota).\n• ${sellerPrivileges.paymentSlaDays}-day statutory CRAC payment SLA under GFR 149.`
                      : `• EMD Waiver: ${sellerPrivileges.emdWaiverPercent}% (standard bid security applies unless buyer waives).\n• Purchase preference: ${sellerPrivileges.purchasePreferenceBand}.\n• ${sellerPrivileges.paymentSlaDays}-day statutory CRAC payment SLA under GFR 149.`}
                  </Text>
                </View>

                <View style={styles.btnRow}>
                  <SecondaryButton
                    label="← Back"
                    onPress={() => setSellerStep(2)}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <PrimaryButton
                    label="Continue to Step 4: Review →"
                    onPress={() => setSellerStep(4)}
                    style={{ flex: 2 }}
                  />
                </View>
              </View>
            )}

            {sellerStep === 4 && (
              <View>
                <Text style={[styles.formSecHeader, { color: colors.textPrimary }]}>
                  Review &amp; Portal Verification
                </Text>

                <View style={[styles.reviewCard, { backgroundColor: colors.surfaceSubtle }]}>
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewKey, { color: colors.textSecondary }]}>Enterprise:</Text>
                    <Text style={[styles.reviewVal, { color: colors.textPrimary }]}>{enterpriseName || 'Not entered'}</Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewKey, { color: colors.textSecondary }]}>Type:</Text>
                    <Text style={[styles.reviewVal, { color: colors.textPrimary }]}>{businessType}</Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewKey, { color: colors.textSecondary }]}>PAN:</Text>
                    <Text style={[styles.reviewVal, { color: colors.textPrimary }]}>{sellerPan || 'Not entered'}</Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewKey, { color: colors.textSecondary }]}>GSTIN:</Text>
                    <Text style={[styles.reviewVal, { color: colors.textPrimary }]}>{sellerGstin || 'Not provided'}</Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewKey, { color: colors.textSecondary }]}>Udyam Number:</Text>
                    <Text style={[styles.reviewVal, { color: colors.textPrimary }]}>{sellerUdyam || 'Not provided'}</Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewKey, { color: colors.textSecondary }]}>Classification:</Text>
                    <Text style={[styles.reviewVal, { color: colors.emerald }]}>{classification} ENTERPRISE</Text>
                  </View>
                </View>

                {sellerValidation.errors.length > 0 && (
                  <View style={[styles.validationBox, { backgroundColor: colors.warningTint, borderColor: colors.warning }]}>
                    <Text style={[styles.validationBoxTitle, { color: colors.warning }]}>
                      Checklist before official signup
                    </Text>
                    {sellerValidation.errors.map((err) => (
                      <Text key={err} style={[styles.validationBoxItem, { color: colors.textPrimary }]}>
                        • {err}
                      </Text>
                    ))}
                  </View>
                )}

                <PrimaryButton
                  label="Open Official GeM Seller Signup ↗"
                  onPress={() => openOfficialSignup('seller')}
                  style={{ marginTop: 14 }}
                />
              </View>
            )}
          </View>
        </View>
      )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stickyHeader: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  contentContainer: {
    padding: DESIGN_TOKENS.pagePaddingMobile,
    paddingBottom: 40,
  },
  backBtn: {
    marginRight: 10,
    padding: 4,
  },
  backArrow: {
    fontSize: 20,
    fontWeight: '700',
  },
  navTitle: {
    fontWeight: '700',
  },
  prefillBanner: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  prefillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  validationHint: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 5,
  },
  validationBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 11,
    marginTop: 10,
  },
  validationBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  validationBoxItem: {
    fontSize: 11.5,
    lineHeight: 16.5,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 6,
  },
  stepItem: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 11,
    marginRight: 6,
  },
  stepLine: {
    flex: 1,
    height: 1,
    marginRight: 6,
  },
  formCard: {
    borderRadius: DESIGN_TOKENS.cardRadius,
    borderWidth: DESIGN_TOKENS.borderWidth,
    padding: 16,
  },
  formSecHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  formDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputBox: {
    height: 44,
    borderRadius: DESIGN_TOKENS.inputRadius,
    borderWidth: DESIGN_TOKENS.borderWidth,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  radioOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  radioDot: {
    fontSize: 14,
    marginRight: 6,
  },
  radioLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  classificationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  tierCard: {
    width: '48%',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  tierTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  tierSub: {
    fontSize: 10,
    lineHeight: 13,
  },
  benefitNotice: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  benefitTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  benefitDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  reviewCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  reviewKey: {
    fontSize: 12,
  },
  reviewVal: {
    fontSize: 12,
    fontWeight: '700',
  },
});
