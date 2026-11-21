/**
 * GeM Mobile Companion App - Portal Document Resolver Service
 * Resolves verified GeM tender document links across all official bidplus PDF
 * endpoints (showbidDocument, showradocumentPdf, showdirectradocumentPdf) and
 * validates official domain safety.
 */

import type { DeconstructedBidDoc, OfficialBidDocument } from '../types/index';

const OFFICIAL_PDF_URL_PATTERN =
  /^https:\/\/(?:bidplus|bidplus-global)\.gem\.gov\.in\/(?:showbidDocument|showradocumentPdf|showdirectradocumentPdf)\/\d+/i;

export class PortalDocService {
  /**
   * Returns true when a URL already points directly to an official GeM PDF
   * download endpoint (Regular Bid, Reverse Auction, or Direct RA).
   */
  public static isOfficialPdfUrl(url?: string): boolean {
    return Boolean(url && OFFICIAL_PDF_URL_PATTERN.test(url.trim()));
  }

  /**
   * Resolves the official GeM PDF document URL while strictly preserving
   * live `b_id`-based RA and Bid URLs returned by bidplus.gem.gov.in.
   */
  public static resolvePdfUrl(bidNumber?: string, docUrl?: string): string {
    const trimmedDocUrl = docUrl?.trim();
    if (trimmedDocUrl && this.isOfficialPdfUrl(trimmedDocUrl)) {
      return trimmedDocUrl;
    }

    if (bidNumber) {
      const match = bidNumber.match(/(\d{6,8})/);
      if (
        match &&
        (!trimmedDocUrl ||
          !this.isOfficialPdfUrl(trimmedDocUrl) ||
          trimmedDocUrl.includes('/all-bids') ||
          trimmedDocUrl.includes('gem.gov.in/bids'))
      ) {
        const endpoint = /\/R\//i.test(bidNumber) ? 'showradocumentPdf' : 'showbidDocument';
        return `https://bidplus.gem.gov.in/${endpoint}/${match[1]}`;
      }
    }

    if (trimmedDocUrl && trimmedDocUrl.startsWith('https://')) {
      return trimmedDocUrl;
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
   * viewer. For Reverse Auctions with a parent bid ID, exposes BOTH the RA
   * document and the Original Bid PDF (which holds technical specs, EMD,
   * turnover, ePBG, and consignees).
   */
  public static getOfficialDocuments(bid: DeconstructedBidDoc): OfficialBidDocument[] {
    const mainUrl = this.resolvePdfUrl(bid.bidNumber, bid.docUrl);
    const isDirectRa = /showdirectradocumentPdf/i.test(mainUrl);
    const isRaDoc = isDirectRa || /showradocumentPdf/i.test(mainUrl) || Boolean(bid.isRa || bid.type === 'RA');

    const documents: OfficialBidDocument[] = this.isSafeGemUrl(mainUrl)
      ? [{
          id: 'bid-document',
          label: isDirectRa ? 'Direct RA document' : isRaDoc ? 'RA document' : 'Bid document',
          kind: 'BID',
          url: mainUrl,
          source: 'PUBLIC_GEM_FEED',
        }]
      : [];

    if (bid.parentBidId && bid.parentBidId !== bid.b_id) {
      const parentUrl = `https://bidplus.gem.gov.in/showbidDocument/${bid.parentBidId}`;
      if (this.isSafeGemUrl(parentUrl) && !documents.some((document) => document.url === parentUrl)) {
        documents.push({
          id: 'parent-bid-document',
          label: bid.parentBidNumber ? `Original Bid (${bid.parentBidNumber})` : 'Original Bid PDF',
          kind: 'BID',
          url: parentUrl,
          source: 'PUBLIC_GEM_FEED',
        });
      }
    }

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
