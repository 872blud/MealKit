import Constants from 'expo-constants';
import { Ingredient } from '@/stores/ingredientStore';
import { Recipe, RecipeFilters } from '@/stores/recipeStore';
import { UserPreferences } from '@/stores/userStore';
import {
  trackRecipeGenerationStarted,
  trackRecipeGenerationSucceeded,
  trackRecipeGenerationFailed,
} from '@/services/analytics';
import { addDeveloperLog } from '@/stores/developerStore';

export interface RecipeGenerationResult {
  recipes: Recipe[];
  error: string | null;
  debugDetails: string | null;
}

interface RecipeGenerationError extends Error {
  debugDetails?: string;
}

function trimDebugDetails(value: string): string {
  return value.length > 1200 ? `${value.slice(0, 1200)}...` : value;
}

function buildApiError(status: number, responseText: string): RecipeGenerationError {
  let message = `Anthropic API ${status}`;
  try {
    const parsed = JSON.parse(responseText) as {
      error?: { message?: string; type?: string };
    };
    if (parsed.error?.message) {
      message = `Anthropic API ${status}: ${parsed.error.message}`;
    }
  } catch {
    if (responseText.trim().length > 0) {
      message = `Anthropic API ${status}: ${responseText.trim().slice(0, 180)}`;
    }
  }

  const error = new Error(message) as RecipeGenerationError;
  error.debugDetails = trimDebugDetails(responseText);
  return error;
}

function normalizeError(error: unknown): { message: string; details: string | null } {
  if (error instanceof Error) {
    const debugDetails = (error as RecipeGenerationError).debugDetails;
    return {
      message: error.message,
      details: typeof debugDetails === 'string' ? debugDetails : null,
    };
  }

  return { message: String(error), details: null };
}

function getKey(): string {
  return (Constants.expoConfig?.extra as Record<string, string> | undefined)?.anthropicApiKey ?? '';
}

function isValidRecipe(obj: unknown): obj is Recipe {
  if (typeof obj !== 'object' || obj === null) return false;
  const r = obj as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.name === 'string' &&
    Array.isArray(r.ingredients) &&
    Array.isArray(r.steps) &&
    typeof r.cookTime === 'number' &&
    typeof r.prepTime === 'number' &&
    ['easy', 'medium', 'hard'].includes(r.difficulty as string) &&
    typeof r.servings === 'number' &&
    typeof r.nutrition === 'object' && r.nutrition !== null &&
    Array.isArray(r.chefTips) &&
    typeof r.ingredientMatch === 'object' && r.ingredientMatch !== null &&
    typeof r.aiReasoning === 'string' &&
    typeof r.cuisine === 'string'
  );
}

function buildPrompt(
  ingredients: Ingredient[],
  filters: RecipeFilters,
  preferences: UserPreferences
): string {
  const ingredientList = ingredients.map((i) => `- ${i.name} (${i.category})`).join('\n');

  const filterLines: string[] = [];
  if (filters.cuisine) filterLines.push(`Cuisine: ${filters.cuisine}`);
  if (filters.dietary) filterLines.push(`Dietary: ${filters.dietary}`);
  if (filters.cookTime) filterLines.push(`Max cook time: ${filters.cookTime} minutes`);
  if (filters.difficulty) filterLines.push(`Difficulty: ${filters.difficulty}`);
  if (filters.calorieRange) {
    filterLines.push(`Calorie range: ${filters.calorieRange.min}–${filters.calorieRange.max} kcal per serving`);
  }

  const prefLines: string[] = [
    `Skill level: ${preferences.skill}`,
    `Daily calorie target: ${preferences.dailyCalorieTarget} kcal`,
    `Daily macro targets: protein ${preferences.dailyMacroTargets.protein}g, carbs ${preferences.dailyMacroTargets.carbs}g, fat ${preferences.dailyMacroTargets.fat}g, fiber ${preferences.dailyMacroTargets.fiber}g`,
  ];
  if (preferences.dietaryRestrictions.length > 0) {
    prefLines.push(`Dietary restrictions: ${preferences.dietaryRestrictions.join(', ')}`);
  }
  if (preferences.cuisines.length > 0) {
    prefLines.push(`Preferred cuisines: ${preferences.cuisines.join(', ')}`);
  }

  const activeRestrictions = [
    ...preferences.dietaryRestrictions,
    ...(filters.dietary ? [filters.dietary] : []),
  ].map((r) => r.toLowerCase());
  const isVegan = activeRestrictions.includes('vegan');
  const isDairyFree = activeRestrictions.includes('dairy-free');
  const basePantry = ['salt', 'black pepper', 'olive oil', 'vegetable oil', 'water', 'garlic'];
  if (!isVegan && !isDairyFree) basePantry.push('butter');
  const pantryList = basePantry.join(', ');

  return `You are Sous, the culinary AI behind Mealkit. Your only job is to generate realistic, delicious recipes from the exact ingredients the user has available.

Assume these pantry staples are always available: ${pantryList}. Do not assume anything else beyond the scanned list and this pantry staple list.

Available ingredients:
${ingredientList}

User preferences:
${prefLines.join('\n')}

Active filters:
${filterLines.length > 0 ? filterLines.join('\n') : 'None'}

Rules:
1. Rank recipes by ingredient match % — highest match first.
2. Each recipe must use at least 50% of the available ingredients.
3. List any ingredients the user would need to buy in ingredientMatch.missing.
4. ingredientMatch.substitutions maps missing items to available-ingredient substitutes where possible.
5. steps must be clear, numbered cooking instructions (strings, not objects).
6. Each step must include a realistic time estimate in parentheses, e.g. "Sauté onions until translucent (4–5 min)". Use technique language: fold, sear, deglaze, simmer — not "cook until done".
7. nutrition values are per serving.
8. chefTips: 1–3 practical tips per recipe.
9. aiReasoning: one sentence explaining the specific combination of scanned ingredients that makes this recipe work. Never start with "This recipe". Never mention "Claude" or "AI" or "Sous".
10. CRITICAL: Never suggest a recipe that requires an ingredient not in the scanned list or pantry staples above. If you cannot create a viable recipe without hallucinating ingredients, reduce the number of recipes returned — returning fewer real recipes is better than padding with impossible ones.
11. Generate a unique id for each recipe (short alphanumeric string).

Return ONLY a valid JSON array — no markdown fences, no explanation, no trailing text.

Schema:
[
  {
    "id": "string",
    "name": "string",
    "ingredients": [{ "name": "string", "quantity": "string", "unit": "string" }],
    "steps": ["string"],
    "cookTime": number,
    "prepTime": number,
    "difficulty": "easy" | "medium" | "hard",
    "servings": number,
    "nutrition": {
      "calories": number, "protein": number, "carbs": number,
      "fat": number, "fiber": number, "sugar": number
    },
    "chefTips": ["string"],
    "ingredientMatch": {
      "percent": number,
      "missing": ["string"],
      "substitutions": { "missing_item": "substitute" }
    },
    "aiReasoning": "string",
    "cuisine": "string (Italian|Asian|Mediterranean|Mexican|American|Indian|French|Middle Eastern|Other)"
  }
]`;
}

