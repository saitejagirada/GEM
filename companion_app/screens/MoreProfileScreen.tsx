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
import { AnimatedProfileIcon, AppIcon, type AppIconName } from '../components/AppIcons';
import { BusinessProfileModal } from '../components/BusinessProfileModal';
import { GemGlossaryModal } from '../components/GemGlossaryModal';
import { BusinessProfileService } from '../services/BusinessProfileService';
import {
  COMPANY_LOCKER_SLOTS,
  CompanyDocLockerService,
  type CompanyLockerDocument,
} from '../services/CompanyDocLockerService';
import {
  TenderRadarService,
  buildSavedBookmarksReview,
  type TenderRadarState,
} from '../services/TenderRadarService';
import type { UserAgentProfile } from '../types/index';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const GEM_MARK_IMG = require('../assets/gem-mark.png');

export interface MoreProfileScreenProps {
  onNavigateTab: (
    tab:
      | 'MARKET'
      | 'BIDS'
      | 'RAILWAYS'
      | 'AUCTIONS'
      | 'ORDERS'
      | 'PORTAL'
      | 'HELP'
      | 'REG_BUYER'
      | 'REG_SELLER'
  ) => void;
  onOpenPortfolio?: () => void;
  onOpenCompanyLocker?: () => void;
  onOpenBookmarks?: () => void;
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
  onOpenBookmarks,
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
  const [radarState, setRadarState] = useState<TenderRadarState>(() =>
    TenderRadarService.getState()
  );
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);

  useEffect(() => {
    BusinessProfileService.hydrate().then(setBusinessProfile).catch(() => undefined);
    const unsubProfile = BusinessProfileService.subscribe(setBusinessProfile);
    CompanyDocLockerService.hydrate().then(setLockerDocs).catch(() => undefined);
    const unsubLocker = CompanyDocLockerService.subscribe(setLockerDocs);
    TenderRadarService.hydrate().then(setRadarState).catch(() => undefined);
    const unsubRadar = TenderRadarService.subscribe(setRadarState);
    return () => {
      unsubProfile();
      unsubLocker();
      unsubRadar();
    };
  }, []);

  const bookmarkReview = buildSavedBookmarksReview(radarState.watched);

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
      id: 'saved-bookmarks',
      icon: bookmarkReview.totalCount > 0 ? 'bookmarkFilled' : 'bookmark',
      iconBg: bookmarkReview.totalCount > 0 ? colors.warningTint : colors.primaryTint,
      iconColor: bookmarkReview.totalCount > 0 ? colors.warning : colors.primary,
      title: t('savedBookmarks'),
      subtitle:
        bookmarkReview.totalCount > 0
          ? `${bookmarkReview.openCount} Open · ${bookmarkReview.closedCount} Closed · Review status & deadlines`
          : 'Review saved tenders automatically categorized into Open vs. Closed',
      badge:
        bookmarkReview.openCount > 0
          ? `${bookmarkReview.openCount} OPEN`
          : bookmarkReview.closedCount > 0
            ? `${bookmarkReview.closedCount} CLOSED`
            : undefined,
      onPress: () => {
        if (onOpenBookmarks) onOpenBookmarks();
        else onNavigateTab('BIDS');
      },
    },
    {
      id: 'company-locker',
      icon: 'document',
      iconBg: lockerDocs.length > 0 ? colors.successTint : colors.primaryTint,
      iconColor: lockerDocs.length > 0 ? colors.success : colors.primary,
      title: t('companyDocLocker'),
      subtitle:
        lockerDocs.length > 0
          ? `${CompanyDocLockerService.getFilledSlotCount(lockerDocs)} of ${COMPANY_LOCKER_SLOTS.length} vault slots ready · Auto-extracts PDF details`
          : 'Save GST, PAN, Udyam, Turnover & CRAC PDFs once on device',
      badge:
        lockerDocs.length > 0
          ? `${CompanyDocLockerService.getFilledSlotCount(lockerDocs)}/${COMPANY_LOCKER_SLOTS.length} READY`
          : undefined,
      onPress: openLocker,
    },
    {
      id: 'docs',
      icon: 'document',
      iconBg: colors.primaryTint,
      iconColor: colors.primary,
      title: t('docPreparation'),
      subtitle: 'Organize bid-specific checklists, compliance drafts & files',
      onPress: openWorkspace,
    },
    {
      id: 'contracts',
      icon: 'contract',
      iconBg: colors.successTint,
      iconColor: colors.success,
      title: t('concludedBidsContracts'),
      subtitle: 'Public contract awards, orders & CRAC records',
      onPress: () => onNavigateTab('ORDERS'),
    },
    {
      id: 'corrigenda',
      icon: 'bell',
      iconBg: colors.warningTint,
      iconColor: colors.warning,
      title: t('liveBidsCorrigenda'),
      subtitle: 'Browse active bidplus.gem.gov.in updates & amendments',
      onPress: () => onNavigateTab('BIDS'),
    },
    {
      id: 'railways-bids',
      icon: 'rail',
      iconBg: colors.primaryTint,
      iconColor: colors.primary,
      title: t('railwaysBids'),
      subtitle: 'Live Ministry of Railways tenders & official GeM BidNext handoff',
      badge: 'LIVE',
      onPress: () => onNavigateTab('RAILWAYS'),
    },
  ];

  const onboardingItems: MenuRowItem[] = [
    {
      id: 'buyer',
      icon: 'buyer',
      iconBg: colors.primaryTint,
      iconColor: colors.primary,
      title: t('buyerRegistration'),
      subtitle: 'Onboard a government office or organization on GeM',
      onPress: () => onNavigateTab('REG_BUYER'),
    },
    {
      id: 'seller',
      icon: 'seller',
      iconBg: colors.successTint,
      iconColor: colors.success,
      title: t('sellerRegistration'),
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
      title: t('helpSupport'),
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
                          row.badge === 'ACTIVE' ||
                          row.badge === 'LIVE' ||
                          row.badge.endsWith('OPEN')
                            ? colors.successTint
                            : row.badge.endsWith('CLOSED')
                              ? colors.surfaceSubtle
                              : colors.primaryTint,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.menuBadgeText,
                        {
                          color:
                            row.badge === 'ACTIVE' ||
                            row.badge === 'LIVE' ||
                            row.badge.endsWith('OPEN')
                              ? colors.success
                              : row.badge.endsWith('CLOSED')
                                ? colors.textSecondary
                                : colors.primary,
                        },
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
      {/* 0. User Account Title Header with Animated Profile Emblem */}
      <View style={styles.accountHeaderRow}>
        <View
          style={[
            styles.accountAvatarBadge,
            {
              backgroundColor: businessProfile ? colors.successTint : colors.primaryTint,
              borderColor: businessProfile ? colors.success : colors.primaryTint,
            },
          ]}
        >
          <AnimatedProfileIcon
            color={businessProfile ? colors.success : colors.primary}
            size={26}
            active={true}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.accountTitle,
              { color: colors.textPrimary, fontSize: 22 * fontMultiplier },
            ]}
            numberOfLines={1}
          >
            {t('userAccountTitle')}
          </Text>
          <Text style={[styles.accountSub, { color: colors.textSecondary }]} numberOfLines={1}>
            {businessProfile?.organizationName
              ? `${businessProfile.organizationName} · ${bookmarkReview.openCount} open bookmarks`
              : `${bookmarkReview.openCount} Open · ${bookmarkReview.closedCount} Closed bookmarks`}
          </Text>
        </View>
      </View>

      {/* 1. Branded GeM Hero Card */}
      <View
        style={[
          styles.heroCard,
          { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
        ]}
      >
        <View style={styles.heroTopRow}>
          <View
            style={[
              styles.gemLogoFrame,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
            ]}
          >
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
            {t('openOfficialPortalCta')}
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
                {t('appearanceLabel')}
              </Text>
              <Text style={[styles.menuSub, { color: colors.textSecondary }]}>
                {t('appearanceSub')}
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
                {t('textSizeLabel')}
              </Text>
              <Text style={[styles.menuSub, { color: colors.textSecondary }]}>
                {t('textSizeSub')}
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
  accountHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  accountAvatarBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountTitle: {
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  accountSub: {
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 1,
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
