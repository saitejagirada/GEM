/**
 * GeM More / Profile Screen
 * Conforms to Screen 10 of the GeM Mobile UI Specification:
 * - Profile header card: Avatar circle (S), Name, Role, Ministry, Chevron
 * - Workspace links: My Bids, My Contracts, Saved Items, Notifications
 * - Preferences & Tools: Switch Role, Buyer Registration, Seller KYC, Help,
 *   Accessibility (Dark mode & font scale), Sign out
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import { StatusBadge } from '../components/SharedUI';

export interface MoreProfileScreenProps {
  onNavigateTab: (tab: 'MARKET' | 'BIDS' | 'AUCTIONS' | 'ORDERS' | 'PORTAL' | 'HELP' | 'REG_BUYER' | 'REG_SELLER') => void;
  onOpenPortfolio?: () => void;
}

export const MoreProfileScreen: React.FC<MoreProfileScreenProps> = ({
  onNavigateTab,
  onOpenPortfolio,
}) => {
  const { colors, fontMultiplier, isDark, toggleColorMode, fontScale, setFontScale } = useTheme();
  const [currentRole, setCurrentRole] = useState<'Government Buyer' | 'Verified Seller (MSE)'>('Government Buyer');

  const handleSwitchRole = () => {
    const nextRole = currentRole === 'Government Buyer' ? 'Verified Seller (MSE)' : 'Government Buyer';
    setCurrentRole(nextRole);
    Alert.alert('Role Switched', `Active session switched to: ${nextRole}`);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out from GeM Mobile?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => Alert.alert('Signed Out', 'You have been signed out.') },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Profile Header Card */}
      <View
        style={[
          styles.profileCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.textInverse }]}>S</Text>
        </View>

        <View style={styles.profileMeta}>
          <Text style={[styles.profileName, { color: colors.textPrimary, fontSize: 16 * fontMultiplier }]}>
            Sai Teja
          </Text>
          <Text style={[styles.profileRole, { color: colors.primary }]}>
            {currentRole}
          </Text>
          <Text style={[styles.profileDept, { color: colors.textSecondary }]}>
            Department of Expenditure • MoF
          </Text>
        </View>

        <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
      </View>

      {/* 2. Workspace Links */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Your Workspace
      </Text>

      <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable
          style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}
          onPress={() => onNavigateTab('BIDS')}
        >
          <View style={[styles.menuIconBox, { backgroundColor: colors.primaryTint }]}>
            <Text style={styles.menuIconEmoji}>📄</Text>
          </View>
          <View style={styles.menuTextCol}>
            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>My Bids &amp; Participation</Text>
            <Text style={[styles.menuSub, { color: colors.textSecondary }]}>Track active quotes &amp; evaluation status</Text>
          </View>
          <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
        </Pressable>

        <Pressable
          style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}
          onPress={() => onNavigateTab('ORDERS')}
        >
          <View style={[styles.menuIconBox, { backgroundColor: colors.violetTint }]}>
            <Text style={styles.menuIconEmoji}>📑</Text>
          </View>
          <View style={styles.menuTextCol}>
            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>My Contracts &amp; CRAC</Text>
            <Text style={[styles.menuSub, { color: colors.textSecondary }]}>Disbursements, PFMS &amp; acceptance SLAs</Text>
          </View>
          <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
        </Pressable>

        <Pressable
          style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}
          onPress={() => Alert.alert('Saved Items', 'You have 4 bookmarked bids and 2 saved products.')}
        >
          <View style={[styles.menuIconBox, { backgroundColor: colors.warningTint }]}>
            <Text style={styles.menuIconEmoji}>★</Text>
          </View>
          <View style={styles.menuTextCol}>
            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Saved Items &amp; Watchlist</Text>
            <Text style={[styles.menuSub, { color: colors.textSecondary }]}>Bookmarked opportunities &amp; catalog items</Text>
          </View>
          <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
        </Pressable>

        <Pressable
          style={styles.menuItem}
          onPress={() => Alert.alert('Notifications', 'No pending corrigenda or urgent bid deadlines.')}
        >
          <View style={[styles.menuIconBox, { backgroundColor: colors.successTint }]}>
            <Text style={styles.menuIconEmoji}>🔔</Text>
          </View>
          <View style={styles.menuTextCol}>
            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Notifications &amp; Corrigenda</Text>
            <Text style={[styles.menuSub, { color: colors.textSecondary }]}>Real-time tender updates &amp; alerts</Text>
          </View>
          <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
        </Pressable>
      </View>

      {/* 3. Preferences & Portal Tools */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 18 }]}>
        Preferences &amp; Tools
      </Text>

      <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable
          style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}
          onPress={handleSwitchRole}
        >
          <View style={[styles.menuIconBox, { backgroundColor: colors.surfaceSubtle }]}>
            <Text style={styles.menuIconEmoji}>🔄</Text>
          </View>
          <View style={styles.menuTextCol}>
            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Switch Role</Text>
            <Text style={[styles.menuSub, { color: colors.textSecondary }]}>Currently: {currentRole}</Text>
          </View>
          <StatusBadge label="SWITCH" tone="neutral" />
        </Pressable>

        <Pressable
          style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}
          onPress={() => onNavigateTab('REG_BUYER')}
        >
          <View style={[styles.menuIconBox, { backgroundColor: colors.primaryTint }]}>
            <Text style={styles.menuIconEmoji}>🏛️</Text>
          </View>
          <View style={styles.menuTextCol}>
            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Buyer Registration</Text>
            <Text style={[styles.menuSub, { color: colors.textSecondary }]}>Onboard government office establishment</Text>
          </View>
          <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
        </Pressable>

        <Pressable
          style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}
          onPress={() => onNavigateTab('REG_SELLER')}
        >
          <View style={[styles.menuIconBox, { backgroundColor: colors.successTint }]}>
            <Text style={styles.menuIconEmoji}>🛡️</Text>
          </View>
          <View style={styles.menuTextCol}>
            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Seller / MSE KYC</Text>
            <Text style={[styles.menuSub, { color: colors.textSecondary }]}>Verify Udyam &amp; claim 100% EMD waiver</Text>
          </View>
          <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
        </Pressable>

        <Pressable
          style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}
          onPress={() => onNavigateTab('HELP')}
        >
          <View style={[styles.menuIconBox, { backgroundColor: colors.surfaceSubtle }]}>
            <Text style={styles.menuIconEmoji}>❓</Text>
          </View>
          <View style={styles.menuTextCol}>
            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Help &amp; Support</Text>
            <Text style={[styles.menuSub, { color: colors.textSecondary }]}>Toll-free helpdesk, LMS &amp; manuals</Text>
          </View>
          <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
        </Pressable>

        {/* Accessibility controls: Dark mode & Font scale */}
        <Pressable
          style={[styles.menuItem, { borderBottomColor: colors.borderSubtle }]}
          onPress={toggleColorMode}
        >
          <View style={[styles.menuIconBox, { backgroundColor: colors.surfaceSubtle }]}>
            <Text style={styles.menuIconEmoji}>{isDark ? '☀️' : '🌙'}</Text>
          </View>
          <View style={styles.menuTextCol}>
            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
              {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            </Text>
            <Text style={[styles.menuSub, { color: colors.textSecondary }]}>High-contrast visual accessibility</Text>
          </View>
          <StatusBadge label={isDark ? 'DARK' : 'LIGHT'} tone="neutral" />
        </Pressable>

        {/* Sign Out */}
        <Pressable style={styles.menuItem} onPress={handleSignOut}>
          <View style={[styles.menuIconBox, { backgroundColor: colors.dangerTint }]}>
            <Text style={styles.menuIconEmoji}>🚪</Text>
          </View>
          <View style={styles.menuTextCol}>
            <Text style={[styles.menuTitle, { color: colors.danger, fontWeight: '700' }]}>Sign Out</Text>
            <Text style={[styles.menuSub, { color: colors.textSecondary }]}>Log out of active session</Text>
          </View>
          <Text style={[styles.chevron, { color: colors.danger }]}>›</Text>
        </Pressable>
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
  profileCard: {
    borderRadius: DESIGN_TOKENS.cardRadius,
    borderWidth: DESIGN_TOKENS.borderWidth,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  profileMeta: {
    flex: 1,
  },
  profileName: {
    fontWeight: '750',
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  profileDept: {
    fontSize: 11,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  menuCard: {
    borderRadius: DESIGN_TOKENS.cardRadius,
    borderWidth: DESIGN_TOKENS.borderWidth,
    overflow: 'hidden',
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuIconEmoji: {
    fontSize: 18,
  },
  menuTextCol: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '650',
    marginBottom: 2,
  },
  menuSub: {
    fontSize: 11,
  },
  chevron: {
    fontSize: 18,
    fontWeight: '600',
  },
});
