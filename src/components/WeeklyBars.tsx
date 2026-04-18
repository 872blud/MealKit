import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { TIMING_ENTER, getStaggerDelay } from '@/theme/animations';
import { getLocalDateKey } from '@/utils/date';

interface WeekDay {
  date: string;
  calories: number;
}

interface WeeklyBarsProps {
  days: WeekDay[];
  calorieTarget: number;
  height?: number;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function WeeklyBars({
  days,
  calorieTarget,
  height = 160,
}: WeeklyBarsProps) {
  const maxVal = Math.max(calorieTarget, ...days.map((d) => d.calories), 1);

  return (
    <View style={[styles.wrap, { height: height + 28 }]}>
      <View style={[styles.row, { height }]}>
        {days.map((d, i) => (
          <DayBar
            key={d.date}
            index={i}
            date={d.date}
            calories={d.calories}
            target={calorieTarget}
            maxVal={maxVal}
            height={height}
          />
        ))}
      </View>
      <View style={styles.labelRow}>
        {days.map((d, i) => {
          const weekday = new Date(d.date + 'T00:00:00').getDay();
          return (
            <Text key={d.date} style={styles.dayLabel}>
              {DAY_LABELS[weekday]}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

function DayBar({
  index,
  date,
  calories,
  target,
  maxVal,
  height,
}: {
  index: number;
  date: string;
  calories: number;
  target: number;
  maxVal: number;
  height: number;
}) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = getStaggerDelay(index);
    opacity.value = withDelay(delay, withTiming(1, TIMING_ENTER));
    progress.value = withDelay(
      delay,
      withTiming(calories / maxVal, TIMING_ENTER),
    );
  }, [calories, maxVal, index, progress, opacity]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: progress.value }],
    opacity: opacity.value,
  }));

  const isToday = date === getLocalDateKey();
  const over = target > 0 && calories > target;
  const fg = over ? colors.error : isToday ? colors.accent : colors.accent;
  const bg = isToday ? colors.accentDim : colors.surface;

  const targetLine = target > 0 ? (target / maxVal) * height : 0;

  return (
    <View style={styles.barCol}>
      <View style={[styles.barTrack, { height, backgroundColor: bg }]}>
        {target > 0 && (
          <View
            style={[
              styles.targetLine,
              { bottom: targetLine, borderBottomColor: colors.borderStrong },
            ]}
          />
        )}
        <Animated.View
          style={[
            styles.barFill,
            { backgroundColor: fg },
            fillStyle,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  barCol: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 8,
    transformOrigin: '50% 100%',
  },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  labelRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  dayLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'center',
  },
});

export { WeeklyBars };
