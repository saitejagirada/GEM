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
    mrpInr: 72000,
    discountPercent: 19,
    priceUnit: 'per Unit',
    unitText: '1 Desktop Set (Monitor + CPU + K/B)',
    minOrderQty: 1,
    oemBrand: 'HP / Dell / Lenovo OEM Verified',
    rating: 4.8,
    totalOrders: 18400,
    imageUrl: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=500&auto=format&fit=crop&q=80',
    etaDelivery: '⚡ 3-5 Day GeM Express',
    badge: 'L1 Lowest',
    inStock: true,
    stockCount: 450,
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
    mrpInr: 68000,
    discountPercent: 19,
    priceUnit: 'per Unit',
    unitText: '1 Laptop Unit with Backpack',
    minOrderQty: 1,
    oemBrand: 'Acer / ASUS OEM',
    rating: 4.7,
    totalOrders: 14200,
    imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&auto=format&fit=crop&q=80',
    etaDelivery: '⚡ 2-4 Day Delivery',
    badge: 'Bestseller',
    inStock: true,
    stockCount: 620,
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
    mrpInr: 3800,
    discountPercent: 25,
    priceUnit: 'per Piece',
    unitText: 'Pack of 10 Pieces',
    minOrderQty: 10,
    oemBrand: 'Havells / Surya / Bajaj',
    rating: 4.9,
    totalOrders: 92000,
    imageUrl: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?w=500&auto=format&fit=crop&q=80',
    etaDelivery: '⚡ 3-5 Days Direct',
    badge: 'ODOP Indigenous',
    inStock: true,
    stockCount: 1800,
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
    mrpInr: 22,
    discountPercent: 36,
    priceUnit: 'per Pair',
    unitText: 'Box of 100 Pairs (Pack of 5)',
    minOrderQty: 500,
    oemBrand: 'HLL / Medilife IS:4148',
    rating: 4.9,
    totalOrders: 540000,
    imageUrl: 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=500&auto=format&fit=crop&q=80',
    etaDelivery: '⚡ 24-48 Hours Express',
    badge: '100% MSE Exemption',
    inStock: true,
    stockCount: 15000,
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
    mrpInr: 3200000,
    discountPercent: 11,
    priceUnit: 'per Vehicle',
    unitText: '1 Fully Built Passenger Bus',
    minOrderQty: 1,
    oemBrand: 'Tata Motors / Ashok Leyland',
    rating: 4.8,
    totalOrders: 3200,
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&auto=format&fit=crop&q=80',
    etaDelivery: '7-14 Days Dispatch',
    badge: 'Class 1 MII',
    inStock: true,
    stockCount: 14,
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
    mrpInr: 8500,
    discountPercent: 32,
    priceUnit: 'per Chair',
    unitText: '1 Pre-Assembled Chair',
    minOrderQty: 5,
    oemBrand: 'Godrej Interio / Featherlite',
    rating: 4.7,
    totalOrders: 38000,
    imageUrl: 'https://images.unsplash.com/photo-1580481077195-c277717f41cf?w=500&auto=format&fit=crop&q=80',
    etaDelivery: '⚡ 3-5 Days Direct',
    badge: 'BIFMA Certified',
    inStock: true,
    stockCount: 840,
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
    mrpInr: 25000,
    discountPercent: 10,
    priceUnit: 'per Guard / Month',
    unitText: 'Per Deployed Guard / Month',
    minOrderQty: 3,
    oemBrand: 'DGR Empanelled Agencies',
    rating: 4.8,
    totalOrders: 4100,
    imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=500&auto=format&fit=crop&q=80',
    etaDelivery: 'Immediate Deployment',
    badge: 'DGR Empanelled',
    inStock: true,
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
    mrpInr: 42000,
    discountPercent: 10,
    priceUnit: 'per Vehicle / Month',
    unitText: 'Per Commercial Vehicle / Month',
    minOrderQty: 1,
    oemBrand: 'Verified Fleet Operators',
    rating: 4.6,
    totalOrders: 9800,
    imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500&auto=format&fit=crop&q=80',
    etaDelivery: '48h Fleet Deployment',
    badge: 'GPS VTS Tracked',
    inStock: true,
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
    mrpInr: 98000,
    discountPercent: 13,
    priceUnit: 'per Sq. KM Survey',
    unitText: 'Per Sq. KM Survey with Orthomosaic',
    minOrderQty: 1,
    oemBrand: 'DGCA Certified Drone Operators',
    rating: 4.9,
    totalOrders: 650,
    imageUrl: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=500&auto=format&fit=crop&q=80',
    etaDelivery: '72h Field Mobilization',
    badge: 'DPIIT Startup',
    inStock: true,
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
    mrpInr: 950,
    discountPercent: 32,
    priceUnit: 'per Set',
    unitText: 'Double Bed Set (1 Sheet + 2 Covers)',
    minOrderQty: 10,
    oemBrand: 'MoRD Ajeevika SHG Federation',
    rating: 4.9,
    totalOrders: 18200,
    imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&auto=format&fit=crop&q=80',
    etaDelivery: '⚡ 3-5 Days Delivery',
    badge: 'SHG Artisan Handloom',
    inStock: true,
    stockCount: 1200,
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
  // Expanded Real-Time High Velocity Products (Instamart & Blinkit Style)
  {
    id: 'itm-011',
    title: 'JK Copier A4 Multipurpose Office Copier Paper 75 GSM',
    category: 'Stationery Items',
    type: 'PRODUCT',
    l1PriceInr: 1340,
    mrpInr: 1850,
    discountPercent: 28,
    priceUnit: 'per Carton',
    unitText: 'Carton of 5 Reams (2,500 Sheets)',
    minOrderQty: 2,
    oemBrand: 'JK Paper Ltd (FSC Certified)',
    rating: 4.9,
    totalOrders: 310000,
    imageUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=500&auto=format&fit=crop&q=80',
    etaDelivery: '⚡ Same Day / 24h Express',
    badge: 'Pantry Essential',
    inStock: true,
    stockCount: 3500,
    specSummary: {
      GSM: '75 GSM Ultra Bright',
      Brightness: '98% ISO Brightness',
      Compatibility: 'High Speed Laser & Inkjet Printers',
      Packaging: 'Moisture-proof Poly Wrap Box',
    },
    procurementModes: ['DIRECT_PURCHASE', 'L1_COMPARISON'],
    msePreference: true,
    makeInIndiaPercent: 100,
    isAvailableOnGeM: true,
  },
  {
    id: 'itm-012',
    title: '3M Aura N95 Particulate Disposable Respirator Masks (IS 9473)',
    category: 'Medical Products',
    type: 'PRODUCT',
    l1PriceInr: 890,
    mrpInr: 1500,
    discountPercent: 41,
    priceUnit: 'per Box',
    unitText: 'Box of 50 Respirator Masks',
    minOrderQty: 2,
    oemBrand: '3M India Healthcare',
    rating: 4.9,
    totalOrders: 145000,
    imageUrl: 'https://images.unsplash.com/photo-1586942593568-29361efcd571?w=500&auto=format&fit=crop&q=80',
    etaDelivery: '⚡ 24h Delivery',
    badge: 'NIOSH / BIS Certified',
    inStock: true,
    stockCount: 4200,
    specSummary: {
      Filtration: '≥ 95% Filtration against non-oil aerosols',
      Design: '3-Panel Flat-Fold Design with Embossed Top Panel',
      Standard: 'BIS IS 9473 & NIOSH N95 Approved',
    },
    procurementModes: ['DIRECT_PURCHASE', 'L1_COMPARISON'],
    msePreference: true,
    makeInIndiaPercent: 70,
    isAvailableOnGeM: true,
  },
  {
    id: 'itm-013',
    title: 'Canon imageRUNNER Network Laser Multi-Function Photocopier / Printer',
    category: 'IT Products',
    type: 'PRODUCT',
    l1PriceInr: 27400,
    mrpInr: 38000,
    discountPercent: 28,
    priceUnit: 'per Unit',
    unitText: '1 Multi-Function Floor Machine',
    minOrderQty: 1,
    oemBrand: 'Canon India / HP',
    rating: 4.8,
    totalOrders: 8200,
    imageUrl: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=500&auto=format&fit=crop&q=80',
    etaDelivery: '⚡ 2-3 Days Free Onsite Demo',
    badge: 'L1 Direct',
    inStock: true,
    stockCount: 180,
    specSummary: {
      Speed: '25 Pages Per Minute (Duplex A4/A3)',
      Functions: 'Print, Copy, Color Scan, Network Send',
      Connectivity: 'Gigabit Ethernet + Wi-Fi Direct',
      Warranty: '3 Years Comprehensive Onsite',
    },
    procurementModes: ['DIRECT_PURCHASE', 'L1_COMPARISON', 'BID'],
    msePreference: true,
    makeInIndiaPercent: 60,
    isAvailableOnGeM: true,
  },
  {
    id: 'itm-014',
    title: 'Shree Anna Organic Barnyard & Foxtail Nutri-Millets Combo',
    category: 'Textile Products',
    type: 'PRODUCT',
    l1PriceInr: 410,
    mrpInr: 620,
    discountPercent: 34,
    priceUnit: 'per Pack',
    unitText: 'Combo Pack of 2 kg (1kg x 2)',
    minOrderQty: 5,
    oemBrand: 'TRIFED / Shree Anna Farmer Producer Org',
    rating: 4.9,
    totalOrders: 29000,
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80',
    etaDelivery: '⚡ 24-48 Hours Express',
    badge: 'Shree Anna FPO',
    inStock: true,
    stockCount: 5000,
    specSummary: {
      Certification: 'India Organic / FSSAI / Jaivik Bharat',
      Dietary: '100% Gluten Free, High Fiber, Low Glycemic Index',
      ShelfLife: '12 Months Vacuum Sealed',
    },
    procurementModes: ['DIRECT_PURCHASE', 'L1_COMPARISON'],
    msePreference: true,
    makeInIndiaPercent: 100,
    outletStore: 'millets',
    isAvailableOnGeM: true,
  },
  {
    id: 'itm-015',
    title: 'Havells 20W LED Slim Batten Tube Light 6500K Cool Daylight (Pack of 4)',
    category: 'Electrical Appliances',
    type: 'PRODUCT',
    l1PriceInr: 980,
    mrpInr: 1600,
    discountPercent: 39,
    priceUnit: 'per Pack',
    unitText: 'Pack of 4 Battens (4ft 20W)',
    minOrderQty: 3,
    oemBrand: 'Havells India Ltd',
    rating: 4.8,
    totalOrders: 180000,
    imageUrl: 'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?w=500&auto=format&fit=crop&q=80',
    etaDelivery: '⚡ 24h Express Delivery',
    badge: 'BEE 5-Star Rated',
    inStock: true,
    stockCount: 6400,
    specSummary: {
      LuminousFlux: '2200 Lumens / Batten',
      SurgeImmunity: '4 kV Inbuilt Surge Protection',
      Lifespan: '25,000 Burning Hours',
      Warranty: '2 Years Manufacturer Replacement',
    },
    procurementModes: ['DIRECT_PURCHASE', 'L1_COMPARISON'],
    msePreference: true,
    makeInIndiaPercent: 90,
    isAvailableOnGeM: true,
  },
  {
    id: 'itm-016',
    title: 'Dettol Hospital-Grade Disinfectant Floor Cleaner Liquid 5 Litres',
    category: 'Medical Products',
    type: 'PRODUCT',
    l1PriceInr: 840,
    mrpInr: 1250,
    discountPercent: 33,
    priceUnit: 'per Canister',
    unitText: '5 Litre Heavy-Duty Canister',
    minOrderQty: 2,
    oemBrand: 'Reckitt Benckiser Professional',
    rating: 4.9,
    totalOrders: 78000,
    imageUrl: 'https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?w=500&auto=format&fit=crop&q=80',
    etaDelivery: '⚡ Same Day / 24h Dispatch',
    badge: 'Disinfection SLA',
    inStock: true,
    stockCount: 2800,
    specSummary: {
      Efficacy: 'Kills 99.99% germs and viruses in 60 seconds',
      Application: 'Hospitals, Govt Offices, Laboratories',
      Fragrance: 'Pine / Fresh Citrus Neutralizer',
    },
    procurementModes: ['DIRECT_PURCHASE', 'L1_COMPARISON'],
    msePreference: true,
    makeInIndiaPercent: 100,
    isAvailableOnGeM: true,
  },
  {
    id: 'itm-017',
    title: 'Cello Butterflow Classic Smooth Ballpoint Pens (Box of 20)',
    category: 'Stationery Items',
    type: 'PRODUCT',
    l1PriceInr: 190,
    mrpInr: 300,
    discountPercent: 37,
    priceUnit: 'per Box',
    unitText: 'Box of 20 Pens (0.7mm Tip)',
    minOrderQty: 5,
    oemBrand: 'Cello BIC India',
    rating: 4.8,
    totalOrders: 420000,
    imageUrl: 'https://images.unsplash.com/photo-1585336261026-7756f7ef5eb1?w=500&auto=format&fit=crop&q=80',
    etaDelivery: '⚡ Next Day Delivery',
    badge: 'Office Desk Essential',
    inStock: true,
    stockCount: 9500,
    specSummary: {
      Tip: '0.7 mm Swiss Carbide Tip',
      Ink: 'Low Viscosity German Ink for Smudge-Free Writing',
      Body: 'Soft Rubberized Comfort Grip',
    },
    procurementModes: ['DIRECT_PURCHASE', 'L1_COMPARISON'],
    msePreference: true,
    makeInIndiaPercent: 100,
    isAvailableOnGeM: true,
  },
  {
    id: 'itm-018',
    title: 'Voltas 1.5 Ton 5-Star Adjustable Inverter Split Air Conditioner',
    category: 'Electronic Equipments',
    type: 'PRODUCT',
    l1PriceInr: 34990,
    mrpInr: 48000,
    discountPercent: 27,
    priceUnit: 'per Unit',
    unitText: '1 Complete Split AC (Indoor + Outdoor Unit)',
    minOrderQty: 1,
    oemBrand: 'Voltas Tata Enterprise',
    rating: 4.8,
    totalOrders: 21000,
    imageUrl: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=500&auto=format&fit=crop&q=80',
    etaDelivery: '⚡ 3-5 Days Free Standard Installation',
    badge: 'BEE 5-Star Inverter',
    inStock: true,
    stockCount: 320,
    specSummary: {
      Capacity: '1.5 Ton (Suitable for 150-180 sq ft room)',
      Coil: '100% Copper Condenser with Anti-Corrosive Blue Fins',
      Modes: '4-in-1 Adjustable Cooling (20% to 120% tonnage)',
      Refrigerant: 'Eco-Friendly R32 Green Gas',
    },
    procurementModes: ['DIRECT_PURCHASE', 'L1_COMPARISON', 'BID'],
    msePreference: true,
    makeInIndiaPercent: 85,
    isAvailableOnGeM: true,
  },
  {
    id: 'itm-019',
    title: 'Tata Tea Premium Desh Ki Chai Fresh Blend (Pack of 1kg)',
    category: 'Textile Products',
    type: 'PRODUCT',
    l1PriceInr: 385,
    mrpInr: 520,
    discountPercent: 26,
    priceUnit: 'per Pack',
    unitText: '1 kg Vacuum Sealed Foil Pack',
    minOrderQty: 4,
    oemBrand: 'Tata Consumer Products Ltd',
    rating: 4.9,
    totalOrders: 95000,
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80',
    etaDelivery: '⚡ 24h Pantry Delivery',
    badge: 'Pantry Essential',
    inStock: true,
    stockCount: 4800,
    specSummary: {
      Composition: 'Selected large and fine grain CTC Assam tea leaves',
      Packaging: 'Aroma-locked nitrogen flushed packaging',
      ShelfLife: '12 Months',
    },
    procurementModes: ['DIRECT_PURCHASE', 'L1_COMPARISON'],
    msePreference: true,
    makeInIndiaPercent: 100,
    isAvailableOnGeM: true,
  },
  {
    id: 'itm-020',
    title: 'Tata Ace EV Zero-Emission Commercial Electric Cargo Vehicle',
    category: 'Automobiles',
    type: 'PRODUCT',
    l1PriceInr: 840000,
    mrpInr: 950000,
    discountPercent: 12,
    priceUnit: 'per Vehicle',
    unitText: '1 Fully Built Electric Mini Cargo Truck',
    minOrderQty: 1,
    oemBrand: 'Tata Motors Fleet Solutions',
    rating: 4.9,
    totalOrders: 1400,
    imageUrl: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=500&auto=format&fit=crop&q=80',
    etaDelivery: '7-14 Days Fleet Handover',
    badge: 'Green Energy EV',
    inStock: true,
    stockCount: 25,
    specSummary: {
      Range: '154 KM Certified Range per Charge',
      Battery: 'Advanced 21.3 kWh Lithium-Iron-Phosphate (LFP)',
      Payload: '600 kg Certified Rated Payload Capacity',
      Telematics: 'Fleet Edge 24x7 Real-Time Telematics Inbuilt',
    },
    procurementModes: ['BID', 'REVERSE_AUCTION'],
    msePreference: true,
    makeInIndiaPercent: 88,
    outletStore: 'startup-runway',
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
