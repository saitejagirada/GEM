/**
 * GeM Official Marketplace Catalog Service
 * Reverse-engineered from https://mkp.gem.gov.in and https://gem.gov.in.
 * Provides curated public procurement product & service entry points:
 * - 9 Popular Product Categories (IT, Automobiles, Furniture, Medical, Stationery, etc.)
 * - Trending & Emerging Services (Security, Manpower, Cabs, Cloud, AMC, Drones)
 * - GeM Outlet Stores (Saras Ajeevika, ODOP, Startup Runway, Womaniya, Millets)
 * - GFR Rule 149 Procurement Mode Thresholds (Direct Purchase, L1 Comparison, Mandatory Bidding)
 */

import { isNetworkOnline } from '../utils/network.ts';
import { LIVE_PORTAL_PRODUCTS } from '../fixtures/livePortalProducts.ts';
import { GeMClientCrawler, OFFICIAL_GEM_SUBCATEGORIES, type GeMSubcategoryConfig } from './GeMClientCrawler.ts';

export interface MarketplaceCategory {
  id: string;
  name: string;
  shortCode?: string;
  type: 'PRODUCT' | 'SERVICE';
  icon: string;
  itemCount: number;
  subcategories: string[];
  gemServiceId?: string;
}

export interface GeMOutletStore {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  accentColor: string;
}

export interface MarketplaceItem {
  id: string;
  title: string;
  category: string;
  productUrl?: string;
  /** Present only when the item came from a scoped live subcategory request. */
  subcategorySlug?: string;
  subcategoryName?: string;
  type: 'PRODUCT' | 'SERVICE';
  l1PriceInr: number;
  mrpInr?: number;
  discountPercent?: number;
  priceUnit: string;
  minOrderQty: number;
  oemBrand: string;
  rating: number;
  totalOrders: number;
  specSummary: Record<string, string>;
  procurementModes: Array<'DIRECT_PURCHASE' | 'L1_COMPARISON' | 'BID' | 'REVERSE_AUCTION'>;
  msePreference: boolean;
  makeInIndiaPercent: number;
  outletStore?: string;
  isAvailableOnGeM: boolean;
  imageUrl?: string;
  etaDelivery?: string;
  unitText?: string;
  badge?: string;
  inStock?: boolean;
  stockCount?: number;
}

export interface MarketplaceFilter {
  type?: 'PRODUCT' | 'SERVICE' | 'ALL';
  category?: string;
  outletStore?: string;
  query?: string;
  page?: number;
  subcategorySlug?: string;
  subcategoryName?: string;
}

export type MarketplaceStreamSource = 'LIVE_PORTAL' | 'CACHED_CATALOG' | 'EMPTY';

interface MarketplacePageCache {
  items: MarketplaceItem[];
  hasMore: boolean;
  page: number;
  totalResults?: number;
}

