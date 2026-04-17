import Constants from 'expo-constants';
import { Ingredient } from '@/stores/ingredientStore';
import { Recipe, RecipeFilters } from '@/stores/recipeStore';
import { UserPreferences } from '@/stores/userStore';

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
    typeof r.aiReasoning === 'string'
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

  return `You are a culinary AI assistant. Generate 3–5 recipes using the ingredients below.

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
6. nutrition values are per serving.
7. chefTips: 1–3 practical tips per recipe.
8. aiReasoning: exactly one sentence explaining why this recipe fits the user.
9. Generate a unique id for each recipe (short alphanumeric string).

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
    "aiReasoning": "string"
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
    if (!response.ok) throw new Error(`Anthropic API error ${response.status}`);

    const data = await response.json();
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
): Promise<Recipe[]> {
  const apiKey = getKey();
  if (!apiKey || ingredients.length === 0) return [];

  const prompt = buildPrompt(ingredients, filters, preferences);

  try {
    return await callAPI(prompt, apiKey);
  } catch {
    // Retry once on failure
    try {
      return await callAPI(prompt, apiKey);
    } catch {
      return [];
    }
  }
}
