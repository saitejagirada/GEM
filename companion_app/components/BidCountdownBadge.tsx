import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CountdownService } from '../services/CountdownService';
import { PulsingBeacon } from './PulsingBeacon';

interface BidCountdownBadgeProps {
  closingTimeUtc?: string;
}

/**
 * Isolated leaf component that ticks every 1 second without triggering
 * re-renders on parent cards or screen feeds.
 */
export const BidCountdownBadge: React.FC<BidCountdownBadgeProps> = React.memo(({
  closingTimeUtc,
}) => {
  const [countdown, setCountdown] = useState(() =>
    CountdownService.calculateTimeRemaining(closingTimeUtc)
  );

  useEffect(() => {
    // Immediate sync
    setCountdown(CountdownService.calculateTimeRemaining(closingTimeUtc));

    const timer = setInterval(() => {
      setCountdown(CountdownService.calculateTimeRemaining(closingTimeUtc));
    }, 1000);

    return () => clearInterval(timer);
  }, [closingTimeUtc]);

  if (countdown.isExpired) {
    return (
      <View style={[styles.badge, styles.badgeExpired]}>
        <Text style={styles.textExpired}>Concluded</Text>
      </View>
    );
  }

  const badgeStyle = countdown.isCritical
    ? styles.badgeCritical
    : countdown.isUrgent
    ? styles.badgeUrgent
    : styles.badgeStandard;

  const textStyle = countdown.isCritical
    ? styles.textCritical
    : countdown.isUrgent
    ? styles.textUrgent
    : styles.textStandard;

  return (
    <View style={[styles.badge, badgeStyle]}>
      <PulsingBeacon
        variant={countdown.isCritical ? 'crimson' : countdown.isUrgent ? 'amber' : 'emerald'}
        size={6}
      />
      <Text style={[styles.timerText, textStyle]}>
        {countdown.formatted} {countdown.isCritical ? '🚨' : ''}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  timerText: {
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
  },
  badgeStandard: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  textStandard: {
    color: '#374151',
  },
  badgeUrgent: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  textUrgent: {
    color: '#B45309',
  },
  badgeCritical: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  textCritical: {
    color: '#DC2626',
  },
  badgeExpired: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  textExpired: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
  },
});
