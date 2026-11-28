import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Linking,
  Modal,
  NativeModules,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  GeMServicesClient,
  filterAndSortServiceSellers,
  parseNumericProjectValue,
  type LiveGeMServiceDetail,
  type LiveGeMServiceSeller,
  type LiveGeMServiceSellerDetail,
  type ServiceSellerFilterMode,
} from '../services/GeMServicesClient';
import { GeMLiveSyncService } from '../services/GeMLiveSyncService';
import type { DeconstructedBidDoc } from '../types/index';
import { useTheme } from '../theme/ThemeContext';
import { AppIcon } from '../components/AppIcons';
import { CompactChip, SearchField } from '../components/SharedUI';
import { formatDateSafe, formatInr, formatLakhs } from '../utils/formatters';
import { BidInspectorScreen } from './BidInspectorScreen';
import { BidDocumentViewer } from './BidDocumentViewer';

function copyToClipboardSafe(value: string): boolean {
  try {
    const nativeClipboard = NativeModules?.Clipboard || NativeModules?.RNCClipboard;
    if (nativeClipboard && typeof nativeClipboard.setString === 'function') {
      nativeClipboard.setString(value);
      return true;
    }
  } catch {
    // Fallback handled by caller
  }
  return false;
}

export interface ActiveServiceTarget {
  gemServiceId: string;
  name: string;
  category?: string;
  gfrMode?: string;
  searchHint?: string;
  imageUrl?: string;
}

interface ServiceDetailModalProps {
  service: ActiveServiceTarget | null;
  visible: boolean;
  onClose: () => void;
  onPrepareDocuments?: (bid: DeconstructedBidDoc) => void;
}

type DetailTab = 'PROVIDERS' | 'TENDERS' | 'SPECS';

