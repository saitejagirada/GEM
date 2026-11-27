/**
 * GeM Mobile Companion — Personalized Home Hub
 *
 * Features:
 * - Watched Tenders shelf with live closing countdowns, automatic GeM corrigendum
 *   checks, and 1-tap Calendar closing reminders
 * - My Daily Tender Radar: user picks up to 6 business keywords once (100% local),
 *   streaming matching live GeM tenders progressively with NEW arrival badges
 * - Clean geometric Quick Access grid, Popular Categories, and Help resources
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import { AppIcon } from '../components/AppIcons';
import {
  SearchField,
  CompactChip,
  StatusBadge,
  SectionHeader,
  PrimaryButton,
  SecondaryButton,
} from '../components/SharedUI';
import {
  TenderRadarService,
  SUGGESTED_RADAR_KEYWORDS,
  buildClosingReminderUrl,
  sanitizeRadarKeyword,
  type RadarVehicleFilter,
  type TenderRadarState,
} from '../services/TenderRadarService';
import { formatLakhs, formatDateSafe } from '../utils/formatters';
import type { DeconstructedBidDoc } from '../types/index';

export interface HomeNavigateParams {
  search?: string;
  category?: string;
  typeTab?: 'Products' | 'Services';
}

export interface HomeScreenProps {
  bids: DeconstructedBidDoc[];
  totalPortalBids?: number;
  onNavigateTab: (
    tab: 'MARKET' | 'BIDS' | 'AUCTIONS' | 'ORDERS' | 'PORTAL' | 'CATEGORIES' | 'HELP' | 'MORE',
    params?: HomeNavigateParams
  ) => void;
  onSelectBid: (bid: DeconstructedBidDoc) => void;
  onOpenMyWork?: () => void;
  onOpenOfficialPortal?: () => void;
}

const SEARCH_FILTER_PILLS = ['All', 'Products', 'Services', 'Bids', 'Contracts'];

const POPULAR_CATEGORIES = [
  { id: 'cat-it', name: 'Computers & IT', marketCategory: 'IT Products', desc: 'Laptops, servers & peripherals', code: 'IT', color: '#0B4F71', tint: '#EAF2F6' },
  { id: 'cat-med', name: 'Medical & Healthcare', marketCategory: 'Medical Products', desc: 'Hospital equipment & consumables', code: 'MED', color: '#0B7A3B', tint: '#E8F4EC' },
  { id: 'cat-off', name: 'Office & Furniture', marketCategory: 'Furniture', desc: 'Desks, chairs & stationery', code: 'OFF', color: '#9A5B00', tint: '#FFF4DF' },
  { id: 'cat-veh', name: 'Vehicles & Fleet', marketCategory: 'Automobiles', desc: 'Vehicles and transport equipment', code: 'VEH', color: '#49627A', tint: '#EDF1F4' },
];

function getShortCountdown(closingTimeUtc: string): { label: string; urgent: boolean; closed: boolean } {
  const closing = new Date(closingTimeUtc);
  if (Number.isNaN(closing.getTime())) {
    return { label: 'See PDF', urgent: false, closed: false };
  }
  const diffMs = closing.getTime() - Date.now();
  if (diffMs <= 0) return { label: 'Closed', urgent: false, closed: true };
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (hours >= 48) {
    return { label: `${Math.floor(hours / 24)}d ${hours % 24}h left`, urgent: false, closed: false };
  }
  return {
    label: hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`,
    urgent: hours < 24,
    closed: false,
  };
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  bids,
  totalPortalBids = 0,
  onNavigateTab,
  onSelectBid,
  onOpenMyWork,
  onOpenOfficialPortal,
}) => {
  const { colors, fontMultiplier, t } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterPill, setActiveFilterPill] = useState('All');

  // Tender Radar & Watchlist reactive state
  const [radar, setRadar] = useState<TenderRadarState>(TenderRadarService.getState());
  const [selectedRadarKeyword, setSelectedRadarKeyword] = useState<string>('ALL');
  const [showAllRadarRows, setShowAllRadarRows] = useState<boolean>(false);

  // Inline quick onboarding draft (when user hasn't set up Radar yet)
  const [draftKeywords, setDraftKeywords] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState<string>('');

  // Edit Radar Modal state
  const [showRadarModal, setShowRadarModal] = useState<boolean>(false);
  const [editKeywords, setEditKeywords] = useState<string[]>([]);
  const [editCustomInput, setEditCustomInput] = useState<string>('');
  const [editVehicle, setEditVehicle] = useState<RadarVehicleFilter>('all');
  const [editHighValue, setEditHighValue] = useState<boolean>(false);

  useEffect(() => {
    const unsub = TenderRadarService.subscribe((next) => setRadar(next));
    TenderRadarService.hydrate().then((hydratedState) => {
      setRadar(hydratedState);
      if (hydratedState.config.keywords.length > 0) {
        void TenderRadarService.refreshRadar(false);
      }
      if (hydratedState.watched.length > 0) {
        void TenderRadarService.checkWatchedCorrigenda();
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (
      selectedRadarKeyword !== 'ALL' &&
      !radar.config.keywords.some((k) => k.toLowerCase() === selectedRadarKeyword.toLowerCase())
    ) {
      setSelectedRadarKeyword('ALL');
    }
  }, [radar.config.keywords, selectedRadarKeyword]);

  const hasRadarConfigured = radar.config.keywords.length > 0;

  const allRadarMatches = useMemo(
    () => TenderRadarService.getAggregatedMatches(radar),
    [radar]
  );

  const radarMatches = useMemo(
    () =>
      selectedRadarKeyword === 'ALL'
        ? allRadarMatches
        : TenderRadarService.getAggregatedMatches(radar, selectedRadarKeyword),
    [radar, selectedRadarKeyword, allRadarMatches]
  );

  const totalNewRadarCount = useMemo(
    () => allRadarMatches.filter((m) => m.isNew).length,
    [allRadarMatches]
  );

  const radarErrorMessage = useMemo(() => {
    if (selectedRadarKeyword !== 'ALL') {
      return radar.byKeyword[selectedRadarKeyword]?.error || '';
    }
    const errors = radar.config.keywords
      .map((kw) => radar.byKeyword[kw]?.error)
      .filter((e): e is string => Boolean(e));
    return errors.length === radar.config.keywords.length && errors.length > 0 ? errors[0] : '';
  }, [radar, selectedRadarKeyword]);

  const watchedBidSet = useMemo(
    () => new Set(radar.watched.map((w) => w.bid.bidNumber.trim().toLowerCase())),
    [radar.watched]
  );

  const latestOpportunities = bids.slice(0, 3);

  const handleSearchSubmit = () => {
    const q = searchQuery.trim();
    const looksLikeBidNumber = /^GEM\/\d{4}\/[BR]\//i.test(q);
    if (activeFilterPill === 'Bids' || looksLikeBidNumber) {
      onNavigateTab('BIDS', { search: q });
    } else if (activeFilterPill === 'Contracts') {
      onNavigateTab('ORDERS', { search: q });
    } else if (activeFilterPill === 'Services') {
      onNavigateTab('MARKET', { search: q, typeTab: 'Services' });
    } else {
      onNavigateTab('MARKET', { search: q, typeTab: 'Products' });
    }
  };

  const toggleDraftKeyword = (kw: string) => {
    const clean = sanitizeRadarKeyword(kw);
    if (!clean) return;
    setDraftKeywords((prev) => {
      const exists = prev.some((k) => k.toLowerCase() === clean.toLowerCase());
      if (exists) return prev.filter((k) => k.toLowerCase() !== clean.toLowerCase());
      if (prev.length >= 6) return prev;
      return [...prev, clean];
    });
  };

  const addCustomDraftKeyword = () => {
    const parts = customInput
      .split(',')
      .map((p) => sanitizeRadarKeyword(p))
      .filter(Boolean);
    if (parts.length === 0) return;
    setDraftKeywords((prev) => {
      const next = [...prev];
      for (const kw of parts) {
        if (next.length >= 6) break;
        if (!next.some((k) => k.toLowerCase() === kw.toLowerCase())) {
          next.push(kw);
        }
      }
      return next;
    });
    setCustomInput('');
  };

  const activateRadar = async () => {
    const extra = customInput
      .split(',')
      .map((p) => sanitizeRadarKeyword(p))
      .filter(Boolean);
    const finalList = [...draftKeywords, ...extra];
    if (finalList.length === 0) return;
    setCustomInput('');
    setDraftKeywords([]);
    setSelectedRadarKeyword('ALL');
    setShowAllRadarRows(false);
    await TenderRadarService.saveConfig({ keywords: finalList }, true);
  };

  const openEditModal = () => {
    setEditKeywords([...radar.config.keywords]);
    setEditCustomInput('');
    setEditVehicle(radar.config.vehicleFilter);
    setEditHighValue(radar.config.highValueOnly);
    setShowRadarModal(true);
  };

  const toggleEditKeyword = (kw: string) => {
    const clean = sanitizeRadarKeyword(kw);
    if (!clean) return;
    setEditKeywords((prev) => {
      const exists = prev.some((k) => k.toLowerCase() === clean.toLowerCase());
      if (exists) return prev.filter((k) => k.toLowerCase() !== clean.toLowerCase());
      if (prev.length >= 6) return prev;
      return [...prev, clean];
    });
  };

  const addEditCustomKeyword = () => {
    const parts = editCustomInput
      .split(',')
      .map((p) => sanitizeRadarKeyword(p))
      .filter(Boolean);
    if (parts.length === 0) return;
    setEditKeywords((prev) => {
      const next = [...prev];
      for (const kw of parts) {
        if (next.length >= 6) break;
        if (!next.some((k) => k.toLowerCase() === kw.toLowerCase())) {
          next.push(kw);
        }
      }
      return next;
    });
    setEditCustomInput('');
  };

  const saveEditedRadar = async () => {
    const extra = editCustomInput
      .split(',')
      .map((p) => sanitizeRadarKeyword(p))
      .filter(Boolean);
    const finalList = [...editKeywords, ...extra];
    setShowRadarModal(false);
    setSelectedRadarKeyword('ALL');
    setShowAllRadarRows(false);
    await TenderRadarService.saveConfig(
      {
        keywords: finalList,
        vehicleFilter: editVehicle,
        highValueOnly: editHighValue,
      },
      true
    );
  };

  const handleOpenRadarBid = (bid: DeconstructedBidDoc) => {
    void TenderRadarService.markBidSeen(bid.bidNumber);
    onSelectBid(bid);
  };

  const handleCalendarRemind = (bid: DeconstructedBidDoc) => {
    const url = buildClosingReminderUrl(bid);
    Linking.openURL(url).catch(() => undefined);
  };

  const activeKeywordTotal =
    selectedRadarKeyword === 'ALL'
      ? Object.values(radar.byKeyword).reduce((sum, b) => sum + (b.total || 0), 0)
      : radar.byKeyword[selectedRadarKeyword]?.total ?? 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Compact Welcome + Universal Search */}
      <View style={styles.welcomeSection}>
        <Text style={[styles.welcomeTitle, { color: colors.textPrimary, fontSize: 23 * fontMultiplier }]}>
          {t('homeHeroTitle')}
        </Text>
        <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary, fontSize: 13.5 * fontMultiplier }]}>
          {(totalPortalBids || bids.length) > 0
            ? `${(totalPortalBids || bids.length).toLocaleString('en-IN')} live public GeM tenders · Direct phone-to-GeM feed`
            : t('homeHeroSub')}
        </Text>
      </View>

      <View style={styles.searchSection}>
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('homeSearchPlaceholder')}
          onSubmit={handleSearchSubmit}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillScrollView}
          contentContainerStyle={styles.pillContainer}
        >
          {SEARCH_FILTER_PILLS.map((pill) => (
            <CompactChip
              key={pill}
              label={pill}
              selected={activeFilterPill === pill}
              onPress={() => {
                setActiveFilterPill(pill);
                const q = searchQuery.trim();
                if (!q) return;
                if (pill === 'Bids') onNavigateTab('BIDS', { search: q });
                else if (pill === 'Contracts') onNavigateTab('ORDERS', { search: q });
                else if (pill === 'Services') onNavigateTab('MARKET', { search: q, typeTab: 'Services' });
                else if (pill === 'Products') onNavigateTab('MARKET', { search: q, typeTab: 'Products' });
              }}
            />
          ))}
        </ScrollView>
      </View>

      {/* 2. Watched Tenders Shelf (with Live Countdowns, Corrigendum Alerts & 1-Tap Calendar Reminders) */}
      {radar.watched.length > 0 && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleLeft}>
              <View style={[styles.miniIconBadge, { backgroundColor: colors.warningTint }]}>
                <AppIcon name="bookmarkFilled" color={colors.warning} size={13} />
              </View>
              <Text style={[styles.sectionTitleText, { color: colors.textPrimary }]}>
                {t('watchedTenders')} ({radar.watched.length})
              </Text>
            </View>
            <Pressable
              onPress={() => void TenderRadarService.checkWatchedCorrigenda()}
              hitSlop={8}
              style={[styles.tinyActionPill, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle }]}
            >
              <Text style={[styles.tinyActionText, { color: colors.primary }]}>Check Updates ↻</Text>
            </Pressable>
          </View>

          {radar.watched.slice(0, 5).map((entry) => {
            const { bid } = entry;
            const cd = getShortCountdown(bid.closingTimeUtc);
            return (
              <Pressable
                key={bid.bidNumber}
                onPress={() => onSelectBid(bid)}
                style={[
                  styles.watchedCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.watchedTopRow}>
                  <View style={styles.watchedTopLeft}>
                    <StatusBadge
                      label={bid.isRa || bid.type === 'RA' ? 'RA' : bid.type === 'SERVICE' ? 'SERVICE' : 'BID'}
                      tone={bid.isRa || bid.type === 'RA' ? 'warning' : 'neutral'}
                    />
                    <Text style={[styles.watchedBidNum, { color: colors.textSecondary }]} numberOfLines={1}>
                      {bid.bidNumber}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.countdownChip,
                      {
                        backgroundColor: cd.closed
                          ? colors.surfaceSubtle
                          : cd.urgent
                            ? colors.dangerTint
                            : colors.successTint,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.countdownChipText,
                        {
                          color: cd.closed
                            ? colors.textMuted
                            : cd.urgent
                              ? colors.danger
                              : colors.success,
                        },
                      ]}
                    >
                      {cd.label}
                    </Text>
                  </View>
                </View>

                {entry.hasCorrigendum || entry.hasRepresentation ? (
                  <View
                    style={[
                      styles.corrigAlertPill,
                      { backgroundColor: colors.warningTint, borderColor: colors.warning },
                    ]}
                  >
                    <View style={[styles.corrigDot, { backgroundColor: colors.warning }]} />
                    <Text style={[styles.corrigAlertText, { color: colors.warning }]}>
                      {entry.hasCorrigendum
                        ? 'Corrigendum published on GeM — check updated PDF'
                        : 'Representation recorded on GeM'}
                    </Text>
                  </View>
                ) : null}

                <Text style={[styles.watchedTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                  {bid.title}
                </Text>
                <Text style={[styles.watchedDept, { color: colors.textSecondary }]} numberOfLines={1}>
                  {bid.department} · Closes {formatDateSafe(bid.closingTimeUtc)}
                </Text>

                <View style={styles.watchedActionsRow}>
                  <Pressable
                    onPress={() => handleCalendarRemind(bid)}
                    style={[
                      styles.watchedBtn,
                      { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                    ]}
                  >
                    <AppIcon name="calendar" color={colors.primary} size={13} />
                    <Text style={[styles.watchedBtnText, { color: colors.textPrimary }]}>Remind</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => onSelectBid(bid)}
                    style={[
                      styles.watchedBtn,
                      { backgroundColor: colors.primaryTint, borderColor: 'transparent', flex: 1 },
                    ]}
                  >
                    <Text style={[styles.watchedBtnText, { color: colors.primary }]}>Inspect Details ›</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => void TenderRadarService.removeWatched(bid.bidNumber)}
                    hitSlop={6}
                    style={[
                      styles.unwatchBtn,
                      { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                    ]}
                    accessibilityLabel="Remove from watched tenders"
                  >
                    <Text style={[styles.unwatchText, { color: colors.textMuted }]}>✕</Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* 3. My Daily Tender Radar (Personalized Business Feed) */}
      <View style={styles.sectionBlock}>
        {!hasRadarConfigured ? (
          <View
            style={[
              styles.radarSetupCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[styles.radarAccentBar, { backgroundColor: colors.primary }]} />
            <View style={styles.radarSetupInner}>
              <View style={styles.radarHeaderRow}>
                <View style={[styles.radarIconBox, { backgroundColor: colors.primaryTint }]}>
                  <AppIcon name="radar" color={colors.primary} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.radarCardTitle, { color: colors.textPrimary }]}>
                    {t('myDailyRadar')}
                  </Text>
                  <Text style={[styles.radarCardSub, { color: colors.textSecondary }]}>
                    Pick what you sell once — see matching live GeM tenders here every day.
                  </Text>
                </View>
              </View>

              <View style={styles.presetChipsWrap}>
                {SUGGESTED_RADAR_KEYWORDS.slice(0, 8).map((kw) => {
                  const selected = draftKeywords.some((d) => d.toLowerCase() === kw.toLowerCase());
                  return (
                    <Pressable
                      key={kw}
                      onPress={() => toggleDraftKeyword(kw)}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: selected ? colors.primary : colors.surfaceSubtle,
                          borderColor: selected ? colors.primary : colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          { color: selected ? colors.textInverse : colors.textPrimary },
                        ]}
                      >
                        {selected ? `✓ ${kw}` : `+ ${kw}`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.customInputRow}>
                <TextInput
                  style={[
                    styles.customKeywordInput,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.borderSubtle,
                      color: colors.textPrimary,
                    },
                  ]}
                  placeholder="Add keyword (e.g. UPS, Catering)"
                  placeholderTextColor={colors.textMuted}
                  value={customInput}
                  onChangeText={setCustomInput}
                  onSubmitEditing={addCustomDraftKeyword}
                  returnKeyType="done"
                />
                <Pressable
                  onPress={addCustomDraftKeyword}
                  style={[styles.addKwBtn, { backgroundColor: colors.primaryTint }]}
                >
                  <Text style={[styles.addKwBtnText, { color: colors.primary }]}>Add</Text>
                </Pressable>
              </View>

              {draftKeywords.length > 0 && (
                <Text style={[styles.draftSummaryText, { color: colors.primary }]}>
                  Selected ({draftKeywords.length}/6): {draftKeywords.join(' · ')}
                </Text>
              )}

              <PrimaryButton
                label={
                  draftKeywords.length > 0 || customInput.trim()
                    ? `Activate Radar (${draftKeywords.length + (customInput.trim() ? 1 : 0)} keyword${draftKeywords.length + (customInput.trim() ? 1 : 0) === 1 ? '' : 's'})`
                    : 'Pick 1–6 Keywords Above to Activate'
                }
                onPress={activateRadar}
                disabled={draftKeywords.length === 0 && !customInput.trim()}
                style={{ marginTop: 10 }}
              />
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.radarLiveCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.radarLiveHeader}>
              <View style={styles.sectionTitleLeft}>
                <View style={[styles.miniIconBadge, { backgroundColor: colors.primaryTint }]}>
                  <AppIcon name="radar" color={colors.primary} size={14} />
                </View>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={[styles.sectionTitleText, { color: colors.textPrimary }]}>
                      My Daily Radar
                    </Text>
                    {totalNewRadarCount > 0 ? (
                      <Pressable
                        onPress={() => void TenderRadarService.markAllSeen()}
                        hitSlop={6}
                        style={[styles.newBadgePill, { backgroundColor: colors.successTint }]}
                      >
                        <Text style={[styles.newBadgeText, { color: colors.success }]}>
                          {totalNewRadarCount} NEW · Mark read
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <Text style={[styles.radarLiveSub, { color: colors.textSecondary }]}>
                    {radar.isRefreshing
                      ? `Scanning live GeM (${radar.refreshedKeywordsCount}/${radar.config.keywords.length})…`
                      : radarMatches.length > 0
                        ? `${radarMatches.length} verified matches${activeKeywordTotal > radarMatches.length ? ` · ${activeKeywordTotal.toLocaleString('en-IN')} live on GeM` : ''}`
                        : 'Saved keywords · 100% private on device'}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Pressable
                  onPress={() => void TenderRadarService.refreshRadar(true)}
                  hitSlop={6}
                  style={[
                    styles.tinyActionPill,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                  ]}
                  accessibilityLabel="Refresh radar"
                >
                  <Text style={[styles.tinyActionText, { color: colors.primary }]}>↻</Text>
                </Pressable>
                <Pressable
                  onPress={openEditModal}
                  hitSlop={6}
                  style={[
                    styles.tinyActionPill,
                    { backgroundColor: colors.primaryTint, borderColor: 'transparent' },
                  ]}
                >
                  <Text style={[styles.tinyActionText, { color: colors.primary }]}>Edit</Text>
                </Pressable>
              </View>
            </View>

            {/* Saved Keyword Filter Pills with Consistent Verified Match Counts */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.radarTabsRow}
            >
              <Pressable
                onPress={() => {
                  setSelectedRadarKeyword('ALL');
                  setShowAllRadarRows(false);
                }}
                style={[
                  styles.radarKwTab,
                  {
                    backgroundColor: selectedRadarKeyword === 'ALL' ? colors.primary : colors.surfaceSubtle,
                    borderColor: selectedRadarKeyword === 'ALL' ? colors.primary : colors.borderSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.radarKwTabText,
                    { color: selectedRadarKeyword === 'ALL' ? colors.textInverse : colors.textPrimary },
                  ]}
                >
                  All ({allRadarMatches.length})
                </Text>
              </Pressable>

              {radar.config.keywords.map((kw) => {
                const active = selectedRadarKeyword === kw;
                const kwLoadedCount = TenderRadarService.getAggregatedMatches(radar, kw).length;
                const hasBucket = Boolean(radar.byKeyword[kw]);
                return (
                  <Pressable
                    key={kw}
                    onPress={() => {
                      setSelectedRadarKeyword(kw);
                      setShowAllRadarRows(false);
                    }}
                    style={[
                      styles.radarKwTab,
                      {
                        backgroundColor: active ? colors.primary : colors.surfaceSubtle,
                        borderColor: active ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.radarKwTabText,
                        { color: active ? colors.textInverse : colors.textPrimary },
                      ]}
                    >
                      {kw}
                      {hasBucket ? ` (${kwLoadedCount})` : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Progressive Matching Live Tender Rows */}
            {radarMatches.length === 0 ? (
              <View style={styles.radarEmptyBox}>
                {radar.isRefreshing ? (
                  <>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.radarEmptyText, { color: colors.textSecondary, marginTop: 8 }]}>
                      Scanning bidplus.gem.gov.in for {radar.config.keywords.join(', ')}…
                    </Text>
                  </>
                ) : radarErrorMessage ? (
                  <>
                    <Text style={[styles.radarEmptyText, { color: colors.danger }]}>
                      Could not reach bidplus.gem.gov.in right now.
                    </Text>
                    <Pressable
                      onPress={() => void TenderRadarService.refreshRadar(true)}
                      style={[
                        styles.tinyActionPill,
                        {
                          marginTop: 8,
                          backgroundColor: colors.primaryTint,
                          borderColor: 'transparent',
                        },
                      ]}
                    >
                      <Text style={[styles.tinyActionText, { color: colors.primary }]}>
                        Retry Scan ↻
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <Text style={[styles.radarEmptyText, { color: colors.textSecondary }]}>
                    No relevant ongoing tenders matched{' '}
                    {selectedRadarKeyword !== 'ALL' ? `"${selectedRadarKeyword}"` : 'your filters'}{' '}
                    right now. Tap Edit to adjust keywords or filters.
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.radarListWrap}>
                {radarMatches.slice(0, showAllRadarRows ? 15 : 5).map((item, idx) => {
                  const { bid } = item;
                  const isSaved = watchedBidSet.has(bid.bidNumber.trim().toLowerCase());
                  const cd = getShortCountdown(bid.closingTimeUtc);
                  const qty = bid.boqItems?.[0]?.quantity;

                  return (
                    <Pressable
                      key={bid.bidNumber}
                      onPress={() => handleOpenRadarBid(bid)}
                      style={[
                        styles.radarBidRow,
                        idx > 0 && {
                          borderTopWidth: StyleSheet.hairlineWidth,
                          borderTopColor: colors.borderSubtle,
                        },
                      ]}
                    >
                      <View style={styles.radarBidTopRow}>
                        <View style={styles.radarBidTagsLeft}>
                          {item.isNew ? (
                            <View style={[styles.newTagMini, { backgroundColor: colors.successTint }]}>
                              <Text style={[styles.newTagMiniText, { color: colors.success }]}>NEW</Text>
                            </View>
                          ) : null}
                          <View style={[styles.kwMatchPill, { backgroundColor: colors.primaryTint }]}>
                            <Text style={[styles.kwMatchPillText, { color: colors.primary }]}>
                              {item.matchedKeywords[0]}
                            </Text>
                          </View>
                          <Text style={[styles.radarBidNum, { color: colors.textSecondary }]} numberOfLines={1}>
                            {bid.bidNumber}
                          </Text>
                        </View>

                        <Pressable
                          onPress={() => void TenderRadarService.toggleWatch(bid)}
                          hitSlop={8}
                          style={[
                            styles.watchStarBtn,
                            {
                              backgroundColor: isSaved ? colors.warningTint : colors.surfaceSubtle,
                              borderColor: isSaved ? colors.warning : colors.borderSubtle,
                            },
                          ]}
                          accessibilityLabel={isSaved ? 'Remove from watchlist' : 'Watch tender'}
                        >
                          <AppIcon
                            name={isSaved ? 'bookmarkFilled' : 'bookmark'}
                            color={isSaved ? colors.warning : colors.textMuted}
                            size={12}
                          />
                          <Text
                            style={[
                              styles.watchStarText,
                              { color: isSaved ? colors.warning : colors.textSecondary },
                            ]}
                          >
                            {isSaved ? 'Watched' : 'Watch'}
                          </Text>
                        </Pressable>
                      </View>

                      <Text style={[styles.radarBidTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                        {bid.title}
                      </Text>

                      <View style={styles.radarBidMetaRow}>
                        <Text style={[styles.radarBidDept, { color: colors.textSecondary }]} numberOfLines={1}>
                          {bid.department}
                        </Text>
                        <Text
                          style={[
                            styles.radarBidCountdown,
                            { color: cd.urgent ? colors.danger : colors.primary },
                          ]}
                        >
                          {qty !== undefined ? `Qty ${qty.toLocaleString('en-IN')} · ` : ''}
                          {cd.label}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
                {radarMatches.length > 5 ? (
                  <Pressable
                    onPress={() => setShowAllRadarRows((prev) => !prev)}
                    style={[styles.radarFooterLink, { borderTopColor: colors.borderSubtle }]}
                  >
                    <Text style={[styles.radarFooterLinkText, { color: colors.textSecondary }]}>
                      {showAllRadarRows
                        ? 'Show fewer matches ▲'
                        : `Show ${Math.min(radarMatches.length, 15) - 5} more matches ▼`}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            )}

            <Pressable
              onPress={() =>
                onNavigateTab('BIDS', {
                  search:
                    selectedRadarKeyword !== 'ALL'
                      ? selectedRadarKeyword
                      : radar.config.keywords[0] || '',
                })
              }
              style={[styles.radarFooterLink, { borderTopColor: colors.borderSubtle }]}
            >
              <Text style={[styles.radarFooterLinkText, { color: colors.primary }]}>
                {selectedRadarKeyword !== 'ALL'
                  ? `Search all "${selectedRadarKeyword}" tenders in Bids →`
                  : radar.config.keywords[0]
                    ? `Search "${radar.config.keywords[0]}" tenders in Bids →`
                    : `Explore live tenders in Bids →`}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* 4. Quick Access Grid (Clean Geometric AppIcons) */}
      <View style={styles.quickAccessSection}>
        <SectionHeader title={t('quickAccess')} />
        <View style={styles.quickGrid}>
          <Pressable
            style={[styles.quickCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            unstable_pressDelay={0}
            hitSlop={6}
            onPress={() => onNavigateTab('MARKET')}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: colors.primaryTint }]}>
              <AppIcon name="search" color={colors.primary} size={18} />
            </View>
            <Text style={[styles.quickCardTitle, { color: colors.textPrimary }]}>Products &amp; Services</Text>
            <Text style={[styles.quickCardSubtitle, { color: colors.textMuted }]}>Live GeM catalog</Text>
          </Pressable>

          <Pressable
            style={[styles.quickCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            unstable_pressDelay={0}
            hitSlop={6}
            onPress={() => onNavigateTab('BIDS')}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: colors.successTint }]}>
              <AppIcon name="bids" color={colors.emerald} size={18} />
            </View>
            <Text style={[styles.quickCardTitle, { color: colors.textPrimary }]}>Bids &amp; Tenders</Text>
            <Text style={[styles.quickCardSubtitle, { color: colors.textMuted }]}>
              {totalPortalBids > 0 ? `${totalPortalBids.toLocaleString('en-IN')} live` : 'Live public feed'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.quickCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            unstable_pressDelay={0}
            hitSlop={6}
            onPress={() => onNavigateTab('AUCTIONS')}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: colors.warningTint }]}>
              <AppIcon name="auctions" color={colors.warning} size={18} />
            </View>
            <Text style={[styles.quickCardTitle, { color: colors.textPrimary }]}>Auctions</Text>
            <Text style={[styles.quickCardSubtitle, { color: colors.textMuted }]}>Live Reverse Auctions</Text>
          </Pressable>

          <Pressable
            style={[styles.quickCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            unstable_pressDelay={0}
            hitSlop={6}
            onPress={() => onNavigateTab('ORDERS')}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: colors.violetTint }]}>
              <AppIcon name="contract" color={colors.violet} size={18} />
            </View>
            <Text style={[styles.quickCardTitle, { color: colors.textPrimary }]}>Concluded Bids</Text>
            <Text style={[styles.quickCardSubtitle, { color: colors.textMuted }]}>Official registry</Text>
          </Pressable>
        </View>
      </View>

      {/* 5. Personal Workspace Entry Point */}
      <View style={[styles.workspaceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.workspaceCopy}>
          <Text style={[styles.workspaceEyebrow, { color: colors.primary }]}>COMPANION WORKSPACE</Text>
          <Text style={[styles.workspaceTitle, { color: colors.textPrimary }]}>Prepare bid response files</Text>
          <Text style={[styles.workspaceSubtitle, { color: colors.textSecondary }]}>
            Assemble local documents on-device and continue directly on bidplus.gem.gov.in when ready.
          </Text>
        </View>
        <View style={styles.workspaceActionsRow}>
          <PrimaryButton
            label="Prepare Docs"
            onPress={() => (onOpenMyWork ? onOpenMyWork() : onNavigateTab('MORE'))}
            style={{ flex: 1 }}
          />
          <SecondaryButton
            label="GeM Portal ↗"
            onPress={() => (onOpenOfficialPortal ? onOpenOfficialPortal() : onNavigateTab('PORTAL'))}
            style={{ flex: 1 }}
          />
        </View>
      </View>

      {/* 6. Popular Categories Preview */}
      <View style={styles.categoriesSection}>
        <SectionHeader
          title="Browse categories"
          actionLabel="View all >"
          onAction={() => onNavigateTab('CATEGORIES')}
        />
        <View style={styles.categoryList}>
          {POPULAR_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              unstable_pressDelay={0}
              hitSlop={6}
              style={[
                styles.categoryRowItem,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => onNavigateTab('MARKET', { category: cat.marketCategory, typeTab: 'Products' })}
            >
              <View style={[styles.categoryIconSquare, { backgroundColor: cat.tint }]}>
                <Text style={[styles.categoryCode, { color: cat.color }]}>{cat.code}</Text>
              </View>
              <View style={styles.categoryInfo}>
                <Text style={[styles.categoryName, { color: colors.textPrimary }]}>{cat.name}</Text>
                <Text style={[styles.categoryDesc, { color: colors.textSecondary }]}>{cat.desc}</Text>
              </View>
              <View style={styles.categoryEndCol}>
                <Text style={[styles.categoryCount, { color: colors.textMuted }]}>Browse</Text>
                <Text style={[styles.chevronText, { color: colors.textMuted }]}>›</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 7. Latest Opportunities (Shown cleanly below for general browsing) */}
      {latestOpportunities.length > 0 && (
        <View style={styles.opportunitiesSection}>
          <SectionHeader
            title="Latest on GeM"
            actionLabel="View all >"
            onAction={() => onNavigateTab('BIDS')}
          />
          {latestOpportunities.map((bid) => {
            const isSaved = watchedBidSet.has(bid.bidNumber.trim().toLowerCase());
            return (
              <Pressable
                key={bid.bidNumber}
                unstable_pressDelay={0}
                hitSlop={6}
                style={[
                  styles.opportunityCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => onSelectBid(bid)}
              >
                <View style={styles.oppHeaderRow}>
                  <StatusBadge
                    label={bid.isRa || bid.type === 'RA' ? 'RA' : bid.type === 'SERVICE' ? 'SERVICES' : 'GOODS'}
                    tone={bid.isRa || bid.type === 'RA' ? 'warning' : bid.type === 'SERVICE' ? 'violet' : 'neutral'}
                  />
                  <Text style={[styles.oppBidNum, { color: colors.textSecondary }]}>{bid.bidNumber}</Text>
                  <Pressable
                    onPress={() => void TenderRadarService.toggleWatch(bid)}
                    hitSlop={8}
                    style={[
                      styles.watchStarBtn,
                      {
                        backgroundColor: isSaved ? colors.warningTint : colors.surfaceSubtle,
                        borderColor: isSaved ? colors.warning : colors.borderSubtle,
                      },
                    ]}
                  >
                    <AppIcon
                      name={isSaved ? 'bookmarkFilled' : 'bookmark'}
                      color={isSaved ? colors.warning : colors.textMuted}
                      size={11}
                    />
                    <Text
                      style={[
                        styles.watchStarText,
                        { color: isSaved ? colors.warning : colors.textSecondary },
                      ]}
                    >
                      {isSaved ? 'Watched' : 'Watch'}
                    </Text>
                  </Pressable>
                </View>

                <Text
                  style={[styles.oppTitle, { color: colors.textPrimary, fontSize: 14 * fontMultiplier }]}
                  numberOfLines={2}
                >
                  {bid.title}
                </Text>
                <Text style={[styles.oppDept, { color: colors.textSecondary }]} numberOfLines={1}>
                  {bid.department}
                </Text>

                <View style={[styles.oppMetaGrid, { backgroundColor: colors.surfaceSubtle }]}>
                  <View style={styles.oppMetaCol}>
                    <Text style={[styles.oppMetaLabel, { color: colors.textMuted }]}>EST. VALUE</Text>
                    <Text style={[styles.oppMetaVal, { color: colors.primary }]}>
                      {bid.estimatedBidValueInr === undefined || bid.publishedFields?.estimatedValue === false
                        ? bid.isHighValue
                          ? '≥ ₹2 Cr'
                          : 'Tap to inspect'
                        : formatLakhs(bid.estimatedBidValueInr)}
                    </Text>
                  </View>
                  <View style={styles.oppMetaCol}>
                    <Text style={[styles.oppMetaLabel, { color: colors.textMuted }]}>CLOSES (IST)</Text>
                    <Text style={[styles.oppMetaVal, { color: colors.textPrimary }]}>
                      {formatDateSafe(bid.closingTimeUtc)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* 8. Procurement Help Banner */}
      <View
        style={[
          styles.helpCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={[styles.helpIconSquare, { backgroundColor: colors.primaryTint }]}>
          <AppIcon name="help" color={colors.primary} size={20} />
        </View>
        <View style={styles.helpTextCol}>
          <Text style={[styles.helpTitle, { color: colors.textPrimary }]}>Need help using GeM?</Text>
          <Text style={[styles.helpSubtitle, { color: colors.textSecondary }]}>
            Browse manuals, FAQs, LMS courses, and official toll-free support.
          </Text>
          <View style={{ marginTop: 8 }}>
            <PrimaryButton
              label="Help & Resources"
              onPress={() => onNavigateTab('HELP')}
              style={{ paddingVertical: 8, alignSelf: 'flex-start' }}
            />
          </View>
        </View>
      </View>

      {/* Edit Radar Configuration Modal */}
      <Modal
        visible={showRadarModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRadarModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowRadarModal(false)} />
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.surface, borderTopColor: colors.border },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Edit Business Tender Radar
                </Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  Choose up to 6 keywords · Stored privately on your phone
                </Text>
              </View>
              <Pressable onPress={() => setShowRadarModal(false)} hitSlop={10}>
                <Text style={[styles.modalClose, { color: colors.textMuted }]}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalLabel, { color: colors.textPrimary }]}>
                Active Keywords ({editKeywords.length}/6)
              </Text>
              <View style={styles.presetChipsWrap}>
                {editKeywords.map((kw) => (
                  <Pressable
                    key={kw}
                    onPress={() => toggleEditKeyword(kw)}
                    style={[
                      styles.presetChip,
                      { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                  >
                    <Text style={[styles.presetChipText, { color: colors.textInverse }]}>
                      {kw} ✕
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={[styles.customInputRow, { marginTop: 10 }]}>
                <TextInput
                  style={[
                    styles.customKeywordInput,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.borderSubtle,
                      color: colors.textPrimary,
                    },
                  ]}
                  placeholder="Add keyword (e.g. Transformer, Catering)"
                  placeholderTextColor={colors.textMuted}
                  value={editCustomInput}
                  onChangeText={setEditCustomInput}
                  onSubmitEditing={addEditCustomKeyword}
                  returnKeyType="done"
                />
                <Pressable
                  onPress={addEditCustomKeyword}
                  style={[styles.addKwBtn, { backgroundColor: colors.primaryTint }]}
                >
                  <Text style={[styles.addKwBtnText, { color: colors.primary }]}>Add</Text>
                </Pressable>
              </View>

              <Text style={[styles.modalLabel, { color: colors.textPrimary, marginTop: 14 }]}>
                Popular Suggestions
              </Text>
              <View style={styles.presetChipsWrap}>
                {SUGGESTED_RADAR_KEYWORDS.map((kw) => {
                  const selected = editKeywords.some((k) => k.toLowerCase() === kw.toLowerCase());
                  return (
                    <Pressable
                      key={kw}
                      onPress={() => toggleEditKeyword(kw)}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: selected ? colors.primaryTint : colors.surfaceSubtle,
                          borderColor: selected ? colors.primary : colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          { color: selected ? colors.primary : colors.textPrimary },
                        ]}
                      >
                        {selected ? `✓ ${kw}` : `+ ${kw}`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.modalLabel, { color: colors.textPrimary, marginTop: 14 }]}>
                Tender Type Preference
              </Text>
              <View style={styles.presetChipsWrap}>
                {(
                  [
                    { id: 'all', label: 'All (Goods & Services)' },
                    { id: 'product', label: 'Goods Only' },
                    { id: 'service', label: 'Services Only' },
                  ] as const
                ).map((opt) => (
                  <CompactChip
                    key={opt.id}
                    label={opt.label}
                    selected={editVehicle === opt.id}
                    onPress={() => setEditVehicle(opt.id)}
                  />
                ))}
              </View>

              <View style={{ marginTop: 12, marginBottom: 16 }}>
                <CompactChip
                  label="High Value Only (≥ ₹2 Crore)"
                  selected={editHighValue}
                  onPress={() => setEditHighValue((p) => !p)}
                />
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.borderSubtle }]}>
              <SecondaryButton
                label="Clear All"
                onPress={() => setEditKeywords([])}
                style={{ flex: 0.8 }}
              />
              <PrimaryButton
                label="Save & Update Radar"
                onPress={saveEditedRadar}
                style={{ flex: 1.5 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: DESIGN_TOKENS.pagePaddingMobile, paddingBottom: 40 },
  welcomeSection: { marginTop: 4, marginBottom: 12 },
  welcomeTitle: { fontWeight: '800', letterSpacing: -0.4, marginBottom: 3 },
  welcomeSubtitle: { lineHeight: 19 },
  searchSection: { marginBottom: 16 },
  pillScrollView: { marginTop: 10 },
  pillContainer: { flexDirection: 'row' },
  sectionBlock: { marginBottom: 18 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  sectionTitleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  miniIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleText: { fontSize: 15, fontWeight: '800' },
  tinyActionPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minHeight: 30,
    justifyContent: 'center',
  },
  tinyActionText: { fontSize: 11.5, fontWeight: '800' },
  watchedCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  watchedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  watchedTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  watchedBidNum: { fontSize: 11.5, fontWeight: '700', flexShrink: 1 },
  countdownChip: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  countdownChipText: { fontSize: 10.5, fontWeight: '800' },
  corrigAlertPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginBottom: 6,
  },
  corrigDot: { width: 6, height: 6, borderRadius: 3 },
  corrigAlertText: { fontSize: 11, fontWeight: '700', flex: 1 },
  watchedTitle: { fontSize: 13.5, fontWeight: '700', lineHeight: 18.5, marginBottom: 3 },
  watchedDept: { fontSize: 11.5, marginBottom: 10 },
  watchedActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  watchedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 36,
  },
  watchedBtnText: { fontSize: 12, fontWeight: '800' },
  unwatchBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unwatchText: { fontSize: 13, fontWeight: '700' },
  radarSetupCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  radarAccentBar: { height: 4, width: '100%' },
  radarSetupInner: { padding: 14 },
  radarHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  radarIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarCardTitle: { fontSize: 15.5, fontWeight: '800' },
  radarCardSub: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  presetChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  presetChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  presetChipText: { fontSize: 12, fontWeight: '700' },
  customInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  customKeywordInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 8,
    fontSize: 13,
    minHeight: 40,
  },
  addKwBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addKwBtnText: { fontSize: 12.5, fontWeight: '800' },
  draftSummaryText: { fontSize: 11.5, fontWeight: '700', marginTop: 8 },
  radarLiveCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  radarLiveHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  radarLiveSub: { fontSize: 11.5, marginTop: 2 },
  newBadgePill: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  newBadgeText: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.4 },
  radarTabsRow: { flexDirection: 'row', gap: 7, paddingBottom: 10 },
  radarKwTab: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  radarKwTabText: { fontSize: 11.5, fontWeight: '700' },
  radarEmptyBox: { alignItems: 'center', paddingVertical: 18 },
  radarEmptyText: { fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
  radarListWrap: { marginTop: 2 },
  radarBidRow: { paddingVertical: 11 },
  radarBidTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 5,
  },
  radarBidTagsLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  newTagMini: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  newTagMiniText: { fontSize: 9, fontWeight: '900' },
  kwMatchPill: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  kwMatchPillText: { fontSize: 10, fontWeight: '800' },
  radarBidNum: { fontSize: 11, fontWeight: '600', flexShrink: 1 },
  watchStarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  watchStarText: { fontSize: 10.5, fontWeight: '700' },
  radarBidTitle: { fontSize: 13.5, fontWeight: '700', lineHeight: 18.5, marginBottom: 4 },
  radarBidMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  radarBidDept: { fontSize: 11.5, flex: 1 },
  radarBidCountdown: { fontSize: 11, fontWeight: '800' },
  radarFooterLink: {
    marginTop: 6,
    paddingTop: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  radarFooterLinkText: { fontSize: 12.5, fontWeight: '800' },
  quickAccessSection: { marginBottom: 18 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  quickCard: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 13,
    marginBottom: 10,
  },
  quickIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  quickCardTitle: { fontSize: 13.5, fontWeight: '700', marginBottom: 2 },
  quickCardSubtitle: { fontSize: 11 },
  workspaceCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  workspaceCopy: { marginBottom: 12 },
  workspaceEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  workspaceTitle: { fontSize: 15.5, fontWeight: '800', marginTop: 3 },
  workspaceSubtitle: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  workspaceActionsRow: { flexDirection: 'row', gap: 10 },
  categoriesSection: { marginBottom: 18 },
  categoryList: { gap: 8 },
  categoryRowItem: {
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  categoryIconSquare: {
    width: 40,
    height: 40,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryCode: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  categoryInfo: { flex: 1 },
  categoryName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  categoryDesc: { fontSize: 11.5 },
  categoryEndCol: { flexDirection: 'row', alignItems: 'center' },
  categoryCount: { fontSize: 11, marginRight: 6 },
  chevronText: { fontSize: 18, fontWeight: '600' },
  opportunitiesSection: { marginBottom: 18 },
  opportunityCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  oppHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  oppBidNum: { fontSize: 11.5, fontWeight: '600', flex: 1 },
  oppTitle: { fontWeight: '700', marginBottom: 4, lineHeight: 18.5 },
  oppDept: { fontSize: 12, marginBottom: 10 },
  oppMetaGrid: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 10,
    justifyContent: 'space-between',
  },
  oppMetaCol: { flex: 1 },
  oppMetaLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4, marginBottom: 2 },
  oppMetaVal: { fontSize: 12, fontWeight: '700' },
  helpCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
  },
  helpIconSquare: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  helpTextCol: { flex: 1 },
  helpTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  helpSubtitle: { fontSize: 12, lineHeight: 17 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    maxHeight: '84%',
    paddingBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  modalTitle: { fontSize: 15.5, fontWeight: '800' },
  modalSub: { fontSize: 11.5, marginTop: 2 },
  modalClose: { fontSize: 18, fontWeight: '700' },
  modalBody: { paddingHorizontal: 16, paddingTop: 12 },
  modalLabel: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
