/**
 * TouchButton - High-Performance Zero-Latency Interactive Button
 * Eliminates touch lag using React Native Pressable with native ripple,
 * instantaneous visual feedback, and generous hitSlop.
 */

import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  GestureResponderEvent,
} from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'saffron' | 'emerald' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface TouchButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  hitSlopPadding?: number;
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  disabled = false,
  style,
  textStyle,
  hitSlopPadding = 8,
}) => {
  const getVariantStyle = (pressed: boolean): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: pressed ? '#07243B' : '#0B3B60',
          borderColor: '#0B3B60',
        };
      case 'saffron':
        return {
          backgroundColor: pressed ? '#E08320' : '#FF9933',
          borderColor: '#FF9933',
        };
      case 'emerald':
        return {
          backgroundColor: pressed ? '#0E6806' : '#138808',
          borderColor: '#138808',
        };
      case 'danger':
        return {
          backgroundColor: pressed ? '#B91C1C' : '#DC2626',
          borderColor: '#DC2626',
        };
      case 'secondary':
        return {
          backgroundColor: pressed ? '#E2E8F0' : '#F1F5F9',
          borderColor: '#CBD5E1',
        };
      case 'outline':
        return {
          backgroundColor: pressed ? 'rgba(11, 59, 96, 0.08)' : 'transparent',
          borderColor: '#0B3B60',
          borderWidth: 1.5,
        };
      case 'ghost':
        return {
          backgroundColor: pressed ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
          borderColor: 'transparent',
        };
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'primary':
      case 'saffron':
      case 'emerald':
      case 'danger':
        return '#FFFFFF';
      case 'secondary':
        return '#0F172A';
      case 'outline':
        return '#0B3B60';
      case 'ghost':
        return '#0B3B60';
    }
  };

  const getSizeStyle = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'small':
        return {
          container: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
          text: { fontSize: 12, fontWeight: '700' },
        };
      case 'large':
        return {
          container: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12 },
          text: { fontSize: 16, fontWeight: '800' },
        };
      case 'medium':
      default:
        return {
          container: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
          text: { fontSize: 14, fontWeight: '700' },
        };
    }
  };

  const sizeStyles = getSizeStyle();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      delayPressIn={0}
      unstable_pressDelay={0}
      hitSlop={{
        top: hitSlopPadding,
        bottom: hitSlopPadding,
        left: hitSlopPadding,
        right: hitSlopPadding,
      }}
      android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
      style={({ pressed }) => [
        styles.base,
        sizeStyles.container,
        getVariantStyle(pressed),
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.baseText,
          sizeStyles.text,
          { color: getTextColor() },
          disabled && styles.disabledText,
          textStyle,
        ]}
      >
        {icon ? `${icon} ` : ''}
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  baseText: {
    textAlign: 'center',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#94A3B8',
  },
});
