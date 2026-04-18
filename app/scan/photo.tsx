import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet } from 'react-native';
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
import { TIMING_ENTER, TIMING_EXIT, getStaggerDelay } from '@/theme/animations';
import PressableScale from '@/components/PressableScale';
import SkeletonLoader from '@/components/SkeletonLoader';
import EmptyState from '@/components/EmptyState';
import GlowBackground from '@/components/GlowBackground';
import * as ImagePicker from 'expo-image-picker';
import { useMediaLibraryPermissions } from 'expo-image-picker';
import { identifyCounterIngredients, ExtractedIngredient } from '@/services/openai';
import { presentPaywall } from '@/services/superwall';
import { useIngredientStore } from '@/stores/ingredientStore';
import { useUserStore } from '@/stores/userStore';
import { getScanLimit, isBetaMode } from '@/config/limits';
import { trackPaywallHit, trackScanCompleted, trackScanFailed } from '@/services/analytics';
import { isPro } from '@/services/purchases';

// ─── Types ───────────────────────────────────────────────────────────────────

type ScreenState = 'camera' | 'processing' | 'review' | 'error';

interface IngredientItem extends ExtractedIngredient {
  id: string;
  source: 'photo' | 'manual';
}

// ─── RemovableRow ─────────────────────────────────────────────────────────────

interface RemovableRowProps {
  item: IngredientItem;
  onRemove: (id: string) => void;
  index: number;
}

