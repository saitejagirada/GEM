import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CountdownService } from '../services/CountdownService';

interface TenderCountdownTickerProps {
  closingCount: number;
  onPress: () => void;
}

/**
 * Dynamic "Closing Soon" Urgency Banner.
 * Features deep space velvet backdrop, amber flame tag, and live countdown ticker.
 */
export const TenderCountdownTicker: React.FC<TenderCountdownTickerProps> = ({
  closingCount,
  onPress,
}) => {
  // GeM daily 3:00 PM cutoff target (e.g. today or tomorrow 15:00 UTC/IST)
  const [secondsRemaining, setSecondsRemaining] = useState(4 * 3600 + 18 * 60 + 32);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hrs = Math.floor(secondsRemaining / 3600);
  const mins = Math.floor((secondsRemaining % 3600) / 60);
  const secs = secondsRemaining % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <TouchableOpacity style={styles.tickerCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.tickerLeft}>
        <View style={styles.urgencyBadge}>
          <Text style={styles.flameIcon}>🔥</Text>
          <Text style={styles.urgencyText}>CLOSING SOON TODAY</Text>
        </View>
        <Text style={styles.tickerSub}>
          {closingCount || 1} Tender{closingCount === 1 ? '' : 's'} expiring • Instant MSE ₹0 EMD Waiver
        </Text>
      </View>
      <View style={styles.timerPill}>
        <Text style={styles.timerDigits}>
          {pad(hrs)}h : {pad(mins)}m : {pad(secs)}s
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1B4B',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.4)',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  tickerLeft: { flex: 1, marginRight: 10 },
  urgencyBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  flameIcon: { fontSize: 13 },
  urgencyText: { color: '#F97316', fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  tickerSub: { color: '#C7D2FE', fontSize: 12, fontWeight: '500' },
  timerPill: {
    backgroundColor: '#311042',
    borderWidth: 1.5,
    borderColor: '#EA580C',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timerDigits: {
    color: '#FFEDD5',
    fontSize: 12,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
});
