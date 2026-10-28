/**
 * GeM Executed Contracts Screen
 * Conforms to Screen 5 of the GeM Mobile UI Specification:
 * - SearchField: "Search contract number, department or item"
 * - Filter chips: All, Ministry, Department, CRAC Verified, Filters [icon]
 * - Verified Contract Cards with CRAC VERIFIED status badge, contract number,
 *   title, buyer department, and 2x2 Meta Grid (Order Value, Status, PFMS UTR, Delivery SLA)
 * - Outline [View Details] action and official document access
 * - Contract Detail modal
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Modal,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MOCK_ACCEPTED_ORDERS, DYNAMIC_ACCEPTED_ORDERS } from '../fixtures/mockData';
import { PortalApiClient } from '../services/PortalApiClient';
import { SupabaseClient } from '../services/SupabaseClient';
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import {
  SearchField,
  CompactChip,
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
  FilterBottomSheetModal,
} from '../components/SharedUI';
import { formatInr, formatDateSafe } from '../utils/formatters';
import type { AcceptedOrder } from '../types/index';

export const OrdersKnowledgeScreen: React.FC = () => {
  const { colors, fontMultiplier } = useTheme();

  const [orders, setOrders] = useState<AcceptedOrder[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRAC' | 'DEFENCE' | 'RAILWAYS' | 'HEALTH' | 'SPACE'>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<AcceptedOrder | null>(null);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);

  const loadContracts = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const live = await PortalApiClient.getContracts();
      if (live && live.length > 0) {
        setOrders(live);
        setIsOffline(false);
      } else {
        setOrders([]);
        setIsOffline(true);
      }
    } catch {
      setOrders([]);
      setIsOffline(true);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (activeFilter === 'CRAC' && order.cracStatus !== 'CRAC_ACCEPTED' && order.cracStatus !== 'PAYMENT_DISBURSED') {
        return false;
      }
      if (activeFilter === 'DEFENCE' && !order.ministry.toLowerCase().includes('defence')) {
        return false;
      }
      if (activeFilter === 'RAILWAYS' && !order.ministry.toLowerCase().includes('railway')) {
        return false;
      }
      if (activeFilter === 'HEALTH' && !order.ministry.toLowerCase().includes('health')) {
        return false;
      }
      if (activeFilter === 'SPACE' && !order.ministry.toLowerCase().includes('space')) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesContract = order.contractNumber.toLowerCase().includes(q);
        const matchesTitle = order.title.toLowerCase().includes(q);
        const matchesDept = order.buyerDepartment.toLowerCase().includes(q);
        const matchesUtr = (order.pfmsUtrNumber || '').toLowerCase().includes(q);
        if (!matchesContract && !matchesTitle && !matchesDept && !matchesUtr) return false;
      }

      return true;
    });
  }, [orders, activeFilter, searchQuery]);

  const openContractsPortal = useCallback(() => {
    Linking.openURL('https://gem.gov.in/view_contracts').catch(() => {
      Alert.alert('GeM Contracts', 'Visit https://gem.gov.in/view_contracts in your browser.');
    });
  }, []);

  const renderContractCard = ({ item }: { item: AcceptedOrder }) => {
    const isCracVerified = item.cracStatus === 'CRAC_ACCEPTED' || item.cracStatus === 'PAYMENT_DISBURSED';

    return (
      <View
        style={[
          styles.contractCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Card Header: CRAC VERIFIED Badge + Contract Number */}
        <View style={styles.cardHeaderRow}>
          <StatusBadge
            label={isCracVerified ? 'CRAC VERIFIED' : 'PENDING'}
            tone={isCracVerified ? 'success' : 'warning'}
            dot
          />
          <Text style={[styles.contractNumber, { color: colors.textSecondary }]}>
            {item.contractNumber}
          </Text>
        </View>

        {/* Title & Department */}
        <Text
          style={[styles.contractTitle, { color: colors.textPrimary, fontSize: 14 * fontMultiplier }]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        <Text style={[styles.deptText, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.buyerDepartment} • {item.ministry}
        </Text>

        {/* 2x2 Meta Grid: Order Value, Status, PFMS UTR, Delivery SLA */}
        <View style={[styles.metaGrid, { backgroundColor: colors.surfaceSubtle }]}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>ORDER VALUE</Text>
            <Text style={[styles.metricValue, { color: colors.primary }]}>
              {formatInr(item.orderValueInr)}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>STATUS</Text>
            <Text style={[styles.metricValue, { color: colors.emerald }]}>
              {item.cracStatus === 'PAYMENT_DISBURSED' ? 'Accepted & Disbursed' : 'CRAC Accepted'}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>PFMS UTR</Text>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.pfmsUtrNumber || 'PFMS-TREASURY-01'}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>DELIVERY SLA</Text>
            <Text
              style={[
                styles.metricValue,
                { color: item.slaCompliance === 'EARLY_DELIVERY' ? colors.success : colors.textPrimary },
              ]}
            >
              {item.slaCompliance === 'EARLY_DELIVERY' ? 'Completed Early' : 'Completed On Time'}
            </Text>
          </View>
        </View>

        {/* Action Button: Outline View Details */}
        <SecondaryButton
          label="View Contract Details"
          onPress={() => setSelectedOrder(item)}
          style={{ marginTop: 4 }}
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search & Filter Toolbar */}
      <View style={styles.topSection}>
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search contract number, department or item"
          style={{ marginBottom: 10 }}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipRow}
        >
          <CompactChip
            label="Filters"
            icon="⚙️"
            selected={showFilterModal}
            onPress={() => setShowFilterModal(true)}
          />
          <CompactChip
            label="All Contracts"
            selected={activeFilter === 'ALL'}
            onPress={() => setActiveFilter('ALL')}
          />
          <CompactChip
            label="CRAC Verified"
            selected={activeFilter === 'CRAC'}
            onPress={() => setActiveFilter('CRAC')}
          />
          <CompactChip
            label="Defence"
            selected={activeFilter === 'DEFENCE'}
            onPress={() => setActiveFilter('DEFENCE')}
          />
          <CompactChip
            label="Railways"
            selected={activeFilter === 'RAILWAYS'}
            onPress={() => setActiveFilter('RAILWAYS')}
          />
          <CompactChip
            label="Healthcare"
            selected={activeFilter === 'HEALTH'}
            onPress={() => setActiveFilter('HEALTH')}
          />
          <CompactChip
            label="Space / ISRO"
            selected={activeFilter === 'SPACE'}
            onPress={() => setActiveFilter('SPACE')}
          />
        </ScrollView>
      </View>

      {/* Contract List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.contractNumber}
        renderItem={renderContractCard}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={loadContracts}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary, marginTop: 16 }]}>
                Connecting to GeM Portal...
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Fetching executed contracts and CRAC disbursements.
              </Text>
            </View>
          ) : isOffline ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📡</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Contracts Available (Offline)</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Unable to load executed contracts from GeM portal. Please check your internet connection and try again.
              </Text>
              <PrimaryButton
                label="Retry Connection"
                onPress={loadContracts}
                style={{ marginTop: 16 }}
              />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📑</Text>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No contracts found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Try clearing search terms or selecting &quot;All Contracts&quot;.
              </Text>
            </View>
          )
        }
      />

      {/* Filter Bottom Sheet */}
      <FilterBottomSheetModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filter Executed Contracts"
        onReset={() => setActiveFilter('ALL')}
        onApply={() => {}}
      >
        <Text style={[styles.sheetSectionTitle, { color: colors.textPrimary }]}>Ministry / Department</Text>
        <View style={styles.sheetPillWrap}>
          {[
            { id: 'ALL', label: 'All Ministries' },
            { id: 'DEFENCE', label: 'Ministry of Defence' },
            { id: 'RAILWAYS', label: 'Ministry of Railways' },
            { id: 'CRAC', label: 'CRAC Disbursed Only' },
          ].map((item) => (
            <CompactChip
              key={item.id}
              label={item.label}
              selected={activeFilter === item.id}
              onPress={() => setActiveFilter(item.id as typeof activeFilter)}
              style={{ marginBottom: 8 }}
            />
          ))}
        </View>
      </FilterBottomSheetModal>

      {/* Contract Detail Modal */}
      {selectedOrder && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setSelectedOrder(null)}>
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setSelectedOrder(null)} />
            <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalContractNum, { color: colors.primary }]}>
                    {selectedOrder.contractNumber}
                  </Text>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                    {selectedOrder.title}
                  </Text>
                </View>
                <Pressable onPress={() => setSelectedOrder(null)} hitSlop={10}>
                  <Text style={[styles.modalCloseText, { color: colors.textMuted }]}>✕</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={[styles.detailSection, { borderBottomColor: colors.borderSubtle }]}>
                  <Text style={[styles.detailSecTitle, { color: colors.textPrimary }]}>Buyer Establishment</Text>
                  <Text style={[styles.detailVal, { color: colors.textSecondary }]}>
                    {selectedOrder.buyerDepartment}
                  </Text>
                  <Text style={[styles.detailVal, { color: colors.textSecondary }]}>
                    {selectedOrder.ministry}
                  </Text>
                </View>

                <View style={[styles.detailSection, { borderBottomColor: colors.borderSubtle }]}>
                  <Text style={[styles.detailSecTitle, { color: colors.textPrimary }]}>Commercial Value & Payment</Text>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailKey, { color: colors.textSecondary }]}>Order Value:</Text>
                    <Text style={[styles.detailValBold, { color: colors.primary }]}>
                      {formatInr(selectedOrder.orderValueInr)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailKey, { color: colors.textSecondary }]}>Quantity Delivered:</Text>
                    <Text style={[styles.detailValBold, { color: colors.textPrimary }]}>
                      {selectedOrder.quantity.toLocaleString()} Units
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailKey, { color: colors.textSecondary }]}>CRAC Acceptance Date:</Text>
                    <Text style={[styles.detailValBold, { color: colors.textPrimary }]}>
                      {selectedOrder.cracDate}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailKey, { color: colors.textSecondary }]}>PFMS Bank UTR:</Text>
                    <Text style={[styles.detailValBold, { color: colors.emerald }]}>
                      {selectedOrder.pfmsUtrNumber || 'Disbursed via PFMS'}
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.detailSecTitle, { color: colors.textPrimary }]}>
                    Statutory CRAC 10-Day Rule
                  </Text>
                  <Text style={[styles.cracRuleText, { color: colors.textSecondary }]}>
                    Per Ministry of Finance OM No. F.1/26/2018-PPD, once consignee receives goods, 10-day deemed acceptance automatically triggers if no rejection is logged, preventing carting delays for MSMEs.
                  </Text>
                </View>
              </ScrollView>

              <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                <SecondaryButton
                  label="Close"
                  onPress={() => setSelectedOrder(null)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <PrimaryButton
                  label="Search All Contracts (gem.gov.in) ↗"
                  onPress={openContractsPortal}
                  style={{ flex: 1.6 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSection: {
    padding: DESIGN_TOKENS.pagePaddingMobile,
    paddingBottom: 8,
  },
  filterChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContent: {
    padding: DESIGN_TOKENS.pagePaddingMobile,
    paddingTop: 4,
    paddingBottom: 40,
  },
  contractCard: {
    borderRadius: DESIGN_TOKENS.cardRadius,
    borderWidth: DESIGN_TOKENS.borderWidth,
    padding: 14,
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  contractNumber: {
    fontSize: 12,
    fontWeight: '650',
  },
  contractTitle: {
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 20,
  },
  deptText: {
    fontSize: 12,
    marginBottom: 10,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
  },
  metricItem: {
    width: '50%',
    padding: 4,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  sheetSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  sheetPillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  modalContractNum: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    maxWidth: 280,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalBody: {
    paddingHorizontal: 16,
  },
  detailSection: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  detailSecTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  detailVal: {
    fontSize: 12,
    lineHeight: 18,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailKey: {
    fontSize: 12,
  },
  detailValBold: {
    fontSize: 12,
    fontWeight: '700',
  },
  cracRuleText: {
    fontSize: 12,
    lineHeight: 17,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
