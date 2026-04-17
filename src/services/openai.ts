import Constants from 'expo-constants';

// ─── Key helper ──────────────────────────────────────────────────────────────

function getOpenAIKey(): string {
  return (Constants.expoConfig?.extra as Record<string, string> | undefined)?.openaiApiKey ?? '';
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExtractedIngredient {
  name: string;     // Generic name, title case, brand stripped
  category: string; // 'produce' | 'dairy' | 'meat' | 'seafood' | 'grain' | 'snack' | 'beverage' | 'condiment' | 'frozen' | 'other'
}

// ─── Receipt OCR ─────────────────────────────────────────────────────────────

export async function extractReceiptIngredients(base64Image: string): Promise<ExtractedIngredient[]> {
  const apiKey = getOpenAIKey();
  if (!apiKey) return [];

  const systemPrompt = `You are a grocery receipt parser. Extract only food/beverage items from the receipt image.
Rules:
- Strip brand names: "Kirkland Organic Chicken Breast" → "chicken breast"
- Remove sizes: "16oz", "2pk", "500g" from names
- Skip non-food items: cleaning supplies, paper goods, pharmacy items, alcohol
- Return generic ingredient names in title case
- Categorize each item: produce, dairy, meat, seafood, grain, snack, beverage, condiment, frozen, other
- Return a JSON array: [{"name": "...", "category": "..."}]
- Return ONLY the JSON array, no other text`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s for vision

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1000,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'high',
                },
              },
              {
                type: 'text',
                text: 'Extract all food items from this receipt.',
              },
            ],
          },
        ],
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) return [];

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    // Parse JSON — handle markdown code block wrapper
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item: unknown) =>
        typeof item === 'object' && item !== null &&
        'name' in item && 'category' in item &&
        typeof (item as Record<string, unknown>).name === 'string'
      )
      .map((item: Record<string, unknown>) => ({
        name: String(item.name).trim(),
        category: String(item.category ?? 'other').trim().toLowerCase(),
      }));
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

// ─── Counter photo ID ─────────────────────────────────────────────────────────

export async function identifyCounterIngredients(base64Image: string): Promise<ExtractedIngredient[]> {
  const apiKey = getOpenAIKey();
  if (!apiKey) return [];

  const systemPrompt = `You are a kitchen ingredient identifier. Look at this photo and identify every food ingredient visible.
Rules:
- Identify fresh produce, vegetables, fruits, proteins, grains, dairy, and any other food items
- Return generic names (not brand names): "chicken breast" not "Perdue Chicken"
- Ignore packaging, utensils, appliances, and non-food items
- Return a JSON array: [{"name": "...", "category": "..."}]
- Categories: produce, dairy, meat, seafood, grain, snack, beverage, condiment, frozen, other
- Return ONLY the JSON array, no other text`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1000,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: 'high' },
              },
              { type: 'text', text: 'Identify all food ingredients visible in this photo.' },
            ],
          },
        ],
      }),
    });

    clearTimeout(timeout);
    if (!response.ok) return [];

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item: unknown) =>
        typeof item === 'object' && item !== null &&
        'name' in item && 'category' in item &&
        typeof (item as Record<string, unknown>).name === 'string'
      )
      .map((item: Record<string, unknown>) => ({
        name: String(item.name).trim(),
        category: String(item.category ?? 'other').trim().toLowerCase(),
      }));
  } catch {
    clearTimeout(timeout);
    return [];
  }
}
