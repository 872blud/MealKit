import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RecipeIngredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface RecipeNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
}

export interface IngredientMatch {
  percent: number;
  missing: string[];
  substitutions: Record<string, string>;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  cookTime: number;
  prepTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  servings: number;
  nutrition: RecipeNutrition;
  chefTips: string[];
  ingredientMatch: IngredientMatch;
  aiReasoning: string;
}

export interface RecipeFilters {
  cuisine: string | null;
  dietary: string | null;
  cookTime: number | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  calorieRange: { min: number; max: number } | null;
}

const defaultFilters: RecipeFilters = {
  cuisine: null,
  dietary: null,
  cookTime: null,
  difficulty: null,
  calorieRange: null,
};

interface RecipeStore {
  recipes: Recipe[];
  loading: boolean;
  error: string | null;
  filters: RecipeFilters;
  currentIndex: number;
  setRecipes: (recipes: Recipe[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<RecipeFilters>) => void;
  resetFilters: () => void;
  setCurrentIndex: (index: number) => void;
  clearRecipes: () => void;
}

export const useRecipeStore = create<RecipeStore>()(
  persist(
    (set) => ({
      recipes: [],
      loading: false,
      error: null,
      filters: defaultFilters,
      currentIndex: 0,
      setRecipes: (recipes) => set({ recipes, currentIndex: 0 }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setFilters: (filters) =>
        set((state) => ({ filters: { ...state.filters, ...filters } })),
      resetFilters: () => set({ filters: defaultFilters }),
      setCurrentIndex: (currentIndex) => set({ currentIndex }),
      clearRecipes: () => set({ recipes: [], currentIndex: 0, error: null }),
    }),
    {
      name: 'mealkit-recipes',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist filters; recipes are regenerated each session
      partialize: (state) => ({ filters: state.filters }),
    }
  )
);
