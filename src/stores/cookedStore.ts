import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '@/stores/recipeStore';

export interface CookedEntry {
  id: string;
  recipe: Recipe;
  cookedAt: string; // ISO date string
}

interface CookedStore {
  entries: CookedEntry[];
  addCooked: (recipe: Recipe) => void;
  clearHistory: () => void;
}

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export const useCookedStore = create<CookedStore>()(
  persist(
    (set) => ({
      entries: [],
      addCooked: (recipe) =>
        set((state) => ({
          entries: [
            { id: makeId(), recipe, cookedAt: new Date().toISOString() },
            ...state.entries,
          ].slice(0, 100),
        })),
      clearHistory: () => set({ entries: [] }),
    }),
    {
      name: 'mealkit-cooked',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
