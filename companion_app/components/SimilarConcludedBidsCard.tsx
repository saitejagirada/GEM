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
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('similarConcludedBids')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {primaryLabel
              ? `Exact category match for "${primaryLabel}"`
              : 'Compare against recently closed GeM tenders'}
          </Text>
        </View>
        {result && !loading ? (
          <Pressable
            onPress={handleLoadSimilar}
            hitSlop={8}
            style={[styles.refreshChip, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}
          >
            <Text style={[styles.refreshText, { color: colors.primary }]}>Refresh ↻</Text>
          </Pressable>
        ) : null}
      </View>

      {!result && !loading ? (
        <Pressable
          onPress={handleLoadSimilar}
          disabled={!primaryLabel}
          style={({ pressed }) => [
            styles.fetchBtn,
            {
              backgroundColor: colors.primaryTint,
              borderColor: colors.primary,
              opacity: pressed ? 0.8 : 1,
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
                  pressed && { opacity: 0.75 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.bidTopRow}>
                    <Text style={[styles.bidNum, { color: colors.primary }]}>{item.bidNumber}</Text>
                    <Text style={[styles.closedTag, { color: colors.textMuted }]}>
                      Ended {formatDateSafe(item.closingTimeUtc)}
                    </Text>
                  </View>
                  <Text style={[styles.bidTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={[styles.bidDept, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.department}
                    {item.boqItems?.[0]?.quantity
                      ? ` · Qty ${item.boqItems[0].quantity.toLocaleString('en-IN')}`
                      : ''}
                  </Text>
                </View>
                <Text style={[styles.pdfCue, { color: colors.primary }]}>PDF ↗</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View
            style={[
              styles.emptyBox,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {result.error ? 'Could not reach GeM archive' : 'Cannot find any similar concluded bids'}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {result.error
                ? 'GeM concluded archive did not respond. Tap Refresh to retry.'
                : 'No relevant concluded tenders matched this item on GeM. You can still check awarded L1 contracts below.'}
            </Text>
          </View>
        )
      ) : null}

      <Pressable
        onPress={openContractArchive}
        style={({ pressed }) => [
          styles.contractsRow,
          { borderTopColor: colors.borderSubtle, opacity: pressed ? 0.75 : 1 },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.contractsTitle, { color: colors.textPrimary }]}>
            Check Awarded L1 Prices on GeM Contracts
          </Text>
          <Text style={[styles.contractsSub, { color: colors.textSecondary }]}>
            Opens official gem.gov.in/view_contracts (CAPTCHA-protected archive)
          </Text>
        </View>
        <Text style={[styles.contractsCue, { color: colors.primary }]}>Open ↗</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  title: { fontSize: 15, fontWeight: '800' },
  subtitle: { fontSize: 11.5, marginTop: 2 },
  refreshChip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  refreshText: { fontSize: 11, fontWeight: '800' },
  fetchBtn: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  fetchBtnText: { fontSize: 12.5, fontWeight: '800' },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 10,
  },
  loadingText: { fontSize: 12 },
  resultsWrap: { marginTop: 2 },
  foundMeta: { fontSize: 11.5, fontWeight: '700', marginBottom: 6 },
  bidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
  },
  bidTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  bidNum: { fontSize: 11.5, fontWeight: '800' },
  closedTag: { fontSize: 10 },
  bidTitle: { fontSize: 12.5, fontWeight: '700', lineHeight: 17 },
  bidDept: { fontSize: 11, marginTop: 2 },
  pdfCue: { fontSize: 11.5, fontWeight: '800' },
  emptyBox: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  emptyTitle: { fontSize: 12.5, fontWeight: '800', marginBottom: 3 },
  emptyText: { fontSize: 11.5, lineHeight: 16 },
  contractsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  contractsTitle: { fontSize: 12.5, fontWeight: '800' },
  contractsSub: { fontSize: 11, marginTop: 1 },
  contractsCue: { fontSize: 12, fontWeight: '800' },
});
