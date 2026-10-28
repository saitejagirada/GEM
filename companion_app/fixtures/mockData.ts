import type {
  UserAgentProfile,
  AcceptedOrder,
  DeconstructedBidDoc,
  ForwardAuctionLot,
  MarketPulseStats,
  ParticipatedBid,
} from '../types/index';

export const MOCK_ACCEPTED_ORDERS: AcceptedOrder[] = [
  {
    contractNumber: 'GEMC-511687712001',
    orderDate: '15-Jan-2026',
    title: 'Supply of 24-Port Industrial Gigabit PoE Switches',
    buyerDepartment: 'Western Railway Headquarters, Mumbai',
    ministry: 'Ministry of Railways',
    category: 'IT & Telecommunications',
    orderValueInr: 1850000,
    quantity: 50,
    cracStatus: 'CRAC_ACCEPTED',
    cracDate: '28-Jan-2026',
    slaCompliance: 'EARLY_DELIVERY',
    invoiceNumber: 'INV-2026-081',
    pfmsUtrNumber: 'RBI260281982736',
  },
  {
    contractNumber: 'GEMC-511687712002',
    orderDate: '02-Feb-2026',
    title: 'Commercial LED Batten Luminaires 45W IP65 & High Mast',
    buyerDepartment: 'Military Engineer Services (MES), Southern Command',
    ministry: 'Ministry of Defence',
    category: 'Solar & Renewable Energy',
    orderValueInr: 2400000,
    quantity: 800,
    cracStatus: 'PAYMENT_DISBURSED',
    cracDate: '16-Feb-2026',
    slaCompliance: 'ON_TIME',
    invoiceNumber: 'INV-2026-094',
    pfmsUtrNumber: 'SBIN00293817264',
  },
  {
    contractNumber: 'GEMC-511687712003',
    orderDate: '20-Feb-2026',
    title: 'ICU Patient Monitoring Consumables & High-Flow Circuits',
    buyerDepartment: 'AIIMS New Delhi',
    ministry: 'Ministry of Health & Family Welfare',
    category: 'Medical & Healthcare',
    orderValueInr: 1275000,
    quantity: 1500,
    cracStatus: 'PAYMENT_DISBURSED',
    cracDate: '02-Mar-2026',
    slaCompliance: 'ON_TIME',
    invoiceNumber: 'INV-2026-105',
    pfmsUtrNumber: 'HDFC26061928374',
  },
  {
    contractNumber: 'GEMC-511687712004',
    orderDate: '12-Mar-2026',
    title: 'High-Tensile Structural Fasteners & Hex Bolts (M24 Grade 8.8)',
    buyerDepartment: 'Bharat Dynamics Limited, Hyderabad',
    ministry: 'Ministry of Defence',
    category: 'Heavy Engineering & Fasteners',
    orderValueInr: 3120000,
    quantity: 25000,
    cracStatus: 'PAYMENT_DISBURSED',
    cracDate: '26-Mar-2026',
    slaCompliance: 'EARLY_DELIVERY',
    invoiceNumber: 'INV-2026-118',
    pfmsUtrNumber: 'UBIN00482716253',
  },
  {
    contractNumber: 'GEMC-511687712005',
    orderDate: '05-Apr-2026',
    title: '40W Solar LED Street Lighting Systems with LiFePO4 Battery',
    buyerDepartment: 'Department of Rural Development, Andhra Pradesh',
    ministry: 'Ministry of Rural Development',
    category: 'Solar & Renewable Energy',
    orderValueInr: 4550000,
    quantity: 150,
    cracStatus: 'PAYMENT_DISBURSED',
    cracDate: '19-Apr-2026',
    slaCompliance: 'ON_TIME',
    invoiceNumber: 'INV-2026-132',
    pfmsUtrNumber: 'APGB26093817265',
  },
];

export const DYNAMIC_ACCEPTED_ORDERS: AcceptedOrder[] = [
  ...MOCK_ACCEPTED_ORDERS,
  {
    contractNumber: 'GEMC-511687712006',
    orderDate: '28-Apr-2026',
    title: 'Telemetry Ground Station AC Power Distribution Units (200kVA)',
    buyerDepartment: 'ISRO Telemetry Tracking & Command Network (ISTRAC)',
    ministry: 'Department of Space',
    category: 'Space & Heavy Electrical',
    orderValueInr: 8850000,
    quantity: 4,
    cracStatus: 'PAYMENT_DISBURSED',
    cracDate: '14-May-2026',
    slaCompliance: 'EARLY_DELIVERY',
    invoiceNumber: 'INV-2026-155',
    pfmsUtrNumber: 'RBI260514981723',
  },
  {
    contractNumber: 'GEMC-511687712007',
    orderDate: '10-May-2026',
    title: 'High-Density Rugged Tactical Routers (MIL-STD-810G)',
    buyerDepartment: 'Border Security Force (BSF), New Delhi',
    ministry: 'Ministry of Home Affairs',
    category: 'Defence Electronics',
    orderValueInr: 5400000,
    quantity: 35,
    cracStatus: 'PAYMENT_DISBURSED',
    cracDate: '28-May-2026',
    slaCompliance: 'ON_TIME',
    invoiceNumber: 'INV-2026-168',
    pfmsUtrNumber: 'SBIN00582910394',
  },
  {
    contractNumber: 'GEMC-511687712008',
    orderDate: '24-May-2026',
    title: 'Heavy Substation Step-Down Transformers 1000 kVA',
    buyerDepartment: 'NTPC Singrauli Super Thermal Power Plant',
    ministry: 'Ministry of Power',
    category: 'Power Generation',
    orderValueInr: 14000000,
    quantity: 4,
    cracStatus: 'PAYMENT_DISBURSED',
    cracDate: '18-Jun-2026',
    slaCompliance: 'ON_TIME',
    invoiceNumber: 'INV-2026-189',
    pfmsUtrNumber: 'PNB260618392019',
  },
  {
    contractNumber: 'GEMC-511687712009',
    orderDate: '15-Jun-2026',
    title: 'Dual-Channel Digital Storage Oscilloscopes & Lab Workstations',
    buyerDepartment: 'Indian Institute of Technology (IIT) Delhi',
    ministry: 'Ministry of Education',
    category: 'Scientific & Educational Equipment',
    orderValueInr: 3200000,
    quantity: 40,
    cracStatus: 'PAYMENT_DISBURSED',
    cracDate: '30-Jun-2026',
    slaCompliance: 'EARLY_DELIVERY',
    invoiceNumber: 'INV-2026-210',
    pfmsUtrNumber: 'CANB260630492817',
  },
  {
    contractNumber: 'GEMC-511687712010',
    orderDate: '02-Jul-2026',
    title: 'Structural Steel Crash Barriers & Road Safety Fasteners (W-Beam)',
    buyerDepartment: 'National Highways Authority of India (NHAI)',
    ministry: 'Ministry of Road Transport & Highways',
    category: 'Civil Infrastructure & Safety',
    orderValueInr: 7650000,
    quantity: 12000,
    cracStatus: 'CRAC_ACCEPTED',
    cracDate: '22-Jul-2026',
    slaCompliance: 'ON_TIME',
    invoiceNumber: 'INV-2026-234',
    pfmsUtrNumber: 'RBI260722384910',
  },
  {
    contractNumber: 'GEMC-511687712011',
    orderDate: '18-Jul-2026',
    title: 'Advanced ICU Ventilators with Invasive & Non-Invasive Modes',
    buyerDepartment: 'Postgraduate Institute of Medical Education & Research (PGIMER)',
    ministry: 'Ministry of Health & Family Welfare',
    category: 'Medical Equipment',
    orderValueInr: 6800000,
    quantity: 8,
    cracStatus: 'PAYMENT_DISBURSED',
    cracDate: '05-Aug-2026',
    slaCompliance: 'EARLY_DELIVERY',
    invoiceNumber: 'INV-2026-259',
    pfmsUtrNumber: 'SBIN00892019384',
  },
  {
    contractNumber: 'GEMC-511687712012',
    orderDate: '04-Aug-2026',
    title: 'Enterprise Server Rack Cabinets 42U & Smart PDU Units',
    buyerDepartment: 'National Informatics Centre Services Inc (NICSI)',
    ministry: 'Ministry of Electronics & Information Technology',
    category: 'IT Hardware',
    orderValueInr: 2950000,
    quantity: 25,
    cracStatus: 'CRAC_ACCEPTED',
    cracDate: '20-Aug-2026',
    slaCompliance: 'ON_TIME',
    invoiceNumber: 'INV-2026-281',
    pfmsUtrNumber: 'RBI260820491827',
  },
];

export const MOCK_USER_PROFILE: UserAgentProfile = {
  id: 'usr-agent-001',
  organizationName: 'Garuda Tech & Electrical Solutions',
  msmeCategory: 'MICRO',
  annualTurnoverInr: 12500000,
  yearsExperience: 4,
  productCategories: ['LED Luminaire', 'Cables', 'Switchgear', 'Tactical Routers', 'Fasteners', 'Solar & Renewable Energy'],
  targetStates: ['Delhi', 'Uttar Pradesh', 'Haryana', 'Rajasthan', 'Telangana', 'Andhra Pradesh'],
  isOem: false,
  hasUdyamCertificate: true,
  acceptedOrders: MOCK_ACCEPTED_ORDERS,
};

export const MOCK_MARKET_PULSE: MarketPulseStats = {
  totalBidsToday: 1420,
  productBidsCount: 14,
  serviceBidsCount: 10,
  boqBidsCount: 2,
  customTendersCount: 8,
  liveReverseAuctions: 4,
  liveForwardAuctions: 3,
  closingIn24Hours: 5,
  zeroEmdBids: 28,
};

