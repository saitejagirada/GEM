import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface DataNoticeProps {
  children?: React.ReactNode;
}

/**
 * A consistent boundary between the companion app and official portal data.
 * The app can show local fixtures or synced records, but it must not imply
 * that either source is authoritative without an official portal check.
 */
export const DataNotice: React.FC<DataNoticeProps> = ({
  children = 'Public discovery view · Records may be sample or synced. Verify current status on the official portal before acting.',
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
      <View style={[styles.marker, { backgroundColor: colors.saffron }]} />
      <Text style={[styles.label, { color: colors.textMuted }]}>DATA SCOPE</Text>
      <Text style={[styles.copy, { color: colors.textSecondary }]}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  marker: { width: 4, height: 18, borderRadius: 2 },
  label: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  copy: { flex: 1, fontSize: 10.5, lineHeight: 14 },
});
