import { Platform } from 'react-native';
import AppleHealthKit, { type HealthKitPermissions } from 'react-native-health';

interface NutritionMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface SaveFoodOptions {
  foodName: string;
  mealType: string;
  date: string;
  energy: number;
  protein: number;
  carbohydrates: number;
  fatTotal: number;
  fiber: number;
}

export function requestHealthPermissions(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return Promise.resolve(false);
  }

  const permissions: HealthKitPermissions = {
    permissions: {
      read: [],
      write: [
        AppleHealthKit.Constants.Permissions.EnergyConsumed,
        AppleHealthKit.Constants.Permissions.Carbohydrates,
        AppleHealthKit.Constants.Permissions.Protein,
        AppleHealthKit.Constants.Permissions.FatTotal,
        AppleHealthKit.Constants.Permissions.Fiber,
      ],
    },
  };

  return new Promise((resolve) => {
    AppleHealthKit.initHealthKit(permissions, (error) => {
      resolve(!error);
    });
  });
}

export function logNutrition(macros: NutritionMacros, date: Date): Promise<void> {
  if (Platform.OS !== 'ios') {
    return Promise.resolve();
  }

  const options: SaveFoodOptions = {
    foodName: 'Mealkit meal',
    mealType: 'Dinner',
    date: date.toISOString(),
    energy: macros.calories,
    protein: macros.protein,
    carbohydrates: macros.carbs,
    fatTotal: macros.fat,
    fiber: macros.fiber,
  };

  return new Promise((resolve, reject) => {
    AppleHealthKit.saveFood(options, (error) => {
      if (error) {
        reject(new Error(error));
        return;
      }

      resolve();
    });
  });
}
