/**
 * GeM Mobile Companion App - ATC Trap Extractor & In-Tender PDF Keyword Finder
 *
 * Categorizes Buyer Added ATC clauses and full scanned PDF text into 6 actionable
 * risk buckets so MSME sellers spot hidden traps (ISO/BIS/NABL, Local Service Center,
 * Advance Sample, Warranty/Penalty, ±25% Option Clause, Payment/Installation) in seconds
 * without reading 20 dense pages, and supports instant keyword snippet search inside the PDF.
 */

import type { ExtractedGeMTenderDetails } from './GemPdfExtractor.ts';

export type AtcTrapCategory =
  | 'CERTIFICATES'
  | 'LOCAL_PRESENCE'
  | 'SAMPLE_DEMO'
  | 'WARRANTY_PENALTY'
  | 'OPTION_CLAUSE'
  | 'PAYMENT_DELIVERY';

export type AtcTrapSeverity = 'HIGH' | 'MEDIUM' | 'INFO';

export interface AtcTrapFinding {
  id: string;
  category: AtcTrapCategory;
  badge: string;
  title: string;
  severity: AtcTrapSeverity;
  excerpt: string;
  matchedTerms: string[];
}

export interface PdfKeywordMatch {
  id: string;
  index: number;
  snippet: string;
  before: string;
  match: string;
  after: string;
}

export interface AtcAnalysisReport {
  traps: AtcTrapFinding[];
  totalClausesAnalyzed: number;
  hasSearchableText: boolean;
}

export const PDF_QUICK_SEARCH_CHIPS: readonly string[] = [
  'Warranty',
  'Sample',
  'Penalty',
  'ISO',
  'Service',
  'Option',
  'NABL',
  'Installation',
];

interface TrapRule {
  category: AtcTrapCategory;
  badge: string;
  title: string;
  severity: AtcTrapSeverity;
  pattern: RegExp;
}

const TRAP_RULES: readonly TrapRule[] = [
  {
    category: 'CERTIFICATES',
    badge: 'CERTS / LAB',
    title: 'Mandatory Certifications / Test Reports',
    severity: 'HIGH',
    pattern:
      /\b(?:ISO\s*9001|ISO\s*14001|ISO\s*27001|ISO\s*13485|BIS\s*(?:license|licence|certif|mark)?|ISI\s*mark|NABL\s*(?:accredited|lab|test|report)|test\s*report|FSSAI|CE\s*certified|RoHS|BEE\s*star|CDSCO|STQC|CERT-In)\b/gi,
  },
  {
    category: 'LOCAL_PRESENCE',
    badge: 'LOCAL OFFICE',
    title: 'Service Center / Local Office Requirement',
    severity: 'HIGH',
    pattern:
      /\b(?:dedicated\s*(?:\/|or)?\s*toll[\s-]*free|functional\s*service\s*cent(?:er|re)|service\s*cent(?:er|re)\s*(?:in|within|at)|local\s*office|registered\s*office\s*in|escalation\s*matrix|onsite\s*support\s*office)\b/gi,
  },
  {
    category: 'SAMPLE_DEMO',
    badge: 'SAMPLE / DEMO',
    title: 'Advance Sample, Demo or Pre-Dispatch Inspection',
    severity: 'HIGH',
    pattern:
      /\b(?:advance\s*sample|sample\s*(?:approval|submission|evaluation|testing)|pre[\s-]*dispatch\s*inspection|PDI\b|live\s*demonstration|product\s*demo|third[\s-]*party\s*inspection|TPI\b)\b/gi,
  },
  {
    category: 'WARRANTY_PENALTY',
    badge: 'WARRANTY / LD',
    title: 'Warranty, AMC & Liquidated Damages / Penalty',
    severity: 'MEDIUM',
    pattern:
      /\b(?:comprehensive\s*(?:onsite\s*)?warranty|warranty\s*(?:period|of)?\s*\d+|liquidated\s*damages|LD\s*clause|penalty\s*(?:of|@|clause|shall)|SLA\s*(?:penalty|deduction)|uptime\s*(?:of|>=)?\s*9[0-9]|AMC\b|CMC\b)\b/gi,
  },
  {
    category: 'OPTION_CLAUSE',
    badge: 'OPTION ±25%',
    title: 'Quantity Variation / Option Clause',
    severity: 'MEDIUM',
    pattern:
      /\b(?:option\s*clause|increase\s*or\s*decrease\s*(?:the\s*)?quantity|up\s*to\s*25\s*%|±\s*25\s*%|repeat\s*order|quantity\s*variation)\b/gi,
  },
  {
    category: 'PAYMENT_DELIVERY',
    badge: 'DELIVERY / PAY',
    title: 'Installation, Commissioning or Staggered Terms',
    severity: 'INFO',
    pattern:
      /\b(?:installation\s*(?:and|&)\s*commissioning|staggered\s*delivery|turnkey|unloading\s*(?:and|&)\s*stacking|buy[\s-]*back|payment\s*(?:milestone|terms|after\s*installation))\b/gi,
  },
];

