import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Share as NativeShare } from 'react-native';
import RecipeShareCard from '@/components/RecipeShareCard';
import { isPro } from '@/services/purchases';
import { generateFoodImage } from '@/services/recipeImages';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useRecipeStore, type Recipe } from '@/stores/recipeStore';
import {
  trackRecipeDetailViewed,
  trackCookingStarted,
  trackCookingStepAdvanced,
  trackServingsAdjusted,
  trackMealCooked,
  trackRecipeShared,
} from '@/services/analytics';
import PressableScale from '@/components/PressableScale';
import EmptyState from '@/components/EmptyState';
import MacroChip from '@/components/MacroChip';
import CookingMode from '@/components/CookingMode';
const MIN_SERVINGS = 1;
const MAX_SERVINGS = 16;

function scaleQuantity(qty: string, multiplier: number): string {
  const trimmed = qty.trim();
  if (!trimmed) return qty;

  // "1 1/2"
  const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const n =
      parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10);
    return formatScaled(n * multiplier);
  }

  // "1/2"
  const frac = trimmed.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const n = parseInt(frac[1], 10) / parseInt(frac[2], 10);
    return formatScaled(n * multiplier);
  }

  // "1", "1.5"
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return formatScaled(parseFloat(trimmed) * multiplier);
  }

  return qty;
}

