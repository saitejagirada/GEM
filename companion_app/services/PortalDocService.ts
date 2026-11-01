/**
 * GeM Mobile Companion App - Portal Document Resolver Service
 * Resolves verified GeM tender document links to the official showbidDocument endpoint
 * (https://bidplus.gem.gov.in/showbidDocument/{b_id}) and validates safety.
 */

import type { DeconstructedBidDoc, OfficialBidDocument } from '../types/index';

export class PortalDocService {
  /**
   * Resolves the official GeM PDF document URL.
   * GeM documents are served as PDF attachments at:
   * https://bidplus.gem.gov.in/showbidDocument/{numeric_bid_id}
   */
  public static resolvePdfUrl(bidNumber?: string, docUrl?: string): string {
    if (bidNumber) {
      const match = bidNumber.match(/(\d{6,8})/);
      if (
        match &&
        (!docUrl ||
          !docUrl.includes('showbidDocument') ||
          docUrl.includes('/all-bids') ||
          docUrl.includes('gem.gov.in/bids'))
      ) {
        return `https://bidplus.gem.gov.in/showbidDocument/${match[1]}`;
      }
    }

    if (docUrl && docUrl.startsWith('https://')) {
      return docUrl;
    }

    return 'https://bidplus.gem.gov.in/all-bids';
  }

  /**
   * Resolves the official GeM PDF document URL (alias for resolvePdfUrl).
   */
  public static getOfficialDocUrl(bidNumber?: string, docUrl?: string): string {
    return this.resolvePdfUrl(bidNumber, docUrl);
  }

  /**
   * Returns the official documents that can safely be shown in the in-app
   * viewer. The public feed currently exposes the main bid PDF only; related
   * attachments are included only when their URL is supplied by an official
   * GeM response and passes the domain allow-list.
   */
  public static getOfficialDocuments(bid: DeconstructedBidDoc): OfficialBidDocument[] {
    const mainUrl = this.resolvePdfUrl(bid.bidNumber, bid.docUrl);
    const documents: OfficialBidDocument[] = this.isSafeGemUrl(mainUrl)
      ? [{
          id: 'bid-document',
          label: 'Bid document',
          kind: 'BID',
          url: mainUrl,
          source: 'PUBLIC_GEM_FEED',
        }]
      : [];

    for (const related of bid.relatedDocuments ?? []) {
      if (!related?.id || !related.label || !this.isSafeGemUrl(related.url)) continue;
      if (documents.some((document) => document.url === related.url)) continue;
      documents.push({
        ...related,
        source: related.source || 'PUBLIC_GEM_RECORD',
      });
    }

    return documents;
  }

  /**
   * Whitelist validation: strictly ensures document URL is from an official verified GeM domain.
   */
  public static isSafeGemUrl(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return [
        'bidplus.gem.gov.in',
        'bidplus-global.gem.gov.in',
        'gem.gov.in',
        'www.gem.gov.in',
      ].includes(hostname);
    } catch {
      return false;
    }
  }
}
