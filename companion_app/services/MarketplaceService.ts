/**
 * GeM Official Marketplace Catalog Service
 * Reverse-engineered from https://mkp.gem.gov.in and https://gem.gov.in.
 * Provides the full public procurement product & services taxonomy:
 * - 9 Popular Product Categories (IT, Automobiles, Furniture, Medical, Stationery, etc.)
 * - Trending & Emerging Services (Security, Manpower, Cabs, Cloud, AMC, Drones)
 * - GeM Outlet Stores (Saras Ajeevika, ODOP, Startup Runway, Womaniya, Millets)
 * - GFR Rule 149 Procurement Mode Thresholds (Direct Purchase, L1 Comparison, Mandatory Bidding)
 */

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

export const MOCK_MARKETPLACE_ITEMS: MarketplaceItem[] = [
  // IT Products
  {
    id: 'itm-001',
    title: 'Mid Level Desktop Computer Core i7 16GB 512GB SSD',
    category: 'IT Products',
    type: 'PRODUCT',
    l1PriceInr: 58500,
    priceUnit: 'per Unit',
    minOrderQty: 1,
    oemBrand: 'HP / Dell / Lenovo OEM Verified',
    rating: 4.8,
    totalOrders: 18400,
    specSummary: {
      Processor: 'Intel Core i7 13th Gen (16 Cores)',
      RAM: '16 GB DDR5 Expandable to 64GB',
      Storage: '512 GB M.2 NVMe SSD',
      OperatingSystem: 'Windows 11 Pro Genuine',
      Display: '23.8 Inch IPS FHD Borderless Monitor',
    },
    procurementModes: ['DIRECT_PURCHASE', 'L1_COMPARISON', 'BID'],
    msePreference: true,
    makeInIndiaPercent: 65,
    isAvailableOnGeM: true,
  },
  {
    id: 'itm-002',
    title: 'Business Laptop Notebook 14 Inch FHD Lightweight',
    category: 'IT Products',
    type: 'PRODUCT',
    l1PriceInr: 54900,
    priceUnit: 'per Unit',
    minOrderQty: 1,
    oemBrand: 'Acer / ASUS OEM',
    rating: 4.7,
    totalOrders: 14200,
    specSummary: {
      Processor: 'Intel Core i5 1335U',
      RAM: '16 GB LPDDR5',
      Storage: '512 GB SSD',
      BatteryLife: 'Up to 11 Hours',
      Weight: '1.38 kg',
    },
    procurementModes: ['DIRECT_PURCHASE', 'L1_COMPARISON', 'BID'],
    msePreference: true,
    makeInIndiaPercent: 55,
    isAvailableOnGeM: true,
  },
  // Electrical Appliances
  {
    id: 'itm-003',
    title: '70W Energy Efficient Street LED Luminaire IP66',
    category: 'Electrical Appliances',
    type: 'PRODUCT',
    l1PriceInr: 2850,
    priceUnit: 'per Piece',
    minOrderQty: 10,
    oemBrand: 'Havells / Surya / Bajaj',
    rating: 4.9,
    totalOrders: 92000,
    specSummary: {
      Wattage: '70 Watts',
      Efficacy: '140 Lumens / Watt',
      IngressProtection: 'IP66 Waterproof & Dustproof',
      SurgeProtection: '10 kV Integrated SPD',
      Warranty: '5 Years Onsite Comprehensive',
    },
    procurementModes: ['DIRECT_PURCHASE', 'L1_COMPARISON', 'BID', 'REVERSE_AUCTION'],
    msePreference: true,
    makeInIndiaPercent: 88,
    outletStore: 'odop',
    isAvailableOnGeM: true,
  },
  // Medical Products
  {
    id: 'itm-004',
    title: 'Sterile Surgical Examination Gloves as per IS 4148',
    category: 'Medical Products',
    type: 'PRODUCT',
    l1PriceInr: 14,
    priceUnit: 'per Pair',
    minOrderQty: 500,
    oemBrand: 'HLL / Medilife IS:4148',
    rating: 4.9,
    totalOrders: 540000,
    specSummary: {
      Material: 'Natural Rubber Latex',
      Standard: 'IS:4148 / EN 455 Certified',
      Sterilization: 'Gamma Irradiated Sterile',
      Sizes: '6.5, 7.0, 7.5, 8.0 Available',
    },
    procurementModes: ['DIRECT_PURCHASE', 'L1_COMPARISON', 'BID'],
    msePreference: true,
    makeInIndiaPercent: 95,
    isAvailableOnGeM: true,
  },
  // Automobiles
  {
    id: 'itm-005',
    title: '32-Seater BS-VI Low Floor City Transit Staff Bus',
    category: 'Automobiles',
    type: 'PRODUCT',
    l1PriceInr: 2850000,
    priceUnit: 'per Vehicle',
    minOrderQty: 1,
    oemBrand: 'Tata Motors / Ashok Leyland',
    rating: 4.8,
    totalOrders: 3200,
    specSummary: {
      Seating: '32 Passenger + Driver',
      Engine: 'BS-VI Diesel / CNG',
      Safety: 'ABS, Rear Camera, Panic Buttons',
      AirConditioning: 'Roof-Mounted HVAC 18kW',
    },
    procurementModes: ['BID', 'REVERSE_AUCTION'],
    msePreference: false,
    makeInIndiaPercent: 80,
    isAvailableOnGeM: true,
  },
  // Furniture
  {
    id: 'itm-006',
    title: 'Ergonomic High Back Revolving Chair with Lumbar Support',
    category: 'Furniture',
    type: 'PRODUCT',
    l1PriceInr: 5800,
    priceUnit: 'per Chair',
    minOrderQty: 5,
    oemBrand: 'Godrej Interio / Featherlite',
    rating: 4.7,
    totalOrders: 38000,
    specSummary: {
      Mechanism: 'Synchro-Tilt with Multi-Lock',
      Lumbar: 'Adjustable 2D Lumbar Support',
      Base: 'Nylon 5-Prong Base with Castors',
      Certification: 'BIFMA X5.1 Certified',
    },
    procurementModes: ['DIRECT_PURCHASE', 'L1_COMPARISON', 'BID'],
    msePreference: true,
    makeInIndiaPercent: 75,
    isAvailableOnGeM: true,
  },
  // Trending Services
  {
    id: 'itm-007',
    title: 'Security Manpower Service (Version 2.0)',
    category: 'Security Services',
    type: 'SERVICE',
    l1PriceInr: 22400,
    priceUnit: 'per Guard / Month',
    minOrderQty: 3,
    oemBrand: 'DGR Empanelled Agencies',
    rating: 4.8,
    totalOrders: 4100,
    specSummary: {
      SLACompliance: 'DGR / PSARA Registered Agency',
      Wages: 'Central Minimum Wages + EPF + ESIC + 5% Admin',
      ShiftDuration: '8 Hours / Shift 24x7 Coverage',
      RelieverCharges: '1/6th Reliever Mandatory Included',
    },
    procurementModes: ['BID', 'REVERSE_AUCTION'],
    msePreference: true,
    makeInIndiaPercent: 100,
    isAvailableOnGeM: true,
  },
  {
    id: 'itm-008',
    title: 'Monthly Cab & Taxi Hiring Services (Sedan / SUV)',
    category: 'Vehicle & Cab Hiring',
    type: 'SERVICE',
    l1PriceInr: 38000,
    priceUnit: 'per Vehicle / Month',
    minOrderQty: 1,
    oemBrand: 'Verified Fleet Operators',
    rating: 4.6,
    totalOrders: 9800,
    specSummary: {
      Coverage: '2000 KM & 250 Hours / Month',
      VehicleAge: 'Under 2 Years Old (<50,000 KM)',
      FuelAndDriver: 'Commercial Yellow Plate All Inclusive',
      GPS: 'Real-time VTS GPS tracking mandatory',
    },
    procurementModes: ['BID', 'L1_COMPARISON'],
    msePreference: true,
    makeInIndiaPercent: 100,
    isAvailableOnGeM: true,
  },
  {
    id: 'itm-009',
    title: 'Drone as a Service (V2.0) - GIS Mapping & Land Survey',
    category: 'Drone Services',
    type: 'SERVICE',
    l1PriceInr: 85000,
    priceUnit: 'per Sq. KM Survey',
    minOrderQty: 1,
    oemBrand: 'DGCA Certified Drone Operators',
    rating: 4.9,
    totalOrders: 650,
    specSummary: {
      Resolution: 'Sub-5cm Ground Sample Distance (GSD)',
      Equipment: 'DGCA Type Certified Drone with RTK/PPK',
      Outputs: 'Orthomosaic, Digital Surface Model (DSM), 3D Contours',
      Compliance: 'DigitalSky Flight Permissions Pre-Cleared',
    },
    procurementModes: ['BID'],
    msePreference: true,
    makeInIndiaPercent: 90,
    outletStore: 'startup-runway',
    isAvailableOnGeM: true,
  },
  {
    id: 'itm-010',
    title: 'Saras Ajeevika Handloom Cotton Bed Sheet with Pillow Covers',
    category: 'Textile Products',
    type: 'PRODUCT',
    l1PriceInr: 650,
    priceUnit: 'per Set',
    minOrderQty: 10,
    oemBrand: 'MoRD Ajeevika SHG Federation',
    rating: 4.9,
    totalOrders: 18200,
    specSummary: {
      Weave: '100% Handloom Cotton 200 Thread Count',
      Certification: 'Handloom Mark / Craftmark Certified',
      Artisans: 'Rural Women Self Help Group Co-op',
      Dimensions: '228 cm x 274 cm (Double Bed)',
    },
    procurementModes: ['DIRECT_PURCHASE', 'L1_COMPARISON'],
    msePreference: true,
    makeInIndiaPercent: 100,
    outletStore: 'saras-ajeevika',
    isAvailableOnGeM: true,
  },
];

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

  /**
   * Filters marketplace catalog by type, category, outlet store, and keyword search.
   */
  public static getItems(filter?: {
    type?: 'PRODUCT' | 'SERVICE' | 'ALL';
    category?: string;
    outletStore?: string;
    query?: string;
  }): MarketplaceItem[] {
    let items = [...MOCK_MARKETPLACE_ITEMS];

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