export const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({
  service,
  visible,
  onClose,
  onPrepareDocuments,
}) => {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<DetailTab>('PROVIDERS');
  const [detail, setDetail] = useState<LiveGeMServiceDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [sellers, setSellers] = useState<LiveGeMServiceSeller[]>([]);
  const [sellersTotal, setSellersTotal] = useState(0);
  const [sellersCachedAtUtc, setSellersCachedAtUtc] = useState<string | null>(null);
  const [sellersServedFromCache, setSellersServedFromCache] = useState(false);
  const [hasRefetchedLiveThisSession, setHasRefetchedLiveThisSession] = useState(false);
  const [refetchReasonQuery, setRefetchReasonQuery] = useState<string | null>(null);
  const [isLoadingSellers, setIsLoadingSellers] = useState(false);
  const [isSyncingAllSellers, setIsSyncingAllSellers] = useState(false);
  const [sellerSearchInput, setSellerSearchInput] = useState('');
  const [sellerSearchQuery, setSellerSearchQuery] = useState('');
  const [sellerFilterMode, setSellerFilterMode] = useState<ServiceSellerFilterMode>('ALL');
  const activeFetchRunRef = useRef(0);

  const [selectedSeller, setSelectedSeller] = useState<LiveGeMServiceSeller | null>(null);
  const [sellerDetail, setSellerDetail] = useState<LiveGeMServiceSellerDetail | null>(null);
  const [isLoadingSellerDetail, setIsLoadingSellerDetail] = useState(false);
  const [copiedSellerId, setCopiedSellerId] = useState(false);

  const [tenders, setTenders] = useState<DeconstructedBidDoc[]>([]);
  const [tendersTotal, setTendersTotal] = useState(0);
  const [isLoadingTenders, setIsLoadingTenders] = useState(false);
  const [inspectBid, setInspectBid] = useState<DeconstructedBidDoc | null>(null);
  const [viewerBid, setViewerBid] = useState<DeconstructedBidDoc | null>(null);

  const [slaExpanded, setSlaExpanded] = useState(false);

  useEffect(() => {
    if (!service || !visible) return;
    let cancelled = false;
    const runId = ++activeFetchRunRef.current;

    const memCached = GeMServicesClient.getCachedAllServiceSellers(service.gemServiceId);
    const hasMemComplete = Boolean(memCached && memCached.isComplete && memCached.sellers.length > 0);

    setActiveTab('PROVIDERS');
    setDetail(null);
    setSellers(memCached ? memCached.sellers : []);
    setSellersTotal(memCached ? memCached.total : 0);
    setSellersCachedAtUtc(memCached?.cachedAtUtc ?? null);
    setSellersServedFromCache(hasMemComplete);
    setHasRefetchedLiveThisSession(false);
    setRefetchReasonQuery(null);
    setIsLoadingSellers(!memCached);
    setIsSyncingAllSellers(false);
    setSellerSearchInput('');
    setSellerSearchQuery('');
    setSellerFilterMode('ALL');
    setSelectedSeller(null);
    setSellerDetail(null);
    setIsLoadingSellerDetail(false);
    setCopiedSellerId(false);
    setTenders([]);
    setTendersTotal(0);
    setSlaExpanded(false);
    setInspectBid(null);
    setViewerBid(null);

    setIsLoadingDetail(true);
    GeMServicesClient.fetchServiceDetail(service.gemServiceId)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDetail(false);
      });

    if (!hasMemComplete) {
      (async () => {
        // Hydrate persisted on-device cache first — 0 network calls when complete cache exists!
        const diskCached = await GeMServicesClient.loadCachedServiceSellers(service.gemServiceId);
        if (cancelled || activeFetchRunRef.current !== runId) return;

        if (diskCached && diskCached.sellers.length > 0) {
          setSellers(diskCached.sellers);
          setSellersTotal(diskCached.total);
          setSellersCachedAtUtc(diskCached.cachedAtUtc);
          setIsLoadingSellers(false);
          if (diskCached.isComplete) {
            setSellersServedFromCache(true);
            setIsSyncingAllSellers(false);
            return;
          }
        }

        // Only fetch live when no complete on-device cache exists yet
        setIsSyncingAllSellers(true);
        const result = await GeMServicesClient.fetchAllServiceSellers(service.gemServiceId, {
          isCancelled: () => cancelled || activeFetchRunRef.current !== runId,
          onProgress: (nextSellers, total, isComplete, cachedAt) => {
            if (cancelled || activeFetchRunRef.current !== runId) return;
            setSellers(nextSellers);
            setSellersTotal(total);
            if (cachedAt) setSellersCachedAtUtc(cachedAt);
            setIsLoadingSellers(false);
            setIsSyncingAllSellers(!isComplete);
          },
        });
        if (!cancelled && activeFetchRunRef.current === runId) {
          setSellersCachedAtUtc(result.cachedAtUtc);
          setSellersServedFromCache(false);
          setHasRefetchedLiveThisSession(true);
          setIsLoadingSellers(false);
          setIsSyncingAllSellers(false);
        }
      })().catch(() => {
        if (!cancelled && activeFetchRunRef.current === runId) {
          setIsLoadingSellers(false);
          setIsSyncingAllSellers(false);
        }
      });
    }

    // Query live active Service Tenders on bidplus.gem.gov.in matching this service
    const cleanSearch =
      service.searchHint ||
      service.name
        .replace(/\(.*?\)/g, '')
        .replace(/Services?\s*-\s*/gi, ' ')
        .trim()
        .split(/\s+/)
        .slice(0, 3)
        .join(' ');

    setIsLoadingTenders(true);
    GeMLiveSyncService.queryLivePortal({
      page: 1,
      searchBid: cleanSearch,
      searchType: 'fullText',
      bidStatusType: 'ongoing_bids',
      byType: 'service',
      sort: 'Bid-End-Date-Oldest',
    })
      .then(async (res) => {
        if (cancelled) return;
        if (res.bids.length > 0) {
          setTenders(res.bids);
          setTendersTotal(res.total);
          return;
        }
        // Fallback: broader live ongoing service tenders if narrow keyword has 0 live bids right now
        const broad = await GeMLiveSyncService.queryLivePortal({
          page: 1,
          bidStatusType: 'ongoing_bids',
          byType: 'service',
          sort: 'Bid-End-Date-Oldest',
        });
        if (!cancelled) {
          setTenders(broad.bids);
          setTendersTotal(broad.total);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTenders(false);
      });

    return () => {
      cancelled = true;
    };
  }, [service, visible]);

  const filteredSellers = useMemo(
    () => filterAndSortServiceSellers(sellers, sellerSearchQuery, sellerFilterMode),
    [sellers, sellerSearchQuery, sellerFilterMode]
  );

  const verifiedLoadedCount = useMemo(
    () =>
      sellers.filter(
        (s) => s.verifiedProjects > 0 || parseNumericProjectValue(s.totalValue) > 0
      ).length,
    [sellers]
  );

  const triggerLiveSellersRefetch = useCallback(
    (reasonQuery?: string) => {
      if (!service || isSyncingAllSellers) return;
      const runId = ++activeFetchRunRef.current;
      setRefetchReasonQuery(reasonQuery ?? null);
      setIsSyncingAllSellers(true);
      GeMServicesClient.fetchAllServiceSellers(service.gemServiceId, {
        forceRefresh: true,
        isCancelled: () => activeFetchRunRef.current !== runId,
        onProgress: (nextSellers, total, isComplete, cachedAt) => {
          if (activeFetchRunRef.current !== runId) return;
          setSellers(nextSellers);
          setSellersTotal(total);
          if (cachedAt) setSellersCachedAtUtc(cachedAt);
          setIsLoadingSellers(false);
          setIsSyncingAllSellers(!isComplete);
        },
      })
        .then((result) => {
          if (activeFetchRunRef.current !== runId) return;
          setSellersCachedAtUtc(result.cachedAtUtc);
          setSellersServedFromCache(false);
          setHasRefetchedLiveThisSession(true);
          setRefetchReasonQuery(null);
          setIsSyncingAllSellers(false);
        })
        .catch(() => {
          if (activeFetchRunRef.current !== runId) return;
          setRefetchReasonQuery(null);
          setIsSyncingAllSellers(false);
        });
    },
    [service, isSyncingAllSellers]
  );

  const handleApplySellerSearch = useCallback(() => {
    Keyboard.dismiss();
    const trimmed = sellerSearchInput.trim();
    setSellerSearchQuery(trimmed);

    // Cache-first search: only refetch live from GeM when the searched provider is NOT in cache
    if (trimmed.length >= 2 && !isSyncingAllSellers && !hasRefetchedLiveThisSession) {
      const cacheMatches = filterAndSortServiceSellers(sellers, trimmed, 'ALL');
      if (cacheMatches.length === 0) {
        triggerLiveSellersRefetch(trimmed);
      }
    }
  }, [
    sellerSearchInput,
    sellers,
    isSyncingAllSellers,
    hasRefetchedLiveThisSession,
    triggerLiveSellersRefetch,
  ]);

  const handleOpenSellerDetail = useCallback(
    (seller: LiveGeMServiceSeller) => {
      if (!service) return;
      setSelectedSeller(seller);
      setSellerDetail(null);
      setCopiedSellerId(false);
      setIsLoadingSellerDetail(true);
      GeMServicesClient.fetchServiceSellerDetail(service.gemServiceId, seller.sellerId)
        .then((res) => {
          setSellerDetail(res);
        })
        .finally(() => {
          setIsLoadingSellerDetail(false);
        });
    },
    [service]
  );

  const renderSellerItem = useCallback(
    ({ item: seller }: { item: LiveGeMServiceSeller }) => {
      const projectValInr = parseNumericProjectValue(seller.totalValue);
      return (
        <Pressable
          onPress={() => handleOpenSellerDetail(seller)}
          style={({ pressed }) => [
            styles.sellerRow,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.78 : 1,
            },
          ]}
          accessibilityLabel={`Inspect details for ${seller.name}`}
        >
          <View style={[styles.sellerInitialCircle, { backgroundColor: colors.primaryTint }]}>
            <Text style={[styles.sellerInitialText, { color: colors.primary }]}>
              {seller.name.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sellerName, { color: colors.textPrimary }]} numberOfLines={2}>
              {seller.name}
            </Text>
            <Text style={[styles.sellerMeta, { color: colors.textSecondary }]}>
              GeM Seller ID: {seller.sellerId}
              {seller.verifiedProjects > 0
                ? ` · ${seller.verifiedProjects} verified project${seller.verifiedProjects === 1 ? '' : 's'}`
                : ' · Registered Provider'}
            </Text>
            {projectValInr > 0 ? (
              <View style={styles.sellerValueRow}>
                <View style={[styles.sellerValuePill, { backgroundColor: colors.successTint }]}>
                  <Text style={[styles.sellerValuePillText, { color: colors.success }]}>
                    Approved Value: {formatLakhs(projectValInr)}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
          <View style={styles.sellerRightCol}>
            <View style={[styles.verifiedTag, { backgroundColor: colors.successTint }]}>
              <Text style={[styles.verifiedTagText, { color: colors.success }]}>LIVE</Text>
            </View>
            <Text style={[styles.sellerChevron, { color: colors.textMuted }]}>›</Text>
          </View>
        </Pressable>
      );
    },
    [colors, handleOpenSellerDetail]
  );

  const handleCopySellerId = useCallback((sellerId: string) => {
    const ok = copyToClipboardSafe(sellerId);
    if (ok) {
      setCopiedSellerId(true);
      setTimeout(() => setCopiedSellerId(false), 2000);
    } else {
      void Share.share({ message: `GeM Seller ID: ${sellerId}` }).catch(() => undefined);
    }
  }, []);

  const handleShareSeller = useCallback(
    (seller: LiveGeMServiceSeller, liveDetail: LiveGeMServiceSellerDetail | null) => {
      if (!service) return;
      const projects = liveDetail?.totalVerifiedProjects ?? seller.verifiedProjects;
      const valueInr =
        liveDetail?.totalProjectValueInr ?? parseNumericProjectValue(seller.totalValue);
      const portal = detail?.portalUrl || GeMServicesClient.buildPortalUrl(service.gemServiceId);
      const lines = [
        `GeM Service Provider: ${seller.name}`,
        `GeM Seller ID: ${seller.sellerId}`,
        `Service: ${detail?.displayName || service.name}`,
        `Verified Projects on GeM: ${projects}`,
        valueInr > 0 ? `Approved Project Value: ${formatLakhs(valueInr)} (₹${formatInr(valueInr)})` : null,
        `Official GeM Catalog: ${portal}`,
      ].filter(Boolean);
      void Share.share({ message: lines.join('\n') }).catch(() => undefined);
    },
    [service, detail]
  );

  if (!service) return null;

  const heroImage = detail?.imageUrl || service.imageUrl;
  const portalUrl = detail?.portalUrl || GeMServicesClient.buildPortalUrl(service.gemServiceId);
  const providerCount = sellersTotal || detail?.totalCatalogCount || sellers.length;

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          if (selectedSeller) {
            setSelectedSeller(null);
          } else {
            onClose();
          }
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
          <StatusBar
            barStyle={isDark ? 'light-content' : 'dark-content'}
            backgroundColor={colors.surface}
          />
          <View style={[styles.root, { backgroundColor: colors.background }]}>
            {/* Slim Frameless Top Bar (matches BidInspectorScreen in Light & Dark Mode) */}
            <View
              style={[
                styles.headerBar,
                { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle },
              ]}
            >
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.headerBtn,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                  pressed && { opacity: 0.75 },
                ]}
                hitSlop={8}
                accessibilityLabel="Close service details"
              >
                <Text style={[styles.headerBackIcon, { color: colors.textPrimary }]}>←</Text>
              </Pressable>
              <View style={styles.headerCopy}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {detail?.displayName || service.name}
                </Text>
                <Text style={[styles.headerSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {service.category || 'GeM Live Service'}
                  {detail?.versionNumber ? ` · v${detail.versionNumber}` : ''}
                </Text>
              </View>
              <Pressable
                onPress={() => Linking.openURL(portalUrl).catch(() => undefined)}
                style={({ pressed }) => [
                  styles.headerBtn,
                  { backgroundColor: colors.primaryTint, borderColor: 'transparent' },
                  pressed && { opacity: 0.75 },
                ]}
                hitSlop={8}
                accessibilityLabel="Open service page on GeM website"
              >
                <Text style={[styles.headerExternalIcon, { color: colors.primary }]}>↗</Text>
              </Pressable>
            </View>

            {/* Compact Overview Strip */}
            <View style={[styles.overviewStrip, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <View style={styles.overviewTop}>
                {heroImage ? (
                  <Image
                    source={{ uri: heroImage }}
                    style={[styles.heroThumb, { backgroundColor: colors.surfaceSubtle }]}
                    resizeMode="cover"
                  />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.serviceHeading, { color: colors.textPrimary }]} numberOfLines={2}>
                    {detail?.displayName || service.name}
                  </Text>
                  <View style={styles.metaPillsRow}>
                    {providerCount > 0 ? (
                      <View style={[styles.metaPillGreen, { backgroundColor: colors.successTint }]}>
                        <Text style={[styles.metaPillGreenText, { color: colors.success }]}>
                          {providerCount.toLocaleString('en-IN')} Providers
                        </Text>
                      </View>
                    ) : null}
                    <View style={[styles.metaPillSlate, { backgroundColor: colors.surfaceSubtle }]}>
                      <Text style={[styles.metaPillSlateText, { color: colors.textSecondary }]}>
                        {detail?.isBidOnly ? 'Bid Only' : service.gfrMode || 'Direct / L1 / Bid'}
                      </Text>
                    </View>
                    {detail?.raEnabled ? (
                      <View style={[styles.metaPillSlate, { backgroundColor: colors.surfaceSubtle }]}>
                        <Text style={[styles.metaPillSlateText, { color: colors.textSecondary }]}>RA Allowed</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* Underline Tabs */}
              <View style={styles.tabsRow}>
                {(
                  [
                    { id: 'PROVIDERS', label: providerCount > 0 ? `Providers (${providerCount.toLocaleString('en-IN')})` : 'Providers' },
                    { id: 'TENDERS', label: tendersTotal > 0 ? `Live Tenders (${tendersTotal.toLocaleString('en-IN')})` : 'Live Tenders' },
                    { id: 'SPECS', label: 'Specs & SLA' },
                  ] as const
                ).map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <Pressable
                      key={tab.id}
                      onPress={() => setActiveTab(tab.id)}
                      style={[styles.tabBtn, active && { borderBottomColor: colors.primary }]}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          { color: active ? colors.primary : colors.textSecondary },
                          active && styles.tabTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {tab.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Tab Content */}
            {activeTab === 'PROVIDERS' ? (
              <View style={styles.providersTabWrap}>
                {isLoadingSellers ? (
                  <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.centerTitle, { color: colors.textPrimary }]}>
                      Loading all live GeM providers…
                    </Text>
                    <Text style={[styles.centerSub, { color: colors.textSecondary }]}>
                      Fetching registered service providers directly from mkp.gem.gov.in
                    </Text>
                  </View>
                ) : sellers.length === 0 ? (
                  <View style={styles.providersEmptyPad}>
                    <View
                      style={[
                        styles.card,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.emptyHeading, { color: colors.textPrimary }]}>
                        {detail?.isCustomBidService
                          ? 'Custom Bid Service — Open Bidding Mode'
                          : 'No public catalog sellers listed for this service'}
                      </Text>
                      <Text style={[styles.bodyCopy, { color: colors.textSecondary }]}>
                        {detail?.isCustomBidService
                          ? 'Custom services on GeM are procured via open bids. Switch to the Live Tenders tab to inspect active tenders and PDFs inline.'
                          : 'This service uses tender-based selection. Check Live Tenders or Specs & SLA tabs for requirements.'}
                      </Text>
                      <Pressable
                        style={[styles.switchTabCta, { backgroundColor: colors.primary }]}
                        onPress={() => setActiveTab('TENDERS')}
                      >
                        <Text style={[styles.switchTabCtaText, { color: colors.textInverse }]}>
                          View Live Service Tenders →
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <>
                    {/* Pinned Search Bar + Filter Chips + Live Auto-Sync Progress */}
                    <View style={styles.providersStickyTop}>
                      <View style={styles.sellerSearchRow}>
                        <SearchField
                          value={sellerSearchInput}
                          onChangeText={(txt) => {
                            setSellerSearchInput(txt);
                            setSellerSearchQuery(txt.trim());
                          }}
                          onClear={() => {
                            setSellerSearchInput('');
                            setSellerSearchQuery('');
                          }}
                          onSubmit={handleApplySellerSearch}
                          placeholder="Search provider name or Seller ID…"
                          accessibilityLabel="Search service providers"
                          style={{ flex: 1 }}
                        />
                        <Pressable
                          onPress={handleApplySellerSearch}
                          style={({ pressed }) => [
                            styles.sellerSearchBtn,
                            { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
                          ]}
                          accessibilityLabel="Search service providers"
                        >
                          <AppIcon name="search" color={colors.textInverse} size={15} />
                          <Text style={[styles.sellerSearchBtnText, { color: colors.textInverse }]}>
                            Search
                          </Text>
                        </Pressable>
                      </View>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.sellerFilterRow}
                      >
                        <CompactChip
                          label={`All (${sellers.length.toLocaleString('en-IN')})`}
                          selected={sellerFilterMode === 'ALL'}
                          onPress={() => setSellerFilterMode('ALL')}
                        />
                        <CompactChip
                          label={`Verified Projects (${verifiedLoadedCount.toLocaleString('en-IN')})`}
                          selected={sellerFilterMode === 'VERIFIED'}
                          onPress={() => setSellerFilterMode('VERIFIED')}
                        />
                        <CompactChip
                          label="Highest Value"
                          selected={sellerFilterMode === 'HIGHEST_VALUE'}
                          onPress={() => setSellerFilterMode('HIGHEST_VALUE')}
                        />
                      </ScrollView>

                      {isSyncingAllSellers ? (
                        <View
                          style={[
                            styles.syncProgressBox,
                            { backgroundColor: colors.primaryTint, borderColor: colors.borderSubtle },
                          ]}
                        >
                          <View style={styles.syncProgressTopRow}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={[styles.syncProgressText, { color: colors.primary }]}>
                              {refetchReasonQuery
                                ? `“${refetchReasonQuery}” not in cache — refreshing GeM… `
                                : 'Fetching & caching providers from GeM… '}
                              {sellers.length.toLocaleString('en-IN')} /{' '}
                              {Math.max(sellersTotal, sellers.length).toLocaleString('en-IN')} (
                              {Math.min(
                                99,
                                Math.round(
                                  (sellers.length / Math.max(sellersTotal, sellers.length, 1)) * 100
                                )
                              )}
                              %)
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.syncProgressTrack,
                              { backgroundColor: colors.surface },
                            ]}
                          >
                            <View
                              style={[
                                styles.syncProgressFill,
                                {
                                  backgroundColor: colors.primary,
                                  width: `${Math.min(
                                    100,
                                    Math.max(
                                      4,
                                      Math.round(
                                        (sellers.length /
                                          Math.max(sellersTotal, sellers.length, 1)) *
                                          100
                                      )
                                    )
                                  )}%`,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      ) : (
                        <View style={styles.listIntroRow}>
                          <Text style={[styles.listIntro, { color: colors.textSecondary, flex: 1 }]}>
                            {sellerSearchQuery || sellerFilterMode !== 'ALL'
                              ? `${filteredSellers.length.toLocaleString('en-IN')} matched in ${sellersServedFromCache ? 'cached' : 'live'} ${sellers.length.toLocaleString('en-IN')} providers`
                              : sellersServedFromCache && sellersCachedAtUtc
                                ? `${sellers.length.toLocaleString('en-IN')} cached providers · Saved ${formatDateSafe(sellersCachedAtUtc)}`
                                : `All ${sellers.length.toLocaleString('en-IN')} providers cached on device · Tap any provider`}
                          </Text>
                          <Pressable
                            onPress={() => triggerLiveSellersRefetch()}
                            hitSlop={8}
                            style={({ pressed }) => [
                              styles.refreshCacheBtn,
                              {
                                backgroundColor: colors.surfaceSubtle,
                                borderColor: colors.borderSubtle,
                                opacity: pressed ? 0.7 : 1,
                              },
                            ]}
                            accessibilityLabel="Refresh provider list from GeM"
                          >
                            <Text style={[styles.refreshCacheBtnText, { color: colors.primary }]}>
                              Refresh ↻
                            </Text>
                          </Pressable>
                        </View>
                      )}
                    </View>

                    {/* Virtualized 60fps FlatList across all loaded providers */}
                    <FlatList
                      data={filteredSellers}
                      keyExtractor={(item) => item.sellerId}
                      renderItem={renderSellerItem}
                      contentContainerStyle={styles.providersListContent}
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                      initialNumToRender={16}
                      maxToRenderPerBatch={20}
                      windowSize={7}
                      removeClippedSubviews={true}
                      ListEmptyComponent={
                        isSyncingAllSellers ? (
                          <View
                            style={[
                              styles.card,
                              { backgroundColor: colors.surface, borderColor: colors.border },
                            ]}
                          >
                            <View style={styles.syncEmptyRow}>
                              <ActivityIndicator size="small" color={colors.primary} />
                              <Text style={[styles.emptyHeading, { color: colors.textPrimary, marginBottom: 0 }]}>
                                Searching all {Math.max(sellersTotal, sellers.length).toLocaleString('en-IN')} providers…
                              </Text>
                            </View>
                            <Text style={[styles.bodyCopy, { color: colors.textSecondary, marginTop: 6 }]}>
                              Scanned {sellers.length.toLocaleString('en-IN')} live GeM providers so
                              far. Matches for &ldquo;{sellerSearchQuery}&rdquo; will appear
                              automatically as GeM finishes streaming.
                            </Text>
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.card,
                              { backgroundColor: colors.surface, borderColor: colors.border },
                            ]}
                          >
                            <Text style={[styles.emptyHeading, { color: colors.textPrimary }]}>
                              No matching provider found
                            </Text>
                            <Text style={[styles.bodyCopy, { color: colors.textSecondary }]}>
                              Searched all {sellers.length.toLocaleString('en-IN')} live GeM
                              registered providers for this service. Try another spelling or clear
                              the filter.
                            </Text>
                            <View style={styles.emptyActionRow}>
                              {sellerSearchQuery ? (
                                <Pressable
                                  style={[
                                    styles.clearFilterBtn,
                                    {
                                      borderColor: colors.primary,
                                      backgroundColor: colors.primary,
                                    },
                                  ]}
                                  onPress={() => triggerLiveSellersRefetch(sellerSearchQuery)}
                                >
                                  <Text
                                    style={[
                                      styles.clearFilterBtnText,
                                      { color: colors.textInverse },
                                    ]}
                                  >
                                    Check Live GeM ↻
                                  </Text>
                                </Pressable>
                              ) : null}
                              <Pressable
                                style={[
                                  styles.clearFilterBtn,
                                  {
                                    borderColor: colors.border,
                                    backgroundColor: colors.surfaceSubtle,
                                  },
                                ]}
                                onPress={() => {
                                  setSellerSearchInput('');
                                  setSellerSearchQuery('');
                                  setSellerFilterMode('ALL');
                                }}
                              >
                                <Text
                                  style={[styles.clearFilterBtnText, { color: colors.textPrimary }]}
                                >
                                  Clear Filter
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        )
                      }
                    />
                  </>
                )}
              </View>
            ) : (
              <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {activeTab === 'TENDERS' && (
                <View>
                  {isLoadingTenders ? (
                    <View style={styles.centerBox}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={[styles.centerTitle, { color: colors.textPrimary }]}>
                        Searching live service bids…
                      </Text>
                      <Text style={[styles.centerSub, { color: colors.textSecondary }]}>
                        Querying bidplus.gem.gov.in directly for active service tenders
                      </Text>
                    </View>
                  ) : tenders.length === 0 ? (
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.emptyHeading, { color: colors.textPrimary }]}>
                        No active service bids matched right now
                      </Text>
                      <Text style={[styles.bodyCopy, { color: colors.textSecondary }]}>
                        Check back later or inspect the Specs &amp; SLA tab for GeM's contract terms.
                      </Text>
                    </View>
                  ) : (
                    tenders.map((bid) => (
                      <View
                        key={`${bid.bidNumber}-${bid.b_id || ''}`}
                        style={[styles.tenderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      >
                        <View style={styles.tenderTopRow}>
                          <Text style={[styles.tenderNum, { color: colors.primary }]}>{bid.bidNumber}</Text>
                          <Text style={[styles.tenderClose, { color: colors.textSecondary }]}>
                            Closes {formatDateSafe(bid.closingTimeUtc)}
                          </Text>
                        </View>
                        <Text style={[styles.tenderTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                          {bid.title}
                        </Text>
                        <Text style={[styles.tenderDept, { color: colors.textSecondary }]} numberOfLines={1}>
                          {bid.department}
                        </Text>
                        <View style={styles.tenderActions}>
                          <Pressable
                            style={[styles.tenderSecBtn, { borderColor: colors.border }]}
                            onPress={() => setViewerBid(bid)}
                          >
                            <Text style={[styles.tenderSecBtnText, { color: colors.textPrimary }]}>
                              Read PDF Inline
                            </Text>
                          </Pressable>
                          <Pressable
                            style={[styles.tenderPriBtn, { backgroundColor: colors.primary }]}
                            onPress={() => setInspectBid(bid)}
                          >
                            <Text style={[styles.tenderPriBtnText, { color: colors.textInverse }]}>
                              Inspect Fundamentals
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}

              {activeTab === 'SPECS' && (
                <View>
                  {isLoadingDetail ? (
                    <View style={styles.centerBox}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={[styles.centerTitle, { color: colors.textPrimary }]}>
                        Loading official GeM specifications…
                      </Text>
                    </View>
                  ) : !detail ? (
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.emptyHeading, { color: colors.textPrimary }]}>
                        Specifications temporarily unavailable
                      </Text>
                      <Text style={[styles.bodyCopy, { color: colors.textSecondary }]}>
                        Check your connection or view the official GeM service sheet via the top-right link.
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* Contract Rules Grid */}
                      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                          Contract &amp; SLA Parameters
                        </Text>
                        <View style={styles.ruleGrid}>
                          <RuleCell
                            label="MIN CONTRACT"
                            value={detail.minContractDays ? `${detail.minContractDays} Days` : 'Flexible'}
                            colors={colors}
                          />
                          <RuleCell
                            label="MAX CONTRACT"
                            value={detail.maxContractDays ? `${detail.maxContractDays} Days` : 'As per Bid'}
                            colors={colors}
                          />
                          <RuleCell
                            label="LEAD TIME"
                            value={detail.serviceLeadDays ? `${detail.serviceLeadDays} Days` : 'Immediate'}
                            colors={colors}
                          />
                          <RuleCell
                            label="AUTO-CRAC"
                            value={detail.autoCracDays ? `${detail.autoCracDays} Days` : '10 Days (Std)'}
                            colors={colors}
                          />
                          <RuleCell
                            label="PROCUREMENT MODE"
                            value={detail.isBidOnly ? 'Bid Mandatory' : 'Direct / L1 / Bid'}
                            colors={colors}
                          />
                          <RuleCell
                            label="SPLITTING / QCBS"
                            value={`${detail.splittingEnabled ? 'Split Allowed' : 'Single Award'}${detail.qcbsRequired ? ' · QCBS' : ''}`}
                            colors={colors}
                          />
                        </View>
                      </View>

                      {/* Overview Description */}
                      {detail.description ? (
                        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Scope Overview</Text>
                          <Text style={[styles.bodyCopy, { color: colors.textSecondary }]}>
                            {detail.description}
                          </Text>
                        </View>
                      ) : null}

                      {/* Core Specification Parameters */}
                      {detail.coreParameters.length > 0 ? (
                        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                            Core Service Parameters ({detail.coreParameters.length})
                          </Text>
                          {detail.coreParameters.map((param) => (
                            <View
                              key={param.name}
                              style={[styles.paramBlock, { borderTopColor: colors.border }]}
                            >
                              <Text style={[styles.paramName, { color: colors.textPrimary }]}>
                                {param.name}
                              </Text>
                              {param.options.length > 0 ? (
                                <View style={styles.paramChips}>
                                  {param.options.map((opt) => (
                                    <View
                                      key={opt}
                                      style={[styles.paramChip, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                                    >
                                      <Text style={[styles.paramChipText, { color: colors.textSecondary }]}>
                                        {opt}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              ) : null}
                            </View>
                          ))}
                        </View>
                      ) : null}

                      {/* Official Service STC / SLA Clauses */}
                      {detail.slaText ? (
                        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                          <View style={styles.slaHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
                              Official GeM Service STC / SLA
                            </Text>
                            <Pressable onPress={() => setSlaExpanded((prev) => !prev)} hitSlop={8}>
                              <Text style={[styles.slaToggle, { color: colors.primary }]}>
                                {slaExpanded ? 'Collapse' : 'Read full'}
                              </Text>
                            </Pressable>
                          </View>
                          <Text
                            style={[styles.slaCopy, { color: colors.textSecondary }]}
                            numberOfLines={slaExpanded ? undefined : 14}
                          >
                            {detail.slaText}
                          </Text>
                        </View>
                      ) : null}
                    </>
                  )}
                </View>
              )}
              </ScrollView>
            )}

            {/* In-Modal Service Provider Details Sheet (works cleanly on both iOS & Android) */}
            {selectedSeller ? (
              <View style={styles.sheetOverlay}>
                <Pressable
                  style={styles.sheetBackdrop}
                  onPress={() => setSelectedSeller(null)}
                  accessibilityLabel="Dismiss provider details"
                />
                <View
                  style={[
                    styles.sheetSurface,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
                  <View style={styles.sheetHeaderRow}>
                    <View
                      style={[
                        styles.sellerInitialCircle,
                        { backgroundColor: colors.primaryTint, width: 42, height: 42 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sellerInitialText,
                          { color: colors.primary, fontSize: 14 },
                        ]}
                      >
                        {selectedSeller.name.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.sheetSellerName, { color: colors.textPrimary }]}
                        numberOfLines={2}
                      >
                        {selectedSeller.name}
                      </Text>
                      <View style={styles.sheetIdRow}>
                        <Text style={[styles.sheetSellerId, { color: colors.textSecondary }]}>
                          GeM Seller ID: {selectedSeller.sellerId}
                        </Text>
                        <Pressable
                          onPress={() => handleCopySellerId(selectedSeller.sellerId)}
                          style={[
                            styles.copyIdPill,
                            {
                              backgroundColor: copiedSellerId
                                ? colors.successTint
                                : colors.primaryTint,
                            },
                          ]}
                          hitSlop={8}
                          accessibilityLabel="Copy GeM Seller ID"
                        >
                          <Text
                            style={[
                              styles.copyIdText,
                              { color: copiedSellerId ? colors.success : colors.primary },
                            ]}
                          >
                            {copiedSellerId ? 'Copied ✓' : 'Copy ID'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => setSelectedSeller(null)}
                      style={[
                        styles.sheetCloseBtn,
                        { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                      ]}
                      hitSlop={8}
                      accessibilityLabel="Close provider details"
                    >
                      <Text style={[styles.sheetCloseText, { color: colors.textSecondary }]}>✕</Text>
                    </Pressable>
                  </View>

                  <ScrollView
                    style={styles.sheetScroll}
                    contentContainerStyle={styles.sheetScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* Registered Service Context */}
                    <View
                      style={[
                        styles.sheetContextStrip,
                        { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                      ]}
                    >
                      <Text style={[styles.sheetContextLabel, { color: colors.textMuted }]}>
                        REGISTERED SERVICE CATALOG
                      </Text>
                      <Text style={[styles.sheetContextValue, { color: colors.textPrimary }]}>
                        {detail?.displayName || service.name}
                      </Text>
                    </View>

                    {isLoadingSellerDetail ? (
                      <View style={styles.sheetLoadingBox}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={[styles.sheetLoadingText, { color: colors.textSecondary }]}>
                          Fetching live GeM credentials from mkp.gem.gov.in…
                        </Text>
                      </View>
                    ) : null}

                    {/* Verified Projects & Approved Value KPIs */}
                    {(() => {
                      const verifiedCount =
                        sellerDetail?.totalVerifiedProjects ?? selectedSeller.verifiedProjects;
                      const approvedValueInr =
                        sellerDetail?.totalProjectValueInr ??
                        parseNumericProjectValue(selectedSeller.totalValue);
                      const certificates = sellerDetail?.certificates ?? [];

                      return (
                        <>
                          <View style={styles.sheetKpiRow}>
                            <View
                              style={[
                                styles.sheetKpiCard,
                                {
                                  backgroundColor: colors.surfaceSubtle,
                                  borderColor: colors.borderSubtle,
                                },
                              ]}
                            >
                              <Text style={[styles.ruleLabel, { color: colors.textMuted }]}>
                                VERIFIED PROJECTS
                              </Text>
                              <Text
                                style={[
                                  styles.sheetKpiValue,
                                  {
                                    color:
                                      verifiedCount > 0 ? colors.success : colors.textPrimary,
                                  },
                                ]}
                              >
                                {verifiedCount.toLocaleString('en-IN')}
                              </Text>
                              <Text style={[styles.sheetKpiSub, { color: colors.textSecondary }]}>
                                {verifiedCount > 0
                                  ? 'Approved on GeM'
                                  : 'None published yet'}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.sheetKpiCard,
                                {
                                  backgroundColor: colors.surfaceSubtle,
                                  borderColor: colors.borderSubtle,
                                },
                              ]}
                            >
                              <Text style={[styles.ruleLabel, { color: colors.textMuted }]}>
                                APPROVED VALUE
                              </Text>
                              <Text
                                style={[
                                  styles.sheetKpiValue,
                                  {
                                    color:
                                      approvedValueInr > 0 ? colors.primary : colors.textMuted,
                                  },
                                ]}
                              >
                                {approvedValueInr > 0
                                  ? formatLakhs(approvedValueInr)
                                  : 'Not published'}
                              </Text>
                              <Text style={[styles.sheetKpiSub, { color: colors.textSecondary }]}>
                                {approvedValueInr > 0
                                  ? `₹${formatInr(approvedValueInr)}`
                                  : 'No value disclosed'}
                              </Text>
                            </View>
                          </View>

                          {/* Compliance Certificates */}
                          <View style={styles.sheetSectionBlock}>
                            <Text style={[styles.sheetSectionHeading, { color: colors.textPrimary }]}>
                              Compliance Certificates
                            </Text>
                            {certificates.length > 0 ? (
                              <View style={styles.paramChips}>
                                {certificates.map((cert) => (
                                  <View
                                    key={cert.category}
                                    style={[
                                      styles.certChip,
                                      {
                                        backgroundColor: colors.primaryTint,
                                        borderColor: colors.primary,
                                      },
                                    ]}
                                  >
                                    <Text style={[styles.certChipText, { color: colors.primary }]}>
                                      {cert.category} ({cert.count})
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            ) : (
                              <Text style={[styles.sheetEmptyNote, { color: colors.textSecondary }]}>
                                No public compliance certificates are exposed by GeM for this
                                service provider.
                              </Text>
                            )}
                          </View>

                          {/* Honest Portal Privacy Notice */}
                          <View
                            style={[
                              styles.privacyNoticeBox,
                              {
                                backgroundColor: colors.surfaceSubtle,
                                borderColor: colors.borderSubtle,
                              },
                            ]}
                          >
                            <Text style={[styles.privacyNoticeText, { color: colors.textSecondary }]}>
                              GeM does not publish provider phone numbers, email addresses, or
                              street addresses on public endpoints. Sign in on GeM to engage
                              providers via official direct purchase or bidding.
                            </Text>
                          </View>
                        </>
                      );
                    })()}
                  </ScrollView>

                  <View style={[styles.sheetFooterRow, { borderTopColor: colors.borderSubtle }]}>
                    <Pressable
                      onPress={() => handleShareSeller(selectedSeller, sellerDetail)}
                      style={({ pressed }) => [
                        styles.sheetSecBtn,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.surfaceSubtle,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                      accessibilityLabel="Share provider information"
                    >
                      <Text style={[styles.sheetSecBtnText, { color: colors.textPrimary }]}>
                        Share Info
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => Linking.openURL(portalUrl).catch(() => undefined)}
                      style={({ pressed }) => [
                        styles.sheetPriBtn,
                        { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 },
                      ]}
                      accessibilityLabel="Open service catalog on GeM"
                    >
                      <Text style={[styles.sheetPriBtnText, { color: colors.textInverse }]}>
                        Open on GeM ↗
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </Modal>

      <BidInspectorScreen
        bid={inspectBid}
        visible={Boolean(inspectBid)}
        onClose={() => setInspectBid(null)}
        onPrepareDocuments={onPrepareDocuments}
      />

      <BidDocumentViewer
        bid={viewerBid}
        visible={Boolean(viewerBid)}
        onClose={() => setViewerBid(null)}
      />
    </>
  );
};

const RuleCell: React.FC<{
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
}> = ({ label, value, colors }) => (
  <View style={[styles.ruleCell, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
    <Text style={[styles.ruleLabel, { color: colors.textMuted }]}>{label}</Text>
    <Text style={[styles.ruleVal, { color: colors.textPrimary }]} numberOfLines={2}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 10,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackIcon: { fontSize: 19, fontWeight: '700' },
  headerExternalIcon: { fontSize: 15, fontWeight: '800' },
  headerCopy: { flex: 1 },
  headerTitle: { fontSize: 14, fontWeight: '800' },
  headerSub: { fontSize: 11, marginTop: 1 },
  overviewStrip: {
    borderBottomWidth: 1,
    paddingTop: 12,
  },
  overviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 12,
  },
  heroThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  serviceHeading: { fontSize: 15, fontWeight: '800', lineHeight: 20 },
  metaPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  metaPillGreen: {
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  metaPillGreenText: { fontSize: 10, fontWeight: '800' },
  metaPillSlate: {
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  metaPillSlateText: { fontSize: 10, fontWeight: '700' },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 12, fontWeight: '600' },
  tabTextActive: { fontWeight: '800' },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 32 },
  providersTabWrap: { flex: 1 },
  providersEmptyPad: { padding: 14 },
  providersStickyTop: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  providersListContent: {
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 32,
  },
  syncProgressBox: {
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 4,
  },
  syncProgressTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  syncProgressText: {
    fontSize: 11.5,
    fontWeight: '700',
    flex: 1,
  },
  syncProgressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  syncProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  syncEmptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  centerTitle: { fontSize: 14, fontWeight: '700', marginTop: 12 },
  centerSub: { fontSize: 12, marginTop: 4, textAlign: 'center', maxWidth: 280 },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  emptyHeading: { fontSize: 14, fontWeight: '800', marginBottom: 6 },
  bodyCopy: { fontSize: 12.5, lineHeight: 19 },
  switchTabCta: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  switchTabCtaText: { fontSize: 12, fontWeight: '800' },
  listIntroRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  listIntro: { fontSize: 11.5, fontWeight: '600' },
  refreshCacheBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshCacheBtnText: { fontSize: 11.5, fontWeight: '700' },
  sellerSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sellerSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  sellerSearchBtnText: { fontSize: 13, fontWeight: '800' },
  sellerFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
  },
  emptyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  clearFilterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  clearFilterBtnText: { fontSize: 12, fontWeight: '700' },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  sellerInitialCircle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerInitialText: { fontSize: 12, fontWeight: '800' },
  sellerName: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  sellerMeta: { fontSize: 11, marginTop: 2 },
  sellerValueRow: { flexDirection: 'row', marginTop: 5 },
  sellerValuePill: {
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  sellerValuePillText: { fontSize: 10.5, fontWeight: '800' },
  sellerRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sellerChevron: { fontSize: 20, fontWeight: '500', marginLeft: 2 },
  verifiedTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  verifiedTagText: { fontSize: 9, fontWeight: '900' },
  sellerPaginationRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  loadMoreBtn: {
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: { fontSize: 12.5, fontWeight: '700' },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 50,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  sheetSurface: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    maxHeight: '82%',
    paddingTop: 10,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  sheetSellerName: { fontSize: 15, fontWeight: '800', lineHeight: 20 },
  sheetIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  sheetSellerId: { fontSize: 11.5, fontWeight: '600' },
  copyIdPill: {
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  copyIdText: { fontSize: 10.5, fontWeight: '800' },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseText: { fontSize: 15, fontWeight: '700' },
  sheetScroll: { flexGrow: 0 },
  sheetScrollContent: { paddingHorizontal: 16, paddingBottom: 14 },
  sheetContextStrip: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  sheetContextLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 3 },
  sheetContextValue: { fontSize: 12.5, fontWeight: '700', lineHeight: 17 },
  sheetLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sheetLoadingText: { fontSize: 11.5, fontWeight: '600' },
  sheetKpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  sheetKpiCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  sheetKpiValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  sheetKpiSub: { fontSize: 11, marginTop: 3 },
  sheetSectionBlock: { marginBottom: 12 },
  sheetSectionHeading: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  certChip: {
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  certChipText: { fontSize: 11.5, fontWeight: '700' },
  sheetEmptyNote: { fontSize: 12, lineHeight: 17 },
  privacyNoticeBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 11,
  },
  privacyNoticeText: { fontSize: 11.5, lineHeight: 17 },
  sheetFooterRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  sheetSecBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSecBtnText: { fontSize: 13, fontWeight: '700' },
  sheetPriBtn: {
    flex: 1.3,
    minHeight: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetPriBtnText: { fontSize: 13, fontWeight: '800' },
  tenderCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 13,
    marginBottom: 10,
  },
  tenderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
    gap: 8,
  },
  tenderNum: { fontSize: 12, fontWeight: '800' },
  tenderClose: { fontSize: 11, fontWeight: '600' },
  tenderTitle: { fontSize: 13.5, fontWeight: '700', lineHeight: 19, marginBottom: 3 },
  tenderDept: { fontSize: 11.5, marginBottom: 10 },
  tenderActions: { flexDirection: 'row', gap: 8 },
  tenderSecBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  tenderSecBtnText: { fontSize: 12, fontWeight: '700' },
  tenderPriBtn: {
    flex: 1.2,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  tenderPriBtnText: { fontSize: 12, fontWeight: '800' },
  sectionTitle: { fontSize: 13.5, fontWeight: '800', marginBottom: 10 },
  ruleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  ruleCell: {
    width: '48.5%',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  ruleLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4, marginBottom: 3 },
  ruleVal: { fontSize: 12.5, fontWeight: '800' },
  paramBlock: {
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 10,
  },
  paramName: { fontSize: 12.5, fontWeight: '700', marginBottom: 6 },
  paramChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  paramChip: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  paramChipText: { fontSize: 11, fontWeight: '500' },
  slaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slaToggle: { fontSize: 12, fontWeight: '800' },
  slaCopy: { fontSize: 11.5, lineHeight: 18 },
});
