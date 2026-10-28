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
} from '../components/SharedUI';
import { formatLakhs, formatDateSafe } from '../utils/formatters';
import type { DeconstructedBidDoc } from '../types/index';

export interface HomeScreenProps {
  bids: DeconstructedBidDoc[];
  onNavigateTab: (tab: 'MARKET' | 'BIDS' | 'AUCTIONS' | 'ORDERS' | 'PORTAL' | 'CATEGORIES' | 'HELP' | 'MORE') => void;
  onSelectBid: (bid: DeconstructedBidDoc) => void;
}

const SEARCH_FILTER_PILLS = ['All', 'Products', 'Services', 'Bids', 'Contracts'];

const POPULAR_CATEGORIES = [
  { id: 'cat-it', name: 'Computers & IT', desc: 'Laptops, Servers & Peripherals', count: '4,210 items', icon: '💻', color: '#174EA6', tint: '#E8F1FF' },
  { id: 'cat-med', name: 'Medical & Healthcare', desc: 'Hospital Equipment & Consumables', count: '3,150 items', icon: '🩺', color: '#16834A', tint: '#E7F8EE' },
  { id: 'cat-off', name: 'Office & Furniture', desc: 'Desks, Ergonomic Chairs & Paper', count: '1,890 items', icon: '🪑', color: '#B96A0B', tint: '#FFF4DB' },
  { id: 'cat-veh', name: 'Vehicles & Fleet', desc: 'Electric Buses, Sedans & SUVs', count: '920 items', icon: '🚙', color: '#7048C8', tint: '#F0EAFE' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  bids,
  onNavigateTab,
  onSelectBid,
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
          <Text style={[styles.heroBadgeText, { color: colors.primary }]}>National Procurement Portal</Text>
        </View>
        <Text style={[styles.heroTitle, { color: colors.textPrimary, fontSize: 16 * fontMultiplier }]}>
          Transparent. Efficient. Inclusive.
        </Text>
        <Text style={[styles.heroDescription, { color: colors.textSecondary, fontSize: 13 * fontMultiplier }]}>
          Connecting 1.5 Lakh+ government buyers with 60 Lakh+ verified sellers and MSMEs across India.
        </Text>
        <View style={[styles.heroStatsRow, { borderTopColor: colors.borderSubtle }]}>
          <View style={styles.heroStatItem}>
            <Text style={[styles.heroStatNum, { color: colors.primary }]}>45,000+</Text>
            <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>Active Bids</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={[styles.heroStatNum, { color: colors.emerald }]}>₹4.5L Cr</Text>
            <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>Transacted</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={[styles.heroStatNum, { color: colors.saffron }]}>10-Day</Text>
            <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>CRAC SLA</Text>
          </View>
        </View>
      </View>

      {/* 4. Quick Access Grid (4 Tiles) */}
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
              <Text style={styles.quickIconText}>🛍️</Text>
            </View>
            <Text style={[styles.quickCardTitle, { color: colors.textPrimary }]}>Products</Text>
            <Text style={[styles.quickCardSubtitle, { color: colors.textMuted }]}>10,000+ Items</Text>
          </Pressable>

          <Pressable
            style={[styles.quickCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            delayPressIn={0}
            unstable_pressDelay={0}
            hitSlop={6}
            onPress={() => onNavigateTab('BIDS')}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: colors.successTint }]}>
              <Text style={styles.quickIconText}>📄</Text>
            </View>
            <Text style={[styles.quickCardTitle, { color: colors.textPrimary }]}>Bids & Tenders</Text>
            <Text style={[styles.quickCardSubtitle, { color: colors.textMuted }]}>Live Tenders</Text>
          </Pressable>

          <Pressable
            style={[styles.quickCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            delayPressIn={0}
            unstable_pressDelay={0}
            hitSlop={6}
            onPress={() => onNavigateTab('AUCTIONS')}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: colors.warningTint }]}>
              <Text style={styles.quickIconText}>⚡</Text>
            </View>
            <Text style={[styles.quickCardTitle, { color: colors.textPrimary }]}>Auctions</Text>
            <Text style={[styles.quickCardSubtitle, { color: colors.textMuted }]}>Live RA Decrement</Text>
          </Pressable>

          <Pressable
            style={[styles.quickCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            delayPressIn={0}
            unstable_pressDelay={0}
            hitSlop={6}
            onPress={() => onNavigateTab('ORDERS')}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: colors.violetTint }]}>
              <Text style={styles.quickIconText}>📑</Text>
            </View>
            <Text style={[styles.quickCardTitle, { color: colors.textPrimary }]}>Contracts</Text>
            <Text style={[styles.quickCardSubtitle, { color: colors.textMuted }]}>CRAC & Orders</Text>
          </Pressable>
        </View>
      </View>

      {/* 5. Popular Categories Preview */}
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
                <Text style={styles.categoryEmoji}>{cat.icon}</Text>
              </View>
              <View style={styles.categoryInfo}>
                <Text style={[styles.categoryName, { color: colors.textPrimary }]}>{cat.name}</Text>
                <Text style={[styles.categoryDesc, { color: colors.textSecondary }]}>{cat.desc}</Text>
              </View>
              <View style={styles.categoryEndCol}>
                <Text style={[styles.categoryCount, { color: colors.textMuted }]}>{cat.count}</Text>
                <Text style={[styles.chevronText, { color: colors.textMuted }]}>›</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 6. Latest Opportunities Snippet */}
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
                  {formatLakhs(bid.estimatedBidValueInr || 2500000)}
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

      {/* 7. Procurement Help Banner */}
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
          <Text style={styles.helpIconEmoji}>ℹ️</Text>
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
    borderRadius: 20,
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
    borderRadius: 12,
    borderWidth: DESIGN_TOKENS.borderWidth,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  categoryIconSquare: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryEmoji: {
    fontSize: 18,
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
    borderRadius: 8,
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
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  helpIconEmoji: {
    fontSize: 20,
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