function buildReadableExcerpt(source: string, matchStart: number, matchLen: number): string {
  const clean = source.replace(/\s+/g, ' ');
  const start = Math.max(0, matchStart - 75);
  const end = Math.min(clean.length, matchStart + matchLen + 135);
  let excerpt = clean.slice(start, end).trim();
  if (start > 0) excerpt = '…' + excerpt;
  if (end < clean.length) excerpt = excerpt + '…';
  return excerpt;
}

export class AtcTrapAnalyzer {
  /**
   * Scans extracted ATC clauses + full searchable PDF text and returns deduplicated,
   * prioritized trap findings grouped by GeM procurement risk category.
   */
  public static analyze(
    details?: ExtractedGeMTenderDetails | null,
    searchableText?: string
  ): AtcAnalysisReport {
    const clauses = Array.isArray(details?.atcClauses) ? details!.atcClauses : [];
    const reqDocs = Array.isArray(details?.requiredDocuments) ? details!.requiredDocuments : [];
    const combinedText = [
      searchableText || '',
      clauses.join('\n'),
      reqDocs.join('\n'),
    ]
      .filter(Boolean)
      .join('\n')
      .replace(/\s+/g, ' ')
      .trim();

    if (!combinedText) {
      return {
        traps: [],
        totalClausesAnalyzed: clauses.length,
        hasSearchableText: false,
      };
    }

    const findings: AtcTrapFinding[] = [];

    for (const rule of TRAP_RULES) {
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      const matches: Array<{ text: string; index: number }> = [];
      let m: RegExpExecArray | null;
      while ((m = regex.exec(combinedText)) !== null) {
        matches.push({ text: m[0].trim(), index: m.index });
        if (matches.length >= 12) break;
      }

      if (matches.length === 0) continue;

      const uniqueTerms = Array.from(
        new Set(matches.map((item) => item.text.replace(/\s+/g, ' ')))
      ).slice(0, 4);

      // Prefer a matching ATC clause sentence when available; else use snippet around first match
      const matchingClause = clauses.find((c) => new RegExp(rule.pattern.source, 'i').test(c));
      const excerpt = matchingClause
        ? matchingClause.trim().slice(0, 220)
        : buildReadableExcerpt(combinedText, matches[0].index, matches[0].text.length);

      findings.push({
        id: `trap-${rule.category.toLowerCase()}`,
        category: rule.category,
        badge: rule.badge,
        title: rule.title,
        severity: rule.severity,
        excerpt,
        matchedTerms: uniqueTerms,
      });
    }

    const severityRank: Record<AtcTrapSeverity, number> = { HIGH: 0, MEDIUM: 1, INFO: 2 };
    findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

    return {
      traps: findings,
      totalClausesAnalyzed: clauses.length,
      hasSearchableText: Boolean(searchableText && searchableText.trim().length > 20),
    };
  }

  /**
   * Case-insensitive substring finder over locally extracted PDF text.
   * Returns up to `maxMatches` contextual excerpts split cleanly into before/match/after
   * so React Native UI can highlight the exact matched term without regex injection risks.
   */
  public static searchPdfExcerpts(
    searchableText: string | undefined,
    query: string,
    maxMatches = 8
  ): PdfKeywordMatch[] {
    const cleanQuery = query.trim();
    if (!searchableText || cleanQuery.length < 2) return [];

    const normalized = searchableText.replace(/\s+/g, ' ').trim();
    const lowerText = normalized.toLowerCase();
    const lowerQuery = cleanQuery.toLowerCase();

    const results: PdfKeywordMatch[] = [];
    let cursor = 0;

    while (results.length < maxMatches) {
      const hitIdx = lowerText.indexOf(lowerQuery, cursor);
      if (hitIdx === -1) break;

      const winStart = Math.max(0, hitIdx - 70);
      const winEnd = Math.min(normalized.length, hitIdx + cleanQuery.length + 110);

      const prefixEllipsis = winStart > 0 ? '…' : '';
      const suffixEllipsis = winEnd < normalized.length ? '…' : '';

      const before = prefixEllipsis + normalized.slice(winStart, hitIdx);
      const match = normalized.slice(hitIdx, hitIdx + cleanQuery.length);
      const after = normalized.slice(hitIdx + cleanQuery.length, winEnd) + suffixEllipsis;

      results.push({
        id: `match-${hitIdx}`,
        index: hitIdx,
        snippet: before + match + after,
        before,
        match,
        after,
      });

      // Advance past overlapping window so results show distinct sections of the PDF
      cursor = Math.max(hitIdx + cleanQuery.length, hitIdx + 90);
    }

    return results;
  }
}
