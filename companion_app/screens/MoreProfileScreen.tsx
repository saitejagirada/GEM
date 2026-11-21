/**
 * GeM More / Settings & Tools Screen
 * Cleanly categorized into:
 * 1. Direct Public Mode status banner + official portal shortcut
 * 2. Procurement Workspace (Document Prep, Concluded Bids & Contracts, Official Portal)
 * 3. Onboarding & Support (Buyer Guide, Seller/MSE KYC Guide, Helpdesk & Manuals)
 * 4. Display & Accessibility (inline Theme & Text Size controls)
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme, DESIGN_TOKENS, type FontSizeScale } from '../theme/ThemeContext';

export interface MoreProfileScreenProps {
  onNavigateTab: (
    tab: 'MARKET' | 'BIDS' | 'AUCTIONS' | 'ORDERS' | 'PORTAL' | 'HELP' | 'REG_BUYER' | 'REG_SELLER'
  ) => void;
  onOpenPortfolio?: () => void;
  onOpenOfficialPortal?: () => void;
}

export const MoreProfileScreen: React.FC<MoreProfileScreenProps> = ({
  onNavigateTab,
  onOpenPortfolio,
  onOpenOfficialPortal,
}) => {
  const { colors, fontMultiplier, isDark, toggleColorMode, fontScale, setFontScale } = useTheme();

  const openPortal = () => {
    if (onOpenOfficialPortal) onOpenOfficialPortal();
    else onNavigateTab('PORTAL');
  };

  const openWorkspace = () => {
    if (onOpenPortfolio) onOpenPortfolio();
    else onNavigateTab('PORTAL');
  };

  const fontOptions: Array<{ id: FontSizeScale; label: string }> = [
    { id: 'small', label: 'A-' },
    { id: 'medium', label: 'A' },
    { id: 'large', label: 'A+' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Companion Mode Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statusTopRow}>
          <View style={[styles.emblemBox, { backgroundColor: colors.primary }]}>
            <Text style={[styles.emblemText, { color: colors.textInverse }]}>GeM</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: colors.textPrimary, fontSize: 15 * fontMultiplier }]}>
              GeM Mobile Companion
            </Text>
            <Text style={[styles.bannerSub, { color: colors.textSecondary }]}>
              Direct Phone → GeM · Zero stored credentials
            </Text>
          </View>
          <Pressable
            style={[styles.portalBtn, { backgroundColor: colors.primaryTint }]}
            onPress={openPortal}
            hitSlop={6}
          >
            <Text style={[styles.portalBtnText, { color: colors.primary }]}>GeM ↗</Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Procurement Workspace */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PROCUREMENT WORKSPACE</Text>
      <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MenuRow
          code="DOC"
          title="Document Preparation"
          subtitle="Stage local bid files & compliance checklists"
          onPress={openWorkspace}
          colors={colors}
        />
        <MenuRow
          code="RES"
          title="Concluded Bids & Contracts"
          subtitle="Live closed bid results & official contract registry"
          onPress={() => onNavigateTab('ORDERS')}
          colors={colors}
        />
        <MenuRow
          code="WEB"
          title="Official GeM Portal Session"
          subtitle="Sign in with 2FA on ui.gem.gov.in to submit bids"
          onPress={openPortal}
          colors={colors}
          isLast
        />
      </View>

      {/* 3. Onboarding & Support */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ONBOARDING &amp; SUPPORT</Text>
      <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <MenuRow
          code="BUY"
          title="Buyer Registration Guide"
          subtitle="Government office onboarding checklist & signup"
          onPress={() => onNavigateTab('REG_BUYER')}
          colors={colors}
        />
        <MenuRow
          code="MSE"
          title="Seller & MSE KYC Guide"
          subtitle="Udyam verification, PAN/GST checklist & EMD waiver"
          onPress={() => onNavigateTab('REG_SELLER')}
          colors={colors}
        />
        <MenuRow
          code="HLP"
          title="Helpdesk & Official Manuals"
          subtitle="Toll-free 1800-419-3436, LMS courses & SOPs"
          onPress={() => onNavigateTab('HELP')}
          colors={colors}
          isLast
        />
      </View>

      {/* 4. Display & Accessibility */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>DISPLAY &amp; ACCESSIBILITY</Text>
      <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Inline Theme Toggle */}
        <View style={[styles.controlRow, { borderBottomColor: colors.borderSubtle }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Appearance</Text>
            <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
              Switch light or dark color scheme
            </Text>
          </View>
          <View style={[styles.inlineToggle, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
            <Pressable
              onPress={() => isDark && toggleColorMode()}
              style={[styles.toggleOption, !isDark && { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.toggleText, { color: !isDark ? colors.textInverse : colors.textSecondary }]}>
                Light
              </Text>
            </Pressable>
            <Pressable
              onPress={() => !isDark && toggleColorMode()}
              style={[styles.toggleOption, isDark && { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.toggleText, { color: isDark ? colors.textInverse : colors.textSecondary }]}>
                Dark
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Inline Text Size Scale */}
        <View style={[styles.controlRow, { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Text Size</Text>
            <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
              Adjust readability across screens
            </Text>
          </View>
          <View style={[styles.inlineToggle, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
            {fontOptions.map((opt) => {
              const active = fontScale === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setFontScale(opt.id)}
                  style={[styles.toggleOption, active && { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.toggleText, { color: active ? colors.textInverse : colors.textSecondary }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <Text style={[styles.versionFooter, { color: colors.textMuted }]}>
        GeM Mobile Companion v2.1 · Direct Public Portal UI Layer
      </Text>
    </ScrollView>
  );
};

const MenuRow: React.FC<{
  code: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  isLast?: boolean;
}> = ({ code, title, subtitle, onPress, colors, isLast }) => (
  <Pressable
    style={({ pressed }) => [
      styles.menuRow,
      !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
      pressed && { opacity: 0.75 },
    ]}
    onPress={onPress}
  >
    <View style={[styles.codeBadge, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
      <Text style={[styles.codeText, { color: colors.primary }]}>{code}</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.rowSub, { color: colors.textSecondary }]} numberOfLines={1}>
        {subtitle}
      </Text>
    </View>
    <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: DESIGN_TOKENS.pagePaddingMobile, paddingBottom: 36 },
  statusBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  statusTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emblemBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemText: { fontSize: 13, fontWeight: '900', letterSpacing: -0.3 },
  bannerTitle: { fontWeight: '800' },
  bannerSub: { fontSize: 11.5, marginTop: 2 },
  portalBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  portalBtnText: { fontSize: 12, fontWeight: '800' },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 7,
    marginLeft: 2,
  },
  groupCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 18,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 12,
    gap: 12,
  },
  codeBadge: {
    width: 38,
    height: 34,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  rowTitle: { fontSize: 13.5, fontWeight: '700' },
  rowSub: { fontSize: 11.5, marginTop: 2 },
  chevron: { fontSize: 18, fontWeight: '700' },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  inlineToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 2,
  },
  toggleOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleText: { fontSize: 11.5, fontWeight: '800' },
  versionFooter: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});
