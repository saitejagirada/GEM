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
