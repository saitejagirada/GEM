import type {
  DeconstructedBidDoc,
  ParticipatedBid,
  WorkspaceDocument,
  WorkspaceDocumentKind,
} from '../types/index.ts';
import { BidDocService } from './BidDocService.ts';

export interface WorkspaceChecklist {
  bidNumber: string;
  requiredCount: number;
  attachedCount: number;
  missingDocuments: string[];
  isComplete: boolean;
  hasRequirements: boolean;
}

export class WorkspaceService {
  public static inferDocumentKind(fileName: string): WorkspaceDocumentKind {
    const name = fileName.toLowerCase();

    if (/(pan|gst|udyam|registration|certificate|declaration|affidavit)/.test(name)) {
      return 'COMPLIANCE';
    }
    if (/(price|financial|quotation|boq|commercial|rate)/.test(name)) {
      return 'FINANCIAL';
    }
    if (/(technical|specification|oem|authorization|datasheet|brochure|experience)/.test(name)) {
      return 'TECHNICAL';
    }
    return 'OTHER';
  }

  public static formatFileSize(sizeBytes?: number): string {
    if (!sizeBytes || sizeBytes < 1) return 'Size unavailable';
    if (sizeBytes < 1024) return String(sizeBytes) + ' B';
    if (sizeBytes < 1024 * 1024) return (sizeBytes / 1024).toFixed(0) + ' KB';
    return (sizeBytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  public static getChecklist(
    participatedBid: ParticipatedBid,
    availableBid: DeconstructedBidDoc | undefined,
    documents: WorkspaceDocument[]
  ): WorkspaceChecklist {
    if (!availableBid) {
      return {
        bidNumber: participatedBid.bidNumber,
        requiredCount: 0,
        attachedCount: documents.filter((doc) => doc.linkedBidNumber === participatedBid.bidNumber).length,
        missingDocuments: [],
        isComplete: false,
        hasRequirements: false,
      };
    }

    const linkedNames = documents
      .filter((doc) => doc.linkedBidNumber === participatedBid.bidNumber)
      .map((doc) => doc.name);
    const result = BidDocService.verifyChecklist(availableBid, linkedNames);

    return {
      bidNumber: participatedBid.bidNumber,
      requiredCount: availableBid.requiredDocuments.length,
      attachedCount: linkedNames.length,
      missingDocuments: result.missingDocs,
      isComplete: result.completed,
      hasRequirements: availableBid.requiredDocuments.length > 0,
    };
  }

  public static getStageLabel(stage: ParticipatedBid['stage']): string {
    switch (stage) {
      case 'TECHNICAL_EVALUATION':
        return 'Technical evaluation';
      case 'FINANCIAL_EVALUATION':
        return 'Financial evaluation';
      case 'REVERSE_AUCTION':
        return 'Reverse auction';
      case 'AWARDED_L1':
        return 'Awarded record';
      case 'DISQUALIFIED':
        return 'Disqualified record';
      default:
        return 'Saved record';
    }
  }
}
