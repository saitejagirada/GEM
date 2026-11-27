/**
 * GeM Mobile Companion App - Side-by-Side Live Product Compare & GFR 149 Rule Helper
 *
 * Designed for government buyers & procurement clerks:
 * - Tab 1 (Compare OEMs): Compares 2–3 live GeM products side-by-side (Photo, OEM Brand,
 *   L1 lowest price highlight, MRP & Discount %, Seller, Seller Type, MOQ, Open on GeM ↗),
 *   and automatically checks GFR 149(ii)'s "3 distinct OEMs" rule.
 * - Tab 2 (GFR 149 Helper): Interactive threshold evaluator (reuses MarketplaceService.evaluateGfrProcurementMode)
 *   showing exact procurement route (Direct Purchase ≤ ₹25,000 / L1 Comparison ≤ ₹5,00,000 /
 *   Mandatory Bid or RA > ₹5,00,000) with quick preset chips and custom Unit Price × Qty calculation.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  MarketplaceService,
  type MarketplaceItem,
} from '../services/MarketplaceService';
import { useTheme } from '../theme/ThemeContext';
import { formatInr } from '../utils/formatters';

export type CompareModalTab = 'COMPARE' | 'GFR149';

interface ProductCompareModalProps {
  visible: boolean;
  initialTab?: CompareModalTab;
  items: MarketplaceItem[];
  onRemoveItem: (id: string) => void;
  onClearCompare: () => void;
  onClose: () => void;
}

const GFR_PRESETS: ReadonlyArray<{ label: string; amount: number }> = [
  { label: '₹20,000', amount: 20000 },
  { label: '₹1,50,000', amount: 150000 },
  { label: '₹4,50,000', amount: 450000 },
  { label: '₹8,00,000', amount: 800000 },
  { label: '₹25,00,000', amount: 2500000 },
];

export const ProductCompareModal: React.FC<ProductCompareModalProps> = ({
  visible,
  initialTab = 'COMPARE',
  items,
  onRemoveItem,
  onClearCompare,
  onClose,
}) => {
  const { colors } = useTheme();
  const [tab, setTab] = useState<CompareModalTab>(initialTab);
  const [gfrAmountText, setGfrAmountText] = useState('150000');

  useEffect(() => {
    if (visible) {
      setTab(initialTab);
      if (items.length > 0) {
        const lowest = Math.min(...items.map((i) => i.l1PriceInr || 0).filter((n) => n > 0));
        if (Number.isFinite(lowest) && lowest > 0) {
          setGfrAmountText(String(lowest));
        }
      }
    }
  }, [visible, initialTab, items]);

  const lowestPrice = useMemo(() => {
    const prices = items.map((i) => i.l1PriceInr).filter((p) => typeof p === 'number' && p > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
  }, [items]);

  const distinctOemCount = useMemo(() => {
    const set = new Set(
      items
        .map((i) => (i.oemBrand || '').trim().toLowerCase())
        .filter((b) => b && b !== 'unbranded' && b !== 'verified oem')
    );
    return set.size;
  }, [items]);

  const parsedGfrAmount = useMemo(() => {
    const clean = gfrAmountText.replace(/[^0-9.]/g, '');
    const n = parseFloat(clean);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
  }, [gfrAmountText]);

  const gfrResult = useMemo(
    () => MarketplaceService.evaluateGfrProcurementMode(parsedGfrAmount),
    [parsedGfrAmount]
  );

  const gfrTone =
    gfrResult.mode === 'DIRECT_PURCHASE'
      ? { bg: colors.successTint, fg: colors.success, badge: 'DIRECT PURCHASE' }
      : gfrResult.mode === 'L1_COMPARISON'
        ? { bg: colors.primaryTint, fg: colors.primary, badge: '3-OEM L1 COMPARISON' }
        : { bg: colors.warningTint, fg: colors.warning, badge: 'MANDATORY BID / RA' };

  const openOnGem = (item: MarketplaceItem) => {
    const url = item.productUrl || 'https://mkp.gem.gov.in/';
    Linking.openURL(url).catch(() => undefined);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropDismiss} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Compare OEMs &amp; GFR 149 Helper
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Live GeM catalog comparison · Zero login required
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={styles.closeBtn}
              accessibilityLabel="Close compare and GFR helper"
            >
              <Text style={[styles.closeText, { color: colors.textMuted }]}>✕</Text>
            </Pressable>
          </View>

          {/* Two-Tab Bar */}
          <View
            style={[
              styles.tabRow,
              { backgroundColor: colors.surfaceSubtle, borderBottomColor: colors.borderSubtle },
            ]}
          >
            {(
              [
                { id: 'COMPARE', label: `Compare Products (${items.length}/3)` },
                { id: 'GFR149', label: 'GFR 149 Rule Helper' },
              ] as const
            ).map((opt) => {
              const active = tab === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setTab(opt.id)}
                  style={[
                    styles.tabBtn,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.borderSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBtnText,
                      { color: active ? colors.textInverse : colors.textPrimary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {tab === 'COMPARE' ? (
              items.length === 0 ? (
                <View
                  style={[
                    styles.emptyBox,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                  ]}
                >
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    No products selected for comparison yet
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    Tap &quot;Compare&quot; on 2 or 3 live GeM products to inspect L1 price, OEM
                    brands, discounts, and sellers side-by-side.
                  </Text>
                </View>
              ) : (
                <>
                  {/* 3-OEM GFR 149 Compliance Banner */}
                  <View
                    style={[
                      styles.oemBanner,
                      {
                        backgroundColor:
                          distinctOemCount >= 3 ? colors.successTint : colors.primaryTint,
                        borderColor: distinctOemCount >= 3 ? colors.success : colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.oemBannerTitle,
                        { color: distinctOemCount >= 3 ? colors.success : colors.primary },
                      ]}
                    >
                      {distinctOemCount >= 3
                        ? 'GFR 149(ii) Ready: 3 Distinct OEMs Selected'
                        : `${items.length} Product${items.length === 1 ? '' : 's'} · ${distinctOemCount} Distinct OEM${distinctOemCount === 1 ? '' : 's'}`}
                    </Text>
                    <Text style={[styles.oemBannerSub, { color: colors.textSecondary }]}>
                      {distinctOemCount >= 3
                        ? 'Meets the minimum 3 different OEM manufacturers rule for L1 comparison.'
                        : 'Select up to 3 products from different OEMs to satisfy GFR 149(ii) L1 comparison.'}
                    </Text>
                  </View>

                  {/* Horizontal Side-by-Side Comparison Columns */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.columnsWrap}
                  >
                    {items.map((item) => {
                      const isL1 = lowestPrice > 0 && item.l1PriceInr === lowestPrice && items.length > 1;
                      const sellerName = item.specSummary?.['Seller'] || 'Verified GeM Seller';
                      const sellerType = item.specSummary?.['Seller Type'] || 'Seller';

                      return (
                        <View
                          key={item.id}
                          style={[
                            styles.colCard,
                            {
                              backgroundColor: colors.surface,
                              borderColor: isL1 ? colors.success : colors.borderSubtle,
                              borderWidth: isL1 ? 1.8 : 1,
                            },
                          ]}
                        >
                          <View style={styles.colTopRow}>
                            {isL1 ? (
                              <View style={[styles.l1Badge, { backgroundColor: colors.successTint }]}>
                                <Text style={[styles.l1BadgeText, { color: colors.success }]}>
                                  LOWEST (L1)
                                </Text>
                              </View>
                            ) : (
                              <View />
                            )}
                            <Pressable
                              onPress={() => onRemoveItem(item.id)}
                              hitSlop={8}
                              accessibilityLabel={`Remove ${item.title} from compare`}
                            >
                              <Text style={[styles.colRemove, { color: colors.textMuted }]}>✕</Text>
                            </Pressable>
                          </View>

                          <View style={styles.colImgWrap}>
                            {item.imageUrl ? (
                              <Image
                                source={{ uri: item.imageUrl }}
                                style={styles.colImg}
                                resizeMode="contain"
                              />
                            ) : (
                              <Text style={[styles.colFallback, { color: colors.textMuted }]}>GeM</Text>
                            )}
                          </View>

                          <Text style={[styles.colTitle, { color: colors.textPrimary }]} numberOfLines={3}>
                            {item.title}
                          </Text>

                          {[
                            {
                              label: 'GeM Price',
                              val: `₹${formatInr(item.l1PriceInr)}`,
                              accent: isL1 ? colors.success : colors.primary,
                              bold: true,
                            },
                            {
                              label: 'MRP / Discount',
                              val:
                                item.mrpInr && item.mrpInr > item.l1PriceInr
                                  ? `₹${formatInr(item.mrpInr)}${item.discountPercent ? ` (${item.discountPercent}% off)` : ''}`
                                  : item.discountPercent
                                    ? `${item.discountPercent}% off`
                                    : 'At MRP',
                            },
                            { label: 'OEM Brand', val: item.oemBrand || 'Unstated' },
                            { label: 'Seller Type', val: sellerType },
                            { label: 'Seller', val: sellerName },
                            { label: 'Min Qty', val: `${item.minOrderQty || 1} ${item.priceUnit || 'Unit'}` },
                          ].map((row, idx) => (
                            <View
                              key={row.label}
                              style={[
                                styles.colRow,
                                idx > 0 && {
                                  borderTopWidth: StyleSheet.hairlineWidth,
                                  borderTopColor: colors.borderSubtle,
                                },
                              ]}
                            >
                              <Text style={[styles.colLabel, { color: colors.textMuted }]}>
                                {row.label}
                              </Text>
                              <Text
                                style={[
                                  styles.colVal,
                                  { color: row.accent || colors.textPrimary },
                                  row.bold && { fontWeight: '900', fontSize: 13.5 },
                                ]}
                                numberOfLines={2}
                              >
                                {row.val}
                              </Text>
                            </View>
                          ))}

                          <Pressable
                            onPress={() => openOnGem(item)}
                            style={[styles.colGemBtn, { backgroundColor: colors.primaryTint }]}
                          >
                            <Text style={[styles.colGemBtnText, { color: colors.primary }]}>
                              Open on GeM ↗
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </ScrollView>
                </>
              )
            ) : (
              /* Tab 2: Interactive GFR 149 Rule Helper */
              <View>
                <Text style={[styles.gfrLabel, { color: colors.textPrimary }]}>
                  Enter Total Purchase Value (₹)
                </Text>
                <TextInput
                  style={[
                    styles.gfrInput,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={gfrAmountText}
                  onChangeText={setGfrAmountText}
                  keyboardType="number-pad"
                  placeholder="e.g. 150000"
                  placeholderTextColor={colors.textMuted}
                />

                <View style={styles.gfrPresetRow}>
                  {GFR_PRESETS.map((p) => {
                    const active = parsedGfrAmount === p.amount;
                    return (
                      <Pressable
                        key={p.label}
                        onPress={() => setGfrAmountText(String(p.amount))}
                        style={[
                          styles.gfrChip,
                          {
                            backgroundColor: active ? colors.primary : colors.surfaceSubtle,
                            borderColor: active ? colors.primary : colors.borderSubtle,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.gfrChipText,
                            { color: active ? colors.textInverse : colors.textPrimary },
                          ]}
                        >
                          {p.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View
                  style={[
                    styles.gfrResultCard,
                    { backgroundColor: gfrTone.bg, borderColor: gfrTone.fg },
                  ]}
                >
                  <Text style={[styles.gfrBadgeText, { color: gfrTone.fg }]}>{gfrTone.badge}</Text>
                  <Text style={[styles.gfrResultTitle, { color: colors.textPrimary }]}>
                    {gfrResult.description}
                  </Text>
                  <Text style={[styles.gfrResultBody, { color: colors.textSecondary }]}>
                    {gfrResult.mandatoryRequirement}
                  </Text>
                </View>

                {/* Quick Threshold Reference Table */}
                <View
                  style={[
                    styles.refTable,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                  ]}
                >
                  <Text style={[styles.refTitle, { color: colors.textMuted }]}>
                    GFR RULE 149 QUICK REFERENCE
                  </Text>
                  {[
                    {
                      slab: 'Up to ₹25,000',
                      rule: 'Direct Purchase from any available GeM seller meeting specs',
                    },
                    {
                      slab: '₹25,001 – ₹5,00,000',
                      rule: 'L1 Comparison across minimum 3 different OEMs/manufacturers',
                    },
                    {
                      slab: 'Above ₹5,00,000',
                      rule: 'Mandatory Online GeM Bid / Reverse Auction (10–21 days)',
                    },
                  ].map((r, idx) => (
                    <View
                      key={r.slab}
                      style={[
                        styles.refRow,
                        idx > 0 && {
                          borderTopWidth: StyleSheet.hairlineWidth,
                          borderTopColor: colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text style={[styles.refSlab, { color: colors.primary }]}>{r.slab}</Text>
                      <Text style={[styles.refRule, { color: colors.textSecondary }]}>{r.rule}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
            {tab === 'COMPARE' && items.length > 0 ? (
              <Pressable
                onPress={onClearCompare}
                style={[
                  styles.clearBtn,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.clearBtnText, { color: colors.danger }]}>Clear</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onClose}
              style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.doneBtnText, { color: colors.textInverse }]}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    gap: 10,
  },
  title: { fontSize: 15.5, fontWeight: '800' },
  subtitle: { fontSize: 11.5, marginTop: 2 },
  closeBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 18, fontWeight: '700' },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tabBtnText: { fontSize: 12, fontWeight: '800' },
  body: { maxHeight: 540 },
  bodyContent: { padding: 14, paddingBottom: 22 },
  emptyBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 18,
  },
  emptyTitle: { fontSize: 14.5, fontWeight: '800', marginBottom: 4 },
  emptySub: { fontSize: 12.5, lineHeight: 18 },
  oemBanner: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 11,
    marginBottom: 12,
  },
  oemBannerTitle: { fontSize: 12.5, fontWeight: '900' },
  oemBannerSub: { fontSize: 11.5, marginTop: 2, lineHeight: 16 },
  columnsWrap: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 4,
  },
  colCard: {
    width: 210,
    borderRadius: 12,
    padding: 11,
  },
  colTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    minHeight: 22,
  },
  l1Badge: {
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  l1BadgeText: { fontSize: 9.5, fontWeight: '900' },
  colRemove: { fontSize: 15, fontWeight: '800' },
  colImgWrap: {
    height: 92,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    padding: 6,
  },
  colImg: { width: '100%', height: '100%' },
  colFallback: { fontSize: 13, fontWeight: '800' },
  colTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    lineHeight: 17,
    minHeight: 50,
    marginBottom: 8,
  },
  colRow: {
    paddingVertical: 6,
  },
  colLabel: { fontSize: 9.5, fontWeight: '700', marginBottom: 1 },
  colVal: { fontSize: 11.5, fontWeight: '700' },
  colGemBtn: {
    marginTop: 10,
    minHeight: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colGemBtnText: { fontSize: 12, fontWeight: '800' },
  gfrLabel: { fontSize: 13, fontWeight: '800', marginBottom: 6 },
  gfrInput: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    fontSize: 15,
    fontWeight: '800',
  },
  gfrPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 10,
  },
  gfrChip: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  gfrChipText: { fontSize: 11.5, fontWeight: '800' },
  gfrResultCard: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1.2,
    padding: 13,
  },
  gfrBadgeText: { fontSize: 10.5, fontWeight: '900', letterSpacing: 0.5 },
  gfrResultTitle: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  gfrResultBody: { fontSize: 12.5, lineHeight: 18, marginTop: 5 },
  refTable: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  refTitle: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6, marginBottom: 6 },
  refRow: { paddingVertical: 8 },
  refSlab: { fontSize: 12.5, fontWeight: '800' },
  refRule: { fontSize: 11.5, lineHeight: 16.5, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  clearBtn: {
    minWidth: 86,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: { fontSize: 13, fontWeight: '800' },
  doneBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: { fontSize: 13.5, fontWeight: '800' },
});
