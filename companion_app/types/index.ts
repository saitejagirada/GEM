/**
 * GeM Mobile Companion App - Core Domain Types & Data Models
 * Synthesized from MiroFish Multi-Agent Simulation (sim_3614a62bb2f6)
 */

export type UserRole = 'buyer' | 'seller_msme' | 'consignee_inspector' | 'startup' | 'helpdesk';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  organization: string;
  department?: string;
  verified: boolean;
  biometricAuthEnabled: boolean;
}

// -------------------------------------------------------------------------
// Module 1: Live Reverse Auction (RA) Models
// -------------------------------------------------------------------------

export interface AuctionItem {
  id: string;
  contractNumber: string;
  title: string;
  category: string;
  buyerOrganization: string;
  closingTimeUtc: string;
  currentLowestBid: number; // L1 price in INR
  sellerRank: number; // L1, L2, L3...
  sellerCurrentBid?: number;
  minimumDecrement: number;
  autoExtensionMinutes: number;
  isExtended: boolean;
}

export interface BidSubmissionRequest {
  auctionId: string;
  sellerId: string;
  unitPrice: number;
  currency: 'INR';
  biometricSignature: string;
  deviceTimestamp: string;
  clockDriftOffsetMs: number;
}

export interface BidSubmissionResponse {
  status: 'ACCEPTED' | 'REJECTED' | 'OUTBID';
  rank: number;
  isL1: boolean;
  nextMinimumBid: number;
  auctionExtended: boolean;
  remainingTimeMs: number;
}

// -------------------------------------------------------------------------
// Module 2: Field-Level CRAC Inspection Models
// -------------------------------------------------------------------------

export type CRACStatus = 'PENDING' | 'IN_PROGRESS' | 'ACCEPTED' | 'REJECTED' | 'PROVISIONAL_PRC';

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  altitudeMeters?: number;
  accuracyMeters: number;
  timestampUtc: string;
}

export interface InspectionEvidencePhoto {
  id: string;
  localUri: string;
  remoteUrl?: string;
  sha256Hash: string;
  geoTag: GeoCoordinate;
  watermarkText: string;
  capturedAtUtc: string;
  synced: boolean;
}

export interface InspectionItem {
  id: string;
  poNumber: string;
  consignmentTitle: string;
  vendorName: string;
  totalQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  barcodeScanned: string[];
  evidencePhotos: InspectionEvidencePhoto[];
  status: CRACStatus;
  defectReason?: string;
  consigneeRemarks?: string;
  offlineCreated: boolean;
  syncedAtUtc?: string;
}

// -------------------------------------------------------------------------
// Module 3: PFMS & Payment Milestone Models
// -------------------------------------------------------------------------

export type MilestoneStage = 
  | 'ORDER_PLACED' 
  | 'DISPATCHED' 
  | 'PRC_ISSUED' 
  | 'CRAC_APPROVED' 
  | 'PFMS_TREASURY_SANCTION' 
  | 'BANK_UTR_CREDITED';

export interface PaymentMilestone {
  stage: MilestoneStage;
  title: string;
  completed: boolean;
  completedAt?: string;
  description: string;
  referenceId?: string; // e.g. PFMS Bill ID or Bank UTR
}

export interface InvoiceContractTracker {
  contractId: string;
  invoiceNumber: string;
  totalAmountInr: number;
  buyerName: string;
  sellerName: string;
  cracIssueDate?: string;
  statutorySlaDaysRemaining: number; // 10-day statutory rule
  isDeemedAccepted: boolean;
  milestones: PaymentMilestone[];
  pfmsBillId?: string;
  bankUtrNumber?: string;
  expectedDisbursementDate?: string;
}

// -------------------------------------------------------------------------
// Module 4: Order-Bound Chat & Audit Log
// -------------------------------------------------------------------------

export interface OrderChatMessage {
  id: string;
  contractId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  attachedDocumentUrl?: string;
  timestampUtc: string;
  immutableAuditSignature: string;
}

// -------------------------------------------------------------------------
// Module 5: Dedicated User Agent & Profile Matching Models
// -------------------------------------------------------------------------

export interface AcceptedOrder {
  contractNumber: string; // e.g. "GEMC-511687712001"
  orderDate: string; // e.g. "15-Jan-2026"
  title: string;
  buyerDepartment: string;
  ministry: string;
  category: string;
  orderValueInr: number;
  quantity: number;
  cracStatus: 'CRAC_ACCEPTED' | 'PAYMENT_DISBURSED';
  cracDate: string;
  slaCompliance: 'ON_TIME' | 'EARLY_DELIVERY';
  invoiceNumber: string;
  pfmsUtrNumber?: string;
}

