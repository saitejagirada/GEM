import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  TextInput,
} from 'react-native';
import type { AuctionItem } from '../types/index';
import { formatInr } from '../utils/formatters';
import { useTheme } from '../theme/ThemeContext';

interface ReverseAuctionScreenProps {
  onSelectBid?: (bidNumber: string) => void;
}

const REALISTIC_REVERSE_AUCTIONS: (AuctionItem & {
  originalBidNumber: string;
  department: string;
  totalQuantity: number;
  closingDateLabel: string;
})[] = [
  {
    id: 'ra-1',
    contractNumber: 'GEM/2026/RA/99201',
    originalBidNumber: 'GEM/2026/B/890456',
    title: 'Industrial Grade Unmanaged Gigabit PoE Switches (24-Port)',
    category: 'IT & Telecommunications',
    department: 'Western Railway Headquarters',
    buyerOrganization: 'Ministry of Railways',
    totalQuantity: 120,
    closingTimeUtc: '2026-10-27T15:00:00Z',
    closingDateLabel: '27-Oct-2026, 03:00 PM',
    currentLowestBid: 3850000,
    sellerRank: 2,
    sellerCurrentBid: 3900000,
    minimumDecrement: 25000,
    autoExtensionMinutes: 10,
    isExtended: false,
  },
  {
    id: 'ra-2',
    contractNumber: 'GEM/2026/RA/99202',
    originalBidNumber: 'GEM/2026/B/890123',
    title: 'Supply and Commissioning of 40W Solar LED Street Lighting Systems',
    category: 'Solar & Renewable Energy',
    department: 'Department of Rural Development',
    buyerOrganization: 'Ministry of Rural Development',
    totalQuantity: 250,
    closingTimeUtc: '2026-10-28T17:00:00Z',
    closingDateLabel: '28-Oct-2026, 05:00 PM',
    currentLowestBid: 2650000,
    sellerRank: 1,
    sellerCurrentBid: 2650000,
    minimumDecrement: 20000,
    autoExtensionMinutes: 10,
    isExtended: false,
  },
  {
    id: 'ra-3',
    contractNumber: 'GEM/2026/RA/99203',
    originalBidNumber: 'GEM/2026/B/890789',
    title: 'High-Tensile Structural Hex Bolts and Fasteners (M24 Grade 8.8)',
    category: 'Heavy Engineering & Fasteners',
    department: 'Bharat Dynamics Limited',
    buyerOrganization: 'Ministry of Defence',
    totalQuantity: 50000,
    closingTimeUtc: '2026-10-29T14:30:00Z',
    closingDateLabel: '29-Oct-2026, 02:30 PM',
    currentLowestBid: 1420000,
    sellerRank: 3,
    sellerCurrentBid: 1480000,
    minimumDecrement: 10000,
    autoExtensionMinutes: 10,
    isExtended: false,
  },
  {
    id: 'ra-4',
    contractNumber: 'GEM/2026/RA/99204',
    originalBidNumber: 'GEM/2026/B/891001',
    title: 'Hospital ICU Ventilator Consumables and Breathing Circuits',
    category: 'Medical & Healthcare',
    department: 'All India Institute of Medical Sciences (AIIMS)',
    buyerOrganization: 'Ministry of Health & Family Welfare',
    totalQuantity: 2000,
    closingTimeUtc: '2026-10-30T16:00:00Z',
    closingDateLabel: '30-Oct-2026, 04:00 PM',
    currentLowestBid: 920000,
    sellerRank: 1,
    sellerCurrentBid: 920000,
    minimumDecrement: 5000,
    autoExtensionMinutes: 10,
    isExtended: false,
  },
];

