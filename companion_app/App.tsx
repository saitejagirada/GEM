/**
 * GeM Mobile Companion App
 *
 * - Branded GeM startup launch screen (replaces blank screen while initial live feeds boot)
 * - Clean 54px Top Header with official GeM Pinwheel Logo + instant Find Bid search
 * - 60px 5-Tab Fixed Bottom Bar: Home, Search, Bids, Auctions, More with crisp geometric icons
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ThemeProvider, useTheme, DESIGN_TOKENS } from './theme/ThemeContext';
import { AppIcon, type AppIconName } from './components/AppIcons';
import { HomeScreen, type HomeNavigateParams } from './screens/HomeScreen';
import { MarketplaceScreen } from './screens/MarketplaceScreen';
import { BidsHubScreen } from './screens/BidsHubScreen';
import { AuctionsHubScreen } from './screens/AuctionsHubScreen';
import { OrdersKnowledgeScreen } from './screens/OrdersKnowledgeScreen';
import { CategoriesScreen } from './screens/CategoriesScreen';
import { PortalRegistrationScreen } from './screens/PortalRegistrationScreen';
import { HelpScreen } from './screens/HelpScreen';
import { MoreProfileScreen } from './screens/MoreProfileScreen';
import { BidInspectorScreen } from './screens/BidInspectorScreen';
import { MyWorkScreen, type PreparationSection } from './screens/MyWorkScreen';
import { OfficialPortalScreen } from './screens/OfficialPortalScreen';
import { GeMLiveSyncService } from './services/GeMLiveSyncService';
import { isNetworkOnline } from './utils/network';
import type { DeconstructedBidDoc } from './types/index';
import type { MarketplaceCategory } from './services/MarketplaceService';

// Official GeM brand assets bundled locally for instant 0ms rendering
// eslint-disable-next-line @typescript-eslint/no-var-requires
const GEM_MARK_IMG = require('./assets/gem-mark.png');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const GEM_LOGO_LIGHT_IMG = require('./assets/gem-logo-full.png');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const GEM_LOGO_DARK_IMG = require('./assets/gem-logo-dark.png');

export type MainTab = 'HOME' | 'SEARCH' | 'BIDS' | 'AUCTIONS' | 'MORE';
export type SubScreen =
  | 'NONE'
  | 'CATEGORIES'
  | 'CONTRACTS'
  | 'PORTFOLIO'
  | 'PORTAL'
  | 'REG_BUYER'
  | 'REG_SELLER'
  | 'HELP';

const BOTTOM_NAV_ITEMS: {
  id: MainTab;
  labelKey: 'tabHome' | 'tabSearch' | 'tabBids' | 'tabAuctions' | 'tabMore';
  icon: AppIconName;
}[] = [
  { id: 'HOME', labelKey: 'tabHome', icon: 'home' },
  { id: 'SEARCH', labelKey: 'tabSearch', icon: 'search' },
  { id: 'BIDS', labelKey: 'tabBids', icon: 'bids' },
  { id: 'AUCTIONS', labelKey: 'tabAuctions', icon: 'auctions' },
  { id: 'MORE', labelKey: 'tabMore', icon: 'more' },
];

const MainAppContent: React.FC = () => {
  const { colors, fontMultiplier, isDark, t } = useTheme();

  // Branded GeM startup launch splash (eliminates blank white flash on startup)
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  const [activeTab, setActiveTab] = useState<MainTab>('HOME');
  const [subScreen, setSubScreen] = useState<SubScreen>('NONE');
  const [bids, setBids] = useState<DeconstructedBidDoc[]>([]);
  const [totalPortalBids, setTotalPortalBids] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);

  // Navigation parameters forwarded from Home / Categories
  const [marketNavCategory, setMarketNavCategory] = useState<string | undefined>();
  const [marketNavQuery, setMarketNavQuery] = useState<string | undefined>();
  const [marketNavTypeTab, setMarketNavTypeTab] = useState<'Products' | 'Services' | undefined>();
  const [marketNavTrigger, setMarketNavTrigger] = useState<number>(0);
  const [bidsNavSearch, setBidsNavSearch] = useState<string | undefined>();
  const [bidsNavTrigger, setBidsNavTrigger] = useState<number>(0);
  const [contractsNavSearch, setContractsNavSearch] = useState<string | undefined>();

  // Quick lookup modal
  const [showLookupModal, setShowLookupModal] = useState<boolean>(false);
  const [lookupInput, setLookupInput] = useState<string>('');
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [selectedBid, setSelectedBid] = useState<DeconstructedBidDoc | null>(null);
  const [preparationBidNumber, setPreparationBidNumber] = useState<string>('');
  const [workInitialSection, setWorkInitialSection] = useState<PreparationSection>('LIVE');

  // Dismiss branded GeM splash smoothly after brief launch reveal
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start(() => setShowSplash(false));
    }, 1050);
    return () => clearTimeout(timer);
  }, [splashOpacity]);

  // Hardware Back Button Navigation Stack Manager
  useEffect(() => {
    let lastBackPressTime = 0;

    const onBackPress = () => {
      if (selectedBid) {
        setSelectedBid(null);
        return true;
      }
      if (showLookupModal) {
        setShowLookupModal(false);
        return true;
      }
      if (subScreen !== 'NONE') {
        setSubScreen('NONE');
        return true;
      }
      if (activeTab !== 'HOME') {
        setActiveTab('HOME');
        return true;
      }
      const now = Date.now();
      if (now - lastBackPressTime < 2000) {
        BackHandler.exitApp();
        return true;
      }
      lastBackPressTime = now;
      if (Platform.OS === 'android') {
        Alert.alert(
          'Exit GeM Mobile Companion',
          'Are you sure you want to exit the application?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Exit', onPress: () => BackHandler.exitApp() },
          ],
          { cancelable: true }
        );
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [selectedBid, showLookupModal, subScreen, activeTab]);

  // Subscribe to real-time live GeM public feed updates (Phone -> GeM directly)
  useEffect(() => {
    const unsubscribe = GeMLiveSyncService.subscribe((updatedBids, stats) => {
      if (updatedBids && updatedBids.length > 0) {
        setBids(updatedBids);
      }
      if (stats?.totalPortalOngoingBids) {
        setTotalPortalBids(stats.totalPortalOngoingBids);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const online = await isNetworkOnline();
      if (!online) {
        setBids([]);
        return;
      }

      const res = await GeMLiveSyncService.syncFromPortal(3);
      setBids(GeMLiveSyncService.getLiveBids());
      if (res.totalPortalBids) {
        setTotalPortalBids(res.totalPortalBids);
      }
    } catch {
      setBids(GeMLiveSyncService.getLiveBids());
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleQuickLookup = useCallback(async () => {
    const trimmed = lookupInput.trim();
    if (!trimmed) {
      Alert.alert(
        'Enter Bid Number',
        'Please enter a valid GeM Bid Number (e.g. GEM/2026/B/8229586)'
      );
      return;
    }

    const localMatch =
      bids.find(
        (b) =>
          b.bidNumber.toLowerCase().includes(trimmed.toLowerCase()) ||
          b.title.toLowerCase().includes(trimmed.toLowerCase())
      ) || GeMLiveSyncService.getBidById(trimmed);

    if (localMatch) {
      setShowLookupModal(false);
      setLookupInput('');
      setSelectedBid(localMatch);
      return;
    }

    setIsLookingUp(true);
    try {
      const liveMatches = await GeMLiveSyncService.lookupBidOnPortal(trimmed);
      setShowLookupModal(false);
      setLookupInput('');
      if (liveMatches.length > 0) {
        setSelectedBid(liveMatches[0]);
      } else {
        Alert.alert(
          'Bid not found on GeM',
          `No public bid matching "${trimmed}" was returned by bidplus.gem.gov.in.`
        );
      }
    } catch {
      Alert.alert(
        'Lookup failed',
        'Unable to reach bidplus.gem.gov.in right now. Check your connection and try again.'
      );
    } finally {
      setIsLookingUp(false);
    }
  }, [bids, lookupInput]);

  const openPreparation = useCallback((bid: DeconstructedBidDoc) => {
    setSelectedBid(null);
    setPreparationBidNumber(bid.bidNumber);
    setWorkInitialSection('DOCUMENTS');
    setSubScreen('PORTFOLIO');
  }, []);

  const handleHomeNavigate = (target: string, params?: HomeNavigateParams) => {
    if (target === 'MARKET') {
      setMarketNavCategory(params?.category);
      setMarketNavQuery(params?.search);
      setMarketNavTypeTab(params?.typeTab);
      setMarketNavTrigger((n) => n + 1);
      setActiveTab('SEARCH');
      setSubScreen('NONE');
    } else if (target === 'BIDS') {
      if (params?.search !== undefined) {
        setBidsNavSearch(params.search);
        setBidsNavTrigger((n) => n + 1);
      }
      setActiveTab('BIDS');
      setSubScreen('NONE');
    } else if (target === 'AUCTIONS') {
      setActiveTab('AUCTIONS');
      setSubScreen('NONE');
    } else if (target === 'ORDERS') {
      if (params?.search !== undefined) setContractsNavSearch(params.search);
      setSubScreen('CONTRACTS');
    } else if (target === 'PORTFOLIO') {
      setSubScreen('PORTFOLIO');
    } else if (target === 'PORTAL') {
      setSubScreen('PORTAL');
    } else if (target === 'CATEGORIES') {
      setSubScreen('CATEGORIES');
    } else if (target === 'HELP') {
      setSubScreen('HELP');
    } else if (target === 'MORE') {
      setActiveTab('MORE');
      setSubScreen('NONE');
    } else if (target === 'REG_BUYER') {
      setSubScreen('REG_BUYER');
    } else if (target === 'REG_SELLER') {
      setSubScreen('REG_SELLER');
    }
  };

  const handleSelectCategory = (cat: MarketplaceCategory) => {
    setMarketNavCategory(cat.name);
    setMarketNavQuery(undefined);
    setMarketNavTypeTab(cat.type === 'SERVICE' ? 'Services' : 'Products');
    setMarketNavTrigger((n) => n + 1);
    setSubScreen('NONE');
    setActiveTab('SEARCH');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface}
      />

      {/* Branded GeM Header — Shown on Home Tab Only to Maximize Space on Inner Screens */}
      {activeTab === 'HOME' && subScreen === 'NONE' && (
        <View
          style={[
            styles.headerBar,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.borderSubtle,
            },
          ]}
        >
          {/* Left: Real Official GeM Pinwheel Logo + Wordmark */}
          <Pressable
            style={styles.brandRow}
            unstable_pressDelay={0}
            hitSlop={8}
            onPress={() => {
              setActiveTab('HOME');
              setSubScreen('NONE');
            }}
          >
            <Image source={GEM_MARK_IMG} style={styles.gemLogoMark} resizeMode="contain" />
            <View style={styles.brandTextCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.brandGeM, { color: colors.primary }]}>GeM</Text>
                <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
              </View>
              <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
                Government e-Marketplace
              </Text>
            </View>
          </Pressable>

          {/* Right: Clear 1-Tap Bid Lookup + Portal Quick Action */}
          <View style={styles.headerRightActions}>
            <Pressable
              style={({ pressed }) => [
                styles.findBidPill,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.borderSubtle,
                  opacity: pressed ? 0.78 : 1,
                },
              ]}
              unstable_pressDelay={0}
              onPress={() => setShowLookupModal(true)}
              hitSlop={6}
              accessibilityLabel="Find bid by number"
            >
              <AppIcon name="search" color={colors.primary} size={14} />
              <Text style={[styles.findBidText, { color: colors.textPrimary }]}>{t('findBid')}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.portalQuickBtn,
                {
                  backgroundColor: colors.primaryTint,
                  opacity: pressed ? 0.78 : 1,
                },
              ]}
              unstable_pressDelay={0}
              onPress={() => setSubScreen('PORTAL')}
              hitSlop={6}
              accessibilityLabel="Open official GeM portal"
            >
              <Text style={[styles.portalQuickText, { color: colors.primary }]}>{t('portal')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Screen Body */}
      <View style={[styles.screenBody, { backgroundColor: colors.background }]}>
        {subScreen === 'CATEGORIES' && (
          <CategoriesScreen
            onSelectCategory={handleSelectCategory}
            onBack={() => setSubScreen('NONE')}
          />
        )}
        {subScreen === 'CONTRACTS' && (
          <View style={{ flex: 1 }}>
            <View
              style={[
                styles.subHeaderBar,
                { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle },
              ]}
            >
              <Pressable
                onPress={() => setSubScreen('NONE')}
                unstable_pressDelay={0}
                hitSlop={10}
                style={styles.backBtn}
              >
                <Text style={[styles.backArrow, { color: colors.primary }]}>←</Text>
              </Pressable>
              <Text style={[styles.subHeaderTitle, { color: colors.textPrimary }]}>
                Concluded Bids &amp; Contracts
              </Text>
            </View>
            <OrdersKnowledgeScreen
              initialSearch={contractsNavSearch}
              onPrepareDocuments={openPreparation}
            />
          </View>
        )}
        {subScreen === 'PORTAL' && <OfficialPortalScreen onBack={() => setSubScreen('NONE')} />}
        {subScreen === 'PORTFOLIO' && (
          <View style={{ flex: 1 }}>
            <View
              style={[
                styles.subHeaderBar,
                { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle },
              ]}
            >
              <Pressable
                onPress={() => setSubScreen('NONE')}
                unstable_pressDelay={0}
                hitSlop={10}
                style={styles.backBtn}
              >
                <Text style={[styles.backArrow, { color: colors.primary }]}>←</Text>
              </Pressable>
              <Text style={[styles.subHeaderTitle, { color: colors.textPrimary }]}>
                Document Preparation
              </Text>
            </View>
            <MyWorkScreen
              availableBids={bids}
              initialBidNumber={preparationBidNumber}
              initialSection={workInitialSection}
              onOpenOfficialPortal={() => setSubScreen('PORTAL')}
            />
          </View>
        )}
        {subScreen === 'REG_BUYER' && (
          <PortalRegistrationScreen initialMode="BUYER" onBack={() => setSubScreen('NONE')} />
        )}
        {subScreen === 'REG_SELLER' && (
          <PortalRegistrationScreen initialMode="SELLER" onBack={() => setSubScreen('NONE')} />
        )}
        {subScreen === 'HELP' && <HelpScreen onBack={() => setSubScreen('NONE')} />}

        {subScreen === 'NONE' && (
          <>
            {activeTab === 'HOME' && (
              <HomeScreen
                bids={bids}
                totalPortalBids={totalPortalBids}
                onNavigateTab={handleHomeNavigate}
                onSelectBid={(bid) => setSelectedBid(bid)}
                onOpenMyWork={() => setSubScreen('PORTFOLIO')}
                onOpenOfficialPortal={() => setSubScreen('PORTAL')}
              />
            )}
            {activeTab === 'SEARCH' && (
              <MarketplaceScreen
                initialCategory={marketNavCategory}
                initialQuery={marketNavQuery}
                initialTypeTab={marketNavTypeTab}
                navTrigger={marketNavTrigger}
                onPrepareDocuments={openPreparation}
              />
            )}
            {activeTab === 'BIDS' && (
              <BidsHubScreen
                bids={bids}
                initialSearch={bidsNavSearch}
                navTrigger={bidsNavTrigger}
                onSyncLive={loadData}
                isSyncing={isSyncing}
                onInspectBid={(bid) => setSelectedBid(bid)}
                onPrepareDocuments={openPreparation}
              />
            )}
            {activeTab === 'AUCTIONS' && (
              <AuctionsHubScreen onPrepareDocuments={openPreparation} />
            )}
            {activeTab === 'MORE' && (
              <MoreProfileScreen
                onNavigateTab={handleHomeNavigate}
                onOpenPortfolio={() => {
                  setWorkInitialSection('LIVE');
                  setSubScreen('PORTFOLIO');
                }}
                onOpenCompanyLocker={() => {
                  setWorkInitialSection('LOCKER');
                  setSubScreen('PORTFOLIO');
                }}
                onOpenOfficialPortal={() => setSubScreen('PORTAL')}
              />
            )}
          </>
        )}
      </View>

      {/* Fixed Bottom Navigation Bar */}
      <View
        style={[
          styles.bottomNav,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.borderSubtle,
          },
        ]}
      >
        {BOTTOM_NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id && subScreen === 'NONE';
          return (
            <Pressable
              key={item.id}
              unstable_pressDelay={0}
              android_ripple={{ color: 'rgba(0, 0, 0, 0.08)', borderless: false }}
              onPress={() => {
                setActiveTab(item.id);
                setSubScreen('NONE');
              }}
              style={[
                styles.navItem,
                isActive && {
                  backgroundColor: colors.primaryTint,
                },
              ]}
              hitSlop={6}
            >
              <View style={styles.navIconWrap}>
                <AppIcon
                  name={item.icon}
                  color={isActive ? colors.primary : colors.textMuted}
                  size={18}
                />
              </View>
              <Text
                style={[
                  styles.navLabel,
                  {
                    color: isActive ? colors.primary : colors.textMuted,
                    fontWeight: isActive ? '700' : '500',
                    fontSize: 11 * fontMultiplier,
                  },
                ]}
              >
                {t(item.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Quick Bid Lookup Modal */}
      <Modal
        visible={showLookupModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLookupModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.lookupCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.lookupHeader}>
              <Text style={[styles.lookupTitle, { color: colors.textPrimary }]}>
                Find GeM Bid or RA
              </Text>
              <Pressable onPress={() => setShowLookupModal(false)} hitSlop={10}>
                <Text style={[styles.lookupClose, { color: colors.textMuted }]}>✕</Text>
              </Pressable>
            </View>
            <Text style={[styles.lookupDesc, { color: colors.textSecondary }]}>
              Enter any GeM Bid or RA number to inspect terms, buyer specifications, drawings, and
              ATC documents immediately.
            </Text>
            <TextInput
              style={[
                styles.lookupInput,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="e.g. GEM/2026/B/8160154"
              placeholderTextColor={colors.textMuted}
              value={lookupInput}
              onChangeText={setLookupInput}
              autoCapitalize="characters"
              onSubmitEditing={handleQuickLookup}
              returnKeyType="search"
            />
            <View style={styles.lookupBtnRow}>
              <Pressable
                style={[styles.lookupCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowLookupModal(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.lookupSubmitBtn,
                  { backgroundColor: colors.primary, opacity: isLookingUp ? 0.7 : 1 },
                ]}
                onPress={handleQuickLookup}
                disabled={isLookingUp}
              >
                <Text style={{ color: colors.textInverse, fontWeight: '700' }}>
                  {isLookingUp ? 'Searching GeM…' : 'Search Live on GeM'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bid Detail Modal */}
      {selectedBid && (
        <BidInspectorScreen
          bid={selectedBid}
          visible={true}
          onClose={() => setSelectedBid(null)}
          onPrepareDocuments={openPreparation}
        />
      )}

      {/* Branded GeM Startup Launch Overlay (Zero blank screen on app start) */}
      {showSplash && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.splashOverlay,
            {
              backgroundColor: colors.surface,
              opacity: splashOpacity,
            },
          ]}
        >
          <View style={styles.splashCenter}>
            <Image
              source={isDark ? GEM_LOGO_DARK_IMG : GEM_LOGO_LIGHT_IMG}
              style={styles.splashLogo}
              resizeMode="contain"
            />
            <View style={styles.splashAccentBar}>
              <View style={{ flex: 1, backgroundColor: '#F58220', borderRadius: 2 }} />
              <View style={{ flex: 1, backgroundColor: '#78BE20', borderRadius: 2 }} />
              <View style={{ flex: 1, backgroundColor: '#0B4F71', borderRadius: 2 }} />
            </View>
            <Text style={[styles.splashTagline, { color: colors.textSecondary }]}>
              Efficient · Transparent · Inclusive
            </Text>
          </View>

          <View style={styles.splashFooter}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.splashFooterText, { color: colors.textMuted }]}>
              Connecting directly to live GeM feeds…
            </Text>
          </View>
        </Animated.View>
      )}
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
  safeArea: {
    flex: 1,
  },
  headerBar: {
    height: DESIGN_TOKENS.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gemLogoMark: {
    width: 30,
    height: 30,
  },
  brandTextCol: {},
  brandGeM: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 6,
  },
  brandSubtitle: {
    fontSize: 10,
    marginTop: -2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  findBidPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
  },
  findBidText: {
    fontSize: 12,
    fontWeight: '700',
  },
  portalQuickBtn: {
    paddingHorizontal: 10,
    minHeight: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalQuickText: {
    fontSize: 12,
    fontWeight: '800',
  },
  screenBody: {
    flex: 1,
  },
  subHeaderBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    marginRight: 10,
    padding: 4,
  },
  backArrow: {
    fontSize: 20,
    fontWeight: '700',
  },
  subHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  bottomNav: {
    height: DESIGN_TOKENS.bottomNavHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingHorizontal: 6,
    paddingBottom: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 8,
    paddingVertical: 4,
  },
  navIconWrap: {
    marginBottom: 3,
  },
  navLabel: {},
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  lookupCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 18,
  },
  lookupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  lookupTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  lookupClose: {
    fontSize: 18,
    fontWeight: '700',
  },
  lookupDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  lookupInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 14,
  },
  lookupBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  lookupCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  lookupSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 28,
  },
  splashCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  splashLogo: {
    width: 248,
    height: 98,
  },
  splashAccentBar: {
    flexDirection: 'row',
    width: 156,
    height: 3.5,
    gap: 6,
    marginTop: 18,
    marginBottom: 12,
  },
  splashTagline: {
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  splashFooter: {
    alignItems: 'center',
    gap: 8,
  },
  splashFooterText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
});
