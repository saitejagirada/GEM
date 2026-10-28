/**
 * GeM Onboarding & Registration Screen
 * Conforms to Screens 7 & 8 of the GeM Mobile UI Specification:
 * - Screen 7: Buyer Registration with 3-Step Progress Tracker (Department, Officer Details, Review)
 * - Screen 8: Seller / MSE KYC with 4-Step Progress Tracker (Business, Tax IDs, Classification, Review)
 * - Rounded input fields with explicit labels and placeholders
 * - MSE statutory benefit privileges (100% EMD waiver & 10-day payment SLA)
 */

import React, { useState, useCallback } from 'react';
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
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import {
  SegmentedTabs,
  CompactChip,
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
} from '../components/SharedUI';

export interface PortalRegistrationScreenProps {
  initialMode?: 'BUYER' | 'SELLER';
  onBack?: () => void;
}

export const PortalRegistrationScreen: React.FC<PortalRegistrationScreenProps> = ({
  initialMode = 'BUYER',
  onBack,
}) => {
  const { colors, fontMultiplier } = useTheme();

  const [activeRole, setActiveRole] = useState<'BUYER' | 'SELLER'>(initialMode);

  // Buyer Stepper (Screen 7)
  const [buyerStep, setBuyerStep] = useState<number>(1);
  const [buyerMinistry, setBuyerMinistry] = useState<string>('Ministry of Finance');
  const [buyerOffice, setBuyerOffice] = useState<string>('Directorate of Income Tax');
  const [buyerName, setBuyerName] = useState<string>('Rajesh Kumar');
  const [buyerEmail, setBuyerEmail] = useState<string>('rajesh.kumar@gov.in');
  const [buyerRole, setBuyerRole] = useState<'Primary User / HOD' | 'Secondary Buyer'>('Primary User / HOD');

  // Seller Stepper (Screen 8)
  const [sellerStep, setSellerStep] = useState<number>(1);
  const [enterpriseName, setEnterpriseName] = useState<string>('Garuda Tech & Electrical Solutions');
  const [businessType, setBusinessType] = useState<string>('Private Limited');
  const [sellerPan, setSellerPan] = useState<string>('AABCG1234F');
  const [sellerGstin, setSellerGstin] = useState<string>('07AABCG1234F1Z8');
  const [sellerUdyam, setSellerUdyam] = useState<string>('UDYAM-DL-01-0098765');
  const [classification, setClassification] = useState<MsmeTier>('MICRO');

  const openOfficialSignup = (type: 'buyer' | 'seller') => {
    const url = `https://mkp.gem.gov.in/registration/signup#!/${type}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('GeM Signup', `Visit ${url} in your browser.`);
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header / Back navigation */}
      <View style={styles.topNavRow}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
            <Text style={[styles.backArrow, { color: colors.primary }]}>←</Text>
          </Pressable>
        )}
        <Text style={[styles.navTitle, { color: colors.textPrimary, fontSize: 18 * fontMultiplier }]}>
          {activeRole === 'BUYER' ? 'Buyer Registration' : 'Seller / MSE KYC'}
        </Text>
      </View>

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
                    <Text style={[styles.reviewVal, { color: colors.textPrimary }]}>{buyerMinistry}</Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewKey, { color: colors.textSecondary }]}>Office Unit:</Text>
                    <Text style={[styles.reviewVal, { color: colors.textPrimary }]}>{buyerOffice}</Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewKey, { color: colors.textSecondary }]}>Officer Name:</Text>
                    <Text style={[styles.reviewVal, { color: colors.textPrimary }]}>{buyerName}</Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewKey, { color: colors.textSecondary }]}>Gov Email:</Text>
                    <Text style={[styles.reviewVal, { color: colors.textPrimary }]}>{buyerEmail}</Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewKey, { color: colors.textSecondary }]}>Designated Role:</Text>
                    <Text style={[styles.reviewVal, { color: colors.primary }]}>{buyerRole}</Text>
                  </View>
                </View>

                <PrimaryButton
                  label="Submit to Official GeM Portal ↗"
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

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                    Enterprise / Company Name <Text style={{ color: colors.crimson }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.inputBox, { borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="e.g. Garuda Tech Solutions Pvt Ltd"
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

                {/* MSE Statutory Benefit Notice */}
                <View style={[styles.benefitNotice, { backgroundColor: colors.successTint }]}>
                  <Text style={[styles.benefitTitle, { color: colors.success }]}>
                    🏛️ Verified MSE Statutory Privileges
                  </Text>
                  <Text style={[styles.benefitDesc, { color: colors.textPrimary }]}>
                    • 100% EMD Exemption on all eligible public procurement tenders.{'\n'}
                    • 25% annual government procurement quota reserved for MSEs.{'\n'}
                    • 10-day statutory CRAC deemed payment guarantee under GFR 149.
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
                    <Text style={[styles.reviewVal, { color: colors.textPrimary }]}>{enterpriseName}</Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewKey, { color: colors.textSecondary }]}>Type:</Text>
                    <Text style={[styles.reviewVal, { color: colors.textPrimary }]}>{businessType}</Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewKey, { color: colors.textSecondary }]}>PAN:</Text>
                    <Text style={[styles.reviewVal, { color: colors.textPrimary }]}>{sellerPan}</Text>
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

                <PrimaryButton
                  label="Complete Verification on GeM Portal ↗"
                  onPress={() => openOfficialSignup('seller')}
                  style={{ marginTop: 14 }}
                />
              </View>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: DESIGN_TOKENS.pagePaddingMobile,
    paddingBottom: 40,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    fontWeight: '750',
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
