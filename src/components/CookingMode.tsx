import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import {
  SPRING_CONFIG,
  TIMING_ENTER,
  TIMING_EXIT,
  TIMING_TOGGLE,
} from '@/theme/animations';
import { Recipe } from '@/stores/recipeStore';
import { useCookedStore } from '@/stores/cookedStore';
import PressableScale from './PressableScale';

const { height: SCREEN_H } = Dimensions.get('window');

interface CookingModeProps {
  recipe: Recipe;
  visible: boolean;
  onClose: () => void;
  onMarkAsCooked: () => void;
  onStepAdvanced?: (stepIndex: number) => void;
}

function parseTimerSeconds(stepText: string): number | null {
  // "Bake for 1 hour" / "2 hrs" / "90 minutes" / "5-10 min"
  const hourMatch = stepText.match(/(\d+)\s*(?:hours?|hrs?)\b/i);
  if (hourMatch) return parseInt(hourMatch[1], 10) * 3600;

  // Take the first number of an "N min" or "N-M min" pattern
  const minMatch = stepText.match(/(\d+)\s*(?:-\s*\d+\s*)?(?:min|minutes?)\b/i);
  if (minMatch) return parseInt(minMatch[1], 10) * 60;

  return null;
}

function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CookingMode({
  recipe,
  visible,
  onClose,
  onMarkAsCooked,
  onStepAdvanced,
}: CookingModeProps) {
  const insets = useSafeAreaInsets();

  // Keep the screen on while cooking mode is mounted
  useKeepAwake();

  const addCooked = useCookedStore((s) => s.addCooked);

  const translateY = useSharedValue(SCREEN_H);
  const progressSV = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);
  const [currentStep, setCurrentStep] = useState(0);

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [suggestedSeconds, setSuggestedSeconds] = useState<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Celebration (Mark as Cooked)
  const celebrateOpacity = useSharedValue(0);
  const celebrateScale = useSharedValue(0.95);

  const totalSteps = recipe.steps.length;
  const progress = totalSteps > 0 ? (currentStep + 1) / totalSteps : 0;

  // Drive the progress-bar shared value from step changes (never inside useAnimatedStyle)
  useEffect(() => {
    progressSV.value = withTiming(progress, TIMING_TOGGLE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  // Open/close animation
  useEffect(() => {
    if (visible) {
      setMounted(true);
      setCurrentStep(0);
      translateY.value = withSpring(0, SPRING_CONFIG);
    } else {
      translateY.value = withTiming(SCREEN_H, TIMING_EXIT, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // When step changes: clear timer + recompute suggestion
  useEffect(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setTimerRunning(false);
    setTimerSeconds(null);
    const step = recipe.steps[currentStep];
    setSuggestedSeconds(step ? parseTimerSeconds(step) : null);
  }, [currentStep, recipe.steps]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // Timer tick
  useEffect(() => {
    if (!timerRunning || timerSeconds === null) return;

    tickRef.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (tickRef.current) clearInterval(tickRef.current);
          tickRef.current = null;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
            () => {}
          );
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [timerRunning, timerSeconds]);

  const handlePrev = useCallback(() => {
    if (currentStep === 0) return;
    Haptics.selectionAsync().catch(() => {});
    setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const handleNext = useCallback(() => {
    if (currentStep >= totalSteps - 1) return;
    Haptics.selectionAsync().catch(() => {});
    const next = currentStep + 1;
    setCurrentStep(next);
    onStepAdvanced?.(next);
  }, [currentStep, totalSteps, onStepAdvanced]);

  const handleStartTimer = useCallback(() => {
    if (suggestedSeconds === null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    setTimerSeconds(suggestedSeconds);
    setTimerRunning(true);
  }, [suggestedSeconds]);

  const handleToggleTimer = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    setTimerRunning((r) => !r);
  }, []);

  const handleCancelTimer = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setTimerRunning(false);
    setTimerSeconds(null);
  }, []);

  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    };
  }, []);

  const handleFinish = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    addCooked(recipe);
    celebrateOpacity.value = withTiming(1, TIMING_ENTER);
    celebrateScale.value = withSequence(
      withTiming(1, TIMING_ENTER),
      withDelay(650, withTiming(1.02, { duration: 140 })),
      withTiming(1, { duration: 180 })
    );
    finishTimeoutRef.current = setTimeout(() => {
      onMarkAsCooked();
      celebrateOpacity.value = withTiming(0, TIMING_EXIT);
      celebrateScale.value = withTiming(0.95, TIMING_EXIT);
    }, 1400);
  }, [addCooked, recipe, celebrateOpacity, celebrateScale, onMarkAsCooked]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const celebrateStyle = useAnimatedStyle(() => ({
    opacity: celebrateOpacity.value,
    transform: [{ scale: celebrateScale.value }],
  }));

  const progressScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progressSV.value }],
  }));

  if (!mounted) return null;

  const step = recipe.steps[currentStep] ?? '';
  const isLast = currentStep === totalSteps - 1;
  const isFirst = currentStep === 0;
  const canSuggestTimer = suggestedSeconds !== null && timerSeconds === null;
  const timerActive = timerSeconds !== null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.panel, panelStyle]}
      // Block touches from reaching underlying screen
      pointerEvents="auto"
    >
      {/* ── Header: close + progress ────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <PressableScale
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityLabel="Close cooking mode"
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </PressableScale>
        <View style={styles.headerCenter}>
          <Text style={styles.stepCounter}>
            <Text style={styles.stepCounterNum}>{currentStep + 1}</Text>
            <Text style={styles.stepCounterSlash}> / </Text>
            <Text style={styles.stepCounterNum}>{totalSteps}</Text>
          </Text>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[styles.progressFill, progressScaleStyle]}
            />
          </View>
        </View>
        {/* Header right spacer to balance close button width */}
        <View style={styles.closeBtn} />
      </View>

      {/* ── Step body ───────────────────────────────────────────── */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepLabel}>STEP {currentStep + 1}</Text>
        <Text style={styles.stepText}>{step}</Text>

        {/* Timer suggestion */}
        {canSuggestTimer && suggestedSeconds !== null && (
          <PressableScale onPress={handleStartTimer} style={styles.timerSuggest}>
            <Ionicons name="timer-outline" size={18} color={colors.accent} />
            <Text style={styles.timerSuggestLabel}>
              Start {Math.round(suggestedSeconds / 60)}m timer
            </Text>
          </PressableScale>
        )}

        {/* Active timer */}
        {timerActive && (
          <View style={styles.timerPanel}>
            <Text style={styles.timerDigits}>{formatMMSS(timerSeconds ?? 0)}</Text>
            <View style={styles.timerControls}>
              <PressableScale
                onPress={handleToggleTimer}
                style={styles.timerCtrlBtn}
                disabled={timerSeconds === 0}
              >
                <Ionicons
                  name={timerRunning ? 'pause' : 'play'}
                  size={18}
                  color={timerSeconds === 0 ? colors.textDisabled : colors.text}
                />
                <Text
                  style={[
                    styles.timerCtrlLabel,
                    timerSeconds === 0 && { color: colors.textDisabled },
                  ]}
                >
                  {timerRunning ? 'Pause' : 'Resume'}
                </Text>
              </PressableScale>
              <PressableScale onPress={handleCancelTimer} style={styles.timerCtrlBtn}>
                <Ionicons name="close" size={18} color={colors.text} />
                <Text style={styles.timerCtrlLabel}>Cancel</Text>
              </PressableScale>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Footer controls ─────────────────────────────────────── */}
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.lg },
        ]}
      >
        <PressableScale
          onPress={handlePrev}
          disabled={isFirst}
          style={[styles.navBtn, isFirst && styles.navBtnDisabled]}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={isFirst ? colors.textDisabled : colors.text}
          />
          <Text
            style={[
              styles.navLabel,
              isFirst && { color: colors.textDisabled },
            ]}
          >
            Prev
          </Text>
        </PressableScale>

        {isLast ? (
          <PressableScale onPress={handleFinish} style={styles.finishBtn}>
            <Ionicons name="checkmark" size={20} color={colors.onAccent} />
            <Text style={styles.finishLabel}>Mark as Cooked</Text>
          </PressableScale>
        ) : (
          <PressableScale onPress={handleNext} style={styles.nextBtn}>
            <Text style={styles.nextLabel}>Next</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.onAccent} />
          </PressableScale>
        )}
      </View>

      {/* ── Celebration overlay ────────────────────────────────── */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.celebrate, celebrateStyle]}
      >
        <View style={styles.celebrateIcon}>
          <Ionicons name="checkmark" size={64} color={colors.onAccent} />
        </View>
        <Text style={styles.celebrateTitle}>Nice work</Text>
        <Text style={styles.celebrateBody}>Meal logged</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepCounter: {
    flexDirection: 'row',
  },
  stepCounterNum: {
    ...typography.monoSmall,
    color: colors.text,
    fontSize: 14,
  },
  stepCounterSlash: {
    ...typography.small,
    color: colors.textDisabled,
  },
  progressTrack: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.accent,
    transformOrigin: 'left center',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  stepLabel: {
    ...typography.label,
    color: colors.accent,
    marginBottom: spacing.md,
  },
  stepText: {
    fontSize: 26,
    lineHeight: 36,
    fontWeight: '500',
    color: colors.text,
    letterSpacing: -0.2,
  },
  timerSuggest: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.accentDim,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 100,
    marginTop: spacing.xl,
    minHeight: 44,
  },
  timerSuggestLabel: {
    ...typography.bodyMedium,
    color: colors.accent,
  },
  timerPanel: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  timerDigits: {
    fontSize: 72,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  timerControls: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timerCtrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 100,
    backgroundColor: colors.surfaceElevated,
    minHeight: 44,
  },
  timerCtrlLabel: {
    ...typography.smallMedium,
    color: colors.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 52,
    minWidth: 88,
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  navBtnDisabled: {
    opacity: 0.5,
  },
  navLabel: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.accent,
  },
  nextLabel: {
    ...typography.bodyMedium,
    color: colors.onAccent,
  },
  finishBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.accent,
  },
  finishLabel: {
    ...typography.bodyMedium,
    color: colors.onAccent,
  },
  celebrate: {
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  celebrateIcon: {
    width: 112,
    height: 112,
    borderRadius: 100,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrateTitle: {
    ...typography.title,
    color: colors.text,
  },
  celebrateBody: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

export { CookingMode };
