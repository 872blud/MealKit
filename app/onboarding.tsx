import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { SPRING_ENTER, STAGGER_DELTA_Y, STAGGER_SCALE_FROM, getStaggerDelay } from '@/theme/animations';
import PressableScale from '@/components/PressableScale';
import { useUserStore, UserPreferences } from '@/stores/userStore';

const { width: SCREEN_W } = Dimensions.get('window');

type GlowColor = 'green' | 'amber' | 'blue';

const VALUE_PROPS = [
  {
    label: '01',
    eyebrow: '01 · SCAN',
    title: 'Point, scan, done.',
    body: "Barcode a box. Snap a receipt. Photograph what's on your counter. Mealkit reads your ingredients.",
    icon: 'scan-outline' as const,
    primaryGlow: 'green' as GlowColor,
    secondaryGlow: 'amber' as GlowColor,
    iconColor: colors.accent,
    iconBg: colors.accentDim,
  },
  {
    label: '02',
    eyebrow: '02 · COOK',
    title: 'Recipes from what you already have.',
    body: 'Skip the grocery list. Sous, your personal AI chef, generates recipe ideas from whatever you scanned — matched to your taste.',
    icon: 'restaurant-outline' as const,
    primaryGlow: 'amber' as GlowColor,
    secondaryGlow: 'green' as GlowColor,
    iconColor: colors.carb,
    iconBg: colors.carbDim,
  },
  {
    label: '03',
    eyebrow: '03 · TRACK',
    title: 'Nutrition without the math.',
    body: 'Every recipe comes with full macros. Cooking one logs it. No food diary required.',
    icon: 'bar-chart-outline' as const,
    primaryGlow: 'blue' as GlowColor,
    secondaryGlow: 'green' as GlowColor,
    iconColor: colors.protein,
    iconBg: colors.proteinDim,
  },
] as const;

const GLOW_COLORS: Record<GlowColor, [string, string, string]> = {
  green: [colors.glowGreen, colors.glowGreenMid, colors.transparent],
  amber: [colors.glowAmber, colors.glowAmberMid, colors.transparent],
  blue:  [colors.glowBlue,  colors.glowBlueMid,  colors.transparent],
};

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-free',
  'Dairy-free',
  'Keto',
] as const;

const CUISINE_OPTIONS = [
  'Italian',
  'Mexican',
  'Asian',
  'Mediterranean',
  'Indian',
  'American',
  'Middle Eastern',
] as const;

const SKILL_OPTIONS: { key: UserPreferences['skill']; label: string }[] = [
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
];

// ─── StaggerItem ────────────────────────────────────────────────────────────

