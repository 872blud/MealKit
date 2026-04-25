export interface ExtractedIngredient {
  name: string;
  category: string;
}

export async function extractReceiptIngredients(
  base64Image: string
): Promise<ExtractedIngredient[]> {
  void base64Image;
  return [];
}

export async function identifyCounterIngredients(
  base64Image: string
): Promise<ExtractedIngredient[]> {
  void base64Image;
  return [];
}
