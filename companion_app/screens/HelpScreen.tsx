/**
 * GeM Help & Resources Screen — Clean Helpdesk Hero + Grouped Official Directory
 */

import React, { useMemo, useState } from 'react';
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
import { SearchField } from '../components/SharedUI';

export interface HelpScreenProps {
  onBack?: () => void;
}

interface ResourceItem {
  id: string;
  title: string;
  description: string;
  code: string;
  url: string;
}

const RESOURCES: ResourceItem[] = [
  {
    id: 'lms',
    title: 'e-Learning & LMS',
    description: 'Courses, buyer/seller certifications & official webinars',
    code: 'LMS',
    url: 'https://lms.gem.gov.in',
  },
  {
    id: 'manuals',
    title: 'User Manuals & SOPs',
    description: 'Step-by-step buyer, seller & consignee operating guides',
    code: 'DOC',
    url: 'https://gem.gov.in/user_manual',
  },
  {
    id: 'faq',
    title: 'FAQs & Knowledge Base',
    description: 'CRAC, PFMS payment timelines, EMD waivers & GFR Rule 149',
    code: 'FAQ',
    url: 'https://gem.gov.in/faqs',
  },
  {
    id: 'policies',
    title: 'Policies & Office Memoranda',
    description: 'Ministry of Finance circulars, OMs & MII / MSE guidelines',
    code: 'POL',
    url: 'https://gem.gov.in/policy',
  },
  {
    id: 'incident',
    title: 'Incident Management',
    description: 'Administrative actions, dispute resolution & appeals',
    code: 'INC',
    url: 'https://gem.gov.in/incidents',
  },
  {
    id: 'videos',
    title: 'Video Walkthroughs',
    description: 'Official video tutorials for bidding and reverse auctions',
    code: 'VID',
    url: 'https://gem.gov.in/video_tutorials',
  },
];

export const HelpScreen: React.FC<HelpScreenProps> = ({ onBack }) => {
  const { colors, fontMultiplier } = useTheme();
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredResources = useMemo(() => {
    if (!searchQuery.trim()) return RESOURCES;
    const q = searchQuery.toLowerCase().trim();
    return RESOURCES.filter(
      (r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleCallSupport = () => {
    Linking.openURL('tel:18004193436').catch(() => {
      Alert.alert(
        'GeM Helpdesk',
        'Call toll-free: 1800-419-3436 or 1800-102-3436\n(Monday – Saturday, 8:00 AM – 8:00 PM IST)'
      );
    });
  };

  const handleOpenResource = (res: ResourceItem) => {
    Linking.openURL(res.url).catch(() => {
      Alert.alert(res.title, `Visit ${res.url} in your browser.`);
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Fixed Sub-Header */}
      <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn} accessibilityLabel="Go back">
            <Text style={[styles.backArrow, { color: colors.primary }]}>←</Text>
          </Pressable>
        )}
        <Text style={[styles.navTitle, { color: colors.textPrimary, fontSize: 16 * fontMultiplier }]}>
          Helpdesk &amp; Manuals
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Official GeM National Helpdesk Card */}
        <View style={styles.helpdeskBanner}>
          <Text style={styles.helpdeskEyebrow}>NATIONAL TOLL-FREE HELPDESK</Text>
          <Text style={styles.phoneNumbers}>1800-419-3436 / 1800-102-3436</Text>
          <Text style={styles.operatingHours}>Monday – Saturday · 8:00 AM to 8:00 PM IST</Text>
          <Pressable
            style={({ pressed }) => [styles.callCta, pressed && { opacity: 0.85 }]}
            onPress={handleCallSupport}
          >
            <Text style={styles.callCtaText}>Call Support (Toll-Free)</Text>
          </Pressable>
        </View>

        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Filter manuals, FAQs, policies..."
          style={{ marginBottom: 14 }}
        />

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>OFFICIAL PORTAL RESOURCES</Text>

        <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {filteredResources.map((res, idx) => (
            <Pressable
              key={res.id}
              style={({ pressed }) => [
                styles.resourceRow,
                idx > 0 && { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => handleOpenResource(res)}
            >
              <View style={[styles.codeBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Text style={[styles.codeText, { color: colors.primary }]}>{res.code}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.resTitle, { color: colors.textPrimary, fontSize: 13.5 * fontMultiplier }]}>
                  {res.title}
                </Text>
                <Text style={[styles.resDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                  {res.description}
                </Text>
              </View>
              <Text style={[styles.chevron, { color: colors.textMuted }]}>↗</Text>
            </Pressable>
          ))}
        </View>
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
  backBtn: { marginRight: 10, padding: 4 },
  backArrow: { fontSize: 20, fontWeight: '700' },
  navTitle: { fontWeight: '800' },
  contentContainer: { padding: DESIGN_TOKENS.pagePaddingMobile, paddingBottom: 36 },
  helpdeskBanner: {
    backgroundColor: '#0B3B60',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  helpdeskEyebrow: {
    color: '#93C5FD',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  phoneNumbers: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 5,
  },
  operatingHours: {
    color: '#CBD5E1',
    fontSize: 11.5,
    marginTop: 3,
  },
  callCta: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  callCtaText: {
    color: '#0B3B60',
    fontSize: 13,
    fontWeight: '800',
  },
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
  },
  resourceRow: {
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
  codeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  resTitle: { fontWeight: '700' },
  resDesc: { fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  chevron: { fontSize: 15, fontWeight: '700' },
});
