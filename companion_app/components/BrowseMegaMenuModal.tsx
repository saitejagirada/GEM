/**
 * GeM Browse Mega-Menu Modal
 * Exact mobile replica of the official mkp.gem.gov.in BROWSE mega-menu flyout
 * as captured in the user screenshot:
 * - 9 Popular Product Categories with 36 official sub-categories
 * - 20 Trending Services + 10 Emerging Services
 * - Special Outlets (Saras Ajeevika, ODOP, Startup Runway, Womaniya, Millets)
 * - BOQ Based Bidding & Enhanced Bunching
 * - Zero touch latency with TouchButton
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { TouchButton } from './TouchButton';
import { useTheme } from '../theme/ThemeContext';
import {
  OFFICIAL_PRODUCT_CATEGORIES,
  OFFICIAL_SERVICE_CATEGORIES,
  OFFICIAL_OUTLET_STORES,
} from '../services/MarketplaceService';

export interface BrowseMegaMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCategory: (categoryName: string, subcategoryName?: string) => void;
  onSelectOutlet?: (outletId: string) => void;
}

type BrowseSection = 'PRODUCTS' | 'SERVICES' | 'OUTLETS' | 'BOQ' | 'BUNCHING';

export const BrowseMegaMenuModal: React.FC<BrowseMegaMenuModalProps> = ({
  visible,
  onClose,
  onSelectCategory,
  onSelectOutlet,
}) => {
  const { colors, isDark, fontMultiplier } = useTheme();
  const [activeSection, setActiveSection] = useState<BrowseSection>('PRODUCTS');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const filteredProductCategories = useMemo(() => {
    if (!searchFilter.trim()) return OFFICIAL_PRODUCT_CATEGORIES;
    const q = searchFilter.toLowerCase();
    return OFFICIAL_PRODUCT_CATEGORIES.map((cat) => ({
      ...cat,
      subcategories: cat.subcategories.filter((s) => s.toLowerCase().includes(q)),
    })).filter((cat) => cat.name.toLowerCase().includes(q) || cat.subcategories.length > 0);
  }, [searchFilter]);

  const handleSubcategoryClick = useCallback(
    (category: string, sub?: string) => {
      onSelectCategory(category, sub);
      onClose();
    },
    [onSelectCategory, onClose]
  );

  const handleOutletClick = useCallback(
    (outletId: string) => {
      if (onSelectOutlet) onSelectOutlet(outletId);
      onClose();
    },
    [onSelectOutlet, onClose]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
        {/* Top Header Bar matching gem.gov.in */}
        <View style={[styles.headerBar, { backgroundColor: isDark ? colors.surface : colors.primary }]}>
          <View style={styles.headerLeft}>
            <View style={styles.emblemBadge}>
              <Text style={styles.emblemText}>🇮🇳 GeM</Text>
            </View>
            <View>
              <Text style={[styles.headerTitle, { fontSize: 15 * fontMultiplier }]}>Browse Categories</Text>
              <Text style={styles.headerSubtitle}>mkp.gem.gov.in • National Public Taxonomy</Text>
            </View>
          </View>
          <TouchButton
            title="✕"
            variant="ghost"
            size="small"
            onPress={onClose}
            textStyle={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}
            hitSlopPadding={8}
          />
        </View>

        {/* Quick Filter Input */}
        <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={[styles.filterInputWrapper, { backgroundColor: isDark ? colors.surfaceSubtle : '#F1F5F9' }]}>
            <Text style={styles.filterIcon}>🔍</Text>
            <TextInput
              style={[styles.filterInput, { color: colors.textPrimary }]}
              placeholder="Filter categories (e.g., Laptops, Desktops, Gloves, Cabs)..."
              placeholderTextColor={colors.textMuted}
              value={searchFilter}
              onChangeText={setSearchFilter}
              autoCapitalize="none"
            />
            {searchFilter.length > 0 && (
              <TouchButton
                title="✕"
                variant="ghost"
                size="small"
                onPress={() => setSearchFilter('')}
                hitSlopPadding={4}
              />
            )}
          </View>
        </View>

        {/* 2-Column Split: Navigation Left, Content Right */}
        <View style={styles.bodySplit}>
          {/* Left Navigation Column */}
          <View style={[styles.leftNav, { backgroundColor: isDark ? colors.surface : '#F1F5F9', borderRightColor: colors.border }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchButton
                title="Products"
                icon="📦"
                variant={activeSection === 'PRODUCTS' ? 'primary' : 'ghost'}
                size="small"
                onPress={() => setActiveSection('PRODUCTS')}
                style={styles.sectionNavBtn}
                textStyle={[styles.sectionNavText, activeSection === 'PRODUCTS' && styles.sectionNavTextActive]}
              />
              <TouchButton
                title="Services"
                icon="🛠️"
                variant={activeSection === 'SERVICES' ? 'primary' : 'ghost'}
                size="small"
                onPress={() => setActiveSection('SERVICES')}
                style={styles.sectionNavBtn}
                textStyle={[styles.sectionNavText, activeSection === 'SERVICES' && styles.sectionNavTextActive]}
              />
              <TouchButton
                title="Outlet Stores"
                icon="🏛️"
                variant={activeSection === 'OUTLETS' ? 'primary' : 'ghost'}
                size="small"
                onPress={() => setActiveSection('OUTLETS')}
                style={styles.sectionNavBtn}
                textStyle={[styles.sectionNavText, activeSection === 'OUTLETS' && styles.sectionNavTextActive]}
              />
              <TouchButton
                title="BOQ Bidding"
                icon="📋"
                variant={activeSection === 'BOQ' ? 'primary' : 'ghost'}
                size="small"
                onPress={() => setActiveSection('BOQ')}
                style={styles.sectionNavBtn}
                textStyle={[styles.sectionNavText, activeSection === 'BOQ' && styles.sectionNavTextActive]}
              />
              <TouchButton
                title="Bunching"
                icon="⚡"
                variant={activeSection === 'BUNCHING' ? 'primary' : 'ghost'}
                size="small"
                onPress={() => setActiveSection('BUNCHING')}
                style={styles.sectionNavBtn}
                textStyle={[styles.sectionNavText, activeSection === 'BUNCHING' && styles.sectionNavTextActive]}
              />
            </ScrollView>
          </View>

          {/* Right Panel: Hierarchical Sub-Categories */}
          <View style={[styles.rightContent, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.rightContentScroll}>
              {/* SECTION: PRODUCTS */}
              {activeSection === 'PRODUCTS' && (
                <View>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionHeaderTitle, { color: colors.textPrimary }]}>Popular Product Categories</Text>
                    <TouchButton
                      title="View All ➔"
                      variant="ghost"
                      size="small"
                      onPress={() => handleSubcategoryClick('All Categories')}
                      textStyle={{ color: colors.primary, fontSize: 11, fontWeight: '800' }}
                    />
                  </View>

                  {filteredProductCategories.map((cat) => (
                    <View key={cat.id} style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      {/* Main Category Header */}
                      <View style={styles.catHeader}>
                        <Text style={styles.catIcon}>{cat.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.catName, { color: colors.textPrimary }]}>{cat.name}</Text>
                          <Text style={[styles.catCount, { color: colors.textMuted }]}>{cat.itemCount.toLocaleString('en-IN')} Products Listed</Text>
                        </View>
                        <TouchButton
                          title="Explore"
                          variant="secondary"
                          size="small"
                          onPress={() => handleSubcategoryClick(cat.name)}
                        />
                      </View>

                      {/* Subcategory Links */}
                      <View style={styles.subGrid}>
                        {cat.subcategories.map((sub) => (
                          <TouchButton
                            key={sub}
                            title={`• ${sub}`}
                            variant="ghost"
                            size="small"
                            onPress={() => handleSubcategoryClick(cat.name, sub)}
                            style={styles.subBtn}
                            textStyle={[styles.subText, { color: colors.textSecondary }]}
                          />
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* SECTION: SERVICES */}
              {activeSection === 'SERVICES' && (
                <View>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionHeaderTitle, { color: colors.textPrimary }]}>Trending & Emerging Services</Text>
                    <TouchButton
                      title="All Services ➔"
                      variant="ghost"
                      size="small"
                      onPress={() => handleSubcategoryClick('All Categories')}
                      textStyle={{ color: colors.primary, fontSize: 11, fontWeight: '800' }}
                    />
                  </View>

                  {OFFICIAL_SERVICE_CATEGORIES.map((serv) => (
                    <View key={serv.id} style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.catHeader}>
                        <Text style={styles.catIcon}>{serv.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.catName, { color: colors.textPrimary }]}>{serv.name}</Text>
                          <Text style={[styles.catCount, { color: colors.textMuted }]}>{serv.itemCount} Registered Service Providers</Text>
                        </View>
                        <TouchButton
                          title="Select"
                          variant="secondary"
                          size="small"
                          onPress={() => handleSubcategoryClick(serv.name)}
                        />
                      </View>
                      <View style={styles.subGrid}>
                        {serv.subcategories.map((sub) => (
                          <TouchButton
                            key={sub}
                            title={`• ${sub}`}
                            variant="ghost"
                            size="small"
                            onPress={() => handleSubcategoryClick(serv.name, sub)}
                            style={styles.subBtn}
                            textStyle={[styles.subText, { color: colors.textSecondary }]}
                          />
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* SECTION: OUTLET STORES */}
              {activeSection === 'OUTLETS' && (
                <View>
                  <Text style={[styles.sectionHeaderTitle, { color: colors.textPrimary, marginBottom: 12 }]}>
                    National Initiative Outlet Stores
                  </Text>
                  {OFFICIAL_OUTLET_STORES.map((outlet) => (
                    <View
                      key={outlet.id}
                      style={[
                        styles.outletCard,
                        { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: outlet.accentColor },
                      ]}
                    >
                      <View style={styles.outletCardHeader}>
                        <View style={[styles.outletBadgePill, { backgroundColor: outlet.accentColor }]}>
                          <Text style={styles.outletBadgePillText}>{outlet.badge}</Text>
                        </View>
                        <Text style={[styles.outletTitle, { color: colors.textPrimary }]}>{outlet.name}</Text>
                      </View>
                      <Text style={[styles.outletTagline, { color: colors.textMuted }]}>{outlet.tagline}</Text>
                      <TouchButton
                        title={`Explore ${outlet.name} ➔`}
                        variant="primary"
                        size="small"
                        onPress={() => handleOutletClick(outlet.id)}
                        style={{ marginTop: 8 }}
                      />
                    </View>
                  ))}
                </View>
              )}

              {/* SECTION: BOQ BIDDING */}
              {activeSection === 'BOQ' && (
                <View style={[styles.infoBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.infoBlockTitle, { color: colors.textPrimary }]}>📋 Bill of Quantities (BOQ) Bidding</Text>
                  <Text style={[styles.infoBlockBody, { color: colors.textMuted }]}>
                    Buyers can invite bids with custom technical specifications and BOQ line items that are not standard catalog entries.
                  </Text>
                  <TouchButton
                    title="Filter BOQ Bids in Bids Hub ➔"
                    variant="primary"
                    size="medium"
                    onPress={() => {
                      onSelectCategory('BOQ');
                      onClose();
                    }}
                    style={{ marginTop: 12 }}
                  />
                </View>
              )}

              {/* SECTION: ENHANCED BUNCHING */}
              {activeSection === 'BUNCHING' && (
                <View style={[styles.infoBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.infoBlockTitle, { color: colors.textPrimary }]}>⚡ Enhanced Bunching - Services</Text>
                  <Text style={[styles.infoBlockBody, { color: colors.textMuted }]}>
                    Consolidate multiple related services (e.g., Security + Cleaning + Manpower) across consignee locations into a unified procurement bundle under GFR Rule 149.
                  </Text>
                  <TouchButton
                    title="View Bundled Service Packages ➔"
                    variant="primary"
                    size="medium"
                    onPress={() => {
                      onSelectCategory('Services Bunching');
                      onClose();
                    }}
                    style={{ marginTop: 12 }}
                  />
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emblemBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  emblemText: { color: '#0B3B60', fontSize: 11, fontWeight: '900' },
  headerTitle: { color: '#FFFFFF', fontWeight: '900' },
  headerSubtitle: { color: '#93C5FD', fontSize: 10, fontWeight: '600' },
  filterBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  filterInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 8,
    minHeight: 40,
  },
  filterIcon: { fontSize: 14, marginRight: 6 },
  filterInput: { flex: 1, fontSize: 13, paddingVertical: 6 },
  bodySplit: { flex: 1, flexDirection: 'row' },
  leftNav: {
    width: 100,
    borderRightWidth: 1,
    paddingVertical: 8,
  },
  sectionNavBtn: {
    marginHorizontal: 6,
    marginBottom: 6,
    paddingVertical: 8,
  },
  sectionNavText: { fontSize: 11, fontWeight: '700' },
  sectionNavTextActive: { color: '#FFFFFF' },
  rightContent: { flex: 1 },
  rightContentScroll: { padding: 12, paddingBottom: 24 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeaderTitle: { fontSize: 14, fontWeight: '900' },
  categoryCard: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  catIcon: { fontSize: 20 },
  catName: { fontSize: 13, fontWeight: '800' },
  catCount: { fontSize: 10.5 },
  subGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  subBtn: { paddingVertical: 3, paddingHorizontal: 4 },
  subText: { fontSize: 11, fontWeight: '600' },
  outletCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  outletCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  outletBadgePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  outletBadgePillText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  outletTitle: { fontSize: 13, fontWeight: '800' },
  outletTagline: { fontSize: 11, lineHeight: 15 },
  infoBlock: {
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
  },
  infoBlockTitle: { fontSize: 14, fontWeight: '800', marginBottom: 6 },
  infoBlockBody: { fontSize: 12, lineHeight: 17 },
});
