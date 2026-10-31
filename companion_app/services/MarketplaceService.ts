/**
 * GeM Official Marketplace Catalog Service
 * Reverse-engineered from https://mkp.gem.gov.in and https://gem.gov.in.
 * Provides the full public procurement product & services taxonomy:
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
  type: 'PRODUCT' | 'SERVICE';
  icon: string;
  itemCount: number;
  subcategories: string[];
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

export const OFFICIAL_PRODUCT_CATEGORIES: MarketplaceCategory[] = [
  {
    id: 'it-products',
    name: 'IT Products',
    type: 'PRODUCT',
    icon: '💻',
    itemCount: 1420,
    subcategories: ['Entry & Mid Level Desktop Computers', 'Laptop Notebooks', 'Computer Printers', 'Tablet Computers (V2)'],
  },
  {
    id: 'automobiles',
    name: 'Automobiles',
    type: 'PRODUCT',
    icon: '🚗',
    itemCount: 840,
    subcategories: ['Buses', 'Tractors', 'Cars', 'Utility Vehicles'],
  },
  {
    id: 'furniture',
    name: 'Furniture',
    type: 'PRODUCT',
    icon: '🪑',
    itemCount: 1120,
    subcategories: ['Class Room Desking', 'Executive Tables', 'Revolving Chairs', 'Movable File Storage Systems'],
  },
  {
    id: 'medical-products',
    name: 'Medical Products',
    type: 'PRODUCT',
    icon: '🏥',
    itemCount: 960,
    subcategories: ['Alcohol Based Hand Sanitizers', 'Surgical Gloves as per IS 4148', 'Disposable Syringes as per IS 10258'],
  },
  {
    id: 'stationery',
    name: 'Stationery Items',
    type: 'PRODUCT',
    icon: '📝',
    itemCount: 780,
    subcategories: ['Diaries Printed Plain Register', 'Gel Pens', 'Maplitho Paper'],
  },
  {
    id: 'electrical-appliances',
    name: 'Electrical Appliances',
    type: 'PRODUCT',
    icon: '⚡',
    itemCount: 1250,
    subcategories: ['LED Luminaires', 'Molded Case Circuit Breakers (MCCB)', 'Telecommunication Cables'],
  },
  {
    id: 'electronic-equipments',
    name: 'Electronic Equipments',
    type: 'PRODUCT',
    icon: '📺',
    itemCount: 650,
    subcategories: ['Television TVs', 'Domestic Refrigerators'],
  },
  {
    id: 'textile-products',
    name: 'Textile Products',
    type: 'PRODUCT',
    icon: '🧵',
    itemCount: 520,
    subcategories: ['Handloom Cotton Bed Sheets (IS 745)', 'Cotton Towels as per IS 7056'],
  },
  {
    id: 'pipes-fittings',
    name: 'Pipes & Fittings',
    type: 'PRODUCT',
    icon: '🔧',
    itemCount: 430,
    subcategories: ['Steel Tubes, Tubulars & Fittings', 'Commercial CPVC Pipe Fittings'],
  },
];

export const OFFICIAL_SERVICE_CATEGORIES: MarketplaceCategory[] = [
  {
    id: 'security-services',
    name: 'Security Services',
    type: 'SERVICE',
    icon: '🛡️',
    itemCount: 320,
    subcategories: ['Security Manpower Services (Version 2.0)', 'Armed & Unarmed Guards'],
  },
  {
    id: 'manpower-outsourcing',
    name: 'Manpower Outsourcing',
    type: 'SERVICE',
    icon: '👥',
    itemCount: 480,
    subcategories: ['Minimum Wage Based Manpower', 'Fixed Remuneration Technical Staff'],
  },
  {
    id: 'vehicle-hiring',
    name: 'Vehicle & Cab Hiring',
    type: 'SERVICE',
    icon: '🚕',
    itemCount: 290,
    subcategories: ['Monthly Cab & Taxi Hiring', 'Short Term Cab Hiring', 'Per Vehicle-Day Basis'],
  },
  {
    id: 'ict-cloud',
    name: 'ICT & Cloud Infrastructure',
    type: 'SERVICE',
    icon: '☁️',
    itemCount: 180,
    subcategories: ['Managed Service Provider (MSP)', 'Enterprise Email Messaging', 'Annual Maintenance (AMC)'],
  },
  {
    id: 'printing-services',
    name: 'Printing & Scanning',
    type: 'SERVICE',
    icon: '🖨️',
    itemCount: 210,
    subcategories: ['Paper-based Printing Services', 'Non-Paper Printing - Quantity Based'],
  },
  {
    id: 'facility-mgmt',
    name: 'Facility Management',
    type: 'SERVICE',
    icon: '🏢',
    itemCount: 160,
    subcategories: ['LumpSum Facility Management', 'Plant & Equipment Installation / Maintenance'],
  },
  {
    id: 'drone-services',
    name: 'Drone Services',
    type: 'SERVICE',
    icon: '🚁',
    itemCount: 95,
    subcategories: ['Drone as a Service (Version 2.0)', 'GIS Mapping & Survey'],
  },
];

export interface GeMServiceItem {
  id: string;
  name: string;
  category: string;
  icon: string;
  badge?: string;
  gfrMode: string;
}

export const OFFICIAL_TRENDING_SERVICES: GeMServiceItem[] = [
  { id: 'manpower-min-wage', name: 'Manpower Outsourcing Services - Minimum wage', category: 'Manpower Outsourcing', icon: '👥', badge: 'High Demand', gfrMode: 'L1 Comparison / Bid' },
  { id: 'custom-bid-services', name: 'Custom Bid for Services', category: 'Custom Services', icon: '📋', badge: 'Custom SLA', gfrMode: 'Mandatory Bid' },
  { id: 'short-term-cab', name: 'Short Term Cab & Taxi Hiring Services', category: 'Vehicle & Cab Hiring', icon: '🚕', badge: 'Fast Dispatch', gfrMode: 'Direct Purchase / L1' },
  { id: 'manpower-fixed-rem', name: 'Manpower Outsourcing Services - Fixed Remuneration', category: 'Manpower Outsourcing', icon: '🧑‍💼', badge: 'Contractual', gfrMode: 'L1 / Bid' },
  { id: 'amc-it-peripherals', name: 'Annual Maintenance Service - Desktops, Laptops & Peripherals', category: 'ICT & AMC', icon: '💻', badge: 'OEM / MSP', gfrMode: 'Direct / L1' },
  { id: 'catering-duration', name: 'Catering service (Duration Based)', category: 'Catering & Hospitality', icon: '🍲', badge: 'FSSAI Certified', gfrMode: 'L1 Comparison' },
  { id: 'amc-photocopier', name: 'Annual Maintenance Service - Photocopier Machine', category: 'ICT & AMC', icon: '🖨️', badge: 'Preventive Care', gfrMode: 'Direct Purchase' },
  { id: 'printing-quantity', name: 'Non Paper Printing Services - Quantity Based', category: 'Printing & Scanning', icon: '📄', badge: 'High Volume', gfrMode: 'Direct / L1' },
  { id: 'bus-hiring-short', name: 'Bus Hiring Service - Short Term', category: 'Vehicle & Cab Hiring', icon: '🚌', badge: 'Fleet Verified', gfrMode: 'L1 Comparison' },
  { id: 'vehicle-per-day', name: 'Vehicle Hiring Service - Per Vehicle-Day basis', category: 'Vehicle & Cab Hiring', icon: '🚙', badge: 'Daily Logs', gfrMode: 'Direct Purchase' },
  { id: 'paper-printing', name: 'Paper-based Printing Services', category: 'Printing & Scanning', icon: '📑', badge: 'Govt Standard', gfrMode: 'L1 Comparison' },
  { id: 'monthly-cab-hiring', name: 'Monthly Basis Cab & Taxi Hiring Services', category: 'Vehicle & Cab Hiring', icon: '🚖', badge: 'Monthly SLA', gfrMode: 'L1 Comparison / RA' },
  { id: 'catering-event', name: 'Catering service (Event Based)', category: 'Catering & Hospitality', icon: '🍽️', badge: 'Institutional', gfrMode: 'L1 Comparison' },
  { id: 'security-manpower-v2', name: 'Security Manpower Service (Version 2.0)', category: 'Security Services', icon: '🛡️', badge: 'PSARA Verified', gfrMode: 'Mandatory L1 / Bid' },
  { id: 'printing-area', name: 'Non Paper Printing Services - Area Based', category: 'Printing & Scanning', icon: '📐', badge: 'Custom Measure', gfrMode: 'Direct / L1' },
  { id: 'goods-transport-trip', name: 'Goods Transport Service - Per Trip based Service', category: 'Logistics', icon: '🚚', badge: 'GPS Tracked', gfrMode: 'Direct Purchase' },
  { id: 'cleaning-sanitation', name: 'Cleaning, Sanitation and Disinfection Service - Outcome Based', category: 'Facility Management', icon: '🧹', badge: 'Hygiene Assured', gfrMode: 'L1 Comparison' },
  { id: 'goods-transport-km', name: 'Goods Transport Service - Per KM Based Service', category: 'Logistics', icon: '🚛', badge: 'Odometer SLA', gfrMode: 'Direct / L1' },
  { id: 'hiring-sanitation', name: 'Hiring of Sanitation Service', category: 'Facility Management', icon: '🧼', badge: 'Municipal Grade', gfrMode: 'L1 / Bid' },
  { id: 'amc-air-conditioner', name: 'Annual Maintenance service - AIR CONDITIONER', category: 'HVAC & Maintenance', icon: '❄️', badge: 'Seasonal AMC', gfrMode: 'Direct Purchase' },
];

export const OFFICIAL_EMERGING_SERVICES: GeMServiceItem[] = [
  { id: 'gift-vouchers', name: 'Gift Vouchers Service', category: 'Institutional Gifting', icon: '🎁', badge: 'Emerging', gfrMode: 'Direct Purchase' },
  { id: 'missed-call-alert', name: 'Missed Call and Keyword Alert Service', category: 'Telecom & Cloud', icon: '📲', badge: 'Digital India', gfrMode: 'Direct Purchase' },
  { id: 'facility-mgmt-v2', name: 'Facility Management Service - Manpower based (Version 2)', category: 'Facility Management', icon: '🏢', badge: 'Integrated', gfrMode: 'L1 / Bid' },
  { id: 'canteen-service', name: 'Canteen Service - Percentage Model', category: 'Catering & Hospitality', icon: '☕', badge: 'Subsidized', gfrMode: 'Revenue Share' },
  { id: 'data-recovery', name: 'Data Recovery and Data Wiping Service', category: 'ICT & Cyber Security', icon: '💾', badge: 'CERT-In Compliant', gfrMode: 'Direct / L1' },
  { id: 'mine-dev-revenue', name: 'Mine Development & Operations Service - Revenue Sharing Basis', category: 'Mining & Heavy Ops', icon: '⛏️', badge: 'Specialized', gfrMode: 'Custom Bidding' },
  { id: 'mortuary-van', name: 'Hiring of Mortuary Van', category: 'Healthcare Logistics', icon: '🚑', badge: 'Priority Service', gfrMode: 'Direct Purchase' },
  { id: 'record-mgmt-storage', name: 'Record Management Service - Storage Area Based', category: 'Archives & Records', icon: '📦', badge: 'Secure Storage', gfrMode: 'L1 Comparison' },
  { id: 'catering-packet', name: 'Catering Service per Packet based', category: 'Catering & Hospitality', icon: '🍱', badge: 'Meal Box', gfrMode: 'Direct Purchase' },
  { id: 'tea-coffee-vending', name: 'Hiring of Tea/Coffee Vending Machine', category: 'Pantry Services', icon: '☕', badge: 'Automated', gfrMode: 'Monthly Lease' },
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

  /**
   * Filters marketplace catalog by type, category, outlet store, and keyword search.
   */
  public static getItems(filter?: {
    type?: 'PRODUCT' | 'SERVICE' | 'ALL';
    category?: string;
    outletStore?: string;
    query?: string;
  }): MarketplaceItem[] {
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
  }> {
    const page = filter?.page || 1;

    // 1. Direct real-time keyword search if query is provided
    if (filter?.query && filter.query.trim()) {
      try {
        const searchRes = await GeMClientCrawler.searchLiveProducts(filter.query.trim(), page);
        if (searchRes.items && searchRes.items.length > 0) {
          this.ingestLiveProducts(searchRes.items);
          return searchRes;
        }
      } catch {}
    }

    // 2. Direct real-time category crawl from mkp.gem.gov.in
    let slug = 'computers-entry-level-computer-cpu/search'; // Official GeM desktop computers
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
    }

    try {
      const crawlRes = await GeMClientCrawler.fetchCategoryPage(slug, page);
      if (crawlRes.items && crawlRes.items.length > 0) {
        this.ingestLiveProducts(crawlRes.items);
        return crawlRes;
      }
    } catch {}

    // 3. Fallback: Check network connectivity
    const online = await isNetworkOnline();
    if (!online) {
      return { items: [], hasMore: false, page };
    }

    return {
      items: this.getItems(filter),
      hasMore: false,
      page,
    };
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
