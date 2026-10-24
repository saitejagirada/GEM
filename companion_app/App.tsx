import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { ReverseAuctionScreen } from './screens/ReverseAuctionScreen.tsx';
import { CracInspectorScreen } from './screens/CracInspectorScreen.tsx';
import { PfmsTrackerScreen } from './screens/PfmsTrackerScreen.tsx';

type Tab = 'AUCTION' | 'CRAC' | 'PFMS';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('AUCTION');
  const [isOnline, setIsOnline] = useState<boolean>(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0B132B" />

      {/* Top App Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.appName}>GeM Companion</Text>
          <Text style={styles.appSub}>Government e-Marketplace | National Portal</Text>
        </View>

        {/* Offline / Online Mode Toggle for Testing */}
        <TouchableOpacity
          style={[styles.networkToggle, isOnline ? styles.netOnline : styles.netOffline]}
          onPress={() => setIsOnline(!isOnline)}
        >
          <Text style={styles.netDot}>{isOnline ? '●' : '○'}</Text>
          <Text style={styles.netText}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
        </TouchableOpacity>
      </View>

      {/* Active Screen Body */}
      <View style={styles.screenContainer}>
        {activeTab === 'AUCTION' && <ReverseAuctionScreen />}
        {activeTab === 'CRAC' && <CracInspectorScreen />}
        {activeTab === 'PFMS' && <PfmsTrackerScreen />}
      </View>

      {/* Bottom Navigation Tab Bar (Min 48dp Touch Targets) */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'AUCTION' && styles.tabActive]}
          onPress={() => setActiveTab('AUCTION')}
        >
          <Text style={styles.tabIcon}>⚡</Text>
          <Text style={[styles.tabLabel, activeTab === 'AUCTION' && styles.tabLabelActive]}>Live RA</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'CRAC' && styles.tabActive]}
          onPress={() => setActiveTab('CRAC')}
        >
          <Text style={styles.tabIcon}>📷</Text>
          <Text style={[styles.tabLabel, activeTab === 'CRAC' && styles.tabLabelActive]}>CRAC Field</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'PFMS' && styles.tabActive]}
          onPress={() => setActiveTab('PFMS')}
        >
          <Text style={styles.tabIcon}>₹</Text>
          <Text style={[styles.tabLabel, activeTab === 'PFMS' && styles.tabLabelActive]}>PFMS Track</Text>
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
    paddingVertical: 12,
    backgroundColor: '#0B132B',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  appName: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  appSub: { color: '#94A3B8', fontSize: 11, fontWeight: '500' },
  networkToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  netOnline: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  netOffline: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  netDot: { marginRight: 4, fontSize: 10, color: '#FFFFFF' },
  netText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  screenContainer: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0B132B',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabActive: {
    borderTopWidth: 2,
    borderTopColor: '#38BDF8',
  },
  tabIcon: { fontSize: 18, marginBottom: 2 },
  tabLabel: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  tabLabelActive: { color: '#38BDF8' },
});
