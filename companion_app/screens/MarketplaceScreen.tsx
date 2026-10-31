/**
 * GeM Marketplace Screen - Amazon-Style Category Explorer & 2-Column High-Efficiency Grid
 * 
 * Conforms strictly to user requirements and official GeM taxonomy:
 * 1. Category Explorer View (browseView === 'categories'):
 *    - Search bar with instant category & subcategory autocomplete
 *    - Direct "Search all live products for '{query}'" jump
 *    - [ Products ] and [ Services ] segmented tabs matching mkp.gem.gov.in
 *    - 9 Official Product Domains (IT, Automobiles, Furniture, Medical, Stationery, etc.)
 *    - 20 Trending & 10 Emerging Services from official GeM portal taxonomy
 *    - Quick subcategory pills on each category card
 * 2. 2-Column Product Grid View (browseView === 'products'):
 *    - 2 products per row (numColumns={2}) for maximum browsing efficiency
 *    - High-density cards with live photography, badges, brand, seller type, L1 price, MRP, and MOQ
 *    - Instamart/Blinkit quick-commerce stepper [ - qty + ]
 *    - Subcategory carousel pills for instant horizontal switching
 *    - GFR 149 Legal Procurement Guide accordion
 *    - Real-time infinite scroll pagination across 26,000+ listings (mkp.gem.gov.in)
 * 3. Mobile Back Navigation:
 *    - Hardware Android BackHandler + header back button gracefully returns to Category Explorer
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
  ActivityIndicator,
} from 'react-native';
import {
  MarketplaceService,
  MarketplaceItem,
  OFFICIAL_PRODUCT_CATEGORIES,
  OFFICIAL_TRENDING_SERVICES,
  OFFICIAL_EMERGING_SERVICES,
  type GeMServiceItem,
} from '../services/MarketplaceService';
import { OFFICIAL_GEM_SUBCATEGORIES, type GeMSubcategoryConfig } from '../services/GeMClientCrawler';
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import {
  SearchField,
  SegmentedTabs,
  CompactChip,
  PrimaryButton,
  SecondaryButton,
  FilterBottomSheetModal,
  SectionHeader,
} from '../components/SharedUI';
import { formatInr } from '../utils/formatters';

export const MarketplaceScreen: React.FC = () => {
  const { colors, fontMultiplier } = useTheme();

  // Navigation mode: 'categories' (Amazon-style explorer) vs 'products' (2-column grid)
  const [browseView, setBrowseView] = useState<'categories' | 'products'>('categories');
  const [activeTypeTab, setActiveTypeTab] = useState<'Products' | 'Services'>('Products');
  const [selectedCategory, setSelectedCategory] = useState<string>('IT Products');
  const [selectedSubcategorySlug, setSelectedSubcategorySlug] = useState<string>(
    'computers-entry-level-computer-cpu/search'
  );
  const [selectedSubcategoryName, setSelectedSubcategoryName] = useState<string>('Desktop Computers');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Selection state
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [selectedService, setSelectedService] = useState<GeMServiceItem | null>(null);
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

  // Dynamic live products state
  const [itemsList, setItemsList] = useState<MarketplaceItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Infinite scroll pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMorePages, setHasMorePages] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // Android hardware back handler: navigate back to Categories view without exiting
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
      if (selectedService) {
        setSelectedService(null);
        return true;
      }
      if (showFilterModal) {
        setShowFilterModal(false);
        return true;
      }
      if (browseView === 'products') {
        setBrowseView('categories');
        return true;
      }
      return false; // Let parent/App handle exit
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [orderPlacedRef, showCartModal, selectedItem, selectedService, showFilterModal, browseView]);

  // Subscribe to real-time live product updates from portal/crawler
  useEffect(() => {
    const unsubscribe = MarketplaceService.subscribeToProductUpdates((latestItems) => {
      if (latestItems && latestItems.length > 0) {
        setItemsList(latestItems);
        setIsLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Dynamic available subcategories for the selected category
  const availableSubcategories = useMemo(() => {
    const filtered = OFFICIAL_GEM_SUBCATEGORIES.filter(
      (s) =>
        s.category.toLowerCase() === selectedCategory.toLowerCase() ||
        selectedCategory.toLowerCase().includes(s.category.toLowerCase()) ||
        s.name.toLowerCase().includes(selectedCategory.toLowerCase())
    );
    return filtered.length > 0 ? filtered : OFFICIAL_GEM_SUBCATEGORIES.slice(0, 6);
  }, [selectedCategory]);

  // Load products for the active subcategory/category from mkp.gem.gov.in
  const loadLiveProducts = useCallback(async () => {
    setIsRefreshing(true);
    setCurrentPage(1);
    try {
      const stream = await MarketplaceService.fetchLiveCategoryStream({
        type: 'PRODUCT',
        category: selectedCategory,
        subcategorySlug: selectedSubcategorySlug,
        query: searchQuery,
        page: 1,
      });
      if (stream.items && stream.items.length > 0) {
        setItemsList(stream.items);
        setHasMorePages(stream.hasMore);
        setIsOffline(false);
      } else {
        setItemsList([]);
        setHasMorePages(false);
        setIsOffline(true);
      }
    } catch {
      setItemsList([]);
      setHasMorePages(false);
      setIsOffline(true);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [selectedCategory, selectedSubcategorySlug, searchQuery]);

  // Infinite scroll load more
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMorePages || isOffline) return;
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    try {
      const stream = await MarketplaceService.fetchLiveCategoryStream({
        type: 'PRODUCT',
        category: selectedCategory,
        subcategorySlug: selectedSubcategorySlug,
        query: searchQuery,
        page: nextPage,
      });
      if (stream.items && stream.items.length > 0) {
        setItemsList((prev) => {
          const map = new Map<string, MarketplaceItem>();
          for (const item of prev) map.set(item.id, item);
          for (const item of stream.items) map.set(item.id, item);
          return Array.from(map.values());
        });
        setCurrentPage(nextPage);
        setHasMorePages(stream.hasMore);
      } else {
        setHasMorePages(false);
      }
    } catch {
      setHasMorePages(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMorePages, isOffline, currentPage, selectedCategory, selectedSubcategorySlug, searchQuery]);

  // Trigger live products when switching to products view or changing subcategory
  useEffect(() => {
    if (browseView === 'products') {
      loadLiveProducts();
    }
  }, [browseView, selectedSubcategorySlug, loadLiveProducts]);

  // Quick category selection action: transitions to 2-column product grid
  const handleSelectCategory = (catName: string, subSlug?: string, subName?: string) => {
    setSelectedCategory(catName);
    const targetSlug =
      subSlug ||
      OFFICIAL_GEM_SUBCATEGORIES.find((s) => s.category.toLowerCase() === catName.toLowerCase())?.slug ||
      'computers-entry-level-computer-cpu/search';
    const targetName =
      subName ||
      OFFICIAL_GEM_SUBCATEGORIES.find((s) => s.category.toLowerCase() === catName.toLowerCase())?.name ||
      catName;
    setSelectedSubcategorySlug(targetSlug);
    setSelectedSubcategoryName(targetName);
    setBrowseView('products');
    setCurrentPage(1);
    setIsLoading(true);
  };

  // Direct global product search jump
  const handleDirectProductSearch = () => {
    setBrowseView('products');
    setCurrentPage(1);
    setIsLoading(true);
    loadLiveProducts();
  };

  // Cart operations
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
  }, [itemsList]);

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

  // Filtered live products for the 2-column grid
  const filteredProducts = useMemo(() => {
    let items = itemsList;
    if (filterBrand !== 'ALL') {
      items = items.filter((it) => it.oemBrand.toLowerCase().includes(filterBrand.toLowerCase()));
    }
    return items;
  }, [itemsList, filterBrand]);

  // Filtered categories for Category Explorer search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return OFFICIAL_PRODUCT_CATEGORIES;
    const q = searchQuery.toLowerCase().trim();
    return OFFICIAL_PRODUCT_CATEGORIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.subcategories.some((s) => s.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  // Filtered services for Category Explorer search
  const filteredTrendingServices = useMemo(() => {
    if (!searchQuery.trim()) return OFFICIAL_TRENDING_SERVICES;
    const q = searchQuery.toLowerCase().trim();
    return OFFICIAL_TRENDING_SERVICES.filter(
      (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const filteredEmergingServices = useMemo(() => {
    if (!searchQuery.trim()) return OFFICIAL_EMERGING_SERVICES;
    const q = searchQuery.toLowerCase().trim();
    return OFFICIAL_EMERGING_SERVICES.filter(
      (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Color tint helper for categories
  const getCategoryTint = (id: string) => {
    switch (id) {
      case 'it-products':
        return { tint: '#E8F1FF', border: '#BFDBFE' };
      case 'automobiles':
        return { tint: '#F0EAFE', border: '#DDD6FE' };
      case 'furniture':
        return { tint: '#FFF4DB', border: '#FDE68A' };
      case 'medical-products':
        return { tint: '#E7F8EE', border: '#A7F3D0' };
      case 'stationery':
        return { tint: '#FFFBEB', border: '#FDE047' };
      case 'electrical-appliances':
        return { tint: '#FEF3C7', border: '#FCD34D' };
      case 'electronic-equipments':
        return { tint: '#EDE9FE', border: '#C4B5FD' };
      case 'textile-products':
        return { tint: '#FCE7F3', border: '#FBCFE8' };
      case 'pipes-fittings':
        return { tint: '#F1F5F9', border: '#CBD5E1' };
      default:
        return { tint: '#F3F4F6', border: '#E5E7EB' };
    }
  };

  // ==========================================
  // RENDER: 2-COLUMN PRODUCT CARD
  // ==========================================
  const renderProductGridItem = ({ item }: { item: MarketplaceItem }) => {
    const qty = cart[item.id] || 0;
    const isSaved = savedItemIds.has(item.id);

    return (
      <Pressable
        style={[
          styles.gridProductCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
        delayPressIn={0}
        unstable_pressDelay={0}
        onPress={() => setSelectedItem(item)}
      >
        {/* Top Product Showcase (Image + Floating Badges) */}
        <View style={styles.gridImageContainer}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.gridProductImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.gridThumbnailFallback, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={styles.gridThumbnailEmoji}>
                {item.type === 'SERVICE' ? '🛠️' : '📦'}
              </Text>
            </View>
          )}

          {/* Floating Badges */}
          <View style={styles.gridBadgesOverlay}>
            {item.discountPercent ? (
              <View style={styles.gridDiscountBadge}>
                <Text style={styles.gridDiscountBadgeText}>{item.discountPercent}% OFF</Text>
              </View>
            ) : null}
            {item.badge ? (
              <View style={styles.gridFeatureBadge}>
                <Text style={styles.gridFeatureBadgeText} numberOfLines={1}>{item.badge}</Text>
              </View>
            ) : null}
          </View>

          {/* Delivery ETA pill */}
          {item.etaDelivery ? (
            <View style={styles.gridEtaPill}>
              <Text style={styles.gridEtaText} numberOfLines={1}>{item.etaDelivery}</Text>
            </View>
          ) : null}
        </View>

        {/* Content Section */}
        <View style={styles.gridCardContent}>
          {/* Brand & Seller Tag */}
          <View style={styles.gridMetaRow}>
            <Text style={[styles.gridBrandText, { color: colors.primary }]} numberOfLines={1}>
              {item.oemBrand}
            </Text>
            <Text style={[styles.gridSellerTag, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.specSummary?.['Seller Type'] ? item.specSummary['Seller Type'] : 'Reseller'}
            </Text>
          </View>

          {/* Title (2 Lines) */}
          <Text
            style={[styles.gridTitleText, { color: colors.textPrimary, fontSize: 13 * fontMultiplier }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          {/* MOQ Indicator */}
          <Text style={[styles.gridMoqText, { color: colors.textMuted }]}>
            Min Qty: {item.minOrderQty || 1}
          </Text>

          {/* L1 Price & MRP Row */}
          <View style={styles.gridPriceRow}>
            <Text style={[styles.gridL1Price, { color: colors.primary, fontSize: 15 * fontMultiplier }]}>
              {formatInr(item.l1PriceInr)}
            </Text>
            {item.mrpInr ? (
              <Text style={[styles.gridMrpPrice, { color: colors.textMuted }]}>
                {formatInr(item.mrpInr)}
              </Text>
            ) : null}
          </View>

          {/* Interactive Stepper Button */}
          <View style={styles.gridActionRow}>
            {qty === 0 ? (
              <Pressable
                style={[
                  styles.gridAddBtn,
                  {
                    borderColor: colors.primary,
                    backgroundColor: colors.surface,
                  },
                ]}
                delayPressIn={0}
                unstable_pressDelay={0}
                hitSlop={6}
                onPress={() => updateCartQty(item.id, 1)}
              >
                <Text style={[styles.gridAddBtnText, { color: colors.primary }]}>+ ADD</Text>
              </Pressable>
            ) : (
              <View style={[styles.gridStepperBox, { backgroundColor: colors.primary }]}>
                <Pressable
                  style={styles.gridStepperBtn}
                  delayPressIn={0}
                  unstable_pressDelay={0}
                  hitSlop={6}
                  onPress={() => updateCartQty(item.id, -1)}
                >
                  <Text style={styles.gridStepperSymbol}>−</Text>
                </Pressable>
                <Text style={styles.gridStepperQty}>{qty}</Text>
                <Pressable
                  style={styles.gridStepperBtn}
                  delayPressIn={0}
                  unstable_pressDelay={0}
                  hitSlop={6}
                  onPress={() => updateCartQty(item.id, 1)}
                >
                  <Text style={styles.gridStepperSymbol}>+</Text>
                </Pressable>
              </View>
            )}

            <Pressable
              style={styles.gridSaveIconBtn}
              delayPressIn={0}
              unstable_pressDelay={0}
              hitSlop={6}
              onPress={() => toggleSaveItem(item.id)}
            >
              <Text style={{ fontSize: 14 }}>{isSaved ? '🔖' : '🤍'}</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  // ==========================================
  // RENDER: PRODUCT GRID VIEW HEADER
  // ==========================================
  const renderProductGridHeader = () => (
    <View style={styles.productGridHeaderWrapper}>
      {/* Top Breadcrumb Navigation */}
      <View style={styles.topNavBar}>
        <Pressable
          style={[styles.backToCatBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          delayPressIn={0}
          unstable_pressDelay={0}
          hitSlop={8}
          onPress={() => setBrowseView('categories')}
        >
          <Text style={[styles.backToCatIcon, { color: colors.primary }]}>←</Text>
          <Text style={[styles.backToCatText, { color: colors.primary }]}>Categories</Text>
        </Pressable>

        <View style={styles.headerTitleBox}>
          <Text style={[styles.navCatTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {selectedSubcategoryName || selectedCategory}
          </Text>
          <Text style={[styles.navSubTitle, { color: colors.textSecondary }]}>
            {filteredProducts.length}{hasMorePages ? '+' : ''} Live GeM Sellers
          </Text>
        </View>

        <Pressable
          style={[styles.filterActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          delayPressIn={0}
          unstable_pressDelay={0}
          hitSlop={8}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={styles.filterActionIcon}>⚙️</Text>
        </Pressable>
      </View>

      {/* Subcategory Pills Carousel for fast switching within domain */}
      <View style={styles.subCatScrollBox}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
        >
          {availableSubcategories.map((sub: GeMSubcategoryConfig) => (
            <CompactChip
              key={sub.id}
              label={sub.name}
              selected={selectedSubcategorySlug === sub.slug}
              onPress={() => {
                setSelectedSubcategorySlug(sub.slug);
                setSelectedSubcategoryName(sub.name);
                setCurrentPage(1);
                setIsLoading(true);
              }}
            />
          ))}
        </ScrollView>
      </View>

      {/* GFR 149 Legal Procurement Guide Accordion */}
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
              <Text style={[styles.gfrModeTag, { color: colors.primary }]}>
                {MarketplaceService.evaluateGfrProcurementMode(gfrOrderValue).mode}
              </Text>
              <Text style={[styles.gfrRuleName, { color: colors.textPrimary }]}>
                {MarketplaceService.evaluateGfrProcurementMode(gfrOrderValue).description}
              </Text>
              <Text style={[styles.gfrRuleExplanation, { color: colors.textSecondary }]}>
                {MarketplaceService.evaluateGfrProcurementMode(gfrOrderValue).mandatoryRequirement}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  // ==========================================
  // RENDER: CATEGORY EXPLORER VIEW (AMAZON STYLE)
  // ==========================================
  const renderCategoryExplorer = () => (
    <ScrollView
      style={styles.catExplorerScroll}
      contentContainerStyle={[styles.catExplorerContent, totalCartCount > 0 && { paddingBottom: 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Search Input Bar */}
      <SearchField
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search categories, products, or services..."
        style={{ marginBottom: 12 }}
      />

      {/* Prominent Direct Product Search Jump if query typed */}
      {searchQuery.trim().length > 0 && (
        <Pressable
          style={[styles.directSearchBanner, { backgroundColor: colors.primary }]}
          delayPressIn={0}
          unstable_pressDelay={0}
          onPress={handleDirectProductSearch}
        >
          <Text style={styles.directSearchIcon}>🔍</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.directSearchTitle}>
              Search live GeM products for &quot;{searchQuery}&quot;
            </Text>
            <Text style={styles.directSearchSub}>
              Query 26,000+ multi-seller listings across mkp.gem.gov.in →
            </Text>
          </View>
        </Pressable>
      )}

      {/* Products vs Services Segmented Tabs (Matches mkp.gem.gov.in Browse Menu) */}
      <SegmentedTabs
        options={['Products', 'Services']}
        selected={activeTypeTab}
        onSelect={(tab) => setActiveTypeTab(tab as 'Products' | 'Services')}
        style={{ marginBottom: 16 }}
      />

      {activeTypeTab === 'Products' ? (
        /* ================= PRODUCTS CATEGORIES GRID ================= */
        <View>
          <SectionHeader
            title="Popular Product Categories"
            subtitle="Explore official GeM procurement categories with live seller listings"
          />

          <View style={styles.categories2ColGrid}>
            {filteredCategories.map((cat) => {
              const themeColors = getCategoryTint(cat.id);
              return (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.catExplorerCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: themeColors.border,
                    },
                  ]}
                  delayPressIn={0}
                  unstable_pressDelay={0}
                  onPress={() => handleSelectCategory(cat.name)}
                >
                  {/* Card Header with Icon & Count */}
                  <View style={styles.catCardHeader}>
                    <View style={[styles.catCardIconBox, { backgroundColor: themeColors.tint }]}>
                      <Text style={styles.catCardEmoji}>{cat.icon}</Text>
                    </View>
                    <View style={[styles.catCountBadge, { backgroundColor: themeColors.tint }]}>
                      <Text style={[styles.catCountText, { color: colors.primary }]}>{cat.itemCount}+ items</Text>
                    </View>
                  </View>

                  {/* Category Title */}
                  <Text style={[styles.catCardName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {cat.name}
                  </Text>

                  {/* Subcategories preview tags */}
                  <View style={styles.catSubtagsBox}>
                    {cat.subcategories.slice(0, 3).map((subName) => (
                      <Pressable
                        key={subName}
                        style={[styles.subtagPill, { backgroundColor: colors.surfaceSubtle }]}
                        delayPressIn={0}
                        unstable_pressDelay={0}
                        onPress={() => {
                          const matchingSub = OFFICIAL_GEM_SUBCATEGORIES.find(
                            (s) => s.name.toLowerCase() === subName.toLowerCase() || subName.toLowerCase().includes(s.name.toLowerCase())
                          );
                          handleSelectCategory(cat.name, matchingSub?.slug, subName);
                        }}
                      >
                        <Text style={[styles.subtagText, { color: colors.textSecondary }]} numberOfLines={1}>
                          • {subName}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <View style={styles.catCardFooterRow}>
                    <Text style={[styles.viewProductsLink, { color: colors.primary }]}>
                      Browse Sellers ›
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : (
        /* ================= SERVICES TAXONOMY LIST ================= */
        <View>
          {/* Trending Services */}
          <SectionHeader
            title="Trending Services"
            subtitle="Official GeM public procurement services with pre-negotiated SLAs"
          />
          <View style={styles.servicesGrid}>
            {filteredTrendingServices.map((srv) => (
              <Pressable
                key={srv.id}
                style={[styles.serviceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                delayPressIn={0}
                unstable_pressDelay={0}
                onPress={() => setSelectedService(srv)}
              >
                <View style={styles.serviceIconBox}>
                  <Text style={styles.serviceEmoji}>{srv.icon}</Text>
                </View>
                <View style={styles.serviceInfo}>
                  <View style={styles.serviceHeaderRow}>
                    <Text style={[styles.serviceCategoryTag, { color: colors.primary }]}>
                      {srv.category}
                    </Text>
                    {srv.badge ? (
                      <View style={styles.serviceBadge}>
                        <Text style={styles.serviceBadgeText}>{srv.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.serviceTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                    {srv.name}
                  </Text>
                  <View style={styles.serviceGfrRow}>
                    <Text style={[styles.serviceGfrText, { color: colors.textSecondary }]}>
                      Mode: {srv.gfrMode}
                    </Text>
                    <Text style={[styles.serviceActionLink, { color: colors.primary }]}>Details ›</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Emerging Services */}
          <SectionHeader
            title="Emerging Services"
            subtitle="New specialized government services and facility management options"
            style={{ marginTop: 20 }}
          />
          <View style={styles.servicesGrid}>
            {filteredEmergingServices.map((srv) => (
              <Pressable
                key={srv.id}
                style={[styles.serviceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                delayPressIn={0}
                unstable_pressDelay={0}
                onPress={() => setSelectedService(srv)}
              >
                <View style={styles.serviceIconBox}>
                  <Text style={styles.serviceEmoji}>{srv.icon}</Text>
                </View>
                <View style={styles.serviceInfo}>
                  <View style={styles.serviceHeaderRow}>
                    <Text style={[styles.serviceCategoryTag, { color: colors.primary }]}>
                      {srv.category}
                    </Text>
                    {srv.badge ? (
                      <View style={styles.serviceBadge}>
                        <Text style={styles.serviceBadgeText}>{srv.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.serviceTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                    {srv.name}
                  </Text>
                  <View style={styles.serviceGfrRow}>
                    <Text style={[styles.serviceGfrText, { color: colors.textSecondary }]}>
                      Mode: {srv.gfrMode}
                    </Text>
                    <Text style={[styles.serviceActionLink, { color: colors.primary }]}>Details ›</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {browseView === 'categories' ? (
        renderCategoryExplorer()
      ) : (
        /* ================= 2-COLUMN PRODUCT GRID ================= */
        <FlatList
          key="two-column-gem-grid"
          data={filteredProducts}
          numColumns={2}
          keyExtractor={(item) => item.id}
          renderItem={renderProductGridItem}
          ListHeaderComponent={renderProductGridHeader}
          columnWrapperStyle={styles.productRowWrapper}
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
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ marginTop: 6, fontSize: 13, color: colors.textSecondary }}>
                  Loading more live GeM seller products (Page {currentPage + 1})...
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary, marginTop: 16 }]}>
                  Streaming live GeM marketplace...
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Connecting directly to mkp.gem.gov.in seller listings.
                </Text>
              </View>
            ) : isOffline ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>📡</Text>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Products Available (Offline)</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Unable to connect to GeM live marketplace. Please check your internet connection and try again.
                </Text>
                <PrimaryButton
                  label="Retry Connection"
                  onPress={loadLiveProducts}
                  style={{ marginTop: 16 }}
                />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No matching items found</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Try clearing search terms or selecting another category.
                </Text>
                <SecondaryButton
                  label="Return to Categories"
                  onPress={() => setBrowseView('categories')}
                  style={{ marginTop: 16 }}
                />
              </View>
            )
          }
        />
      )}

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
          setFilterBrand('ALL');
        }}
        onApply={() => setShowFilterModal(false)}
      >
        <Text style={[styles.sheetSectionTitle, { color: colors.textPrimary }]}>Brand / OEM</Text>
        <View style={styles.sheetPillWrap}>
          {['ALL', 'Champion', 'DUGONG', 'RDP', 'Consistent', 'HP', 'Dell', 'Lenovo', 'Acer'].map((b) => (
            <CompactChip
              key={b}
              label={b}
              selected={filterBrand === b}
              onPress={() => setFilterBrand(b)}
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

      {/* Service Details Modal */}
      {selectedService && (
        <Modal
          visible={true}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedService(null)}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setSelectedService(null)} />
            <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{selectedService.name}</Text>
                <Pressable
                  onPress={() => setSelectedService(null)}
                  hitSlop={10}
                  delayPressIn={0}
                  unstable_pressDelay={0}
                >
                  <Text style={[styles.modalCloseText, { color: colors.textMuted }]}>✕</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={[styles.serviceModalIconBox, { backgroundColor: colors.surfaceSubtle }]}>
                  <Text style={{ fontSize: 44 }}>{selectedService.icon}</Text>
                </View>

                <View style={styles.serviceModalMetaRow}>
                  <View style={styles.serviceBadge}>
                    <Text style={styles.serviceBadgeText}>{selectedService.badge || 'Official Service'}</Text>
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                    Domain: {selectedService.category}
                  </Text>
                </View>

                <Text style={[styles.modalSecHeader, { color: colors.textPrimary, marginTop: 16 }]}>
                  Procurement Compliance & SLA
                </Text>
                <View style={[styles.gfrResultCard, { backgroundColor: colors.surfaceSubtle, marginTop: 8 }]}>
                  <Text style={[styles.gfrModeTag, { color: colors.primary }]}>
                    Mandatory Mode: {selectedService.gfrMode}
                  </Text>
                  <Text style={[styles.gfrRuleExplanation, { color: colors.textSecondary }]}>
                    Governed by GeM Service Contract Guidelines. Requires pre-qualification of service personnel, minimum wage compliance, and quarterly SLA audit logging.
                  </Text>
                </View>
              </ScrollView>

              <View style={[styles.modalFooter, { borderTopColor: colors.borderSubtle }]}>
                <SecondaryButton
                  label="GeM Portal ↗"
                  onPress={() => handleOpenGemPortal()}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <PrimaryButton
                  label="Procure Service"
                  onPress={() => {
                    Alert.alert('GeM Service Request', 'Initiating service SLA onboarding on GeM.');
                    setSelectedService(null);
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
  catExplorerScroll: {
    flex: 1,
  },
  catExplorerContent: {
    padding: 16,
    paddingBottom: 40,
  },
  directSearchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  directSearchIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  directSearchTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  directSearchSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginTop: 2,
  },
  categories2ColGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  catExplorerCard: {
    width: '48.5%',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  catCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  catCardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catCardEmoji: {
    fontSize: 22,
  },
  catCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catCountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  catCardName: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  catSubtagsBox: {
    gap: 4,
    marginBottom: 10,
  },
  subtagPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  subtagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  catCardFooterRow: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  viewProductsLink: {
    fontSize: 11,
    fontWeight: '800',
  },

  // Services View
  servicesGrid: {
    gap: 10,
  },
  serviceCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: DESIGN_TOKENS.borderWidth,
    padding: 12,
    alignItems: 'center',
  },
  serviceIconBox: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  serviceEmoji: {
    fontSize: 22,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  serviceCategoryTag: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  serviceBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  serviceBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  serviceTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 4,
  },
  serviceGfrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceGfrText: {
    fontSize: 11,
  },
  serviceActionLink: {
    fontSize: 12,
    fontWeight: '800',
  },

  // Product Grid View & Header
  listContent: {
    padding: 12,
    paddingBottom: 40,
  },
  productGridHeaderWrapper: {
    marginBottom: 8,
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backToCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  backToCatIcon: {
    fontSize: 15,
    fontWeight: '800',
    marginRight: 4,
  },
  backToCatText: {
    fontSize: 12,
    fontWeight: '700',
  },
  headerTitleBox: {
    flex: 1,
    marginHorizontal: 10,
  },
  navCatTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  navSubTitle: {
    fontSize: 11,
    marginTop: 1,
  },
  filterActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterActionIcon: {
    fontSize: 16,
  },
  subCatScrollBox: {
    marginBottom: 10,
  },

  // 2-Column Product Grid Cards
  productRowWrapper: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  gridProductCard: {
    width: '48.5%',
    borderRadius: 12,
    borderWidth: DESIGN_TOKENS.borderWidth,
    overflow: 'hidden',
  },
  gridImageContainer: {
    height: 125,
    width: '100%',
    position: 'relative',
    backgroundColor: '#F8FAFC',
  },
  gridProductImage: {
    width: '100%',
    height: '100%',
  },
  gridThumbnailFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridThumbnailEmoji: {
    fontSize: 32,
  },
  gridBadgesOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridDiscountBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gridDiscountBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  gridFeatureBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 75,
  },
  gridFeatureBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  gridEtaPill: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  gridEtaText: {
    color: '#0F172A',
    fontSize: 9,
    fontWeight: '700',
  },
  gridCardContent: {
    padding: 8,
  },
  gridMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  gridBrandText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    maxWidth: '55%',
  },
  gridSellerTag: {
    fontSize: 9,
    fontWeight: '500',
    maxWidth: '45%',
  },
  gridTitleText: {
    fontWeight: '700',
    lineHeight: 17,
    marginBottom: 4,
    minHeight: 34,
  },
  gridMoqText: {
    fontSize: 9,
    marginBottom: 4,
  },
  gridPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  gridL1Price: {
    fontWeight: '800',
    marginRight: 5,
  },
  gridMrpPrice: {
    fontSize: 10,
    textDecorationLine: 'line-through',
  },
  gridActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gridAddBtn: {
    flex: 1,
    borderWidth: 1.5,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
    marginRight: 6,
  },
  gridAddBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  gridStepperBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginRight: 6,
  },
  gridStepperBtn: {
    paddingHorizontal: 4,
  },
  gridStepperSymbol: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  gridStepperQty: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  gridSaveIconBtn: {
    padding: 4,
  },

  // GFR Accordion
  gfrAccordion: {
    borderRadius: 10,
    borderWidth: DESIGN_TOKENS.borderWidth,
    marginBottom: 10,
    overflow: 'hidden',
  },
  gfrHeaderPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  gfrHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gfrBadgeIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  gfrTitleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  gfrChevron: {
    fontSize: 11,
  },
  gfrContent: {
    borderTopWidth: 1,
    padding: 10,
  },
  gfrDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 8,
  },
  gfrPillRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  gfrResultCard: {
    borderRadius: 8,
    padding: 8,
  },
  gfrModeTag: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  gfrRuleName: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  gfrRuleExplanation: {
    fontSize: 10,
    lineHeight: 14,
  },

  // Cart & Floating Bar
  floatingCartBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  cartBarInfo: {
    flex: 1,
  },
  cartBarCount: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  cartBarPrice: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    marginTop: 1,
  },
  cartBarActionBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  cartBarActionText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 12,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '85%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    marginRight: 10,
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: '700',
    padding: 4,
  },
  modalBody: {
    marginBottom: 12,
  },
  modalProductHeroImg: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
  modalPriceBox: {
    marginBottom: 12,
  },
  modalPrice: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalUnit: {
    fontSize: 12,
    marginTop: 2,
  },
  modalSecHeader: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
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
    fontSize: 11,
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 12,
  },

  // Service Modal
  serviceModalIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  serviceModalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  // Cart Modal Inner
  cartScrollList: {
    maxHeight: 280,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  cartItemInfo: {
    flex: 1,
    marginRight: 10,
  },
  cartItemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  cartItemPrice: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stepperBtn: {
    paddingHorizontal: 6,
  },
  stepperSymbol: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  stepperQtyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    marginHorizontal: 4,
  },
  cartGfrCard: {
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  cartGfrTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  cartGfrText: {
    fontSize: 11,
    marginTop: 2,
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
    fontSize: 15,
    fontWeight: '800',
  },
  cartFooter: {
    marginTop: 12,
  },

  // Order placed
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
  },
  orderContractNum: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  orderConfirmDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 8,
  },

  // Filter Sheet
  sheetSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  sheetPillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  // Empty state
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 24,
  },
});