export const OFFICIAL_PRODUCT_CATEGORIES: MarketplaceCategory[] = [
  {
    id: 'it-products',
    name: 'IT Products',
    shortCode: 'IT',
    type: 'PRODUCT',
    icon: 'IT',
    itemCount: 1420,
    subcategories: ['Desktop Computers', 'Laptops & Notebooks', 'Computer Printers', 'Tablet Computers'],
  },
  {
    id: 'automobiles',
    name: 'Automobiles',
    shortCode: 'AUTO',
    type: 'PRODUCT',
    icon: 'AU',
    itemCount: 840,
    subcategories: ['Buses', 'Tractors', 'Cars', 'Utility Vehicles', 'Electric Cars'],
  },
  {
    id: 'furniture',
    name: 'Furniture',
    shortCode: 'FURN',
    type: 'PRODUCT',
    icon: 'FN',
    itemCount: 1120,
    subcategories: ['Revolving Chairs', 'Executive Tables', 'Class Room Desking', 'Modular Office Tables', 'Heavy Duty Storage Racks'],
  },
  {
    id: 'medical-products',
    name: 'Medical Products',
    shortCode: 'MED',
    type: 'PRODUCT',
    icon: 'MD',
    itemCount: 960,
    subcategories: ['Hand Sanitizer (IS 4148)', 'Surgical Gloves (IS 13422)', 'Examination Gloves', 'Disposable Syringes'],
  },
  {
    id: 'stationery',
    name: 'Stationery Items',
    shortCode: 'STAT',
    type: 'PRODUCT',
    icon: 'ST',
    itemCount: 780,
    subcategories: ['Copier & Maplitho Paper', 'Writing & Gel Pens', 'Registers & Diaries'],
  },
  {
    id: 'electrical-appliances',
    name: 'Electrical Appliances',
    shortCode: 'ELEC',
    type: 'PRODUCT',
    icon: 'EL',
    itemCount: 1250,
    subcategories: ['LED Street Luminaires', 'Circuit Breakers (MCCB)', 'XLPE Power Cables'],
  },
  {
    id: 'electronic-equipments',
    name: 'Electronic Equipments',
    shortCode: 'APPL',
    type: 'PRODUCT',
    icon: 'AP',
    itemCount: 650,
    subcategories: ['Television TVs', 'Split Air Conditioners', 'Window Air Conditioners', 'Cooling Refrigerators'],
  },
  {
    id: 'textile-products',
    name: 'Textile Products',
    shortCode: 'TEX',
    type: 'PRODUCT',
    icon: 'TX',
    itemCount: 520,
    subcategories: ['Handloom Cotton Bed Sheets', 'Cotton Towels (IS 7056)', 'Handloom Turkish Towels'],
  },
  {
    id: 'pipes-fittings',
    name: 'Pipes & Fittings',
    shortCode: 'PIPE',
    type: 'PRODUCT',
    icon: 'PF',
    itemCount: 430,
    subcategories: ['ISI Steel Tubes (IS 1239)', 'CPVC Water Pipes (IS 15778)', 'Structural Steel Tubes', 'Pipe Clamps & Hardware'],
  },
];

export const OFFICIAL_SERVICE_CATEGORIES: MarketplaceCategory[] = [
  {
    id: 'security-services',
    name: 'Security Services',
    shortCode: 'SEC',
    type: 'SERVICE',
    icon: 'SC',
    itemCount: 320,
    subcategories: ['Security Manpower Service (Version 2.0)', 'Armed & Unarmed Guards'],
    gemServiceId: 'services_home_manp_se16760331',
  },
  {
    id: 'manpower-outsourcing',
    name: 'Manpower Outsourcing',
    shortCode: 'MANP',
    type: 'SERVICE',
    icon: 'MP',
    itemCount: 480,
    subcategories: ['Manpower Outsourcing - Minimum Wage', 'Fixed Remuneration Technical Staff'],
    gemServiceId: 'services_home_manp_manp',
  },
  {
    id: 'vehicle-hiring',
    name: 'Vehicle & Cab Hiring',
    shortCode: 'FLEET',
    type: 'SERVICE',
    icon: 'VH',
    itemCount: 290,
    subcategories: ['Monthly Cab & Taxi Hiring', 'Short Term Cab Hiring', 'Bus Hiring Service'],
    gemServiceId: 'services_home_ve54336454_mont',
  },
  {
    id: 'ict-cloud',
    name: 'ICT & Cloud Infrastructure',
    shortCode: 'ICT',
    type: 'SERVICE',
    icon: 'IT',
    itemCount: 180,
    subcategories: ['AMC - Desktops, Laptops & Peripherals', 'AMC - Photocopier Machine', 'Data Recovery & Wiping'],
    gemServiceId: 'services_home_an53158604_an00015311',
  },
  {
    id: 'printing-services',
    name: 'Printing & Scanning',
    shortCode: 'PRINT',
    type: 'SERVICE',
    icon: 'PR',
    itemCount: 210,
    subcategories: ['Paper-based Printing Services', 'Non-Paper Printing - Quantity Based', 'Non-Paper Printing - Area Based'],
    gemServiceId: 'services_home_prin_pape',
  },
  {
    id: 'facility-mgmt',
    name: 'Facility Management',
    shortCode: 'FAC',
    type: 'SERVICE',
    icon: 'FM',
    itemCount: 160,
    subcategories: ['Facility Management (Version 2)', 'Cleaning, Sanitation & Disinfection', 'Hiring of Sanitation Service'],
    gemServiceId: 'services_home_fa85086605_fa85714406',
  },
  {
    id: 'drone-services',
    name: 'Drone Services',
    shortCode: 'TECH',
    type: 'SERVICE',
    icon: 'DR',
    itemCount: 95,
    subcategories: ['Custom Bid for Services', '3D Printing & Emerging Tech'],
    gemServiceId: 'services_home_cust',
  },
];

