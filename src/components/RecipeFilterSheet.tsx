import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { SPRING_CONFIG, TIMING_ENTER, TIMING_EXIT } from '@/theme/animations';
import { RecipeFilters } from '@/stores/recipeStore';
import PressableScale from './PressableScale';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_MAX_HEIGHT = Math.min(SCREEN_H * 0.85, 720);

const CUISINES = [
  'Italian',
  'Mexican',
  'Asian',
  'Mediterranean',
  'Indian',
  'American',
  'Middle Eastern',
] as const;

const DIETARY = [
  'Vegetarian',
  'Vegan',
  'Gluten-free',
  'Dairy-free',
  'Keto',
] as const;

const COOK_TIMES: { label: string; value: number | null }[] = [
  { label: '≤15 min', value: 15 },
  { label: '≤30 min', value: 30 },
  { label: '≤60 min', value: 60 },
  { label: 'Any',     value: null },
];

const DIFFICULTIES: { label: string; value: RecipeFilters['difficulty'] }[] = [
  { label: 'Easy',   value: 'easy'   },
  { label: 'Medium', value: 'medium' },
  { label: 'Hard',   value: 'hard'   },
  { label: 'Any',    value: null    },
];

interface Props {
  visible: boolean;
  filters: RecipeFilters;
  onApply: (next: RecipeFilters) => void;
  onReset: () => void;
  onClose: () => void;
}

export default function RecipeFilterSheet({
  visible,
  filters,
  onApply,
  onReset,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();

  // Animated driver: translateY of the sheet (SCREEN_H hidden → 0 visible)
  const translateY = useSharedValue(SCREEN_H);
  const scrimOpacity = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);

  // Local draft state so filters don't apply until user taps "Apply"
  const [draft, setDraft] = useState<RecipeFilters>(filters);

  // When opened, sync draft from incoming filters.
  useEffect(() => {
    if (visible) {
      setDraft(filters);
      setMounted(true);
      translateY.value = withSpring(0, SPRING_CONFIG);
      scrimOpacity.value = withTiming(1, TIMING_ENTER);
    } else {
      scrimOpacity.value = withTiming(0, TIMING_EXIT);
      translateY.value = withTiming(SCREEN_H, TIMING_EXIT, (finished) => {
        if (finished) {
          runOnJS(setMounted)(false);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const dragGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-12, 12])
        .onUpdate((e) => {
          'worklet';
          // Only allow dragging down; upward drag clamped at 0
          translateY.value = Math.max(0, e.translationY);
          // Dim scrim as user drags down
          const progress = Math.min(e.translationY / 240, 1);
          scrimOpacity.value = 1 - progress * 0.6;
        })
        .onEnd((e) => {
          'worklet';
          if (e.translationY > 120 || e.velocityY > 800) {
            runOnJS(onClose)();
          } else {
            translateY.value = withSpring(0, SPRING_CONFIG);
            scrimOpacity.value = withTiming(1, TIMING_ENTER);
          }
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: scrimOpacity.value,
  }));

  if (!mounted) return null;

  const handleApply = () => {
    Haptics.selectionAsync().catch(() => {});
    onApply(draft);
  };

  const handleReset = () => {
    Haptics.selectionAsync().catch(() => {});
    onReset();
  };

  const toggleCuisine = (value: string) => {
    setDraft((d) => ({ ...d, cuisine: d.cuisine === value ? null : value }));
  };
  const toggleDietary = (value: string) => {
    setDraft((d) => ({ ...d, dietary: d.dietary === value ? null : value }));
  };
  const setCookTime = (value: number | null) => {
    setDraft((d) => ({ ...d, cookTime: value }));
  };
  const setDifficulty = (value: RecipeFilters['difficulty']) => {
    setDraft((d) => ({ ...d, difficulty: value }));
  };

  const calMin = draft.calorieRange?.min ?? '';
  const calMax = draft.calorieRange?.max ?? '';

  const setCalMin = (txt: string) => {
    const n = parseInt(txt.replace(/\D/g, ''), 10);
    const min = Number.isFinite(n) ? n : null;
    setDraft((d) => {
      const max = d.calorieRange?.max ?? null;
      if (min === null && max === null) return { ...d, calorieRange: null };
      return { ...d, calorieRange: { min: min ?? 0, max: max ?? 1200 } };
    });
  };
  const setCalMax = (txt: string) => {
    const n = parseInt(txt.replace(/\D/g, ''), 10);
    const max = Number.isFinite(n) ? n : null;
    setDraft((d) => {
      const min = d.calorieRange?.min ?? null;
      if (min === null && max === null) return { ...d, calorieRange: null };
      return { ...d, calorieRange: { min: min ?? 0, max: max ?? 1200 } };
    });
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Scrim — tap to dismiss */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            maxHeight: SHEET_MAX_HEIGHT,
            paddingBottom: Math.max(insets.bottom, spacing.lg),
          },
          sheetStyle,
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 0 }}
        >
          <GestureDetector gesture={dragGesture}>
            <Animated.View style={styles.handleArea}>
              <View style={styles.handle} />
            </Animated.View>
          </GestureDetector>

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filters</Text>
            <Pressable
              onPress={handleReset}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.resetBtn}
            >
              <Text style={styles.resetLabel}>Reset</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Cuisine */}
            <Section label="Cuisine">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                <Chip
                  label="Any"
                  active={draft.cuisine === null}
                  onPress={() => setDraft((d) => ({ ...d, cuisine: null }))}
                />
                {CUISINES.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    active={draft.cuisine === c}
                    onPress={() => toggleCuisine(c)}
                  />
                ))}
              </ScrollView>
            </Section>

            {/* Dietary */}
            <Section label="Dietary">
              <View style={[styles.chipRow, styles.chipWrap]}>
                <Chip
                  label="None"
                  active={draft.dietary === null}
                  onPress={() => setDraft((d) => ({ ...d, dietary: null }))}
                />
                {DIETARY.map((d) => (
                  <Chip
                    key={d}
                    label={d}
                    active={draft.dietary === d}
                    onPress={() => toggleDietary(d)}
                  />
                ))}
              </View>
            </Section>

            {/* Cook time */}
            <Section label="Cook time">
              <Segmented
                options={COOK_TIMES.map((o) => ({
                  key: o.value === null ? 'any' : String(o.value),
                  label: o.label,
                  value: o.value,
                }))}
                activeKey={draft.cookTime === null ? 'any' : String(draft.cookTime)}
                onChange={(v) => setCookTime(v as number | null)}
              />
            </Section>

            {/* Difficulty */}
            <Section label="Difficulty">
              <Segmented
                options={DIFFICULTIES.map((o) => ({
                  key: o.value === null ? 'any' : o.value,
                  label: o.label,
                  value: o.value,
                }))}
                activeKey={draft.difficulty === null ? 'any' : draft.difficulty}
                onChange={(v) => setDifficulty(v as RecipeFilters['difficulty'])}
              />
            </Section>

            {/* Calorie range */}
            <Section label="Calories per serving">
              <View style={styles.calRow}>
                <CalorieField
                  placeholder="Min"
                  value={calMin === '' ? '' : String(calMin)}
                  onChangeText={setCalMin}
                />
                <Text style={styles.calDash}>–</Text>
                <CalorieField
                  placeholder="Max"
                  value={calMax === '' ? '' : String(calMax)}
                  onChangeText={setCalMax}
                />
                <Text style={styles.calUnit}>kcal</Text>
              </View>
            </Section>
          </ScrollView>

          {/* Apply */}
          <PressableScale onPress={handleApply} style={styles.applyBtn}>
            <Text style={styles.applyLabel}>Apply filters</Text>
            <Ionicons
              name="checkmark"
              size={18}
              color={colors.onAccent}
              style={{ marginLeft: spacing.sm }}
            />
          </PressableScale>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

