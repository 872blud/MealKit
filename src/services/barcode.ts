import Constants from 'expo-constants';

export interface BarcodeProduct {
  name: string;
  category: string;
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    servingSize: string;
  };
  source: 'openfoodfacts' | 'usda' | 'manual';
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(En:|Fr:|De:)\b/gi, '')
    .trim();
}

function cleanProductName(name: string): string {
  // Remove size indicators and extra whitespace
  return name
    .replace(/\b\d+\s*(fl\s+)?(pk|pack|oz|g|kg|ml|l|lb|lbs|ct|count)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractCategory(tags: string[] | undefined): string {
  if (!tags || tags.length === 0) return 'other';
  const raw = tags[0].replace(/^en:/, '').split('-')[0];
  return raw || 'other';
}

async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function lookupOpenFoodFacts(barcode: string): Promise<BarcodeProduct | null> {
  try {
    const res = await fetchWithTimeout(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,generic_name,categories_tags,nutriments,serving_size`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    const rawName = p.generic_name || p.product_name || '';
    if (!rawName) return null;

    const name = toTitleCase(cleanProductName(rawName));
    const category = extractCategory(p.categories_tags);
    const n = p.nutriments;

    return {
      name,
      category,
      source: 'openfoodfacts',
      nutrition: n
        ? {
            calories: Math.round(n['energy-kcal_100g'] ?? 0),
            protein: Math.round((n['proteins_100g'] ?? 0) * 10) / 10,
            carbs: Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10,
            fat: Math.round((n['fat_100g'] ?? 0) * 10) / 10,
            fiber: Math.round((n['fiber_100g'] ?? 0) * 10) / 10,
            sugar: Math.round((n['sugars_100g'] ?? 0) * 10) / 10,
            servingSize: p.serving_size ?? '100g',
          }
        : undefined,
    };
  } catch {
    return null;
  }
}

async function lookupUSDA(barcode: string): Promise<BarcodeProduct | null> {
  // Note: USDA FDC search API is a text search, not a true barcode/UPC lookup.
  // Passing a barcode string rarely matches. This is a best-effort fallback.
  // A USDA_API_KEY is required; returns null if key is absent or search yields no match.
  const apiKey = (Constants.expoConfig?.extra as Record<string, string> | undefined)?.usdaApiKey ?? '';
  if (!apiKey) return null;
  try {
    const res = await fetchWithTimeout(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(barcode)}&api_key=${apiKey}&pageSize=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const food = data.foods?.[0];
    if (!food) return null;

    const name = toTitleCase(food.description ?? '');
    const getNutrient = (nutrientName: string): number => {
      const n = food.foodNutrients?.find((fn: { nutrientName: string; value: number }) =>
        fn.nutrientName?.toLowerCase().includes(nutrientName.toLowerCase())
      );
      return n ? Math.round((n.value ?? 0) * 10) / 10 : 0;
    };

    return {
      name,
      category: food.foodCategory?.toLowerCase() ?? 'other',
      source: 'usda',
      nutrition: {
        calories: Math.round(getNutrient('energy') || getNutrient('calorie')),
        protein: getNutrient('protein'),
        carbs: getNutrient('carbohydrate'),
        fat: getNutrient('total lipid'),
        fiber: getNutrient('fiber'),
        sugar: getNutrient('sugars'),
        servingSize: '100g',
      },
    };
  } catch {
    return null;
  }
}

export async function lookupBarcode(barcode: string): Promise<BarcodeProduct | null> {
  const off = await lookupOpenFoodFacts(barcode);
  if (off) return off;
  return lookupUSDA(barcode);
}