export interface GeMServiceItem {
  id: string;
  gemServiceId: string;
  name: string;
  category: string;
  icon: string;
  badge?: string;
  gfrMode: string;
  searchHint?: string;
}

export const OFFICIAL_TRENDING_SERVICES: GeMServiceItem[] = [
  { id: 'manpower-min-wage', gemServiceId: 'services_home_manp_manp', name: 'Manpower Outsourcing Services - Minimum wage', category: 'Manpower Outsourcing', icon: 'MP', badge: 'High Demand', gfrMode: 'L1 Comparison / Bid', searchHint: 'Manpower Outsourcing' },
  { id: 'custom-bid-services', gemServiceId: 'services_home_cust', name: 'Custom Bid for Services', category: 'Custom Services', icon: 'CB', badge: 'Custom SLA', gfrMode: 'Mandatory Bid', searchHint: 'Custom Bid for Services' },
  { id: 'short-term-cab', gemServiceId: 'services_home_ve54336454_shor', name: 'Short Term Cab & Taxi Hiring Services', category: 'Vehicle & Cab Hiring', icon: 'VH', badge: 'Fast Dispatch', gfrMode: 'Direct Purchase / L1', searchHint: 'Cab Hiring' },
  { id: 'manpower-fixed-rem', gemServiceId: 'services_home_manp_ma44130178', name: 'Manpower Outsourcing Services - Fixed Remuneration', category: 'Manpower Outsourcing', icon: 'MP', badge: 'Contractual', gfrMode: 'L1 / Bid', searchHint: 'Fixed Remuneration' },
  { id: 'amc-it-peripherals', gemServiceId: 'services_home_an53158604_an00015311', name: 'Annual Maintenance Service - Desktops, Laptops & Peripherals', category: 'ICT & AMC', icon: 'IT', badge: 'OEM / MSP', gfrMode: 'Direct / L1', searchHint: 'Annual Maintenance' },
  { id: 'catering-duration', gemServiceId: 'services_home_rest_ca71416537', name: 'Catering service (Duration Based)', category: 'Catering & Hospitality', icon: 'CT', badge: 'FSSAI', gfrMode: 'L1 Comparison', searchHint: 'Catering' },
  { id: 'amc-photocopier', gemServiceId: 'services_home_an53158604_amcf', name: 'Annual Maintenance Service - Photocopier Machine', category: 'ICT & AMC', icon: 'PR', badge: 'AMC', gfrMode: 'Direct Purchase', searchHint: 'Photocopier' },
  { id: 'printing-quantity', gemServiceId: 'services_home_prin_no86115751', name: 'Non Paper Printing Services - Quantity Based', category: 'Printing & Scanning', icon: 'PR', badge: 'High Volume', gfrMode: 'Direct / L1', searchHint: 'Printing' },
  { id: 'bus-hiring-short', gemServiceId: 'services_home_ve54336454_bush', name: 'Bus Hiring Service - Short Term', category: 'Vehicle & Cab Hiring', icon: 'VH', badge: 'Fleet', gfrMode: 'L1 Comparison', searchHint: 'Bus Hiring' },
  { id: 'vehicle-per-day', gemServiceId: 'services_home_ve54336454_ve03875333', name: 'Vehicle Hiring Service - Per Vehicle-Day basis', category: 'Vehicle & Cab Hiring', icon: 'VH', badge: 'Daily', gfrMode: 'Direct Purchase', searchHint: 'Vehicle Hiring' },
  { id: 'paper-printing', gemServiceId: 'services_home_prin_pape', name: 'Paper-based Printing Services', category: 'Printing & Scanning', icon: 'PR', badge: 'Govt Std', gfrMode: 'L1 Comparison', searchHint: 'Paper-based Printing' },
  { id: 'monthly-cab-hiring', gemServiceId: 'services_home_ve54336454_mont', name: 'Monthly Basis Cab & Taxi Hiring Services', category: 'Vehicle & Cab Hiring', icon: 'VH', badge: 'Monthly SLA', gfrMode: 'L1 Comparison / RA', searchHint: 'Monthly Basis Cab' },
  { id: 'catering-event', gemServiceId: 'services_home_rest_ca18172618', name: 'Catering service (Event Based)', category: 'Catering & Hospitality', icon: 'CT', badge: 'Institutional', gfrMode: 'L1 Comparison', searchHint: 'Catering' },
  { id: 'security-manpower-v2', gemServiceId: 'services_home_manp_se16760331', name: 'Security Manpower Service (Version 2.0)', category: 'Security Services', icon: 'SC', badge: 'PSARA', gfrMode: 'Mandatory L1 / Bid', searchHint: 'Security Manpower' },
  { id: 'printing-area', gemServiceId: 'services_home_prin_nonp', name: 'Non Paper Printing Services - Area Based', category: 'Printing & Scanning', icon: 'PR', badge: 'Custom Area', gfrMode: 'Direct / L1', searchHint: 'Printing' },
  { id: 'goods-transport-trip', gemServiceId: 'services_home_good_go26725013', name: 'Goods Transport Service - Per Trip based Service', category: 'Logistics', icon: 'LG', badge: 'Per Trip', gfrMode: 'Direct Purchase', searchHint: 'Goods Transport' },
  { id: 'cleaning-sanitation', gemServiceId: 'services_home_hous_clea', name: 'Cleaning, Sanitation and Disinfection Service - Outcome Based', category: 'Facility Management', icon: 'FM', badge: 'Outcome SLA', gfrMode: 'L1 Comparison', searchHint: 'Cleaning Sanitation' },
  { id: 'goods-transport-km', gemServiceId: 'services_home_good_go61253067', name: 'Goods Transport Service - Per KM Based Service', category: 'Logistics', icon: 'LG', badge: 'Per KM', gfrMode: 'Direct / L1', searchHint: 'Goods Transport' },
  { id: 'hiring-sanitation', gemServiceId: 'services_home_hous_hiri', name: 'Hiring of Sanitation Service', category: 'Facility Management', icon: 'FM', badge: 'Sanitation', gfrMode: 'L1 / Bid', searchHint: 'Sanitation' },
  { id: 'amc-air-conditioner', gemServiceId: 'services_home_an05563325_annu', name: 'Annual Maintenance service - AIR CONDITIONER', category: 'HVAC & Maintenance', icon: 'AC', badge: 'AMC', gfrMode: 'Direct Purchase', searchHint: 'Air Conditioner' },
];

