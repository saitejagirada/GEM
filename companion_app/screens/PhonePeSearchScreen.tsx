import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import type { DeconstructedBidDoc, UserAgentProfile } from '../types/index';
import { UserAgentService } from '../services/UserAgentService';
import { BidDocService } from '../services/BidDocService';
import { BidInspectorScreen } from './BidInspectorScreen';

interface PhonePeSearchScreenProps {
  bids: DeconstructedBidDoc[];
  userProfile: UserAgentProfile;
  initialFilter?: string;
}

export const PhonePeSearchScreen: React.FC<PhonePeSearchScreenProps> = ({
  bids,
  userProfile,
  initialFilter = '',
}) => {
  const [searchQuery, setSearchQuery] = useState(initialFilter);
  const [selectedBid, setSelectedBid] = useState<DeconstructedBidDoc | null>(null);

  const ranked = UserAgentService.rankDailyBids(userProfile, bids);

  const filtered = ranked.filter(({ bid }) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      bid.bidNumber.toLowerCase().includes(q) ||
      bid.title.toLowerCase().includes(q) ||
      bid.department.toLowerCase().includes(q) ||
      bid.ministry.toLowerCase().includes(q)
    );
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Title (PhonePe Search style) */}
      <Text style={styles.screenTitle}>Search</Text>

      {/* Pill Search Input */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search tenders, items, departments..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Popular Suggestions (PhonePe Popular squircle icons) */}
      <Text style={styles.sectionHeading}>Popular Searches</Text>
      <View style={styles.popularRow}>
        <TouchableOpacity
          style={styles.popularItem}
          onPress={() => setSearchQuery('LED')}
          activeOpacity={0.7}
        >
          <View style={styles.popularBox}>
            <Text style={styles.popularIcon}>⚡</Text>
          </View>
          <Text style={styles.popularLabel}>LED Lights</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.popularItem}
          onPress={() => setSearchQuery('Defence')}
          activeOpacity={0.7}
        >
          <View style={styles.popularBox}>
            <Text style={styles.popularIcon}>🎖️</Text>
          </View>
          <Text style={styles.popularLabel}>Defence</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.popularItem}
          onPress={() => setSearchQuery('Railways')}
          activeOpacity={0.7}
        >
          <View style={styles.popularBox}>
            <Text style={styles.popularIcon}>🚂</Text>
          </View>
          <Text style={styles.popularLabel}>Railways</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.popularItem}
          onPress={() => setSearchQuery('Cables')}
          activeOpacity={0.7}
        >
          <View style={styles.popularBox}>
            <Text style={styles.popularIcon}>🔌</Text>
          </View>
          <Text style={styles.popularLabel}>OFC Cables</Text>
        </TouchableOpacity>
      </View>

      {/* Results List */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filtered.length} Tenders Available
        </Text>
      </View>

      {filtered.map(({ bid, evaluation }) => {
        const f = BidDocService.getFundamentalsSummary(bid);
        return (
          <TouchableOpacity
            key={bid.bidNumber}
            style={styles.bidCard}
            onPress={() => setSelectedBid(bid)}
            activeOpacity={0.8}
          >
            <View style={styles.cardTop}>
              <View style={[styles.matchPill, evaluation.matchScore >= 80 ? styles.matchHigh : styles.matchMod]}>
                <Text style={styles.matchPillText}>★ {evaluation.matchScore}% MATCH</Text>
              </View>
              <Text style={styles.bidNumText}>{bid.bidNumber}</Text>
            </View>

            <Text style={styles.bidTitle}>{bid.title}</Text>
            <Text style={styles.deptText}>{bid.department}</Text>

            <View style={styles.cardGrid}>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>EST. VALUE</Text>
                <Text style={styles.cellValue}>{f.estimatedValueLabel}</Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>EMD STATUS</Text>
                <Text style={[styles.cellValue, { color: '#00C853' }]}>{f.emdLabel}</Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>MIN TURNOVER</Text>
                <Text style={styles.cellValue}>{f.turnoverLabel}</Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.cellLabel}>DELIVERY</Text>
                <Text style={styles.cellValue}>{f.deliveryPeriodLabel}</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.viewDetailsText}>View Fundamentals (Zero-PDF) ➔</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Modal: Zero-PDF Bid Inspector */}
      <BidInspectorScreen
        bid={selectedBid}
        visible={!!selectedBid}
        onClose={() => setSelectedBid(null)}
        userProfile={userProfile}
      />
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
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    minHeight: 48,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  clearBtn: { padding: 6 },
  clearBtnText: { color: '#6B7280', fontSize: 14, fontWeight: '700' },
  sectionHeading: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  popularRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  popularItem: { alignItems: 'center', width: '23%' },
  popularBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  popularIcon: { fontSize: 20 },
  popularLabel: {
    color: '#374151',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultsCount: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bidCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  matchHigh: { backgroundColor: '#E8F5E9' },
  matchMod: { backgroundColor: '#FFF3E0' },
  matchPillText: { color: '#00C853', fontSize: 10, fontWeight: '800' },
  bidNumText: { color: '#6B7280', fontSize: 11, fontWeight: '600' },
  bidTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 4,
  },
  deptText: { color: '#6B7280', fontSize: 11, marginBottom: 12 },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  gridCell: { width: '48%' },
  cellLabel: { color: '#9CA3AF', fontSize: 9, fontWeight: '700', marginBottom: 2 },
  cellValue: { color: '#1F2937', fontSize: 12, fontWeight: '700' },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  viewDetailsText: { color: '#5F259F', fontSize: 12, fontWeight: '700' },
});