export const ReverseAuctionScreen: React.FC<ReverseAuctionScreenProps> = ({ onSelectBid }) => {
  const { colors, isDark } = useTheme();
  const [auctions] = useState(REALISTIC_REVERSE_AUCTIONS);
  const [costFloors, setCostFloors] = useState<Record<string, string>>({});

  const handleOpenGemRA = (raNumber: string) => {
    Alert.alert(
      'Official GeM Portal',
      `Opening Reverse Auction ${raNumber} on bidplus.gem.gov.in.\n\nAll formal price decrements are submitted directly on the official GeM portal.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open GeM Website',
          onPress: () => {
            Linking.openURL('https://bidplus.gem.gov.in/all-bids').catch(() => {});
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Official portal hand-off */}
      <View style={[styles.portalBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.portalBadge}>
          <Text style={styles.portalBadgeText}>REVERSE AUCTION RECORDS</Text>
        </View>
        <Text style={[styles.portalTitle, { color: colors.textPrimary }]}>Reverse auction discovery</Text>
        <Text style={[styles.portalSub, { color: colors.textMuted }]}>
          Review the available record, then open bidplus.gem.gov.in for authoritative status and bidding.
        </Text>
      </View>

      {/* RA Cards List */}
      {auctions.map((ra) => {
        const isL1 = ra.sellerRank === 1;

        return (
          <View key={ra.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Top row: RA Number & Status */}
            <View style={styles.cardTopRow}>
              <View style={styles.raPill}>
                <Text style={styles.raPillText}>{ra.contractNumber}</Text>
              </View>
              <View style={[styles.rankBadge, isL1 ? styles.rankL1 : styles.rankOutbid]}>
                <Text style={[styles.rankText, isL1 ? styles.rankL1Text : styles.rankOutbidText]}>
                  {isL1 ? 'CURRENT RANK L1' : `CURRENT RANK L${ra.sellerRank}`}
                </Text>
              </View>
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>{ra.title}</Text>
            <Text style={[styles.department, { color: colors.textMuted }]}>
              {ra.department} • {ra.buyerOrganization}
            </Text>

            {/* Key RA Metrics Grid (Official GeM Portal Style) */}
            <View style={[styles.metricsGrid, { backgroundColor: isDark ? colors.surfaceSubtle : '#F8FAFC', borderColor: colors.border }]}>
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>Current Lowest (L1)</Text>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>₹{formatInr(ra.currentLowestBid)}</Text>
              </View>
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>Your Last Bid</Text>
                <Text style={[styles.metricValue, { color: colors.textPrimary }, isL1 && styles.textL1]}>
                  ₹{formatInr(ra.sellerCurrentBid || ra.currentLowestBid)}
                </Text>
              </View>
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>Min Decrement</Text>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>₹{formatInr(ra.minimumDecrement)}</Text>
              </View>
              <View style={styles.metricCell}>
                <Text style={styles.metricLabel}>Closing Schedule</Text>
                <Text style={[styles.metricValueTime, { color: colors.primary }]}>{ra.closingDateLabel}</Text>
              </View>
            </View>

            {/* Auto-extension clause note */}
            <View style={styles.ruleNotice}>
              <Text style={styles.ruleNoticeText}>
                ⏱ 10-Min Auto Extension Rule: Bids in last 10 mins extend auction window by 10 mins.
              </Text>
            </View>

            {/* Real GeM Concealed L1 Standings Banner */}
            <View style={styles.concealedStandingsBox}>
              <Text style={styles.concealedTitle}>
                {isL1 ? 'Current rank in this record: L1' : `Current rank in this record: L${ra.sellerRank}`}
              </Text>
              <Text style={styles.concealedDesc}>
                {isL1
                  ? 'Open the official auction room to confirm the live standing and applicable decrement.'
                  : `Open the official auction room to confirm competitor bids and the required decrement of ₹${formatInr(ra.minimumDecrement)}.`}
              </Text>
            </View>

            {/* Cost Floor Guard (Prevents Suicide Bidding) */}
            <View style={styles.costGuardBox}>
              <View style={styles.costGuardHeader}>
                <Text style={styles.costGuardTitle}>🛡️ Safe Cost Floor Guard</Text>
                <Text style={styles.costGuardHint}>Protect against suicide bidding</Text>
              </View>
              <TextInput
                style={styles.costGuardInput}
                placeholder="Enter minimum profitable cost in ₹ (e.g. 3500000)"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={costFloors[ra.id] || ''}
                onChangeText={(val) => setCostFloors({ ...costFloors, [ra.id]: val })}
              />
              {Boolean(costFloors[ra.id]) && Number(costFloors[ra.id]) > (ra.currentLowestBid - ra.minimumDecrement) && (
                <View style={styles.suicideAlert}>
                  <Text style={styles.suicideAlertText}>
                    🛑 DANGER: Next decrement (₹{formatInr(ra.currentLowestBid - ra.minimumDecrement)}) drops below your break-even floor of ₹{formatInr(Number(costFloors[ra.id]))}! Bidding lower causes negative profit.
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.openPortalBtn}
                onPress={() => handleOpenGemRA(ra.contractNumber)}
                activeOpacity={0.8}
              >
                <Text style={styles.openPortalBtnText}>Bid on GeM Website ➔</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F3F6' },
  content: { padding: 12, paddingBottom: 32 },
  portalBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  portalBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  portalBadgeText: { color: '#1D4ED8', fontSize: 10, fontWeight: '800' },
  portalTitle: { color: '#0F172A', fontSize: 15, fontWeight: '800' },
  portalSub: { color: '#64748B', fontSize: 11, marginTop: 4, lineHeight: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  raPill: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  raPillText: { color: '#7E22CE', fontSize: 11, fontWeight: '800' },
  rankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rankL1: { backgroundColor: '#DCFCE7' },
  rankL1Text: { color: '#15803D', fontSize: 11, fontWeight: '900' },
  rankOutbid: { backgroundColor: '#FEF3C7' },
  rankOutbidText: { color: '#B45309', fontSize: 11, fontWeight: '800' },
  rankText: { fontSize: 11, fontWeight: '800' },
  title: { color: '#0F172A', fontSize: 14, fontWeight: '800', lineHeight: 20 },
  department: { color: '#64748B', fontSize: 11, fontWeight: '500', marginTop: 4 },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  metricCell: { width: '50%', paddingVertical: 4 },
  metricLabel: { color: '#64748B', fontSize: 10, fontWeight: '600' },
  metricValue: { color: '#0F172A', fontSize: 13, fontWeight: '800', marginTop: 2 },
  textL1: { color: '#15803D' },
  metricValueTime: { color: '#2563EB', fontSize: 11, fontWeight: '800', marginTop: 2 },
  ruleNotice: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  ruleNoticeText: { color: '#64748B', fontSize: 10, lineHeight: 14 },
  actionRow: { marginTop: 12 },
  openPortalBtn: {
    backgroundColor: '#0B3B60',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openPortalBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  concealedStandingsBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  concealedTitle: { color: '#1E40AF', fontSize: 12, fontWeight: '800', marginBottom: 2 },
  concealedDesc: { color: '#2563EB', fontSize: 11, lineHeight: 15 },
  costGuardBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  costGuardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  costGuardTitle: { color: '#92400E', fontSize: 11, fontWeight: '800' },
  costGuardHint: { color: '#B45309', fontSize: 9, fontWeight: '600' },
  costGuardInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  suicideAlert: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
  },
  suicideAlertText: { color: '#DC2626', fontSize: 11, fontWeight: '700', lineHeight: 15 },
});
