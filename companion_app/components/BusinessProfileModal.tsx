/**
 * GeM Mobile Companion App - 30-Second Private Business Profile Modal
 *
 * Collects only voluntary seller eligibility criteria and stores them 100% locally
 * in AsyncStorage via BusinessProfileService (zero server, zero login, zero dummy PII).
 * Powers real Go / Caution / No-Go verdicts across every opened GeM Bid & RA.
 */

import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { MsmeCategory, UserAgentProfile } from '../types/index';
import {
  BusinessProfileService,
  EXPERIENCE_PRESETS_YEARS,
  INDIAN_STATES_AND_UTS,
  TURNOVER_PRESETS_LAKHS,
} from '../services/BusinessProfileService';
import { useTheme } from '../theme/ThemeContext';
import { AppIcon } from './AppIcons';

interface BusinessProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (profile: UserAgentProfile | null) => void;
}

const MSME_TIERS: ReadonlyArray<{ id: MsmeCategory; label: string }> = [
  { id: 'MICRO', label: 'Micro' },
  { id: 'SMALL', label: 'Small' },
  { id: 'MEDIUM', label: 'Medium' },
  { id: 'STARTUP', label: 'Startup' },
  { id: 'LARGE', label: 'Non-MSE' },
];

export const BusinessProfileModal: React.FC<BusinessProfileModalProps> = ({
  visible,
  onClose,
  onSaved,
}) => {
  const { colors } = useTheme();

  const [existingProfile, setExistingProfile] = useState<UserAgentProfile | null>(null);
  const [organizationName, setOrganizationName] = useState('');
  const [isOem, setIsOem] = useState(false);
  const [msmeCategory, setMsmeCategory] = useState<MsmeCategory>('MICRO');
  const [hasUdyam, setHasUdyam] = useState(true);
  const [turnoverLakhsInput, setTurnoverLakhsInput] = useState('50');
  const [yearsExp, setYearsExp] = useState<number>(3);
  const [selectedStates, setSelectedStates] = useState<string[]>(['Pan-India']);
  const [showAllStates, setShowAllStates] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    BusinessProfileService.hydrate().then((loaded) => {
      if (!active) return;
      setExistingProfile(loaded);
      if (loaded) {
        setOrganizationName(loaded.organizationName || '');
        setIsOem(Boolean(loaded.isOem));
        setMsmeCategory(loaded.msmeCategory || 'MICRO');
        setHasUdyam(Boolean(loaded.hasUdyamCertificate));
        const lakhs = Math.round((loaded.annualTurnoverInr / 100000) * 10) / 10;
        setTurnoverLakhsInput(String(lakhs));
        setYearsExp(loaded.yearsExperience ?? 0);
        setSelectedStates(
          loaded.targetStates && loaded.targetStates.length > 0
            ? loaded.targetStates
            : ['Pan-India']
        );
      } else {
        setOrganizationName('');
        setIsOem(false);
        setMsmeCategory('MICRO');
        setHasUdyam(true);
        setTurnoverLakhsInput('50');
        setYearsExp(3);
        setSelectedStates(['Pan-India']);
      }
      setShowAllStates(false);
    });
    return () => {
      active = false;
    };
  }, [visible]);

  const parsedLakhs = (() => {
    const cleaned = turnoverLakhsInput.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  })();

  const toggleState = (stateName: string) => {
    if (stateName === 'Pan-India') {
      setSelectedStates(['Pan-India']);
      return;
    }
    setSelectedStates((prev) => {
      const withoutPan = prev.filter((s) => s !== 'Pan-India');
      const exists = withoutPan.includes(stateName);
      const next = exists
        ? withoutPan.filter((s) => s !== stateName)
        : [...withoutPan, stateName].slice(0, 12);
      return next.length > 0 ? next : ['Pan-India'];
    });
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const saved = await BusinessProfileService.saveProfile({
        organizationName,
        isOem,
        msmeCategory,
        hasUdyamCertificate: msmeCategory === 'LARGE' ? false : hasUdyam,
        annualTurnoverLakhs: parsedLakhs,
        yearsExperience: yearsExp,
        targetStates: selectedStates,
      });
      onSaved?.(saved);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await BusinessProfileService.clearProfile();
      setExistingProfile(null);
      onSaved?.(null);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const visibleStates = showAllStates ? INDIAN_STATES_AND_UTS : INDIAN_STATES_AND_UTS.slice(0, 12);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdropDismiss} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <View style={[styles.headerIcon, { backgroundColor: colors.primaryTint }]}>
              <AppIcon name="profile" color={colors.primary} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Private Business Profile
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Stored only on your phone · Powers instant Go/No-Go verdicts
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={styles.closeBtn}
              accessibilityLabel="Close business profile"
            >
              <Text style={[styles.closeText, { color: colors.textMuted }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. Business Role (Critical GeM MSE Rule) */}
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              1. Seller Role on GeM
            </Text>
            <View style={styles.roleRow}>
              <Pressable
                onPress={() => setIsOem(true)}
                style={[
                  styles.roleCard,
                  {
                    backgroundColor: isOem ? colors.primaryTint : colors.surfaceSubtle,
                    borderColor: isOem ? colors.primary : colors.borderSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.roleCardTitle,
                    { color: isOem ? colors.primary : colors.textPrimary },
                  ]}
                >
                  OEM / Manufacturer
                </Text>
                <Text style={[styles.roleCardSub, { color: colors.textSecondary }]}>
                  Eligible for MSE EMD waiver on goods
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setIsOem(false)}
                style={[
                  styles.roleCard,
                  {
                    backgroundColor: !isOem ? colors.primaryTint : colors.surfaceSubtle,
                    borderColor: !isOem ? colors.primary : colors.borderSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.roleCardTitle,
                    { color: !isOem ? colors.primary : colors.textPrimary },
                  ]}
                >
                  Reseller / Trader
                </Text>
                <Text style={[styles.roleCardSub, { color: colors.textSecondary }]}>
                  Flags OEM MAF &amp; Trader EMD traps
                </Text>
              </Pressable>
            </View>

            {/* 2. Enterprise Category & Udyam */}
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              2. Enterprise Category
            </Text>
            <View style={styles.chipWrap}>
              {MSME_TIERS.map((tier) => {
                const active = msmeCategory === tier.id;
                return (
                  <Pressable
                    key={tier.id}
                    onPress={() => {
                      setMsmeCategory(tier.id);
                      if (tier.id === 'LARGE') setHasUdyam(false);
                      else setHasUdyam(true);
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.surfaceSubtle,
                        borderColor: active ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? colors.textInverse : colors.textPrimary },
                      ]}
                    >
                      {tier.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {msmeCategory !== 'LARGE' ? (
              <Pressable
                onPress={() => setHasUdyam((prev) => !prev)}
                style={[
                  styles.toggleRow,
                  {
                    backgroundColor: hasUdyam ? colors.successTint : colors.surfaceSubtle,
                    borderColor: hasUdyam ? colors.success : colors.borderSubtle,
                  },
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: hasUdyam ? colors.success : colors.border,
                      backgroundColor: hasUdyam ? colors.success : 'transparent',
                    },
                  ]}
                >
                  <Text style={[styles.checkMark, { color: colors.textInverse }]}>
                    {hasUdyam ? '✓' : ''}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>
                    Valid Udyam / DPIIT Startup Certificate
                  </Text>
                  <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>
                    Checks MSE turnover, experience &amp; EMD relaxations automatically
                  </Text>
                </View>
              </Pressable>
            ) : null}

            {/* 3. Average Annual Turnover */}
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              3. Average Annual Turnover (₹ Lakhs — Last 3 FY)
            </Text>
            <View style={styles.chipWrap}>
              {TURNOVER_PRESETS_LAKHS.map((preset) => {
                const active = Math.abs(parsedLakhs - preset.lakhs) < 0.01;
                return (
                  <Pressable
                    key={preset.label}
                    onPress={() => setTurnoverLakhsInput(String(preset.lakhs))}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.surfaceSubtle,
                        borderColor: active ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? colors.textInverse : colors.textPrimary },
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.turnoverInputWrap}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.borderSubtle,
                    color: colors.textPrimary,
                  },
                ]}
                value={turnoverLakhsInput}
                onChangeText={setTurnoverLakhsInput}
                keyboardType="decimal-pad"
                placeholder="Enter exact turnover in Lakhs (e.g. 75)"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.inputSuffix, { color: colors.textSecondary }]}>Lakhs</Text>
            </View>

            {/* 4. Past Government / Procurement Experience */}
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              4. Years of Past Supply / Service Experience
            </Text>
            <View style={styles.chipWrap}>
              {EXPERIENCE_PRESETS_YEARS.map((yrs) => {
                const active = yearsExp === yrs;
                return (
                  <Pressable
                    key={yrs}
                    onPress={() => setYearsExp(yrs)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.surfaceSubtle,
                        borderColor: active ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? colors.textInverse : colors.textPrimary },
                      ]}
                    >
                      {yrs === 10 ? '10+ yrs' : `${yrs} yr${yrs === 1 ? '' : 's'}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* 5. Delivery States */}
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.textPrimary, marginTop: 0, marginBottom: 0 }]}>
                5. Delivery Coverage
              </Text>
              <Pressable onPress={() => setShowAllStates((prev) => !prev)} hitSlop={8}>
                <Text style={[styles.expandLink, { color: colors.primary }]}>
                  {showAllStates ? 'Show fewer' : 'All states ▾'}
                </Text>
              </Pressable>
            </View>
            <View style={styles.chipWrap}>
              {visibleStates.map((st) => {
                const active = selectedStates.includes(st);
                return (
                  <Pressable
                    key={st}
                    onPress={() => toggleState(st)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primaryTint : colors.surfaceSubtle,
                        borderColor: active ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? colors.primary : colors.textPrimary },
                      ]}
                    >
                      {active ? `✓ ${st}` : st}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* 6. Optional Firm Name */}
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              6. Firm Name (Optional — auto-fills MII, OEM &amp; CA letters)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.borderSubtle,
                  color: colors.textPrimary,
                },
              ]}
              value={organizationName}
              onChangeText={setOrganizationName}
              placeholder="e.g. Bharat Solar Solutions Pvt Ltd"
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
            />

            <Text style={[styles.privacyNote, { color: colors.textMuted }]}>
              100% private: never uploaded to any server, never used for login, editable or removable
              anytime.
            </Text>
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
            {existingProfile ? (
              <Pressable
                onPress={handleClear}
                disabled={saving}
                style={[
                  styles.clearBtn,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.clearBtnText, { color: colors.danger }]}>Clear</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.saveBtnText, { color: colors.textInverse }]}>
                {saving ? 'Saving…' : 'Save Business Profile'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 11,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15.5,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    maxHeight: 540,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 24,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 8,
  },
  expandLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleCard: {
    flex: 1,
    borderRadius: 11,
    borderWidth: 1.4,
    padding: 11,
    minHeight: 74,
    justifyContent: 'center',
  },
  roleCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 3,
  },
  roleCardSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
    marginTop: 10,
    minHeight: 52,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 13,
    fontWeight: '900',
  },
  toggleTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  toggleSub: {
    fontSize: 11,
    marginTop: 2,
  },
  turnoverInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    fontSize: 13.5,
    fontWeight: '600',
  },
  inputSuffix: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  privacyNote: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 14,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  clearBtn: {
    minWidth: 84,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  saveBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
