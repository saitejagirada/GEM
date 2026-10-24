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
