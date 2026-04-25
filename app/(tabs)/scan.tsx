import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Switch,
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
import { useUserStore } from '@/stores/userStore';
import { getScanLimit, isBetaMode } from '@/config/limits';
import PressableScale from '@/components/PressableScale';
import GlowBackground from '@/components/GlowBackground';
import {
  trackScanHomeViewed,
  trackScanModePicked,
  trackPaywallHit,
} from '@/services/analytics';
import { presentPaywall } from '@/services/superwall';
import { isPro } from '@/services/purchases';
import { sendFeedback } from '@/services/feedback';
import {
  addDeveloperLog,
  DeveloperLogEntry,
  useDeveloperStore,
} from '@/stores/developerStore';

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
  const { scanCount, checkAndResetMonthly, setOnboardingComplete } = useUserStore();
  const developerMode = useDeveloperStore((s) => s.enabled);
  const developerLogs = useDeveloperStore((s) => s.logs);
  const setDeveloperMode = useDeveloperStore((s) => s.setEnabled);
  const clearDeveloperLogs = useDeveloperStore((s) => s.clearLogs);
  const [isProUser, setIsProUser] = useState(false);
  const [proStatusLoaded, setProStatusLoaded] = useState(false);
  const brandTapRef = useRef({ count: 0, lastTappedAt: 0 });
  const scanLimit = getScanLimit();
  const betaMode = isBetaMode();

  useEffect(() => {
    checkAndResetMonthly();
    const remaining = Math.max(0, scanLimit - scanCount);
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
  const atLimit = proStatusLoaded && !isProUser && scanCount >= scanLimit;
  const remaining = Math.max(0, scanLimit - scanCount);
  const meterProgress = Math.min(1, scanCount / scanLimit);

  const openMode = async (mode: ScanMode) => {
    const proUser = await isPro().catch(() => false);
    if (!proUser && useUserStore.getState().scanCount >= scanLimit) {
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

  const handleBrandPress = () => {
    const now = Date.now();
    const previous = brandTapRef.current;
    const nextCount = now - previous.lastTappedAt > 1300 ? 1 : previous.count + 1;
    brandTapRef.current = { count: nextCount, lastTappedAt: now };

    if (nextCount < 5) return;

    brandTapRef.current = { count: 0, lastTappedAt: now };
    if (!developerMode) {
      setDeveloperMode(true);
      addDeveloperLog({
        level: 'info',
        source: 'Developer mode',
        message: 'Developer mode enabled from hidden brand gesture.',
      });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <GlowBackground primary="green" secondary="amber" />
      <FoodOrbs />

      {/* ── Top bar ──────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <PressableScale
          onPress={handleBrandPress}
          style={styles.brandTap}
          accessibilityRole="button"
          accessibilityLabel="Mealkit"
        >
          <Text style={styles.brand}>MEALKIT</Text>
        </PressableScale>
        <UsagePill
          scanCount={scanCount}
          scanLimit={scanLimit}
          betaMode={betaMode}
          atLimit={atLimit}
          onPress={openUpgrade}
        />
      </View>

      {developerMode && (
        <DeveloperPanel
          enabled={developerMode}
          logs={developerLogs}
          onToggle={setDeveloperMode}
          onClear={clearDeveloperLogs}
          onRestartOnboarding={() => {
            setOnboardingComplete(false);
            router.replace('/onboarding');
          }}
        />
      )}

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
          <PressableScale
            onPress={sendFeedback}
            style={styles.feedbackLink}
            accessibilityRole="link"
            accessibilityLabel="Send feedback"
          >
            <Text style={styles.feedbackText}>Send Feedback</Text>
          </PressableScale>
        </View>

        {/* 3. Usage footer — pinned to bottom */}
        <View style={[styles.meterSection, { paddingBottom: insets.bottom + spacing.sm }]}>
          {atLimit ? (
            <View style={styles.limitCard}>
              <View style={styles.limitHeader}>
                <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
                <Text style={styles.limitTitle}>
                  {betaMode ? 'Beta usage limit reached' : 'Monthly scan limit reached'}
                </Text>
              </View>
              <PressableScale onPress={openUpgrade} style={styles.limitCta}>
                <Text style={styles.limitCtaLabel}>{betaMode ? 'See options' : 'Upgrade to Pro'}</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.onAccent} />
              </PressableScale>
            </View>
          ) : (
            <View style={styles.meter}>
              <View style={styles.meterHeader}>
                <Text style={styles.meterLabel}>
                  {betaMode ? `Beta limit: ${scanCount}/${scanLimit} scans` : 'Free scans this month'}
                </Text>
                {!betaMode && (
                  <Text style={styles.meterCount}>
                    {scanCount}
                    <Text style={styles.meterTotal}> / {scanLimit}</Text>
                  </Text>
                )}
              </View>
              <View style={styles.meterTrack}>
                <View style={[styles.meterFill, { width: `${meterProgress * 100}%` }]} />
              </View>
              <Text style={styles.meterFooter}>
                {betaMode
                  ? `${remaining} ${remaining === 1 ? 'scan' : 'scans'} remaining in beta.`
                  : remaining === 0
                    ? 'No free scans left this month.'
                    : `${remaining} ${remaining === 1 ? 'scan' : 'scans'} remaining.`}
                {!betaMode && (
                  <>
                    {'  '}
                    <Text style={styles.meterUpgrade} onPress={openUpgrade}>
                      Go unlimited →
                    </Text>
                  </>
                )}
              </Text>
            </View>
          )}
        </View>

      </View>
    </View>
  );
}

// ─── Developer panel ────────────────────────────────────────────────────────

function formatLogTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

function DeveloperPanel({
  enabled,
  logs,
  onToggle,
  onClear,
  onRestartOnboarding,
}: {
  enabled: boolean;
  logs: DeveloperLogEntry[];
  onToggle: (enabled: boolean) => void;
  onClear: () => void;
  onRestartOnboarding: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const latest = logs.slice(0, 3);

  return (
    <View style={styles.devPanel}>
      {/* Header row — always visible */}
      <PressableScale onPress={() => setCollapsed((c) => !c)} style={styles.devPanelHeader}>
        <View>
          <Text style={styles.devPanelTitle}>Developer Mode</Text>
          <Text style={styles.devPanelSubtitle}>
            {logs.length} {logs.length === 1 ? 'log' : 'logs'} captured
          </Text>
        </View>
        <View style={styles.devPanelHeaderRight}>
          <Ionicons
            name={collapsed ? 'chevron-down' : 'chevron-up'}
            size={16}
            color={colors.textSecondary}
            style={{ marginRight: 10 }}
          />
          <Switch
            value={enabled}
            onValueChange={onToggle}
            trackColor={{ false: colors.surfaceElevated, true: colors.accentDim }}
            thumbColor={enabled ? colors.accent : colors.textDisabled}
          />
        </View>
      </PressableScale>

      {/* Collapsible body */}
      {!collapsed && (
        <>
          {latest.length === 0 ? (
            <Text style={styles.devEmpty}>No logs yet. Trigger a recipe generation to capture API details.</Text>
          ) : (
            <View style={styles.devLogList}>
              {latest.map((log) => (
                <View key={log.id} style={styles.devLogRow}>
                  <Text style={[styles.devLogLevel, styles[`devLogLevel_${log.level}`]]}>
                    {log.level}
                  </Text>
                  <View style={styles.devLogBody}>
                    <Text style={styles.devLogMeta}>
                      {formatLogTime(log.createdAt)} · {log.source}
                    </Text>
                    <Text style={styles.devLogMessage}>{log.message}</Text>
                    {log.details ? (
                      <Text style={styles.devLogDetails} numberOfLines={3}>
                        {log.details}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.devActions}>
            <PressableScale onPress={onRestartOnboarding} style={styles.devActionBtn}>
              <Ionicons name="refresh-outline" size={14} color={colors.accent} style={{ marginRight: 5 }} />
              <Text style={styles.devClearText}>Restart Onboarding</Text>
            </PressableScale>
            {logs.length > 0 && (
              <PressableScale onPress={onClear} style={styles.devActionBtn}>
                <Text style={styles.devClearText}>Clear Logs</Text>
              </PressableScale>
            )}
          </View>
        </>
      )}
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

function UsagePill({
  scanCount,
  scanLimit,
  betaMode,
  atLimit,
  onPress,
}: {
  scanCount: number;
  scanLimit: number;
  betaMode: boolean;
  atLimit: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      style={[styles.usagePill, atLimit && styles.usagePillLimit]}
      accessibilityLabel={
        atLimit
          ? betaMode
            ? 'Beta usage limit reached.'
            : 'Scan limit reached. Tap to upgrade.'
          : betaMode
            ? `Beta limit: ${scanCount}/${scanLimit} scans.`
            : `${scanCount}/${scanLimit} scans used.`
      }
    >
      {atLimit ? (
        <>
          <Ionicons name="lock-closed" size={12} color={colors.error} />
          <Text style={[styles.usagePillText, styles.usagePillTextLimit]}>
            {betaMode ? 'Limit' : 'Upgrade'}
          </Text>
        </>
      ) : (
        <Text style={styles.usagePillText}>
          {scanCount}<Text style={styles.usagePillMuted}>/{scanLimit}</Text>
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
  brandTap: {
    minWidth: 80,
    minHeight: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  devPanel: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    padding: spacing.md,
    gap: spacing.sm,
  },
  devPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  devPanelTitle: {
    ...typography.smallMedium,
    color: colors.text,
  },
  devPanelSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  devEmpty: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  devLogList: {
    gap: spacing.sm,
  },
  devLogRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  devLogLevel: {
    ...typography.label,
    minWidth: 38,
    marginTop: 1,
  },
  devLogLevel_info: { color: colors.protein },
  devLogLevel_warn: { color: colors.carb },
  devLogLevel_error: { color: colors.error },
  devLogBody: {
    flex: 1,
    gap: 2,
  },
  devLogMeta: {
    ...typography.caption,
    color: colors.textDisabled,
  },
  devLogMessage: {
    ...typography.caption,
    color: colors.text,
  },
  devLogDetails: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  devPanelHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  devActions: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  devActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
    justifyContent: 'center',
  },
  devClearBtn: {
    alignSelf: 'flex-start',
    minHeight: 32,
    justifyContent: 'center',
  },
  devClearText: {
    ...typography.caption,
    color: colors.accent,
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
  feedbackLink: {
    alignSelf: 'center',
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  feedbackText: {
    ...typography.smallMedium,
    color: colors.accent,
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
