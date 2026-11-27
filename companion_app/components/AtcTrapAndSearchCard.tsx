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
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('atcAndSearch')}</Text>
            {onExplainAtc ? (
              <Pressable
                onPress={onExplainAtc}
                hitSlop={8}
                style={[styles.helpChip, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}
                accessibilityLabel="What is ATC?"
              >
                <Text style={[styles.helpChipText, { color: colors.primary }]}>?</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {report.traps.length > 0
              ? `${report.traps.length} hidden clause pattern${report.traps.length === 1 ? '' : 's'} detected in PDF`
              : 'Search any keyword inside the locally extracted tender PDF'}
          </Text>
        </View>
        {report.traps.length > 0 ? (
          <View
            style={[
              styles.countBadge,
              {
                backgroundColor: report.traps.some((x) => x.severity === 'HIGH')
                  ? colors.warningTint
                  : colors.primaryTint,
              },
            ]}
          >
            <Text
              style={[
                styles.countBadgeText,
                {
                  color: report.traps.some((x) => x.severity === 'HIGH')
                    ? colors.warning
                    : colors.primary,
                },
              ]}
            >
              {report.traps.length} Flag{report.traps.length === 1 ? '' : 's'}
            </Text>
          </View>
        ) : null}
      </View>

      {/* 1. Categorized ATC Risk Buckets */}
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
                <View style={styles.trapTopRow}>
                  <View style={[styles.trapPill, { backgroundColor: bg }]}>
                    <Text style={[styles.trapPillText, { color: fg }]}>{trap.badge}</Text>
                  </View>
                  <Text style={[styles.trapTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {trap.title}
                  </Text>
                </View>
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

      {/* 2. Instant PDF Keyword Finder */}
      <View
        style={[
          styles.searchSection,
          report.traps.length > 0 && {
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.borderSubtle,
            paddingTop: 12,
            marginTop: 6,
          },
        ]}
      >
        <Text style={[styles.searchLabel, { color: colors.textMuted }]}>
          INSTANT PDF KEYWORD FINDER
        </Text>
        <View style={styles.searchInputRow}>
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.borderSubtle,
                color: colors.textPrimary,
              },
            ]}
            value={query}
            onChangeText={setQuery}
            placeholder="Find inside PDF (e.g. warranty, penalty, NABL)"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
          />
          {query.trim().length > 0 ? (
            <Pressable
              onPress={() => setQuery('')}
              style={[styles.clearBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}
              hitSlop={6}
            >
              <Text style={[styles.clearBtnText, { color: colors.textSecondary }]}>✕</Text>
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
                    borderColor: active ? colors.primary : colors.borderSubtle,
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
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
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
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: { fontSize: 15, fontWeight: '800' },
  helpChip: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpChipText: { fontSize: 11.5, fontWeight: '900' },
  subtitle: { fontSize: 11.5, marginTop: 2 },
  countBadge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  countBadgeText: { fontSize: 10.5, fontWeight: '800' },
  trapsList: { marginTop: 2 },
  trapRow: { paddingVertical: 9 },
  trapTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  trapPill: {
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  trapPillText: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.3 },
  trapTitle: { fontSize: 12.5, fontWeight: '800', flex: 1 },
  trapExcerpt: { fontSize: 11.5, lineHeight: 16.5 },
  toggleMoreBtn: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 9,
    marginTop: 2,
    alignItems: 'center',
  },
  toggleMoreText: { fontSize: 12, fontWeight: '800' },
  searchSection: {},
  searchLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 7,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
    minHeight: 42,
    fontSize: 13,
  },
  clearBtn: {
    width: 38,
    height: 42,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: { fontSize: 14, fontWeight: '800' },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 7,
    paddingTop: 8,
    paddingBottom: 4,
  },
  quickChip: {
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  quickChipText: { fontSize: 11.5, fontWeight: '700' },
  matchesWrap: { marginTop: 8, gap: 7 },
  matchCountText: { fontSize: 11.5, fontWeight: '800' },
  excerptBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 9,
  },
  excerptText: { fontSize: 11.5, lineHeight: 17 },
  excerptHighlight: { fontWeight: '900' },
  noMatchText: { fontSize: 11.5, lineHeight: 16.5, marginTop: 8 },
});