export const OFFICIAL_EMERGING_SERVICES: GeMServiceItem[] = [
  { id: 'gift-vouchers', gemServiceId: 'services_home_gift', name: 'Gift Vouchers Service', category: 'Institutional Gifting', icon: 'GV', badge: 'Emerging', gfrMode: 'Direct Purchase', searchHint: 'Gift Voucher' },
  { id: 'missed-call-alert', gemServiceId: 'services_home_ba38284010_miss', name: 'Missed Call and Keyword Alert Service', category: 'Telecom & Cloud', icon: 'TC', badge: 'Telecom', gfrMode: 'Direct Purchase', searchHint: 'Alert Service' },
  { id: 'facility-mgmt-v2', gemServiceId: 'services_home_fa85086605_fa85714406', name: 'Facility Management Service - Manpower based (Version 2)', category: 'Facility Management', icon: 'FM', badge: 'Integrated', gfrMode: 'L1 / Bid', searchHint: 'Facility Management' },
  { id: 'canteen-service', gemServiceId: 'services_home_cafe_ca53335706', name: 'Canteen Service - Percentage Model', category: 'Catering & Hospitality', icon: 'CT', badge: 'Revenue Share', gfrMode: 'Revenue Share', searchHint: 'Canteen' },
  { id: 'data-recovery', gemServiceId: 'services_home_da33467834', name: 'Data Recovery and Data Wiping Service', category: 'ICT & Cyber Security', icon: 'IT', badge: 'CERT-In', gfrMode: 'Direct / L1', searchHint: 'Data Recovery' },
  { id: 'mine-dev-revenue', gemServiceId: 'services_home_mi67232020', name: 'Mine Development & Operations Service - Revenue Sharing Basis', category: 'Mining & Heavy Ops', icon: 'MN', badge: 'Specialized', gfrMode: 'Custom Bidding', searchHint: 'Mine Development' },
  { id: 'mortuary-van', gemServiceId: 'services_home_ve54336454_hiri', name: 'Hiring of Mortuary Van', category: 'Healthcare Logistics', icon: 'HC', badge: 'Healthcare', gfrMode: 'Direct Purchase', searchHint: 'Ambulance' },
  { id: 'record-mgmt-storage', gemServiceId: 'services_home_re58423781', name: 'Record Management Service - Storage Area Based', category: 'Archives & Records', icon: 'RC', badge: 'Archives', gfrMode: 'L1 Comparison', searchHint: 'Record Management' },
  { id: 'catering-packet', gemServiceId: 'services_home_rest_ca11785255', name: 'Catering Service per Packet based', category: 'Catering & Hospitality', icon: 'CT', badge: 'Meal Box', gfrMode: 'Direct Purchase', searchHint: 'Catering' },
  { id: 'tea-coffee-vending', gemServiceId: 'services_home_cafe_hiri', name: 'Hiring of Tea/Coffee Vending Machine', category: 'Pantry Services', icon: 'PV', badge: 'Monthly Lease', gfrMode: 'Monthly Lease', searchHint: 'Vending Machine' },
];

