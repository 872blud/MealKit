import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { SPRING_ENTER, STAGGER_DELTA_Y, STAGGER_SCALE_FROM, getStaggerDelay } from '@/theme/animations';
import { useIngredientStore } from '@/stores/ingredientStore';
import { useUserStore, FREE_SCAN_LIMIT } from '@/stores/userStore';
import PressableScale from '@/components/PressableScale';
import GlowBackground from '@/components/GlowBackground';
import {
  trackScanHomeViewed,
  trackScanModePicked,
  trackPaywallHit,
} from '@/services/analytics';
import { presentPaywall } from '@/services/superwall';
import { isPro } from '@/services/purchases';

const { width: SCREEN_W } = Dimensions.get('window');

type ScanMode = 'receipt' | 'barcode' | 'photo';

interface ModeDef {
  mode: ScanMode;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const MODES: ModeDef[] = [
  {
    mode: 'receipt',
    title: 'Receipt',
    description: 'Photograph a grocery receipt. We extract the food items.',
    icon: 'receipt-outline',
  },
  {
    mode: 'barcode',
    title: 'Barcode',
    description: 'Scan packaged items one at a time. Fast and precise.',
    icon: 'barcode-outline',
  },
  {
    mode: 'photo',
    title: 'Counter photo',
    description: 'Snap everything at once. Best for fresh produce.',
    icon: 'camera-outline',
  },
];

const MODE_TINTS: Record<ScanMode, { bg: string; border: string; icon: string }> = {
  receipt: { bg: colors.accentDim,   border: 'rgba(74,222,128,0.2)',  icon: colors.accent   },
  barcode: { bg: colors.carbDim,     border: 'rgba(220,160,60,0.2)',  icon: colors.carb     },
  photo:   { bg: colors.proteinDim,  border: 'rgba(107,159,228,0.2)', icon: colors.protein  },
};

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning.';
  if (h < 17) return 'Good afternoon.';
  return 'Good evening.';
}

// ─── Food orbs ────────────────────────────────────────────────────────────────

const ORB_DEFS = [
  { size: 56, top: 58,  right: 20,  colors: ['rgba(74,222,128,0.18)', 'rgba(74,222,128,0)'] as [string, string] },
  { size: 36, top: 88,  right: 84,  colors: ['rgba(220,160,60,0.14)',  'rgba(220,160,60,0)']  as [string, string] },
  { size: 28, top: 48,  right: 118, colors: ['rgba(107,159,228,0.12)', 'rgba(107,159,228,0)'] as [string, string] },
  { size: 20, top: 96,  right: 148, colors: ['rgba(74,222,128,0.10)',  'rgba(74,222,128,0)']  as [string, string] },
];

function FoodOrbs() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {ORB_DEFS.map((orb, i) => (
        <LinearGradient
          key={i}
          colors={orb.colors}
          style={{
            position: 'absolute',
            width: orb.size,
            height: orb.size,
            borderRadius: orb.size / 2,
            top: orb.top,
            right: orb.right,
          }}
        />
      ))}
    </View>
  );
}

// ─── Stagger wrapper (spring) ─────────────────────────────────────────────────

function StaggerItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(STAGGER_DELTA_Y);
  const scale = useSharedValue(STAGGER_SCALE_FROM);

  useEffect(() => {
    const delay = getStaggerDelay(index);
    opacity.value = withDelay(delay, withSpring(1, SPRING_ENTER));
    translateY.value = withDelay(delay, withSpring(0, SPRING_ENTER));
    scale.value = withDelay(delay, withSpring(1, SPRING_ENTER));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ScanHomeScreen() {
  const insets = useSafeAreaInsets();
  const { ingredients } = useIngredientStore();
  const { scanCount, checkAndResetMonthly } = useUserStore();
  const [isProUser, setIsProUser] = useState(false);
  const [proStatusLoaded, setProStatusLoaded] = useState(false);

  useEffect(() => {
    checkAndResetMonthly();
    const remaining = Math.max(0, FREE_SCAN_LIMIT - scanCount);
    trackScanHomeViewed(ingredients.length, remaining);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      void isPro()
        .then((pro) => { if (active) { setIsProUser(pro); setProStatusLoaded(true); } })
        .catch(() => { if (active) { setIsProUser(false); setProStatusLoaded(true); } });
      return () => { active = false; };
    }, [])
  );

  const sessionCount = ingredients.length;
  const hasSession = sessionCount > 0;
  const atLimit = proStatusLoaded && !isProUser && scanCount >= FREE_SCAN_LIMIT;
  const remaining = Math.max(0, FREE_SCAN_LIMIT - scanCount);
  const meterProgress = Math.min(1, scanCount / FREE_SCAN_LIMIT);

  const openMode = async (mode: ScanMode) => {
    const proUser = await isPro().catch(() => false);
    if (!proUser && useUserStore.getState().scanCount >= FREE_SCAN_LIMIT) {
      trackPaywallHit('scan_limit');
      await presentPaywall('scan_limit_reached');
      return;
    }
    trackScanModePicked(mode);
    router.push(`/scan/${mode}` as const);
  };

  const openUpgrade = async () => {
    trackPaywallHit('scan_limit');
    await presentPaywall('scan_limit_reached');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <GlowBackground primary="green" secondary="amber" />
      <FoodOrbs />

      {/* ── Top bar ──────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <Text style={styles.brand}>MEALKIT</Text>
        <UsagePill scanCount={scanCount} atLimit={atLimit} onPress={openUpgrade} />
      </View>

      {/* ── Body — no ScrollView ──────────────────────────────── */}
      <View style={styles.body}>

        {/* 1. Hero */}
        <StaggerItem index={0}>
          <View style={styles.hero}>
            <Text style={styles.heroEyebrow}>{getTimeGreeting()}</Text>
            <Text style={styles.heroTitle}>What's on{'\n'}the counter?</Text>
            <Text style={styles.heroGhost} numberOfLines={1} aria-hidden>
              scan. cook. track.
            </Text>
            <Text style={styles.heroSubtitle}>
              Capture your groceries — Sous turns them into recipes.
            </Text>
          </View>
        </StaggerItem>

        {/* 2. Capture section (flex: 1 fills the middle) */}
        <View style={styles.captureSection}>
          {/* Session resume card — compact, sits above mode list */}
          {hasSession && (
            <PressableScale
              onPress={() => router.push('/ingredients')}
              style={styles.resumeCard}
              accessibilityLabel={`Review ${sessionCount} ingredients in your basket`}
            >
              <View style={styles.resumeIconWrap}>
                <Ionicons name="basket" size={16} color={colors.accent} />
              </View>
              <Text style={styles.resumeTitle}>
                <Text style={styles.resumeCount}>{sessionCount}</Text>
                {' '}{sessionCount === 1 ? 'item' : 'items'} in basket
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.accent} />
            </PressableScale>
          )}

          <StaggerItem index={1}>
            <Text style={styles.sectionLabel}>Capture</Text>
          </StaggerItem>

          <View style={styles.modeList}>
            {MODES.map((m, i) => (
              <React.Fragment key={m.mode}>
                {i > 0 && <View style={styles.modeDivider} />}
                <StaggerItem index={2 + i}>
                  <ModeRow def={m} disabled={atLimit} onPress={() => openMode(m.mode)} />
                </StaggerItem>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* 3. Usage footer — pinned to bottom */}
        <View style={[styles.meterSection, { paddingBottom: insets.bottom + spacing.sm }]}>
          {atLimit ? (
            <View style={styles.limitCard}>
              <View style={styles.limitHeader}>
                <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
                <Text style={styles.limitTitle}>Monthly scan limit reached</Text>
              </View>
              <PressableScale onPress={openUpgrade} style={styles.limitCta}>
                <Text style={styles.limitCtaLabel}>Upgrade to Pro</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.onAccent} />
              </PressableScale>
            </View>
          ) : (
            <View style={styles.meter}>
              <View style={styles.meterHeader}>
                <Text style={styles.meterLabel}>Free scans this month</Text>
                <Text style={styles.meterCount}>
                  {scanCount}
                  <Text style={styles.meterTotal}> / {FREE_SCAN_LIMIT}</Text>
                </Text>
              </View>
              <View style={styles.meterTrack}>
                <View style={[styles.meterFill, { width: `${meterProgress * 100}%` }]} />
              </View>
              <Text style={styles.meterFooter}>
                {remaining === 0
                  ? 'No free scans left this month.'
                  : `${remaining} ${remaining === 1 ? 'scan' : 'scans'} remaining.`}
                {'  '}
                <Text style={styles.meterUpgrade} onPress={openUpgrade}>
                  Go unlimited →
                </Text>
              </Text>
            </View>
          )}
        </View>

      </View>
    </View>
  );
}

// ─── Mode row ────────────────────────────────────────────────────────────────

function ModeRow({ def, disabled, onPress }: { def: ModeDef; disabled: boolean; onPress: () => void }) {
  const tint = MODE_TINTS[def.mode];
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      style={[styles.modeRow, disabled && styles.modeRowDisabled]}
      accessibilityLabel={`${def.title} — ${def.description}`}
      accessibilityState={disabled ? { disabled: true } : undefined}
    >
      <View style={[styles.modeIconWrap, { backgroundColor: tint.bg, borderColor: tint.border }]}>
        <Ionicons name={def.icon} size={22} color={disabled ? colors.textDisabled : tint.icon} />
      </View>
      <View style={styles.modeText}>
        <Text style={[styles.modeTitle, disabled && styles.modeTitleDisabled]}>{def.title}</Text>
        <Text style={styles.modeDescription}>{def.description}</Text>
      </View>
      <Ionicons
        name={disabled ? 'lock-closed' : 'chevron-forward'}
        size={18}
        color={disabled ? colors.textDisabled : colors.textSecondary}
      />
    </PressableScale>
  );
}