export const MOCK_DAILY_BIDS: DeconstructedBidDoc[] = [
  {
    "bidNumber": "GEM/2026/B/89012",
    "title": "High-Efficiency Commercial LED Luminaires 45W & Fixtures",
    "department": "Military Engineer Services (MES)",
    "ministry": "Ministry of Defence",
    "type": "PRODUCT",
    "categoryDomain": "Power & Solar Energy",
    "estimatedBidValueInr": 2850000,
    "emdAmountInr": 57000,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 2500000,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20,
    "deliveryPeriodDays": 30,
    "splittingRatio": "70:30 MSE Preference",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "LED Batten Luminaire 45W with Surge Protection 4kV",
        "quantity": 1200,
        "unit": "Pieces",
        "specsSummary": "LM79/LM80 certified, CCT 6500K, Power Factor > 0.95"
      },
      {
        "itemTitle": "Outdoor IP66 Die-Cast Aluminum Street Light 90W",
        "quantity": 250,
        "unit": "Pieces",
        "specsSummary": "IK08 impact rated, IK10 enclosure, 140 lm/Watt"
      }
    ],
    "consignees": [
      {
        "location": "MES Base Depot, Ambala Cantt",
        "state": "Haryana",
        "pincode": "133001",
        "quantity": 800,
        "reportingOfficer": "Garrison Engineer (E/M)"
      },
      {
        "location": "MES Sub-Depot, Delhi Cantt",
        "state": "Delhi",
        "pincode": "110010",
        "quantity": 650,
        "reportingOfficer": "Assistant Garrison Engineer"
      }
    ],
    "requiredDocuments": [
      "Udyam Registration Certificate (MSE)",
      "Chartered Accountant Turnover Certificate (Last 3 FY)",
      "OEM Authorization / Declaration Certificate",
      "LM-79 & LM-80 BIS Test Reports",
      "Past Performance Invoices & Completion Proofs"
    ],
    "closingTimeUtc": "2026-10-27T14:30:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/89012",
    "b_id": "89012"
  },
  {
    "bidNumber": "GEM/2026/B/99201",
    "title": "High-Density Rugged Tactical Routers (MIL-STD-810G)",
    "department": "Border Security Force (BSF) HQ",
    "ministry": "Ministry of Home Affairs",
    "type": "BOQ",
    "categoryDomain": "Defence & Security",
    "estimatedBidValueInr": 3900000,
    "emdAmountInr": 78000,
    "isEmdExemptForMse": true,
    "epbgPercentage": 5.0,
    "minAnnualTurnoverInr": 3500000,
    "yearsExperienceRequired": 3,
    "pastPerformancePercentage": 25,
    "deliveryPeriodDays": 21,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "Rugged Dual-WAN GigE VPN Router with LTE-A module IP67",
        "quantity": 40,
        "unit": "Units",
        "specsSummary": "MIL-STD-810G shock/vibe, -40C to +70C operating temp"
      }
    ],
    "consignees": [
      {
        "location": "BSF Frontier HQ, Jodhpur",
        "state": "Rajasthan",
        "pincode": "342001",
        "quantity": 25,
        "reportingOfficer": "Commandant (Comms)"
      },
      {
        "location": "BSF Sector HQ, Srinagar",
        "state": "Jammu & Kashmir",
        "pincode": "190001",
        "quantity": 15,
        "reportingOfficer": "Dy Commandant (Signals)"
      }
    ],
    "requiredDocuments": [
      "Udyam Registration Certificate",
      "OEM Authorization (MAF)",
      "TEC Interface Approval Certificate",
      "Defence Past Supply Proofs"
    ],
    "closingTimeUtc": "2026-10-26T16:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/99201",
    "b_id": "99201"
  },
  {
    "bidNumber": "GEM/2026/B/77102",
    "title": "Armored Optical Fiber Cables 24-Core Single Mode",
    "department": "Northern Railway Construction Organisation",
    "ministry": "Ministry of Railways",
    "type": "PRODUCT",
    "categoryDomain": "Railways & Transport",
    "estimatedBidValueInr": 4200000,
    "emdAmountInr": 84000,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 3000000,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20,
    "deliveryPeriodDays": 45,
    "splittingRatio": "70:30 MSE Preference",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "24-Core Armored Underground OFC ITU-T G.652.D HDPE sheath",
        "quantity": 35,
        "unit": "Km",
        "specsSummary": "RDSO Specification IRS:TC 55/2006 Rev 1.0 or latest"
      }
    ],
    "consignees": [
      {
        "location": "Senior Section Engineer (Telecom/Const), Shakurbasti",
        "state": "Delhi",
        "pincode": "110056",
        "quantity": 35,
        "reportingOfficer": "Dy Chief Signal & Telecom Engineer"
      }
    ],
    "requiredDocuments": [
      "Udyam Registration (MSE)",
      "RDSO Vendor Approval Certificate",
      "Factory Inspection & Routine Test Certificates"
    ],
    "closingTimeUtc": "2026-10-28T11:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/77102",
    "b_id": "77102"
  },
  {
    "bidNumber": "GEM/2026/B/55410",
    "title": "Heavy Substation Step-Down Transformers 1000 kVA",
    "department": "NTPC Power Generation Project",
    "ministry": "Ministry of Power",
    "type": "PRODUCT",
    "categoryDomain": "Power & Solar Energy",
    "estimatedBidValueInr": 14000000,
    "emdAmountInr": 280000,
    "isEmdExemptForMse": false,
    "epbgPercentage": 5.0,
    "minAnnualTurnoverInr": 12000000,
    "yearsExperienceRequired": 5,
    "pastPerformancePercentage": 40,
    "deliveryPeriodDays": 90,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_2",
    "boqItems": [
      {
        "itemTitle": "Oil Immersed Step Down Transformer 11kV to 433V 1000kVA ONAN",
        "quantity": 4,
        "unit": "Sets",
        "specsSummary": "BEE 5-Star efficiency level, copper wound, OLTC fitted"
      }
    ],
    "consignees": [
      {
        "location": "NTPC Singrauli Super Thermal Power Station",
        "state": "Uttar Pradesh",
        "pincode": "231222",
        "quantity": 4,
        "reportingOfficer": "General Manager (Electrical Maintenance)"
      }
    ],
    "requiredDocuments": [
      "CPRI Type Test Certificate",
      "ISO 9001:2015 Certification",
      "Valid Electrical Contractor License"
    ],
    "closingTimeUtc": "2026-10-30T17:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/55410",
    "b_id": "55410"
  },
  {
    "bidNumber": "GEM/2026/R/729897",
    "title": "PUMP FUEL INJECTION ROTARY,PUMP FUEL INJECTION ROTARY,VANE PUMP,HORN SIGNAL AIR HOSE ASSSY,REV SELE",
    "department": "Department of Military Affairs",
    "ministry": "Ministry of Defence",
    "type": "BOQ",
    "categoryDomain": "Defence & Security",
    "isRa": true,
    "serviceDetails": null,
    "estimatedBidValueInr": 3330000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 1332000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 30,
    "splittingRatio": "70:30 MSE Preference",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "PUMP FUEL INJECTION ROTARY,PUMP FUEL INJECTION ROTARY,VANE PUMP,HORN SIGNAL AIR HOSE ASSSY,REV SELE",
        "quantity": 222,
        "unit": "Units",
        "specsSummary": "Official GeM specification compliant with Department of Military Affairs standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Military Affairs Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 222
      }
    ],
    "requiredDocuments": [
      "Udyam MSE Registration Certificate",
      "Past Performance Invoices",
      "OEM Authorization (MAF)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-25T10:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/9855615",
    "b_id": "9855615"
  },
  {
    "bidNumber": "GEM/2026/B/7993168",
    "title": "Pre-Fabricated MS Containers as per the attached Drawing and Technical Specification",
    "department": "Department of Atomic Energy",
    "ministry": "PMO",
    "type": "CUSTOM",
    "categoryDomain": "Civil & Industrial Works",
    "isRa": false,
    "serviceDetails": null,
    "estimatedBidValueInr": 750000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 500000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 30,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "Pre-Fabricated MS Containers as per the attached Drawing and Technical Specification",
        "quantity": 50,
        "unit": "Units",
        "specsSummary": "Official GeM specification compliant with Department of Atomic Energy standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Atomic Energy Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 50
      }
    ],
    "requiredDocuments": [
      "Udyam MSE Registration Certificate",
      "Past Performance Invoices",
      "OEM Authorization (MAF)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/9843058",
    "b_id": "9843058"
  },
  {
    "bidNumber": "GEM/2026/B/8124130",
    "title": "Manpower Outsourcing Services - Fixed Remuneration - Chief Engineer Grade II Fishing Vessel With Co",
    "department": "Department of Fisheries",
    "ministry": "Ministry of Fisheries Animal Husbandry Dairying",
    "type": "SERVICE",
    "categoryDomain": "Services & Manpower",
    "isRa": false,
    "serviceDetails": {
      "durationMonths": 12,
      "manpowerCount": 424,
      "billingCycle": "Monthly upon SLA verification",
      "minimumWageCompliance": true
    },
    "estimatedBidValueInr": 6360000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 2544000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 365,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "Manpower Outsourcing Services - Fixed Remuneration - Chief Engineer Grade II Fishing Vessel With Co",
        "quantity": 424,
        "unit": "Personnel/Months",
        "specsSummary": "Official GeM specification compliant with Department of Fisheries standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Fisheries Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 424
      }
    ],
    "requiredDocuments": [
      "Udyam Registration Certificate (MSE)",
      "Minimum Wages & EPF/ESI Compliance Undertaking",
      "Valid Labor License for Consignee State",
      "Past Service Performance Certificates (3 Contracts)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/9993443",
    "b_id": "9993443"
  },
  {
    "bidNumber": "GEM/2026/B/8091189",
    "title": "REPAIR AND MAINTENANCE OF ZON GUN QTY-12",
    "department": "Department of Military Affairs",
    "ministry": "Ministry of Defence",
    "type": "SERVICE",
    "categoryDomain": "Defence & Security",
    "isRa": false,
    "serviceDetails": {
      "durationMonths": 12,
      "manpowerCount": 10,
      "billingCycle": "Monthly upon SLA verification",
      "minimumWageCompliance": true
    },
    "estimatedBidValueInr": 500000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 500000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 365,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "REPAIR AND MAINTENANCE OF ZON GUN QTY-12",
        "quantity": 1,
        "unit": "Personnel/Months",
        "specsSummary": "Official GeM specification compliant with Department of Military Affairs standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Military Affairs Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 1
      }
    ],
    "requiredDocuments": [
      "Udyam Registration Certificate (MSE)",
      "Minimum Wages & EPF/ESI Compliance Undertaking",
      "Valid Labor License for Consignee State",
      "Past Service Performance Certificates (3 Contracts)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/9955625",
    "b_id": "9955625"
  },
  {
    "bidNumber": "GEM/2026/B/8094747",
    "title": "Fire Hoses with Delivery Coupling",
    "department": "Department of Military Affairs",
    "ministry": "Ministry of Defence",
    "type": "PRODUCT",
    "categoryDomain": "Defence & Security",
    "isRa": false,
    "serviceDetails": null,
    "estimatedBidValueInr": 500000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 500000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 30,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "Fire Hoses with Delivery Coupling",
        "quantity": 6,
        "unit": "Units",
        "specsSummary": "Official GeM specification compliant with Department of Military Affairs standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Military Affairs Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 6
      }
    ],
    "requiredDocuments": [
      "Udyam MSE Registration Certificate",
      "Past Performance Invoices",
      "OEM Authorization (MAF)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/9959690",
    "b_id": "9959690"
  },
  {
    "bidNumber": "GEM/2026/B/8094730",
    "title": "Fire Fighting Suit (Set)",
    "department": "Department of Military Affairs",
    "ministry": "Ministry of Defence",
    "type": "PRODUCT",
    "categoryDomain": "Defence & Security",
    "isRa": false,
    "serviceDetails": null,
    "estimatedBidValueInr": 500000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 500000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 30,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "Fire Fighting Suit (Set)",
        "quantity": 3,
        "unit": "Units",
        "specsSummary": "Official GeM specification compliant with Department of Military Affairs standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Military Affairs Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 3
      }
    ],
    "requiredDocuments": [
      "Udyam MSE Registration Certificate",
      "Past Performance Invoices",
      "OEM Authorization (MAF)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/9959669",
    "b_id": "9959669"
  },
  {
    "bidNumber": "GEM/2026/B/8094762",
    "title": "Breathing Apparatus with compressed Air Cylinder ( Diving Instruments or Accessories)",
    "department": "Department of Military Affairs",
    "ministry": "Ministry of Defence",
    "type": "PRODUCT",
    "categoryDomain": "Defence & Security",
    "isRa": false,
    "serviceDetails": null,
    "estimatedBidValueInr": 500000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 500000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 30,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "Breathing Apparatus with compressed Air Cylinder ( Diving Instruments or Accessories)",
        "quantity": 1,
        "unit": "Units",
        "specsSummary": "Official GeM specification compliant with Department of Military Affairs standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Military Affairs Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 1
      }
    ],
    "requiredDocuments": [
      "Udyam MSE Registration Certificate",
      "Past Performance Invoices",
      "OEM Authorization (MAF)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/9959709",
    "b_id": "9959709"
  },
  {
    "bidNumber": "GEM/2026/B/8093766",
    "title": "Fire Beaters (Fire suppression hand tools),GALVANIZED MILD STEEL FIRE BUCKET (V2) Conforming to IS ",
    "department": "Department of Military Affairs",
    "ministry": "Ministry of Defence",
    "type": "PRODUCT",
    "categoryDomain": "Defence & Security",
    "isRa": false,
    "serviceDetails": null,
    "estimatedBidValueInr": 4170000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 1668000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 30,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "Fire Beaters (Fire suppression hand tools),GALVANIZED MILD STEEL FIRE BUCKET (V2) Conforming to IS ",
        "quantity": 278,
        "unit": "Units",
        "specsSummary": "Official GeM specification compliant with Department of Military Affairs standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Military Affairs Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 278
      }
    ],
    "requiredDocuments": [
      "Udyam MSE Registration Certificate",
      "Past Performance Invoices",
      "OEM Authorization (MAF)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/9958533",
    "b_id": "9958533"
  },
  {
    "bidNumber": "GEM/2026/B/8055477",
    "title": "Portable Fire Extinguishers (V3) ISI Marked to IS 15683,Portable Fire Extinguishers (V3) ISI Marked",
    "department": "Department of Military Affairs",
    "ministry": "Ministry of Defence",
    "type": "PRODUCT",
    "categoryDomain": "Defence & Security",
    "isRa": false,
    "serviceDetails": null,
    "estimatedBidValueInr": 8265000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 3306000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 30,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "Portable Fire Extinguishers (V3) ISI Marked to IS 15683,Portable Fire Extinguishers (V3) ISI Marked",
        "quantity": 551,
        "unit": "Units",
        "specsSummary": "Official GeM specification compliant with Department of Military Affairs standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Military Affairs Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 551
      }
    ],
    "requiredDocuments": [
      "Udyam MSE Registration Certificate",
      "Past Performance Invoices",
      "OEM Authorization (MAF)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/9914496",
    "b_id": "9914496"
  },
  {
    "bidNumber": "GEM/2026/B/8101307",
    "title": "Electronics & Hardware Kit",
    "department": "Department of School Education and Literacy",
    "ministry": "Ministry of Education",
    "type": "PRODUCT",
    "categoryDomain": "IT & Telecom",
    "isRa": false,
    "serviceDetails": null,
    "estimatedBidValueInr": 500000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 500000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 30,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "Electronics & Hardware Kit",
        "quantity": 1,
        "unit": "Units",
        "specsSummary": "Official GeM specification compliant with Department of School Education and Literacy standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of School Education and Literacy Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 1
      }
    ],
    "requiredDocuments": [
      "Udyam MSE Registration Certificate",
      "Past Performance Invoices",
      "OEM Authorization (MAF)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/9967016",
    "b_id": "9967016"
  },
  {
    "bidNumber": "GEM/2026/B/8133129",
    "title": "Stainless Steel Fitting Centre to Centre,04 Entrance Gates (MS Gate)",
    "department": "Department of Military Affairs",
    "ministry": "Ministry of Defence",
    "type": "CUSTOM",
    "categoryDomain": "Defence & Security",
    "isRa": false,
    "serviceDetails": null,
    "estimatedBidValueInr": 21240000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 8496000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 30,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "Stainless Steel Fitting Centre to Centre,04 Entrance Gates (MS Gate)",
        "quantity": 1416,
        "unit": "Units",
        "specsSummary": "Official GeM specification compliant with Department of Military Affairs standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Military Affairs Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 1416
      }
    ],
    "requiredDocuments": [
      "Udyam MSE Registration Certificate",
      "Past Performance Invoices",
      "OEM Authorization (MAF)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/10003510",
    "b_id": "10003510"
  },
  {
    "bidNumber": "GEM/2026/B/8164514",
    "title": "Repair and Overhauling Service - built up trucks; Ashok Leyland; Yes; Buyer Premises",
    "department": "Department of Military Affairs",
    "ministry": "Ministry of Defence",
    "type": "SERVICE",
    "categoryDomain": "Defence & Security",
    "isRa": false,
    "serviceDetails": {
      "durationMonths": 12,
      "manpowerCount": 10,
      "billingCycle": "Monthly upon SLA verification",
      "minimumWageCompliance": true
    },
    "estimatedBidValueInr": 500000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 500000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 365,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "Repair and Overhauling Service - built up trucks; Ashok Leyland; Yes; Buyer Premises",
        "quantity": 1,
        "unit": "Personnel/Months",
        "specsSummary": "Official GeM specification compliant with Department of Military Affairs standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Military Affairs Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 1
      }
    ],
    "requiredDocuments": [
      "Udyam Registration Certificate (MSE)",
      "Minimum Wages & EPF/ESI Compliance Undertaking",
      "Valid Labor License for Consignee State",
      "Past Service Performance Certificates (3 Contracts)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/10039279",
    "b_id": "10039279"
  },
  {
    "bidNumber": "GEM/2026/B/8164461",
    "title": "KIT TEST BAE GAUGE FORCE",
    "department": "Department of Military Affairs",
    "ministry": "Ministry of Defence",
    "type": "CUSTOM",
    "categoryDomain": "Defence & Security",
    "isRa": false,
    "serviceDetails": null,
    "estimatedBidValueInr": 500000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 500000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 30,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "KIT TEST BAE GAUGE FORCE",
        "quantity": 1,
        "unit": "Units",
        "specsSummary": "Official GeM specification compliant with Department of Military Affairs standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Military Affairs Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 1
      }
    ],
    "requiredDocuments": [
      "Udyam MSE Registration Certificate",
      "Past Performance Invoices",
      "OEM Authorization (MAF)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/10039217",
    "b_id": "10039217"
  },
  {
    "bidNumber": "GEM/2026/B/8164448",
    "title": "Repair and Overhauling Service - built up trucks; TATA MOTORS; Yes; Buyer Premises",
    "department": "Department of Military Affairs",
    "ministry": "Ministry of Defence",
    "type": "SERVICE",
    "categoryDomain": "Defence & Security",
    "isRa": false,
    "serviceDetails": {
      "durationMonths": 12,
      "manpowerCount": 10,
      "billingCycle": "Monthly upon SLA verification",
      "minimumWageCompliance": true
    },
    "estimatedBidValueInr": 500000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 500000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 365,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "Repair and Overhauling Service - built up trucks; TATA MOTORS; Yes; Buyer Premises",
        "quantity": 1,
        "unit": "Personnel/Months",
        "specsSummary": "Official GeM specification compliant with Department of Military Affairs standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Military Affairs Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 1
      }
    ],
    "requiredDocuments": [
      "Udyam Registration Certificate (MSE)",
      "Minimum Wages & EPF/ESI Compliance Undertaking",
      "Valid Labor License for Consignee State",
      "Past Service Performance Certificates (3 Contracts)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/10039204",
    "b_id": "10039204"
  },
  {
    "bidNumber": "GEM/2026/B/8164381",
    "title": "Repair and Overhauling Service - built up trucks; TATA MOTORS; Yes; Buyer Premises",
    "department": "Department of Military Affairs",
    "ministry": "Ministry of Defence",
    "type": "SERVICE",
    "categoryDomain": "Defence & Security",
    "isRa": false,
    "serviceDetails": {
      "durationMonths": 12,
      "manpowerCount": 10,
      "billingCycle": "Monthly upon SLA verification",
      "minimumWageCompliance": true
    },
    "estimatedBidValueInr": 500000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 500000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 365,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "Repair and Overhauling Service - built up trucks; TATA MOTORS; Yes; Buyer Premises",
        "quantity": 1,
        "unit": "Personnel/Months",
        "specsSummary": "Official GeM specification compliant with Department of Military Affairs standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Military Affairs Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 1
      }
    ],
    "requiredDocuments": [
      "Udyam Registration Certificate (MSE)",
      "Minimum Wages & EPF/ESI Compliance Undertaking",
      "Valid Labor License for Consignee State",
      "Past Service Performance Certificates (3 Contracts)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/10039132",
    "b_id": "10039132"
  },
  {
    "bidNumber": "GEM/2026/B/8164641",
    "title": "STORAGE BOX",
    "department": "Department of Military Affairs",
    "ministry": "Ministry of Defence",
    "type": "CUSTOM",
    "categoryDomain": "Defence & Security",
    "isRa": false,
    "serviceDetails": null,
    "estimatedBidValueInr": 500000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 500000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 30,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "STORAGE BOX",
        "quantity": 10,
        "unit": "Units",
        "specsSummary": "Official GeM specification compliant with Department of Military Affairs standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Military Affairs Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 10
      }
    ],
    "requiredDocuments": [
      "Udyam MSE Registration Certificate",
      "Past Performance Invoices",
      "OEM Authorization (MAF)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/10039433",
    "b_id": "10039433"
  },
  {
    "bidNumber": "GEM/2026/B/8164607",
    "title": "Repair and Overhauling Service - Tractors (V1); HMT; Yes; Buyer Premises",
    "department": "Department of Military Affairs",
    "ministry": "Ministry of Defence",
    "type": "SERVICE",
    "categoryDomain": "Defence & Security",
    "isRa": false,
    "serviceDetails": {
      "durationMonths": 12,
      "manpowerCount": 10,
      "billingCycle": "Monthly upon SLA verification",
      "minimumWageCompliance": true
    },
    "estimatedBidValueInr": 500000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 500000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 365,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "Repair and Overhauling Service - Tractors (V1); HMT; Yes; Buyer Premises",
        "quantity": 1,
        "unit": "Personnel/Months",
        "specsSummary": "Official GeM specification compliant with Department of Military Affairs standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Military Affairs Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 1
      }
    ],
    "requiredDocuments": [
      "Udyam Registration Certificate (MSE)",
      "Minimum Wages & EPF/ESI Compliance Undertaking",
      "Valid Labor License for Consignee State",
      "Past Service Performance Certificates (3 Contracts)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/10039389",
    "b_id": "10039389"
  },
  {
    "bidNumber": "GEM/2026/B/8164538",
    "title": "Insulating Oil For Transformer As Per POWERGRID TS",
    "department": "Electricity (Power) Department Manipur",
    "ministry": "Ministry of Defence",
    "type": "PRODUCT",
    "categoryDomain": "Defence & Security",
    "isRa": false,
    "serviceDetails": null,
    "estimatedBidValueInr": 315000000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 126000000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 30,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "Insulating Oil For Transformer As Per POWERGRID TS",
        "quantity": 21000,
        "unit": "Units",
        "specsSummary": "Official GeM specification compliant with Electricity (Power) Department Manipur standards"
      }
    ],
    "consignees": [
      {
        "location": "Electricity (Power) Department Manipur Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 21000
      }
    ],
    "requiredDocuments": [
      "Udyam MSE Registration Certificate",
      "Past Performance Invoices",
      "OEM Authorization (MAF)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/10039310",
    "b_id": "10039310"
  },
  {
    "bidNumber": "GEM/2026/B/8164838",
    "title": "4\" WALL CLOCK (NTP CLIENT)",
    "department": "Department of Military Affairs",
    "ministry": "Ministry of Defence",
    "type": "CUSTOM",
    "categoryDomain": "IT & Telecom",
    "isRa": false,
    "serviceDetails": null,
    "estimatedBidValueInr": 500000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 500000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 30,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "4\" WALL CLOCK (NTP CLIENT)",
        "quantity": 3,
        "unit": "Units",
        "specsSummary": "Official GeM specification compliant with Department of Military Affairs standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Military Affairs Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 3
      }
    ],
    "requiredDocuments": [
      "Udyam MSE Registration Certificate",
      "Past Performance Invoices",
      "OEM Authorization (MAF)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/10039648",
    "b_id": "10039648"
  },
  {
    "bidNumber": "GEM/2026/B/8164700",
    "title": "Repair and Overhauling Service - built up trucks; TATA MOTORS; Yes; Buyer Premises",
    "department": "Department of Military Affairs",
    "ministry": "Ministry of Defence",
    "type": "SERVICE",
    "categoryDomain": "Defence & Security",
    "isRa": false,
    "serviceDetails": {
      "durationMonths": 12,
      "manpowerCount": 10,
      "billingCycle": "Monthly upon SLA verification",
      "minimumWageCompliance": true
    },
    "estimatedBidValueInr": 500000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 500000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 365,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "Repair and Overhauling Service - built up trucks; TATA MOTORS; Yes; Buyer Premises",
        "quantity": 1,
        "unit": "Personnel/Months",
        "specsSummary": "Official GeM specification compliant with Department of Military Affairs standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Military Affairs Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 1
      }
    ],
    "requiredDocuments": [
      "Udyam Registration Certificate (MSE)",
      "Minimum Wages & EPF/ESI Compliance Undertaking",
      "Valid Labor License for Consignee State",
      "Past Service Performance Certificates (3 Contracts)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/10039499",
    "b_id": "10039499"
  },
  {
    "bidNumber": "GEM/2026/B/8125741",
    "title": "XLPE Cable, Working Voltage from 3.3 kV up to and including 33 kV (V2) ISI Marked to IS 7098 (Part ",
    "department": "Indian Railways",
    "ministry": "Ministry of Railways",
    "type": "PRODUCT",
    "categoryDomain": "Railways & Transport",
    "isRa": false,
    "serviceDetails": null,
    "estimatedBidValueInr": 1800000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 720000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 30,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "XLPE Cable, Working Voltage from 3.3 kV up to and including 33 kV (V2) ISI Marked to IS 7098 (Part ",
        "quantity": 120,
        "unit": "Units",
        "specsSummary": "Official GeM specification compliant with Indian Railways standards"
      }
    ],
    "consignees": [
      {
        "location": "Indian Railways Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 120
      }
    ],
    "requiredDocuments": [
      "Udyam MSE Registration Certificate",
      "Past Performance Invoices",
      "OEM Authorization (MAF)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/9995239",
    "b_id": "9995239"
  },
  {
    "bidNumber": "GEM/2026/B/8125604",
    "title": "Line Interactive UPS with AVR (V2)",
    "department": "Indian Railways",
    "ministry": "Ministry of Railways",
    "type": "PRODUCT",
    "categoryDomain": "IT & Telecom",
    "isRa": false,
    "serviceDetails": null,
    "estimatedBidValueInr": 500000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 500000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 30,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "Line Interactive UPS with AVR (V2)",
        "quantity": 20,
        "unit": "Units",
        "specsSummary": "Official GeM specification compliant with Indian Railways standards"
      }
    ],
    "consignees": [
      {
        "location": "Indian Railways Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 20
      }
    ],
    "requiredDocuments": [
      "Udyam MSE Registration Certificate",
      "Past Performance Invoices",
      "OEM Authorization (MAF)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/9995089",
    "b_id": "9995089"
  },
  {
    "bidNumber": "GEM/2026/B/8164869",
    "title": "Repair and Overhauling Service - Diesel Generators- Dg Sets (DFM); Gen Set; Yes; Buyer Premises",
    "department": "Department of Military Affairs",
    "ministry": "Ministry of Defence",
    "type": "SERVICE",
    "categoryDomain": "Defence & Security",
    "isRa": false,
    "serviceDetails": {
      "durationMonths": 12,
      "manpowerCount": 10,
      "billingCycle": "Monthly upon SLA verification",
      "minimumWageCompliance": true
    },
    "estimatedBidValueInr": 500000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 500000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 365,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "Repair and Overhauling Service - Diesel Generators- Dg Sets (DFM); Gen Set; Yes; Buyer Premises",
        "quantity": 1,
        "unit": "Personnel/Months",
        "specsSummary": "Official GeM specification compliant with Department of Military Affairs standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Military Affairs Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 1
      }
    ],
    "requiredDocuments": [
      "Udyam Registration Certificate (MSE)",
      "Minimum Wages & EPF/ESI Compliance Undertaking",
      "Valid Labor License for Consignee State",
      "Past Service Performance Certificates (3 Contracts)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/10039680",
    "b_id": "10039680"
  },
  {
    "bidNumber": "GEM/2026/B/8164520",
    "title": "Manpower Outsourcing Services - Fixed Remuneration - Admin; Multi-tasking Staff; High School",
    "department": "Department of Sports",
    "ministry": "Ministry of Youth Affairs and Sports",
    "type": "SERVICE",
    "categoryDomain": "Services & Manpower",
    "isRa": false,
    "serviceDetails": {
      "durationMonths": 12,
      "manpowerCount": 10,
      "billingCycle": "Monthly upon SLA verification",
      "minimumWageCompliance": true
    },
    "estimatedBidValueInr": 500000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 500000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 365,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "Manpower Outsourcing Services - Fixed Remuneration - Admin; Multi-tasking Staff; High School",
        "quantity": 1,
        "unit": "Personnel/Months",
        "specsSummary": "Official GeM specification compliant with Department of Sports standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Sports Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 1
      }
    ],
    "requiredDocuments": [
      "Udyam Registration Certificate (MSE)",
      "Minimum Wages & EPF/ESI Compliance Undertaking",
      "Valid Labor License for Consignee State",
      "Past Service Performance Certificates (3 Contracts)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/10039286",
    "b_id": "10039286"
  },
  {
    "bidNumber": "GEM/2026/B/8157636",
    "title": "Professional Painting Service - Metals; PAINTING OF MIG A/C AIRFRAME; Aircrafts",
    "department": "Department of Military Affairs",
    "ministry": "Ministry of Defence",
    "type": "SERVICE",
    "categoryDomain": "Defence & Security",
    "isRa": false,
    "serviceDetails": {
      "durationMonths": 12,
      "manpowerCount": 10,
      "billingCycle": "Monthly upon SLA verification",
      "minimumWageCompliance": true
    },
    "estimatedBidValueInr": 500000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 500000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 365,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "Professional Painting Service - Metals; PAINTING OF MIG A/C AIRFRAME; Aircrafts",
        "quantity": 1,
        "unit": "Personnel/Months",
        "specsSummary": "Official GeM specification compliant with Department of Military Affairs standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Military Affairs Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 1
      }
    ],
    "requiredDocuments": [
      "Udyam Registration Certificate (MSE)",
      "Minimum Wages & EPF/ESI Compliance Undertaking",
      "Valid Labor License for Consignee State",
      "Past Service Performance Certificates (3 Contracts)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/10031548",
    "b_id": "10031548"
  },
  {
    "bidNumber": "GEM/2026/B/8165630",
    "title": "Jeera Powder,Big Elaichi,Garam Masala,Haldi Powder,Dhaniya Powder,Mirchi Powder,Green Elaichi,Samba",
    "department": "Department of Military Affairs",
    "ministry": "Ministry of Defence",
    "type": "BOQ",
    "categoryDomain": "Defence & Security",
    "isRa": false,
    "serviceDetails": null,
    "estimatedBidValueInr": 1155000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 500000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 30,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "Jeera Powder,Big Elaichi,Garam Masala,Haldi Powder,Dhaniya Powder,Mirchi Powder,Green Elaichi,Samba",
        "quantity": 77,
        "unit": "Units",
        "specsSummary": "Official GeM specification compliant with Department of Military Affairs standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Military Affairs Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 77
      }
    ],
    "requiredDocuments": [
      "Udyam MSE Registration Certificate",
      "Past Performance Invoices",
      "OEM Authorization (MAF)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/10040583",
    "b_id": "10040583"
  },
  {
    "bidNumber": "GEM/2026/B/7965997",
    "title": "Hand - Operated Chain Pulley Block (V2) as per IS 3832,Hand - Operated Chain Pulley Block (V2) as p",
    "department": "Department of Space",
    "ministry": "Department of Space",
    "type": "PRODUCT",
    "categoryDomain": "Civil & Industrial Works",
    "isRa": false,
    "serviceDetails": null,
    "estimatedBidValueInr": 500000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 500000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 30,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "Hand - Operated Chain Pulley Block (V2) as per IS 3832,Hand - Operated Chain Pulley Block (V2) as p",
        "quantity": 12,
        "unit": "Units",
        "specsSummary": "Official GeM specification compliant with Department of Space standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Space Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 12
      }
    ],
    "requiredDocuments": [
      "Udyam MSE Registration Certificate",
      "Past Performance Invoices",
      "OEM Authorization (MAF)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/9811749",
    "b_id": "9811749"
  },
  {
    "bidNumber": "GEM/2026/B/8166035",
    "title": "DOOR STOPPER",
    "department": "Department of Defence Production",
    "ministry": "Ministry of Defence",
    "type": "CUSTOM",
    "categoryDomain": "Defence & Security",
    "isRa": false,
    "serviceDetails": null,
    "estimatedBidValueInr": 750000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 500000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 30,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "DOOR STOPPER",
        "quantity": 50,
        "unit": "Units",
        "specsSummary": "Official GeM specification compliant with Department of Defence Production standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Defence Production Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 50
      }
    ],
    "requiredDocuments": [
      "Udyam MSE Registration Certificate",
      "Past Performance Invoices",
      "OEM Authorization (MAF)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/10041041",
    "b_id": "10041041"
  },
  {
    "bidNumber": "GEM/2026/B/8165997",
    "title": "MIRROR",
    "department": "Department of Defence Production",
    "ministry": "Ministry of Defence",
    "type": "CUSTOM",
    "categoryDomain": "Defence & Security",
    "isRa": false,
    "serviceDetails": null,
    "estimatedBidValueInr": 500000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 500000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 30,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "MIRROR",
        "quantity": 20,
        "unit": "Units",
        "specsSummary": "Official GeM specification compliant with Department of Defence Production standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Defence Production Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 20
      }
    ],
    "requiredDocuments": [
      "Udyam MSE Registration Certificate",
      "Past Performance Invoices",
      "OEM Authorization (MAF)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/10040993",
    "b_id": "10040993"
  },
  {
    "bidNumber": "GEM/2026/B/8166080",
    "title": "DOWSIL 995 (BLACK)",
    "department": "Department of Defence Production",
    "ministry": "Ministry of Defence",
    "type": "CUSTOM",
    "categoryDomain": "Defence & Security",
    "isRa": false,
    "serviceDetails": null,
    "estimatedBidValueInr": 500000.0,
    "emdAmountInr": 0.0,
    "isEmdExemptForMse": true,
    "epbgPercentage": 3.0,
    "minAnnualTurnoverInr": 500000.0,
    "yearsExperienceRequired": 2,
    "pastPerformancePercentage": 20.0,
    "deliveryPeriodDays": 30,
    "splittingRatio": "100% to L1",
    "makeInIndiaClass": "CLASS_1",
    "boqItems": [
      {
        "itemTitle": "DOWSIL 995 (BLACK)",
        "quantity": 20,
        "unit": "Units",
        "specsSummary": "Official GeM specification compliant with Department of Defence Production standards"
      }
    ],
    "consignees": [
      {
        "location": "Department of Defence Production Central Stores",
        "state": "Delhi",
        "pincode": "110001",
        "quantity": 20
      }
    ],
    "requiredDocuments": [
      "Udyam MSE Registration Certificate",
      "Past Performance Invoices",
      "OEM Authorization (MAF)",
      "CA Certified Annual Turnover Certificate"
    ],
    "closingTimeUtc": "2026-10-26T09:00:00Z",
    "docUrl": "https://bidplus.gem.gov.in/showbidDocument/10041093",
    "b_id": "10041093"
  }
