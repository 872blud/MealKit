import Constants from 'expo-constants';

export const FREE_SCAN_LIMIT = 3;
export const FREE_RECIPE_LIMIT = 5;
export const BETA_SCAN_LIMIT = 15;
export const BETA_RECIPE_LIMIT = 30;

export function isBetaMode(): boolean {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  return extra.BETA_MODE === true || extra.BETA_MODE === 'true';
}

export function getScanLimit(): number {
  return isBetaMode() ? BETA_SCAN_LIMIT : FREE_SCAN_LIMIT;
}

export function getRecipeLimit(): number {
  return isBetaMode() ? BETA_RECIPE_LIMIT : FREE_RECIPE_LIMIT;
}
