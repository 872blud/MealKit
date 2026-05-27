import Constants from 'expo-constants';
import { router } from 'expo-router';
import { NativeEventEmitter, NativeModules } from 'react-native';
import { posthog } from './analytics';

interface SuperwallNativeModule {
  addListener: (eventName: string) => void;
  configure: (
    apiKey: string,
    options: unknown,
    hasPurchaseController: boolean,
    version: string
  ) => Promise<void>;
  register: (
    placement: string,
    params: Record<string, unknown>,
    handlerId: string | null
  ) => Promise<void>;
  removeListeners: (count: number) => void;
}

interface EventPayload {
  eventInfo?: {
    event?: {
      event?: string;
      type?: string;
      error?: string;
    };
    params?: Record<string, unknown>;
  };
}

const SUPERWALL_VERSION = '2.1.7';
const superwallNative = NativeModules.SuperwallReactNative as SuperwallNativeModule | undefined;

let isConfigured = false;
let listenersBound = false;

function getSuperwallKey(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  return typeof extra.superwallApiKey === 'string' ? extra.superwallApiKey : '';
}

function getSuperwallEventType(payload: EventPayload): string | null {
  const event = payload.eventInfo?.event;
  if (!event) return null;
  return event.event ?? event.type ?? null;
}

function getSuperwallError(payload: EventPayload): string | undefined {
  return payload.eventInfo?.event?.error;
}

function bindListeners(): void {
  if (listenersBound || !superwallNative) return;

  const emitter = new NativeEventEmitter(superwallNative);

  emitter.addListener('didPresentPaywall', () => {
    posthog.capture('paywall_impression', { source: 'superwall' });
  });

  emitter.addListener('didDismissPaywall', () => {
    posthog.capture('paywall_dismissed', { source: 'superwall' });
  });

  emitter.addListener('handleSuperwallEvent', (payload: EventPayload) => {
    const eventType = getSuperwallEventType(payload);

    if (eventType === 'transactionStart') {
      posthog.capture('paywall_purchase_started', { source: 'superwall' });
      return;
    }

    if (eventType === 'transactionComplete') {
      posthog.capture('paywall_purchase_completed', { source: 'superwall' });
      return;
    }

    if (eventType === 'transactionFail') {
      posthog.capture('paywall_purchase_failed', {
        source: 'superwall',
        reason: getSuperwallError(payload) ?? 'unknown',
      });
    }
  });

  listenersBound = true;
}

export async function isPro(): Promise<boolean> {
  return false;
}

export function configureSuperwall(): void {
  if (isConfigured || !superwallNative) return;

  const apiKey = getSuperwallKey();
  if (!apiKey) return;

  bindListeners();
  isConfigured = true;

  void superwallNative
    .configure(apiKey, null, false, SUPERWALL_VERSION)
    .catch(() => {
      isConfigured = false;
    });
}

export async function presentPaywall(event: string): Promise<void> {
  try {
    if (!superwallNative) {
      throw new Error('Superwall unavailable');
    }

    await superwallNative.register(event, {}, null);
  } catch {
    router.push('/paywall');
  }
}
