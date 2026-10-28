/**
 * GeM Marketplace Screen - Instamart & Blinkit Style High-Velocity Procurement Catalog
 * Conforms to GeM Mobile Specification with Quick-Commerce UX:
 * - High-resolution product cards with real images and fallback thumbnails
 * - Blinkit/Instamart style discount chips (-25% OFF), delivery ETAs, and unit text
 * - Instant ADD + button transforming into interactive quantity stepper [ - qty + ]
 * - Floating Bottom Cart / Direct Procure Bar showing total items and procurement price
 * - GFR 149 Direct Purchase & L1 comparison compliance evaluation
 * - Full Android hardware BackHandler integration preventing premature app exit
 * - Zero touch delay (delayPressIn={0}) for lightning-fast responsive controls
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  Image,
  BackHandler,
  RefreshControl,
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

  // Quick commerce Cart state (Instamart / Blinkit)
  const [cart, setCart] = useState<Record<string, number>>({});
  const [showCartModal, setShowCartModal] = useState<boolean>(false);
  const [orderPlacedRef, setOrderPlacedRef] = useState<string | null>(null);

  // Filter bottom sheet state
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [filterBrand, setFilterBrand] = useState<string>('ALL');

  // GFR 149 Accordion state
  const [isGfrExpanded, setIsGfrExpanded] = useState<boolean>(false);
  const [gfrOrderValue, setGfrOrderValue] = useState<number>(45000);

  // Android hardware back handler to close modals and cart sheet without exiting
  useEffect(() => {
    const onBackPress = () => {
      if (orderPlacedRef) {
        setOrderPlacedRef(null);
        return true;
      }
      if (showCartModal) {
        setShowCartModal(false);
        return true;
      }
      if (selectedItem) {
        setSelectedItem(null);
        return true;
      }
      if (showFilterModal) {
        setShowFilterModal(false);
        return true;
      }
      return false; // let parent/App handle
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [orderPlacedRef, showCartModal, selectedItem, showFilterModal]);

  // Dynamic live products state
  const [itemsList, setItemsList] = useState<MarketplaceItem[]>(MarketplaceService.getItems());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Map active tab to service type
  const serviceType = useMemo(() => {
    if (activeTypeTab === 'Products') return 'PRODUCT';
    if (activeTypeTab === 'Services') return 'SERVICE';
    return 'ALL';
  }, [activeTypeTab]);

  const loadLiveProducts = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const live = await MarketplaceService.fetchLiveProducts({
        type: serviceType,
        category: selectedCategory,
        query: searchQuery,
      });
      if (live && live.length > 0) {
        setItemsList(live);
      }
    } catch {
      // offline fallback retained
    } finally {
      setIsRefreshing(false);
    }
  }, [serviceType, selectedCategory, searchQuery]);

  useEffect(() => {
    loadLiveProducts();
  }, [loadLiveProducts]);

  // Query catalog from live list
  const filteredItems = useMemo(() => {
    let items = itemsList.filter((item) => {
      if (serviceType !== 'ALL' && item.type !== serviceType) return false;
      if (selectedCategory !== 'All Categories' && item.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesCat = item.category.toLowerCase().includes(q);
        const matchesBrand = item.oemBrand.toLowerCase().includes(q);
        const matchesSpecs = Object.values(item.specSummary || {}).some((v) => v.toLowerCase().includes(q));
        if (!matchesTitle && !matchesCat && !matchesBrand && !matchesSpecs) return false;
      }
      return true;
    });

    if (filterBrand !== 'ALL') {
      items = items.filter((it) => it.oemBrand.toLowerCase().includes(filterBrand.toLowerCase()));
    }
    return items;
  }, [itemsList, serviceType, selectedCategory, searchQuery, filterBrand]);

  const updateCartQty = useCallback((id: string, delta: number) => {
    setCart((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      const copy = { ...prev };
      if (next === 0) {
        delete copy[id];
      } else {
        copy[id] = next;
      }
      return copy;
    });
  }, []);

  const totalCartCount = useMemo(() => {
    return Object.values(cart).reduce((sum, q) => sum + q, 0);
  }, [cart]);

  const allCatalogItems = useMemo(() => {
    return MarketplaceService.getItems();
  }, []);

  const totalCartPrice = useMemo(() => {
    return Object.entries(cart).reduce((sum, [id, q]) => {
      const it = allCatalogItems.find((x) => x.id === id);
      return sum + (it ? it.l1PriceInr * q : 0);
    }, 0);
  }, [cart, allCatalogItems]);

  const cartGfrStatus = useMemo(() => {
    return MarketplaceService.evaluateGfrProcurementMode(totalCartPrice);
  }, [totalCartPrice]);

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

  const handleCheckoutOrder = () => {
    const ref = `GEMC-51168${Math.floor(100000 + Math.random() * 900000)}`;
    setOrderPlacedRef(ref);
    setShowCartModal(false);
    setCart({});
  };

  // Header Component for FlatList
  const renderListHeader = () => (
    <View style={styles.headerWrapper}>
      {/* Search Input */}
      <SearchField
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search 10,000+ items (laptops, paper, gloves...)"
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
              delayPressIn={0}
              unstable_pressDelay={0}
              hitSlop={6}
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
          delayPressIn={0}
          unstable_pressDelay={0}
          hitSlop={8}
          onPress={() => setIsGfrExpanded((prev) => !prev)}
        >
          <View style={styles.gfrHeaderTitleRow}>
            <Text style={styles.gfrBadgeIcon}>⚖️</Text>
            <Text style={[styles.gfrTitleText, { color: colors.textPrimary }]}>
              GFR 149 Legal Procurement Guide
            </Text>
          </View>
          <Text style={[styles.gfrChevron, { color: colors.textSecondary }]}>
            {isGfrExpanded ? '▲' : '▼'}
          </Text>
        </Pressable>

        {isGfrExpanded && (
          <View style={[styles.gfrContent, { borderTopColor: colors.borderSubtle }]}>
            <Text style={[styles.gfrDesc, { color: colors.textSecondary }]}>
              Indian General Financial Rules (Rule 149) govern mandatory public procurement thresholds:
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
              <Text style={[styles.gfrModeTag, { color: colors.primary }]}>{MarketplaceService.evaluateGfrProcurementMode(gfrOrderValue).mode}</Text>
              <Text style={[styles.gfrRuleName, { color: colors.textPrimary }]}>{MarketplaceService.evaluateGfrProcurementMode(gfrOrderValue).description}</Text>
              <Text style={[styles.gfrRuleExplanation, { color: colors.textSecondary }]}>
                {MarketplaceService.evaluateGfrProcurementMode(gfrOrderValue).mandatoryRequirement}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Results Title Row */}
      <SectionHeader
        title={`Fast-Moving Catalog (${filteredItems.length})`}
        style={{ marginTop: 8 }}
      />
    </View>
  );

  // Render individual product card - Instamart / Blinkit Clean Design
  const renderProductCard = ({ item }: { item: MarketplaceItem }) => {
    const isSaved = savedItemIds.has(item.id);
    const isCompared = comparedItemIds.has(item.id);
    const qty = cart[item.id] || 0;

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
        {/* Top Product Showcase (Image + Badges) */}
        <View style={styles.imageShowcaseContainer}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.productHeroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumbnailBox, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={styles.thumbnailEmoji}>
                {item.type === 'SERVICE' ? '🛠️' : '📦'}
              </Text>
            </View>
          )}

          {/* Floating Badges */}
          <View style={styles.imageBadgeTopRow}>
            {item.discountPercent ? (
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>{item.discountPercent}% OFF</Text>
              </View>
            ) : null}
            {item.badge ? (
              <View style={styles.featureBadge}>
                <Text style={styles.featureBadgeText}>{item.badge}</Text>
              </View>
            ) : null}
          </View>

          {item.etaDelivery ? (
            <View style={styles.deliveryEtaPill}>
              <Text style={styles.deliveryEtaText}>{item.etaDelivery}</Text>
            </View>
          ) : null}
        </View>

        {/* Product Details Section */}
        <View style={styles.productContentBox}>
          {/* Brand & Rating */}
          <View style={styles.metaRow}>
            <Text style={[styles.brandText, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.oemBrand}
            </Text>
            <View style={styles.ratingBadge}>
              <Text style={styles.starIcon}>★</Text>
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
          </View>

          {/* Title */}
          <Text
            style={[styles.productTitle, { color: colors.textPrimary, fontSize: 14 * fontMultiplier }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          {/* Unit / Pack Size */}
          <Text style={[styles.unitText, { color: colors.textMuted }]} numberOfLines={1}>
            {item.unitText || `Per ${item.priceUnit}`}
          </Text>

          {/* Price & Stepper Row */}
          <View style={styles.priceActionRow}>
            <View style={styles.priceColumn}>
              <View style={styles.priceNumbersRow}>
                <Text style={[styles.priceInr, { color: colors.primary, fontSize: 16 * fontMultiplier }]}>
                  {formatInr(item.l1PriceInr)}
                </Text>
                {item.mrpInr ? (
                  <Text style={[styles.mrpText, { color: colors.textMuted }]}>
                    {formatInr(item.mrpInr)}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.l1NoticeText, { color: colors.success }]}>
                ✓ GeM L1 Verified
              </Text>
            </View>

            {/* Instamart / Blinkit Interactive Stepper Button */}
            {qty === 0 ? (
              <Pressable
                style={[
                  styles.addCartBtn,
                  {
                    borderColor: colors.primary,
                    backgroundColor: colors.surface,
                  },
                ]}
                delayPressIn={0}
                unstable_pressDelay={0}
                hitSlop={8}
                onPress={() => updateCartQty(item.id, 1)}
              >
                <Text style={[styles.addCartBtnText, { color: colors.primary }]}>ADD +</Text>
              </Pressable>
            ) : (
              <View style={[styles.stepperContainer, { backgroundColor: colors.primary }]}>
                <Pressable
                  style={styles.stepperBtn}
                  delayPressIn={0}
                  unstable_pressDelay={0}
                  hitSlop={8}
                  onPress={() => updateCartQty(item.id, -1)}
                >
                  <Text style={styles.stepperSymbol}>−</Text>
                </Pressable>
                <Text style={styles.stepperQtyText}>{qty}</Text>
                <Pressable
                  style={styles.stepperBtn}
                  delayPressIn={0}
                  unstable_pressDelay={0}
                  hitSlop={8}
                  onPress={() => updateCartQty(item.id, 1)}
                >
                  <Text style={styles.stepperSymbol}>+</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Secondary Quick Links */}
          <View style={styles.cardFooterActions}>
            <Pressable
              style={styles.quickActionBtn}
              delayPressIn={0}
              unstable_pressDelay={0}
              hitSlop={6}
              onPress={() => toggleSaveItem(item.id)}
            >
              <Text style={[styles.quickActionText, { color: colors.textSecondary }]}>
                {isSaved ? '🔖 Saved' : '🔖 Save'}
              </Text>
            </Pressable>
            <Pressable
              style={styles.quickActionBtn}
              delayPressIn={0}
              unstable_pressDelay={0}
              hitSlop={6}
              onPress={() => toggleCompareItem(item.id)}
            >
              <Text style={[styles.quickActionText, { color: colors.textSecondary }]}>
                {isCompared ? '⚖️ Comparing' : '⚖️ Compare'}
              </Text>
            </Pressable>
            <Pressable
              style={styles.quickActionBtn}
              delayPressIn={0}
              unstable_pressDelay={0}
              hitSlop={6}
              onPress={() => setSelectedItem(item)}
            >
              <Text style={[styles.quickActionText, { color: colors.primary, fontWeight: '700' }]}>
                Details ›
              </Text>
            </Pressable>
          </View>
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
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={loadLiveProducts}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          totalCartCount > 0 && { paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔍</Text>
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

      {/* Floating Bottom Cart Bar (Instamart & Blinkit Style) */}
      {totalCartCount > 0 && (
        <View style={[styles.floatingCartBar, { backgroundColor: colors.primary }]}>
          <View style={styles.cartBarInfo}>
            <Text style={styles.cartBarCount}>
              🛒 {totalCartCount} {totalCartCount === 1 ? 'item' : 'items'}
            </Text>
            <Text style={styles.cartBarPrice}>
              ₹{formatInr(totalCartPrice)} (excl. taxes)
            </Text>
          </View>

          <Pressable
            style={styles.cartBarActionBtn}
            delayPressIn={0}
            unstable_pressDelay={0}
            hitSlop={8}
            onPress={() => setShowCartModal(true)}
          >
            <Text style={styles.cartBarActionText}>Review & Procure →</Text>
          </Pressable>
        </View>
      )}

      {/* Cart Review Bottom Sheet Modal */}
      <Modal
        visible={showCartModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCartModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowCartModal(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Procurement Cart ({totalCartCount})
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                  Direct Purchase under GFR Rule 149
                </Text>
              </View>
              <Pressable
                onPress={() => setShowCartModal(false)}
                hitSlop={10}
                delayPressIn={0}
                unstable_pressDelay={0}
              >
                <Text style={[styles.modalCloseText, { color: colors.textMuted }]}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.cartScrollList} showsVerticalScrollIndicator={false}>
              {Object.entries(cart).map(([itemId, qty]) => {
                const item = allCatalogItems.find((x) => x.id === itemId);
                if (!item) return null;

                return (
                  <View key={itemId} style={[styles.cartItemRow, { borderBottomColor: colors.borderSubtle }]}>
                    <View style={styles.cartItemInfo}>
                      <Text style={[styles.cartItemTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.cartItemPrice, { color: colors.primary }]}>
                        {formatInr(item.l1PriceInr)} × {qty} = {formatInr(item.l1PriceInr * qty)}
                      </Text>
                    </View>

                    <View style={[styles.stepperContainer, { backgroundColor: colors.primary }]}>
                      <Pressable
                        style={styles.stepperBtn}
                        delayPressIn={0}
                        unstable_pressDelay={0}
                        hitSlop={6}
                        onPress={() => updateCartQty(item.id, -1)}
                      >
                        <Text style={styles.stepperSymbol}>−</Text>
                      </Pressable>
                      <Text style={styles.stepperQtyText}>{qty}</Text>
                      <Pressable
                        style={styles.stepperBtn}
                        delayPressIn={0}
                        unstable_pressDelay={0}
                        hitSlop={6}
                        onPress={() => updateCartQty(item.id, 1)}
                      >
                        <Text style={styles.stepperSymbol}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}

              {/* GFR 149 Compliance Status Box */}
              <View style={[styles.cartGfrCard, { backgroundColor: colors.surfaceSubtle }]}>
                <Text style={[styles.cartGfrTitle, { color: colors.primary }]}>
                  {cartGfrStatus.description}
                </Text>
                <Text style={[styles.cartGfrText, { color: colors.textSecondary }]}>
                  {cartGfrStatus.mandatoryRequirement}
                </Text>
              </View>

              {/* Bill Details */}
              <View style={styles.billBox}>
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Items Total</Text>
                  <Text style={[styles.billVal, { color: colors.textPrimary }]}>{formatInr(totalCartPrice)}</Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Delivery / Logistics SLA</Text>
                  <Text style={[styles.billVal, { color: colors.success }]}>FREE (GeM SLA)</Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Estimated GST (18%)</Text>
                  <Text style={[styles.billVal, { color: colors.textPrimary }]}>{formatInr(Math.round(totalCartPrice * 0.18))}</Text>
                </View>
                <View style={[styles.billRow, styles.billTotalRow, { borderTopColor: colors.borderSubtle }]}>
                  <Text style={[styles.billTotalLabel, { color: colors.textPrimary }]}>Net Payable</Text>
                  <Text style={[styles.billTotalVal, { color: colors.primary }]}>
                    {formatInr(Math.round(totalCartPrice * 1.18))}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.cartFooter}>
              <PrimaryButton
                label="Place GFR Direct Purchase Order"
                onPress={handleCheckoutOrder}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Order Confirmation Modal */}
      {orderPlacedRef && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setOrderPlacedRef(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.orderConfirmBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.orderSuccessIcon}>🎉</Text>
              <Text style={[styles.orderConfirmTitle, { color: colors.textPrimary }]}>
                GeM Order Placed Successfully!
              </Text>
              <Text style={[styles.orderContractNum, { color: colors.primary }]}>
                Contract: {orderPlacedRef}
              </Text>
              <Text style={[styles.orderConfirmDesc, { color: colors.textSecondary }]}>
                Your order is compliant with GFR Rule 149. Order dispatch notification sent to seller. 10-day CRAC inspection window will begin upon consignee receipt.
              </Text>

              <PrimaryButton
                label="Done"
                onPress={() => setOrderPlacedRef(null)}
                style={{ marginTop: 16 }}
              />
            </View>
          </View>
        </Modal>
      )}

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
          {['ALL', 'Dell', 'HP', 'Lenovo', 'Godrej', 'Tata', '3M', 'JK Paper', 'Havells'].map((b) => (
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
        <Modal
          visible={true}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedItem(null)}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setSelectedItem(null)} />
            <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{selectedItem.title}</Text>
                <Pressable
                  onPress={() => setSelectedItem(null)}
                  hitSlop={10}
                  delayPressIn={0}
                  unstable_pressDelay={0}
                >
                  <Text style={[styles.modalCloseText, { color: colors.textMuted }]}>✕</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {selectedItem.imageUrl ? (
                  <Image
                    source={{ uri: selectedItem.imageUrl }}
                    style={styles.modalProductHeroImg}
                    resizeMode="cover"
                  />
                ) : null}

                <View style={styles.modalPriceBox}>
                  <Text style={[styles.modalPrice, { color: colors.primary }]}>
                    {formatInr(selectedItem.l1PriceInr)}
                  </Text>
                  <Text style={[styles.modalUnit, { color: colors.textSecondary }]}>
                    {selectedItem.unitText || `per ${selectedItem.priceUnit}`} (Min Order: {selectedItem.minOrderQty})
                  </Text>
                </View>

                {/* Technical Specifications */}
                <Text style={[styles.modalSecHeader, { color: colors.textPrimary }]}>Technical Specifications</Text>
                {Object.entries(selectedItem.specSummary || {}).map(([k, v]) => (
                  <View key={k} style={[styles.specRowDetail, { borderBottomColor: colors.borderSubtle }]}>
                    <Text style={[styles.specKey, { color: colors.textSecondary }]}>{k}</Text>
                    <Text style={[styles.specVal, { color: colors.textPrimary }]}>{v}</Text>
                  </View>
                ))}

                {/* Statutory & Procurement Compliance */}
                <Text style={[styles.modalSecHeader, { color: colors.textPrimary, marginTop: 14 }]}>
                  Procurement Compliance
                </Text>
                <Text style={[styles.complianceText, { color: colors.textSecondary }]}>
                  • Make in India Local Content: {selectedItem.makeInIndiaPercent}%{'\n'}
                  • MSE Exemption Privileges: {selectedItem.msePreference ? 'Eligible for 100% EMD Waiver' : 'Standard Guarantee'}{'\n'}
                  • Verified OEM Brand: {selectedItem.oemBrand}{'\n'}
                  • Permitted Modes: {selectedItem.procurementModes.join(', ')}
                </Text>
              </ScrollView>

              <View style={[styles.modalFooter, { borderTopColor: colors.borderSubtle }]}>
                <SecondaryButton
                  label="GeM Portal ↗"
                  onPress={() => handleOpenGemPortal(selectedItem)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <PrimaryButton
                  label={cart[selectedItem.id] ? `In Cart (${cart[selectedItem.id]})` : 'Add to Cart'}
                  onPress={() => {
                    updateCartQty(selectedItem.id, 1);
                    setSelectedItem(null);
                  }}
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
    padding: 16,
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
    marginBottom: 14,
    overflow: 'hidden',
  },
  imageShowcaseContainer: {
    height: 150,
    width: '100%',
    position: 'relative',
    backgroundColor: '#F8FAFC',
  },
  productHeroImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailEmoji: {
    fontSize: 36,
  },
  imageBadgeTopRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  featureBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featureBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  deliveryEtaPill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deliveryEtaText: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '700',
  },
  productContentBox: {
    padding: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  brandText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productTitle: {
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 4,
  },
  unitText: {
    fontSize: 12,
    marginBottom: 8,
  },
  priceActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 10,
  },
  priceColumn: {
    flex: 1,
  },
  priceNumbersRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceInr: {
    fontWeight: '800',
    marginRight: 6,
  },
  mrpText: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  l1NoticeText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
  addCartBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCartBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 3,
    minWidth: 90,
    justifyContent: 'space-between',
  },
  stepperBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stepperSymbol: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  stepperQtyText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 4,
  },
  cardFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  quickActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '500',
  },
  floatingCartBar: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  cartBarInfo: {
    flex: 1,
  },
  cartBarCount: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  cartBarPrice: {
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 1,
  },
  cartBarActionBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cartBarActionText: {
    color: '#0B3B60',
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cartScrollList: {
    paddingHorizontal: 16,
    maxHeight: 380,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cartItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  cartItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  cartItemPrice: {
    fontSize: 12,
    fontWeight: '600',
  },
  cartGfrCard: {
    borderRadius: 10,
    padding: 12,
    marginVertical: 12,
  },
  cartGfrTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  cartGfrText: {
    fontSize: 11,
    lineHeight: 16,
  },
  billBox: {
    paddingVertical: 8,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  billLabel: {
    fontSize: 12,
  },
  billVal: {
    fontSize: 12,
    fontWeight: '600',
  },
  billTotalRow: {
    borderTopWidth: 1,
    marginTop: 6,
    paddingTop: 8,
  },
  billTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  billTotalVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  cartFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  orderConfirmBox: {
    margin: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  orderSuccessIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  orderConfirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  orderContractNum: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  orderConfirmDesc: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  modalBody: {
    paddingHorizontal: 16,
  },
  modalProductHeroImg: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  modalPriceBox: {
    marginBottom: 14,
  },
  modalPrice: {
    fontSize: 22,
    fontWeight: '800',
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
  sheetSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  sheetPillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
});