function StaggerItem({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(STAGGER_DELTA_Y);
  const scale = useSharedValue(STAGGER_SCALE_FROM);
  const mounted = useRef(false);

  React.useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const delay = getStaggerDelay(index);
    opacity.value = withDelay(delay, withSpring(1, SPRING_ENTER));
    translateY.value = withDelay(delay, withSpring(0, SPRING_ENTER));
    scale.value = withDelay(delay, withSpring(1, SPRING_ENTER));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dietary, setDietary] = useState<string[]>([]);
  const [skill, setSkill] = useState<UserPreferences['skill']>('intermediate');
  const [cuisines, setCuisines] = useState<string[]>([]);

  const setOnboardingComplete = useUserStore((s) => s.setOnboardingComplete);
  const updatePreferences = useUserStore((s) => s.updatePreferences);

  const totalPanels = VALUE_PROPS.length + 1;
  const isLastPanel = currentIndex === totalPanels - 1;

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const i = Math.round(x / SCREEN_W);
      if (i !== currentIndex) {
        setCurrentIndex(i);
        Haptics.selectionAsync().catch(() => {});
      }
    },
    [currentIndex]
  );

  const finishOnboarding = useCallback(
    (withPreferences: boolean) => {
      if (withPreferences) {
        updatePreferences({
          dietaryRestrictions: dietary,
          skill,
          cuisines,
        });
      }
      setOnboardingComplete(true);
      router.replace('/(tabs)/scan');
    },
    [dietary, skill, cuisines, updatePreferences, setOnboardingComplete]
  );

  const handleContinue = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    if (isLastPanel) {
      finishOnboarding(true);
    } else {
      scrollRef.current?.scrollTo({
        x: SCREEN_W * (currentIndex + 1),
        animated: true,
      });
    }
  }, [isLastPanel, currentIndex, finishOnboarding]);

  const handleSkip = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    finishOnboarding(false);
  }, [finishOnboarding]);

  const toggleDietary = useCallback((value: string) => {
    setDietary((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }, []);

  const toggleCuisine = useCallback((value: string) => {
    setCuisines((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Top bar: progress + skip */}
      <View style={styles.topBar}>
        <View style={styles.progressRow}>
          {Array.from({ length: totalPanels }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressSeg,
                i === currentIndex && styles.progressSegActive,
                i < currentIndex && styles.progressSegDone,
              ]}
            />
          ))}
        </View>
        {!isLastPanel ? (
          <Pressable
            onPress={handleSkip}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.skipBtn}
          >
            <Text style={styles.skipLabel}>Skip</Text>
          </Pressable>
        ) : (
          <View style={styles.skipBtn} />
        )}
      </View>

      {/* Paged panels */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.scroll}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        {VALUE_PROPS.map((p, i) => (
          <ValuePropPanel
            key={i}
            eyebrow={p.eyebrow}
            ghostLabel={p.label}
            title={p.title}
            body={p.body}
            icon={p.icon}
            iconColor={p.iconColor}
            iconBg={p.iconBg}
            primaryGlow={p.primaryGlow}
            secondaryGlow={p.secondaryGlow}
          />
        ))}
        <PreferencesPanel
          dietary={dietary}
          skill={skill}
          cuisines={cuisines}
          onToggleDietary={toggleDietary}
          onSetSkill={setSkill}
          onToggleCuisine={toggleCuisine}
        />
      </ScrollView>

      {/* Bottom CTA */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm },
        ]}
      >
        <PressableScale onPress={handleContinue} style={styles.cta}>
          <Text style={styles.ctaLabel}>
            {isLastPanel ? 'Start cooking' : 'Continue'}
          </Text>
          <Ionicons
            name={isLastPanel ? 'arrow-forward' : 'chevron-forward'}
            size={18}
            color={colors.onAccent}
            style={styles.ctaIcon}
          />
        </PressableScale>
      </View>
    </View>
  );
}

// ─── ValuePropPanel ────────────────────────────────────────────────────────

function ValuePropPanel({
  eyebrow,
  ghostLabel,
  title,
  body,
  icon,
  iconColor,
  iconBg,
  primaryGlow,
  secondaryGlow,
}: {
  eyebrow: string;
  ghostLabel: string;
  title: string;
  body: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBg: string;
  primaryGlow: GlowColor;
  secondaryGlow: GlowColor;
}) {
  return (
    <View style={styles.panel}>
      {/* Glow blobs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={GLOW_COLORS[primaryGlow]}
          style={styles.glowPrimary}
        />
        <LinearGradient
          colors={GLOW_COLORS[secondaryGlow]}
          style={styles.glowSecondary}
        />
      </View>

      <View style={styles.valueInner}>
        {/* Ghost number behind icon */}
        <View style={styles.iconArea}>
          <Text style={styles.ghostNumber} aria-hidden>{ghostLabel}</Text>
          <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
            <Ionicons name={icon} size={36} color={iconColor} />
          </View>
        </View>

        <StaggerItem index={0}>
          <Text style={styles.editorialLabel}>{eyebrow}</Text>
        </StaggerItem>
        <StaggerItem index={1}>
          <Text style={styles.panelTitle}>{title}</Text>
        </StaggerItem>
        <StaggerItem index={2}>
          <Text style={styles.panelBody}>{body}</Text>
        </StaggerItem>
      </View>
    </View>
  );
}

// ─── PreferencesPanel ──────────────────────────────────────────────────────