,
  {
      "bidNumber": "GEM/2026/B/8201001",
      "title": "Dual-Chamber Automated External Defibrillators (AED) with Pediatric Pads",
      "department": "All India Institute of Medical Sciences (AIIMS)",
      "ministry": "Ministry of Health & Family Welfare",
      "type": "PRODUCT",
      "categoryDomain": "Medical & Healthcare",
      "estimatedBidValueInr": 4200000,
      "emdAmountInr": 84000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 3.0,
      "minAnnualTurnoverInr": 3500000,
      "yearsExperienceRequired": 2,
      "pastPerformancePercentage": 25,
      "deliveryPeriodDays": 30,
      "splittingRatio": "80:20 MSE Preference",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Biphasic Automated External Defibrillator Unit with ECG display",
              "quantity": 35,
              "unit": "Units",
              "specsSummary": "IP55, FDA/CE certified, waveform biphasic truncated exponential"
          }
      ],
      "consignees": [
          {
              "location": "AIIMS Central Trauma Centre, Ansari Nagar",
              "state": "Delhi",
              "pincode": "110029",
              "quantity": 35
          }
      ],
      "requiredDocuments": [
          "Udyam MSE Registration Certificate",
          "OEM Authorization Form",
          "ISO 13485 Medical Device Quality Certificate",
          "CA Certified Annual Turnover Certificate"
      ],
      "closingTimeUtc": "2026-10-29T15:00:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201001",
      "b_id": "8201001"
  },
  {
      "bidNumber": "GEM/2026/B/8201002",
      "title": "Supply of Pre-Fabricated Steel Modular Classroom Units & Desking",
      "department": "Kendriya Vidyalaya Sangathan (KVS) Regional Office",
      "ministry": "Ministry of Education",
      "type": "BOQ",
      "categoryDomain": "Furniture & Infrastructure",
      "estimatedBidValueInr": 8600000,
      "emdAmountInr": 172000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 5.0,
      "minAnnualTurnoverInr": 7000000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 30,
      "deliveryPeriodDays": 45,
      "splittingRatio": "100% to L1",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Pre-Engineered Galvanized Steel Classroom Structure 600 sq ft",
              "quantity": 12,
              "unit": "Sets",
              "specsSummary": "IS 2062 Grade steel, fire-rated PUF panels 50mm, wind speed resistant 150 km/h"
          },
          {
              "itemTitle": "Dual Dual-Desk Heavy Duty CRCA Powder Coated Classroom Desks",
              "quantity": 480,
              "unit": "Pieces",
              "specsSummary": "BIFMA compliant, post-formed laminated top, edge-banded 2mm PVC"
          }
      ],
      "consignees": [
          {
              "location": "KV No. 1 AFS Jodhpur",
              "state": "Rajasthan",
              "pincode": "342011",
              "quantity": 250
          },
          {
              "location": "KV Airforce Station Jamnagar",
              "state": "Gujarat",
              "pincode": "361003",
              "quantity": 230
          }
      ],
      "requiredDocuments": [
          "Udyam Registration Certificate",
          "BIFMA Test Report",
          "Past Performance Completion Invoices"
      ],
      "closingTimeUtc": "2026-10-30T11:00:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201002",
      "b_id": "8201002"
  },
  {
      "bidNumber": "GEM/2026/B/8201003",
      "title": "Comprehensive Facility Management & Mechanized Housekeeping Services",
      "department": "National Informatics Centre (NIC) Headquarters",
      "ministry": "Ministry of Electronics & IT",
      "type": "SERVICE",
      "categoryDomain": "Facility & Housekeeping Services",
      "estimatedBidValueInr": 5400000,
      "emdAmountInr": 108000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 3.0,
      "minAnnualTurnoverInr": 4500000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 20,
      "deliveryPeriodDays": 365,
      "splittingRatio": "100% to L1",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Round-the-clock Mechanized Housekeeping & Sanitization Service",
              "quantity": 12,
              "unit": "Months",
              "specsSummary": "Ride-on auto scrubber driers, eco-friendly chemicals Green Pro certified"
          }
      ],
      "consignees": [
          {
              "location": "NIC CGO Complex, Lodhi Road",
              "state": "Delhi",
              "pincode": "110003",
              "quantity": 12
          }
      ],
      "requiredDocuments": [
          "EPFO / ESIC Registration Proofs",
          "Labour License under CLRA Act",
          "Udyam MSE Certificate"
      ],
      "closingTimeUtc": "2026-10-31T17:00:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201003",
      "b_id": "8201003"
  },
  {
      "bidNumber": "GEM/2026/B/8201004",
      "title": "Grid-Tied Rooftop Solar Photovoltaic Plant 500 kWp with Net Metering",
      "department": "National Thermal Power Corporation (NTPC) Township",
      "ministry": "Ministry of Power",
      "type": "PRODUCT",
      "categoryDomain": "Power & Solar Energy",
      "estimatedBidValueInr": 23500000,
      "emdAmountInr": 470000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 5.0,
      "minAnnualTurnoverInr": 18000000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 30,
      "deliveryPeriodDays": 90,
      "splittingRatio": "75:25 MSE Split",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Mono PERC Bifacial Solar PV Modules 540Wp (ALMM Listed)",
              "quantity": 925,
              "unit": "Pieces",
              "specsSummary": "MNRE ALMM approved, module efficiency > 21.2%, IP68 junction box"
          },
          {
              "itemTitle": "String Inverters 100kW 3-Phase Grid-Tied with MPPT",
              "quantity": 5,
              "unit": "Units",
              "specsSummary": "Efficiency 98.8%, anti-islanding protection, IP66 rated outdoor enclosure"
          }
      ],
      "consignees": [
          {
              "location": "NTPC Singrauli Super Thermal Power Station",
              "state": "Uttar Pradesh",
              "pincode": "231222",
              "quantity": 925
          }
      ],
      "requiredDocuments": [
          "ALMM Model Certificate",
          "MNRE Test Certificate as per IEC 61215",
          "CA Turnover Certificate"
      ],
      "closingTimeUtc": "2026-11-02T14:30:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201004",
      "b_id": "8201004"
  },
  {
      "bidNumber": "GEM/2026/B/8201005",
      "title": "Supply of High-Tensile Prestressed Concrete Railway Sleepers (RT-2496)",
      "department": "Research Designs and Standards Organisation (RDSO)",
      "ministry": "Ministry of Railways",
      "type": "PRODUCT",
      "categoryDomain": "Railways & Heavy Transport",
      "estimatedBidValueInr": 31000000,
      "emdAmountInr": 620000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 5.0,
      "minAnnualTurnoverInr": 25000000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 25,
      "deliveryPeriodDays": 60,
      "splittingRatio": "100% to L1",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Broad Gauge Mono-block Prestressed Concrete Sleepers RT-2496",
              "quantity": 18000,
              "unit": "Pieces",
              "specsSummary": "RDSO Drawing No. T-2496, 60kg rail profile, 25-ton axle load certified"
          }
      ],
      "consignees": [
          {
              "location": "Senior Section Engineer (P-Way), Mughalsarai Depot",
              "state": "Uttar Pradesh",
              "pincode": "232101",
              "quantity": 10000
          },
          {
              "location": "Senior Section Engineer (P-Way), Gaya Yard",
              "state": "Bihar",
              "pincode": "823001",
              "quantity": 8000
          }
      ],
      "requiredDocuments": [
          "RDSO Approval Certificate",
          "Factory Quality Assurance Audit Report",
          "Past Performance Railway Invoices"
      ],
      "closingTimeUtc": "2026-11-04T12:00:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201005",
      "b_id": "8201005"
  },
  {
      "bidNumber": "GEM/2026/B/8201006",
      "title": "Enterprise Cloud Infrastructure & Managed Disaster Recovery Services",
      "department": "Unique Identification Authority of India (UIDAI)",
      "ministry": "Ministry of Electronics & IT",
      "type": "SERVICE",
      "categoryDomain": "IT & Telecommunications",
      "estimatedBidValueInr": 48000000,
      "emdAmountInr": 960000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 5.0,
      "minAnnualTurnoverInr": 40000000,
      "yearsExperienceRequired": 5,
      "pastPerformancePercentage": 35,
      "deliveryPeriodDays": 730,
      "splittingRatio": "100% to L1",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "MeitY Empanelled Cloud Service Provider (CSP) Managed Infrastructure",
              "quantity": 24,
              "unit": "Months",
              "specsSummary": "Tier-IV Data Center in India, ISO 27001, SOC 2 Type II, RPO < 15 mins, RTO < 1 hour"
          }
      ],
      "consignees": [
          {
              "location": "UIDAI Data Centre, Manesar",
              "state": "Haryana",
              "pincode": "122051",
              "quantity": 24
          }
      ],
      "requiredDocuments": [
          "MeitY Cloud Empanelment Letter",
          "CERT-In Security Audit Certificate",
          "Tier-IV Uptime Institute Certification"
      ],
      "closingTimeUtc": "2026-11-06T15:00:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201006",
      "b_id": "8201006"
  },
  {
      "bidNumber": "GEM/2026/B/8201007",
      "title": "High-Pressure Commercial Water Mist Fire Suppression Systems",
      "department": "Indian Oil Corporation Limited (IOCL) Refinery",
      "ministry": "Ministry of Petroleum and Natural Gas",
      "type": "PRODUCT",
      "categoryDomain": "Defence & Security",
      "estimatedBidValueInr": 16500000,
      "emdAmountInr": 330000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 5.0,
      "minAnnualTurnoverInr": 12000000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 25,
      "deliveryPeriodDays": 45,
      "splittingRatio": "100% to L1",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Automated High-Pressure Water Mist Skid with Stainless Steel 316 Piping",
              "quantity": 8,
              "unit": "Systems",
              "specsSummary": "NFPA 750 compliant, operating pressure 140 bar, explosion-proof ATEX motor"
          }
      ],
      "consignees": [
          {
              "location": "IOCL Panipat Refinery & Petrochemical Complex",
              "state": "Haryana",
              "pincode": "132140",
              "quantity": 8
          }
      ],
      "requiredDocuments": [
          "PESO / ATEX Explosion Proof Certificate",
          "NFPA 750 Test Compliance",
          "Past Performance Refinery Supply Proofs"
      ],
      "closingTimeUtc": "2026-11-08T14:00:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201007",
      "b_id": "8201007"
  },
  {
      "bidNumber": "GEM/2026/B/8201008",
      "title": "Supply and Laying of Commercial CPVC and DI Piping for Smart Water Grid",
      "department": "Surat Municipal Corporation Smart City SPV",
      "ministry": "Ministry of Housing and Urban Affairs",
      "type": "BOQ",
      "categoryDomain": "Urban Infrastructure & Smart Cities",
      "estimatedBidValueInr": 29000000,
      "emdAmountInr": 580000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 5.0,
      "minAnnualTurnoverInr": 22000000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 30,
      "deliveryPeriodDays": 120,
      "splittingRatio": "100% to L1",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Ductile Iron K9 Pipes 300mm with Cement Mortar Lining",
              "quantity": 14000,
              "unit": "Meters",
              "specsSummary": "IS 8329 Class K9, socket and spigot push-on flexible joints"
          },
          {
              "itemTitle": "Commercial Schedule 80 CPVC Pressure Pipes & Solvent Fittings",
              "quantity": 6500,
              "unit": "Meters",
              "specsSummary": "ASTM F441 SDR 11, working pressure 28 bar at 23 deg C"
          }
      ],
      "consignees": [
          {
              "location": "SMC Central Water Works, Katargam",
              "state": "Gujarat",
              "pincode": "395004",
              "quantity": 20500
          }
      ],
      "requiredDocuments": [
          "BIS Certification License (CM/L)",
          "CIPET Raw Material Test Certificate",
          "Past Experience Invoices"
      ],
      "closingTimeUtc": "2026-11-10T16:00:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201008",
      "b_id": "8201008"
  },
  {
      "bidNumber": "GEM/2026/B/8201009",
      "title": "Smart Precision Agricultural Weather Monitoring Stations with LoRaWAN",
      "department": "Indian Council of Agricultural Research (ICAR)",
      "ministry": "Ministry of Agriculture & Farmers Welfare",
      "type": "PRODUCT",
      "categoryDomain": "Agriculture & Environment",
      "estimatedBidValueInr": 7200000,
      "emdAmountInr": 144000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 3.0,
      "minAnnualTurnoverInr": 5500000,
      "yearsExperienceRequired": 2,
      "pastPerformancePercentage": 20,
      "deliveryPeriodDays": 30,
      "splittingRatio": "100% to L1",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "All-in-One Solar Powered Agro-Meteorological Sensor Unit",
              "quantity": 60,
              "unit": "Stations",
              "specsSummary": "Ultrasonic wind speed, soil moisture 3-depths, solar radiation pyranometer, LoRaWAN + 4G fallback"
          }
      ],
      "consignees": [
          {
              "location": "ICAR-IARI Pusa Campus, New Delhi",
              "state": "Delhi",
              "pincode": "110012",
              "quantity": 30
          },
          {
              "location": "ICAR-CRIDA, Santoshnagar, Hyderabad",
              "state": "Telangana",
              "pincode": "500059",
              "quantity": 30
          }
      ],
      "requiredDocuments": [
          "WPC Equipment Type Approval (ETA)",
          "Udyam MSE Certificate",
          "OEM Warranty 3 Years"
      ],
      "closingTimeUtc": "2026-11-12T11:00:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201009",
      "b_id": "8201009"
  },
  {
      "bidNumber": "GEM/2026/B/8201010",
      "title": "Supply of Heavy Earthmoving Hydraulic Excavators (Crawler Mounted 20T)",
      "department": "Border Roads Organisation (BRO), Project Dantak",
      "ministry": "Ministry of Defence",
      "type": "PRODUCT",
      "categoryDomain": "Automobiles & Heavy Machinery",
      "estimatedBidValueInr": 42000000,
      "emdAmountInr": 840000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 5.0,
      "minAnnualTurnoverInr": 35000000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 30,
      "deliveryPeriodDays": 45,
      "splittingRatio": "100% to L1",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Hydraulic Crawler Excavator 20 Metric Tonne with Cold-Starting Kit",
              "quantity": 6,
              "unit": "Units",
              "specsSummary": "Engine power > 140 HP, operating altitude up to 14,000 ft, heavy duty rock bucket 1.0 cu.m"
          }
      ],
      "consignees": [
          {
              "location": "BRO Base Workshop, Rishikesh",
              "state": "Uttarakhand",
              "pincode": "249201",
              "quantity": 3
          },
          {
              "location": "BRO Sector Depot, Leh Cantt",
              "state": "Ladakh",
              "pincode": "194101",
              "quantity": 3
          }
      ],
      "requiredDocuments": [
          "OEM Authorization Certificate",
          "High Altitude Cold-Start Test Certificate",
          "Past Defence Supply Orders"
      ],
      "closingTimeUtc": "2026-11-15T15:00:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201010",
      "b_id": "8201010"
  },
  {
      "bidNumber": "GEM/2026/B/8201011",
      "title": "Advanced High-Performance Compute GPU Nodes (NVIDIA H100)",
      "department": "Indian Institute of Technology (IIT) Madras",
      "ministry": "Ministry of Education",
      "type": "PRODUCT",
      "categoryDomain": "IT & Telecommunications",
      "estimatedBidValueInr": 52000000,
      "emdAmountInr": 1040000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 3.0,
      "minAnnualTurnoverInr": 39000000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 25,
      "deliveryPeriodDays": 45,
      "splittingRatio": "75:25 MSE Preference",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Advanced High-Performance Compute GPU Nodes (NVIDIA H100)",
              "quantity": 8,
              "unit": "Units",
              "specsSummary": "Official GeM specifications meeting IS/ISO standards for Indian Institute of Technology (IIT) Madras"
          }
      ],
      "consignees": [
          {
              "location": "Indian Institute of Technology (IIT) Madras Stores",
              "state": "Tamil Nadu",
              "pincode": "600036",
              "quantity": 8
          }
      ],
      "requiredDocuments": [
          "Udyam MSE Registration Certificate",
          "OEM Authorization Form",
          "CA Certified Annual Turnover Certificate",
          "Past Performance Completion Proofs"
      ],
      "closingTimeUtc": "2026-11-20T14:30:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201011",
      "b_id": "8201011"
  },
  {
      "bidNumber": "GEM/2026/B/8201012",
      "title": "Digital Radiography X-Ray Systems 500mA with Ceiling Suspension",
      "department": "Safdarjung Hospital & VMMC, New Delhi",
      "ministry": "Ministry of Health & Family Welfare",
      "type": "PRODUCT",
      "categoryDomain": "Medical & Healthcare",
      "estimatedBidValueInr": 38000000,
      "emdAmountInr": 760000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 3.0,
      "minAnnualTurnoverInr": 28500000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 25,
      "deliveryPeriodDays": 45,
      "splittingRatio": "75:25 MSE Preference",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Digital Radiography X-Ray Systems 500mA with Ceiling Suspension",
              "quantity": 4,
              "unit": "Units",
              "specsSummary": "Official GeM specifications meeting IS/ISO standards for Safdarjung Hospital & VMMC, New Delhi"
          }
      ],
      "consignees": [
          {
              "location": "Safdarjung Hospital & VMMC, New Delhi Stores",
              "state": "Delhi",
              "pincode": "110029",
              "quantity": 4
          }
      ],
      "requiredDocuments": [
          "Udyam MSE Registration Certificate",
          "OEM Authorization Form",
          "CA Certified Annual Turnover Certificate",
          "Past Performance Completion Proofs"
      ],
      "closingTimeUtc": "2026-11-20T14:30:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201012",
      "b_id": "8201012"
  },
  {
      "bidNumber": "GEM/2026/B/8201013",
      "title": "Forged Alloy Steel Rotor Shafts for Supercritical Steam Turbines",
      "department": "Bharat Heavy Electricals Limited (BHEL) Haridwar",
      "ministry": "Ministry of Heavy Industries",
      "type": "PRODUCT",
      "categoryDomain": "Heavy Manufacturing",
      "estimatedBidValueInr": 64000000,
      "emdAmountInr": 1280000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 3.0,
      "minAnnualTurnoverInr": 48000000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 25,
      "deliveryPeriodDays": 45,
      "splittingRatio": "75:25 MSE Preference",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Forged Alloy Steel Rotor Shafts for Supercritical Steam Turbines",
              "quantity": 6,
              "unit": "Units",
              "specsSummary": "Official GeM specifications meeting IS/ISO standards for Bharat Heavy Electricals Limited (BHEL) Haridwar"
          }
      ],
      "consignees": [
          {
              "location": "Bharat Heavy Electricals Limited (BHEL) Haridwar Stores",
              "state": "Uttarakhand",
              "pincode": "249403",
              "quantity": 6
          }
      ],
      "requiredDocuments": [
          "Udyam MSE Registration Certificate",
          "OEM Authorization Form",
          "CA Certified Annual Turnover Certificate",
          "Past Performance Completion Proofs"
      ],
      "closingTimeUtc": "2026-11-20T14:30:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201013",
      "b_id": "8201013"
  },
  {
      "bidNumber": "GEM/2026/B/8201014",
      "title": "Stainless Steel Grade 301LN Side Wall Panels for Vande Bharat",
      "department": "Integral Coach Factory (ICF) Perambur, Chennai",
      "ministry": "Ministry of Railways",
      "type": "PRODUCT",
      "categoryDomain": "Railways & Heavy Transport",
      "estimatedBidValueInr": 41000000,
      "emdAmountInr": 820000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 3.0,
      "minAnnualTurnoverInr": 30750000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 25,
      "deliveryPeriodDays": 45,
      "splittingRatio": "75:25 MSE Preference",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Stainless Steel Grade 301LN Side Wall Panels for Vande Bharat",
              "quantity": 120,
              "unit": "Units",
              "specsSummary": "Official GeM specifications meeting IS/ISO standards for Integral Coach Factory (ICF) Perambur, Chennai"
          }
      ],
      "consignees": [
          {
              "location": "Integral Coach Factory (ICF) Perambur, Chennai Stores",
              "state": "Tamil Nadu",
              "pincode": "600038",
              "quantity": 120
          }
      ],
      "requiredDocuments": [
          "Udyam MSE Registration Certificate",
          "OEM Authorization Form",
          "CA Certified Annual Turnover Certificate",
          "Past Performance Completion Proofs"
      ],
      "closingTimeUtc": "2026-11-20T14:30:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201014",
      "b_id": "8201014"
  },
  {
      "bidNumber": "GEM/2026/B/8201015",
      "title": "Marine Grade Low-Smoke Zero-Halogen (LSZH) Power Cables IP68",
      "department": "Mazagon Dock Shipbuilders Limited (MDL), Mumbai",
      "ministry": "Ministry of Defence",
      "type": "PRODUCT",
      "categoryDomain": "Defence & Security",
      "estimatedBidValueInr": 27000000,
      "emdAmountInr": 540000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 3.0,
      "minAnnualTurnoverInr": 20250000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 25,
      "deliveryPeriodDays": 45,
      "splittingRatio": "75:25 MSE Preference",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Marine Grade Low-Smoke Zero-Halogen (LSZH) Power Cables IP68",
              "quantity": 5000,
              "unit": "Units",
              "specsSummary": "Official GeM specifications meeting IS/ISO standards for Mazagon Dock Shipbuilders Limited (MDL), Mumbai"
          }
      ],
      "consignees": [
          {
              "location": "Mazagon Dock Shipbuilders Limited (MDL), Mumbai Stores",
              "state": "Maharashtra",
              "pincode": "400010",
              "quantity": 5000
          }
      ],
      "requiredDocuments": [
          "Udyam MSE Registration Certificate",
          "OEM Authorization Form",
          "CA Certified Annual Turnover Certificate",
          "Past Performance Completion Proofs"
      ],
      "closingTimeUtc": "2026-11-20T14:30:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201015",
      "b_id": "8201015"
  },
  {
      "bidNumber": "GEM/2026/B/8201016",
      "title": "765 kV Extra High Voltage Substation Porcelain Disc Insulators",
      "department": "Power Grid Corporation of India Limited (POWERGRID)",
      "ministry": "Ministry of Power",
      "type": "PRODUCT",
      "categoryDomain": "Power & Solar Energy",
      "estimatedBidValueInr": 36000000,
      "emdAmountInr": 720000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 3.0,
      "minAnnualTurnoverInr": 27000000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 25,
      "deliveryPeriodDays": 45,
      "splittingRatio": "75:25 MSE Preference",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "765 kV Extra High Voltage Substation Porcelain Disc Insulators",
              "quantity": 24000,
              "unit": "Units",
              "specsSummary": "Official GeM specifications meeting IS/ISO standards for Power Grid Corporation of India Limited (POWERGRID)"
          }
      ],
      "consignees": [
          {
              "location": "Power Grid Corporation of India Limited (POWERGRID) Stores",
              "state": "Haryana",
              "pincode": "122001",
              "quantity": 24000
          }
      ],
      "requiredDocuments": [
          "Udyam MSE Registration Certificate",
          "OEM Authorization Form",
          "CA Certified Annual Turnover Certificate",
          "Past Performance Completion Proofs"
      ],
      "closingTimeUtc": "2026-11-20T14:30:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201016",
      "b_id": "8201016"
  },
  {
      "bidNumber": "GEM/2026/B/8201017",
      "title": "Ballistic Helmets Level III-A with Night Vision Shrouds",
      "department": "Central Reserve Police Force (CRPF) Directorate",
      "ministry": "Ministry of Home Affairs",
      "type": "PRODUCT",
      "categoryDomain": "Defence & Security",
      "estimatedBidValueInr": 18500000,
      "emdAmountInr": 370000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 3.0,
      "minAnnualTurnoverInr": 13875000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 25,
      "deliveryPeriodDays": 45,
      "splittingRatio": "75:25 MSE Preference",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Ballistic Helmets Level III-A with Night Vision Shrouds",
              "quantity": 2500,
              "unit": "Units",
              "specsSummary": "Official GeM specifications meeting IS/ISO standards for Central Reserve Police Force (CRPF) Directorate"
          }
      ],
      "consignees": [
          {
              "location": "Central Reserve Police Force (CRPF) Directorate Stores",
              "state": "Delhi",
              "pincode": "110003",
              "quantity": 2500
          }
      ],
      "requiredDocuments": [
          "Udyam MSE Registration Certificate",
          "OEM Authorization Form",
          "CA Certified Annual Turnover Certificate",
          "Past Performance Completion Proofs"
      ],
      "closingTimeUtc": "2026-11-20T14:30:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201017",
      "b_id": "8201017"
  },
  {
      "bidNumber": "GEM/2026/B/8201018",
      "title": "High-Density Polyethylene (HDPE) Tarpaulins 250 GSM for Wheat Storage",
      "department": "Food Corporation of India (FCI) Regional Office",
      "ministry": "Ministry of Agriculture & Farmers Welfare",
      "type": "PRODUCT",
      "categoryDomain": "Agriculture & Environment",
      "estimatedBidValueInr": 14000000,
      "emdAmountInr": 280000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 3.0,
      "minAnnualTurnoverInr": 10500000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 25,
      "deliveryPeriodDays": 45,
      "splittingRatio": "75:25 MSE Preference",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "High-Density Polyethylene (HDPE) Tarpaulins 250 GSM for Wheat Storage",
              "quantity": 15000,
              "unit": "Units",
              "specsSummary": "Official GeM specifications meeting IS/ISO standards for Food Corporation of India (FCI) Regional Office"
          }
      ],
      "consignees": [
          {
              "location": "Food Corporation of India (FCI) Regional Office Stores",
              "state": "Punjab",
              "pincode": "141001",
              "quantity": 15000
          }
      ],
      "requiredDocuments": [
          "Udyam MSE Registration Certificate",
          "OEM Authorization Form",
          "CA Certified Annual Turnover Certificate",
          "Past Performance Completion Proofs"
      ],
      "closingTimeUtc": "2026-11-20T14:30:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201018",
      "b_id": "8201018"
  },
  {
      "bidNumber": "GEM/2026/B/8201019",
      "title": "LED Street Lighting Fixtures 120W with CCMS Smart Feeder Panels",
      "department": "Central Public Works Department (CPWD) Northern Zone",
      "ministry": "Ministry of Housing and Urban Affairs",
      "type": "PRODUCT",
      "categoryDomain": "Power & Solar Energy",
      "estimatedBidValueInr": 9800000,
      "emdAmountInr": 196000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 3.0,
      "minAnnualTurnoverInr": 7350000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 25,
      "deliveryPeriodDays": 45,
      "splittingRatio": "75:25 MSE Preference",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "LED Street Lighting Fixtures 120W with CCMS Smart Feeder Panels",
              "quantity": 1800,
              "unit": "Units",
              "specsSummary": "Official GeM specifications meeting IS/ISO standards for Central Public Works Department (CPWD) Northern Zone"
          }
      ],
      "consignees": [
          {
              "location": "Central Public Works Department (CPWD) Northern Zone Stores",
              "state": "Chandigarh",
              "pincode": "160001",
              "quantity": 1800
          }
      ],
      "requiredDocuments": [
          "Udyam MSE Registration Certificate",
          "OEM Authorization Form",
          "CA Certified Annual Turnover Certificate",
          "Past Performance Completion Proofs"
      ],
      "closingTimeUtc": "2026-11-20T14:30:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201019",
      "b_id": "8201019"
  },
  {
      "bidNumber": "GEM/2026/B/8201020",
      "title": "Enterprise NVMe All-Flash SAN Storage 500TB with 100GbE NICs",
      "department": "Centre for Development of Advanced Computing (C-DAC)",
      "ministry": "Ministry of Electronics & IT",
      "type": "PRODUCT",
      "categoryDomain": "IT & Telecommunications",
      "estimatedBidValueInr": 22500000,
      "emdAmountInr": 450000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 3.0,
      "minAnnualTurnoverInr": 16875000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 25,
      "deliveryPeriodDays": 45,
      "splittingRatio": "75:25 MSE Preference",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Enterprise NVMe All-Flash SAN Storage 500TB with 100GbE NICs",
              "quantity": 2,
              "unit": "Units",
              "specsSummary": "Official GeM specifications meeting IS/ISO standards for Centre for Development of Advanced Computing (C-DAC)"
          }
      ],
      "consignees": [
          {
              "location": "Centre for Development of Advanced Computing (C-DAC) Stores",
              "state": "Maharashtra",
              "pincode": "411007",
              "quantity": 2
          }
      ],
      "requiredDocuments": [
          "Udyam MSE Registration Certificate",
          "OEM Authorization Form",
          "CA Certified Annual Turnover Certificate",
          "Past Performance Completion Proofs"
      ],
      "closingTimeUtc": "2026-11-20T14:30:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201020",
      "b_id": "8201020"
  },
  {
      "bidNumber": "GEM/2026/B/8201021",
      "title": "Heavy Duty Steel Wire Reinforced Conveyor Belting 1600mm",
      "department": "Coal India Limited (CIL) Headquarters",
      "ministry": "Ministry of Coal",
      "type": "PRODUCT",
      "categoryDomain": "Heavy Manufacturing",
      "estimatedBidValueInr": 49000000,
      "emdAmountInr": 980000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 3.0,
      "minAnnualTurnoverInr": 36750000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 25,
      "deliveryPeriodDays": 45,
      "splittingRatio": "75:25 MSE Preference",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Heavy Duty Steel Wire Reinforced Conveyor Belting 1600mm",
              "quantity": 8000,
              "unit": "Units",
              "specsSummary": "Official GeM specifications meeting IS/ISO standards for Coal India Limited (CIL) Headquarters"
          }
      ],
      "consignees": [
          {
              "location": "Coal India Limited (CIL) Headquarters Stores",
              "state": "West Bengal",
              "pincode": "700156",
              "quantity": 8000
          }
      ],
      "requiredDocuments": [
          "Udyam MSE Registration Certificate",
          "OEM Authorization Form",
          "CA Certified Annual Turnover Certificate",
          "Past Performance Completion Proofs"
      ],
      "closingTimeUtc": "2026-11-20T14:30:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201021",
      "b_id": "8201021"
  },
  {
      "bidNumber": "GEM/2026/B/8201022",
      "title": "Refractory Magnesite Carbon Bricks for Basic Oxygen Furnaces",
      "department": "Steel Authority of India Limited (SAIL) Rourkela",
      "ministry": "Ministry of Steel",
      "type": "PRODUCT",
      "categoryDomain": "Heavy Manufacturing",
      "estimatedBidValueInr": 33000000,
      "emdAmountInr": 660000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 3.0,
      "minAnnualTurnoverInr": 24750000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 25,
      "deliveryPeriodDays": 45,
      "splittingRatio": "75:25 MSE Preference",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Refractory Magnesite Carbon Bricks for Basic Oxygen Furnaces",
              "quantity": 450,
              "unit": "Units",
              "specsSummary": "Official GeM specifications meeting IS/ISO standards for Steel Authority of India Limited (SAIL) Rourkela"
          }
      ],
      "consignees": [
          {
              "location": "Steel Authority of India Limited (SAIL) Rourkela Stores",
              "state": "Odisha",
              "pincode": "769011",
              "quantity": 450
          }
      ],
      "requiredDocuments": [
          "Udyam MSE Registration Certificate",
          "OEM Authorization Form",
          "CA Certified Annual Turnover Certificate",
          "Past Performance Completion Proofs"
      ],
      "closingTimeUtc": "2026-11-20T14:30:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201022",
      "b_id": "8201022"
  },
  {
      "bidNumber": "GEM/2026/B/8201023",
      "title": "Automated Rubber-Tyred Gantry (ARTG) Crane Spares & Drive Motors",
      "department": "Jawaharlal Nehru Port Authority (JNPA)",
      "ministry": "Ministry of Ports, Shipping and Waterways",
      "type": "PRODUCT",
      "categoryDomain": "Heavy Manufacturing",
      "estimatedBidValueInr": 28000000,
      "emdAmountInr": 560000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 3.0,
      "minAnnualTurnoverInr": 21000000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 25,
      "deliveryPeriodDays": 45,
      "splittingRatio": "75:25 MSE Preference",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Automated Rubber-Tyred Gantry (ARTG) Crane Spares & Drive Motors",
              "quantity": 15,
              "unit": "Units",
              "specsSummary": "Official GeM specifications meeting IS/ISO standards for Jawaharlal Nehru Port Authority (JNPA)"
          }
      ],
      "consignees": [
          {
              "location": "Jawaharlal Nehru Port Authority (JNPA) Stores",
              "state": "Maharashtra",
              "pincode": "400707",
              "quantity": 15
          }
      ],
      "requiredDocuments": [
          "Udyam MSE Registration Certificate",
          "OEM Authorization Form",
          "CA Certified Annual Turnover Certificate",
          "Past Performance Completion Proofs"
      ],
      "closingTimeUtc": "2026-11-20T14:30:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201023",
      "b_id": "8201023"
  },
  {
      "bidNumber": "GEM/2026/B/8201024",
      "title": "Doppler VHF Omni-Directional Range (DVOR) Antenna Navigational Aids",
      "department": "Airports Authority of India (AAI) Rajiv Gandhi Bhawan",
      "ministry": "Ministry of Civil Aviation",
      "type": "PRODUCT",
      "categoryDomain": "IT & Telecommunications",
      "estimatedBidValueInr": 62000000,
      "emdAmountInr": 1240000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 3.0,
      "minAnnualTurnoverInr": 46500000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 25,
      "deliveryPeriodDays": 45,
      "splittingRatio": "75:25 MSE Preference",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Doppler VHF Omni-Directional Range (DVOR) Antenna Navigational Aids",
              "quantity": 4,
              "unit": "Units",
              "specsSummary": "Official GeM specifications meeting IS/ISO standards for Airports Authority of India (AAI) Rajiv Gandhi Bhawan"
          }
      ],
      "consignees": [
          {
              "location": "Airports Authority of India (AAI) Rajiv Gandhi Bhawan Stores",
              "state": "Delhi",
              "pincode": "110003",
              "quantity": 4
          }
      ],
      "requiredDocuments": [
          "Udyam MSE Registration Certificate",
          "OEM Authorization Form",
          "CA Certified Annual Turnover Certificate",
          "Past Performance Completion Proofs"
      ],
      "closingTimeUtc": "2026-11-20T14:30:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201024",
      "b_id": "8201024"
  },
  {
      "bidNumber": "GEM/2026/B/8201025",
      "title": "Continuous Real-Time Water Quality Monitoring Systems (BOD/COD/DO)",
      "department": "National Water Development Agency (NWDA)",
      "ministry": "Ministry of Jal Shakti",
      "type": "PRODUCT",
      "categoryDomain": "Agriculture & Environment",
      "estimatedBidValueInr": 12000000,
      "emdAmountInr": 240000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 3.0,
      "minAnnualTurnoverInr": 9000000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 25,
      "deliveryPeriodDays": 45,
      "splittingRatio": "75:25 MSE Preference",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Continuous Real-Time Water Quality Monitoring Systems (BOD/COD/DO)",
              "quantity": 25,
              "unit": "Units",
              "specsSummary": "Official GeM specifications meeting IS/ISO standards for National Water Development Agency (NWDA)"
          }
      ],
      "consignees": [
          {
              "location": "National Water Development Agency (NWDA) Stores",
              "state": "Madhya Pradesh",
              "pincode": "462001",
              "quantity": 25
          }
      ],
      "requiredDocuments": [
          "Udyam MSE Registration Certificate",
          "OEM Authorization Form",
          "CA Certified Annual Turnover Certificate",
          "Past Performance Completion Proofs"
      ],
      "closingTimeUtc": "2026-11-20T14:30:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201025",
      "b_id": "8201025"
  },
  {
      "bidNumber": "GEM/2026/B/8201026",
      "title": "Ultra-High Vacuum Cryogenic Chamber with Temperature Controller",
      "department": "CSIR-National Physical Laboratory (NPL)",
      "ministry": "Ministry of Science and Technology",
      "type": "PRODUCT",
      "categoryDomain": "Scientific & Research",
      "estimatedBidValueInr": 17500000,
      "emdAmountInr": 350000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 3.0,
      "minAnnualTurnoverInr": 13125000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 25,
      "deliveryPeriodDays": 45,
      "splittingRatio": "75:25 MSE Preference",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Ultra-High Vacuum Cryogenic Chamber with Temperature Controller",
              "quantity": 1,
              "unit": "Units",
              "specsSummary": "Official GeM specifications meeting IS/ISO standards for CSIR-National Physical Laboratory (NPL)"
          }
      ],
      "consignees": [
          {
              "location": "CSIR-National Physical Laboratory (NPL) Stores",
              "state": "Delhi",
              "pincode": "110012",
              "quantity": 1
          }
      ],
      "requiredDocuments": [
          "Udyam MSE Registration Certificate",
          "OEM Authorization Form",
          "CA Certified Annual Turnover Certificate",
          "Past Performance Completion Proofs"
      ],
      "closingTimeUtc": "2026-11-20T14:30:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201026",
      "b_id": "8201026"
  },
  {
      "bidNumber": "GEM/2026/B/8201027",
      "title": "Solar Photovoltaic Testing Equipment and Sun Simulators Class AAA",
      "department": "Solar Energy Corporation of India (SECI)",
      "ministry": "Ministry of New and Renewable Energy",
      "type": "PRODUCT",
      "categoryDomain": "Power & Solar Energy",
      "estimatedBidValueInr": 21000000,
      "emdAmountInr": 420000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 3.0,
      "minAnnualTurnoverInr": 15750000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 25,
      "deliveryPeriodDays": 45,
      "splittingRatio": "75:25 MSE Preference",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Solar Photovoltaic Testing Equipment and Sun Simulators Class AAA",
              "quantity": 2,
              "unit": "Units",
              "specsSummary": "Official GeM specifications meeting IS/ISO standards for Solar Energy Corporation of India (SECI)"
          }
      ],
      "consignees": [
          {
              "location": "Solar Energy Corporation of India (SECI) Stores",
              "state": "Rajasthan",
              "pincode": "302001",
              "quantity": 2
          }
      ],
      "requiredDocuments": [
          "Udyam MSE Registration Certificate",
          "OEM Authorization Form",
          "CA Certified Annual Turnover Certificate",
          "Past Performance Completion Proofs"
      ],
      "closingTimeUtc": "2026-11-20T14:30:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201027",
      "b_id": "8201027"
  },
  {
      "bidNumber": "GEM/2026/B/8201028",
      "title": "Computerized High-Speed Jacquard Powerlooms with CAD Stations",
      "department": "National Institute of Fashion Technology (NIFT) Gandhinagar",
      "ministry": "Ministry of Textiles",
      "type": "PRODUCT",
      "categoryDomain": "Textiles & Handloom",
      "estimatedBidValueInr": 8500000,
      "emdAmountInr": 170000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 3.0,
      "minAnnualTurnoverInr": 6375000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 25,
      "deliveryPeriodDays": 45,
      "splittingRatio": "75:25 MSE Preference",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Computerized High-Speed Jacquard Powerlooms with CAD Stations",
              "quantity": 8,
              "unit": "Units",
              "specsSummary": "Official GeM specifications meeting IS/ISO standards for National Institute of Fashion Technology (NIFT) Gandhinagar"
          }
      ],
      "consignees": [
          {
              "location": "National Institute of Fashion Technology (NIFT) Gandhinagar Stores",
              "state": "Gujarat",
              "pincode": "382007",
              "quantity": 8
          }
      ],
      "requiredDocuments": [
          "Udyam MSE Registration Certificate",
          "OEM Authorization Form",
          "CA Certified Annual Turnover Certificate",
          "Past Performance Completion Proofs"
      ],
      "closingTimeUtc": "2026-11-20T14:30:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201028",
      "b_id": "8201028"
  },
  {
      "bidNumber": "GEM/2026/B/8201029",
      "title": "Handloom Weaving Accessories and Cotton Yarn Packs for SHGs",
      "department": "National Rural Livelihoods Promotion Society",
      "ministry": "Ministry of Rural Development",
      "type": "PRODUCT",
      "categoryDomain": "Textiles & Handloom",
      "estimatedBidValueInr": 6200000,
      "emdAmountInr": 124000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 3.0,
      "minAnnualTurnoverInr": 4650000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 25,
      "deliveryPeriodDays": 45,
      "splittingRatio": "75:25 MSE Preference",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Handloom Weaving Accessories and Cotton Yarn Packs for SHGs",
              "quantity": 1200,
              "unit": "Units",
              "specsSummary": "Official GeM specifications meeting IS/ISO standards for National Rural Livelihoods Promotion Society"
          }
      ],
      "consignees": [
          {
              "location": "National Rural Livelihoods Promotion Society Stores",
              "state": "Bihar",
              "pincode": "800001",
              "quantity": 1200
          }
      ],
      "requiredDocuments": [
          "Udyam MSE Registration Certificate",
          "OEM Authorization Form",
          "CA Certified Annual Turnover Certificate",
          "Past Performance Completion Proofs"
      ],
      "closingTimeUtc": "2026-11-20T14:30:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201029",
      "b_id": "8201029"
  },
  {
      "bidNumber": "GEM/2026/B/8201030",
      "title": "Field Portable X-Ray Fluorescence (pXRF) Mineral Analyzers",
      "department": "Geological Survey of India (GSI) Western Region",
      "ministry": "Ministry of Mines",
      "type": "PRODUCT",
      "categoryDomain": "Scientific & Research",
      "estimatedBidValueInr": 14500000,
      "emdAmountInr": 290000,
      "isEmdExemptForMse": true,
      "epbgPercentage": 3.0,
      "minAnnualTurnoverInr": 10875000,
      "yearsExperienceRequired": 3,
      "pastPerformancePercentage": 25,
      "deliveryPeriodDays": 45,
      "splittingRatio": "75:25 MSE Preference",
      "makeInIndiaClass": "CLASS_1",
      "boqItems": [
          {
              "itemTitle": "Field Portable X-Ray Fluorescence (pXRF) Mineral Analyzers",
              "quantity": 6,
              "unit": "Units",
              "specsSummary": "Official GeM specifications meeting IS/ISO standards for Geological Survey of India (GSI) Western Region"
          }
      ],
      "consignees": [
          {
              "location": "Geological Survey of India (GSI) Western Region Stores",
              "state": "Rajasthan",
              "pincode": "302004",
              "quantity": 6
          }
      ],
      "requiredDocuments": [
          "Udyam MSE Registration Certificate",
          "OEM Authorization Form",
          "CA Certified Annual Turnover Certificate",
          "Past Performance Completion Proofs"
      ],
      "closingTimeUtc": "2026-11-20T14:30:00Z",
      "docUrl": "https://bidplus.gem.gov.in/showbidDocument/8201030",
      "b_id": "8201030"
  }
];


