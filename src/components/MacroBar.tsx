import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { TIMING_ENTER } from '@/theme/animations';

type MacroKind = 'protein' | 'carbs' | 'fat' | 'fiber';

interface MacroBarProps {
  kind: MacroKind;
  label: string;
  current: number;
  target: number;
  unit?: string;
}

const MACRO_COLORS: Record<MacroKind, { fg: string; bg: string }> = {
  protein: { fg: colors.protein, bg: colors.proteinDim },
  carbs:   { fg: colors.carb,    bg: colors.carbDim    },
  fat:     { fg: colors.fat,     bg: colors.fatDim     },
  fiber:   { fg: colors.fiber,   bg: colors.fiberDim   },
};

export default function MacroBar({
  kind,
  label,
  current,
  target,
  unit = 'g',
}: MacroBarProps) {
  const palette = MACRO_COLORS[kind];
  const rawProgress = target > 0 ? current / target : 0;
  const progress = Math.max(0, Math.min(1, rawProgress));
  const over = rawProgress > 1;

  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(progress, TIMING_ENTER);
  }, [progress, fill]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: fill.value }],
  }));

  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
        <Text style={[styles.value, over && styles.over]}>
          <Text style={styles.valueNum}>{Math.round(current)}</Text>
          <Text style={styles.valueTarget}>
            {' '}/ {Math.round(target)}{unit}
          </Text>
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: palette.bg }]}>
        <Animated.View
          style={[styles.fill, { backgroundColor: palette.fg }, fillStyle]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.smallMedium,
  },
  value: {
    ...typography.monoSmall,
    color: colors.textSecondary,
  },
  valueNum: {
    color: colors.text,
  },
  valueTarget: {
    color: colors.textSecondary,
  },
  over: {
    color: colors.error,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    borderRadius: 4,
    transformOrigin: '0% 50%',
  },
});

export { MacroBar };
