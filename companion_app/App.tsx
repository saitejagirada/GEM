import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { UserAgentFeedScreen } from './screens/UserAgentFeedScreen';
import { AuctionsHubScreen } from './screens/AuctionsHubScreen';
import { ParticipatedPortfolioScreen } from './screens/ParticipatedPortfolioScreen';
import { CracInspectorScreen } from './screens/CracInspectorScreen';
import { PfmsTrackerScreen } from './screens/PfmsTrackerScreen';
import { MOCK_USER_PROFILE, MOCK_DAILY_BIDS, MOCK_MARKET_PULSE } from './fixtures/mockData';
import type { DeconstructedBidDoc } from './types/index';

type MainTab = 'RADAR' | 'AUCTIONS' | 'PORTFOLIO' | 'FIELD_OPS';
type FieldOpsSubTab = 'CRAC' | 'PFMS';

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('RADAR');
  const [fieldSubTab, setFieldSubTab] = useState<FieldOpsSubTab>('CRAC');
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const handleOpenCracFromPortfolio = () => {
    setFieldSubTab('CRAC');
    setActiveTab('FIELD_OPS');
  };

  const handleOpenPfmsFromPortfolio = () => {
    setFieldSubTab('PFMS');
    setActiveTab('FIELD_OPS');
  };

  const handleAddToParticipated = (bid: DeconstructedBidDoc) => {
    setActiveTab('PORTFOLIO');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0B132B" />

      {/* Top App Bar (PhonePe/Groww Government Companion) */}
      <View style={styles.topBar}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.appName}>GeM Companion</Text>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>
          <Text style={styles.appSub}>Government e-Marketplace | Daily Decision Radar</Text>
        </View>

        {/* Offline / Online Network Toggle (Enlarged 48dp Touch Target) */}
        <TouchableOpacity
          style={[styles.networkToggle, isOnline ? styles.netOnline : styles.netOffline]}
          onPress={() => setIsOnline(!isOnline)}
          activeOpacity={0.8}
          accessibilityLabel={`Toggle offline mode. Current: ${isOnline ? 'Online' : 'Offline'}`}
        >
          <Text style={styles.netDot}>{isOnline ? '●' : '○'}</Text>
          <Text style={styles.netText}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
        </TouchableOpacity>
      </View>

      {/* Active Screen Body */}
      <View style={styles.screenContainer}>
        {activeTab === 'RADAR' && (
          <UserAgentFeedScreen
            userProfile={MOCK_USER_PROFILE}
            bids={MOCK_DAILY_BIDS}
            marketPulse={MOCK_MARKET_PULSE}
            onAddToParticipated={handleAddToParticipated}
          />
        )}

        {activeTab === 'AUCTIONS' && <AuctionsHubScreen />}

        {activeTab === 'PORTFOLIO' && (
          <ParticipatedPortfolioScreen
            onOpenCrac={handleOpenCracFromPortfolio}
            onOpenPfms={handleOpenPfmsFromPortfolio}
          />
        )}

        {activeTab === 'FIELD_OPS' && (
          <View style={styles.fieldOpsWrapper}>
            {/* Field Ops Segmented Selector (Min 48dp) */}
            <View style={styles.fieldOpsSegmentBar}>
              <TouchableOpacity
                style={[styles.fieldOpsSegmentBtn, fieldSubTab === 'CRAC' && styles.fieldOpsSegmentActive]}
                onPress={() => setFieldSubTab('CRAC')}
              >
                <Text
                  style={[
                    styles.fieldOpsSegmentText,
                    fieldSubTab === 'CRAC' && styles.fieldOpsSegmentTextActive,
                  ]}
                >
                  📷 Consignee CRAC Inspector
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.fieldOpsSegmentBtn, fieldSubTab === 'PFMS' && styles.fieldOpsSegmentActive]}
                onPress={() => setFieldSubTab('PFMS')}
              >
                <Text
                  style={[
                    styles.fieldOpsSegmentText,
                    fieldSubTab === 'PFMS' && styles.fieldOpsSegmentTextActive,
                  ]}
                >
                  ₹ PFMS Milestone Tracker
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.fieldSubScreen}>
              {fieldSubTab === 'CRAC' ? <CracInspectorScreen /> : <PfmsTrackerScreen />}
            </View>
          </View>
        )}
      </View>

      {/* Bottom Navigation Tab Bar (Groww + PhonePe 4-Tab Paradigm, Min 48dp Touch Targets) */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'RADAR' && styles.tabActive]}
          onPress={() => setActiveTab('RADAR')}
          activeOpacity={0.7}
        >
          <Text style={styles.tabIcon}>📡</Text>
          <Text style={[styles.tabLabel, activeTab === 'RADAR' && styles.tabLabelActive]}>Radar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'AUCTIONS' && styles.tabActive]}
          onPress={() => setActiveTab('AUCTIONS')}
          activeOpacity={0.7}
        >
          <Text style={styles.tabIcon}>⚡</Text>
          <Text style={[styles.tabLabel, activeTab === 'AUCTIONS' && styles.tabLabelActive]}>Auctions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'PORTFOLIO' && styles.tabActive]}
          onPress={() => setActiveTab('PORTFOLIO')}
          activeOpacity={0.7}
        >
          <Text style={styles.tabIcon}>💼</Text>
          <Text style={[styles.tabLabel, activeTab === 'PORTFOLIO' && styles.tabLabelActive]}>Portfolio</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'FIELD_OPS' && styles.tabActive]}
          onPress={() => setActiveTab('FIELD_OPS')}
          activeOpacity={0.7}
        >
          <Text style={styles.tabIcon}>🛠️</Text>
          <Text style={[styles.tabLabel, activeTab === 'FIELD_OPS' && styles.tabLabelActive]}>Field Ops</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B132B' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#0B132B',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  appName: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  proBadge: { backgroundColor: '#3B82F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  proBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  appSub: { color: '#94A3B8', fontSize: 11, fontWeight: '600', marginTop: 2 },
  networkToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    minWidth: 80,
    paddingHorizontal: 12,
    borderRadius: 24,
    justifyContent: 'center',
  },
  netOnline: { backgroundColor: 'rgba(0, 208, 156, 0.2)', borderWidth: 1, borderColor: '#00D09C' },
  netOffline: { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 1, borderColor: '#EF4444' },
  netDot: { marginRight: 6, fontSize: 12, color: '#FFFFFF' },
  netText: { fontSize: 11, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },
  screenContainer: { flex: 1 },
  fieldOpsWrapper: { flex: 1 },
  fieldOpsSegmentBar: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 8,
  },
  fieldOpsSegmentBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  fieldOpsSegmentActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3B82F6',
  },
  fieldOpsSegmentText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  fieldOpsSegmentTextActive: { color: '#60A5FA', fontWeight: '900' },
  fieldSubScreen: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0B132B',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingBottom: 16, // Safe area padding for gesture bars
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
    marginHorizontal: 4,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderTopWidth: 2,
    borderTopColor: '#38BDF8',
  },
  tabIcon: { fontSize: 20, marginBottom: 2 },
  tabLabel: { color: '#CBD5E1', fontSize: 11, fontWeight: '700' },
  tabLabelActive: { color: '#38BDF8', fontWeight: '900' },
});
