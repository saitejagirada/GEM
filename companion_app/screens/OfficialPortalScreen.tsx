/**
 * Official GeM workspace handoff.
 *
 * This screen deliberately uses the device's official browser session. It
 * never receives GeM passwords, OTPs, cookies, or account-specific records.
 */

import React, { useCallback } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import { DataNotice } from '../components/DataNotice';
import { PrimaryButton, SecondaryButton, StatusBadge } from '../components/SharedUI';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const GEM_MARK_IMG = require('../assets/gem-mark.png');

interface OfficialPortalScreenProps {
  onBack: () => void;
}

const OFFICIAL_LOGIN_URL = 'https://ui.gem.gov.in/login';
const OFFICIAL_PORTAL_URL = 'https://gem.gov.in/';
const PUBLIC_BIDS_URL = 'https://bidplus.gem.gov.in/all-bids';

export const OfficialPortalScreen: React.FC<OfficialPortalScreenProps> = ({ onBack }) => {
  const { colors, fontMultiplier } = useTheme();

  const openOfficialUrl = useCallback(async (url: string, label: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(`Open ${label}`, `Please open ${url} in your browser.`);
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sticky 48dp Sub-Screen Header */}
      <View
        style={[
          styles.stickyHeader,
          { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle },
        ]}
      >
        <Pressable onPress={onBack} hitSlop={10} style={styles.backButton} accessibilityLabel="Back">
          <Text style={[styles.backArrow, { color: colors.primary }]}>←</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.textPrimary, fontSize: 16.5 * fontMultiplier }]}>
            Official GeM Portal
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <DataNotice>
          Authentication, 2FA, bidding, uploads, and account records stay inside GeM's official session.
        </DataNotice>

        <View style={[styles.introCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.introTopRow}>
            <View
              style={[
                styles.portalMarkFrame,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
              ]}
            >
              <Image source={GEM_MARK_IMG} style={styles.portalMarkImg} resizeMode="contain" />
            </View>
            <View style={styles.introCopy}>
              <Text style={[styles.introTitle, { color: colors.textPrimary }]}>
                Continue on the Government e-Marketplace
              </Text>
              <Text style={[styles.introText, { color: colors.textSecondary }]}>
                Use the official portal for anything that requires your GeM account. Our companion stays available for public discovery and document preparation.
              </Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <StatusBadge label="OFFICIAL URL" tone="success" dot />
            <Text style={[styles.domainText, { color: colors.textMuted }]}>ui.gem.gov.in</Text>
          </View>
        </View>

        <PrimaryButton
          label="Open GeM login ↗"
          onPress={() => openOfficialUrl(OFFICIAL_LOGIN_URL, 'GeM login')}
          style={styles.fullButton}
        />

        <View style={[styles.disclosureCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Before you continue</Text>
          <Text style={[styles.disclosureText, { color: colors.textSecondary }]}>
            You are leaving the companion workflow and opening an official GeM page. Enter your credentials and OTP only on the GeM domain. This app does not request, store, or transmit them.
          </Text>
          <Text style={[styles.disclosureText, { color: colors.textSecondary }]}>
            GeM remains the source of truth for your bid status, participation history, rank, contracts, payments, and final submission confirmation.
          </Text>
        </View>

        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>Public GeM links</Text>
        <View style={[styles.linksCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SecondaryButton label="Open GeM public portal ↗" onPress={() => openOfficialUrl(OFFICIAL_PORTAL_URL, 'GeM public portal')} style={styles.linkButton} />
          <SecondaryButton label="Open live bid listing ↗" onPress={() => openOfficialUrl(PUBLIC_BIDS_URL, 'live bid listing')} style={styles.linkButton} />
        </View>

        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Official pages may require a supported browser, JavaScript, CAPTCHA, or 2FA. If a page does not load inside the app, continue in your device browser.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  stickyHeader: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  content: { padding: DESIGN_TOKENS.pagePaddingMobile, paddingBottom: 36 },
  backButton: { padding: 4, marginRight: 10 },
  backArrow: { fontSize: 20, fontWeight: '700' },
  headerCopy: { flex: 1 },
  title: { fontWeight: '700' },
  introCard: { borderRadius: DESIGN_TOKENS.cardRadius, borderWidth: 1, padding: 14, marginBottom: 12 },
  introTopRow: { flexDirection: 'row', alignItems: 'flex-start' },
  portalMarkFrame: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  portalMarkImg: { width: '100%', height: '100%' },
  introCopy: { flex: 1 },
  introTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  introText: { fontSize: 12, lineHeight: 17, marginTop: 5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  domainText: { fontSize: 11, marginLeft: 8 },
  fullButton: { alignSelf: 'stretch', marginBottom: 12 },
  disclosureCard: { borderRadius: DESIGN_TOKENS.cardRadius, borderWidth: 1, padding: 14, marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  disclosureText: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  sectionHeading: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  linksCard: { borderRadius: DESIGN_TOKENS.cardRadius, borderWidth: 1, padding: 10 },
  linkButton: { alignSelf: 'stretch', marginBottom: 8 },
  footerText: { fontSize: 11, lineHeight: 16, marginTop: 12 },
});