function PreferencesPanel({
  dietary,
  skill,
  cuisines,
  onToggleDietary,
  onSetSkill,
  onToggleCuisine,
}: {
  dietary: string[];
  skill: UserPreferences['skill'];
  cuisines: string[];
  onToggleDietary: (v: string) => void;
  onSetSkill: (v: UserPreferences['skill']) => void;
  onToggleCuisine: (v: string) => void;
}) {
  return (
    <View style={styles.panel}>
      {/* Glow — green + amber for preferences panel */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={GLOW_COLORS.green}
          style={styles.glowPrimary}
        />
        <LinearGradient
          colors={GLOW_COLORS.amber}
          style={styles.glowSecondary}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.prefContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.editorialLabel}>04 · YOU</Text>
        <Text style={styles.panelTitle}>A few quick preferences.</Text>
        <Text style={styles.panelBody}>
          Optional. You can change any of this later.
        </Text>

        <Section label="Diet">
          <View style={styles.chipWrap}>
            {DIETARY_OPTIONS.map((d) => {
              const active = dietary.includes(d);
              return (
                <Chip
                  key={d}
                  label={d}
                  active={active}
                  onPress={() => onToggleDietary(d)}
                />
              );
            })}
          </View>
        </Section>

        <Section label="Cooking skill">
          <View style={styles.segmented}>
            {SKILL_OPTIONS.map((o) => {
              const active = skill === o.key;
              return (
                <Pressable
                  key={o.key}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    onSetSkill(o.key);
                  }}
                  hitSlop={{ top: 4, bottom: 4 }}
                  style={[styles.segment, active && styles.segmentActive]}
                >
                  <Text
                    style={[
                      styles.segmentLabel,
                      active && styles.segmentLabelActive,
                    ]}
                  >
                    {o.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section label="Cuisines you like">
          <View style={styles.chipWrap}>
            {CUISINE_OPTIONS.map((c) => {
              const active = cuisines.includes(c);
              return (
                <Chip
                  key={c}
                  label={c}
                  active={active}
                  onPress={() => onToggleCuisine(c)}
                />
              );
            })}
          </View>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Glow blobs
  glowPrimary: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  glowSecondary: {
    position: 'absolute',
    top: 60,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 1,
  },
  progressSeg: {
    height: 3,
    width: 28,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  progressSegActive: {
    backgroundColor: colors.accent,
    width: 44,
  },
  progressSegDone: {
    backgroundColor: colors.accent,
  },
  skipBtn: {
    minWidth: 48,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  skipLabel: {
    ...typography.smallMedium,
    color: colors.textSecondary,
  },

  // Scroll + panel
  scroll: {
    flex: 1,
  },
  panel: {
    width: SCREEN_W,
    flex: 1,
    paddingHorizontal: spacing.xl,
    overflow: 'hidden',
  },
  valueInner: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  prefContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  // Icon area with ghost number
  iconArea: {
    marginBottom: spacing.md,
    position: 'relative',
    alignSelf: 'flex-start',
  },
  ghostNumber: {
    ...typography.display,
    fontSize: 100,
    lineHeight: 100,
    color: colors.text,
    opacity: 0.06,
    position: 'absolute',
    top: -18,
    left: -8,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Editorial typography
  editorialLabel: {
    ...typography.label,
    color: colors.accent,
    letterSpacing: 1.2,
  },
  panelTitle: {
    ...typography.display,
    fontSize: 38,
    lineHeight: 44,
    color: colors.text,
  },
  panelBody: {
    ...typography.body,
    fontSize: 17,
    lineHeight: 26,
    color: colors.textSecondary,
    maxWidth: 420,
  },

  // Preference sections
  section: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },

  // Chips
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    rowGap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: 40,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.accentDim,
    borderColor: colors.accent,
  },
  chipLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  chipLabelActive: {
    ...typography.smallMedium,
    color: colors.accent,
  },

  // Segmented
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
  },
  segmentActive: {
    backgroundColor: colors.accent,
  },
  segmentLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  segmentLabelActive: {
    ...typography.smallMedium,
    color: colors.onAccent,
  },

  // Bottom CTA
  bottomBar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: spacing.md,
    minHeight: 54,
  },
  ctaLabel: {
    ...typography.bodyMedium,
    color: colors.onAccent,
  },
  ctaIcon: {
    marginLeft: spacing.xs,
  },
});
