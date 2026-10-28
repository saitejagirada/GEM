import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme, DESIGN_TOKENS } from '../theme/ThemeContext';

// -----------------------------------------------------------------------------
// 1. SearchField
// -----------------------------------------------------------------------------
export interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  onSubmit?: () => void;
  accessibilityLabel?: string;
  style?: object;
}

export const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  onClear,
  onSubmit,
  accessibilityLabel = 'Search input',
  style,
}) => {
  const { colors, fontMultiplier } = useTheme();

  return (
    <View
      style={[
        styles.searchContainer,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Text style={[styles.searchIcon, { color: colors.textSecondary }]}>🔍</Text>
      <TextInput
        style={[
          styles.searchInput,
          {
            color: colors.textPrimary,
            fontSize: 14 * fontMultiplier,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        accessibilityLabel={accessibilityLabel}
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => {
            onChangeText('');
            if (onClear) onClear();
          }}
          hitSlop={8}
          accessibilityLabel="Clear search input"
          style={styles.clearBtn}
        >
          <Text style={[styles.clearBtnText, { color: colors.textMuted }]}>✕</Text>
        </Pressable>
      )}
    </View>
  );
};

// -----------------------------------------------------------------------------
// 2. SegmentedTabs
// -----------------------------------------------------------------------------
export interface SegmentedTabsProps {
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
  counts?: Record<string, number>;
  style?: object;
}

export const SegmentedTabs: React.FC<SegmentedTabsProps> = ({
  options,
  selected,
  onSelect,
  counts,
  style,
}) => {
  const { colors, fontMultiplier } = useTheme();

  return (
    <View
      style={[
        styles.segmentedBar,
        {
          backgroundColor: colors.surfaceSubtle,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const isSelected = selected === option;
        const count = counts?.[option];
        const label = count !== undefined ? `${option} (${count})` : option;

        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            delayPressIn={0}
            unstable_pressDelay={0}
            hitSlop={6}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.08)' }}
            style={({ pressed }) => [
              styles.segmentTab,
              pressed && { opacity: 0.8 },
              isSelected && [
                styles.segmentTabActive,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ],
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color: isSelected ? colors.primary : colors.textSecondary,
                  fontWeight: isSelected ? '700' : '500',
                  fontSize: 13 * fontMultiplier,
                },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

// -----------------------------------------------------------------------------
// 3. CompactChip
// -----------------------------------------------------------------------------
export interface CompactChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: string;
  style?: object;
}

export const CompactChip: React.FC<CompactChipProps> = ({
  label,
  selected = false,
  onPress,
  icon,
  style,
}) => {
  const { colors, fontMultiplier } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      delayPressIn={0}
      unstable_pressDelay={0}
      hitSlop={6}
      android_ripple={{ color: 'rgba(0, 0, 0, 0.06)', borderless: false }}
      style={({ pressed }) => [
        styles.chip,
        pressed && { opacity: 0.8 },
        {
          backgroundColor: selected ? colors.primaryTint : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
        style,
      ]}
    >
      {icon ? <Text style={styles.chipIcon}>{icon}</Text> : null}
      <Text
        style={[
          styles.chipText,
          {
            color: selected ? colors.primary : colors.textSecondary,
            fontWeight: selected ? '600' : '400',
            fontSize: 12 * fontMultiplier,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

// -----------------------------------------------------------------------------
// 4. StatusBadge
// -----------------------------------------------------------------------------
export type StatusBadgeTone = 'success' | 'warning' | 'danger' | 'violet' | 'orange' | 'neutral';

export interface StatusBadgeProps {
  label: string;
  tone?: StatusBadgeTone;
  dot?: boolean;
  style?: object;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  tone = 'neutral',
  dot = false,
  style,
}) => {
  const { colors } = useTheme();

  const getToneColors = (): { bg: string; text: string; dot: string } => {
    switch (tone) {
      case 'success':
        return { bg: colors.successTint, text: colors.success, dot: colors.success };
      case 'warning':
        return { bg: colors.warningTint, text: colors.warning, dot: colors.warning };
      case 'danger':
        return { bg: colors.dangerTint, text: colors.danger, dot: colors.danger };
      case 'violet':
        return { bg: colors.violetTint, text: colors.violet, dot: colors.violet };
      case 'orange':
        return { bg: colors.orangeTint, text: colors.orange, dot: colors.orange };
      case 'neutral':
      default:
        return { bg: colors.surfaceSubtle, text: colors.textSecondary, dot: colors.textMuted };
    }
  };

  const currentColors = getToneColors();

  return (
    <View style={[styles.badge, { backgroundColor: currentColors.bg }, style]}>
      {dot && <View style={[styles.badgeDot, { backgroundColor: currentColors.dot }]} />}
      <Text style={[styles.badgeText, { color: currentColors.text }]}>{label}</Text>
    </View>
  );
};

// -----------------------------------------------------------------------------
// 5. PrimaryButton & SecondaryButton
// -----------------------------------------------------------------------------
export interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  style?: object;
  textStyle?: object;
}

export const PrimaryButton: React.FC<ButtonProps> = ({
  label,
  onPress,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const { colors, fontMultiplier } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      delayPressIn={0}
      unstable_pressDelay={0}
      hitSlop={8}
      android_ripple={{ color: 'rgba(255, 255, 255, 0.25)', borderless: false }}
      style={({ pressed }) => [
        styles.primaryBtn,
        {
          backgroundColor: disabled ? colors.border : colors.primary,
          opacity: pressed && !disabled ? 0.85 : 1,
        },
        style,
      ]}
    >
      {icon ? <Text style={styles.btnIcon}>{icon}</Text> : null}
      <Text
        style={[
          styles.primaryBtnText,
          {
            color: disabled ? colors.textMuted : colors.textInverse,
            fontSize: 14 * fontMultiplier,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export const SecondaryButton: React.FC<ButtonProps> = ({
  label,
  onPress,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const { colors, fontMultiplier } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      delayPressIn={0}
      unstable_pressDelay={0}
      hitSlop={8}
      android_ripple={{ color: 'rgba(0, 0, 0, 0.08)', borderless: false }}
      style={({ pressed }) => [
        styles.secondaryBtn,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed && !disabled ? 0.85 : 1,
        },
        style,
      ]}
    >
      {icon ? <Text style={styles.btnIcon}>{icon}</Text> : null}
      <Text
        style={[
          styles.secondaryBtnText,
          {
            color: colors.primary,
            fontSize: 14 * fontMultiplier,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

// -----------------------------------------------------------------------------
// 6. MetricBox (2x2 Grid Cell)
// -----------------------------------------------------------------------------
export interface MetricBoxProps {
  label: string;
  value: string;
  highlight?: boolean;
  style?: object;
}

export const MetricBox: React.FC<MetricBoxProps> = ({
  label,
  value,
  highlight = false,
  style,
}) => {
  const { colors, fontMultiplier } = useTheme();

  return (
    <View
      style={[
        styles.metricBox,
        {
          backgroundColor: highlight ? colors.primaryTint : colors.surfaceSubtle,
          borderColor: highlight ? colors.primary : colors.border,
        },
        style,
      ]}
    >
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          {
            color: highlight ? colors.primary : colors.textPrimary,
            fontSize: 13 * fontMultiplier,
          },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
};

// -----------------------------------------------------------------------------
// 7. SectionHeader
// -----------------------------------------------------------------------------
export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: object;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  actionLabel,
  onAction,
  style,
}) => {
  const { colors, fontMultiplier } = useTheme();

  return (
    <View style={[styles.sectionHeaderRow, style]}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: colors.textPrimary,
            fontSize: 16 * fontMultiplier,
          },
        ]}
      >
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text
            style={[
              styles.sectionActionText,
              {
                color: colors.primary,
                fontSize: 13 * fontMultiplier,
              },
            ]}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
};

// -----------------------------------------------------------------------------
// 8. FilterBottomSheetModal
// -----------------------------------------------------------------------------
export interface FilterBottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  onReset?: () => void;
  onApply?: () => void;
  children: React.ReactNode;
}

export const FilterBottomSheetModal: React.FC<FilterBottomSheetModalProps> = ({
  visible,
  onClose,
  title = 'Filters',
  onReset,
  onApply,
  children,
}) => {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{title}</Text>
            {onReset && (
              <Pressable onPress={onReset} hitSlop={8}>
                <Text style={[styles.sheetResetText, { color: colors.textSecondary }]}>Reset</Text>
              </Pressable>
            )}
          </View>
          <ScrollView style={styles.sheetBody}>{children}</ScrollView>
          <View style={[styles.sheetFooter, { borderTopColor: colors.border }]}>
            <SecondaryButton label="Cancel" onPress={onClose} style={{ flex: 1, marginRight: 8 }} />
            <PrimaryButton
              label="Apply Filters"
              onPress={() => {
                if (onApply) onApply();
                onClose();
              }}
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  searchContainer: {
    height: 48,
    borderRadius: DESIGN_TOKENS.inputRadius,
    borderWidth: DESIGN_TOKENS.borderWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    padding: 0,
    margin: 0,
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  segmentedBar: {
    height: 40,
    borderRadius: DESIGN_TOKENS.inputRadius,
    borderWidth: DESIGN_TOKENS.borderWidth,
    flexDirection: 'row',
    padding: 3,
    alignItems: 'center',
  },
  segmentTab: {
    flex: 1,
    height: '100%',
    borderRadius: DESIGN_TOKENS.inputRadius - 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  segmentTabActive: {
    borderWidth: DESIGN_TOKENS.borderWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  segmentText: {
    textAlign: 'center',
  },
  chip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: DESIGN_TOKENS.chipRadius,
    borderWidth: DESIGN_TOKENS.borderWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  chipIcon: {
    fontSize: 13,
    marginRight: 4,
  },
  chipText: {},
  badge: {
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  primaryBtn: {
    minHeight: DESIGN_TOKENS.touchTargetMin,
    borderRadius: DESIGN_TOKENS.buttonRadius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryBtnText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryBtn: {
    minHeight: DESIGN_TOKENS.touchTargetMin,
    borderRadius: DESIGN_TOKENS.buttonRadius,
    borderWidth: DESIGN_TOKENS.borderWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryBtnText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  btnIcon: {
    marginRight: 6,
  },
  metricBox: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: DESIGN_TOKENS.borderWidth,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  metricValue: {
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  sectionActionText: {
    fontWeight: '600',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    maxHeight: '75%',
    paddingBottom: 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sheetResetText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sheetBody: {
    paddingHorizontal: 16,
    maxHeight: 350,
  },
  sheetFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
