/**
 * GeM Portals Directory & Ecosystem Hub
 * Comprehensive mobile representation of all official GeM sub-domains and auxiliary pages:
 * 1. 🏛️ Public Contracts Registry (gem.gov.in/view_contracts)
 * 2. ⚡ Forward Auction Portal (forwardauction.gem.gov.in)
 * 3. 🚂 Indian Railways IREPS (bidnext.gem.gov.in / ireps.gov.in)
 * 4. 🏷️ Proprietary Best Price Notices (bestprice.gem.gov.in)
 * 5. 🌐 Central Public Procurement Portal - CPPP (gem.gov.in/cppp)
 * 6. 🎓 GeM eLearning LMS (elearning.gem.gov.in)
 * 7. 💡 GeM Exclusive & MSME Advantages (gem.gov.in/gem-advantages)
 * 8. ❓ Helpdesk, FAQs & Incident Redressal (gem.gov.in/userFaqs & contactUs)
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { TouchButton } from '../components/TouchButton';
import { useTheme } from '../theme/ThemeContext';
import { MOCK_ACCEPTED_ORDERS, MOCK_FORWARD_AUCTIONS } from '../fixtures/mockData';
import { formatInr } from '../utils/formatters';

export type PortalSection =
  | 'CONTRACTS'
  | 'FORWARD_AUCTIONS'
  | 'RAILWAYS'
  | 'PBP'
  | 'CPPP'
  | 'ELEARNING'
  | 'ADVANTAGES'
  | 'HELPDESK';

interface ZonalRailwayNotice {
  id: string;
  zonalRailway: string;
  tenderNumber: string;
  description: string;
  estimatedValueInr: number;
  closingDate: string;
  category: string;
}

const OFFICIAL_RAILWAY_NOTICES: ZonalRailwayNotice[] = [
  {
    id: 'rail-001',
    zonalRailway: 'Northern Railway (NR), New Delhi',
    tenderNumber: 'NR-ENGG-2026-042',
    description: 'Supply of Heavy Duty Pre-Stressed Concrete Sleepers & Elastic Fastenings',
    estimatedValueInr: 45000000,
    closingDate: '28-Oct-2026',
    category: 'Track Infrastructure',
  },
  {
    id: 'rail-002',
    zonalRailway: 'Western Railway (WR), Mumbai',
    tenderNumber: 'WR-S&T-2026-118',
    description: 'Electronic Interlocking (EI) Systems and High-Availability Signalling Optical Fiber',
    estimatedValueInr: 28000000,
    closingDate: '02-Nov-2026',
    category: 'Signalling & Telecom',
  },
  {
    id: 'rail-003',
    zonalRailway: 'Southern Railway (SR), Chennai',
    tenderNumber: 'SR-MECH-2026-079',
    description: 'Vande Bharat Coach Interior Components & Fire Retardant Cushions',
    estimatedValueInr: 19500000,
    closingDate: '05-Nov-2026',
    category: 'Rolling Stock',
  },
  {
    id: 'rail-004',
    zonalRailway: 'Eastern Railway (ER), Kolkata',
    tenderNumber: 'ER-ELECT-2026-033',
    description: '25 kV AC Traction Overhead Equipment (OHE) Copper Catenary Wire',
    estimatedValueInr: 34000000,
    closingDate: '10-Nov-2026',
    category: 'Electrical Traction',
  },
];

const OFFICIAL_PBP_NOTICES = [
  {
    id: 'pbp-101',
    itemTitle: 'High-Resolution Mass Spectrometer Components',
    department: 'Indian Institute of Science (IISc), Bangalore',
    oemSupplier: 'Thermo Fisher Scientific India',
    justification: 'Proprietary Article Certificate (PAC) under GFR Rule 166. OEM replacement consumable.',
    estimatedValueInr: 8200000,
    validUntil: '15-Nov-2026',
  },
  {
    id: 'pbp-102',
    itemTitle: 'Proprietary Flight Simulator Avionics Maintenance Software License',
    department: 'Air Force Technical College (AFTC), Bangalore',
    oemSupplier: 'Hindustan Aeronautics Limited (HAL)',
    justification: 'Direct PAC Procurement for National Security and Defense Continuity.',
    estimatedValueInr: 14500000,
    validUntil: '22-Nov-2026',
  },
];

const OFFICIAL_CPPP_TENDERS = [
  {
    id: 'cppp-201',
    tenderId: '2026_CPPP_98124_1',
    title: 'Construction of 100-Bed Critical Care Hospital Block under PM-ABHIM',
    organization: 'Central Public Works Department (CPWD)',
    state: 'Madhya Pradesh',
    tenderValueInr: 125000000,
    closingDate: '12-Nov-2026',
  },
  {
    id: 'cppp-202',
    tenderId: '2026_CPPP_98299_2',
    title: 'Supply and Erection of 33/11 kV Substation Transformers and Switchgear',
    organization: 'State Electricity Transmission Utility',
    state: 'Rajasthan',
    tenderValueInr: 68000000,
    closingDate: '16-Nov-2026',
  },
];

const ELEARNING_MODULES = [
  {
    id: 'mod-1',
    title: 'Buyer Masterclass: GFR 149 & L1 Evaluation',
    audience: 'Buyer HODs & Procurement Officers',
    duration: '45 mins',
    level: 'Advanced',
    description: 'Complete walkthrough of direct purchase limits (<₹50k), L1 comparison (₹50k-₹5L), and mandatory competitive bidding.',
    link: 'https://elearning.gem.gov.in',
  },
  {
    id: 'mod-2',
    title: 'Seller Onboarding: MSE Privileges & EMD Exemption',
    audience: 'Sellers, Startups & MSMEs',
    duration: '30 mins',
    level: 'Essential',
    description: 'How to claim 100% EMD waiver, 25% annual reservation, and L1 + 15% price preference using Udyam certificate.',
    link: 'https://elearning.gem.gov.in',
  },
  {
    id: 'mod-3',
    title: 'CRAC & Timely Payment SLA Compliance',
    audience: 'Consignees & Finance Officers',
    duration: '25 mins',
    level: 'Statutory',
    description: 'Mandatory 10-day Consignee Receipt and Acceptance Certificate (CRAC) timeline and auto-deemed acceptance mechanics.',
    link: 'https://elearning.gem.gov.in',
  },
];

const HELPDESK_FAQS = [
  {
    q: 'Can anyone view tenders and products without an account?',
    a: 'Yes! GeM is an open public procurement portal. All products, services, technical specifications, active bids, reverse auctions, and contracts are 100% publicly accessible without logging in.',
  },
  {
    q: 'When is a GeM login actually required?',
    a: 'Login through GeM SSO is strictly required only when you are submitting a legally binding financial bid, or when a buyer creates a procurement requisition.',
  },
  {
    q: 'How does an MSE get 100% EMD exemption?',
    a: 'Under the Public Procurement Policy for MSEs Order 2012, vendors with a valid Udyam Registration Certificate are statutory exempted from paying Earnest Money Deposit (EMD).',
  },
  {
    q: 'What is the 10-day CRAC deemed acceptance rule?',
    a: 'Once goods are delivered, the consignee has 10 days to inspect and generate the CRAC. If no rejection is made within 10 days, GeM automatically marks the consignment as Deemed Accepted, unlocking PFMS payment release.',
  },
];

export const PortalsDirectoryScreen: React.FC = () => {
  const { colors, fontMultiplier, isDark } = useTheme();

  const [activeSection, setActiveSection] = useState<PortalSection>('CONTRACTS');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const openUrl = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Official Portal Link', `Visit ${url} in your mobile browser.`);
    });
  }, []);

  // Filtered executed contracts
  const filteredContracts = useMemo(() => {
    if (!searchQuery.trim()) return MOCK_ACCEPTED_ORDERS;
    const q = searchQuery.toLowerCase();
    return MOCK_ACCEPTED_ORDERS.filter(
      (c) =>
        c.contractNumber.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.buyerDepartment.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Ecosystem Header Banner */}
      <View style={[styles.ecosystemBanner, { backgroundColor: isDark ? colors.surface : colors.primary }]}>
        <View style={styles.bannerRow}>
          <Text style={styles.bannerEmblem}>🏛️</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { fontSize: 15 * fontMultiplier }]}>GeM Ecosystem Directory</Text>
            <Text style={styles.bannerSub}>All Official Sub-Domains, Contracts, Auctions & Services</Text>
          </View>
        </View>

        {/* Public Transparency Badge */}
        <View style={styles.publicBadge}>
          <Text style={styles.publicBadgeText}>
            🌐 Public Transparency Portal • Zero-Login Access to Official Procurement Records
          </Text>
        </View>
      </View>

      {/* Horizontal Sub-Domain Selector Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          <TouchButton
            title="📑 Contracts (view_contracts)"
            variant={activeSection === 'CONTRACTS' ? 'primary' : 'ghost'}
            size="small"
            onPress={() => setActiveSection('CONTRACTS')}
            style={styles.portalTab}
          />
          <TouchButton
            title="⚡ Forward Auctions"
            variant={activeSection === 'FORWARD_AUCTIONS' ? 'primary' : 'ghost'}
            size="small"
            onPress={() => setActiveSection('FORWARD_AUCTIONS')}
            style={styles.portalTab}
          />
          <TouchButton
            title="🚂 Railways (IREPS)"
            variant={activeSection === 'RAILWAYS' ? 'primary' : 'ghost'}
            size="small"
            onPress={() => setActiveSection('RAILWAYS')}
            style={styles.portalTab}
          />
          <TouchButton
            title="🏷️ PBP Notices"
            variant={activeSection === 'PBP' ? 'primary' : 'ghost'}
            size="small"
            onPress={() => setActiveSection('PBP')}
            style={styles.portalTab}
          />
          <TouchButton
            title="🌐 CPPP Tenders"
            variant={activeSection === 'CPPP' ? 'primary' : 'ghost'}
            size="small"
            onPress={() => setActiveSection('CPPP')}
            style={styles.portalTab}
          />
          <TouchButton
            title="🎓 eLearning LMS"
            variant={activeSection === 'ELEARNING' ? 'primary' : 'ghost'}
            size="small"
            onPress={() => setActiveSection('ELEARNING')}
            style={styles.portalTab}
          />
          <TouchButton
            title="💡 MSME Advantages"
            variant={activeSection === 'ADVANTAGES' ? 'primary' : 'ghost'}
            size="small"
            onPress={() => setActiveSection('ADVANTAGES')}
            style={styles.portalTab}
          />
          <TouchButton
            title="❓ Help & FAQs"
            variant={activeSection === 'HELPDESK' ? 'primary' : 'ghost'}
            size="small"
            onPress={() => setActiveSection('HELPDESK')}
            style={styles.portalTab}
          />
        </ScrollView>
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.contentBody} showsVerticalScrollIndicator={false}>
        {/* SUBDOMAIN 1: CONTRACTS REGISTRY (gem.gov.in/view_contracts) */}
        {activeSection === 'CONTRACTS' && (
          <View>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Public Executed Contracts Registry
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                  gem.gov.in/view_contracts • Statutory transparency of awarded procurement
                </Text>
              </View>
              <TouchButton
                title="View on GeM ➔"
                variant="outline"
                size="small"
                onPress={() => openUrl('https://gem.gov.in/view_contracts')}
              />
            </View>

            <TextInput
              style={[styles.searchInput, { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9', color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Search contracts by number, ministry, or goods..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {filteredContracts.map((c) => (
              <View key={c.contractNumber} style={[styles.contractCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.contractTopRow}>
                  <View style={styles.contractPill}>
                    <Text style={styles.contractPillText}>{c.contractNumber}</Text>
                  </View>
                  <Text style={[styles.contractDate, { color: colors.textMuted }]}>📅 {c.orderDate}</Text>
                </View>

                <Text style={[styles.contractTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                  {c.title}
                </Text>

                <Text style={[styles.contractDept, { color: colors.textMuted }]}>
                  🏛️ {c.buyerDepartment} • {c.ministry}
                </Text>

                <View style={[styles.contractValueRow, { backgroundColor: isDark ? colors.surfaceSubtle : '#F0FDF4' }]}>
                  <View>
                    <Text style={[styles.valLabel, { color: '#15803D' }]}>AWARDED ORDER VALUE</Text>
                    <Text style={[styles.valAmount, { color: colors.emerald }]}>
                      ₹{formatInr(c.orderValueInr)}
                    </Text>
                  </View>
                  <View style={styles.cracBadge}>
                    <Text style={styles.cracBadgeText}>✓ {c.cracStatus}</Text>
                  </View>
                </View>

                <View style={styles.contractFooter}>
                  <Text style={[styles.utrText, { color: colors.textMuted }]}>
                    PFMS UTR: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{c.pfmsUtrNumber}</Text>
                  </Text>
                  <TouchButton
                    title="Official PDF"
                    variant="ghost"
                    size="small"
                    icon="📄"
                    onPress={() => openUrl(`https://gem.gov.in/view_contracts`)}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* SUBDOMAIN 2: FORWARD AUCTION PORTAL (forwardauction.gem.gov.in) */}
        {activeSection === 'FORWARD_AUCTIONS' && (
          <View>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Government E-Scrap & Surplus Disposal
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                  forwardauction.gem.gov.in • Public auctions for condemned assets
                </Text>
              </View>
              <TouchButton
                title="FA Portal ➔"
                variant="outline"
                size="small"
                onPress={() => openUrl('https://forwardauction.gem.gov.in/eprocure/home')}
              />
            </View>

            {MOCK_FORWARD_AUCTIONS.map((fa) => (
              <View key={fa.lotNumber} style={[styles.contractCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.contractTopRow}>
                  <View style={[styles.contractPill, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.contractPillText, { color: '#92400E' }]}>{fa.lotNumber}</Text>
                  </View>
                  <Text style={[styles.contractDate, { color: '#DC2626', fontWeight: '800' }]}>
                    ⏳ Ends: {new Date(fa.auctionClosingUtc).toLocaleTimeString()}
                  </Text>
                </View>

                <Text style={[styles.contractTitle, { color: colors.textPrimary }]}>{fa.title}</Text>
                <Text style={[styles.contractDept, { color: colors.textMuted }]}>
                  🏛️ {fa.custodianDepartment} • Location: {fa.locationState}
                </Text>

                <View style={[styles.contractValueRow, { backgroundColor: isDark ? colors.surfaceSubtle : '#FEF3C7' }]}>
                  <View>
                    <Text style={[styles.valLabel, { color: '#B45309' }]}>CURRENT HIGHEST BID (H1)</Text>
                    <Text style={[styles.valAmount, { color: '#B45309' }]}>
                      ₹{formatInr(fa.currentH1BidInr)}
                    </Text>
                  </View>
                  <View style={styles.cracBadge}>
                    <Text style={styles.cracBadgeText}>⚡ {fa.totalBidsCount} Bids Placed</Text>
                  </View>
                </View>

                <TouchButton
                  title="View Auction Room on GeM ➔"
                  variant="primary"
                  size="small"
                  onPress={() => openUrl('https://forwardauction.gem.gov.in/eprocure/home')}
                  style={{ marginTop: 8 }}
                />
              </View>
            ))}
          </View>
        )}

        {/* SUBDOMAIN 3: INDIAN RAILWAYS (IREPS / bidnext.gem.gov.in) */}
        {activeSection === 'RAILWAYS' && (
          <View>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Indian Railways E-Procurement (IREPS)
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                  bidnext.gem.gov.in • ireps.gov.in • Track, Rolling Stock & Signalling
                </Text>
              </View>
              <TouchButton
                title="IREPS ➔"
                variant="outline"
                size="small"
                onPress={() => openUrl('https://www.ireps.gov.in')}
              />
            </View>

            {OFFICIAL_RAILWAY_NOTICES.map((r) => (
              <View key={r.id} style={[styles.contractCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.contractTopRow}>
                  <View style={[styles.contractPill, { backgroundColor: '#E0F2FE' }]}>
                    <Text style={[styles.contractPillText, { color: '#0369A1' }]}>{r.tenderNumber}</Text>
                  </View>
                  <Text style={[styles.contractDate, { color: colors.textMuted }]}>Due: {r.closingDate}</Text>
                </View>

                <Text style={[styles.contractTitle, { color: colors.textPrimary }]}>{r.description}</Text>
                <Text style={[styles.contractDept, { color: colors.textMuted }]}>
                  🚂 {r.zonalRailway} • Domain: {r.category}
                </Text>

                <View style={[styles.contractValueRow, { backgroundColor: isDark ? colors.surfaceSubtle : '#EFF6FF' }]}>
                  <View>
                    <Text style={[styles.valLabel, { color: '#1E40AF' }]}>ESTIMATED TENDER VALUE</Text>
                    <Text style={[styles.valAmount, { color: '#1E40AF' }]}>
                      ₹{(r.estimatedValueInr / 10000000).toFixed(2)} Crores
                    </Text>
                  </View>
                </View>

                <TouchButton
                  title="View on Railways BidNext ➔"
                  variant="primary"
                  size="small"
                  onPress={() => openUrl('https://bidnext.gem.gov.in/bidnext/public.jsp')}
                  style={{ marginTop: 8 }}
                />
              </View>
            ))}
          </View>
        )}

        {/* SUBDOMAIN 4: PROPRIETARY BEST PRICE (bestprice.gem.gov.in) */}
        {activeSection === 'PBP' && (
          <View>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Proprietary Best Price (PBP) Notices
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                  bestprice.gem.gov.in • PAC Single-Source Procurement Notices
                </Text>
              </View>
              <TouchButton
                title="PBP Portal ➔"
                variant="outline"
                size="small"
                onPress={() => openUrl('https://bestprice.gem.gov.in/')}
              />
            </View>

            {OFFICIAL_PBP_NOTICES.map((p) => (
              <View key={p.id} style={[styles.contractCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.contractTopRow}>
                  <View style={[styles.contractPill, { backgroundColor: '#F3E8FF' }]}>
                    <Text style={[styles.contractPillText, { color: '#7E22CE' }]}>PAC NOTICE</Text>
                  </View>
                  <Text style={[styles.contractDate, { color: colors.textMuted }]}>Valid Until: {p.validUntil}</Text>
                </View>

                <Text style={[styles.contractTitle, { color: colors.textPrimary }]}>{p.itemTitle}</Text>
                <Text style={[styles.contractDept, { color: colors.textMuted }]}>🏛️ {p.department}</Text>

                <View style={[styles.infoCallout, { backgroundColor: isDark ? colors.surfaceSubtle : '#FAF5FF', borderColor: '#E9D5FF' }]}>
                  <Text style={[styles.calloutLabel, { color: '#7E22CE' }]}>OEM Justification:</Text>
                  <Text style={[styles.calloutText, { color: colors.textPrimary }]}>{p.justification}</Text>
                </View>

                <TouchButton
                  title="Inspect PAC Single-Source Notice ➔"
                  variant="primary"
                  size="small"
                  onPress={() => openUrl('https://bestprice.gem.gov.in/')}
                  style={{ marginTop: 8 }}
                />
              </View>
            ))}
          </View>
        )}

        {/* SUBDOMAIN 5: CPPP INTEGRATION (gem.gov.in/cppp) */}
        {activeSection === 'CPPP' && (
          <View>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Central Public Procurement Portal (CPPP)
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                  gem.gov.in/cppp • eprocure.gov.in • Integrated National Tenders
                </Text>
              </View>
              <TouchButton
                title="CPPP Portal ➔"
                variant="outline"
                size="small"
                onPress={() => openUrl('https://gem.gov.in/cppp')}
              />
            </View>

            {OFFICIAL_CPPP_TENDERS.map((cppp) => (
              <View key={cppp.id} style={[styles.contractCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.contractTopRow}>
                  <View style={[styles.contractPill, { backgroundColor: '#EDE9FE' }]}>
                    <Text style={[styles.contractPillText, { color: '#5B21B6' }]}>{cppp.tenderId}</Text>
                  </View>
                  <Text style={[styles.contractDate, { color: colors.textMuted }]}>Due: {cppp.closingDate}</Text>
                </View>

                <Text style={[styles.contractTitle, { color: colors.textPrimary }]}>{cppp.title}</Text>
                <Text style={[styles.contractDept, { color: colors.textMuted }]}>
                  🏛️ {cppp.organization} • State: {cppp.state}
                </Text>

                <View style={[styles.contractValueRow, { backgroundColor: isDark ? colors.surfaceSubtle : '#EDE9FE' }]}>
                  <View>
                    <Text style={[styles.valLabel, { color: '#5B21B6' }]}>ESTIMATED TENDER VALUE</Text>
                    <Text style={[styles.valAmount, { color: '#5B21B6' }]}>
                      ₹{(cppp.tenderValueInr / 10000000).toFixed(2)} Crores
                    </Text>
                  </View>
                </View>

                <TouchButton
                  title="View on CPPP eProcure ➔"
                  variant="primary"
                  size="small"
                  onPress={() => openUrl('https://eprocure.gov.in/cppp')}
                  style={{ marginTop: 8 }}
                />
              </View>
            ))}
          </View>
        )}

        {/* SUBDOMAIN 6: ELEARNING LMS (elearning.gem.gov.in) */}
        {activeSection === 'ELEARNING' && (
          <View>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  GeM Interactive Training & Certifications
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                  elearning.gem.gov.in • Official LMS Courses for Buyers and Sellers
                </Text>
              </View>
              <TouchButton
                title="LMS Portal ➔"
                variant="outline"
                size="small"
                onPress={() => openUrl('https://elearning.gem.gov.in')}
              />
            </View>

            {ELEARNING_MODULES.map((m) => (
              <View key={m.id} style={[styles.contractCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.contractTopRow}>
                  <View style={[styles.contractPill, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={[styles.contractPillText, { color: '#15803D' }]}>{m.level}</Text>
                  </View>
                  <Text style={[styles.contractDate, { color: colors.textMuted }]}>⏱️ {m.duration}</Text>
                </View>

                <Text style={[styles.contractTitle, { color: colors.textPrimary }]}>{m.title}</Text>
                <Text style={[styles.contractDept, { color: colors.textMuted }]}>Target: {m.audience}</Text>
                <Text style={[styles.moduleDesc, { color: colors.textSecondary }]}>{m.description}</Text>

                <TouchButton
                  title="Start Interactive Course ➔"
                  variant="emerald"
                  size="small"
                  onPress={() => openUrl(m.link)}
                  style={{ marginTop: 8 }}
                />
              </View>
            ))}
          </View>
        )}

        {/* SUBDOMAIN 7: MSME ADVANTAGES & EXCLUSIVES (gem.gov.in/gem-advantages) */}
        {activeSection === 'ADVANTAGES' && (
          <View>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Statutory MSME & Startup Privileges
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                  gem.gov.in/gem-advantages • Public Procurement Policy Order 2012
                </Text>
              </View>
            </View>

            <View style={[styles.advantageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.advIcon}>🛡️</Text>
              <Text style={[styles.advTitle, { color: colors.textPrimary }]}>100% EMD Waiver</Text>
              <Text style={[styles.advDesc, { color: colors.textMuted }]}>
                Micro and Small Enterprises (MSEs) registered with Udyam are completely exempted from submitting Earnest Money Deposits on all GeM tenders.
              </Text>
            </View>

            <View style={[styles.advantageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.advIcon}>🎯</Text>
              <Text style={[styles.advTitle, { color: colors.textPrimary }]}>25% Annual Mandatory Quota</Text>
              <Text style={[styles.advDesc, { color: colors.textMuted }]}>
                Central Government Ministries, Departments, and CPSEs are legally mandated to procure a minimum of 25% of their annual requirements from MSEs (including 4% SC/ST and 3% Women entrepreneurs).
              </Text>
            </View>

            <View style={[styles.advantageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.advIcon}>⚡</Text>
              <Text style={[styles.advTitle, { color: colors.textPrimary }]}>L1 + 15% Purchase Preference</Text>
              <Text style={[styles.advDesc, { color: colors.textMuted }]}>
                Participating MSEs bidding within L1 + 15% price band are granted the opportunity to match L1 and receive up to 25% of the tender quantity.
              </Text>
            </View>

            <View style={[styles.advantageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.advIcon}>⏱️</Text>
              <Text style={[styles.advTitle, { color: colors.textPrimary }]}>10-Day Statutory CRAC Payment</Text>
              <Text style={[styles.advDesc, { color: colors.textMuted }]}>
                Mandatory Consignee Receipt and Acceptance Certificate (CRAC) within 10 days of delivery. Deemed acceptance triggered automatically if not processed, safeguarding vendor cash flow.
              </Text>
            </View>
          </View>
        )}

        {/* SUBDOMAIN 8: HELPDESK & FAQS (gem.gov.in/userFaqs) */}
        {activeSection === 'HELPDESK' && (
          <View>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Helpdesk, FAQs & Grievance Redressal
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                  gem.gov.in/contactUs • 24x7 National Procurement Support
                </Text>
              </View>
            </View>

            {/* Toll-Free Helpdesk Box */}
            <View style={[styles.tollFreeCard, { backgroundColor: isDark ? colors.surfaceSubtle : '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <Text style={styles.tollFreeTitle}>📞 National Toll-Free Helplines</Text>
              <Text style={styles.tollFreeNumbers}>1800-419-3436 • 1800-102-3436</Text>
              <Text style={styles.tollFreeTiming}>Monday to Saturday: 08:00 AM to 08:00 PM IST</Text>
              <TouchButton
                title="Raise Incident Ticket on GeM ➔"
                variant="primary"
                size="small"
                onPress={() => openUrl('https://gem.gov.in/gemtickets/create')}
                style={{ marginTop: 8 }}
              />
            </View>

            <Text style={[styles.faqSectionHeading, { color: colors.textPrimary }]}>Frequently Asked Questions</Text>
            {HELPDESK_FAQS.map((faq, idx) => (
              <View key={idx} style={[styles.faqCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.faqQ, { color: colors.textPrimary }]}>Q: {faq.q}</Text>
                <Text style={[styles.faqA, { color: colors.textSecondary }]}>{faq.a}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  ecosystemBanner: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
  },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bannerEmblem: { fontSize: 22 },
  bannerTitle: { color: '#FFFFFF', fontWeight: '900' },
  bannerSub: { color: '#93C5FD', fontSize: 10.5, fontWeight: '600' },
  publicBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  publicBadgeText: { color: '#E0F2FE', fontSize: 10, fontWeight: '700' },
  tabBar: { borderBottomWidth: 1 },
  tabScroll: { paddingHorizontal: 10, paddingVertical: 6, gap: 6 },
  portalTab: { paddingHorizontal: 8, paddingVertical: 4 },
  contentBody: { padding: 12, paddingBottom: 32 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '900' },
  sectionSubtitle: { fontSize: 10.5, marginTop: 1 },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  contractCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  contractTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  contractPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  contractPillText: { color: '#15803D', fontSize: 10, fontWeight: '800' },
  contractDate: { fontSize: 10.5, fontWeight: '600' },
  contractTitle: { fontSize: 13, fontWeight: '800', lineHeight: 18, marginBottom: 4 },
  contractDept: { fontSize: 11, marginBottom: 8 },
  contractValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  valLabel: { fontSize: 9.5, fontWeight: '800' },
  valAmount: { fontSize: 15, fontWeight: '900' },
  cracBadge: { backgroundColor: '#FFFFFF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  cracBadgeText: { color: '#15803D', fontSize: 10, fontWeight: '800' },
  contractFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 6 },
  utrText: { fontSize: 10.5 },
  infoCallout: { borderWidth: 1, borderRadius: 8, padding: 8, marginVertical: 6 },
  calloutLabel: { fontSize: 10, fontWeight: '800', marginBottom: 2 },
  calloutText: { fontSize: 11, lineHeight: 15 },
  moduleDesc: { fontSize: 11.5, lineHeight: 16, marginTop: 4 },
  advantageCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  advIcon: { fontSize: 24, marginBottom: 4 },
  advTitle: { fontSize: 14, fontWeight: '900', marginBottom: 4 },
  advDesc: { fontSize: 11.5, lineHeight: 16 },
  tollFreeCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14 },
  tollFreeTitle: { color: '#1E40AF', fontSize: 13, fontWeight: '900', marginBottom: 2 },
  tollFreeNumbers: { color: '#1E40AF', fontSize: 16, fontWeight: '900', marginVertical: 2 },
  tollFreeTiming: { color: '#3B82F6', fontSize: 10.5, fontWeight: '600' },
  faqSectionHeading: { fontSize: 13, fontWeight: '900', marginBottom: 8, marginTop: 4 },
  faqCard: { borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1 },
  faqQ: { fontSize: 12.5, fontWeight: '800', marginBottom: 4 },
  faqA: { fontSize: 11.5, lineHeight: 16 },
});
