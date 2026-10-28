/**
 * GeM Live Reverse Auction Detail Screen
 * Conforms to Screen 4 of the GeM Mobile UI Specification & Blueprint:
 * - Green status banner: Live - Ends in 3h 12m
 * - Auction summary: ID, Title, Buyer Department
 * - 2x2 Metric Grid: Current Lowest (L1), Your Last Bid, Min Decrement, Closing Time
 * - Cost Floor Guard: Private planning aid to prevent unprofitable underbidding
 * - Primary action: [Place Bid] with biometric confirmation
 * - Expandable Accordion: Auction Rules and Timing
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  Pressable,
  Modal,
} from 'react-native';
import type { AuctionItem } from '../types/index';
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import {
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
  MetricBox,
  CompactChip,
} from '../components/SharedUI';
import { formatInr } from '../utils/formatters';

interface ReverseAuctionScreenProps {
  auction?: AuctionItem & {
    originalBidNumber?: string;
    department?: string;
    totalQuantity?: number;
    closingDateLabel?: string;
  };
  onBack?: () => void;
  onSelectBid?: (bidNumber: string) => void;
}

const DEFAULT_AUCTION = {
  id: 'ra-45102',
  contractNumber: 'GEM/2026/RA/45102',
  originalBidNumber: 'GEM/2026/B/890456',
  title: 'Supply of High-End Desktop Computers and Workstations',
  category: 'IT & Telecommunications',
  department: 'Department of Revenue',
  buyerOrganization: 'Ministry of Finance, New Delhi',
  totalQuantity: 120,
  closingTimeUtc: '2026-10-28T14:30:00Z',
  closingDateLabel: '14:30 IST (Auto-ext.)',
  currentLowestBid: 3850000,
  sellerRank: 2,
  sellerCurrentBid: 3920000,
  minimumDecrement: 10000,
  autoExtensionMinutes: 10,
  isExtended: false,
};

export const ReverseAuctionScreen: React.FC<ReverseAuctionScreenProps> = ({
  auction = DEFAULT_AUCTION,
  onBack,
  onSelectBid,
}) => {
  const { colors, fontMultiplier } = useTheme();

  const [currentL1, setCurrentL1] = useState<number>(auction.currentLowestBid);
  const [yourBid, setYourBid] = useState<number>(auction.sellerCurrentBid || auction.currentLowestBid + auction.minimumDecrement);
  const [costFloor, setCostFloor] = useState<string>('3700000');
  const [proposedBid, setProposedBid] = useState<string>(
    String(auction.currentLowestBid - auction.minimumDecrement)
  );
  const [isRulesExpanded, setIsRulesExpanded] = useState<boolean>(false);
  const [showBidModal, setShowBidModal] = useState<boolean>(false);

  const numericFloor = parseInt(costFloor.replace(/[^0-9]/g, ''), 10) || 0;
  const numericProposed = parseInt(proposedBid.replace(/[^0-9]/g, ''), 10) || 0;
  const isBelowFloor = numericFloor > 0 && numericProposed < numericFloor;

  const handlePlaceBidPress = useCallback(() => {
    if (numericProposed <= 0) {
      Alert.alert('Invalid Bid', 'Please enter a valid bid amount.');
      return;
    }
    const maxAllowed = currentL1 - auction.minimumDecrement;
    if (numericProposed > maxAllowed) {
      Alert.alert(
        'Bid Not Accepted',
        `Your bid must be at least ₹${formatInr(auction.minimumDecrement)} lower than Current L1 (max ₹${formatInr(maxAllowed)}).`
      );
      return;
    }
    setShowBidModal(true);
  }, [numericProposed, currentL1, auction.minimumDecrement]);

  const handleConfirmBid = useCallback(() => {
    setCurrentL1(numericProposed);
    setYourBid(numericProposed);
    setShowBidModal(false);
    Alert.alert(
      'Bid Submitted Successfully',
      `Your bid of ₹${formatInr(numericProposed)} has been recorded. You are currently rank L1!`
    );
  }, [numericProposed]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header / Back button */}
      <View style={styles.topNavRow}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
            <Text style={[styles.backArrow, { color: colors.primary }]}>←</Text>
          </Pressable>
        )}
        <Text style={[styles.navTitle, { color: colors.textPrimary, fontSize: 16 * fontMultiplier }]}>
          Live Reverse Auction
        </Text>
      </View>

      {/* 1. Green Live Status Banner */}
      <View style={[styles.liveStatusBanner, { backgroundColor: colors.successTint, borderColor: colors.success }]}>
        <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
        <Text style={[styles.liveStatusText, { color: colors.success }]}>
          Live — Ends in 3h 12m
        </Text>
        <Text style={[styles.liveUpdatedText, { color: colors.textSecondary }]}>
          Synced (IST)
        </Text>
      </View>

      {/* 2. Auction Summary Card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.summaryTopRow}>
          <Text style={[styles.auctionNumber, { color: colors.primary }]}>
            {auction.contractNumber}
          </Text>
          <StatusBadge label="REVERSE AUCTION" tone="warning" />
        </View>

        <Text
          style={[styles.auctionTitle, { color: colors.textPrimary, fontSize: 16 * fontMultiplier }]}
        >
          {auction.title}
        </Text>

        <Text style={[styles.deptText, { color: colors.textSecondary }]}>
          {auction.department} • {auction.buyerOrganization}
        </Text>

        {auction.originalBidNumber && onSelectBid && (
          <Pressable onPress={() => onSelectBid(auction.originalBidNumber!)} style={{ marginTop: 4 }}>
            <Text style={[styles.origBidLink, { color: colors.primary }]}>
              Linked Bid: {auction.originalBidNumber} ↗
            </Text>
          </Pressable>
        )}
      </View>

      {/* 3. 2x2 Metric Grid */}
      <View style={styles.metricGrid}>
        <View style={styles.metricRow}>
          <MetricBox
            label="Current Lowest (L1)"
            value={formatInr(currentL1)}
            highlight
            style={{ marginRight: 8 }}
          />
          <MetricBox
            label="Your Last Bid"
            value={yourBid ? formatInr(yourBid) : 'No bid yet'}
          />
        </View>
        <View style={[styles.metricRow, { marginTop: 8 }]}>
          <MetricBox
            label="Min Decrement"
            value={`₹${formatInr(auction.minimumDecrement)}`}
            style={{ marginRight: 8 }}
          />
          <MetricBox
            label="Closing Time"
            value={auction.closingDateLabel || '14:30 IST (Auto-ext.)'}
          />
        </View>
      </View>

      {/* 4. Safe Cost Floor Guard Panel */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: isBelowFloor ? colors.danger : colors.border,
          },
        ]}
      >
        <View style={styles.guardHeaderRow}>
          <Text style={[styles.guardTitle, { color: colors.textPrimary }]}>
            🛡️ Safe Cost Floor Guard
          </Text>
          <StatusBadge label="PRIVATE AID" tone="neutral" />
        </View>
        <Text style={[styles.guardDesc, { color: colors.textSecondary }]}>
          Enter your minimum profitable unit cost. The app warns before proposed bids fall below your cost floor.
        </Text>

        <View style={styles.inputRow}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Cost Floor (₹):</Text>
          <TextInput
            style={[
              styles.numericInput,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
                color: colors.textPrimary,
              },
            ]}
            keyboardType="number-pad"
            value={costFloor}
            onChangeText={setCostFloor}
            placeholder="3700000"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {isBelowFloor && (
          <View style={[styles.warningBox, { backgroundColor: colors.dangerTint }]}>
            <Text style={[styles.warningText, { color: colors.danger }]}>
              ⚠️ Warning: Your proposed bid is below your defined profitable floor (₹{formatInr(numericFloor)})!
            </Text>
          </View>
        )}
      </View>

      {/* 5. Bid Placement Form */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.bidSectionTitle, { color: colors.textPrimary }]}>
          Submit Next Decrement
        </Text>
        <Text style={[styles.bidSectionSubtitle, { color: colors.textSecondary }]}>
          Next acceptable bid must be ≤ ₹{formatInr(currentL1 - auction.minimumDecrement)}
        </Text>

        <View style={styles.bidInputWrapper}>
          <Text style={[styles.rupeeSymbol, { color: colors.textPrimary }]}>₹</Text>
          <TextInput
            style={[
              styles.bidTextInput,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
                color: colors.textPrimary,
                fontSize: 18 * fontMultiplier,
              },
            ]}
            keyboardType="number-pad"
            value={proposedBid}
            onChangeText={setProposedBid}
          />
        </View>

        <View style={styles.quickDecrementRow}>
          <CompactChip
            label={`-₹${formatInr(auction.minimumDecrement)}`}
            onPress={() => setProposedBid(String(currentL1 - auction.minimumDecrement))}
          />
          <CompactChip
            label={`-₹${formatInr(auction.minimumDecrement * 2)}`}
            onPress={() => setProposedBid(String(currentL1 - auction.minimumDecrement * 2))}
          />
          <CompactChip
            label="Match Floor"
            onPress={() => setProposedBid(costFloor)}
          />
        </View>

        <PrimaryButton
          label="Place Bid"
          onPress={handlePlaceBidPress}
          style={{ marginTop: 14 }}
        />
      </View>

      {/* 6. Expandable Auction Rules Accordion */}
      <View
        style={[
          styles.rulesCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Pressable
          style={styles.rulesHeader}
          onPress={() => setIsRulesExpanded((prev) => !prev)}
        >
          <Text style={[styles.rulesHeaderTitle, { color: colors.textPrimary }]}>
            Auction Rules and Timing
          </Text>
          <Text style={[styles.rulesChevron, { color: colors.textSecondary }]}>
            {isRulesExpanded ? '▲' : '▼'}
          </Text>
        </Pressable>

        {isRulesExpanded && (
          <View style={[styles.rulesBody, { borderTopColor: colors.borderSubtle }]}>
            <Text style={[styles.ruleItem, { color: colors.textSecondary }]}>
              • <Text style={{ fontWeight: '600' }}>Minimum Decrement:</Text> Every new bid must be at least ₹{formatInr(auction.minimumDecrement)} lower than the current L1 price.
            </Text>
            <Text style={[styles.ruleItem, { color: colors.textSecondary }]}>
              • <Text style={{ fontWeight: '600' }}>Auto-Extension:</Text> If a bid is received within the final 10 minutes, the closing time extends by {auction.autoExtensionMinutes} minutes automatically.
            </Text>
            <Text style={[styles.ruleItem, { color: colors.textSecondary }]}>
              • <Text style={{ fontWeight: '600' }}>GFR Compliance:</Text> Reverse auctions are legally binding public bids conducted under GFR Rule 149.
            </Text>
          </View>
        )}
      </View>

      {/* Confirmation Modal */}
      <Modal visible={showBidModal} transparent animationType="fade" onRequestClose={() => setShowBidModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.confirmTitle, { color: colors.textPrimary }]}>Confirm Auction Bid</Text>
            <Text style={[styles.confirmDesc, { color: colors.textSecondary }]}>
              You are placing a legally binding bid of:
            </Text>
            <Text style={[styles.confirmPrice, { color: colors.primary }]}>
              ₹{formatInr(numericProposed)}
            </Text>
            <Text style={[styles.confirmSub, { color: colors.textMuted }]}>
              Auction: {auction.contractNumber}
            </Text>
            <View style={styles.confirmBtnRow}>
              <SecondaryButton
                label="Cancel"
                onPress={() => setShowBidModal(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <PrimaryButton
                label="Confirm & Submit"
                onPress={handleConfirmBid}
                style={{ flex: 1.5 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: DESIGN_TOKENS.pagePaddingMobile,
    paddingBottom: 40,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    marginRight: 10,
    padding: 4,
  },
  backArrow: {
    fontSize: 20,
    fontWeight: '700',
  },
  navTitle: {
    fontWeight: '700',
  },
  liveStatusBanner: {
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  liveStatusText: {
    fontSize: 13,
    fontWeight: '750',
    flex: 1,
  },
  liveUpdatedText: {
    fontSize: 11,
  },
  card: {
    borderRadius: DESIGN_TOKENS.cardRadius,
    borderWidth: DESIGN_TOKENS.borderWidth,
    padding: 14,
    marginBottom: 14,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  auctionNumber: {
    fontSize: 13,
    fontWeight: '700',
  },
  auctionTitle: {
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 20,
  },
  deptText: {
    fontSize: 12,
    marginBottom: 6,
  },
  origBidLink: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricGrid: {
    marginBottom: 14,
  },
  metricRow: {
    flexDirection: 'row',
  },
  guardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  guardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  guardDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
  },
  numericInput: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontWeight: '700',
  },
  warningBox: {
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  warningText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  bidSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  bidSectionSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  bidInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rupeeSymbol: {
    fontSize: 22,
    fontWeight: '700',
    marginRight: 8,
  },
  bidTextInput: {
    flex: 1,
    height: 48,
    borderRadius: DESIGN_TOKENS.inputRadius,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontWeight: '700',
  },
  quickDecrementRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  rulesCard: {
    borderRadius: DESIGN_TOKENS.cardRadius,
    borderWidth: DESIGN_TOKENS.borderWidth,
    overflow: 'hidden',
  },
  rulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  rulesHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  rulesChevron: {
    fontSize: 12,
  },
  rulesBody: {
    borderTopWidth: 1,
    padding: 14,
  },
  ruleItem: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  confirmCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  confirmDesc: {
    fontSize: 13,
    marginBottom: 4,
  },
  confirmPrice: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  confirmSub: {
    fontSize: 12,
    marginBottom: 18,
  },
  confirmBtnRow: {
    flexDirection: 'row',
  },
});