export const MOCK_FORWARD_AUCTIONS: ForwardAuctionLot[] = [
  {
    id: 'fa-lot-001',
    auctionNumber: 'GEM-FA-2026-8812',
    title: 'Decommissioned Earthmoving Machinery & Heavy Excavator Spares (3 Lots)',
    department: 'Border Roads Organisation (GREF)',
    locationYard: 'BRO Equipment Yard, Pathankot, Punjab (Pincode: 145001)',
    reservePriceInr: 1450000,
    currentHighestBidInr: 1625000,
    minimumIncrementInr: 25000,
    closingTimeUtc: new Date(Date.now() + 4 * 3600 * 1000 + 15 * 60 * 1000).toISOString(),
    category: 'MACHINERY',
  },
  {
    id: 'fa-lot-002',
    auctionNumber: 'GEM-FA-2026-9904',
    title: 'Condemned Light Utility Vehicles (Mahindra Bolero 4x4 - 6 Units Batch)',
    department: 'Central Reserve Police Force (CRPF)',
    locationYard: 'CRPF Group Centre Yard, Kadarpur, Gurugram, Haryana',
    reservePriceInr: 580000,
    currentHighestBidInr: 640000,
    minimumIncrementInr: 10000,
    closingTimeUtc: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
    category: 'VEHICLES',
  },
  {
    id: 'fa-lot-003',
    auctionNumber: 'GEM-FA-2026-7731',
    title: 'Unserviceable Copper Cable Scrap & Heavy Marine Brass Fittings (4.2 Metric Tonnes)',
    department: 'Indian Navy Material Organisation',
    locationYard: 'Naval Dockyard Scrap Depot, Lion Gate, Mumbai, Maharashtra',
    reservePriceInr: 2100000,
    currentHighestBidInr: 2350000,
    minimumIncrementInr: 50000,
    closingTimeUtc: new Date(Date.now() + 6 * 3600 * 1000 + 45 * 60 * 1000).toISOString(),
    category: 'SCRAP_METAL',
  },
];

