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
import { DESIGN_TOKENS, useTheme } from '../theme/ThemeContext';

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
  const { colors } = useTheme();

  const getVariantStyle = (pressed: boolean): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: pressed ? colors.primaryDark : colors.primary,
          borderColor: colors.primary,
        };
      case 'saffron':
        return {
          backgroundColor: pressed ? '#D97706' : colors.saffron,
          borderColor: colors.saffron,
        };
      case 'emerald':
        return {
          backgroundColor: pressed ? '#0E6806' : colors.emerald,
          borderColor: colors.emerald,
        };
      case 'danger':
        return {
          backgroundColor: pressed ? '#B91C1C' : colors.crimson,
          borderColor: colors.crimson,
        };
      case 'secondary':
        return {
          backgroundColor: pressed ? colors.border : colors.surfaceSubtle,
          borderColor: colors.border,
        };
      case 'outline':
        return {
          backgroundColor: pressed ? `${colors.primary}18` : 'transparent',
          borderColor: colors.primary,
          borderWidth: 1.5,
        };
      case 'ghost':
        return {
          backgroundColor: pressed ? `${colors.primary}12` : 'transparent',
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
        return variant === 'primary' && colors.textInverse !== '#FFFFFF' ? colors.textInverse : '#FFFFFF';
      case 'secondary':
        return colors.textPrimary;
      case 'outline':
        return colors.primary;
      case 'ghost':
        return colors.primary;
    }
  };

  const getSizeStyle = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'small':
        return {
          container: {
            minHeight: DESIGN_TOKENS.controlHeight.small,
            paddingVertical: 7,
            paddingHorizontal: 12,
            borderRadius: DESIGN_TOKENS.radius.sm,
          },
          text: { fontSize: 12, fontWeight: '700' },
        };
      case 'large':
        return {
          container: {
            minHeight: DESIGN_TOKENS.controlHeight.large,
            paddingVertical: 14,
            paddingHorizontal: 20,
            borderRadius: DESIGN_TOKENS.radius.md,
          },
          text: { fontSize: 16, fontWeight: '800' },
        };
      case 'medium':
      default:
        return {
          container: {
            minHeight: DESIGN_TOKENS.controlHeight.medium,
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: DESIGN_TOKENS.radius.sm + 2,
          },
          text: { fontSize: 14, fontWeight: '700' },
        };
    }
  };

  const sizeStyles = getSizeStyle();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
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
