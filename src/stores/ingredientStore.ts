import { create } from 'zustand';

export interface Ingredient {
  id: string;
  name: string;
  category: string;
  source: 'barcode' | 'receipt' | 'photo' | 'manual';
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    servingSize: string;
  };
}

interface IngredientStore {
  ingredients: Ingredient[];
  addIngredient: (ingredient: Omit<Ingredient, 'id'>) => void;
  removeIngredient: (id: string) => void;
  clearIngredients: () => void;
}

export const useIngredientStore = create<IngredientStore>((set) => ({
  ingredients: [],
  addIngredient: (ingredient) =>
    set((state) => ({
      ingredients: [
        ...state.ingredients,
        { ...ingredient, id: Date.now().toString() + Math.random().toString(36).slice(2) },
      ],
    })),
  removeIngredient: (id) =>
    set((state) => ({ ingredients: state.ingredients.filter((i) => i.id !== id) })),
  clearIngredients: () => set({ ingredients: [] }),
}));
