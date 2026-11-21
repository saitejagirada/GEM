/**
 * GeM Marketplace Screen — Split-Pane Category Explorer, Live Product Grid & Live Services Hub
 *
 * 100% Direct Phone -> mkp.gem.gov.in / bidplus.gem.gov.in (zero backend):
 * - Products Tab: Split-pane department rail + verified live subcategory grid across all 9
 *   GeM product domains (IT, Automobiles, Furniture, Medical, Stationery, Electrical,
 *   Electronics, Textiles, Pipes & Fittings) + dynamic live GeM search discovery.
 * - Services Tab: Direct live GeM Services directory (380+ active services) + 30 official
 *   trending/emerging services mapped to real service IDs, opening an in-app Service Explorer
 *   with live registered providers, live open service tenders (with inline PDFs), and live SLA/specs.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  MarketplaceService,
  MarketplaceItem,
  OFFICIAL_PRODUCT_CATEGORIES,
  OFFICIAL_TRENDING_SERVICES,
  OFFICIAL_EMERGING_SERVICES,
  OFFICIAL_OUTLET_STORES,
  type GeMServiceItem,
  type MarketplaceStreamSource,
} from '../services/MarketplaceService';
import { OFFICIAL_GEM_SUBCATEGORIES, type GeMSubcategoryConfig } from '../services/GeMClientCrawler';
import {
  GeMServicesClient,
  type LiveGeMServiceSummary,
} from '../services/GeMServicesClient';
import { ServiceDetailModal, type ActiveServiceTarget } from './ServiceDetailModal';
import type { DeconstructedBidDoc } from '../types/index';
import { useTheme } from '../theme/ThemeContext';
import {
  SearchField,
  CompactChip,
  PrimaryButton,
  SecondaryButton,
  FilterBottomSheetModal,
} from '../components/SharedUI';
import { formatInr } from '../utils/formatters';
import { isNetworkOnline } from '../utils/network';

export interface MarketplaceScreenProps {
  initialCategory?: string;
  initialQuery?: string;
  initialTypeTab?: 'Products' | 'Services';
  navTrigger?: number;
  onPrepareDocuments?: (bid: DeconstructedBidDoc) => void;
}

type ServiceFilterChip =
  | 'Popular'
  | 'All Live'
  | 'Manpower'
  | 'Vehicles'
  | 'IT & AMC'
  | 'Facility'
  | 'Printing'
  | 'Catering'
  | 'Logistics';

const SERVICE_FILTER_CHIPS: ServiceFilterChip[] = [
  'Popular',
  'All Live',
  'Manpower',
  'Vehicles',
  'IT & AMC',
  'Facility',
  'Printing',
  'Catering',
  'Logistics',
];

const DEPT_SHORT_LABELS: Record<string, string> = {
  'it-products': 'IT & Tech',
  automobiles: 'Auto',
  furniture: 'Furniture',
  'medical-products': 'Medical',
  stationery: 'Stationery',
  'electrical-appliances': 'Electrical',
  'electronic-equipments': 'Electronics',
  'textile-products': 'Textiles',
  'pipes-fittings': 'Pipes',
};

export const MarketplaceScreen: React.FC<MarketplaceScreenProps> = ({
  initialCategory,
  initialQuery,
  initialTypeTab,
  navTrigger,
  onPrepareDocuments,
}) => {
  const { colors, fontMultiplier } = useTheme();

  // Top-level navigation: Split Category Explorer vs 2-Column Live Product Grid
  const [browseView, setBrowseView] = useState<'categories' | 'products'>('categories');
  const [activeTypeTab, setActiveTypeTab] = useState<'Products' | 'Services'>('Products');
  const [selectedDeptId, setSelectedDeptId] = useState<string>(OFFICIAL_PRODUCT_CATEGORIES[0].id);

  // Active product grid scope
  const [selectedCategory, setSelectedCategory] = useState<string>('IT Products');
  const [selectedSubcategorySlug, setSelectedSubcategorySlug] = useState<string>(
    'computers-entry-level-computer-cpu/search'
  );
  const [selectedSubcategoryName, setSelectedSubcategoryName] = useState<string>('Desktop Computers');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeProductQuery, setActiveProductQuery] = useState<string>('');

  // Services explorer state
  const [serviceFilter, setServiceFilter] = useState<ServiceFilterChip>('Popular');
  const [liveDirectoryServices, setLiveDirectoryServices] = useState<LiveGeMServiceSummary[]>([]);
  const [liveDirectoryTotal, setLiveDirectoryTotal] = useState<number>(0);
  const [liveDirectoryPage, setLiveDirectoryPage] = useState<number>(1);
  const [liveDirectoryHasMore, setLiveDirectoryHasMore] = useState<boolean>(false);
  const [isLoadingServicesDir, setIsLoadingServicesDir] = useState<boolean>(false);
  const [isLoadingMoreServices, setIsLoadingMoreServices] = useState<boolean>(false);
  const [activeService, setActiveService] = useState<ActiveServiceTarget | null>(null);

  // Product detail, shortlist & filter state
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<Record<string, number>>({});
  const [showCartModal, setShowCartModal] = useState<boolean>(false);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [filterBrand, setFilterBrand] = useState<string>('ALL');
  const [isGfrExpanded, setIsGfrExpanded] = useState<boolean>(false);
  const [gfrOrderValue, setGfrOrderValue] = useState<number>(45000);

  // Live product stream state
  const [itemsList, setItemsList] = useState<MarketplaceItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [catalogSource, setCatalogSource] = useState<MarketplaceStreamSource>('EMPTY');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMorePages, setHasMorePages] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const requestSequence = useRef(0);

  // Hardware BackHandler
  useEffect(() => {
    const onBackPress = () => {
      if (showCartModal) {
        setShowCartModal(false);
        return true;
      }
      if (selectedItem) {
        setSelectedItem(null);
        return true;
      }
      if (activeService) {
        setActiveService(null);
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
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [showCartModal, selectedItem, activeService, showFilterModal, browseView]);

  // Active department object & its verified live subcategories
  const activeDept = useMemo(
    () => OFFICIAL_PRODUCT_CATEGORIES.find((c) => c.id === selectedDeptId) || OFFICIAL_PRODUCT_CATEGORIES[0],
    [selectedDeptId]
  );

  const activeDeptSubcategories = useMemo(
    () => OFFICIAL_GEM_SUBCATEGORIES.filter((s) => s.category.toLowerCase() === activeDept.name.toLowerCase()),
    [activeDept.name]
  );

  // Subcategories shown in the product grid horizontal switcher
  const availableSubcategories = useMemo(
    () =>
      OFFICIAL_GEM_SUBCATEGORIES.filter(
        (s) =>
          s.category.toLowerCase() === selectedCategory.toLowerCase() ||
          selectedCategory.toLowerCase().includes(s.category.toLowerCase())
      ),
    [selectedCategory]
  );

  // Load live GeM services directory when switching to Services -> All Live
  const loadLiveServicesDirectory = useCallback(async (page = 1, append = false) => {
    if (append) setIsLoadingMoreServices(true);
    else setIsLoadingServicesDir(true);
    try {
      const res = await GeMServicesClient.fetchLiveServicesDirectory(page, 24);
      setLiveDirectoryTotal(res.total);
      setLiveDirectoryPage(page);
      setLiveDirectoryHasMore(res.hasMore);
      setLiveDirectoryServices((prev) => {
        if (!append) return res.services;
        const seen = new Set(prev.map((s) => s.id));
        return [...prev, ...res.services.filter((s) => !seen.has(s.id))];
      });
    } finally {
      setIsLoadingServicesDir(false);
      setIsLoadingMoreServices(false);
    }
  }, []);

  useEffect(() => {
    if (activeTypeTab === 'Services' && liveDirectoryServices.length === 0 && !isLoadingServicesDir) {
      loadLiveServicesDirectory(1, false);
    }
  }, [activeTypeTab, liveDirectoryServices.length, isLoadingServicesDir, loadLiveServicesDirectory]);

  // Fetch live products directly from mkp.gem.gov.in
  const loadLiveProducts = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setIsRefreshing(true);
    setIsLoading(true);
    setIsOffline(false);
    setItemsList([]);
    setCatalogSource('EMPTY');
    setCurrentPage(1);
    setHasMorePages(false);
    setFilterBrand('ALL');

    try {
      const stream = await MarketplaceService.fetchLiveCategoryStream({
        type: 'PRODUCT',
        category: selectedCategory,
        subcategorySlug: activeProductQuery ? undefined : selectedSubcategorySlug,
        subcategoryName: activeProductQuery ? undefined : selectedSubcategoryName,
        query: activeProductQuery || undefined,
        page: 1,
      });
      if (requestId !== requestSequence.current) return;

      if (stream.items && stream.items.length > 0) {
        setItemsList(stream.items);
        setHasMorePages(stream.hasMore);
        setCatalogSource(stream.source);
        setIsOffline(false);
      } else {
        const online = await isNetworkOnline();
        setItemsList([]);
        setHasMorePages(false);
        setCatalogSource('EMPTY');
        setIsOffline(!online);
      }
    } catch {
      if (requestId !== requestSequence.current) return;
      const online = await isNetworkOnline();
      setItemsList([]);
      setHasMorePages(false);
      setIsOffline(!online);
    } finally {
      if (requestId === requestSequence.current) {
        setIsRefreshing(false);
        setIsLoading(false);
      }
    }
  }, [selectedCategory, selectedSubcategorySlug, selectedSubcategoryName, activeProductQuery]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMorePages || isOffline) return;
    const requestId = requestSequence.current;
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    try {
      const stream = await MarketplaceService.fetchLiveCategoryStream({
        type: 'PRODUCT',
        category: selectedCategory,
        subcategorySlug: activeProductQuery ? undefined : selectedSubcategorySlug,
        subcategoryName: activeProductQuery ? undefined : selectedSubcategoryName,
        query: activeProductQuery || undefined,
        page: nextPage,
      });
      if (requestId !== requestSequence.current) return;
      if (stream.items && stream.items.length > 0) {
        setItemsList((prev) => {
          const map = new Map<string, MarketplaceItem>();
          for (const item of prev) map.set(item.id, item);
          for (const item of stream.items) map.set(item.id, item);
          return Array.from(map.values());
        });
        setCurrentPage(nextPage);
        setHasMorePages(stream.hasMore);
        setCatalogSource(stream.source);
      } else {
        setHasMorePages(false);
      }
    } catch {
      if (requestId !== requestSequence.current) return;
      setHasMorePages(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    isLoadingMore,
    hasMorePages,
    isOffline,
    currentPage,
    selectedCategory,
    selectedSubcategorySlug,
    selectedSubcategoryName,
    activeProductQuery,
  ]);

  useEffect(() => {
    if (browseView === 'products') {
      loadLiveProducts();
    }
  }, [browseView, selectedSubcategorySlug, activeProductQuery, loadLiveProducts]);

  // Open a verified category/subcategory straight into the 2-column live product grid
  const openSubcategory = useCallback((catName: string, subSlug?: string, subName?: string) => {
    const firstMatch = OFFICIAL_GEM_SUBCATEGORIES.find(
      (s) => s.category.toLowerCase() === catName.toLowerCase()
    );
    const matchingDept = OFFICIAL_PRODUCT_CATEGORIES.find(
      (c) => c.name.toLowerCase() === catName.toLowerCase()
    );
    if (matchingDept) setSelectedDeptId(matchingDept.id);

    setActiveProductQuery('');
    setSelectedCategory(catName);
    setSelectedSubcategorySlug(subSlug || firstMatch?.slug || '');
    setSelectedSubcategoryName(subName || firstMatch?.name || catName);
    setBrowseView('products');
    setCurrentPage(1);
    setIsLoading(true);
  }, []);

  // Run a live GeM catalog search for ANY free-text query
  const runLiveProductSearch = useCallback((queryText: string) => {
    const clean = queryText.trim();
    if (!clean) return;
    setActiveProductQuery(clean);
    setSelectedCategory('Live Search');
    setSelectedSubcategorySlug('');
    setSelectedSubcategoryName(`"${clean}"`);
    setBrowseView('products');
    setCurrentPage(1);
    setIsLoading(true);
  }, []);

  // Apply external navigation intent from Home or CategoriesScreen
  useEffect(() => {
    if (initialTypeTab) {
      setActiveTypeTab(initialTypeTab);
    }
    if (initialQuery !== undefined && initialQuery.trim()) {
      const q = initialQuery.trim();
      setSearchQuery(q);
      if (initialTypeTab === 'Services') {
        setBrowseView('categories');
      } else {
        runLiveProductSearch(q);
      }
      return;
    }
    if (initialCategory) {
      if (initialTypeTab === 'Services') {
        setBrowseView('categories');
        setSearchQuery(initialCategory);
      } else {
        openSubcategory(initialCategory);
      }
    }
  }, [initialCategory, initialQuery, initialTypeTab, navTrigger, openSubcategory, runLiveProductSearch]);

  // Open in-app Live Service Explorer (never forces opening the browser!)
  const openServiceDetail = (srv: GeMServiceItem | LiveGeMServiceSummary) => {
    if ('gemServiceId' in srv) {
      setActiveService({
        gemServiceId: srv.gemServiceId,
        name: srv.name,
        category: srv.category,
        gfrMode: srv.gfrMode,
        searchHint: srv.searchHint,
      });
    } else {
      setActiveService({
        gemServiceId: srv.id,
        name: srv.displayName,
        category: 'GeM Live Service',
        imageUrl: srv.imageUrl,
      });
    }
  };

  // Cart / Shortlist operations
  const updateCartQty = useCallback((id: string, delta: number) => {
    setCart((prev) => {
      const next = Math.max(0, (prev[id] || 0) + delta);
      const copy = { ...prev };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  }, []);

  const totalCartCount = useMemo(() => Object.values(cart).reduce((sum, q) => sum + q, 0), [cart]);
  const allCatalogItems = useMemo(() => MarketplaceService.getItems(), [itemsList]);
  const totalCartPrice = useMemo(
    () =>
      Object.entries(cart).reduce((sum, [id, q]) => {
        const it = itemsList.find((x) => x.id === id) || allCatalogItems.find((x) => x.id === id);
        return sum + (it ? it.l1PriceInr * q : 0);
      }, 0),
    [cart, itemsList, allCatalogItems]
  );
  const cartGfrStatus = useMemo(
    () => MarketplaceService.evaluateGfrProcurementMode(totalCartPrice),
    [totalCartPrice]
  );

  const handleOpenGemPortal = useCallback((item?: MarketplaceItem) => {
    const directUrl =
      item?.productUrl && item.productUrl.startsWith('https://mkp.gem.gov.in/')
        ? item.productUrl
        : undefined;
    const targetUrl =
      directUrl ||
      (item
        ? `https://mkp.gem.gov.in/search?q=${encodeURIComponent(item.title)}`
        : 'https://mkp.gem.gov.in');
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

  // Dynamic brand pills derived from live fetched items
  const availableBrands = useMemo(() => {
    const brands = Array.from(
      new Set(
        itemsList
          .map((i) => i.oemBrand?.trim())
          .filter((b): b is string => Boolean(b && b.length >= 2 && b !== 'GeM Verified OEM'))
      )
    ).slice(0, 14);
    return ['ALL', ...brands];
  }, [itemsList]);

  const filteredProducts = useMemo(() => {
    if (filterBrand === 'ALL') return itemsList;
    return itemsList.filter((it) => it.oemBrand.toLowerCase().includes(filterBrand.toLowerCase()));
  }, [itemsList, filterBrand]);

  // Search suggestions for Products tab
  const matchingSubcategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return OFFICIAL_GEM_SUBCATEGORIES.filter((s) =>
      `${s.name} ${s.category} ${s.id}`.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery]);

  // Combined curated services (30 verified GeM services) filtered by chip & search query
  const allCuratedServices = useMemo(
    () => [...OFFICIAL_TRENDING_SERVICES, ...OFFICIAL_EMERGING_SERVICES],
    []
  );

  const filteredCuratedServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allCuratedServices.filter((s) => {
      const matchesFilter =
        serviceFilter === 'Popular' ||
        serviceFilter === 'All Live' ||
        (serviceFilter === 'Manpower' && /manpower|security/i.test(`${s.category} ${s.name}`)) ||
        (serviceFilter === 'Vehicles' && /vehicle|cab|bus|van/i.test(`${s.category} ${s.name}`)) ||
        (serviceFilter === 'IT & AMC' && /ict|amc|maintenance|data|telecom/i.test(`${s.category} ${s.name}`)) ||
        (serviceFilter === 'Facility' && /facility|sanitation|cleaning|hvac/i.test(`${s.category} ${s.name}`)) ||
        (serviceFilter === 'Printing' && /printing|photocopier/i.test(`${s.category} ${s.name}`)) ||
        (serviceFilter === 'Catering' && /catering|canteen|pantry/i.test(`${s.category} ${s.name}`)) ||
        (serviceFilter === 'Logistics' && /logistics|transport|record/i.test(`${s.category} ${s.name}`));

      if (!matchesFilter) return false;
      if (!q) return true;
      return `${s.name} ${s.category} ${s.gfrMode}`.toLowerCase().includes(q);
    });
  }, [allCuratedServices, serviceFilter, searchQuery]);

  const filteredLiveDirectoryServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return liveDirectoryServices;
    return liveDirectoryServices.filter((s) =>
      `${s.displayName} ${s.description}`.toLowerCase().includes(q)
    );
  }, [liveDirectoryServices, searchQuery]);

  // ==========================================
  // RENDER: 2-COLUMN LIVE PRODUCT CARD
  // ==========================================
  const renderProductGridItem = ({ item }: { item: MarketplaceItem }) => {
    const qty = cart[item.id] || 0;
    const isSaved = savedItemIds.has(item.id);

    return (
      <Pressable
        style={[styles.gridProductCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        unstable_pressDelay={0}
        onPress={() => setSelectedItem(item)}
      >
        <View style={[styles.gridImageContainer, { backgroundColor: colors.surfaceSubtle }]}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.gridProductImage} resizeMode="cover" />
          ) : (
            <View style={styles.gridThumbFallback}>
              <Text style={[styles.gridThumbLabel, { color: colors.textMuted }]}>GeM</Text>
            </View>
          )}

          {item.discountPercent ? (
            <View style={styles.gridDiscountBadge}>
              <Text style={styles.gridDiscountBadgeText}>{item.discountPercent}% OFF</Text>
            </View>
          ) : null}

          <Pressable
            style={styles.saveCornerBtn}
            unstable_pressDelay={0}
            hitSlop={8}
            onPress={() => toggleSaveItem(item.id)}
            accessibilityLabel="Bookmark product"
          >
            <Text style={[styles.saveCornerText, { color: isSaved ? '#0B3B60' : '#64748B' }]}>
              {isSaved ? '★' : '☆'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.gridCardContent}>
          <View style={styles.gridMetaRow}>
            <Text style={[styles.gridBrandText, { color: colors.primary }]} numberOfLines={1}>
              {item.oemBrand}
            </Text>
            <Text style={[styles.gridSellerTag, { color: colors.textMuted }]} numberOfLines={1}>
              {item.specSummary?.['Seller Type'] || 'Seller'}
            </Text>
          </View>

          <Text
            style={[styles.gridTitleText, { color: colors.textPrimary, fontSize: 12.5 * fontMultiplier }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          <Text style={[styles.gridMoqText, { color: colors.textMuted }]} numberOfLines={1}>
            MOQ {item.minOrderQty || 1} · {item.priceUnit || 'per Unit'}
          </Text>

          <View style={styles.gridPriceRow}>
            <Text style={[styles.gridL1Price, { color: colors.textPrimary, fontSize: 14.5 * fontMultiplier }]}>
              ₹{formatInr(item.l1PriceInr)}
            </Text>
            {item.mrpInr && item.mrpInr > item.l1PriceInr ? (
              <Text style={[styles.gridMrpPrice, { color: colors.textMuted }]}>
                ₹{formatInr(item.mrpInr)}
              </Text>
            ) : null}
          </View>

          {qty === 0 ? (
            <Pressable
              style={[styles.gridAddBtn, { borderColor: colors.primary }]}
              unstable_pressDelay={0}
              hitSlop={4}
              onPress={() => updateCartQty(item.id, 1)}
            >
              <Text style={[styles.gridAddBtnText, { color: colors.primary }]}>+ Shortlist</Text>
            </Pressable>
          ) : (
            <View style={[styles.gridStepperBox, { backgroundColor: colors.primary }]}>
              <Pressable style={styles.gridStepperBtn} hitSlop={6} onPress={() => updateCartQty(item.id, -1)}>
                <Text style={styles.gridStepperSymbol}>−</Text>
              </Pressable>
              <Text style={styles.gridStepperQty}>{qty}</Text>
              <Pressable style={styles.gridStepperBtn} hitSlop={6} onPress={() => updateCartQty(item.id, 1)}>
                <Text style={styles.gridStepperSymbol}>+</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  // ==========================================
  // RENDER: PRODUCT GRID HEADER
  // ==========================================
  const renderProductGridHeader = () => (
    <View style={styles.productGridHeaderWrapper}>
      <View style={styles.topNavBar}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          unstable_pressDelay={0}
          hitSlop={8}
          onPress={() => setBrowseView('categories')}
        >
          <Text style={[styles.backBtnIcon, { color: colors.primary }]}>←</Text>
        </Pressable>

        <View style={styles.headerTitleBox}>
          <Text style={[styles.navCatTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {selectedSubcategoryName || selectedCategory}
          </Text>
          <Text style={[styles.navSubTitle, { color: colors.textSecondary }]}>
            {filteredProducts.length}
            {hasMorePages ? '+' : ''}{' '}
            {catalogSource === 'LIVE_PORTAL'
              ? 'live listings · mkp.gem.gov.in'
              : catalogSource === 'CACHED_CATALOG'
                ? 'cached listings · verify on GeM'
                : 'listings'}
          </Text>
        </View>

        <Pressable
          style={[styles.filterActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          unstable_pressDelay={0}
          hitSlop={8}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={[styles.filterActionText, { color: colors.textPrimary }]}>
            {filterBrand !== 'ALL' ? 'Filter •' : 'Filter'}
          </Text>
        </Pressable>
      </View>

      {availableSubcategories.length > 1 && !activeProductQuery ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subCatScroll}
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
      ) : null}

      {/* Compact collapsible GFR 149 Reference */}
      <View style={[styles.gfrAccordion, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable
          style={styles.gfrHeaderPressable}
          hitSlop={6}
          onPress={() => setIsGfrExpanded((prev) => !prev)}
        >
          <Text style={[styles.gfrTitleText, { color: colors.textSecondary }]}>
            GFR 149 Threshold Calculator
          </Text>
          <Text style={[styles.gfrChevron, { color: colors.textMuted }]}>
            {isGfrExpanded ? 'Hide' : 'Show'}
          </Text>
        </Pressable>

        {isGfrExpanded && (
          <View style={[styles.gfrContent, { borderTopColor: colors.borderSubtle }]}>
            <View style={styles.gfrPillRow}>
              {[25000, 150000, 750000].map((v) => (
                <CompactChip
                  key={v}
                  label={`₹${formatInr(v)}`}
                  selected={gfrOrderValue === v}
                  onPress={() => setGfrOrderValue(v)}
                />
              ))}
            </View>
            <View style={[styles.gfrResultCard, { backgroundColor: colors.surfaceSubtle }]}>
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
  // RENDER: REDESIGNED CATALOG EXPLORER
  // ==========================================
  const renderCatalogExplorer = () => (
    <View style={[styles.explorerRoot, { backgroundColor: colors.background }]}>
      {/* Clean Search + Underline Tabs Header */}
      <View style={[styles.explorerHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={
            activeTypeTab === 'Products'
              ? 'Search products, brands or categories on GeM...'
              : 'Search 380+ GeM services (e.g. Manpower, Cab, AMC)...'
          }
          onSubmit={() => {
            if (activeTypeTab === 'Products' && searchQuery.trim()) {
              runLiveProductSearch(searchQuery);
            }
          }}
        />

        <View style={styles.underlineTabsRow}>
          {(['Products', 'Services'] as const).map((tab) => {
            const active = activeTypeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTypeTab(tab)}
                style={[styles.underlineTab, active && styles.underlineTabActive]}
              >
                <Text
                  style={[
                    styles.underlineTabText,
                    { color: active ? '#0B3B60' : colors.textSecondary },
                    active && styles.underlineTabTextActive,
                  ]}
                >
                  {tab === 'Services' && liveDirectoryTotal > 0
                    ? `Services (${liveDirectoryTotal})`
                    : tab}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* PRODUCTS TAB: Split-Pane Department Rail + Clean Subcategory Canvas */}
      {activeTypeTab === 'Products' ? (
        searchQuery.trim().length > 0 ? (
          <ScrollView style={styles.searchResultsScroll} contentContainerStyle={styles.searchResultsContent}>
            <Pressable
              style={styles.liveSearchRow}
              onPress={() => runLiveProductSearch(searchQuery)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.liveSearchTitle}>
                  Search live on GeM for &quot;{searchQuery.trim()}&quot;
                </Text>
                <Text style={styles.liveSearchSub}>
                  Queries mkp.gem.gov.in directly and resolves matching catalog categories
                </Text>
              </View>
              <Text style={styles.liveSearchArrow}>→</Text>
            </Pressable>

            {matchingSubcategories.length > 0 ? (
              <View style={[styles.suggestBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.suggestHeading, { color: colors.textMuted }]}>MATCHING CATEGORIES</Text>
                {matchingSubcategories.map((sub, idx) => (
                  <Pressable
                    key={sub.id}
                    style={[
                      styles.suggestRow,
                      idx > 0 && { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
                    ]}
                    onPress={() => openSubcategory(sub.category, sub.slug, sub.name)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.suggestName, { color: colors.textPrimary }]}>{sub.name}</Text>
                      <Text style={[styles.suggestCat, { color: colors.textSecondary }]}>{sub.category}</Text>
                    </View>
                    <Text style={[styles.suggestChevron, { color: colors.textMuted }]}>›</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </ScrollView>
        ) : (
          <View style={styles.splitPane}>
            {/* Left Vertical Department Rail */}
            <ScrollView
              style={[styles.leftRail, { backgroundColor: colors.surfaceSubtle, borderRightColor: colors.border }]}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: totalCartCount > 0 ? 90 : 24 }}
            >
              {OFFICIAL_PRODUCT_CATEGORIES.map((dept) => {
                const isSelected = dept.id === activeDept.id;
                const shortName = DEPT_SHORT_LABELS[dept.id] || dept.name;
                return (
                  <Pressable
                    key={dept.id}
                    onPress={() => setSelectedDeptId(dept.id)}
                    style={[
                      styles.railItem,
                      isSelected && [styles.railItemActive, { backgroundColor: colors.surface }],
                    ]}
                  >
                    {isSelected ? <View style={styles.railActiveBar} /> : null}
                    <View
                      style={[
                        styles.railCodeBox,
                        {
                          backgroundColor: isSelected ? '#0B3B60' : colors.surface,
                          borderColor: isSelected ? '#0B3B60' : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.railCodeText, { color: isSelected ? '#FFFFFF' : colors.textSecondary }]}>
                        {dept.shortCode || dept.icon}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.railLabel,
                        { color: isSelected ? '#0B3B60' : colors.textSecondary },
                        isSelected && styles.railLabelActive,
                      ]}
                      numberOfLines={2}
                    >
                      {shortName}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Right Subcategory Showcase Panel */}
            <ScrollView
              style={[styles.rightCanvas, { backgroundColor: colors.surface }]}
              contentContainerStyle={[styles.rightCanvasContent, totalCartCount > 0 && { paddingBottom: 96 }]}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.deptHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deptTitle, { color: colors.textPrimary }]}>{activeDept.name}</Text>
                  <Text style={[styles.deptMeta, { color: colors.textSecondary }]}>
                    {activeDeptSubcategories.length} live GeM categories
                  </Text>
                </View>
                <Pressable
                  style={styles.deptBrowseAllBtn}
                  onPress={() => openSubcategory(activeDept.name)}
                >
                  <Text style={styles.deptBrowseAllText}>View all ›</Text>
                </Pressable>
              </View>

              {/* Verified Live Subcategory Grid */}
              <View style={styles.subGrid}>
                {activeDeptSubcategories.map((sub) => (
                  <Pressable
                    key={sub.id}
                    style={({ pressed }) => [
                      styles.subTile,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: colors.border,
                        opacity: pressed ? 0.78 : 1,
                      },
                    ]}
                    onPress={() => openSubcategory(sub.category, sub.slug, sub.name)}
                  >
                    <Text style={[styles.subTileName, { color: colors.textPrimary }]} numberOfLines={2}>
                      {sub.name}
                    </Text>
                    <View style={styles.subTileFooter}>
                      <Text style={[styles.subTileUnit, { color: colors.textMuted }]} numberOfLines={1}>
                        {sub.priceUnit}
                      </Text>
                      <Text style={styles.subTileArrow}>›</Text>
                    </View>
                  </Pressable>
                ))}
              </View>

              {/* Direct GeM Outlet Stores Strip */}
              <View style={[styles.outletsBlock, { borderTopColor: colors.borderSubtle }]}>
                <Text style={[styles.outletsHeading, { color: colors.textMuted }]}>SPECIAL GeM OUTLETS</Text>
                <View style={styles.outletsWrap}>
                  {OFFICIAL_OUTLET_STORES.map((store) => (
                    <Pressable
                      key={store.id}
                      style={[styles.outletChip, { borderColor: colors.border, backgroundColor: colors.surface }]}
                      onPress={() => runLiveProductSearch(store.name)}
                    >
                      <View style={[styles.outletDot, { backgroundColor: store.accentColor }]} />
                      <Text style={[styles.outletChipText, { color: colors.textPrimary }]}>{store.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        )
      ) : (
        /* SERVICES TAB: Real Live GeM Services Explorer (Zero Website Redirects) */
        <View style={{ flex: 1 }}>
          <View style={[styles.serviceFilterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serviceChipsRow}>
              {SERVICE_FILTER_CHIPS.map((chip) => {
                const label =
                  chip === 'All Live' && liveDirectoryTotal > 0
                    ? `All Live (${liveDirectoryTotal})`
                    : chip;
                return (
                  <CompactChip
                    key={chip}
                    label={label}
                    selected={serviceFilter === chip}
                    onPress={() => setServiceFilter(chip)}
                  />
                );
              })}
            </ScrollView>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.servicesListContent, totalCartCount > 0 && { paddingBottom: 96 }]}
            showsVerticalScrollIndicator={false}
          >
            {serviceFilter === 'All Live' ? (
              isLoadingServicesDir ? (
                <View style={styles.servicesLoader}>
                  <ActivityIndicator size="large" color="#0B3B60" />
                  <Text style={[styles.servicesLoaderTitle, { color: colors.textPrimary }]}>
                    Loading live GeM services…
                  </Text>
                  <Text style={[styles.servicesLoaderSub, { color: colors.textSecondary }]}>
                    Connecting directly to mkp.gem.gov.in services directory
                  </Text>
                </View>
              ) : filteredLiveDirectoryServices.length === 0 ? (
                <View style={styles.servicesLoader}>
                  <Text style={[styles.servicesLoaderTitle, { color: colors.textPrimary }]}>
                    No services matched &quot;{searchQuery}&quot;
                  </Text>
                  <SecondaryButton
                    label="Show Popular Services"
                    onPress={() => {
                      setSearchQuery('');
                      setServiceFilter('Popular');
                    }}
                    style={{ marginTop: 12 }}
                  />
                </View>
              ) : (
                <>
                  {filteredLiveDirectoryServices.map((srv) => (
                    <Pressable
                      key={srv.id}
                      style={({ pressed }) => [
                        styles.liveServiceRow,
                        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
                      ]}
                      onPress={() => openServiceDetail(srv)}
                    >
                      {srv.imageUrl ? (
                        <Image source={{ uri: srv.imageUrl }} style={styles.liveServiceThumb} resizeMode="cover" />
                      ) : (
                        <View style={[styles.liveServiceThumbFallback, { backgroundColor: colors.surfaceSubtle }]}>
                          <Text style={styles.liveServiceThumbCode}>SRV</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.serviceRowTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                          {srv.displayName}
                        </Text>
                        {srv.description ? (
                          <Text style={[styles.liveServiceDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                            {srv.description}
                          </Text>
                        ) : null}
                        <Text style={styles.serviceOpenCue}>Providers · Live Tenders · SLA ›</Text>
                      </View>
                    </Pressable>
                  ))}

                  {liveDirectoryHasMore && !searchQuery.trim() ? (
                    <SecondaryButton
                      label={isLoadingMoreServices ? 'Loading more services...' : 'Load More GeM Services'}
                      onPress={() => loadLiveServicesDirectory(liveDirectoryPage + 1, true)}
                      disabled={isLoadingMoreServices}
                      style={{ marginTop: 6, marginBottom: 14 }}
                    />
                  ) : null}
                </>
              )
            ) : filteredCuratedServices.length === 0 ? (
              <View style={styles.servicesLoader}>
                <Text style={[styles.servicesLoaderTitle, { color: colors.textPrimary }]}>
                  No matching services in {serviceFilter}
                </Text>
                <SecondaryButton
                  label="Browse All Live GeM Services"
                  onPress={() => setServiceFilter('All Live')}
                  style={{ marginTop: 12 }}
                />
              </View>
            ) : (
              filteredCuratedServices.map((srv) => (
                <Pressable
                  key={srv.id}
                  style={({ pressed }) => [
                    styles.serviceRowCard,
                    { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
                  ]}
                  onPress={() => openServiceDetail(srv)}
                >
                  <View style={[styles.serviceCodeBadge, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <Text style={styles.serviceCodeText}>{srv.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.serviceRowMeta}>
                      <Text style={[styles.serviceDomainText, { color: colors.primary }]} numberOfLines={1}>
                        {srv.category}
                      </Text>
                      <Text style={[styles.serviceGfrChip, { color: colors.textMuted }]} numberOfLines={1}>
                        {srv.gfrMode}
                      </Text>
                    </View>
                    <Text style={[styles.serviceRowTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                      {srv.name}
                    </Text>
                    <Text style={styles.serviceOpenCue}>View Providers, Live Tenders &amp; SLA ›</Text>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {browseView === 'categories' ? (
        renderCatalogExplorer()
      ) : (
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
                <Text style={{ marginTop: 6, fontSize: 12, color: colors.textSecondary }}>
                  Loading page {currentPage + 1} from mkp.gem.gov.in…
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary, marginTop: 14 }]}>
                  Fetching live GeM products…
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Streaming verified seller listings directly from mkp.gem.gov.in
                </Text>
              </View>
            ) : isOffline ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Internet Connection</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Connect to mobile data or Wi-Fi and retry to fetch live seller listings.
                </Text>
                <PrimaryButton label="Retry" onPress={loadLiveProducts} style={{ marginTop: 14 }} />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No live listings found</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Try another search keyword or switch subcategory above.
                </Text>
                <SecondaryButton
                  label="Back to Categories"
                  onPress={() => setBrowseView('categories')}
                  style={{ marginTop: 14 }}
                />
              </View>
            )
          }
        />
      )}

      {/* Floating Shortlist Summary Bar */}
      {totalCartCount > 0 && (
        <View style={[styles.floatingCartBar, { backgroundColor: '#0B3B60' }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cartBarCount}>
              {totalCartCount} {totalCartCount === 1 ? 'item' : 'items'} shortlisted
            </Text>
            <Text style={styles.cartBarPrice}>Est. ₹{formatInr(totalCartPrice)} (excl. GST)</Text>
          </View>
          <Pressable
            style={styles.cartBarActionBtn}
            unstable_pressDelay={0}
            hitSlop={8}
            onPress={() => setShowCartModal(true)}
          >
            <Text style={styles.cartBarActionText}>GFR Summary →</Text>
          </Pressable>
        </View>
      )}

      {/* Shortlist & GFR 149 Summary Modal (honest portal handoff) */}
      <Modal
        visible={showCartModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCartModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowCartModal(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Procurement Shortlist ({totalCartCount})
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                  GFR Rule 149 Estimate · Final ordering happens on GeM
                </Text>
              </View>
              <Pressable onPress={() => setShowCartModal(false)} hitSlop={10}>
                <Text style={[styles.modalCloseText, { color: colors.textMuted }]}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.cartScrollList} showsVerticalScrollIndicator={false}>
              {Object.entries(cart).map(([itemId, qty]) => {
                const item = itemsList.find((x) => x.id === itemId) || allCatalogItems.find((x) => x.id === itemId);
                if (!item) return null;
                return (
                  <View key={itemId} style={[styles.cartItemRow, { borderBottomColor: colors.borderSubtle }]}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={[styles.cartItemTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.cartItemPrice, { color: colors.primary }]}>
                        ₹{formatInr(item.l1PriceInr)} × {qty} = ₹{formatInr(item.l1PriceInr * qty)}
                      </Text>
                    </View>
                    <View style={[styles.gridStepperBox, { backgroundColor: '#0B3B60', width: 92 }]}>
                      <Pressable style={styles.gridStepperBtn} hitSlop={6} onPress={() => updateCartQty(item.id, -1)}>
                        <Text style={styles.gridStepperSymbol}>−</Text>
                      </Pressable>
                      <Text style={styles.gridStepperQty}>{qty}</Text>
                      <Pressable style={styles.gridStepperBtn} hitSlop={6} onPress={() => updateCartQty(item.id, 1)}>
                        <Text style={styles.gridStepperSymbol}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}

              <View style={[styles.cartGfrCard, { backgroundColor: colors.surfaceSubtle }]}>
                <Text style={[styles.cartGfrTitle, { color: colors.primary }]}>{cartGfrStatus.description}</Text>
                <Text style={[styles.cartGfrText, { color: colors.textSecondary }]}>
                  {cartGfrStatus.mandatoryRequirement}
                </Text>
              </View>

              <View style={styles.billBox}>
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Items Subtotal</Text>
                  <Text style={[styles.billVal, { color: colors.textPrimary }]}>₹{formatInr(totalCartPrice)}</Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Estimated GST (18%)</Text>
                  <Text style={[styles.billVal, { color: colors.textPrimary }]}>
                    ₹{formatInr(Math.round(totalCartPrice * 0.18))}
                  </Text>
                </View>
                <View style={[styles.billRow, styles.billTotalRow, { borderTopColor: colors.borderSubtle }]}>
                  <Text style={[styles.billTotalLabel, { color: colors.textPrimary }]}>Estimated Total</Text>
                  <Text style={[styles.billTotalVal, { color: colors.primary }]}>
                    ₹{formatInr(Math.round(totalCartPrice * 1.18))}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.cartFooter}>
              <PrimaryButton
                label="Continue on Official GeM Portal ↗"
                onPress={() => {
                  setShowCartModal(false);
                  handleOpenGemPortal();
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Brand Filter Sheet */}
      <FilterBottomSheetModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filter by OEM / Brand"
        onReset={() => setFilterBrand('ALL')}
        onApply={() => setShowFilterModal(false)}
      >
        <View style={styles.sheetPillWrap}>
          {availableBrands.map((b) => (
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

      {/* Live Product Detail Modal */}
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
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                  {selectedItem.title}
                </Text>
                <Pressable onPress={() => setSelectedItem(null)} hitSlop={10}>
                  <Text style={[styles.modalCloseText, { color: colors.textMuted }]}>✕</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {selectedItem.imageUrl ? (
                  <Image
                    source={{ uri: selectedItem.imageUrl }}
                    style={styles.modalProductHeroImg}
                    resizeMode="contain"
                  />
                ) : null}

                <View style={styles.modalPriceBox}>
                  <Text style={[styles.modalPrice, { color: colors.primary }]}>
                    ₹{formatInr(selectedItem.l1PriceInr)}
                  </Text>
                  <Text style={[styles.modalUnit, { color: colors.textSecondary }]}>
                    {selectedItem.priceUnit || 'per Unit'} · Min Order: {selectedItem.minOrderQty ?? 1}
                  </Text>
                </View>

                <Text style={[styles.modalSecHeader, { color: colors.textPrimary }]}>Published Details</Text>
                {Object.entries(selectedItem.specSummary || {}).map(([k, v]) => (
                  <View key={k} style={[styles.specRowDetail, { borderBottomColor: colors.borderSubtle }]}>
                    <Text style={[styles.specKey, { color: colors.textSecondary }]}>{k}</Text>
                    <Text style={[styles.specVal, { color: colors.textPrimary }]}>{v}</Text>
                  </View>
                ))}
              </ScrollView>

              <View style={[styles.modalFooter, { borderTopColor: colors.borderSubtle }]}>
                <SecondaryButton
                  label="Open on GeM ↗"
                  onPress={() => handleOpenGemPortal(selectedItem)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <PrimaryButton
                  label={cart[selectedItem.id] ? `Shortlisted (${cart[selectedItem.id]})` : 'Add to Shortlist'}
                  onPress={() => {
                    updateCartQty(selectedItem.id, 1);
                    setSelectedItem(null);
                  }}
                  style={{ flex: 1.3 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Full-Screen Live In-App Service Explorer (Providers, Live Tenders, Specs & SLA) */}
      <ServiceDetailModal
        service={activeService}
        visible={Boolean(activeService)}
        onClose={() => setActiveService(null)}
        onPrepareDocuments={onPrepareDocuments}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  explorerRoot: { flex: 1 },
  explorerHeader: {
    paddingHorizontal: 14,
    paddingTop: 12,
    borderBottomWidth: 1,
  },
  underlineTabsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  underlineTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  underlineTabActive: {
    borderBottomColor: '#0B3B60',
  },
  underlineTabText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  underlineTabTextActive: {
    fontWeight: '800',
  },
  // Split-Pane Products Category Explorer
  splitPane: {
    flex: 1,
    flexDirection: 'row',
  },
  leftRail: {
    width: 92,
    borderRightWidth: 1,
  },
  railItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 6,
    position: 'relative',
  },
  railItemActive: {},
  railActiveBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    backgroundColor: '#0B3B60',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  railCodeBox: {
    width: 36,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  railCodeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  railLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
  },
  railLabelActive: {
    fontWeight: '800',
  },
  rightCanvas: {
    flex: 1,
  },
  rightCanvasContent: {
    padding: 14,
    paddingBottom: 32,
  },
  deptHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  deptTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  deptMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  deptBrowseAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#EAF2F8',
  },
  deptBrowseAllText: {
    color: '#0B3B60',
    fontSize: 11.5,
    fontWeight: '800',
  },
  subGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  subTile: {
    width: '48.5%',
    borderRadius: 10,
    borderWidth: 1,
    padding: 11,
    minHeight: 82,
    justifyContent: 'space-between',
  },
  subTileName: {
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 17,
  },
  subTileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  subTileUnit: {
    fontSize: 10,
    flex: 1,
  },
  subTileArrow: {
    color: '#0B3B60',
    fontSize: 15,
    fontWeight: '800',
  },
  outletsBlock: {
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  outletsHeading: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  outletsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  outletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  outletDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  outletChipText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  // Search Suggestions
  searchResultsScroll: { flex: 1 },
  searchResultsContent: { padding: 14, paddingBottom: 32 },
  liveSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B3B60',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  liveSearchTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  liveSearchSub: { color: '#BFDBFE', fontSize: 11.5, marginTop: 2 },
  liveSearchArrow: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  suggestBlock: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  suggestHeading: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestName: { fontSize: 13.5, fontWeight: '700' },
  suggestCat: { fontSize: 11.5, marginTop: 2 },
  suggestChevron: { fontSize: 18, fontWeight: '700' },
  // Services Explorer
  serviceFilterBar: {
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  serviceChipsRow: {
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  servicesListContent: {
    padding: 14,
    paddingBottom: 32,
  },
  servicesLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
  },
  servicesLoaderTitle: { fontSize: 15, fontWeight: '700', marginTop: 12 },
  servicesLoaderSub: { fontSize: 12, marginTop: 4, textAlign: 'center', maxWidth: 280 },
  serviceRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 9,
    gap: 12,
  },
  serviceCodeBadge: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceCodeText: {
    color: '#0B3B60',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  serviceRowMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
    gap: 8,
  },
  serviceDomainText: { fontSize: 10.5, fontWeight: '800', flex: 1 },
  serviceGfrChip: { fontSize: 10, fontWeight: '600' },
  serviceRowTitle: { fontSize: 13.5, fontWeight: '700', lineHeight: 18 },
  serviceOpenCue: { color: '#0B5577', fontSize: 11, fontWeight: '700', marginTop: 5 },
  liveServiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 11,
    marginBottom: 9,
    gap: 12,
  },
  liveServiceThumb: {
    width: 58,
    height: 58,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  liveServiceThumbFallback: {
    width: 58,
    height: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveServiceThumbCode: { color: '#0B3B60', fontSize: 11, fontWeight: '900' },
  liveServiceDesc: { fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  // 2-Column Live Product Grid
  productGridHeaderWrapper: {
    marginBottom: 10,
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnIcon: { fontSize: 19, fontWeight: '700' },
  headerTitleBox: { flex: 1 },
  navCatTitle: { fontSize: 15, fontWeight: '800' },
  navSubTitle: { fontSize: 11, marginTop: 1 },
  filterActionBtn: {
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterActionText: { fontSize: 12, fontWeight: '700' },
  subCatScroll: {
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  gfrAccordion: {
    borderRadius: 9,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gfrHeaderPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  gfrTitleText: { fontSize: 12, fontWeight: '700' },
  gfrChevron: { fontSize: 11, fontWeight: '700' },
  gfrContent: { padding: 12, borderTopWidth: 1 },
  gfrPillRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  gfrResultCard: { borderRadius: 8, padding: 10 },
  gfrRuleName: { fontSize: 12.5, fontWeight: '700', marginBottom: 2 },
  gfrRuleExplanation: { fontSize: 11.5, lineHeight: 16 },
  listContent: { padding: 12, paddingBottom: 40 },
  productRowWrapper: { justifyContent: 'space-between', marginBottom: 10 },
  gridProductCard: {
    width: '48.6%',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gridImageContainer: {
    height: 128,
    width: '100%',
    position: 'relative',
  },
  gridProductImage: { width: '100%', height: '100%' },
  gridThumbFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gridThumbLabel: { fontSize: 14, fontWeight: '800' },
  gridDiscountBadge: {
    position: 'absolute',
    top: 7,
    left: 7,
    backgroundColor: '#15803D',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  gridDiscountBadgeText: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '800' },
  saveCornerBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveCornerText: { fontSize: 14, fontWeight: '800' },
  gridCardContent: { padding: 9 },
  gridMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
    gap: 4,
  },
  gridBrandText: { fontSize: 10.5, fontWeight: '800', flex: 1 },
  gridSellerTag: { fontSize: 9.5, fontWeight: '600' },
  gridTitleText: { fontWeight: '600', lineHeight: 17, minHeight: 34, marginBottom: 4 },
  gridMoqText: { fontSize: 10, marginBottom: 6 },
  gridPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginBottom: 8 },
  gridL1Price: { fontWeight: '800' },
  gridMrpPrice: { fontSize: 10.5, textDecorationLine: 'line-through' },
  gridAddBtn: {
    borderWidth: 1,
    borderRadius: 7,
    paddingVertical: 7,
    alignItems: 'center',
  },
  gridAddBtnText: { fontSize: 11.5, fontWeight: '800' },
  gridStepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 7,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  gridStepperBtn: { paddingHorizontal: 6 },
  gridStepperSymbol: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  gridStepperQty: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 15, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  emptySubtitle: { fontSize: 12.5, textAlign: 'center', lineHeight: 18, maxWidth: 280 },
  floatingCartBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 6,
  },
  cartBarCount: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  cartBarPrice: { color: '#BFDBFE', fontSize: 11, marginTop: 1 },
  cartBarActionBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cartBarActionText: { color: '#0B3B60', fontSize: 12, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1 },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    maxHeight: '82%',
    paddingBottom: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  modalTitle: { fontSize: 15, fontWeight: '800', flex: 1 },
  modalCloseText: { fontSize: 18, fontWeight: '700' },
  modalBody: { paddingHorizontal: 16, maxHeight: 420 },
  modalProductHeroImg: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  modalPriceBox: { marginBottom: 12 },
  modalPrice: { fontSize: 20, fontWeight: '900' },
  modalUnit: { fontSize: 12, marginTop: 2 },
  modalSecHeader: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  specRowDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 10,
  },
  specKey: { fontSize: 12, fontWeight: '600' },
  specVal: { fontSize: 12, fontWeight: '700', textAlign: 'right', flex: 1 },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  cartScrollList: { paddingHorizontal: 16, maxHeight: 360 },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  cartItemTitle: { fontSize: 13, fontWeight: '700' },
  cartItemPrice: { fontSize: 11.5, fontWeight: '700', marginTop: 2 },
  cartGfrCard: { borderRadius: 8, padding: 10, marginTop: 12 },
  cartGfrTitle: { fontSize: 12.5, fontWeight: '800', marginBottom: 3 },
  cartGfrText: { fontSize: 11.5, lineHeight: 16 },
  billBox: { marginTop: 12, marginBottom: 10 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  billLabel: { fontSize: 12.5 },
  billVal: { fontSize: 12.5, fontWeight: '700' },
  billTotalRow: { borderTopWidth: 1, marginTop: 6, paddingTop: 8 },
  billTotalLabel: { fontSize: 14, fontWeight: '800' },
  billTotalVal: { fontSize: 15, fontWeight: '900' },
  cartFooter: { paddingHorizontal: 16, paddingTop: 10 },
  sheetPillWrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
