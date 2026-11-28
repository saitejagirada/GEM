/**
 * GeM Marketplace Screen — Visual Single-Screen Products Storefront & Live Services Hub
 *
 * 100% Direct Phone -> mkp.gem.gov.in / bidplus.gem.gov.in (zero custom backend):
 * - Products Tab: Visual horizontal category strip with real GeM product photos and
 *   plain everyday names, 1-tap subcategory pills right underneath, and an immediate
 *   2-column live GeM product grid with non-destructive pull-to-refresh, per-category
 *   session caching, and resilient Page 2+ pagination with explicit retry on timeout.
 * - Services Tab: Direct live GeM Services directory (380+ active services) + 30 official
 *   trending/emerging services mapped to real service IDs, opening the in-app Service Explorer.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
  Keyboard,
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
  type GeMServiceItem,
  type MarketplaceCategory,
  type MarketplaceStreamSource,
} from '../services/MarketplaceService';
import { OFFICIAL_GEM_SUBCATEGORIES, type GeMSubcategoryConfig } from '../services/GeMClientCrawler';
import {
  GeMServicesClient,
  type LiveGeMServiceSummary,
} from '../services/GeMServicesClient';
import { ServiceDetailModal, type ActiveServiceTarget } from './ServiceDetailModal';
import {
  ProductCompareModal,
  type CompareModalTab,
} from '../components/ProductCompareModal';
import type { DeconstructedBidDoc } from '../types/index';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/designTokens';
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
  | 'Security'
  | 'Vehicles'
  | 'IT & AMC'
  | 'Cleaning'
  | 'Catering'
  | 'Printing'
  | 'Logistics';

type SortOption = 'DEFAULT' | 'PRICE_ASC' | 'PRICE_DESC' | 'DISCOUNT';

interface CategoryVisualConfig {
  label: string;
  imageUrl: string;
  order: number;
}

interface ServiceCategoryVisual {
  id: ServiceFilterChip;
  label: string;
  imageUrl: string;
}

interface SessionScopeSnapshot {
  items: MarketplaceItem[];
  currentPage: number;
  totalPortalResults: number;
  hasMorePages: boolean;
  catalogSource: MarketplaceStreamSource;
}

// Module-level session caches so switching tabs away from Search & returning renders in 0ms
const MODULE_SESSION_CACHE = new Map<string, SessionScopeSnapshot>();
const MODULE_SEEN_ITEMS_BY_ID = new Map<string, MarketplaceItem>();
let MODULE_SERVICES_DIR_CACHE: { services: LiveGeMServiceSummary[]; total: number } | null = null;

/**
 * Live-verified real GeM service images (`assets-mkpbg.gem.gov.in`) for the
 * horizontal visual Services category strip.
 */
const SERVICE_CATEGORY_VISUALS: ServiceCategoryVisual[] = [
  {
    id: 'Popular',
    label: 'Popular',
    imageUrl:
      'https://assets-mkpbg.gem.gov.in/img/5116877/50/39/facilitymanagementservicemanpowerbased.jpg.90a54e5039.999x600x550.jpg',
  },
  {
    id: 'All Live',
    label: 'All Services',
    imageUrl:
      'https://assets-mkpbg.gem.gov.in/img/5116877/68/0a/whatsappimage20211213at11.23.42am.jpeg.cd5fa2680a.999x600x550.jpg',
  },
  {
    id: 'Manpower',
    label: 'Manpower',
    imageUrl:
      'https://assets-mkpbg.gem.gov.in/img/5116877/6a/50/minwageimage.jpg.4a46736a50.999x600x550.jpg',
  },
  {
    id: 'Security',
    label: 'Security',
    imageUrl:
      'https://assets-mkpbg.gem.gov.in/img/5116877/d1/d2/securitymanpowerserviceversion2.jpg.1f79c4d1d2.999x600x550.jpg',
  },
  {
    id: 'Vehicles',
    label: 'Vehicles',
    imageUrl:
      'https://assets-mkpbg.gem.gov.in/img/5116877/7a/c6/monthlybasiscabtaxihiringservices.jpg.35bd577ac6.999x600x550.jpg',
  },
  {
    id: 'IT & AMC',
    label: 'IT & AMC',
    imageUrl:
      'https://assets-mkpbg.gem.gov.in/img/5116877/d9/52/maintenanceimage.png.3ef821d952.999x600x550.jpg',
  },
  {
    id: 'Cleaning',
    label: 'Cleaning',
    imageUrl:
      'https://assets-mkpbg.gem.gov.in/img/5116877/a5/74/jpgcleaningsanitation.jpg.6a58dca574.999x600x550.jpg',
  },
  {
    id: 'Catering',
    label: 'Catering',
    imageUrl:
      'https://assets-mkpbg.gem.gov.in/img/5116877/10/57/canteenservicedurationbased.jpg.25ad861057.999x600x550.jpg',
  },
  {
    id: 'Printing',
    label: 'Printing',
    imageUrl:
      'https://assets-mkpbg.gem.gov.in/img/5116877/ff/d2/icon2.jpg.73777fffd2.999x600x550.jpg',
  },
  {
    id: 'Logistics',
    label: 'Logistics',
    imageUrl:
      'https://assets-mkpbg.gem.gov.in/img/5116877/fc/e1/goodstransportservicepertripbasedservice1.jpg.20238bfce1.999x600x550.jpg',
  },
];

/**
 * Live-verified real GeM catalog packshot URLs (`assets-mkpbg.gem.gov.in`)
 * paired with plain everyday labels so any buyer or seller recognizes
 * categories at a glance without decoding acronyms.
 */
const CATEGORY_VISUALS: Record<string, CategoryVisualConfig> = {
  'it-products': {
    label: 'Computers',
    imageUrl: 'https://assets-mkpbg.gem.gov.in/img/othe/3088134/52/17/01.jpeg.dc66355217.999xx.jpg',
    order: 1,
  },
  'medical-products': {
    label: 'Medical',
    imageUrl: 'https://assets-mkpbg.gem.gov.in/img/othe/9691306/d4/70/1.jpg.cd2ae5d470.999xx.jpg',
    order: 2,
  },
  furniture: {
    label: 'Furniture',
    imageUrl:
      'https://assets-mkpbg.gem.gov.in/img/othe/6407406/47/b5/download12.png.bc3624c775.999x420x4201.jpg.933f83b720.999x42.jpg.1f056fb932.999x420x4202.jpg.7d62dd3832.999x420x420.jpg.4ef5754304.999x420x4201.jpg.21be6d47b5.999xx.jpg',
    order: 3,
  },
  automobiles: {
    label: 'Vehicles',
    imageUrl: 'https://assets-mkpbg.gem.gov.in/img/othe/5018150/31/d7/1.jpg.d45ba531d7.999xx.jpg',
    order: 4,
  },
  'electronic-equipments': {
    label: 'ACs & TVs',
    imageUrl: 'https://assets-mkpbg.gem.gov.in/img/othe/7007238/c2/52/cia318txu1ps1.jpg.f1b8e3c252.999xx.jpg',
    order: 5,
  },
  'electrical-appliances': {
    label: 'Electrical',
    imageUrl: 'https://assets-mkpbg.gem.gov.in/img/othe/7748363/fc/fc/stl1.png.56c447fcfc.999xx.jpg',
    order: 6,
  },
  stationery: {
    label: 'Stationery',
    imageUrl: 'https://assets-mkpbg.gem.gov.in/img/othe/0165817/9d/25/maplithopaperinreel1copycopy.jpeg.d5bcaf9d25.999xx.jpg',
    order: 7,
  },
  'textile-products': {
    label: 'Textiles',
    imageUrl: 'https://assets-mkpbg.gem.gov.in/img/othe/7854802/05/b2/7777.jpeg.cf985705b2.999xx.jpg',
    order: 8,
  },
  'pipes-fittings': {
    label: 'Pipes',
    imageUrl: 'https://assets-mkpbg.gem.gov.in/img/othe/5206517/32/20/flowtoncpvcpipe1659356492181.jpg.e8020f3220.999xx.jpg',
    order: 9,
  },
};

const ORDERED_CATEGORIES: MarketplaceCategory[] = [...OFFICIAL_PRODUCT_CATEGORIES].sort(
  (a, b) => (CATEGORY_VISUALS[a.id]?.order ?? 99) - (CATEGORY_VISUALS[b.id]?.order ?? 99)
);

const DEFAULT_CATEGORY = ORDERED_CATEGORIES[0];
const DEFAULT_SUBCATEGORY =
  OFFICIAL_GEM_SUBCATEGORIES.find(
    (s) => s.category.toLowerCase() === DEFAULT_CATEGORY.name.toLowerCase()
  ) || OFFICIAL_GEM_SUBCATEGORIES[0];

// ==========================================
// MEMOIZED VISUAL CATEGORY TILE
// ==========================================
interface CategoryPhotoTileProps {
  dept: MarketplaceCategory;
  label: string;
  imageUrl?: string;
  selected: boolean;
  colors: ThemeColors;
  onSelect: (dept: MarketplaceCategory) => void;
}

