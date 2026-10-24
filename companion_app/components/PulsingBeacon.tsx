import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';

export type BeaconVariant = 'emerald' | 'crimson' | 'amber' | 'purple';

interface PulsingBeaconProps {
  variant?: BeaconVariant;
  size?: number;
}

const COLOR_MAP: Record<BeaconVariant, { core: string; halo: string }> = {
  emerald: { core: '#059669', halo: 'rgba(16, 185, 129, 0.45)' },
  crimson: { core: '#DC2626', halo: 'rgba(239, 68, 68, 0.5)' },
  amber: { core: '#D97706', halo: 'rgba(245, 158, 11, 0.45)' },
  purple: { core: '#5F259F', halo: 'rgba(124, 58, 237, 0.45)' },
};

/**
 * Lightweight, native-driver dual-ring pulsing beacon.
 * Uses Animated.loop with useNativeDriver: true on scale and opacity.
 * Includes complete unmount cleanup to eliminate battery and memory leaks.
 */
export const PulsingBeacon: React.FC<PulsingBeaconProps> = React.memo(({
  variant = 'emerald',
  size = 10,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 2.5,
          duration: 1600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
      scaleAnim.setValue(1);
      opacityAnim.setValue(0.8);
    };
  }, [scaleAnim, opacityAnim]);

  const colors = COLOR_MAP[variant];
  const haloSize = size * 1.8;

  return (
    <View style={[styles.container, { width: haloSize, height: haloSize }]}>
      {/* Expanding halo ring */}
      <Animated.View
        style={[
          styles.halo,
          {
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize / 2,
            backgroundColor: colors.halo,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      />
      {/* Central steady core */}
      <View
        style={[
          styles.core,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.core,
          },
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  halo: {
    position: 'absolute',
  },
  core: {
    zIndex: 2,
    elevation: 2,
  },
});
