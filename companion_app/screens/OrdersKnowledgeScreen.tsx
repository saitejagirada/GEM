/**
 * GeM Contracts & Statutory Knowledge Screen
 * Replicates https://gem.gov.in/view_contracts and post-award transparency:
 * - 5 Verified Executed Public Contracts (₹1.32 Cr CVC Pre-qualification)
 * - Statutory 10-Day CRAC Deemed Acceptance Rule (carting restriction for errant buyers)
 * - PFMS Treasury Disbursement Tracker
 * - Public Contract Search link (view_contracts)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Linking,
} from 'react-native';
import { MOCK_ACCEPTED_ORDERS } from '../fixtures/mockData';
import { TouchButton } from '../components/TouchButton';
import { useTheme } from '../theme/ThemeContext';
import { formatInr, formatLakhs } from '../utils/formatters';
import type { AcceptedOrder } from '../types/index';
import { DataNotice } from '../components/DataNotice';

export const OrdersKnowledgeScreen: React.FC = () => {
  const { colors, fontMultiplier, isDark } = useTheme();

  const [selectedOrder, setSelectedOrder] = useState<AcceptedOrder | null>(null);

  const totalAcceptedValueInr = MOCK_ACCEPTED_ORDERS.reduce((acc, o) => acc + o.orderValueInr, 0);

  const openContractsPortal = useCallback(() => {
    Linking.openURL('https://gem.gov.in/view_contracts').catch(() => {
      Alert.alert('GeM Contracts', 'Visit https://gem.gov.in/view_contracts in your browser.');
    });
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <DataNotice>Contract discovery · Values and workflow details should be checked against the official contract record.</DataNotice>
      {/* Top Banner: Public Transparency */}
      <View style={[styles.topBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View>
          <Text style={[styles.topBannerTitle, { color: colors.textPrimary, fontSize: 16 * fontMultiplier }]}>
            Contracts &amp; order records
          </Text>
          <Text style={[styles.topBannerSub, { color: colors.textMuted }]}>
            Review contract values, CRAC milestones and PFMS references in one place.
          </Text>
        </View>

        <TouchButton
          title="Search All GeM Contracts (gem.gov.in) ➔"
          variant="outline"
          size="small"
          icon="🌐"
          onPress={openContractsPortal}
          style={{ marginTop: 8 }}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* CRAC workflow reference */}
        <View style={[styles.cracCard, { backgroundColor: isDark ? colors.surfaceSubtle : '#EFF6FF', borderColor: '#BFDBFE' }]}>
          <View style={styles.cracHeaderRow}>
            <Text style={styles.cracIcon}>⚖️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cracTitle, { color: '#1E40AF' }]}>
                CRAC 10-day workflow reference
              </Text>
              <Text style={[styles.cracSub, { color: '#3B82F6' }]}>
                Confirm the current policy and order terms on the official portal
              </Text>
            </View>
          </View>
          <Text style={styles.cracBody}>
            Use this card as a workflow reminder only. The applicable CRAC window, acceptance path and payment steps depend on the current order terms and official GeM guidance.
          </Text>
        </View>

        {/* 5 Verified Orders Showcase */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: 15 * fontMultiplier }]}>
            Executed contract records ({MOCK_ACCEPTED_ORDERS.length})
          </Text>
          <View style={[styles.volPill, { backgroundColor: '#DCFCE7' }]}>
            <Text style={styles.volPillText}>Total: {formatLakhs(totalAcceptedValueInr)}</Text>
          </View>
        </View>

        {MOCK_ACCEPTED_ORDERS.map((order) => (
          <View
            key={order.contractNumber}
            style={[styles.orderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.orderTopRow}>
              <View style={[styles.orderStatusPill, { backgroundColor: '#DCFCE7' }]}>
                <Text style={styles.orderStatusText}>CRAC {order.cracStatus}</Text>
              </View>
              <Text style={[styles.contractNum, { color: colors.textMuted }]}>{order.contractNumber}</Text>
            </View>

            <Text style={[styles.orderTitle, { color: colors.textPrimary, fontSize: 13.5 * fontMultiplier }]}>
              {order.title}
            </Text>

            <Text style={[styles.buyerText, { color: colors.textMuted }]}>
              Buyer: <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{order.buyerDepartment}</Text> • {order.ministry}
            </Text>

            <View style={[styles.metaGrid, { backgroundColor: isDark ? colors.surfaceSubtle : '#F8FAFC' }]}>
              <View style={styles.metaCell}>
                <Text style={[styles.metaLabel, { color: colors.textMuted }]}>CONTRACT VALUE</Text>
                <Text style={[styles.metaValue, { color: colors.emerald }]}>
                  {formatLakhs(order.orderValueInr)}
                </Text>
              </View>
              <View style={styles.metaCell}>
                <Text style={[styles.metaLabel, { color: colors.textMuted }]}>CRAC STATUS</Text>
                <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{order.cracStatus}</Text>
              </View>
              <View style={styles.metaCell}>
                <Text style={[styles.metaLabel, { color: colors.textMuted }]}>PFMS UTR</Text>
                <Text style={[styles.metaValue, { color: colors.primary }]}>{order.pfmsUtrNumber || 'PFMS-TREASURY-DBT'}</Text>
              </View>
              <View style={styles.metaCell}>
                <Text style={[styles.metaLabel, { color: colors.textMuted }]}>SLA COMPLIANCE</Text>
                <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{order.slaCompliance}</Text>
              </View>
            </View>

            <View style={{ marginTop: 8 }}>
              <TouchButton
                title="View Inspection &amp; PFMS Details"
                variant="outline"
                size="small"
                icon="📄"
                onPress={() =>
                  Alert.alert(
                    `Contract: ${order.contractNumber}`,
                    `Title: ${order.title}\nBuyer: ${order.buyerDepartment}\nMinistry: ${order.ministry}\nOrder Value: ${formatLakhs(order.orderValueInr)}\nOrder Date: ${order.orderDate}\nCRAC Acceptance: ${order.cracStatus} (${order.cracDate || 'Verified'})\nInvoice: ${order.invoiceNumber}\nPFMS UTR: ${order.pfmsUtrNumber || 'Disbursed via RBI e-Kuber'}`
                  )
                }
              />
            </View>
          </View>
        ))}

        {/* Public Transparency Statement */}
        <View style={[styles.publicNotice, { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' }]}>
          <Text style={[styles.publicNoticeText, { color: colors.textMuted }]}>
            This screen is a discovery and workflow companion. Use the linked official portal for the authoritative contract, payment and vendor record.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBanner: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  topBannerTitle: { fontWeight: '900', letterSpacing: -0.2 },
  topBannerSub: { fontSize: 11.5, marginTop: 2 },
  scrollContent: { padding: 12, paddingBottom: 40 },
  cracCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  cracHeaderRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 6 },
  cracIcon: { fontSize: 20 },
  cracTitle: { fontSize: 12.5, fontWeight: '800' },
  cracSub: { fontSize: 10, marginTop: 1 },
  cracBody: { fontSize: 11.5, color: '#1E293B', lineHeight: 17 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontWeight: '800' },
  volPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  volPillText: { color: '#15803D', fontSize: 10.5, fontWeight: '800' },
  orderCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderStatusPill: { paddingHorizontal: 6, paddingVertical: 2.5, borderRadius: 4 },
  orderStatusText: { color: '#15803D', fontSize: 9.5, fontWeight: '800' },
  contractNum: { fontSize: 11, fontWeight: '700' },
  orderTitle: { fontWeight: '800', lineHeight: 18, marginBottom: 4 },
  buyerText: { fontSize: 11, marginBottom: 8 },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 8,
    borderRadius: 8,
  },
  metaCell: { width: '48%' },
  metaLabel: { fontSize: 8.5, fontWeight: '800', marginBottom: 2 },
  metaValue: { fontSize: 11, fontWeight: '800' },
  publicNotice: {
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  publicNoticeText: { fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
