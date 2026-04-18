import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { colors } from '@/theme/colors';
import { useUserStore } from '@/stores/userStore';

export default function Index() {
  const [hydrated, setHydrated] = useState(useUserStore.persist.hasHydrated());
  const onboardingComplete = useUserStore((s) => s.onboardingComplete);

  useEffect(() => {
    if (hydrated) return;
    if (useUserStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useUserStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, [hydrated]);

  if (!hydrated) {
    return <View style={styles.splash} />;
  }

  return <Redirect href={onboardingComplete ? '/(tabs)/scan' : '/onboarding'} />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
