import Constants from 'expo-constants';
import { Linking } from 'react-native';
import { isBetaMode } from '@/config/limits';

const FEEDBACK_EMAIL = 'rysummer25@gmail.com';
const FEEDBACK_SUBJECT = 'Mealkit Beta Feedback';

export async function sendFeedback() {
  const appVersion = Constants.expoConfig?.version ?? 'unknown';
  const betaMode = isBetaMode() ? 'yes' : 'no';
  const body = [
    `App Version: ${appVersion}`,
    'Platform: ios',
    `Beta Mode: ${betaMode}`,
    'Screen: (describe screen)',
    '',
    'What happened:',
    '',
    'What I expected:',
    '',
  ].join('\n');
  const mailto = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
    FEEDBACK_SUBJECT,
  )}&body=${encodeURIComponent(body)}`;

  try {
    await Linking.openURL(mailto);
  } catch (error) {
    console.warn('Unable to open feedback email composer', error);
  }
}