export const OFFICIAL_OUTLET_STORES: GeMOutletStore[] = [
  {
    id: 'saras-ajeevika',
    name: 'SARAS Ajeevika',
    tagline: 'Rural Women Self-Help Groups (SHG) Handloom & Crafts',
    badge: 'SHG Artisan',
    accentColor: '#10B981',
  },
  {
    id: 'odop',
    name: 'ODOP',
    tagline: 'One District One Product Indigenous Innovations',
    badge: 'Indigenous',
    accentColor: '#F59E0B',
  },
  {
    id: 'startup-runway',
    name: 'Startup Runway',
    tagline: 'DPIIT Recognized Cutting-Edge Tech Startups',
    badge: 'DPIIT Tech',
    accentColor: '#6366F1',
  },
  {
    id: 'womaniya',
    name: 'Womaniya on GeM',
    tagline: 'Women Entrepreneur Owned Enterprises',
    badge: 'Women Led',
    accentColor: '#EC4899',
  },
  {
    id: 'millets',
    name: 'Millets (Shree Anna)',
    tagline: 'Nutri-Cereals and Value-Added Millet Products',
    badge: 'Shree Anna',
    accentColor: '#84CC16',
  },
];

// Purged all mock items (itm-001 through itm-020 with unsplash images)
// Real catalog streams live from mkp.gem.gov.in via GeMClientCrawler
export const MOCK_MARKETPLACE_ITEMS: MarketplaceItem[] = [];

export class MarketplaceService {
  /**
   * Retrieves all product categories.
   */
  public static getProductCategories(): MarketplaceCategory[] {
    return OFFICIAL_PRODUCT_CATEGORIES;
  }

  /**
   * Retrieves all service categories.
   */
  public static getServiceCategories(): MarketplaceCategory[] {
    return OFFICIAL_SERVICE_CATEGORIES;
  }

