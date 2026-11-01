import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import {
  SearchField,
  CompactChip,
  StatusBadge,
  SectionHeader,
  PrimaryButton,
  SecondaryButton,
} from '../components/SharedUI';
import { formatLakhs, formatDateSafe } from '../utils/formatters';
import type { DeconstructedBidDoc } from '../types/index';

export interface HomeScreenProps {
  bids: DeconstructedBidDoc[];
  onNavigateTab: (tab: 'MARKET' | 'BIDS' | 'AUCTIONS' | 'ORDERS' | 'PORTAL' | 'CATEGORIES' | 'HELP' | 'MORE') => void;
  onSelectBid: (bid: DeconstructedBidDoc) => void;
  onOpenMyWork?: () => void;
  onOpenOfficialPortal?: () => void;
}

const SEARCH_FILTER_PILLS = ['All', 'Products', 'Services', 'Bids', 'Contracts'];

const POPULAR_CATEGORIES = [
  { id: 'cat-it', name: 'Computers & IT', desc: 'Laptops, servers & peripherals', code: 'IT', color: '#0B4F71', tint: '#EAF2F6' },
  { id: 'cat-med', name: 'Medical & Healthcare', desc: 'Hospital equipment & consumables', code: 'MED', color: '#0B7A3B', tint: '#E8F4EC' },
  { id: 'cat-off', name: 'Office & Furniture', desc: 'Desks, chairs & stationery', code: 'OFF', color: '#9A5B00', tint: '#FFF4DF' },
  { id: 'cat-veh', name: 'Vehicles & Fleet', desc: 'Vehicles and transport equipment', code: 'VEH', color: '#49627A', tint: '#EDF1F4' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  bids,
  onNavigateTab,
  onSelectBid,
  onOpenMyWork,
  onOpenOfficialPortal,
}) => {
  const { colors, fontMultiplier } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterPill, setActiveFilterPill] = useState('All');

  const latestOpportunities = bids.slice(0, 3);

  const handleSearchSubmit = () => {
    if (activeFilterPill === 'Bids') {
      onNavigateTab('BIDS');
    } else if (activeFilterPill === 'Contracts') {
      onNavigateTab('ORDERS');
    } else if (activeFilterPill === 'Auctions') {
      onNavigateTab('AUCTIONS');
    } else {
      onNavigateTab('MARKET');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Welcome Banner */}
      <View style={styles.welcomeSection}>
        <Text style={[styles.welcomeTitle, { color: colors.textPrimary, fontSize: 24 * fontMultiplier }]}>
          Procurement, made simpler
        </Text>
        <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary, fontSize: 14 * fontMultiplier }]}>
          Discover products, services and public procurement opportunities.
        </Text>
      </View>

      {/* 2. Universal Search Field */}
      <View style={styles.searchSection}>
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search products, services, bids or contracts"
          onSubmit={handleSearchSubmit}
        />
        {/* Horizontal Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillScrollView}
          contentContainerStyle={styles.pillContainer}
        >
          {SEARCH_FILTER_PILLS.map((pill) => (
            <CompactChip
              key={pill}
              label={pill}
              selected={activeFilterPill === pill}
              onPress={() => setActiveFilterPill(pill)}
            />
          ))}
        </ScrollView>
      </View>

      {/* 3. Hero Card: Transparent Efficient Inclusive */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.heroBadgeRow}>
          <View style={[styles.heroDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.heroBadgeText, { color: colors.primary }]}>PUBLIC GeM PROCUREMENT FEED</Text>
        </View>
        <Text style={[styles.heroTitle, { color: colors.textPrimary, fontSize: 16 * fontMultiplier }]}>
          Government e-Marketplace companion
        </Text>
          <Text style={[styles.heroDescription, { color: colors.textSecondary, fontSize: 13 * fontMultiplier }]}>
          Browse the current public GeM feed, inspect tender documents, and prepare your response before continuing on the official portal.
        </Text>
        <View style={[styles.heroStatsRow, { borderTopColor: colors.borderSubtle }]}>
          <View style={styles.heroStatItem}>
            <Text style={[styles.heroStatNum, { color: colors.primary }]}>{bids.length}</Text>
            <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>Loaded now</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={[styles.heroStatNum, { color: colors.emerald }]}>Public</Text>
            <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>Feed only</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={[styles.heroStatNum, { color: colors.saffron }]}>GeM</Text>
            <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>Submit there</Text>
          </View>
        </View>
      </View>

      {/* 4. Personal workspace entry point */}
      <View style={[styles.workspaceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.workspaceCopy}>
          <Text style={[styles.workspaceEyebrow, { color: colors.primary }]}>COMPANION WORKSPACE</Text>
          <Text style={[styles.workspaceTitle, { color: colors.textPrimary }]}>Prepare response files</Text>
          <Text style={[styles.workspaceSubtitle, { color: colors.textSecondary }]}>Choose a public opportunity, assemble local files, and continue on the official GeM portal when ready.</Text>
        </View>
        <View style={styles.workspaceActions}>
          <PrimaryButton
            label="Open preparation"
            onPress={() => (onOpenMyWork ? onOpenMyWork() : onNavigateTab('MORE'))}
            style={styles.workspaceButton}
          />
          <SecondaryButton
            label="Open official GeM"
            onPress={() => (onOpenOfficialPortal ? onOpenOfficialPortal() : onNavigateTab('PORTAL'))}
            style={styles.workspaceButton}
          />
        </View>
      </View>

      {/* 5. Quick Access Grid (4 Tiles) */}
      <View style={styles.quickAccessSection}>
        <SectionHeader title="Quick access" />
        <View style={styles.quickGrid}>
          <Pressable
            style={[styles.quickCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            delayPressIn={0}
            unstable_pressDelay={0}
            hitSlop={6}
            onPress={() => onNavigateTab('MARKET')}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: colors.primaryTint }]}>
              <Text style={[styles.quickIconText, { color: colors.primary }]}>P</Text>
            </View>
            <Text style={[styles.quickCardTitle, { color: colors.textPrimary }]}>Products</Text>
            <Text style={[styles.quickCardSubtitle, { color: colors.textMuted }]}>Public catalog</Text>
          </Pressable>

          <Pressable
            style={[styles.quickCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            delayPressIn={0}
            unstable_pressDelay={0}
            hitSlop={6}
            onPress={() => onNavigateTab('BIDS')}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: colors.successTint }]}>
              <Text style={[styles.quickIconText, { color: colors.emerald }]}>B</Text>
            </View>
            <Text style={[styles.quickCardTitle, { color: colors.textPrimary }]}>Bids & Tenders</Text>
            <Text style={[styles.quickCardSubtitle, { color: colors.textMuted }]}>Live public feed</Text>
          </Pressable>

          <Pressable
            style={[styles.quickCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            delayPressIn={0}
            unstable_pressDelay={0}
            hitSlop={6}
            onPress={() => onNavigateTab('AUCTIONS')}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: colors.warningTint }]}>
              <Text style={[styles.quickIconText, { color: colors.warning }]}>A</Text>
            </View>
            <Text style={[styles.quickCardTitle, { color: colors.textPrimary }]}>Auctions</Text>
            <Text style={[styles.quickCardSubtitle, { color: colors.textMuted }]}>Public RA records</Text>
          </Pressable>

          <Pressable
            style={[styles.quickCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            delayPressIn={0}
            unstable_pressDelay={0}
            hitSlop={6}
            onPress={() => onNavigateTab('ORDERS')}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: colors.violetTint }]}>
              <Text style={[styles.quickIconText, { color: colors.violet }]}>C</Text>
            </View>
            <Text style={[styles.quickCardTitle, { color: colors.textPrimary }]}>Contracts</Text>
            <Text style={[styles.quickCardSubtitle, { color: colors.textMuted }]}>Official registry</Text>
          </Pressable>
        </View>
      </View>

      {/* 6. Popular Categories Preview */}
      <View style={styles.categoriesSection}>
        <SectionHeader
          title="Browse categories"
          actionLabel="View all >"
          onAction={() => onNavigateTab('CATEGORIES')}
        />
        <View style={styles.categoryList}>
          {POPULAR_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              delayPressIn={0}
              unstable_pressDelay={0}
              hitSlop={6}
              style={[
                styles.categoryRowItem,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => onNavigateTab('MARKET')}
            >
              <View style={[styles.categoryIconSquare, { backgroundColor: cat.tint }]}>
                <Text style={[styles.categoryCode, { color: cat.color }]}>{cat.code}</Text>
              </View>
              <View style={styles.categoryInfo}>
                <Text style={[styles.categoryName, { color: colors.textPrimary }]}>{cat.name}</Text>
                <Text style={[styles.categoryDesc, { color: colors.textSecondary }]}>{cat.desc}</Text>
              </View>
              <View style={styles.categoryEndCol}>
                <Text style={[styles.categoryCount, { color: colors.textMuted }]}>Browse</Text>
                <Text style={[styles.chevronText, { color: colors.textMuted }]}>›</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 7. Latest Opportunities Snippet */}
      <View style={styles.opportunitiesSection}>
        <SectionHeader
          title="Latest opportunities"
          actionLabel="View all >"
          onAction={() => onNavigateTab('BIDS')}
        />
        {latestOpportunities.map((bid) => (
          <Pressable
            key={bid.bidNumber}
            delayPressIn={0}
            unstable_pressDelay={0}
            hitSlop={6}
            style={[
              styles.opportunityCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => onSelectBid(bid)}
          >
            <View style={styles.oppHeaderRow}>
              <StatusBadge
                label={bid.type === 'SERVICE' ? 'SERVICES' : 'GOODS'}
                tone={bid.type === 'SERVICE' ? 'violet' : 'neutral'}
              />
              <Text style={[styles.oppBidNum, { color: colors.textSecondary }]}>{bid.bidNumber}</Text>
              <StatusBadge label="ACTIVE" tone="success" dot />
            </View>

            <Text
              style={[styles.oppTitle, { color: colors.textPrimary, fontSize: 14 * fontMultiplier }]}
              numberOfLines={2}
            >
              {bid.title}
            </Text>
            <Text style={[styles.oppDept, { color: colors.textSecondary }]} numberOfLines={1}>
              {bid.department}
            </Text>

            <View style={[styles.oppMetaGrid, { backgroundColor: colors.surfaceSubtle }]}>
              <View style={styles.oppMetaCol}>
                <Text style={[styles.oppMetaLabel, { color: colors.textMuted }]}>EST. VALUE</Text>
                <Text style={[styles.oppMetaVal, { color: colors.primary }]}>
                  {bid.publishedFields?.estimatedValue === false ? 'Not published' : formatLakhs(bid.estimatedBidValueInr)}
                </Text>
              </View>
              <View style={styles.oppMetaCol}>
                <Text style={[styles.oppMetaLabel, { color: colors.textMuted }]}>CLOSES IN</Text>
                <Text style={[styles.oppMetaVal, { color: colors.textPrimary }]}>
                  {formatDateSafe(bid.closingTimeUtc)}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      {/* 8. Procurement Help Banner */}
      <View
        style={[
          styles.helpCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.helpIconSquare, { backgroundColor: colors.primaryTint }]}>
          <Text style={[styles.helpIconEmoji, { color: colors.primary }]}>i</Text>
        </View>
        <View style={styles.helpTextCol}>
          <Text style={[styles.helpTitle, { color: colors.textPrimary }]}>Need help using the marketplace?</Text>
          <Text style={[styles.helpSubtitle, { color: colors.textSecondary }]}>
            Browse manuals, FAQs, LMS courses, and call official toll-free support.
          </Text>
          <View style={{ marginTop: 8 }}>
            <PrimaryButton
              label="Help & Resources"
              onPress={() => onNavigateTab('HELP')}
              style={{ paddingVertical: 8, alignSelf: 'flex-start' }}
            />
          </View>
        </View>
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
  welcomeSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    lineHeight: 20,
  },
  searchSection: {
    marginBottom: 16,
  },
  pillScrollView: {
    marginTop: 10,
  },
  pillContainer: {
    flexDirection: 'row',
  },
  heroCard: {
    borderRadius: DESIGN_TOKENS.cardRadius,
    borderWidth: DESIGN_TOKENS.borderWidth,
    padding: 16,
    marginBottom: 20,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  heroDescription: {
    lineHeight: 18,
    marginBottom: 12,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  heroStatItem: {
    alignItems: 'center',
  },
  heroStatNum: {
    fontSize: 15,
    fontWeight: '700',
  },
  heroStatLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  workspaceCard: {
    borderRadius: DESIGN_TOKENS.cardRadius,
    borderWidth: DESIGN_TOKENS.borderWidth,
    padding: 14,
    marginBottom: 20,
  },
  workspaceCopy: { marginBottom: 12 },
  workspaceEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  workspaceTitle: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  workspaceSubtitle: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  workspaceActions: { gap: 8 },
  workspaceButton: { alignSelf: 'stretch' },
  quickAccessSection: {
    marginBottom: 20,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickCard: {
    width: '48%',
    borderRadius: DESIGN_TOKENS.cardRadius,
    borderWidth: DESIGN_TOKENS.borderWidth,
    padding: 14,
    marginBottom: 12,
  },
  quickIconCircle: {
    width: 40,
    height: 40,
    borderRadius: DESIGN_TOKENS.buttonRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickIconText: {
    fontSize: 18,
  },
  quickCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickCardSubtitle: {
    fontSize: 11,
  },
  categoriesSection: {
    marginBottom: 20,
  },
  categoryList: {
    gap: 8,
  },
  categoryRowItem: {
    borderRadius: DESIGN_TOKENS.cardRadius,
    borderWidth: DESIGN_TOKENS.borderWidth,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  categoryIconSquare: {
    width: 40,
    height: 40,
    borderRadius: DESIGN_TOKENS.buttonRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryCode: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '650',
    marginBottom: 2,
  },
  categoryDesc: {
    fontSize: 11,
  },
  categoryEndCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryCount: {
    fontSize: 11,
    marginRight: 6,
  },
  chevronText: {
    fontSize: 18,
    fontWeight: '600',
  },
  opportunitiesSection: {
    marginBottom: 20,
  },
  opportunityCard: {
    borderRadius: DESIGN_TOKENS.cardRadius,
    borderWidth: DESIGN_TOKENS.borderWidth,
    padding: 14,
    marginBottom: 12,
  },
  oppHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  oppBidNum: {
    fontSize: 11,
    fontWeight: '600',
  },
  oppTitle: {
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 18,
  },
  oppDept: {
    fontSize: 12,
    marginBottom: 10,
  },
  oppMetaGrid: {
    flexDirection: 'row',
    borderRadius: DESIGN_TOKENS.buttonRadius,
    padding: 10,
    justifyContent: 'space-between',
  },
  oppMetaCol: {
    flex: 1,
  },
  oppMetaLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  oppMetaVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  helpCard: {
    borderRadius: DESIGN_TOKENS.cardRadius,
    borderWidth: DESIGN_TOKENS.borderWidth,
    padding: 16,
    flexDirection: 'row',
  },
  helpIconSquare: {
    width: 40,
    height: 40,
    borderRadius: DESIGN_TOKENS.buttonRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  helpIconEmoji: {
    fontSize: 18,
    fontWeight: '800',
  },
  helpTextCol: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '750',
    marginBottom: 4,
  },
  helpSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
});
