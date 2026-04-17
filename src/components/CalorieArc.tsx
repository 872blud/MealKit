import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { TIMING_ENTER } from '@/theme/animations';

interface CalorieArcProps {
  progress: number;
  size?: number;
  children?: React.ReactNode;
  overBudget?: boolean;
}

const TICK_COUNT = 48;
const TICK_WIDTH = 3;
const TICK_HEIGHT = 14;

export default function CalorieArc({
  progress,
  size = 240,
  children,
  overBudget = false,
}: CalorieArcProps) {
  const p = useSharedValue(0);
  const over = useSharedValue(overBudget ? 1 : 0);

  useEffect(() => {
    p.value = withTiming(Math.max(0, Math.min(1, progress)), TIMING_ENTER);
  }, [progress, p]);

  useEffect(() => {
    over.value = withTiming(overBudget ? 1 : 0, TIMING_ENTER);
  }, [overBudget, over]);

  const radius = size / 2 - TICK_HEIGHT / 2 - 2;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {Array.from({ length: TICK_COUNT }).map((_, i) => {
        const angleDeg = (i / TICK_COUNT) * 360 - 90;
        const threshold = i / TICK_COUNT;
        const x = Math.cos((angleDeg * Math.PI) / 180) * radius;
        const y = Math.sin((angleDeg * Math.PI) / 180) * radius;
        return (
          <Tick
            key={i}
            sv={p}
            over={over}
            threshold={threshold}
            x={x}
            y={y}
            rotateDeg={angleDeg + 90}
          />
        );
      })}
      <View style={styles.center}>{children}</View>
    </View>
  );
}

function Tick({
  sv,
  over,
  threshold,
  x,
  y,
  rotateDeg,
}: {
  sv: SharedValue<number>;
  over: SharedValue<number>;
  threshold: number;
  x: number;
  y: number;
  rotateDeg: number;
}) {
  const style = useAnimatedStyle(() => {
    const opacity = interpolate(
      sv.value,
      [threshold - 0.006, threshold + 0.006],
      [0.18, 1],
      'clamp',
    );
    const fill = interpolateColor(
      over.value,
      [0, 1],
      [colors.accent, colors.error],
    );
    return {
      opacity,
      backgroundColor: fill,
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${rotateDeg}deg` },
      ],
    };
  });

  return <Animated.View style={[styles.tick, style]} />;
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    position: 'absolute',
    width: TICK_WIDTH,
    height: TICK_HEIGHT,
    borderRadius: TICK_WIDTH / 2,
  },
});

export { CalorieArc };
