import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { PostHogProvider } from 'posthog-react-native';
import { colors } from '@/theme/colors';
import { useUserStore } from '@/stores/userStore';
import { posthog } from '@/services/analytics';

export default function RootLayout() {
  useEffect(() => {
    // Run after zustand-persist has had a tick to rehydrate from AsyncStorage
    const id = setTimeout(() => {
      useUserStore.getState().checkAndResetMonthly();
    }, 100);
    return () => clearTimeout(id);
  }, []);

  return (
    <PostHogProvider client={posthog}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </PostHogProvider>
  );
}