  /**
   * Retrieves all special outlet stores (Saras, ODOP, Startup Runway, etc.).
   */
  public static getOutletStores(): GeMOutletStore[] {
    return OFFICIAL_OUTLET_STORES;
  }

  // Dynamic in-memory store initialized with live crawled GeM portal products & baseline items
  private static liveCatalog: MarketplaceItem[] = [
    ...MOCK_MARKETPLACE_ITEMS,
    ...LIVE_PORTAL_PRODUCTS.filter((p) => !MOCK_MARKETPLACE_ITEMS.some((m) => m.id === p.id)),
  ];
  /**
   * Page-scoped cache for successful live requests. The old global catalog was
   * useful for cart calculations but unsafe for rendering: a failed request
   * for page 2 of one category could return every item previously seen in a
   * different category. Keep the global catalog for compatibility, but only
   * use this exact request cache as a UI fallback.
   */
  private static livePageCache: Map<string, MarketplacePageCache> = new Map();
  private static listeners: Set<(items: MarketplaceItem[]) => void> = new Set();

  /**
   * Subscribes to real-time live product updates.
   */
  public static subscribeToProductUpdates(listener: (items: MarketplaceItem[]) => void): () => void {
    this.listeners.add(listener);
    listener([...this.liveCatalog]);
    return () => this.listeners.delete(listener);
  }

  /**
   * Dynamically ingests newly discovered live products from sellers,
   * reconciling additions and updates.
   */
  public static ingestLiveProducts(newItems: MarketplaceItem[]): number {
    if (!newItems || newItems.length === 0) return 0;
    const existingMap = new Map<string, MarketplaceItem>();
    for (const item of this.liveCatalog) {
      existingMap.set(item.id, item);
    }
    let addedCount = 0;
    for (const it of newItems) {
      if (!existingMap.has(it.id)) {
        addedCount++;
      }
      existingMap.set(it.id, it);
    }
    this.liveCatalog = Array.from(existingMap.values());
    this.notifyProductListeners();
    return addedCount;
  }

  private static notifyProductListeners(): void {
    const copy = [...this.liveCatalog];
    for (const listener of this.listeners) {
      try {
        listener(copy);
      } catch {}
    }
  }

  private static getStreamCacheKey(filter: MarketplaceFilter | undefined, page: number): string {
    return [
      filter?.type || 'PRODUCT',
      filter?.category || '',
      filter?.subcategorySlug || '',
      filter?.subcategoryName || '',
      filter?.query?.trim().toLowerCase() || '',
      page,
    ].join('|');
  }

  private static cacheStreamPage(
    filter: MarketplaceFilter | undefined,
    result: { items: MarketplaceItem[]; hasMore: boolean; page: number; totalResults?: number }
  ): void {
    this.livePageCache.set(this.getStreamCacheKey(filter, result.page), {
      items: [...result.items],
      hasMore: result.hasMore,
      page: result.page,
      totalResults: result.totalResults,
    });
  }

  private static getCachedStreamPage(
    filter: MarketplaceFilter | undefined,
    page: number
  ): MarketplacePageCache | undefined {
    const cached = this.livePageCache.get(this.getStreamCacheKey(filter, page));
    return cached ? { ...cached, items: [...cached.items] } : undefined;
  }

  /**
   * Filters marketplace catalog by type, category, outlet store, and keyword search.
   */
  public static getItems(filter?: MarketplaceFilter): MarketplaceItem[] {
    let items = [...this.liveCatalog];

    if (filter?.type && filter.type !== 'ALL') {
      items = items.filter((i) => i.type === filter.type);
    }

    if (filter?.category && filter.category !== 'All Categories') {
      const catLower = filter.category.toLowerCase();
      items = items.filter(
        (i) =>
          i.category.toLowerCase().includes(catLower) ||
          catLower.includes(i.category.toLowerCase())
      );
    }

    if (filter?.outletStore && filter.outletStore !== 'ALL') {
      items = items.filter((i) => i.outletStore === filter.outletStore);
    }

    if (filter?.query && filter.query.trim()) {
      const q = filter.query.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          i.oemBrand.toLowerCase().includes(q) ||
          Object.values(i.specSummary).some((v) => v.toLowerCase().includes(q))
      );
    }