export interface UserAgentProfile {
  id: string;
  organizationName: string;
  msmeCategory: MsmeCategory;
  annualTurnoverInr: number; // e.g. 5000000 (50 Lakhs)
  yearsExperience: number; // e.g. 3
  productCategories: string[]; // e.g. ['LED Luminaire', 'Cables', 'Switchgear']
  targetStates: string[]; // e.g. ['Uttar Pradesh', 'Delhi', 'Haryana']
  isOem: boolean;
  hasUdyamCertificate: boolean;
  acceptedOrders?: AcceptedOrder[];
}

export interface BidMatchEvaluation {
  bidNumber: string;
  matchScore: number; // 0 - 100%
  isEligible: boolean;
  turnoverEligible: boolean;
  experienceEligible: boolean;
  emdStatus: 'EXEMPT' | 'PAYABLE' | 'NOT_APPLICABLE';
  verdictTag: 'HIGH_MATCH' | 'MODERATE_MATCH' | 'DISQUALIFIED';
  verdictSummary: string;
  expectedWinningBidRange: { minInr: number; maxInr: number };
  pastExperienceMatch?: {
    qualifiesCriteria: boolean;
    matchingOrderNumber?: string;
    matchingOrderValueInr?: number;
    ruleDescription: string;
  };
}

// -------------------------------------------------------------------------
// Module 6: Zero-PDF Instant Bid Fundamentals Model
// -------------------------------------------------------------------------

export type BidDocType = 'PRODUCT' | 'SERVICE' | 'CUSTOM' | 'BOQ';
export type MiiClass = 'CLASS_1' | 'CLASS_2' | 'NON_LOCAL';

export interface BoqLineItem {
  itemTitle: string;
  quantity: number;
  unit: string;
  specsSummary: string;
}

export interface ConsigneeDestination {
  location: string;
  state: string;
  pincode: string;
  quantity: number;
  reportingOfficer?: string;
}

export interface DeconstructedBidDoc {
  bidNumber: string;
  title: string;
  department: string;
  ministry: string;
  type: BidDocType;
  estimatedBidValueInr?: number;
  emdAmountInr: number;
  isEmdExemptForMse: boolean;
  epbgPercentage: number;
  minAnnualTurnoverInr: number;
  yearsExperienceRequired: number;
  pastPerformancePercentage: number;
  deliveryPeriodDays: number;
  splittingRatio?: string; // e.g. "100% to L1" or "70:30 MSE"
  makeInIndiaClass?: MiiClass;
  boqItems: BoqLineItem[];
  consignees: ConsigneeDestination[];
  requiredDocuments: string[];
  closingTimeUtc: string;
  docUrl: string;
}

// -------------------------------------------------------------------------
// Module 7: Forward Auctions (e-Scrap & Surplus Assets)
// -------------------------------------------------------------------------

export type ForwardAuctionCategory =
  | 'SCRAP_METAL'
  | 'VEHICLES'
  | 'MACHINERY'
  | 'SURPLUS_EQUIPMENT'
  | 'ELECTRONICS';

export interface ForwardAuctionLot {
  id: string;
  auctionNumber: string;
  title: string;
  department: string;
  locationYard: string;
  reservePriceInr: number;
  currentHighestBidInr: number;
  minimumIncrementInr: number;
  closingTimeUtc: string;
  category: ForwardAuctionCategory;
}

// -------------------------------------------------------------------------
// Module 8: Market Pulse & Participated Portfolio Models
// -------------------------------------------------------------------------

export interface MarketPulseStats {
  totalBidsToday: number;
  liveReverseAuctions: number;
  liveForwardAuctions: number;
  closingIn24Hours: number;
  zeroEmdBids: number;
}

export type ParticipatedBidStage =
  | 'TECHNICAL_EVALUATION'
  | 'FINANCIAL_EVALUATION'
  | 'REVERSE_AUCTION'
  | 'AWARDED_L1'
  | 'DISQUALIFIED';

export interface ParticipatedBid {
  bidNumber: string;
  itemTitle: string;
  department: string;
  quotedPriceInr: number;
  expectedL1BenchmarkInr: number;
  submittedAtUtc: string;
  stage: ParticipatedBidStage;
  currentRank?: number;
  corrigendumCount: number;
}