// ─── Usage pill ──────────────────────────────────────────────────────────────

function UsagePill({ scanCount, atLimit, onPress }: { scanCount: number; atLimit: boolean; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      style={[styles.usagePill, atLimit && styles.usagePillLimit]}
      accessibilityLabel={atLimit ? 'Scan limit reached. Tap to upgrade.' : `${scanCount}/${FREE_SCAN_LIMIT} scans used.`}
    >
      {atLimit ? (
        <>
          <Ionicons name="lock-closed" size={12} color={colors.error} />
          <Text style={[styles.usagePillText, styles.usagePillTextLimit]}>Upgrade</Text>
        </>
      ) : (
        <Text style={styles.usagePillText}>
          {scanCount}<Text style={styles.usagePillMuted}>/{FREE_SCAN_LIMIT}</Text>
        </Text>
      )}
    </PressableScale>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    zIndex: 10,
  },
  brand: {
    ...typography.label,
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  usagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    minHeight: 28,
    borderRadius: 100,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  usagePillLimit: {
    backgroundColor: colors.errorDim,
    borderColor: 'transparent',
  },
  usagePillText: {
    ...typography.monoSmall,
    color: colors.text,
  },
  usagePillMuted: { color: colors.textSecondary },
  usagePillTextLimit: { color: colors.error },

  // Body — fills remaining space, no scroll
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    justifyContent: 'space-between',
  },

  // Hero — compressed padding
  hero: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  heroEyebrow: {
    ...typography.label,
    color: colors.accent,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  heroTitle: {
    ...typography.display,
    color: colors.text,
  },
  heroGhost: {
    ...typography.heroGhost,
    color: colors.text,
    opacity: 0.1,
    marginTop: -8,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    maxWidth: 300,
  },

  // Capture section
  captureSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: spacing.sm,
  },

  // Session resume — compact strip above mode list
  resumeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accentDim,
    borderRadius: 10,
    marginBottom: spacing.sm,
  },
  resumeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  resumeTitle: {
    ...typography.small,
    color: colors.text,
    flex: 1,
  },
  resumeCount: {
    ...typography.smallMedium,
    color: colors.accent,
    fontVariant: ['tabular-nums'],
  },

  // Section label
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },

  // Mode list
  modeList: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  modeDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + 44 + spacing.md,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  modeRowDisabled: { opacity: 0.55 },
  modeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modeText: { flex: 1, gap: 2 },
  modeTitle: {
    ...typography.heading,
    color: colors.text,
  },
  modeTitleDisabled: { color: colors.textSecondary },
  modeDescription: {
    ...typography.small,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Usage meter
  meterSection: {
    marginTop: spacing.sm,
  },
  meter: { gap: spacing.xs },
  meterHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  meterLabel: { ...typography.small, color: colors.textSecondary },
  meterCount: { ...typography.monoSmall, color: colors.text },
  meterTotal: { color: colors.textSecondary },
  meterTrack: {
    height: 3,
    borderRadius: 100,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 100,
    backgroundColor: colors.accent,
  },
  meterFooter: { ...typography.small, color: colors.textSecondary },
  meterUpgrade: { ...typography.smallMedium, color: colors.accent },

  // Limit card (compact version)
  limitCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  limitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  limitTitle: { ...typography.small, color: colors.text },
  limitCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    minHeight: 40,
  },
  limitCtaLabel: { ...typography.smallMedium, color: colors.onAccent },
});
