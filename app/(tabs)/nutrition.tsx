import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import GlowBackground from '@/components/GlowBackground';
import { TIMING_ENTER, getStaggerDelay } from '@/theme/animations';
import { useNutritionStore, NutritionLogEntry } from '@/stores/nutritionStore';
import { useUserStore } from '@/stores/userStore';
import PressableScale from '@/components/PressableScale';
import EmptyState from '@/components/EmptyState';
import CalorieArc from '@/components/CalorieArc';
import MacroBar from '@/components/MacroBar';
import WeeklyBars from '@/components/WeeklyBars';
import GoalSettingModal from '@/components/GoalSettingModal';
import { getLocalDateKey, parseLocalDateKey, shiftLocalDateKey } from '@/utils/date';

type Tab = 'day' | 'week';

function todayISO(): string {
  return getLocalDateKey();
}

function shiftDate(iso: string, days: number): string {
  return shiftLocalDateKey(iso, days);
}

function formatDateLabel(iso: string): string {
  const today = todayISO();
  const yesterday = shiftDate(today, -1);
  if (iso === today) return 'Today';
  if (iso === yesterday) return 'Yesterday';
  const d = parseLocalDateKey(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function NutritionScreen() {
  const insets = useSafeAreaInsets();
  const {
    log,
    getDailyTotals,
    getEntriesForDate,
    getWeeklySummary,
    removeEntry,
  } = useNutritionStore();
  const { preferences } = useUserStore();

  const [tab, setTab] = useState<Tab>('day');
  const [currentDate, setCurrentDate] = useState<string>(todayISO());
  const [goalsVisible, setGoalsVisible] = useState(false);

  const totals = useMemo(
    () => getDailyTotals(currentDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentDate, log],
  );
  const entries = useMemo(
    () => getEntriesForDate(currentDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentDate, log],
  );
  const week = useMemo(
    () => getWeeklySummary(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [log],
  );

  const calorieTarget = preferences.dailyCalorieTarget;
  const calorieProgress = calorieTarget > 0 ? totals.calories / calorieTarget : 0;
  const caloriesRemaining = calorieTarget - totals.calories;
  const overBudget = totals.calories > calorieTarget;

  const goPrev = () => {
    Haptics.selectionAsync();
    setCurrentDate((d) => shiftDate(d, -1));
  };
  const goNext = () => {
    if (currentDate === todayISO()) return;
    Haptics.selectionAsync();
    setCurrentDate((d) => shiftDate(d, 1));
  };

  const handleDelete = (entry: NutritionLogEntry) => {
    Alert.alert(
      'Remove meal?',
      `Remove "${entry.recipeName}" from ${formatDateLabel(entry.date)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            removeEntry(entry.id);
          },
        },
      ],
    );
  };

  const atToday = currentDate === todayISO();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <GlowBackground primary="blue" secondary="green" />
      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>Nutrition</Text>
        <PressableScale
          onPress={() => setGoalsVisible(true)}
          style={styles.gearBtn}
          accessibilityLabel="Daily goals"
        >
          <Ionicons name="options-outline" size={22} color={colors.text} />
        </PressableScale>
      </View>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <View style={styles.tabRow}>
        <TabButton
          label="Day"
          active={tab === 'day'}
          onPress={() => {
            Haptics.selectionAsync();
            setTab('day');
          }}
        />
        <TabButton
          label="Week"
          active={tab === 'week'}
          onPress={() => {
            Haptics.selectionAsync();
            setTab('week');
          }}
        />
      </View>

      {tab === 'day' ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing.xxxl },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Date selector ──────────────────────────────────── */}
          <View style={styles.dateRow}>
            <PressableScale
              onPress={goPrev}
              style={styles.dateArrow}
              accessibilityLabel="Previous day"
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </PressableScale>
            <Text style={styles.dateLabel}>{formatDateLabel(currentDate)}</Text>
            <PressableScale
              onPress={goNext}
              disabled={atToday}
              style={[styles.dateArrow, atToday && styles.dateArrowDisabled]}
              accessibilityLabel="Next day"
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={atToday ? colors.textDisabled : colors.text}
              />
            </PressableScale>
          </View>

          {/* ── Calorie arc ────────────────────────────────────── */}
          <View style={styles.arcWrap}>
            <CalorieArc
              progress={Math.min(calorieProgress, 1)}
              overBudget={overBudget}
              size={260}
            >
              <Text style={styles.arcBigNum}>{Math.round(totals.calories)}</Text>
              <Text style={styles.arcTargetLabel}>
                of <Text style={styles.arcTargetNum}>{calorieTarget}</Text> kcal
              </Text>
              <View
                style={[
                  styles.remainingPill,
                  overBudget && styles.remainingPillOver,
                ]}
              >
                <Text
                  style={[
                    styles.remainingText,
                    overBudget && styles.remainingTextOver,
                  ]}
                >
                  {overBudget
                    ? `${Math.abs(Math.round(caloriesRemaining))} over`
                    : `${Math.max(0, Math.round(caloriesRemaining))} left`}
                </Text>
              </View>
            </CalorieArc>
          </View>

          {/* ── Macro bars ─────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.macrosCard}>
              <MacroBar
                kind="protein"
                label="Protein"
                current={totals.protein}
                target={preferences.dailyMacroTargets.protein}
              />
              <MacroBar
                kind="carbs"
                label="Carbs"
                current={totals.carbs}
                target={preferences.dailyMacroTargets.carbs}
              />
              <MacroBar
                kind="fat"
                label="Fat"
                current={totals.fat}
                target={preferences.dailyMacroTargets.fat}
              />
              <MacroBar
                kind="fiber"
                label="Fiber"
                current={totals.fiber}
                target={preferences.dailyMacroTargets.fiber}
              />
            </View>
          </View>

          {/* ── Logged meals ───────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Meals
              {entries.length > 0 && (
                <Text style={styles.sectionCount}>  {entries.length}</Text>
              )}
            </Text>
            {entries.length === 0 ? (
              <View style={styles.emptyMeals}>
                <Ionicons
                  name="restaurant-outline"
                  size={24}
                  color={colors.textDisabled}
                />
                <Text style={styles.emptyMealsText}>
                  Cook a recipe to log your first meal.
                </Text>
              </View>
            ) : (
              <View style={styles.mealsList}>
                {entries.map((e, i) => (
                  <MealRow
                    key={e.id}
                    entry={e}
                    index={i}
                    onDelete={() => handleDelete(e)}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing.xxxl },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <WeekView days={week} calorieTarget={calorieTarget} log={log} />
        </ScrollView>
      )}

      <GoalSettingModal
        visible={goalsVisible}
        onClose={() => setGoalsVisible(false)}
      />
    </View>
  );
}

// ─── Tab button ─────────────────────────────────────────────────────────────

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
    </PressableScale>
  );
}

// ─── Meal row ───────────────────────────────────────────────────────────────

function MealRow({
  entry,
  index,
  onDelete,
}: {
  entry: NutritionLogEntry;
  index: number;
  onDelete: () => void;
}) {
  const opacity = useSharedValue(0);
  const ty = useSharedValue(12);

  useEffect(() => {
    const delay = getStaggerDelay(index);
    opacity.value = withDelay(delay, withTiming(1, TIMING_ENTER));
    ty.value = withDelay(delay, withTiming(0, TIMING_ENTER));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  const cals = entry.macros.calories * entry.servings;
  const protein = entry.macros.protein * entry.servings;
  const carbs = entry.macros.carbs * entry.servings;
  const fat = entry.macros.fat * entry.servings;

  return (
    <Animated.View style={[styles.mealRow, style]}>
      <View style={styles.mealMain}>
        <View style={styles.mealHeader}>
          <Text style={styles.mealName} numberOfLines={1}>
            {entry.recipeName}
          </Text>
          <Text style={styles.mealCals}>{Math.round(cals)} kcal</Text>
        </View>
        <View style={styles.mealMeta}>
          <Text style={styles.mealTime}>{formatTime(entry.loggedAt)}</Text>
          <Text style={styles.mealDot}>·</Text>
          <Text style={styles.mealServings}>
            {entry.servings} {entry.servings === 1 ? 'serving' : 'servings'}
          </Text>
        </View>
        <View style={styles.mealMacros}>
          <MealMacro label="P" value={protein} color={colors.protein} />
          <MealMacro label="C" value={carbs} color={colors.carb} />
          <MealMacro label="F" value={fat} color={colors.fat} />
        </View>
      </View>
      <PressableScale
        onPress={onDelete}
        style={styles.deleteBtn}
        accessibilityLabel={`Delete ${entry.recipeName}`}
      >
        <Ionicons name="close" size={16} color={colors.textSecondary} />
      </PressableScale>
    </Animated.View>
  );
}

function MealMacro({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Text style={styles.mealMacro}>
      <Text style={[styles.mealMacroLabel, { color }]}>{label} </Text>
      <Text style={styles.mealMacroNum}>{Math.round(value)}g</Text>
    </Text>
  );
}

// ─── Week view ──────────────────────────────────────────────────────────────

function WeekView({
  days,
  calorieTarget,
  log,
}: {
  days: { date: string; totals: { calories: number } }[];
  calorieTarget: number;
  log: NutritionLogEntry[];
}) {
  const withCals = days.filter((d) => d.totals.calories > 0);
  const avg =
    withCals.length > 0
      ? Math.round(
          withCals.reduce((s, d) => s + d.totals.calories, 0) / withCals.length,
        )
      : 0;
  const best = withCals.reduce<{ date: string; calories: number } | null>(
    (acc, d) => {
      if (
        calorieTarget === 0 ||
        !acc ||
        Math.abs(d.totals.calories - calorieTarget) <
          Math.abs(acc.calories - calorieTarget)
      ) {
        return { date: d.date, calories: d.totals.calories };
      }
      return acc;
    },
    null,
  );
  const worst = withCals.reduce<{ date: string; calories: number } | null>(
    (acc, d) => {
      if (
        !acc ||
        Math.abs(d.totals.calories - calorieTarget) >
          Math.abs(acc.calories - calorieTarget)
      ) {
        return { date: d.date, calories: d.totals.calories };
      }
      return acc;
    },
    null,
  );

  // Top sources — most-logged recipe names within the 7-day window
  const weekStart = days[0]?.date ?? todayISO();
  const weekEntries = log.filter((e) => e.date >= weekStart);
  const sourceMap = new Map<string, number>();
  for (const e of weekEntries) {
    sourceMap.set(e.recipeName, (sourceMap.get(e.recipeName) ?? 0) + 1);
  }
  const topSources = Array.from(sourceMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (withCals.length === 0) {
    return (
      <View style={styles.weekEmpty}>
        <EmptyState
          icon="calendar-outline"
          title="No meals this week"
          body="Your weekly stats will appear as you log meals."
        />
      </View>
    );
  }

  const barData = days.map((d) => ({
    date: d.date,
    calories: d.totals.calories,
  }));

  return (
    <View style={styles.weekWrap}>
      <View style={styles.weekChartCard}>
        <Text style={styles.weekChartTitle}>Last 7 days</Text>
        <WeeklyBars days={barData} calorieTarget={calorieTarget} />
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Avg / day" value={`${avg}`} unit="kcal" />
        <StatCard
          label="Days logged"
          value={`${withCals.length}`}
          unit="of 7"
        />
      </View>

      {(best || worst) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stand-out days</Text>
          <View style={styles.standoutCard}>
            {best && (
              <StandoutRow
                label="Closest to goal"
                date={best.date}
                calories={best.calories}
                accent={colors.accent}
              />
            )}
            {worst && best && worst.date !== best.date && (
              <>
                <View style={styles.standoutDivider} />
                <StandoutRow
                  label="Furthest from goal"
                  date={worst.date}
                  calories={worst.calories}
                  accent={colors.textSecondary}
                />
              </>
            )}
          </View>
        </View>
      )}

      {topSources.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top sources</Text>
          <View style={styles.sourcesCard}>
            {topSources.map(([name, count], i) => (
              <View
                key={name}
                style={[
                  styles.sourceRow,
                  i < topSources.length - 1 && styles.sourceRowBorder,
                ]}
              >
                <Text style={styles.sourceRank}>{i + 1}</Text>
                <Text style={styles.sourceName} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={styles.sourceCount}>
                  {count}×
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>
        {value}
        <Text style={styles.statUnit}> {unit}</Text>
      </Text>
    </View>
  );
}

function StandoutRow({
  label,
  date,
  calories,
  accent,
}: {
  label: string;
  date: string;
  calories: number;
  accent: string;
}) {
  return (
    <View style={styles.standoutRow}>
      <View style={styles.standoutLabelCol}>
        <View style={[styles.standoutDot, { backgroundColor: accent }]} />
        <Text style={styles.standoutLabel}>{label}</Text>
      </View>
      <View style={styles.standoutValCol}>
        <Text style={styles.standoutDate}>{formatDateLabel(date)}</Text>
        <Text style={styles.standoutCal}>
          {Math.round(calories)}
          <Text style={styles.standoutUnit}> kcal</Text>
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  gearBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.accentDim,
    borderColor: 'transparent',
  },
  tabText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.accent,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  dateArrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  dateArrowDisabled: {
    opacity: 0.4,
  },
  dateLabel: {
    ...typography.heading,
    color: colors.text,
  },
  arcWrap: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  arcBigNum: {
    ...typography.monoLarge,
    fontSize: 52,
    lineHeight: 56,
    color: colors.text,
  },
  arcTargetLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  arcTargetNum: {
    ...typography.smallMedium,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  remainingPill: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.accentDim,
    borderRadius: 100,
  },
  remainingPillOver: {
    backgroundColor: colors.errorDim,
  },
  remainingText: {
    ...typography.monoSmall,
    color: colors.accent,
  },
  remainingTextOver: {
    color: colors.error,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionCount: {
    ...typography.mono,
    color: colors.textSecondary,
  },
  macrosCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  emptyMeals: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  emptyMealsText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  mealsList: {
    gap: spacing.sm,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  mealMain: {
    flex: 1,
    gap: spacing.xs,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  mealName: {
    ...typography.bodyMedium,
    color: colors.text,
    flex: 1,
  },
  mealCals: {
    ...typography.mono,
    color: colors.text,
  },
  mealMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  mealTime: {
    ...typography.small,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  mealDot: {
    ...typography.small,
    color: colors.textDisabled,
  },
  mealServings: {
    ...typography.small,
    color: colors.textSecondary,
  },
  mealMacros: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 2,
  },
  mealMacro: {
    ...typography.monoSmall,
  },
  mealMacroLabel: {
    opacity: 0.9,
  },
  mealMacroNum: {
    color: colors.textSecondary,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  weekWrap: {
    gap: 0,
  },
  weekEmpty: {
    flex: 1,
    minHeight: 320,
  },
  weekChartCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.md,
  },
  weekChartTitle: {
    ...typography.smallMedium,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statValue: {
    ...typography.monoLarge,
    fontSize: 24,
    lineHeight: 28,
    color: colors.text,
  },
  statUnit: {
    ...typography.small,
    color: colors.textSecondary,
  },
  standoutCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  standoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  standoutDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  standoutLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  standoutDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  standoutLabel: {
    ...typography.small,
    color: colors.textSecondary,
    flex: 1,
  },
  standoutValCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  standoutDate: {
    ...typography.smallMedium,
    color: colors.text,
  },
  standoutCal: {
    ...typography.monoSmall,
    color: colors.textSecondary,
  },
  standoutUnit: {
    color: colors.textSecondary,
  },
  sourcesCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  sourceRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sourceRank: {
    ...typography.monoSmall,
    color: colors.textSecondary,
    width: 16,
  },
  sourceName: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  sourceCount: {
    ...typography.mono,
    color: colors.accent,
  },
});
