import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { SearchField } from '../components/SharedUI';
import {
  MarketplaceService,
  type MarketplaceCategory,
} from '../services/MarketplaceService';
import { OFFICIAL_GEM_SUBCATEGORIES } from '../services/GeMClientCrawler';

export interface CategoriesScreenProps {
  onSelectCategory: (category: MarketplaceCategory) => void;
  onBack?: () => void;
}

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
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.subcategories.some((sub) => sub.toLowerCase().includes(q))
    );
  }, [activeTab, productCats, serviceCats, searchQuery]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Clean Header Bar */}
      <View style={[styles.headerBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn} accessibilityLabel="Go back">
            <Text style={[styles.backArrow, { color: colors.primary }]}>←</Text>
          </Pressable>
        )}
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontSize: 17 * fontMultiplier }]}>
          Browse Directory
        </Text>
      </View>

      {/* Search + Underline Tabs */}
      <View style={[styles.controlsBlock, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Filter product or service categories..."
        />

        <View style={styles.tabsRow}>
          {(['Products', 'Services'] as const).map((tab) => {
            const active = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabBtn, active && { borderBottomColor: colors.primary }]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    { color: active ? colors.primary : colors.textSecondary },
                    active && styles.tabLabelActive,
                  ]}
                >
                  {tab} ({tab === 'Products' ? productCats.length : serviceCats.length})
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Crisp Editorial Directory List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {displayedList.map((cat) => {
          const liveSubCount =
            cat.type === 'PRODUCT'
              ? OFFICIAL_GEM_SUBCATEGORIES.filter(
                  (s) => s.category.toLowerCase() === cat.name.toLowerCase()
                ).length
              : cat.subcategories.length;

          return (
            <Pressable
              key={cat.id}
              style={({ pressed }) => [
                styles.directoryRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => onSelectCategory(cat)}
            >
              <View style={[styles.codeBox, { backgroundColor: colors.primaryTint, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.codeText, { color: colors.primary }]}>{cat.shortCode || cat.icon}</Text>
              </View>

              <View style={styles.infoCol}>
                <View style={styles.titleRow}>
                  <Text style={[styles.categoryName, { color: colors.textPrimary, fontSize: 14 * fontMultiplier }]}>
                    {cat.name}
                  </Text>
                  <Text style={[styles.metaCount, { color: colors.textMuted }]}>
                    {liveSubCount} {cat.type === 'PRODUCT' ? 'live feeds' : 'domains'}
                  </Text>
                </View>
                <Text style={[styles.subText, { color: colors.textSecondary }]} numberOfLines={2}>
                  {cat.subcategories.join(' · ')}
                </Text>
              </View>

              <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
            </Pressable>
          );
        })}

        {displayedList.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No categories found for &quot;{searchQuery}&quot;
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: 10, padding: 4 },
  backArrow: { fontSize: 20, fontWeight: '700' },
  headerTitle: { fontWeight: '800' },
  controlsBlock: {
    paddingHorizontal: 14,
    paddingTop: 12,
    borderBottomWidth: 1,
  },
  tabsRow: { flexDirection: 'row', marginTop: 8 },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  tabLabelActive: { fontWeight: '800' },
  listContainer: { flex: 1 },
  listContent: { padding: 14, paddingBottom: 32 },
  directoryRow: {
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 9,
    gap: 12,
  },
  codeBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  infoCol: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
    gap: 8,
  },
  categoryName: { fontWeight: '800', flex: 1 },
  metaCount: { fontSize: 10.5, fontWeight: '600' },
  subText: { fontSize: 11.5, lineHeight: 16 },
  chevron: { fontSize: 18, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 44 },
  emptyText: { fontSize: 13 },
});