async function callAPI(prompt: string, apiKey: string): Promise<Recipe[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    clearTimeout(timeout);
    const responseText = await response.text();
    if (!response.ok) throw buildApiError(response.status, responseText);

    const data = JSON.parse(responseText);
    const text: string = data.content?.[0]?.text ?? '';

    // Non-greedy match to extract JSON array — consistent with Phase 2 pattern
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) throw new Error('No JSON array in response');

    const parsed: unknown = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) throw new Error('Parsed value is not an array');

    return parsed.filter(isValidRecipe);
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

export async function generateRecipes(
  ingredients: Ingredient[],
  filters: RecipeFilters,
  preferences: UserPreferences
): Promise<RecipeGenerationResult> {
  const apiKey = getKey();
  if (!apiKey) {
    const message = 'Missing ANTHROPIC_API_KEY in Expo config.';
    addDeveloperLog({
      level: 'error',
      source: 'Recipe generation',
      message,
    });
    return { recipes: [], error: message, debugDetails: null };
  }

  if (ingredients.length === 0) {
    const message = 'Recipe generation skipped because ingredient list is empty.';
    addDeveloperLog({
      level: 'warn',
      source: 'Recipe generation',
      message,
    });
    return { recipes: [], error: message, debugDetails: null };
  }

  const prompt = buildPrompt(ingredients, filters, preferences);
  trackRecipeGenerationStarted(ingredients.length);
  addDeveloperLog({
    level: 'info',
    source: 'Recipe generation',
    message: 'Starting Anthropic recipe generation.',
    details: `ingredients=${ingredients.length}; filters=${JSON.stringify(filters)}`,
  });

  try {
    const recipes = await callAPI(prompt, apiKey);
    trackRecipeGenerationSucceeded(recipes.length);
    addDeveloperLog({
      level: recipes.length > 0 ? 'info' : 'warn',
      source: 'Recipe generation',
      message:
        recipes.length > 0
          ? `Generated ${recipes.length} recipes.`
          : 'Anthropic returned no valid recipes.',
    });
    return {
      recipes,
      error: recipes.length > 0 ? null : 'Anthropic returned no valid recipes.',
      debugDetails: null,
    };
  } catch (firstError) {
    const first = normalizeError(firstError);
    addDeveloperLog({
      level: 'warn',
      source: 'Recipe generation',
      message: `${first.message}. Retrying once.`,
      details: first.details ?? undefined,
    });

    // Retry once on failure
    try {
      const recipes = await callAPI(prompt, apiKey);
      trackRecipeGenerationSucceeded(recipes.length);
      addDeveloperLog({
        level: recipes.length > 0 ? 'info' : 'warn',
        source: 'Recipe generation',
        message:
          recipes.length > 0
            ? `Retry generated ${recipes.length} recipes.`
            : 'Retry returned no valid recipes.',
      });
      return {
        recipes,
        error: recipes.length > 0 ? null : 'Anthropic retry returned no valid recipes.',
        debugDetails: null,
      };
    } catch (secondError) {
      const second = normalizeError(secondError);
      trackRecipeGenerationFailed();
      addDeveloperLog({
        level: 'error',
        source: 'Recipe generation',
        message: second.message,
        details: second.details ?? first.details ?? undefined,
      });
      return {
        recipes: [],
        error: second.message,
        debugDetails: second.details ?? first.details,
      };
    }
  }
}
