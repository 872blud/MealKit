import PostHog from 'posthog-react-native';
import Constants from 'expo-constants';

const apiKey =
  (Constants.expoConfig?.extra as Record<string, string> | undefined)?.posthogApiKey ?? '';

export const posthog = new PostHog(apiKey, {
  host: 'https://us.i.posthog.com',
  disabled: !apiKey,
});

// ─── Scan funnel ─────────────────────────────────────────────────────────────

export function trackBarcodeResolved(name: string, category: string) {
  posthog.capture('barcode_item_resolved', { name, category });
}

export function trackBarcodeFailed() {
  posthog.capture('barcode_item_failed');
}

export function trackScanCompleted(mode: 'barcode' | 'receipt' | 'photo', itemCount: number) {
  posthog.capture('scan_completed', { mode, item_count: itemCount });
}

export function trackScanFailed(mode: 'receipt' | 'photo') {
  posthog.capture('scan_failed', { mode });
}

// ─── Ingredient list ─────────────────────────────────────────────────────────

export function trackIngredientListViewed(ingredientCount: number) {
  posthog.capture('ingredient_list_viewed', { ingredient_count: ingredientCount });
}

export function trackIngredientAddedManual() {
  posthog.capture('ingredient_added_manual');
}

export function trackIngredientRemoved() {
  posthog.capture('ingredient_removed');
}

// ─── Recipe generation ───────────────────────────────────────────────────────

export function trackGetRecipesTapped(ingredientCount: number) {
  posthog.capture('get_recipes_tapped', { ingredient_count: ingredientCount });
}

export function trackPaywallHit(trigger: 'recipe_limit' | 'scan_limit') {
  posthog.capture('paywall_hit', { trigger });
}

export function trackRecipeGenerationStarted(ingredientCount: number) {
  posthog.capture('recipe_generation_started', { ingredient_count: ingredientCount });
}

export function trackRecipeGenerationSucceeded(recipeCount: number) {
  posthog.capture('recipe_generation_succeeded', { recipe_count: recipeCount });
}

export function trackRecipeGenerationFailed() {
  posthog.capture('recipe_generation_failed');
}
