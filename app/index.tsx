import { Redirect } from 'expo-router';

export default function Index() {
  // Redirects to main tabs for development.
  // Phase 5: wire userStore.onboardingComplete → redirect to /onboarding if false
  return <Redirect href="/(tabs)/scan" />;
}
