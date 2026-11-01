/**
 * Public reverse-auction detail.
 *
 * This screen intentionally stays read-only. The public GeM feed does not
 * provide seller rank, L1, quoted price, or bid history, so those values are
 * never simulated here.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Pressable,
} from 'react-native';
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';
import { StatusBadge, PrimaryButton, SecondaryButton } from '../components/SharedUI';

export interface PublicReverseAuctionRecord {
  id: string;
  contractNumber: string;
  title: string;
  category: string;
  buyerOrganization: string;
  closingTimeUtc: string;
  originalBidNumber?: string;
  department?: string;
  totalQuantity?: number;
  closingDateLabel?: string;
  docUrl: string;
  publishedQuantity: boolean;
}

interface ReverseAuctionScreenProps {
  auction: PublicReverseAuctionRecord;
  onBack?: () => void;
}

const formatClosingTime = (closingTimeUtc: string): string => {
  const date = new Date(closingTimeUtc);
  if (Number.isNaN(date.getTime())) return 'Not published';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
};

export const ReverseAuctionScreen: React.FC<ReverseAuctionScreenProps> = ({ auction, onBack }) => {
  const { colors, fontMultiplier } = useTheme();

  const openOfficial = () => {
    Linking.openURL(auction.docUrl).catch(() => {
      Linking.openURL('https://bidplus-global.gem.gov.in/').catch(() => undefined);
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topNavRow}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
            <Text style={[styles.backArrow, { color: colors.primary }]}>←</Text>
          </Pressable>
        )}
        <Text style={[styles.navTitle, { color: colors.textPrimary, fontSize: 16 * fontMultiplier }]}>Public reverse auction</Text>
      </View>

      <View style={[styles.liveStatusBanner, { backgroundColor: colors.successTint, borderColor: colors.success }]}>
        <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
        <Text style={[styles.liveStatusText, { color: colors.success }]}>LIVE PUBLIC RECORD</Text>
        <Text style={[styles.liveUpdatedText, { color: colors.textSecondary }]}>GeM feed</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.summaryTopRow}>
          <Text style={[styles.auctionNumber, { color: colors.primary }]}>{auction.contractNumber}</Text>
          <StatusBadge label="REVERSE AUCTION" tone="warning" />
        </View>
        <Text style={[styles.auctionTitle, { color: colors.textPrimary, fontSize: 16 * fontMultiplier }]}>{auction.title}</Text>
        <Text style={[styles.deptText, { color: colors.textSecondary }]}>{auction.department} • {auction.buyerOrganization}</Text>
        {auction.originalBidNumber && (
          <Text style={[styles.origBidLink, { color: colors.textSecondary }]}>Public bid record: {auction.originalBidNumber}</Text>
        )}
      </View>

      <View style={styles.metricGrid}>
        <View style={styles.metricRow}>
          <MetricCard label="Closing time" value={formatClosingTime(auction.closingTimeUtc)} colors={colors} />
          <MetricCard label="Quantity" value={auction.publishedQuantity && auction.totalQuantity !== undefined ? auction.totalQuantity.toLocaleString() : 'Not published'} colors={colors} />
        </View>
        <View style={[styles.metricRow, { marginTop: 8 }]}>
          <MetricCard label="Category" value={auction.category} colors={colors} />
          <MetricCard label="Source" value="GeM public feed" colors={colors} />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>What this app can show</Text>
        <Text style={[styles.bodyText, { color: colors.textSecondary }]}>This is a live public listing. Current L1 price, your quote, seller rank, previous bids, and account-specific participation are not published in this feed.</Text>
        <View style={[styles.noteBox, { backgroundColor: colors.surfaceSubtle }]}>
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>Use the official GeM session after login for authenticated bidding and live account tracking. This app does not submit bids or claim a bid was placed.</Text>
        </View>
      </View>

      <PrimaryButton label="Open official bid document ↗" onPress={openOfficial} style={{ marginBottom: 10 }} />
      <SecondaryButton label="Open GeM login ↗" onPress={() => Linking.openURL('https://ui.gem.gov.in/login')} />
    </ScrollView>
  );
};

const MetricCard: React.FC<{ label: string; value: string; colors: ReturnType<typeof useTheme>['colors'] }> = ({ label, value, colors }) => (
  <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label.toUpperCase()}</Text>
    <Text style={[styles.metricValue, { color: colors.textPrimary }]} numberOfLines={3}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: DESIGN_TOKENS.pagePaddingMobile, paddingBottom: 40 },
  topNavRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backBtn: { marginRight: 10, padding: 4 },
  backArrow: { fontSize: 20, fontWeight: '700' },
  navTitle: { fontWeight: '700' },
  liveStatusBanner: { borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  liveStatusText: { fontSize: 13, fontWeight: '750', flex: 1 },
  liveUpdatedText: { fontSize: 11 },
  card: { borderRadius: DESIGN_TOKENS.cardRadius, borderWidth: DESIGN_TOKENS.borderWidth, padding: 14, marginBottom: 14 },
  summaryTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  auctionNumber: { fontSize: 13, fontWeight: '700' },
  auctionTitle: { fontWeight: '700', marginBottom: 4, lineHeight: 20 },
  deptText: { fontSize: 12, marginBottom: 6 },
  origBidLink: { fontSize: 12, fontWeight: '600' },
  metricGrid: { marginBottom: 14 },
  metricRow: { flexDirection: 'row' },
  metricCard: { flex: 1, minHeight: 74, borderRadius: 10, borderWidth: 1, padding: 10, marginHorizontal: 4 },
  metricLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4, marginBottom: 5 },
  metricValue: { fontSize: 12, fontWeight: '700', lineHeight: 17 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  bodyText: { fontSize: 13, lineHeight: 19 },
  noteBox: { borderRadius: 8, padding: 10, marginTop: 12 },
  noteText: { fontSize: 12, lineHeight: 17 },
});