export const MOCK_PARTICIPATED_BIDS: ParticipatedBid[] = [
  {
    bidNumber: 'GEM/2026/B/89012',
    itemTitle: 'Commercial LED Batten Luminaires 45W & Street Lights',
    department: 'Military Engineer Services (MES)',
    quotedPriceInr: 2680000,
    expectedL1BenchmarkInr: 2750000,
    submittedAtUtc: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    stage: 'TECHNICAL_EVALUATION',
    currentRank: 1,
    corrigendumCount: 1,
  },
  {
    bidNumber: 'GEM/2026/B/99201',
    itemTitle: 'Rugged Tactical Routers (MIL-STD-810G)',
    department: 'Border Security Force (BSF)',
    quotedPriceInr: 3900000,
    expectedL1BenchmarkInr: 3850000,
    submittedAtUtc: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    stage: 'REVERSE_AUCTION',
    currentRank: 2,
    corrigendumCount: 0,
  },
  {
    bidNumber: 'GEM-PO-2026-88192',
    itemTitle: 'High-Tensile Structural Fasteners (M24 Grade 8.8)',
    department: 'Bharat Dynamics Heavy Industries Ltd',
    quotedPriceInr: 4850000,
    expectedL1BenchmarkInr: 4850000,
    submittedAtUtc: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
    stage: 'AWARDED_L1',
    currentRank: 1,
    corrigendumCount: 2,
  },
];
