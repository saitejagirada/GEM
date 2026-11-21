import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import {
  CompactChip,
  SearchField,
  SectionHeader,
  StatusBadge,
} from '../components/SharedUI';
import { formatDateSafe } from '../utils/formatters';
import type { DeconstructedBidDoc } from '../types/index';

export interface HomeNavigateParams {
  search?: string;
  category?: string;
  typeTab?: 'Products' | 'Services';
}

export interface HomeScreenProps {
  bids: DeconstructedBidDoc[];
  totalPortalBids?: number;
  isSyncing?: boolean;
  onRefresh?: () => void;
  onNavigateTab: (
    tab: 'MARKET' | 'BIDS' | 'AUCTIONS' | 'ORDERS' | 'PORTAL' | 'CATEGORIES' | 'HELP' | 'MORE',
    params?: HomeNavigateParams
  ) => void;
  onSelectBid: (bid: DeconstructedBidDoc) => void;
  onOpenBidPdf?: (bid: DeconstructedBidDoc) => void;
  onOpenMyWork?: () => void;
  onOpenOfficialPortal?: () => void;
}

const SEARCH_SCOPES = ['All', 'Bids', 'Products', 'Services'] as const;

const CATALOG_SHORTCUTS: Array<{
  id: string;
  code: string;
  label: string;
  sub: string;
  targetCategory?: string;
  typeTab: 'Products' | 'Services';
}> = [
  { id: 'it', code: 'IT', label: 'IT & Tech', sub: 'PCs, Laptops', targetCategory: 'IT Products', typeTab: 'Products' },
  { id: 'auto', code: 'AUTO', label: 'Automobiles', sub: 'Cars, EVs, Buses', targetCategory: 'Automobiles', typeTab: 'Products' },
  { id: 'tex', code: 'TEX', label: 'Textiles', sub: 'Sheets, Towels', targetCategory: 'Textile Products', typeTab: 'Products' },
  { id: 'pipe', code: 'PIPE', label: 'Pipes & Steel', sub: 'ISI Tubes, CPVC', targetCategory: 'Pipes & Fittings', typeTab: 'Products' },
  { id: 'med', code: 'MED', label: 'Medical', sub: 'Gloves, Syringes', targetCategory: 'Medical Products', typeTab: 'Products' },
  { id: 'furn', code: 'FURN', label: 'Furniture', sub: 'Chairs, Tables', targetCategory: 'Furniture', typeTab: 'Products' },
  { id: 'elec', code: 'ELEC', label: 'Electrical', sub: 'LEDs, MCCB', targetCategory: 'Electrical Appliances', typeTab: 'Products' },
  { id: 'srv', code: 'SRV', label: '380+ Services', sub: 'Manpower, AMC', typeTab: 'Services' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  bids,
  totalPortalBids = 0,
  isSyncing = false,
  onRefresh,
  onNavigateTab,
  onSelectBid,
  onOpenBidPdf,
  onOpenMyWork,
  onOpenOfficialPortal,
}) => {
  const { colors, fontMultiplier } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeScope, setActiveScope] = useState<(typeof SEARCH_SCOPES)[number]>('All');

  const closingSoonBids = bids.slice(0, 4);

  const handleSearchSubmit = (overrideScope?: (typeof SEARCH_SCOPES)[number]) => {
    const q = searchQuery.trim();
    const scope = overrideScope || activeScope;
    const looksLikeBidNumber = /^GEM\/\d{4}\/[BR]\//i.test(q);
    if (scope === 'Bids' || looksLikeBidNumber) {
      onNavigateTab('BIDS', { search: q });
    } else if (scope === 'Services') {
      onNavigateTab('MARKET', { search: q, typeTab: 'Services' });
    } else {
      onNavigateTab('MARKET', { search: q, typeTab: 'Products' });
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        ) : undefined
      }
    >
      {/* 1. Unified Search & Live Pulse Strip */}
      <View style={[styles.searchPanel, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search bids, products, services or GEM/2026/..."
          onSubmit={() => handleSearchSubmit()}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scopeRow}
        >
          {SEARCH_SCOPES.map((scope) => (
            <CompactChip
              key={scope}
              label={scope}
              selected={activeScope === scope}
              onPress={() => {
                setActiveScope(scope);
                if (searchQuery.trim()) {
                  handleSearchSubmit(scope);
                }
              }}
            />
          ))}
        </ScrollView>

        {/* Live 3-Column Portal Pulse */}
        <View style={[styles.pulseStrip, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          <Pressable style={styles.pulseCell} onPress={() => onNavigateTab('BIDS')}>
            <Text style={[styles.pulseVal, { color: colors.primary }]}>
              {totalPortalBids > 0 ? totalPortalBids.toLocaleString('en-IN') : bids.length > 0 ? `${bids.length}+` : '—'}
            </Text>
            <Text style={[styles.pulseLabel, { color: colors.textSecondary }]}>Live Tenders ›</Text>
          </Pressable>
          <View style={[styles.pulseDivider, { backgroundColor: colors.border }]} />
          <Pressable
            style={styles.pulseCell}
            onPress={() => onNavigateTab('MARKET', { typeTab: 'Services' })}
          >
            <Text style={[styles.pulseVal, { color: colors.emerald }]}>380+</Text>
            <Text style={[styles.pulseLabel, { color: colors.textSecondary }]}>GeM Services ›</Text>
          </Pressable>
          <View style={[styles.pulseDivider, { backgroundColor: colors.border }]} />
          <Pressable style={styles.pulseCell} onPress={() => onNavigateTab('AUCTIONS')}>
            <Text style={[styles.pulseVal, { color: colors.warning }]}>Live RA</Text>
            <Text style={[styles.pulseLabel, { color: colors.textSecondary }]}>Auctions ›</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.bodyPad}>
        {/* 2. Closing Soon — Live Opportunities (Above the fold!) */}
        <SectionHeader
          title="Closing soon on GeM"
          actionLabel="All bids ›"
          onAction={() => onNavigateTab('BIDS')}
        />

        {isSyncing && closingSoonBids.length === 0 ? (
          <View style={[styles.loadingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Syncing live public tenders from bidplus.gem.gov.in…
            </Text>
          </View>
        ) : closingSoonBids.length === 0 ? (
          <View style={[styles.loadingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Pull down to sync live tenders directly from GeM.
            </Text>
          </View>
        ) : (
          closingSoonBids.map((bid) => {
            const isRa = Boolean(bid.isRa || bid.type === 'RA');
            const isService = bid.type === 'SERVICE';
            const qty = bid.boqItems?.[0]?.quantity;

            return (
              <Pressable
                key={`${bid.bidNumber}-${bid.b_id || ''}`}
                style={({ pressed }) => [
                  styles.bidCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
                onPress={() => onSelectBid(bid)}
              >
                <View style={styles.bidTopRow}>
                  <StatusBadge
                    label={isRa ? 'RA' : isService ? 'SERVICE' : 'GOODS'}
                    tone={isRa ? 'warning' : isService ? 'violet' : 'neutral'}
                  />
                  <Text style={[styles.bidNumber, { color: colors.textSecondary }]} numberOfLines={1}>
                    {bid.bidNumber}
                  </Text>
                  {bid.isHighValue ? <StatusBadge label="≥ ₹2 Cr" tone="success" /> : null}
                </View>

                <Text
                  style={[styles.bidTitle, { color: colors.textPrimary, fontSize: 14 * fontMultiplier }]}
                  numberOfLines={2}
                >
                  {bid.title}
                </Text>

                <Text style={[styles.bidDept, { color: colors.textSecondary }]} numberOfLines={1}>
                  {bid.department}
                </Text>

                <View style={[styles.bidFooterRow, { borderTopColor: colors.borderSubtle }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bidCloseMeta, { color: colors.textMuted }]}>
                      Closes {formatDateSafe(bid.closingTimeUtc)}
                      {qty !== undefined ? ` · Qty ${qty.toLocaleString('en-IN')}` : ''}
                    </Text>
                  </View>
                  <View style={styles.bidInlineActions}>
                    {onOpenBidPdf ? (
                      <Pressable
                        style={[styles.miniPdfBtn, { borderColor: colors.border, backgroundColor: colors.surfaceSubtle }]}
                        hitSlop={6}
                        onPress={() => onOpenBidPdf(bid)}
                      >
                        <Text style={[styles.miniPdfBtnText, { color: colors.textPrimary }]}>PDF</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      style={[styles.miniInspectBtn, { backgroundColor: colors.primary }]}
                      hitSlop={6}
                      onPress={() => onSelectBid(bid)}
                    >
                      <Text style={[styles.miniInspectBtnText, { color: colors.textInverse }]}>Inspect</Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}

        {/* 3. Explore Catalog — Compact Horizontal Rail */}
        <SectionHeader
          title="Explore catalog"
          actionLabel="Directory ›"
          onAction={() => onNavigateTab('CATEGORIES')}
          style={{ marginTop: 10 }}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catalogScroll}
        >
          {CATALOG_SHORTCUTS.map((cat) => (
            <Pressable
              key={cat.id}
              style={({ pressed }) => [
                styles.catalogTile,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() =>
                onNavigateTab('MARKET', {
                  category: cat.targetCategory,
                  typeTab: cat.typeTab,
                })
              }
            >
              <View style={[styles.catalogCodePill, { backgroundColor: colors.primaryTint }]}>
                <Text style={[styles.catalogCodeText, { color: colors.primary }]}>{cat.code}</Text>
              </View>
              <Text style={[styles.catalogLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                {cat.label}
              </Text>
              <Text style={[styles.catalogSub, { color: colors.textMuted }]} numberOfLines={1}>
                {cat.sub}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* 4. Compact Procurement Tools Grid (2x2 — Zero Redundancy) */}
        <SectionHeader title="Procurement tools" style={{ marginTop: 14 }} />

        <View style={styles.toolsGrid}>
          <Pressable
            style={[styles.toolCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => (onOpenMyWork ? onOpenMyWork() : onNavigateTab('MORE'))}
          >
            <Text style={[styles.toolEyebrow, { color: colors.primary }]}>WORKSPACE</Text>
            <Text style={[styles.toolTitle, { color: colors.textPrimary }]}>Doc Preparation</Text>
            <Text style={[styles.toolSub, { color: colors.textSecondary }]}>Stage local files &amp; checklists</Text>
          </Pressable>

          <Pressable
            style={[styles.toolCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => onNavigateTab('ORDERS')}
          >
            <Text style={[styles.toolEyebrow, { color: colors.violet }]}>RESULTS</Text>
            <Text style={[styles.toolTitle, { color: colors.textPrimary }]}>Concluded Bids</Text>
            <Text style={[styles.toolSub, { color: colors.textSecondary }]}>Past tenders &amp; contracts</Text>
          </Pressable>

          <Pressable
            style={[styles.toolCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => (onOpenOfficialPortal ? onOpenOfficialPortal() : onNavigateTab('PORTAL'))}
          >
            <Text style={[styles.toolEyebrow, { color: colors.emerald }]}>PORTAL</Text>
            <Text style={[styles.toolTitle, { color: colors.textPrimary }]}>Official GeM ↗</Text>
            <Text style={[styles.toolSub, { color: colors.textSecondary }]}>Sign in, 2FA &amp; submit</Text>
          </Pressable>

          <Pressable
            style={[styles.toolCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => onNavigateTab('HELP')}
          >
            <Text style={[styles.toolEyebrow, { color: colors.warning }]}>SUPPORT</Text>
            <Text style={[styles.toolTitle, { color: colors.textPrimary }]}>GeM Helpdesk</Text>
            <Text style={[styles.toolSub, { color: colors.textSecondary }]}>1800-419-3436 &amp; SOPs</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingBottom: 32 },
  searchPanel: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  scopeRow: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: 12,
  },
  pulseStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
  },
  pulseCell: {
    flex: 1,
    alignItems: 'center',
  },
  pulseVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  pulseLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 2,
  },
  pulseDivider: {
    width: 1,
    height: 26,
  },
  bodyPad: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 18,
    gap: 10,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 12.5,
  },
  bidCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 13,
    marginBottom: 10,
  },
  bidTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 7,
  },
  bidNumber: {
    fontSize: 11.5,
    fontWeight: '700',
    flex: 1,
  },
  bidTitle: {
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 3,
  },
  bidDept: {
    fontSize: 11.5,
    marginBottom: 10,
  },
  bidFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 9,
    gap: 8,
  },
  bidCloseMeta: {
    fontSize: 11,
    fontWeight: '600',
  },
  bidInlineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniPdfBtn: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  miniPdfBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  miniInspectBtn: {
    borderRadius: 6,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  miniInspectBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  catalogScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  catalogTile: {
    width: 112,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  catalogCodePill: {
    alignSelf: 'flex-start',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginBottom: 8,
  },
  catalogCodeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  catalogLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  catalogSub: {
    fontSize: 10.5,
    marginTop: 2,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  toolCard: {
    width: '48.5%',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  toolEyebrow: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  toolTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  toolSub: {
    fontSize: 11,
    lineHeight: 15,
  },
});
