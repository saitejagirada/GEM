/**
 * GeM Mobile Companion App - 1-Tap "Similar Concluded Bids" Card
 *
 * Queries GeM's public concluded bids archive (`bidrastatus`) directly from the phone
 * only when tapped, giving sellers recent closed comparable bids + a direct official
 * link to gem.gov.in/view_contracts for awarded L1 prices.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { DeconstructedBidDoc } from '../types/index';
import {
  SimilarBidsService,
  type SimilarBidsLookupResult,
} from '../services/SimilarBidsService';
import { PortalDocService } from '../services/PortalDocService';
import { useTheme } from '../theme/ThemeContext';
import { formatDateSafe } from '../utils/formatters';

interface SimilarConcludedBidsCardProps {
  bid: DeconstructedBidDoc;
}

export const SimilarConcludedBidsCard: React.FC<SimilarConcludedBidsCardProps> = ({ bid }) => {
  const { colors, t } = useTheme();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimilarBidsLookupResult | null>(null);

  const primaryLabel = useMemo(() => {
    const exact = SimilarBidsService.buildExactCategoryCandidates(bid)[0];
    return exact || SimilarBidsService.buildSearchKeyword(bid);
  }, [bid]);

  useEffect(() => {
    setResult(null);
  }, [bid.bidNumber]);

  const handleLoadSimilar = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await SimilarBidsService.findSimilarConcludedBids(bid);
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  const openContractArchive = () => {
    Linking.openURL(SimilarBidsService.contractsPortalUrl).catch(() => undefined);
  };

  const openConcludedPdf = (item: DeconstructedBidDoc) => {
    if (item.docUrl && PortalDocService.isSafeGemUrl(item.docUrl)) {
      Linking.openURL(item.docUrl).catch(() => undefined);
    }
  };

  return (
    <View style={styles.sectionBlock}>
      {/* Apple Inset-Grouped External Section Header */}
      <View style={styles.sectionEyebrowRow}>
        <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
          {t('similarConcludedBids').toUpperCase()}
        </Text>
        {result && !loading ? (
          <Pressable
            onPress={handleLoadSimilar}
            hitSlop={10}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <Text style={[styles.refreshText, { color: colors.primary }]}>Refresh ↻</Text>
          </Pressable>
        ) : null}
      </View>

      <View
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
      >
        <View style={styles.cardBody}>
          {primaryLabel ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>
              Category benchmark for &ldquo;{primaryLabel}&rdquo;
            </Text>
          ) : null}

          {!result && !loading ? (
            <Pressable
              onPress={handleLoadSimilar}
              disabled={!primaryLabel}
              style={({ pressed }) => [
                styles.fetchBtn,
                {
                  backgroundColor: colors.primaryTint,
                  opacity: pressed ? 0.78 : 1,
                },
              ]}
            >
              <Text style={[styles.fetchBtnText, { color: colors.primary }]}>
                Find Similar Concluded Bids on GeM ›
              </Text>
            </Pressable>
          ) : null}

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Querying bidplus.gem.gov.in concluded archive…
              </Text>
            </View>
          ) : null}

          {result && !loading ? (
            result.bids.length > 0 ? (
              <View style={styles.resultsWrap}>
                <Text style={[styles.foundMeta, { color: colors.success }]}>
                  {result.matchMode === 'exact'
                    ? `Showing ${Math.min(result.bids.length, 5)} of ${result.totalFound.toLocaleString('en-IN')} exact concluded matches`
                    : `Found ${result.bids.length} relevant concluded tender${result.bids.length === 1 ? '' : 's'} for "${result.queryUsed}"`}
                </Text>
                {result.bids.slice(0, 5).map((item, idx) => (
                  <Pressable
                    key={item.bidNumber}
                    onPress={() => openConcludedPdf(item)}
                    style={({ pressed }) => [
                      styles.bidRow,
                      idx > 0 && {
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: colors.borderSubtle,
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={styles.bidTopRow}>
                        <Text style={[styles.bidNum, { color: colors.primary }]}>
                          {item.bidNumber}
                        </Text>
                        <Text style={[styles.closedTag, { color: colors.textMuted }]}>
                          Ended {formatDateSafe(item.closingTimeUtc)}
                        </Text>
                      </View>
                      <Text
                        style={[styles.bidTitle, { color: colors.textPrimary }]}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={[styles.bidDept, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {item.department}
                        {item.boqItems?.[0]?.quantity
                          ? ` · Qty ${item.boqItems[0].quantity.toLocaleString('en-IN')}`
                          : ''}
                      </Text>
                    </View>
                    <Text style={[styles.pdfCue, { color: colors.primary }]}>PDF ›</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={[styles.emptyBox, { backgroundColor: colors.surfaceSubtle }]}>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  {result.error ? 'Could not reach GeM archive' : 'No similar concluded bids found'}
                </Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {result.error
                    ? 'GeM concluded archive did not respond. Tap Refresh to retry.'
                    : 'No relevant concluded tenders matched this item on GeM. Check awarded L1 contracts below.'}
                </Text>
              </View>
            )
          ) : null}
        </View>

        <Pressable
          onPress={openContractArchive}
          style={({ pressed }) => [
            styles.contractsRow,
            { borderTopColor: colors.borderSubtle, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.contractsTitle, { color: colors.textPrimary }]}>
              Check Awarded L1 Prices on GeM Contracts
            </Text>
            <Text style={[styles.contractsSub, { color: colors.textSecondary }]}>
              Opens gem.gov.in/view_contracts (CAPTCHA archive)
            </Text>
          </View>
          <Text style={[styles.contractsCue, { color: colors.primary }]}>Open ↗</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionBlock: {
    marginTop: 20,
  },
  sectionEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
    gap: 8,
  },
  sectionEyebrow: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  refreshText: { fontSize: 12.5, fontWeight: '600' },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  subtitle: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  fetchBtn: {
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  fetchBtnText: { fontSize: 13.5, fontWeight: '600' },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  loadingText: { fontSize: 13 },
  resultsWrap: { marginTop: 2 },
  foundMeta: { fontSize: 12.5, fontWeight: '600', marginBottom: 6 },
  bidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  bidTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 3,
  },
  bidNum: { fontSize: 12.5, fontWeight: '600', fontVariant: ['tabular-nums'] },
  closedTag: { fontSize: 11.5, fontVariant: ['tabular-nums'] },
  bidTitle: { fontSize: 14, fontWeight: '600', lineHeight: 19 },
  bidDept: { fontSize: 12.5, marginTop: 2 },
  pdfCue: { fontSize: 13, fontWeight: '600' },
  emptyBox: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  emptyTitle: { fontSize: 13.5, fontWeight: '600', marginBottom: 3 },
  emptyText: { fontSize: 12.5, lineHeight: 18 },
  contractsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 54,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  contractsTitle: { fontSize: 14, fontWeight: '600' },
  contractsSub: { fontSize: 12, marginTop: 2 },
  contractsCue: { fontSize: 13, fontWeight: '600' },
});
