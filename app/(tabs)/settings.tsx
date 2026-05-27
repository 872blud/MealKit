import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useUserStore } from '@/stores/userStore';
import { getScanLimit, getRecipeLimit } from '@/config/limits';
import { isPro, presentPaywall } from '@/services/superwall';
import { sendFeedback } from '@/services/feedback';
import GlowBackground from '@/components/GlowBackground';
import PressableScale from '@/components/PressableScale';

const DIETARY_OPTIONS = [
  'Vegan', 'Vegetarian', 'Halal', 'Gluten-Free', 'Dairy-Free', 'Keto',
];

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function SettingsRow({
  icon,
  label,
  onPress,
  value,
  destructive,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
  value?: string;
  destructive?: boolean;
}) {
  return (
    <PressableScale onPress={onPress} style={styles.row} disabled={!onPress}>
      <Ionicons name={icon as any} size={18} color={destructive ? colors.error : colors.textSecondary} style={styles.rowIcon} />
      <Text style={[styles.rowLabel, destructive && { color: colors.error }]}>{label}</Text>
      {value ? (
        <Text style={styles.rowValue}>{value}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
      ) : null}
    </PressableScale>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { preferences, updatePreferences, scanCount, recipeCount } = useUserStore();
  const [proUser, setProUser] = useState(false);
  const scanLimit = getScanLimit();
  const recipeLimit = getRecipeLimit();
  const appVersion = Constants.expoConfig?.version ?? '—';

  useEffect(() => {
    isPro().then(setProUser).catch(() => setProUser(false));
  }, []);

  const toggleDiet = (option: string) => {
    const current = preferences.dietaryRestrictions;
    const next = current.includes(option)
      ? current.filter((d) => d !== option)
      : [...current, option];
    updatePreferences({ dietaryRestrictions: next });
  };

  const handleRestore = async () => {
    Alert.alert('Restore Purchases', 'Restoring your purchases…');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <GlowBackground primary="green" secondary="amber" />

      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Dietary preferences */}
        <SectionLabel label="DIETARY" />
        <View style={styles.chipGrid}>
          {DIETARY_OPTIONS.map((option) => {
            const active = preferences.dietaryRestrictions.includes(option);
            return (
              <PressableScale
                key={option}
                onPress={() => toggleDiet(option)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                  {option}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        {/* Usage */}
        <SectionLabel label="USAGE THIS MONTH" />
        <View style={styles.card}>
          <SettingsRow
            icon="scan-outline"
            label="Scans"
            value={`${scanCount} / ${scanLimit}`}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="restaurant-outline"
            label="Recipe generations"
            value={`${recipeCount} / ${recipeLimit}`}
          />
        </View>

        {/* Account */}
        <SectionLabel label="ACCOUNT" />
        <View style={styles.card}>
          <SettingsRow
            icon="star-outline"
            label="Plan"
            value={proUser ? 'Pro ✦' : 'Free'}
          />
          {!proUser && (
            <>
              <View style={styles.divider} />
              <SettingsRow
                icon="arrow-up-circle-outline"
                label="Upgrade to Pro"
                onPress={() => presentPaywall('settings')}
              />
            </>
          )}
          <View style={styles.divider} />
          <SettingsRow
            icon="refresh-outline"
            label="Restore Purchases"
            onPress={handleRestore}
          />
        </View>

        {/* Feedback */}
        <SectionLabel label="SUPPORT" />
        <View style={styles.card}>
          <SettingsRow
            icon="chatbubble-outline"
            label="Send Feedback"
            onPress={sendFeedback}
          />
        </View>

        {/* Footer */}
        <Text style={styles.version}>Mealkit v{appVersion}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { ...typography.title, color: colors.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.xs },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 52,
    gap: spacing.sm,
  },
  rowIcon: { width: 22 },
  rowLabel: { ...typography.body, color: colors.text, flex: 1 },
  rowValue: { ...typography.small, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.lg + 22 + spacing.sm },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 100,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.accentDim, borderColor: colors.accent },
  chipLabel: { ...typography.small, color: colors.textSecondary },
  chipLabelActive: { ...typography.smallMedium, color: colors.accent },
  version: { ...typography.caption, color: colors.textDisabled, textAlign: 'center', marginTop: spacing.xl },
});
