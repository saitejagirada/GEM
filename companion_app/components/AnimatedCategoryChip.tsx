import React, { useRef, useEffect } from 'react';
import { Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';

interface AnimatedCategoryChipProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

/**
 * Tactile category chip with spring bounce when toggled.
 */
export const AnimatedCategoryChip: React.FC<AnimatedCategoryChipProps> = ({
  label,
  isActive,
  onPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.08, duration: 80, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1.0, friction: 5, useNativeDriver: true }),
      ]).start();
    }
  }, [isActive, scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.chip, isActive && styles.chipActive]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  chipTextActive: {
    color: '#F8FAFC',
    fontWeight: '800',
  },
});
