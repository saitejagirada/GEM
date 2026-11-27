/**
 * GeM More / Tools & Portal Hub Screen
 *
 * Clean, inviting procurement hub featuring:
 * - Official GeM Pinwheel hero card with 1-tap Official Portal Sign-In handoff
 * - Crisp geometric vector icons (zero single-letter placeholder boxes)
 * - Workspace tools, Buyer/Seller registration guides, Helpdesk
 * - Inline interactive Theme (Light / Dark) & Text Size (Small / Medium / Large) controls
 */

import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import { AppIcon, type AppIconName } from '../components/AppIcons';
import { BusinessProfileModal } from '../components/BusinessProfileModal';
import { GemGlossaryModal } from '../components/GemGlossaryModal';
import { BusinessProfileService } from '../services/BusinessProfileService';
import {
  COMPANY_LOCKER_SLOTS,
  CompanyDocLockerService,
  type CompanyLockerDocument,
} from '../services/CompanyDocLockerService';
import type { UserAgentProfile } from '../types/index';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const GEM_MARK_IMG = require('../assets/gem-mark.png');

export interface MoreProfileScreenProps {
  onNavigateTab: (
    tab: 'MARKET' | 'BIDS' | 'AUCTIONS' | 'ORDERS' | 'PORTAL' | 'HELP' | 'REG_BUYER' | 'REG_SELLER'
  ) => void;
  onOpenPortfolio?: () => void;
  onOpenCompanyLocker?: () => void;
  onOpenOfficialPortal?: () => void;
}

interface MenuRowItem {
  id: string;
  icon: AppIconName;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  badge?: string;
  onPress: () => void;
}

