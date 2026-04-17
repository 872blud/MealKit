import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { TIMING_ENTER, getStaggerDelay } from '@/theme/animations';
import {
  useRecipeStore,
  Recipe,
  RecipeFilters,
} from '@/stores/recipeStore';
import { useIngredientStore } from '@/stores/ingredientStore';
import { useUserStore } from '@/stores/userStore';
import { generateRecipes } from '@/services/claude';
import {
  trackRecipesScreenViewed,
  trackRecipeSwiped,
  trackRecipeTapped,
  trackRecipeSurpriseShuffled,
  trackRecipeFilterApplied,
} from '@/services/analytics';
import PressableScale from '@/components/PressableScale';
import EmptyState from '@/components/EmptyState';
import SkeletonLoader from '@/components/SkeletonLoader';
import RecipeSwipeDeck from '@/components/RecipeSwipeDeck';
import RecipeFilterSheet from '@/components/RecipeFilterSheet';

function hasActiveFilters(f: RecipeFilters): boolean {
  return (
    f.cuisine !== null ||
    f.dietary !== null ||
    f.cookTime !== null ||
    f.difficulty !== null ||
    f.calorieRange !== null
  );
}

export default function RecipesScreen() {
  const insets = useSafeAreaInsets();
  const { ingredients } = useIngredientStore();
  const { preferences } = useUserStore();
  const {
    recipes,
    loading,
    error,
    filters,
    currentIndex,
    setRecipes,
    setLoading,
    setError,
    setFilters,
    resetFilters,
    setCurrentIndex,
  } = useRecipeStore();

  const [sheetVisible, setSheetVisible] = useState(false);
  const viewLoggedRef = useRef(false);
  const initRef = useRef(false);

  // Guard: if no ingredients, bounce back to ingredient list
  useEffect(() => {
    if (ingredients.length === 0) {
      router.replace('/ingredients');
    }
  }, [ingredients.length]);

  const runGenerate = useCallback(
    async (overrideFilters?: RecipeFilters) => {
      if (ingredients.length === 0) return;
      const f = overrideFilters ?? filters;
      setLoading(true);
      setError(null);
      const result = await generateRecipes(ingredients, f, preferences);
      if (result.length === 0) {
        setError('Could not generate recipes right now.');
        setRecipes([]);
      } else {
        setRecipes(result);
        if (!viewLoggedRef.current) {
          trackRecipesScreenViewed(result.length);
          viewLoggedRef.current = true;
        }
      }
      setLoading(false);
    },
    [ingredients, filters, preferences, setLoading, setError, setRecipes]
  );

  // Mount: generate if the deck is empty, otherwise just log the view
  useEffect(() => {
    if (initRef.current) return;
    if (ingredients.length === 0) return;
    initRef.current = true;
    if (recipes.length > 0) {
      trackRecipesScreenViewed(recipes.length);
      viewLoggedRef.current = true;
    } else {
      runGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApply = (next: RecipeFilters) => {
    setFilters(next);
    trackRecipeFilterApplied({
      cuisine: next.cuisine,
      dietary: next.dietary,
      cookTime: next.cookTime,
      difficulty: next.difficulty,
      hasCalorieRange: next.calorieRange !== null,
    });
    setSheetVisible(false);
    viewLoggedRef.current = false;
    runGenerate(next);
  };

  const handleReset = () => {
    resetFilters();
    setSheetVisible(false);
    viewLoggedRef.current = false;
    runGenerate({
      cuisine: null,
      dietary: null,
      cookTime: null,
      difficulty: null,
      calorieRange: null,
    });
  };

  const handleTap = (recipe: Recipe) => {
    trackRecipeTapped(recipe.id, currentIndex);
    router.push(`/recipes/${recipe.id}`);
  };

  const handleSwipe = (direction: 'left' | 'right', index: number) => {
    trackRecipeSwiped(direction, index);
  };

  const handleSurprise = () => {
    if (recipes.length === 0) return;
    trackRecipeSurpriseShuffled();
    const idx = Math.floor(Math.random() * recipes.length);
    setCurrentIndex(idx);
  };

  const filtersActive = hasActiveFilters(filters);
  const remaining = Math.max(0, recipes.length - currentIndex);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <PressableScale onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </PressableScale>
          <View>
            <Text style={styles.title}>Recipes</Text>
            {!loading && recipes.length > 0 && remaining > 0 && (
              <Text style={styles.subtitle}>
                <Text style={styles.subtitleCount}>{remaining}</Text>
                {' '}of{' '}
                <Text style={styles.subtitleCount}>{recipes.length}</Text>
              </Text>
            )}
          </View>
        </View>

        <PressableScale
          onPress={() => setSheetVisible(true)}
          style={styles.filterBtn}
          accessibilityLabel="Filters"
        >
          <Ionicons name="options-outline" size={22} color={colors.text} />
          {filtersActive && <View style={styles.filterDot} />}
        </PressableScale>
      </View>

      {/* ── Body ───────────────────────────────────────────────── */}
      {loading ? (
        <LoadingDeck />
      ) : error ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Couldn't generate recipes"
          body="Check your connection and try again."
          action={{ label: 'Try again', onPress: () => runGenerate() }}
        />
      ) : recipes.length === 0 ? (
        <EmptyState
          icon="restaurant-outline"
          title="No recipes yet"
          body="Generate recipes from your ingredient list."
          action={{ label: 'Generate', onPress: () => runGenerate() }}
        />
      ) : (
        <RecipeSwipeDeck
          recipes={recipes}
          currentIndex={currentIndex}
          onIndexChange={setCurrentIndex}
          onTapRecipe={handleTap}
          onSwipe={handleSwipe}
          onSurpriseMe={handleSurprise}
        />
      )}

      {/* ── Filter sheet ─────────────────────────────────────── */}
      <RecipeFilterSheet
        visible={sheetVisible}
        filters={filters}
        onApply={handleApply}
        onReset={handleReset}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  );
}

// ─── Skeleton deck ─────────────────────────────────────────────────────────

function LoadingDeck() {
  return (
    <View style={styles.loadingDeck}>
      <SkeletonCard index={2} offset={16} scale={0.92} opacity={0.4} />
      <SkeletonCard index={1} offset={8} scale={0.96} opacity={0.7} />
      <SkeletonCard index={0} offset={0} scale={1} opacity={1} />
    </View>
  );
}

function SkeletonCard({
  index,
  offset,
  scale,
  opacity,
}: {
  index: number;
  offset: number;
  scale: number;
  opacity: number;
}) {
  const op = useSharedValue(0);
  const ty = useSharedValue(12);

  useEffect(() => {
    op.value = withDelay(getStaggerDelay(index), withTiming(opacity, TIMING_ENTER));
    ty.value = withDelay(getStaggerDelay(index), withTiming(offset, TIMING_ENTER));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: ty.value }, { scale }],
  }));

  return (
    <Animated.View style={[styles.skeletonCardWrap, style]}>
      <View style={styles.skeletonCard}>
        <SkeletonLoader height={26} width="70%" />
        <View style={styles.skeletonRow}>
          <SkeletonLoader height={14} width={60} />
          <SkeletonLoader height={14} width={50} />
        </View>
        <SkeletonLoader height={16} width="95%" />
        <SkeletonLoader height={16} width="80%" />
        <View style={styles.skeletonDivider} />
        <View style={styles.skeletonChipRow}>
          <SkeletonLoader height={22} width={52} borderRadius={100} />
          <SkeletonLoader height={22} width={52} borderRadius={100} />
          <SkeletonLoader height={22} width={52} borderRadius={100} />
          <SkeletonLoader height={22} width={52} borderRadius={100} />
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  subtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 1,
  },
  subtitleCount: {
    ...typography.smallMedium,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  filterBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.background,
  },
  loadingDeck: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  skeletonCardWrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    top: spacing.md,
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
    minHeight: 320,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  skeletonDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  skeletonChipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
});
