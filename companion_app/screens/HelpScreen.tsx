/**
 * GeM Help & Resources Screen
 * Conforms to Screen 9 of the GeM Mobile UI Specification:
 * - SearchField: "Search help articles and guides"
 * - Official GeM Helpdesk Callout Card with verified phone numbers & [Call Support]
 * - Clean Resource List with colored icon squares, titles, descriptions, and chevrons
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  Pressable,
} from 'react-native';
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import {
  SearchField,
  PrimaryButton,
  SecondaryButton,
} from '../components/SharedUI';

export interface HelpScreenProps {
  onBack?: () => void;
}

interface ResourceItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  tint: string;
  url: string;
}

const RESOURCES: ResourceItem[] = [
  {
    id: 'lms',
    title: 'e-Learning & LMS',
    description: 'Interactive courses, buyer/seller certifications & webinars',
    icon: '🎓',
    tint: '#E8F1FF',
    url: 'https://lms.gem.gov.in',
  },
  {
    id: 'manuals',
    title: 'User Manuals & SOPs',
    description: 'Comprehensive step-by-step buyer, seller & consignee guides',
    icon: '📖',
    tint: '#E7F8EE',
    url: 'https://gem.gov.in/user_manual',
  },
  {
    id: 'faq',
    title: 'FAQs & Knowledge Base',
    description: 'Answers to frequent questions on CRAC, PFMS, EMD waivers & GFR 149',
    icon: '❓',
    tint: '#FFF4DB',
    url: 'https://gem.gov.in/faqs',
  },
  {
    id: 'policies',
    title: 'Policies & Guidelines',
    description: 'Official Ministry of Finance circulars, OMs & procurement policies',
    icon: '📜',
    tint: '#FDECEC',
    url: 'https://gem.gov.in/policy',
  },
  {
    id: 'incident',
    title: 'Incident Management',
    description: 'Delisting, administrative actions, dispute resolution & appeals',
    icon: '⚖️',
    tint: '#F0EAFE',
    url: 'https://gem.gov.in/incidents',
  },
  {
    id: 'videos',
    title: 'Video Tutorials',
    description: 'Official YouTube walkthroughs for bidding and reverse auctions',
    icon: '🎥',
    tint: '#FFF0DE',
    url: 'https://gem.gov.in/video_tutorials',
  },
];

export const HelpScreen: React.FC<HelpScreenProps> = ({ onBack }) => {
  const { colors, fontMultiplier } = useTheme();
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredResources = useMemo(() => {
    if (!searchQuery.trim()) return RESOURCES;
    const q = searchQuery.toLowerCase();
    return RESOURCES.filter(
      (r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleCallSupport = () => {
    Linking.openURL('tel:18004193436').catch(() => {
      Alert.alert(
        'GeM Helpdesk',
        'Call toll-free: 1800-419-3436 or 1800-102-3436\n(Monday - Saturday, 8:00 AM - 8:00 PM IST)'
      );
    });
  };

  const handleOpenResource = (res: ResourceItem) => {
    Linking.openURL(res.url).catch(() => {
      Alert.alert(res.title, `Visit ${res.url} in your browser.`);
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header / Back Navigation */}
      <View style={styles.topNavRow}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
            <Text style={[styles.backArrow, { color: colors.primary }]}>←</Text>
          </Pressable>
        )}
        <Text style={[styles.navTitle, { color: colors.textPrimary, fontSize: 18 * fontMultiplier }]}>
          Help &amp; Resources
        </Text>
      </View>

      {/* Search Input */}
      <SearchField
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search help articles and guides"
        style={{ marginBottom: 16 }}
      />

      {/* Official GeM Helpdesk Card */}
      <View
        style={[
          styles.helpdeskCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.helpdeskHeaderRow}>
          <View style={[styles.helpdeskIconSquare, { backgroundColor: colors.primaryTint }]}>
            <Text style={styles.helpdeskIconEmoji}>📞</Text>
          </View>
          <View style={styles.helpdeskInfo}>
            <Text style={[styles.helpdeskTitle, { color: colors.textPrimary }]}>
              GeM Official National Helpdesk
            </Text>
            <Text style={[styles.phoneNumbers, { color: colors.primary }]}>
              1800-419-3436 / 1800-102-3436
            </Text>
            <Text style={[styles.operatingHours, { color: colors.textMuted }]}>
              Mon - Sat: 8:00 AM – 8:00 PM IST
            </Text>
          </View>
        </View>

        <PrimaryButton
          label="Call Support (Toll-Free)"
          icon="📞"
          onPress={handleCallSupport}
          style={{ marginTop: 12 }}
        />
      </View>

      {/* Resource List */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Portals, Manuals &amp; Training
      </Text>

      <View style={styles.resourceList}>
        {filteredResources.map((res) => (
          <Pressable
            key={res.id}
            style={[
              styles.resourceCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => handleOpenResource(res)}
          >
            <View style={[styles.resourceIconSquare, { backgroundColor: res.tint }]}>
              <Text style={styles.resourceEmoji}>{res.icon}</Text>
            </View>

            <View style={styles.resourceInfo}>
              <Text style={[styles.resTitle, { color: colors.textPrimary, fontSize: 14 * fontMultiplier }]}>
                {res.title}
              </Text>
              <Text style={[styles.resDesc, { color: colors.textSecondary }]}>
                {res.description}
              </Text>
            </View>

            <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
          </Pressable>
        ))}
      </View>
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
  helpdeskCard: {
    borderRadius: DESIGN_TOKENS.cardRadius,
    borderWidth: DESIGN_TOKENS.borderWidth,
    padding: 16,
    marginBottom: 20,
  },
  helpdeskHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpdeskIconSquare: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  helpdeskIconEmoji: {
    fontSize: 22,
  },
  helpdeskInfo: {
    flex: 1,
  },
  helpdeskTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  phoneNumbers: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  operatingHours: {
    fontSize: 11,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  resourceList: {
    gap: 8,
  },
  resourceCard: {
    borderRadius: 12,
    borderWidth: DESIGN_TOKENS.borderWidth,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  resourceIconSquare: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resourceEmoji: {
    fontSize: 20,
  },
  resourceInfo: {
    flex: 1,
    marginRight: 8,
  },
  resTitle: {
    fontWeight: '650',
    marginBottom: 3,
  },
  resDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  chevron: {
    fontSize: 20,
    fontWeight: '600',
  },
});
