import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  setFromScan: (ingredients: Omit<Ingredient, 'id'>[]) => void;
}

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export const useIngredientStore = create<IngredientStore>()(
  persist(
    (set) => ({
      ingredients: [],
      addIngredient: (ingredient) =>
        set((state) => ({
          ingredients: [...state.ingredients, { ...ingredient, id: makeId() }],
        })),
      removeIngredient: (id) =>
        set((state) => ({
          ingredients: state.ingredients.filter((i) => i.id !== id),
        })),
      clearIngredients: () => set({ ingredients: [] }),
      setFromScan: (ingredients) =>
        set((state) => ({
          ingredients: [
            ...state.ingredients,
            ...ingredients.map((i) => ({ ...i, id: makeId() })),
          ],
        })),
    }),
    {
      name: 'mealkit-ingredients',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
