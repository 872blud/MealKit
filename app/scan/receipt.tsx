import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle, useSharedValue, withTiming, withDelay,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { TIMING_ENTER, getStaggerDelay } from '@/theme/animations';
import PressableScale from '@/components/PressableScale';
import SkeletonLoader from '@/components/SkeletonLoader';
import EmptyState from '@/components/EmptyState';
import GlowBackground from '@/components/GlowBackground';
import { extractReceiptIngredients, ExtractedIngredient } from '@/services/openai';
import { presentPaywall } from '@/services/superwall';
import { useIngredientStore } from '@/stores/ingredientStore';
import { FREE_SCAN_LIMIT, useUserStore } from '@/stores/userStore';
import { trackPaywallHit, trackScanCompleted, trackScanFailed } from '@/services/analytics';
import { isPro } from '@/services/purchases';

// ─── Types ───────────────────────────────────────────────────────────────────

type ScreenState = 'camera' | 'processing' | 'review' | 'error';

// ─── CheckboxRow ─────────────────────────────────────────────────────────────

interface CheckboxRowProps {
  item: ExtractedIngredient;
  checked: boolean;
  onToggle: () => void;
  index: number;
}

function CheckboxRow({ item, checked, onToggle, index }: CheckboxRowProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    const delay = getStaggerDelay(index);
    opacity.value = withDelay(delay, withTiming(1, TIMING_ENTER));
    translateY.value = withDelay(delay, withTiming(0, TIMING_ENTER));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <PressableScale onPress={onToggle} style={styles.checkRow}>
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked && <Ionicons name="checkmark" size={14} color={colors.background} />}
        </View>
        <Text style={[styles.checkLabel, !checked && styles.checkLabelUnchecked]}>
          {item.name}
        </Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ReceiptScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [screenState, setScreenState] = useState<ScreenState>('camera');
  const [items, setItems] = useState<ExtractedIngredient[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [isProUser, setIsProUser] = useState(false);
  const [proStatusLoaded, setProStatusLoaded] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();
  const addIngredient = useIngredientStore((s) => s.addIngredient);
  const scanCount = useUserStore((s) => s.scanCount);

  useEffect(() => {
    useUserStore.getState().checkAndResetMonthly();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void isPro()
        .then((pro) => {
          if (!active) return;
          setIsProUser(pro);
          setProStatusLoaded(true);
        })
        .catch(() => {
          if (!active) return;
          setIsProUser(false);
          setProStatusLoaded(true);
        });

      return () => {
        active = false;
      };
    }, [])
  );

  const handleOpenPaywall = async () => {
    trackPaywallHit('scan_limit');
    await presentPaywall('scan_limit_reached');
  };

  // Permission loading
  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (proStatusLoaded && !isProUser && scanCount >= FREE_SCAN_LIMIT) {
    return (
      <View style={[styles.permissionContainer, { paddingTop: insets.top }]}>
        <GlowBackground primary="green" secondary="amber" />
        <EmptyState
          icon="lock-closed-outline"
          title="Free scan limit reached"
          body="You've used all 3 scans this month. Upgrade to Pro to keep scanning."
          action={{ label: 'See Pro options', onPress: handleOpenPaywall }}
        />
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { paddingTop: insets.top }]}>
        <GlowBackground primary="green" secondary="amber" />
        <Ionicons name="camera-outline" size={48} color={colors.textDisabled} />
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionBody}>
          Allow camera access to scan receipts.
        </Text>
        <PressableScale onPress={requestPermission} style={styles.permissionBtn}>
          <Text style={styles.permissionBtnText}>Grant Camera Access</Text>
        </PressableScale>
      </View>
    );
  }

  const onCapture = async () => {
    useUserStore.getState().checkAndResetMonthly();
    const proUser = await isPro().catch(() => false);
    if (!proUser && useUserStore.getState().scanCount >= FREE_SCAN_LIMIT) {
      await handleOpenPaywall();
      return;
    }
    const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.8 });
    if (!photo?.base64) return;
    setScreenState('processing');
    const extracted = await extractReceiptIngredients(photo.base64);
    if (extracted.length === 0) {
      trackScanFailed('receipt');
      setScreenState('error');
    } else {
      setItems(extracted);
      setCheckedIds(new Set(extracted.map((_, i) => i))); // all checked by default
      setScreenState('review');
    }
  };

  const onToggle = (index: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const checkedCount = checkedIds.size;

  const onAddToList = async () => {
    useUserStore.getState().checkAndResetMonthly();
    const proUser = await isPro().catch(() => false);
    if (!proUser && useUserStore.getState().scanCount >= FREE_SCAN_LIMIT) {
      await handleOpenPaywall();
      return;
    }
    const selected = items.filter((_, i) => checkedIds.has(i));
    selected.forEach((item) =>
      addIngredient({ name: item.name, category: item.category, source: 'receipt' })
    );
    useUserStore.getState().incrementScanCount();
    trackScanCompleted('receipt', selected.length);
    router.push('/ingredients');
  };

  // ── Processing ─────────────────────────────────────────────────────────────
  if (screenState === 'processing') {
    return (
      <View style={[styles.processingContainer, { paddingTop: insets.top }]}>
        <GlowBackground primary="blue" secondary="amber" />
        <Text style={styles.processingLabel}>Reading your receipt...</Text>
        <View style={{ width: '100%', gap: spacing.md }}>
          <SkeletonLoader height={20} width="80%" borderRadius={6} />
          <SkeletonLoader height={20} width="60%" borderRadius={6} />
          <SkeletonLoader height={20} width="90%" borderRadius={6} />
          <SkeletonLoader height={20} width="70%" borderRadius={6} />
        </View>
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (screenState === 'error') {
    return (
      <View style={[styles.errorContainer, { paddingTop: insets.top }]}>
        <GlowBackground primary="amber" secondary={null} />
        <Ionicons name="document-text-outline" size={48} color={colors.textDisabled} />
        <Text style={styles.errorTitle}>Couldn't read receipt</Text>
        <Text style={styles.errorBody}>
          Try better lighting or hold the camera steady over the full receipt.
        </Text>
        <PressableScale
          onPress={() => setScreenState('camera')}
          style={styles.retryBtn}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </PressableScale>
      </View>
    );
  }

  // ── Review ─────────────────────────────────────────────────────────────────
  if (screenState === 'review') {
    return (
      <View style={[styles.reviewContainer, { paddingTop: insets.top }]}>
        <GlowBackground primary="green" secondary={null} />
        {/* Header */}
        <View style={[styles.reviewHeader, { paddingTop: spacing.sm }]}>
          <PressableScale onPress={() => setScreenState('camera')}>
            <Text style={styles.headerBack}>← Rescan</Text>
          </PressableScale>
          <Text style={styles.headerCount}>{items.length} items</Text>
        </View>

        {/* Section title */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
          Groceries found
        </Text>

        {/* Checklist */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.md }}
        >
          {items.map((item, index) => (
            <CheckboxRow
              key={`${item.name}-${index}`}
              item={item}
              checked={checkedIds.has(index)}
              onToggle={() => onToggle(index)}
              index={index}
            />
          ))}
        </ScrollView>

        {/* Add button */}
        <PressableScale
          onPress={onAddToList}
          style={[styles.addBtn, checkedCount === 0 && { opacity: 0.4 }]}
          disabled={checkedCount === 0}
        >
          <Text style={styles.addBtnText}>
            Add {checkedCount} {checkedCount === 1 ? 'item' : 'items'} to list
          </Text>
        </PressableScale>
      </View>
    );
  }

  // ── Camera (default) ───────────────────────────────────────────────────────
  return (
    <View style={styles.cameraContainer}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        mode="picture"
      />

      {/* Header overlay */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <PressableScale onPress={() => router.back()}>
          <Text style={styles.headerBack}>← Back</Text>
        </PressableScale>
      </View>

      {/* Hint text */}
      <View style={styles.hintWrapper}>
        <Text style={styles.hint}>Point at your receipt</Text>
      </View>

      {/* Capture button */}
      <View style={[styles.captureBtnWrapper, { paddingBottom: insets.bottom + spacing.xl }]}>
        <PressableScale onPress={onCapture} style={styles.captureBtn} scaleTo={0.95}>
          <Ionicons name="camera" size={32} color="#FFFFFF" />
        </PressableScale>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Camera state
  cameraContainer: { flex: 1, backgroundColor: colors.background },
  camera: { ...StyleSheet.absoluteFillObject },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintWrapper: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hint: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },

  // Processing state
  processingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  processingLabel: {
    ...typography.heading,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },

  // Review state
  reviewContainer: { flex: 1, backgroundColor: colors.background },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    minHeight: 44,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkLabel: { ...typography.body, color: colors.text, flex: 1, marginRight: spacing.sm },
  checkLabelUnchecked: { color: colors.textSecondary },
  categoryBadge: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 100,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  categoryText: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'none',
  },
  addBtn: {
    margin: spacing.lg,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { ...typography.bodyMedium, color: '#FFFFFF', fontVariant: ['tabular-nums'] },

  // Error state
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorTitle: {
    ...typography.heading,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  errorBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryBtn: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  retryText: { ...typography.bodyMedium, color: colors.accent },

  // Header (shared)
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBack: { ...typography.bodyMedium, color: colors.textSecondary },
  headerCount: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },

  // Permission state
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  permissionTitle: {
    ...typography.heading,
    color: colors.text,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  permissionBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  permissionBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.accentDim,
    borderRadius: 12,
  },
  permissionBtnText: {
    ...typography.bodyMedium,
    color: colors.accent,
  },
});
