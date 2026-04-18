import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalMonthKey } from '@/utils/date';

export interface UserPreferences {
  dietaryRestrictions: string[];
  skill: 'beginner' | 'intermediate' | 'advanced';
  cuisines: string[];
  dailyCalorieTarget: number;
  dailyMacroTargets: {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
}

const defaultPreferences: UserPreferences = {
  dietaryRestrictions: [],
  skill: 'intermediate',
  cuisines: [],
  dailyCalorieTarget: 2000,
  dailyMacroTargets: { protein: 150, carbs: 225, fat: 65, fiber: 28 },
};

interface UserStore {
  onboardingComplete: boolean;
  preferences: UserPreferences;
  scanCount: number;
  recipeCount: number;
  lastResetMonth: string; // YYYY-MM
  setOnboardingComplete: (complete: boolean) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  incrementScanCount: () => void;
  incrementRecipeCount: () => void;
  checkAndResetMonthly: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      onboardingComplete: false,
      preferences: defaultPreferences,
      scanCount: 0,
      recipeCount: 0,
      lastResetMonth: getLocalMonthKey(),
      setOnboardingComplete: (onboardingComplete) => set({ onboardingComplete }),
      updatePreferences: (prefs) =>
        set((state) => ({ preferences: { ...state.preferences, ...prefs } })),
      incrementScanCount: () => {
        get().checkAndResetMonthly();
        set((state) => ({ scanCount: state.scanCount + 1 }));
      },
      incrementRecipeCount: () => {
        get().checkAndResetMonthly();
        set((state) => ({ recipeCount: state.recipeCount + 1 }));
      },
      checkAndResetMonthly: () => {
        const currentMonth = getLocalMonthKey();
        if (get().lastResetMonth !== currentMonth) {
          set({ scanCount: 0, recipeCount: 0, lastResetMonth: currentMonth });
        }
      },
    }),
    {
      name: 'mealkit-user',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
