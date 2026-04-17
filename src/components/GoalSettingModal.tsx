import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { SPRING_CONFIG, TIMING_EXIT } from '@/theme/animations';
import { useUserStore, UserPreferences } from '@/stores/userStore';
import PressableScale from '@/components/PressableScale';

interface GoalSettingModalProps {
  visible: boolean;
  onClose: () => void;
}

type Targets = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

const CAL_MIN = 1000;
const CAL_MAX = 5000;
const CAL_STEP = 50;

const MACRO_MIN = 0;
const MACRO_MAX = 500;
const MACRO_STEP = 5;

export default function GoalSettingModal({
  visible,
  onClose,
}: GoalSettingModalProps) {
  const { preferences, updatePreferences } = useUserStore();
  const insets = useSafeAreaInsets();

  const [draft, setDraft] = useState<Targets>({
    calories: preferences.dailyCalorieTarget,
    protein: preferences.dailyMacroTargets.protein,
    carbs: preferences.dailyMacroTargets.carbs,
    fat: preferences.dailyMacroTargets.fat,
    fiber: preferences.dailyMacroTargets.fiber,
  });

  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(600);
  const scrimOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setDraft({
        calories: preferences.dailyCalorieTarget,
        protein: preferences.dailyMacroTargets.protein,
        carbs: preferences.dailyMacroTargets.carbs,
        fat: preferences.dailyMacroTargets.fat,
        fiber: preferences.dailyMacroTargets.fiber,
      });
      translateY.value = withSpring(0, SPRING_CONFIG);
      scrimOpacity.value = withSpring(1, SPRING_CONFIG);
    } else if (mounted) {
      scrimOpacity.value = withTiming(0, TIMING_EXIT);
      translateY.value = withTiming(600, TIMING_EXIT, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: scrimOpacity.value,
  }));

  const handleSave = () => {
    const nextPrefs: Partial<UserPreferences> = {
      dailyCalorieTarget: draft.calories,
      dailyMacroTargets: {
        protein: draft.protein,
        carbs: draft.carbs,
        fat: draft.fat,
        fiber: draft.fiber,
      },
    };
    updatePreferences(nextPrefs);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.scrim, scrimStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.md) },
            sheetStyle,
          ]}
        >
          <View style={styles.grabberWrap}>
            <View style={styles.grabber} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Daily goals</Text>
            <Text style={styles.subtitle}>
              Tune your calorie + macro targets
            </Text>
          </View>

          <View style={styles.content}>
            <Stepper
              label="Calories"
              unit="kcal"
              value={draft.calories}
              step={CAL_STEP}
              min={CAL_MIN}
              max={CAL_MAX}
              onChange={(v) => setDraft((d) => ({ ...d, calories: v }))}
              accent={colors.text}
            />
            <Stepper
              label="Protein"
              unit="g"
              value={draft.protein}
              step={MACRO_STEP}
              min={MACRO_MIN}
              max={MACRO_MAX}
              onChange={(v) => setDraft((d) => ({ ...d, protein: v }))}
              accent={colors.protein}
            />
            <Stepper
              label="Carbs"
              unit="g"
              value={draft.carbs}
              step={MACRO_STEP}
              min={MACRO_MIN}
              max={MACRO_MAX}
              onChange={(v) => setDraft((d) => ({ ...d, carbs: v }))}
              accent={colors.carb}
            />
            <Stepper
              label="Fat"
              unit="g"
              value={draft.fat}
              step={MACRO_STEP}
              min={MACRO_MIN}
              max={MACRO_MAX}
              onChange={(v) => setDraft((d) => ({ ...d, fat: v }))}
              accent={colors.fat}
            />
            <Stepper
              label="Fiber"
              unit="g"
              value={draft.fiber}
              step={MACRO_STEP}
              min={MACRO_MIN}
              max={MACRO_MAX}
              onChange={(v) => setDraft((d) => ({ ...d, fiber: v }))}
              accent={colors.fiber}
            />
          </View>

          <PressableScale onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveText}>Save goals</Text>
          </PressableScale>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Stepper({
  label,
  unit,
  value,
  step,
  min,
  max,
  onChange,
  accent,
}: {
  label: string;
  unit: string;
  value: number;
  step: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  accent: string;
}) {
  const dec = () => {
    if (value <= min) return;
    Haptics.selectionAsync();
    onChange(Math.max(min, value - step));
  };
  const inc = () => {
    if (value >= max) return;
    Haptics.selectionAsync();
    onChange(Math.min(max, value + step));
  };

  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View style={stepperStyles.row}>
      <Text style={[stepperStyles.label, { color: accent }]}>{label}</Text>
      <View style={stepperStyles.controls}>
        <PressableScale
          onPress={dec}
          disabled={atMin}
          style={[stepperStyles.btn, atMin && stepperStyles.btnDisabled]}
          accessibilityLabel={`Decrease ${label}`}
        >
          <Ionicons
            name="remove"
            size={18}
            color={atMin ? colors.textDisabled : colors.text}
          />
        </PressableScale>
        <View style={stepperStyles.valueWrap}>
          <Text style={stepperStyles.value}>
            {value}
            <Text style={stepperStyles.unit}> {unit}</Text>
          </Text>
        </View>
        <PressableScale
          onPress={inc}
          disabled={atMax}
          style={[stepperStyles.btn, atMax && stepperStyles.btnDisabled]}
          accessibilityLabel={`Increase ${label}`}
        >
          <Ionicons
            name="add"
            size={18}
            color={atMax ? colors.textDisabled : colors.text}
          />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  grabberWrap: {
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  header: {
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    ...typography.bodyMedium,
    color: colors.onAccent,
  },
});

const stepperStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  label: {
    ...typography.bodyMedium,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  valueWrap: {
    minWidth: 72,
    alignItems: 'center',
  },
  value: {
    ...typography.mono,
    color: colors.text,
  },
  unit: {
    ...typography.monoSmall,
    color: colors.textSecondary,
  },
});

export { GoalSettingModal };