const CategoryPhotoTile = React.memo<CategoryPhotoTileProps>(
  ({ dept, label, imageUrl, selected, colors, onSelect }) => {
    const [imgFailed, setImgFailed] = useState(false);

    return (
      <Pressable
        onPress={() => onSelect(dept)}
        unstable_pressDelay={0}
        accessibilityRole="button"
        accessibilityLabel={`Browse ${label}`}
        accessibilityState={{ selected }}
        style={({ pressed }) => [styles.catTile, pressed && { opacity: 0.78 }]}
      >
        <View
          style={[
            styles.catPhotoFrame,
            {
              backgroundColor: imgFailed ? colors.surfaceSubtle : '#FFFFFF',
              borderColor: selected ? colors.primary : colors.borderSubtle,
              borderWidth: selected ? 2 : 1,
            },
          ]}
        >
          {imageUrl && !imgFailed ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.catPhotoImg}
              resizeMode="contain"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <Text style={[styles.catFallbackText, { color: colors.primary }]}>
              {label.slice(0, 3).toUpperCase()}
            </Text>
          )}
        </View>
        <Text
          style={[
            styles.catTileLabel,
            { color: selected ? colors.primary : colors.textSecondary },
            selected && styles.catTileLabelActive,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {selected ? (
          <View style={[styles.catSelectedDot, { backgroundColor: colors.primary }]} />
        ) : (
          <View style={styles.catSelectedDotSpacer} />
        )}
      </Pressable>
    );
  }
);

// ==========================================
// MEMOIZED 2-COLUMN LIVE PRODUCT CARD
// ==========================================
interface ProductGridCardProps {
  item: MarketplaceItem;
  qty: number;
  isSaved: boolean;
  isCompared: boolean;
  colors: ThemeColors;
  fontMultiplier: number;
  onOpenDetail: (item: MarketplaceItem) => void;
  onToggleSave: (id: string) => void;
  onToggleCompare: (item: MarketplaceItem) => void;
  onUpdateQty: (id: string, delta: number) => void;
}

const ProductGridCard = React.memo<ProductGridCardProps>(
  ({
    item,
    qty,
    isSaved,
    isCompared,
    colors,
    fontMultiplier,
    onOpenDetail,
    onToggleSave,
    onToggleCompare,
    onUpdateQty,
  }) => {
    const sellerLabel = item.specSummary?.['Seller'];
    const sellerType = item.specSummary?.['Seller Type'] || 'Seller';

    return (
      <Pressable
        style={[
          styles.gridProductCard,
          { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
        ]}
        unstable_pressDelay={0}
        onPress={() => onOpenDetail(item)}
      >
        <View style={[styles.gridImageContainer, { borderBottomColor: colors.borderSubtle }]}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.gridProductImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.gridThumbFallback}>
              <Text style={[styles.gridThumbLabel, { color: colors.textMuted }]}>GeM</Text>
            </View>
          )}

          <View style={styles.gridBadgeStack}>
            {item.discountPercent ? (
              <View style={[styles.gridDiscountBadge, { backgroundColor: colors.emerald }]}>
                <Text style={styles.gridBadgeText}>{item.discountPercent}% OFF</Text>
              </View>
            ) : null}
            {item.badge === 'GeM L1' ? (
              <View style={[styles.gridL1Badge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.gridBadgeText, { color: colors.textInverse }]}>L1</Text>
              </View>
            ) : null}
          </View>

          <Pressable
            style={[styles.saveCornerBtn, { backgroundColor: colors.surface }]}
            unstable_pressDelay={0}
            hitSlop={8}
            onPress={() => onToggleSave(item.id)}
            accessibilityLabel={isSaved ? 'Remove bookmark' : 'Bookmark product'}
          >
            <Text style={[styles.saveCornerText, { color: isSaved ? colors.primary : colors.textSecondary }]}>
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
              {sellerType}
            </Text>
          </View>

          <Text
            style={[
              styles.gridTitleText,
              { color: colors.textPrimary, fontSize: 12.5 * fontMultiplier },
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          <View style={styles.gridPriceRow}>
            <Text
              style={[
                styles.gridL1Price,
                { color: colors.textPrimary, fontSize: 15 * fontMultiplier },
              ]}
            >
              ₹{formatInr(item.l1PriceInr)}
            </Text>
            {item.mrpInr && item.mrpInr > item.l1PriceInr ? (
              <Text style={[styles.gridMrpPrice, { color: colors.textMuted }]}>
                ₹{formatInr(item.mrpInr)}
              </Text>
            ) : null}
          </View>

          <Text style={[styles.gridMoqText, { color: colors.textMuted }]} numberOfLines={1}>
            {sellerLabel
              ? `${sellerLabel}`
              : `Min ${item.minOrderQty || 1} · ${item.priceUnit || 'per Unit'}`}
          </Text>

          {qty === 0 ? (
            <Pressable
              style={({ pressed }) => [
                styles.gridAddBtn,
                {
                  borderColor: colors.primary,
                  backgroundColor: pressed ? colors.primaryTint : 'transparent',
                },
              ]}
              unstable_pressDelay={0}
              hitSlop={4}
              onPress={() => onUpdateQty(item.id, 1)}
            >
              <Text style={[styles.gridAddBtnText, { color: colors.primary }]}>+ Shortlist</Text>
            </Pressable>
          ) : (
            <View style={[styles.gridStepperBox, { backgroundColor: colors.primary }]}>
              <Pressable
                style={styles.gridStepperBtn}
                hitSlop={6}
                onPress={() => onUpdateQty(item.id, -1)}
                accessibilityLabel="Decrease quantity"
              >
                <Text style={[styles.gridStepperSymbol, { color: colors.textInverse }]}>−</Text>
              </Pressable>
              <Text style={[styles.gridStepperQty, { color: colors.textInverse }]}>{qty}</Text>
              <Pressable
                style={styles.gridStepperBtn}
                hitSlop={6}
                onPress={() => onUpdateQty(item.id, 1)}
                accessibilityLabel="Increase quantity"
              >
                <Text style={[styles.gridStepperSymbol, { color: colors.textInverse }]}>+</Text>
              </Pressable>
            </View>
          )}

          <Pressable
            style={[
              styles.gridCompareBtn,
              {
                backgroundColor: isCompared ? colors.primaryTint : colors.surfaceSubtle,
                borderColor: isCompared ? colors.primary : colors.borderSubtle,
              },
            ]}
            unstable_pressDelay={0}
            hitSlop={4}
            onPress={() => onToggleCompare(item)}
            accessibilityLabel={isCompared ? 'Remove from OEM compare' : 'Add to OEM compare'}
          >
            <Text
              style={[
                styles.gridCompareBtnText,
                { color: isCompared ? colors.primary : colors.textSecondary },
              ]}
            >
              {isCompared ? '✓ Comparing' : '⇄ Compare OEM'}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    );
  }
);

// ==========================================
// MEMOIZED VISUAL SERVICE CATEGORY TILE & 2-COL CARD
// ==========================================
interface ServiceCategoryTileProps {
  config: ServiceCategoryVisual;
  selected: boolean;
  colors: ThemeColors;
  onSelect: (id: ServiceFilterChip) => void;
}

const ServiceCategoryTile = React.memo<ServiceCategoryTileProps>(
  ({ config, selected, colors, onSelect }) => {
    const [imgFailed, setImgFailed] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);
    return (
      <Pressable
        onPress={() => onSelect(config.id)}
        unstable_pressDelay={0}
        accessibilityRole="button"
        accessibilityLabel={`Browse ${config.label} services`}
        accessibilityState={{ selected }}
        style={({ pressed }) => [styles.catTile, pressed && { opacity: 0.78 }]}
      >
        <View
          style={[
            styles.srvCatPhotoFrame,
            {
              backgroundColor: imgFailed || !imgLoaded ? colors.surfaceSubtle : '#FFFFFF',
              borderColor: selected ? colors.primary : colors.borderSubtle,
              borderWidth: selected ? 2 : 1,
            },
          ]}
        >
          {(!imgLoaded || imgFailed) && (
            <View style={styles.srvPlaceholderOverlay}>
              <Text style={[styles.catFallbackText, { color: colors.primary }]}>
                {config.label.slice(0, 3).toUpperCase()}
              </Text>
            </View>
          )}
          {!imgFailed ? (
            <Image
              source={{ uri: config.imageUrl }}
              style={[styles.srvCatPhotoImg, !imgLoaded && { opacity: 0 }]}
              resizeMode="contain"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgFailed(true)}
            />
          ) : null}
        </View>
        <Text
          style={[
            styles.catTileLabel,
            { color: selected ? colors.primary : colors.textSecondary },
            selected && styles.catTileLabelActive,
          ]}
          numberOfLines={1}
        >
          {config.label}
        </Text>
        {selected ? (
          <View style={[styles.catSelectedDot, { backgroundColor: colors.primary }]} />
        ) : (
          <View style={styles.catSelectedDotSpacer} />
        )}
      </Pressable>
    );
  }
);

interface ServiceCardRecord {
  id: string;
  gemServiceId: string;
  title: string;
  subtitle: string;
  categoryTag: string;
  imageUrl?: string;
  gfrMode?: string;
  searchHint?: string;
}

interface ServiceGridCardProps {
  item: ServiceCardRecord;
  colors: ThemeColors;
  fontMultiplier: number;
  onOpen: (item: ServiceCardRecord) => void;
}