function formatScaled(n: number): string {
  const rounded = Math.round(n * 4) / 4;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

function formatMinutes(mins: number): string {
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

function safeParseRecipe(raw: string): Recipe | undefined {
  try { return JSON.parse(raw) as Recipe; } catch { return undefined; }
}

export default function RecipeDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id, fromHistory } = useLocalSearchParams<{ id: string; fromHistory?: string }>();
  const sessionRecipe = useRecipeStore((s) => s.recipes.find((r) => r.id === id));
  const recipe = sessionRecipe ?? (fromHistory ? safeParseRecipe(fromHistory) : undefined);

  const [userServings, setUserServings] = useState<number>(recipe?.servings ?? 2);
  const [cooking, setCooking] = useState(false);
  const [hasCooked, setHasCooked] = useState(false);

  useEffect(() => {
    if (recipe) {
      setUserServings(recipe.servings);
      trackRecipeDetailViewed(recipe.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe?.id]);

  useEffect(() => {
    let active = true;
    isPro().then((pro) => { if (active) setIsProUser(pro); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const IMAGE_TTL_MS = 55 * 60 * 1000;

  useEffect(() => {
    if (!recipe) return;
    let active = true;

    const cached = recipeImages[recipe.id];
    const isStale = !cached || (Date.now() - cached.fetchedAt > IMAGE_TTL_MS);

    if (!isStale) {
      setFoodImageUrl(cached.url);
      return;
    }

    generateFoodImage(recipe.name, recipe.selectionNote ?? '')
      .then((url) => {
        if (!active) return;
        setRecipeImage(recipe.id, url);
        setFoodImageUrl(url);
      })
      .catch(() => {
        if (!active) return;
        setRecipeImage(recipe.id, null);
      });

    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe?.id]);

  const handleServingsChange = useCallback(
    (delta: number) => {
      if (!recipe) return;
      setUserServings((prev) => {
        const next = Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, prev + delta));
        if (next !== prev) {
          Haptics.selectionAsync().catch(() => {});
          trackServingsAdjusted(recipe.id, next);
        }
        return next;
      });
    },
    [recipe]
  );

  const handleShare = useCallback(async () => {
    if (!recipe) return;
    Haptics.selectionAsync().catch(() => {});
    const totalTime = recipe.cookTime + recipe.prepTime;
    const lines: string[] = [
      `I just made ${recipe.name} with Mealkit!`,
      '',
      `${totalTime} min · ${recipe.nutrition.calories} kcal · ${DIFFICULTY_LABEL[recipe.difficulty]}`,
    ];
    if (recipe.aiReasoning) {
      lines.push('', recipe.aiReasoning);
    }
    lines.push('', 'Try Mealkit — scan your groceries, get AI recipes instantly.');
    trackRecipeShared(recipe.id);
    await NativeShare.share({ message: lines.join('\n') }).catch(() => {});
  }, [recipe]);

  const handleStartCooking = useCallback(() => {
    if (!recipe) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    trackCookingStarted(recipe.id);
    setCooking(true);
  }, [recipe]);

  const handleStepAdvanced = useCallback(
    (stepIndex: number) => {
      if (!recipe) return;
      trackCookingStepAdvanced(recipe.id, stepIndex);
    },
    [recipe]
  );

  const handleMarkAsCooked = useCallback(async () => {
    if (!recipe) return;
    trackMealCooked(recipe.id, userServings);
    setCooking(false);
    setHasCooked(true);
  }, [recipe, userServings]);

  if (!recipe) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </PressableScale>
        </View>
        <EmptyState
          icon="alert-circle-outline"
          title="Recipe not found"
          body="This recipe is no longer available. Go back and try another."
          action={{ label: 'Back', onPress: () => router.back() }}
        />
      </View>
    );
  }

  const multiplier = recipe.servings > 0 ? userServings / recipe.servings : 1;
  const totalTime = recipe.cookTime + recipe.prepTime;
  const matchPercent = Math.round(recipe.ingredientMatch.percent);
  const canDec = userServings > MIN_SERVINGS;
  const canInc = userServings < MAX_SERVINGS;

  return (
    <View style={styles.container}>
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <PressableScale onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </PressableScale>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 88 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.matchPill}>
            <Text style={styles.matchValue}>{matchPercent}%</Text>
            <Text style={styles.matchLabel}> match</Text>
          </View>
          <Text style={styles.heroName}>{recipe.name}</Text>
          {recipe.selectionNote.length > 0 && (
            <Text style={styles.heroReasoning}>{recipe.selectionNote}</Text>
          )}
        </View>

        {/* ── Stats bar ───────────────────────────────────── */}
        <View style={styles.statsBar}>
          <Stat
            icon="time-outline"
            label="Time"
            value={formatMinutes(totalTime)}
          />
          <View style={styles.statDivider} />
          <Stat
            icon="barbell-outline"
            label="Difficulty"
            value={DIFFICULTY_LABEL[recipe.difficulty]}
          />
          <View style={styles.statDivider} />
          <ServingsStat
            servings={userServings}
            onDec={() => handleServingsChange(-1)}
            onInc={() => handleServingsChange(1)}
            canDec={canDec}
            canInc={canInc}
          />
        </View>

        {/* ── Nutrition ───────────────────────────────────── */}
        <Section title="Per serving">
          <View style={styles.macroGrid}>
            <MacroChip
              macro="cal"
              value={recipe.nutrition.calories}
              size="md"
            />
            <MacroChip
              macro="protein"
              value={recipe.nutrition.protein}
              size="md"
            />
            <MacroChip
              macro="carb"
              value={recipe.nutrition.carbs}
              size="md"
            />
            <MacroChip
              macro="fat"
              value={recipe.nutrition.fat}
              size="md"
            />
            <MacroChip
              macro="fiber"
              value={recipe.nutrition.fiber}
              size="md"
            />
          </View>
        </Section>

        {/* ── Ingredients ─────────────────────────────────── */}
        <Section
          title={`Ingredients · ${recipe.ingredients.length}`}
          subtitle={
            userServings !== recipe.servings
              ? `Scaled for ${userServings} servings`
              : undefined
          }
        >
          <View style={styles.ingredientList}>
            {recipe.ingredients.map((ing, i) => (
              <View key={`${ing.name}-${i}`} style={styles.ingredientRow}>
                <View style={styles.ingredientDot} />
                <Text style={styles.ingredientName}>{ing.name}</Text>
                <Text style={styles.ingredientQty}>
                  {scaleQuantity(ing.quantity, multiplier)}
                  {ing.unit ? ` ${ing.unit}` : ''}
                </Text>
              </View>
            ))}
          </View>

          {recipe.ingredientMatch.missing.length > 0 && (
            <View style={styles.missingBlock}>
              <View style={styles.missingHeader}>
                <Ionicons
                  name="cart-outline"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.missingHeaderLabel}>You'll need to buy</Text>
              </View>
              {recipe.ingredientMatch.missing.map((item, i) => (
                <Text key={`${item}-${i}`} style={styles.missingItem}>
                  · {item}
                </Text>
              ))}
            </View>
          )}
        </Section>

        {/* ── Chef tips ───────────────────────────────────── */}
        {recipe.chefTips.length > 0 && (
          <Section title="Chef tips">
            <View style={styles.tipsList}>
              {recipe.chefTips.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <View style={styles.tipIcon}>
                    <Ionicons
                      name="sparkles-outline"
                      size={14}
                      color={colors.accent}
                    />
                  </View>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}
      </ScrollView>

      {/* ── Bottom CTA ──────────────────────────────────────── */}
      <View
        style={[
          styles.ctaBar,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.lg },
        ]}
      >
        {hasCooked && (
          <PressableScale onPress={handleShare} style={styles.shareBtn}>
            <Ionicons name="share-outline" size={18} color={colors.accent} />
            <Text style={styles.shareBtnLabel}>Share this meal</Text>
          </PressableScale>
        )}
        <PressableScale onPress={handleStartCooking} style={styles.cta}>
          <Ionicons name="flame-outline" size={20} color={colors.onAccent} />
          <Text style={styles.ctaLabel}>{hasCooked ? 'Cook Again' : 'Start Cooking'}</Text>
        </PressableScale>
      </View>

      {/* ── Cooking mode overlay ───────────────────────────── */}
      <CookingMode
        recipe={recipe}
        visible={cooking}
        onClose={() => setCooking(false)}
        onMarkAsCooked={handleMarkAsCooked}
        onStepAdvanced={handleStepAdvanced}
      />

    </View>
  );
}

// ─── Small sub-components ─────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={colors.textSecondary} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function ServingsStat({
  servings,
  onDec,
  onInc,
  canDec,
  canInc,
}: {
  servings: number;
  onDec: () => void;
  onInc: () => void;
  canDec: boolean;
  canInc: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
      <Text style={styles.statLabel}>Servings</Text>
      <View style={styles.servingsRow}>
        <PressableScale
          onPress={onDec}
          disabled={!canDec}
          style={[styles.servingBtn, !canDec && styles.servingBtnDisabled]}
        >
          <Ionicons
            name="remove"
            size={16}
            color={canDec ? colors.text : colors.textDisabled}
          />
        </PressableScale>
        <Text style={styles.servingsValue}>{servings}</Text>
        <PressableScale
          onPress={onInc}
          disabled={!canInc}
          style={[styles.servingBtn, !canInc && styles.servingBtnDisabled]}
        >
          <Ionicons
            name="add"
            size={16}
            color={canInc ? colors.text : colors.textDisabled}
          />
        </PressableScale>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  hero: {
    gap: spacing.md,
  },
  matchPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    alignSelf: 'flex-start',
    backgroundColor: colors.accentDim,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 100,
  },
  matchValue: {
    ...typography.monoSmall,
    color: colors.accent,
    fontSize: 13,
  },
  matchLabel: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '500',
  },
  heroName: {
    ...typography.display,
    color: colors.text,
  },
  heroReasoning: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statValue: {
    ...typography.monoSmall,
    fontSize: 14,
    color: colors.text,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  servingBtn: {
    width: 28,
    height: 28,
    minWidth: 28,
    minHeight: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  servingBtnDisabled: {
    backgroundColor: colors.surface,
    opacity: 0.5,
  },
  servingsValue: {
    ...typography.monoSmall,
    fontSize: 15,
    color: colors.text,
    minWidth: 20,
    textAlign: 'center',
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
  },
  sectionSubtitle: {
    ...typography.small,
    color: colors.accent,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ingredientList: {
    gap: spacing.sm,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  ingredientDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  ingredientName: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  ingredientQty: {
    ...typography.monoSmall,
    fontSize: 14,
    color: colors.textSecondary,
  },
  missingBlock: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  missingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  missingHeaderLabel: {
    ...typography.smallMedium,
    color: colors.textSecondary,
  },
  missingItem: {
    ...typography.small,
    color: colors.text,
  },
  tipsList: {
    gap: spacing.md,
  },
  tipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tipText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    lineHeight: 22,
  },
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 14,
    paddingVertical: spacing.md,
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent,
    marginBottom: spacing.sm,
  },
  shareBtnLabel: {
    ...typography.bodyMedium,
    color: colors.accent,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  ctaLabel: {
    ...typography.bodyMedium,
    color: colors.onAccent,
  },
});
