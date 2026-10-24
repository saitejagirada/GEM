import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import { PhonePeHomeScreen } from './screens/PhonePeHomeScreen';
import { PhonePeSearchScreen } from './screens/PhonePeSearchScreen';
import { PhonePeAlertsScreen } from './screens/PhonePeAlertsScreen';
import { ParticipatedPortfolioScreen } from './screens/ParticipatedPortfolioScreen';
import { AuctionsHubScreen } from './screens/AuctionsHubScreen';
import { BidInspectorScreen } from './screens/BidInspectorScreen';
import { SupabaseClient } from './services/SupabaseClient';
import { MOCK_USER_PROFILE, MOCK_DAILY_BIDS, MOCK_MARKET_PULSE } from './fixtures/mockData';
import type { DeconstructedBidDoc, UserAgentProfile, MarketPulseStats } from './types/index';

type PhonePeTab = 'HOME' | 'SEARCH' | 'SCAN' | 'ALERTS' | 'HISTORY';

export default function App() {
  const [activeTab, setActiveTab] = useState<PhonePeTab>('HOME');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Live Cloud Supabase Data States
  const [bids, setBids] = useState<DeconstructedBidDoc[]>(MOCK_DAILY_BIDS);
  const [userProfile, setUserProfile] = useState<UserAgentProfile>(MOCK_USER_PROFILE);
  const [marketPulse, setMarketPulse] = useState<MarketPulseStats>(MOCK_MARKET_PULSE);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [cloudConnected, setCloudConnected] = useState<boolean>(false);

  const loadDataFromSupabase = async () => {
    setIsSyncing(true);
    try {
      const [liveBids, profile, pulse] = await Promise.all([
        SupabaseClient.getTenders(),
        SupabaseClient.getVendorProfile('usr-agent-001'),
        SupabaseClient.getMarketPulse(),
      ]);
      if (liveBids && liveBids.length > 0) {
        setBids(liveBids);
        setCloudConnected(true);
      }
      if (profile) setUserProfile(profile);
      if (pulse) setMarketPulse(pulse);
    } catch {
      // Gracefully falls back to offline fixtures
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadDataFromSupabase();
  }, []);

  // Modals for Bidding Companion
  const [showAuctionsModal, setShowAuctionsModal] = useState<boolean>(false);
  const [showLookupModal, setShowLookupModal] = useState<boolean>(false);
  const [lookupInput, setLookupInput] = useState<string>('');
  const [selectedBid, setSelectedBid] = useState<DeconstructedBidDoc | null>(null);

  const handleSelectCategory = (cat: string) => {
    setSearchFilter(cat);
    setActiveTab('SEARCH');
  };

  const handleOpenHelp = () => {
    Alert.alert(
      'GeM Portal Help & Support',
      'Need help with GeM portal tenders, MSE exemptions, or bidding?\n\n• GeM National Helpdesk: 1800-419-3436\n• Portal: gem.gov.in\n• MSE Facilitation Cell available.'
    );
  };

  const handleQuickLookup = () => {
    if (!lookupInput.trim()) {
      Alert.alert('Enter Bid Number', 'Please enter a valid GeM Bid Number (e.g., GEM/2026/B/890123)');
      return;
    }

    const found = bids.find(
      (b) =>
        b.bidNumber.toLowerCase().includes(lookupInput.trim().toLowerCase()) ||
        b.title.toLowerCase().includes(lookupInput.trim().toLowerCase())
    ) || MOCK_DAILY_BIDS.find(
      (b) =>
        b.bidNumber.toLowerCase().includes(lookupInput.trim().toLowerCase()) ||
        b.title.toLowerCase().includes(lookupInput.trim().toLowerCase())
    );

    if (found) {
      setShowLookupModal(false);
      setLookupInput('');
      setSelectedBid(found);
    } else {
      // Default to first bid for preview if exact number not found
      setShowLookupModal(false);
      setLookupInput('');
      setSelectedBid({
        ...(bids[0] || MOCK_DAILY_BIDS[0]),
        bidNumber: lookupInput.trim().toUpperCase(),
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#5F259F" />

      {/* Signature PhonePe Top Header Bar */}
      <View style={styles.topBar}>
        {/* Left: User Profile Avatar */}
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() =>
            Alert.alert(
              'Vendor Profile (GeM Dedicated Agent)',
              `Organization: ${userProfile.organizationName}\n\n• MSME Status: ${userProfile.msmeCategory} Enterprise\n• Udyam Registration: Active\n• Annual Turnover: ₹${(userProfile.annualTurnoverInr / 100000).toFixed(0)} Lakhs\n• 5 Verified Orders: ₹1.32 Cr Execution\n• Target Categories: ${userProfile.productCategories.join(', ')}`
            )
          }
          activeOpacity={0.8}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>G</Text>
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarBadgeIcon}>✓</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Center: GeM Companion Title */}
        <View style={styles.headerCenter}>
          <View style={styles.logoRow}>
            <View style={styles.logoPill}>
              <Text style={styles.logoPillText}>पे GeM</Text>
            </View>
            <Text style={styles.headerAppName}>GeM Companion</Text>
          </View>
          <Text style={styles.headerAppSub}>Official Portal Daily Analysis &amp; Bidding Assistant</Text>
        </View>

        {/* Right: Help Icon & Cloud Sync Pill */}
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.cloudPill, cloudConnected ? styles.cloudLive : styles.cloudOffline]}
            onPress={loadDataFromSupabase}
            activeOpacity={0.8}
          >
            <Text style={styles.cloudPillText}>
              {isSyncing ? '⟳ Syncing...' : cloudConnected ? '⚡ Supabase Live' : '○ Offline'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.helpCircle} onPress={handleOpenHelp} activeOpacity={0.8}>
            <Text style={styles.helpIcon}>?</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Screen Body */}
      <View style={styles.screenContainer}>
        {activeTab === 'HOME' && (
          <PhonePeHomeScreen
            userProfile={userProfile}
            bids={bids}
            marketPulse={marketPulse}
            onNavigateTab={(tab) => {
              if (tab === 'SCAN') setShowLookupModal(true);
              else setActiveTab(tab);
            }}
            onOpenAuctions={() => setShowAuctionsModal(true)}
            onOpenAgentBids={() => {
              setSearchFilter('');
              setActiveTab('SEARCH');
            }}
            onOpenEligibility={() =>
              Alert.alert(
                'MSE Eligibility Status',
                `Organization: ${userProfile.organizationName}\n\n• MSME Category: ${userProfile.msmeCategory}\n• Udyam Registration: Verified\n• EMD Exemption: 100% Waived across all GeM tenders\n• 25% Annual Procurement Quota: Active\n• Purchase Preference: Active (L1 + 15% price matching)`
              )
            }
            onSelectCategory={handleSelectCategory}
            onRefresh={loadDataFromSupabase}
            isRefreshing={isSyncing}
          />
        )}

        {activeTab === 'SEARCH' && (
          <PhonePeSearchScreen
            bids={bids}
            userProfile={userProfile}
            initialFilter={searchFilter}
          />
        )}

        {activeTab === 'ALERTS' && (
          <PhonePeAlertsScreen
            onOpenAuctions={() => setShowAuctionsModal(true)}
            onOpenPfms={() => setActiveTab('HISTORY')}
          />
        )}

        {activeTab === 'HISTORY' && (
          <ParticipatedPortfolioScreen
            onOpenCrac={() => setShowLookupModal(true)}
            onOpenPfms={() => setActiveTab('HOME')}
          />
        )}
      </View>

      {/* PhonePe 5-Tab Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        {/* Tab 1: Home */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('HOME')}
          activeOpacity={0.7}
        >
          <Text style={[styles.navIcon, activeTab === 'HOME' && styles.navIconActive]}>🏠</Text>
          <Text style={[styles.navLabel, activeTab === 'HOME' && styles.navLabelActive]}>Home</Text>
        </TouchableOpacity>

        {/* Tab 2: Search */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setSearchFilter('');
            setActiveTab('SEARCH');
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.navIcon, activeTab === 'SEARCH' && styles.navIconActive]}>🔍</Text>
          <Text style={[styles.navLabel, activeTab === 'SEARCH' && styles.navLabelActive]}>Search</Text>
        </TouchableOpacity>

        {/* Tab 3: Center Floating Purple Lookup/Scan Button */}
        <TouchableOpacity
          style={styles.centerScanWrapper}
          onPress={() => setShowLookupModal(true)}
          activeOpacity={0.85}
        >
          <View style={styles.centerScanCircle}>
            <Text style={styles.centerScanIcon}>📄</Text>
          </View>
        </TouchableOpacity>

        {/* Tab 4: Alerts */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('ALERTS')}
          activeOpacity={0.7}
        >
          <View style={styles.badgeWrapper}>
            <Text style={[styles.navIcon, activeTab === 'ALERTS' && styles.navIconActive]}>🔔</Text>
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>1</Text>
            </View>
          </View>
          <Text style={[styles.navLabel, activeTab === 'ALERTS' && styles.navLabelActive]}>Alerts</Text>
        </TouchableOpacity>

        {/* Tab 5: History / Participated */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('HISTORY')}
          activeOpacity={0.7}
        >
          <Text style={[styles.navIcon, activeTab === 'HISTORY' && styles.navIconActive]}>🕒</Text>
          <Text style={[styles.navLabel, activeTab === 'HISTORY' && styles.navLabelActive]}>My Bids</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL 1: Auctions Hub (Reverse Auctions + Forward e-Scrap) */}
      <Modal visible={showAuctionsModal} animationType="slide" onRequestClose={() => setShowAuctionsModal(false)}>
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowAuctionsModal(false)}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>GeM Auctions Hub (RA &amp; Forward)</Text>
            <View style={{ width: 40 }} />
          </View>
          <AuctionsHubScreen />
        </SafeAreaView>
      </Modal>

      {/* MODAL 2: Instant Zero-PDF Bid Number Lookup */}
      <Modal visible={showLookupModal} animationType="slide" transparent onRequestClose={() => setShowLookupModal(false)}>
        <View style={styles.lookupModalOverlay}>
          <View style={styles.lookupModalCard}>
            <View style={styles.lookupHeader}>
              <Text style={styles.lookupTitle}>Instant Bid Deconstructor</Text>
              <TouchableOpacity onPress={() => setShowLookupModal(false)}>
                <Text style={styles.lookupCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.lookupSubtitle}>
              Enter any GeM Bid Number or scan QR to get instant specs, EMD, turnover, and BOQ cards without downloading 50-page PDFs.
            </Text>

            <TextInput
              style={styles.lookupInput}
              placeholder="e.g. GEM/2026/B/890123"
              placeholderTextColor="#94A3B8"
              value={lookupInput}
              onChangeText={setLookupInput}
              autoCapitalize="characters"
            />

            <View style={styles.lookupQuickPills}>
              <TouchableOpacity
                style={styles.quickPill}
                onPress={() => setLookupInput('GEM/2026/B/890123')}
              >
                <Text style={styles.quickPillText}>Solar LED #890123</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickPill}
                onPress={() => setLookupInput('GEM/2026/B/890456')}
              >
                <Text style={styles.quickPillText}>PoE Switches #890456</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.lookupSubmitBtn} onPress={handleQuickLookup} activeOpacity={0.8}>
              <Text style={styles.lookupSubmitText}>Deconstruct Tender Details ➔</Text>
            </TouchableOpacity>
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
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#5F259F' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#5F259F',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarLetter: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#00C853',
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  avatarBadgeIcon: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
  headerCenter: { flex: 1, alignItems: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  logoPillText: { color: '#5F259F', fontSize: 10, fontWeight: '900' },
  headerAppName: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  headerAppSub: { color: '#E9D5FF', fontSize: 10, fontWeight: '600', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cloudPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cloudLive: { backgroundColor: 'rgba(0, 200, 83, 0.35)' },
  cloudOffline: { backgroundColor: 'rgba(239, 68, 68, 0.35)' },
  cloudPillText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  helpCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpIcon: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  screenContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
    paddingBottom: 16,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  navIcon: { fontSize: 20, color: '#6B7280', marginBottom: 2 },
  navIconActive: { color: '#5F259F' },
  navLabel: { color: '#6B7280', fontSize: 11, fontWeight: '600' },
  navLabelActive: { color: '#5F259F', fontWeight: '800' },
  centerScanWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    width: 60,
  },
  centerScanCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#5F259F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5F259F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  centerScanIcon: { color: '#FFFFFF', fontSize: 22 },
  badgeWrapper: { position: 'relative' },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: '#00C853',
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  modalSafeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#5F259F',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  modalTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  lookupModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  lookupModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 8,
  },
  lookupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lookupTitle: { color: '#0F172A', fontSize: 17, fontWeight: '800' },
  lookupCloseText: { color: '#64748B', fontSize: 18, fontWeight: '700' },
  lookupSubtitle: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  lookupInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  lookupQuickPills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickPill: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickPillText: { color: '#7E22CE', fontSize: 11, fontWeight: '700' },
  lookupSubmitBtn: {
    backgroundColor: '#5F259F',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookupSubmitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
