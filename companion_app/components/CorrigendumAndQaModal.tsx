/**
 * GeM Mobile Companion App - Live Corrigendum & Pre-Bid Q&A Viewer Modal
 *
 * Fetches and renders official public amendments (`viewCorrigendum/<bidId>`) and
 * published vendor queries + buyer replies (`publish-representations/<bidId>`)
 * directly from bidplus.gem.gov.in without leaving the app.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CorrigendumViewerService,
  type CorrigendumEntry,
  type CorrigendumResult,
  type RepresentationResult,
} from '../services/CorrigendumViewerService';
import { PortalDocService } from '../services/PortalDocService';
import { useTheme } from '../theme/ThemeContext';

export type CorrigendumModalTab = 'CORRIGENDA' | 'QA';

interface CorrigendumAndQaModalProps {
  visible: boolean;
  bidNumber: string;
  corrigendumBidId?: string;
  representationBidId?: string;
  hasCorrigendum: boolean;
  hasRepresentation: boolean;
  initialTab?: CorrigendumModalTab;
  onClose: () => void;
}

export const CorrigendumAndQaModal: React.FC<CorrigendumAndQaModalProps> = ({
  visible,
  bidNumber,
  corrigendumBidId,
  representationBidId,
  hasCorrigendum,
  hasRepresentation,
  initialTab = 'CORRIGENDA',
  onClose,
}) => {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<CorrigendumModalTab>(initialTab);
  const [loadingCorr, setLoadingCorr] = useState(false);
  const [loadingRep, setLoadingRep] = useState(false);
  const [corrResult, setCorrResult] = useState<CorrigendumResult | null>(null);
  const [repResult, setRepResult] = useState<RepresentationResult | null>(null);
  const [qaQuery, setQaQuery] = useState('');
  const [expandedTc, setExpandedTc] = useState<Record<string, string>>({});
  const [loadingTcId, setLoadingTcId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const defaultTab: CorrigendumModalTab =
      initialTab === 'QA' && hasRepresentation
        ? 'QA'
        : hasCorrigendum
          ? 'CORRIGENDA'
          : hasRepresentation
            ? 'QA'
            : initialTab;
    setActiveTab(defaultTab);
    setQaQuery('');
    setExpandedTc({});
    setLoadingTcId(null);
  }, [visible, initialTab, hasCorrigendum, hasRepresentation, bidNumber]);

  const loadCorrigenda = async (force = false) => {
    if (!corrigendumBidId) return;
    setLoadingCorr(true);
    try {
      const res = await CorrigendumViewerService.loadCorrigenda(corrigendumBidId, force);
      setCorrResult(res);
    } finally {
      setLoadingCorr(false);
    }
  };

  const loadRepresentations = async (force = false) => {
    if (!representationBidId) return;
    setLoadingRep(true);
    try {
      const res = await CorrigendumViewerService.loadRepresentations(representationBidId, force);
      setRepResult(res);
    } finally {
      setLoadingRep(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    if (hasCorrigendum && corrigendumBidId) {
      void loadCorrigenda(false);
    } else {
      setCorrResult({ bidId: corrigendumBidId || '', entries: [] });
    }
    if (hasRepresentation && representationBidId) {
      void loadRepresentations(false);
    } else {
      setRepResult({ bidId: representationBidId || '', entries: [] });
    }
  }, [visible, corrigendumBidId, representationBidId, hasCorrigendum, hasRepresentation]);

  const filteredQa = useMemo(() => {
    const list = repResult?.entries || [];
    const q = qaQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (item) =>
        item.section.toLowerCase().includes(q) ||
        item.query.toLowerCase().includes(q) ||
        item.reply.toLowerCase().includes(q)
    );
  }, [repResult, qaQuery]);

  const openCorrigendumPdf = (url?: string) => {
    if (!url || !PortalDocService.isSafeGemUrl(url)) {
      Alert.alert('Security Notice', 'Corrigendum link is not from a verified official GeM domain.');
      return;
    }
    Linking.openURL(url).catch(() => {
      Alert.alert('Unable to open PDF', 'Please open the tender on bidplus.gem.gov.in.');
    });
  };

  const handleReadTcAmendment = async (entry: CorrigendumEntry) => {
    if (!entry.tcAmendmentId || loadingTcId) return;
    if (expandedTc[entry.tcAmendmentId] !== undefined) {
      setExpandedTc((prev) => {
        const next = { ...prev };
        delete next[entry.tcAmendmentId!];
        return next;
      });
      return;
    }
    setLoadingTcId(entry.tcAmendmentId);
    try {
      const text = await CorrigendumViewerService.loadTcAmendmentText(entry.tcAmendmentId);
      setExpandedTc((prev) => ({
        ...prev,
        [entry.tcAmendmentId!]: text || 'No inline amendment text returned by GeM.',
      }));
    } catch {
      Alert.alert('Unable to load clause', 'Could not fetch this amendment clause from GeM right now.');
    } finally {
      setLoadingTcId(null);
    }
  };

  const getKindBadge = (kind: CorrigendumEntry['kind']) => {
    switch (kind) {
      case 'DATE_EXTENSION':
        return { label: 'DATE EXTENDED', bg: colors.warningTint, fg: colors.warning };
      case 'PDF_AMENDMENT':
        return { label: 'CORRIGENDUM PDF', bg: colors.primaryTint, fg: colors.primary };
      case 'TC_AMENDMENT':
        return { label: 'T&C / ATC UPDATED', bg: colors.dangerTint, fg: colors.danger };
      default:
        return { label: 'AMENDMENT', bg: colors.surfaceSubtle, fg: colors.textSecondary };
    }
  };

  const corrCount = corrResult?.entries.length ?? 0;
  const qaCount = repResult?.entries.length ?? 0;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeRoot, { backgroundColor: colors.surface }]}>
        <View style={[styles.root, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View
            style={[
              styles.header,
              { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle },
            ]}
          >
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={[
                styles.closeBtn,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
              ]}
              accessibilityLabel="Close corrigendum viewer"
            >
              <Text style={[styles.closeBtnText, { color: colors.textPrimary }]}>←</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                Corrigenda &amp; Pre-Bid Q&amp;A
              </Text>
              <Text style={[styles.headerSub, { color: colors.textSecondary }]} numberOfLines={1}>
                {bidNumber} · Live from bidplus.gem.gov.in
              </Text>
            </View>
            <Pressable
              onPress={() =>
                activeTab === 'CORRIGENDA'
                  ? void loadCorrigenda(true)
                  : void loadRepresentations(true)
              }
              hitSlop={8}
              style={[
                styles.refreshBtn,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
              ]}
            >
              <Text style={[styles.refreshBtnText, { color: colors.primary }]}>Refresh ↻</Text>
            </Pressable>
          </View>

          {/* 2-Tab Bar */}
          <View
            style={[
              styles.tabRow,
              { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle },
            ]}
          >
            <Pressable
              onPress={() => setActiveTab('CORRIGENDA')}
              style={[
                styles.tabBtn,
                {
                  backgroundColor:
                    activeTab === 'CORRIGENDA' ? colors.primary : colors.surfaceSubtle,
                  borderColor:
                    activeTab === 'CORRIGENDA' ? colors.primary : colors.borderSubtle,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === 'CORRIGENDA' ? colors.textInverse : colors.textSecondary },
                ]}
              >
                Corrigenda{corrCount > 0 ? ` (${corrCount})` : ''}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('QA')}
              style={[
                styles.tabBtn,
                {
                  backgroundColor: activeTab === 'QA' ? colors.primary : colors.surfaceSubtle,
                  borderColor: activeTab === 'QA' ? colors.primary : colors.borderSubtle,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === 'QA' ? colors.textInverse : colors.textSecondary },
                ]}
              >
                Pre-Bid Q&amp;A{qaCount > 0 ? ` (${qaCount})` : ''}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'CORRIGENDA' ? (
              loadingCorr ? (
                <View style={styles.centerState}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.stateText, { color: colors.textSecondary }]}>
                    Loading official corrigenda from bidplus.gem.gov.in…
                  </Text>
                </View>
              ) : corrResult?.error ? (
                <View
                  style={[
                    styles.emptyCard,
                    { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                  ]}
                >
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    Could not load corrigenda
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    {corrResult.error}
                  </Text>
                </View>
              ) : corrCount === 0 ? (
                <View
                  style={[
                    styles.emptyCard,
                    { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                  ]}
                >
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    No corrigenda published
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    The buyer has not published any date extensions or corrigendum PDFs for this tender yet.
                  </Text>
                </View>
              ) : (
                <>
                  {corrResult!.entries.map((entry, idx) => {
                    const badge = getKindBadge(entry.kind);
                    const tcText = entry.tcAmendmentId ? expandedTc[entry.tcAmendmentId] : undefined;
                    const isLoadingThisTc = Boolean(
                      entry.tcAmendmentId && loadingTcId === entry.tcAmendmentId
                    );
                    return (
                      <View
                        key={`${entry.id}-${idx}`}
                        style={[
                          styles.entryCard,
                          { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                        ]}
                      >
                        <View style={styles.entryTopRow}>
                          <View style={[styles.kindBadge, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.kindBadgeText, { color: badge.fg }]}>
                              {badge.label}
                            </Text>
                          </View>
                          {entry.modifiedOn ? (
                            <Text style={[styles.modifiedText, { color: colors.textMuted }]}>
                              {entry.modifiedOn}
                            </Text>
                          ) : null}
                        </View>

                        {entry.kind === 'DATE_EXTENSION' ? (
                          <View style={styles.dateGrid}>
                            <View
                              style={[
                                styles.datePill,
                                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                              ]}
                            >
                              <Text style={[styles.datePillLabel, { color: colors.textMuted }]}>
                                EXTENDED CLOSING
                              </Text>
                              <Text style={[styles.datePillVal, { color: colors.warning }]}>
                                {entry.extendedTo}
                              </Text>
                            </View>
                            {entry.bidOpeningDate ? (
                              <View
                                style={[
                                  styles.datePill,
                                  {
                                    backgroundColor: colors.surfaceSubtle,
                                    borderColor: colors.borderSubtle,
                                  },
                                ]}
                              >
                                <Text style={[styles.datePillLabel, { color: colors.textMuted }]}>
                                  BID OPENING DATE
                                </Text>
                                <Text style={[styles.datePillVal, { color: colors.primary }]}>
                                  {entry.bidOpeningDate}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        ) : (
                          <Text style={[styles.entrySummary, { color: colors.textPrimary }]}>
                            {entry.summary}
                          </Text>
                        )}

                        {entry.pdfUrl ? (
                          <Pressable
                            onPress={() => openCorrigendumPdf(entry.pdfUrl)}
                            style={({ pressed }) => [
                              styles.actionBtn,
                              {
                                backgroundColor: colors.primaryTint,
                                borderColor: colors.primary,
                                opacity: pressed ? 0.8 : 1,
                              },
                            ]}
                          >
                            <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                              Open Corrigendum PDF ↗
                            </Text>
                          </Pressable>
                        ) : null}

                        {entry.tcAmendmentId ? (
                          <>
                            <Pressable
                              onPress={() => void handleReadTcAmendment(entry)}
                              style={({ pressed }) => [
                                styles.actionBtn,
                                {
                                  backgroundColor: colors.surfaceSubtle,
                                  borderColor: colors.border,
                                  opacity: pressed ? 0.8 : 1,
                                },
                              ]}
                            >
                              {isLoadingThisTc ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                              ) : (
                                <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                                  {tcText !== undefined
                                    ? 'Hide Amended Clause'
                                    : 'Read Amended Clause ›'}
                                </Text>
                              )}
                            </Pressable>
                            {tcText !== undefined ? (
                              <View
                                style={[
                                  styles.tcExpandedBox,
                                  {
                                    backgroundColor: colors.surfaceSubtle,
                                    borderColor: colors.borderSubtle,
                                  },
                                ]}
                              >
                                <Text style={[styles.tcExpandedText, { color: colors.textPrimary }]}>
                                  {tcText}
                                </Text>
                              </View>
                            ) : null}
                          </>
                        ) : null}
                      </View>
                    );
                  })}

                  <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
                    Official notice: Corrigenda are published directly by the Buyer Organization on
                    bidplus.gem.gov.in. Always review amended PDFs before submitting your quote.
                  </Text>
                </>
              )
            ) : loadingRep ? (
              <View style={styles.centerState}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.stateText, { color: colors.textSecondary }]}>
                  Loading pre-bid queries &amp; official buyer replies…
                </Text>
              </View>
            ) : repResult?.error ? (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                ]}
              >
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  Could not load Pre-Bid Q&amp;A
                </Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  {repResult.error}
                </Text>
              </View>
            ) : qaCount === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                ]}
              >
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  No published Pre-Bid Q&amp;A
                </Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  No vendor representation responses have been published by the buyer for this tender.
                </Text>
              </View>
            ) : (
              <>
                {repResult?.publishedOn ? (
                  <View
                    style={[
                      styles.pubDateBanner,
                      { backgroundColor: colors.primaryTint, borderColor: colors.borderSubtle },
                    ]}
                  >
                    <Text style={[styles.pubDateText, { color: colors.primary }]}>
                      Buyer Responses Published: {repResult.publishedOn}
                    </Text>
                  </View>
                ) : null}

                {qaCount >= 3 ? (
                  <TextInput
                    value={qaQuery}
                    onChangeText={setQaQuery}
                    placeholder="Filter Q&A (e.g. warranty, MSE, spec, delivery)…"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.searchInput,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                  />
                ) : null}

                {filteredQa.length === 0 ? (
                  <View
                    style={[
                      styles.emptyCard,
                      { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                    ]}
                  >
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                      No Q&amp;A matched &quot;{qaQuery.trim()}&quot;
                    </Text>
                    <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                      Try another keyword or clear the filter.
                    </Text>
                  </View>
                ) : (
                  filteredQa.map((item, idx) => (
                    <View
                      key={`${item.id}-${idx}`}
                      style={[
                        styles.entryCard,
                        { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                      ]}
                    >
                      <View style={styles.entryTopRow}>
                        <View style={[styles.kindBadge, { backgroundColor: colors.surfaceSubtle }]}>
                          <Text
                            style={[styles.kindBadgeText, { color: colors.textSecondary }]}
                            numberOfLines={1}
                          >
                            {item.section.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={[styles.modifiedText, { color: colors.textMuted }]}>
                          #{idx + 1}
                        </Text>
                      </View>

                      <Text style={[styles.qaLabel, { color: colors.textMuted }]}>
                        SELLER REPRESENTATION
                      </Text>
                      <Text style={[styles.qaQueryText, { color: colors.textPrimary }]}>
                        {item.query}
                      </Text>

                      <View
                        style={[
                          styles.replyBox,
                          {
                            backgroundColor: colors.successTint,
                            borderColor: colors.borderSubtle,
                          },
                        ]}
                      >
                        <Text style={[styles.qaLabel, { color: colors.success }]}>
                          OFFICIAL BUYER REPLY
                        </Text>
                        <Text style={[styles.qaReplyText, { color: colors.textPrimary }]}>
                          {item.reply}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeRoot: { flex: 1 },
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 19, fontWeight: '700' },
  headerTitle: { fontSize: 15, fontWeight: '800' },
  headerSub: { fontSize: 11, marginTop: 1 },
  refreshBtn: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtnText: { fontSize: 11.5, fontWeight: '800' },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  tabBtnText: { fontSize: 12.5, fontWeight: '800' },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 28 },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  stateText: { fontSize: 12.5 },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  emptySub: { fontSize: 12.5, lineHeight: 18 },
  entryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    marginBottom: 11,
  },
  entryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  kindBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 1,
  },
  kindBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  modifiedText: { fontSize: 10.5, fontWeight: '600' },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  datePill: {
    flex: 1,
    minWidth: 140,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  datePillLabel: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4, marginBottom: 3 },
  datePillVal: { fontSize: 12.5, fontWeight: '800' },
  entrySummary: { fontSize: 13, fontWeight: '700', lineHeight: 19 },
  actionBtn: {
    marginTop: 10,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  actionBtnText: { fontSize: 12.5, fontWeight: '800' },
  tcExpandedBox: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  tcExpandedText: { fontSize: 12, lineHeight: 18 },
  disclaimer: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  pubDateBanner: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginBottom: 10,
  },
  pubDateText: { fontSize: 12, fontWeight: '800' },
  searchInput: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    marginBottom: 11,
  },
  qaLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  qaQueryText: {
    fontSize: 12.5,
    lineHeight: 18.5,
    marginBottom: 10,
  },
  replyBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  qaReplyText: {
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 18.5,
  },
});
