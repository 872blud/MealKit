import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { Recipe } from '@/stores/recipeStore';
import MacroChip from './MacroChip';

type Variant = 'stack' | 'compact';

interface RecipeCardProps {
  recipe: Recipe;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: Variant;
}

// Difficulty pill: tie to the existing macro palette so we stay inside the token system.
// easy → fiber (soft green), medium → carb (warm amber), hard → error (muted red)
const DIFFICULTY_PALETTE: Record<
  Recipe['difficulty'],
  { label: string; fg: string; bg: string }
> = {
  easy:   { label: 'Easy',   fg: colors.fiber, bg: colors.fiberDim },
  medium: { label: 'Medium', fg: colors.carb,  bg: colors.carbDim  },
  hard:   { label: 'Hard',   fg: colors.error, bg: colors.errorDim },
};

export default function RecipeCard({
  recipe,
  onPress,
  style,
  variant = 'stack',
}: RecipeCardProps) {
  const totalTime = recipe.cookTime + recipe.prepTime;
  const diff = DIFFICULTY_PALETTE[recipe.difficulty];
  const missingCount = recipe.ingredientMatch.missing.length;
  const matchPercent = Math.round(recipe.ingredientMatch.percent);
  const isCompact = variant === 'compact';

  const body = (
    <>
      {/* ── Top row: name + match % ─────────────────────────────── */}
      <View style={styles.topRow}>
        <Text
          style={isCompact ? styles.nameCompact : styles.name}
          numberOfLines={2}
        >
          {recipe.name}
        </Text>
        <View style={styles.matchPill}>
          <Text style={styles.matchValue}>{matchPercent}%</Text>
          <Text style={styles.matchLabel}> match</Text>
        </View>
      </View>

      {/* ── Meta row: time + difficulty ──────────────────────────── */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.metaTime}>{totalTime} min</Text>
        </View>
        <View style={styles.metaDot} />
        <View style={[styles.diffPill, { backgroundColor: diff.bg }]}>
          <Text style={[styles.diffLabel, { color: diff.fg }]}>{diff.label}</Text>
        </View>
      </View>

      {/* ── AI reasoning (one sentence) ──────────────────────────── */}
      {recipe.aiReasoning.length > 0 && (
        <Text style={styles.reasoning} numberOfLines={3}>
          {recipe.aiReasoning}
        </Text>
      )}

      {/* ── Divider ─────────────────────────────────────────────── */}
      <View style={styles.divider} />

      {/* ── Macro row ────────────────────────────────────────────── */}
      <View style={styles.macroRow}>
        <MacroChip macro="cal"     value={recipe.nutrition.calories} size="sm" />
        <MacroChip macro="protein" value={recipe.nutrition.protein}  size="sm" />
        <MacroChip macro="carb"    value={recipe.nutrition.carbs}    size="sm" />
        <MacroChip macro="fat"     value={recipe.nutrition.fat}      size="sm" />
      </View>

      {/* ── Missing ingredients (conditional) ────────────────────── */}
      {missingCount > 0 && (
        <View style={styles.missingRow}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.missingText}>
            Missing: <Text style={styles.missingCount}>{missingCount}</Text>{' '}
            item{missingCount !== 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={[styles.card, isCompact && styles.cardCompact, style]}>
        {body}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, isCompact && styles.cardCompact, style]}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  cardCompact: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  name: {
    // Intentionally between display (32) and title (24) so two lines fit comfortably on
    // a swipe card. Still bigger/heavier than 'heading' to anchor the card.
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 31,
    color: colors.text,
    flex: 1,
  },
  nameCompact: {
    ...typography.heading,
    color: colors.text,
    flex: 1,
  },
  matchPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaTime: {
    ...typography.monoSmall,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textDisabled,
  },
  diffPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 100,
  },
  diffLabel: {
    ...typography.caption,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  reasoning: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  macroRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  missingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  missingText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  missingCount: {
    ...typography.smallMedium,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
});

export { RecipeCard };
