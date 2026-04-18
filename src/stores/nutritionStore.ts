import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateKey } from '@/utils/date';

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
}

export interface NutritionLogEntry {
  id: string;
  recipeId: string;
  recipeName: string;
  servings: number;
  date: string;     // YYYY-MM-DD
  loggedAt: string; // ISO timestamp
  macros: MacroTotals;
}

interface NutritionStore {
  log: NutritionLogEntry[];
  logMeal: (entry: Omit<NutritionLogEntry, 'id' | 'loggedAt'>) => void;
  removeEntry: (id: string) => void;
  getDailyTotals: (date: string) => MacroTotals;
  getWeeklySummary: () => { date: string; totals: MacroTotals }[];
  getEntriesForDate: (date: string) => NutritionLogEntry[];
}

function zero(): MacroTotals {
  return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 };
}

export const useNutritionStore = create<NutritionStore>()(
  persist(
    (set, get) => ({
      log: [],
      logMeal: (entry) =>
        set((state) => ({
          log: [
            ...state.log,
            {
              ...entry,
              id: Date.now().toString(36) + Math.random().toString(36).slice(2),
              loggedAt: new Date().toISOString(),
            },
          ],
        })),
      removeEntry: (id) =>
        set((state) => ({ log: state.log.filter((e) => e.id !== id) })),
      getDailyTotals: (date) =>
        get()
          .log.filter((e) => e.date === date)
          .reduce(
            (acc, e) => ({
              calories: acc.calories + e.macros.calories * e.servings,
              protein: acc.protein + e.macros.protein * e.servings,
              carbs: acc.carbs + e.macros.carbs * e.servings,
              fat: acc.fat + e.macros.fat * e.servings,
              fiber: acc.fiber + e.macros.fiber * e.servings,
              sugar: acc.sugar + e.macros.sugar * e.servings,
            }),
            zero()
          ),
      getWeeklySummary: () => {
        const days: { date: string; totals: MacroTotals }[] = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          d.setDate(d.getDate() - i);
          const date = getLocalDateKey(d);
          days.push({ date, totals: get().getDailyTotals(date) });
        }
        return days;
      },
      getEntriesForDate: (date) => get().log.filter((e) => e.date === date),
    }),
    {
      name: 'mealkit-nutrition',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
