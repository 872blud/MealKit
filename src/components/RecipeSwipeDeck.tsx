import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import {
  TIMING_ENTER,
  TIMING_EXIT,
  SPRING_CONFIG,
  getStaggerDelay,
} from '@/theme/animations';
import { Recipe } from '@/stores/recipeStore';
import RecipeCard from './RecipeCard';
import PressableScale from './PressableScale';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_DISTANCE_THRESHOLD = SCREEN_W * 0.3;
const SWIPE_VELOCITY_THRESHOLD = 800;
const STACK_VISIBLE = 3;

interface Props {
  recipes: Recipe[];
  currentIndex: number;
  onIndexChange: (next: number) => void;
  onTapRecipe: (recipe: Recipe) => void;
  onSwipe?: (direction: 'left' | 'right', index: number) => void;
  onSurpriseMe: () => void;
}

/**
 * Swipeable recipe card stack. Renders top 3 cards with depth cues; only the
 * front card receives pan gestures. All animations driven by reanimated v4
 * useSharedValue + useAnimatedStyle — never the legacy Animated API.
 */
export default function RecipeSwipeDeck({
  recipes,
  currentIndex,
  onIndexChange,
  onTapRecipe,
  onSwipe,
  onSurpriseMe,
}: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const exiting = useSharedValue(0); // 0 idle, 1 exit triggered (locks cleanup)

  // Stagger-enter shared values (one set, keyed to mount)
  const s0 = useSharedValue(0);
  const s1 = useSharedValue(0);
  const s2 = useSharedValue(0);

  useEffect(() => {
    s0.value = withDelay(getStaggerDelay(0), withTiming(1, TIMING_ENTER));
    s1.value = withDelay(getStaggerDelay(1), withTiming(1, TIMING_ENTER));
    s2.value = withDelay(getStaggerDelay(2), withTiming(1, TIMING_ENTER));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset pan values whenever the top card changes (new top card fully centered)
  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    exiting.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const finalizeSwipe = (direction: 'left' | 'right') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSwipe?.(direction, currentIndex);
    onIndexChange(currentIndex + 1);
  };

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .failOffsetY([-24, 24])
        .onUpdate((e) => {
          'worklet';
          if (exiting.value === 1) return;
          translateX.value = e.translationX;
          translateY.value = e.translationY * 0.25;
        })
        .onEnd((e) => {
          'worklet';
          if (exiting.value === 1) return;
          const passedDistance = Math.abs(e.translationX) > SWIPE_DISTANCE_THRESHOLD;
          const passedVelocity = Math.abs(e.velocityX) > SWIPE_VELOCITY_THRESHOLD;
          if (passedDistance || passedVelocity) {
            exiting.value = 1;
            const dir: 'left' | 'right' = e.translationX > 0 ? 'right' : 'left';
            const targetX = (dir === 'right' ? 1 : -1) * SCREEN_W * 1.2;
            translateX.value = withTiming(targetX, TIMING_EXIT);
            translateY.value = withTiming(translateY.value, TIMING_EXIT, (finished) => {
              if (finished) {
                runOnJS(finalizeSwipe)(dir);
              }
            });
          } else {
            // Spring back to center
            translateX.value = withSpring(0, SPRING_CONFIG);
            translateY.value = withSpring(0, SPRING_CONFIG);
          }
        }),
    // finalizeSwipe intentionally omitted — the worklet captures the shared value,
    // and the callback reads the latest `currentIndex` via closure refresh on re-render.
    // We rebuild the gesture whenever currentIndex changes so runOnJS fires with fresh state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentIndex]
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .maxDistance(8)
        .onEnd((_e, success) => {
          'worklet';
          if (!success) return;
          const top = recipes[currentIndex];
          if (!top) return;
          runOnJS(onTapRecipe)(top);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentIndex, recipes]
  );

  const composed = useMemo(
    () => Gesture.Simultaneous(panGesture, tapGesture),
    [panGesture, tapGesture]
  );

  // Front-card animated style: drag translation + tilt + exit opacity
  const frontStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_W, 0, SCREEN_W],
      [-8, 0, 8],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, SCREEN_W * 1.1],
      [1, 0],
      Extrapolation.CLAMP
    );
    return {
      opacity: opacity * s0.value,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + (1 - s0.value) * 12 },
        { rotate: `${rotate}deg` },
        { scale: 0.95 + 0.05 * s0.value },
      ],
    };
  });

  // Second card behind: scales up toward front as front is dragged away
  const secondStyle = useAnimatedStyle(() => {
    const dragProgress = Math.min(Math.abs(translateX.value) / SCREEN_W, 1);
    const scale = 0.96 + 0.04 * dragProgress;
    const ty = 8 - 8 * dragProgress;
    const op = 0.7 + 0.3 * dragProgress;
    return {
      opacity: op * s1.value,
      transform: [
        { translateY: ty + (1 - s1.value) * 12 },
        { scale: scale * (0.95 + 0.05 * s1.value) },
      ],
    };
  });

  // Third card: moves to second position as front exits
  const thirdStyle = useAnimatedStyle(() => {
    const dragProgress = Math.min(Math.abs(translateX.value) / SCREEN_W, 1);
    const scale = 0.92 + 0.04 * dragProgress;
    const ty = 16 - 8 * dragProgress;
    const op = 0.4 + 0.3 * dragProgress;
    return {
      opacity: op * s2.value,
      transform: [
        { translateY: ty + (1 - s2.value) * 12 },
        { scale: scale * (0.95 + 0.05 * s2.value) },
      ],
    };
  });

  const visible: Array<{ kind: 'recipe'; recipe: Recipe } | { kind: 'surprise' }> = [];
  for (let i = 0; i < STACK_VISIBLE; i++) {
    const idx = currentIndex + i;
    if (idx < recipes.length) {
      visible.push({ kind: 'recipe', recipe: recipes[idx] });
    } else if (idx === recipes.length) {
      visible.push({ kind: 'surprise' });
    }
  }

  // Render back-to-front so the front card ends up on top (last in JSX = on top)
  return (
    <View style={styles.deck} pointerEvents="box-none">
      {visible
        .map((item, i) => ({ item, i }))
        .reverse()
        .map(({ item, i }) => {
          const style =
            i === 0 ? frontStyle : i === 1 ? secondStyle : thirdStyle;
          const key =
            item.kind === 'recipe' ? item.recipe.id : `surprise-${currentIndex + i}`;

          const cardEl =
            item.kind === 'recipe' ? (
              <RecipeCard recipe={item.recipe} />
            ) : (
              <SurpriseCard onPress={onSurpriseMe} />
            );

          if (i === 0) {
            return (
              <Animated.View key={key} style={[styles.cardWrap, style]}>
                <GestureDetector gesture={composed}>
                  <Animated.View>{cardEl}</Animated.View>
                </GestureDetector>
              </Animated.View>
            );
          }

          return (
            <Animated.View
              key={key}
              pointerEvents="none"
              style={[styles.cardWrap, style]}
            >
              {cardEl}
            </Animated.View>
          );
        })}
    </View>
  );
}

function SurpriseCard({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.surpriseCard}>
      <View style={styles.surpriseIconWrap}>
        <Ionicons name="sparkles-outline" size={36} color={colors.accent} />
      </View>
      <Text style={styles.surpriseTitle}>Surprise me</Text>
      <Text style={styles.surpriseBody}>
        Tap to shuffle a random pick from your deck.
      </Text>
      <PressableScale onPress={onPress} style={styles.surpriseAction}>
        <Text style={styles.surpriseActionLabel}>Shuffle</Text>
        <Ionicons
          name="shuffle-outline"
          size={16}
          color={colors.onAccent}
          style={{ marginLeft: spacing.xs }}
        />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  deck: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  cardWrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    top: spacing.md,
  },
  // Surprise-me card matches RecipeCard surface/radius so the swap feels continuous
  surpriseCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    minHeight: 320,
  },
  surpriseIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 100,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  surpriseTitle: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  surpriseBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 22,
  },
  surpriseAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 100,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    minHeight: 48,
    marginTop: spacing.sm,
  },
  surpriseActionLabel: {
    ...typography.bodyMedium,
    color: colors.onAccent,
  },
});

export { RecipeSwipeDeck };
