/**
 * GeM Mobile Companion App - Portal Document Resolver Service
 * Resolves verified GeM tender document links across all official bidplus PDF
 * endpoints (showbidDocument, showradocumentPdf, showdirectradocumentPdf) and
 * buyer-attached specifications, drawings, ATC, BOQ, SLA, and GTC documents
 * hosted on official *.gem.gov.in domains.
 */

import type { DeconstructedBidDoc, OfficialBidDocument, OfficialBidDocumentKind } from '../types/index';

const OFFICIAL_PDF_URL_PATTERN =
  /^https:\/\/(?:bidplus|bidplus-global)\.gem\.gov\.in\/(?:showbidDocument|showradocumentPdf|showdirectradocumentPdf)\/\d+/i;

const ALLOWED_GEM_HOSTS = new Set([
  'bidplus.gem.gov.in',
  'bidplus-global.gem.gov.in',
  'mkp.gem.gov.in',
  'fulfilment.gem.gov.in',
  'admin.gem.gov.in',
  'assets-bg.gem.gov.in',
  'assets-mkpbg.gem.gov.in',
  'gem.gov.in',
  'www.gem.gov.in',
]);

const KIND_SORT_PRIORITY: Record<OfficialBidDocumentKind, number> = {
  BID: 1,
  CORRIGENDUM: 2,
  SPECIFICATION: 3,
  DRAWING: 4,
  ATC: 5,
  BOQ: 6,
  SLA: 7,
  OTHER: 8,
  GTC: 9,
};

function normalizeDocUrl(url: string): string {
  return url.trim().replace(/#.*$/, '');
}

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
   * document and the Original Bid PDF, followed by all buyer-attached
   * specifications, drawings, ATC, BOQ, SLA, and standard GTC links discovered
   * from the official tender record or PDF annotations.
   */
  public static getOfficialDocuments(bid: DeconstructedBidDoc): OfficialBidDocument[] {
    const mainUrl = this.resolvePdfUrl(bid.bidNumber, bid.docUrl);
    const isDirectRa = /showdirectradocumentPdf/i.test(mainUrl);
    const isRaDoc = isDirectRa || /showradocumentPdf/i.test(mainUrl) || Boolean(bid.isRa || bid.type === 'RA');

    const seenUrls = new Set<string>();
    const primaryDocs: OfficialBidDocument[] = [];

    if (this.isSafeGemUrl(mainUrl)) {
      seenUrls.add(normalizeDocUrl(mainUrl));
      primaryDocs.push({
        id: 'bid-document',
        label: isDirectRa ? 'Direct RA document' : isRaDoc ? 'RA document' : 'Bid document',
        subtitle: isRaDoc
          ? 'Reverse Auction schedule, auto-extension & exemptions'
          : 'Official GeM bid terms, delivery & consignees',
        kind: 'BID',
        fileFormat: 'PDF',
        url: mainUrl,
        source: 'PUBLIC_GEM_FEED',
      });
    }

    if (bid.parentBidId && bid.parentBidId !== bid.b_id) {
      const parentUrl = `https://bidplus.gem.gov.in/showbidDocument/${bid.parentBidId}`;
      const normParent = normalizeDocUrl(parentUrl);
      if (this.isSafeGemUrl(parentUrl) && !seenUrls.has(normParent)) {
        seenUrls.add(normParent);
        primaryDocs.push({
          id: 'parent-bid-document',
          label: bid.parentBidNumber ? `Original Bid (${bid.parentBidNumber})` : 'Original Bid PDF',
          subtitle: 'Full technical requirements, EMD, ePBG, consignees & ATC',
          kind: 'BID',
          fileFormat: 'PDF',
          url: parentUrl,
          source: 'PUBLIC_GEM_FEED',
        });
      }
    }

    const extraDocs: OfficialBidDocument[] = [];
    for (const related of bid.relatedDocuments ?? []) {
      if (!related?.id || !related.label || !this.isSafeGemUrl(related.url)) continue;
      const norm = normalizeDocUrl(related.url);
      if (seenUrls.has(norm)) continue;
      seenUrls.add(norm);
      extraDocs.push({
        ...related,
        fileFormat: related.fileFormat || this.inferFileFormat(related.url),
        source: related.source || 'PUBLIC_GEM_RECORD',
      });
    }

    extraDocs.sort(
      (a, b) => (KIND_SORT_PRIORITY[a.kind] ?? 8) - (KIND_SORT_PRIORITY[b.kind] ?? 8)
    );

    return [...primaryDocs, ...extraDocs];
  }

  /**
   * Infers file format from an official GeM attachment URL or query parameter.
   */
  public static inferFileFormat(url: string): 'PDF' | 'XLSX' | 'CSV' | 'IMAGE' | 'WEB' {
    const clean = url.toLowerCase();
    if (/\.xlsx?(?:$|[?#&])/i.test(clean) || /\/bidding\/excel\//i.test(clean)) return 'XLSX';
    if (/\.csv(?:$|[?#&])/i.test(clean) || /boqlineitemsdocument/i.test(clean)) return 'CSV';
    if (/\.(?:png|jpe?g|webp|gif)(?:$|[?#&])/i.test(clean)) return 'IMAGE';
    if (/\/bidsla\//i.test(clean)) return 'WEB';
    if (
      /\.pdf(?:$|[?#&])/i.test(clean) ||
      /show(?:bid|ra|directra)document/i.test(clean) ||
      /gtc\/pdfbydate/i.test(clean) ||
      /documentdownload/i.test(clean) ||
      /slafds/i.test(clean)
    ) {
      return 'PDF';
    }
    return 'WEB';
  }

  /**
   * Whitelist validation: strictly ensures document URL uses HTTPS and points
   * exclusively to an official verified *.gem.gov.in domain.
   */
  public static isSafeGemUrl(url: string): boolean {
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== 'https:') return false;
      const hostname = parsed.hostname.toLowerCase();
      return ALLOWED_GEM_HOSTS.has(hostname);
    } catch {
      return false;
    }
  }
}
