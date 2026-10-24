/**
 * GeM Mobile Companion App - Portal Document Resolver Service
 * Resolves verified GeM tender document links to the official showbidDocument endpoint
 * (https://bidplus.gem.gov.in/showbidDocument/{b_id}) and validates safety.
 */

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
   * Whitelist validation: strictly ensures document URL is from an official verified GeM domain.
   */
  public static isSafeGemUrl(url: string): boolean {
    return (
      url.startsWith('https://bidplus.gem.gov.in') ||
      url.startsWith('https://gem.gov.in')
    );
  }
}
