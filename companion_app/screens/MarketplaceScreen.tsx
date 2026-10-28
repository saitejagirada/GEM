/**
 * GeM Marketplace Screen - High-Performance Public Discovery Catalog
 * Replicates the official Government e-Marketplace catalog (mkp.gem.gov.in):
 * - 9 Popular Product Categories (IT, Autos, Furniture, Medical, Electrical, Stationery, etc.)
 * - Trending & Emerging Services (Security, Cabs, Manpower, Cloud, Drones)
 * - GeM Outlet Stores (Saras Ajeevika, ODOP, Startup Runway, Womaniya)
 * - GFR 149 Procurement Mode Calculator
 * - Virtualized FlatList for 60+ FPS zero-lag browsing
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  SafeAreaView,
  Alert,
  Linking,
  Pressable,
} from 'react-native';
import {
  MarketplaceService,
  MarketplaceItem,
  OFFICIAL_PRODUCT_CATEGORIES,
  OFFICIAL_SERVICE_CATEGORIES,
  OFFICIAL_OUTLET_STORES,
} from '../services/MarketplaceService';
import { TouchButton } from '../components/TouchButton';
import { BrowseMegaMenuModal } from '../components/BrowseMegaMenuModal';
import { useTheme } from '../theme/ThemeContext';
import { formatInr } from '../utils/formatters';

export const MarketplaceScreen: React.FC = () => {
  const { colors, fontMultiplier, isDark } = useTheme();

  const [activeType, setActiveType] = useState<'ALL' | 'PRODUCT' | 'SERVICE'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [selectedOutlet, setSelectedOutlet] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [showMegaMenu, setShowMegaMenu] = useState<boolean>(false);

  // GFR 149 Mode Calculator state
  const [isGfrExpanded, setIsGfrExpanded] = useState<boolean>(false);
  const [gfrCalculatorValue, setGfrCalculatorValue] = useState<string>('');
  const [gfrResult, setGfrResult] = useState<ReturnType<typeof MarketplaceService.evaluateGfrProcurementMode> | null>(null);

  // Filter items
  const filteredItems = useMemo(() => {
    return MarketplaceService.getItems({
      type: activeType,
      category: selectedCategory,
      outletStore: selectedOutlet,
      query: searchQuery,
    });
  }, [activeType, selectedCategory, selectedOutlet, searchQuery]);

  const handleCalculateGfr = useCallback(() => {
    const val = parseInt(gfrCalculatorValue.replace(/[^0-9]/g, ''), 10);
    if (!val || isNaN(val)) {
      Alert.alert('Enter Order Value', 'Please enter a valid INR order value (e.g., 45000)');
      return;
    }
    setGfrResult(MarketplaceService.evaluateGfrProcurementMode(val));
  }, [gfrCalculatorValue]);

  const handleOpenGemPortal = useCallback((item?: MarketplaceItem) => {
    const targetUrl = item
      ? `https://mkp.gem.gov.in/search?q=${encodeURIComponent(item.title)}`
      : 'https://mkp.gem.gov.in';
    Linking.openURL(targetUrl).catch(() => {
      Alert.alert('GeM Portal', `Visit ${targetUrl} in your browser.`);
    });
  }, []);

  // Fast Memoized Render Item
  const renderItem = useCallback(
    ({ item }: { item: MarketplaceItem }) => {
      const isService = item.type === 'SERVICE';
      return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Top row: Category Badge & Outlet Badge */}
          <View style={styles.cardHeader}>
            <View style={[styles.categoryBadge, { backgroundColor: isService ? '#E0F2FE' : '#EDE9FE' }]}>
              <Text style={[styles.categoryBadgeText, { color: isService ? '#0369A1' : '#6D28D9' }]}>
                {isService ? '🛠️ SERVICE' : '📦 PRODUCT'} • {item.category}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {item.isAvailableOnGeM ? (
                <View style={[styles.outletBadge, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.outletBadgeText, { color: '#15803D' }]}>🟢 ACTIVE ON GeM</Text>
                </View>
              ) : (
                <View style={[styles.outletBadge, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={[styles.outletBadgeText, { color: '#B91C1C' }]}>🚫 DELISTED</Text>
                </View>
              )}
              {item.outletStore ? (
                <View style={styles.outletBadge}>
                  <Text style={styles.outletBadgeText}>🏛️ {item.outletStore.toUpperCase()}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Title */}
          <Text
            style={[styles.itemTitle, { color: colors.textPrimary, fontSize: 14 * fontMultiplier }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          {/* OEM / Brand */}
          <Text style={[styles.oemText, { color: colors.textMuted }]}>
            OEM / Brand: <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{item.oemBrand}</Text>
          </Text>

          {/* L1 Price & Rating Banner */}
          <View style={[styles.priceBox, { backgroundColor: isDark ? colors.surfaceSubtle : '#F0FDF4' }]}>
            <View>
              <Text style={[styles.l1Label, { color: '#15803D' }]}>L1 BENCHMARK PRICE</Text>
              <Text style={[styles.l1Price, { color: colors.emerald, fontSize: 17 * fontMultiplier }]}>
                ₹{formatInr(item.l1PriceInr)}
                <Text style={[styles.priceUnit, { color: colors.textMuted }]}> {item.priceUnit}</Text>
              </Text>
            </View>
            <View style={styles.ordersBadge}>
              <Text style={styles.ordersBadgeText}>★ {item.rating} ({formatInr(item.totalOrders)} orders)</Text>
            </View>
          </View>

          {/* Quick Specifications */}
          <View style={[styles.specGrid, { backgroundColor: isDark ? colors.surfaceSubtle : '#F8FAFC' }]}>
            {Object.entries(item.specSummary).slice(0, 3).map(([key, val]) => (
              <View key={key} style={styles.specRow}>
                <Text style={[styles.specKey, { color: colors.textMuted }]}>{key}:</Text>
                <Text style={[styles.specVal, { color: colors.textPrimary }]} numberOfLines={1}>
                  {val}
                </Text>
              </View>
            ))}
          </View>

          {/* Actions: View Specifications & Open on GeM */}
          <View style={styles.cardActions}>
            <TouchButton
              title="Specifications"
              variant="outline"
              size="small"
              icon="📋"
              onPress={() => setSelectedItem(item)}
              style={{ flex: 1 }}
            />
            <TouchButton
              title="View on GeM"
              variant="primary"
              size="small"
              icon="🌐"
              onPress={() => handleOpenGemPortal(item)}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      );
    },
    [colors, fontMultiplier, isDark, handleOpenGemPortal]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Search & Filter Bar */}
      <View style={[styles.searchSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.searchRow}>
          {/* Official GeM BROWSE Mega-Menu Button matching mkp.gem.gov.in */}
          <TouchButton
            title="BROWSE"
            icon="☰"
            variant="primary"
            size="small"
            onPress={() => setShowMegaMenu(true)}
            style={styles.browseBtn}
            textStyle={{ fontWeight: '900', fontSize: 11 }}
          />

          <View style={[styles.searchInputWrapper, { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search 10,000+ GeM products, services..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchButton
                title="✕"
                variant="ghost"
                size="small"
                onPress={() => setSearchQuery('')}
                hitSlopPadding={4}
              />
            )}
          </View>
        </View>

        {/* Zero-Login Public Discovery Ribbon */}
        <View style={styles.publicNoticeBanner}>
          <Text style={styles.publicNoticeText}>
            🛡️ Public Discovery Mode: 10,917+ catalog items & benchmarks freely accessible
          </Text>
        </View>

        {/* Type Segments: All | Products | Services */}
        <View style={styles.typeRow}>
          {(['ALL', 'PRODUCT', 'SERVICE'] as const).map((t) => (
            <TouchButton
              key={t}
              title={t === 'ALL' ? 'All (10,917+)' : t === 'PRODUCT' ? '📦 Products' : '🛠️ Services'}
              variant={activeType === t ? 'primary' : 'secondary'}
              size="small"
              onPress={() => {
                setActiveType(t);
                setSelectedCategory('All Categories');
              }}
              style={styles.typeBtn}
            />
          ))}
        </View>
      </View>

      {/* Horizontal Category Chips */}
      <View style={styles.categoriesSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          <TouchButton
            title="All Categories"
            variant={selectedCategory === 'All Categories' ? 'saffron' : 'secondary'}
            size="small"
            onPress={() => setSelectedCategory('All Categories')}
            style={styles.chip}
          />
          {(activeType === 'SERVICE' ? OFFICIAL_SERVICE_CATEGORIES : OFFICIAL_PRODUCT_CATEGORIES).map((c) => (
            <TouchButton
              key={c.id}
              title={`${c.icon} ${c.name}`}
              variant={selectedCategory === c.name ? 'saffron' : 'secondary'}
              size="small"
              onPress={() => setSelectedCategory(c.name)}
              style={styles.chip}
            />
          ))}
        </ScrollView>
      </View>

      {/* Outlet Stores Ribbon */}
      <View style={styles.outletsSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.outletScroll}>
          <TouchButton
            title="All Outlets"
            variant={selectedOutlet === 'ALL' ? 'emerald' : 'secondary'}
            size="small"
            onPress={() => setSelectedOutlet('ALL')}
            style={styles.outletChip}
          />
          {OFFICIAL_OUTLET_STORES.map((o) => (
            <TouchButton
              key={o.id}
              title={`${o.name} (${o.badge})`}
              variant={selectedOutlet === o.id ? 'emerald' : 'secondary'}
              size="small"
              onPress={() => setSelectedOutlet(o.id)}
              style={styles.outletChip}
            />
          ))}
        </ScrollView>
      </View>

      {/* Collapsible GFR 149 Rule Fast Calculator */}
      <View style={[styles.gfrBanner, { backgroundColor: isDark ? colors.surfaceSubtle : '#EFF6FF', borderColor: '#BFDBFE' }]}>
        <Pressable
          style={styles.gfrHeaderRow}
          onPress={() => setIsGfrExpanded(!isGfrExpanded)}
          hitSlop={8}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.gfrTitle, { color: '#1E40AF' }]}>⚖️ GFR 149 Procurement Rule Checker {isGfrExpanded ? '▴' : '▾'}</Text>
            <Text style={styles.gfrSub}>Check if Direct Purchase or Bidding applies</Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#2563EB' }}>
            {isGfrExpanded ? 'Hide' : 'Calculate'}
          </Text>
        </Pressable>
        {isGfrExpanded && (
          <>
            <View style={styles.gfrInputRow}>
              <TextInput
                style={[styles.gfrInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="Order Value ₹ (e.g. 75000)"
                placeholderTextColor={colors.textMuted}
                value={gfrCalculatorValue}
                onChangeText={setGfrCalculatorValue}
                keyboardType="numeric"
              />
              <TouchButton
                title="Check GFR Mode"
                variant="primary"
                size="small"
                onPress={handleCalculateGfr}
              />
            </View>
            {gfrResult ? (
              <View style={styles.gfrResultCard}>
                <Text style={styles.gfrResultMode}>Mode: {gfrResult.description}</Text>
                <Text style={styles.gfrResultReq}>{gfrResult.mandatoryRequirement}</Text>
              </View>
            ) : null}
          </>
        )}
      </View>

      {/* Virtualized Products & Services FlatList */}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(i) => i.id}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={true}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={[styles.listHeaderCount, { color: colors.textMuted }]}>
              Showing {filteredItems.length} Verified GeM Catalog Items
            </Text>
          </View>
        }
      />

      {/* Item Specification Modal */}
      {selectedItem ? (
        <Modal visible={!!selectedItem} animationType="slide" onRequestClose={() => setSelectedItem(null)}>
          <SafeAreaView style={[styles.modalSafeArea, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { backgroundColor: colors.primary }]}>
              <TouchButton
                title="✕ Close"
                variant="ghost"
                size="small"
                onPress={() => setSelectedItem(null)}
                textStyle={{ color: '#FFFFFF', fontWeight: '800' }}
              />
              <Text style={styles.modalTitle}>GeM Catalog Specification</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={[styles.modalItemTitle, { color: colors.textPrimary }]}>{selectedItem.title}</Text>
              <Text style={[styles.modalItemCat, { color: colors.textMuted }]}>{selectedItem.category} • {selectedItem.oemBrand}</Text>

              <View style={[styles.modalPriceCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalL1, { color: colors.emerald }]}>
                  L1 Benchmark: ₹{formatInr(selectedItem.l1PriceInr)} {selectedItem.priceUnit}
                </Text>
                <Text style={[styles.modalMii, { color: colors.textSecondary }]}>
                  🇮🇳 Make In India Content: {selectedItem.makeInIndiaPercent}%
                </Text>
                <Text style={[styles.modalMse, { color: '#0369A1' }]}>
                  🛡️ MSME Preference: {selectedItem.msePreference ? 'Eligible (L1 + 15%)' : 'Standard'}
                </Text>
              </View>

              <Text style={[styles.specHeader, { color: colors.textPrimary }]}>Technical Parameters (GeM Verified)</Text>
              {Object.entries(selectedItem.specSummary).map(([k, v]) => (
                <View key={k} style={[styles.modalSpecRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalSpecKey, { color: colors.textMuted }]}>{k}</Text>
                  <Text style={[styles.modalSpecVal, { color: colors.textPrimary }]}>{v}</Text>
                </View>
              ))}

              <View style={{ marginTop: 24 }}>
                <TouchButton
                  title="View on Official GeM Portal ➔"
                  variant="primary"
                  size="large"
                  onPress={() => handleOpenGemPortal(selectedItem)}
                />
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      ) : null}

      {/* BROWSE Mega-Menu Modal */}
      <BrowseMegaMenuModal
        visible={showMegaMenu}
        onClose={() => setShowMegaMenu(false)}
        onSelectCategory={(cat, sub) => {
          setSelectedCategory(cat);
          if (sub) setSearchQuery(sub);
        }}
        onSelectOutlet={(outlet) => {
          setSelectedOutlet(outlet);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchSection: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  browseBtn: { paddingHorizontal: 10, minHeight: 42 },
  publicNoticeBanner: {
    backgroundColor: 'rgba(11, 59, 96, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
  },
  publicNoticeText: { color: '#0B3B60', fontSize: 10.5, fontWeight: '700', textAlign: 'center' },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 42,
  },
  searchIcon: { fontSize: 16, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '600', paddingVertical: 4 },
  typeRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  typeBtn: { flex: 1 },
  categoriesSection: { paddingVertical: 6 },
  chipScroll: { paddingHorizontal: 12, gap: 6 },
  chip: { marginRight: 6 },
  outletsSection: { paddingBottom: 6 },
  outletScroll: { paddingHorizontal: 12, gap: 6 },
  outletChip: { marginRight: 6 },
  gfrBanner: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  gfrHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  gfrTitle: { fontSize: 12, fontWeight: '800' },
  gfrSub: { fontSize: 10, color: '#3B82F6', marginTop: 1 },
  gfrInputRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 8 },
  gfrInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  gfrResultCard: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  gfrResultMode: { color: '#1E40AF', fontSize: 11, fontWeight: '800' },
  gfrResultReq: { color: '#334155', fontSize: 10, marginTop: 2, lineHeight: 14 },
  listContent: { paddingHorizontal: 12, paddingBottom: 40 },
  listHeader: { paddingVertical: 6 },
  listHeaderCount: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  categoryBadgeText: { fontSize: 9.5, fontWeight: '800' },
  outletBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  outletBadgeText: { color: '#92400E', fontSize: 9, fontWeight: '800' },
  itemTitle: { fontWeight: '800', lineHeight: 19, marginBottom: 4 },
  oemText: { fontSize: 11, marginBottom: 8 },
  priceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  l1Label: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  l1Price: { fontWeight: '900' },
  priceUnit: { fontSize: 11, fontWeight: '500' },
  ordersBadge: { backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 },
  ordersBadgeText: { fontSize: 10, fontWeight: '700', color: '#334155' },
  specGrid: { padding: 8, borderRadius: 8, marginBottom: 10, gap: 4 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between' },
  specKey: { fontSize: 10.5, fontWeight: '600' },
  specVal: { fontSize: 10.5, fontWeight: '700', maxWidth: '65%' },
  cardActions: { flexDirection: 'row', gap: 8 },
  modalSafeArea: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  modalBody: { padding: 16 },
  modalItemTitle: { fontSize: 18, fontWeight: '900', lineHeight: 24, marginBottom: 4 },
  modalItemCat: { fontSize: 12, marginBottom: 14 },
  modalPriceCard: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalL1: { fontSize: 16, fontWeight: '900' },
  modalMii: { fontSize: 12, fontWeight: '700' },
  modalMse: { fontSize: 12, fontWeight: '700' },
  specHeader: { fontSize: 14, fontWeight: '800', marginBottom: 10 },
  modalSpecRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  modalSpecKey: { fontSize: 12, fontWeight: '600' },
  modalSpecVal: { fontSize: 12, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },
});