const ServiceGridCard = React.memo<ServiceGridCardProps>(
  ({ item, colors, fontMultiplier, onOpen }) => {
    const [imgFailed, setImgFailed] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.srvGridCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderSubtle,
            opacity: pressed ? 0.82 : 1,
          },
        ]}
        unstable_pressDelay={0}
        onPress={() => onOpen(item)}
      >
        <View
          style={[
            styles.srvImageBox,
            {
              backgroundColor: imgLoaded && !imgFailed ? '#FFFFFF' : colors.surfaceSubtle,
              borderBottomColor: colors.borderSubtle,
            },
          ]}
        >
          {(!imgLoaded || imgFailed || !item.imageUrl) && (
            <View style={styles.srvPlaceholderOverlay}>
              <View style={[styles.srvPlaceholderBadge, { backgroundColor: colors.primaryTint }]}>
                <Text style={[styles.srvPlaceholderBadgeText, { color: colors.primary }]}>
                  {item.categoryTag.slice(0, 3).toUpperCase()}
                </Text>
              </View>
            </View>
          )}
          {item.imageUrl && !imgFailed ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={[styles.srvCardImg, !imgLoaded && { opacity: 0 }]}
              resizeMode="contain"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgFailed(true)}
            />
          ) : null}
          <View style={[styles.srvTagOverlay, { backgroundColor: 'rgba(15, 23, 42, 0.72)' }]}>
            <Text style={styles.srvTagOverlayText} numberOfLines={1}>
              {item.categoryTag}
            </Text>
          </View>
        </View>

        <View style={styles.srvCardBody}>
          <Text
            style={[
              styles.srvCardTitle,
              { color: colors.textPrimary, fontSize: 12.5 * fontMultiplier },
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          <Text style={[styles.srvCardSub, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.subtitle}
          </Text>

          <View style={[styles.srvCardFooter, { backgroundColor: colors.primaryTint }]}>
            <Text style={[styles.srvCardFooterText, { color: colors.primary }]} numberOfLines={1}>
              Providers · Tenders ›
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }
);

// ==========================================
// MAIN MARKETPLACE SCREEN
// ==========================================
export const MarketplaceScreen: React.FC<MarketplaceScreenProps> = ({
  initialCategory,
  initialQuery,
  initialTypeTab,
  navTrigger,
  onPrepareDocuments,
}) => {
  const { colors, fontMultiplier, t } = useTheme();

  // Top-level tab: Products (default visual storefront) vs Services (380+ live directory)
  const [activeTypeTab, setActiveTypeTab] = useState<'Products' | 'Services'>('Products');

  // Active product scope (always shows live products immediately — no 2-step maze)
  const [selectedDeptId, setSelectedDeptId] = useState<string>(DEFAULT_CATEGORY.id);
  const [selectedCategory, setSelectedCategory] = useState<string>(DEFAULT_CATEGORY.name);
  const [selectedSubcategorySlug, setSelectedSubcategorySlug] = useState<string>(
    DEFAULT_SUBCATEGORY.slug
  );
  const [selectedSubcategoryName, setSelectedSubcategoryName] = useState<string>(
    DEFAULT_SUBCATEGORY.name
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState<boolean>(false);
  const [activeProductQuery, setActiveProductQuery] = useState<string>('');

  // Services explorer state (loads all 380+ live GeM services with real photos)
  const [serviceFilter, setServiceFilter] = useState<ServiceFilterChip>('Popular');
  const [liveDirectoryServices, setLiveDirectoryServices] = useState<LiveGeMServiceSummary[]>(
    () => MODULE_SERVICES_DIR_CACHE?.services || []
  );
  const [liveDirectoryTotal, setLiveDirectoryTotal] = useState<number>(
    () => MODULE_SERVICES_DIR_CACHE?.total || 0
  );
  const [visibleServicesLimit, setVisibleServicesLimit] = useState<number>(24);
  const [isLoadingServicesDir, setIsLoadingServicesDir] = useState<boolean>(false);
  const [isRefreshingServices, setIsRefreshingServices] = useState<boolean>(false);
  const [activeService, setActiveService] = useState<ActiveServiceTarget | null>(null);

  // Product detail, shortlist, sort & brand filter state
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<Record<string, number>>({});
  const [compareItems, setCompareItems] = useState<MarketplaceItem[]>([]);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [compareInitialTab, setCompareInitialTab] = useState<CompareModalTab>('COMPARE');
  const [showCartModal, setShowCartModal] = useState<boolean>(false);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [filterBrand, setFilterBrand] = useState<string>('ALL');
  const [sortOption, setSortOption] = useState<SortOption>('DEFAULT');

  // Seed initial state immediately from module session cache when returning to Search tab
  const initialDefaultSnap = MODULE_SESSION_CACHE.get(`slug:${DEFAULT_SUBCATEGORY.slug}`);

  // Live product stream state
  const [itemsList, setItemsList] = useState<MarketplaceItem[]>(() => initialDefaultSnap?.items || []);
  const [isPullRefreshing, setIsPullRefreshing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(() => !(initialDefaultSnap && initialDefaultSnap.items.length > 0));
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [catalogSource, setCatalogSource] = useState<MarketplaceStreamSource>(
    () => initialDefaultSnap?.catalogSource || 'EMPTY'
  );
  const [currentPage, setCurrentPage] = useState<number>(() => initialDefaultSnap?.currentPage || 1);
  const [totalPortalResults, setTotalPortalResults] = useState<number>(
    () => initialDefaultSnap?.totalPortalResults || 0
  );
  const [hasMorePages, setHasMorePages] = useState<boolean>(() => initialDefaultSnap?.hasMorePages || false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  // Refs backed by module-level caches for instant 0ms tab switching
  const itemsListRef = useRef<MarketplaceItem[]>(initialDefaultSnap?.items || []);
  const requestSequence = useRef(0);
  const loadMoreLockRef = useRef(false);
  const sessionCacheRef = useRef<Map<string, SessionScopeSnapshot>>(MODULE_SESSION_CACHE);
  const seenItemsByIdRef = useRef<Map<string, MarketplaceItem>>(MODULE_SEEN_ITEMS_BY_ID);

  const currentScopeKey = useMemo(
    () =>
      activeProductQuery
        ? `q:${activeProductQuery.trim().toLowerCase()}`
        : `slug:${selectedSubcategorySlug || selectedCategory.toLowerCase()}`,
    [activeProductQuery, selectedSubcategorySlug, selectedCategory]
  );

  // Subcategories shown right under the visual category strip
  const availableSubcategories = useMemo(
    () =>
      OFFICIAL_GEM_SUBCATEGORIES.filter(
        (s) =>
          s.category.toLowerCase() === selectedCategory.toLowerCase() ||
          selectedCategory.toLowerCase().includes(s.category.toLowerCase())
      ),
    [selectedCategory]
  );

  // Hardware BackHandler
  useEffect(() => {
    const onBackPress = () => {
      if (showCompareModal) {
        setShowCompareModal(false);
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
      if (activeService) {
        setActiveService(null);
        return true;
      }
      if (showFilterModal) {
        setShowFilterModal(false);
        return true;
      }
      if (showSearchSuggestions) {
        setShowSearchSuggestions(false);
        Keyboard.dismiss();
        return true;
      }
      if (activeProductQuery) {
        setActiveProductQuery('');
        setSearchQuery('');
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [
    showCompareModal,
    showCartModal,
    selectedItem,
    activeService,
    showFilterModal,
    showSearchSuggestions,
    activeProductQuery,
  ]);

  const compareIds = useMemo(() => new Set(compareItems.map((i) => i.id)), [compareItems]);

  const toggleCompareItem = useCallback((item: MarketplaceItem) => {
    setCompareItems((prev) => {
      if (prev.some((p) => p.id === item.id)) {
        return prev.filter((p) => p.id !== item.id);
      }
      if (prev.length >= 3) {
        Alert.alert(
          'Compare limit reached',
          'You can compare up to 3 live GeM products side-by-side. Remove one to add another.'
        );
        return prev;
      }
      return [...prev, item];
    });
  }, []);

  const openCompareModal = useCallback((initialTab: CompareModalTab = 'COMPARE') => {
    setCompareInitialTab(initialTab);
    setShowCompareModal(true);
  }, []);

  // Load full live GeM services directory (380+ services with real photos)
  const loadLiveServicesDirectory = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setIsRefreshingServices(true);
    else setIsLoadingServicesDir(true);
    try {
      const res = await GeMServicesClient.fetchAllLiveServices(forceRefresh);
      MODULE_SERVICES_DIR_CACHE = { services: res.services, total: res.total };
      setLiveDirectoryTotal(res.total);
      setLiveDirectoryServices(res.services);
    } finally {
      setIsLoadingServicesDir(false);
      setIsRefreshingServices(false);
    }
  }, []);

  useEffect(() => {
    if (
      activeTypeTab === 'Services' &&
      liveDirectoryServices.length === 0 &&
      !isLoadingServicesDir
    ) {
      loadLiveServicesDirectory(false);
    }
  }, [
    activeTypeTab,
    liveDirectoryServices.length,
    isLoadingServicesDir,
    loadLiveServicesDirectory,
  ]);

  const recordSeenItems = useCallback((items: MarketplaceItem[]) => {
    for (const it of items) {
      seenItemsByIdRef.current.set(it.id, it);
    }
  }, []);

  /**
   * Fetch live products directly from mkp.gem.gov.in.
   * - Session cache hit (when switching back to an already-browsed category): restores
   *   instantly with all loaded pages intact (0ms).
   * - Pull-to-refresh (`fromPullToRefresh === true`): refreshes live Page 1 updates at the
   *   top while preserving all already-loaded Page 2+ items, sort order, and brand filter.
   */
  const loadLiveProducts = useCallback(
    async (fromPullToRefresh: boolean = false, bypassSessionCache: boolean = false) => {
      const scopeKey = activeProductQuery
        ? `q:${activeProductQuery.trim().toLowerCase()}`
        : `slug:${selectedSubcategorySlug || selectedCategory.toLowerCase()}`;

      // Instant restore when revisiting a category/subcategory in the same session
      if (!fromPullToRefresh && !bypassSessionCache) {
        const cached = sessionCacheRef.current.get(scopeKey);
        if (cached && cached.items.length > 0) {
          requestSequence.current += 1;
          loadMoreLockRef.current = false;
          itemsListRef.current = cached.items;
          setItemsList(cached.items);
          setCurrentPage(cached.currentPage);
          setTotalPortalResults(cached.totalPortalResults);
          setHasMorePages(cached.hasMorePages);
          setCatalogSource(cached.catalogSource);
          setFilterBrand('ALL');
          setSortOption('DEFAULT');
          setLoadMoreError(null);
          setIsOffline(false);
          setIsLoading(false);
          setIsPullRefreshing(false);
          return;
        }
      }

      const requestId = ++requestSequence.current;
      loadMoreLockRef.current = false;
      setLoadMoreError(null);

      if (fromPullToRefresh) {
        setIsPullRefreshing(true);
      } else {
        setIsLoading(true);
        itemsListRef.current = [];
        setItemsList([]);
        setCatalogSource('EMPTY');
        setCurrentPage(1);
        setTotalPortalResults(0);
        setHasMorePages(false);
        setFilterBrand('ALL');
        setSortOption('DEFAULT');
      }
      setIsOffline(false);

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
          recordSeenItems(stream.items);
          if (fromPullToRefresh && itemsListRef.current.length > stream.items.length) {
            // Merge fresh Page 1 updates at top while keeping all loaded Page 2+ items intact
            const freshIds = new Set(stream.items.map((item) => item.id));
            const preservedTail = itemsListRef.current.filter((item) => !freshIds.has(item.id));
            const merged = [...stream.items, ...preservedTail];
            const nextTotal = stream.totalResults || totalPortalResults;
            itemsListRef.current = merged;
            setItemsList(merged);
            if (stream.totalResults) {
              setTotalPortalResults(stream.totalResults);
            }
            setCatalogSource(stream.source);
            setIsOffline(false);
            sessionCacheRef.current.set(scopeKey, {
              items: merged,
              currentPage,
              totalPortalResults: nextTotal,
              hasMorePages,
              catalogSource: stream.source,
            });
          } else {
            itemsListRef.current = stream.items;
            setItemsList(stream.items);
            setCurrentPage(1);
            setTotalPortalResults(stream.totalResults || 0);
            setHasMorePages(stream.hasMore);
            setCatalogSource(stream.source);
            setIsOffline(false);
            sessionCacheRef.current.set(scopeKey, {
              items: stream.items,
              currentPage: 1,
              totalPortalResults: stream.totalResults || 0,
              hasMorePages: stream.hasMore,
              catalogSource: stream.source,
            });
          }
        } else if (!fromPullToRefresh) {
          const online = await isNetworkOnline();
          itemsListRef.current = [];
          setItemsList([]);
          setTotalPortalResults(0);
          setHasMorePages(false);
          setCatalogSource('EMPTY');
          setIsOffline(!online);
        }
      } catch {
        if (requestId !== requestSequence.current) return;
        if (!fromPullToRefresh) {
          const online = await isNetworkOnline();
          itemsListRef.current = [];
          setItemsList([]);
          setTotalPortalResults(0);
          setHasMorePages(false);
          setIsOffline(!online);
        }
      } finally {
        if (requestId === requestSequence.current) {
          setIsPullRefreshing(false);
          setIsLoading(false);
        }
      }
    },
    [
      selectedCategory,
      selectedSubcategorySlug,
      selectedSubcategoryName,
      activeProductQuery,
      currentPage,
      hasMorePages,
      totalPortalResults,
      recordSeenItems,
    ]
  );

  // Trigger initial & scope-change loads on Products tab
  useEffect(() => {
    if (activeTypeTab === 'Products') {
      loadLiveProducts(false, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTypeTab, currentScopeKey]);

  const handleLoadMore = useCallback(
    async (manualRetry: boolean = false) => {
      if (isLoading || isLoadingMore || loadMoreLockRef.current || !hasMorePages || isOffline) {
        return;
      }
      if (!manualRetry && loadMoreError) {
        return;
      }

      const requestId = requestSequence.current;
      loadMoreLockRef.current = true;
      setIsLoadingMore(true);
      setLoadMoreError(null);
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
          recordSeenItems(stream.items);
          const seen = new Set(itemsListRef.current.map((item) => item.id));
          const fresh = stream.items.filter((item) => !seen.has(item.id));
          const nextTotal = stream.totalResults || totalPortalResults;
          if (stream.totalResults) {
            setTotalPortalResults(stream.totalResults);
          }

          if (fresh.length > 0) {
            const merged = [...itemsListRef.current, ...fresh];
            itemsListRef.current = merged;
            setItemsList(merged);
            setCurrentPage(nextPage);
            setHasMorePages(stream.hasMore);
            setCatalogSource(stream.source);
            sessionCacheRef.current.set(currentScopeKey, {
              items: merged,
              currentPage: nextPage,
              totalPortalResults: nextTotal,
              hasMorePages: stream.hasMore,
              catalogSource: stream.source,
            });
          } else {
            // Live portal returned no new unique records -> reached true end
            setHasMorePages(false);
            sessionCacheRef.current.set(currentScopeKey, {
              items: itemsListRef.current,
              currentPage,
              totalPortalResults: nextTotal,
              hasMorePages: false,
              catalogSource,
            });
          }
        } else if (stream.failed) {
          // Transient timeout or network blip: keep hasMorePages true and let user retry
          setLoadMoreError(`GeM took too long for Page ${nextPage}. Tap to retry.`);
        } else {
          setHasMorePages(false);
        }
      } catch {
        if (requestId !== requestSequence.current) return;
        setLoadMoreError(`Could not load Page ${nextPage}. Tap to retry.`);
      } finally {
        if (requestId === requestSequence.current) {
          loadMoreLockRef.current = false;
          setIsLoadingMore(false);
        }
      }
    },
    [
      isLoading,
      isLoadingMore,
      hasMorePages,
      isOffline,
      loadMoreError,
      currentPage,
      selectedCategory,
      selectedSubcategorySlug,
      selectedSubcategoryName,
      activeProductQuery,
      totalPortalResults,
      catalogSource,
      currentScopeKey,
      recordSeenItems,
    ]
  );

  // Select any category/subcategory immediately on the single storefront screen
  const selectCategoryScope = useCallback((catName: string, subSlug?: string, subName?: string) => {
    const normalized = catName.trim().toLowerCase();
    const matchingDept =
      OFFICIAL_PRODUCT_CATEGORIES.find((c) => c.name.toLowerCase() === normalized) ||
      OFFICIAL_PRODUCT_CATEGORIES.find(
        (c) =>
          c.name.toLowerCase().includes(normalized) ||
          normalized.includes(c.name.toLowerCase()) ||
          (CATEGORY_VISUALS[c.id]?.label.toLowerCase() === normalized)
      );

    const resolvedCatName = matchingDept ? matchingDept.name : catName;
    const firstMatch = OFFICIAL_GEM_SUBCATEGORIES.find(
      (s) => s.category.toLowerCase() === resolvedCatName.toLowerCase()
    );

    if (matchingDept) {
      setSelectedDeptId(matchingDept.id);
    }
    setActiveTypeTab('Products');
    setShowSearchSuggestions(false);
    setActiveProductQuery('');
    setSearchQuery('');
    setSelectedCategory(resolvedCatName);
    setSelectedSubcategorySlug(subSlug || firstMatch?.slug || '');
    setSelectedSubcategoryName(subName || firstMatch?.name || resolvedCatName);
    Keyboard.dismiss();
  }, []);

  const handleSelectCategoryTile = useCallback(
    (dept: MarketplaceCategory) => {
      const firstSub = OFFICIAL_GEM_SUBCATEGORIES.find(
        (s) => s.category.toLowerCase() === dept.name.toLowerCase()
      );
      setSelectedDeptId(dept.id);
      setShowSearchSuggestions(false);
      setActiveProductQuery('');
      setSearchQuery('');
      setSelectedCategory(dept.name);
      setSelectedSubcategorySlug(firstSub?.slug || '');
      setSelectedSubcategoryName(firstSub?.name || dept.name);
      Keyboard.dismiss();
    },
    []
  );

  const handleSelectSubcategoryChip = useCallback((sub: GeMSubcategoryConfig) => {
    setActiveProductQuery('');
    setShowSearchSuggestions(false);
    setSelectedSubcategorySlug(sub.slug);
    setSelectedSubcategoryName(sub.name);
  }, []);

  // Run a live GeM catalog search for any free-text query
  const runLiveProductSearch = useCallback((queryText: string) => {
    const clean = queryText.trim();
    if (!clean) return;
    setActiveTypeTab('Products');
    setSearchQuery(clean);
    setShowSearchSuggestions(false);
    setActiveProductQuery(clean);
    Keyboard.dismiss();
  }, []);

  const clearLiveProductSearch = useCallback(() => {
    setSearchQuery('');
    setShowSearchSuggestions(false);
    setActiveProductQuery('');
    Keyboard.dismiss();
  }, []);

  // Apply external navigation intent from Home or Categories
  useEffect(() => {
    if (initialTypeTab) {
      setActiveTypeTab(initialTypeTab);
    }
    if (initialQuery !== undefined && initialQuery.trim()) {
      const q = initialQuery.trim();
      setSearchQuery(q);
      if (initialTypeTab === 'Services') {
        setShowSearchSuggestions(false);
      } else {
        runLiveProductSearch(q);
      }
      return;
    }
    if (initialCategory) {
      if (initialTypeTab === 'Services') {
        setSearchQuery(initialCategory);
        setShowSearchSuggestions(false);
      } else {
        selectCategoryScope(initialCategory);
      }
    }
  }, [
    initialCategory,
    initialQuery,
    initialTypeTab,
    navTrigger,
    selectCategoryScope,
    runLiveProductSearch,
  ]);

  // Open in-app Live Service Explorer
  const openServiceCard = useCallback((card: ServiceCardRecord) => {
    setActiveService({
      gemServiceId: card.gemServiceId,
      name: card.title,
      category: card.categoryTag,
      gfrMode: card.gfrMode,
      searchHint: card.searchHint,
      imageUrl: card.imageUrl,
    });
  }, []);

  const handleSelectServiceCategory = useCallback((cat: ServiceFilterChip) => {
    setServiceFilter(cat);
    setVisibleServicesLimit(24);
  }, []);

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

  const toggleSaveItem = useCallback((id: string) => {
    setSavedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleOpenDetail = useCallback((item: MarketplaceItem) => {
    setSelectedItem(item);
  }, []);

  const totalCartCount = useMemo(() => Object.values(cart).reduce((sum, q) => sum + q, 0), [cart]);
  const allCatalogItems = useMemo(() => MarketplaceService.getItems(), [itemsList]);

  const resolveItemById = useCallback(
    (id: string): MarketplaceItem | undefined =>
      seenItemsByIdRef.current.get(id) ||
      itemsList.find((x) => x.id === id) ||
      allCatalogItems.find((x) => x.id === id),
    [itemsList, allCatalogItems]
  );

  const totalCartPrice = useMemo(
    () =>
      Object.entries(cart).reduce((sum, [id, q]) => {
        const it = resolveItemById(id);
        return sum + (it ? it.l1PriceInr * q : 0);
      }, 0),
    [cart, resolveItemById]
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
    const base =
      filterBrand === 'ALL'
        ? itemsList
        : itemsList.filter((it) => it.oemBrand.toLowerCase().includes(filterBrand.toLowerCase()));
    if (sortOption === 'PRICE_ASC') {
      return [...base].sort((a, b) => (a.l1PriceInr || 0) - (b.l1PriceInr || 0));
    }
    if (sortOption === 'PRICE_DESC') {
      return [...base].sort((a, b) => (b.l1PriceInr || 0) - (a.l1PriceInr || 0));
    }
    if (sortOption === 'DISCOUNT') {
      return [...base].sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
    }
    return base;
  }, [itemsList, filterBrand, sortOption]);

  // Search suggestions for Products tab while typing
  const matchingSubcategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return OFFICIAL_GEM_SUBCATEGORIES.filter((s) =>
      `${s.name} ${s.category} ${s.id}`.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [searchQuery]);

  // Curated + Live 380+ Services unified into visual photo cards (zero acronym boxes)
  const allCuratedServices = useMemo<GeMServiceItem[]>(
    () => [...OFFICIAL_TRENDING_SERVICES, ...OFFICIAL_EMERGING_SERVICES],
    []
  );

  const liveServiceById = useMemo(() => {
    const map = new Map<string, LiveGeMServiceSummary>();
    for (const s of liveDirectoryServices) {
      map.set(s.id, s);
    }
    return map;
  }, [liveDirectoryServices]);

  const inferServiceTagAndFallbackImg = useCallback(
    (text: string): { tag: string; fallbackImg: string } => {
      const lower = text.toLowerCase();
      if (/security|guard|psara|surveillance/.test(lower)) {
        return {
          tag: 'Security',
          fallbackImg: SERVICE_CATEGORY_VISUALS.find((v) => v.id === 'Security')!.imageUrl,
        };
      }
      if (/manpower|outsourc|staff|hr\b|payroll/.test(lower)) {
        return {
          tag: 'Manpower',
          fallbackImg: SERVICE_CATEGORY_VISUALS.find((v) => v.id === 'Manpower')!.imageUrl,
        };
      }
      if (/vehicle|cab|taxi|bus|ambulance|van|fleet|car/.test(lower)) {
        return {
          tag: 'Vehicles',
          fallbackImg: SERVICE_CATEGORY_VISUALS.find((v) => v.id === 'Vehicles')!.imageUrl,
        };
      }
      if (/amc|ict|cloud|software|it\b|computer|data|cyber|telecom|air conditioner|hvac|fire/.test(lower)) {
        return {
          tag: 'IT & AMC',
          fallbackImg: SERVICE_CATEGORY_VISUALS.find((v) => v.id === 'IT & AMC')!.imageUrl,
        };
      }
      if (/clean|sanit|facility|housekeep|pest|horticult|waste|laundry/.test(lower)) {
        return {
          tag: 'Cleaning',
          fallbackImg: SERVICE_CATEGORY_VISUALS.find((v) => v.id === 'Cleaning')!.imageUrl,
        };
      }
      if (/cater|canteen|food|pantry|tea|coffee|vending|meal/.test(lower)) {
        return {
          tag: 'Catering',
          fallbackImg: SERVICE_CATEGORY_VISUALS.find((v) => v.id === 'Catering')!.imageUrl,
        };
      }
      if (/print|scan|photocop|publish|advertis/.test(lower)) {
        return {
          tag: 'Printing',
          fallbackImg: SERVICE_CATEGORY_VISUALS.find((v) => v.id === 'Printing')!.imageUrl,
        };
      }
      if (/logist|transport|courier|freight|warehouse|record|shifting/.test(lower)) {
        return {
          tag: 'Logistics',
          fallbackImg: SERVICE_CATEGORY_VISUALS.find((v) => v.id === 'Logistics')!.imageUrl,
        };
      }
      return {
        tag: 'GeM Service',
        fallbackImg: SERVICE_CATEGORY_VISUALS.find((v) => v.id === 'All Live')!.imageUrl,
      };
    },
    []
  );

  const filteredServiceCards = useMemo<ServiceCardRecord[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    const matchesCategory = (text: string): boolean => {
      if (serviceFilter === 'Popular' || serviceFilter === 'All Live') return true;
      const lower = text.toLowerCase();
      if (serviceFilter === 'Manpower') return /manpower|outsourc|staff|worker|labour/.test(lower);
      if (serviceFilter === 'Security') return /security|guard|psara|watchman|surveillance/.test(lower);
      if (serviceFilter === 'Vehicles') {
        return /\b(?:vehicle|cab|taxi|bus|van|ambulance|fleet|chauffeur)\b|car\s+hir|bus\s+hir|cab\s+hir|vehicle\s+hir/.test(
          lower
        );
      }
      if (serviceFilter === 'IT & AMC') {
        return /ict|amc|cmc|maintenance|cloud|software|computer|data|telecom|air conditioner|hvac|alarm/.test(
          lower
        );
      }
      if (serviceFilter === 'Cleaning') {
        return /clean|sanit|facility|housekeep|pest|disinfect|horticult|waste/.test(lower);
      }
      if (serviceFilter === 'Catering') return /cater|canteen|pantry|food|vending|meal/.test(lower);
      if (serviceFilter === 'Printing') return /print|photocop|scan|advertis/.test(lower);
      if (serviceFilter === 'Logistics') {
        return /logist|transport|courier|freight|cargo|record|warehouse/.test(lower);
      }
      return true;
    };

    // Build curated high-demand cards enriched with real live GeM photos & descriptions
    const curatedCards: ServiceCardRecord[] = allCuratedServices.map((srv) => {
      const liveMatch = liveServiceById.get(srv.gemServiceId);
      const inferred = inferServiceTagAndFallbackImg(`${srv.category} ${srv.name}`);
      return {
        id: `curated-${srv.id}`,
        gemServiceId: srv.gemServiceId,
        title: liveMatch?.displayName || srv.name,
        subtitle: liveMatch?.description || `${srv.category} · ${srv.gfrMode}`,
        categoryTag: inferred.tag,
        imageUrl: liveMatch?.imageUrl || inferred.fallbackImg,
        gfrMode: srv.gfrMode,
        searchHint: srv.searchHint,
      };
    });

    const liveCards: ServiceCardRecord[] = liveDirectoryServices.map((srv) => {
      const inferred = inferServiceTagAndFallbackImg(`${srv.displayName} ${srv.description}`);
      return {
        id: `live-${srv.id}`,
        gemServiceId: srv.id,
        title: srv.displayName,
        subtitle: srv.description || 'Verified active GeM government service',
        categoryTag: inferred.tag,
        imageUrl: srv.imageUrl || inferred.fallbackImg,
      };
    });

    // If user is searching or chose a specific category, combine curated top hits + all 380 live services
    let pool: ServiceCardRecord[];
    if (serviceFilter === 'Popular' && !q) {
      pool = curatedCards;
    } else if (serviceFilter === 'All Live' && !q) {
      pool = liveCards.length > 0 ? liveCards : curatedCards;
    } else {
      const seenGemIds = new Set<string>();
      pool = [];
      for (const c of [...curatedCards, ...liveCards]) {
        if (seenGemIds.has(c.gemServiceId)) continue;
        seenGemIds.add(c.gemServiceId);
        pool.push(c);
      }
    }

    return pool.filter((card) => {
      const text = `${card.title} ${card.subtitle} ${card.categoryTag}`;
      if (!matchesCategory(text)) return false;
      if (!q) return true;
      return text.toLowerCase().includes(q);
    });
  }, [
    allCuratedServices,
    liveDirectoryServices,
    liveServiceById,
    serviceFilter,
    searchQuery,
    inferServiceTagAndFallbackImg,
  ]);

  const visibleServiceCards = useMemo(
    () => filteredServiceCards.slice(0, visibleServicesLimit),
    [filteredServiceCards, visibleServicesLimit]
  );

  const serviceKeyExtractor = useCallback((item: ServiceCardRecord) => item.id, []);

  const renderServiceGridItem = useCallback(
    ({ item }: { item: ServiceCardRecord }) => (
      <ServiceGridCard
        item={item}
        colors={colors}
        fontMultiplier={fontMultiplier}
        onOpen={openServiceCard}
      />
    ),
    [colors, fontMultiplier, openServiceCard]
  );

  const servicesListHeader = useMemo(
    () => (
      <View style={styles.storefrontHeaderWrap}>
        <View
          style={[
            styles.categoryStripCard,
            { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryStripContent}
          >
            {SERVICE_CATEGORY_VISUALS.map((cat) => (
              <ServiceCategoryTile
                key={cat.id}
                config={cat}
                selected={serviceFilter === cat.id}
                colors={colors}
                onSelect={handleSelectServiceCategory}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.controlsSection}>
          <View style={styles.resultsTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {searchQuery.trim()
                  ? `Services matching "${searchQuery.trim()}"`
                  : serviceFilter === 'Popular'
                    ? 'Popular Government Services'
                    : serviceFilter === 'All Live'
                      ? 'All Live GeM Services'
                      : `${serviceFilter} Services`}
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {isLoadingServicesDir && liveDirectoryServices.length === 0
                  ? 'Loading 380+ live services from mkp.gem.gov.in…'
                  : `${filteredServiceCards.length} live services · Providers, Tenders & SLA`}
              </Text>
            </View>
            {serviceFilter !== 'Popular' || searchQuery.trim() ? (
              <Pressable
                style={[
                  styles.brandFilterBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => {
                  setSearchQuery('');
                  setServiceFilter('Popular');
                  setVisibleServicesLimit(24);
                }}
                hitSlop={6}
              >
                <Text style={[styles.brandFilterText, { color: colors.primary }]}>Reset</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    ),
    [
      colors,
      serviceFilter,
      searchQuery,
      isLoadingServicesDir,
      liveDirectoryServices.length,
      filteredServiceCards.length,
      handleSelectServiceCategory,
    ]
  );

  // Stable FlatList renderItem + keyExtractor
  const keyExtractor = useCallback((item: MarketplaceItem) => item.id, []);

  const renderProductGridItem = useCallback(
    ({ item }: { item: MarketplaceItem }) => (
      <ProductGridCard
        item={item}
        qty={cart[item.id] || 0}
        isSaved={savedItemIds.has(item.id)}
        isCompared={compareIds.has(item.id)}
        colors={colors}
        fontMultiplier={fontMultiplier}
        onOpenDetail={handleOpenDetail}
        onToggleSave={toggleSaveItem}
        onToggleCompare={toggleCompareItem}
        onUpdateQty={updateCartQty}
      />
    ),
    [
      cart,
      savedItemIds,
      compareIds,
      colors,
      fontMultiplier,
      handleOpenDetail,
      toggleSaveItem,
      toggleCompareItem,
      updateCartQty,
    ]
  );

  // Results summary copy
  const resultsSummaryLabel = useMemo(() => {
    if (isLoading) return 'Loading live GeM listings…';
    if (totalPortalResults > filteredProducts.length && filterBrand === 'ALL') {
      return `${filteredProducts.length} of ${totalPortalResults.toLocaleString('en-IN')} live · GeM`;
    }
    const suffix =
      catalogSource === 'LIVE_PORTAL'
        ? 'live · GeM'
        : catalogSource === 'CACHED_CATALOG'
          ? 'cached · GeM'
          : 'listings';
    return `${filteredProducts.length}${hasMorePages && filterBrand === 'ALL' ? '+' : ''} ${suffix}`;
  }, [isLoading, totalPortalResults, filteredProducts.length, filterBrand, catalogSource, hasMorePages]);

  // Memoized Products ListHeaderComponent (keeps horizontal ScrollViews mounted across updates)
  const productsListHeader = useMemo(
    () => (
      <View style={styles.storefrontHeaderWrap}>
        {/* 1. Visual Category Strip (real GeM product photos + plain everyday names) */}
        <View
          style={[
            styles.categoryStripCard,
            { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryStripContent}
          >
            {ORDERED_CATEGORIES.map((dept) => {
              const visual = CATEGORY_VISUALS[dept.id];
              const isSelected = !activeProductQuery && selectedDeptId === dept.id;
              return (
                <CategoryPhotoTile
                  key={dept.id}
                  dept={dept}
                  label={visual?.label || dept.name}
                  imageUrl={visual?.imageUrl}
                  selected={isSelected}
                  colors={colors}
                  onSelect={handleSelectCategoryTile}
                />
              );
            })}
          </ScrollView>

          {/* 2. One-tap Subcategory Pills right underneath the active category */}
          {!activeProductQuery && availableSubcategories.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subCatPillsContent}
            >
              {availableSubcategories.map((sub) => (
                <CompactChip
                  key={sub.id}
                  label={sub.name}
                  selected={selectedSubcategorySlug === sub.slug}
                  onPress={() => handleSelectSubcategoryChip(sub)}
                />
              ))}
            </ScrollView>
          ) : null}
        </View>

        {/* Active Free-Text Search Banner */}
        {activeProductQuery ? (
          <View
            style={[
              styles.activeSearchBanner,
              { backgroundColor: colors.primaryTint, borderColor: colors.primary },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.activeSearchTitle, { color: colors.primary }]} numberOfLines={1}>
                Results for &quot;{activeProductQuery}&quot;
              </Text>
              <Text style={[styles.activeSearchSub, { color: colors.textSecondary }]}>
                Live from mkp.gem.gov.in
              </Text>
            </View>
            <Pressable
              style={[styles.clearSearchPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={clearLiveProductSearch}
              hitSlop={8}
            >
              <Text style={[styles.clearSearchPillText, { color: colors.textPrimary }]}>Clear ✕</Text>
            </Pressable>
          </View>
        ) : null}

        {/* 3. Compact Count + Brand Filter & Sort Controls */}
        <View style={styles.controlsSection}>
          <View style={styles.resultsTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {activeProductQuery ? `Search: ${activeProductQuery}` : selectedSubcategoryName}
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {resultsSummaryLabel}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Pressable
                style={[
                  styles.brandFilterBtn,
                  { backgroundColor: colors.primaryTint, borderColor: colors.primary },
                ]}
                unstable_pressDelay={0}
                hitSlop={6}
                onPress={() => openCompareModal('GFR149')}
                accessibilityLabel="Open GFR 149 procurement rule helper"
              >
                <Text style={[styles.brandFilterText, { color: colors.primary }]}>GFR 149</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.brandFilterBtn,
                  {
                    backgroundColor: filterBrand !== 'ALL' ? colors.primaryTint : colors.surface,
                    borderColor: filterBrand !== 'ALL' ? colors.primary : colors.border,
                  },
                ]}
                unstable_pressDelay={0}
                hitSlop={6}
                onPress={() => setShowFilterModal(true)}
              >
                <Text
                  style={[
                    styles.brandFilterText,
                    { color: filterBrand !== 'ALL' ? colors.primary : colors.textPrimary },
                  ]}
                >
                  {filterBrand !== 'ALL' ? `Brand: ${filterBrand}` : 'Brand ▾'}
                </Text>
              </Pressable>
            </View>
          </View>

          {itemsList.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sortRowContent}
            >
              {(
                [
                  { id: 'DEFAULT', label: 'GeM Order' },
                  { id: 'PRICE_ASC', label: 'Price: Low' },
                  { id: 'PRICE_DESC', label: 'Price: High' },
                  { id: 'DISCOUNT', label: 'Top Discount' },
                ] as const
              ).map((opt) => (
                <CompactChip
                  key={opt.id}
                  label={opt.label}
                  selected={sortOption === opt.id}
                  onPress={() => setSortOption(opt.id)}
                />
              ))}
              {filterBrand !== 'ALL' ? (
                <CompactChip
                  label={`Clear ${filterBrand} ✕`}
                  selected={false}
                  onPress={() => setFilterBrand('ALL')}
                />
              ) : null}
            </ScrollView>
          ) : null}
        </View>
      </View>
    ),
    [
      colors,
      activeProductQuery,
      selectedDeptId,
      availableSubcategories,
      selectedSubcategorySlug,
      selectedSubcategoryName,
      resultsSummaryLabel,
      filterBrand,
      itemsList.length,
      sortOption,
      handleSelectCategoryTile,
      handleSelectSubcategoryChip,
      clearLiveProductSearch,
      openCompareModal,
    ]
  );

  // Products pagination footer (with explicit Retry on transient timeout)
  const productsListFooter = useMemo(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.paginationFooter}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.paginationFooterText, { color: colors.textSecondary }]}>
            Loading page {currentPage + 1} from GeM…
          </Text>
        </View>
      );
    }

    if (loadMoreError && hasMorePages && !isLoading) {
      return (
        <View
          style={[
            styles.retryFooterBox,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.retryFooterText, { color: colors.textSecondary }]}>
            {loadMoreError}
          </Text>
          <PrimaryButton
            label={`Retry Page ${currentPage + 1}`}
            onPress={() => handleLoadMore(true)}
            style={{ width: '100%', marginTop: 8 }}
          />
        </View>
      );
    }

    if (hasMorePages && filteredProducts.length > 0 && !isLoading) {
      const remaining =
        totalPortalResults > itemsList.length
          ? ` (${(totalPortalResults - itemsList.length).toLocaleString('en-IN')} more)`
          : '';
      return (
        <View style={styles.paginationFooter}>
          <SecondaryButton
            label={`Load Page ${currentPage + 1}${remaining}`}
            onPress={() => handleLoadMore(true)}
            style={{ width: '100%' }}
          />
        </View>
      );
    }

    if (itemsList.length > 0 && !isLoading) {
      return (
        <View style={styles.paginationFooter}>
          <Text style={[styles.paginationFooterText, { color: colors.textMuted }]}>
            Showing all {filteredProducts.length} loaded listings
          </Text>
        </View>
      );
    }

    return null;
  }, [
    isLoadingMore,
    loadMoreError,
    hasMorePages,
    isLoading,
    filteredProducts.length,
    totalPortalResults,
    itemsList.length,
    currentPage,
    colors,
    handleLoadMore,
  ]);

  const productsListEmpty = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary, marginTop: 14 }]}>
            Loading live GeM products…
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Fetching verified prices &amp; sellers directly from mkp.gem.gov.in
          </Text>
        </View>
      );
    }
    if (isOffline) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Internet Connection</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Connect to mobile data or Wi-Fi and tap Retry to load live GeM listings.
          </Text>
          <PrimaryButton
            label="Retry"
            onPress={() => loadLiveProducts(false, true)}
            style={{ marginTop: 14 }}
          />
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          No live products found
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          {activeProductQuery
            ? `No GeM listings matched "${activeProductQuery}". Try a shorter product name.`
            : 'GeM did not respond in time or returned 0 items. Tap Retry or pick another category above.'}
        </Text>
        <View style={styles.emptyActionsRow}>
          <PrimaryButton
            label="Retry"
            onPress={() => loadLiveProducts(false, true)}
            style={{ minWidth: 110 }}
          />
          {activeProductQuery ? (
            <SecondaryButton
              label="Clear Search"
              onPress={clearLiveProductSearch}
              style={{ minWidth: 120 }}
            />
          ) : null}
        </View>
      </View>
    );
  }, [isLoading, isOffline, activeProductQuery, colors, loadLiveProducts, clearLiveProductSearch]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Fixed Top Search & Products/Services Switcher */}
      <View
        style={[
          styles.topHeader,
          { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle },
        ]}
      >
        <View style={styles.searchBarRow}>
          <SearchField
            value={searchQuery}
            onChangeText={(txt) => {
              setSearchQuery(txt);
              if (activeTypeTab === 'Products') {
                setShowSearchSuggestions(txt.trim().length > 0);
                if (!txt.trim() && activeProductQuery) {
                  setActiveProductQuery('');
                }
              }
            }}
            onClear={() => {
              setShowSearchSuggestions(false);
              if (activeTypeTab === 'Products' && activeProductQuery) {
                setActiveProductQuery('');
              }
            }}
            placeholder={
              activeTypeTab === 'Products'
                ? 'Search laptops, chairs, gloves, cars...'
                : 'Search 380+ GeM services...'
            }
            onSubmit={() => {
              if (activeTypeTab === 'Products' && searchQuery.trim()) {
                runLiveProductSearch(searchQuery);
              }
            }}
            style={{ flex: 1 }}
          />
          {activeTypeTab === 'Products' && searchQuery.trim().length > 0 && showSearchSuggestions ? (
            <Pressable
              style={[styles.searchGoBtn, { backgroundColor: colors.primary }]}
              onPress={() => runLiveProductSearch(searchQuery)}
              unstable_pressDelay={0}
            >
              <Text style={[styles.searchGoBtnText, { color: colors.textInverse }]}>Go</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.underlineTabsRow}>
          {(['Products', 'Services'] as const).map((tab) => {
            const active = activeTypeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => {
                  setActiveTypeTab(tab);
                  setShowSearchSuggestions(false);
                }}
                style={[styles.underlineTab, active && { borderBottomColor: colors.primary }]}
              >
                <Text
                  style={[
                    styles.underlineTabText,
                    { color: active ? colors.primary : colors.textSecondary },
                    active && styles.underlineTabTextActive,
                  ]}
                >
                  {tab === 'Services'
                    ? liveDirectoryTotal > 0
                      ? `${t('servicesTab')} (${liveDirectoryTotal})`
                      : t('servicesTab')
                    : t('productsTab')}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* BODY: PRODUCTS TAB vs SERVICES TAB */}
      {activeTypeTab === 'Products' ? (
        showSearchSuggestions && searchQuery.trim().length > 0 ? (
          /* Inline Search Suggestions while actively typing */
          <ScrollView
            style={styles.searchResultsScroll}
            contentContainerStyle={styles.searchResultsContent}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable
              style={[styles.liveSearchRow, { backgroundColor: colors.primary }]}
              onPress={() => runLiveProductSearch(searchQuery)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.liveSearchTitle, { color: colors.textInverse }]}>
                  Search GeM for &quot;{searchQuery.trim()}&quot;
                </Text>
                <Text style={[styles.liveSearchSub, { color: colors.textInverse, opacity: 0.85 }]}>
                  Fetch live seller prices directly from mkp.gem.gov.in
                </Text>
              </View>
              <Text style={[styles.liveSearchArrow, { color: colors.textInverse }]}>→</Text>
            </Pressable>

            {matchingSubcategories.length > 0 ? (
              <View
                style={[
                  styles.suggestBlock,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.suggestHeading, { color: colors.textMuted }]}>
                  MATCHING CATEGORIES
                </Text>
                {matchingSubcategories.map((sub, idx) => (
                  <Pressable
                    key={sub.id}
                    style={[
                      styles.suggestRow,
                      idx > 0 && { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
                    ]}
                    onPress={() => selectCategoryScope(sub.category, sub.slug, sub.name)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.suggestName, { color: colors.textPrimary }]}>
                        {sub.name}
                      </Text>
                      <Text style={[styles.suggestCat, { color: colors.textSecondary }]}>
                        {sub.category}
                      </Text>
                    </View>
                    <Text style={[styles.suggestChevron, { color: colors.textMuted }]}>›</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </ScrollView>
        ) : (
          /* Single-Screen Visual Storefront: Category Photos + Subcategories + Live 2-Col Grid */
          <FlatList
            key="gem-storefront-grid"
            data={filteredProducts}
            numColumns={2}
            keyExtractor={keyExtractor}
            renderItem={renderProductGridItem}
            ListHeaderComponent={productsListHeader}
            ListFooterComponent={productsListFooter}
            ListEmptyComponent={productsListEmpty}
            columnWrapperStyle={styles.productRowWrapper}
            removeClippedSubviews={false}
            windowSize={11}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            refreshControl={
              <RefreshControl
                refreshing={isPullRefreshing}
                onRefresh={() => loadLiveProducts(true, true)}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            contentContainerStyle={[
              styles.listContent,
              totalCartCount > 0 && { paddingBottom: 100 },
            ]}
            showsVerticalScrollIndicator={false}
            onEndReached={() => handleLoadMore(false)}
            onEndReachedThreshold={0.45}
          />
        )
      ) : (
        /* SERVICES TAB: Visual 2-Column Live GeM Services Storefront (Real GeM Photos) */
        <FlatList
          key="gem-services-visual-grid"
          data={visibleServiceCards}
          numColumns={2}
          keyExtractor={serviceKeyExtractor}
          renderItem={renderServiceGridItem}
          ListHeaderComponent={servicesListHeader}
          columnWrapperStyle={styles.productRowWrapper}
          removeClippedSubviews={false}
          windowSize={11}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshingServices}
              onRefresh={() => loadLiveServicesDirectory(true)}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            totalCartCount > 0 && { paddingBottom: 100 },
          ]}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (visibleServicesLimit < filteredServiceCards.length) {
              setVisibleServicesLimit((n) => n + 24);
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            visibleServicesLimit < filteredServiceCards.length ? (
              <View style={styles.paginationFooter}>
                <SecondaryButton
                  label={`Show More Services (${filteredServiceCards.length - visibleServicesLimit} more)`}
                  onPress={() => setVisibleServicesLimit((n) => n + 24)}
                  style={{ width: '100%' }}
                />
              </View>
            ) : filteredServiceCards.length > 0 ? (
              <View style={styles.paginationFooter}>
                <Text style={[styles.paginationFooterText, { color: colors.textMuted }]}>
                  Showing all {filteredServiceCards.length} matching services
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            isLoadingServicesDir ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary, marginTop: 14 }]}>
                  Loading live GeM services…
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Fetching 380+ active services directly from mkp.gem.gov.in
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  No services found
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {searchQuery.trim()
                    ? `No live GeM service matched "${searchQuery.trim()}". Try another keyword.`
                    : 'Tap Retry or choose All Services above.'}
                </Text>
                <View style={styles.emptyActionsRow}>
                  <PrimaryButton
                    label="Show All Services"
                    onPress={() => {
                      setSearchQuery('');
                      setServiceFilter('All Live');
                      setVisibleServicesLimit(24);
                    }}
                  />
                </View>
              </View>
            )
          }
        />
      )}

      {/* Floating OEM Compare Bar (stacks cleanly above Shortlist bar if both active) */}
      {compareItems.length > 0 && activeTypeTab === 'Products' && (
        <View
          style={[
            styles.floatingCompareBar,
            {
              backgroundColor: colors.surface,
              borderColor: colors.primary,
              bottom: totalCartCount > 0 ? 78 : 12,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.compareBarTitle, { color: colors.textPrimary }]}>
              {compareItems.length}/3 OEMs selected for Compare
            </Text>
            <Text style={[styles.compareBarSub, { color: colors.textSecondary }]}>
              {compareItems.length >= 2
                ? 'Side-by-side L1 price & GFR 149 check ready'
                : 'Pick 1–2 more live products to compare'}
            </Text>
          </View>
          <Pressable
            style={[styles.compareBarBtn, { backgroundColor: colors.primary }]}
            onPress={() => openCompareModal('COMPARE')}
            hitSlop={6}
          >
            <Text style={[styles.compareBarBtnText, { color: colors.textInverse }]}>
              Compare →
            </Text>
          </Pressable>
        </View>
      )}

      {/* Floating Shortlist Summary Bar */}
      {totalCartCount > 0 && (
        <View style={[styles.floatingCartBar, { backgroundColor: colors.primary }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cartBarCount, { color: colors.textInverse }]}>
              {totalCartCount} {totalCartCount === 1 ? 'item' : 'items'} shortlisted
            </Text>
            <Text style={[styles.cartBarPrice, { color: colors.textInverse, opacity: 0.88 }]}>
              Est. ₹{formatInr(totalCartPrice)} (excl. GST)
            </Text>
          </View>
          <Pressable
            style={[styles.cartBarActionBtn, { backgroundColor: colors.surface }]}
            unstable_pressDelay={0}
            hitSlop={8}
            onPress={() => setShowCartModal(true)}
          >
            <Text style={[styles.cartBarActionText, { color: colors.primary }]}>GFR Summary →</Text>
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
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
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
                const item = resolveItemById(itemId);
                if (!item) return null;
                return (
                  <View
                    key={itemId}
                    style={[styles.cartItemRow, { borderBottomColor: colors.borderSubtle }]}
                  >
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text
                        style={[styles.cartItemTitle, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text style={[styles.cartItemPrice, { color: colors.primary }]}>
                        ₹{formatInr(item.l1PriceInr)} × {qty} = ₹{formatInr(item.l1PriceInr * qty)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.gridStepperBox,
                        { backgroundColor: colors.primary, width: 92 },
                      ]}
                    >
                      <Pressable
                        style={styles.gridStepperBtn}
                        hitSlop={6}
                        onPress={() => updateCartQty(item.id, -1)}
                      >
                        <Text style={[styles.gridStepperSymbol, { color: colors.textInverse }]}>
                          −
                        </Text>
                      </Pressable>
                      <Text style={[styles.gridStepperQty, { color: colors.textInverse }]}>
                        {qty}
                      </Text>
                      <Pressable
                        style={styles.gridStepperBtn}
                        hitSlop={6}
                        onPress={() => updateCartQty(item.id, 1)}
                      >
                        <Text style={[styles.gridStepperSymbol, { color: colors.textInverse }]}>
                          +
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}

              <View style={[styles.cartGfrCard, { backgroundColor: colors.surfaceSubtle }]}>
                <Text style={[styles.cartGfrTitle, { color: colors.primary }]}>
                  {cartGfrStatus.description}
                </Text>
                <Text style={[styles.cartGfrText, { color: colors.textSecondary }]}>
                  {cartGfrStatus.mandatoryRequirement}
                </Text>
              </View>

              <View style={styles.billBox}>
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: colors.textSecondary }]}>
                    Items Subtotal
                  </Text>
                  <Text style={[styles.billVal, { color: colors.textPrimary }]}>
                    ₹{formatInr(totalCartPrice)}
                  </Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: colors.textSecondary }]}>
                    Estimated GST (18%)
                  </Text>
                  <Text style={[styles.billVal, { color: colors.textPrimary }]}>
                    ₹{formatInr(Math.round(totalCartPrice * 0.18))}
                  </Text>
                </View>
                <View
                  style={[
                    styles.billRow,
                    styles.billTotalRow,
                    { borderTopColor: colors.borderSubtle },
                  ]}
                >
                  <Text style={[styles.billTotalLabel, { color: colors.textPrimary }]}>
                    Estimated Total
                  </Text>
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
            <View
              style={[
                styles.modalSheet,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
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
                  <View style={styles.modalHeroFrame}>
                    <Image
                      source={{ uri: selectedItem.imageUrl }}
                      style={styles.modalProductHeroImg}
                      resizeMode="contain"
                    />
                  </View>
                ) : null}

                <View style={styles.modalPriceBox}>
                  <Text style={[styles.modalPrice, { color: colors.primary }]}>
                    ₹{formatInr(selectedItem.l1PriceInr)}
                  </Text>
                  <Text style={[styles.modalUnit, { color: colors.textSecondary }]}>
                    {selectedItem.priceUnit || 'per Unit'} · Min Order:{' '}
                    {selectedItem.minOrderQty ?? 1}
                  </Text>
                </View>

                <Text style={[styles.modalSecHeader, { color: colors.textPrimary }]}>
                  Published Details
                </Text>
                {Object.entries(selectedItem.specSummary || {}).map(([k, v]) => (
                  <View
                    key={k}
                    style={[styles.specRowDetail, { borderBottomColor: colors.borderSubtle }]}
                  >
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
                  label={
                    cart[selectedItem.id]
                      ? `Shortlisted (${cart[selectedItem.id]})`
                      : 'Add to Shortlist'
                  }
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

      {/* Side-by-Side Product Compare & GFR 149 Helper Modal */}
      <ProductCompareModal
        visible={showCompareModal}
        initialTab={compareInitialTab}
        items={compareItems}
        onRemoveItem={(id) => setCompareItems((prev) => prev.filter((p) => p.id !== id))}
        onClearCompare={() => setCompareItems([])}
        onClose={() => setShowCompareModal(false)}
      />

      {/* Full-Screen Live In-App Service Explorer */}
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
  topHeader: {
    paddingHorizontal: 14,
    paddingTop: 10,
    borderBottomWidth: 1,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchGoBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchGoBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  underlineTabsRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  underlineTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  underlineTabText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  underlineTabTextActive: {
    fontWeight: '800',
  },

  // Visual Storefront Header (Flipkart / Amazon style)
  storefrontHeaderWrap: {
    marginHorizontal: -12,
    marginTop: -12,
    marginBottom: 10,
  },
  categoryStripCard: {
    borderBottomWidth: 1,
    paddingTop: 10,
    paddingBottom: 10,
  },
  categoryStripContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  catTile: {
    width: 72,
    alignItems: 'center',
  },
  catPhotoFrame: {
    width: 58,
    height: 58,
    borderRadius: 12,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  catPhotoImg: {
    width: '100%',
    height: '100%',
  },
  catFallbackText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  catTileLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'center',
  },
  catTileLabelActive: {
    fontWeight: '800',
  },
  catSelectedDot: {
    width: 18,
    height: 3,
    borderRadius: 2,
    marginTop: 3,
  },
  catSelectedDotSpacer: {
    height: 6,
  },
  subCatPillsContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeSearchBanner: {
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activeSearchTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  activeSearchSub: {
    fontSize: 11,
    marginTop: 1,
  },
  clearSearchPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  clearSearchPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  controlsSection: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  resultsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 11.5,
    marginTop: 1,
  },
  brandFilterBtn: {
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandFilterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sortRowContent: {
    paddingBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Search Suggestions
  searchResultsScroll: { flex: 1 },
  searchResultsContent: { padding: 14, paddingBottom: 32 },
  liveSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  liveSearchTitle: { fontSize: 14, fontWeight: '800' },
  liveSearchSub: { fontSize: 11.5, marginTop: 2 },
  liveSearchArrow: { fontSize: 20, fontWeight: '800' },
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

  // 2-Column Live Product Grid
  listContent: { padding: 12, paddingBottom: 40 },
  productRowWrapper: { justifyContent: 'space-between', marginBottom: 10 },
  gridProductCard: {
    width: '48.6%',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gridImageContainer: {
    height: 132,
    width: '100%',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    position: 'relative',
  },
  gridProductImage: { width: '100%', height: '100%' },
  gridThumbFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gridThumbLabel: { fontSize: 14, fontWeight: '800' },
  gridBadgeStack: {
    position: 'absolute',
    top: 7,
    left: 7,
    flexDirection: 'row',
    gap: 4,
  },
  gridDiscountBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  gridL1Badge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  gridBadgeText: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '800' },
  saveCornerBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(241,245,249,0.92)',
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
  gridTitleText: { fontWeight: '600', lineHeight: 17, minHeight: 34, marginBottom: 5 },
  gridPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginBottom: 4 },
  gridL1Price: { fontWeight: '800' },
  gridMrpPrice: { fontSize: 10.5, textDecorationLine: 'line-through' },
  gridMoqText: { fontSize: 10, marginBottom: 8 },
  gridAddBtn: {
    borderWidth: 1,
    borderRadius: 7,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridAddBtnText: { fontSize: 11.5, fontWeight: '800' },
  gridStepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 7,
    minHeight: 36,
    paddingHorizontal: 8,
  },
  gridStepperBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  gridStepperSymbol: { fontSize: 15, fontWeight: '800' },
  gridStepperQty: { fontSize: 12.5, fontWeight: '800' },
  gridCompareBtn: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 7,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  gridCompareBtnText: { fontSize: 10.5, fontWeight: '800' },

  // Pagination & Empty States
  paginationFooter: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationFooterText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  retryFooterBox: {
    marginVertical: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  retryFooterText: {
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  emptySubtitle: { fontSize: 12.5, textAlign: 'center', lineHeight: 18, maxWidth: 290 },
  emptyActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  // Visual 2-Column Services Storefront
  srvCatPhotoFrame: {
    width: 58,
    height: 58,
    borderRadius: 12,
    padding: 4,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  srvCatPhotoImg: {
    width: '100%',
    height: '100%',
  },
  srvGridCard: {
    width: '48.6%',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  srvImageBox: {
    height: 112,
    width: '100%',
    padding: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    position: 'relative',
    overflow: 'hidden',
  },
  srvCardImg: {
    width: '100%',
    height: '100%',
  },
  srvPlaceholderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  srvPlaceholderBadge: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  srvPlaceholderBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  srvTagOverlay: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    maxWidth: '88%',
  },
  srvTagOverlayText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  srvCardBody: {
    padding: 9,
  },
  srvCardTitle: {
    fontWeight: '700',
    lineHeight: 17,
    minHeight: 34,
    marginBottom: 4,
  },
  srvCardSub: {
    fontSize: 10.5,
    lineHeight: 14.5,
    minHeight: 29,
    marginBottom: 8,
  },
  srvCardFooter: {
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  srvCardFooterText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // Floating Shortlist Bar & Modals
  floatingCompareBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 7,
  },
  compareBarTitle: { fontSize: 12.5, fontWeight: '800' },
  compareBarSub: { fontSize: 10.5, marginTop: 1 },
  compareBarBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  compareBarBtnText: { fontSize: 12, fontWeight: '800' },
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
  cartBarCount: { fontSize: 13, fontWeight: '800' },
  cartBarPrice: { fontSize: 11, marginTop: 1 },
  cartBarActionBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cartBarActionText: { fontSize: 12, fontWeight: '800' },
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
  modalHeroFrame: {
    width: '100%',
    height: 188,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    padding: 10,
    marginBottom: 12,
  },
  modalProductHeroImg: {
    width: '100%',
    height: '100%',
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
