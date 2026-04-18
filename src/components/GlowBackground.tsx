import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/colors';

type GlowColor = 'green' | 'amber' | 'blue';

interface GlowBackgroundProps {
  primary?: GlowColor;
  secondary?: GlowColor | null;
}

const GLOW_MAP: Record<GlowColor, [string, string, string]> = {
  green: [colors.glowGreen, colors.glowGreenMid, colors.transparent],
  amber: [colors.glowAmber, colors.glowAmberMid, colors.transparent],
  blue:  [colors.glowBlue,  colors.glowBlueMid,  colors.transparent],
};

export default function GlowBackground({
  primary = 'green',
  secondary = 'amber',
}: GlowBackgroundProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={GLOW_MAP[primary]}
        style={styles.primaryBlob}
      />
      {secondary && (
        <LinearGradient
          colors={GLOW_MAP[secondary]}
          style={styles.secondaryBlob}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  primaryBlob: {
    position: 'absolute',
    top: -100,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  secondaryBlob: {
    position: 'absolute',
    top: 40,
    right: -100,
    width: 240,
    height: 240,
    borderRadius: 120,
  },
});
