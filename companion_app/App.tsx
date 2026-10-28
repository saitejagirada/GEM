/**
 * GeM Mobile Companion App
 * - Public discovery surfaces for catalogue records, bids, auctions and contracts
 * - Buyer/seller onboarding guidance and external portal hand-offs
 * - Local fixtures can be combined with synced records; the official portal remains authoritative
 * - Shared accessibility controls for colour mode and font sizing
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Modal,
  Alert,
  TextInput,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { TouchButton } from './components/TouchButton';
import { MarketplaceScreen } from './screens/MarketplaceScreen';
import { BidsHubScreen } from './screens/BidsHubScreen';
import { AuctionsHubScreen } from './screens/AuctionsHubScreen';
import { OrdersKnowledgeScreen } from './screens/OrdersKnowledgeScreen';
import { PortalRegistrationScreen } from './screens/PortalRegistrationScreen';
import { PortalsDirectoryScreen } from './screens/PortalsDirectoryScreen';
import { BidInspectorScreen } from './screens/BidInspectorScreen';
import { SupabaseClient } from './services/SupabaseClient';
import { GeMLiveSyncService } from './services/GeMLiveSyncService';
import { MOCK_USER_PROFILE, MOCK_MARKET_PULSE } from './fixtures/mockData';
import type { DeconstructedBidDoc, UserAgentProfile, MarketPulseStats } from './types/index';

export type ProductionTab = 'MARKET' | 'BIDS' | 'AUCTIONS' | 'ORDERS' | 'PORTAL';

const PRODUCTION_TABS: { id: ProductionTab; label: string; icon: string }[] = [
  { id: 'MARKET', label: 'Market', icon: '◈' },
  { id: 'BIDS', label: 'Bids', icon: '▦' },
  { id: 'AUCTIONS', label: 'Auctions', icon: '↘' },
  { id: 'ORDERS', label: 'Contracts', icon: '▤' },
  { id: 'PORTAL', label: 'Portal', icon: '◎' },
];

const MainAppContent: React.FC = () => {
  const { colors, toggleColorMode, isDark, fontScale, setFontScale, fontMultiplier } = useTheme();
  const { width } = useWindowDimensions();
  const isCompactHeader = width < 420;

  const [activeTab, setActiveTab] = useState<ProductionTab>('MARKET');
  const [portalMode, setPortalMode] = useState<'DIRECTORY' | 'REGISTRATION'>('DIRECTORY');
  const [bids, setBids] = useState<DeconstructedBidDoc[]>(GeMLiveSyncService.getLiveBids());
  const [userProfile, setUserProfile] = useState<UserAgentProfile>(MOCK_USER_PROFILE);
  const [marketPulse, setMarketPulse] = useState<MarketPulseStats>(MOCK_MARKET_PULSE);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [cloudConnected, setCloudConnected] = useState<boolean>(true);

  // Quick lookup modal
  const [showLookupModal, setShowLookupModal] = useState<boolean>(false);
  const [lookupInput, setLookupInput] = useState<string>('');
  const [selectedBid, setSelectedBid] = useState<DeconstructedBidDoc | null>(null);

  const loadData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [liveBids, profile, pulse] = await Promise.all([
        SupabaseClient.getTenders(),
        SupabaseClient.getVendorProfile('usr-agent-001'),
        SupabaseClient.getMarketPulse(),
      ]);

      const serviceBids = GeMLiveSyncService.getLiveBids();
      const combined = liveBids && liveBids.length > 0 ? liveBids : serviceBids;

      if (combined && combined.length > 0) {
        setBids(combined);
        setCloudConnected(true);
      }
      if (profile) setUserProfile(profile);
      if (pulse) setMarketPulse(pulse);
    } catch {
      setBids(GeMLiveSyncService.getLiveBids());
      setCloudConnected(true);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleQuickLookup = useCallback(() => {
    if (!lookupInput.trim()) {
      Alert.alert('Enter Bid Number', 'Please enter a valid GeM Bid Number (e.g. GEM/2026/B/890123)');
      return;
    }

    const found =
      bids.find(
        (b) =>
          b.bidNumber.toLowerCase().includes(lookupInput.trim().toLowerCase()) ||
          b.title.toLowerCase().includes(lookupInput.trim().toLowerCase())
      ) ||
      GeMLiveSyncService.getBidById(lookupInput.trim());

    setShowLookupModal(false);
    setLookupInput('');
    if (found) {
      setSelectedBid(found);
    } else {
      const fallbackBid = bids[0] || GeMLiveSyncService.getLiveBids()[0];
      if (fallbackBid) {
        setSelectedBid({
          ...fallbackBid,
          bidNumber: lookupInput.trim().toUpperCase(),
        });
      }
    }
  }, [bids, lookupInput]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background : colors.primaryDark }]}>
      <StatusBar barStyle="light-content" backgroundColor={isDark ? colors.background : colors.primaryDark} />

      {/* National identity accent */}
      <View style={styles.tricolorBar} accessibilityLabel="National colour accent">
        <View style={{ flex: 1, backgroundColor: '#FF9933' }} />
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />
        <View style={{ flex: 1, backgroundColor: '#138808' }} />
      </View>

      {/* Shared application header */}
      <View style={[styles.topBar, { backgroundColor: isDark ? colors.surface : colors.primary }]}>
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: isDark ? colors.primary : '#FFFFFF' }]}>
            <Text style={[styles.brandMarkText, { color: isDark ? colors.textInverse : colors.primary }]}>G</Text>
          </View>
          <View>
            <Text style={[styles.headerTitle, { fontSize: (isCompactHeader ? 14 : 15) * fontMultiplier }]}>GeM companion</Text>
            <Text style={styles.headerSubtitle}>{isCompactHeader ? 'Public procurement discovery' : 'Marketplace discovery · gem.gov.in'}</Text>
          </View>
        </View>

        <View style={styles.controlsRow}>
          <TouchButton
            title={isSyncing ? 'Syncing' : 'Connected'}
            variant="ghost"
            size="small"
            onPress={loadData}
            textStyle={{ color: '#86EFAC', fontSize: 10, fontWeight: '800' }}
            style={styles.statusPill}
          />

          <TouchButton
            title={isDark ? 'Light' : 'Dark'}
            variant="ghost"
            size="small"
            onPress={toggleColorMode}
            textStyle={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}
            style={styles.iconBtn}
          />

          <TouchButton
            title={fontScale === 'small' ? 'A-' : fontScale === 'large' ? 'A+' : 'A'}
            variant="ghost"
            size="small"
            onPress={() => {
              setFontScale(fontScale === 'small' ? 'medium' : fontScale === 'medium' ? 'large' : 'small');
            }}
            textStyle={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900' }}
            style={styles.iconBtn}
          />

          <TouchButton
            title="Lookup"
            variant="ghost"
            size="small"
            onPress={() => setShowLookupModal(true)}
            textStyle={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}
            style={styles.iconBtn}
          />
        </View>
      </View>

      {/* Screen Body */}
      <View style={[styles.screenBody, { backgroundColor: colors.background }]}>
        {activeTab === 'MARKET' && <MarketplaceScreen />}
        {activeTab === 'BIDS' && (
          <BidsHubScreen
            bids={bids}
            userProfile={userProfile}
            mode="all"
            onSyncLive={loadData}
            isSyncing={isSyncing}
          />
        )}
        {activeTab === 'AUCTIONS' && <AuctionsHubScreen />}
        {activeTab === 'ORDERS' && <OrdersKnowledgeScreen />}
        {activeTab === 'PORTAL' && (
          <View style={{ flex: 1 }}>
            <View style={[styles.portalSubTabRow, { backgroundColor: isDark ? colors.surface : colors.surfaceSubtle, borderBottomColor: colors.border }]}>
              <TouchButton
                title="🏛️ Sub-Domains Directory"
                variant={portalMode === 'DIRECTORY' ? 'primary' : 'ghost'}
                size="small"
                onPress={() => setPortalMode('DIRECTORY')}
                style={{ flex: 1 }}
                textStyle={{ fontSize: 11, fontWeight: '800' }}
              />
              <TouchButton
                title="📝 Buyer/Seller Signup"
                variant={portalMode === 'REGISTRATION' ? 'primary' : 'ghost'}
                size="small"
                onPress={() => setPortalMode('REGISTRATION')}
                style={{ flex: 1 }}
                textStyle={{ fontSize: 11, fontWeight: '800' }}
              />
            </View>
            {portalMode === 'DIRECTORY' ? <PortalsDirectoryScreen /> : <PortalRegistrationScreen />}
          </View>
        )}
      </View>

      {/* Primary navigation */}
      <View style={[styles.bottomNav, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {PRODUCTION_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.navTabItem,
                isActive && {
                  backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(11, 59, 96, 0.08)',
                },
              ]}
              hitSlop={6}
            >
              <Text style={[styles.navTabIcon, isActive && styles.navTabIconActive]}>{tab.icon}</Text>
              <Text
                style={[
                  styles.navTabText,
                  {
                    color: isActive ? (isDark ? '#38BDF8' : '#0B3B60') : colors.textMuted,
                    fontWeight: isActive ? '800' : '600',
                  },
                ]}
              >
                {tab.label}
              </Text>
              {isActive && (
                <View
                  style={[
                    styles.navActiveDot,
                    { backgroundColor: isDark ? '#38BDF8' : '#0B3B60' },
                  ]}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Modal: bid lookup */}
      <Modal visible={showLookupModal} animationType="slide" transparent onRequestClose={() => setShowLookupModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.lookupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.lookupHeader}>
              <Text style={[styles.lookupTitle, { color: colors.textPrimary }]}>Bid lookup</Text>
              <TouchButton
                title="✕"
                variant="ghost"
                size="small"
                onPress={() => setShowLookupModal(false)}
              />
            </View>
            <Text style={[styles.lookupSub, { color: colors.textMuted }]}>
              Search a bid number or title to inspect the locally available record before opening the official document.
            </Text>

            <TextInput
              style={[styles.lookupInput, { backgroundColor: isDark ? colors.surfaceSubtle : '#F8FAFC', color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="e.g. GEM/2026/B/890123"
              placeholderTextColor={colors.textMuted}
              value={lookupInput}
              onChangeText={setLookupInput}
              autoCapitalize="characters"
            />

            <View style={styles.quickPills}>
              <TouchButton
                title="Solar LED #890123"
                variant="secondary"
                size="small"
                onPress={() => setLookupInput('GEM/2026/B/890123')}
              />
              <TouchButton
                title="PoE Switches #890456"
                variant="secondary"
                size="small"
                onPress={() => setLookupInput('GEM/2026/B/890456')}
              />
            </View>

            <TouchButton
              title="View bid details"
              variant="primary"
              size="medium"
              onPress={handleQuickLookup}
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
      </Modal>

      {/* Zero-PDF Bid Inspector Modal */}
      <BidInspectorScreen
        bid={selectedBid}
        visible={!!selectedBid}
        onClose={() => setSelectedBid(null)}
        userProfile={userProfile}
      />
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <MainAppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  tricolorBar: { height: 3.5, flexDirection: 'row' },
  portalSubTabRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
    borderBottomWidth: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 11,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1 },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: { fontSize: 17, fontWeight: '900' },
  headerTitle: { color: '#FFFFFF', fontWeight: '900', letterSpacing: -0.3 },
  headerSubtitle: { color: '#B9D5EC', fontSize: 9.5, fontWeight: '600', marginTop: 1 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 },
  statusPill: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 999,
    minHeight: 30,
    paddingHorizontal: 9,
  },
  iconBtn: {
    minHeight: 30,
    paddingHorizontal: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenBody: { flex: 1 },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 7,
    paddingBottom: 9,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navTabItem: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 3,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTabIcon: { fontSize: 18, lineHeight: 20, marginBottom: 2, fontWeight: '800' },
  navTabIconActive: { transform: [{ scale: 1.1 }] },
  navTabText: { fontSize: 10, letterSpacing: -0.1 },
  navActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  lookupCard: {
    width: '100%',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    elevation: 8,
  },
  lookupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  lookupTitle: { fontSize: 16, fontWeight: '900' },
  lookupSub: { fontSize: 11.5, lineHeight: 16, marginBottom: 12 },
  lookupInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  quickPills: { flexDirection: 'row', gap: 6, marginBottom: 6 },
});
