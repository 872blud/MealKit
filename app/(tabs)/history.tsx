import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useCookedStore, CookedEntry } from '@/stores/cookedStore';
import GlowBackground from '@/components/GlowBackground';
import PressableScale from '@/components/PressableScale';
import EmptyState from '@/components/EmptyState';

function formatCookedDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();
  if (date.toDateString() === today) return 'Today';
  if (date.toDateString() === yesterday) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CookedRow({ entry }: { entry: CookedEntry }) {
  const { recipe, cookedAt } = entry;

  const handlePress = () => {
    router.push({
      pathname: '/recipes/[id]',
      params: { id: recipe.id, fromHistory: JSON.stringify(recipe) },
    });
  };

  return (
    <PressableScale onPress={handlePress} style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowName} numberOfLines={1}>{recipe.name}</Text>
        <Text style={styles.rowMeta}>
          {formatCookedDate(cookedAt)} · {recipe.cookTime + recipe.prepTime} min
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
    </PressableScale>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const entries = useCookedStore((s) => s.entries);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <GlowBackground primary="green" secondary="amber" />

      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        {entries.length > 0 && (
          <Text style={styles.subtitle}>
            <Text style={styles.subtitleCount}>{entries.length}</Text>
            {' '}meal{entries.length !== 1 ? 's' : ''} cooked
          </Text>
        )}
      </View>

      {entries.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title="Nothing cooked yet"
          body="Recipes you cook will appear here."
          action={{ label: 'Start scanning', onPress: () => router.navigate('/(tabs)/scan') }}
        />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing.xl }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {entries.map((entry, i) => (
              <React.Fragment key={entry.id}>
                {i > 0 && <View style={styles.divider} />}
                <CookedRow entry={entry} />
              </React.Fragment>
            ))}
          </View>
        </ScrollView>
      )}
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
  subtitle: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  subtitleCount: { ...typography.smallMedium, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
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
    gap: spacing.sm,
    minHeight: 60,
  },
  rowLeft: { flex: 1, gap: spacing.xs },
  rowName: { ...typography.bodyMedium, color: colors.text },
  rowMeta: { ...typography.small, color: colors.textSecondary },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.lg },
});
