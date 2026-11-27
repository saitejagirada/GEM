/**
 * GeM Mobile Companion App - In-Tender Bid Margin & Reverse Auction Floor Calculator
 *
 * Helps sellers calculate exact GST-inclusive Opening Bid Quotes, Hard RA Walk-Away
 * Floor Prices, GeM Transaction Charges, and EMD + e-PBG Working Capital Blocked
 * before entering bidplus.gem.gov.in — preventing panic-bidding at a loss.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { DeconstructedBidDoc, UserAgentProfile } from '../types/index';
import {
  BidMarginCalculator,
  FLOOR_MARGIN_PRESETS,
  GST_RATE_PRESETS,
  TARGET_MARGIN_PRESETS,
  extractCalculatorDefaultsFromBid,
} from '../services/BidMarginCalculator';
import { BusinessProfileService } from '../services/BusinessProfileService';
import { useTheme } from '../theme/ThemeContext';
import { formatInr } from '../utils/formatters';
import { AppIcon } from './AppIcons';

interface BidMarginModalProps {
  bid: DeconstructedBidDoc;
  visible: boolean;
  onClose: () => void;
}

function parseNumInput(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export const BidMarginModal: React.FC<BidMarginModalProps> = ({
  bid,
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const [profile, setProfile] = useState<UserAgentProfile | null>(() =>
    BusinessProfileService.getProfile()
  );

  const defaults = useMemo(
    () => extractCalculatorDefaultsFromBid(bid, profile),
    [bid, profile]
  );

  const [qtyText, setQtyText] = useState(String(defaults.quantity));
  const [unitCostText, setUnitCostText] = useState('');
  const [gstRate, setGstRate] = useState<number>(18);
  const [freightText, setFreightText] = useState('0');
  const [targetMargin, setTargetMargin] = useState<number>(12);
  const [floorMargin, setFloorMargin] = useState<number>(3);

  useEffect(() => {
    BusinessProfileService.hydrate().then(setProfile).catch(() => undefined);
    return BusinessProfileService.subscribe(setProfile);
  }, []);

  useEffect(() => {
    if (!visible) return;
    setQtyText(String(defaults.quantity));
    setUnitCostText('');
    setFreightText('0');
    setGstRate(18);
    setTargetMargin(12);
    setFloorMargin(3);
  }, [visible, bid.bidNumber, defaults.quantity]);

  const quantity = Math.max(1, Math.round(parseNumInput(qtyText) || defaults.quantity));
  const unitPurchaseCostInr = parseNumInput(unitCostText);
  const freightTotalInr = parseNumInput(freightText);
  const safeFloorMargin = Math.min(floorMargin, targetMargin);

  const result = useMemo(
    () =>
      BidMarginCalculator.calculate({
        quantity,
        unitPurchaseCostInr,
        gstRatePercent: gstRate,
        freightAndOverheadTotalInr: freightTotalInr,
        targetMarginPercent: targetMargin,
        minWalkAwayMarginPercent: safeFloorMargin,
        estimatedValueInr: defaults.estimatedValueInr,
        emdAmountInr: defaults.emdAmountInr,
        isEmdExemptForMse: defaults.isEmdExemptForMse,
        epbgPercentage: defaults.epbgPercentage,
        epbgDurationMonths: defaults.epbgDurationMonths,
        profile,
      }),
    [
      quantity,
      unitPurchaseCostInr,
      gstRate,
      freightTotalInr,
      targetMargin,
      safeFloorMargin,
      defaults,
      profile,
    ]
  );

  const hasCostEntered = unitPurchaseCostInr > 0;

  const handleSharePricingNote = () => {
    const lines = [
      `*Internal Bid Pricing Sheet — ${bid.bidNumber}*`,
      `Item: ${bid.title || 'GeM Tender'}`,
      `Quantity: ${result.quantity.toLocaleString('en-IN')} Units`,
      `Unit Purchase Cost: ₹${formatInr(unitPurchaseCostInr)} (+ ${gstRate}% GST)`,
      `Freight & Overhead: ₹${formatInr(result.freightAndOverheadTotalInr)}`,
      `GeM Fee (${result.effectiveGemFeePercent}% + 18% GST): ₹${formatInr(result.gemTransactionFeeTotalInr)}`,
      '',
      `*Break-Even (0% Profit):* ₹${formatInr(result.breakEvenTotalInr)} (₹${formatInr(result.breakEvenPerUnitInr)}/unit)`,
      `*Opening Quote (${targetMargin}% Margin):* ₹${formatInr(result.recommendedQuoteTotalInr)} (₹${formatInr(result.recommendedQuotePerUnitInr)}/unit)`,
      `*HARD RA WALK-AWAY FLOOR (${safeFloorMargin}%):* ₹${formatInr(result.raFloorTotalInr)} (₹${formatInr(result.raFloorPerUnitInr)}/unit)`,
      `RA Headroom: ₹${formatInr(result.raNegotiationHeadroomInr)}`,
      '',
      `Working Capital Blocked:`,
      `• EMD Cash: ${result.emdWaivedForMseOem ? '₹0 (MSE OEM Waived)' : `₹${formatInr(result.effectiveEmdCashInr)}`}`,
      `• e-PBG (${result.epbgPercentage}%): ₹${formatInr(result.epbgGuaranteeAtQuoteInr)}`,
      '',
      `_Calculated privately on device via GeM Mobile Companion_`,
    ];
    Share.share({
      title: `Pricing Sheet ${bid.bidNumber}`,
      message: lines.join('\n'),
    }).catch(() => undefined);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdropDismiss} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <View style={[styles.headerIcon, { backgroundColor: colors.primaryTint }]}>
              <AppIcon name="calculator" color={colors.primary} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Bid Margin &amp; RA Floor Calculator
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {bid.bidNumber}
                {defaults.estimatedValueInr
                  ? ` · Est. ₹${formatInr(defaults.estimatedValueInr)}`
                  : ''}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={styles.closeBtn}
              accessibilityLabel="Close margin calculator"
            >
              <Text style={[styles.closeText, { color: colors.textMuted }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Primary Inputs Row */}
            <View style={styles.twoColRow}>
              <View style={{ flex: 1.35 }}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                  Unit Cost (₹ excl. GST)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={unitCostText}
                  onChangeText={setUnitCostText}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 12500"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={{ flex: 0.75 }}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                  Quantity
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.borderSubtle,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={qtyText}
                  onChangeText={setQtyText}
                  keyboardType="number-pad"
                  placeholder="1"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            {/* GST Rate */}
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
              Applicable GST Rate (GeM quotes are GST-inclusive)
            </Text>
            <View style={styles.chipRow}>
              {GST_RATE_PRESETS.map((rate) => {
                const active = gstRate === rate;
                return (
                  <Pressable
                    key={rate}
                    onPress={() => setGstRate(rate)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.surfaceSubtle,
                        borderColor: active ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? colors.textInverse : colors.textPrimary },
                      ]}
                    >
                      {rate}%
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Freight / Installation / Testing Overhead */}
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
              Total Freight, Packing &amp; Installation (₹)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.borderSubtle,
                  color: colors.textPrimary,
                },
              ]}
              value={freightText}
              onChangeText={setFreightText}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />

            {/* Target Margin % */}
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
              Target Opening Profit Margin ({targetMargin}%)
            </Text>
            <View style={styles.chipRow}>
              {TARGET_MARGIN_PRESETS.map((pct) => {
                const active = targetMargin === pct;
                return (
                  <Pressable
                    key={pct}
                    onPress={() => {
                      setTargetMargin(pct);
                      if (floorMargin > pct) setFloorMargin(Math.max(1, pct - 2));
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.surfaceSubtle,
                        borderColor: active ? colors.primary : colors.borderSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? colors.textInverse : colors.textPrimary },
                      ]}
                    >
                      {pct}%
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Hard RA Floor Margin % */}
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
              Hard RA Walk-Away Floor Margin ({safeFloorMargin}%)
            </Text>
            <View style={styles.chipRow}>
              {FLOOR_MARGIN_PRESETS.map((pct) => {
                const active = safeFloorMargin === pct;
                const disabled = pct > targetMargin;
                return (
                  <Pressable
                    key={pct}
                    disabled={disabled}
                    onPress={() => setFloorMargin(pct)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.danger : colors.surfaceSubtle,
                        borderColor: active ? colors.danger : colors.borderSubtle,
                        opacity: disabled ? 0.4 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? colors.textInverse : colors.textPrimary },
                      ]}
                    >
                      {pct}%
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Live Pricing Results */}
            {!hasCostEntered ? (
              <View
                style={[
                  styles.emptyPromptCard,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                ]}
              >
                <Text style={[styles.emptyPromptTitle, { color: colors.textPrimary }]}>
                  Enter your Unit Cost above to calculate
                </Text>
                <Text style={[styles.emptyPromptSub, { color: colors.textSecondary }]}>
                  Pre-filled from PDF: Qty {defaults.quantity.toLocaleString('en-IN')}
                  {defaults.estimatedValueInr
                    ? ` · Est. ₹${formatInr(defaults.estimatedValueInr)}`
                    : ''}
                  {defaults.emdAmountInr !== undefined
                    ? ` · EMD ₹${formatInr(defaults.emdAmountInr)}`
                    : ''}
                  {defaults.epbgPercentage > 0 ? ` · e-PBG ${defaults.epbgPercentage}%` : ''}.
                </Text>
              </View>
            ) : (
              <>
                {/* Opening Quote + RA Walk-Away Floor Hero Cards */}
                <View style={styles.resultCardsRow}>
                  <View
                    style={[
                      styles.resultCard,
                      { backgroundColor: colors.primaryTint, borderColor: colors.primary },
                    ]}
                  >
                    <Text style={[styles.resultTag, { color: colors.primary }]}>
                      OPENING QUOTE ({targetMargin}%)
                    </Text>
                    <Text style={[styles.resultBigNum, { color: colors.primary }]}>
                      ₹{formatInr(result.recommendedQuoteTotalInr)}
                    </Text>
                    <Text style={[styles.resultSub, { color: colors.textSecondary }]}>
                      ₹{formatInr(result.recommendedQuotePerUnitInr)} / unit
                    </Text>
                    <Text style={[styles.resultProfit, { color: colors.success }]}>
                      Net profit: ₹{formatInr(result.projectedTargetProfitInr)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.resultCard,
                      { backgroundColor: colors.dangerTint, borderColor: colors.danger },
                    ]}
                  >
                    <Text style={[styles.resultTag, { color: colors.danger }]}>
                      RA WALK-AWAY FLOOR ({safeFloorMargin}%)
                    </Text>
                    <Text style={[styles.resultBigNum, { color: colors.danger }]}>
                      ₹{formatInr(result.raFloorTotalInr)}
                    </Text>
                    <Text style={[styles.resultSub, { color: colors.textSecondary }]}>
                      ₹{formatInr(result.raFloorPerUnitInr)} / unit
                    </Text>
                    <Text style={[styles.resultProfit, { color: colors.danger }]}>
                      Do not bid below this
                    </Text>
                  </View>
                </View>

                {/* Variance vs Buyer Estimate Banner (only when PDF disclosed estimate) */}
                {result.varianceVsEstimatePercent !== undefined ? (
                  <View
                    style={[
                      styles.estimateBanner,
                      {
                        backgroundColor: result.isAboveEstimate
                          ? colors.warningTint
                          : colors.successTint,
                        borderColor: result.isAboveEstimate ? colors.warning : colors.success,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.estimateBannerText,
                        { color: result.isAboveEstimate ? colors.warning : colors.success },
                      ]}
                    >
                      {result.isAboveEstimate
                        ? `Opening quote is ${Math.abs(result.varianceVsEstimatePercent)}% ABOVE buyer's published estimate (₹${formatInr(defaults.estimatedValueInr!)}).`
                        : `Opening quote is ${Math.abs(result.varianceVsEstimatePercent)}% BELOW buyer's published estimate (₹${formatInr(defaults.estimatedValueInr!)}).`}
                    </Text>
                  </View>
                ) : null}

                {/* Audited Cost Breakdown */}
                <View
                  style={[
                    styles.breakdownCard,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
                  ]}
                >
                  <Text style={[styles.breakdownTitle, { color: colors.textMuted }]}>
                    EXACT COST &amp; WORKING CAPITAL BREAKDOWN
                  </Text>
                  {[
                    {
                      label: `Base Material (${result.quantity.toLocaleString('en-IN')} × ₹${formatInr(unitPurchaseCostInr)})`,
                      value: `₹${formatInr(result.baseMaterialCostTotalInr)}`,
                    },
                    {
                      label: `GST (${gstRate}%)`,
                      value: `₹${formatInr(result.gstAmountTotalInr)}`,
                    },
                    {
                      label: 'Freight & Overhead',
                      value: `₹${formatInr(result.freightAndOverheadTotalInr)}`,
                    },
                    {
                      label: `GeM Fee (${result.effectiveGemFeePercent}% + 18% GST)`,
                      value: `₹${formatInr(result.gemTransactionFeeTotalInr)}`,
                    },
                    {
                      label: 'Break-Even Landed Cost (0% Profit)',
                      value: `₹${formatInr(result.breakEvenTotalInr)}`,
                      bold: true,
                    },
                    {
                      label: 'Safe RA Decrement Headroom',
                      value: `₹${formatInr(result.raNegotiationHeadroomInr)}`,
                      accent: colors.primary,
                    },
                    {
                      label: result.emdWaivedForMseOem
                        ? 'Upfront EMD Cash (MSE OEM Waived)'
                        : 'Upfront EMD Cash',
                      value: result.emdWaivedForMseOem
                        ? '₹0 (Waived)'
                        : `₹${formatInr(result.effectiveEmdCashInr)}`,
                      accent: result.emdWaivedForMseOem ? colors.success : undefined,
                    },
                    {
                      label:
                        result.epbgPercentage > 0
                          ? `Post-Award e-PBG (${result.epbgPercentage}%${result.epbgDurationMonths ? ` · ${result.epbgDurationMonths} mo` : ''})`
                          : 'Post-Award e-PBG',
                      value:
                        result.epbgGuaranteeAtQuoteInr > 0
                          ? `₹${formatInr(result.epbgGuaranteeAtQuoteInr)}`
                          : 'Not required (0%)',
                    },
                  ].map((row, idx) => (
                    <View
                      key={row.label}
                      style={[
                        styles.breakdownRow,
                        idx > 0 && {
                          borderTopWidth: StyleSheet.hairlineWidth,
                          borderTopColor: colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
                        {row.label}
                      </Text>
                      <Text
                        style={[
                          styles.breakdownVal,
                          { color: row.accent || colors.textPrimary },
                          row.bold && { fontWeight: '900' },
                        ]}
                      >
                        {row.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
            <Pressable
              onPress={onClose}
              style={[
                styles.closeFooterBtn,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.closeFooterText, { color: colors.textPrimary }]}>Done</Text>
            </Pressable>
            <Pressable
              onPress={handleSharePricingNote}
              disabled={!hasCostEntered}
              style={[
                styles.shareFooterBtn,
                {
                  backgroundColor: hasCostEntered ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.shareFooterText, { color: colors.textInverse }]}>
                Share Internal Pricing Note ↗
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 11,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
  body: { maxHeight: 560 },
  bodyContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    fontSize: 14,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 7,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipText: { fontSize: 12, fontWeight: '800' },
  emptyPromptCard: {
    marginTop: 16,
    borderRadius: 11,
    borderWidth: 1,
    padding: 14,
  },
  emptyPromptTitle: { fontSize: 13.5, fontWeight: '800', marginBottom: 4 },
  emptyPromptSub: { fontSize: 12, lineHeight: 17 },
  resultCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  resultCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.2,
    padding: 11,
  },
  resultTag: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  resultBigNum: {
    fontSize: 16.5,
    fontWeight: '900',
  },
  resultSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  resultProfit: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 5,
  },
  estimateBanner: {
    marginTop: 10,
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  estimateBannerText: {
    fontSize: 11.5,
    fontWeight: '700',
    lineHeight: 16,
  },
  breakdownCard: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  breakdownTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 8,
  },
  breakdownLabel: {
    fontSize: 11.5,
    flex: 1,
  },
  breakdownVal: {
    fontSize: 12.5,
    fontWeight: '700',
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  closeFooterBtn: {
    minWidth: 80,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  closeFooterText: { fontSize: 13, fontWeight: '700' },
  shareFooterBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  shareFooterText: { fontSize: 13, fontWeight: '800' },
});
