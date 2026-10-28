import React, { useState, useMemo } from 'react';
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
  SegmentedTabs,
} from '../components/SharedUI';
import { MarketplaceService, type MarketplaceCategory } from '../services/MarketplaceService';

export interface CategoriesScreenProps {
  onSelectCategory: (category: MarketplaceCategory) => void;
  onBack?: () => void;
}

const CATEGORY_PALETTE: Record<string, { bg: string; text: string }> = {
  'it-products': { bg: '#E8F1FF', text: '#174EA6' },
  'automobiles': { bg: '#E7F8EE', text: '#16834A' },
  'office-furniture': { bg: '#FFF4DB', text: '#B96A0B' },
  'medical': { bg: '#FDECEC', text: '#C62828' },
  'appliances': { bg: '#F0EAFE', text: '#7048C8' },
  'stationery': { bg: '#FFF0DE', text: '#F28C28' },
  'defense': { bg: '#E0F2FE', text: '#0284C7' },
  'solar': { bg: '#FEF3C7', text: '#D97706' },
  'heavy-engineering': { bg: '#F1F5FB', text: '#475569' },
};

export const CategoriesScreen: React.FC<CategoriesScreenProps> = ({
  onSelectCategory,
  onBack,
}) => {
  const { colors, fontMultiplier } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Products' | 'Services'>('Products');

  const productCats = useMemo(() => MarketplaceService.getProductCategories(), []);
  const serviceCats = useMemo(() => MarketplaceService.getServiceCategories(), []);

  const displayedList = useMemo(() => {
    const list = activeTab === 'Products' ? productCats : serviceCats;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.subcategories.some((sub) => sub.toLowerCase().includes(q))
    );
  }, [activeTab, productCats, serviceCats, searchQuery]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header bar with Back button */}
      <View style={[styles.headerBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
            <Text style={[styles.backArrow, { color: colors.primary }]}>←</Text>
          </Pressable>
        )}
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontSize: 18 * fontMultiplier }]}>
          Categories
        </Text>
      </View>

      <View style={styles.controlsSection}>
        {/* Search Field */}
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Find a category, e.g. Laptops, AMC..."
          style={{ marginBottom: 10 }}
        />

        {/* Segmented Tabs: Products | Services */}
        <SegmentedTabs
          options={['Products', 'Services']}
          selected={activeTab}
          onSelect={(opt) => setActiveTab(opt as 'Products' | 'Services')}
        />
      </View>

      {/* Category List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {displayedList.map((cat) => {
          const colorPair = CATEGORY_PALETTE[cat.id] || { bg: colors.primaryTint, text: colors.primary };
          const subText = cat.subcategories.slice(0, 3).join(', ');

          return (
            <Pressable
              key={cat.id}
              style={[
                styles.categoryCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => onSelectCategory(cat)}
            >
              <View style={[styles.iconBox, { backgroundColor: colorPair.bg }]}>
                <Text style={styles.iconEmoji}>{cat.icon}</Text>
              </View>

              <View style={styles.infoCol}>
                <Text style={[styles.categoryName, { color: colors.textPrimary, fontSize: 14 * fontMultiplier }]}>
                  {cat.name}
                </Text>
                <Text style={[styles.subText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {subText}
                </Text>
              </View>

              <View style={styles.endCol}>
                <Text style={[styles.countBadge, { color: colors.textMuted }]}>
                  {cat.itemCount.toLocaleString()} items
                </Text>
                <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
              </View>
            </Pressable>
          );
        })}

        {displayedList.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No categories found matching &quot;{searchQuery}&quot;
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  backArrow: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerTitle: {
    fontWeight: '700',
  },
  controlsSection: {
    padding: DESIGN_TOKENS.pagePaddingMobile,
    paddingBottom: 8,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: DESIGN_TOKENS.pagePaddingMobile,
    paddingTop: 4,
    paddingBottom: 32,
  },
  categoryCard: {
    borderRadius: 12,
    borderWidth: DESIGN_TOKENS.borderWidth,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconEmoji: {
    fontSize: 20,
  },
  infoCol: {
    flex: 1,
    marginRight: 8,
  },
  categoryName: {
    fontWeight: '650',
    marginBottom: 3,
  },
  subText: {
    fontSize: 11,
  },
  endCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  countBadge: {
    fontSize: 11,
    marginBottom: 2,
  },
  chevron: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
  },
});
