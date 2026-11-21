/**
 * Official GeM Portal Handoff Screen
 * Clean minimalist launcher into GeM's authenticated browser sessions.
 */

import React, { useCallback } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import { PrimaryButton } from '../components/SharedUI';

interface OfficialPortalScreenProps {
  onBack: () => void;
}

const PORTAL_LINKS = [
  {
    code: 'BID',
    title: 'BidPlus Live Tenders',
    url: 'https://bidplus.gem.gov.in/all-bids',
    domain: 'bidplus.gem.gov.in',
  },
  {
    code: 'MKP',
    title: 'GeM Marketplace & Services',
    url: 'https://mkp.gem.gov.in',
    domain: 'mkp.gem.gov.in',
  },
  {
    code: 'CON',
    title: 'Signed Contracts Registry',
    url: 'https://gem.gov.in/view_contracts',
    domain: 'gem.gov.in/view_contracts',
  },
  {
    code: 'FA',
    title: 'Forward e-Scrap Auctions',
    url: 'https://forwardauction.gem.gov.in',
    domain: 'forwardauction.gem.gov.in',
  },
];

export const OfficialPortalScreen: React.FC<OfficialPortalScreenProps> = ({ onBack }) => {
  const { colors, fontMultiplier } = useTheme();

  const openOfficialUrl = useCallback(async (url: string, label: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(label, `Visit ${url} in your browser.`);
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Fixed Sub-Header */}
      <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backButton} accessibilityLabel="Back">
          <Text style={[styles.backArrow, { color: colors.primary }]}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontSize: 16 * fontMultiplier }]}>
          Official GeM Portal
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Primary Authenticated Portal Card */}
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.heroTop}>
            <View style={[styles.emblem, { backgroundColor: colors.primary }]}>
              <Text style={[styles.emblemText, { color: colors.textInverse }]}>GeM</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
                Authenticated GeM Session
              </Text>
              <Text style={[styles.heroDomain, { color: colors.success }]}>
                Official URL · ui.gem.gov.in
              </Text>
            </View>
          </View>
          <Text style={[styles.heroDesc, { color: colors.textSecondary }]}>
            Sign in with your GeM credentials &amp; 2FA in your device browser to submit bids, view seller rank / L1 prices, track CRAC/PFMS payments, and manage orders.
          </Text>
          <PrimaryButton
            label="Open Official GeM Login ↗"
            onPress={() => openOfficialUrl('https://ui.gem.gov.in/login', 'GeM Login')}
            style={{ marginTop: 14 }}
          />
        </View>

        {/* Official Quick Links */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>VERIFIED GeM PORTALS</Text>
        <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {PORTAL_LINKS.map((link, idx) => (
            <Pressable
              key={link.code}
              style={({ pressed }) => [
                styles.linkRow,
                idx > 0 && { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => openOfficialUrl(link.url, link.title)}
            >
              <View style={[styles.codeBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Text style={[styles.codeText, { color: colors.primary }]}>{link.code}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.linkTitle, { color: colors.textPrimary }]}>{link.title}</Text>
                <Text style={[styles.linkDomain, { color: colors.textSecondary }]}>{link.domain}</Text>
              </View>
              <Text style={[styles.chevron, { color: colors.textMuted }]}>↗</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.privacyNote, { color: colors.textMuted }]}>
          This companion app never requests, intercepts, or stores your GeM password, OTP, or session cookies.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4, marginRight: 10 },
  backArrow: { fontSize: 20, fontWeight: '700' },
  headerTitle: { fontWeight: '800' },
  content: { padding: DESIGN_TOKENS.pagePaddingMobile, paddingBottom: 36 },
  heroCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  emblem: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemText: { fontSize: 13, fontWeight: '900' },
  heroTitle: { fontSize: 15, fontWeight: '800' },
  heroDomain: { fontSize: 11.5, fontWeight: '700', marginTop: 2 },
  heroDesc: { fontSize: 12.5, lineHeight: 18 },
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
    marginBottom: 14,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 12,
    gap: 12,
  },
  codeBox: {
    width: 38,
    height: 34,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: { fontSize: 10, fontWeight: '900' },
  linkTitle: { fontSize: 13.5, fontWeight: '700' },
  linkDomain: { fontSize: 11.5, marginTop: 1 },
  chevron: { fontSize: 15, fontWeight: '700' },
  privacyNote: { fontSize: 11, lineHeight: 16, textAlign: 'center', paddingHorizontal: 10 },
});
