import { useEffect } from 'react';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { PostHogProvider } from 'posthog-react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_900Black,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_400Regular_Italic,
} from '@expo-google-fonts/playfair-display';
import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
} from '@expo-google-fonts/archivo';
import { colors } from '@/theme/colors';
import { useUserStore } from '@/stores/userStore';
import { posthog } from '@/services/analytics';
import { configureSuperwall } from '@/services/superwall';

const sentryDsn = Constants.expoConfig?.extra?.sentryDsn;

if (typeof sentryDsn === 'string' && sentryDsn.length > 0) {
  Sentry.init({ dsn: sentryDsn, enableNative: true, debug: false });
}

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_900Black,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_400Regular_Italic,
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    useUserStore.getState().checkAndResetMonthly();
    configureSuperwall();
  }, []);

  if (!fontsLoaded && !fontError) return null;

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

export default Sentry.wrap(RootLayout);
