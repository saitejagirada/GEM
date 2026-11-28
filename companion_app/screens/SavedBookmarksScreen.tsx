/**
 * GeM Saved Bookmarks Review Screen (User Account)
 *
 * Apple HIG categorized review hub for all tenders bookmarked across Home,
 * Tenders, Reverse Auctions, and Inspectors:
 * - Dynamically evaluates every saved tender against GeM closing timestamps &
 *   live portal status, categorizing into OPEN (Ongoing / Live RA / Closing Soon)
 *   vs. CLOSED (Closed / Cancelled).
 * - Segmented filter: All | Open (X) | Closed (Y).
 * - Live corrigendum/amendment re-probe + 1-tap Inspect, Prepare Docs,
 *   Calendar Reminder, and Clear Closed tidy-up.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppIcon } from '../components/AppIcons';
import {
  TenderRadarService,
  buildClosingReminderUrl,
  buildSavedBookmarksReview,
  type SavedBookmarkReviewItem,
  type TenderRadarState,
} from '../services/TenderRadarService';
import { formatDateSafe, formatLakhs } from '../utils/formatters';
import type { DeconstructedBidDoc } from '../types/index';

export interface SavedBookmarksScreenProps {
  onBack: () => void;
  onInspectBid: (bid: DeconstructedBidDoc) => void;
  onPrepareDocuments?: (bid: DeconstructedBidDoc) => void;
  onBrowseBids?: () => void;
}

type BookmarkFilterTab = 'ALL' | 'OPEN' | 'CLOSED';

export const SavedBookmarksScreen: React.FC<SavedBookmarksScreenProps> = ({
  onBack,
  onInspectBid,
  onPrepareDocuments,
  onBrowseBids,
}) => {
  const { colors, fontMultiplier, t } = useTheme();
  const [radarState, setRadarState] = useState<TenderRadarState>(() => TenderRadarService.getState());
  const [activeTab, setActiveTab] = useState<BookmarkFilterTab>('ALL');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    let active = true;
    const unsub = TenderRadarService.subscribe((next) => {
      if (active) setRadarState(next);
    });
    TenderRadarService.hydrate()
      .then(() => TenderRadarService.refreshWatchedStatuses())
      .then(() => {
        if (active) setNowMs(Date.now());
      })
      .catch(() => undefined);

    // Keep countdown labels and Open/Closed transitions fresh every 60s while viewing
    const timer = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => {
      active = false;
      unsub();
      clearInterval(timer);
    };
  }, []);

  const review = useMemo(
    () => buildSavedBookmarksReview(radarState.watched, nowMs),
    [radarState.watched, nowMs]
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await TenderRadarService.refreshWatchedStatuses(Date.now());
      setNowMs(Date.now());
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleRemoveBookmark = useCallback((item: SavedBookmarkReviewItem) => {
    void TenderRadarService.removeWatched(item.bidNumber);
  }, []);

  const handleClearClosed = useCallback(() => {
    if (review.closedCount === 0) return;
    Alert.alert(
      'Clear Closed Bookmarks?',
      `Remove ${review.closedCount} closed or cancelled tender${review.closedCount > 1 ? 's' : ''} from your saved bookmarks? Your ${review.openCount} open tender${review.openCount === 1 ? '' : 's'} will stay saved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Closed',
          style: 'destructive',
          onPress: () => {
            void TenderRadarService.clearClosedBookmarks(Date.now());
          },
        },
      ]
    );
  }, [review.closedCount, review.openCount]);

  const handleCalendarRemind = useCallback((bid: DeconstructedBidDoc) => {
    const url = buildClosingReminderUrl(bid);
    Linking.openURL(url).catch(() => {
      Alert.alert(
        'Calendar Not Available',
        `Set a reminder before ${formatDateSafe(bid.closingTimeUtc)} for ${bid.bidNumber}.`
      );
    });
  }, []);

  const renderStatusPill = (item: SavedBookmarkReviewItem) => {
    let bg = colors.successTint;
    let fg = colors.success;
    let label = `OPEN · ${item.remainingLabel}`;

    if (item.detailedStatus === 'CLOSING_SOON') {
      bg = colors.dangerTint;
      fg = colors.danger;
      label = `CLOSING SOON · ${item.remainingLabel}`;
    } else if (item.detailedStatus === 'LIVE_RA') {
      bg = colors.warningTint;
      fg = colors.warning;
      label = `LIVE RA · ${item.remainingLabel}`;
    } else if (item.detailedStatus === 'CANCELLED') {
      bg = colors.dangerTint;
      fg = colors.danger;
      label = 'CANCELLED';
    } else if (item.detailedStatus === 'CLOSED') {
      bg = colors.surfaceSubtle;
      fg = colors.textMuted;
      label = item.remainingLabel.toUpperCase();
    }

    return (
      <View style={[styles.statusPill, { backgroundColor: bg }]}>
        <Text style={[styles.statusPillText, { color: fg }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  };

  const renderBookmarkCard = (item: SavedBookmarkReviewItem) => {
    const isClosed = item.category === 'CLOSED';
    return (
      <Pressable
        key={item.bidNumber}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderSubtle,
            opacity: pressed ? 0.94 : isClosed ? 0.9 : 1,
          },
        ]}
        onPress={() => onInspectBid(item.bid)}
      >
        {/* Row 1: Lifecycle Status Pill + Bookmark Remove */}
        <View style={styles.cardTopRow}>
          <View style={styles.cardTopLeft}>
            {renderStatusPill(item)}
            <Text style={[styles.bidNumberText, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.bidNumber}
            </Text>
          </View>

          <Pressable
            onPress={() => handleRemoveBookmark(item)}
            hitSlop={10}
            style={({ pressed }) => [
              styles.bookmarkBtn,
              {
                backgroundColor: colors.warningTint,
                borderColor: colors.warning,
                opacity: pressed ? 0.65 : 1,
              },
            ]}
            accessibilityLabel={`Remove ${item.bidNumber} from saved bookmarks`}
          >
            <AppIcon name="bookmarkFilled" color={colors.warning} size={20} />
          </Pressable>
        </View>

        {/* Optional Live Corrigendum Alert */}
        {item.hasCorrigendum || item.hasRepresentation ? (
          <View
            style={[
              styles.corrigPill,
              { backgroundColor: colors.warningTint, borderColor: colors.warning },
            ]}
          >
            <AppIcon name="alert" color={colors.warning} size={14} />
            <Text style={[styles.corrigText, { color: colors.warning }]} numberOfLines={2}>
              {item.hasCorrigendum
                ? 'Corrigendum published on GeM — inspect updated PDF terms'
                : 'Buyer representation update recorded on GeM'}
            </Text>
          </View>
        ) : null}

        {/* Row 2: Title + Department */}
        <Text
          style={[
            styles.cardTitle,
            { color: colors.textPrimary, fontSize: 15.5 * fontMultiplier },
          ]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        <Text style={[styles.cardDept, { color: colors.textSecondary }]} numberOfLines={1}>
          {[item.department, item.ministry && item.ministry !== item.department ? item.ministry : '']
            .filter(Boolean)
            .join(' · ')}
        </Text>

        {/* Row 3: Compact Metadata Strip */}
        <View
          style={[
            styles.metaStrip,
            { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
          ]}
        >
          <View style={styles.metaCol}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
              {isClosed ? 'CLOSED ON (IST)' : 'CLOSES (IST)'}
            </Text>
            <Text style={[styles.metaVal, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.closingTimeUtc ? formatDateSafe(item.closingTimeUtc) : 'Not listed'}
            </Text>
          </View>
          <View style={[styles.metaDivider, { backgroundColor: colors.borderSubtle }]} />
          <View style={styles.metaCol}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>TYPE / VALUE</Text>
            <Text style={[styles.metaVal, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.estimatedValueInr
                ? formatLakhs(item.estimatedValueInr)
                : item.isReverseAuction
                  ? 'Reverse Auction'
                  : item.isService
                    ? 'Service Contract'
                    : item.quantity
                      ? `${item.quantity.toLocaleString('en-IN')} Units`
                      : 'GeM Bid'}
            </Text>
          </View>
        </View>

        {/* Row 4: Contextual Quick Actions */}
        <View style={styles.cardActionsRow}>
          <Pressable
            onPress={() => onInspectBid(item.bid)}
            style={({ pressed }) => [
              styles.primaryActionBtn,
              {
                backgroundColor: isClosed ? colors.surfaceSubtle : colors.primary,
                borderColor: isClosed ? colors.borderSubtle : colors.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.primaryActionText,
                { color: isClosed ? colors.textPrimary : colors.textInverse },
              ]}
            >
              {isClosed ? 'Review Archive ›' : 'Inspect Tender ›'}
            </Text>
          </Pressable>

          {!isClosed && onPrepareDocuments ? (
            <Pressable
              onPress={() => onPrepareDocuments(item.bid)}
              style={({ pressed }) => [
                styles.secondaryActionBtn,
                {
                  backgroundColor: colors.primaryTint,
                  borderColor: colors.primaryTint,
                  opacity: pressed ? 0.78 : 1,
                },
              ]}
            >
              <Text style={[styles.secondaryActionText, { color: colors.primary }]}>
                Prepare Docs
              </Text>
            </Pressable>
          ) : null}

          {!isClosed ? (
            <Pressable
              onPress={() => handleCalendarRemind(item.bid)}
              style={({ pressed }) => [
                styles.iconActionBtn,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.borderSubtle,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
              accessibilityLabel={`Set closing reminder for ${item.bidNumber}`}
            >
              <AppIcon name="calendar" color={colors.primary} size={17} />
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    );
  };

  const showOpenSection = activeTab === 'ALL' || activeTab === 'OPEN';
  const showClosedSection = activeTab === 'ALL' || activeTab === 'CLOSED';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Navigation Header */}
      <View
        style={[
          styles.navBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle },
        ]}
      >
        <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn} accessibilityLabel="Go back">
          <Text style={[styles.backArrow, { color: colors.primary }]}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.navTitle,
              { color: colors.textPrimary, fontSize: 16.5 * fontMultiplier },
            ]}
          >
            {t('savedBookmarks')}
          </Text>
          <Text style={[styles.navSubtitle, { color: colors.textSecondary }]}>
            {review.openCount} {t('openBookmarks')} · {review.closedCount} {t('closedBookmarks')}
          </Text>
        </View>
        <Pressable
          onPress={() => void handleRefresh()}
          disabled={isRefreshing}
          style={({ pressed }) => [
            styles.refreshPill,
            {
              backgroundColor: colors.primaryTint,
              opacity: pressed || isRefreshing ? 0.7 : 1,
            },
          ]}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.refreshPillText, { color: colors.primary }]}>Refresh ↻</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Open vs. Closed Summary Strip */}
        <View style={styles.summaryRow}>
          <Pressable
            style={[
              styles.summaryTile,
              {
                backgroundColor: colors.surface,
                borderColor: activeTab === 'OPEN' ? colors.success : colors.borderSubtle,
              },
            ]}
            onPress={() => setActiveTab(activeTab === 'OPEN' ? 'ALL' : 'OPEN')}
          >
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>OPEN / LIVE</Text>
            <Text style={[styles.summaryCount, { color: colors.success }]}>
              {review.openCount}
            </Text>
            <Text style={[styles.summaryHint, { color: colors.textSecondary }]}>
              Active deadlines &amp; RAs
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.summaryTile,
              {
                backgroundColor: colors.surface,
                borderColor: activeTab === 'CLOSED' ? colors.primary : colors.borderSubtle,
              },
            ]}
            onPress={() => setActiveTab(activeTab === 'CLOSED' ? 'ALL' : 'CLOSED')}
          >
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>CLOSED / ENDED</Text>
            <Text style={[styles.summaryCount, { color: colors.textPrimary }]}>
              {review.closedCount}
            </Text>
            <Text style={[styles.summaryHint, { color: colors.textSecondary }]}>
              Past closing or cancelled
            </Text>
          </Pressable>
        </View>

        {/* iOS Segmented Filter */}
        <View
          style={[
            styles.segmentedBar,
            { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
          ]}
        >
          {(
            [
              { id: 'ALL', label: `All (${review.totalCount})` },
              { id: 'OPEN', label: `${t('openBookmarks')} (${review.openCount})` },
              { id: 'CLOSED', label: `${t('closedBookmarks')} (${review.closedCount})` },
            ] as const
          ).map((seg) => {
            const active = activeTab === seg.id;
            return (
              <Pressable
                key={seg.id}
                onPress={() => setActiveTab(seg.id)}
                style={[
                  styles.segItem,
                  active && {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segItemText,
                    {
                      color: active ? colors.primary : colors.textSecondary,
                      fontWeight: active ? '700' : '600',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {seg.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Empty State when nothing saved yet */}
        {review.totalCount === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
            ]}
          >
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.warningTint }]}>
              <AppIcon name="bookmark" color={colors.warning} size={28} />
            </View>
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.textPrimary, fontSize: 16 * fontMultiplier },
              ]}
            >
              No saved bookmarks yet
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Tap the bookmark icon on any tender across Home, Bids, or Reverse Auctions. Your
              saved tenders appear here automatically sorted into Open and Closed.
            </Text>
            {onBrowseBids ? (
              <Pressable
                onPress={onBrowseBids}
                style={[styles.emptyCtaBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.emptyCtaText, { color: colors.textInverse }]}>
                  Browse Live Tenders ›
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <>
            {/* OPEN SECTION */}
            {showOpenSection ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
                    OPEN &amp; LIVE TENDERS ({review.openCount})
                  </Text>
                  <Text style={[styles.sectionHint, { color: colors.success }]}>
                    Closing soonest first
                  </Text>
                </View>

                {review.openBookmarks.length > 0 ? (
                  review.openBookmarks.map(renderBookmarkCard)
                ) : (
                  <View
                    style={[
                      styles.subEmptyCard,
                      { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                    ]}
                  >
                    <Text style={[styles.subEmptyText, { color: colors.textSecondary }]}>
                      No open tenders currently bookmarked.
                    </Text>
                  </View>
                )}
              </View>
            ) : null}

            {/* CLOSED SECTION */}
            {showClosedSection ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
                    CLOSED / ENDED TENDERS ({review.closedCount})
                  </Text>
                  {review.closedCount > 0 ? (
                    <Pressable onPress={handleClearClosed} hitSlop={8}>
                      <Text style={[styles.clearClosedText, { color: colors.danger }]}>
                        Clear Closed
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {review.closedBookmarks.length > 0 ? (
                  review.closedBookmarks.map(renderBookmarkCard)
                ) : (
                  <View
                    style={[
                      styles.subEmptyCard,
                      { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                    ]}
                  >
                    <Text style={[styles.subEmptyText, { color: colors.textSecondary }]}>
                      No closed or cancelled bookmarks yet.
                    </Text>
                  </View>
                )}
              </View>
            ) : null}
          </>
        )}

        <Text style={[styles.footerNote, { color: colors.textMuted }]}>
          Status is automatically re-checked against GeM closing timestamps and live portal feeds
          every time you review your bookmarks. Stored privately on your device.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  navBar: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    fontWeight: '700',
  },
  navTitle: {
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  navSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  refreshPill: {
    minHeight: 34,
    minWidth: 86,
    paddingHorizontal: 12,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshPillText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 38,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  summaryTile: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  summaryLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  summaryHint: {
    fontSize: 11.5,
    marginTop: 2,
  },
  segmentedBar: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 4,
    marginBottom: 18,
  },
  segItem: {
    flex: 1,
    minHeight: 38,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  segItemText: {
    fontSize: 13,
  },
  sectionBlock: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  sectionHint: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  clearClosedText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 15,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  cardTopLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusPill: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.25,
  },
  bidNumberText: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  bookmarkBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corrigPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
  },
  corrigText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    lineHeight: 16.5,
  },
  cardTitle: {
    fontWeight: '700',
    lineHeight: 21,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  cardDept: {
    fontSize: 12.5,
    marginBottom: 10,
  },
  metaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginBottom: 12,
  },
  metaCol: {
    flex: 1,
  },
  metaDivider: {
    width: StyleSheet.hairlineWidth,
    height: 26,
    marginHorizontal: 10,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaVal: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryActionBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryActionText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    minHeight: 42,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  iconActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 26,
    alignItems: 'center',
    marginTop: 6,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 18,
  },
  emptyCtaBtn: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaText: {
    fontSize: 14,
    fontWeight: '700',
  },
  subEmptyCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    alignItems: 'center',
  },
  subEmptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  footerNote: {
    fontSize: 11.5,
    lineHeight: 16.5,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },
});
