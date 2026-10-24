import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';

interface PhonePeAlertsScreenProps {
  onOpenAuctions: () => void;
  onOpenPfms: () => void;
}

export const PhonePeAlertsScreen: React.FC<PhonePeAlertsScreenProps> = ({
  onOpenAuctions,
  onOpenPfms,
}) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Title */}
      <Text style={styles.screenTitle}>Alerts</Text>

      {/* Alert Item 1: Outbid Notice */}
      <View style={styles.alertCard}>
        <View style={[styles.alertIconCircle, { backgroundColor: '#FEE2E2' }]}>
          <Text style={styles.alertIcon}>⚡</Text>
        </View>
        <View style={styles.alertBody}>
          <View style={styles.alertHeaderRow}>
            <Text style={styles.alertTitle}>Outbid Alert: BSF Routers</Text>
            <Text style={styles.alertTime}>12m</Text>
          </View>
          <Text style={styles.alertDesc}>
            A competing vendor placed a lower bid. Current L1 is ₹38,50,000 (You are Rank L2).
          </Text>
          <TouchableOpacity style={styles.alertActionBtn} onPress={onOpenAuctions}>
            <Text style={styles.alertActionText}>Counter-Bid in Auction Room ➔</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Alert Item 2: Corrigendum Amendment */}
      <View style={styles.alertCard}>
        <View style={[styles.alertIconCircle, { backgroundColor: '#E0F2FE' }]}>
          <Text style={styles.alertIcon}>📝</Text>
        </View>
        <View style={styles.alertBody}>
          <View style={styles.alertHeaderRow}>
            <Text style={styles.alertTitle}>Corrigendum: LED Luminaires</Text>
            <Text style={styles.alertTime}>2h</Text>
          </View>
          <Text style={styles.alertDesc}>
            Military Engineer Services (MES) added revised technical specs and extended closing by 48 hours.
          </Text>
          <TouchableOpacity
            style={styles.alertActionBtn}
            onPress={() => Alert.alert('Corrigendum Details', 'Specification amended: LM79/LM80 test report validity extended to 5 years.')}
          >
            <Text style={styles.alertActionText}>View Corrigendum Document ➔</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Alert Item 3: Statutory SLA Countdown */}
      <View style={styles.alertCard}>
        <View style={[styles.alertIconCircle, { backgroundColor: '#FEF3C7' }]}>
          <Text style={styles.alertIcon}>⏳</Text>
        </View>
        <View style={styles.alertBody}>
          <View style={styles.alertHeaderRow}>
            <Text style={styles.alertTitle}>Statutory 10-Day SLA (Day 4)</Text>
            <Text style={styles.alertTime}>1d</Text>
          </View>
          <Text style={styles.alertDesc}>
            Contract GEM-PO-88192: 6 days remaining. Deemed acceptance triggers automatically on Day 10 under GFR 149.
          </Text>
          <TouchableOpacity style={styles.alertActionBtn} onPress={onOpenPfms}>
            <Text style={styles.alertActionText}>Track PFMS Disbursement ➔</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SECTION: Rewards & MSE Incentives (PhonePe Rewards style) */}
      <Text style={styles.rewardsHeader}>GOVERNMENT SCHEMES &amp; BENEFITS</Text>
      <View style={styles.rewardsRow}>
        <TouchableOpacity
          style={styles.rewardCard}
          onPress={() => Alert.alert('MSE Benefits', 'Under Public Procurement Policy 2012, 25% of annual procurement is reserved for MSEs with 100% EMD waiver.')}
          activeOpacity={0.7}
        >
          <View style={styles.rewardIconCircle}>
            <Text style={styles.rewardIcon}>🎁</Text>
          </View>
          <Text style={styles.rewardTitle}>MSE Preference</Text>
          <Text style={styles.rewardSub}>₹0 EMD &amp; 25% quota</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.rewardCard}
          onPress={() => Alert.alert('Class-1 Local Supplier', 'Suppliers with >= 50% local value addition receive purchase preference over non-local vendors.')}
          activeOpacity={0.7}
        >
          <View style={styles.rewardIconCircle}>
            <Text style={styles.rewardIcon}>⭐</Text>
          </View>
          <Text style={styles.rewardTitle}>Class-1 Local</Text>
          <Text style={styles.rewardSub}>Make in India benefits</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.rewardCard}
          onPress={() => Alert.alert('TReDS Factoring', 'Unlock instant liquidity against approved GeM invoices via TReDS RBI platforms.')}
          activeOpacity={0.7}
        >
          <View style={styles.rewardIconCircle}>
            <Text style={styles.rewardIcon}>➔</Text>
          </View>
          <Text style={styles.rewardTitle}>TReDS Payout</Text>
          <Text style={styles.rewardSub}>Invoice financing</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, paddingBottom: 32 },
  screenTitle: {
    color: '#1A1C1E',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
  },
  alertCard: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  alertIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertIcon: { fontSize: 20 },
  alertBody: { flex: 1 },
  alertHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  alertTime: { color: '#9CA3AF', fontSize: 11, fontWeight: '500' },
  alertDesc: {
    color: '#4B5563',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 6,
  },
  alertActionBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  alertActionText: {
    color: '#5F259F',
    fontSize: 12,
    fontWeight: '700',
  },
  rewardsHeader: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 12,
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  rewardCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rewardIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  rewardIcon: { fontSize: 16 },
  rewardTitle: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  rewardSub: {
    color: '#6B7280',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
});
