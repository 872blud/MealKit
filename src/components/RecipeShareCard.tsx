import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import type { Recipe } from '@/stores/recipeStore';

// Fixed logical render size. 4:5 aspect is the sweet spot for IG feed, iMessage,
// and Stories (center-crops cleanly). Render once at this size; let react-native-view-shot
// upscale to an export resolution via its own width/height options.
const CARD_W = 360;
const CARD_H = 450;

interface RecipeShareCardProps {
  recipe: Recipe;
  imageUrl: string | null;
  showWatermark: boolean; // true for free tier → tagline under wordmark
}

const DIFFICULTY_LABEL: Record<Recipe['difficulty'], string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export default function RecipeShareCard({
  recipe,
  imageUrl,
  showWatermark,
}: RecipeShareCardProps) {
  const totalTime = recipe.cookTime + recipe.prepTime;

  return (
    <View style={styles.card} collapsable={false}>
      {/* ── Hero: AI food photo, or editorial fallback ─────────────────── */}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback]}>
          <View style={styles.fallbackHalo} />
          <Ionicons
            name="restaurant-outline"
            size={56}
            color={colors.accent}
            style={{ opacity: 0.9 }}
          />
        </View>
      )}

      {/* ── Top contrast gradient (keeps wordmark + pill legible) ─────── */}
      <LinearGradient
        colors={['rgba(12,18,14,0.55)', 'rgba(12,18,14,0)']}
        locations={[0, 1]}
        style={styles.topGradient}
        pointerEvents="none"
      />

      {/* ── Bottom content-block gradient ──────────────────────────────── */}
      <LinearGradient
        colors={[
          'rgba(12,18,14,0)',
          'rgba(12,18,14,0.2)',
          'rgba(12,18,14,0.75)',
          'rgba(12,18,14,0.96)',
        ]}
        locations={[0, 0.28, 0.64, 1]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {/* ── Top row: wordmark + time pill ──────────────────────────────── */}
      <View style={styles.topRow}>
        <View style={styles.wordmark}>
          <View style={styles.wordmarkDot} />
          <Text style={styles.wordmarkText}>mealkit</Text>
        </View>

        <View style={styles.metaPill}>
          <Ionicons name="time-outline" size={11} color={colors.text} />
          <Text style={styles.metaPillText}>{totalTime} MIN</Text>
          <View style={styles.metaPillDot} />
          <Text style={styles.metaPillText}>{DIFFICULTY_LABEL[recipe.difficulty]}</Text>
        </View>
      </View>

      {/* ── Bottom content block ───────────────────────────────────────── */}
      <View style={styles.content}>
        <Text style={styles.kicker}>JUST COOKED</Text>

        <Text
          style={styles.name}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          allowFontScaling={false}
        >
          {recipe.name}
        </Text>

        <View style={styles.divider} />

        <View style={styles.statRow}>
          <Stat label="CAL" value={recipe.nutrition.calories.toString()} />
          <StatDivider />
          <Stat label="PROTEIN" value={`${recipe.nutrition.protein}g`} />
          <StatDivider />
          <Stat label="SERVES" value={recipe.servings.toString()} />
          <StatDivider />
          <Stat
            label="MATCH"
            value={`${Math.round(recipe.ingredientMatch.percent)}%`}
            accent
          />
        </View>

        {showWatermark && (
          <View style={styles.watermarkRow}>
            <Text style={styles.watermarkText}>
              Scan groceries · Cook smarter · mealkit.app
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, accent && { color: colors.accent }]}>
        {label}
      </Text>
      <Text style={[styles.statValue, accent && { color: colors.accent }]}>
        {value}
      </Text>
    </View>
  );
}

function StatDivider() {
  return <View style={styles.statDivider} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    // Subtle outer edge so the card has presence even against a similar background
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },

  // Fallback hero (no DALL-E image available)
  fallback: {
    backgroundColor: '#0F1810',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackHalo: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.accentDim,
    top: '22%',
  },

  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 320,
  },

  // Top row — wordmark + pill
  topRow: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wordmarkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  wordmarkText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: colors.text,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: 'rgba(12, 18, 14, 0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  metaPillText: {
    ...typography.label,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.text,
  },
  metaPillDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(232, 237, 233, 0.55)',
  },

  // Bottom content block
  content: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  kicker: {
    ...typography.label,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.accent,
  },
  name: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 34,
    color: colors.text,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    marginTop: spacing.xs,
    marginBottom: 2,
  },

  // Stats
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    gap: 3,
  },
  statLabel: {
    ...typography.label,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 20,
    color: colors.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    marginHorizontal: spacing.sm,
  },

  // Free-tier watermark row
  watermarkRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  watermarkText: {
    ...typography.caption,
    fontSize: 10,
    letterSpacing: 0.3,
    color: colors.textSecondary,
  },
});

export { RecipeShareCard };