export const MoreProfileScreen: React.FC<MoreProfileScreenProps> = ({
  onNavigateTab,
  onOpenPortfolio,
  onOpenCompanyLocker,
  onOpenOfficialPortal,
}) => {
  const {
    colors,
    fontMultiplier,
    isDark,
    toggleColorMode,
    fontScale,
    setFontScale,
    language,
    setLanguage,
    t,
  } = useTheme();
  const [businessProfile, setBusinessProfile] = useState<UserAgentProfile | null>(() =>
    BusinessProfileService.getProfile()
  );
  const [lockerDocs, setLockerDocs] = useState<CompanyLockerDocument[]>(() =>
    CompanyDocLockerService.getDocuments()
  );
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);

  useEffect(() => {
    BusinessProfileService.hydrate().then(setBusinessProfile).catch(() => undefined);
    const unsubProfile = BusinessProfileService.subscribe(setBusinessProfile);
    CompanyDocLockerService.hydrate().then(setLockerDocs).catch(() => undefined);
    const unsubLocker = CompanyDocLockerService.subscribe(setLockerDocs);
    return () => {
      unsubProfile();
      unsubLocker();
    };
  }, []);

  const openPortal = () => {
    if (onOpenOfficialPortal) onOpenOfficialPortal();
    else onNavigateTab('PORTAL');
  };

  const openWorkspace = () => {
    if (onOpenPortfolio) onOpenPortfolio();
    else onNavigateTab('PORTAL');
  };

  const openLocker = () => {
    if (onOpenCompanyLocker) onOpenCompanyLocker();
    else openWorkspace();
  };

  const workspaceItems: MenuRowItem[] = [
    {
      id: 'business-profile',
      icon: 'profile',
      iconBg: businessProfile ? colors.successTint : colors.primaryTint,
      iconColor: businessProfile ? colors.success : colors.primary,
      title: t('businessProfile'),
      subtitle: BusinessProfileService.formatProfileSummary(businessProfile),
      badge: businessProfile ? 'ACTIVE' : '30s SETUP',
      onPress: () => setShowProfileModal(true),
    },
    {
      id: 'company-locker',
      icon: 'document',
      iconBg: lockerDocs.length > 0 ? colors.successTint : colors.primaryTint,
      iconColor: lockerDocs.length > 0 ? colors.success : colors.primary,
      title: t('companyDocLocker'),
      subtitle:
        lockerDocs.length > 0
          ? `${lockerDocs.length} of ${COMPANY_LOCKER_SLOTS.length} master docs saved · Auto-matches bids`
          : 'Save GST, PAN, Udyam, Turnover & CRAC PDFs once on device',
      badge: lockerDocs.length > 0 ? `${lockerDocs.length}/${COMPANY_LOCKER_SLOTS.length} READY` : undefined,
      onPress: openLocker,
    },
    {
      id: 'docs',
      icon: 'document',
      iconBg: colors.primaryTint,
      iconColor: colors.primary,
      title: 'Document Preparation',
      subtitle: 'Organize bid-specific checklists, compliance drafts & files',
      onPress: openWorkspace,
    },
    {
      id: 'contracts',
      icon: 'contract',
      iconBg: colors.successTint,
      iconColor: colors.success,
      title: 'Concluded Bids & Contracts',
      subtitle: 'Public contract awards, orders & CRAC records',
      onPress: () => onNavigateTab('ORDERS'),
    },
    {
      id: 'corrigenda',
      icon: 'bell',
      iconBg: colors.warningTint,
      iconColor: colors.warning,
      title: 'Live Bids & Corrigenda',
      subtitle: 'Browse active bidplus.gem.gov.in updates & amendments',
      onPress: () => onNavigateTab('BIDS'),
    },
  ];

  const onboardingItems: MenuRowItem[] = [
    {
      id: 'buyer',
      icon: 'buyer',
      iconBg: colors.primaryTint,
      iconColor: colors.primary,
      title: 'Buyer Registration',
      subtitle: 'Onboard a government office or organization on GeM',
      onPress: () => onNavigateTab('REG_BUYER'),
    },
    {
      id: 'seller',
      icon: 'seller',
      iconBg: colors.successTint,
      iconColor: colors.success,
      title: 'Seller & MSE Registration',
      subtitle: 'Verify Udyam MSME & check EMD exemption eligibility',
      onPress: () => onNavigateTab('REG_SELLER'),
    },
    {
      id: 'glossary',
      icon: 'help',
      iconBg: colors.primaryTint,
      iconColor: colors.primary,
      title: t('jargonGuide'),
      subtitle: 'Plain English & हिन्दी meanings for EMD, e-PBG, ATC, MII, RA, UDIN',
      onPress: () => setShowGlossaryModal(true),
    },
    {
      id: 'help',
      icon: 'help',
      iconBg: colors.violetTint,
      iconColor: colors.violet,
      title: 'Help & Official Support',
      subtitle: 'GeM toll-free helpdesk, training LMS & official manuals',
      onPress: () => onNavigateTab('HELP'),
    },
  ];

  const renderSection = (heading: string, rows: MenuRowItem[]) => (
    <View style={styles.sectionWrap}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{heading}</Text>
      <View
        style={[
          styles.menuCard,
          { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
        ]}
      >
        {rows.map((row, idx) => (
          <Pressable
            key={row.id}
            style={({ pressed }) => [
              styles.menuItem,
              idx > 0 && {
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.borderSubtle,
              },
              pressed && { opacity: 0.74 },
            ]}
            onPress={row.onPress}
          >
            <View style={[styles.menuIconBox, { backgroundColor: row.iconBg }]}>
              <AppIcon name={row.icon} color={row.iconColor} size={18} />
            </View>
            <View style={styles.menuTextCol}>
              <View style={styles.menuTitleRow}>
                <Text
                  style={[
                    styles.menuTitle,
                    { color: colors.textPrimary, fontSize: 13.5 * fontMultiplier },
                  ]}
                >
                  {row.title}
                </Text>
                {row.badge ? (
                  <View
                    style={[
                      styles.menuBadge,
                      {
                        backgroundColor:
                          row.badge === 'ACTIVE' ? colors.successTint : colors.primaryTint,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.menuBadgeText,
                        { color: row.badge === 'ACTIVE' ? colors.success : colors.primary },
                      ]}
                    >
                      {row.badge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.menuSub, { color: colors.textSecondary }]}>{row.subtitle}</Text>
            </View>
            <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Branded GeM Hero Card */}
      <View
        style={[
          styles.heroCard,
          { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
        ]}
      >
        <View style={styles.heroTopRow}>
          <View style={[styles.gemLogoFrame, { borderColor: colors.borderSubtle }]}>
            <Image source={GEM_MARK_IMG} style={styles.gemLogoImg} resizeMode="contain" />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.heroTitle,
                { color: colors.textPrimary, fontSize: 16 * fontMultiplier },
              ]}
            >
              GeM Mobile Companion
            </Text>
            <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
              Direct access to live GeM products, 380+ services, active tenders, and inline buyer
              PDFs.
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.portalCtaBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={openPortal}
        >
          <AppIcon name="portal" color={colors.textInverse} size={16} />
          <Text style={[styles.portalCtaText, { color: colors.textInverse }]}>
            Open Official GeM Portal &amp; Login ↗
          </Text>
        </Pressable>
      </View>

      {/* 2. Workspace & Tools */}
      {renderSection(t('yourWorkspace'), workspaceItems)}

      {/* 3. Registration & Support */}
      {renderSection(t('registrationSupport'), onboardingItems)}

      {/* 4. Display & Comfort (Inline Interactive Controls) */}
      <View style={styles.sectionWrap}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('displayComfort')}</Text>
        <View
          style={[
            styles.menuCard,
            { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
          ]}
        >
          {/* Language Switch (English / हिन्दी) */}
          <View style={styles.settingRow}>
            <View style={[styles.menuIconBox, { backgroundColor: colors.primaryTint }]}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: colors.primary }}>अ</Text>
            </View>
            <View style={styles.menuTextCol}>
              <Text
                style={[
                  styles.menuTitle,
                  { color: colors.textPrimary, fontSize: 13.5 * fontMultiplier },
                ]}
              >
                {t('languageLabel')}
              </Text>
              <Text style={[styles.menuSub, { color: colors.textSecondary }]}>
                {t('languageSub')}
              </Text>
            </View>
            <View
              style={[
                styles.segmentedWrap,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
              ]}
            >
              {(
                [
                  { id: 'en', label: 'EN' },
                  { id: 'hi', label: 'हिन्दी' },
                ] as const
              ).map((opt) => {
                const active = language === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    style={[
                      styles.segBtn,
                      active && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setLanguage(opt.id)}
                  >
                    <Text
                      style={[
                        styles.segBtnText,
                        { color: active ? colors.textInverse : colors.textSecondary },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Theme Switch */}
          <View
            style={[
              styles.settingRow,
              {
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.borderSubtle,
              },
            ]}
          >
            <View style={[styles.menuIconBox, { backgroundColor: colors.surfaceSubtle }]}>
              <AppIcon name="theme" color={colors.textPrimary} size={18} />
            </View>
            <View style={styles.menuTextCol}>
              <Text
                style={[
                  styles.menuTitle,
                  { color: colors.textPrimary, fontSize: 13.5 * fontMultiplier },
                ]}
              >
                Appearance
              </Text>
              <Text style={[styles.menuSub, { color: colors.textSecondary }]}>
                Light or dark theme
              </Text>
            </View>
            <View
              style={[
                styles.segmentedWrap,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
              ]}
            >
              {(['Light', 'Dark'] as const).map((mode) => {
                const active = (mode === 'Dark') === isDark;
                return (
                  <Pressable
                    key={mode}
                    style={[
                      styles.segBtn,
                      active && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => {
                      if (!active) toggleColorMode();
                    }}
                  >
                    <Text
                      style={[
                        styles.segBtnText,
                        { color: active ? colors.textInverse : colors.textSecondary },
                      ]}
                    >
                      {mode}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Font Scale Switch */}
          <View
            style={[
              styles.settingRow,
              {
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.borderSubtle,
              },
            ]}
          >
            <View style={[styles.menuIconBox, { backgroundColor: colors.surfaceSubtle }]}>
              <AppIcon name="textSize" color={colors.textPrimary} size={18} />
            </View>
            <View style={styles.menuTextCol}>
              <Text
                style={[
                  styles.menuTitle,
                  { color: colors.textPrimary, fontSize: 13.5 * fontMultiplier },
                ]}
              >
                Text Size
              </Text>
              <Text style={[styles.menuSub, { color: colors.textSecondary }]}>
                Adjust readability across screens
              </Text>
            </View>
            <View
              style={[
                styles.segmentedWrap,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
              ]}
            >
              {(
                [
                  { id: 'small', label: 'S' },
                  { id: 'medium', label: 'M' },
                  { id: 'large', label: 'L' },
                ] as const
              ).map((opt) => {
                const active = fontScale === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    style={[
                      styles.segBtn,
                      { minWidth: 32 },
                      active && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setFontScale(opt.id)}
                  >
                    <Text
                      style={[
                        styles.segBtnText,
                        { color: active ? colors.textInverse : colors.textSecondary },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      <Text style={[styles.versionFooter, { color: colors.textMuted }]}>
        GeM Mobile Companion v2.1 · Beta · Direct Phone ↔ GeM Public Portal
      </Text>

      <BusinessProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSaved={(saved) => setBusinessProfile(saved)}
      />

      <GemGlossaryModal
        visible={showGlossaryModal}
        onClose={() => setShowGlossaryModal(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: {
    padding: DESIGN_TOKENS.pagePaddingMobile,
    paddingBottom: 36,
  },
  heroCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 15,
    marginBottom: 18,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 14,
  },
  gemLogoFrame: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    padding: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gemLogoImg: {
    width: '100%',
    height: '100%',
  },
  heroTitle: {
    fontWeight: '800',
    marginBottom: 3,
  },
  heroSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  portalCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  portalCtaText: {
    fontSize: 13,
    fontWeight: '800',
  },
  sectionWrap: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  menuCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 60,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 60,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextCol: {
    flex: 1,
    marginRight: 8,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  menuTitle: {
    fontWeight: '700',
  },
  menuBadge: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  menuBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  menuSub: {
    fontSize: 11.5,
    lineHeight: 15.5,
  },
  chevron: {
    fontSize: 20,
    fontWeight: '500',
  },
  segmentedWrap: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 2,
    gap: 2,
  },
  segBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  versionFooter: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});