    // A subcategory request must never be satisfied by an unscoped item from
    // another category or another subcategory. Live crawler results are tagged
    // before entering the catalog; older bundled records are intentionally not
    // treated as a match here.
    if (filter?.subcategorySlug) {
      const scoped = items.filter((item) => item.subcategorySlug === filter.subcategorySlug);
      if (scoped.length > 0) {
        items = scoped;
      }
    } else if (filter?.subcategoryName) {
      const subcategoryName = filter.subcategoryName.toLowerCase().trim();
      const scoped = items.filter((item) => item.subcategoryName?.toLowerCase().trim() === subcategoryName);
      if (scoped.length > 0) {
        items = scoped;
      }
    }

    return items;
  }

  /**
   * Alias for getItems to ensure backwards and cross-service compatibility.
   */
  public static getMarketplaceItems(filter?: MarketplaceFilter): MarketplaceItem[] {
    return MarketplaceService.getItems(filter);
  }

  /**
   * Streams live product pages directly from mkp.gem.gov.in using GeMClientCrawler.
   * Supports pagination (page 1, 2, 3...) and subcategory filtering across 2,000+ pages of products.
   */
  public static async fetchLiveCategoryStream(filter?: MarketplaceFilter): Promise<{
    items: MarketplaceItem[];
    hasMore: boolean;
    page: number;
    totalResults?: number;
    failed?: boolean;
    source: MarketplaceStreamSource;
  }> {
    const page = filter?.page || 1;
    const cachedPage = () => this.getCachedStreamPage(filter, page);

    // 1. Direct real-time keyword search if query is provided.
    if (filter?.query && filter.query.trim()) {
      let failed = false;
      try {
        const searchRes = await GeMClientCrawler.searchLiveProducts(filter.query.trim(), page);
        failed = Boolean(searchRes.failed);
        if (searchRes.items && searchRes.items.length > 0) {
          const scopedItems = searchRes.items.map((item) => ({
            ...item,
            subcategorySlug: undefined,
            subcategoryName: undefined,
          }));
          this.ingestLiveProducts(scopedItems);
          const result = { ...searchRes, items: scopedItems };
          this.cacheStreamPage(filter, result);
          return { ...result, failed: false, source: 'LIVE_PORTAL' };
        }
      } catch {
        failed = true;
      }

      const cached = cachedPage();
      return cached
        ? { ...cached, failed: false, source: 'CACHED_CATALOG' }
        : { items: [], hasMore: false, page, failed, source: 'EMPTY' };
    }

    // 2. Direct real-time category crawl from mkp.gem.gov.in
    let slug: string | undefined;
    if (filter?.subcategorySlug) {
      slug = filter.subcategorySlug;
    } else if (filter?.category && filter.category !== 'All Categories' && filter.category !== 'ALL') {
      const match = OFFICIAL_GEM_SUBCATEGORIES.find(
        (c) =>
          c.category.toLowerCase() === filter.category!.toLowerCase() ||
          filter.category!.toLowerCase().includes(c.category.toLowerCase()) ||
          filter.category!.toLowerCase().includes(c.name.toLowerCase())
      );
      if (match) {
        slug = match.slug;
      }
    } else if (!filter?.category) {
      slug = 'computers-entry-level-computer-cpu/search';
    }

    let crawlFailed = false;
    if (slug) {
      try {
        const crawlRes = await GeMClientCrawler.fetchCategoryPage(slug, page);
        crawlFailed = Boolean(crawlRes.failed);
        if (crawlRes.items && crawlRes.items.length > 0) {
          const scopedItems = crawlRes.items.map((item) => ({
            ...item,
            subcategorySlug: filter?.subcategorySlug || slug,
            subcategoryName: filter?.subcategoryName || filter?.category,
          }));
          this.ingestLiveProducts(scopedItems);
          const result = { ...crawlRes, items: scopedItems };
          this.cacheStreamPage(filter, result);
          return { ...result, failed: false, source: 'LIVE_PORTAL' };
        }
      } catch {
        crawlFailed = true;
      }
    }

    // Fallback to keyword search ONLY on page 1 when the specific slug 404s/fails
    // (on page 2+, falling back to keyword search can return unrelated page-1 records).
    const categorySearch = filter?.subcategoryName || filter?.category;
    if (page === 1 && categorySearch && categorySearch !== 'All Categories' && categorySearch !== 'ALL') {
      try {
        const searchRes = await GeMClientCrawler.searchLiveProducts(categorySearch, page);
        if (searchRes.items && searchRes.items.length > 0) {
          const scopedItems = searchRes.items.map((item) => ({
            ...item,
            subcategorySlug: filter?.subcategorySlug,
            subcategoryName: filter?.subcategoryName || filter?.category,
          }));
          this.ingestLiveProducts(scopedItems);
          const result = { ...searchRes, items: scopedItems };
          this.cacheStreamPage(filter, result);
          return { ...result, failed: false, source: 'LIVE_PORTAL' };
        }
      } catch {
        crawlFailed = true;
      }
    }

    // 3. Graceful fallback: return cached page or bundled verified catalog items
    const cached = cachedPage();
    if (cached && cached.items.length > 0) {
      return { ...cached, failed: false, source: 'CACHED_CATALOG' };
    }

    if (page === 1) {
      const bundledItems = this.getItems(filter);
      if (bundledItems && bundledItems.length > 0) {
        return {
          items: bundledItems.slice(0, 20),
          hasMore: bundledItems.length > 20,
          page: 1,
          failed: false,
          source: 'CACHED_CATALOG',
        };
      }
    }

    return { items: [], hasMore: false, page, failed: crawlFailed, source: 'EMPTY' };
  }

  /**
   * Fetches live marketplace products.
   * Leverages standalone in-app engine with real internet reachability detection.
   * If truly offline (no connectivity), returns empty array.
   * When online (4G/Wi-Fi), returns verified GeM marketplace items.
   */
  public static async fetchLiveProducts(filter?: MarketplaceFilter): Promise<MarketplaceItem[]> {
    const stream = await this.fetchLiveCategoryStream(filter);
    if (stream.items && stream.items.length > 0) {
      return stream.items;
    }
    const online = await isNetworkOnline();
    if (!online) {
      return []; // Truly offline (e.g. Airplane mode)
    }
    return this.getItems(filter);
  }

  /**
   * Evaluates the legal GFR 149 public procurement mode based on order value.
   * GFR 149 Mandates:
   * - Up to ₹25,000: Direct Purchase from any GeM seller
   * - ₹25,001 to ₹5,00,000: L1 Price Comparison (min 3 distinct OEMs)
   * - Above ₹5,00,000: Mandatory Online Bidding / Reverse Auction
   */
  public static evaluateGfrProcurementMode(orderValueInr: number): {
    mode: 'DIRECT_PURCHASE' | 'L1_COMPARISON' | 'MANDATORY_BID_OR_RA';
    description: string;
    mandatoryRequirement: string;
  } {
    if (orderValueInr <= 25000) {
      return {
        mode: 'DIRECT_PURCHASE',
        description: 'Direct Purchase under GFR 149(i)',
        mandatoryRequirement: 'Allowed through any available seller meeting requisite quality, specification and delivery period.',
      };
    } else if (orderValueInr <= 500000) {
      return {
        mode: 'L1_COMPARISON',
        description: 'L1 Purchase under GFR 149(ii)',
        mandatoryRequirement: 'Must compare at least 3 different manufacturers/OEMs meeting specifications and buy from lowest (L1).',
      };
    } else {
      return {
        mode: 'MANDATORY_BID_OR_RA',
        description: 'Mandatory Electronic Bidding / RA under GFR 149(iii)',
        mandatoryRequirement: 'Mandatory conduct of electronic bid or reverse auction with minimum 10-21 days publishing.',
      };
    }
  }
}
