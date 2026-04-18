import Constants, { ExecutionEnvironment } from 'expo-constants';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';

let purchasesConfigured = false;
let expoGoWarningShown = false;

function getRevenueCatKey(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  return typeof extra.revenuecatApiKey === 'string' ? extra.revenuecatApiKey : '';
}

function isExpoGo(): boolean {
  return (
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

function canUseNativePurchases(): boolean {
  return !isExpoGo() && getRevenueCatKey().length > 0;
}

function warnExpoGoOnce(): void {
  if (expoGoWarningShown) return;
  expoGoWarningShown = true;
  console.log(
    'Expo Go detected. Skipping RevenueCat native configuration. Use a development build or Test Store key for purchases.'
  );
}

export function configurePurchases(userId?: string): void {
  const apiKey = getRevenueCatKey();
  if (!apiKey) return;
  if (isExpoGo()) {
    warnExpoGoOnce();
    return;
  }
  if (purchasesConfigured) return;

  if (__DEV__) {
    void Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  try {
    Purchases.configure({
      apiKey,
      appUserID: userId,
    });
    purchasesConfigured = true;
  } catch (error) {
    console.log(`RevenueCat configuration skipped: ${String(error)}`);
  }
}

export async function isPro(): Promise<boolean> {
  if (!canUseNativePurchases()) return false;

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active.pro?.isActive ?? false;
  } catch {
    return false;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo> {
  if (!canUseNativePurchases()) {
    throw new Error('RevenueCat is unavailable in Expo Go. Use a development build.');
  }
  return Purchases.getCustomerInfo();
}

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  if (!canUseNativePurchases()) return null;
  return Purchases.getOfferings();
}

export async function purchasePackage(aPackage: PurchasesPackage): Promise<CustomerInfo> {
  if (!canUseNativePurchases()) {
    throw new Error('RevenueCat is unavailable in Expo Go. Use a development build.');
  }
  const { customerInfo } = await Purchases.purchasePackage(aPackage);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!canUseNativePurchases()) return null;
  return Purchases.restorePurchases();
}