function RemovableRow({ item, onRemove, index }: RemovableRowProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    const delay = getStaggerDelay(index);
    opacity.value = withDelay(delay, withTiming(1, TIMING_ENTER));
    translateY.value = withDelay(delay, withTiming(0, TIMING_ENTER));
    scale.value = withDelay(delay, withTiming(1, TIMING_ENTER));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const handleRemove = useCallback(() => {
    opacity.value = withTiming(0, TIMING_EXIT);
    translateY.value = withTiming(-8, TIMING_EXIT);
    scale.value = withTiming(0.95, TIMING_EXIT);
    setTimeout(() => onRemove(item.id), TIMING_EXIT.duration);
  }, [item.id, onRemove, opacity, translateY, scale]);

  return (
    <Animated.View style={[styles.row, animStyle]}>
      <Text style={styles.rowName}>{item.name}</Text>
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{item.category}</Text>
      </View>
      <PressableScale onPress={handleRemove} style={styles.removeBtn}>
        <Ionicons name="close-circle" size={20} color={colors.textDisabled} />
      </PressableScale>
    </Animated.View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PhotoScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [libraryPermission, requestLibraryPermission] = useMediaLibraryPermissions();
  const [screenState, setScreenState] = useState<ScreenState>('camera');
  const [items, setItems] = useState<IngredientItem[]>([]);
  const [quickAdd, setQuickAdd] = useState('');
  const [inputMode, setInputMode] = useState<'camera' | 'library'>('camera');
  const [isProUser, setIsProUser] = useState(false);
  const [proStatusLoaded, setProStatusLoaded] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();
  const addIngredient = useIngredientStore((s) => s.addIngredient);
  const scanCount = useUserStore((s) => s.scanCount);
  const scanLimit = getScanLimit();
  const betaMode = isBetaMode();
  const isCameraDenied = permission?.status === 'denied';
  const isLibraryGranted = !!libraryPermission?.granted;
  const isLibraryUndetermined = !libraryPermission || libraryPermission.status === 'undetermined';
  const shouldForceLibraryMode = isCameraDenied && (isLibraryGranted || isLibraryUndetermined);
  const effectiveInputMode = shouldForceLibraryMode ? 'library' : inputMode;

  useEffect(() => {
    useUserStore.getState().checkAndResetMonthly();
  }, []);

  useEffect(() => {
    if (shouldForceLibraryMode && inputMode !== 'library') {
      setInputMode('library');
    }
  }, [shouldForceLibraryMode, inputMode]);

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

  const handleOpenPaywall = useCallback(async () => {
    trackPaywallHit('scan_limit');
    await presentPaywall('scan_limit_reached');
  }, []);

  // ── Callbacks — declared before all early returns (Rules of Hooks) ────────
  const onCapture = useCallback(async () => {
    useUserStore.getState().checkAndResetMonthly();
    const proUser = await isPro().catch(() => false);
    if (!proUser && useUserStore.getState().scanCount >= scanLimit) {
      await handleOpenPaywall();
      return;
    }
    const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.8 });
    if (!photo?.base64) return;
    setScreenState('processing');
    const extracted = await identifyCounterIngredients(photo.base64);
    if (extracted.length === 0) {
      trackScanFailed('photo');
      setScreenState('error');
    } else {
      setItems(
        extracted.map((e, i) => ({
          ...e,
          id: `photo-${i}-${Date.now()}`,
          source: 'photo' as const,
        }))
      );
      setScreenState('review');
    }
  }, [handleOpenPaywall, scanLimit]);

  const onRemove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const onQuickAdd = useCallback(() => {
    const name = quickAdd.trim();
    if (!name) return;
    setItems((prev) => [
      { id: `manual-${Date.now()}`, name, category: 'other', source: 'manual' as const },
      ...prev,
    ]);
    setQuickAdd('');
  }, [quickAdd]);

  const handlePickFromLibrary = useCallback(async () => {
    if (!libraryPermission || libraryPermission.status === 'undetermined') {
      const nextLibraryPermission = await requestLibraryPermission();
      if (!nextLibraryPermission.granted) return;
    }

    useUserStore.getState().checkAndResetMonthly();
    const proUser = await isPro().catch(() => false);
    if (!proUser && useUserStore.getState().scanCount >= scanLimit) {
      await handleOpenPaywall();
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      quality: 0.85,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    setScreenState('processing');
    const extracted = await identifyCounterIngredients(result.assets[0].base64);
    if (extracted.length === 0) {
      trackScanFailed('photo');
      setScreenState('error');
    } else {
      setItems(extracted.map((e, i) => ({ ...e, id: `photo-${i}-${Date.now()}`, source: 'photo' as const })));
      setScreenState('review');
    }
  }, [handleOpenPaywall, libraryPermission, requestLibraryPermission, scanLimit]);

  const onAddToList = useCallback(async () => {
    useUserStore.getState().checkAndResetMonthly();
    const proUser = await isPro().catch(() => false);
    if (!proUser && useUserStore.getState().scanCount >= scanLimit) {
      await handleOpenPaywall();
      return;
    }
    items.forEach((item) =>
      addIngredient({ name: item.name, category: item.category, source: item.source })
    );
    useUserStore.getState().incrementScanCount();
    trackScanCompleted('photo', items.length);
    router.push('/ingredients');
  }, [items, addIngredient, handleOpenPaywall, scanLimit]);

  // ── Permission guards ─────────────────────────────────────────────────────
  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (!permission.granted && !shouldForceLibraryMode) {
    return (
      <View style={[styles.permissionContainer, { paddingTop: insets.top }]}>
        <GlowBackground primary="green" secondary="amber" />
        <Ionicons name="camera-outline" size={48} color={colors.textDisabled} />
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionBody}>
          Allow camera access to photograph your counter ingredients.
        </Text>
        <PressableScale onPress={requestPermission} style={styles.permissionBtn}>
          <Text style={styles.permissionBtnText}>Grant Camera Access</Text>
        </PressableScale>
      </View>
    );
  }

  if (proStatusLoaded && !isProUser && scanCount >= scanLimit) {
    return (
      <View style={[styles.permissionContainer, { paddingTop: insets.top }]}>
        <GlowBackground primary="green" secondary="amber" />
        <EmptyState
          icon="lock-closed-outline"
          title={betaMode ? 'Beta usage limit reached' : 'Free scan limit reached'}
          body={
            betaMode
              ? `You've used all ${scanLimit} beta scans this month.`
              : `You've used all ${scanLimit} scans this month. Upgrade to Pro to keep scanning.`
          }
          action={{ label: betaMode ? 'See options' : 'See Pro options', onPress: handleOpenPaywall }}
        />
      </View>
    );
  }

  // ── Processing ─────────────────────────────────────────────────────────────
  if (screenState === 'processing') {
    return (
      <View style={[styles.processingContainer, { paddingTop: insets.top }]}>
        <GlowBackground primary="blue" secondary="amber" />
        <Text style={styles.processingLabel}>Identifying ingredients...</Text>
        <View style={{ width: '100%', gap: spacing.md }}>
          <SkeletonLoader height={20} width="75%" borderRadius={6} />
          <SkeletonLoader height={20} width="55%" borderRadius={6} />
          <SkeletonLoader height={20} width="85%" borderRadius={6} />
          <SkeletonLoader height={20} width="65%" borderRadius={6} />
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
        <Ionicons name="image-outline" size={48} color={colors.textDisabled} />
        <Text style={styles.errorTitle}>Couldn't identify ingredients</Text>
        <Text style={styles.errorBody}>
          Spread items on a flat, well-lit surface and make sure they're clearly visible.
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
        <View style={[styles.header, { paddingTop: spacing.sm }]}>
          <PressableScale onPress={() => setScreenState('camera')}>
            <Text style={styles.headerBack}>← Retake</Text>
          </PressableScale>
          <PressableScale onPress={onAddToList} disabled={items.length === 0}>
            <Text style={[styles.headerDone, items.length === 0 && { opacity: 0.4 }]}>
              Done ({items.length})
            </Text>
          </PressableScale>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: spacing.md }}
        >
          {/* Section label */}
          <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
            Found {items.length} {items.length === 1 ? 'ingredient' : 'ingredients'}
          </Text>

          {/* Removable list */}
          {items.map((item, index) => (
            <RemovableRow
              key={item.id}
              item={item}
              onRemove={onRemove}
              index={index}
            />
          ))}

          {/* Quick-add section */}
          <View style={styles.quickAddSection}>
            <Text style={styles.quickAddLabel}>Did we miss anything?</Text>
            <View style={styles.quickAddRow}>
              <TextInput
                style={styles.quickAddInput}
                value={quickAdd}
                onChangeText={setQuickAdd}
                placeholder="Add an ingredient..."
                placeholderTextColor={colors.textDisabled}
                returnKeyType="done"
                onSubmitEditing={onQuickAdd}
              />
              <PressableScale onPress={onQuickAdd}>
                <Ionicons name="add-circle" size={28} color={colors.accent} />
              </PressableScale>
            </View>
          </View>
        </ScrollView>

        {/* Add to list CTA */}
        <PressableScale
          onPress={onAddToList}
          style={[styles.addBtn, items.length === 0 && { opacity: 0.4 }]}
          disabled={items.length === 0}
        >
          <Text style={styles.addBtnText}>
            Add {items.length} {items.length === 1 ? 'ingredient' : 'ingredients'} to list
          </Text>
        </PressableScale>
      </View>
    );
  }

  // ── Camera (default) ───────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {!shouldForceLibraryMode && (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          mode="picture"
        />
      )}

      {/* Header overlay */}
      <View style={[styles.cameraHeader, { paddingTop: insets.top + spacing.sm }]}>
        <PressableScale onPress={() => router.back()}>
          <Text style={styles.headerBack}>← Back</Text>
        </PressableScale>
      </View>

      {/* Hint text */}
      <View style={styles.hintWrapper}>
        <Text style={styles.hint}>
          {effectiveInputMode === 'camera'
            ? 'Spread items on a flat surface then capture'
            : 'Pick a photo from your library'}
        </Text>
      </View>

      {/* Camera / Library toggle */}
      <View style={[styles.modeToggleWrap, { bottom: insets.bottom + spacing.xl + 72 + spacing.lg }]}>
        <View style={styles.modeToggle}>
          {(shouldForceLibraryMode ? (['library'] as const) : (['camera', 'library'] as const)).map((m) => (
            <PressableScale
              key={m}
              onPress={() => setInputMode(m)}
              style={[styles.modeToggleBtn, effectiveInputMode === m && styles.modeToggleBtnActive]}
            >
              <Text style={[styles.modeToggleLabel, effectiveInputMode === m && styles.modeToggleLabelActive]}>
                {m === 'camera' ? 'Camera' : 'Library'}
              </Text>
            </PressableScale>
          ))}
        </View>
      </View>

      {/* Capture button — swaps action based on inputMode */}
      <View style={[styles.captureWrapper, { paddingBottom: insets.bottom + spacing.xl }]}>
        <PressableScale
          onPress={effectiveInputMode === 'camera' ? onCapture : handlePickFromLibrary}
          style={styles.captureBtn}
          scaleTo={0.95}
        >
          <Ionicons
            name={effectiveInputMode === 'camera' ? 'camera' : 'image'}
            size={32}
            color={colors.onAccent}
          />
        </PressableScale>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  camera: { ...StyleSheet.absoluteFillObject },

  // Camera header (absolute overlay)
  cameraHeader: {
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

  // Hint text
  hintWrapper: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hint: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },

  // Camera / Library toggle
  modeToggleWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 100,
    padding: 3,
    gap: 2,
  },
  modeToggleBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 100,
  },
  modeToggleBtnActive: { backgroundColor: colors.surface },
  modeToggleLabel: { ...typography.smallMedium, color: colors.textSecondary },
  modeToggleLabelActive: { color: colors.text },

  // Capture button
  captureWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Shared header (review state)
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerBack: { ...typography.bodyMedium, color: colors.textSecondary },
  headerDone: { ...typography.bodyMedium, color: colors.accent, fontVariant: ['tabular-nums'] },

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
  sectionLabel: {
    ...typography.small,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },

  // Ingredient row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowName: { ...typography.bodyMedium, color: colors.text, flex: 1, marginRight: spacing.sm },
  categoryBadge: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 100,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginRight: spacing.sm,
  },
  categoryText: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'none' as const,
  },
  removeBtn: { padding: spacing.xs },

  // Quick-add section
  quickAddSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  quickAddLabel: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.sm },
  quickAddRow: { flexDirection: 'row', alignItems: 'center' },
  quickAddInput: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },

  // Add to list CTA
  addBtn: {
    margin: spacing.lg,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { ...typography.bodyMedium, color: colors.onAccent, fontVariant: ['tabular-nums'] },

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
  permissionBtnText: { ...typography.bodyMedium, color: colors.accent },
});
