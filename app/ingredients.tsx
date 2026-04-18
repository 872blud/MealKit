import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useIngredientStore, Ingredient } from '@/stores/ingredientStore';
import { useUserStore } from '@/stores/userStore';
import { getRecipeLimit } from '@/config/limits';
import IngredientRow from '@/components/IngredientRow';
import EmptyState from '@/components/EmptyState';
import PressableScale from '@/components/PressableScale';
import {
  trackIngredientListViewed,
  trackIngredientAddedManual,
  trackIngredientRemoved,
  trackGetRecipesTapped,
  trackPaywallHit,
} from '@/services/analytics';
import { presentPaywall } from '@/services/superwall';
import { isPro } from '@/services/purchases';

const SOURCE_ICONS: Record<Ingredient['source'], keyof typeof Ionicons.glyphMap> = {
  barcode: 'barcode-outline',
  receipt: 'receipt-outline',
  photo: 'camera-outline',
  manual: 'pencil-outline',
};

export default function IngredientsScreen() {
  const insets = useSafeAreaInsets();
  const { ingredients, addIngredient, removeIngredient, clearIngredients } = useIngredientStore();
  const [manualText, setManualText] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    trackIngredientListViewed(ingredients.length);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sourceCounts = ingredients.reduce<Partial<Record<Ingredient['source'], number>>>(
    (acc, i) => {
      acc[i.source] = (acc[i.source] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const activeSources = (
    Object.keys(sourceCounts) as Ingredient['source'][]
  ).filter((s) => (sourceCounts[s] ?? 0) > 0);

  const handleManualAdd = () => {
    const name = manualText.trim();
    if (!name) return;
    addIngredient({ name, category: 'other', source: 'manual' });
    trackIngredientAddedManual();
    setManualText('');
  };

  const handleRemove = (id: string) => {
    removeIngredient(id);
    trackIngredientRemoved();
  };

  const handleGetRecipes = async () => {
    const userState = useUserStore.getState();
    userState.checkAndResetMonthly();
    const proUser = await isPro().catch(() => false);
    if (!proUser && useUserStore.getState().recipeCount >= getRecipeLimit()) {
      trackPaywallHit('recipe_limit');
      await presentPaywall('recipe_limit_reached');
      return;
    }
    trackGetRecipesTapped(ingredients.length);
    router.push('/recipes');
  };

  const handleNewScan = () => {
    clearIngredients();
    router.navigate('/(tabs)/scan');
  };

  const canGetRecipes = ingredients.length > 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <PressableScale onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </PressableScale>
            <View>
              <Text style={styles.title}>Your Ingredients</Text>
              {ingredients.length > 0 && (
                <Text style={styles.subtitle}>
                  <Text style={styles.subtitleCount}>{ingredients.length}</Text>
                  {' '}item{ingredients.length !== 1 ? 's' : ''} added
                </Text>
              )}
            </View>
          </View>
          <PressableScale
            onPress={handleNewScan}
            style={styles.newScanBtn}
          >
            <Ionicons name="scan-outline" size={15} color={colors.accent} />
            <Text style={styles.newScanLabel}>New Scan</Text>
          </PressableScale>
        </View>

        {/* ── Source badges ── */}
        {activeSources.length > 0 && (
          <View style={styles.badges}>
            {activeSources.map((source) => (
              <View key={source} style={styles.badge}>
                <Ionicons
                  name={SOURCE_ICONS[source]}
                  size={12}
                  color={colors.textSecondary}
                />
                <Text style={styles.badgeCount}>{sourceCounts[source]}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── List or empty state ── */}
        {ingredients.length === 0 ? (
          <EmptyState
            icon="basket-outline"
            title="Nothing scanned yet"
            body="Scan a receipt, barcode, or snap a photo of your counter to add ingredients."
            action={{ label: 'Start Scanning', onPress: handleNewScan }}
          />
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {ingredients.map((ingredient, index) => (
              <IngredientRow
                key={ingredient.id}
                ingredient={ingredient}
                index={index}
                onRemove={handleRemove}
              />
            ))}
          </ScrollView>
        )}

        {/* ── Bottom bar ── */}
        <View
          style={[
            styles.bottom,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.lg },
          ]}
        >
          {/* Manual add */}
          <View style={styles.manualRow}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={manualText}
              onChangeText={setManualText}
              placeholder="Add ingredient manually..."
              placeholderTextColor={colors.textDisabled}
              returnKeyType="done"
              onSubmitEditing={handleManualAdd}
            />
            <PressableScale
              onPress={handleManualAdd}
              disabled={!manualText.trim()}
              style={styles.addIconBtn}
            >
              <Ionicons
                name="add-circle"
                size={30}
                color={manualText.trim() ? colors.accent : colors.textDisabled}
              />
            </PressableScale>
          </View>

          {/* Get Recipes CTA */}
          <PressableScale
            onPress={handleGetRecipes}
            disabled={!canGetRecipes}
            style={[styles.cta, !canGetRecipes && styles.ctaDisabled]}
          >
            <Text style={[styles.ctaLabel, !canGetRecipes && styles.ctaLabelDisabled]}>
              Get Recipes
            </Text>
            {canGetRecipes && (
              <Ionicons
                name="arrow-forward"
                size={18}
                color={colors.onAccent}
                style={{ marginLeft: spacing.sm }}
              />
            )}
          </PressableScale>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

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
  newScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  newScanLabel: {
    ...typography.smallMedium,
    color: colors.accent,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  badgeCount: {
    ...typography.caption,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.sm,
  },
  bottom: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    minHeight: 48,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  addIconBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  ctaDisabled: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  ctaLabel: {
    ...typography.bodyMedium,
    color: colors.onAccent,
  },
  ctaLabelDisabled: {
    color: colors.textDisabled,
  },
});
