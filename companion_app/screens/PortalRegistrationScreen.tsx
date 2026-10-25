/**
 * GeM Official Portal Onboarding & Registration Guide Screen
 * Replicates the official onboarding portal from https://mkp.gem.gov.in/registration/signup#!/buyer
 * and https://mkp.gem.gov.in/registration/signup#!/seller.
 * Allows any public user to inspect requirements, compute MSE benefits, and launch official portals.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { PortalOnboardingService, MsmeTier, BusinessConstitution } from '../services/PortalOnboardingService';
import { TouchButton } from '../components/TouchButton';
import { useTheme } from '../theme/ThemeContext';

export const PortalRegistrationScreen: React.FC = () => {
  const { colors, fontMultiplier, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<'BUYER' | 'SELLER' | 'HELPDESK'>('BUYER');

  // Interactive Buyer State
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerMinistry, setBuyerMinistry] = useState('');
  const [buyerOffice, setBuyerOffice] = useState('');
  const [buyerRole, setBuyerRole] = useState<'PRIMARY_HOD' | 'BUYER' | 'CONSIGNEE' | 'PAO_DDO'>('PRIMARY_HOD');
  const [buyerCheckResult, setBuyerCheckResult] = useState<ReturnType<typeof PortalOnboardingService.validateBuyerOnboarding> | null>(null);

  // Interactive Seller State
  const [sellerName, setSellerName] = useState('');
  const [sellerConstitution, setSellerConstitution] = useState<BusinessConstitution>('PRIVATE_LIMITED');
  const [sellerPan, setSellerPan] = useState('');
  const [sellerGstin, setSellerGstin] = useState('');
  const [sellerUdyam, setSellerUdyam] = useState('');
  const [sellerTier, setSellerTier] = useState<MsmeTier>('MICRO');
  const [sellerCheckResult, setSellerCheckResult] = useState<ReturnType<typeof PortalOnboardingService.validateSellerOnboarding> | null>(null);

  const handleTestBuyer = useCallback(() => {
    const res = PortalOnboardingService.validateBuyerOnboarding({
      fullName: buyerName,
      officialGovEmail: buyerEmail,
      designation: 'Officer',
      mobileNumber: '9876543210',
      ministry: buyerMinistry,
      department: 'Department of Operations',
      officeName: buyerOffice,
      role: buyerRole,
    });
    setBuyerCheckResult(res);
  }, [buyerName, buyerEmail, buyerMinistry, buyerOffice, buyerRole]);

  const handleTestSeller = useCallback(() => {
    const res = PortalOnboardingService.validateSellerOnboarding({
      companyName: sellerName,
      constitution: sellerConstitution,
      panNumber: sellerPan,
      gstin: sellerGstin,
      authorizedSignatoryAadhaarLast4: '1234',
      bankAccountNumber: '91802003456789',
      bankIfsc: 'SBIN0001234',
      hasUdyamRegistration: !!sellerUdyam.trim(),
      udyamRegistrationNumber: sellerUdyam,
      msmeTier: sellerTier,
      annualTurnoverInr: 25000000,
      isOem: true,
    });
    setSellerCheckResult(res);
  }, [sellerName, sellerConstitution, sellerPan, sellerGstin, sellerUdyam, sellerTier]);

  const openOfficialUrl = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Official GeM Portal', `Visit ${url} in your browser.`);
    });
  }, []);

  const msmeBenefits = PortalOnboardingService.calculateMsmePrivileges(sellerTier);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Segment: Buyer Portal | Seller Portal | Helpdesk */}
      <View style={[styles.topTabsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchButton
          title="🏛️ Buyer Registration"
          variant={activeTab === 'BUYER' ? 'primary' : 'secondary'}
          size="small"
          onPress={() => setActiveTab('BUYER')}
          style={{ flex: 1 }}
        />
        <TouchButton
          title="🏢 Seller / MSE KYC"
          variant={activeTab === 'SELLER' ? 'primary' : 'secondary'}
          size="small"
          onPress={() => setActiveTab('SELLER')}
          style={{ flex: 1 }}
        />
        <TouchButton
          title="📞 Helpdesk"
          variant={activeTab === 'HELPDESK' ? 'primary' : 'secondary'}
          size="small"
          onPress={() => setActiveTab('HELPDESK')}
          style={{ flex: 1 }}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* TAB 1: BUYER ONBOARDING */}
        {activeTab === 'BUYER' && (
          <View>
            {/* Official Notice matching user screenshot */}
            <View style={[styles.noticeCard, { backgroundColor: isDark ? colors.surfaceSubtle : '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <Text style={[styles.noticeTitle, { color: '#1E40AF' }]}>
                ℹ️ Official GFR Rule on Buyer Registration
              </Text>
              <Text style={[styles.noticeBody, { color: '#334155' }]}>
                If you want to register as the buyers/users involved in procurement process please contact Primary user (HOD) of your organisation.{'\n\n'}
                <Text style={{ fontWeight: '800' }}>Note:</Text> Only non-buying roles i.e. Primary User (HOD) / Verifying Authority can register directly from the portal. Secondary users (Buyer, Consignee, PAO) are created by the HOD.
              </Text>
            </View>

            <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: 16 * fontMultiplier }]}>
                Buyer Eligibility Validator
              </Text>
              <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                Test your department or ministry credentials against GeM verification rules
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Officer Full Legal Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? colors.surfaceSubtle : '#F8FAFC', color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="e.g. Dr. Rajesh Kumar"
                placeholderTextColor={colors.textMuted}
                value={buyerName}
                onChangeText={setBuyerName}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Official Government Email (.gov.in / .nic.in mandatory)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? colors.surfaceSubtle : '#F8FAFC', color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="e.g. rajesh.kumar@nic.in"
                placeholderTextColor={colors.textMuted}
                value={buyerEmail}
                onChangeText={setBuyerEmail}
                autoCapitalize="none"
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Ministry / Department</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? colors.surfaceSubtle : '#F8FAFC', color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="e.g. Ministry of Defence / Health"
                placeholderTextColor={colors.textMuted}
                value={buyerMinistry}
                onChangeText={setBuyerMinistry}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Office Name / Establishment</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? colors.surfaceSubtle : '#F8FAFC', color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="e.g. Central Ordnance Depot"
                placeholderTextColor={colors.textMuted}
                value={buyerOffice}
                onChangeText={setBuyerOffice}
              />

              <View style={styles.roleRow}>
                <TouchButton
                  title="Primary User (HOD)"
                  variant={buyerRole === 'PRIMARY_HOD' ? 'primary' : 'secondary'}
                  size="small"
                  onPress={() => setBuyerRole('PRIMARY_HOD')}
                  style={{ flex: 1 }}
                />
                <TouchButton
                  title="Secondary Buyer"
                  variant={buyerRole === 'BUYER' ? 'primary' : 'secondary'}
                  size="small"
                  onPress={() => setBuyerRole('BUYER')}
                  style={{ flex: 1 }}
                />
              </View>

              <View style={{ marginTop: 12 }}>
                <TouchButton
                  title="Validate Credentials"
                  variant="saffron"
                  size="medium"
                  onPress={handleTestBuyer}
                />
              </View>

              {buyerCheckResult ? (
                <View style={[styles.resultCard, { backgroundColor: buyerCheckResult.isValid ? '#F0FDF4' : '#FEF2F2', borderColor: buyerCheckResult.isValid ? '#86EFAC' : '#FCA5A5' }]}>
                  <Text style={[styles.resultTitle, { color: buyerCheckResult.isValid ? '#15803D' : '#B91C1C' }]}>
                    {buyerCheckResult.isValid ? '✓ Credentials Valid for GeM Registration' : '⚠️ Credentials Did Not Pass GeM Validation'}
                  </Text>
                  {buyerCheckResult.errors.map((err, i) => (
                    <Text key={i} style={[styles.resultError, { color: '#B91C1C' }]}>• {err}</Text>
                  ))}
                  {buyerCheckResult.isValid ? (
                    <Text style={{ color: '#166534', fontSize: 11, marginTop: 4 }}>
                      Privileges: Custom Bids Authorized • CRAC 10-day approval enabled.
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {/* Direct Link to Official Portal */}
              <View style={{ marginTop: 16 }}>
                <TouchButton
                  title="Open Official Buyer Portal (mkp.gem.gov.in) ➔"
                  variant="primary"
                  size="medium"
                  icon="🌐"
                  onPress={() => openOfficialUrl('https://mkp.gem.gov.in/registration/signup#!/buyer')}
                />
              </View>
            </View>
          </View>
        )}

        {/* TAB 2: SELLER & MSME ONBOARDING */}
        {activeTab === 'SELLER' && (
          <View>
            <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: 16 * fontMultiplier }]}>
                Seller Onboarding & MSE Advantage Calculator
              </Text>
              <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                Verify statutory EMD exemptions and 25% annual procurement reservation
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Enterprise Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? colors.surfaceSubtle : '#F8FAFC', color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="e.g. Akash Solar Technologies Pvt Ltd"
                placeholderTextColor={colors.textMuted}
                value={sellerName}
                onChangeText={setSellerName}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>PAN Number (10 Alphanumeric)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? colors.surfaceSubtle : '#F8FAFC', color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="e.g. ABCDE1234F"
                placeholderTextColor={colors.textMuted}
                value={sellerPan}
                onChangeText={setSellerPan}
                autoCapitalize="characters"
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>GSTIN (15 Characters)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? colors.surfaceSubtle : '#F8FAFC', color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="e.g. 07ABCDE1234F1Z5"
                placeholderTextColor={colors.textMuted}
                value={sellerGstin}
                onChangeText={setSellerGstin}
                autoCapitalize="characters"
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Udyam Registration Number</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? colors.surfaceSubtle : '#F8FAFC', color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="e.g. UDYAM-DL-01-0089123"
                placeholderTextColor={colors.textMuted}
                value={sellerUdyam}
                onChangeText={setSellerUdyam}
                autoCapitalize="characters"
              />

              {/* MSME Tier Picker */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Enterprise Classification</Text>
              <View style={styles.tierRow}>
                {(['MICRO', 'SMALL', 'MEDIUM', 'LARGE'] as const).map((tier) => (
                  <TouchButton
                    key={tier}
                    title={tier}
                    variant={sellerTier === tier ? 'emerald' : 'secondary'}
                    size="small"
                    onPress={() => setSellerTier(tier)}
                    style={{ flex: 1 }}
                  />
                ))}
              </View>

              {/* Statutory Privileges Card */}
              <View style={[styles.privilegeCard, { backgroundColor: isDark ? colors.surfaceSubtle : '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Text style={[styles.privilegeTitle, { color: '#166534' }]}>
                  🛡️ Statutory Privileges for {sellerTier} Enterprises
                </Text>
                <Text style={styles.privilegeItem}>
                  • <Text style={{ fontWeight: '800' }}>EMD Waiver:</Text> {msmeBenefits.emdWaiverPercent}% Waived across all tenders
                </Text>
                <Text style={styles.privilegeItem}>
                  • <Text style={{ fontWeight: '800' }}>Purchase Preference:</Text> {msmeBenefits.purchasePreferenceBand}
                </Text>
                <Text style={styles.privilegeItem}>
                  • <Text style={{ fontWeight: '800' }}>Annual Quota:</Text> {msmeBenefits.procurementQuotaPercent}% mandatory reservation
                </Text>
                <Text style={styles.privilegeItem}>
                  • <Text style={{ fontWeight: '800' }}>Payment SLA:</Text> Deemed acceptance & treasury payout in {msmeBenefits.paymentSlaDays} days
                </Text>
              </View>

              <View style={{ marginTop: 12 }}>
                <TouchButton
                  title="Validate KYC Readiness"
                  variant="saffron"
                  size="medium"
                  onPress={handleTestSeller}
                />
              </View>

              {sellerCheckResult ? (
                <View style={[styles.resultCard, { backgroundColor: sellerCheckResult.isValid ? '#F0FDF4' : '#FEF2F2', borderColor: sellerCheckResult.isValid ? '#86EFAC' : '#FCA5A5' }]}>
                  <Text style={[styles.resultTitle, { color: sellerCheckResult.isValid ? '#15803D' : '#B91C1C' }]}>
                    {sellerCheckResult.isValid ? '✓ Seller Ready for GeM Registration' : '⚠️ Missing Mandatory KYC Details'}
                  </Text>
                  {sellerCheckResult.errors.map((err, i) => (
                    <Text key={i} style={[styles.resultError, { color: '#B91C1C' }]}>• {err}</Text>
                  ))}
                </View>
              ) : null}

              <View style={{ marginTop: 16 }}>
                <TouchButton
                  title="Open Official Seller Registration (mkp.gem.gov.in) ➔"
                  variant="primary"
                  size="medium"
                  icon="🌐"
                  onPress={() => openOfficialUrl('https://mkp.gem.gov.in/registration/signup#!/seller')}
                />
              </View>
            </View>
          </View>
        )}

        {/* TAB 3: HELPDESK & POLICIES */}
        {activeTab === 'HELPDESK' && (
          <View>
            <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: 16 * fontMultiplier }]}>
                GeM National Helpdesk & Public Resources
              </Text>

              <View style={styles.helpItem}>
                <Text style={styles.helpIcon}>📞</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.helpTitle, { color: colors.textPrimary }]}>Toll Free Helpline</Text>
                  <Text style={[styles.helpDesc, { color: colors.textMuted }]}>
                    1800-419-3436 / 1800-102-3436 (Mon-Sat 9 AM to 8 PM)
                  </Text>
                </View>
              </View>

              <View style={styles.helpItem}>
                <Text style={styles.helpIcon}>🎓</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.helpTitle, { color: colors.textPrimary }]}>GeM e-Learning & LMS</Text>
                  <Text style={[styles.helpDesc, { color: colors.textMuted }]}>
                    Free interactive certification courses for buyers and sellers.
                  </Text>
                  <TouchButton
                    title="Open e-Learning (elearning.gem.gov.in)"
                    variant="outline"
                    size="small"
                    onPress={() => openOfficialUrl('https://elearning.gem.gov.in')}
                    style={{ marginTop: 6 }}
                  />
                </View>
              </View>

              <View style={styles.helpItem}>
                <Text style={styles.helpIcon}>⚖️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.helpTitle, { color: colors.textPrimary }]}>Incident Management & Delisted Sellers</Text>
                  <Text style={[styles.helpDesc, { color: colors.textMuted }]}>
                    Check public repository of errant sellers suspended under GFR Rule 144(xi).
                  </Text>
                  <TouchButton
                    title="View Suspended Sellers List"
                    variant="outline"
                    size="small"
                    onPress={() => openOfficialUrl('https://gem.gov.in/incidentmanagement/sellers')}
                    style={{ marginTop: 6 }}
                  />
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topTabsRow: {
    flexDirection: 'row',
    padding: 8,
    gap: 6,
    borderBottomWidth: 1,
  },
  scrollContent: { padding: 12, paddingBottom: 40 },
  noticeCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  noticeTitle: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  noticeBody: { fontSize: 11.5, lineHeight: 17 },
  formCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: { fontWeight: '900', marginBottom: 2 },
  cardSub: { fontSize: 11.5, marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  roleRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tierRow: { flexDirection: 'row', gap: 6, marginTop: 4, marginBottom: 8 },
  resultCard: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  resultTitle: { fontSize: 12, fontWeight: '800', marginBottom: 4 },
  resultError: { fontSize: 11, lineHeight: 16 },
  privilegeCard: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 4,
  },
  privilegeTitle: { fontSize: 12, fontWeight: '800', marginBottom: 4 },
  privilegeItem: { fontSize: 11, color: '#14532D', lineHeight: 16 },
  helpItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  helpIcon: { fontSize: 24 },
  helpTitle: { fontSize: 13, fontWeight: '800' },
  helpDesc: { fontSize: 11.5, marginTop: 2, lineHeight: 16 },
});
