import { Ingredient } from '@/stores/ingredientStore';
import { Recipe, RecipeFilters } from '@/stores/recipeStore';
import { UserPreferences } from '@/stores/userStore';
import {
  trackRecipeGenerationStarted,
  trackRecipeGenerationFailed,
} from '@/services/analytics';
import { addDeveloperLog } from '@/stores/developerStore';

export interface RecipeGenerationResult {
  recipes: Recipe[];
  error: string | null;
  debugDetails: string | null;
}

export async function generateRecipes(
  ingredients: Ingredient[],
  filters: RecipeFilters,
  preferences: UserPreferences
): Promise<RecipeGenerationResult> {
  void filters;
  void preferences;

  if (ingredients.length === 0) {
    const message = 'Recipe generation skipped because ingredient list is empty.';
    addDeveloperLog({
      level: 'warn',
      source: 'Recipe generation',
      message,
    });
    return { recipes: [], error: message, debugDetails: null };
  }

  trackRecipeGenerationStarted(ingredients.length);
  trackRecipeGenerationFailed();

  const message = 'Recipe ideas are not configured in this public build.';
  addDeveloperLog({
    level: 'warn',
    source: 'Recipe generation',
    message,
  });

  return { recipes: [], error: message, debugDetails: null };
}
