/**
 * GeM Marketplace Screen - NotebookLM-Inspired Procurement Catalog
 * Conforms to Screen 2 of the GeM Mobile UI Specification:
 * - SearchField with clean icon & clear button
 * - SegmentedTabs (All, Products, Services)
 * - Compact horizontal filter chips & Filter Bottom Sheet
 * - 2-Column Popular Categories Grid
 * - Clean Catalog Product Cards with INR formatting, ratings, OEM brands, and dual actions
 * - Collapsible GFR 149 procurement calculator
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  ScrollView,
  Alert,
  Linking,
  Pressable,
} from 'react-native';
import {
  MarketplaceService,
  MarketplaceItem,
  OFFICIAL_PRODUCT_CATEGORIES,
} from '../services/MarketplaceService';
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import {
  SearchField,
  SegmentedTabs,
  CompactChip,
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
  FilterBottomSheetModal,
  SectionHeader,
} from '../components/SharedUI';
import { formatInr } from '../utils/formatters';

const POPULAR_2COL_CATEGORIES = [
  { id: 'it-products', name: 'Computers & IT', icon: '💻', count: '1,420 items', tint: '#E8F1FF' },
  { id: 'medical', name: 'Medical Supplies', icon: '🩺', count: '890 items', tint: '#E7F8EE' },
  { id: 'office-furniture', name: 'Office Furniture', icon: '🪑', count: '640 items', tint: '#FFF4DB' },
  { id: 'automobiles', name: 'Electric Vehicles', icon: '🚙', count: '310 items', tint: '#F0EAFE' },
];

export const MarketplaceScreen: React.FC = () => {
  const { colors, fontMultiplier } = useTheme();

  const [activeTypeTab, setActiveTypeTab] = useState<'All' | 'Products' | 'Services'>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(new Set());
  const [comparedItemIds, setComparedItemIds] = useState<Set<string>>(new Set());

  // Filter bottom sheet state
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [filterBrand, setFilterBrand] = useState<string>('ALL');

  // GFR 149 Accordion state
  const [isGfrExpanded, setIsGfrExpanded] = useState<boolean>(false);
  const [gfrOrderValue, setGfrOrderValue] = useState<number>(45000);

  // Map active tab to service type
  const serviceType = useMemo(() => {
    if (activeTypeTab === 'Products') return 'PRODUCT';
    if (activeTypeTab === 'Services') return 'SERVICE';
    return 'ALL';
  }, [activeTypeTab]);

  // Query catalog
  const filteredItems = useMemo(() => {
    let items = MarketplaceService.getItems({
      type: serviceType,
      category: selectedCategory,
      query: searchQuery,
    });
    if (filterBrand !== 'ALL') {
      items = items.filter((it) => it.oemBrand.toLowerCase().includes(filterBrand.toLowerCase()));
    }
    return items;
  }, [serviceType, selectedCategory, searchQuery, filterBrand]);

  const handleOpenGemPortal = useCallback((item?: MarketplaceItem) => {
    const targetUrl = item
      ? `https://mkp.gem.gov.in/search?q=${encodeURIComponent(item.title)}`
      : 'https://mkp.gem.gov.in';
    Linking.openURL(targetUrl).catch(() => {
      Alert.alert('GeM Portal', `Visit ${targetUrl} in your browser.`);
    });
  }, []);

  const toggleSaveItem = (id: string) => {
    setSavedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCompareItem = (id: string) => {
    setComparedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 3) {
          Alert.alert('Comparison Limit', 'You can compare up to 3 items at a time.');
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const gfrResult = useMemo(() => {
    return MarketplaceService.evaluateGfrProcurementMode(gfrOrderValue);
  }, [gfrOrderValue]);

  // Header Component for FlatList
  const renderListHeader = () => (
    <View style={styles.headerWrapper}>
      {/* Search Input */}
      <SearchField
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search products, e.g. laptop, gloves..."
        style={{ marginBottom: 12 }}
      />

      {/* Segmented Tabs: All | Products | Services */}
      <SegmentedTabs
        options={['All', 'Products', 'Services']}
        selected={activeTypeTab}
        onSelect={(tab) => setActiveTypeTab(tab as 'All' | 'Products' | 'Services')}
        style={{ marginBottom: 12 }}
      />

      {/* Horizontal Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterChipScroll}
        contentContainerStyle={styles.filterChipRow}
      >
        <CompactChip
          label="Filters"
          icon="⚙️"
          selected={showFilterModal || filterBrand !== 'ALL'}
          onPress={() => setShowFilterModal(true)}
        />
        <CompactChip
          label="All"
          selected={selectedCategory === 'All Categories'}
          onPress={() => setSelectedCategory('All Categories')}
        />
        {OFFICIAL_PRODUCT_CATEGORIES.slice(0, 5).map((cat) => (
          <CompactChip
            key={cat.id}
            label={cat.name}
            selected={selectedCategory === cat.name}
            onPress={() => setSelectedCategory(selectedCategory === cat.name ? 'All Categories' : cat.name)}
          />
        ))}
      </ScrollView>

      {/* 2-Column Popular Categories Grid */}
      <View style={styles.gridSection}>
        <SectionHeader title="Popular categories" />
        <View style={styles.catGrid}>
          {POPULAR_2COL_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              style={[
                styles.catGridCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: selectedCategory === cat.name ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                const target = OFFICIAL_PRODUCT_CATEGORIES.find((c) => c.id === cat.id);
                setSelectedCategory(target ? target.name : cat.name);
              }}
            >
              <View style={[styles.catIconSquare, { backgroundColor: cat.tint }]}>
                <Text style={styles.catIconEmoji}>{cat.icon}</Text>
              </View>
              <View style={styles.catGridInfo}>
                <Text style={[styles.catGridTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {cat.name}
                </Text>
                <Text style={[styles.catGridCount, { color: colors.textMuted }]}>{cat.count}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* GFR 149 Procurement Mode Accordion */}
      <View
        style={[
          styles.gfrAccordion,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Pressable
          style={styles.gfrHeaderPressable}
          onPress={() => setIsGfrExpanded((prev) => !prev)}
        >
          <View style={styles.gfrHeaderTitleRow}>
            <Text style={styles.gfrBadgeIcon}>⚖️</Text>
            <Text style={[styles.gfrTitleText, { color: colors.textPrimary }]}>
              GFR 149 Procurement Mode Guide
            </Text>
          </View>
          <Text style={[styles.gfrChevron, { color: colors.textSecondary }]}>
            {isGfrExpanded ? '▲' : '▼'}
          </Text>
        </Pressable>

        {isGfrExpanded && (
          <View style={[styles.gfrContent, { borderTopColor: colors.borderSubtle }]}>
            <Text style={[styles.gfrDesc, { color: colors.textSecondary }]}>
              Indian General Financial Rules (GFR Rule 149) govern mandatory public procurement thresholds:
            </Text>
            <View style={styles.gfrPillRow}>
              {[25000, 150000, 750000].map((v) => (
                <CompactChip
                  key={v}
                  label={formatInr(v)}
                  selected={gfrOrderValue === v}
                  onPress={() => setGfrOrderValue(v)}
                />
              ))}
            </View>
            <View style={[styles.gfrResultCard, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.gfrModeTag, { color: colors.primary }]}>{gfrResult.mode}</Text>
              <Text style={[styles.gfrRuleName, { color: colors.textPrimary }]}>{gfrResult.ruleName}</Text>
              <Text style={[styles.gfrRuleExplanation, { color: colors.textSecondary }]}>
                {gfrResult.explanation}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Results Title Row */}
      <SectionHeader
        title={`Catalog Results (${filteredItems.length})`}
        style={{ marginTop: 8 }}
      />
    </View>
  );

  // Render individual product card
  const renderProductCard = ({ item }: { item: MarketplaceItem }) => {
    const isSaved = savedItemIds.has(item.id);
    const isCompared = comparedItemIds.has(item.id);
    const specs = Object.entries(item.specSummary || {}).slice(0, 2);

    return (
      <View
        style={[
          styles.productCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.productTopRow}>
          {/* Thumbnail placeholder */}
          <View style={[styles.thumbnailBox, { backgroundColor: colors.surfaceSubtle }]}>
            <Text style={styles.thumbnailEmoji}>
              {item.type === 'SERVICE' ? '🛠️' : '📦'}
            </Text>
          </View>

          {/* Product main meta */}
          <View style={styles.productMetaCol}>
            <View style={styles.badgeRow}>
              <StatusBadge
                label={item.type === 'SERVICE' ? 'SERVICE' : 'PRODUCT'}
                tone={item.type === 'SERVICE' ? 'violet' : 'neutral'}
              />
              <Text style={[styles.brandText, { color: colors.textSecondary }]}>{item.oemBrand}</Text>
              {item.msePreference && (
                <StatusBadge label="MSE" tone="success" style={{ marginLeft: 4 }} />
              )}
            </View>

            <Text
              style={[styles.productTitle, { color: colors.textPrimary, fontSize: 14 * fontMultiplier }]}
              numberOfLines={2}
            >
              {item.title}
            </Text>

            <View style={styles.priceRow}>
              <Text style={[styles.priceInr, { color: colors.primary, fontSize: 16 * fontMultiplier }]}>
                {formatInr(item.l1PriceInr)}
              </Text>
              <Text style={[styles.priceUnit, { color: colors.textMuted }]}>/ {item.priceUnit}</Text>
              <View style={styles.ratingBadge}>
                <Text style={styles.starIcon}>★</Text>
                <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Specifications snippet */}
        {specs.length > 0 && (
          <View style={[styles.specsRow, { backgroundColor: colors.surfaceSubtle }]}>
            {specs.map(([k, v]) => (
              <Text key={k} style={[styles.specText, { color: colors.textSecondary }]} numberOfLines={1}>
                <Text style={{ fontWeight: '600' }}>{k}:</Text> {v}
              </Text>
            ))}
          </View>
        )}

        {/* Action Buttons: Primary View Details + Secondary Actions */}
        <View style={styles.actionRow}>
          <SecondaryButton
            label={isSaved ? 'Saved ✓' : 'Save'}
            icon="🔖"
            onPress={() => toggleSaveItem(item.id)}
            style={{ flex: 1, marginRight: 6 }}
          />
          <SecondaryButton
            label={isCompared ? 'Comparing' : 'Compare'}
            icon="⚖️"
            onPress={() => toggleCompareItem(item.id)}
            style={{ flex: 1, marginRight: 6 }}
          />
          <PrimaryButton
            label="View details"
            onPress={() => setSelectedItem(item)}
            style={{ flex: 1.4 }}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderProductCard}
        ListHeaderComponent={renderListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyEmoji]}>🔍</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No matching items found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Try clearing search terms or selecting &quot;All Categories&quot;.
            </Text>
            <SecondaryButton
              label="Reset Filters"
              onPress={() => {
                setSearchQuery('');
                setSelectedCategory('All Categories');
                setFilterBrand('ALL');
              }}
              style={{ marginTop: 16 }}
            />
          </View>
        }
      />

      {/* Filter Bottom Sheet Modal */}
      <FilterBottomSheetModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Refine Catalog"
        onReset={() => {
          setSelectedCategory('All Categories');
          setFilterBrand('ALL');
        }}
        onApply={() => {}}
      >
        <Text style={[styles.sheetSectionTitle, { color: colors.textPrimary }]}>Brand / OEM</Text>
        <View style={styles.sheetPillWrap}>
          {['ALL', 'Dell', 'HP', 'Lenovo', 'Godrej', 'Tata', 'Ambuja'].map((b) => (
            <CompactChip
              key={b}
              label={b}
              selected={filterBrand === b}
              onPress={() => setFilterBrand(b)}
              style={{ marginBottom: 8 }}
            />
          ))}
        </View>

        <Text style={[styles.sheetSectionTitle, { color: colors.textPrimary, marginTop: 14 }]}>
          Categories
        </Text>
        <View style={styles.sheetPillWrap}>
          <CompactChip
            label="All Categories"
            selected={selectedCategory === 'All Categories'}
            onPress={() => setSelectedCategory('All Categories')}
            style={{ marginBottom: 8 }}
          />
          {OFFICIAL_PRODUCT_CATEGORIES.map((cat) => (
            <CompactChip
              key={cat.id}
              label={cat.name}
              selected={selectedCategory === cat.name}
              onPress={() => setSelectedCategory(cat.name)}
              style={{ marginBottom: 8 }}
            />
          ))}
        </View>
      </FilterBottomSheetModal>

      {/* Product Detail Modal */}
      {selectedItem && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setSelectedItem(null)}>
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setSelectedItem(null)} />
            <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{selectedItem.title}</Text>
                <Pressable onPress={() => setSelectedItem(null)} hitSlop={10}>
                  <Text style={[styles.modalCloseText, { color: colors.textMuted }]}>✕</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.modalPriceBox}>
                  <Text style={[styles.modalPrice, { color: colors.primary }]}>
                    {formatInr(selectedItem.l1PriceInr)}
                  </Text>
                  <Text style={[styles.modalUnit, { color: colors.textSecondary }]}>
                    per {selectedItem.priceUnit} (Min Order: {selectedItem.minOrderQty})
                  </Text>
                </View>

                <Text style={[styles.modalSecHeader, { color: colors.textPrimary }]}>Technical Specifications</Text>
                {Object.entries(selectedItem.specSummary || {}).map(([key, val]) => (
                  <View key={key} style={[styles.specRowDetail, { borderBottomColor: colors.borderSubtle }]}>
                    <Text style={[styles.specKey, { color: colors.textSecondary }]}>{key}</Text>
                    <Text style={[styles.specVal, { color: colors.textPrimary }]}>{val}</Text>
                  </View>
                ))}

                <View style={{ marginTop: 16 }}>
                  <Text style={[styles.modalSecHeader, { color: colors.textPrimary }]}>Procurement Compliance</Text>
                  <Text style={[styles.complianceText, { color: colors.textSecondary }]}>
                    • Make in India Local Content: {selectedItem.makeInIndiaPercent}%
                  </Text>
                  <Text style={[styles.complianceText, { color: colors.textSecondary }]}>
                    • MSE Purchase Preference: {selectedItem.msePreference ? 'Eligible' : 'Standard'}
                  </Text>
                </View>
              </ScrollView>

              <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                <SecondaryButton
                  label="Close"
                  onPress={() => setSelectedItem(null)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <PrimaryButton
                  label="Open Official Portal ↗"
                  onPress={() => handleOpenGemPortal(selectedItem)}
                  style={{ flex: 1.5 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: DESIGN_TOKENS.pagePaddingMobile,
    paddingBottom: 40,
  },
  headerWrapper: {
    marginBottom: 8,
  },
  filterChipScroll: {
    marginBottom: 16,
  },
  filterChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridSection: {
    marginBottom: 16,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  catGridCard: {
    width: '48%',
    borderRadius: 12,
    borderWidth: DESIGN_TOKENS.borderWidth,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  catIconSquare: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  catIconEmoji: {
    fontSize: 16,
  },
  catGridInfo: {
    flex: 1,
  },
  catGridTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  catGridCount: {
    fontSize: 10,
    marginTop: 2,
  },
  gfrAccordion: {
    borderRadius: 12,
    borderWidth: DESIGN_TOKENS.borderWidth,
    marginBottom: 16,
    overflow: 'hidden',
  },
  gfrHeaderPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  gfrHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gfrBadgeIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  gfrTitleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  gfrChevron: {
    fontSize: 11,
  },
  gfrContent: {
    borderTopWidth: 1,
    padding: 12,
  },
  gfrDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  gfrPillRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  gfrResultCard: {
    borderRadius: 8,
    padding: 10,
  },
  gfrModeTag: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  gfrRuleName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  gfrRuleExplanation: {
    fontSize: 11,
    lineHeight: 15,
  },
  productCard: {
    borderRadius: DESIGN_TOKENS.cardRadius,
    borderWidth: DESIGN_TOKENS.borderWidth,
    padding: 14,
    marginBottom: 12,
  },
  productTopRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  thumbnailBox: {
    width: 60,
    height: 60,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  thumbnailEmoji: {
    fontSize: 26,
  },
  productMetaCol: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  brandText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },
  productTitle: {
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInr: {
    fontWeight: '700',
  },
  priceUnit: {
    fontSize: 11,
    marginLeft: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  starIcon: {
    fontSize: 10,
    color: '#D97706',
    marginRight: 2,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  specsRow: {
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  specText: {
    fontSize: 11,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 260,
  },
  sheetSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  sheetPillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalBody: {
    paddingHorizontal: 16,
  },
  modalPriceBox: {
    marginBottom: 14,
  },
  modalPrice: {
    fontSize: 22,
    fontWeight: '700',
  },
  modalUnit: {
    fontSize: 12,
    marginTop: 2,
  },
  modalSecHeader: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  specRowDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  specKey: {
    fontSize: 12,
  },
  specVal: {
    fontSize: 12,
    fontWeight: '600',
  },
  complianceText: {
    fontSize: 12,
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
