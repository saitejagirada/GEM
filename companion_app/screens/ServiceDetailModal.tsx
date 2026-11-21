import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  GeMServicesClient,
  type LiveGeMServiceDetail,
  type LiveGeMServiceSeller,
} from '../services/GeMServicesClient';
import { GeMLiveSyncService } from '../services/GeMLiveSyncService';
import type { DeconstructedBidDoc } from '../types/index';
import { useTheme } from '../theme/ThemeContext';
import { formatDateSafe } from '../utils/formatters';
import { BidInspectorScreen } from './BidInspectorScreen';
import { BidDocumentViewer } from './BidDocumentViewer';

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
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<DetailTab>('PROVIDERS');
  const [detail, setDetail] = useState<LiveGeMServiceDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [sellers, setSellers] = useState<LiveGeMServiceSeller[]>([]);
  const [sellersTotal, setSellersTotal] = useState(0);
  const [sellersPage, setSellersPage] = useState(1);
  const [sellersHasMore, setSellersHasMore] = useState(false);
  const [isLoadingSellers, setIsLoadingSellers] = useState(false);
  const [isLoadingMoreSellers, setIsLoadingMoreSellers] = useState(false);

  const [tenders, setTenders] = useState<DeconstructedBidDoc[]>([]);
  const [tendersTotal, setTendersTotal] = useState(0);
  const [isLoadingTenders, setIsLoadingTenders] = useState(false);
  const [inspectBid, setInspectBid] = useState<DeconstructedBidDoc | null>(null);
  const [viewerBid, setViewerBid] = useState<DeconstructedBidDoc | null>(null);

  const [slaExpanded, setSlaExpanded] = useState(false);

  useEffect(() => {
    if (!service || !visible) return;
    let cancelled = false;

    setActiveTab('PROVIDERS');
    setDetail(null);
    setSellers([]);
    setSellersTotal(0);
    setSellersPage(1);
    setSellersHasMore(false);
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

    setIsLoadingSellers(true);
    GeMServicesClient.fetchServiceSellers(service.gemServiceId, 1)
      .then((res) => {
        if (!cancelled) {
          setSellers(res.sellers);
          setSellersTotal(res.total);
          setSellersPage(1);
          setSellersHasMore(res.hasMore);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSellers(false);
      });

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

  const handleLoadMoreSellers = useCallback(async () => {
    if (!service || isLoadingMoreSellers || !sellersHasMore) return;
    setIsLoadingMoreSellers(true);
    try {
      const nextPage = sellersPage + 1;
      const res = await GeMServicesClient.fetchServiceSellers(service.gemServiceId, nextPage);
      setSellers((prev) => {
        const seen = new Set(prev.map((s) => s.sellerId));
        return [...prev, ...res.sellers.filter((s) => !seen.has(s.sellerId))];
      });
      setSellersPage(nextPage);
      setSellersHasMore(res.hasMore);
    } finally {
      setIsLoadingMoreSellers(false);
    }
  }, [service, isLoadingMoreSellers, sellersHasMore, sellersPage]);

  if (!service) return null;

  const heroImage = detail?.imageUrl || service.imageUrl;
  const portalUrl = detail?.portalUrl || GeMServicesClient.buildPortalUrl(service.gemServiceId);
  const providerCount = sellersTotal || detail?.totalCatalogCount || sellers.length;

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0B3B60' }}>
          <StatusBar barStyle="light-content" backgroundColor="#0B3B60" />
          <View style={[styles.root, { backgroundColor: colors.background }]}>
            {/* Top Bar */}
            <View style={styles.headerBar}>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.75 }]}
                hitSlop={8}
                accessibilityLabel="Close service details"
              >
                <Text style={styles.headerBackIcon}>←</Text>
              </Pressable>
              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {detail?.displayName || service.name}
                </Text>
                <Text style={styles.headerSub} numberOfLines={1}>
                  {service.category || 'GeM Live Service'}
                  {detail?.versionNumber ? ` · v${detail.versionNumber}` : ''}
                </Text>
              </View>
              <Pressable
                onPress={() => Linking.openURL(portalUrl).catch(() => undefined)}
                style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.75 }]}
                hitSlop={8}
                accessibilityLabel="Open service page on GeM website"
              >
                <Text style={styles.headerExternalIcon}>↗</Text>
              </Pressable>
            </View>

            {/* Compact Overview Strip */}
            <View style={[styles.overviewStrip, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <View style={styles.overviewTop}>
                {heroImage ? (
                  <Image source={{ uri: heroImage }} style={styles.heroThumb} resizeMode="cover" />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.serviceHeading, { color: colors.textPrimary }]} numberOfLines={2}>
                    {detail?.displayName || service.name}
                  </Text>
                  <View style={styles.metaPillsRow}>
                    {providerCount > 0 ? (
                      <View style={styles.metaPillGreen}>
                        <Text style={styles.metaPillGreenText}>
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
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              {activeTab === 'PROVIDERS' && (
                <View>
                  {isLoadingSellers ? (
                    <View style={styles.centerBox}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={[styles.centerTitle, { color: colors.textPrimary }]}>
                        Loading live GeM providers…
                      </Text>
                      <Text style={[styles.centerSub, { color: colors.textSecondary }]}>
                        Fetching registered service providers directly from mkp.gem.gov.in
                      </Text>
                    </View>
                  ) : sellers.length === 0 ? (
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
                        style={styles.switchTabCta}
                        onPress={() => setActiveTab('TENDERS')}
                      >
                        <Text style={styles.switchTabCtaText}>View Live Service Tenders →</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <>
                      <Text style={[styles.listIntro, { color: colors.textSecondary }]}>
                        Showing {sellers.length} of {sellersTotal.toLocaleString('en-IN')} live GeM registered service providers
                      </Text>
                      {sellers.map((seller) => (
                        <View
                          key={seller.sellerId}
                          style={[styles.sellerRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
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
                          </View>
                          <View style={[styles.verifiedTag, { backgroundColor: colors.successTint }]}>
                            <Text style={[styles.verifiedTagText, { color: colors.success }]}>LIVE</Text>
                          </View>
                        </View>
                      ))}

                      {sellersHasMore ? (
                        <Pressable
                          style={[styles.loadMoreBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                          onPress={handleLoadMoreSellers}
                          disabled={isLoadingMoreSellers}
                        >
                          {isLoadingMoreSellers ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                          ) : (
                            <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                              Load More Providers
                            </Text>
                          )}
                        </Pressable>
                      ) : null}
                    </>
                  )}
                </View>
              )}

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
                            style={styles.tenderPriBtn}
                            onPress={() => setInspectBid(bid)}
                          >
                            <Text style={styles.tenderPriBtnText}>Inspect Fundamentals</Text>
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
    backgroundColor: '#0B3B60',
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackIcon: { color: '#FFFFFF', fontSize: 19, fontWeight: '700' },
  headerExternalIcon: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  headerCopy: { flex: 1 },
  headerTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  headerSub: { color: '#BFDBFE', fontSize: 11, marginTop: 1 },
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
    backgroundColor: '#E2E8F0',
  },
  serviceHeading: { fontSize: 15, fontWeight: '800', lineHeight: 20 },
  metaPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  metaPillGreen: {
    backgroundColor: '#DCFCE7',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  metaPillGreenText: { color: '#15803D', fontSize: 10, fontWeight: '800' },
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
  tabBtnActive: {
    borderBottomColor: '#0B3B60',
  },
  tabText: { fontSize: 12, fontWeight: '600' },
  tabTextActive: { fontWeight: '800' },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 32 },
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
    backgroundColor: '#0B3B60',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  switchTabCtaText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  listIntro: { fontSize: 11.5, fontWeight: '600', marginBottom: 10 },
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
    backgroundColor: '#EAF2F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerInitialText: { color: '#0B3B60', fontSize: 12, fontWeight: '800' },
  sellerName: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  sellerMeta: { fontSize: 11, marginTop: 2 },
  verifiedTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  verifiedTagText: { color: '#15803D', fontSize: 9, fontWeight: '900' },
  loadMoreBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  loadMoreText: { fontSize: 13, fontWeight: '700' },
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
  tenderNum: { color: '#0B3B60', fontSize: 12, fontWeight: '800' },
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
    backgroundColor: '#0B3B60',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  tenderPriBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
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
  slaToggle: { color: '#0B3B60', fontSize: 12, fontWeight: '800' },
  slaCopy: { fontSize: 11.5, lineHeight: 18 },
});
