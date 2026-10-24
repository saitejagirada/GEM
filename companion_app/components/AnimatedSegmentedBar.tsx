import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';

export interface SegmentTabItem<T extends string> {
  key: T;
  label: string;
  icon: string;
  count?: number;
}

interface AnimatedSegmentedBarProps<T extends string> {
  tabs: SegmentTabItem<T>[];
  selectedKey: T;
  onSelect: (key: T) => void;
}

/**
 * Tactile animated segmented controller with spring press scaling (scale: 0.94)
 * and dynamic count badges.
 */
export const AnimatedSegmentedBar = <T extends string>({
  tabs,
  selectedKey,
  onSelect,
}: AnimatedSegmentedBarProps<T>) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {tabs.map((tab) => {
        const isActive = selectedKey === tab.key;
        return (
          <SegmentTabButton
            key={tab.key}
            tab={tab}
            isActive={isActive}
            onPress={() => onSelect(tab.key)}
          />
        );
      })}
    </ScrollView>
  );
};

interface SegmentTabButtonProps<T extends string> {
  tab: SegmentTabItem<T>;
  isActive: boolean;
  onPress: () => void;
}

const SegmentTabButton = <T extends string>({
  tab,
  isActive,
  onPress,
}: SegmentTabButtonProps<T>) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      speed: 20,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      speed: 16,
      bounciness: 6,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.tab, isActive && styles.tabActive]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.85}
      >
        <Text style={styles.tabIcon}>{tab.icon}</Text>
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
          {tab.label}
        </Text>
        {typeof tab.count === 'number' && (
          <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
            <Text style={[styles.countText, isActive && styles.countTextActive]}>
              {tab.count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  content: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#5F259F',
    borderColor: '#5F259F',
    shadowColor: '#5F259F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  tabIcon: {
    fontSize: 14,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4B5563',
  },
  countTextActive: {
    color: '#FFFFFF',
  },
});