interface SegOption {
  key: string;
  label: string;
  value: unknown;
}

function Segmented({
  options,
  activeKey,
  onChange,
}: {
  options: SegOption[];
  activeKey: string;
  onChange: (value: unknown) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const isActive = o.key === activeKey;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.value)}
            hitSlop={{ top: 6, bottom: 6 }}
            style={[styles.segment, isActive && styles.segmentActive]}
          >
            <Text
              style={[styles.segmentLabel, isActive && styles.segmentLabelActive]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CalorieField({
  placeholder,
  value,
  onChangeText,
}: {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textDisabled}
      keyboardType="number-pad"
      style={styles.calInput}
      maxLength={4}
    />
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrim: {
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
    paddingTop: spacing.xs,
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  sheetTitle: {
    ...typography.title,
    color: colors.text,
  },
  resetBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  resetLabel: {
    ...typography.bodyMedium,
    color: colors.accent,
  },
  scroll: {
    maxHeight: SHEET_MAX_HEIGHT - 200,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  chipWrap: {
    flexWrap: 'wrap',
    rowGap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.accentDim,
    borderColor: colors.accent,
  },
  chipLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  chipLabelActive: {
    ...typography.smallMedium,
    color: colors.accent,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    minHeight: 40,
  },
  segmentActive: {
    backgroundColor: colors.accent,
  },
  segmentLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  segmentLabelActive: {
    ...typography.smallMedium,
    color: colors.onAccent,
  },
  calRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  calInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    minHeight: 44,
    color: colors.text,
    ...typography.mono,
    fontSize: 16,
  },
  calDash: {
    ...typography.body,
    color: colors.textSecondary,
  },
  calUnit: {
    ...typography.small,
    color: colors.textSecondary,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    borderRadius: 14,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  applyLabel: {
    ...typography.bodyMedium,
    color: colors.onAccent,
  },
});

export { RecipeFilterSheet };
