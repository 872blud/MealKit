import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

const DIFFICULTY_PALETTE: Record<
  Recipe['difficulty'],
  { label: string; fg: string; bg: string }
> = {
  easy:   { label: 'Easy',   fg: colors.fiber, bg: colors.fiberDim },
  medium: { label: 'Medium', fg: colors.carb,  bg: colors.carbDim  },
  hard:   { label: 'Hard',   fg: colors.error, bg: colors.errorDim },
};

// Cuisine → dark gradient mapping (horizontal, left→right)
const CUISINE_GRADIENTS: Record<string, [string, string]> = {
  Italian:       ['#3d1208', '#6b1e0e'],
  Asian:         ['#0d0a2a', '#1a1048'],
  Mediterranean: ['#051a24', '#0a2d3a'],
  Mexican:       ['#2a1000', '#4a2000'],
  American:      ['#0e0e18', '#1a1a28'],
  Indian:        ['#2a1400', '#4a2800'],
  French:        ['#1a0e1a', '#2a1830'],
  'Middle Eastern': ['#1a1200', '#2e2000'],
  Other:         ['#080e09', '#0d1a0e'],
};

function getCuisineGradient(cuisine?: string): [string, string] {
  if (!cuisine) return CUISINE_GRADIENTS.Other;
  return CUISINE_GRADIENTS[cuisine] ?? CUISINE_GRADIENTS.Other;
}

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
  const gradientColors = getCuisineGradient((recipe as any).cuisine);

  const body = (
    <>
      {/* ── Cuisine gradient header ──────────────────────────── */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.cuisineHeader, isCompact && styles.cuisineHeaderCompact]}
      >
        <Text
          style={[styles.name, isCompact && styles.nameCompact]}
          numberOfLines={2}
        >
          {recipe.name}
        </Text>
        <View style={styles.matchPill}>
          <Text style={styles.matchValue}>{matchPercent}%</Text>
          <Text style={styles.matchLabel}> match</Text>
        </View>
      </LinearGradient>

      {/* ── Card body ────────────────────────────────────────── */}
      <View style={[styles.cardBody, isCompact && styles.cardBodyCompact]}>
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
          {recipe.servings > 0 && (
            <>
              <View style={styles.metaDot} />
              <Text style={styles.metaTime}>{recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}</Text>
            </>
          )}
        </View>

        {/* ── AI reasoning ─────────────────────────────────────────── */}
        {recipe.aiReasoning.length > 0 && (
          <Text style={styles.reasoning} numberOfLines={2}>
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

        {/* ── Missing ingredients ────────────────────────────────────── */}
        {missingCount > 0 && (
          <View style={styles.missingRow}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.missingText}>
              Missing: <Text style={styles.missingCount}>{missingCount}</Text>{' '}
              item{missingCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={[styles.card, style]}>
        {body}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, style]}>
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
    overflow: 'hidden',
  },

  // Cuisine gradient header strip
  cuisineHeader: {
    height: 72,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cuisineHeaderCompact: {
    height: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  name: {
    fontFamily: 'BodoniModa_700Bold',
    fontSize: 22,
    letterSpacing: -0.3,
    lineHeight: 26,
    color: '#FFFFFF',
    flex: 1,
  },
  nameCompact: {
    fontFamily: 'BodoniModa_700Bold',
    fontSize: 17,
    letterSpacing: -0.2,
    lineHeight: 21,
    color: '#FFFFFF',
    flex: 1,
  },
  matchPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: 100,
  },
  matchValue: {
    ...typography.monoSmall,
    color: '#FFFFFF',
    fontSize: 13,
  },
  matchLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },

  // Card body below header
  cardBody: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  cardBodyCompact: {
    padding: spacing.lg,
    gap: spacing.sm,
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
    fontFamily: 'Archivo_500Medium',
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
    fontFamily: 'Archivo_600SemiBold',
    letterSpacing: 0.2,
  },
  reasoning: {
    ...typography.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
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
