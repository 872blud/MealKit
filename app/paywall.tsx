import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { TIMING_ENTER, getStaggerDelay } from '@/theme/animations';
import PressableScale from '@/components/PressableScale';
import {
  trackPaywallImpression,
  trackPaywallDismissed,
  trackPaywallPurchaseStarted,
  trackPaywallRestoreTapped,
} from '@/services/analytics';
import { presentPaywall } from '@/services/superwall';

type Plan = 'annual' | 'monthly';

interface PlanInfo {
  key: Plan;
  label: string;
}

const PLANS: PlanInfo[] = [
  { key: 'annual', label: 'Annual' },
  { key: 'monthly', label: 'Monthly' },
];


const VALUE_PROPS = [
  'Unlimited scans',
  'Unlimited recipes',
  'Micronutrient breakdown',
  'Share recipe cards',
] as const;

const TERMS_URL = 'https://mealkit.app/terms';
const PRIVACY_URL = 'https://mealkit.app/privacy';

// ─── StaggerItem ────────────────────────────────────────────────────────────

function StaggerItem({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const delay = getStaggerDelay(index);
    opacity.value = withDelay(delay, withTiming(1, TIMING_ENTER));
    translateY.value = withDelay(delay, withTiming(0, TIMING_ENTER));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

// ─── Screen ─────────────────────────────────────────────────────────────────

const STATIC_PRICES: Record<Plan, { price: string; sub: string | null; badge: string | null }> = {
  annual:  { price: '$39.99 / yr', sub: '$3.33 / mo', badge: 'Save 44%' },
  monthly: { price: '$5.99 / mo', sub: 'Billed monthly', badge: null },
};

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<Plan>('annual');
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    trackPaywallImpression('fallback');
  }, []);

  const selected = PLANS.find((p) => p.key === plan) ?? PLANS[0];

  const handleClose = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    trackPaywallDismissed('fallback');
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/scan');
    }
  }, []);

  const handleSelect = useCallback((next: Plan) => {
    Haptics.selectionAsync().catch(() => {});
    setPlan(next);
  }, []);

  const handleSubscribe = useCallback(async () => {
    Haptics.selectionAsync().catch(() => {});
    trackPaywallPurchaseStarted(plan);
    setPurchasing(true);
    try {
      await presentPaywall('paywall_fallback');
      handleClose();
    } catch {
      Alert.alert('Purchase failed', 'We could not complete the purchase. Please try again.');
    } finally {
      setPurchasing(false);
    }
  }, [handleClose, plan]);

  const handleRestore = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    trackPaywallRestoreTapped();
    Alert.alert('Restore Purchases', 'Purchase restoration is handled automatically by Superwall.');
  }, []);

  const handleOpenUrl = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {});
  }, []);

  return (
    <View style={styles.root}>
      {/* Close button — absolute top-right */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={handleClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <StaggerItem index={0}>
            <Text style={styles.label}>PRO</Text>
          </StaggerItem>
          <StaggerItem index={1}>
            <Text style={styles.title}>Unlock everything.</Text>
          </StaggerItem>
          <StaggerItem index={2}>
            <Text style={styles.subtitle}>
              Upgrade to Mealkit Pro and cook without limits.
            </Text>
          </StaggerItem>
        </View>

        {/* Value props */}
        <View style={styles.props}>
          {VALUE_PROPS.map((text, i) => (
            <StaggerItem key={text} index={3 + i}>
              <View style={styles.propRow}>
                <View style={styles.propCheck}>
                  <Ionicons name="checkmark" size={16} color={colors.accent} />
                </View>
                <Text style={styles.propLabel}>{text}</Text>
              </View>
            </StaggerItem>
          ))}
        </View>

        {/* Plan selector */}
        <StaggerItem index={7}>
          <View style={styles.planList}>
            {PLANS.map((p) => {
              const active = plan === p.key;
              const { price, sub, badge } = STATIC_PRICES[p.key];
              return (
                <Pressable
                  key={p.key}
                  onPress={() => handleSelect(p.key)}
                  style={[styles.planRow, active && styles.planRowActive]}
                >
                  <View style={styles.planRadio}>
                    {active && <View style={styles.planRadioDot} />}
                  </View>
                  <View style={styles.planText}>
                    <View style={styles.planHeader}>
                      <Text style={styles.planLabel}>{p.label}</Text>
                      {badge ? (
                        <View style={styles.planBadge}>
                          <Text style={styles.planBadgeText}>{badge}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.planPrice}>{price}</Text>
                    {sub ? <Text style={styles.planSub}>{sub}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </StaggerItem>

        {/* Primary CTA */}
        <StaggerItem index={8}>
          <PressableScale
            onPress={handleSubscribe}
            disabled={purchasing}
            style={[styles.cta, purchasing && styles.ctaDisabled]}
          >
            <Text style={styles.ctaLabel}>
              {purchasing ? 'Connecting…' : `Continue with ${selected?.label ?? 'Pro'}`}
            </Text>
          </PressableScale>
        </StaggerItem>

        {/* Trial note */}
        <StaggerItem index={9}>
          <Text style={styles.trialNote}>
            Cancel anytime. Subscription renews automatically unless turned off
            at least 24 hours before the end of the current period.
          </Text>
        </StaggerItem>

        {/* Footer row */}
        <StaggerItem index={10}>
          <View style={styles.footerRow}>
            <Pressable
              onPress={handleRestore}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.footerBtn}
            >
              <Text style={styles.footerLink}>Restore</Text>
            </Pressable>
            <Text style={styles.footerDot}>·</Text>
            <Pressable
              onPress={() => handleOpenUrl(TERMS_URL)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.footerBtn}
            >
              <Text style={styles.footerLink}>Terms</Text>
            </Pressable>
            <Text style={styles.footerDot}>·</Text>
            <Pressable
              onPress={() => handleOpenUrl(PRIVACY_URL)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.footerBtn}
            >
              <Text style={styles.footerLink}>Privacy</Text>
            </Pressable>
          </View>
        </StaggerItem>
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    zIndex: 10,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },

  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxxl + spacing.md,
    gap: spacing.xl,
  },

  // Hero
  hero: {
    gap: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.accent,
    letterSpacing: 1.4,
  },
  title: {
    ...typography.display,
    fontSize: 38,
    lineHeight: 44,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    fontSize: 17,
    lineHeight: 26,
    color: colors.textSecondary,
    maxWidth: 420,
  },

  // Value props
  props: {
    gap: spacing.md,
  },
  propRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  propCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propLabel: {
    ...typography.bodyMedium,
    color: colors.text,
  },

  // Plan list
  planList: {
    gap: spacing.sm,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: 72,
  },
  planRowActive: {
    backgroundColor: colors.accentDim,
    borderColor: colors.accent,
    borderWidth: 1,
  },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  planRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  planText: {
    flex: 1,
    gap: 4,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  planLabel: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  planBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 100,
    backgroundColor: colors.accent,
  },
  planBadgeText: {
    ...typography.caption,
    color: colors.onAccent,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  planPrice: {
    ...typography.mono,
    color: colors.text,
  },
  planSub: {
    ...typography.small,
    color: colors.textSecondary,
  },

  // CTA
  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: spacing.md,
    minHeight: 54,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaLabel: {
    ...typography.bodyMedium,
    color: colors.onAccent,
  },

  // Trial note
  trialNote: {
    ...typography.caption,
    color: colors.textDisabled,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Footer row
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  footerBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  footerLink: {
    ...typography.small,
    color: colors.textSecondary,
  },
  footerDot: {
    ...typography.small,
    color: colors.textDisabled,
  },
  plansUnavailable: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
