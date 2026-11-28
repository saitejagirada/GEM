/**
 * GeM Mobile Companion App - ATC Trap Extractor & Instant PDF Keyword Finder Card
 *
 * Surfaces buyer-added hidden risks (ISO/BIS/NABL, Local Service Center, Advance Sample,
 * Warranty & Penalty, Option Clause ±25%, Installation/Payment) + instant keyword search
 * directly over the locally scanned PDF text layer inside Bid & RA detail screens.
 */

import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ExtractedGeMTenderDetails } from '../services/GemPdfExtractor';
import {
  AtcTrapAnalyzer,
  PDF_QUICK_SEARCH_CHIPS,
} from '../services/AtcTrapAnalyzer';
import { useTheme } from '../theme/ThemeContext';

interface AtcTrapAndSearchCardProps {
  tenderDetails?: ExtractedGeMTenderDetails;
  searchableText?: string;
  isScanning?: boolean;
  onExplainAtc?: () => void;
}

export const AtcTrapAndSearchCard: React.FC<AtcTrapAndSearchCardProps> = ({
  tenderDetails,
  searchableText,
  isScanning,
  onExplainAtc,
}) => {
  const { colors, t } = useTheme();
  const [query, setQuery] = useState('');
  const [expandedAllTraps, setExpandedAllTraps] = useState(false);

  const report = useMemo(
    () => AtcTrapAnalyzer.analyze(tenderDetails, searchableText),
    [tenderDetails, searchableText]
  );

  const searchSource = useMemo(() => {
    if (searchableText && searchableText.trim().length > 0) return searchableText;
    return (tenderDetails?.atcClauses || []).join('\n');
  }, [searchableText, tenderDetails?.atcClauses]);

  const keywordMatches = useMemo(
    () => AtcTrapAnalyzer.searchPdfExcerpts(searchSource, query, 6),
    [searchSource, query]
  );

  if (isScanning && !report.hasSearchableText && report.traps.length === 0) {
    return null;
  }

  if (!report.hasSearchableText && report.traps.length === 0 && !searchSource) {
    return null;
  }

  const visibleTraps = expandedAllTraps ? report.traps : report.traps.slice(0, 4);

  return (
    <View style={styles.sectionBlock}>
      {/* Apple Inset-Grouped External Section Header */}
      <View style={styles.sectionEyebrowRow}>
        <View style={styles.eyebrowLeft}>
          <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
            {t('atcAndSearch').toUpperCase()}
          </Text>
          {onExplainAtc ? (
            <Pressable
              onPress={onExplainAtc}
              hitSlop={10}
              style={[styles.helpChip, { backgroundColor: colors.surfaceSubtle }]}
              accessibilityLabel="What is ATC?"
            >
              <Text style={[styles.helpChipText, { color: colors.primary }]}>?</Text>
            </Pressable>
          ) : null}
        </View>
        {report.traps.length > 0 ? (
          <Text
            style={[
              styles.eyebrowCount,
              {
                color: report.traps.some((x) => x.severity === 'HIGH')
                  ? colors.warning
                  : colors.primary,
              },
            ]}
          >
            {report.traps.length} Flag{report.traps.length === 1 ? '' : 's'}
          </Text>
        ) : null}
      </View>

      <View
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
      >
        {/* 1. Categorized ATC Risk Buckets — full-width titles, zero mid-word truncation */}
        {visibleTraps.length > 0 ? (
          <View style={styles.trapsList}>
            {visibleTraps.map((trap, idx) => {
              const bg =
                trap.severity === 'HIGH'
                  ? colors.dangerTint
                  : trap.severity === 'MEDIUM'
                    ? colors.warningTint
                    : colors.primaryTint;
              const fg =
                trap.severity === 'HIGH'
                  ? colors.danger
                  : trap.severity === 'MEDIUM'
                    ? colors.warning
                    : colors.primary;

              return (
                <View
                  key={trap.id}
                  style={[
                    styles.trapRow,
                    idx > 0 && {
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <View style={styles.trapEyebrowRow}>
                    <View style={[styles.trapPill, { backgroundColor: bg }]}>
                      <Text style={[styles.trapPillText, { color: fg }]}>{trap.badge}</Text>
                    </View>
                  </View>
                  <Text style={[styles.trapTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                    {trap.title}
                  </Text>
                  <Text style={[styles.trapExcerpt, { color: colors.textSecondary }]} numberOfLines={3}>
                    {trap.excerpt}
                  </Text>
                </View>
              );
            })}

            {report.traps.length > 4 ? (
              <Pressable
                onPress={() => setExpandedAllTraps((prev) => !prev)}
                style={[styles.toggleMoreBtn, { borderTopColor: colors.borderSubtle }]}
              >
                <Text style={[styles.toggleMoreText, { color: colors.primary }]}>
                  {expandedAllTraps
                    ? 'Show fewer ATC flags'
                    : `Show all ${report.traps.length} ATC flags ▾`}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* 2. Instant PDF Keyword Finder — Clean iOS Search Field */}
        <View
          style={[
            styles.searchSection,
            report.traps.length > 0 && {
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.borderSubtle,
            },
          ]}
        >
          <Text style={[styles.searchLabel, { color: colors.textMuted }]}>
            INSTANT PDF KEYWORD FINDER
          </Text>
          <View
            style={[
              styles.searchInputRow,
              { backgroundColor: colors.surfaceSubtle },
            ]}
          >
            <Text style={[styles.searchIcon, { color: colors.textMuted }]}>⌕</Text>
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              value={query}
              onChangeText={setQuery}
              placeholder="Find inside PDF (warranty, penalty, NABL…)"
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
            />
            {query.trim().length > 0 ? (
              <Pressable
                onPress={() => setQuery('')}
                style={styles.clearBtn}
                hitSlop={8}
                accessibilityLabel="Clear PDF search"
              >
                <Text style={[styles.clearBtnText, { color: colors.textMuted }]}>✕</Text>
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickChipsRow}
          >
            {PDF_QUICK_SEARCH_CHIPS.map((chip) => {
              const active = query.trim().toLowerCase() === chip.toLowerCase();
              return (
                <Pressable
                  key={chip}
                  onPress={() => setQuery(active ? '' : chip)}
                  style={[
                    styles.quickChip,
                    {
                      backgroundColor: active ? colors.primary : colors.surfaceSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      { color: active ? colors.textInverse : colors.textPrimary },
                    ]}
                  >
                    {chip}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {query.trim().length >= 2 ? (
            keywordMatches.length > 0 ? (
              <View style={styles.matchesWrap}>
                <Text style={[styles.matchCountText, { color: colors.primary }]}>
                  {keywordMatches.length} excerpt{keywordMatches.length === 1 ? '' : 's'} matching &quot;{query.trim()}&quot;
                </Text>
                {keywordMatches.map((m) => (
                  <View
                    key={m.id}
                    style={[
                      styles.excerptBox,
                      { backgroundColor: colors.surfaceSubtle, borderLeftColor: colors.primary },
                    ]}
                  >
                    <Text style={[styles.excerptText, { color: colors.textSecondary }]}>
                      {m.before}
                      <Text
                        style={[
                          styles.excerptHighlight,
                          { backgroundColor: colors.warningTint, color: colors.textPrimary },
                        ]}
                      >
                        {m.match}
                      </Text>
                      {m.after}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.noMatchText, { color: colors.textMuted }]}>
                No mention of &quot;{query.trim()}&quot; found in the extracted PDF text. Check linked
                buyer attachments for extra annexures.
              </Text>
            )
          ) : null}
        </View>
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
  eyebrowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionEyebrow: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  eyebrowCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  helpChip: {
    width: 19,
    height: 19,
    borderRadius: 9.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpChipText: { fontSize: 11, fontWeight: '700' },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  trapsList: {
    paddingHorizontal: 16,
  },
  trapRow: {
    paddingVertical: 14,
  },
  trapEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  trapPill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  trapPillText: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.3 },
  trapTitle: { fontSize: 14.5, fontWeight: '600', lineHeight: 20, marginBottom: 4 },
  trapExcerpt: { fontSize: 13, lineHeight: 19 },
  toggleMoreBtn: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 13,
    alignItems: 'center',
  },
  toggleMoreText: { fontSize: 13, fontWeight: '600' },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 9,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 42,
    gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 14,
  },
  clearBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: { fontSize: 14, fontWeight: '600' },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    paddingBottom: 2,
  },
  quickChip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  quickChipText: { fontSize: 12.5, fontWeight: '600' },
  matchesWrap: { marginTop: 12, gap: 8 },
  matchCountText: { fontSize: 12.5, fontWeight: '600' },
  excerptBox: {
    borderRadius: 8,
    borderLeftWidth: 2.5,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  excerptText: { fontSize: 12.5, lineHeight: 18.5 },
  excerptHighlight: { fontWeight: '700' },
  noMatchText: { fontSize: 12.5, lineHeight: 18, marginTop: 10 },
});
